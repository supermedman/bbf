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

            const tooMany = await UserData.findOne({ where: [{ userid: interaction.user.id }] });

            //***THIS DOES NOT WORK NEED TO FIX IT ASAP***
            if (tooMany.totitem > 5) {
                //user has more then 5 items, need to separate onto different pages
                //do this by making a button for going forward a page and going back a page
                //allow buttons to loop from page 1 to last page and vice-versa
                console.log('TOO MANY ITEMS!');

                //CREATE THREE BUTTONS FOR PAGE OPTIONS
                const interactiveButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Back")
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('◀️')
                            .setCustomId('back-page'),
                    )
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Cancel")
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('*️⃣')
                            .setCustomId('delete-page')
                    )
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Forward")
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('▶️')
                            .setCustomId('next-page'),
                    );

                //define the maximum page limit per items assigned to user in question
                const totalItems = tooMany.totitem;
                console.log('Total Items / 5:', (totalItems / 5));
                //THIS BREAKS!!
                //ADD CHECK FOR ADDITIONAL PAGES FOR LEFTOVER ITEMS
                var maxEmbedPages = Math.round((totalItems / 5));
                if ((totalItems % 5) < 0.6 && (totalItems % 5) > 0) {
                    //Remainder exists, add extra page to the list
                    maxEmbedPages += 1;
                } else {
                    //do nothing
                } 
                console.log(`maxEmbedPages: ${maxEmbedPages}`);
                //total number of full loot pages found, figure out how to catch if there is remaining
                var embedPages = [];
                var iLeft = totalItems;
                var curPos = 0;

                //this for loop will loop for x given maxEmbedPages 
                //ex. if user has 20 items this will run 4 times and create 4 embeds
                for (var i = 0; i < maxEmbedPages; i++) {

                    //if there are more than 5 items left loop 5 times else loop iLeft times
                    if (iLeft > 5) {
                        //this for loop will loop 5 times
                        for (var n = 0; n < 5; n++) {
                            var list = (items.slice(curPos, (curPos + 5)).map(item =>
                                `Name: **${item.name}**\nValue: **${item.value}c**\nRarity: **${item.rarity}**\nAttack: **${item.attack}**\nType: **${item.type}**\nAmount Owned: **${item.amount}** `)
                                .join('\n\n'));
                        }
                        curPos += 5;//increase curPos by 5 in order to start next embed page where prior page ended

                        list.toString();//convert list to string to avoid any errors

                        console.log(`\nList \n${list.toString()} \n@ pos ${i}`);//log the outcome

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
                    }
                    else if (iLeft < 5) {
                        //this for loop will loop iLeft times
                        for (var n = 0; n < iLeft; n++) {
                            var list = (items.slice(curPos, (curPos + iLeft)).map(item =>
                                `Name: **${item.name}**\nValue: **${item.value}c**\nRarity: **${item.rarity}**\nAttack: **${item.attack}**\nType: **${item.type}**\nAmount Owned: **${item.amount}** `)
                                .join('\n\n'));
                        }
                       
                        //convert list to string to avoid any errors
                        console.log(`\nList \n${list.toString()} \n@ pos ${i}`);//log the outcome

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
                    }

                    iLeft -= 5;

                }
                await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] }).then(async embedMsg => {
                    const collectorBut = embedMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 1200000 });

                    var currentPage = 0;

                    collectorBut.on('collect', async i => {
                        if (i.user.id === interaction.user.id) {
                            //delete the embed here                             
                            //first check for what button has been pressed
                            //second find what discord embed page is currently displayed
                            //third change page accordingly
                            //fourth.. figure out why it wont be that easy



                            if (i.customId === 'next-page') {
                                //always start on first page
                                //check what page is currently active
                                //add 1 to embed array 
                                //show results and increase currentPage + 1

                                console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);

                                //if statment to check if currently on the last page
                                if (currentPage === embedPages.length - 1) {
                                    currentPage = 0;                                  
                                    await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                    await i.deferUpdate();
                                    await wait(1000);
                                } else {
                                    currentPage += 1;                                  
                                    await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                    await i.deferUpdate();
                                    await wait(1000);
                                }


                            } else if (i.customId === 'back-page') {
                                //check what page is currently active
                                //add 1 to embed array 
                                //show results and decrease currentPage - 1

                                console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);

                                if (currentPage === 0) {
                                    currentPage = embedPages.length - 1;                                 
                                    await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                    await i.deferUpdate();
                                    await wait(1000);
                                } else {
                                    currentPage -= 1;                                    
                                    await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                    await i.deferUpdate();
                                    await wait(1000);
                                }
                            } else if (i.customId === 'delete-page') {
                                //embedMsg.edit(`:white_check_mark: Inventory Cancelled.`);
                                await i.deferUpdate();
                                wait(5000).then(async () => {                                                                    
                                    await embedMsg.delete();
                                }).catch(console.error);
                            }
                        } else {
                            i.reply({ content: `Nice try slick!`, ephemeral: true });
                        }
                    });

                }).catch(console.error);
            }
            else if (tooMany.totitem <= 5) {
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
