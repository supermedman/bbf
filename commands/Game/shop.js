const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const { Pigmy, BasicShoppe, ItemLootPool } = require('../../dbObjects.js');
const { grabRar } = require('./exported/grabRar.js');

const { grabUser, rollChance, checkLootUP, randArrPos, createInteractiveChannelMessage, endTimer } = require('../../uniHelperFunctions.js');
const { uni_displayItem } = require('../Development/Export/itemStringCore.js');
const { checkInboundItem } = require('../Development/Export/itemMoveContainer.js');
const { spendUserCoins } = require('../Development/Export/uni_userPayouts.js');

module.exports = {
    cooldown: 35,
	data: new SlashCommandBuilder()
		.setName('shop')
        .setDescription('Buy some new gear!'),

    async execute(interaction) {
        //if (interaction.user.id !== '501177494137995264') return interaction.reply('Nope!');
        const {gearDrops} = interaction.client;

        await interaction.deferReply();

        const uShopper = await grabUser(interaction.user.id);

        /**
         * This function handles reloading the shop upon sell-out, reroll, or initial
         * command call.
         * @param {object} user UserData Instance Object
         * @param {boolean} onLoad True if called on command start call or sell-out
         * @param {boolean} sellOut True if called on sell-out
         */
        async function startFreshShop(user, onLoad=false, sellOut=false){
            let startTime;
            if (onLoad || sellOut) startTime = new Date().getTime();
            if (!onLoad && !sellOut) startTime = new Date().getTime();
            let uShoppe = await BasicShoppe.findOrCreate({
                where: {
                    user_id: user.userid
                },
                defaults: {
                    refcost: 0,

                    slot_one: '0',
                    cost_one: 0,

                    slot_two: '0',
                    cost_two: 0,

                    slot_three: '0',
                    cost_three: 0,
                    
                    slot_four: '0',
                    cost_four: 0,
                }
            });

            if (uShoppe[1]){
                await uShoppe[0].save().then(async u => {return await u.reload()});
            }

            uShoppe = uShoppe[0];

            const loadedShop = await loadShopDisplay(user, uShoppe);

            const refCost = uShoppe.cost_one + uShoppe.cost_two + uShoppe.cost_three + uShoppe.cost_four;
            const totCost = await shopCost(user, refCost);

            // Spend coins
            const payUp = (onLoad) ? await shopCost(user) : totCost;
            if (payUp < user.coins && !sellOut) await spendUserCoins(payUp, user);

            await uShoppe.update({refcost: totCost}).then(async s => await s.save()).then(async u => {return await u.reload()});

            if (onLoad || sellOut) endTimer(startTime, "Shop Initial Load Time");
            if (!onLoad && !sellOut) endTimer(startTime, "Shop Reroll Load Time");
            await handleShop(user, uShoppe, loadedShop);
        }

        /**
         * This function handles all aspects of the interactive portion of the shop,
         * it acts as the main looper for all users shopping.
         * @param {object} user UserData Instance Object
         * @param {object} shop BasicShoppe Instance Object
         * @param {object} shopDisplay {embeds: EmbedBuilder, fields: object[]}
         */
        async function handleShop(user, shop, shopDisplay){
            let s1b = (user.coins < shop.cost_one) ? true : false, 
            s2b = (user.coins < shop.cost_two) ? true : false, 
            s3b = (user.coins < shop.cost_three) ? true : false, 
            s4b = (user.coins < shop.cost_four) ? true : false;

            const refButt = new ButtonBuilder()
            .setCustomId('refresh')
            .setLabel(`Reroll Shop for ${shop.refcost}c`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄');

            const sOneButt = new ButtonBuilder()
            .setCustomId('s-one')
            .setLabel('Slot 1')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(s1b)
            .setEmoji('1️⃣');

            const sTwoButt = new ButtonBuilder()
            .setCustomId('s-two')
            .setLabel('Slot 2')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(s2b)
            .setEmoji('2️⃣');

            const sThreeButt = new ButtonBuilder()
            .setCustomId('s-three')
            .setLabel('Slot 3')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(s3b)
            .setEmoji('3️⃣');

            const sFourButt = new ButtonBuilder()
            .setCustomId('s-four')
            .setLabel('Slot 4')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(s4b)
            .setEmoji('4️⃣');

            const buttRow = new ActionRowBuilder().addComponents(refButt, sOneButt, sTwoButt, sThreeButt, sFourButt);
            
            const finalReply = {embeds: [shopDisplay.embeds], components: [buttRow]};

            const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 60000, finalReply, "FollowUp");
            
            let soldOutBreak = 0;
            collector.on('collect', async c => {
                await c.deferUpdate().then(async () => {
                    let replyObj, rerollCost = shop.refcost, sellStart = new Date().getTime();
                    switch(c.customId){
                        case "s-one":
                            replyObj = await sellItem(user, shop, shopDisplay, 1);
                            sOneButt.setDisabled(true);
                            rerollCost = await valueCurrentShop(user, shop);
                            soldOutBreak++;
                        break;
                        case "s-two":
                            replyObj = await sellItem(user, shop, shopDisplay, 2);
                            sTwoButt.setDisabled(true);
                            rerollCost = await valueCurrentShop(user, shop);
                            soldOutBreak++;
                        break;
                        case "s-three":
                            replyObj = await sellItem(user, shop, shopDisplay, 3);
                            sThreeButt.setDisabled(true);
                            rerollCost = await valueCurrentShop(user, shop);
                            soldOutBreak++;
                        break;
                        case "s-four":
                            replyObj = await sellItem(user, shop, shopDisplay, 4);
                            sFourButt.setDisabled(true);
                            rerollCost = await valueCurrentShop(user, shop);
                            soldOutBreak++;
                        break;
                        case "refresh":
                        return await collector.stop('Reroll');
                    }
                    refButt.setLabel(`Reroll Shop for ${rerollCost}c`);
                    if (soldOutBreak === 4) return await collector.stop('Sold-Out');
                    await anchorMsg.edit({embeds: [replyObj.embeds], components: [buttRow]});
                    endTimer(sellStart, "Sell Item Time");
                }).catch(e => console.error(e));
            });

            collector.on('end', async (c, r) => {
                anchorMsg.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Failed to delete the message:', error);
                    }
                });
                if (!r || r === "Time") return;

                switch(r){
                    case "Sold-Out":
                        // Reload shop (Free)
                    return await startFreshShop(user, false, true);
                    case "Reroll":
                        // Reload shop (Paid)
                        await updateRefCount(user);
                    return await startFreshShop(user);
                }
            });
        }

        /**
         * This function handles selling an item from the given slotSold, it handles
         * adding the item to the users inventory, taking the value of the item in coins,
         * updating the shop objects internal refcost, as well as updating the slot fields
         * of the shops embed to signify the transaction.
         * @param {object} user UserData Instance Object
         * @param {object} shop BasicShoppe Instance Object
         * @param {object} shopDisplay {embeds: EmbedBuilder, fields: object[]}
         * @param {number} slotSold Number for shop slot being sold
         * @returns {Promise<{embeds: EmbedBuilder, fields: object[]}>}
         */
        async function sellItem(user, shop, shopDisplay, slotSold){
            const slotMatch = ["slot_one", "slot_two", "slot_three", "slot_four"];
            const costMatch = ["cost_one", "cost_two", "cost_three", "cost_four"];
            const soldFieldMatch = ["SLOT ONE", "SLOT TWO", "SLOT THREE", "SLOT FOUR"];
            
            // Handle item inbound
            const theItem = await checkInboundItem(user.userid, shop[`${slotMatch[slotSold - 1]}`]);
            await interaction.channel.send(`${theItem.name} purchased! Amount owned: ${theItem.amount}`);
            
            // Payout coins
            await spendUserCoins(theItem.value, user);

            // Update Shop Object
            await shop.update({[`${slotMatch[slotSold - 1]}`]: '0', [`${costMatch[slotSold - 1]}`]: 0})
            .then(async s => await s.save()).then(async s => {return await s.reload()});

            // Update field at position of slot
            shopDisplay.fields[slotSold - 1] = {
                name: soldFieldMatch[slotSold - 1],
                value: '**I\nT\nE\nM\n\nS\nO\nL\nD**'
            };

            shopDisplay.fields[4] = {
                name: 'Your Coins: ', value: `**${user.coins}**`
            };

            // reload shopDisplay Embed
            shopDisplay.embeds.spliceFields(slotSold - 1, 1, shopDisplay.fields[slotSold - 1]);
            shopDisplay.embeds.spliceFields(4, 1, shopDisplay.fields[4]);

            // return updated values
            return shopDisplay;
        }

        /**
         * This function reloads the cost of the shop after an item has been sold.
         * @param {object} user UserData Instance Object
         * @param {object} shop BasicShoppe Instance Object
         * @returns {Promise<number>}
         */
        async function valueCurrentShop(user, shop){
            const refCost = shop.cost_one + shop.cost_two + shop.cost_three + shop.cost_four;
            const totCost = await shopCost(user, refCost);
            await shop.update({refcost: totCost})
            .then(async s => await s.save()).then(async s => {return await s.reload()});
            return totCost;
        }

        /**
         * This function loads items into the shop slots and creates the main shop
         * embed for displaying to the user.
         * @param {object} user UserData Instance Object
         * @param {object} shop BasicShoppe Instance Object
         * @returns {Promise<{embeds: EmbedBuilder, fields: object[]}>}
         */
        async function loadShopDisplay(user, shop){
            await loadShopItems(user, shop);

            const shopEmbed = new EmbedBuilder()
            .setTitle("=~= Bloodstone Shoppe =~=")
            .setColor('#39acf3')
            .setDescription("Welcome to the shop! Take a look at the wares.. be quick they wont last forever.");

            const shopFields = [];

            const slotMatch = ["slot_one", "slot_two", "slot_three", "slot_four"];
            const costMatch = ["cost_one", "cost_two", "cost_three", "cost_four"];
            for (let i = 0; i < 4; i++){
                const checkVal = shop[`${slotMatch[i]}`];
                const item = await ItemLootPool.findOne({where: {creation_offset_id: checkVal}});
                await shop.update({
                    [`${costMatch[i]}`]: item.value
                }).then(async u => await u.save()).then(async u => {return await u.reload()});

                const fieldVals = uni_displayItem(item, "Single");
                fieldVals.fields.name = '\n\n' + fieldVals.fields.name;

                shopFields.push(fieldVals.fields);
            }

            shopFields.push({name: 'Your Coins: ', value: `**${user.coins}**`});

            shopEmbed.addFields(shopFields);

            return {embeds: shopEmbed, fields: shopFields}
        }

        /**
         * This function handles all item loading related handling for preloading the
         * BasicShoppe Object tied to the user given.
         * @param {object} user UserData Instance Object
         * @param {object} shop BasicShoppe Instance Object
         * @returns {Promise<void>} object[{slot: string}]
         */
        async function loadShopItems(user, shop){
            const pigmy = await Pigmy.findOne({where: {spec_id: user.userid}});

            const rarList = [];
            for (let i = 0; i < 4; i++){
                let rar = await grabRar(user.level);
                if (rar < 10 && rollChance(checkLootUP(pigmy, user))) rar++;
                rarList.push(rar);
            }

            const itemKeyList = [];
            for (const rar of rarList){
                let choices = [];
                for (const [key, value] of gearDrops){
                    if (value === rar) choices.push(key);
                }
                itemKeyList.push(randArrPos(choices));
            }

            const slotMatch = ["slot_one", "slot_two", "slot_three", "slot_four"];
            //const displaySlots = [];
            let curSlot = 0;
            for (const id of itemKeyList){
                await shop.update({
                    [`${slotMatch[curSlot]}`]: id.toString()
                }).then(async u => await u.save()).then(async u => {return await u.reload()});
                //displaySlots.push({[`${slotMatch[curSlot]}`]: id.toString()});
                curSlot++;
            }

            return; //displaySlots;
        }
        
        /**
         * This function handles all time checks, and then calculates the total cost
         * to refresh the current shop.
         * @param {object} user UserData Instance Object
         * @param {number} refCost Current Shop value added to totcost: default 0
         * @returns {Promise<number>} 
         */
        async function shopCost(user, refCost=0){
            // (Amount of refresh * user level) + total shop cost
            await handleTimeChange(user);
            
            const upperLimit = Math.ceil(user.level / 5);
            const refMod = (user.refreshcount - upperLimit <= 0) ? 1 : user.refreshcount - upperLimit;
            const refMult = (refMod * user.level);
            const curCost = refMult + refCost;

            return curCost;
        }

        /**
         * This function handles increasing the given users refreshcount by one.
         * @param {object} user 
         * @returns {Promise<void>}
         */
        async function updateRefCount(user){
            return await user.increment('refreshcount').then(async u => await u.save()).then(async u => {return await u.reload()});
        }

        /**
         * This function handles checking if the daily shop can reset refresh count.
         * @param {object} user UserData Instance Object
         * @returns {Promise<void>}
         */
        async function handleTimeChange(user){
            if (user.shopresets === null || user.refreshcount === null){
                await handleTomorrow(user);
            }

            const today = new Date().getTime();
            if (user.shopresets <= today){
                // Refresh resets!
                await handleTomorrow(user);
            }

            return;
        }

        /**
         * This function handles setting and updating the date of the next refresh
         * reset. It also updates the UserData values accordingly. 
         * @param {object} user UserData Instance Object
         * @returns {Promise<void>}
         */
        async function handleTomorrow(user){
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const newDay = tomorrow.getTime();

            await user.update({shopresets: newDay, refreshcount: 0})
            .then(async u => await u.save())
            .then(async u => {return await u.reload()});

            return;
        }

        startFreshShop(uShopper, true);






        // let itemsSold = 0;

        // let slotOneButtonSold = false;
        // let slotTwoButtonSold = false;
        // let slotThreeButtonSold = false;
        // let slotFourButtonSold = false;


        // let refreshCost = 0;

        // await interaction.deferReply().then(async () => {
        //     const fUser = await grabU();
        //     const initialCost = await checkShop(fUser, refreshCost, true);
        //     if (fUser.coins > initialCost) {
        //         await userPays(initialCost, fUser).then(() => {
        //             startShop();
        //         });
        //     } else startShop();
        // }).catch((error) => {
        //     console.error(error);
        // });
        // //await wait(1000);
        // //await interaction.deleteReply();

        

        // //Refreshing the shop needs to cost more and more based on x
        // //x is total cost of items currently in shop?
        // //x is scaled based on total refreshes?
        // //x is scaled daily upto a max?
        // //x is scaled base on user level?

        // //x is based on user level * current refreshes (resets daily) + total shop value  
        // //Calling shop is free, set crazy cooldown once the above code works 
        // //Give notice of refresh cost, and amount of refreshes made today
        // //Check for new day on each shop call

        // /**
        //  *      How will the shop be working?
        //  *          - Make four embed field objects
        //  *          - Retain a listing for removal if bought
        //  *          - Update embed with removed items and updated user coins
        //  *          - If all items are sold refresh for free
        //  *          
        //  * 
        //  * */

        // async function startShop() {
        //     let uData = await grabU();

        //     refreshCost = 0;
        //     itemsSold = 0;
        //     await loadShop();

        //     //const items = await LootShop.findAll({ where: [{ spec_id: interaction.user.id }] });

        //     //var list = [];

        //     const item1 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 1 }] });
        //     const item2 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 2 }] });
        //     const item3 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 3 }] });
        //     const item4 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 4 }] });          

        //     const listedInOrder = [item1, item2, item3, item4];

        //     console.log(basicInfoForm(`Items in shop as follows:\n${listedInOrder[0].name}\n${listedInOrder[1].name}\n${listedInOrder[2].name}\n${listedInOrder[3].name}`));

        //     let finalFields = [];

        //     let breakPoint = 0;
        //     for (const item of listedInOrder) {
        //         //console.log(specialInfoForm('Running through items, currently on item #: ', breakPoint));
        //         let listedName = ``;
        //         let listedVal = ``;

        //         let fieldValueObj;
        //         if (item.slot === 'Mainhand') {
        //             listedName = `Name: ${item.name}`;
        //             listedVal = `Value: **${item.value}c** \nRarity: **${item.rarity}** \nAttack: **${item.attack}** \nType: **${item.type}**\nSlot: **${item.slot}**\nHands: **${item.hands}**\n\n`;

        //             fieldValueObj = { name: listedName.toString(), value: listedVal.toString(), };

        //             finalFields.push(fieldValueObj);
        //             breakPoint++;
        //         } else if (item.slot === 'Offhand') {
        //             listedName = `Name: ${item.name}`;
        //             listedVal = `Value: **${item.value}c** \nRarity: **${item.rarity}** \nDefence: **${item.defence}** \nAttack: **${item.attack}** \nType: **${item.type}**\nSlot: **${item.slot}**\nHands: **${item.hands}**\n\n`;

        //             fieldValueObj = { name: listedName.toString(), value: listedVal.toString(), };

        //             finalFields.push(fieldValueObj);
        //             breakPoint++;
        //         } else {
        //             listedName = `Name: ${item.name}`;
        //             listedVal = `Value: **${item.value}c** \nRarity: **${item.rarity}** \nDefence: **${item.defence}** \nType: **${item.type}**\nSlot: **${item.slot}**\n\n`;

        //             fieldValueObj = { name: listedName.toString(), value: listedVal.toString(), };

        //             finalFields.push(fieldValueObj);
        //             breakPoint++;
        //         }

        //         if (breakPoint === listedInOrder.length) {
        //             fieldValueObj = { name: `Your Coins: `, value: `${uData.coins}c`, };
        //             finalFields.push(fieldValueObj);
        //             break;
        //         } 
        //     }

        //     const displayCost = await checkShop(uData, refreshCost);

        //     //var currentRefreshCost = displayCost;
        //     refreshCost = displayCost;

        //     const refreshButton = new ButtonBuilder()
        //         .setCustomId('refresh')
        //         .setLabel(`Reroll Shop, Cost ${refreshCost}`)
        //         .setStyle(ButtonStyle.Primary)
        //         .setEmoji('🔄');

        //     const slotOneButton = new ButtonBuilder()
        //         .setCustomId('slot-one')
        //         .setLabel('Slot 1')
        //         .setStyle(ButtonStyle.Secondary)
        //         .setDisabled(slotOneButtonSold)
        //         .setEmoji('1️⃣');

        //     const slotTwoButton = new ButtonBuilder()
        //         .setCustomId('slot-two')
        //         .setLabel('Slot 2')
        //         .setStyle(ButtonStyle.Secondary)
        //         .setDisabled(slotTwoButtonSold)
        //         .setEmoji('2️⃣');

        //     const slotThreeButton = new ButtonBuilder()
        //         .setCustomId('slot-three')
        //         .setLabel('Slot 3')
        //         .setStyle(ButtonStyle.Secondary)
        //         .setDisabled(slotThreeButtonSold)
        //         .setEmoji('3️⃣');

        //     const slotFourButton = new ButtonBuilder()
        //         .setCustomId('slot-four')
        //         .setLabel('Slot 4')
        //         .setStyle(ButtonStyle.Secondary)
        //         .setDisabled(slotFourButtonSold)
        //         .setEmoji('4️⃣');

        //     const buttonRow = new ActionRowBuilder().addComponents(refreshButton, slotOneButton, slotTwoButton, slotThreeButton, slotFourButton);        

        //     //var footerCoins = `Your Coins: ${uData.coins}c`;

        //     let shopEmbed = {
        //         title: "~Bloodstone Shoppe~",
        //         color: 0x39acf3,
        //         description: "Welcome to the shop! Take a look at the wares.. be quick they wont last forever.",
        //         fields: finalFields,
        //     };


        //     //const openShop = new EmbedBuilder()
        //     //    .setTitle("~Bloodstone Shoppe~")
        //     //    .setColor(0x39acf3)
        //     //    .setDescription("Welcome to the shop! Take a look at the wares.. be quick they wont last forever.")
        //     //    .addFields(
        //     //        {
        //     //            name: ("<< ITEMS FOR SALE >>"),
        //     //            value: list
        //     //        },
        //     //        {
        //     //            name: 'Your Coins: ',
        //     //            value: `${uData.coins}c`
        //     //        }
        //     //);

        //     const embedMsg = await interaction.followUp({ embeds: [shopEmbed], components: [buttonRow] });

        //     const filter = (i) => i.user.id === interaction.user.id;

        //     const collector = embedMsg.createMessageComponentCollector({
        //         componentType: ComponentType.Button,
        //         filter,
        //         time: 45000,
        //     });

        //     collector.on('collect', async (collInteract) => {               
        //         if (collInteract.customId === 'slot-one') {
        //             await collInteract.deferUpdate().then(async () => {
        //                 const item = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 1 }] });
        //                 if (item) {
        //                     console.log(successResult('ITEM FOUND! Slot-One'));//item was found yaaaay

        //                     if (item.value > uData.coins) {
        //                         console.log(warnedForm('ITEM COST HIGHER THAN COINS OF USER', item.value, uData.coins));
        //                         return interaction.channel.send("You don't have enough coin for that one.. this aint a charity!");
        //                     } else {
        //                         const result = await checkOwned(uData, item, 1);
        //                         if (result === 'Finished') {
        //                             //const coinReduced = uData.coins - item.value;

        //                             //await payUp(coinReduced, uData);

        //                             await userPays(item.value, uData);

        //                             uData = await grabU();

        //                             let data = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: item.loot_id }] });

        //                             slotOneButton.setDisabled(true);
        //                             refreshCost -= item.value;
        //                             refreshButton.setLabel(`Reroll Shop, Cost ${refreshCost}`);

        //                             finalFields[0] = {
        //                                 name: 'SLOT ONE', value: '**I\nT\nE\nM\n\nS\nO\nL\nD**',
        //                             };

        //                             finalFields[4] = {
        //                                 name: `Your Coins: `, value: `${uData.coins}c`,
        //                             };

        //                             shopEmbed = {
        //                                 title: "~Bloodstone Shoppe~",
        //                                 color: 0x39acf3,
        //                                 description: "Welcome to the shop! Take a look at the wares.. be quick they wont last forever.",
        //                                 fields: finalFields,
        //                             };

        //                             await embedMsg.edit({ embeds: [shopEmbed], components: [buttonRow] });

        //                             itemsSold++;
        //                             if (itemsSold === 4) {
        //                                 if (data) interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
        //                                 interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
        //                                 await collector.stop();
        //                                 startShop();
        //                             } else {
        //                                 if (data) return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
        //                                 return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
        //                             }
        //                         }

        //                         //wipe db after this
        //                     }
        //                 } else console.log(errorForm('ITEM NOT FOUND!'));//item not found :( 
        //             }).catch(error => {
        //                 console.error(errorForm(error));
        //             });
        //         }
        //         if (collInteract.customId === 'slot-two') {
        //             await collInteract.deferUpdate().then(async () => {
        //                 const item = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 2 }] });
        //                 if (item) {
        //                     console.log(successResult('ITEM FOUND! Slot-Two'));//item was found yaaaay

        //                     if (item.value > uData.coins) {
        //                         console.log(warnedForm('ITEM COST HIGHER THAN COINS OF USER', item.value, uData.coins));
        //                         return interaction.channel.send("You don't have enough coin for that one.. this aint a charity!");
        //                     } else {
        //                         const result = await checkOwned(uData, item, 1);
        //                         if (result === 'Finished') {
        //                             //const coinReduced = uData.coins - item.value;

        //                             //await payUp(coinReduced, uData);

        //                             await userPays(item.value, uData);

        //                             uData = await grabU();

        //                             let data = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: item.loot_id }] });

        //                             slotTwoButton.setDisabled(true);
        //                             refreshCost -= item.value;
        //                             refreshButton.setLabel(`Reroll Shop, Cost ${refreshCost}`);

        //                             finalFields[1] = {
        //                                 name: 'SLOT TWO', value: '**I\nT\nE\nM\n\nS\nO\nL\nD**',
        //                             };

        //                             finalFields[4] = {
        //                                 name: `Your Coins: `, value: `${uData.coins}c`,
        //                             };

        //                             shopEmbed = {
        //                                 title: "~Bloodstone Shoppe~",
        //                                 color: 0x39acf3,
        //                                 description: "Welcome to the shop! Take a look at the wares.. be quick they wont last forever.",
        //                                 fields: finalFields,
        //                             };

        //                             await embedMsg.edit({ embeds: [shopEmbed], components: [buttonRow] });

        //                             itemsSold++;
        //                             if (itemsSold === 4) {
        //                                 if (data) interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
        //                                 interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
        //                                 await collector.stop();
        //                                 startShop();
        //                             } else {
        //                                 if (data) return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
        //                                 return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
        //                             }
        //                         }

        //                         //wipe db after this
        //                     }

        //                 } else console.log(errorForm('ITEM NOT FOUND!'));//item not found :(
        //             }).catch(error => {
        //                 console.error(errorForm(error));
        //             });
        //         }
        //         if (collInteract.customId === 'slot-three') {
        //             await collInteract.deferUpdate().then(async () => {
        //                 const item = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 3 }] });
        //                 if (item) {
        //                     console.log(successResult('ITEM FOUND! Slot-Three'));//item was found yaaaay

        //                     if (item.value > uData.coins) {
        //                         console.log(warnedForm('ITEM COST HIGHER THAN COINS OF USER', item.value, uData.coins));
        //                         return interaction.channel.send("You don't have enough coin for that one.. this aint a charity!");
        //                     } else {
        //                         const result = await checkOwned(uData, item, 1);
        //                         if (result === 'Finished') {
        //                             //const coinReduced = uData.coins - item.value;

        //                             //await payUp(coinReduced, uData);

        //                             await userPays(item.value, uData);

        //                             uData = await grabU();

        //                             let data = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: item.loot_id }] });

        //                             slotThreeButton.setDisabled(true);
        //                             refreshCost -= item.value;
        //                             refreshButton.setLabel(`Reroll Shop, Cost ${refreshCost}`);

        //                             finalFields[2] = {
        //                                 name: 'SLOT THREE', value: '**I\nT\nE\nM\n\nS\nO\nL\nD**',
        //                             };

        //                             finalFields[4] = {
        //                                 name: `Your Coins: `, value: `${uData.coins}c`,
        //                             };

        //                             shopEmbed = {
        //                                 title: "~Bloodstone Shoppe~",
        //                                 color: 0x39acf3,
        //                                 description: "Welcome to the shop! Take a look at the wares.. be quick they wont last forever.",
        //                                 fields: finalFields,
        //                             };

        //                             await embedMsg.edit({ embeds: [shopEmbed], components: [buttonRow] });

        //                             itemsSold++;
        //                             if (itemsSold === 4) {
        //                                 if (data) interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
        //                                 interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
        //                                 await collector.stop();
        //                                 startShop();
        //                             } else {
        //                                 if (data) return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
        //                                 return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
        //                             }
        //                         }
        //                     }

        //                 } else console.log(errorForm('ITEM NOT FOUND!'));//item not found :(
        //             }).catch(error => {
        //                 console.error(errorForm(error));
        //             });
        //         }
        //         if (collInteract.customId === 'slot-four') {
        //             await collInteract.deferUpdate().then(async () => {
        //                 const item = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 4 }] });
        //                 if (item) {
        //                     console.log(successResult('ITEM FOUND! Slot-Four'));//item was found yaaaay

        //                     if (item.value > uData.coins) {
        //                         console.log(warnedForm('ITEM COST HIGHER THAN COINS OF USER', item.value, uData.coins));
        //                         return interaction.channel.send("You don't have enough coin for that one.. this aint a charity!");
        //                     } else {
        //                         const result = await checkOwned(uData, item, 1);
        //                         if (result === 'Finished') {
        //                             //const coinReduced = uData.coins - item.value;

        //                             //await payUp(coinReduced, uData);

        //                             await userPays(item.value, uData);

        //                             uData = await grabU();

        //                             let data = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: item.loot_id }] });

        //                             slotFourButton.setDisabled(true);
        //                             refreshCost -= item.value;
        //                             refreshButton.setLabel(`Reroll Shop, Cost ${refreshCost}`);

        //                             finalFields[3] = {
        //                                 name: 'SLOT FOUR', value: '**I\nT\nE\nM\n\nS\nO\nL\nD**',
        //                             };

        //                             finalFields[4] = {
        //                                 name: `Your Coins: `, value: `${uData.coins}c`,
        //                             };

        //                             shopEmbed = {
        //                                 title: "~Bloodstone Shoppe~",
        //                                 color: 0x39acf3,
        //                                 description: "Welcome to the shop! Take a look at the wares.. be quick they wont last forever.",
        //                                 fields: finalFields,
        //                             };

        //                             await embedMsg.edit({ embeds: [shopEmbed], components: [buttonRow] });

        //                             itemsSold++;

        //                             if (itemsSold === 4) {
        //                                 if (data) interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
        //                                 interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
        //                                 await collector.stop();
        //                                 startShop();
        //                             } else {
        //                                 if (data) return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE ${data.amount} ${item.name}`);
        //                                 return interaction.channel.send(`TRANSACTION COMPLETE! YOU NOW HAVE 1 ${item.name}`);
        //                             }
        //                         }
        //                     }

        //                 } else console.log(errorForm('ITEM NOT FOUND!'));//item not found :(
        //             }).catch(error => {
        //                 console.error(errorForm(error));
        //             });
        //         }
        //         if (collInteract.customId === 'refresh') {                   
        //             if (uData.coins < refreshCost) {
        //                 //user does not have enough to refresh the shop
        //                 return interaction.channel.send("It wouldnt be worthwhile to show you more, you lack the coin.. this aint a charity!");
        //             } else {
        //                 //subtract the refresh cost from user coins
        //                 await collInteract.deferUpdate().then(async () => {
        //                     //const cost = uData.coins - refreshCost;
        //                     //await payUp(cost, uData);
        //                     await userPays(refreshCost, uData);
        //                     await checkShop(uData, refreshCost);
        //                     await collector.stop();
        //                     startShop();//run the entire script over again
        //                 }).catch(error => {
        //                     console.error(`Error in shop:`, error);
        //                 });
        //             }                
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
        
        // //=======================================
        // //this method loads the entire shop grabbing each item individually and loading them accordingly
        // async function loadShop() {
        //     /**
        //      *      We need:
        //      *          - To load exactly 4 items
        //      *          - To update or create 4 items
        //      *          - To save and return
        //      * 
        //      * */

        //     const user = await grabU();
        //     const edit = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }] });
        //     const pigmy = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });

        //     let tmpLootPool = [];
        //     let tmpItemSlice;

        //     let foundRar = 0;
        //     let chanceToBeat = 1;
        //     let upgradeChance = Math.random();

        //     let curRun = 1;
        //     do {
        //         tmpLootPool = [];

        //         chanceToBeat = 1;
        //         upgradeChance = Math.random();

        //         foundRar = await grabRar(user.level);

        //         foundRar = isUpgraded(user, pigmy, chanceToBeat, upgradeChance, foundRar);

        //         let breakPoint = 0;
        //         for (const loot of lootList) {
        //             if (loot.Rar_id === foundRar) {
        //                 tmpLootPool.push(loot);
        //                 breakPoint++;
        //             } else {
        //                 breakPoint++;
        //             }
        //             if (breakPoint === lootList.length) break;
        //         }

        //         let lootPos = 0;
        //         if (tmpLootPool.length === 1) {
        //             tmpItemSlice = tmpLootPool[lootPos];
        //         } else {
        //             lootPos = Math.round(Math.random() * (tmpLootPool.length - 1));
        //             tmpItemSlice = tmpLootPool[lootPos];
        //         }

        //         let result = 'Pending';
        //         if (edit) {
        //             result = await makeShopItem(user, tmpItemSlice, curRun, true);
        //         } else result = await makeShopItem(user, tmpItemSlice, curRun, false);

        //         if (result !== 'Success' && result !== 'Pending') {
        //             await interaction.channel.send('Something went wrong while loading the shop! Please try again, if the issue continues leave a bug report using ``/reportbug``');
        //             break;
        //         }
        //         curRun++;
        //     } while (curRun < 5)

        //     function isUpgraded(user, pigmy, chanceToBeat, upgradeChance, curRar) {
        //         if (user.pclass === 'Thief') {
        //             chanceToBeat -= 0.05;
        //         }

        //         console.log(specialInfoForm('chanceToBeat after Thief check: ', chanceToBeat));

        //         if (pigmy) {
        //             if ((Math.floor(pigmy.level / 5) * 0.01) > 0.05) {
        //                 chanceToBeat -= 0.05;
        //             } else {
        //                 chanceToBeat -= (Math.floor(pigmy.level / 5) * 0.01);
        //             }
        //         }
        //         console.log(specialInfoForm('chanceToBeat after Pigmy Level check: ', chanceToBeat));

        //         if (user.level >= 31) {
        //             if ((Math.floor(user.level / 5) * 0.01) > 0.10) {
        //                 chanceToBeat -= 0.10;
        //             } else {
        //                 chanceToBeat -= (Math.floor(user.level / 5) * 0.01);
        //             }
        //         }
        //         console.log(specialInfoForm('chanceToBeat after Player Level check: ', chanceToBeat));

        //         if (curRar < 10) {
        //             if (upgradeChance >= chanceToBeat) {
        //                 curRar++;
        //                 return curRar;
        //             } else {
        //                 return curRar;
        //             }
        //         } else {
        //             return curRar;
        //         }
        //     }
        // }      

        // async function makeShopItem(user, item, shopSlot, isUpdate) {
        //     // Check item slot for assignments
        //     let slotCheck = item.Slot;

        //     // Dynamic value placeholders
        //     let dynHands = 'NONE';
        //     let dynAtk = 0;
        //     let dynDef = 0;
        //     if (slotCheck === 'Mainhand') {
        //         // If item is mainhand only hands and attack are needed
        //         dynHands = item.Hands;
        //         dynAtk = item.Attack;
        //     } else if (slotCheck === 'Offhand') {
        //         // If item is offhand hands is One, both attack and defence are needed
        //         dynHands = 'One';
        //         dynAtk = item.Attack;
        //         dynDef = item.Defence;
        //     } else {
        //         // Else item is armor and only defence is needed
        //         dynDef = item.Defence;
        //     }

        //     // Add new item with values filtered through 
        //     let isDone;
        //     if (isUpdate) {
        //         isDone = await LootShop.update({
        //             name: item.Name,
        //             value: item.Value,
        //             loot_id: item.Loot_id,
        //             rarity: item.Rarity,
        //             rar_id: item.Rar_id,
        //             attack: dynAtk,
        //             defence: dynDef,
        //             type: item.Type,
        //             slot: item.Slot,
        //             hands: dynHands
        //         }, { where: [{ spec_id: user.userid }, { shop_slot: shopSlot }] });
        //     } else {
        //         isDone = await LootShop.create({
        //             name: item.Name,
        //             value: item.Value,
        //             loot_id: item.Loot_id,
        //             spec_id: user.userid,
        //             rarity: item.Rarity,
        //             rar_id: item.Rar_id,
        //             attack: dynAtk,
        //             defence: dynDef,
        //             type: item.Type,
        //             slot: item.Slot,
        //             hands: dynHands,
        //             shop_slot: shopSlot
        //         });
        //     }

        //     if (!isUpdate && isDone) return 'Success';
        //     if (isUpdate && isDone > 0) {
        //         //await isDone.save();
        //         return 'Success';
        //     } 

        //     return 'Item Create Failure: CODE 2';
        // }

        // async function grabU() {
        //     uData = await UserData.findOne({ where: { userid: interaction.user.id } });
        //     return uData;
        // }

        // //This method checks all user values to asign and calculate the current refresh cost as well as checking day reset
        // //Returns value to display for initial load of shop
        // async function checkShop(user, currentRefreshCost, firstLoad) {
        //     let valueToReturn = currentRefreshCost;
        //     //x is based on user level * current refreshes (resets daily) + total shop value  
        //     if (!user.shopresets) {
        //         console.log('IN checkShop()\nSHOP RESETS VALUE NOT FOUND!');
        //         await setTomorrow();
        //     }
        //     const refreshesToday = await checkTomorrow(user);

        //     const firstCost = user.level * refreshesToday;

        //     console.log(`firstCost: ${firstCost}`);

        //     if (!firstLoad || firstLoad === false) {
        //         const newRefresh = (refreshesToday + 1);
        //         await updateRefreshCount(user, newRefresh);

        //         valueToReturn += firstCost;

        //         const item1 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 1 }] });
        //         const item2 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 2 }] });
        //         const item3 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 3 }] });
        //         const item4 = await LootShop.findOne({ where: [{ spec_id: interaction.user.id }, { shop_slot: 4 }] });

        //         const totalShopCost = item1.value + item2.value + item3.value + item4.value;
        //         console.log(`totalShopCost: ${totalShopCost}`);

        //         valueToReturn += totalShopCost;
        //         refreshCost = valueToReturn;
        //     } else {
        //         valueToReturn += firstCost;
        //     } 

        //     return valueToReturn;
        // }


        // //This method sets/resets the day that is tomorrow 
        // async function setTomorrow() {
        //     const today = new Date();
        //     const tomorrow = new Date(today);
        //     tomorrow.setDate(tomorrow.getDate() + 1);
        //     tomorrow.setHours(0, 0, 0, 0);

        //     const newDay = tomorrow.getTime();
        //     console.log('NEW DAY: ', newDay);

        //     const dayChange = await UserData.update({ shopresets: newDay }, { where: { userid: interaction.user.id } });

        //     if (dayChange > 0) {
        //         //Day changed successfully
        //         console.log('DAY WAS UPDATED!');
        //     }
        // }

        // //========================================
        // // This method sets the date of tomorrow with the refrence of today
        // async function checkTomorrow(user) {
        //     const today = new Date();
        //     console.log('TODAY: ', today.getTime());
        //     console.log('SHOP RESETS: ', user.shopresets);

        //     if (!user.shopresets) {
        //         console.log('IN checkTomorrow()\nSHOP RESETS VALUE NOT FOUND!');
        //         await setTomorrow(user);
        //     }

        //     if (user.shopresets <= today.getTime()) {
        //         // Its been a day time to reset play count!
        //         console.log('IS TOMORROW!');
        //         await setTomorrow();
        //         await updateRefreshCount(user, 0);
        //         return 0;
        //     } else {
        //         // Not tomorrow current refreshcount is valid
        //         console.log('IS STILL TODAY!');
        //         return user.refreshcount;
        //     }
        // }

        // //this method changes the current amount of shop refreshes for the user in question
        // async function updateRefreshCount(user, currentRefreshes) {
        //     const userRefresh = await UserData.update({ refreshcount: currentRefreshes }, { where: { userid: user.userid } });
        //     if (userRefresh > 0) {
        //         //user refreshes have been updated
        //     }
        // }

        // async function addItem(item) {
        //     //create new search var to find any Item within the UserItem file pertaining to the User in question
        //     //.findOne() retrevies a single row of data
        //     //where : {} ensures only the row desired is grabbed
        //     const lootStore = await LootStore.findOne({
        //         where: { spec_id: interaction.user.id, loot_id: item.loot_id },
        //     });

        //     //console.log('UserItem: ', lootStore);

        //     //check if an item was found in the previous .findOne()
        //     //this checks if there is an item stored in the UserItems and adds one to the amount as defined in the dbInit script
        //     //then return as a save call on the userItem data
        //     if (lootStore) {
        //         lootStore.amount += 1;
        //         await lootStore.save();
        //         return 'Success';
        //     }

        //     //grab reference to user
        //     const uData = await grabU();
        //     //increase item total
        //     uData.totitem += 1;

        //     await uData.save();

        //     const theItem = item;

        //     //if item is not found create a new one with the values requested
        //     if (theItem.slot === 'Mainhand') {
        //         //Item is a weapon store accordingly
        //         const newItem = await LootStore.create({
        //             name: theItem.name,
        //             value: theItem.value,
        //             loot_id: theItem.loot_id,
        //             spec_id: interaction.user.id,
        //             rarity: theItem.rarity,
        //             rar_id: theItem.rar_id,
        //             attack: theItem.attack,
        //             defence: 0,
        //             type: theItem.type,
        //             slot: theItem.slot,
        //             hands: theItem.hands,
        //             amount: 1
        //         });

        //         const itemAdded = await LootStore.findOne({
        //             where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
        //         });

        //         console.log(itemAdded);

        //         return 'Success';
        //     } else if (theItem.Slot === 'Offhand') {
        //         //Item is an offhand
        //         const newItem = await LootStore.create({
        //             name: theItem.name,
        //             value: theItem.value,
        //             loot_id: theItem.loot_id,
        //             spec_id: interaction.user.id,
        //             rarity: theItem.rarity,
        //             rar_id: theItem.rar_id,
        //             attack: theItem.attack,
        //             defence: theItem.defence,
        //             type: theItem.type,
        //             slot: theItem.slot,
        //             hands: theItem.hands,
        //             amount: 1
        //         });

        //         const itemAdded = await LootStore.findOne({
        //             where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
        //         });

        //         console.log(itemAdded);

        //         return 'Success';
        //     } else {
        //         //Item is armor
        //         const newItem = await LootStore.create({
        //             name: theItem.name,
        //             value: theItem.value,
        //             loot_id: theItem.loot_id,
        //             spec_id: interaction.user.id,
        //             rarity: theItem.rarity,
        //             rar_id: theItem.rar_id,
        //             attack: 0,
        //             defence: theItem.defence,
        //             type: theItem.type,
        //             slot: theItem.slot,
        //             amount: 1
        //         });

        //         const itemAdded = await LootStore.findOne({
        //             where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
        //         });

        //         console.log(itemAdded);

        //         return 'Success';
        //     }
        //     return 'Failure';
        // }

        // async function payUp(cost, uData) {
        //     const editC = await UserData.update({ coins: cost }, { where: { userid: uData.userid } });

        //     if (editC > 0) {
        //         //coins were changed with success!
        //         return console.log('USER COINS HAVE BEEN UPDATED!');
        //     }
        // }

        // async function userPays(cost, user) {
        //     const inc = await user.decrement('coins', { by: cost });
        //     if (inc) return await user.save();
        //     return;
        // }
	},
};
