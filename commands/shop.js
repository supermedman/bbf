const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const {
    warnedForm,
    errorForm,
    successResult,
    failureResult,
    basicInfoForm,
    specialInfoForm
} = require('../chalkPresets.js');
const { UserData, LootShop, LootStore, Pigmy } = require('../dbObjects.js');
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

        

        //Refreshing the shop needs to cost more and more based on x
        //x is total cost of items currently in shop?
        //x is scaled based on total refreshes?
        //x is scaled daily upto a max?
        //x is scaled base on user level?

        //x is based on user level * current refreshes (resets daily) + total shop value  
        //Calling shop is free, set crazy cooldown once the above code works 
        //Give notice of refresh cost, and amount of refreshes made today
        //Check for new day on each shop call

        /**
         *      How will the shop be working?
         *          - Make four embed field objects
         *          - Retain a listing for removal if bought
         *          - Update embed with removed items and updated user coins
         *          - If all items are sold refresh for free
         *          
         * 
         * */

        let itemsSold = 0;

        let slotOneButtonSold = false;
        let slotTwoButtonSold = false;
        let slotThreeButtonSold = false;
        let slotFourButtonSold = false;


        var refreshCost = 0;

        startShop();

        async function startShop() {
            refreshCost = 0;
            itemsSold = 0;
            await loadShop();

            //const items = await LootShop.findAll({ where: [{ spec_id: interaction.user.id }] });

            //var list = [];

            const item1 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 1 }] });
            const item2 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 2 }] });
            const item3 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 3 }] });
            const item4 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 4 }] });          

            const listedInOrder = [item1, item2, item3, item4];

            console.log(basicInfoForm(`Items in shop as follows:\n${listedInOrder[0].name}\n${listedInOrder[1].name}\n${listedInOrder[2].name}\n${listedInOrder[3].name}`));

            var uData = await grabU();

            let finalFields = [];

            let breakPoint = 0;
            for (const item of listedInOrder) {
                console.log(specialInfoForm('Running through items, currently on item #: ', breakPoint));
                let listedName = ``;
                let listedVal = ``;

                let fieldValueObj;
                if (item.slot === 'Mainhand') {
                    listedName = `Name: ${item.name}`;
                    listedVal = `Value: **${item.value}c** \nRarity: **${item.rarity}** \nAttack: **${item.attack}** \nType: **${item.type}**\nSlot: **${item.slot}**\nHands: **${item.hands}**\n\n`;

                    fieldValueObj = { name: listedName.toString(), value: listedVal.toString(), };

                    finalFields.push(fieldValueObj);
                    breakPoint++;
                } else if (item.slot === 'Offhand') {
                    listedName = `Name: ${item.name}`;
                    listedVal = `Value: **${item.value}c** \nRarity: **${item.rarity}** \nAttack: **${item.attack}** \nType: **${item.type}**\nSlot: **${item.slot}**\n\n`;

                    fieldValueObj = { name: listedName.toString(), value: listedVal.toString(), };

                    finalFields.push(fieldValueObj);
                    breakPoint++;
                } else {
                    listedName = `Name: ${item.name}`;
                    listedVal = `Value: **${item.value}c** \nRarity: **${item.rarity}** \nDefence: **${item.defence}** \nType: **${item.type}**\nSlot: **${item.slot}**\n\n`;

                    fieldValueObj = { name: listedName.toString(), value: listedVal.toString(), };

                    finalFields.push(fieldValueObj);
                    breakPoint++;
                }

                if (breakPoint === listedInOrder.length) {
                    fieldValueObj = { name: `Your Coins: `, value: `${uData.coins}c`, };
                    finalFields.push(fieldValueObj);
                    break;
                } 
            }

            const displayCost = await checkShop(uData, refreshCost);

            //var currentRefreshCost = displayCost;
            refreshCost = displayCost;

            const refreshButton = new ButtonBuilder()
                .setCustomId('refresh')
                .setLabel(`Refresh Shop, Cost ${refreshCost}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄');

            const slotOneButton = new ButtonBuilder()
                .setCustomId('slot-one')
                .setLabel('Slot 1')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(slotOneButtonSold)
                .setEmoji('1️⃣');

            const slotTwoButton = new ButtonBuilder()
                .setCustomId('slot-two')
                .setLabel('Slot 2')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(slotTwoButtonSold)
                .setEmoji('2️⃣');

            const slotThreeButton = new ButtonBuilder()
                .setCustomId('slot-three')
                .setLabel('Slot 3')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(slotThreeButtonSold)
                .setEmoji('3️⃣');

            const slotFourButton = new ButtonBuilder()
                .setCustomId('slot-four')
                .setLabel('Slot 4')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(slotFourButtonSold)
                .setEmoji('4️⃣');

            const buttonRow = new ActionRowBuilder().addComponents(refreshButton, slotOneButton, slotTwoButton, slotThreeButton, slotFourButton);        

            //var footerCoins = `Your Coins: ${uData.coins}c`;

            let shopEmbed = {
                title: "~Bloodstone Shoppe~",
                color: 0x39acf3,
                description: "Welcome to the shop! Take a look at the wares.. be quick they wont last forever.",
                fields: finalFields,
            };


            //const openShop = new EmbedBuilder()
            //    .setTitle("~Bloodstone Shoppe~")
            //    .setColor(0x39acf3)
            //    .setDescription("Welcome to the shop! Take a look at the wares.. be quick they wont last forever.")
            //    .addFields(
            //        {
            //            name: ("<< ITEMS FOR SALE >>"),
            //            value: list
            //        },
            //        {
            //            name: 'Your Coins: ',
            //            value: `${uData.coins}c`
            //        }
            //);

            const embedMsg = await interaction.followUp({ embeds: [shopEmbed], components: [buttonRow] });

            const filter = (i) => i.user.id === interaction.user.id;

            const collector = embedMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 45000,
            });

            collector.on('collect', async (collInteract) => {               
                if (collInteract.customId === 'slot-one') {
                    await collInteract.deferUpdate();
                    const item = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 1 }] });
                    if (item) {
                        console.log(successResult('ITEM FOUND! Slot-One'));//item was found yaaaay

                        if (item.value > uData.coins) {
                            console.log(warnedForm('ITEM COST HIGHER THAN COINS OF USER', item.value, uData.coins));
                            return interaction.channel.send("You don't have enough coin for that one.. this aint a charity!");
                        } else {
                            const result = await addItem(item);
                            if (result === 'Success') {
                                var coinReduced = uData.coins - item.value;

                                await payUp(coinReduced, uData);

                                var data = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: item.loot_id }] });

                                slotOneButton.setDisabled(true);
                                refreshCost -= item.value;
                                refreshButton.setLabel(`Refresh Shop, Cost ${refreshCost}`);

                                finalFields[0] = {
                                    name: 'SLOT ONE', value: '**I\nT\nE\nM\n\nS\nO\nL\nD**',
                                };

                                finalFields[4] = {
                                    name: `Your Coins: `, value: `${uData.coins}c`,
                                };

                                shopEmbed = {
                                    title: "~Bloodstone Shoppe~",
                                    color: 0x39acf3,
                                    description: "Welcome to the shop! Take a look at the wares.. be quick they wont last forever.",
                                    fields: finalFields,
                                };

                                await embedMsg.edit({ embeds: [shopEmbed], components: [buttonRow] });

                                itemsSold++;
                                if (itemsSold === 4) {
                                    if (data) interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
                                    interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
                                    await collector.stop();
                                    startShop();
                                } else {
                                    if (data) return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
                                    return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
                                }
                            }
                            
                            //wipe db after this
                        }
                    } else console.log(errorForm('ITEM NOT FOUND!'));//item not found :( 
                }
                if (collInteract.customId === 'slot-two') {
                    await collInteract.deferUpdate();
                    const item = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 2 }] });
                    if (item) {
                        console.log(successResult('ITEM FOUND! Slot-Two'));//item was found yaaaay

                        if (item.value > uData.coins) {
                            console.log(warnedForm('ITEM COST HIGHER THAN COINS OF USER', item.value, uData.coins));
                            return interaction.channel.send("You don't have enough coin for that one.. this aint a charity!");
                        } else {
                            const result = await addItem(item);
                            if (result === 'Success') {
                                var coinReduced = uData.coins - item.value;

                                await payUp(coinReduced, uData);

                                var data = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: item.loot_id }] });

                                slotTwoButton.setDisabled(true);
                                refreshCost -= item.value;
                                refreshButton.setLabel(`Refresh Shop, Cost ${refreshCost}`);

                                finalFields[1] = {
                                    name: 'SLOT TWO', value: '**I\nT\nE\nM\n\nS\nO\nL\nD**',
                                };

                                finalFields[4] = {
                                    name: `Your Coins: `, value: `${uData.coins}c`,
                                };

                                shopEmbed = {
                                    title: "~Bloodstone Shoppe~",
                                    color: 0x39acf3,
                                    description: "Welcome to the shop! Take a look at the wares.. be quick they wont last forever.",
                                    fields: finalFields,
                                };

                                await embedMsg.edit({ embeds: [shopEmbed], components: [buttonRow] });

                                itemsSold++;
                                if (itemsSold === 4) {
                                    if (data) interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
                                    interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
                                    await collector.stop();
                                    startShop();
                                } else {
                                    if (data) return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
                                    return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
                                }
                            }

                            //wipe db after this
                        }

                    } else console.log(errorForm('ITEM NOT FOUND!'));//item not found :(
                }
                if (collInteract.customId === 'slot-three') {
                    await collInteract.deferUpdate();
                    const item = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 3 }] });
                    if (item) {
                        console.log(successResult('ITEM FOUND! Slot-Three'));//item was found yaaaay

                        if (item.value > uData.coins) {
                            console.log(warnedForm('ITEM COST HIGHER THAN COINS OF USER', item.value, uData.coins));
                            return interaction.channel.send("You don't have enough coin for that one.. this aint a charity!");
                        } else {
                            const result = await addItem(item);
                            if (result === 'Success') {
                                var coinReduced = uData.coins - item.value;

                                await payUp(coinReduced, uData);

                                var data = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: item.loot_id }] });

                                slotThreeButton.setDisabled(true);
                                refreshCost -= item.value;
                                refreshButton.setLabel(`Refresh Shop, Cost ${refreshCost}`);

                                finalFields[2] = {
                                    name: 'SLOT THREE', value: '**I\nT\nE\nM\n\nS\nO\nL\nD**',
                                };

                                finalFields[4] = {
                                    name: `Your Coins: `, value: `${uData.coins}c`,
                                };

                                shopEmbed = {
                                    title: "~Bloodstone Shoppe~",
                                    color: 0x39acf3,
                                    description: "Welcome to the shop! Take a look at the wares.. be quick they wont last forever.",
                                    fields: finalFields,
                                };

                                await embedMsg.edit({ embeds: [shopEmbed], components: [buttonRow] });

                                itemsSold++;
                                if (itemsSold === 4) {
                                    if (data) interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
                                    interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
                                    await collector.stop();
                                    startShop();
                                } else {
                                    if (data) return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
                                    return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
                                }
                            }
                        }

                    } else console.log(errorForm('ITEM NOT FOUND!'));//item not found :(
                }
                if (collInteract.customId === 'slot-four') {
                    await collInteract.deferUpdate();
                    const item = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 4 }] });
                    if (item) {
                        console.log(successResult('ITEM FOUND! Slot-Four'));//item was found yaaaay

                        if (item.value > uData.coins) {
                            console.log(warnedForm('ITEM COST HIGHER THAN COINS OF USER', item.value, uData.coins));
                            return interaction.channel.send("You don't have enough coin for that one.. this aint a charity!");
                        } else {
                            const result = await addItem(item);
                            if (result === 'Success') {
                                var coinReduced = uData.coins - item.value;

                                await payUp(coinReduced, uData);

                                var data = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: item.loot_id }] });

                                slotFourButton.setDisabled(true);
                                refreshCost -= item.value;
                                refreshButton.setLabel(`Refresh Shop, Cost ${refreshCost}`);

                                finalFields[3] = {
                                    name: 'SLOT FOUR', value: '**I\nT\nE\nM\n\nS\nO\nL\nD**',
                                };

                                finalFields[4] = {
                                    name: `Your Coins: `, value: `${uData.coins}c`,
                                };

                                shopEmbed = {
                                    title: "~Bloodstone Shoppe~",
                                    color: 0x39acf3,
                                    description: "Welcome to the shop! Take a look at the wares.. be quick they wont last forever.",
                                    fields: finalFields,
                                };

                                await embedMsg.edit({ embeds: [shopEmbed], components: [buttonRow] });

                                itemsSold++;

                                if (itemsSold === 4) {
                                    if (data) interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
                                    interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
                                    await collector.stop();
                                    startShop();
                                } else {
                                    if (data) return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
                                    return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
                                }
                            }
                        }

                    } else console.log(errorForm('ITEM NOT FOUND!'));//item not found :(
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
            /**
             *      We need:
             *          - To load exactly 4 items
             *          - To update or create 4 items
             *          - To save and return
             * 
             * */

            const user = await grabU();
            const edit = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }] });
            const pigmy = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });

            let tmpLootPool = [];
            let tmpItemSlice;

            let foundRar = 0;
            let chanceToBeat = 1;
            let upgradeChance = Math.random();

            let curRun = 1;
            do {
                tmpLootPool = [];

                chanceToBeat = 1;
                upgradeChance = Math.random();

                foundRar = await grabRar(user.level);

                foundRar = isUpgraded(user, pigmy, chanceToBeat, upgradeChance, foundRar);

                let breakPoint = 0;
                for (const loot of lootList) {
                    if (loot.Rar_id === foundRar) {
                        tmpLootPool.push(loot);
                        breakPoint++;
                    } else {
                        breakPoint++;
                    }
                    if (breakPoint === lootList.length) break;
                }

                let lootPos = 0;
                if (tmpLootPool.length === 1) {
                    tmpItemSlice = tmpLootPool[lootPos];
                } else {
                    lootPos = Math.floor(Math.random() * (tmpLootPool.length));
                    tmpItemSlice = tmpLootPool[lootPos];
                }

                if (edit) {
                    //User has shop entry, update existing table
                    if (tmpItemSlice.Slot === 'Mainhand') {
                        const shopSlot = await LootShop.update(
                            {
                                name: tmpItemSlice.Name,
                                value: tmpItemSlice.Value,
                                rarity: tmpItemSlice.Rarity,
                                rar_id: tmpItemSlice.Rar_id,
                                attack: tmpItemSlice.Attack,
                                defence: 0,
                                type: tmpItemSlice.Type,
                                slot: tmpItemSlice.Slot,
                                hands: tmpItemSlice.Hands,
                                loot_id: tmpItemSlice.Loot_id,
                            },
                            { where: [{ spec_id: interaction.user.id }, { shop_slot: curRun }] });

                        if (shopSlot > 0) {
                            console.log(successResult(`Shop Slot ${curRun} updated to item ${tmpItemSlice.Name}`));
                        }
                    } else if (tmpItemSlice.Slot === 'Offhand') {
                        const shopSlot = await LootShop.update(
                            {
                                name: tmpItemSlice.Name,
                                value: tmpItemSlice.Value,
                                rarity: tmpItemSlice.Rarity,
                                rar_id: tmpItemSlice.Rar_id,
                                attack: tmpItemSlice.Attack,
                                defence: 0,
                                type: tmpItemSlice.Type,
                                slot: tmpItemSlice.Slot,
                                hands: tmpItemSlice.Hands,
                                loot_id: tmpItemSlice.Loot_id,
                            },
                            { where: [{ spec_id: interaction.user.id }, { shop_slot: curRun }] });

                        if (shopSlot > 0) {
                            console.log(successResult(`Shop Slot ${curRun} updated to item ${tmpItemSlice.Name}`));
                        }
                    } else {
                        const shopSlot = await LootShop.update(
                            {
                                name: tmpItemSlice.Name,
                                value: tmpItemSlice.Value,
                                rarity: tmpItemSlice.Rarity,
                                rar_id: tmpItemSlice.Rar_id,
                                attack: 0,
                                defence: tmpItemSlice.Defence,
                                type: tmpItemSlice.Type,
                                slot: tmpItemSlice.Slot,
                                hands: tmpItemSlice.Hands,
                                loot_id: tmpItemSlice.Loot_id,
                            },
                            { where: [{ spec_id: interaction.user.id }, { shop_slot: curRun }] });

                        if (shopSlot > 0) {
                            console.log(successResult(`Shop Slot ${curRun} updated to item ${tmpItemSlice.Name}`));
                        }
                    }
                    
                } else if (!edit) {
                    //User has no shop entry, create new table
                    if (tmpItemSlice.Slot === 'Mainhand') {
                        await LootShop.create(
                            {
                                name: tmpItemSlice.Name,
                                value: tmpItemSlice.Value,
                                rarity: tmpItemSlice.Rarity,
                                rar_id: tmpItemSlice.Rar_id,
                                attack: tmpItemSlice.Attack,
                                defence: 0,
                                type: tmpItemSlice.Type,
                                slot: tmpItemSlice.Slot,
                                hands: tmpItemSlice.Hands,
                                loot_id: tmpItemSlice.Loot_id,
                                spec_id: interaction.user.id,
                                shop_slot: curRun,
                            });

                        const shopSlot = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: curRun }] });

                        if (shopSlot) {
                            console.log(successResult(`Shop Slot ${curRun} created with item ${tmpItemSlice.Name}`));
                        }
                    } else if (tmpItemSlice.Slot === 'Offhand') {
                        await LootShop.create(
                            {
                                name: tmpItemSlice.Name,
                                value: tmpItemSlice.Value,
                                rarity: tmpItemSlice.Rarity,
                                rar_id: tmpItemSlice.Rar_id,
                                attack: tmpItemSlice.Attack,
                                defence: 0,
                                type: tmpItemSlice.Type,
                                slot: tmpItemSlice.Slot,
                                hands: tmpItemSlice.Hands,
                                loot_id: tmpItemSlice.Loot_id,
                                spec_id: interaction.user.id,
                                shop_slot: curRun,
                            });

                        const shopSlot = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: curRun }] });

                        if (shopSlot) {
                            console.log(successResult(`Shop Slot ${curRun} created with item ${tmpItemSlice.Name}`));
                        }
                    } else {
                        await LootShop.create(
                            {
                                name: tmpItemSlice.Name,
                                value: tmpItemSlice.Value,
                                rarity: tmpItemSlice.Rarity,
                                rar_id: tmpItemSlice.Rar_id,
                                attack: 0,
                                defence: tmpItemSlice.Defence,
                                type: tmpItemSlice.Type,
                                slot: tmpItemSlice.Slot,
                                hands: tmpItemSlice.Hands,
                                loot_id: tmpItemSlice.Loot_id,
                                spec_id: interaction.user.id,
                                shop_slot: curRun,
                            });

                        const shopSlot = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: curRun }] });

                        if (shopSlot) {
                            console.log(successResult(`Shop Slot ${curRun} created with item ${tmpItemSlice.Name}`));
                        }
                    }
                }

                curRun++;
            } while (curRun < 5)


            function isUpgraded(user, pigmy, chanceToBeat, upgradeChance, curRar) {
                if (user.pclass === 'Thief') {
                    chanceToBeat -= 0.05;
                }

                console.log(specialInfoForm('chanceToBeat after Thief check: ', chanceToBeat));

                if (pigmy) {
                    if ((Math.floor(pigmy.level / 5) * 0.01) > 0.05) {
                        chanceToBeat -= 0.05;
                    } else {
                        chanceToBeat -= (Math.floor(pigmy.level / 5) * 0.01);
                    }
                }
                console.log(specialInfoForm('chanceToBeat after Pigmy Level check: ', chanceToBeat));

                if (user.level >= 31) {
                    if ((Math.floor(user.level / 5) * 0.01) > 0.10) {
                        chanceToBeat -= 0.10;
                    } else {
                        chanceToBeat -= (Math.floor(user.level / 5) * 0.01);
                    }
                }
                console.log(specialInfoForm('chanceToBeat after Player Level check: ', chanceToBeat));

                if (curRar < 10) {
                    if (upgradeChance >= chanceToBeat) {
                        curRar++;
                        return curRar;
                    } else {
                        return curRar;
                    }
                } else {
                    return curRar;
                }
            }

            

            //let chanceToBeat = 1;
            //let upgradeChance = Math.random();
            ////==========================================
            ////ITEMS WERE FOUND
            //console.log('ITEMS WERE FOUND');
            ////==========================================
            //var iPool = [];
            //var rarG = 0;

            ////==================================================================
            ////RUN THROUGH 1
            //rarG = await grabRar(user.level); //this returns a number between 0 and 10 inclusive

            //chanceToBeat = 1;
            //upgradeChance = Math.random();
            //if (uData.pclass === 'Thief') {
            //    chanceToBeat -= 0.05;
            //}

            //if (pigmy) {
            //    if ((Math.floor(pigmy.level / 5) * 0.01) > 0.05) {
            //        chanceToBeat -= 0.05;
            //    } else {
            //        chanceToBeat -= (Math.floor(pigmy.level / 5) * 0.01);
            //    }
            //}

            //if (user.level >= 31) {
            //    if ((Math.floor(user.level / 5) * 0.01) > 0.10) {
            //        chanceToBeat -= 0.10;
            //    } else {
            //        chanceToBeat -= (Math.floor(user.level / 5) * 0.01);
            //    }
            //}

            //if (rarG < 10) {
            //    if (upgradeChance >= chanceToBeat) {
            //        rarG++;
            //    }
            //}

            //var pool1 = [];
            ////for loop adding all items of requested rarity to iPool for selection
            //for (var i = 0; i < lootList.length; i++) {

            //    if (lootList[i].Rar_id === rarG) {
            //        await pool1.push(lootList[i]);                  
            //    } else {
            //        //item not match keep looking
            //    }
            //}

            ////list finished, select one item 
            //var rIP1;
            //if (pool1.length <= 1) {
            //    rIP1 = 0;
            //} else {
            //    rIP1 = Math.floor(Math.random() * (pool1.length));
            //}

            ////add selection to final list
            //await iPool.push(pool1[rIP1]);
            //rIP1 = 0;

            ////=================================================================
            ////RUN THROUGH 2
            //rarG = await grabRar(user.level);

            //chanceToBeat = 1;
            //upgradeChance = Math.random();
            //if (uData.pclass === 'Thief') {
            //    chanceToBeat -= 0.05;
            //}

            //if (pigmy) {
            //    if ((Math.floor(pigmy.level / 5) * 0.01) > 0.05) {
            //        chanceToBeat -= 0.05;
            //    } else {
            //        chanceToBeat -= (Math.floor(pigmy.level / 5) * 0.01);
            //    }
            //}

            //if (user.level >= 31) {
            //    if ((Math.floor(user.level / 5) * 0.01) > 0.10) {
            //        chanceToBeat -= 0.10;
            //    } else {
            //        chanceToBeat -= (Math.floor(user.level / 5) * 0.01);
            //    }
            //}

            //if (rarG < 10) {
            //    if (upgradeChance >= chanceToBeat) {
            //        rarG++;
            //    }
            //}

            //var pool2 = [];
            ////for loop adding all items of requested rarity to iPool for selection
            //for (var i = 0; i < lootList.length; i++) {

            //    if (lootList[i].Rar_id === rarG) {
            //        await pool2.push(lootList[i]);                   
            //    }
            //}

            ////list finished, select one item 
            //var rIP2;
            //if (pool2.length <= 1) {
            //    rIP2 = 0;
            //} else {
            //    rIP2 = Math.floor(Math.random() * (pool2.length));
            //}
            ////add selection to final list
            //await iPool.push(pool2[rIP2]);
            //rIP2 = 1;

            ////=================================================================
            ////RUN THROUGH 3
            //rarG = await grabRar(user.level);

            //chanceToBeat = 1;
            //upgradeChance = Math.random();
            //if (uData.pclass === 'Thief') {
            //    chanceToBeat -= 0.05;
            //}

            //if (pigmy) {
            //    if ((Math.floor(pigmy.level / 5) * 0.01) > 0.05) {
            //        chanceToBeat -= 0.05;
            //    } else {
            //        chanceToBeat -= (Math.floor(pigmy.level / 5) * 0.01);
            //    }
            //}

            //if (user.level >= 31) {
            //    if ((Math.floor(user.level / 5) * 0.01) > 0.10) {
            //        chanceToBeat -= 0.10;
            //    } else {
            //        chanceToBeat -= (Math.floor(user.level / 5) * 0.01);
            //    }
            //}

            //if (rarG < 10) {
            //    if (upgradeChance >= chanceToBeat) {
            //        rarG++;
            //    }
            //}

            //var pool3 = [];
            ////for loop adding all items of requested rarity to iPool for selection
            //for (var i = 0; i < lootList.length; i++) {

            //    if (lootList[i].Rar_id === rarG) {
            //        await pool3.push(lootList[i]);                  
            //    }
            //}
            ////list finished, select one item 
            //var rIP3;
            //if (pool3.length <= 1) {
            //    rIP3 = 0;
            //} else {
            //    rIP3 = Math.floor(Math.random() * (pool3.length));
            //}
            ////add selection to final list
            //await iPool.push(pool3[rIP3]);
            //rIP3 = 2;

            ////=================================================================
            ////RUN THROUGH 4
            ////run through again
            //rarG = await grabRar(user.level);

            //chanceToBeat = 1;
            //upgradeChance = Math.random();
            //if (uData.pclass === 'Thief') {
            //    chanceToBeat -= 0.05;
            //}

            //if (pigmy) {
            //    if ((Math.floor(pigmy.level / 5) * 0.01) > 0.05) {
            //        chanceToBeat -= 0.05;
            //    } else {
            //        chanceToBeat -= (Math.floor(pigmy.level / 5) * 0.01);
            //    }
            //}

            //if (user.level >= 31) {
            //    if ((Math.floor(user.level / 5) * 0.01) > 0.10) {
            //        chanceToBeat -= 0.10;
            //    } else {
            //        chanceToBeat -= (Math.floor(user.level / 5) * 0.01);
            //    }
            //}

            //if (rarG < 10) {
            //    if (upgradeChance >= chanceToBeat) {
            //        rarG++;
            //    }
            //}

            //var pool4 = [];
            ////for loop adding all items of requested rarity to iPool for selection
            //for (var i = 0; i < lootList.length; i++) {

            //    if (lootList[i].Rar_id === rarG) {
            //        await pool4.push(lootList[i]);
            //    }
            //}

            ////list finished, select one item 
            //var rIP4;
            //if (pool4.length <= 1) {
            //    rIP4 = 0;
            //} else {
            //    rIP4 = Math.floor(Math.random() * (pool4.length));
            //}

            ////add selection to final list
            //await iPool.push(pool4[rIP4]);
            //rIP4 = 3;

            //console.log(`REFERENCE TO ITEM OBJECT:\n ${iPool[rIP1].Name}\n ${iPool[rIP2].Name}\n ${iPool[rIP3].Name}\n ${iPool[rIP4].Name}\n `);

            //var item1 = iPool[rIP1];
            //var item2 = iPool[rIP2];
            //var item3 = iPool[rIP3];
            //var item4 = iPool[rIP4];

            //if (edit) {
            //    //Need better handling of shop entries
            //    if (item1.Slot === 'Mainhand') {
            //        //Item 1 is a weapon
            //        const shopSlot1 = await LootShop.update(
            //            {
            //                name: item1.Name,
            //                value: item1.Value,
            //                rarity: item1.Rarity,
            //                rar_id: item1.Rar_id,
            //                attack: item1.Attack,
            //                defence: 0,
            //                type: item1.Type,
            //                slot: item1.Slot,
            //                hands: item1.Hands,
            //                loot_id: item1.Loot_id,
            //                spec_id: interaction.user.id,
            //            },
            //            { where: [{ spec_id: interaction.user.id }, { shop_slot: 1 }] });
            //        if (shopSlot1 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    } else if (item1.Slot === 'Offhand') {
            //        //Is offhand
            //        const shopSlot1 = await LootShop.update(
            //            {
            //                name: item1.Name,
            //                value: item1.Value,
            //                rarity: item1.Rarity,
            //                rar_id: item1.Rar_id,
            //                attack: item1.Attack,
            //                defence: 0,
            //                type: item1.Type,
            //                slot: item1.Slot,
            //                hands: item1.Hands,
            //                loot_id: item1.Loot_id,
            //                spec_id: interaction.user.id,
            //            },
            //            { where: [{ spec_id: interaction.user.id }, { shop_slot: 1 }] });
            //        if (shopSlot1 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    } else {
            //        //Is armor
            //        const shopSlot1 = await LootShop.update(
            //            {
            //                name: item1.Name,
            //                value: item1.Value,
            //                rarity: item1.Rarity,
            //                rar_id: item1.Rar_id,
            //                attack: 0,
            //                defence: item1.Defence,
            //                type: item1.Type,
            //                slot: item1.Slot,
            //                loot_id: item1.Loot_id,
            //                spec_id: interaction.user.id,
            //            },
            //            { where: [{ spec_id: interaction.user.id }, { shop_slot: 1 }] });
            //        if (shopSlot1 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    }

            //    if (item2.Slot === 'Mainhand') {
            //        //Item 2 is a weapon
            //        const shopSlot2 = await LootShop.update(
            //            {
            //                name: item2.Name,
            //                value: item2.Value,
            //                rarity: item2.Rarity,
            //                rar_id: item2.Rar_id,
            //                attack: item2.Attack,
            //                defence: 0,
            //                type: item2.Type,
            //                slot: item2.Slot,
            //                hands: item2.Hands,
            //                loot_id: item2.Loot_id,
            //                spec_id: interaction.user.id,
            //            },
            //            { where: [{ spec_id: interaction.user.id }, { shop_slot: 2 }] });
            //        if (shopSlot2 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    } else if (item2.Slot === 'Offhand') {
            //        //Is offhand
            //        const shopSlot2 = await LootShop.update(
            //            {
            //                name: item2.Name,
            //                value: item2.Value,
            //                rarity: item2.Rarity,
            //                rar_id: item2.Rar_id,
            //                attack: item2.Attack,
            //                defence: 0,
            //                type: item2.Type,
            //                slot: item2.Slot,
            //                hands: item2.Hands,
            //                loot_id: item2.Loot_id,
            //                spec_id: interaction.user.id,
            //            },
            //            { where: [{ spec_id: interaction.user.id }, { shop_slot: 2 }] });
            //        if (shopSlot2 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    } else {
            //        //Is armor
            //        const shopSlot2 = await LootShop.update(
            //            {
            //                name: item2.Name,
            //                value: item2.Value,
            //                rarity: item2.Rarity,
            //                rar_id: item2.Rar_id,
            //                attack: 0,
            //                defence: item2.Defence,
            //                type: item2.Type,
            //                slot: item2.Slot,
            //                loot_id: item2.Loot_id,
            //                spec_id: interaction.user.id,
            //            },
            //            { where: [{ spec_id: interaction.user.id }, { shop_slot: 2 }] });
            //        if (shopSlot2 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    }

            //    if (item3.Slot === 'Mainhand') {
            //        //Item 3 is a weapon
            //        const shopSlot3 = await LootShop.update(
            //            {
            //                name: item3.Name,
            //                value: item3.Value,
            //                rarity: item3.Rarity,
            //                rar_id: item3.Rar_id,
            //                attack: item3.Attack,
            //                defence: 0,
            //                type: item3.Type,
            //                slot: item3.Slot,
            //                hands: item3.Hands,
            //                loot_id: item3.Loot_id,
            //                spec_id: interaction.user.id,
            //            },
            //            { where: [{ spec_id: interaction.user.id }, { shop_slot: 3 }] });
            //        if (shopSlot3 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    } else if (item3.Slot === 'Offhand') {
            //        //Is offhand
            //        const shopSlot3 = await LootShop.update(
            //            {
            //                name: item3.Name,
            //                value: item3.Value,
            //                rarity: item3.Rarity,
            //                rar_id: item3.Rar_id,
            //                attack: item3.Attack,
            //                defence: 0,
            //                type: item3.Type,
            //                slot: item3.Slot,
            //                hands: item3.Hands,
            //                loot_id: item3.Loot_id,
            //                spec_id: interaction.user.id,
            //            },
            //            { where: [{ spec_id: interaction.user.id }, { shop_slot: 3 }] });
            //        if (shopSlot3 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    } else {
            //        //Is armor
            //        const shopSlot3 = await LootShop.update(
            //            {
            //                name: item3.Name,
            //                value: item3.Value,
            //                rarity: item3.Rarity,
            //                rar_id: item3.Rar_id,
            //                attack: 0,
            //                defence: item3.Defence,
            //                type: item3.Type,
            //                slot: item3.Slot,
            //                loot_id: item3.Loot_id,
            //                spec_id: interaction.user.id,
            //            },
            //            { where: [{ spec_id: interaction.user.id }, { shop_slot: 3 }] });
            //        if (shopSlot3 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    }

            //    if (item4.Slot === 'Mainhand') {
            //        //Item 4 is a weapon
            //        const shopSlot4 = await LootShop.update(
            //            {
            //                name: item4.Name,
            //                value: item4.Value,
            //                rarity: item4.Rarity,
            //                rar_id: item4.Rar_id,
            //                attack: item4.Attack,
            //                defence: 0,
            //                type: item4.Type,
            //                slot: item4.Slot,
            //                hands: item4.Hands,
            //                loot_id: item4.Loot_id,
            //                spec_id: interaction.user.id,
            //            },
            //            { where: [{ spec_id: interaction.user.id }, { shop_slot: 4 }] });
            //        if (shopSlot4 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    } else if (item4.Slot === 'Offhand') {
            //        //Is offhand
            //        const shopSlot4 = await LootShop.update(
            //            {
            //                name: item4.Name,
            //                value: item4.Value,
            //                rarity: item4.Rarity,
            //                rar_id: item4.Rar_id,
            //                attack: item4.Attack,
            //                defence: 0,
            //                type: item4.Type,
            //                slot: item4.Slot,
            //                hands: item4.Hands,
            //                loot_id: item4.Loot_id,
            //                spec_id: interaction.user.id,
            //            },
            //            { where: [{ spec_id: interaction.user.id }, { shop_slot: 4 }] });
            //        if (shopSlot4 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    } else {
            //        //Is armor
            //        const shopSlot4 = await LootShop.update(
            //            {
            //                name: item4.Name,
            //                value: item4.Value,
            //                rarity: item4.Rarity,
            //                rar_id: item4.Rar_id,
            //                attack: 0,
            //                defence: item4.Defence,
            //                type: item4.Type,
            //                slot: item4.Slot,
            //                loot_id: item4.Loot_id,
            //                spec_id: interaction.user.id,
            //            },
            //            { where: [{ spec_id: interaction.user.id }, { shop_slot: 4 }] });
            //        if (shopSlot4 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    }               
            //}
            //if (!edit) {         
            //    await setTomorrow(user);

            //    if (item1.Slot === 'Mainhand') {
            //        //Item 1 is a weapon
            //        const shopSlot1 = await LootShop.create(
            //            {
            //                name: item1.Name,
            //                value: item1.Value,
            //                rarity: item1.Rarity,
            //                rar_id: item1.Rar_id,
            //                attack: item1.Attack,
            //                defence: 0,
            //                type: item1.Type,
            //                slot: item1.Slot,
            //                hands: item1.Hands,
            //                loot_id: item1.Loot_id,
            //                spec_id: interaction.user.id,
            //                shop_slot: 1,
            //            });
            //        if (shopSlot1 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    } else if (item1.Slot === 'Offhand') {
            //        //Is offhand
            //        const shopSlot1 = await LootShop.create(
            //            {
            //                name: item1.Name,
            //                value: item1.Value,
            //                rarity: item1.Rarity,
            //                rar_id: item1.Rar_id,
            //                attack: item1.Attack,
            //                defence: 0,
            //                type: item1.Type,
            //                slot: item1.Slot,
            //                hands: item1.Hands,
            //                loot_id: item1.Loot_id,
            //                spec_id: interaction.user.id,
            //                shop_slot: 1,
            //            });
            //        if (shopSlot1 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    } else {
            //        //Is armor
            //        const shopSlot1 = await LootShop.create(
            //            {
            //                name: item1.Name,
            //                value: item1.Value,
            //                rarity: item1.Rarity,
            //                rar_id: item1.Rar_id,
            //                attack: 0,
            //                defence: item1.Defence,
            //                type: item1.Type,
            //                slot: item1.Slot,
            //                loot_id: item1.Loot_id,
            //                spec_id: interaction.user.id,
            //                shop_slot: 1,
            //            });
            //        if (shopSlot1 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    }

            //    if (item2.Slot === 'Mainhand') {
            //        //Item 2 is a weapon
            //        const shopSlot2 = await LootShop.create(
            //            {
            //                name: item2.Name,
            //                value: item2.Value,
            //                rarity: item2.Rarity,
            //                rar_id: item2.Rar_id,
            //                attack: item2.Attack,
            //                defence: 0,
            //                type: item2.Type,
            //                slot: item2.Slot,
            //                hands: item2.Hands,
            //                loot_id: item2.Loot_id,
            //                spec_id: interaction.user.id,
            //                shop_slot: 2,
            //            });
            //        if (shopSlot2 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    } else if (item2.Slot === 'Offhand') {
            //        //Is offhand
            //        const shopSlot2 = await LootShop.create(
            //            {
            //                name: item2.Name,
            //                value: item2.Value,
            //                rarity: item2.Rarity,
            //                rar_id: item2.Rar_id,
            //                attack: item2.Attack,
            //                defence: 0,
            //                type: item2.Type,
            //                slot: item2.Slot,
            //                hands: item2.Hands,
            //                loot_id: item2.Loot_id,
            //                spec_id: interaction.user.id,
            //                shop_slot: 2,
            //            });
            //        if (shopSlot2 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    } else {
            //        //Is armor
            //        const shopSlot2 = await LootShop.create(
            //            {
            //                name: item2.Name,
            //                value: item2.Value,
            //                rarity: item2.Rarity,
            //                rar_id: item2.Rar_id,
            //                attack: 0,
            //                defence: item2.Defence,
            //                type: item2.Type,
            //                slot: item2.Slot,
            //                loot_id: item2.Loot_id,
            //                spec_id: interaction.user.id,
            //                shop_slot: 2,
            //            });
            //        if (shopSlot2 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    }

            //    if (item3.Slot === 'Mainhand') {
            //        //Item 3 is a weapon
            //        const shopSlot3 = await LootShop.create(
            //            {
            //                name: item3.Name,
            //                value: item3.Value,
            //                rarity: item3.Rarity,
            //                rar_id: item3.Rar_id,
            //                attack: item3.Attack,
            //                defence: 0,
            //                type: item3.Type,
            //                slot: item3.Slot,
            //                hands: item3.Hands,
            //                loot_id: item3.Loot_id,
            //                spec_id: interaction.user.id,
            //                shop_slot: 3,
            //            });
            //        if (shopSlot3 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    } else if (item3.Slot === 'Offhand') {
            //        //Is offhand
            //        const shopSlot3 = await LootShop.create(
            //            {
            //                name: item3.Name,
            //                value: item3.Value,
            //                rarity: item3.Rarity,
            //                rar_id: item3.Rar_id,
            //                attack: item3.Attack,
            //                defence: 0,
            //                type: item3.Type,
            //                slot: item3.Slot,
            //                hands: item3.Hands,
            //                loot_id: item3.Loot_id,
            //                spec_id: interaction.user.id,
            //                shop_slot: 3,
            //            });
            //        if (shopSlot3 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    } else {
            //        //Is armor
            //        const shopSlot3 = await LootShop.create(
            //            {
            //                name: item3.Name,
            //                value: item3.Value,
            //                rarity: item3.Rarity,
            //                rar_id: item3.Rar_id,
            //                attack: 0,
            //                defence: item3.Defence,
            //                type: item3.Type,
            //                slot: item3.Slot,
            //                loot_id: item3.Loot_id,
            //                spec_id: interaction.user.id,
            //                shop_slot: 3,
            //            });
            //        if (shopSlot3 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    }

            //    if (item4.Slot === 'Mainhand') {
            //        //Item 4 is a weapon
            //        const shopSlot4 = await LootShop.create(
            //            {
            //                name: item4.Name,
            //                value: item4.Value,
            //                rarity: item4.Rarity,
            //                rar_id: item4.Rar_id,
            //                attack: item4.Attack,
            //                defence: 0,
            //                type: item4.Type,
            //                slot: item4.Slot,
            //                hands: item4.Hands,
            //                loot_id: item4.Loot_id,
            //                spec_id: interaction.user.id,
            //                shop_slot: 4,
            //            });
            //        if (shopSlot4 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    } else if (item4.Slot === 'Offhand') {
            //        //Is offhand
            //        const shopSlot4 = await LootShop.create(
            //            {
            //                name: item4.Name,
            //                value: item4.Value,
            //                rarity: item4.Rarity,
            //                rar_id: item4.Rar_id,
            //                attack: item4.Attack,
            //                defence: 0,
            //                type: item4.Type,
            //                slot: item4.Slot,
            //                hands: item4.Hands,
            //                loot_id: item4.Loot_id,
            //                spec_id: interaction.user.id,
            //                shop_slot: 4,
            //            });
            //        if (shopSlot4 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    } else {
            //        //Is armor
            //        const shopSlot4 = await LootShop.create(
            //            {
            //                name: item4.Name,
            //                value: item4.Value,
            //                rarity: item4.Rarity,
            //                rar_id: item4.Rar_id,
            //                attack: 0,
            //                defence: item4.Defence,
            //                type: item4.Type,
            //                slot: item4.Slot,
            //                loot_id: item4.Loot_id,
            //                spec_id: interaction.user.id,
            //                shop_slot: 4,
            //            });
            //        if (shopSlot4 > 0) {
            //            //ShopSlot 1 updated
            //        }
            //    }                
            //} else {
            //    //something went wrong :o
            //    console.log('\nSOMETHING WENT WRONG!\n');
            //}   
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
                await lootStore.save();
                return 'Success';
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

                return 'Success';
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

                return 'Success';
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

                return 'Success';
            }
            return 'Failure';
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
