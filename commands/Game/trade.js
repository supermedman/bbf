const { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { errorForm } = require('../../chalkPresets.js');

//const { Op } = require('sequelize');

const { Loadout, MaterialStore, TownMaterial, Town, ItemStrings, LocalMarkets } = require('../../dbObjects.js');

//const { checkOwned } = require('./exported/createGear.js');

//const lootList = require('../../events/Models/json_prefabs/lootList.json');
const { checkingSlot, checkingRar } = require('../Development/Export/itemStringCore.js');
const { grabUser, makeCapital, createInteractiveChannelMessage, handleCatchDelete, sendTimedChannelMessage, handleItemObjCheck, endTimer } = require('../../uniHelperFunctions.js');
const { moveItem, moveMaterial } = require('../Development/Export/itemMoveContainer.js');
const { spendUserCoins, updateUserCoins } = require('../Development/Export/uni_userPayouts.js');

const {
	handleBuyOrderSetup,
    handleSellOrderSetup,
	handleOrderTransfer,
	loadFilteredOrders,
    loadAsButts,
    loadTypeButts,
    loadRarStringMenu,
    loadConfirmButts,
    loadNameStringMenu,
    handleMatNameFilter,
    handleItemNameFilter,
    loadAmountButts,
    loadPriceButts,
    handlePriceButtPicked,
	loadSaleButts,
	loadBasicBackButt,
    handleOrderListDisplay,
    handleOrderInspectButts
} = require('./exported/tradeExtras.js');

module.exports = {
	helptypes: ['Trade', 'Town', 'Material', 'Gear', 'Payup', 'Payout'],
	data: new SlashCommandBuilder()
		.setName('trade')
		.setDescription('Trade weapons, armor, or materials with another player!')
		.addSubcommand(subcommand =>
			subcommand
			.setName('with')
			.setDescription('Trade with a player.')
			.addUserOption(option => option.setName('player').setDescription('The user').setRequired(true))
			.addStringOption(option =>
				option
				.setName('type')
				.setDescription('Which category would you like to trade from?')
				.setRequired(true)
				.addChoices(
					{ name: 'Weapon', value: 'Mainhand' },
					{ name: 'Offhand', value: 'Offhand' },
					{ name: 'Helmet', value: 'Headslot' },
					{ name: 'Chestpiece', value: 'Chestslot' },
					{ name: 'Legwear', value: 'Legslot' },
					{ name: 'Material', value: 'Material' },
				)
			)
			.addStringOption(option =>
				option
				.setName('item')
				.setDescription('Which item would you like to trade?')
				.setRequired(true)
				.setAutocomplete(true)
			)
			.addIntegerOption(option =>
				option
				.setName('amount')
				.setDescription('The amount of items to trade')
			)
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('local-buy')
			.setDescription('Buy locally, within a single server.')
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('local-sell')
			.setDescription('Sell locally, within a single server.')
			.addStringOption(option =>
				option
				.setName('trade-as')
				.setDescription('What inventory would you like to use during this trade?')
				.setRequired(true)
				.addChoices(
					{ name: 'Personal Inventory', value: 'user' },
					{ name: 'Town Inventory', value: 'town' }
				)
			)
			.addStringOption(option =>
				option
				.setName('local-type')
				.setDescription('Which category would you like to trade from?')
				.setRequired(true)
				.setAutocomplete(true)
			)
			.addStringOption(option =>
				option
				.setName('item')
				.setDescription('Which item would you like to trade?')
				.setRequired(true)
				.setAutocomplete(true)
			)
			.addIntegerOption(option =>
				option
				.setName('amount')
				.setDescription('The amount of items to trade')
			)
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('view-local')
			.setDescription('View local trade orders!')
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('global')
			.setDescription('Trade globally, across the entire bb tradehub!')
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('view-global')
			.setDescription('View global trade orders!')
		),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);

		let choices = [];

		// Standard Trade
		if (interaction.options.getSubcommand() === 'with'){
			const focusedValue = interaction.options.getFocused(false);
			const pickedType = interaction.options.getString('type');

			let items;
			switch(pickedType){
				case "Material":
					items = await MaterialStore.findAll({where: {spec_id: interaction.user.id}});
				break;
				default:
					const fullItemList = await ItemStrings.findAll({where: {user_id: interaction.user.id}});
					items = (fullItemList.length > 0) ? fullItemList.filter(item => checkingSlot(item.item_code) === pickedType) : ["No Items"];
				break;
			}

			if (pickedType !== "Material" && items !== "No Items") {
				manageCraftedChoices(items);
			} else {
				if (pickedType === "Material") choices = items.map(item => item.name);
				if (items === 'No Items') choices = ["No Items"];
			}

			if (!choices[0].name){
                // Standard choice list, display normally
                // console.log(basicInfoForm(`Current Choices: ${choices} for ${gearType}s`));
                console.log('Standard Choice List');

                const filtered = choices.filter(choice => choice.startsWith(focusedValue));
				// Handle case with choices over 25 in length
                await interaction.respond(
                    handleLimitOnOptions(filtered).map(choice => ({ name: choice, value: choice })),
                );
            } else {
                // Modded choice list, handle special display
                // console.log(basicInfoForm(`Current Choices: \n${choices.map(obj => `Name: ${obj.name}, Value: ${obj.nValue}, Strongest?: ${obj.strongest} ${(obj.strength) ? `Strength: ${obj.strength}\n`: "\n"}`).join("")}`));
                console.log('Modded Choice List');

                const filtered = choices.filter(choice => choice.nValue.startsWith(focusedValue));
                await interaction.respond(
                    handleLimitOnOptions(filtered).map(choice => (
                        {
                            name: (choice.valuable) ? `${choice.name} == HIGHEST VALUE == ${choice.highValue}`: `${choice.name}`,
                            value: choice.passValue
                        }
                    )),
                );
            }
		}

		// Sell order creation
		if (interaction.options.getSubcommand() === 'local-sell'){
			const focusedValue = interaction.options.getFocused(false);
			const tradeInventory = interaction.options.getString('trade-as');

			if (focusedOption.name === 'local-type'){
				if (tradeInventory === 'town'){
					choices = ["Material"];
				} else choices = ["Mainhand", "Offhand", "Headslot", "Chestslot", "Legslot", "Material"];
			} else if (focusedOption.name === 'item'){
				const pickedType = interaction.options.getString('local-type');
				if (tradeInventory === 'town'){
					const user = await grabUser(interaction.user.id);
					if (user.townid !== '0'){
						const town = await Town.findOne({where: {townid: user.townid}});
						const townPermList = town.can_edit.split(',');
						if (townPermList.includes(user.userid)){
							const townMatList = await TownMaterial.findAll({where: {townid: town.townid}});
							choices = (townMatList.length > 0) ? townMatList.map(mat => mat.name) : ["No Materials"];
						} else choices = ["No Access"];
					} else choices = ["No Town"];
				} else if (tradeInventory === 'user'){
					let items;
					switch(pickedType){
						case "Material":
							items = await MaterialStore.findAll({where: {spec_id: interaction.user.id}});
						break;
						default:
							const fullItemList = await ItemStrings.findAll({where: {user_id: interaction.user.id}});
							items = (fullItemList.length > 0) ? fullItemList.filter(item => checkingSlot(item.item_code) === pickedType) : ["No Items"];
						break;
					}

					if (pickedType !== "Material" && items !== "No Items") {
						manageCraftedChoices(items);
					} else {
						if (pickedType === "Material") choices = items.map(item => item.name);
						if (items === 'No Items') choices = ["No Items"];
					}
				}
			}

			if (!choices[0].name){
                // Standard choice list, display normally
                // console.log(basicInfoForm(`Current Choices: ${choices} for ${gearType}s`));
                console.log('Standard Choice List');

                const filtered = choices.filter(choice => choice.startsWith(focusedValue));
                await interaction.respond(
                    handleLimitOnOptions(filtered).map(choice => ({ name: choice, value: choice })),
                );
            } else {
                // Modded choice list, handle special display
                // console.log(basicInfoForm(`Current Choices: \n${choices.map(obj => `Name: ${obj.name}, Value: ${obj.nValue}, Strongest?: ${obj.strongest} ${(obj.strength) ? `Strength: ${obj.strength}\n`: "\n"}`).join("")}`));
                console.log('Modded Choice List');

                const filtered = choices.filter(choice => choice.nValue.startsWith(focusedValue));
                await interaction.respond(
                    handleLimitOnOptions(filtered).map(choice => (
                        {
                            name: (choice.valuable) ? `${choice.name} == HIGHEST VALUE == ${choice.highValue}`: `${choice.name}`,
                            value: choice.passValue
                        }
                    )),
                );
            }
		}

		/**
		 * This function handles checking the value of items with duped names, 
		 * it modifies the external ``choices`` array to reflect this
		 * @param {object[]} items Array of DB Item Objects
		 * @returns {void}
		 */
		function manageCraftedChoices(items){
			const checkValuable = [], mostValueRef = [], singlesRef = [];
			// ========================
			// Check Valuble Dupe Names
			// ========================
			
			for (const i of items){
				if (!checkValuable.includes(i.name)) checkValuable.push(i.name);
			}

			if (checkValuable.length !== items.length){
				for (const name of checkValuable){
					const singleNameCheck = items.filter(item => item.name === name);
					// If name contains only one entry
					if (singleNameCheck.length === 1){
						// Shorten display for .splice() position
						const updatedOffset = checkValuable.indexOf(singleNameCheck[0].name);
						// Remove from "Dupe" checking array, Add to singles list
						checkValuable.splice(updatedOffset, 1, "");
						singlesRef.push(singleNameCheck[0]);
						// console.log(singlesRef);
						continue;
					}

					const mostValue = singleNameCheck.reduce((acc, item) => {
						return (acc) ? (acc.value > item.value) ? acc : item : item;
					}, {});

					mostValueRef.push({
						item: mostValue.dataValues,
						showValue: true,
						totValue: mostValue.value
					});
				}
			} else choices = items.map(item => item.name);
			

			if (choices.length === 0){
				// Set default choices to non-dupe name items
				let finalItemsList = singlesRef.map(i => ({item: i.dataValues, showValue: false, dupeValue: false}));
				finalItemsList.sort((a, b) => a.item.name - b.item.name);
				// Sorted alphabetically
				checkValuable.sort((a, b) => a - b);
				// Filter out empty names
				const finalValuable = checkValuable.filter(n => n !== '');

				// console.log(finalStrongest);
				// console.log(strongestRef);

				for (const name of finalValuable){
					const valueForName = mostValueRef.filter(refObj => refObj.item.name === name)[0];
					const nameMatches = items.filter(item => item.name === name);
					let curNameList = [];
					for (const i of nameMatches){
						if (i.item_id === valueForName.item.item_id){
							// Strongest Matched, Append to start of array
							curNameList.unshift({item: i, showValue: true, dupeValue: true, totValue: valueForName.totValue});
						} else curNameList.push({item: i, showValue: false, dupeValue: true});
					}
					finalItemsList = finalItemsList.concat(curNameList);
				}

				const displayValuableItems = (ele) => {
					if (ele.showValue) {
						// name used for user indicating strongest, and DMG/DEF tot value
						// nValue used for passing into ``execute()``
						choices.push({name: ele.item.name, nValue: ele.item.name, passValue: `{"name": "${ele.item.name}", "id": "${ele.item.item_id}"}`, valuable: ele.showValue, highValue: ele.totValue});
						// console.log(ele);
					}
					if (!ele.showValue && ele.dupeValue) {
						// name used for user indicating strongest, and DMG/DEF tot value
						// nValue used for passing into ``execute()``
						choices.push({name: ele.item.name, nValue: ele.item.name, passValue: `{"name": "${ele.item.name}", "id": "${ele.item.item_id}"}`, valuable: ele.showValue});
						// console.log('Standard Display: ', ele.item.name);
					}
					if (!ele.showValue && !ele.dupeValue){
						choices.push({name: ele.item.name, nValue: ele.item.name, passValue: ele.item.name, valuable: ele.showValue});
					}
				};

				finalItemsList.forEach(displayValuableItems);
			}

			return;
		}

		/**
		 * This function handles reducing the amount of options to below 26,
		 * this avoids the display limit of over 25.
		 * @param {object[]} options List of options to provide to an autocomplete interaction
		 * @returns {object[]}
		 */
		function handleLimitOnOptions(options){
			let optionsList = [];
			if (options.length > 25){
				console.log('Too many Choices!!');
				optionsList = options.slice(0,25);
			} else optionsList = options;

			return optionsList;
		}
    },
	async execute(interaction) { 
		const { betaTester, materialFiles } = interaction.client;

		if (interaction.options.getSubcommand() === 'with'){
			await interaction.deferReply();

			// User, Type, Item, Amount
			const userTakeObj = interaction.options.getUser('player');
			const userTake = await grabUser(userTakeObj.id);
			if (!userTake) return await interaction.followUp(`${makeCapital(userTakeObj.username)} could not be found! Make sure they have a game profile first!`);
			const userGive = await grabUser(interaction.user.id);

			const moveAmount = interaction.options.getInteger('amount') ?? 1;
			const itemType = interaction.options.getString('type');

			let itemCheck = interaction.options.getString('item');
			let {itemName, checkForID} = handleItemObjCheck(itemCheck);
			if (itemName === "No Items") return await interaction.followUp(`No ${itemType} items found!`);

			let theItem;
			switch(itemType){
				case "Material":
					theItem = await MaterialStore.findOne({where: {spec_id: interaction.user.id, name: itemName}});
				break;
				default:
					const fullItemList = await ItemStrings.findAll({where: {user_id: userGive.userid}});
					// Handle conditional filters
					theItem = (fullItemList.length === 0) 
					? "No Item" : (checkForID) 
					? fullItemList.filter(item => item.name === itemName && item.item_id === checkForID)[0] 
					: fullItemList.filter(item => item.name === itemName)[0] ;

					// Loadout check
					const uLoad = await Loadout.findOne({where: {spec_id: userGive.userid}});
					if (uLoad){
						const matchSlots = ['mainhand', 'offhand', 'headslot', 'chestslot', 'legslot'];
						const loadIDS = [];
						for (const slot of matchSlots){
							loadIDS.push(uLoad[`${slot}`]);
						}
						if (loadIDS.includes(theItem.item_id)){
							if (theItem.amount <= moveAmount) theItem = "Loadout";
						}
					}
				break;
			}
			if (!theItem || theItem === "No Item") return await interaction.followUp(`${itemName} could not be found!!`);
			if (theItem === "Loadout") return await interaction.followUp(`${itemName} is currently equipped, you would trade your last one!`);
			if (moveAmount > theItem.amount) return await interaction.followUp(`You only have ${theItem.amount} ${itemName}, you cannot trade ${moveAmount} of them!`);

			const staticValue = theItem.value * moveAmount;
			let listedValue = staticValue;

			const priceMenuEmbed = new EmbedBuilder()
			.setTitle('== Price Menu ==')
			.setDescription('Please select a price to list your item at.');

			// Load Price Options
			const stringPriceMenu = loadStringPriceMenu(staticValue);

			const replyObj = {embeds: [priceMenuEmbed], components: [stringPriceMenu]};

			const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, "FollowUp", "String");

			collector.on('collect', async c => {
				await c.deferUpdate().then(async () => {
					listedValue = ~~c.values[0];
					collector.stop('Value Picked');
				}).catch(e=>console.error(e));
			});	

			collector.on('end', async (c, r) => {
				if (!r || r === 'time'){
					await handleCatchDelete(anchorMsg);
				}
				
				if (r === 'Value Picked'){
					if (listedValue > userTake.coins){
						await handleCatchDelete(anchorMsg);
						return await interaction.followUp({content: `${makeCapital(userTake.username)} is unable to afford this!!`, ephemeral: true});
					} else handleConfirmTrade(anchorMsg);
				}
			});

			/**
			 * This function handles the confirm process for the user starting the trade.
			 * @param {object} msg Message Reference Object
			 */
			async function handleConfirmTrade(msg){
				const confirmEmbed = new EmbedBuilder()
				.setTitle('== **Trading** ==')
				.setDescription(`Confirm your trade details here!`)
				.addFields(
					{
						name: "Your current offer: ", 
						value: `${moveAmount} ${itemName} for a total of **${listedValue}**c`
					}
				);

				const replyObj = {embeds: [confirmEmbed], components: [loadConfirmButts('give')]};

				await handleCatchDelete(msg);

				const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, "FollowUp");

				collector.on('collect', async c => {
					await c.deferUpdate().then(async () => {
						switch(c.customId){
							case "confirm-give":
								collector.stop('Confirmed');
							break;
							case "cancel-give":
							return collector.stop('Canceled');
						}
					}).catch(e=>console.error(e));
				});

				collector.on('end', async (c, r) => {
					if (!r || r === 'time' || r === 'Canceled'){
						await handleCatchDelete(anchorMsg);
					}

					if (r === "Confirmed"){
						return handleTradeConfirmed(anchorMsg);
					}
				});
			}

			/**
			 * This function handles the confirm process for the user being offered a trade.
			 * @param {object} msg Message Reference Object
			 */
			async function handleTradeConfirmed(msg){
				const mentionContent = `Attention <@${userTake.userid}>, you have been offered a trade deal!`;

				const confirmEmbed = new EmbedBuilder()
				.setTitle('== **Trading** ==')
				.setDescription(`Accept the trade offer?`)
				.addFields(
					{
						name: "You are being offered: ", 
						value: `${moveAmount} ${itemName} for a total of **${listedValue}**c`
					}
				);

				const replyObj = {content: mentionContent, embeds: [confirmEmbed], components: [loadConfirmButts('take')]};

				await handleCatchDelete(msg);

				const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, "FollowUp", "Button", userTake.userid);

				collector.on('collect', async c => {
					await c.deferUpdate().then(async () => {
						switch(c.customId){
							case "confirm-take":
								collector.stop('Confirmed');
							break;
							case "cancel-take":
							return collector.stop('Canceled');
						}
					}).catch(e=>console.error(e));
				});

				collector.on('end', async (c, r) => {
					if (!r || r === 'time' || r === 'Canceled'){
						await handleCatchDelete(anchorMsg);
					}

					if (r === 'Confirmed'){
						// Handle item transfers here
						let itemMoved;
						switch(itemType){
							case "Material":
								itemMoved = moveMaterial(userGive.userid, userTake.userid, theItem, theItem.mattype, moveAmount);
							break;
							default:
								if (theItem.item_id === theItem.unique_gen_id){
									itemMoved = moveItem(userGive.userid, userTake.userid, theItem.item_id, moveAmount, theItem);
								} else itemMoved = moveItem(userGive.userid, userTake.userid, theItem.item_id, moveAmount);
							break;
						}

						// Payout and Payup users
						await spendUserCoins(listedValue, userTake);
						await updateUserCoins(listedValue, userGive);
						
						// ======================
						//   DISPLAY FINAL ITEM
						// ======================
						const finalEmbed = new EmbedBuilder()
						.setTitle('== **Trade Complete** ==')
						.setColor('DarkGold')
						.setDescription('All transfers completed, Items and Coins moved!');

						await handleCatchDelete(anchorMsg);

						console.log(itemMoved.dataValues);

						return await sendTimedChannelMessage(interaction, 60000, finalEmbed);
					}
				});
			}
		}

		if (interaction.options.getSubcommand() === 'local-buy'){
			if (!betaTester.has(interaction.user.id)) return await interaction.reply('This command is under construction, please check back later!');
			//if (interaction.user.id !== '501177494137995264') return await interaction.reply('This command is under construction, please check back later!');
			
			await interaction.deferReply();

			const user = await grabUser(interaction.user.id)

			const tradingAsEmbed = new EmbedBuilder()
			.setTitle('== Trading AS? ==');

			const tradingTypeEmbed = new EmbedBuilder()
			.setTitle('== Item Type? ==');

			const tradingRarityEmbed = new EmbedBuilder()
			.setTitle('== Rarity? ==');

			const tradingNameEmbed = new EmbedBuilder()
			.setTitle('== Item Name? ==');

			// Other Buy Menu Embeds Here
			// ==========================

			const moveAmountEmbed = new EmbedBuilder()
			.setTitle('== Amount to Buy ==')
			.setDescription('Current Amount Selected: 0');

			const askPriceEmbed = new EmbedBuilder()
			.setTitle('== Price to Buy at ==')
			.setDescription('Current Price Selected: 0c');

			const replyObj = {embeds: [tradingAsEmbed], components: [await loadAsButts(user)]};

			const {anchorMsg, collector, sCollector} = await createInteractiveChannelMessage(interaction, 600000, replyObj, "FollowUp", "Both");

			const trackingObj = {
				tradingAs: "",
				tradeEntity: "",
				itemType: "",
				rarity: "",
				itemPointer: "",
				itemRef: "",
				matType: "",
				baseValue: 0,
				amount: 0,
				price: 0
			};

			const priceIDList = [
				"add-one-c", 'add-ten-c', "add-25-c", "add-100-c", "add-1k-c", "add-10k-c", 
				"minus-one-c", 'minus-ten-c', "minus-25-c", "minus-100-c", "minus-1k-c", "minus-10k-c",
				"mult-ten-c", "mult-100-c", "mult-1k-c"
			];

			// STRING SELECT COLLECTOR
			sCollector.on('collect', async c => {
				await c.deferUpdate().then(async () => {
					let editWith;
					if (['rar-picked'].includes(c.customId)){
						trackingObj.rarity = c.values[0];
						editWith = {embeds: [tradingNameEmbed], components: await loadNameStringMenu(trackingObj, materialFiles)};
					} else if (['item-name'].includes(c.customId)){
						const itemObj = JSON.parse(c.values[0]);
						trackingObj.itemPointer = itemObj.name;
						trackingObj.baseValue = itemObj.value;
						if (trackingObj.itemType === 'material'){
							const matFoundObj = handleMatNameFilter(trackingObj.itemPointer, materialFiles);
							trackingObj.itemRef = matFoundObj.matRef;
							trackingObj.matType = matFoundObj.matType;
						} else trackingObj.itemRef = await handleItemNameFilter(trackingObj.itemPointer);
						editWith = {embeds: [moveAmountEmbed], components: loadAmountButts()};
					}
					await anchorMsg.edit(editWith);
				}).catch(e => console.error(e));
			});

			// BUTTON COLLECTOR
			collector.on('collect', async c => {
				await c.deferUpdate().then(async () => {
					// console.log(c);
					let editWith;
					if (['as-town', 'as-user'].includes(c.customId)){
						trackingObj.tradingAs = c.customId.split('-')[1];
						trackingObj.tradeEntity = (trackingObj.tradingAs === 'town') ? await Town.findOne({where: {townid: user.townid}}) : user;

						editWith = {embeds: [tradingTypeEmbed], components: loadTypeButts(trackingObj.tradingAs)};
					} else if (['mainhand', 'offhand', 'headslot', 'chestslot', 'legslot', 'material'].includes(c.customId)){
						trackingObj.itemType = c.customId;
						editWith = {embeds: [tradingRarityEmbed], components: loadRarStringMenu()};
					} else if (['add-five', 'add-one', 'minus-five', 'minus-one'].includes(c.customId)){
						// Handle special counting logic here
						switch(c.customId){
							case "add-five":
								trackingObj.amount += 5;
							break;
							case "add-one":
								trackingObj.amount += 1;
							break;
							case "minus-one":
								trackingObj.amount -= 1;
							break;
							case "minus-five":
								trackingObj.amount -= 5;
							break;
						}
						if (trackingObj.amount < 0) trackingObj.amount = 0;
						moveAmountEmbed.setDescription(`Current Amount Selected: ${trackingObj.amount}`);

						editWith = {embeds: [moveAmountEmbed], components: loadAmountButts()};
					} else if (priceIDList.includes(c.customId) || c.customId === 'reset-price'){
						
						if (c.customId === 'reset-price'){
							trackingObj.price = 0;
						} else if (["mult-ten-c", "mult-100-c", "mult-1k-c"].includes(c.customId)){
							trackingObj.price *= handlePriceButtPicked(c.customId);
						} else {
							trackingObj.price += handlePriceButtPicked(c.customId);
						}

						if (trackingObj.price * trackingObj.amount > trackingObj.tradeEntity.coins) {
							// Value would excced traders coin limit
							trackingObj.price = Math.floor(trackingObj.tradeEntity.coins / trackingObj.amount);
							await c.followUp({content: "You cannot increase the value further as you would lack the funding required!", ephemeral: true});
						}
						if (trackingObj.price < 0) trackingObj.price = 0;
						askPriceEmbed.setDescription(`Base Value of **${trackingObj.itemPointer}**: **${trackingObj.baseValue}**c\nPrice per item: **${trackingObj.price}**c\nCurrent Total Cost: **${trackingObj.price * trackingObj.amount}**c`);

						editWith = {embeds: [askPriceEmbed], components: loadPriceButts()};
					} else if (['confirm-num', 'confirm-price', 'confirm-take'].includes(c.customId)){
						switch(c.customId){
							case "confirm-num":
								if (trackingObj.amount === 0) {
									await c.followUp({content: "You must select to buy at least **1** item!", ephemeral: true});
									editWith = {embeds: [moveAmountEmbed], components: loadAmountButts()};
								} else if (trackingObj.amount > 9999) {
									await c.followUp({content: "You buy more than **9999** items at a time!", ephemeral: true});
									editWith = {embeds: [moveAmountEmbed], components: loadAmountButts()};
							    } else {
									editWith = {embeds: [askPriceEmbed], components: loadPriceButts()};
								}
							break;
							case "confirm-price":
								if (trackingObj.price === 0){
									await c.followUp({content: "You cannot buy items for less than **1**c!", ephemeral: true});
									editWith = {embeds: [askPriceEmbed], components: loadPriceButts()};
								} else {
									const finalConfirmEmbed = new EmbedBuilder()
									.setTitle('== Create Buy Order ==')
									.setDescription(`Confirm the details for this buy order!\nTrading As: ${trackingObj.tradingAs}\nAsking for **${trackingObj.rarity} ${trackingObj.itemType}**: **${trackingObj.itemPointer}**\nAsking Price per item: **${trackingObj.price}**c\nTotal Price for **${trackingObj.amount}**: **${trackingObj.price * trackingObj.amount}**c\n\nYou will pay **${trackingObj.price * trackingObj.amount}**c upfront. Should this order expire you will receive any amount remaining from items not purchased, the same as if you cancel this order.`);
									editWith = {embeds: [finalConfirmEmbed], components: [loadConfirmButts('take')]};
								}
							break;
							case "confirm-take":
								sCollector.stop('Complete');
							return collector.stop('Complete');
						}

					} else if (['back-type', 'back-rar', 'back-num', 'back-price', 'back-name', 'cancel-take'].includes(c.customId)){
						switch(c.customId){
							case "back-type":
								trackingObj.tradingAs = "";
								trackingObj.tradeEntity = "";
								editWith = {embeds: [tradingAsEmbed], components: [await loadAsButts(user)]};
							break;
							case "back-rar":
								trackingObj.itemType = "";
								editWith = {embeds: [tradingTypeEmbed], components: loadTypeButts(trackingObj.tradingAs)};
							break;
							case "back-name":
								trackingObj.rarity = "";
								editWith = {embeds: [tradingRarityEmbed], components: loadRarStringMenu()};
							break;
							case "back-num":
								trackingObj.itemPointer = "";
								trackingObj.itemRef = "";
								trackingObj.baseValue = 0;
								trackingObj.amount = 0;
								moveAmountEmbed.setDescription(`Current Amount Selected: ${trackingObj.amount}`);

								editWith = {embeds: [tradingNameEmbed], components: await loadNameStringMenu(trackingObj, materialFiles)};
							break;
							case "back-price":
								trackingObj.price = 0;

								editWith = {embeds: [moveAmountEmbed], components: loadAmountButts()};
							break;
							case "cancel-take":
								editWith = {embeds: [askPriceEmbed], components: loadPriceButts()};
							break;
						}
					}
					await anchorMsg.edit(editWith);
				}).catch(e => console.error(e));
			});

			sCollector.on('end', async (c, r) => {
				if (!r || r === 'time') await handleCatchDelete(anchorMsg);
			});

			collector.on('end', async (c, r) => {
				if (!r || r === 'time') await handleCatchDelete(anchorMsg);

				if (r === 'Complete'){
					// Handle Buy order create here.
					const buyOrderObject = {
						interRef: interaction,
						perUnitPrice: trackingObj.price,
						orderType: 'Buy',
						targetType: trackingObj.tradingAs,
						targetID: (trackingObj.tradingAs === 'town') ? trackingObj.tradeEntity.townid : trackingObj.tradeEntity.userid,
						target: trackingObj.tradeEntity,
						rarity: trackingObj.rarity,
						itemType: (trackingObj.itemType === 'material') ? trackingObj.matType : "Gear",
						itemID: (trackingObj.itemType === 'material') ? trackingObj.itemRef.Mat_id : trackingObj.itemRef.item_id,
						item: trackingObj.itemRef,
						amount: trackingObj.amount
					};

					await handleCatchDelete(anchorMsg);

					return await sendTimedChannelMessage(interaction, 60000, await handleBuyOrderSetup(buyOrderObject), "FollowUp");
				}
			});
		}

		if (interaction.options.getSubcommand() === 'local-sell'){
			if (!betaTester.has(interaction.user.id)) return await interaction.reply('This command is under construction, please check back later!');

			await interaction.deferReply();

			//const saleType = interaction.options.getString('saletype'); // buy || sell
			const itemType = interaction.options.getString('local-type'); // Mainhand | Offhand | Headslot | Chestslot | Legslot | Material
			const tradeAs = interaction.options.getString('trade-as'); // town || user
			const moveAmount = interaction.options.getInteger('amount') ?? 1;

			const user = await grabUser(interaction.user.id);

			let itemCheck = interaction.options.getString('item');
			let {itemName, checkForID} = handleItemObjCheck(itemCheck);
			// console.log(itemName, checkForID);
			if (itemName === "No Items") return await interaction.followUp(`No ${itemType} items found!`);

			let theTown = 'None';
			if (tradeAs === 'town'){
				if (user.townid === '0') return await interaction.followUp('User has no town!');
				const townRef = await Town.findOne({where: {townid: user.townid}});
				const theMayor = await grabUser(townRef.mayorid);
				const townPermList = townRef.can_edit.split(',');
				if (!townPermList.includes(user.userid)) return interaction.followUp(`Missing Required Access! You do not have permission to manage your towns items. Speak with your mayor ${makeCapital(theMayor.username)} about getting access.`);
				theTown = townRef;
			}

			let theItem;
			switch(itemType){
				case "Material":
					theItem = (tradeAs === 'town') 
					? await TownMaterial.findOne({where: {townid: user.townid, name: itemName}})
					: await MaterialStore.findOne({where: {spec_id: user.userid, name: itemName}});
				break;
				default:
					const fullItemList = await ItemStrings.findAll({where: {user_id: user.userid}});
					// Handle conditional filters
					theItem = (fullItemList.length === 0) 
					? "No Item" : (checkForID) 
					? fullItemList.filter(item => item.name === itemName && item.item_id === checkForID)[0] 
					: fullItemList.filter(item => item.name === itemName)[0];

					// Loadout check
					const uLoad = await Loadout.findOne({where: {spec_id: user.userid}});
					if (uLoad){
						const matchSlots = ['mainhand', 'offhand', 'headslot', 'chestslot', 'legslot'];
						const loadIDS = [];
						for (const slot of matchSlots){
							loadIDS.push(uLoad[`${slot}`]);
						}
						if (loadIDS.includes(theItem.item_id)){
							if (theItem.amount <= moveAmount) theItem = "Loadout";
						}
					}
				break;
			}
			if (!theItem || theItem === "No Item") return await interaction.followUp(`${itemName} could not be found!!`);
			if (theItem === "Loadout") return await interaction.followUp(`${itemName} is currently equipped, you would trade your last one!`);
			if (moveAmount > theItem.amount) return await interaction.followUp(`You only have ${theItem.amount} ${itemName}, you cannot trade ${moveAmount} of them!`);

			const staticValue = theItem.value; // * moveAmount;
			let listedValue = staticValue;

			let dynDesc = '';
			dynDesc = 'The following select menu provides pricing options for the item in question. All values shown represent the cost per item, and not the combined total. ';
			dynDesc += `Currently trading as ${makeCapital(tradeAs)}. `;
			dynDesc += 'Upon an item being sold, the appropriate amount of coins will be transfered to your inventory. ';
			dynDesc += 'Should the order timeout, all items/coins will be returned to the appropriate inventories, and the order will be removed. ';
			dynDesc += 'If the item you are making a sale for already has an order locally, and the price matches yours, then a transaction will automatically be completed.';

			const localTowns = await Town.findAll({where: {guildid: interaction.guild.id}});
			if (localTowns.length === 0) return await interaction.followUp('There are no local towns to trade within!');

			const priceMenuEmbed = new EmbedBuilder()
			.setTitle('== Price Menu ==')
			.setDescription(dynDesc)
			.addFields({
				name: "Local Towns: ",
				value: `${localTowns.map(town => `${makeCapital(town.name)}`).join()}`
			});

			// Load Price Options
			const stringPriceMenu = loadStringPriceMenu(staticValue);

			const replyObj = {embeds: [priceMenuEmbed], components: [stringPriceMenu]};

			const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, "FollowUp", "String");

			collector.on('collect', async c => {
				await c.deferUpdate().then(async () => {
					listedValue = ~~c.values[0];
					collector.stop('Value Picked');
				}).catch(e=>console.error(e));
			});	

			collector.on('end', async (c, r) => {
				if (!r || r === 'time'){
					await handleCatchDelete(anchorMsg);
				}
				
				if (r === 'Value Picked'){
					handleSellOrderConfirm(anchorMsg);
				}
			});

			/**
			 * This function contains the confirm/cancel interface 
			 * for the current sell order being created
			 * @param {object} msg AnchorMsg Reference Object
			 */
			async function handleSellOrderConfirm(msg){
				const confirmEmbed = new EmbedBuilder()
				.setTitle('== **Create Sell Order** ==')
				.setDescription(`Confirm your order details here!`)
				.addFields(
					{
						name: "Your current sell order: ", 
						value: `**${moveAmount} ${itemName}** selling at: **${listedValue}**c per unit.\nTotal estimated sale value: **${listedValue * moveAmount}**c`
					}
				);

				const replyObj = {embeds: [confirmEmbed], components: [loadConfirmButts('give')]};

				await handleCatchDelete(msg);

				const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, "FollowUp");

				collector.on('collect', async c => {
					await c.deferUpdate().then(async () => {
						switch(c.customId){
							case "confirm-give":
								collector.stop('Confirmed');
							break;
							case "cancel-give":
							return collector.stop('Canceled');
						}
					}).catch(e=>console.error(e));
				});

				collector.on('end', async (c, r) => {
					if (!r || r === 'time' || r === 'Canceled'){
						await handleCatchDelete(anchorMsg);
					}

					if (r === "Confirmed"){
						await handleCatchDelete(anchorMsg);

						let craftedItemStore = false;
						if (itemType !== 'Material' && theItem.item_id.length === 36){
							// Item is crafted!
							//console.log('Item is crafted!');
							craftedItemStore = true;
						} //else console.log('Item is not crafted or is a material!');

						const sellOrderObject = {
							interRef: interaction,
							perUnitPrice: listedValue,
							orderType: 'Sell',
							targetType: tradeAs,
							targetID: (tradeAs === 'town') ? theTown.townid : user.userid,
							target: (tradeAs === 'town') ? theTown : user,
							rarity: (itemType === 'Material') ? theItem.rarity : checkingRar(theItem.item_code),
							itemType: (itemType === 'Material') ? theItem.mattype : "Gear",
							itemID: (itemType === 'Material') ? theItem.mat_id : theItem.item_id,
							item: theItem,
							isCrafted: craftedItemStore,
							amount: moveAmount
						};

						//console.log(sellOrderObject.item.item_code);

						// Handle Sell Order Setup
						return await sendTimedChannelMessage(interaction, 60000, await handleSellOrderSetup(sellOrderObject), "FollowUp");
					}
				});
			}
		}

		if (interaction.options.getSubcommand() === 'view-local'){
			if (!betaTester.has(interaction.user.id)) return await interaction.reply('This command is under construction, please check back later!');
			//if (interaction.user.id !== '501177494137995264') return await interaction.reply('This command is under construction, please check back later!');

			const localTowns = await Town.findAll({where: {guildid: interaction.guild.id}});
			if (localTowns.length === 0) return await interaction.reply('There are no local markets here! Use ``/town establish`` to create a new town with open markets!');

			const user = await grabUser(interaction.user.id);

			// View AS Options
			// ===============
			// Town, User
			const viewAsEmbed = new EmbedBuilder()
			.setTitle('== View As? ==');

			// View Order Options
			// ==================
			// Buy, Sell
			const saleTypeEmbed = new EmbedBuilder()
			.setTitle('== Buying or Selling? ==');

			// Item Type Options
			// =================
			// Standard Type Options
			const itemTypeEmbed = new EmbedBuilder()
			.setTitle('== What Type of Item? ==');

			// Rarity Options
			// ==============
			// Standard Rar List
			const rarityEmbed = new EmbedBuilder()
			.setTitle('== What Rarity? ==');

			// Extra Filters
			// =============
			// Auto Filter Sell By Price?
			// Auto Filter Buy by Owned?

			const amountMoveEmbed = new EmbedBuilder()
			.setTitle('== Move Amount ==')
			.setDescription('Current Amount Selected: 0');

			// Final View Menu
			// ===============
			// Nav Menu of Local Market Orders
			const navMenuTempEmbed = new EmbedBuilder()
			.setTitle('Placeholder Menu Embed');

			const replyObj = {embeds: [viewAsEmbed], components: [await loadAsButts(user)]};

			const {anchorMsg, collector, sCollector} = await createInteractiveChannelMessage(interaction, 600000, replyObj, "Reply", "Both");

			const menuTObj = {
				viewAs: "",
				saleType: "",
				itemType: "",
				rarity: "",
				amount: 0,
				itemRef: "",
				userMaxSell: 0
			};

			const orderListObj = {
				sortBy: "",
				curPage: 0,
				lastPage: 0, // orderEmbeds.length - 1
				orderEmbeds: [],
				inspectEmbeds: [],
				menuComponents: [],
				inspectOrders: [],
				inspectComponents: [],
				orderList: [],
				activeOrder: ""
			};

			// ~~~~~~~~~~~~~~~~~~~~~
			// STRING COLLECTOR
			sCollector.on('collect', async c => {
				await c.deferUpdate().then(async () => {
					let editWith;
					switch(c.customId){
						case "rar-picked": // RARITY STRING SELECT
							menuTObj.rarity = c.values[0];
							// console.log(menuTObj);

							const orderListOutcome = await loadFilteredOrders(menuTObj);
							if (orderListOutcome.outcome === "100 Order Limit"){
								await c.followUp({content: "More than 100 orders matched your search. You are seeing this because only the first 100 will be shown.\n\nRefine your search to avoid this!", ephemeral: true});
							}
							orderListObj.lastPage = orderListOutcome.embeds.length - 1;
							orderListObj.orderEmbeds = orderListOutcome.embeds;
							orderListObj.orderList = orderListOutcome.orderMatch;
							if (menuTObj.itemType !== 'material'){
								orderListObj.inspectEmbeds = orderListOutcome.iDetails;
							}
							orderListObj.inspectOrders = orderListOutcome.oDetails;
							orderListObj.inspectComponents = handleOrderInspectButts(menuTObj.saleType);
							orderListObj.menuComponents = handleOrderListDisplay(orderListOutcome);
							
							editWith = {embeds: [orderListObj.orderEmbeds[0]], components: orderListObj.menuComponents};
						break;
						case "filter-orders": // FILTER ORDERS STRING SELECT
							orderListObj.sortBy = c.values[0];

							editWith = {embeds: [navMenuTempEmbed], components: [loadBasicBackButt('nav')]};
						break;
					}
					await anchorMsg.edit(editWith);
				}).catch(e => console.error(e));
			});
			// ~~~~~~~~~~~~~~~~~~~~~

			// =====================
			// BUTTON COLLECTOR
			collector.on('collect', async c => {
				await c.deferUpdate().then(async () => {
					// TIMER START
					const buttHandleStart = new Date().getTime();
					
					let editWith;
					if (['back-sale', 'back-type', 'back-rar', 'back-nav', 'back-flip', 'back-num', 'cancel-take'].includes(c.customId)){ // BACK BUTTONS
						switch(c.customId){
							case "back-sale":
								menuTObj.viewAs = "";

								editWith = {embeds: [viewAsEmbed], components: [await loadAsButts(user)]};
							break;
							case "back-type":
								menuTObj.saleType = "";

								editWith = {embeds: [saleTypeEmbed], components: [loadSaleButts()]};
							break;
							case "back-rar":
								menuTObj.itemType = "";

								editWith = {embeds: [itemTypeEmbed], components: loadTypeButts(menuTObj.viewAs)};
							break;
							case "back-nav":
								menuTObj.rarity = "";

								orderListObj.sortBy = "";
								orderListObj.curPage = 0;
								orderListObj.lastPage = 0;
								orderListObj.orderEmbeds = [];
								orderListObj.inspectEmbeds =  [];
								orderListObj.inspectOrders = [];
								orderListObj.menuComponents = [];
								orderListObj.inspectComponents = [];

								editWith = {embeds: [rarityEmbed], components: loadRarStringMenu()};
							break;
							case "back-flip":
								orderListObj.activeOrder = "";

								editWith = {embeds: [orderListObj.orderEmbeds[orderListObj.curPage]], components: orderListObj.menuComponents};
							break;
							case "back-num":
								menuTObj.amount = 0;
								amountMoveEmbed.setDescription(`Current Amount Selected: 0`);
								editWith = {embeds: [orderListObj.inspectOrders[orderListObj.curPage]], components: orderListObj.inspectComponents};
							break;
							case "cancel-take":
								editWith = {embeds: [amountMoveEmbed], components: loadAmountButts()};
							break;
						}
					} else if (['as-town', 'as-user'].includes(c.customId)){ // VIEW AS BUTTONS
						menuTObj.viewAs = c.customId.split('-')[1];
						
						editWith = {embeds: [saleTypeEmbed], components: [loadSaleButts()]};
					} else if (['view-buy', 'view-sell'].includes(c.customId)){ // SALE TYPE BUTTONS
						menuTObj.saleType = c.customId.split('-')[1];

						editWith = {embeds: [itemTypeEmbed], components: loadTypeButts(menuTObj.viewAs)};
					} else if (['mainhand', 'offhand', 'headslot', 'chestslot', 'legslot', 'material'].includes(c.customId)){ // ITEM TYPE BUTTONS
						menuTObj.itemType = c.customId;

						editWith = {embeds: [rarityEmbed], components: loadRarStringMenu()};
					} else if (['back-page', 'next-page'].includes(c.customId)){ // PAGE NAV BUTTONS
						switch(c.customId){
							case "next-page":
								orderListObj.curPage = (orderListObj.curPage === orderListObj.lastPage) ? 0 : orderListObj.curPage + 1;
							break;
							case "back-page":
								orderListObj.curPage = (orderListObj.curPage === 0) ? orderListObj.lastPage : orderListObj.curPage - 1;
							break;
						}

						editWith = {embeds: [orderListObj.orderEmbeds[orderListObj.curPage]], components: orderListObj.menuComponents}; // [/*NAV BUTTONS, INTERFACE BUTTONS, BACK BUTTON*/]
					} else if (['item-inspect', 'order-inspect'].includes(c.customId)){ // ORDER INTERACTION BUTTONS
						switch(c.customId){
							case "item-inspect":
								// Show current item advanced details in hidden message
								editWith = {embeds: [orderListObj.orderEmbeds[orderListObj.curPage]], components: orderListObj.menuComponents};
								await interaction.followUp({embeds: [orderListObj.inspectEmbeds[orderListObj.curPage]], ephemeral: true});
							break;
							case "order-inspect":
								// Show current order details in regards to user viewing.
								orderListObj.activeOrder = orderListObj.orderList[orderListObj.curPage];

								editWith = {embeds: [orderListObj.inspectOrders[orderListObj.curPage]], components: orderListObj.inspectComponents};
							break;
						}
					} else if (['sell-menu', 'buy-menu'].includes(c.customId)){ // MOVE TO BUY/SELL AMOUNT BUTTONS
						if (c.customId === 'sell-menu'){
							// Set max on owned item match
							if (menuTObj.itemType === 'material'){
								const matMatch = await MaterialStore.findOne({where: {spec_id: user.userid, mattype: orderListObj.activeOrder.item_type, mat_id: orderListObj.activeOrder.item_id}});
								if (!matMatch) {
									menuTObj.userMaxSell = 0;
								} else {
									menuTObj.userMaxSell = matMatch.amount;
									menuTObj.itemRef = matMatch;
								}
							} else {
								const itemMatch = await ItemStrings.findOne({where: {user_id: user.userid, item_id: orderListObj.activeOrder.item_id}});
								if (!itemMatch){
									menuTObj.userMaxSell = 0;
								} else {
									menuTObj.userMaxSell = itemMatch.amount;
									menuTObj.itemRef = itemMatch;
								}
							}

							if (menuTObj.userMaxSell === 0){
								await c.followUp({content: "You do not have any of these items, therefore cannot sell to this Buy order!", ephemeral: true});
							} else editWith = {embeds: [amountMoveEmbed], components: loadAmountButts()};
						} else {
							if (menuTObj.itemType === 'material'){
								const matMatch = await MaterialStore.findOne({where: {spec_id: user.userid, mattype: orderListObj.activeOrder.item_type, mat_id: orderListObj.activeOrder.item_id}});
								if (matMatch) menuTObj.itemRef = matMatch;
							} else {
								// IF NOT A CRAFTED ITEM FOR SALE
								if (orderListObj.activeOrder.item_id.length !== 36){
									const itemMatch = await ItemStrings.findOne({where: {user_id: user.userid, item_id: orderListObj.activeOrder.item_id}});
									if (itemMatch) menuTObj.itemRef = itemMatch;
								} else {
									// CRAFTED ITEM FOR SALE
									const orderTmp = orderListObj.activeOrder;
									menuTObj.itemRef = {
										name: orderTmp.item_name,
										value: orderTmp.listed_value,
										item_code: orderTmp.item_code,
										caste_id: orderTmp.item_caste,
										unique_gen_id: orderTmp.item_id
									};
								}
							}
							editWith = {embeds: [amountMoveEmbed], components: loadAmountButts()};
						}
					} else if (['add-five', 'add-one', 'minus-five', 'minus-one'].includes(c.customId)){ // AMOUNT MATH BUTTONS
						// Handle special counting logic here
						switch(c.customId){
							case "add-five":
								menuTObj.amount += 5;
							break;
							case "add-one":
								menuTObj.amount += 1;
							break;
							case "minus-one":
								menuTObj.amount -= 1;
							break;
							case "minus-five":
								menuTObj.amount -= 5;
							break;
						}
						if (menuTObj.amount < 0) menuTObj.amount = 0;
						if (menuTObj.amount > orderListObj.activeOrder.amount_left) {
							menuTObj.amount = orderListObj.activeOrder.amount_left;
							await c.followUp({content: "You cannot exceed the amount limit for the active order!", ephemeral: true});
						}
						if (menuTObj.saleType === 'buy' && menuTObj.userMaxSell < menuTObj.amount){
							menuTObj.amount = menuTObj.userMaxSell;
							await c.followUp({content: "You cannot sell more items than you own!!", ephemeral: true});
						}
						amountMoveEmbed.setDescription(`Price Per Item: ${orderListObj.activeOrder.listed_value}c\nItem Amount Remaining: ${orderListObj.activeOrder.amount_left}\nCurrent Amount Selected: ${menuTObj.amount}\nTotal Price: ${orderListObj.activeOrder.listed_value * menuTObj.amount}c`);

						editWith = {embeds: [amountMoveEmbed], components: loadAmountButts()};
					} else if (['confirm-num', 'confirm-take'].includes(c.customId)){ // CONFIRMATION BUTTONS
						switch(c.customId){
							case "confirm-num":
								// handle Checkout menu
								const inverseSaleType = (menuTObj.saleType === 'buy') ? "Sell" : "Buy"; 
								const checkoutEmbed = new EmbedBuilder()
								.setTitle('== Checkout ==')
								.setDescription(`${inverseSaleType} ${menuTObj.amount} ${orderListObj.activeOrder.item_name} @ ${orderListObj.activeOrder.listed_value}c per item for a total of ${orderListObj.activeOrder.listed_value * menuTObj.amount}c?`);
								editWith = {embeds: [checkoutEmbed], components: [loadConfirmButts('take')]};
							break;
							case "confirm-take":
								// Handle Order Payouts here!
								const townRef = await Town.findOne({where: {townid: user.townid}});
								const targetObj = {
									id: (menuTObj.viewAs === 'town') ? townRef.townid : user.userid,
									type: menuTObj.viewAs,
									entity: (menuTObj.viewAs === 'town') ? townRef : user,
									itemRef: menuTObj.itemRef
								};
								const completeEmbed = await handleOrderTransfer(orderListObj.activeOrder, targetObj, menuTObj.amount);

								editWith = {embeds: [completeEmbed], components: []};
							break;
						}
					}

					await anchorMsg.edit(editWith);
					// TIMER END
					endTimer(buttHandleStart, "Full Button Menu Handle");
				}).catch(e => console.error(e));
			});
			// =====================

			// ~~~~~~~~~~~~~~~~~~~~~
			// STRING COLLECTOR
			sCollector.on('end', async (c, r) => {
				if (!r || r === 'time') await handleCatchDelete(anchorMsg);
			});
			// ~~~~~~~~~~~~~~~~~~~~~

			// =====================
			// BUTTON COLLECTOR
			collector.on('end', async (c, r) => {
				if (!r || r === 'time') await handleCatchDelete(anchorMsg);
			});
			// =====================
		}

		if (interaction.options.getSubcommand() === 'view-global'){
			if (!betaTester.has(interaction.user.id)) return await interaction.reply('This command is under construction, please check back later!');
			if (interaction.user.id !== '501177494137995264') return await interaction.reply('This command is under construction, please check back later!');
		}

		/**
		 * This function generates the available price ranges as a string select menu,
		 * ID: ``price-range``
		 * @param {number} staticValue Default Item Value
		 * @returns {ActionRowBuilder<StringSelectMenuBuilder>}
		 */
		function loadStringPriceMenu(staticValue){
			const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('price-range')
			.setPlaceholder('Select a value for your item');
			const optionModObjList = [
				{label: "25% Above", mod: 0.25},
				{label: "10% Above", mod: 0.10},
				{label: "Base Value", mod: 0},
				{label: "10% Below", mod: -0.10},
				{label: "25% Below", mod: -0.25}
			];
			const stringOptions = [];
			for (const obj of optionModObjList){
				const option = new StringSelectMenuOptionBuilder()
				.setLabel(obj.label)
				.setDescription(`Listed Value: ${Math.floor(staticValue + (staticValue * obj.mod))}`)
				.setValue(`${Math.floor(staticValue + (staticValue * obj.mod))}`);
				stringOptions.push(option);
			}	

			selectMenu.addOptions(stringOptions);

			const stringActionRow = new ActionRowBuilder().addComponents(selectMenu);

			return stringActionRow;
		}

		// if (interaction.options.getSubcommand() === 'local') {
		// 	if (!betaTester.has(interaction.user.id)) return await interaction.reply('This command is under construction, please check back later!');

		// 	const startTime = new Date().getTime();
		// 	await interaction.deferReply().then(async () => {
		// 		const tradeType = interaction.options.getString('local-type') ?? 'NONE'; // Weapon, Offhand, Armor, Material
		// 		const tradeAs = interaction.options.getString('trade-as') ?? 'NONE'; // town, user
		// 		const saleType = interaction.options.getString('saletype') ?? 'NONE'; // buy, sell
		// 		const amount = interaction.options.getInteger('amount') ?? 1;

		// 		const itemName = interaction.options.getString('item') ?? 'NONE';

		// 		if (itemName === 'NONE') return await interaction.followUp('No item provided!');

		// 		const user = await UserData.findOne({ where: { userid: interaction.user.id } });
		// 		if (!user) return await interaction.followUp('No user found!');

		// 		let theTown = 'None';
		// 		let exists = false;
		// 		if (tradeAs === 'town' && user.townid !== '0') theTown = await Town.findOne({ where: { townid: user.townid } });
		// 		if (theTown !== 'None') {
		// 			const currentEditList = theTown.can_edit.split(',');
		// 			for (const id of currentEditList) {
		// 				if (user.userid === id) {
		// 					exists = true;
		// 					break;
		// 				}
		// 			}
		// 		}
		// 		if (tradeAs === 'town') {
		// 			if (theTown === 'None') return await interaction.followUp('Your town was not located!!');
		// 			if (exists === false) return await interaction.followUp('You do not have permission to access your towns items!');
        //         }

		// 		let item = '';
		// 		if (tradeType === 'Material') {
		// 			if (tradeAs === 'user') {
		// 				item = await MaterialStore.findOne({ where: [{ spec_id: user.userid }, { name: itemName }] });
		// 			} else if (tradeAs === 'town') {
		// 				item = await TownMaterial.findOne({ where: [{ townid: user.townid }, { name: itemName }] });
        //             }
		// 		} else {
		// 			if (tradeAs === 'town') return await interaction.followUp('Trade Type was invalid, current valid options are ``Material`` for ``local-type``');
		// 			item = await LootStore.findOne({ where: [{ spec_id: user.userid }, { name: itemName }] });
		// 			const userLoadout = await Loadout.findOne({ where: { spec_id: user.userid } });
		// 			if (userLoadout && item !== '' && saleType === 'sell') {
		// 				let id1 = userLoadout.headslot,
		// 				id2 = userLoadout.chestslot,
		// 				id3 = userLoadout.legslot,
		// 				id4 = userLoadout.mainhand,
		// 				id5 = userLoadout.offhand;
		// 				if (item.loot_id === id1 || item.loot_id === id2 || item.loot_id === id3 || item.loot_id === id4 || item.loot_id === id5) {
		// 					//Item trading is equipped
		// 					if (item.amount === amount) return interaction.followUp(`You cannot sell that many ${item.name}, you currently have it equipped!`);
		// 				}
        //             }
        //         }

		// 		if (item === '') return await interaction.followUp('Item not found!');
		// 		if (saleType === 'sell' && item.amount < amount) return interaction.followUp(`You cannot sell that many ${item.name}, you only have ${item.amount}!`);


		// 		console.log(` tradeType: ${tradeType}\n tradeAs: ${tradeAs}\n saleType: ${saleType}\n amount: ${amount}\n itemName: ${itemName}\n\n Item Found:`);
		// 		console.log(item.dataValues);

		// 		const actualValue = item.value;
		// 		let listedValue = actualValue;

		// 		const above25 = actualValue + Math.floor(actualValue * 0.25);
		// 		const above10 = actualValue + Math.floor(actualValue * 0.10);

		// 		const below10 = actualValue - Math.floor(actualValue * 0.10);
		// 		const below25 = actualValue - Math.floor(actualValue * 0.25);

		// 		let embedColour = 'DarkButNotQuiteBlack';
		// 		if (saleType === 'buy') embedColour = 'Green';
		// 		if (saleType === 'sell') embedColour = 'DarkRed';

		// 		let dynDesc = '';
		// 		dynDesc = 'The following select menu provides pricing options for the item in question. All values shown represent the cost per item, and not the combined total. ';
		// 		dynDesc += `Currently trading as ${tradeAs}. `;

		// 		if (saleType === 'buy') dynDesc += 'Upon a requested item being bought, items will automatically be transfered to your inventory. ';
		// 		if (saleType === 'sell') dynDesc += 'Upon an item being sold, the appropriate amount of coins will be transfered to your inventory. ';

		// 		dynDesc += 'Should the order timeout, all items/coins will be returned to the appropriate inventories, and the order will be removed.';

		// 		dynDesc += 'If the item you are making a sale for already has an order locally, and the price matches yours, then a transaction will automatically be completed.';

		// 		let fieldName = '';
		// 		let fieldValue = '';
		// 		let fieldObj = {};
		// 		let finalFields = [];

		// 		fieldName = `Item to be listed: ${item.name}`;

		// 		// THIS NEEDS REVISION, CATCH CASE NO TOWNS BUT NOT TOWN TYPE TRADEAS
		// 		//============================================
		// 		/*if (theTown === 'None') theTown = await Town.findOne({ where: { townid: user.townid } });*/
		// 		const localTowns = await Town.findAll({ where: { guildid: interaction.guild.id } });
		// 		let twoTowns = false;
		// 		if (localTowns.length === 2) twoTowns = true;

		// 		if (twoTowns) {
		// 			fieldValue = `Local Towns: **${localTowns[0].name}**, **${localTowns[1].name}**`;
		// 		} else fieldValue = `Local Towns: **${localTowns[0].name}**`
		// 		//============================================

		// 		fieldObj = { name: fieldName, value: fieldValue };
		// 		finalFields.push(fieldObj);

		// 		const priceSelectEmbed = new EmbedBuilder()
		// 			.setTitle(`Creating ${saleType} Order`)
		// 			.setColor(embedColour)
		// 			.setDescription(dynDesc)
		// 			.addFields(finalFields);

		// 		const askPriceSelect = new StringSelectMenuBuilder()
		// 			.setCustomId('pricemark-perunit')
		// 			.setPlaceholder('Choose an option! Value shown is price of one!')
		// 			.addOptions(
		// 				new StringSelectMenuOptionBuilder()
		// 					.setLabel('25% Above')
		// 					.setDescription(`Listed Value: ${above25}`)
		// 					.setValue(`${above25}`),
		// 				new StringSelectMenuOptionBuilder()
		// 					.setLabel('10% Above')
		// 					.setDescription(`Listed Value: ${above10}`)
		// 					.setValue(`${above10}`),
		// 				new StringSelectMenuOptionBuilder()
		// 					.setLabel('Item Value')
		// 					.setDescription(`Listed Value: ${actualValue}`)
		// 					.setValue(`${actualValue}`),
		// 				new StringSelectMenuOptionBuilder()
		// 					.setLabel('10% Below')
		// 					.setDescription(`Listed Value: ${below10}`)
		// 					.setValue(`${below10}`),
		// 				new StringSelectMenuOptionBuilder()
		// 					.setLabel('25% Below')
		// 					.setDescription(`Listed Value: ${below25}`)
		// 					.setValue(`${below25}`),
		// 			);

		// 		const selectRow = new ActionRowBuilder()
		// 			.addComponents(askPriceSelect);

		// 		const selectMenu = await interaction.followUp({
		// 			embeds: [priceSelectEmbed],
		// 			components: [selectRow],
		// 		});

		// 		const filter = (i) => i.user.id === interaction.user.id;

		// 		const selectCollector = selectMenu.createMessageComponentCollector({
		// 			componentType: ComponentType.StringSelect,
		// 			filter,
		// 			time: 120000
		// 		});

		// 		let sentFollowUp = 'No reply yet.';
		// 		selectCollector.on('collect', async iCS => {
		// 			listedValue = iCS.values[0];
		// 			sentFollowUp = 'Value found!';
		// 			await iCS.deferUpdate();
		// 			await selectCollector.stop();
		// 		});

		// 		selectCollector.once('end', async () => {
		// 			if (sentFollowUp === 'No reply yet.') {
		// 				return selectMenu.delete().catch(error => {
		// 					if (error.code !== 10008) {
		// 						console.error('Failed to delete the message:', error);
		// 					}
		// 				});
		// 			}

		// 			selectMenu.delete().catch(error => {
		// 				if (error.code !== 10008) {
		// 					console.error('Failed to delete the message:', error);
		// 				}
		// 			});

		// 			let target, targetID;
		// 			if (tradeAs === 'town') target = theTown, targetID = theTown.townid;
		// 			if (tradeAs === 'user') target = user, targetID = user.userid;

		// 			// Check total coin balance to see if buy order can be completed!
		// 			if (saleType === 'buy') {
		// 				const totalCoins = target.coins;
		// 				const totalCost = listedValue * amount;
		// 				if (totalCoins < totalCost) return await interaction.followUp(`You do not have enough coin to create that buy order!\nTotal Cost: ${totalCost}\nYour Coins: ${totalCoins}`);
        //             }

		// 			let tradeCheck, itemID;
		// 			if (tradeType !== 'Material') tradeCheck = 'Gear', itemID = item.loot_id;
		// 			if (tradeType === 'Material') tradeCheck = item.mattype, itemID = item.mat_id;

		// 			/** Condensed Object containing all needed variables to create new sale order */
		// 			const infoObject = {
		// 				value: listedValue,
		// 				sale: saleType,
		// 				targetType: tradeAs,
		// 				targetID,
		// 				target,
		// 				itemType: tradeCheck,
		// 				itemID,
		// 				item,
		// 				amount,
		// 			};
		// 			const theOrder = await createNewOrder(infoObject);
		// 			if (theOrder instanceof String) return await interaction.followUp('Something went wrong while creating that order!');
		// 			if (!theOrder) return await interaction.followUp('Something went wrong while locating your order!');

		// 			let setupResult = '';
		// 			if (saleType === 'buy') setupResult = await handleBuyOrder(infoObject);
		// 			if (saleType === 'sell') setupResult = await handleSellOrder(infoObject);
		// 			if (setupResult === '') return await interaction.followUp('Something went wrong while setting up that order!');


		// 			const orderMatchObj = {
		// 				itemsMoved: 0,
		// 				coinINC: 0,
		// 			};

		// 			let orderMatchCheck = '';
		// 			if (saleType === 'buy') orderMatchCheck = await handleBuyReadyCheck(infoObject, theOrder, orderMatchObj);
		// 			if (saleType === 'sell') orderMatchCheck = await handleSellReadyCheck(infoObject, theOrder, orderMatchObj);
		// 			if (orderMatchCheck === 'None') console.log('No order matches found!');
		// 			if (orderMatchCheck !== 'None') console.log(orderMatchCheck);


		// 			const now = new Date().getTime();

		// 			const diffTime = Math.abs(now - theOrder.expires_at);
		// 			const timeLeft = Math.round(now + diffTime);
		// 			let shownTime = Math.round(timeLeft / 1000);

		// 			const endTime = new Date().getTime();
		// 			console.log(`Diff between start: ${startTime}/${endTime} :End..\n   ${(startTime - endTime)}`);

		// 			if (orderMatchCheck === 'Exact' || orderMatchCheck === 'Filled') {
		// 				// Destroy Order, and display item/coin transfers
		// 				let embedDesc = ``;
		// 				if (saleType === 'buy') embedDesc = `Items Transfered: ${orderMatchObj.itemsMoved}\n`;
		// 				if (saleType === 'sell') embedDesc = `Items Transfered: ${orderMatchObj.itemsMoved}\nCoins Gained: ${orderMatchObj.coinINC}c`;

		// 				if (orderMatchObj.coinINC > 0 && saleType === 'buy') embedDesc += `Coins Refunded: ${orderMatchObj.coinINC}c`;

		// 				const destOrder = await handleOrderRemoval(theOrder);
		// 				if (destOrder !== 1) return await interaction.followUp('Something went wrong while removing a completed order!');

		// 				const filledEmbed = new EmbedBuilder()
		// 					.setTitle(`${saleType} Order Filled!`)
		// 					.setColor('DarkGreen')
		// 					.setDescription(embedDesc);

		// 				return await interaction.followUp({ embeds: [filledEmbed] });
		// 			} else if (orderMatchCheck === 'Partial') {
		// 				let embedDesc = ``;
		// 				if (saleType === 'buy') embedDesc = `Items Transfered: ${orderMatchObj.itemsMoved}\nItems Remaining: ${theOrder.amount_left - orderMatchObj.itemsMoved}`;
		// 				if (saleType === 'sell') embedDesc = `Items Transfered: ${orderMatchObj.itemsMoved}\nItems Remaining: ${theOrder.amount_left - orderMatchObj.itemsMoved}\nCoins Gained: ${orderMatchObj.coinINC}c`;


		// 				const filledEmbed = new EmbedBuilder()
		// 					.setTitle(`${saleType} Order Partially Filled!`)
		// 					.setColor('DarkGreen')
		// 					.setDescription(embedDesc);

		// 				return await interaction.followUp({ embeds: [filledEmbed] });

		// 			} else return await interaction.followUp(`${saleType} order created! This order will expire <t:${shownTime}:R>`);
		// 		});



		// 		/** This function creates and then updates a sale order,
		// 		 *		returns resolved or rejected outcomes to be used for user feedback
		// 		 * 
		// 		 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
		// 		 */
		// 		async function createNewOrder(infoObject) {
		// 			const newOrder = await LocalMarkets.create({
		// 				guildid: interaction.guild.id,
		// 				target_type: infoObject.targetType,
		// 				target_id: infoObject.targetID,
		// 				sale_type: infoObject.sale,
		// 				item_type: infoObject.itemType,
		// 				item_id: infoObject.itemID,
		// 				listed_value: infoObject.value,
		// 				amount_left: infoObject.amount,
		// 			});

		// 			if (newOrder) {
		// 				const expireChangeResult = await updateExpireTime(newOrder);
		// 				if (expireChangeResult === 'Date Update') {
		// 					await newOrder.save();
		// 					return newOrder;
		// 				} else return expireChangeResult;
		// 			} else return 'Failure: 0.1';
        //         }


		// 		/** This function gets and sets the date of expiration for the sale order created.
		// 		 * 
		// 		 * @param {any} saleOrder DB Instance Object
		// 		 */
		// 		async function updateExpireTime(saleOrder) {
		// 			const createDate = new Date(saleOrder.createdAt);
		// 			const expireDate = createDate.setDate(createDate.getDate() + 25);
		// 			const tableUpdate = await saleOrder.update({ expires_at: expireDate });
		// 			if (tableUpdate) return 'Date Update';
		// 			return 'Failure: 0.2';
        //         }


		// 		/** This function handles the removal of coins from the appropriate inventory
		// 		 * 
		// 		 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
		// 		 */
		// 		async function handleBuyOrder(infoObject) {
		// 			const totalCost = infoObject.value * infoObject.amount;
		// 			const theTarget = infoObject.target;
		// 			const dec = await theTarget.decrement('coins', { by: totalCost });
		// 			if (dec) await theTarget.save();
		// 			return 'Complete';
		// 		}


		// 		/** This function handles the removal of items * amount from the appropriate inventory
		// 		 * 
		// 		 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
		// 		 */
		// 		async function handleSellOrder(infoObject) {
		// 			console.log('Item Amount Before: ', infoObject.item.amount);
		// 			const dec = await infoObject.item.decrement('amount', {by: infoObject.amount});
		// 			if (dec) await infoObject.item.save();
		// 			console.log('Item Amount After: ', infoObject.item.amount);
		// 			return 'Complete';
		// 		}


		// 		/** This function handles checking against existing sell orders to try to complete the newly created order
		// 		 * 
		// 		 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
		// 		 * @param {any} theOrder DB Instance Object
		// 		 * @param {any} orderMatchObj Callback Object to use for display
		// 		 */
		// 		async function handleBuyReadyCheck(infoObject, theOrder, orderMatchObj) {
		// 			const activeOrders = await LocalMarkets.findAll({ where: [{ guildid: interaction.guild.id }, { sale_type: 'sell' }] });
		// 			if (activeOrders.length <= 0) return 'None';

		// 			let filteredOrders = activeOrders.filter(order => order.target_id !== infoObject.targetID)
		// 				.filter(order => order.item_type === infoObject.itemType)
		// 				.filter(order => order.item_id === infoObject.itemID);
		// 			if (filteredOrders.length <= 0) return 'None';

		// 			let orderFilled = false, filledExact = false;
		// 			filteredOrders = filteredOrders.filter(order => order.listed_value <= infoObject.value);
		// 			if (filteredOrders.length <= 0) return 'None';

		// 			filteredOrders.sort((lowest, order) => {
		// 				if (lowest.listed_value > order.listed_value) return 1;
		// 				if (lowest.listed_value < order.listed_value) return -1;
		// 				return 0;
		// 			});

		// 			const totalItemCount = filteredOrders.reduce((acc, order) => acc + order.amount_left, 0);
		// 			if (totalItemCount > infoObject.amount) orderFilled = true;
		// 			if (totalItemCount === infoObject.amount) filledExact = true;

		// 			let fillOutcome = '';
		// 			if (filledExact) {
		// 				fillOutcome = await handleExactFillBuy(infoObject, theOrder, filteredOrders, orderMatchObj);
		// 			} else if (orderFilled) {
		// 				fillOutcome = await handleFilledBuy(infoObject, theOrder, filteredOrders, orderMatchObj);
		// 			} else {
		// 				fillOutcome = await handlePartialFillBuy(infoObject, theOrder, filteredOrders, orderMatchObj);
		// 			}
		// 			if (fillOutcome !== '') return fillOutcome;
		// 		}



		// 		async function handleSellReadyCheck(infoObject, theOrder, orderMatchObj) {
		// 			const activeOrders = await LocalMarkets.findAll({ where: [{ guildid: interaction.guild.id }, { sale_type: 'buy' }] });
		// 			if (activeOrders.length <= 0) return 'None';
		// 		}


		// 		/** This function handles all sell and buy order conditions and payouts according to:
		// 		 *	 Prices given
		// 		 *	 Total Items
		// 		 *	 Type of Item
		// 		 *	 Type of Trade Target
		// 		 * 
		// 		 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
		// 		 * @param {any} theOrder DB Instance Object
		// 		 * @param {any[]} filteredOrders DB Instance Object Array
		// 		 * @param {any} orderMatchObj Callback Object to use for display
		// 		 */
		// 		async function handleExactFillBuy(infoObject, theOrder, filteredOrders, orderMatchObj) {
		// 			const totalOrderValue = theOrder.listed_value * theOrder.amount_left;
		// 			const totalExpectedFilled = filteredOrders.length;

		// 			let itemRef = '';
		// 			if (infoObject.itemType === 'Gear') itemRef = grabGearRef(infoObject.itemID);
		// 			if (infoObject.itemType !== 'Gear') itemRef = grabMatRef(infoObject.itemType, infoObject.itemID);
		// 			if (itemRef === '') return 'Failure: 1.1';

		// 			// Payout coins to each order filled
		// 			let totalSpent = 0;
		// 			let ordersHandled = 0;
		// 			for (const order of filteredOrders) {
		// 				// Handle Payout
		// 				totalSpent += await sellAllOrderPayout(order);
		// 				// Handle amount removal
		// 				ordersHandled += await handleOrderRemoval(order);
		// 			}
		// 			console.log(`Total Coins Spent: ${totalSpent}\nTotal Coins in Order: ${totalOrderValue}`);
		// 			console.log(`Total Orders Filled: ${ordersHandled}\nTotal Orders Expected: ${totalExpectedFilled}`);

		// 			let coinRefund = 0;
		// 			if (totalSpent < totalOrderValue) coinRefund = totalOrderValue - totalSpent;
		// 			if (coinRefund > 0) {
		// 				orderMatchObj.coinINC = coinRefund;
		// 				await handleRefund(theOrder, coinRefund);
		// 			} 

		// 			// Payout items to order filled
		// 			const orderComplete = await buyAllOrderPayout(theOrder, itemRef, infoObject);
		// 			if (orderComplete !== 'Complete') return 'Failure: 1.1.1';

		// 			orderMatchObj.itemsMoved = theOrder.amount_left;
		// 			return 'Exact';
		// 		}


		// 		/** This function handles payouts to sell orders until filling the created buy order.
		// 		 * 
		// 		 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
		// 		 * @param {any} theOrder DB Instance Object
		// 		 * @param {any[]} filteredOrders DB Instance Object Array
		// 		 * @param {any} orderMatchObj Callback Object to use for display
		// 		 */
		// 		async function handleFilledBuy(infoObject, theOrder, filteredOrders, orderMatchObj) {
		// 			const totalOrderValue = theOrder.listed_value * theOrder.amount_left;
		// 			const totalOrderItems = theOrder.amount_left;

		// 			let itemRef = '';
		// 			if (infoObject.itemType === 'Gear') itemRef = grabGearRef(infoObject.itemID);
		// 			if (infoObject.itemType !== 'Gear') itemRef = grabMatRef(infoObject.itemType, infoObject.itemID);
		// 			if (itemRef === '') return 'Failure: 1.1';

		// 			// Payout coins to each order filled
		// 			const orderHandler = {
		// 				totalSpent: 0,
		// 				totalRemaining: totalOrderItems,
		// 				totalBought: 0,
		// 				ordersHandled: 0,
		// 			};

		// 			let result = '';
		// 			for (const order of filteredOrders) {
		// 				// Handle Payout
		// 				result = '';
		// 				result = await sellPartialOrderPayout(order, orderHandler);
		// 				if (result === 'Finished') orderHandler.ordersHandled++;
		// 			}
		// 			console.log(`Total Coins Spent: ${orderHandler.totalSpent}\nTotal Coins in Order: ${totalOrderValue}`);
		// 			console.log(`Total Items Bought: ${orderHandler.totalBought}\nTotal Items Remaining: ${orderHandler.totalRemaining}`);


		// 			let coinRefund = 0;
		// 			if (orderHandler.totalSpent < totalOrderValue) coinRefund = totalOrderValue - orderHandler.totalSpent;
		// 			if (coinRefund > 0) {
		// 				orderMatchObj.coinINC = coinRefund;
		// 				await handleRefund(theOrder, coinRefund);
		// 			}

		// 			// Payout items to order filled
		// 			const orderComplete = await buyAllOrderPayout(theOrder, itemRef, infoObject);
		// 			if (orderComplete !== 'Complete') return 'Failure: 1.1.1';


		// 			orderMatchObj.itemsMoved = orderHandler.totalBought;

		// 			return 'Filled';
		// 		}


		// 		/** This function handles payouts to sell orders for all that exist.
		// 		 *
		// 		 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
		// 		 * @param {any} theOrder DB Instance Object
		// 		 * @param {any[]} filteredOrders DB Instance Object Array
		// 		 * @param {any} orderMatchObj Callback Object to use for display
		// 		 */
		// 		async function handlePartialFillBuy(infoObject, theOrder, filteredOrders, orderMatchObj) {
		// 			console.log(infoObject);
		// 			console.log(...filteredOrders);

		// 			const totalOrderValue = theOrder.listed_value * theOrder.amount_left;
		// 			const totalOrderItems = theOrder.amount_left;

		// 			let itemRef = '';
		// 			if (infoObject.itemType === 'Gear') itemRef = grabGearRef(infoObject.itemID);
		// 			if (infoObject.itemType !== 'Gear') itemRef = grabMatRef(infoObject.itemType, infoObject.itemID);
		// 			if (itemRef === '') return 'Failure: 1.1';

		// 			// Payout coins to each order filled
		// 			const orderHandler = {
		// 				totalSpent: 0,
		// 				totalRemaining: totalOrderItems,
		// 				totalBought: 0,
		// 				ordersHandled: 0,
		// 			};

		// 			let result = '';
		// 			for (const order of filteredOrders) {
		// 				// Handle Payout
		// 				result = '';
		// 				result = await sellPartialOrderPayout(order, orderHandler);
		// 				if (result === 'Finished') orderHandler.ordersHandled++;
		// 			}
		// 			console.log(`Total Coins Spent: ${orderHandler.totalSpent}\nTotal Coins in Order: ${totalOrderValue}`);
		// 			console.log(`Total Items Bought: ${orderHandler.totalBought}\nTotal Items Remaining: ${orderHandler.totalRemaining}`);

		// 			let coinRefund = 0;
		// 			if (orderHandler.totalSpent < totalOrderValue) coinRefund = totalOrderValue - orderHandler.totalSpent;
		// 			if (coinRefund > 0) {
		// 				orderMatchObj.coinINC = coinRefund;
		// 				await handleRefund(theOrder, coinRefund);
		// 			}

		// 			// Payout items to order filled
		// 			const orderComplete = await buyPartialOrderPayout(theOrder, itemRef, infoObject, orderHandler);
		// 			if (orderComplete !== 'Complete') return 'Failure: 1.1.1';

		// 			const orderUpdated = await handleOrderUpdate(theOrder, orderHandler.totalBought);
		// 			if (orderUpdated === 1) await theOrder.save();

		// 			orderMatchObj.itemsMoved = orderHandler.totalBought;

		// 			return 'Partial';
		// 		}


		// 		/** This function locates the proper materialList.json and returns the specific material from that list
		// 		* 
		// 		* @param {string} matType "passtype" === file name/path
		// 		* @param {number} matID Mat_id
		// 		*/
		// 		function grabMatRef(matType, matID) {
		// 			let matList;
		// 			for (const [key, value] of materialFiles) {
		// 				if (key === matType) {
		// 					matList = require(value);
		// 					break;
		// 				}
		// 			}

		// 			let matRef = matList.filter(mat => mat.Mat_id === matID);
		// 			matRef = matRef[0];
		// 			return matRef;
		// 		}


		// 		/** This function returns an item ref using the provided loot_id.
		// 		* 
		// 		* @param {number} lootID Loot_id
		// 		*/
		// 		function grabGearRef(lootID) {
		// 			let gearRef = lootList.filter(item => item.Loot_id === lootID);
		// 			gearRef = gearRef[0];
		// 			return gearRef;
		// 		}


		// 		/** This function adds any coins refunded to the order's creator
		// 		 * 
		// 		 * @param {any} theOrder DB Instance Object
		// 		 * @param {number} coinRefund Amount of coins to refund
		// 		 */
		// 		async function handleRefund(theOrder, coinRefund) {
		// 			let target = 'None', type = theOrder.target_type;
		// 			if (type === 'town') target = await Town.findOne({ where: { townid: theOrder.target_id } });
		// 			if (type === 'user') target = await UserData.findOne({ where: { userid: theOrder.target_id } });
		// 			if (target === 'None') return 'Failure: 2.1';

		// 			const inc = await target.increment('coins', { by: coinRefund });
		// 			if (inc) return await target.save();
        //         }


		// 		/** This function calculates the total value of items being sold,
		// 		 *	 then updates the correct users coins with that value.
		// 		 * 
		// 		 * @param {any} theOrder DB Instance Object
		// 		 */
		// 		async function sellAllOrderPayout(theOrder) {
		// 			let totalValue = theOrder.listed_value * theOrder.amount_left;
		// 			let target = 'None';
		// 			if (theOrder.target_type === 'town') target = await Town.findOne({ where: { townid: theOrder.target_id } });
		// 			if (theOrder.target_type === 'user') target = await UserData.findOne({ where: { userid: theOrder.target_id } });
		// 			if (target === 'None') return 'Failure: 1.2';

		// 			const inc = await target.increment('coins', { by: totalValue });
		// 			if (inc) await target.save();

		// 			return totalValue;
		// 		}


		// 		/** This function handles the function path needed for the given target and item type,
		// 		 *   then awaits the success results to be returned
		// 		 * 
		// 		 * @param {any} theOrder DB Instance Object
		// 		 * @param {any} itemRef Json Item Reference Object
		// 		 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
		// 		 */
		// 		async function buyAllOrderPayout(theOrder, itemRef, infoObject) {
		// 			let target = 'None', type = theOrder.target_type;
		// 			if (type === 'town') target = await Town.findOne({ where: { townid: theOrder.target_id } });
		// 			if (type === 'user') target = await UserData.findOne({ where: { userid: theOrder.target_id } });
		// 			if (target === 'None') return 'Failure: 1.3';

		// 			let itemAdded = '';
		// 			if (theOrder.item_type === 'Gear') itemAdded = await handleGearAdd(target, itemRef, theOrder.amount_left);
		// 			if (theOrder.item_type !== 'Gear') itemAdded = await handleMatAdd(target, itemRef, theOrder.amount_left, type, infoObject.itemType);
		// 			if (itemAdded !== 'Added') return 'Failure: 1.4';

		// 			return 'Complete';
		// 		}


		// 		/** This function handles the function path needed for the given target, item type, and amount,
		// 		 *   then awaits the success results to be returned
		// 		 * 
		// 		 * @param {any} theOrder DB Instance Object
		// 		 * @param {any} itemRef Json Item Reference Object
		// 		 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
		// 		 */
		// 		async function buyPartialOrderPayout(theOrder, itemRef, infoObject, orderHandler) {
		// 			let target = 'None', type = theOrder.target_type;
		// 			if (type === 'town') target = await Town.findOne({ where: { townid: theOrder.target_id } });
		// 			if (type === 'user') target = await UserData.findOne({ where: { userid: theOrder.target_id } });
		// 			if (target === 'None') return 'Failure: 1.3';

		// 			let itemAdded = '';
		// 			if (theOrder.item_type === 'Gear') itemAdded = await handleGearAdd(target, itemRef, orderHandler.totalBought);
		// 			if (theOrder.item_type !== 'Gear') itemAdded = await handleMatAdd(target, itemRef, orderHandler.totalBought, type, infoObject.itemType);
		// 			if (itemAdded !== 'Added') return 'Failure: 1.4';

		// 			return 'Complete';
		// 		}


		// 		/** This function is handled through the checkOwned() script for consistant item creation
		// 		 * 
		// 		 * @param {any} target DB Instance Object: User
		// 		 * @param {any} itemRef Json Item Reference Object
		// 		 * @param {number} amount Amount needed
		// 		 */
		// 		async function handleGearAdd(target, itemRef, amount) {
		// 			const addResult = await checkOwned(target, itemRef, amount);
		// 			if (addResult !== 'Finished') return 'Failure';
		// 			return 'Added';
        //         }


		// 		/** This function handles Updating/Creating a material entry in the appropeate DB
		// 		 * 
		// 		 * @param {any} target DB Instance Object: User || Town
		// 		 * @param {any} itemRef Json Item Reference Object
		// 		 * @param {number} amount Amount needed
		// 		 * @param {string} type 'town' || 'user' 
		// 		 * @param {string} matType mattype Reference 
		// 		 */
		// 		async function handleMatAdd(target, itemRef, amount, type, matType) {
		// 			let matStore;
		// 			if (type === 'town') {
		// 				matStore = await TownMaterial.findOne({
		// 					where: [{ townid: target.townid }, { mat_id: itemRef.Mat_id }, { mattype: matType }]
		// 				});
		// 			}
		// 			if (type === 'user') {
		// 				matStore = await MaterialStore.findOne({
		// 					where: [{ spec_id: target.userid }, { mat_id: itemRef.Mat_id }, { mattype: matType }]
		// 				});
		// 			}

		// 			if (matStore) {
		// 				const inc = await matStore.increment('amount', { by: amount });
		// 				if (inc) await matStore.save();
		// 				return 'Added';
		// 			}

		// 			let newMat;
		// 			try {
		// 				if (type === 'town') newMat = await TownMaterial.create({ townid: target.townid, amount: amount });
		// 				if (type === 'user') newMat = await MaterialStore.create({ spec_id: target.userid, amount: amount });

		// 				if (newMat) {
		// 					await newMat.update({
		// 						name: itemRef.Name,
		// 						value: itemRef.Value,
		// 						mattype: matType,
		// 						mat_id: itemRef.Mat_id,
		// 						rarity: itemRef.Rarity,
		// 						rar_id: itemRef.Rar_id,
		// 					});

		// 					await newMat.save();
		// 					return 'Added';
		// 				}
		// 			} catch (error) {
		// 				console.error(error);
		// 			}
		// 		}


		// 		/** This function removes Completed Orders
		// 		 * 
		// 		 * @param {any} theOrder DB Instance Object
		// 		 */
		// 		async function handleOrderRemoval(theOrder) {
		// 			const destroyed = await theOrder.destroy();
		// 			if (destroyed) return 1;
		// 			return 0;
        //         }


		// 		/** This function handles decreasing remaining items while increasing items moved from appropreate orders.
		// 		 * 
		// 		 * @param {any} theOrder DB Instance Object
		// 		 * @param {number} amountRemoved Amount to change by
		// 		 */
		// 		async function handleOrderUpdate(theOrder, amountRemoved) {
		// 			const dec = await theOrder.decrement('amount_left', { by: amountRemoved });
		// 			const inc = await theOrder.increment('amount_moved', { by: amountRemoved });
		// 			if (inc && dec) {
		// 				await theOrder.save();
		// 				return 1;
		// 			} else return 0;
        //         }


		// 		/** This function handles order updates according to remaining items being bought.
		// 		 * 
		// 		 * @param {any} theOrder DB Instance Object
		// 		 * @param {any} orderHandler Object used as callback 
		// 		 */
		// 		async function sellPartialOrderPayout(theOrder, orderHandler) {
		// 			const itemsToMove = orderHandler.totalRemaining;
		// 			const itemsInOrder = theOrder.amount_left;

		// 			let itemDiff = itemsInOrder - itemsToMove, destOrder = false;
		// 			console.log('itemDiff Before: ', itemDiff);

		// 			if (itemDiff <= 0) {
		// 				itemDiff = itemsInOrder, destOrder = true;
		// 			} else if (itemDiff > 0) itemDiff = itemsToMove;
		// 			console.log('itemDiff After: ', itemDiff);

		// 			let totalValue = theOrder.listed_value * itemDiff;
		// 			console.log('Total Value: ', totalValue);
		// 			let target = 'None';
		// 			if (theOrder.target_type === 'town') target = await Town.findOne({ where: { townid: theOrder.target_id } });
		// 			if (theOrder.target_type === 'user') target = await UserData.findOne({ where: { userid: theOrder.target_id } });
		// 			if (target === 'None') return 'Failure: 1.2';

		// 			const inc = await target.increment('coins', { by: totalValue });
		// 			if (inc) await target.save();

		// 			let orderDone;
		// 			if (destOrder) {
		// 				orderDone = await handleOrderRemoval(theOrder);
		// 			} else orderDone = await handleOrderUpdate(theOrder, itemDiff);

		// 			orderHandler.totalSpent += totalValue;
		// 			orderHandler.totalRemaining -= itemDiff;
		// 			orderHandler.totalBought += itemDiff;

		// 			if (orderDone === 1) return 'Finished';
		// 			return 'Failure: 1.3';
		// 		}

		// 	}).catch(error => {
		// 		console.error(errorForm('Interaction error @ Trade local:', error));
		// 	});
		// }

		if (interaction.options.getSubcommand() === 'global') {
			if (interaction.user.id !== '501177494137995264') return interaction.reply('This command is under construction, please check back later!');
			const startTime = new Date().getTime();
			await interaction.deferReply().then(async () => {

				const endTime = new Date().getTime();
				console.log(`Diff between start: ${startTime}/${endTime} :End..\n   ${(startTime - endTime)}`);
			}).catch(error => {
				console.error(errorForm('Interaction error @ Trade global:', error));
			});
		}

	},
};
