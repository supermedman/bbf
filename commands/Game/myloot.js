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
const { uni_displayItem, retrieveRarKeyStorage } = require('../Development/Export/itemStringCore.js');
const { createInteractiveChannelMessage, sendTimedChannelMessage, makeCapital, handleCatchDelete } = require('../../uniHelperFunctions.js');
const { NavMenu } = require('../Development/Export/Classes/NavMenu.js');
const { convertOldMatStore } = require('./exported/materialContainer.js');
const { rarityLimiter } = require('../../uniDisplayFunctions.js');
const { Op } = require('sequelize');

module.exports = {
    helptypes: ['Material', 'Gear', 'Info', 'Stats', 'Blueprint'],
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
        
        const { materialFiles, materials } = interaction.client;

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
                const userHasMaterial = await MaterialStore.findOne({where: {spec_id: interaction.user.id}});
                if (!userHasMaterial) return await interaction.followUp("No Materials Found! Defeat an enemy to receive materials!");
                const needsMaterialHint = await MaterialStore.findOne({where: {spec_id: interaction.user.id, amount: {[Op.gte]: 10}}});
                if (needsMaterialHint) await checkHintMaterialCombine(user, interaction);
                usePagination = true;
                // Basic Mat Page = rar 0 => 9
                // Advanced Mat Page = rar 10 => 20
                for (const [key] of materialFiles){
                    const userMatTypeObj = await convertOldMatStore(interaction, key);
                    const {basic, advanced} = handleConvertedMaterialDisplay(userMatTypeObj, key);
                    finalPages.push(...basic);
                }



                // const fullUserMatList = await MaterialStore.findAll({where: {spec_id: interaction.user.id}});
                // if (fullUserMatList.length === 0) return interaction.followUp("No Materials Found! Defeat an enemy to receive materials!");
                // if (fullUserMatList.length > 10) await checkHintMaterialCombine(user, interaction);
                // usePagination = true;

                // for (const [key, value] of materialFiles){
                //     const matType = key;
                //     const matEmbed = new EmbedBuilder()
                //     .setTitle(`== ${makeCapital(matType)} Type Materials ==`);

                //     const matList = require(value);
                //     matList.sort((a,b) => a.Rar_id - b.Rar_id);

                //     const refListLength = matList.length;
                //     let missingAll = false;

                //     const matchingOwnedMats = (key === "unique") 
                //     ? fullUserMatList.filter(mat => mat.rar_id === 12)
                //     : fullUserMatList.filter(mat => mat.mattype === key);
                //     if (matchingOwnedMats.length === 0) missingAll = true;

                //     const orderedUMats = new Array(refListLength);
                //     if (!missingAll){
                //         let counter = 0;
                //         for (const matRef of matList){
                //             orderedUMats[counter] = (key === "unique") 
                //             ? matchingOwnedMats.filter(mat => mat.mattype === matRef.UniqueMatch)[0] ?? matRef.Rar_id
                //             : matchingOwnedMats.filter(mat => mat.rar_id === matRef.Rar_id)[0] ?? matRef.Rar_id;
                //             counter++;
                //         }
                //     }

                //     const matFields = await handleMaterialDisplay(orderedUMats, matList, missingAll);
                //     matEmbed.addFields(matFields);
                    
                //     finalPages.push(matEmbed);
                // }
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
            //     if (user.level < 25) return interaction.followUp('You are not yet ready for this!! Come back when you have passed level 25!');
            //     if (user.level < 31) return interaction.followUp('You must first complete a dungeon to gain access to these items!');
            //     usePagination = false;
            //     const uniqueTempEmbed = new EmbedBuilder()
            //     .setTitle(`**WIP**`)
            //     .setDescription('This section is still under construction, check back later!');

            //     finalPages.push(uniqueTempEmbed);
            // break;
            return await interaction.followUp({content: 'This feature has been removed!', ephemeral: true});
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

        const pageNav = new NavMenu(user, finalReply);
        pageNav.loadPageDisplays({embeds: finalPages});

        const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 1200000, finalReply, "FollowUp");

        //let curPage = 0;

        collector.on('collect', async c => {
            await c.deferUpdate().then(async () => {
                if (pageNav.pageWasHeard(c.customId)){
                    pageNav.handlePaging(c.customId);
                    await anchorMsg.edit(pageNav.loadNextPage());
                } else if (c.customId === 'delete-page') return collector.stop('Canceled');
                // switch(c.customId){
                //     case "next-page":
                //         curPage = (curPage === finalPages.length - 1) ? 0 : curPage + 1;
                //     break;
                //     case "back-page":
                //         curPage = (curPage === 0) ? finalPages.length - 1 : curPage - 1;
                //     break;
                //     case "delete-page":
                //     return collector.stop('Canceled');
                // }
                // await anchorMsg.edit({ components: [pageButtonRow], embeds: [finalPages[curPage]]});
            }).catch(e => console.error(e));
        });

        collector.on('end', async (c, r) => {
            if (!r || r === 'time' || r === 'Canceled') {
                await handleCatchDelete(anchorMsg);
                pageNav.destroy();
            }
            // anchorMsg.delete().catch(e => {
            //     if (e.code !== 10008) {
            //         console.error('Failed to delete the message:', e);
            //     }
            // });
        });

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
                    fieldName = `Unknown material of **${matRefList[i].Rarity}** rarity:`;
                    fieldValue = 'Amount Owned: 0';
                } else {
                    // Matching Material
                    fieldName = `~= ${matRefList[i].Rarity} Material =~`;
                    fieldValue = `Name: **__${matchMatList[i].name}__**\nAmount Owned: **${matchMatList[i].amount}**`;
                }

                finalFields.push({name: fieldName, value: fieldValue});
            }

            return finalFields;
        }

        /**
         * This function loads all materials missing and owned by the user calling. 
         * 
         * `basic` contains materials rarity 0-9
         * `advanced` contains materials rarity 10-20
         * @param {{[rarID:string]: number}} ownedMatsObj Constructed `UserMaterials` object
         * @param {string} matType Currently focused material type
         * @returns {{basic: EmbedBuilder[], advanced: EmbedBuilder[]}}
         */
        function handleConvertedMaterialDisplay(ownedMatsObj, matType){
            const matDisplayObj = {basic: [], advanced: []};

            //console.log('MatType: ', matType);
            //if (matType === 'unique') console.log('Materials Stored @ matType: ', ownedMatsObj);

            if (matType === 'unique'){
                const uniDisplayEmbed = new EmbedBuilder()
                .setTitle(`== ${makeCapital(matType)} Type Materials ==`);

                const uniDisplayFields = Object.entries(ownedMatsObj)
                .reduce((acc, [k, v]) => {
                    if (v === 0){
                        acc.push({ name: 'Unknown material of **Unique** rarity:', value: 'Amount Owned: 0' });
                    } else {
                        const matMatch = materials.get(matType).find(m => m.UniqueMatch === k);
                        acc.push({ name: `~= Unique Material =~`, value: `Name: **__${matMatch.Name}__**\nAmount Owned: **${v}**` });
                    }
                    return acc;
                }, []);

                uniDisplayEmbed.addFields(uniDisplayFields);
                matDisplayObj.basic.push(uniDisplayEmbed);
                return matDisplayObj;
            }

            const basicLimit = new rarityLimiter();
            basicLimit.loadRarLimit(9, 0);
            const basicRarNames = basicLimit.loadMatchingRarNames();

            //console.log('BasicLimit RarityLimiter(): ', basicLimit);
            //console.log('BasicLimitRarNames: ', basicRarNames);

            const basicDisplayEmbed = new EmbedBuilder()
            .setTitle(`== ${makeCapital(matType)} Type Materials ==`);

            const basicDisplayFields = Object.entries(ownedMatsObj)
            .filter(([k]) => basicLimit.isWithin(+k))
            .reduce((acc, [k, v]) => {
                if (v === 0){
                    acc.push({ name: `Unknown material of **${basicRarNames[k]}** rarity:`, value: 'Amount Owned: 0' });
                } else {
                    const matMatch = materials.get(matType).find(m => m.Rar_id === +k);
                    acc.push({ name: `~= ${basicRarNames[k]} Material =~`, value: `Name: **__${matMatch.Name}__**\nAmount Owned: **${v}**` })
                }
                return acc;
            }, []);

            basicDisplayEmbed.addFields(basicDisplayFields);
            matDisplayObj.basic.push(basicDisplayEmbed);

            if (!ownedMatsObj['10']) return matDisplayObj;

            const advancedLimit = new rarityLimiter();
            advancedLimit.loadRarLimit(20, 10);
            const advancedRarNames = advancedLimit.loadMatchingRarNames();

            const advancedDisplayEmbed = new EmbedBuilder()
            .setTitle(`== ${makeCapital(matType)} Type Materials ==`);

            const advancedDisplayFields = Object.entries(ownedMatsObj)
            .filter(([k]) => advancedLimit.isWithin(+k))
            .reduce((acc, [k, v]) => {
                if (v === 0){
                    acc.push({ name: `Unknown material of **${advancedRarNames[k]}** rarity:`, value: 'Amount Owned: 0' });
                } else {
                    const matMatch = materials.get(matType).find(m => m.Rar_id === +k);
                    acc.push({ name: `~= ${advancedRarNames[k]} Material =~`, value: `Name: **__${matMatch.Name}__**\nAmount Owned: **${v}**` })
                }
                return acc;
            }, []);

            advancedDisplayEmbed.addFields(advancedDisplayFields);
            matDisplayObj.advanced.push(advancedDisplayEmbed);

            return matDisplayObj;
        }
	},

};
