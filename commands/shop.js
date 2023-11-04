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

        //Refreshing the shop needs to cost more and more based on x
        //x is total cost of items currently in shop?
        //x is scaled based on total refreshes?
        //x is scaled daily upto a max?
        //x is scaled base on user level?

        //x is based on user level * current refreshes (resets daily) + total shop value  
        //Calling shop is free, set crazy cooldown once the above code works 
        //Give notice of refresh cost, and amount of refreshes made today
        //Check for new day on each shop call

        var refreshCost = 0;

        async function startShop() {
            refreshCost = 0;
            await loadShop();

            //const items = await LootShop.findAll({ where: [{ spec_id: interaction.user.id }] });

            var list = [];

            const item1 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 1 }] });
            const item2 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 2 }] });
            const item3 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 3 }] });
            const item4 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 4 }] });          

            const listedInOrder = [item1, item2, item3, item4];

            //Check each item for type adding to the list in order of shop slot, concat to string, check next item

            //for (var i = 0; i < items.length;) {
            //    if (items[i].slot === 'Mainhand' && items[i].shop_slot === (i + 1)) {
            //        //Item is a weapon
            //        listedInOrder.push(items[i].toString());
            //        i++;
            //    } else if (items[i].slot === 'Offhand' && items[i].shop_slot === (i + 1)) {
            //        //Item is an offhand
            //        listedInOrder.push(items[i].toString());
            //        i++;
            //    } else if (items[i].slot === armorFilter.slot && items[i].shop_slot === (i + 1)) {
            //        //Item is armor
            //        listedInOrder.push(items[i].toString());
            //        i++;
            //    }
            //}          

            //console.log(listedInOrder);
            var i = 0;
            var tempItemRef = [];
            var itemStringValue = ` `;

            do {
                if (listedInOrder[i].slot === 'Mainhand') {
                    //Item is weapon
                    tempItemRef.push(listedInOrder[i]);
                    itemStringValue = tempItemRef.map(wep =>
                        `Name: **${wep.name}** \nValue: **${wep.value}c** \nRarity: **${wep.rarity}** \nAttack: **${wep.attack}** \nType: **${wep.type}**\nSlot: **${wep.slot}**\nHands: **${wep.hands}**\n\n`);
                    list.push(itemStringValue);
                    tempItemRef = [];
                    i++;
                } else if (listedInOrder[i].slot === 'Offhand') {
                    //Item is offhand
                    tempItemRef.push(listedInOrder[i]);
                    itemStringValue = tempItemRef.map(off => `Name: **${off.name}** \nValue: **${off.value}c** \nRarity: **${off.rarity}** \nAttack: **${off.attack}** \nType: **${off.type}**\nSlot: **${off.slot}**\n\n`);
                    list.push(itemStringValue);
                    tempItemRef = [];
                    i++;
                } else if (listedInOrder[i].slot === 'Headslot') {
                    //Item is helm
                    tempItemRef.push(listedInOrder[i]);
                    itemStringValue = tempItemRef.map(gear => `Name: **${gear.name}** \nValue: **${gear.value}c** \nRarity: **${gear.rarity}** \nDefence: **${gear.defence}** \nType: **${gear.type}**\nSlot: **${gear.slot}**\n\n`);
                    list.push(itemStringValue);
                    tempItemRef = [];
                    i++;
                } else if (listedInOrder[i].slot === 'Chestslot') {
                    //Item is chestplate
                    tempItemRef.push(listedInOrder[i]);
                    itemStringValue = tempItemRef.map(gear => `Name: **${gear.name}** \nValue: **${gear.value}c** \nRarity: **${gear.rarity}** \nDefence: **${gear.defence}** \nType: **${gear.type}**\nSlot: **${gear.slot}**\n\n`);
                    list.push(itemStringValue);
                    tempItemRef = [];
                    i++;
                } else if (listedInOrder[i].slot === 'Legslot') {
                    //Item is leggings
                    tempItemRef.push(listedInOrder[i]);
                    itemStringValue = tempItemRef.map(gear => `Name: **${gear.name}** \nValue: **${gear.value}c** \nRarity: **${gear.rarity}** \nDefence: **${gear.defence}** \nType: **${gear.type}**\nSlot: **${gear.slot}**\n\n`);
                    list.push(itemStringValue);
                    tempItemRef = [];
                    i++;
                }
            } while (i < listedInOrder.length)


            
            //const armorFilter = { slot: ['Headslot', 'Chestslot', 'Legslot'] };

            //var mainHand = items.filter(item => item.slot === 'Mainhand');
            //console.log(`mainHand array: ${mainHand}`);
            //if (mainHand.length > 0) {
            //    var mainHandList = (mainHand.map(wep => `Name: **${wep.name}** \nValue: **${wep.value}c** \nRarity: **${wep.rarity}** \nAttack: **${wep.attack}** \nType: **${wep.type}**\nSlot: **${wep.slot}**\nHands: **${wep.hands}**`)
            //        .join('\n\n'));
            //    list = list.concat(mainHandList);
            //}

            //var offHand = items.filter(item => item.slot === 'Offhand');
            //console.log(`offHand array: ${offHand}`);
            //if (offHand.length > 0) {
            //    var offHandList = (offHand.map(off => `Name: **${off.name}** \nValue: **${off.value}c** \nRarity: **${off.rarity}** \nAttack: **${off.attack}** \nType: **${off.type}**\nSlot: **${off.slot}**`)
            //        .join('\n\n'));
            //    list = list.concat(['\n\n'], offHandList);
            //}

            //var armor = items.filter(item => item.slot === armorFilter.slot);
            //console.log(`armor array: ${armor}`);
            //if (armor.length > 0) {
            //    var armorList = (armor.map(gear => `Name: **${gear.name}** \nValue: **${gear.value}c** \nRarity: **${gear.rarity}** \nDefence: **${gear.defence}** \nType: **${gear.type}**\nSlot: **${gear.slot}**`)
            //        .join('\n\n'));
            //    list = list.concat(armorList);
            //}
            //===================================================
            //Making temp fix until filter is working correctly!
            //var headSlot = items.filter(item => item.slot === 'Headslot');
            //console.log(`armor array: ${headSlot}`);
            //if (headSlot.length > 0) {
            //    var headSlotList = (headSlot.map(gear => `Name: **${gear.name}** \nValue: **${gear.value}c** \nRarity: **${gear.rarity}** \nDefence: **${gear.defence}** \nType: **${gear.type}**\nSlot: **${gear.slot}**`)
            //        .join('\n\n'));
            //    list = list.concat(['\n\n'], headSlotList);
            //}
            //var chestSlot = items.filter(item => item.slot === 'Chestslot');
            //console.log(`armor array: ${chestSlot}`);
            //if (chestSlot.length > 0) {
            //    var chestSlotList = (chestSlot.map(gear => `Name: **${gear.name}** \nValue: **${gear.value}c** \nRarity: **${gear.rarity}** \nDefence: **${gear.defence}** \nType: **${gear.type}**\nSlot: **${gear.slot}**`)
            //        .join('\n\n'));
            //    list = list.concat(['\n\n'], chestSlotList);
            //}
            //var legSlot = items.filter(item => item.slot === 'Legslot');
            //console.log(`armor array: ${legSlot}`);
            //if (legSlot.length > 0) {
            //    var legSlotList = (legSlot.map(gear => `Name: **${gear.name}** \nValue: **${gear.value}c** \nRarity: **${gear.rarity}** \nDefence: **${gear.defence}** \nType: **${gear.type}**\nSlot: **${gear.slot}**`)
            //        .join('\n\n'));
            //    list = list.concat(['\n\n'], legSlotList);
            //}

            //===================================================
            //console.log('ITEMS IN list after armor: \n', list);
           
            //console.log('ITEMS IN list: \n', list);

            list = list.toString();

            var uData = await grabU();

            const displayCost = await checkShop(uData, refreshCost);

            //var currentRefreshCost = displayCost;
            refreshCost = displayCost;

            const refreshButton = new ButtonBuilder()
                .setCustomId('refresh')
                .setLabel(`Refresh Shop, Cost ${refreshCost}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄');

            const slotOneButton = new ButtonBuilder()
                .setCustomId('slot1')
                .setLabel('Slot 1')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('1️⃣');

            const slotTwoButton = new ButtonBuilder()
                .setCustomId('slot2')
                .setLabel('Slot 2')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('2️⃣');

            const slotThreeButton = new ButtonBuilder()
                .setCustomId('slot3')
                .setLabel('Slot 3')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('3️⃣');

            const slotFourButton = new ButtonBuilder()
                .setCustomId('slot4')
                .setLabel('Slot 4')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('4️⃣');

            const buttonsA = new ActionRowBuilder().addComponents(refreshButton, slotOneButton, slotTwoButton, slotThreeButton, slotFourButton);        

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

            const embedMsg = await interaction.followUp({ embeds: [openShop], components: [buttonsA] });

            const filter = (i) => i.user.id === interaction.user.id;

            const collector = embedMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 45000,
            });

            collector.on('collect', async (collInteract) => {               
                if (collInteract.customId === 'slot1') {
                    await collInteract.deferUpdate();
                    const item = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 1 }] });
                    if (item) {
                        console.log('ITEM FOUND!', item);//item was found yaaaay

                        if (item.value > uData.coins) {
                            console.log('ITEM COST HIGHER THAN COINS OF USER', item.value, uData.coins);
                            return interaction.channel.send("You don't have enough coin for that one.. this aint a charity!");
                        } else {
                            await addItem(item);

                            var cost = uData.coins - item.value;

                            payUp(cost, uData);

                            var data = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: item.loot_id }] });

                            slotOneButton.setDisabled(true);
                            refreshCost -= item.value;
                            refreshButton.setLabel(`Refresh Shop, Cost ${refreshCost}`);

                            console.log('Button slot1: ', buttonsA.components[1]);

                            await collInteract.editReply({ components: [buttonsA] });

                            if (data) return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
                            return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);

                            //wipe db after this
                        }
                    } else console.log('ITEM NOT FOUND!');//item not found :( 
                }
                if (collInteract.customId === 'slot2') {
                    await collInteract.deferUpdate();
                    const item = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 2 }] });
                    if (item) {
                        console.log('ITEM FOUND!', item);//item was found yaaaay
                        //var uData = await grabU();
                        if (item.value > uData.coins) {
                            console.log('ITEM COST HIGHER THAN COINS OF USER', item.value, uData.coins);
                            return interaction.channel.send("You don't have enough coin for that one.. this aint a charity!");
                        } else {
                            await addItem(item);

                            var cost = uData.coins - item.value;

                            payUp(cost, uData);

                            var data = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: item.loot_id }] });

                            slotTwoButton.setDisabled(true);
                            refreshCost -= item.value;
                            refreshButton.setLabel(`Refresh Shop, Cost ${refreshCost}`);

                            console.log('Button slot1: ', buttonsA.components[2]);

                            await collInteract.editReply({ components: [buttonsA] });

                            if (data) return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
                            return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
                            //wipe db after this
                        }

                    } else console.log('ITEM NOT FOUND!');//item not found :(
                }
                if (collInteract.customId === 'slot3') {
                    await collInteract.deferUpdate();
                    const item = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 3 }] });
                    if (item) {
                        console.log('ITEM FOUND!', item);//item was found yaaaay
                        //var uData = await grabU();
                        if (item.value > uData.coins) {
                            console.log('ITEM COST HIGHER THAN COINS OF USER', item.value, uData.coins);
                            return interaction.channel.send("You don't have enough coin for that one.. this aint a charity!");
                        } else {
                            await addItem(item);

                            var cost = uData.coins - item.value;

                            payUp(cost, uData);

                            var data = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: item.loot_id }] });

                            slotThreeButton.setDisabled(true);
                            refreshCost -= item.value;
                            refreshButton.setLabel(`Refresh Shop, Cost ${refreshCost}`);

                            console.log('Button slot1: ', buttonsA.components[3]);

                            await collInteract.editReply({ components: [buttonsA] });

                            if (data) return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
                            return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
                            //wipe db after this
                        }

                    } else console.log('ITEM NOT FOUND!');//item not found :(
                }
                if (collInteract.customId === 'slot4') {
                    await collInteract.deferUpdate();
                    const item = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 4 }] });
                    if (item) {
                        console.log('ITEM FOUND!', item);//item was found yaaaay
                        //var uData = await grabU();
                        if (item.value > uData.coins) {
                            console.log('ITEM COST HIGHER THAN COINS OF USER', item.value, uData.coins);
                            return interaction.channel.send("You don't have enough coin for that one.. this aint a charity!");
                        } else {
                            await addItem(item);

                            var cost = uData.coins - item.value;

                            payUp(cost, uData);

                            var data = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: item.loot_id }] });

                            slotFourButton.setDisabled(true);
                            refreshCost -= item.value;
                            refreshButton.setLabel(`Refresh Shop, Cost ${refreshCost}`);

                            console.log('Button slot1: ', buttonsA.components[4]);

                            await collInteract.editReply({ components: [buttonsA] });

                            if (data) return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
                            return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
                            //wipe db after this
                        }

                    } else console.log('ITEM NOT FOUND!');//item not found :(
                }
                if (collInteract.customId === 'refresh') {                   
                    if (uData.coins < refreshCost) {
                        //user does not have enough to refresh the shop
                        return interaction.channel.send("It wouldnt be worthwhile to show you more, you lack the coin.. this aint a charity!");
                    } else {
                        //subtract the refresh cost from user coins
                        await collInteract.deferUpdate();
                        var cost = uData.coins - refreshCost;
                        payUp(cost, uData);
                        await checkShop(uData, refreshCost);
                        await collector.stop();
                        startShop();//run the entire script over again
                    }                
                }
            });

            collector.on('end', () => {
                if (embedMsg) {
                    embedMsg.delete();
                }
            });
        }
        
        //=======================================
        //this method loads the entire shop grabbing each item individually and loading them accordingly
        async function loadShop() {
            const user = await grabU();
            const edit = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }] });

            //==========================================
            //ITEMS WERE FOUND
            console.log('ITEMS WERE FOUND');
            //==========================================
            var iPool = [];
            var rarG = 0;

            //==================================================================
            //RUN THROUGH 1
            rarG = await grabRar(user.level); //this returns a number between 0 and 10 inclusive

            var pool1 = [];
            //for loop adding all items of requested rarity to iPool for selection
            for (var i = 0; i < lootList.length; i++) {

                if (lootList[i].Rar_id === rarG) {
                    await pool1.push(lootList[i]);                  
                } else {
                    //item not match keep looking
                }
            }

            //list finished, select one item 
            var rIP1;
            if (pool1.length <= 1) {
                rIP1 = 0;
            } else {
                rIP1 = Math.floor(Math.random() * (pool1.length));
            }

            //add selection to final list
            await iPool.push(pool1[rIP1]);
            rIP1 = 0;

            //=================================================================
            //RUN THROUGH 2
            rarG = await grabRar(user.level);
            var pool2 = [];
            //for loop adding all items of requested rarity to iPool for selection
            for (var i = 0; i < lootList.length; i++) {

                if (lootList[i].Rar_id === rarG) {
                    await pool2.push(lootList[i]);                   
                }
            }

            //list finished, select one item 
            var rIP2;
            if (pool2.length <= 1) {
                rIP2 = 0;
            } else {
                rIP2 = Math.floor(Math.random() * (pool2.length));
            }
            //add selection to final list
            await iPool.push(pool2[rIP2]);
            rIP2 = 1;

            //=================================================================
            //RUN THROUGH 3
            rarG = await grabRar(user.level);

            var pool3 = [];
            //for loop adding all items of requested rarity to iPool for selection
            for (var i = 0; i < lootList.length; i++) {

                if (lootList[i].Rar_id === rarG) {
                    await pool3.push(lootList[i]);                  
                }
            }
            //list finished, select one item 
            var rIP3;
            if (pool3.length <= 1) {
                rIP3 = 0;
            } else {
                rIP3 = Math.floor(Math.random() * (pool3.length));
            }
            //add selection to final list
            await iPool.push(pool3[rIP3]);
            rIP3 = 2;

            //=================================================================
            //RUN THROUGH 4
            //run through again
            rarG = await grabRar(user.level);
            var pool4 = [];
            //for loop adding all items of requested rarity to iPool for selection
            for (var i = 0; i < lootList.length; i++) {

                if (lootList[i].Rar_id === rarG) {
                    await pool4.push(lootList[i]);
                }
            }

            //list finished, select one item 
            var rIP4;
            if (pool4.length <= 1) {
                rIP4 = 0;
            } else {
                rIP4 = Math.floor(Math.random() * (pool4.length));
            }

            //add selection to final list
            await iPool.push(pool4[rIP4]);
            rIP4 = 3;

            console.log(`REFERENCE TO ITEM OBJECT:\n ${iPool[rIP1].Name}\n ${iPool[rIP2].Name}\n ${iPool[rIP3].Name}\n ${iPool[rIP4].Name}\n `);

            var item1 = iPool[rIP1];
            var item2 = iPool[rIP2];
            var item3 = iPool[rIP3];
            var item4 = iPool[rIP4];

            if (edit) {
                //Need better handling of shop entries
                if (item1.Slot === 'Mainhand') {
                    //Item 1 is a weapon
                    const shopSlot1 = await LootShop.update(
                        {
                            name: item1.Name,
                            value: item1.Value,
                            rarity: item1.Rarity,
                            rar_id: item1.Rar_id,
                            attack: item1.Attack,
                            defence: 0,
                            type: item1.Type,
                            slot: item1.Slot,
                            hands: item1.Hands,
                            loot_id: item1.Loot_id,
                            spec_id: interaction.user.id,
                        },
                        { where: [{ spec_id: interaction.user.id }, { shop_slot: 1 }] });
                    if (shopSlot1 > 0) {
                        //ShopSlot 1 updated
                    }
                } else if (item1.Slot === 'Offhand') {
                    //Is offhand
                    const shopSlot1 = await LootShop.update(
                        {
                            name: item1.Name,
                            value: item1.Value,
                            rarity: item1.Rarity,
                            rar_id: item1.Rar_id,
                            attack: item1.Attack,
                            defence: 0,
                            type: item1.Type,
                            slot: item1.Slot,
                            hands: item1.Hands,
                            loot_id: item1.Loot_id,
                            spec_id: interaction.user.id,
                        },
                        { where: [{ spec_id: interaction.user.id }, { shop_slot: 1 }] });
                    if (shopSlot1 > 0) {
                        //ShopSlot 1 updated
                    }
                } else {
                    //Is armor
                    const shopSlot1 = await LootShop.update(
                        {
                            name: item1.Name,
                            value: item1.Value,
                            rarity: item1.Rarity,
                            rar_id: item1.Rar_id,
                            attack: 0,
                            defence: item1.Defence,
                            type: item1.Type,
                            slot: item1.Slot,
                            loot_id: item1.Loot_id,
                            spec_id: interaction.user.id,
                        },
                        { where: [{ spec_id: interaction.user.id }, { shop_slot: 1 }] });
                    if (shopSlot1 > 0) {
                        //ShopSlot 1 updated
                    }
                }

                if (item2.Slot === 'Mainhand') {
                    //Item 2 is a weapon
                    const shopSlot2 = await LootShop.update(
                        {
                            name: item2.Name,
                            value: item2.Value,
                            rarity: item2.Rarity,
                            rar_id: item2.Rar_id,
                            attack: item2.Attack,
                            defence: 0,
                            type: item2.Type,
                            slot: item2.Slot,
                            hands: item2.Hands,
                            loot_id: item2.Loot_id,
                            spec_id: interaction.user.id,
                        },
                        { where: [{ spec_id: interaction.user.id }, { shop_slot: 2 }] });
                    if (shopSlot2 > 0) {
                        //ShopSlot 1 updated
                    }
                } else if (item2.Slot === 'Offhand') {
                    //Is offhand
                    const shopSlot2 = await LootShop.update(
                        {
                            name: item2.Name,
                            value: item2.Value,
                            rarity: item2.Rarity,
                            rar_id: item2.Rar_id,
                            attack: item2.Attack,
                            defence: 0,
                            type: item2.Type,
                            slot: item2.Slot,
                            hands: item2.Hands,
                            loot_id: item2.Loot_id,
                            spec_id: interaction.user.id,
                        },
                        { where: [{ spec_id: interaction.user.id }, { shop_slot: 2 }] });
                    if (shopSlot2 > 0) {
                        //ShopSlot 1 updated
                    }
                } else {
                    //Is armor
                    const shopSlot2 = await LootShop.update(
                        {
                            name: item2.Name,
                            value: item2.Value,
                            rarity: item2.Rarity,
                            rar_id: item2.Rar_id,
                            attack: 0,
                            defence: item2.Defence,
                            type: item2.Type,
                            slot: item2.Slot,
                            loot_id: item2.Loot_id,
                            spec_id: interaction.user.id,
                        },
                        { where: [{ spec_id: interaction.user.id }, { shop_slot: 2 }] });
                    if (shopSlot2 > 0) {
                        //ShopSlot 1 updated
                    }
                }

                if (item3.Slot === 'Mainhand') {
                    //Item 3 is a weapon
                    const shopSlot3 = await LootShop.update(
                        {
                            name: item3.Name,
                            value: item3.Value,
                            rarity: item3.Rarity,
                            rar_id: item3.Rar_id,
                            attack: item3.Attack,
                            defence: 0,
                            type: item3.Type,
                            slot: item3.Slot,
                            hands: item3.Hands,
                            loot_id: item3.Loot_id,
                            spec_id: interaction.user.id,
                        },
                        { where: [{ spec_id: interaction.user.id }, { shop_slot: 3 }] });
                    if (shopSlot3 > 0) {
                        //ShopSlot 1 updated
                    }
                } else if (item3.Slot === 'Offhand') {
                    //Is offhand
                    const shopSlot3 = await LootShop.update(
                        {
                            name: item3.Name,
                            value: item3.Value,
                            rarity: item3.Rarity,
                            rar_id: item3.Rar_id,
                            attack: item3.Attack,
                            defence: 0,
                            type: item3.Type,
                            slot: item3.Slot,
                            hands: item3.Hands,
                            loot_id: item3.Loot_id,
                            spec_id: interaction.user.id,
                        },
                        { where: [{ spec_id: interaction.user.id }, { shop_slot: 3 }] });
                    if (shopSlot3 > 0) {
                        //ShopSlot 1 updated
                    }
                } else {
                    //Is armor
                    const shopSlot3 = await LootShop.update(
                        {
                            name: item3.Name,
                            value: item3.Value,
                            rarity: item3.Rarity,
                            rar_id: item3.Rar_id,
                            attack: 0,
                            defence: item3.Defence,
                            type: item3.Type,
                            slot: item3.Slot,
                            loot_id: item3.Loot_id,
                            spec_id: interaction.user.id,
                        },
                        { where: [{ spec_id: interaction.user.id }, { shop_slot: 3 }] });
                    if (shopSlot3 > 0) {
                        //ShopSlot 1 updated
                    }
                }

                if (item4.Slot === 'Mainhand') {
                    //Item 4 is a weapon
                    const shopSlot4 = await LootShop.update(
                        {
                            name: item4.Name,
                            value: item4.Value,
                            rarity: item4.Rarity,
                            rar_id: item4.Rar_id,
                            attack: item4.Attack,
                            defence: 0,
                            type: item4.Type,
                            slot: item4.Slot,
                            hands: item4.Hands,
                            loot_id: item4.Loot_id,
                            spec_id: interaction.user.id,
                        },
                        { where: [{ spec_id: interaction.user.id }, { shop_slot: 4 }] });
                    if (shopSlot4 > 0) {
                        //ShopSlot 1 updated
                    }
                } else if (item4.Slot === 'Offhand') {
                    //Is offhand
                    const shopSlot4 = await LootShop.update(
                        {
                            name: item4.Name,
                            value: item4.Value,
                            rarity: item4.Rarity,
                            rar_id: item4.Rar_id,
                            attack: item4.Attack,
                            defence: 0,
                            type: item4.Type,
                            slot: item4.Slot,
                            hands: item4.Hands,
                            loot_id: item4.Loot_id,
                            spec_id: interaction.user.id,
                        },
                        { where: [{ spec_id: interaction.user.id }, { shop_slot: 4 }] });
                    if (shopSlot4 > 0) {
                        //ShopSlot 1 updated
                    }
                } else {
                    //Is armor
                    const shopSlot4 = await LootShop.update(
                        {
                            name: item4.Name,
                            value: item4.Value,
                            rarity: item4.Rarity,
                            rar_id: item4.Rar_id,
                            attack: 0,
                            defence: item4.Defence,
                            type: item4.Type,
                            slot: item4.Slot,
                            loot_id: item4.Loot_id,
                            spec_id: interaction.user.id,
                        },
                        { where: [{ spec_id: interaction.user.id }, { shop_slot: 4 }] });
                    if (shopSlot4 > 0) {
                        //ShopSlot 1 updated
                    }
                }               
            }
            if (!edit) {         
                await setTomorrow(user);

                if (item1.Slot === 'Mainhand') {
                    //Item 1 is a weapon
                    const shopSlot1 = await LootShop.create(
                        {
                            name: item1.Name,
                            value: item1.Value,
                            rarity: item1.Rarity,
                            rar_id: item1.Rar_id,
                            attack: item1.Attack,
                            defence: 0,
                            type: item1.Type,
                            slot: item1.Slot,
                            hands: item1.Hands,
                            loot_id: item1.Loot_id,
                            spec_id: interaction.user.id,
                            shop_slot: 1,
                        });
                    if (shopSlot1 > 0) {
                        //ShopSlot 1 updated
                    }
                } else if (item1.Slot === 'Offhand') {
                    //Is offhand
                    const shopSlot1 = await LootShop.create(
                        {
                            name: item1.Name,
                            value: item1.Value,
                            rarity: item1.Rarity,
                            rar_id: item1.Rar_id,
                            attack: item1.Attack,
                            defence: 0,
                            type: item1.Type,
                            slot: item1.Slot,
                            hands: item1.Hands,
                            loot_id: item1.Loot_id,
                            spec_id: interaction.user.id,
                            shop_slot: 1,
                        });
                    if (shopSlot1 > 0) {
                        //ShopSlot 1 updated
                    }
                } else {
                    //Is armor
                    const shopSlot1 = await LootShop.create(
                        {
                            name: item1.Name,
                            value: item1.Value,
                            rarity: item1.Rarity,
                            rar_id: item1.Rar_id,
                            attack: 0,
                            defence: item1.Defence,
                            type: item1.Type,
                            slot: item1.Slot,
                            loot_id: item1.Loot_id,
                            spec_id: interaction.user.id,
                            shop_slot: 1,
                        });
                    if (shopSlot1 > 0) {
                        //ShopSlot 1 updated
                    }
                }

                if (item2.Slot === 'Mainhand') {
                    //Item 2 is a weapon
                    const shopSlot2 = await LootShop.create(
                        {
                            name: item2.Name,
                            value: item2.Value,
                            rarity: item2.Rarity,
                            rar_id: item2.Rar_id,
                            attack: item2.Attack,
                            defence: 0,
                            type: item2.Type,
                            slot: item2.Slot,
                            hands: item2.Hands,
                            loot_id: item2.Loot_id,
                            spec_id: interaction.user.id,
                            shop_slot: 2,
                        });
                    if (shopSlot2 > 0) {
                        //ShopSlot 1 updated
                    }
                } else if (item2.Slot === 'Offhand') {
                    //Is offhand
                    const shopSlot2 = await LootShop.create(
                        {
                            name: item2.Name,
                            value: item2.Value,
                            rarity: item2.Rarity,
                            rar_id: item2.Rar_id,
                            attack: item2.Attack,
                            defence: 0,
                            type: item2.Type,
                            slot: item2.Slot,
                            hands: item2.Hands,
                            loot_id: item2.Loot_id,
                            spec_id: interaction.user.id,
                            shop_slot: 2,
                        });
                    if (shopSlot2 > 0) {
                        //ShopSlot 1 updated
                    }
                } else {
                    //Is armor
                    const shopSlot2 = await LootShop.create(
                        {
                            name: item2.Name,
                            value: item2.Value,
                            rarity: item2.Rarity,
                            rar_id: item2.Rar_id,
                            attack: 0,
                            defence: item2.Defence,
                            type: item2.Type,
                            slot: item2.Slot,
                            loot_id: item2.Loot_id,
                            spec_id: interaction.user.id,
                            shop_slot: 2,
                        });
                    if (shopSlot2 > 0) {
                        //ShopSlot 1 updated
                    }
                }

                if (item3.Slot === 'Mainhand') {
                    //Item 3 is a weapon
                    const shopSlot3 = await LootShop.create(
                        {
                            name: item3.Name,
                            value: item3.Value,
                            rarity: item3.Rarity,
                            rar_id: item3.Rar_id,
                            attack: item3.Attack,
                            defence: 0,
                            type: item3.Type,
                            slot: item3.Slot,
                            hands: item3.Hands,
                            loot_id: item3.Loot_id,
                            spec_id: interaction.user.id,
                            shop_slot: 3,
                        });
                    if (shopSlot3 > 0) {
                        //ShopSlot 1 updated
                    }
                } else if (item3.Slot === 'Offhand') {
                    //Is offhand
                    const shopSlot3 = await LootShop.create(
                        {
                            name: item3.Name,
                            value: item3.Value,
                            rarity: item3.Rarity,
                            rar_id: item3.Rar_id,
                            attack: item3.Attack,
                            defence: 0,
                            type: item3.Type,
                            slot: item3.Slot,
                            hands: item3.Hands,
                            loot_id: item3.Loot_id,
                            spec_id: interaction.user.id,
                            shop_slot: 3,
                        });
                    if (shopSlot3 > 0) {
                        //ShopSlot 1 updated
                    }
                } else {
                    //Is armor
                    const shopSlot3 = await LootShop.create(
                        {
                            name: item3.Name,
                            value: item3.Value,
                            rarity: item3.Rarity,
                            rar_id: item3.Rar_id,
                            attack: 0,
                            defence: item3.Defence,
                            type: item3.Type,
                            slot: item3.Slot,
                            loot_id: item3.Loot_id,
                            spec_id: interaction.user.id,
                            shop_slot: 3,
                        });
                    if (shopSlot3 > 0) {
                        //ShopSlot 1 updated
                    }
                }

                if (item4.Slot === 'Mainhand') {
                    //Item 4 is a weapon
                    const shopSlot4 = await LootShop.create(
                        {
                            name: item4.Name,
                            value: item4.Value,
                            rarity: item4.Rarity,
                            rar_id: item4.Rar_id,
                            attack: item4.Attack,
                            defence: 0,
                            type: item4.Type,
                            slot: item4.Slot,
                            hands: item4.Hands,
                            loot_id: item4.Loot_id,
                            spec_id: interaction.user.id,
                            shop_slot: 4,
                        });
                    if (shopSlot4 > 0) {
                        //ShopSlot 1 updated
                    }
                } else if (item4.Slot === 'Offhand') {
                    //Is offhand
                    const shopSlot4 = await LootShop.create(
                        {
                            name: item4.Name,
                            value: item4.Value,
                            rarity: item4.Rarity,
                            rar_id: item4.Rar_id,
                            attack: item4.Attack,
                            defence: 0,
                            type: item4.Type,
                            slot: item4.Slot,
                            hands: item4.Hands,
                            loot_id: item4.Loot_id,
                            spec_id: interaction.user.id,
                            shop_slot: 4,
                        });
                    if (shopSlot4 > 0) {
                        //ShopSlot 1 updated
                    }
                } else {
                    //Is armor
                    const shopSlot4 = await LootShop.create(
                        {
                            name: item4.Name,
                            value: item4.Value,
                            rarity: item4.Rarity,
                            rar_id: item4.Rar_id,
                            attack: 0,
                            defence: item4.Defence,
                            type: item4.Type,
                            slot: item4.Slot,
                            loot_id: item4.Loot_id,
                            spec_id: interaction.user.id,
                            shop_slot: 4,
                        });
                    if (shopSlot4 > 0) {
                        //ShopSlot 1 updated
                    }
                }                
            } else {
                //something went wrong :o
                console.log('\nSOMETHING WENT WRONG!\n');
            }   
        }      

        async function grabU() {
            uData = await UserData.findOne({ where: { userid: interaction.user.id } });
            return uData;
        }

        //This method checks all user values to asign and calculate the current refresh cost as well as checking day reset
        //Returns value to display for initial load of shop
        async function checkShop(user, currentRefreshCost) {
            var valueToReturn = currentRefreshCost;
            //x is based on user level * current refreshes (resets daily) + total shop value  
            if (!user.shopresets) {
                console.log('IN checkShop()\nSHOP RESETS VALUE NOT FOUND!');
                await setTomorrow();
            }
            const refreshesToday = await checkTomorrow(user);

            const firstCost = user.level * refreshesToday;

            console.log(`firstCost: ${firstCost}`);

            const newRefresh = (refreshesToday + 1);
            await updateRefreshCount(user, newRefresh);

            valueToReturn += firstCost;

            const item1 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 1 }] });
            const item2 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 2 }] });
            const item3 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 3 }] });
            const item4 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 4 }] });

            const totalShopCost = item1.value + item2.value + item3.value + item4.value;
            console.log(`totalShopCost: ${totalShopCost}`);

            valueToReturn += totalShopCost;
            refreshCost = valueToReturn;
            return valueToReturn;
        }


        //This method sets/resets the day that is tomorrow 
        async function setTomorrow() {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const newDay = tomorrow.getTime();
            console.log('NEW DAY: ', newDay);

            const dayChange = await UserData.update({ shopresets: newDay }, { where: { userid: interaction.user.id } });

            if (dayChange > 0) {
                //Day changed successfully
                console.log('DAY WAS UPDATED!');
            }
        }

        //========================================
        // This method sets the date of tomorrow with the refrence of today
        async function checkTomorrow(user) {
            const today = new Date();
            console.log('TODAY: ', today.getTime());
            console.log('SHOP RESETS: ', user.shopresets);

            if (!user.shopresets) {
                console.log('IN checkTomorrow()\nSHOP RESETS VALUE NOT FOUND!');
                await setTomorrow(user);
            }

            if (user.shopresets <= today.getTime()) {
                // Its been a day time to reset play count!
                console.log('IS TOMORROW!');
                await setTomorrow();
                await updateRefreshCount(user, 0);
                return 0;
            } else {
                // Not tomorrow current refreshcount is valid
                console.log('IS STILL TODAY!');
                return user.refreshcount;
            }
        }

        //this method changes the current amount of shop refreshes for the user in question
        async function updateRefreshCount(user, currentRefreshes) {
            const userRefresh = await UserData.update({ refreshcount: currentRefreshes }, { where: { userid: user.userid } });
            if (userRefresh > 0) {
                //user refreshes have been updated
            }
        }

        async function addItem(item) {
            //create new search var to find any Item within the UserItem file pertaining to the User in question
            //.findOne() retrevies a single row of data
            //where : {} ensures only the row desired is grabbed
            const lootStore = await LootStore.findOne({
                where: { spec_id: interaction.user.id, loot_id: item.loot_id },
            });

            //console.log('UserItem: ', lootStore);

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

            const theItem = item;

            //if item is not found create a new one with the values requested
            if (theItem.slot === 'Mainhand') {
                //Item is a weapon store accordingly
                const newItem = await LootStore.create({
                    name: theItem.name,
                    value: theItem.value,
                    loot_id: theItem.loot_id,
                    spec_id: interaction.user.id,
                    rarity: theItem.rarity,
                    rar_id: theItem.rar_id,
                    attack: theItem.attack,
                    defence: 0,
                    type: theItem.type,
                    slot: theItem.slot,
                    hands: theItem.hands,
                    amount: 1
                });

                const itemAdded = await LootStore.findOne({
                    where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
                });

                console.log(itemAdded);

                return newItem;
            } else if (theItem.Slot === 'Offhand') {
                //Item is an offhand
                const newItem = await LootStore.create({
                    name: theItem.name,
                    value: theItem.value,
                    loot_id: theItem.loot_id,
                    spec_id: interaction.user.id,
                    rarity: theItem.rarity,
                    rar_id: theItem.rar_id,
                    attack: theItem.attack,
                    defence: 0,
                    type: theItem.type,
                    slot: theItem.slot,
                    hands: theItem.hands,
                    amount: 1
                });

                const itemAdded = await LootStore.findOne({
                    where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
                });

                console.log(itemAdded);

                return newItem;
            } else {
                //Item is armor
                const newItem = await LootStore.create({
                    name: theItem.name,
                    value: theItem.value,
                    loot_id: theItem.loot_id,
                    spec_id: interaction.user.id,
                    rarity: theItem.rarity,
                    rar_id: theItem.rar_id,
                    attack: 0,
                    defence: theItem.defence,
                    type: theItem.type,
                    slot: theItem.slot,
                    amount: 1
                });

                const itemAdded = await LootStore.findOne({
                    where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
                });

                console.log(itemAdded);

                return newItem;
            }
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
