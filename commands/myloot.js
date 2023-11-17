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

const { UserData, LootStore, MaterialStore, OwnedPotions } = require('../dbObjects.js');

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
                .setDescription('View a list of all owned potions')),

    async execute(interaction) {
        
        if (interaction.options.getSubcommand() === 'gear') {
            await interaction.deferReply();
            const loFound = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }] });

            if (!loFound) {
                return interaction.followUp('Sorry but you dont have any items yet! Use the command ``/shop`` to open the shop and make your first purchase.');
            } else {

                const items = await LootStore.findAll({ where: [{ spec_id: interaction.user.id }] });

                const theUser = await UserData.findOne({ where: [{ userid: interaction.user.id }] });

                //***THIS DOES NOT WORK NEED TO FIX IT ASAP***
                if (theUser.totitem < 5) {
                    const itemAmount = theUser.totitem;

                    var listedInOrder = [];
                    var i = 0;
                    //var pos = 1;
                    var tempItemRef = [];
                    var itemStringValue = ` `;
                    let list = [];

                    const mainHand = await items.filter(item => item.slot === 'Mainhand');
                    console.log(`mainHand contents: ${mainHand}`);

                    const offHand = await items.filter(item => item.slot === 'Offhand');
                    console.log(`offHand contents: ${offHand}`);

                    const headSlot = await items.filter(item => item.slot === 'Headslot');
                    console.log(`headSlot contents: ${headSlot}`);

                    const chestSlot = await items.filter(item => item.slot === 'Chestslot');
                    console.log(`chestSlot contents: ${chestSlot}`);

                    const legSlot = await items.filter(item => item.slot === 'Legslot');
                    console.log(`legSlot contents: ${legSlot}`);

                    listedInOrder = listedInOrder.concat(mainHand, offHand, headSlot, chestSlot, legSlot);
                    console.log(listedInOrder);
                    do {
                        if (listedInOrder[i].slot === 'Mainhand') {
                            //Item is weapon
                            tempItemRef.push(listedInOrder[i]);
                            console.log(tempItemRef);
                            itemStringValue = (tempItemRef.map(wep =>
                                `Name: **${wep.name}** \nValue: **${wep.value}c** \nRarity: **${wep.rarity}** \nAttack: **${wep.attack}** \nType: **${wep.type}**\nSlot: **${wep.slot}**\nHands: **${wep.hands}**\n\n`)
                                .join('\n\n'));
                            console.log(itemStringValue);
                            list.push(itemStringValue);
                            tempItemRef = [];
                            i++;
                        } else if (listedInOrder[i].slot === 'Offhand') {
                            //Item is offhand
                            tempItemRef.push(listedInOrder[i]);
                            console.log(tempItemRef);
                            itemStringValue = (tempItemRef.map(off =>
                                `Name: **${off.name}** \nValue: **${off.value}c** \nRarity: **${off.rarity}** \nAttack: **${off.attack}** \nType: **${off.type}**\nSlot: **${off.slot}**\n\n`)
                                .join('\n\n'));
                            list.push(itemStringValue);
                            tempItemRef = [];
                            i++;
                        } else if (listedInOrder[i].slot === 'Headslot') {
                            //Item is helm
                            tempItemRef.push(listedInOrder[i]);
                            console.log(tempItemRef);
                            itemStringValue = (tempItemRef.map(gear =>
                                `Name: **${gear.name}** \nValue: **${gear.value}c** \nRarity: **${gear.rarity}** \nDefence: **${gear.defence}** \nType: **${gear.type}**\nSlot: **${gear.slot}**\n\n`)
                                .join('\n\n'));
                            list.push(itemStringValue);
                            tempItemRef = [];
                            i++;
                        } else if (listedInOrder[i].slot === 'Chestslot') {
                            //Item is chestplate
                            tempItemRef.push(listedInOrder[i]);
                            console.log(tempItemRef);
                            itemStringValue = (tempItemRef.map(gear =>
                                `Name: **${gear.name}** \nValue: **${gear.value}c** \nRarity: **${gear.rarity}** \nDefence: **${gear.defence}** \nType: **${gear.type}**\nSlot: **${gear.slot}**\n\n`)
                                .join('\n\n'));
                            list.push(itemStringValue);
                            tempItemRef = [];
                            i++;
                        } else if (listedInOrder[i].slot === 'Legslot') {
                            //Item is leggings
                            tempItemRef.push(listedInOrder[i]);
                            console.log(tempItemRef);
                            itemStringValue = (tempItemRef.map(gear =>
                                `Name: **${gear.name}** \nValue: **${gear.value}c** \nRarity: **${gear.rarity}** \nDefence: **${gear.defence}** \nType: **${gear.type}**\nSlot: **${gear.slot}**\n\n`)
                                .join('\n\n'));
                            list.push(itemStringValue);
                            tempItemRef = [];
                            i++;
                        }
                    } while (i < itemAmount)

                    console.log('ITEMS IN list: \n', list.toString());

                    list = list.toString();

                    const openInv = new EmbedBuilder()
                        .setTitle("~INVENTORY~")
                        .setColor(0000)
                        .setDescription("These are the items currently in your inventory!")
                        .addFields(
                            {
                                name: ("<< ITEMS STORED >>"),
                                value: list
                            }
                        )

                    await interaction.followUp({ embeds: [openInv] });
                } else if (theUser.totitem >= 5) {
                    //user has more then 5 items, need to separate onto different pages
                    //do this by making a button for going forward a page and going back a page
                    //allow buttons to loop from page 1 to last page and vice-versa
                    console.log('TOO MANY ITEMS!');

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

                    //define the maximum page limit per items assigned to user in question
                    const totalItems = theUser.totitem;
                    console.log('Total Items / 5:', (totalItems / 5));
                    //THIS BREAKS!!
                    //ADD CHECK FOR ADDITIONAL PAGES FOR LEFTOVER ITEMS
                    //var maxEmbedPages = Math.round((totalItems / 5));
                    var maxEmbedPages = 0;
                    console.log(`REMAINDER LOOT ITEMS: ${(totalItems % 5)}`);
                    //if ((totalItems % 5) > 0 && (totalItems % 5) < 3) {
                    //    //Remainder exists, add extra page to the list
                    //    maxEmbedPages += 1;
                    //} else {
                    //    //do nothing
                    //} 
                    console.log(`maxEmbedPages: ${maxEmbedPages}`);
                    //total number of full loot pages found, figure out how to catch if there is remaining
                    var embedPages = [];
                    var iLeft = totalItems;
                    var curPos = 0;

                    //this for loop will loop for x given maxEmbedPages 
                    //ex. if user has 20 items this will run 4 times and create 4 embeds

                    var i = 0;
                    let list = [];

                    const mainHand = await items.filter(item => item.slot === 'Mainhand');
                    console.log(`mainHand contents: ${mainHand}`);

                    var weaponsLeft = mainHand.length;
                    console.log(`WeaponsLeft: ${weaponsLeft}`);
                    for (var x = 0; x < mainHand.length;) {
                        if (weaponsLeft > 5) {
                            for (var n = 0; n < 5; n++) {
                                list = (mainHand.slice(curPos, (curPos + 5)).map(item =>
                                    `Name: ** ${item.name} **\nValue: ** ${item.value}c **\nRarity: ** ${item.rarity} **\nAttack: ** ${item.attack} **\nType: ** ${item.type}**\nSlot: **${item.slot}**\nHands: **${item.hands}**\nAmount: ** ${item.amount} **`)
                                    .join('\n\n'));
                            }
                            curPos += 5;
                            maxEmbedPages++;
                            //create discord embed using list mapped in previous for loop
                            const embed = new EmbedBuilder()
                                .setTitle("~INVENTORY~")
                                .setDescription(`Page ${i + 1}/${maxEmbedPages}`)
                                .setColor(0000)
                                .addFields(
                                    {
                                        name: ("<< ITEMS STORED >>"),
                                        value: list
                                    }
                                );

                            await embedPages.push(embed);//add new embed to embed pages
                            i++;
                            x += 5;
                            iLeft -= 5;
                            weaponsLeft -= 5;
                            console.log(`WeaponsLeft: ${weaponsLeft}`);
                        } else if (weaponsLeft <= 5) {
                            for (var n = 0; n < weaponsLeft; n++) {
                                list = (mainHand.slice(curPos, (curPos + weaponsLeft)).map(item =>
                                    `Name: ** ${item.name} **\nValue: ** ${item.value}c **\nRarity: ** ${item.rarity} **\nAttack: ** ${item.attack} **\nType: ** ${item.type}**\nSlot: **${item.slot}**\nHands: **${item.hands}**\nAmount: ** ${item.amount} **`)
                                    .join('\n\n'));
                            }
                            maxEmbedPages++;
                            //create discord embed using list mapped in previous for loop
                            const embed = new EmbedBuilder()
                                .setTitle("~INVENTORY~")
                                .setDescription(`Page ${i + 1}/${maxEmbedPages}`)
                                .setColor(0000)
                                .addFields(
                                    {
                                        name: ("<< ITEMS STORED >>"),
                                        value: list
                                    }
                                );
                            await embedPages.push(embed);//add new embed to embed pages  
                            i++;
                            iLeft -= weaponsLeft;
                            weaponsLeft = 0;
                            console.log(`WeaponsLeft: ${weaponsLeft}`);
                            x = mainHand.length;
                        }
                    }
                    curPos = 0;
                    const offHand = await items.filter(item => item.slot === 'Offhand');
                    console.log(`offHand contents: ${offHand}`);

                    var offHandsLeft = offHand.length;
                    console.log(`OffhandLeft: ${offHandsLeft}`);

                    for (var y = 0; y < offHand.length;) {
                        if (offHandsLeft > 5) {
                            for (var n = 0; n < 5; n++) {
                                list = (offHand.slice(curPos, (curPos + 5)).map(off =>
                                    `Name: **${off.name}** \nValue: **${off.value}c** \nRarity: **${off.rarity}** \nAttack: **${off.attack}** \nType: **${off.type}**\nSlot: **${off.slot}**\nAmount Owned: ${off.amount}`)
                                    .join('\n\n'));
                            }
                            curPos += 5;
                            maxEmbedPages++;
                            //create discord embed using list mapped in previous for loop
                            const embed = new EmbedBuilder()
                                .setTitle("~INVENTORY~")
                                .setDescription(`Page ${i + 1}/${maxEmbedPages}`)
                                .setColor(0000)
                                .addFields(
                                    {
                                        name: ("<< ITEMS STORED >>"),
                                        value: list
                                    }
                                );

                            await embedPages.push(embed);//add new embed to embed pages
                            i++;
                            y += 5;
                            iLeft -= 5;
                            offHandsLeft -= 5;
                        } else if (offHandsLeft <= 5) {
                            for (var n = 0; n < offHandsLeft; n++) {
                                list = (offHand.slice(curPos, (curPos + offHandsLeft)).map(off =>
                                    `Name: **${off.name}** \nValue: **${off.value}c** \nRarity: **${off.rarity}** \nAttack: **${off.attack}** \nType: **${off.type}**\nSlot: **${off.slot}**\nAmount Owned: ${off.amount}`)
                                    .join('\n\n'));
                            }
                            maxEmbedPages++;
                            //create discord embed using list mapped in previous for loop
                            const embed = new EmbedBuilder()
                                .setTitle("~INVENTORY~")
                                .setDescription(`Page ${i + 1}/${maxEmbedPages}`)
                                .setColor(0000)
                                .addFields(
                                    {
                                        name: ("<< ITEMS STORED >>"),
                                        value: list
                                    }
                                );
                            await embedPages.push(embed);//add new embed to embed pages 
                            i++;
                            y += offHandsLeft;
                            iLeft -= offHandsLeft;
                            offHandsLeft = 0;
                        }
                    }
                    curPos = 0;
                    var armorSlot = [];
                    const headSlot = await items.filter(item => item.slot === 'Headslot');
                    console.log(`headSlot contents: ${headSlot}`);

                    const chestSlot = await items.filter(item => item.slot === 'Chestslot');
                    console.log(`chestSlot contents: ${chestSlot}`);

                    const legSlot = await items.filter(item => item.slot === 'Legslot');
                    console.log(`legSlot contents: ${legSlot}`);

                    armorSlot = armorSlot.concat(headSlot, chestSlot, legSlot);
                    console.log(`armorSlot contents: ${armorSlot}`);

                    var armorLeft = armorSlot.length;
                    console.log(`ArmorLeft: ${armorLeft}`);

                    for (var z = 0; z < armorSlot.length;) {
                        if (armorLeft > 5) {
                            for (var n = 0; n < 5; n++) {
                                list = (armorSlot.slice(curPos, (curPos + 5)).map(gear => `Name: **${gear.name}** \nValue: **${gear.value}c** \nRarity: **${gear.rarity}** \nDefence: **${gear.defence}** \nType: **${gear.type}**\nSlot: **${gear.slot}**\nAmount Owned: ${gear.amount}`)
                                    .join('\n\n'));
                            }
                            curPos += 5;
                            maxEmbedPages++;
                            //create discord embed using list mapped in previous for loop
                            const embed = new EmbedBuilder()
                                .setTitle("~INVENTORY~")
                                .setDescription(`Page ${i + 1}/${maxEmbedPages}`)
                                .setColor(0000)
                                .addFields(
                                    {
                                        name: ("<< ITEMS STORED >>"),
                                        value: list
                                    }
                                );

                            await embedPages.push(embed);//add new embed to embed pages
                            i++;
                            z += 5;
                            iLeft -= 5;
                            armorLeft -= 5;
                        } else if (armorLeft <= 5) {
                            for (var n = 0; n < armorLeft; n++) {
                                list = (armorSlot.slice(curPos, (curPos + armorLeft)).map(gear => `Name: **${gear.name}** \nValue: **${gear.value}c** \nRarity: **${gear.rarity}** \nDefence: **${gear.defence}** \nType: **${gear.type}**\nSlot: **${gear.slot}**\nAmount Owned: ${gear.amount}`)
                                    .join('\n\n'));
                            }
                            maxEmbedPages++;
                            //create discord embed using list mapped in previous for loop
                            const embed = new EmbedBuilder()
                                .setTitle("~INVENTORY~")
                                .setDescription(`Page ${i + 1}/${maxEmbedPages}`)
                                .setColor(0000)
                                .addFields(
                                    {
                                        name: ("<< ITEMS STORED >>"),
                                        value: list
                                    }
                                );
                            await embedPages.push(embed);//add new embed to embed pages 
                            i++;
                            z += armorLeft;
                            iLeft -= armorLeft;
                            armorLeft = 0;
                        }
                    }
                    console.log(`iLeft should be 0 by this point: ${iLeft}`);

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
                            console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);
                            await collInteract.deferUpdate();
                            //if statment to check if currently on the last page
                            if (currentPage === embedPages.length - 1) {
                                currentPage = 0;
                                await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                await wait(1000);
                            } else {
                                currentPage += 1;
                                await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                await wait(1000);
                            }
                        }
                        if (collInteract.customId === 'back-page') {
                            console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);
                            await collInteract.deferUpdate();
                            if (currentPage === 0) {
                                currentPage = embedPages.length - 1;
                                await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                await wait(1000);
                            } else {
                                currentPage -= 1;
                                await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                await wait(1000);
                            }
                        }
                        if (collInteract.customId === 'delete-page') {
                            await collInteract.deferUpdate();
                            wait(5000).then(async () => {
                                await collector.stop();
                            });
                        }
                    });

                    collector.on('end', () => {
                        if (embedMsg) {
                            embedMsg.delete();
                        } else if (!embedMsg) {
                            //do nothing
                        }
                    });
                }
            }
        }

        if (interaction.options.getSubcommand() === 'materials') {
            await interaction.deferReply();
            const matStore = await MaterialStore.findOne({ where: { spec_id: interaction.user.id } });
            if (!matStore) return interaction.followUp('You do not have any materials yet!');

            const allMatsOwned = await MaterialStore.findAll({ where: { spec_id: interaction.user.id } });

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
                    embedMsg.delete();
                }
            });
        }

        if (interaction.options.getSubcommand() === 'potions') {
            await interaction.deferReply();
            const potionCheck = await OwnedPotions.findOne({ where: { spec_id: interaction.user.id } });
            if (!potionCheck) return interaction.followUp('You have no potions! Use ``/blueprint view`` to make some!');

            const allPotsOwned = await OwnedPotions.findAll({ where: { spec_id: interaction.user.id } });

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
                    embedMsg.delete();
                }
            });
        }
	},

};
