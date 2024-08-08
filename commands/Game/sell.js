const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const { LootStore, UserData, Loadout, ItemStrings } = require('../../dbObjects.js');

const { createInteractiveChannelMessage, grabUser, sendTimedChannelMessage } = require('../../uniHelperFunctions.js');
const { checkingRar, checkingRarID } = require('../Development/Export/itemStringCore.js');
const { updateUserCoins } = require('../Development/Export/uni_userPayouts.js');
const { checkOutboundItem } = require('../Development/Export/itemMoveContainer.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('sell')
        .setDescription('Sell some old gear!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('some')
                .setDescription('Sell by individual item!')
		        .addStringOption(option =>
			        option.setName('item')
				        .setDescription('Item to sell')
				        .setAutocomplete(true)
				        .setRequired(true))
		        .addIntegerOption(option =>
			        option.setName('amount')
                        .setDescription('Amount to sell')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                .setDescription('Sell all of the chosen item types!')
                .addStringOption(option =>
                    option.setName('rarity')
                        .setDescription('The rarity to be sold')
                        .setAutocomplete(true)
                        .setRequired(true))),
	async autocomplete(interaction) {
		//Focused option is assigned to what the user is inputting as the paramaters for what option to select from
		const focusedOption = interaction.options.getFocused(true);
        
        //const makeCapital = (str) => { return str.charAt(0).toUpperCase() + str.slice(1) };

        let choices = [];

        if (focusedOption.name === 'item') {
            const focusedValue = interaction.options.getFocused(false);

            //const items = await LootStore.findAll({ where: [{ spec_id: interaction.user.id }] });

            const userItems = await ItemStrings.findAll({where: {user_id: interaction.user.id}});

            if (focusedValue) {
                choices = userItems.map(item => item.name);

                //Mapping the complete list of options for discord to handle and present to the user
                const filtered = choices.filter(choice => choice.startsWith(focusedValue));
                await interaction.respond(
                    filtered.map(choice => ({ name: choice, value: choice })),
                );
            }
        }
        

        if (focusedOption.name === 'rarity') {
            const focusedValue = interaction.options.getFocused(false);

            choices = ["common", "uncommon", "rare", "very rare", "epic", "mystic", "?", "??", "???", "????"];

            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
            await interaction.respond(
                filtered.map(choice => ({ name: choice, value: choice })),
            );
        }
	},
    async execute(interaction) {

        await interaction.deferReply();

        const subCom = interaction.options.getSubcommand();

        const finalButts = new ActionRowBuilder();
        const finalEmbed = new EmbedBuilder();
        let someItemRef, loadCheck, allItemList;

        const cancelButt = new ButtonBuilder()
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌')
        .setCustomId('cancel');

        switch(subCom){
            case "some":
                const amount = interaction.options.getInteger('amount') ?? 1;
                const theItem = await ItemStrings.findOne({
                    where: {
                        user_id: interaction.user.id, 
                        name: interaction.options.getString('item')
                    }
                });
                if (!theItem) return interaction.followUp('That item was not found in your inventory!!');
                someItemRef = theItem;
                let sellOne = false, sellAll = false;
                
                loadCheck = await Loadout.findOne({
                    where: {
                        spec_id: interaction.user.id
                    }
                });

                if (loadCheck){
                    const equipped = [loadCheck.headslot, loadCheck.chestslot, loadCheck.legslot, loadCheck.offhand, loadCheck.mainhand];
                    if (equipped.includes(theItem.item_id)) sellAll = true;
                    if (theItem.amount === 1) sellOne = true;
                }

                const sellOneButt = new ButtonBuilder()
                .setLabel("Sell ONE")
                .setStyle(ButtonStyle.Success)
                .setEmoji('⚒')
                .setDisabled(sellOne)
                .setCustomId('sell-one');

                const leaveOneButt = new ButtonBuilder()
                .setLabel("Leave ONE")
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⚒')
                .setCustomId('leave-one');

                const sellAllButt = new ButtonBuilder()
                .setLabel("Sell ALL")
                .setStyle(ButtonStyle.Danger)
                .setEmoji('⚒')
                .setDisabled(sellAll)
                .setCustomId('sell-all');

                finalButts.addComponents(cancelButt, sellOneButt, leaveOneButt, sellAllButt);

                finalEmbed
                .setTitle('== Selling Options ==')
                .setColor(0o0)
                .addFields({
                    name: `${theItem.name}`, value: `You have ${theItem.amount}`
                });

            break;
            case "all":
                const rarPicked = interaction.options.getString('rarity') ?? 'None';
                const rarList = ["common", "uncommon", "rare", "very rare", "epic", "mystic", "?", "??", "???", "????"];
                if (rarPicked.toLowerCase() === 'forgotten') return interaction.followUp('Hmmm nope! You cannot sell these items that easily!! Use ``/sell some`` instead');
                if (!rarList.includes(rarPicked)) return interaction.followUp('That was not a valid Rarity!', rarPicked);

                const pickedRarID = rarList.indexOf(rarPicked);

                const fullItemList = await ItemStrings.findAll({
                    where: {user_id: interaction.user.id}
                });
                loadCheck = await Loadout.findOne({
                    where: {
                        spec_id: interaction.user.id
                    }
                });
                let equipped = (loadCheck) ? [`${loadCheck.headslot}`, `${loadCheck.chestslot}`, `${loadCheck.legslot}`, `${loadCheck.offhand}`, `${loadCheck.mainhand}`] : [];

                const rarItemMatchList = [];
                for (const item of fullItemList){
                    if (checkingRarID(checkingRar(item.item_code)) === pickedRarID){
                        if (equipped.length > 0 && equipped.includes(item.item_id)){
                            rarItemMatchList.push({item: item, sellAmount: item.amount - 1});
                        } else rarItemMatchList.push({item: item, sellAmount: item.amount});
                    }
                }

                if (rarItemMatchList.length === 0) return await interaction.followUp(`You have no ${rarPicked} items!!`);

                const totItemSell = rarItemMatchList.reduce((acc, item) => acc + item.sellAmount, 0);
                const totSellValue = rarItemMatchList.reduce((acc, item) => acc + (item.item.value * item.sellAmount), 0);

                if (totItemSell === 0) return await interaction.followUp(`You have no ${rarPicked} items!!`);

                const acceptButt = new ButtonBuilder()
                .setLabel("Yes")
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅')
                .setCustomId('accept');

                finalButts.addComponents(acceptButt, cancelButt);

                finalEmbed
                .setTitle(`== Sell **ALL** ${rarPicked} ==`)
                .setColor('Blurple')
                .addFields(
                    {name: 'Total Items to sell: ', value: `**${totItemSell}**`},
                    {name: 'Total value from sell: ', value: `**${totSellValue}**c`}
                );

                allItemList = rarItemMatchList;

            break;
        }

        const replyObj = {embeds: [finalEmbed], components: [finalButts]};

        const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 80000, replyObj, "FollowUp");

        collector.on('collect', async c => {
            await c.deferUpdate().then(async () => {
                let finalReply;
                switch(c.customId){
                    case "dismantle-one":
                        finalReply = await handleSell(someItemRef, 1, await grabUser(interaction.user.id));
                    break;
                    case "leave-one":
                        finalReply = await handleSell(someItemRef, someItemRef.amount - 1, await grabUser(interaction.user.id));
                    break;
                    case "dismantle-all":
                        finalReply = await handleSell(someItemRef, someItemRef.amount, await grabUser(interaction.user.id));
                    break;
                    case "accept":
                        finalReply = await handleSellAll(allItemList, await grabUser(interaction.user.id));
                    break;
                    case "cancel":
                    return await collector.stop('Cancel');
                }
                await collector.stop('Finished');
                return await sendTimedChannelMessage(interaction, 45000, {embeds: [finalReply]}, "FollowUp");
            }).catch(e => console.error(e));
        });

        collector.on('end', (c, r) => {
            anchorMsg.delete().catch(error => {
                if (error.code !== 10008) {
                    console.error('Failed to delete the message:', error);
                }
            });
        });

        /**
         * This function handles selling an individual item, 
         * if combCheck is true returns value, if false returns display embed.
         * @param {object} item Item Reference Object
         * @param {number} amount Amount of items sold
         * @param {object} user UserData Instance Object
         * @param {boolean} combCheck Flag for differing return
         * @returns {Promise<(EmbedBuilder|number)>}
         */
        async function handleSell(item, amount, user, combCheck){
            const totalValue = item.value * amount;

            if (!combCheck){
                await updateUserCoins(totalValue, user);
                const payoutEmbed = new EmbedBuilder()
                .setTitle((amount > 1) ? '== Items Sold ==': '== Item Sold ==')
                .setColor('Blurple')
                .addFields({
                    name: 'Coins Gained: ',
                    value: `**${totalValue}**c`
                });

                await checkOutboundItem(user.userid, item.item_id, amount);

                return payoutEmbed;
            }

            await checkOutboundItem(user.userid, item.item_id, amount);

            return totalValue;
        }

        /**
         * This function loops through all items in itemList collecting each total from
         * the return of handleSell(). It then totals the values and returns a display embed.
         * @param {object[]} itemList List of items to be sold
         * @param {object} user UserData Instance Object
         * @returns {Promise<EmbedBuilder>}
         */
        async function handleSellAll(itemList, user){
            const fullValueList = [];
            for (const item of itemList){
                fullValueList.push(await handleSell(item.item, item.sellAmount, user, true));
            }

            const fullItemValue = fullValueList.reduce((acc, v) => acc + v, 0);

            await updateUserCoins(fullItemValue, user);
            const payoutEmbed = new EmbedBuilder()
            .setTitle('== Items Sold ==')
            .setColor('Blurple')
            .addFields({
                name: 'Coins Gained: ',
                value: `**${fullItemValue}**c`
            });

            return payoutEmbed;
        }

        /* 
        if (interaction.options.getSubcommand() === 'some'){
            const itemName = interaction.options.getString('item');
            if (itemName === 'None') return await interaction.reply('That was not a vaild item!');
            const amountSelling = interaction.options.getInteger('amount') ?? 0;

            const theItem = await LootStore.findOne({where: {spec_id: interaction.user.id, name: itemName}});
            if (!theItem) return await interaction.reply('Item not found, you do not own that!');

            const loadoutCheck = await Loadout.findOne({where: {spec_id: interaction.user.id}});
            const hasLoadout = (loadoutCheck) ? true : false;

            const user = await UserData.findOne({where: {userid: interaction.user.id}});
            if (!user) return await interaction.reply('Something went wrong while locating your profile!');

            let confirmEmbed;
            let buttonRow;

            const cancelButton = new ButtonBuilder()
            .setLabel('Cancel')
            .setCustomId('cancel-sell')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌');

            if (amountSelling > 0){
                const itemMatch = (hasLoadout) ? filterLoadout(loadoutCheck, theItem) : false;
                if (itemMatch === true && theItem.amount === amountSelling || theItem.amount < amountSelling) return await interaction.reply('You do not have that many, or you have it equipped!');
                
                const confirmButton = new ButtonBuilder()
                .setLabel('Confirm')
                .setCustomId('confirm-sell')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅');

                buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

                const dynDesc = `Amount to sell: **${amountSelling}**\nAmount Owned: **${theItem.amount}**\nCoins Received: **${(theItem.value * amountSelling)}**c`
                confirmEmbed = new EmbedBuilder()
                .setTitle(`Selling ${theItem.name}`)
                .setDescription(dynDesc)
                .setColor('DarkOrange');
            } else {
                let hideSA = false;
                const itemMatch = (hasLoadout) ? filterLoadout(loadoutCheck, theItem) : false;
                if (itemMatch === true) hideSA = true;

                const sellOneB = new ButtonBuilder()
                .setLabel('Sell One')
                .setCustomId('sell-one')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('1️⃣');

                const leaveOneB = new ButtonBuilder()
                .setLabel('Leave One')
                .setCustomId('leave-one')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('💲');

                const sellAllB = new ButtonBuilder()
                .setLabel('Sell All')
                .setCustomId('sell-all')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('💲')
                .setDisabled(hideSA);

                buttonRow = new ActionRowBuilder().addComponents(sellOneB, leaveOneB, sellAllB, cancelButton);
                
                const dynDesc = `Choose one of the options below! You have ${theItem.amount} ${theItem.name}`;
                confirmEmbed = new EmbedBuilder()
                .setTitle(`Selling ${theItem.name}`)
                .setDescription(dynDesc)
                .setColor('DarkOrange');
            }

            const embedMsg = await interaction.reply({embeds: [confirmEmbed], components: [buttonRow]});

            const filter = (i) => i.user.id === interaction.user.id;

            const collector = embedMsg.createMessageComponentCollector({
                ComponentType: ComponentType.Button,
                filter,
                time: 60000,
            });

            collector.on('collect', async COI => {
                if (COI.customId === 'confirm-sell'){
                    const result = await sellItem(theItem, amountSelling, user);
                    if (result.status !== "Success") return await COI.reply(`Something went wrong, ${result.status}`).then(collector.stop());
                    await interaction.followUp({embeds: [result.embed]}).then(finalMsg => setTimeout(() => {
                        finalMsg.delete();
                    }, 35000)).catch(err => console.error(err));
                    await collector.stop();
                }
                if (COI.customId === 'sell-one'){
                    const result = await sellItem(theItem, 1, user);
                    if (result.status !== "Success") return await COI.reply(`Something went wrong, ${result.status}`).then(collector.stop());
                    await interaction.followUp({embeds: [result.embed]}).then(finalMsg => setTimeout(() => {
                        finalMsg.delete();
                    }, 35000)).catch(err => console.error(err));
                    await collector.stop();
                }
                if (COI.customId === 'leave-one'){
                    const result = await sellItem(theItem, (theItem.amount - 1), user);
                    if (result.status !== "Success") return await COI.reply(`Something went wrong, ${result.status}`).then(collector.stop());
                    await interaction.followUp({embeds: [result.embed]}).then(finalMsg => setTimeout(() => {
                        finalMsg.delete();
                    }, 35000)).catch(err => console.error(err));
                    await collector.stop();
                }
                if (COI.customId === 'sell-all'){
                    const result = await sellItem(theItem, theItem.amount, user);
                    if (result.status !== "Success") return await COI.reply(`Something went wrong, ${result.status}`).then(collector.stop());
                    await interaction.followUp({embeds: [result.embed]}).then(finalMsg => setTimeout(() => {
                        finalMsg.delete();
                    }, 35000)).catch(err => console.error(err));
                    await collector.stop();
                }

                if (COI.customId === 'cancel-sell'){
                    await collector.stop();
                }
            });

            collector.on('end', () => {
                embedMsg.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Failed to delete the message:', error);
                    }
                });
            });
        }

        if (interaction.options.getSubcommand() === 'all'){
            const rarityList = ["common", "uncommon", "rare", "very rare", "epic", "mystic", "?", "??", "???", "????"];
            const rarPicked = rarityList.indexOf(interaction.options.getString('rarity'));
            if (rarPicked === -1) return await interaction.reply('That was not a vaild option!');

            const itemRarMatchList = await LootStore.findAll({where: {spec_id: interaction.user.id, rar_id: rarPicked}});
            if (itemRarMatchList.length === 0) return await interaction.reply('You have no items of that rarity!');

            const loadoutCheck = await Loadout.findOne({where: {spec_id: interaction.user.id}});
            const hasLoadout = (loadoutCheck) ? true : false;

            const user = await UserData.findOne({where: {userid: interaction.user.id}});
            if (!user) return await interaction.reply('Something went wrong while loading your profile!');

            let totalItemsSold = itemRarMatchList.reduce((totalAmount, item) => totalAmount + item.amount, 0);
            let totalValueSold = itemRarMatchList.reduce((totalValue, item) => totalValue + (item.value * item.amount), 0);
            
            const acceptButton = new ButtonBuilder()
            .setLabel("Confirm")
            .setCustomId('confirm-sellall')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅');

            const cancelButton = new ButtonBuilder()
            .setLabel("Cancel")
            .setCustomId('cancel-sellall')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌');

            const buttonRow = new ActionRowBuilder().addComponents(acceptButton, cancelButton);

            const estGainDesc = `Predicted Items Sold: **${totalItemsSold}**\nPredicted Coins Gained: **${totalValueSold}**c`;

            const confirmEmbed = new EmbedBuilder()
            .setTitle(`~Selling ${interaction.options.getString('rarity')} Items~`)
            .setColor('DarkButNotBlack')
            .setDescription(estGainDesc);

            const confirmMsg = await interaction.reply({embeds: [confirmEmbed], components: [buttonRow]});

            const filter = (i) => i.user.id === interaction.user.id;

            const collector = confirmMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 120000,
            });

            collector.on('collect', async COI => {
                if (COI.customId === 'confirm-sellall'){
                    const trackingObj = {
                        amountSold: 0,
                        valueSold: 0,
                        destroyed: 0,
                    };
                    for (const item of itemRarMatchList){
                        if (hasLoadout){
                            const loadoutMatch = filterLoadout(loadoutCheck, item);
                            const result = await sellingItems(item, loadoutMatch, trackingObj);
                            if (result !== "Success") console.log('Item handle Failure', result);
                            continue;
                        } else {
                            const result = await sellingItems(item, false, trackingObj);
                            if (result !== "Success") console.log('Item handle Failure', result);
                            continue;
                        }
                    }
                    console.log(trackingObj);
        
                    totalItemsSold = (totalItemsSold === trackingObj.amountSold) ? totalItemsSold : trackingObj.amountSold;
                    totalValueSold = (totalValueSold === trackingObj.valueSold) ? totalValueSold : trackingObj.valueSold;
        
                    const userUpdated = await handleUser(user, trackingObj);
                    if (userUpdated !== "Finished") await interaction.followUp('Something went wrong while updating user values!');
                    
                    const dynDesc = `Total Items Sold: **${totalItemsSold}**\nTotal Coins Earned: **${totalValueSold}**c\nUnique Items Sold: ${trackingObj.destroyed}`;
                    
                    const finalEmbed = new EmbedBuilder()
                    .setTitle('~Items Sold~')
                    .setColor('DarkGreen')
                    .setDescription(dynDesc);
        
                    await interaction.followUp({embeds: [finalEmbed]}).then(embedMsg => setTimeout(() => {
                        embedMsg.delete();
                    }, 45000)).catch(err => console.error(err));
                    
                    collector.stop();
                }

                if (COI.customId === 'cancel-sellall'){
                    await collector.stop();
                }
            });

            collector.on('end', () => {
                confirmMsg.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Failed to delete the message:', error);
                    }
                });
            });

            
        }
        */

        // /**
        //  * This function handles the removal of items sold by the amount specified,
        //  * uses the given User Instance for coin updates & item count reduction if needed
        //  * @param {object} item DB Instance of Item
        //  * @param {number} amount Item amount to be sold
        //  * @param {object} user DB Instance of User
        //  */
        // async function sellItem(item, amount, user){
        //     const statusReturn = {
        //         status: "",
        //         embed: {
        //             title: "Items Sold",
        //             color: 0o0,
        //             description: "",
        //         }
        //     };
        //     const isDestroyed = ((item.amount - amount) === 0) ? true : false;
        //     const payOut = amount * item.value;

        //     statusReturn.embed.description = `Items Sold: ${amount}\nCoin Gained: ${payOut}`;

        //     if (isDestroyed){
        //         const demo = await item.destroy();
        //         if (demo){
        //             const incCoin = await user.increment('coins', {by: payOut});
        //             const decTot = await user.decrement('totitem');
        //             if (incCoin && decTot) {
        //                 await user.save();
        //                 statusReturn.status = "Success";
        //                 return statusReturn;
        //             } else return {status: "Failure: 1"};
        //         } else return {status: "Failure: 2"};
        //     } else {
        //         const decItem = await item.decrement('amount', {by: amount});
        //         if (decItem){
        //             const incCoin = await user.increment('coins', {by: payOut});
        //             if (incCoin) {
        //                 await user.save();
        //                 statusReturn.status = "Success";
        //                 return statusReturn;
        //             } else return {status: "Failure: 1"};
        //         } else return {status: "Failure: 2"};
        //     }
        // }

        // /**
        //  * This function handles updating/destroying items based on equipped status
        //  * @param {object} item DB Instance of Item
        //  * @param {boolean} isEquip Whether the item is equipped or not
        //  * @param {object} trackingObj Accumulator Object for later calculations
        //  * @returns String as final outcome 
        //  */
        // async function sellingItems(item, isEquip, trackingObj){
        //     const amount = (isEquip) ? item.amount - 1 : item.amount;
        //     const payOut = amount * item.value;

        //     trackingObj.valueSold += payOut;
        //     trackingObj.amountSold += amount;

        //     if (amount !== item.amount){
        //         // Equipped
        //         const decItem = await item.decrement('amount', {by: amount});
        //         if (decItem){
        //             return "Success";
        //         } else return "Failure: 1";
        //     } else {
        //         // Not Equipped
        //         const demo = await item.destroy();
        //         if (demo){
        //             trackingObj.destroyed++;
        //             return "Success";
        //         } else return "Failure: 2";
        //     }
        // }

        // async function handleUser(user, valuesObj){
        //     const incCoin = await user.increment('coins', {by: valuesObj.valueSold});
        //     const decItem = await user.decrement('totitem', {by: valuesObj.destroyed});
        //     if (incCoin && decItem){
        //         await user.save();
        //         return "Finished";
        //     } else return "Failure";
        // }

        // /**
        //  * 
        //  * @param {object} loadout DB Instance of loadout
        //  * @param {object} item DB Instance of Item
        //  * @returns True if equipped, false if not
        //  */
        // function filterLoadout(loadout, item){
        //     let loadoutMatch = false;

        //     switch(item.slot){
        //         case "Mainhand":
        //             loadoutMatch = (loadout.mainhand === item.loot_id) ? true : false;
        //         break;
        //         case "Offhand":
        //             loadoutMatch = (loadout.offhand === item.loot_id) ? true : false;
        //         break;
        //         case "Headslot":
        //             loadoutMatch = (loadout.headslot === item.loot_id) ? true : false;
        //         break;
        //         case "Chestslot":
        //             loadoutMatch = (loadout.chestslot === item.loot_id) ? true : false;
        //         break;
        //         case "Legslot":
        //             loadoutMatch = (loadout.legslot === item.loot_id) ? true : false;
        //         break;
        //     }

        //     return loadoutMatch;
        // }
        
	},

};
