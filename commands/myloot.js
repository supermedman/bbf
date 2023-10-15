const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const { UserData, LootStore } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('myloot')
        .setDescription('What have you got in those pockets precious?'),

    async execute(interaction) {
        await interaction.deferReply();
        const loFound = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }] });

        if (!loFound) {
            return interaction.followUp('Sorry but you dont have any items yet! Use the command ``/shop`` to open the shop and make your first purchase.');
        } else {

            const items = await LootStore.findAll({ where: [{ spec_id: interaction.user.id }] });

            const theUser = await UserData.findOne({ where: [{ userid: interaction.user.id }] });

            //***THIS DOES NOT WORK NEED TO FIX IT ASAP***
            if (theUser.totitem > 5) {
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
                var list = [];

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
                                `Name: **${off.name}** \nValue: **${off.value}c** \nRarity: **${off.rarity}** \nAttack: **${off.attack}** \nType: **${off.type}**\nSlot: **${off.slot}**`)
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
                                `Name: **${off.name}** \nValue: **${off.value}c** \nRarity: **${off.rarity}** \nAttack: **${off.attack}** \nType: **${off.type}**\nSlot: **${off.slot}**`)
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
                            list = (armorSlot.slice(curPos, (curPos + 5)).map(gear => `Name: **${gear.name}** \nValue: **${gear.value}c** \nRarity: **${gear.rarity}** \nDefence: **${gear.defence}** \nType: **${gear.type}**\nSlot: **${gear.slot}**`)
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
                            list = (armorSlot.slice(curPos, (curPos + armorLeft)).map(gear => `Name: **${gear.name}** \nValue: **${gear.value}c** \nRarity: **${gear.rarity}** \nDefence: **${gear.defence}** \nType: **${gear.type}**\nSlot: **${gear.slot}**`)
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
                    if (i.customId === 'next-page') {
                        console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);

                        //if statment to check if currently on the last page
                        if (currentPage === embedPages.length - 1) {
                            currentPage = 0;
                            await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                            await collInteract.deferUpdate();
                            await wait(1000);
                        } else {
                            currentPage += 1;
                            await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                            await collInteract.deferUpdate();
                            await wait(1000);
                        }
                    }
                    if (i.customId === 'back-page') {
                        console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);

                        if (currentPage === 0) {
                            currentPage = embedPages.length - 1;
                            await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                            await collInteract.deferUpdate();
                            await wait(1000);
                        } else {
                            currentPage -= 1;
                            await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                            await collInteract.deferUpdate();
                            await wait(1000);
                        }
                    }
                    if (i.customId === 'delete-page') {
                        await i.deferUpdate();
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
            else if (theUser.totitem <= 5) {
                try {
                    var list = (items
                        .map(item => `Name: **${item.name}**\nValue: **${item.value}c**\nRarity: **${item.rarity}**\nAttack: **${item.attack}**\nType: **${item.type}**\nAmount Owned: **${item.amount}**`)
                        .join('\n\n'));

                    console.log('ITEMS IN list: \n', list);

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

                    interaction.followUp({ embeds: [openInv] });
                } catch (err) { console.error(err); }

            }
        }
	},

};
