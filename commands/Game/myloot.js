const { ActionRowBuilder, EmbedBuilder, AttachmentBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
//const wait = require('node:timers/promises').setTimeout;
const { grabColour } = require('./exported/grabRar.js');

const {
    warnedForm,
    errorForm,
    successResult,
    failureResult,
    basicInfoForm,
    specialInfoForm
} = require('../../chalkPresets.js');

const { checkHintLootSell, checkHintLootDismantle, checkHintMaterialCombine, checkHintLootEquip, checkHintPotionEquip, checkHintPigmyGive, checkHintUniqueEquip } = require('./exported/handleHints.js');

const { UserData, LootStore, MaterialStore, OwnedPotions, OwnedTools, UniqueCrafted, ItemStrings } = require('../../dbObjects.js');
const { uni_displayItem } = require('../Development/Export/itemStringCore.js');
const { createInteractiveChannelMessage, sendTimedChannelMessage, makeCapital } = require('../../uniHelperFunctions.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('myloot')
        .setDescription('What have you got in those pockets precious?')
        .addSubcommand(subcommand =>
            subcommand
                .setName('gear')
                .setDescription('View a list of all owned gear'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('materials')
                .setDescription('View a list of all owned materials'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('potions')
                .setDescription('View a list of all owned potions'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('tools')
                .setDescription('View a list of all owned tools'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unique')
                .setDescription('View a list of all owned unique gear')),

    async execute(interaction) {
        
        const { materialFiles } = interaction.client;

        const subCom = interaction.options.getSubcommand();

        await interaction.deferReply();

        const user = await UserData.findOne({where: {userid: interaction.user.id}});

        let usePagination = false;
        const finalPages = [];

        switch(subCom){
            case "gear":
                const fullUserItemList = await ItemStrings.findAll({where: {user_id: interaction.user.id}});
                if (fullUserItemList.length === 0) return interaction.followUp("No Items Found!! Try stealing one from an enemy during combat. You can also use the command ``/shop`` to purchase one. Be warned, there is a fee when opening the shop more than once!!");

                await checkHintLootEquip(user, interaction);
                fullUserItemList.sort((a,b) => a.value - b.value);

                let curRun = 0, maxRun = 6, /*hasPartialPage = false,*/ lastMaxRun = 6, pageRun;
                if (fullUserItemList.length > 6) {
                    usePagination = true;
                    await checkHintLootSell(user, interaction);
                    await checkHintLootDismantle(user, interaction);
                }

                pageRun = Math.ceil(fullUserItemList.length/6);
                if (fullUserItemList.length % 6 !== 0){
                    // hasPartialPage = true;
                    lastMaxRun = fullUserItemList.length % 6;
                }

                for (let i = 0; i < pageRun; i++){
                    const finalFields = [];
                    const curItemSection = fullUserItemList.slice(curRun, (i + 1 === pageRun) ? curRun + lastMaxRun : curRun + maxRun);

                    for (const dbItem of curItemSection){
                        finalFields.push(uni_displayItem(dbItem, "List"));
                        curRun++;
                    }

                    const embedPage = new EmbedBuilder()
                    .setTitle('~OWNED GEAR~')
                    .setDescription(`Page ${i + 1}/${pageRun}`)
                    .setColor(0o0)
                    .addFields(finalFields);

                    finalPages.push(embedPage);
                }
            break;
            case "materials":
                const fullUserMatList = await MaterialStore.findAll({where: {spec_id: interaction.user.id}});
                if (fullUserMatList.length === 0) return interaction.followUp("No Materials Found! Defeat an enemy to receive materials!");
                if (fullUserMatList.length > 10) await checkHintMaterialCombine(user, interaction);
                usePagination = true;

                for (const [key, value] of materialFiles){
                    const matType = key;
                    const matEmbed = new EmbedBuilder()
                    .setTitle(`== ${makeCapital(matType)} Type Materials ==`);

                    const matList = require(value);
                    matList.sort((a,b) => a.Rar_id - b.Rar_id);

                    const refListLength = matList.length;
                    let missingAll = false;

                    const matchingOwnedMats = (key === "unique") 
                    ? fullUserMatList.filter(mat => mat.rar_id === 12)
                    : fullUserMatList.filter(mat => mat.mattype === key);
                    if (matchingOwnedMats.length === 0) missingAll = true;

                    const orderedUMats = new Array(refListLength);
                    if (!missingAll){
                        let counter = 0;
                        for (const matRef of matList){
                            orderedUMats[counter] = (key === "unique") 
                            ? matchingOwnedMats.filter(mat => mat.mattype === matRef.UniqueMatch)[0] ?? matRef.Rar_id
                            : matchingOwnedMats.filter(mat => mat.rar_id === matRef.Rar_id)[0] ?? matRef.Rar_id;
                            counter++;
                        }
                    }

                    const matFields = await handleMaterialDisplay(orderedUMats, matList, missingAll);
                    matEmbed.addFields(matFields);
                    
                    finalPages.push(matEmbed);
                }
            break;
            case "potions":
                const fullUserPotList = await OwnedPotions.findAll({where: {spec_id: interaction.user.id}});
                if (fullUserPotList.length === 0) return interaction.followUp('No Potions Found! Use ``/blueprint available`` to craft some!');
                if (fullUserPotList.length > 1) usePagination = true;

                await checkHintPotionEquip(user, interaction);
                
                fullUserPotList.sort((a,b) => b.value - a.value);

                let potCounter = 0;
                for (const potion of fullUserPotList){
                    const potEmbed = new EmbedBuilder()
                    .setTitle(`~OWNED POTIONS~`)
                    .setDescription(`Potion ${potCounter + 1}/${fullUserPotList.length}`)
                    .setColor(0o0)
                    .addFields({
                        name: `${potion.name}`,
                        value: `Value: **${potion.value}**c\nDuration: **${potion.duration}** (Battles)\nCooldown: **${potion.cooldown}** (Battles)\nAmount Owned: **${potion.amount}**`
                    });

                    potCounter++;
                    finalPages.push(potEmbed);
                }
            break;
            case "tools":
                const fullUserToolList = await OwnedTools.findAll({where: {spec_id: interaction.user.id}});
                if (fullUserToolList.length === 0) return interaction.followUp('No Tools Found! Use ``/blueprint available`` to craft some!');
                if (fullUserToolList.length > 1) usePagination = true;

                await checkHintPigmyGive(user, interaction);

                fullUserToolList.sort((a,b) => b.rar_id - a.rar_id);

                let toolCounter = 0;
                for (const tool of fullUserToolList){
                    const etColour = grabColour(tool.rar_id);
                    const toolEmbed = new EmbedBuilder()
                    .setTitle(`~OWNED TOOLS~`)
                    .setDescription(`Tool ${toolCounter + 1}/${fullUserToolList.length}`)
                    .setColor(etColour)
                    .addFields({
                        name: `${tool.name}`,
                        value: `Tool Type: **${tool.activecategory} ${tool.activesubcategory}**\nRarity: **${tool.rarity}**\nAmount Owned: **${tool.amount}**`
                    });

                    toolCounter++;
                    finalPages.push(toolEmbed);
                }
            break;
            case "unique":
                if (user.level < 25) return interaction.followUp('You are not yet ready for this!! Come back when you have passed level 25!');
                if (user.level < 31) return interaction.followUp('You must first complete a dungeon to gain access to these items!');
                usePagination = false;
                const uniqueTempEmbed = new EmbedBuilder()
                .setTitle(`**WIP**`)
                .setDescription('This section is still under construction, check back later!');

                finalPages.push(uniqueTempEmbed);
            break;
        }

        if (!usePagination){
            const finalReply = {embeds: [finalPages[0]]};
            return await sendTimedChannelMessage(interaction, 120000, finalReply, "FollowUp");
        }

        const backPage = new ButtonBuilder()
        .setLabel("Back")
        .setStyle(ButtonStyle.Primary)
        .setEmoji('◀️')
        .setCustomId('back-page');

        const cancelButton = new ButtonBuilder()
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
        .setEmoji('*️⃣')
        .setCustomId('delete-page');

        const nextPage = new ButtonBuilder()
        .setLabel("Forward")
        .setStyle(ButtonStyle.Primary)
        .setEmoji('▶️')
        .setCustomId('next-page');

        const pageButtonRow = new ActionRowBuilder().addComponents(backPage, cancelButton, nextPage);

        const finalReply = {embeds: [finalPages[0]], components: [pageButtonRow]};

        const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 1200000, finalReply, "FollowUp");

        let curPage = 0;

        collector.on('collect', async c => {
            await c.deferUpdate().then(async () => {
                switch(c.customId){
                    case "next-page":
                        curPage = (curPage === finalPages.length - 1) ? 0 : curPage + 1;
                    break;
                    case "back-page":
                        curPage = (curPage === 0) ? finalPages.length - 1 : curPage - 1;
                    break;
                    case "delete-page":
                    return collector.stop('Canceled');
                }
                await anchorMsg.edit({ components: [pageButtonRow], embeds: [finalPages[curPage]]});
            }).catch(e => {
                console.error(e);
            });
        });

        collector.on('end', (c, r) => {
            anchorMsg.delete().catch(e => {
                if (e.code !== 10008) {
                    console.error('Failed to delete the message:', e);
                }
            });
        });

        // if (interaction.options.getSubcommand() === 'gear') {
        //     await interaction.deferReply();
        //     const loFound = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }] });

        //     if (!loFound) return interaction.followUp('Sorry but you dont have any items yet! Try stealing from enemies while in combat or you can use the command ``/shop`` to open the shop and make your first purchase. Be warned, there is a fee when opening the shop more than once!!');

        //     const userItems = await LootStore.findAll({ where: [{ spec_id: interaction.user.id }] });

        //     await checkHintLootEquip(user, interaction);

        //     //***THIS DOES NOT WORK NEED TO FIX IT ASAP***
        //     if (userItems.length <= 5) {
        //         const itemAmount = userItems.length;

        //         let listedDefaults;
        //         let grabbedName;
        //         let fieldValueObj;
        //         let finalFields = [];

        //         let gearSlice;
        //         let i = 0;
        //         do {
        //             gearSlice = userItems[i];

        //             //console.log(gearSlice);

        //             if (gearSlice) {
        //                 //name, value, rarity, amount
        //                 if (gearSlice.slot === 'Mainhand') {
        //                     listedDefaults =
        //                         `Value: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nAttack: **${gearSlice.attack}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nHands: **${gearSlice.hands}**\nAmount: ${gearSlice.amount}\n`;
        //                 } else if (gearSlice.slot === 'Offhand') {
        //                     listedDefaults =
        //                         `Value: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nAttack: **${gearSlice.attack}** \nDefence: **${gearSlice.defence}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nAmount: ${gearSlice.amount}\n`;
        //                 } else {
        //                     listedDefaults =
        //                         `Value: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nDefence: **${gearSlice.defence}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nAmount: ${gearSlice.amount}\n`;
        //                 }
        //                 grabbedName = `${gearSlice.name}`;

        //                 fieldValueObj = { name: grabbedName, value: listedDefaults, };

        //                 finalFields.push(fieldValueObj);
        //             } else console.log(errorForm('gearSlice ERROR NOT FOUND!'));
        //             i++;
        //         } while (i < itemAmount)

        //         const invEmbed = {
        //             title: '~OWNED GEAR~',
        //             description: 'Page 1/1',
        //             color: 0o0,
        //             fields: finalFields,
        //         };

        //         await interaction.followUp({ embeds: [invEmbed] }).then(async iEmbed => setTimeout(() => {
        //             iEmbed.delete();
        //         }, 120000)).catch(console.error);
        //     } else if (userItems.length > 5) {
        //         //user has more then 5 items, need to separate onto different pages
        //         //do this by making a button for going forward a page and going back a page
        //         //allow buttons to loop from page 1 to last page and vice-versa
        //         console.log('TOO MANY ITEMS!');

                
        //         await checkHintLootSell(user, interaction);
        //         await checkHintLootDismantle(user, interaction);

        //         var embedPages = [];
        //         const totalItems = userItems.length;
        //         let lastPage = Math.floor(totalItems / 5);
        //         const remainder = Math.floor(totalItems % 5);
        //         if (remainder > 0) lastPage += 1;

        //         let items = userItems;

        //         items.sort((highest, item) => {
        //             if (highest['rar_id'] > item['rar_id']) return -1;
        //             if (highest['rar_id'] < item['rar_id']) return 1;
        //             return 0;
        //         });

        //         let sliceFive = [];

        //         let curRun = 0;
        //         let curPos = 0;
        //         do {
        //             if ((curPos + 5) > totalItems) {
        //                 sliceFive = items.slice(curPos, curPos + (Math.abs(curPos - totalItems)));
        //             } else {
        //                 sliceFive = items.slice(curPos, curPos + 5);
        //             }

        //             //console.log(specialInfoForm(`Current contents of sliceFive: ${sliceFive}`));

        //             let finalFields = [];
        //             if (sliceFive.length === 5) {
        //                 let gearSlice;
        //                 let listedDefaults;
        //                 let grabbedName;
        //                 let fieldValueObj;
        //                 let i = 0;
        //                 do {
        //                     gearSlice = sliceFive[i];
        //                     //console.log(specialInfoForm(`Current name of gearSlice: ${gearSlice.name}`));
        //                     if (gearSlice) {
        //                         //name, value, rarity, amount
        //                         if (gearSlice.slot === 'Mainhand') {
        //                             listedDefaults =
        //                                 `\nValue: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nAttack: **${gearSlice.attack}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nHands: **${gearSlice.hands}**\nAmount: ${gearSlice.amount}\n`;
        //                         } else if (gearSlice.slot === 'Offhand') {
        //                             listedDefaults =
        //                                 `\nValue: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nAttack: **${gearSlice.attack}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nAmount: ${gearSlice.amount}\n`;
        //                         } else {
        //                             listedDefaults =
        //                                 `\nValue: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nDefence: **${gearSlice.defence}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nAmount: ${gearSlice.amount}\n`;
        //                         }
        //                         grabbedName = `${gearSlice.name}`;

        //                         fieldValueObj = { name: grabbedName, value: listedDefaults, };

        //                         finalFields.push(fieldValueObj);
        //                     } else console.log(errorForm('gearSlice ERROR NOT FOUND!'));
        //                     i++;
        //                 } while (i < 5)

        //                 const embed = {
        //                     title: '~OWNED GEAR~',
        //                     description: `Page ${(curRun + 1)}/${lastPage}`,
        //                     color: 0o0,
        //                     fields: finalFields
        //                 };
        //                 embedPages.push(embed);
        //                 curPos += 5;
        //             } else if (sliceFive.length < 5) {
        //                 //LAST RUN
        //                 let gearSlice;
        //                 let listedDefaults;
        //                 let grabbedName;
        //                 let fieldValueObj;
        //                 let i = 0;
        //                 do {
        //                     gearSlice = sliceFive[i];

        //                     if (gearSlice) {
        //                         //name, value, rarity, amount
        //                         if (gearSlice.slot === 'Mainhand') {
        //                             listedDefaults =
        //                                 `\nValue: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nAttack: **${gearSlice.attack}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nHands: **${gearSlice.hands}**\nAmount: ${gearSlice.amount}\n`;
        //                         } else if (gearSlice.slot === 'Offhand') {
        //                             listedDefaults =
        //                                 `\nValue: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nAttack: **${gearSlice.attack}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nAmount: ${gearSlice.amount}\n`;
        //                         } else {
        //                             listedDefaults =
        //                                 `\nValue: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nDefence: **${gearSlice.defence}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nAmount: ${gearSlice.amount}\n`;
        //                         }
        //                         grabbedName = `${gearSlice.name}`;

        //                         fieldValueObj = { name: grabbedName, value: listedDefaults, };

        //                         finalFields.push(fieldValueObj);
        //                     } else console.log(errorForm('gearSlice ERROR NOT FOUND!'));
        //                     i++;
        //                 } while (i < (Math.abs(curPos - totalItems)))

        //                 const embed = {
        //                     title: '~OWNED GEAR~',
        //                     description: `Page ${(curRun + 1)}/${lastPage}`,
        //                     color: 0o0,
        //                     fields: finalFields
        //                 };
        //                 embedPages.push(embed);
        //                 //curPos += 5;
        //             }
        //             curRun++;
        //         } while (curRun < lastPage)

        //         const backButton = new ButtonBuilder()
        //             .setLabel("Back")
        //             .setStyle(ButtonStyle.Secondary)
        //             .setEmoji('◀️')
        //             .setCustomId('back-page');

        //         const cancelButton = new ButtonBuilder()
        //             .setLabel("Cancel")
        //             .setStyle(ButtonStyle.Secondary)
        //             .setEmoji('*️⃣')
        //             .setCustomId('delete-page');

        //         const forwardButton = new ButtonBuilder()
        //             .setLabel("Forward")
        //             .setStyle(ButtonStyle.Secondary)
        //             .setEmoji('▶️')
        //             .setCustomId('next-page');

        //         const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

        //         const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

        //         const filter = (i) => i.user.id === interaction.user.id;

        //         const collector = embedMsg.createMessageComponentCollector({
        //             componentType: ComponentType.Button,
        //             filter,
        //             time: 1200000,
        //         });

        //         var currentPage = 0;

        //         collector.on('collect', async (collInteract) => {
        //             if (collInteract.customId === 'next-page') {
        //                 //console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);
        //                 await collInteract.deferUpdate().then(async () => {
        //                 //if statment to check if currently on the last page
        //                     if (currentPage === embedPages.length - 1) {
        //                         currentPage = 0;
        //                         await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //                     } else {
        //                         currentPage += 1;
        //                         await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //                         }
        //                 }).catch(error => {
        //                     console.log(errorForm(error));
        //                 });
        //             }
        //             if (collInteract.customId === 'back-page') {
        //                 //console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);
        //                 await collInteract.deferUpdate().then(async () => {
        //                     if (currentPage === 0) {
        //                         currentPage = embedPages.length - 1;
        //                         await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //                     } else {
        //                         currentPage -= 1;
        //                         await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //                     }
        //                 }).catch(error => {
        //                     console.log(errorForm(error));
        //                 });
        //             }
        //             if (collInteract.customId === 'delete-page') {
        //                 collector.stop();
        //             }
        //         });

        //         collector.on('end', () => {
        //             if (embedMsg) {
        //                 embedMsg.delete().catch(error => {
        //                     if (error.code !== 10008) {
        //                         console.error('Failed to delete the message:', error);
        //                     }
        //                 });
        //             } else if (!embedMsg) {
        //                 //do nothing
        //             }
        //         });
        //     }
            
        // }

        // if (interaction.options.getSubcommand() === 'materials') {
        //     await interaction.deferReply();

        //     const matStore = await MaterialStore.findOne({ where: { spec_id: interaction.user.id } });
        //     if (!matStore) return interaction.followUp('You do not have any materials yet!');

        //     const allMatsOwned = await MaterialStore.findAll({ where: { spec_id: interaction.user.id } });
        //     if (allMatsOwned.length < 10) {
        //         await checkHintMaterialCombine(user, interaction);
        //     }

        //     let embedTitle = '';
        //     let finalFields = [];

        //     let embedPages = [];
        //     for (const [key, value] of materialFiles) {
        //         let passType = key;

        //         embedTitle = `== ${passType} Type Materials ==`;
        //         finalFields = [];
        //         let matList = require(value);

        //         for (let i = 0; i < matList.length; i++) {
        //             let fieldObj = await buildMatEmbedField(user, passType, matList, i);
        //             finalFields.push(fieldObj);
        //         }

        //         let embed = {
        //             title: embedTitle,
        //             color: 0000,
        //             fields: finalFields
        //         };
        //         embedPages.push(embed);
        //     }

        //     const backButton = new ButtonBuilder()
        //         .setLabel("Back")
        //         .setStyle(ButtonStyle.Secondary)
        //         .setEmoji('◀️')
        //         .setCustomId('back-page');

        //     const cancelButton = new ButtonBuilder()
        //         .setLabel("Cancel")
        //         .setStyle(ButtonStyle.Secondary)
        //         .setEmoji('*️⃣')
        //         .setCustomId('delete-page');

        //     const forwardButton = new ButtonBuilder()
        //         .setLabel("Forward")
        //         .setStyle(ButtonStyle.Secondary)
        //         .setEmoji('▶️')
        //         .setCustomId('next-page')

        //     const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

        //     const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

        //     const filter = (ID) => ID.user.id === interaction.user.id;

        //     const collector = embedMsg.createMessageComponentCollector({
        //         componentType: ComponentType.Button,
        //         filter,
        //         time: 300000,
        //     });

        //     var currentPage = 0;

        //     collector.on('collect', async (collInteract) => {
        //         if (collInteract.customId === 'next-page') {
        //             await collInteract.deferUpdate();
        //             if (currentPage === embedPages.length - 1) {
        //                 currentPage = 0;
        //                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //             } else {
        //                 currentPage += 1;
        //                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //             }
        //         }

        //         if (collInteract.customId === 'back-page') {
        //             await collInteract.deferUpdate();
        //             if (currentPage === 0) {
        //                 currentPage = embedPages.length - 1;
        //                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //             } else {
        //                 currentPage -= 1;
        //                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //             }
        //         }

        //         if (collInteract.customId === 'delete-page') {
        //             await collInteract.deferUpdate();
        //             await collector.stop();
        //         }
        //     });

        //     collector.on('end', () => {
        //         if (embedMsg) {
        //             embedMsg.delete().catch(error => {
        //                 if (error.code !== 10008) {
        //                     console.error('Failed to delete the message:', error);
        //                 }
        //             });
        //         }
        //     });
        // }

        // if (interaction.options.getSubcommand() === 'potions') {
        //     await interaction.deferReply();
        //     const potionCheck = await OwnedPotions.findOne({ where: { spec_id: interaction.user.id } });
        //     if (!potionCheck) return interaction.followUp('You have no potions! Use ``/blueprint view`` to make some!');

        //     const allPotsOwned = await OwnedPotions.findAll({ where: { spec_id: interaction.user.id } });

        //     await checkHintPotionEquip(user, interaction);

        //     var embedPages = [];

        //     let listedDefaults;
        //     let grabbedName;

        //     let potSlice;
        //     let i = 0;
        //     do {
        //         potSlice = allPotsOwned[i];

        //         if (potSlice) {
        //             //name, value, rarity, amount
        //             listedDefaults =
        //                 `Value: ${potSlice.value} \nDuration: ${potSlice.duration} \nCool Down: ${potSlice.cooldown} \nAmount Owned: ${potSlice.amount}`;

        //             grabbedName = `${potSlice.name}`;                   

        //             const embed = {
        //                 title: `~OWNED POTIONS~`,
        //                 color: 0000,
        //                 fields: [
        //                     {
        //                         name: `${grabbedName}`, value: `${listedDefaults}`,
        //                     }
        //                 ],
        //             };

        //             embedPages.push(embed);
        //         } else console.log(errorForm('potSlice ERROR NOT FOUND!'));
        //         i++;
        //     } while (i < allPotsOwned.length)

        //     if (embedPages.length <= 0) return console.log(errorForm('NO EMBED PAGES EXIST ERROR'));

        //     const backButton = new ButtonBuilder()
        //         .setLabel("Back")
        //         .setStyle(ButtonStyle.Secondary)
        //         .setEmoji('◀️')
        //         .setCustomId('back-page');

        //     const cancelButton = new ButtonBuilder()
        //         .setLabel("Cancel")
        //         .setStyle(ButtonStyle.Secondary)
        //         .setEmoji('*️⃣')
        //         .setCustomId('delete-page');

        //     const forwardButton = new ButtonBuilder()
        //         .setLabel("Forward")
        //         .setStyle(ButtonStyle.Secondary)
        //         .setEmoji('▶️')
        //         .setCustomId('next-page')

        //     const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

        //     const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

        //     const filter = (ID) => ID.user.id === interaction.user.id;

        //     const collector = embedMsg.createMessageComponentCollector({
        //         componentType: ComponentType.Button,
        //         filter,
        //         time: 300000,
        //     });

        //     var currentPage = 0;

        //     collector.on('collect', async (collInteract) => {
        //         if (collInteract.customId === 'next-page') {
        //             await collInteract.deferUpdate();
        //             if (currentPage === embedPages.length - 1) {
        //                 currentPage = 0;
        //                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //             } else {
        //                 currentPage += 1;
        //                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //             }
        //         }

        //         if (collInteract.customId === 'back-page') {
        //             await collInteract.deferUpdate();
        //             if (currentPage === 0) {
        //                 currentPage = embedPages.length - 1;
        //                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //             } else {
        //                 currentPage -= 1;
        //                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //             }
        //         }

        //         if (collInteract.customId === 'delete-page') {
        //             await collInteract.deferUpdate();
        //             await collector.stop();
        //         }
        //     });

        //     collector.on('end', () => {
        //         if (embedMsg) {
        //             embedMsg.delete().catch(error => {
        //                 if (error.code !== 10008) {
        //                     console.error('Failed to delete the message:', error);
        //                 }
        //             });
        //         }
        //     });
        // }

        // if (interaction.options.getSubcommand() === 'tools') {
        //     await interaction.deferReply();
        //     const toolCheck = await OwnedTools.findOne({ where: { spec_id: interaction.user.id } });
        //     if (!toolCheck) return interaction.followUp('You have no tools! Use ``/blueprint view`` to make some!');

        //     const allToolsOwned = await OwnedTools.findAll({ where: { spec_id: interaction.user.id } });

        //     await checkHintPigmyGive(user, interaction);

        //     var embedPages = [];

        //     let listedDefaults;
        //     let grabbedName;
        //     let grabbedColour;

        //     let toolSlice;
        //     let i = 0;
        //     do {
        //         toolSlice = allToolsOwned[i];

        //         if (toolSlice) {
        //             //name, value, rarity, amount
        //             listedDefaults =
        //                 `Used for: ${toolSlice.activecategory} \nGive slot: ${toolSlice.activesubcategory} \nRarity: ${toolSlice.rarity} \nAmount: ${toolSlice.amount}`;

        //             grabbedName = `${toolSlice.name}`;

        //             grabbedColour = await grabColour(toolSlice.rar_id, false);

        //             const embed = {
        //                 title: `~OWNED TOOLS~`,
        //                 color: grabbedColour,
        //                 fields: [
        //                     {
        //                         name: `${grabbedName}`, value: `${listedDefaults}`,
        //                     }
        //                 ],
        //             };

        //             embedPages.push(embed);
        //         } else console.log(errorForm('toolSlice ERROR NOT FOUND!'));
        //         i++;
        //     } while (i < allToolsOwned.length)

        //     if (embedPages.length <= 0) return console.log(errorForm('NO EMBED PAGES EXIST ERROR'));

        //     const backButton = new ButtonBuilder()
        //         .setLabel("Back")
        //         .setStyle(ButtonStyle.Secondary)
        //         .setEmoji('◀️')
        //         .setCustomId('back-page');

        //     const cancelButton = new ButtonBuilder()
        //         .setLabel("Cancel")
        //         .setStyle(ButtonStyle.Secondary)
        //         .setEmoji('*️⃣')
        //         .setCustomId('delete-page');

        //     const forwardButton = new ButtonBuilder()
        //         .setLabel("Forward")
        //         .setStyle(ButtonStyle.Secondary)
        //         .setEmoji('▶️')
        //         .setCustomId('next-page')

        //     const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

        //     const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

        //     const filter = (ID) => ID.user.id === interaction.user.id;

        //     const collector = embedMsg.createMessageComponentCollector({
        //         componentType: ComponentType.Button,
        //         filter,
        //         time: 300000,
        //     });

        //     var currentPage = 0;

        //     collector.on('collect', async (collInteract) => {
        //         if (collInteract.customId === 'next-page') {
        //             await collInteract.deferUpdate();
        //             if (currentPage === embedPages.length - 1) {
        //                 currentPage = 0;
        //                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //             } else {
        //                 currentPage += 1;
        //                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //             }
        //         }

        //         if (collInteract.customId === 'back-page') {
        //             await collInteract.deferUpdate();
        //             if (currentPage === 0) {
        //                 currentPage = embedPages.length - 1;
        //                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //             } else {
        //                 currentPage -= 1;
        //                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //             }
        //         }

        //         if (collInteract.customId === 'delete-page') {
        //             await collInteract.deferUpdate();
        //             await collector.stop();
        //         }
        //     });

        //     collector.on('end', () => {
        //         if (embedMsg) {
        //             embedMsg.delete().catch(error => {
        //                 if (error.code !== 10008) {
        //                     console.error('Failed to delete the message:', error);
        //                 }
        //             });
        //         }
        //     });
        // }

        // if (interaction.options.getSubcommand() === 'unique') {
        //     await interaction.deferReply();
        //     const uniqueCheck = await UniqueCrafted.findOne({ where: { spec_id: interaction.user.id } });
        //     if (!uniqueCheck) return interaction.followUp('You have no Unique Gear! Use ``/blueprint view`` to make some!');

        //     const allUniqueOwned = await UniqueCrafted.findAll({ where: { spec_id: interaction.user.id } });

        //     await checkHintUniqueEquip(user, interaction);

        //     var embedPages = [];

        //     let listedDefaults;
        //     let listedKillVal;
        //     let grabbedName;
        //     let grabbedColour;

        //     let uniqueSlice;
        //     let i = 0;
        //     do {
        //         uniqueSlice = allUniqueOwned[i];

        //         if (uniqueSlice) {
        //             //name, value, rarity, amount
        //             if (uniqueSlice.slot === 'Mainhand') {
        //                 listedDefaults =
        //                     `Name: **${uniqueSlice.name}** \nValue: **${uniqueSlice.value}c** \nRarity: **${uniqueSlice.rarity}** \nAttack: **${uniqueSlice.Attack}** \nType: **${uniqueSlice.Type}**\nSlot: **${uniqueSlice.slot}**\nHands: **${uniqueSlice.hands}**\n\n`;
        //             } else if (uniqueSlice.slot === 'Offhand') {
        //                 listedDefaults =
        //                     `Name: **${uniqueSlice.name}** \nValue: **${uniqueSlice.value}c** \nRarity: **${uniqueSlice.rarity}** \nAttack: **${uniqueSlice.Attack}** \nType: **${uniqueSlice.Type}**\nSlot: **${uniqueSlice.slot}**\n\n`;
        //             } else {
        //                 listedDefaults =
        //                     `Name: **${uniqueSlice.name}** \nValue: **${uniqueSlice.value}c** \nRarity: **${uniqueSlice.rarity}** \nDefence: **${uniqueSlice.Defence}** \nType: **${uniqueSlice.Type}**\nSlot: **${uniqueSlice.slot}**\n\n`;
        //             }

        //             listedKillVal =
        //                 `Total Kills: ${uniqueSlice.totalkills} \nKills this level: ${uniqueSlice.killsthislevel} \nCurrent Level: ${uniqueSlice.currentlevel}`;

        //             grabbedName = `${uniqueSlice.name}`;

        //             grabbedColour = await grabColour(uniqueSlice.rar_id, false);

        //             const embed = {
        //                 title: `~OWNED UNIQUE GEAR~`,
        //                 color: grabbedColour,
        //                 fields: [
        //                     {
        //                         name: `${grabbedName}`, value: `${listedDefaults}`,
        //                     },
        //                     {
        //                         name: 'Kill Stats: ', value: `${listedKillVal}`,
        //                     }
        //                 ],
        //             };

        //             embedPages.push(embed);
        //         } else console.log(errorForm('uniqueSlice ERROR NOT FOUND!'));
        //         i++;
        //     } while (i < allUniqueOwned.length)

        //     if (embedPages.length <= 0) return console.log(errorForm('NO EMBED PAGES EXIST ERROR'));

        //     const backButton = new ButtonBuilder()
        //         .setLabel("Back")
        //         .setStyle(ButtonStyle.Secondary)
        //         .setEmoji('◀️')
        //         .setCustomId('back-page');

        //     const cancelButton = new ButtonBuilder()
        //         .setLabel("Cancel")
        //         .setStyle(ButtonStyle.Secondary)
        //         .setEmoji('*️⃣')
        //         .setCustomId('delete-page');

        //     const forwardButton = new ButtonBuilder()
        //         .setLabel("Forward")
        //         .setStyle(ButtonStyle.Secondary)
        //         .setEmoji('▶️')
        //         .setCustomId('next-page')

        //     const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

        //     const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

        //     const filter = (ID) => ID.user.id === interaction.user.id;

        //     const collector = embedMsg.createMessageComponentCollector({
        //         componentType: ComponentType.Button,
        //         filter,
        //         time: 300000,
        //     });

        //     var currentPage = 0;

        //     collector.on('collect', async (collInteract) => {
        //         if (collInteract.customId === 'next-page') {
        //             await collInteract.deferUpdate();
        //             if (currentPage === embedPages.length - 1) {
        //                 currentPage = 0;
        //                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //             } else {
        //                 currentPage += 1;
        //                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //             }
        //         }

        //         if (collInteract.customId === 'back-page') {
        //             await collInteract.deferUpdate();
        //             if (currentPage === 0) {
        //                 currentPage = embedPages.length - 1;
        //                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //             } else {
        //                 currentPage -= 1;
        //                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
        //             }
        //         }

        //         if (collInteract.customId === 'delete-page') {
        //             await collInteract.deferUpdate();
        //             await collector.stop();
        //         }
        //     });

        //     collector.on('end', () => {
        //         if (embedMsg) {
        //             embedMsg.delete().catch(error => {
        //                 if (error.code !== 10008) {
        //                     console.error('Failed to delete the message:', error);
        //                 }
        //             });
        //         }
        //     });
        // }

        /**
         * This function constructs the field array to be used for displaying mats,
         * by way of EmbedBuilder.addFields(finalFields)
         * @param {(object|string)[]} matchMatList Array of owned materials
         * @param {object[]} matRefList Material list array
         * @param {boolean} emptyMatch true if no matching mats found
         * @returns {promise <object[]>} Object array {name: string, value: string}
         */
        async function handleMaterialDisplay(matchMatList, matRefList, emptyMatch){
            const finalFields = [];
            
            for (let i = 0; i < matRefList.length; i++){
                let fieldName = '', fieldValue = '';
                if (typeof matchMatList[i] === 'number' || emptyMatch){
                    // Missing Material
                    fieldName = `Unknown material of ${matRefList[i].Rarity} rarity:`;
                    fieldValue = '0';
                } else {
                    // Matching Material
                    fieldName = `${matchMatList[i].name}:`;
                    fieldValue = `${matchMatList[i].amount}`;
                }

                finalFields.push({name: fieldName, value: fieldValue});
            }

            return finalFields;
        }

        // /**
        //  * 
        //  * @param {any} user
        //  * @param {any} matType
        //  * @param {any} matFile
        //  * @param {any} rarID
        //  */
        // async function buildMatEmbedField(user, matType, matFile, rarID) {
        //     let fieldName = '';
        //     let fieldValue = '';
        //     let fieldObj = {};

        //     let uniID;
        //     if (matType === 'unique') uniID = 0 + rarID, rarID = 12;

        //     const filteredMat = matFile.filter(mat => mat.Rar_id === rarID);
        //     if (uniID) {
        //         const matRef = filteredMat[uniID];

        //         let theMat = await MaterialStore.findOne({
        //             where: [{ spec_id: user.userid },
        //             { mat_id: matRef.Mat_id },
        //             { rarity: 'Unique' }]
        //         });

        //         if (!theMat) {
        //             fieldName = `Unknown material of ${matRef.Rarity} Rarity:`;
        //             fieldValue = '0';
        //         } else {
        //             fieldName = `${theMat.name}:`;
        //             fieldValue = `${theMat.amount}`;
        //         }

        //         fieldObj = { name: fieldName, value: fieldValue };
        //         return fieldObj;
        //     }

        //     const matRef = filteredMat[0];

        //     const theMat = await MaterialStore.findOne({
        //         where:
        //             [{ spec_id: user.userid },
        //             { mat_id: matRef.Mat_id },
        //             { rar_id: matRef.Rar_id },
        //             { mattype: matType }]
        //     });

        //     if (!theMat) {
        //         fieldName = `Unknown material of ${matRef.Rarity} Rarity:`;
        //         fieldValue = '0';
        //     } else {
        //         fieldName = `${theMat.name}:`;
        //         fieldValue = `${theMat.amount}`;
        //     }

        //     fieldObj = { name: fieldName, value: fieldValue };
        //     return fieldObj;
        // }
	},

};
