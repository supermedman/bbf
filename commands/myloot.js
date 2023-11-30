const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const { grabColour } = require('./exported/grabRar.js');

const {
    warnedForm,
    errorForm,
    successResult,
    failureResult,
    basicInfoForm,
    specialInfoForm
} = require('../chalkPresets.js');

const { checkHintLootSell, checkHintLootDismantle, checkHintMaterialCombine, checkHintLootEquip, checkHintPotionEquip, checkHintPigmyGive, checkHintUniqueEquip } = require('./exported/handleHints.js');

const { UserData, LootStore, MaterialStore, OwnedPotions, OwnedTools, UniqueCrafted } = require('../dbObjects.js');

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
        
        if (interaction.options.getSubcommand() === 'gear') {
            await interaction.deferReply();
            const loFound = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }] });

            if (!loFound) return interaction.followUp('Sorry but you dont have any items yet! Use the command ``/shop`` to open the shop and make your first purchase.');

            const userItems = await LootStore.findAll({ where: [{ spec_id: interaction.user.id }] });

            const user = await UserData.findOne({ where: [{ userid: interaction.user.id }] });

            await checkHintLootEquip(user, interaction);

            //***THIS DOES NOT WORK NEED TO FIX IT ASAP***
            if (userItems.length <= 5) {
                const itemAmount = userItems.length;

                let listedDefaults;
                let grabbedName;
                let fieldValueObj;
                let finalFields = [];

                let gearSlice;
                let i = 0;
                do {
                    gearSlice = userItems[i];

                    //console.log(gearSlice);

                    if (gearSlice) {
                        //name, value, rarity, amount
                        if (gearSlice.slot === 'Mainhand') {
                            listedDefaults =
                                `Value: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nAttack: **${gearSlice.attack}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nHands: **${gearSlice.hands}**\nAmount: ${gearSlice.amount}\n`;
                        } else if (gearSlice.slot === 'Offhand') {
                            listedDefaults =
                                `Value: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nAttack: **${gearSlice.attack}** \nDefence: **${gearSlice.defence}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nAmount: ${gearSlice.amount}\n`;
                        } else {
                            listedDefaults =
                                `Value: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nDefence: **${gearSlice.defence}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nAmount: ${gearSlice.amount}\n`;
                        }
                        grabbedName = `${gearSlice.name}`;

                        fieldValueObj = { name: grabbedName, value: listedDefaults, };

                        finalFields.push(fieldValueObj);
                    } else console.log(errorForm('gearSlice ERROR NOT FOUND!'));
                    i++;
                } while (i < itemAmount)

                const invEmbed = {
                    title: '~OWNED GEAR~',
                    description: 'Page 1/1',
                    color: 0000,
                    fields: finalFields,
                };

                await interaction.followUp({ embeds: [invEmbed] }).then(async iEmbed => setTimeout(() => {
                    iEmbed.delete();
                }, 120000)).catch(console.error);
            } else if (userItems.length > 5) {
                //user has more then 5 items, need to separate onto different pages
                //do this by making a button for going forward a page and going back a page
                //allow buttons to loop from page 1 to last page and vice-versa
                console.log('TOO MANY ITEMS!');

                
                await checkHintLootSell(user, interaction);
                await checkHintLootDismantle(user, interaction);

                var embedPages = [];
                const totalItems = userItems.length;
                let lastPage = Math.floor(totalItems / 5);
                const remainder = Math.floor(totalItems % 5);
                if (remainder > 0) lastPage += 1;

                let items = userItems;

                items.sort((highest, item) => {
                    if (highest['rar_id'] > item['rar_id']) return -1;
                    if (highest['rar_id'] < item['rar_id']) return 1;
                    return 0;
                });

                let sliceFive = [];

                let curRun = 0;
                let curPos = 0;
                do {
                    if ((curPos + 5) > totalItems) {
                        sliceFive = items.slice(curPos, curPos + (Math.abs(curPos - totalItems)));
                    } else {
                        sliceFive = items.slice(curPos, curPos + 5);
                    }

                    //console.log(specialInfoForm(`Current contents of sliceFive: ${sliceFive}`));

                    let finalFields = [];
                    if (sliceFive.length === 5) {
                        let gearSlice;
                        let listedDefaults;
                        let grabbedName;
                        let fieldValueObj;
                        let i = 0;
                        do {
                            gearSlice = sliceFive[i];
                            //console.log(specialInfoForm(`Current name of gearSlice: ${gearSlice.name}`));
                            if (gearSlice) {
                                //name, value, rarity, amount
                                if (gearSlice.slot === 'Mainhand') {
                                    listedDefaults =
                                        `\nValue: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nAttack: **${gearSlice.attack}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nHands: **${gearSlice.hands}**\nAmount: ${gearSlice.amount}\n`;
                                } else if (gearSlice.slot === 'Offhand') {
                                    listedDefaults =
                                        `\nValue: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nAttack: **${gearSlice.attack}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nAmount: ${gearSlice.amount}\n`;
                                } else {
                                    listedDefaults =
                                        `\nValue: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nDefence: **${gearSlice.defence}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nAmount: ${gearSlice.amount}\n`;
                                }
                                grabbedName = `${gearSlice.name}`;

                                fieldValueObj = { name: grabbedName, value: listedDefaults, };

                                finalFields.push(fieldValueObj);
                            } else console.log(errorForm('gearSlice ERROR NOT FOUND!'));
                            i++;
                        } while (i < 5)

                        const embed = {
                            title: '~OWNED GEAR~',
                            description: `Page ${(curRun + 1)}/${lastPage}`,
                            color: 0000,
                            fields: finalFields
                        };
                        embedPages.push(embed);
                        curPos += 5;
                    } else if (sliceFive.length < 5) {
                        //LAST RUN
                        let gearSlice;
                        let listedDefaults;
                        let grabbedName;
                        let fieldValueObj;
                        let i = 0;
                        do {
                            gearSlice = sliceFive[i];

                            if (gearSlice) {
                                //name, value, rarity, amount
                                if (gearSlice.slot === 'Mainhand') {
                                    listedDefaults =
                                        `\nValue: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nAttack: **${gearSlice.attack}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nHands: **${gearSlice.hands}**\nAmount: ${gearSlice.amount}\n`;
                                } else if (gearSlice.slot === 'Offhand') {
                                    listedDefaults =
                                        `\nValue: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nAttack: **${gearSlice.attack}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nAmount: ${gearSlice.amount}\n`;
                                } else {
                                    listedDefaults =
                                        `\nValue: **${gearSlice.value}c** \nRarity: **${gearSlice.rarity}** \nDefence: **${gearSlice.defence}** \nType: **${gearSlice.type}**\nSlot: **${gearSlice.slot}**\nAmount: ${gearSlice.amount}\n`;
                                }
                                grabbedName = `${gearSlice.name}`;

                                fieldValueObj = { name: grabbedName, value: listedDefaults, };

                                finalFields.push(fieldValueObj);
                            } else console.log(errorForm('gearSlice ERROR NOT FOUND!'));
                            i++;
                        } while (i < (Math.abs(curPos - totalItems)))

                        const embed = {
                            title: '~OWNED GEAR~',
                            description: `Page ${(curRun + 1)}/${lastPage}`,
                            color: 0000,
                            fields: finalFields
                        };
                        embedPages.push(embed);
                        //curPos += 5;
                    }
                    curRun++;
                } while (curRun < lastPage)

                const backButton = new ButtonBuilder()
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('◀️')
                    .setCustomId('back-page');

                const cancelButton = new ButtonBuilder()
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('*️⃣')
                    .setCustomId('delete-page');

                const forwardButton = new ButtonBuilder()
                    .setLabel("Forward")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('▶️')
                    .setCustomId('next-page');

                const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

                const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

                const filter = (i) => i.user.id === interaction.user.id;

                const collector = embedMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    filter,
                    time: 1200000,
                });

                var currentPage = 0;

                collector.on('collect', async (collInteract) => {
                    if (collInteract.customId === 'next-page') {
                        //console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);
                        await collInteract.deferUpdate().then(async () => {
                        //if statment to check if currently on the last page
                            if (currentPage === embedPages.length - 1) {
                                currentPage = 0;
                                await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                            } else {
                                currentPage += 1;
                                await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                }
                        }).catch(error => {
                            console.log(errorForm(error));
                        });
                    }
                    if (collInteract.customId === 'back-page') {
                        //console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);
                        await collInteract.deferUpdate().then(async () => {
                            if (currentPage === 0) {
                                currentPage = embedPages.length - 1;
                                await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                            } else {
                                currentPage -= 1;
                                await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                            }
                        }).catch(error => {
                            console.log(errorForm(error));
                        });
                    }
                    if (collInteract.customId === 'delete-page') {
                        collector.stop();
                    }
                });

                collector.on('end', () => {
                    if (embedMsg) {
                        embedMsg.delete().catch(error => {
                            if (error.code !== 10008) {
                                console.error('Failed to delete the message:', error);
                            }
                        });
                    } else if (!embedMsg) {
                        //do nothing
                    }
                });
            }
            
        }

        if (interaction.options.getSubcommand() === 'materials') {
            await interaction.deferReply();
            const matStore = await MaterialStore.findOne({ where: { spec_id: interaction.user.id } });
            if (!matStore) return interaction.followUp('You do not have any materials yet!');

            const allMatsOwned = await MaterialStore.findAll({ where: { spec_id: interaction.user.id } });

            if (allMatsOwned.length < 10) {
                const user = await UserData.findOne({ where: [{ userid: interaction.user.id }] });
                await checkHintMaterialCombine(user, interaction);
            }

            //console.log(specialInfoForm('allMatsOwned at pos 0: ', allMatsOwned[0].name));
            var embedPages = [];

            let listedDefaults;
            let grabbedName;

            let grabbedColour;

            let matSlice;
            let i = 0;
            do {
                matSlice = allMatsOwned[i];
                 
                if (matSlice) {
                    //name, value, rarity, amount
                    listedDefaults = 
                        `Value: ${matSlice.value} \nType: ${matSlice.mattype} \nRarity: ${matSlice.rarity} \nAmount Owned: ${matSlice.amount}`;

                    grabbedName = `${matSlice.name}`;
                    grabbedColour = await grabColour(matSlice.rar_id);

                    const embed = {
                        title: `~OWNED MATERIALS~`,
                        color: grabbedColour,
                        fields: [
                            {
                                name: `${grabbedName}`, value: `${listedDefaults}`,
                            }
                        ],
                    };

                    embedPages.push(embed);
                } else console.log(errorForm('matSlice ERROR NOT FOUND!'));
                i++;
            } while (i < allMatsOwned.length)

            if (embedPages.length <= 0) return console.log(errorForm('NO EMBED PAGES EXIST ERROR'));

            const backButton = new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('◀️')
                .setCustomId('back-page');

            const cancelButton = new ButtonBuilder()
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('*️⃣')
                .setCustomId('delete-page');

            const forwardButton = new ButtonBuilder()
                .setLabel("Forward")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('▶️')
                .setCustomId('next-page')

            const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

            const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

            const filter = (ID) => ID.user.id === interaction.user.id;

            const collector = embedMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 300000,
            });

            var currentPage = 0;

            collector.on('collect', async (collInteract) => {
                if (collInteract.customId === 'next-page') {
                    await collInteract.deferUpdate();
                    if (currentPage === embedPages.length - 1) {
                        currentPage = 0;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    } else {
                        currentPage += 1;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    }
                }

                if (collInteract.customId === 'back-page') {
                    await collInteract.deferUpdate();
                    if (currentPage === 0) {
                        currentPage = embedPages.length - 1;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    } else {
                        currentPage -= 1;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    }
                }

                if (collInteract.customId === 'delete-page') {
                    await collInteract.deferUpdate();
                    await collector.stop();
                }
            });

            collector.on('end', () => {
                if (embedMsg) {
                    embedMsg.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }
            });
        }

        if (interaction.options.getSubcommand() === 'potions') {
            await interaction.deferReply();
            const potionCheck = await OwnedPotions.findOne({ where: { spec_id: interaction.user.id } });
            if (!potionCheck) return interaction.followUp('You have no potions! Use ``/blueprint view`` to make some!');

            const allPotsOwned = await OwnedPotions.findAll({ where: { spec_id: interaction.user.id } });

            const user = await UserData.findOne({ where: [{ userid: interaction.user.id }] });
            await checkHintPotionEquip(user, interaction);

            var embedPages = [];

            let listedDefaults;
            let grabbedName;

            let potSlice;
            let i = 0;
            do {
                potSlice = allPotsOwned[i];

                if (potSlice) {
                    //name, value, rarity, amount
                    listedDefaults =
                        `Value: ${potSlice.value} \nDuration: ${potSlice.duration} \nCool Down: ${potSlice.cooldown} \nAmount Owned: ${potSlice.amount}`;

                    grabbedName = `${potSlice.name}`;                   

                    const embed = {
                        title: `~OWNED POTIONS~`,
                        color: 0000,
                        fields: [
                            {
                                name: `${grabbedName}`, value: `${listedDefaults}`,
                            }
                        ],
                    };

                    embedPages.push(embed);
                } else console.log(errorForm('potSlice ERROR NOT FOUND!'));
                i++;
            } while (i < allPotsOwned.length)

            if (embedPages.length <= 0) return console.log(errorForm('NO EMBED PAGES EXIST ERROR'));

            const backButton = new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('◀️')
                .setCustomId('back-page');

            const cancelButton = new ButtonBuilder()
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('*️⃣')
                .setCustomId('delete-page');

            const forwardButton = new ButtonBuilder()
                .setLabel("Forward")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('▶️')
                .setCustomId('next-page')

            const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

            const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

            const filter = (ID) => ID.user.id === interaction.user.id;

            const collector = embedMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 300000,
            });

            var currentPage = 0;

            collector.on('collect', async (collInteract) => {
                if (collInteract.customId === 'next-page') {
                    await collInteract.deferUpdate();
                    if (currentPage === embedPages.length - 1) {
                        currentPage = 0;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    } else {
                        currentPage += 1;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    }
                }

                if (collInteract.customId === 'back-page') {
                    await collInteract.deferUpdate();
                    if (currentPage === 0) {
                        currentPage = embedPages.length - 1;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    } else {
                        currentPage -= 1;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    }
                }

                if (collInteract.customId === 'delete-page') {
                    await collInteract.deferUpdate();
                    await collector.stop();
                }
            });

            collector.on('end', () => {
                if (embedMsg) {
                    embedMsg.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }
            });
        }

        if (interaction.options.getSubcommand() === 'tools') {
            await interaction.deferReply();
            const toolCheck = await OwnedTools.findOne({ where: { spec_id: interaction.user.id } });
            if (!toolCheck) return interaction.followUp('You have no tools! Use ``/blueprint view`` to make some!');

            const allToolsOwned = await OwnedTools.findAll({ where: { spec_id: interaction.user.id } });

            const user = await UserData.findOne({ where: [{ userid: interaction.user.id }] });
            await checkHintPigmyGive(user, interaction);

            var embedPages = [];

            let listedDefaults;
            let grabbedName;
            let grabbedColour;

            let toolSlice;
            let i = 0;
            do {
                toolSlice = allToolsOwned[i];

                if (toolSlice) {
                    //name, value, rarity, amount
                    listedDefaults =
                        `Used for: ${toolSlice.activecategory} \nGive slot: ${toolSlice.activesubcategory} \nRarity: ${toolSlice.rarity} \nAmount: ${toolSlice.amount}`;

                    grabbedName = `${toolSlice.name}`;

                    grabbedColour = await grabColour(toolSlice.rar_id, false);

                    const embed = {
                        title: `~OWNED TOOLS~`,
                        color: grabbedColour,
                        fields: [
                            {
                                name: `${grabbedName}`, value: `${listedDefaults}`,
                            }
                        ],
                    };

                    embedPages.push(embed);
                } else console.log(errorForm('toolSlice ERROR NOT FOUND!'));
                i++;
            } while (i < allToolsOwned.length)

            if (embedPages.length <= 0) return console.log(errorForm('NO EMBED PAGES EXIST ERROR'));

            const backButton = new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('◀️')
                .setCustomId('back-page');

            const cancelButton = new ButtonBuilder()
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('*️⃣')
                .setCustomId('delete-page');

            const forwardButton = new ButtonBuilder()
                .setLabel("Forward")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('▶️')
                .setCustomId('next-page')

            const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

            const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

            const filter = (ID) => ID.user.id === interaction.user.id;

            const collector = embedMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 300000,
            });

            var currentPage = 0;

            collector.on('collect', async (collInteract) => {
                if (collInteract.customId === 'next-page') {
                    await collInteract.deferUpdate();
                    if (currentPage === embedPages.length - 1) {
                        currentPage = 0;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    } else {
                        currentPage += 1;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    }
                }

                if (collInteract.customId === 'back-page') {
                    await collInteract.deferUpdate();
                    if (currentPage === 0) {
                        currentPage = embedPages.length - 1;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    } else {
                        currentPage -= 1;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    }
                }

                if (collInteract.customId === 'delete-page') {
                    await collInteract.deferUpdate();
                    await collector.stop();
                }
            });

            collector.on('end', () => {
                if (embedMsg) {
                    embedMsg.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }
            });
        }

        if (interaction.options.getSubcommand() === 'unique') {
            await interaction.deferReply();
            const uniqueCheck = await UniqueCrafted.findOne({ where: { spec_id: interaction.user.id } });
            if (!uniqueCheck) return interaction.followUp('You have no Unique Gear! Use ``/blueprint view`` to make some!');

            const allUniqueOwned = await UniqueCrafted.findAll({ where: { spec_id: interaction.user.id } });

            const user = await UserData.findOne({ where: [{ userid: interaction.user.id }] });
            await checkHintUniqueEquip(user, interaction);

            var embedPages = [];

            let listedDefaults;
            let listedKillVal;
            let grabbedName;
            let grabbedColour;

            let uniqueSlice;
            let i = 0;
            do {
                uniqueSlice = allUniqueOwned[i];

                if (uniqueSlice) {
                    //name, value, rarity, amount
                    if (uniqueSlice.slot === 'Mainhand') {
                        listedDefaults =
                            `Name: **${uniqueSlice.name}** \nValue: **${uniqueSlice.value}c** \nRarity: **${uniqueSlice.rarity}** \nAttack: **${uniqueSlice.Attack}** \nType: **${uniqueSlice.Type}**\nSlot: **${uniqueSlice.slot}**\nHands: **${uniqueSlice.hands}**\n\n`;
                    } else if (uniqueSlice.slot === 'Offhand') {
                        listedDefaults =
                            `Name: **${uniqueSlice.name}** \nValue: **${uniqueSlice.value}c** \nRarity: **${uniqueSlice.rarity}** \nAttack: **${uniqueSlice.Attack}** \nType: **${uniqueSlice.Type}**\nSlot: **${uniqueSlice.slot}**\n\n`;
                    } else {
                        listedDefaults =
                            `Name: **${uniqueSlice.name}** \nValue: **${uniqueSlice.value}c** \nRarity: **${uniqueSlice.rarity}** \nDefence: **${uniqueSlice.Defence}** \nType: **${uniqueSlice.Type}**\nSlot: **${uniqueSlice.slot}**\n\n`;
                    }

                    listedKillVal =
                        `Total Kills: ${uniqueSlice.totalkills} \nKills this level: ${uniqueSlice.killsthislevel} \nCurrent Level: ${uniqueSlice.currentlevel}`;

                    grabbedName = `${uniqueSlice.name}`;

                    grabbedColour = await grabColour(uniqueSlice.rar_id, false);

                    const embed = {
                        title: `~OWNED UNIQUE GEAR~`,
                        color: grabbedColour,
                        fields: [
                            {
                                name: `${grabbedName}`, value: `${listedDefaults}`,
                            },
                            {
                                name: 'Kill Stats: ', value: `${listedKillVal}`,
                            }
                        ],
                    };

                    embedPages.push(embed);
                } else console.log(errorForm('uniqueSlice ERROR NOT FOUND!'));
                i++;
            } while (i < allUniqueOwned.length)

            if (embedPages.length <= 0) return console.log(errorForm('NO EMBED PAGES EXIST ERROR'));

            const backButton = new ButtonBuilder()
                .setLabel("Back")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('◀️')
                .setCustomId('back-page');

            const cancelButton = new ButtonBuilder()
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('*️⃣')
                .setCustomId('delete-page');

            const forwardButton = new ButtonBuilder()
                .setLabel("Forward")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('▶️')
                .setCustomId('next-page')

            const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

            const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

            const filter = (ID) => ID.user.id === interaction.user.id;

            const collector = embedMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 300000,
            });

            var currentPage = 0;

            collector.on('collect', async (collInteract) => {
                if (collInteract.customId === 'next-page') {
                    await collInteract.deferUpdate();
                    if (currentPage === embedPages.length - 1) {
                        currentPage = 0;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    } else {
                        currentPage += 1;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    }
                }

                if (collInteract.customId === 'back-page') {
                    await collInteract.deferUpdate();
                    if (currentPage === 0) {
                        currentPage = embedPages.length - 1;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    } else {
                        currentPage -= 1;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    }
                }

                if (collInteract.customId === 'delete-page') {
                    await collInteract.deferUpdate();
                    await collector.stop();
                }
            });

            collector.on('end', () => {
                if (embedMsg) {
                    embedMsg.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }
            });
        }
	},

};
