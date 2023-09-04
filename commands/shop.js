const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const { UserData, LootShop, LootStore } = require('../dbObjects.js');
const { grabRar } = require('./exported/grabRar.js');

const lootList = require('../events/Models/json_prefabs/lootList.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('shop')
        .setDescription('Buy some new gear!'),

    async execute(interaction) {
        await interaction.deferReply();
        //await wait(1000);
        //await interaction.deleteReply();

        startShop();

        async function startShop(){
            await loadShop();

            const items = await LootShop.findAll({ where: [{ spec_id: interaction.user.id }] });

            var list = (items
                .map(item => `Name: **${item.name}** \nValue: **${item.value}c** \nRarity: **${item.rarity}** \nAttack: **${item.attack}** \nType: **${item.type}**`)
                .join('\n\n'));

            console.log('ITEMS IN list: \n', list);


            const buttonsA = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('refresh')
                        .setLabel('Refresh Shop')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄'),
                )
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('slot1')
                        .setLabel('Slot 1')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('1️⃣'),
                )
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('slot2')
                        .setLabel('Slot 2')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('2️⃣'),
                )
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('slot3')
                        .setLabel('Slot 3')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('3️⃣'),
                )
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('slot4')
                        .setLabel('Slot 4')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('4️⃣'),
                );

            var uData = await grabU();

            //var footerCoins = `Your Coins: ${uData.coins}c`;

            const openShop = new EmbedBuilder()
                .setTitle("~Bloodstone Shoppe~")
                .setColor(0x39acf3)
                //.setFooter(footerCoins)
                .setDescription("Welcome to the shop! Take a look at the wares.. be quick they wont last forever.")
                .addFields(
                    {
                        name: ("<< ITEMS FOR SALE >>"),
                        value: list
                    },
                    {
                        name: 'Your Coins: ',
                        value: `${uData.coins}c`
                    }
                );
            interaction.followUp({ embeds: [openShop], components: [buttonsA] }).then(async embedMsg => {
                const collectorBut = embedMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 45000 });

                collectorBut.on('collect', async i => {
                     await i.deferUpdate();
                     await wait(1000);
                    if (i.user.id === interaction.user.id) {                       
                        if (i.customId === 'slot1') {
                            //await i.deferUpdate();
                            //await wait(1000);
                            const item = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 1 }] });
                            if (item) {
                                console.log('ITEM FOUND!', item);//item was found yaaaay

                                if (item.value > uData.coins) {
                                    console.log('ITEM COST HIGHER THAN COINS OF USER', item.value, uData.coins);
                                    return interaction.channel.send("You don't have enough coin for that one.. this aint a charity!");
                                } else {
                                    addItem(item);

                                    var cost = uData.coins - item.value;

                                    payUp(cost, uData);

                                    var data = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: item.loot_id }] });

                                    buttonsA.components[1].setDisabled(true);

                                    console.log('Button slot1: ', buttonsA.components[1]);

                                    await i.editReply({ components: [buttonsA] });

                                    if (data) return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount + 1} ${item.name}`);
                                    return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);

                                    //wipe db after this
                                }
                            } else console.log('ITEM NOT FOUND!');//item not found :(                       
                        }
                        else if (i.customId === 'slot2') {
                            //await i.deferUpdate();
                            //await wait(1000);
                            const item = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 2 }] });
                            if (item) {
                                console.log('ITEM FOUND!', item);//item was found yaaaay
                                //var uData = await grabU();
                                if (item.value > uData.coins) {
                                    console.log('ITEM COST HIGHER THAN COINS OF USER', item.value, uData.coins);
                                    return interaction.channel.send("You don't have enough coin for that one.. this aint a charity!");
                                } else {
                                    addItem(item);

                                    var cost = uData.coins - item.value;

                                    payUp(cost, uData);

                                    var data = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: item.loot_id }] });

                                    buttonsA.components[2].setDisabled(true);

                                    console.log('Button slot1: ', buttonsA.components[2]);

                                    await i.editReply({ components: [buttonsA] });

                                    if (data) return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount + 1} ${item.name}`);
                                    return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
                                    //wipe db after this
                                }

                            } else console.log('ITEM NOT FOUND!');//item not found :(
                        }
                        else if (i.customId === 'slot3') {
                            //await i.deferUpdate();
                            //await wait(1000);
                            const item = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 3 }] });
                            if (item) {
                                console.log('ITEM FOUND!', item);//item was found yaaaay
                                //var uData = await grabU();
                                if (item.value > uData.coins) {
                                    console.log('ITEM COST HIGHER THAN COINS OF USER', item.value, uData.coins);
                                    return interaction.channel.send("You don't have enough coin for that one.. this aint a charity!");
                                } else {
                                    addItem(item);

                                    var cost = uData.coins - item.value;

                                    payUp(cost, uData);

                                    var data = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: item.loot_id }] });

                                    buttonsA.components[3].setDisabled(true);

                                    console.log('Button slot1: ', buttonsA.components[3]);

                                    await i.editReply({ components: [buttonsA] });

                                    if (data) return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount + 1} ${item.name}`);
                                    return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
                                    //wipe db after this
                                }

                            } else console.log('ITEM NOT FOUND!');//item not found :(
                        }
                        else if (i.customId === 'slot4') {
                            //await i.deferUpdate();
                            //await wait(1000);
                            const item = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 4 }] });
                            if (item) {
                                console.log('ITEM FOUND!', item);//item was found yaaaay
                                //var uData = await grabU();
                                if (item.value > uData.coins) {
                                    console.log('ITEM COST HIGHER THAN COINS OF USER', item.value, uData.coins);
                                    return interaction.channel.send("You don't have enough coin for that one.. this aint a charity!");
                                } else {
                                    addItem(item);

                                    var cost = uData.coins - item.value;

                                    payUp(cost, uData);

                                    var data = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: item.loot_id }] });

                                    buttonsA.components[4].setDisabled(true);

                                    console.log('Button slot1: ', buttonsA.components[4]);

                                    await i.editReply({ components: [buttonsA] });

                                    if (data) return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount + 1} ${item.name}`);
                                    return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
                                    //wipe db after this
                                }

                            } else console.log('ITEM NOT FOUND!');//item not found :(
                        }
                        else if (i.customId === 'refresh') {
                            //delete the embed here
                            //await i.deferUpdate();
                            //await wait(1000);
                            await embedMsg.delete();
                            startShop();//run the entire script over again
                        }



                    } else {
                        i.reply({ content: `Nice try slick!`, ephemeral: true });
                    }
                });
            }).catch(console.error);
        }
        
        //=======================================
        //this method loads the entire shop grabbing each item individually and loading them accordingly
        async function loadShop() {

            //this allows for both --force and -f to force a recreate of the table used in the LootShop
            //const force = process.argv.includes('--force') || process.argv.includes('-f');

            //const rowCount = await LootShop.destroy({ where: [{ spec_id: interaction.user.id }] });
            //console.log('ROWS DELETED', rowCount);

            //this syncs the data in the table and calls if its been forced to recreated based on the above force line
            const user = await grabU();
            const edit = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }] });

            if (edit) {
                //==========================================
                //ITEMS WERE FOUND
                console.log('ITEMS WERE FOUND');
                //==========================================
                var iPool = [];
                var rarG = 0;
                //==================================================================

                //RUN THROUGH 1
                await console.log('==============================================');
                rarG = await grabRar(user.level); //this returns a number between 0 and 10 inclusive
                console.log('Rarity Grabbed 1: ', rarG);

                var pool1 = [];
                //for loop adding all items of requested rarity to iPool for selection
                for (var i = 0; i < lootList.length; i++) {

                    if (lootList[i].Rar_id === rarG) {
                        await pool1.push(lootList[i]);
                        console.log('CONTENTS OF lootList AT POSITION ' + i + ': ', lootList[i].Name, lootList[i].Value, lootList[i].Loot_id, lootList[i].Type);
                    } else {
                        //item not match keep looking
                    }
                }

                console.log('\nLENGTH OF ARRAY pool1: ', pool1.length);

                //list finished, select one item 
                var rIP1;
                if (pool1.length <= 1) {
                    rIP1 = 0;
                } else {
                    rIP1 = Math.floor(Math.random() * (pool1.length));
                }

                console.log('Contents of pool1 at position rIP1: ', pool1[rIP1]);

                //add selection to final list
                await iPool.push(pool1[rIP1]);
                rIP1 = 0;
                //=================================================================


                //RUN THROUGH 2
                //run through again
                await console.log('==============================================');
                rarG = await grabRar(user.level);
                console.log('\nRarity Grabbed 2: ', rarG);

                var pool2 = [];
                //for loop adding all items of requested rarity to iPool for selection
                for (var i = 0; i < lootList.length; i++) {

                    if (lootList[i].Rar_id === rarG) {
                        await pool2.push(lootList[i]);
                        console.log('CONTENTS OF lootList AT POSITION ' + i + ': ', lootList[i].Name, lootList[i].Value, lootList[i].Loot_id, lootList[i].Type);
                    }
                }

                console.log('\nLENGTH OF ARRAY pool2: ', pool2.length);

                //list finished, select one item 
                var rIP2;
                if (pool2.length <= 1) {
                    rIP2 = 0;
                } else {
                    rIP2 = Math.floor(Math.random() * (pool2.length));
                }

                console.log('Contents of pool2 at position rIP2: ', pool2[rIP2]);

                //add selection to final list
                await iPool.push(pool2[rIP2]);
                rIP2 = 1;
                //=================================================================


                //RUN THROUGH 3
                //run through again
                await console.log('==============================================');
                rarG = await grabRar(user.level);
                console.log('\nRarity Grabbed 3: ', rarG);

                var pool3 = [];
                //for loop adding all items of requested rarity to iPool for selection
                for (var i = 0; i < lootList.length; i++) {

                    if (lootList[i].Rar_id === rarG) {
                        await pool3.push(lootList[i]);
                        console.log('CONTENTS OF lootList AT POSITION ' + i + ': ', lootList[i].Name, lootList[i].Value, lootList[i].Loot_id, lootList[i].Type);
                    }
                }

                console.log('\nLENGTH OF ARRAY pool3: ', pool3.length);

                //list finished, select one item 
                var rIP3;
                if (pool3.length <= 1) {
                    rIP3 = 0;
                } else {
                    rIP3 = Math.floor(Math.random() * (pool3.length));
                }

                console.log('Contents of pool3 at position rIP3: ', pool3[rIP3]);

                //add selection to final list
                await iPool.push(pool3[rIP3]);
                rIP3 = 2;
                //=================================================================


                //RUN THROUGH 4
                //run through again
                await console.log('==============================================');
                rarG = await grabRar(user.level);
                console.log('\nRarity Grabbed 4: ', rarG);

                var pool4 = [];
                //for loop adding all items of requested rarity to iPool for selection
                for (var i = 0; i < lootList.length; i++) {

                    if (lootList[i].Rar_id === rarG) {
                        await pool4.push(lootList[i]);
                        console.log('CONTENTS OF lootList AT POSITION ' + i + ': ', lootList[i].Name, lootList[i].Value, lootList[i].Loot_id, lootList[i].Type);
                    }
                }

                console.log('\nLENGTH OF ARRAY pool4: ', pool4.length);

                //list finished, select one item 
                var rIP4;
                if (pool4.length <= 1) {
                    rIP4 = 0;
                } else {
                    rIP4 = Math.floor(Math.random() * (pool4.length));
                }

                console.log('Contents of pool4 at position rIP4: ', pool4[rIP4]);

                //add selection to final list
                await iPool.push(pool4[rIP4]);
                rIP4 = 3;
                //=================================================================


                console.log('Contents of iPool at position 0: ', iPool[0]);
                console.log('Contents of iPool at position 1: ', iPool[1]);
                console.log('Contents of iPool at position 2: ', iPool[2]);
                console.log('Contents of iPool at position 3: ', iPool[3]);

                console.log('Contents of iPool at position 4 should be undefined: ', iPool[4]);

                console.log(`REFERENCE TO ITEM OBJECT:\n ${iPool[rIP1].Name}\n ${iPool[rIP2].Name}\n ${iPool[rIP3].Name}\n ${iPool[rIP4].Name}\n`);

                const shop = [
                    LootShop.update(
                        {
                            name: iPool[rIP1].Name,
                            value: iPool[rIP1].Value,
                            rarity: iPool[rIP1].Rarity,
                            rar_id: iPool[rIP1].Rar_id,
                            attack: iPool[rIP1].Attack,
                            type: iPool[rIP1].Type,
                            loot_id: iPool[rIP1].Loot_id,
                            spec_id: interaction.user.id,
                        },
                        { where: [{ spec_id: interaction.user.id }, { shop_slot: 1 }] }
                    ),
                    LootShop.update(
                        {
                            name: iPool[rIP2].Name,
                            value: iPool[rIP2].Value,
                            rarity: iPool[rIP2].Rarity,
                            rar_id: iPool[rIP2].Rar_id,
                            attack: iPool[rIP2].Attack,
                            type: iPool[rIP2].Type,
                            loot_id: iPool[rIP2].Loot_id,
                            spec_id: interaction.user.id,
                        },
                        { where: [{ spec_id: interaction.user.id }, { shop_slot: 2 }] }
                    ),
                    LootShop.update(
                        {
                            name: iPool[rIP3].Name,
                            value: iPool[rIP3].Value,
                            rarity: iPool[rIP3].Rarity,
                            rar_id: iPool[rIP3].Rar_id,
                            attack: iPool[rIP3].Attack,
                            type: iPool[rIP3].Type,
                            loot_id: iPool[rIP3].Loot_id,
                            spec_id: interaction.user.id,
                        },
                        { where: [{ spec_id: interaction.user.id }, { shop_slot: 3 }] }
                    ),
                    LootShop.update(
                        {
                            name: iPool[rIP4].Name,
                            value: iPool[rIP4].Value,
                            rarity: iPool[rIP4].Rarity,
                            rar_id: iPool[rIP4].Rar_id,
                            attack: iPool[rIP4].Attack,
                            type: iPool[rIP4].Type,
                            loot_id: iPool[rIP4].Loot_id,
                            spec_id: interaction.user.id,
                        },
                        { where: [{ spec_id: interaction.user.id }, { shop_slot: 4 }] }
                    ),
                ];
                //this await forces the shop to return its data before closing the file 
                await Promise.all(shop);
                //log that data is synced
                console.log('Database synced');
                //close the connection
                //==========================================
            }
            if (!edit) {
            
                //==========================================
                //ITEMS WERE NOT FOUND
                console.log('ITEMS WERE NOT FOUND');
                //==========================================
                var iPool = [];
                var foundRar = 0;
                var rarG = 0;
                //==================================================================

                //RUN THROUGH 1
                await console.log('==============================================');
                rarG = await grabRar(user.level); //this returns a number between 0 and 10 inclusive
                console.log('Rarity Grabbed 1: ', rarG);

                var pool1 = [];
                //for loop adding all items of requested rarity to iPool for selection
                for (var i = 0; i < lootList.length; i++) {

                    if (lootList[i].Rar_id === rarG) {
                        await pool1.push(lootList[i]);
                        console.log('CONTENTS OF lootList AT POSITION ' + i + ': ', lootList[i].Name, lootList[i].Value, lootList[i].Loot_id, lootList[i].Type);
                    } else {
                        //item not match keep looking
                    }
                }

                console.log('\nLENGTH OF ARRAY pool1: ', pool1.length);

                //list finished, select one item 
                var rIP1;
                if (pool1.length <= 1) {
                    rIP1 = 0;
                } else {
                    rIP1 = Math.floor(Math.random() * (pool1.length));
                }

                console.log('Contents of pool1 at position rIP1: ', pool1[rIP1]);

                //add selection to final list
                await iPool.push(pool1[rIP1]);
                rIP1 = 0;
                //=================================================================


                //RUN THROUGH 2
                //run through again
                await console.log('==============================================');
                rarG = await grabRar(user.level);
                console.log('\nRarity Grabbed 2: ', rarG);

                var pool2 = [];
                //for loop adding all items of requested rarity to iPool for selection
                for (var i = 0; i < lootList.length; i++) {

                    if (lootList[i].Rar_id === rarG) {
                        await pool2.push(lootList[i]);
                        console.log('CONTENTS OF lootList AT POSITION ' + i + ': ', lootList[i].Name, lootList[i].Value, lootList[i].Loot_id, lootList[i].Type);
                    }
                }

                console.log('\nLENGTH OF ARRAY pool2: ', pool2.length);

                //list finished, select one item 
                var rIP2;
                if (pool2.length <= 1) {
                    rIP2 = 0;
                } else {
                    rIP2 = Math.floor(Math.random() * (pool2.length));
                }

                console.log('Contents of pool2 at position rIP2: ', pool2[rIP2]);

                //add selection to final list
                await iPool.push(pool2[rIP2]);
                rIP2 = 1;
                //=================================================================


                //RUN THROUGH 3
                //run through again
                await console.log('==============================================');
                rarG = await grabRar(user.level);
                console.log('\nRarity Grabbed 3: ', rarG);

                var pool3 = [];
                //for loop adding all items of requested rarity to iPool for selection
                for (var i = 0; i < lootList.length; i++) {

                    if (lootList[i].Rar_id === rarG) {
                        await pool3.push(lootList[i]);
                        console.log('CONTENTS OF lootList AT POSITION ' + i + ': ', lootList[i].Name, lootList[i].Value, lootList[i].Loot_id, lootList[i].Type);
                    }
                }

                console.log('\nLENGTH OF ARRAY pool3: ', pool3.length);

                //list finished, select one item 
                var rIP3;
                if (pool3.length <= 1) {
                    rIP3 = 0;
                } else {
                    rIP3 = Math.floor(Math.random() * (pool3.length));
                }

                console.log('Contents of pool3 at position rIP3: ', pool3[rIP3]);

                //add selection to final list
                await iPool.push(pool3[rIP3]);
                rIP3 = 2;
                //=================================================================


                //RUN THROUGH 4
                //run through again
                await console.log('==============================================');
                rarG = await grabRar(user.level);
                console.log('\nRarity Grabbed 4: ', rarG);

                var pool4 = [];
                //for loop adding all items of requested rarity to iPool for selection
                for (var i = 0; i < lootList.length; i++) {

                    if (lootList[i].Rar_id === rarG) {
                        await pool4.push(lootList[i]);
                        console.log('CONTENTS OF lootList AT POSITION ' + i + ': ', lootList[i].Name, lootList[i].Value, lootList[i].Loot_id, lootList[i].Type);
                    }
                }

                console.log('\nLENGTH OF ARRAY pool4: ', pool4.length);

                //list finished, select one item 
                var rIP4;
                if (pool4.length <= 1) {
                    rIP4 = 0;
                } else {
                    rIP4 = Math.floor(Math.random() * (pool4.length));
                }

                console.log('Contents of pool4 at position rIP4: ', pool4[rIP4]);

                //add selection to final list
                await iPool.push(pool4[rIP4]);
                rIP4 = 3;
                //=================================================================


                console.log('Contents of iPool at position 0: ', iPool[0]);
                console.log('Contents of iPool at position 1: ', iPool[1]);
                console.log('Contents of iPool at position 2: ', iPool[2]);
                console.log('Contents of iPool at position 3: ', iPool[3]);

                console.log('Contents of iPool at position 4 should be undefined: ', iPool[4]);

                console.log(`REFERENCE TO ITEM OBJECT:\n ${iPool[rIP1].Name}\n ${iPool[rIP2].Name}\n ${iPool[rIP3].Name}\n ${iPool[rIP4].Name}\n`);


                const shop = [
                    LootShop.create(
                        {
                            name: iPool[rIP1].Name,
                            value: iPool[rIP1].Value,
                            rarity: iPool[rIP1].Rarity,
                            rar_id: iPool[rIP1].Rar_id,
                            attack: iPool[rIP1].Attack,
                            type: iPool[rIP1].Type,
                            loot_id: iPool[rIP1].Loot_id,
                            spec_id: interaction.user.id,
                            shop_slot: 1,
                        }
                    ),
                    LootShop.create(
                        {
                            name: iPool[rIP2].Name,
                            value: iPool[rIP2].Value,
                            rarity: iPool[rIP2].Rarity,
                            rar_id: iPool[rIP2].Rar_id,
                            attack: iPool[rIP2].Attack,
                            type: iPool[rIP2].Type,
                            loot_id: iPool[rIP2].Loot_id,
                            spec_id: interaction.user.id,
                            shop_slot: 2,
                        }
                    ),
                    LootShop.create(
                        {
                            name: iPool[rIP3].Name,
                            value: iPool[rIP3].Value,
                            rarity: iPool[rIP3].Rarity,
                            rar_id: iPool[rIP3].Rar_id,
                            attack: iPool[rIP3].Attack,
                            type: iPool[rIP3].Type,
                            loot_id: iPool[rIP3].Loot_id,
                            spec_id: interaction.user.id,
                            shop_slot: 3,
                        }
                    ),
                    LootShop.create(
                        {
                            name: iPool[rIP4].Name,
                            value: iPool[rIP4].Value,
                            rarity: iPool[rIP4].Rarity,
                            rar_id: iPool[rIP4].Rar_id,
                            attack: iPool[rIP4].Attack,
                            type: iPool[rIP4].Type,
                            loot_id: iPool[rIP4].Loot_id,
                            spec_id: interaction.user.id,
                            shop_slot: 4,
                        }
                    ),
                ];

                //this await forces the shop to return its data before closing the file 
                await Promise.all(shop);
                //log that data is synced
                console.log('Database synced');
                //close the connection
                //==========================================


            } else {
                //something went wrong :o
                console.log('\nSOMETHING WENT WRONG!\n');
            }   
        }      

        async function grabU() {
            uData = await UserData.findOne({ where: { userid: interaction.user.id } });
            return uData;
        }

        async function addItem(item) {
            //create new search var to find any Item within the UserItem file pertaining to the User in question
            //.findOne() retrevies a single row of data
            //where : {} ensures only the row desired is grabbed
            const lootStore = await LootStore.findOne({
                where: { spec_id: interaction.user.id, loot_id: item.loot_id },
            });

            console.log('UserItem: ', lootStore);

            //check if an item was found in the previous .findOne()
            //this checks if there is an item stored in the UserItems and adds one to the amount as defined in the dbInit script
            //then return as a save call on the userItem data
            if (lootStore) {
                lootStore.amount += 1;
                return lootStore.save();
            }

            //grab reference to user
            const uData = await grabU();
            //increase item total
            uData.totitem += 1;

            await uData.save();

            //if item is not found create a new one with the values requested
            return LootStore.create({
                name: item.name,
                value: item.value,
                loot_id: item.loot_id,
                spec_id: interaction.user.id,
                rarity: item.rarity,
                rar_id: item.rar_id,
                attack: item.attack,
                type: item.type,
                amount: 1
            });
        }

        async function payUp(cost, uData) {
            const editC = await UserData.update({ coins: cost }, { where: { username: uData.username } });

            if (editC) {
                //coins were changed with success!
                console.log('USER COINS HAVE BEEN UPDATED!');
            }
        }
	},
};
