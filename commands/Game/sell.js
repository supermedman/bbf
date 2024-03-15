const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const { LootStore, UserData, Loadout } = require('../../dbObjects.js');
const { findHelmSlot, findChestSlot, findLegSlot, findMainHand, findOffHand } = require('./exported/findLoadout.js');


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
        
        const makeCapital = (str) => { return str.charAt(0).toUpperCase() + str.slice(1) };

        let choices = [];

        if (focusedOption.name === 'item') {
            const focusedValue = interaction.options.getFocused(false);

            const items = await LootStore.findAll({ where: [{ spec_id: interaction.user.id }] });

            if (items.length > 0){
                choices = items.map(item => makeCapital(item.name.toString()));
            } else choices = ["None"];
            
            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
            await interaction.respond(
                filtered.map(choice => ({ name: choice, value: choice })),
            );
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

        /**
         * This function handles the removal of items sold by the amount specified,
         * uses the given User Instance for coin updates & item count reduction if needed
         * @param {object} item DB Instance of Item
         * @param {number} amount Item amount to be sold
         * @param {object} user DB Instance of User
         */
        async function sellItem(item, amount, user){
            const statusReturn = {
                status: "",
                embed: {
                    title: "Items Sold",
                    color: 0o0,
                    description: "",
                }
            };
            const isDestroyed = ((item.amount - amount) === 0) ? true : false;
            const payOut = amount * item.value;

            statusReturn.embed.description = `Items Sold: ${amount}\nCoin Gained: ${payOut}`;

            if (isDestroyed){
                const demo = await item.destroy();
                if (demo){
                    const incCoin = await user.increment('coins', {by: payOut});
                    const decTot = await user.decrement('totitem');
                    if (incCoin && decTot) {
                        await user.save();
                        statusReturn.status = "Success";
                        return statusReturn;
                    } else return {status: "Failure: 1"};
                } else return {status: "Failure: 2"};
            } else {
                const decItem = await item.decrement('amount', {by: amount});
                if (decItem){
                    const incCoin = await user.increment('coins', {by: payOut});
                    if (incCoin) {
                        await user.save();
                        statusReturn.status = "Success";
                        return statusReturn;
                    } else return {status: "Failure: 1"};
                } else return {status: "Failure: 2"};
            }
        }

        /**
         * This function handles updating/destroying items based on equipped status
         * @param {object} item DB Instance of Item
         * @param {boolean} isEquip Whether the item is equipped or not
         * @param {object} trackingObj Accumulator Object for later calculations
         * @returns String as final outcome 
         */
        async function sellingItems(item, isEquip, trackingObj){
            const amount = (isEquip) ? item.amount - 1 : item.amount;
            const payOut = amount * item.value;

            trackingObj.valueSold += payOut;
            trackingObj.amountSold += amount;

            if (amount !== item.amount){
                // Equipped
                const decItem = await item.decrement('amount', {by: amount});
                if (decItem){
                    return "Success";
                } else return "Failure: 1";
            } else {
                // Not Equipped
                const demo = await item.destroy();
                if (demo){
                    trackingObj.destroyed++;
                    return "Success";
                } else return "Failure: 2";
            }
        }

        async function handleUser(user, valuesObj){
            const incCoin = await user.increment('coins', {by: valuesObj.valueSold});
            const decItem = await user.decrement('totitem', {by: valuesObj.destroyed});
            if (incCoin && decItem){
                await user.save();
                return "Finished";
            } else return "Failure";
        }

        /**
         * 
         * @param {object} loadout DB Instance of loadout
         * @param {object} item DB Instance of Item
         * @returns True if equipped, false if not
         */
        function filterLoadout(loadout, item){
            let loadoutMatch = false;

            switch(item.slot){
                case "Mainhand":
                    loadoutMatch = (loadout.mainhand === item.loot_id) ? true : false;
                break;
                case "Offhand":
                    loadoutMatch = (loadout.offhand === item.loot_id) ? true : false;
                break;
                case "Headslot":
                    loadoutMatch = (loadout.headslot === item.loot_id) ? true : false;
                break;
                case "Chestslot":
                    loadoutMatch = (loadout.chestslot === item.loot_id) ? true : false;
                break;
                case "Legslot":
                    loadoutMatch = (loadout.legslot === item.loot_id) ? true : false;
                break;
            }

            return loadoutMatch;
        }
	},

};
