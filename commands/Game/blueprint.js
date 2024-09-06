const { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const {
	warnedForm,
	errorForm,
	successResult,
	failureResult,
	basicInfoForm,
	specialInfoForm
} = require('../../chalkPresets.js');

const { OwnedBlueprints, MaterialStore, UniqueCrafted, OwnedPotions, UserData, OwnedTools } = require('../../dbObjects.js');

const blueprintList = require('../../events/Models/json_prefabs/blueprintList.json');
const fullBPList = require('../Development/Export/Json/bpUpdateList.json');
const { grabColour } = require('./exported/grabRar.js');

const { checkHintPotionEquip, checkHintUniqueEquip, checkHintPigmyGive } = require('./exported/handleHints.js');
const { handleMatNameFilter, createBasicPageButtons, loadAmountButts, loadBasicBackButt } = require('./exported/tradeExtras.js');
const { makeCapital, endTimer, createInteractiveChannelMessage, handleCatchDelete, grabUser, editTimedChannelMessage } = require('../../uniHelperFunctions.js');
const { checkOutboundMat } = require('../Development/Export/itemMoveContainer.js');
const { spendUserCoins } = require('../Development/Export/uni_userPayouts.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('blueprint')
		.setDescription('Blueprint Managment!')
		.addSubcommand(subcommand => 
			subcommand
				.setName('view')
				.setDescription('View a list of all owned blueprints'))
		.addSubcommand(subcommand =>
				subcommand
				.setName('available')
				.setDescription('View all currently craftable blueprints')
				.addIntegerOption(option =>
					option.setName('amount')
						.setDescription('The amount to craft'))),

	async execute(interaction) { 
		const {materialFiles, masterBPCrafts, masterBPEffects} = interaction.client;

		if (interaction.options.getSubcommand() === 'view') {
			//View ALL owned blueprints

			//if (interaction.user.id !== '501177494137995264') return await interaction.reply('This command is under construction!');

			const userBPS = await OwnedBlueprints.findAll({where: {spec_id: interaction.user.id}});
			if (userBPS.length <= 0) return interaction.reply('No Blueprints Owned!');

			const bpPages = await loadBPDisplay(userBPS);

			const pageButts = createBasicPageButtons();
			const cancelButt = new ButtonBuilder()
			.setCustomId('cancel')
			.setStyle(ButtonStyle.Secondary)
			.setLabel('Close Menu');
			pageButts.push(pageButts.splice(1, 1, cancelButt)[0]);

			const pageButtRow = new ActionRowBuilder().addComponents(pageButts);

			const replyObj = {embeds: [bpPages[0]], components: [pageButtRow]};

			const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, "Reply");

			// =====================
			// BUTTON COLLECTOR
			let curPage = 0;
			collector.on('collect', async c => {
				await c.deferUpdate().then(async () => {
					switch(c.customId){
						case "next-page":
							curPage = (curPage === bpPages.length - 1) ? 0 : curPage + 1;
						break;
						case "back-page":
							curPage = (curPage === 0) ? bpPages.length - 1 : curPage - 1;
						break;
						case "cancel":
						return collector.stop('Canceled');
					}
					await anchorMsg.edit({embeds: [bpPages[curPage]], components: [pageButtRow]});
				}).catch(e => console.error(e));
			});
			// =====================

			// =====================
			// BUTTON COLLECTOR
			collector.on('end', async (c, r) => {
				if (!r || r === 'time') await handleCatchDelete(anchorMsg);

				await handleCatchDelete(anchorMsg);
			});
			// =====================



			//return buildBPDisplay(userBPS);
		}

		/**
		 * This function loads the display for all owned blueprints by the user to be shown to the user.
		 * @param {object[]} userBPList Full Owned Blueprint List for user using command
		 * @returns {Promise <EmbedBuilder[]>}
		 */
		async function loadBPDisplay(userBPList){
			const bpLoadStart = new Date().getTime();

			const ownedMatList = await MaterialStore.findAll({where: {spec_id: interaction.user.id}});

			//const {masterBPList, masterEffList} = loadFullBPList();

			const bpEmbedPages = [];
			for (const bluey of userBPList){
				//const bpMatch = masterBPList.filter(bp => bp.Name === bluey.name)[0];
				const bpMatch = masterBPCrafts.get(bluey.name);
				if (!bpMatch) continue;
				//const exrEff = masterEffList.filter(eff => eff.Name === bluey.name)[0];
				const exrEff = masterBPEffects.get(bluey.name);

				let dynDesc;
				switch(bluey.passivecategory){
					case "Potion":
						dynDesc = `Potion Effect: **${bpMatch.Description}**\nRarity: **${bpMatch.Rarity}**\nLevel Required: **${bpMatch.Level}**\nCraft Cost: **${bpMatch.Cost}**c\nPotion Duration: **${exrEff.Duration}**\nPotion Cooldown: **${exrEff.Cooldown}**\nMaterials Required: `;
					break;
					case "Tool":
						dynDesc = `Used with **${exrEff.Type}** as **${exrEff.SubType}**\nTool Effect: ${bpMatch.Description}\nRarity: **${bpMatch.Rarity}**\nLevel Required: **${bpMatch.Level}**\nCraft Cost: **${bpMatch.Cost}**c\nMaterials Required: `;
					break;
				}

				dynDesc += '\n\nMaterial Amount Reached: ✅\nMaterial Owned but Amount is *Below* needed: ❔\nMaterial **Not** Owned: ❌';

				const finalFields = [];
				for (const matCraft of bpMatch.CraftList){
					const userMatMatch = ownedMatList.filter(mat => mat.name === matCraft.Name);
					const matAmountOwned = (userMatMatch.length !== 0) ? userMatMatch[0].amount : 0;
					const matRefObj = handleMatNameFilter(matCraft.Name, materialFiles);

					const finalValue = `Type: **${makeCapital(matRefObj.matType)}**\nRarity: **${matRefObj.matRef.Rarity}**\n(Owned/Needed) Amount:  **${matAmountOwned}**/${matCraft.Amount}`;

					const statusEmoji = (matAmountOwned >= matCraft.Amount) ? '✅' : (matAmountOwned > 0) ? '❔': '❌';

					finalFields.push({name: `= **${matCraft.Name}** = ${statusEmoji}`, value: finalValue});
				}

				const embedColour = grabColour(bpMatch.Rar_id);
				const embed = new EmbedBuilder()
				.setTitle(`== ${bluey.name} ==`)
				.setDescription(dynDesc)
				.setColor(embedColour)
				.addFields(finalFields);

				bpEmbedPages.push(embed);
			}

			endTimer(bpLoadStart, "BP View Display Pages Load");

			return bpEmbedPages;
		}

		// ===================
		// REPLACED BY STATIC CLIENT COLLECTION 
		// ===================
		// /**
		//  * This function handles extracting all existing BP objects from the BP master list,
		//  * it also collects and returns the associated effects for each BP as its own object[]
		//  * @returns {{masterBPList: object[], masterEffList: object[]}}
		//  */
		// function loadFullBPList(){
		// 	const masterPotionList = fullBPList.filter(list => list.Type === "Potion")[0].Cat;
		// 	const potionBPList = [], potionEffectList = [];
		// 	for (const a of masterPotionList){
		// 		const craftSubCat = a.SubCat[0].List;
		// 		for (const pBP of craftSubCat){
		// 			potionBPList.push(pBP);
		// 		}
		// 		const effectSubCat = a.SubCat[1].List;
		// 		for (const eff of effectSubCat){
		// 			potionEffectList.push(eff);
		// 		}
		// 	}

		// 	const masterToolList = fullBPList.filter(list => list.Type === "Tool")[0].Cat;
		// 	const toolBPList = [], toolEffectList = [];
		// 	for (const a of masterToolList){
		// 		const craftSubCat = a.SubCat;
		// 		for (const aSubC of craftSubCat){
		// 			const craftASubC = aSubC.List;
		// 			for (const tBP of craftASubC){
		// 				toolBPList.push(tBP);
		// 			}
		// 			const effASubC = aSubC.Effect;
		// 			if (!effASubC) continue;
		// 			for (const eff of effASubC){
		// 				const eTMod = eff;
		// 				eTMod.Type = a.Active;
		// 				eTMod.SubType = aSubC.Active;
		// 				toolEffectList.push(eTMod);
		// 			}
		// 		}
				
		// 	}

		// 	const masterBPList = potionBPList.concat(toolBPList);
		// 	const masterEffList = potionEffectList.concat(toolEffectList);

		// 	return {masterBPList, masterEffList};
		// }

		// async function buildBPDisplay(bpList){	
		// 	//if (bpList.length <= 0) return await interaction.reply('No Blueprints owned!');		
		// 	const userMaterials = await MaterialStore.findAll({where: {spec_id: interaction.user.id}});
		// 	const embedPages = [];

		// 	for (const bluey of bpList){
		// 		let finalFields = [];
		// 		let fieldName = '', fieldValue = '', fieldObj = {};
		// 		let blueyFab = blueprintList.filter(blueFab => blueFab.BlueprintID === bluey.blueprintid);
		// 		blueyFab = blueyFab[0];

		// 		const matTypeAmount = blueyFab.MaterialTypeAmount;
		// 		for (let matPos = 0; matPos < matTypeAmount; matPos++){
		// 			const matOwnedCheck = userMaterials.filter(mat => mat.name === blueyFab[`Material${(matPos + 1)}`]); //&& mat.amount >= (blueyFab[`Material${(matPos + 1)}_Amount`] * amount
		// 			const ownedMatAmount = (matOwnedCheck.length === 1) ? matOwnedCheck[0].amount : 0;

		// 			fieldName = `Material ${matPos + 1}: **${blueyFab[`Material${matPos + 1}`]}**`;
		// 			fieldValue = `Rarity: **${blueyFab[`Rarity${matPos + 1}`]}**\nAmount: **${blueyFab[`Material${matPos + 1}_Amount`]}**\nAmount Owned: **${ownedMatAmount}**`;
		// 			fieldObj = {name: fieldName, value: fieldValue};
					
		// 			finalFields.push(fieldObj);
		// 		}

		// 		let embedDesc = '';

		// 		// Using const asignment to repeat check value and still be able to change it
		// 		let stringChoice = bluey.passivecategory.toLowerCase();

		// 		// Switch to lowercase to prevent case error
		// 		switch(stringChoice){
		// 			// case "equip":
		// 			// 	embedDesc = `Coin Cost: ${blueyFab.CoinCost} \nRequired Level: ${blueyFab.UseLevel} \nSlot: ${blueyFab.Slot} \nHands: ${blueyFab.Hands} \nRarity: ${blueyFab.Rarity} \nMaterial Types Needed: ${blueyFab.MaterialTypeAmount}`;
		// 			// break;
		// 			case "potion":
		// 				embedDesc = `Coin Cost: ${blueyFab.CoinCost} \nRequired Level: ${blueyFab.UseLevel} \nDuration: ${blueyFab.Duration} \nCoolDown: ${blueyFab.CoolDown} \nMaterial Types Needed: ${blueyFab.MaterialTypeAmount}`;
		// 			break;
		// 			case "tool":
		// 				embedDesc = `Coin Cost: ${blueyFab.CoinCost} \nRequired Level: ${blueyFab.UseLevel} \nRarity: ${blueyFab.Rarity} \nMaterial Types Needed: ${blueyFab.MaterialTypeAmount}`;
		// 			break;
		// 		}

		// 		let embedColour = grabColour((blueyFab.Rar_id ?? 0), false);

		// 		const embed = new EmbedBuilder()
		// 		.setTitle(`${bluey.name}`)
		// 		.setDescription(`${blueyFab.Description} \n${embedDesc}`)
		// 		.setColor(embedColour)
		// 		.addFields(finalFields);

		// 		embedPages.push(embed);
		// 	}

		// 	const backButton = new ButtonBuilder()
		// 	.setLabel("Back")
		// 	.setStyle(ButtonStyle.Secondary)
		// 	.setEmoji('◀️')
		// 	.setCustomId('back-page');
			
		// 	const forwardButton = new ButtonBuilder()
		// 	.setLabel("Forward")
		// 	.setStyle(ButtonStyle.Secondary)
		// 	.setEmoji('▶️')
		// 	.setCustomId('next-page');

		// 	const cancelButton = new ButtonBuilder()
		// 	.setLabel("Cancel")
		// 	.setStyle(ButtonStyle.Secondary)
		// 	.setEmoji('*️⃣')
		// 	.setCustomId('delete-page');

		// 	const buttonRow = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

		// 	const pagesMsg = await interaction.reply({embeds: [embedPages[0]], components: [buttonRow]});

		// 	const filter = (i) => i.user.id === interaction.user.id;

		// 	const collector = pagesMsg.createMessageComponentCollector({
		// 		componentType: ComponentType.Button,
		// 		filter,
		// 		time: 120000,
		// 	});

		// 	let currentPage = 0;
		// 	collector.on('collect', async (COI) => {
		// 		if (COI.customId === 'next-page') {
		// 			await COI.deferUpdate().then(async () => {
		// 				if (currentPage === embedPages.length - 1) {
		// 					currentPage = 0;
		// 					await pagesMsg.edit({ embeds: [embedPages[currentPage]], components: [buttonRow] });
		// 				} else {
		// 					currentPage += 1;
		// 					await pagesMsg.edit({ embeds: [embedPages[currentPage]], components: [buttonRow] });
		// 				}
		// 			});
		// 		}

		// 		if (COI.customId === 'back-page') {
		// 			await COI.deferUpdate().then(async () => {
		// 				if (currentPage === 0) {
		// 					currentPage = embedPages.length - 1;
		// 					await pagesMsg.edit({ embeds: [embedPages[currentPage]], components: [buttonRow] });
		// 				} else {
		// 					currentPage -= 1;
		// 					await pagesMsg.edit({ embeds: [embedPages[currentPage]], components: [buttonRow] });
		// 				}
		// 			});
		// 		}

		// 		if (COI.customId === 'delete-page') {
		// 			collector.stop();
		// 		}

		// 		// if (COI.customId === 'craft-button'){
		// 		// 	// Attempt to craft item!!
		// 		// 	const result = await craftBlueprint(finalBpObj[currentPage], matCostList[currentPage], amount);
		// 		// 	console.log(result);
		// 		// 	if (result.status && result.status !== "Complete" || result.outcomeObj.status !== "Complete") {
		// 		// 		switch(result.status){
		// 		// 			case "DUPE EQUIP":
		// 		// 				collector.stop();
		// 		// 				return await interaction.followUp(`You cannot craft more than one **${finalBpObj[currentPage].name}!** It is Unique, just like you :)`);
		// 		// 			case "DUPE TOOL":
		// 		// 				collector.stop();
		// 		// 				return await interaction.followUp(`You cannot craft more than one **${finalBpObj[currentPage].name}!**`);
		// 		// 			default:
		// 		// 				collector.stop();
		// 		// 				return await interaction.followUp(`Something went wrong while crafting that! ${result.status}`);
		// 		// 		}
		// 		// 	}

		// 		// 	collector.stop();
		// 		// 	return await interaction.followUp({embeds: [result.embed]});
		// 		// }
		// 	});

		// 	collector.on('end', () => {
		// 		pagesMsg.delete().catch(error => {
		// 			if (error.code !== 10008) {
		// 				console.error('Failed to delete the message:', error);
		// 			}
		// 		});
		// 	});
		// }

		if (interaction.options.getSubcommand() === 'available') {
			// Simplify nearly all code here
			// String select menu for Blueprint categories
			// Load bluey as full material object
			// Use matObj to calc if more than one can be made
			// Only have as option for non-unqiue bluey


			//if (interaction.user.id !== '501177494137995264') return interaction.reply('This command is under construction, please check back later!');
			
			const allBlueprintsList = await OwnedBlueprints.findAll({ where: { spec_id: interaction.user.id } });
			if (allBlueprintsList.length <= 0) return await interaction.reply('You do not have any blueprints yet!');
			const matCheck = await MaterialStore.findOne({where: {spec_id: interaction.user.id}});
			if (!matCheck) return await interaction.reply('You have no materials to craft with!');

			const entryEmbed = new EmbedBuilder()
			.setTitle('View Blueprints')
			.setDescription('Choose one of the following categories to view your blueprints')
			.setColor('Blurple');

			const bpTypeStringSelect = new StringSelectMenuBuilder()
			.setCustomId('bp-select')
			.setPlaceholder('Choose an option!')
			.addOptions(
				// new StringSelectMenuOptionBuilder()
				// .setLabel('Equipment')
				// .setDescription('Show Equipment Blueprints')
				// .setValue('equip'),
				new StringSelectMenuOptionBuilder()
				.setLabel('Potion')
				.setDescription('Show Potion Blueprints')
				.setValue('Potion'),
				new StringSelectMenuOptionBuilder()
				.setLabel('Tools')
				.setDescription('Show Tool Blueprints')
				.setValue('Tool'),
				new StringSelectMenuOptionBuilder()
				.setLabel('All')
				.setDescription('Show All Blueprints')
				.setValue('All'),
			);
			
			const selectRow = new ActionRowBuilder().addComponents(bpTypeStringSelect);

			const replyObj = {embeds: [entryEmbed], components: [selectRow]};

			const {anchorMsg, collector, sCollector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, "Reply", "Both");

			// Menu Nav Setup
			// ==============

			// First Menu (1 Page)
			// ==========
			// BP Types Menu
			// {embeds: [entryEmbed], components: [selectRow]};

			// Second Menu (n Pages)
			// ===========
			// BP Choice List
			// Load BP Pages
			// LOAD PAGE BUTTONS
			const pageButts = createBasicPageButtons("Primary");
			const backButt = new ButtonBuilder()
			.setCustomId(`back-bp`)
			.setStyle(ButtonStyle.Secondary)
			.setLabel('Go Back');
			const selectButt = new ButtonBuilder()
			.setCustomId('select-bp')
			.setStyle(ButtonStyle.Success)
			.setLabel('Pick Blueprint');
			pageButts.push(pageButts.splice(1, 1, backButt, selectButt)[0]);

			const pageButtRow = new ActionRowBuilder().addComponents(pageButts);

			// Third Menu (1 Page)
			// ==========
			// IF BP PICKED IS SINGLE CRAFT SKIP AMOUNT MENU
			// Craft Amount Menu
			const makeAmountEmbed = new EmbedBuilder()
			.setTitle('== How Many? ==')
			.setDescription('Current Amount Selected: 0');

			// Fourth Menu (1 Page)
			// ===========
			// Craft Confirm Menu
			const confirmBPEmbed = new EmbedBuilder()
			.setTitle('== Confirm BP Crafting ==');

			const yesButt = new ButtonBuilder()
			.setCustomId('confirm-craft')
			.setStyle(ButtonStyle.Primary)
			.setLabel('Confirm Craft!');
			const noButt = new ButtonBuilder()
			.setCustomId('back-craft')
			.setStyle(ButtonStyle.Secondary)
			.setLabel('Go Back');

			const confirmRow = new ActionRowBuilder().addComponents(yesButt, noButt);

			// Last Page (1 Page)
			// =========
			// Crafted Outcome Menu
			const finalDetailEmbed = new EmbedBuilder();


			const bpMenuObj = {
				bpType: "",
				curPage: 0,
				lastPage: 0, // bpPageList.length - 1;
				bpPageList: [],
				bpRefList: [],
				singleCraft: false,
				bpPicked: "", // Used as Object {single: boolean, craft: object, effect: object, neededMats: object[], ownedMats: object[]}
				maxAmount: 0,
				makeAmount: 0
			};

			// ~~~~~~~~~~~~~~~~~~~~~
			// STRING COLLECTOR
			sCollector.on('collect', async c => {
				await c.deferUpdate().then(async () => {
					let editWith;
					if (c.customId === 'bp-select'){
						bpMenuObj.bpType = c.values[0];

						// LOAD BP PAGES HERE
						const bpPageOutcome = await loadBPPages(bpMenuObj.bpType, allBlueprintsList);
						if (['Empty Filter', 'Empty Craft'].includes(bpPageOutcome.outcome)){
							switch(bpPageOutcome.outcome){
								case "Empty Filter":
									await interaction.followUp({content: `No Owned ${bpMenuObj.bpType} Blueprints!`, ephemeral: true});
								break;
								case "Empty Craft":
									await interaction.followUp({content: `No ${bpMenuObj.bpType} Blueprints able to be crafted!`, ephemeral: true});
								break;
							}
							editWith = {embeds: [entryEmbed], components: [selectRow]};
						} else {
							bpMenuObj.bpPageList = bpPageOutcome.embeds;
							bpMenuObj.lastPage = bpPageOutcome.embeds.length - 1;
							bpMenuObj.bpRefList = bpPageOutcome.bpRefs;

							editWith = {embeds: [bpMenuObj.bpPageList[0]], components: [pageButtRow]};
						}
					}
					await anchorMsg.edit(editWith);
				}).catch(e => console.error(e));
			});
			// ~~~~~~~~~~~~~~~~~~~~~

			// =====================
			// BUTTON COLLECTOR
			collector.on('collect', async c => {
				await c.deferUpdate().then(async () => {
					let editWith;
					if (['back-bp', 'back-num', 'back-craft'].includes(c.customId)){ // BACK BUTTONS
						switch(c.customId){
							case "back-bp":
								bpMenuObj.bpType = "";
								// Load BP Type Select
								editWith = {embeds: [entryEmbed], components: [selectRow]};
							break;
							case "back-num":
								bpMenuObj.bpPicked = "";
								bpMenuObj.makeAmount = 0;
								bpMenuObj.curPage = 0;
								// Load BP List Pages
								editWith = {embeds: [bpMenuObj.bpPageList[0]], components: [pageButtRow]};
							break;
							case "back-craft":
								if (bpMenuObj.bpPicked.single){
									// IF SINGLE CRAFT: Load BP Pages
									bpMenuObj.bpPicked = "";
									bpMenuObj.makeAmount = 0;
									editWith = {embeds: [bpMenuObj.bpPageList[0]], components: [pageButtRow]};
								} else {
									// IF !SINGLE CRAFT: Load Amount Menu
									editWith = {embeds: [makeAmountEmbed], components: loadAmountButts()};
								}
								
							break;
						}
					} else if (['add-five', 'add-one', 'minus-five', 'minus-one'].includes(c.customId)){ // AMOUNT SELECT BUTTONS
						// Handle special counting logic here
						switch(c.customId){
							case "add-five":
								bpMenuObj.makeAmount += 5;
							break;
							case "add-one":
								bpMenuObj.makeAmount += 1;
							break;
							case "minus-one":
								bpMenuObj.makeAmount -= 1;
							break;
							case "minus-five":
								bpMenuObj.makeAmount -= 5;
							break;
						}
						// HANDLE BP MAT AMOUNTS TO PREVENT MAT MAX LIMITS
						if (bpMenuObj.makeAmount > bpMenuObj.maxAmount) {
							bpMenuObj.makeAmount = bpMenuObj.maxAmount;
							await c.followUp({content: `You do not have enough materials to craft more than ${bpMenuObj.maxAmount}`, ephemeral: true});
						}
						if (bpMenuObj.makeAmount < 0) bpMenuObj.makeAmount = 0;
						// DESCRIPTION
						makeAmountEmbed.setDescription(`Current Amount Selected: ${bpMenuObj.makeAmount}`);
						// HANDLE EXISTING EMBED FIELDS
						if (!makeAmountEmbed.data.fields){
							makeAmountEmbed.addFields(handleCurMatAmountDisplay(bpMenuObj));
						} else {
							makeAmountEmbed.data.fields.splice(0, makeAmountEmbed.data.fields.length, ...handleCurMatAmountDisplay(bpMenuObj));
						}

						editWith = {embeds: [makeAmountEmbed], components: loadAmountButts()};
					} else if (['back-page', 'next-page'].includes(c.customId)){ // PAGE CHANGE BUTTONS
						switch(c.customId){
							case "next-page":
								bpMenuObj.curPage = (bpMenuObj.curPage === bpMenuObj.lastPage) ? 0 : bpMenuObj.curPage + 1;
							break;
							case "back-page":
								bpMenuObj.curPage = (bpMenuObj.curPage === 0) ? bpMenuObj.lastPage : bpMenuObj.curPage - 1;
							break;
						}

						editWith = {embeds: [bpMenuObj.bpPageList[bpMenuObj.curPage]], components: [pageButtRow]};
					} else if (['select-bp', 'confirm-num', 'confirm-craft'].includes(c.customId)){ // CONFIRM BUTTONS
						switch(c.customId){
							case "select-bp":
								bpMenuObj.bpPicked = bpMenuObj.bpRefList[bpMenuObj.curPage];
								if (bpMenuObj.bpPicked.single){
									// If BP Single Craft: Load Confirm Menu
									bpMenuObj.makeAmount = 1;
									confirmBPEmbed
									.setDescription(`Would you like to craft **${bpMenuObj.makeAmount} ${bpMenuObj.bpPicked.craft.Name}**?\nIt will cost:\n\n`)
									.addFields(handleFinalCraftDisplay(bpMenuObj));
									editWith = {embeds: [confirmBPEmbed], components: [confirmRow]};
								} else {
									// If BP !Single Craft: Load Amount Menu
									bpMenuObj.maxAmount = handleMaxCraftAmount(bpMenuObj.bpPicked);
									editWith = {embeds: [makeAmountEmbed], components: loadAmountButts()};
								}
							break;
							case "confirm-num": // Load Confirm Craft Menu
								confirmBPEmbed
								.setDescription(`Would you like to craft **${bpMenuObj.makeAmount} ${bpMenuObj.bpPicked.craft.Name}**?\nIt will cost:\n\n`)
								.addFields(handleFinalCraftDisplay(bpMenuObj));
								editWith = {embeds: [confirmBPEmbed], components: [confirmRow]};
							break;
							case "confirm-craft": // Craft BP from user picked options!!
							return collector.stop('Craft');
						}
					}

					await anchorMsg.edit(editWith);
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

				if (r === 'Craft') {
					sCollector.stop();
					// HANDLE BP CRAFTING HERE!
					console.log('Craft Blueprint selected!! BLUEPRINT PICKED:');
					//console.log(`\n\nBP Name: >> ${bpMenuObj.bpPicked.craft.Name} <<\nBP Type: ${bpMenuObj.bpType}\nMats Needed: ${bpMenuObj.bpPicked.neededMats.map(mat => `\nName: ${mat.name}\nAmount: ${mat.baseAmount * bpMenuObj.makeAmount}\n`).join('')}\nMats Owned: ${bpMenuObj.bpPicked.ownedMats.map(mat => `\nName: ${mat.name}\nAmount: ${mat.totAmount}\n`).join('')}\n\n`);
				
					return await editTimedChannelMessage(anchorMsg, 60000, {embeds: [await handleBPCraft(bpMenuObj)], components: []});
				}
			});
			// =====================

			/**
			 * This function handles creating/updating a stored item,
			 * based on the contents of ``bpMenuRef``.
			 * @param {object} bpMenuRef Blueprint Menu Nav Object
			 * @returns {Promise<EmbedBuilder>}
			 */
			async function handleBPCraft(bpMenuRef){
				const blueyObj = bpMenuRef.bpPicked;
				const bpType = (blueyObj.effect.SubType) ? "Tool": "Potion";

				switch(bpType){
					case "Potion":
						await handlePotionCraft(blueyObj, bpMenuRef.makeAmount);
					break;
					case "Tool":
						await handleToolCraft(blueyObj, bpMenuRef.makeAmount);
					break;
				}

				// Handle Material Payouts
				await handleMaterialCost(blueyObj, bpMenuRef.makeAmount);

				// Handle Coin Payouts
				await spendUserCoins(blueyObj.craft.Cost * bpMenuRef.makeAmount, await grabUser(interaction.user.id));


				const eCol = grabColour(blueyObj.craft.Rar_id);
				const finalEmbed = new EmbedBuilder()
				.setTitle('== Blueprint Crafted ==')
				.setColor(eCol)
				.setDescription(`Item Crafted: **${blueyObj.craft.Name}**\nAmount Crafted: **${bpMenuRef.makeAmount}**`);

				return finalEmbed;
			}

			/**
			 * This function handles checking through all mats spent on crafting.
			 * @param {object} bpObj 
			 * @param {number} amount 
			 */
			async function handleMaterialCost(bpObj, amount){
				const bpMatList = bpObj.neededMats;
				for (const mat of bpMatList){
					const totMove = mat.baseAmount * amount;
					const matObj = handleMatNameFilter(mat.name, materialFiles);
					await checkOutboundMat(interaction.user.id, matObj.matRef, matObj.matType, totMove);
				}
			}

			/**
			 * This function creates a new potion entry if one is not found, 
			 * it then updates the entry amount based on the amount given.
			 * @param {object} bpObj Full Blueprint Object Container
			 * @param {number} amount Amount to craft
			 * @returns {Promise<object>}
			 */
			async function handlePotionCraft(bpObj, amount){
				const bpCraft = bpObj.craft, bpEffect = bpObj.effect;
				let potion = await OwnedPotions.findOrCreate({
					where: {
						name: bpCraft.Name,
						spec_id: interaction.user.id
					}, 
					defaults: {
						value: bpCraft.Cost,
						activecategory: bpEffect.Type,
						duration: bpEffect.Duration,
						cooldown: bpEffect.Cooldown,
						potion_id: bpCraft.PotionID,
						blueprintid: bpCraft.BlueprintID
					}
				});

				if (potion[1]){
					await potion[0].save().then(async p => {return await p.reload()});
				}

				potion = potion[0];

				await potion.increment('amount', {by: amount}).then(async p => await p.save()).then(async p => {return await p.reload()});
				
				await checkHintPotionEquip(await grabUser(interaction.user.id), interaction);

				return potion;
			}

			/**
			 * This function creates a new tool entry if one is not found, 
			 * it then updates the entry amount based on the amount given.
			 * @param {object} bpObj Full Blueprint Object Container
			 * @param {number} amount Amount to craft
			 * @returns {Promise<object>}
			 */
			async function handleToolCraft(bpObj, amount){
				const bpCraft = bpObj.craft, bpEffect = bpObj.effect;
				let tool = await OwnedTools.findOrCreate({
					where: {
						name: bpCraft.Name,
						spec_id: interaction.user.id
					}, 
					defaults: {
						activecategory: bpEffect.Type,
						activesubcategory: bpEffect.SubType,
						passivecategory: "Tool",
						rarity: bpCraft.Rarity,
						rar_id: bpCraft.Rar_id,
						tool_id: bpCraft.ToolID,
						blueprintid: bpCraft.BlueprintID
					}
				});

				if (tool[1]){
					await tool[0].save().then(async t => {return await t.reload()});
				}

				tool = tool[0];

				await tool.increment('amount', {by: amount}).then(async t => await t.save()).then(async t => {return await t.reload()});
				
				await checkHintPigmyGive(await grabUser(interaction.user.id), interaction);

				return tool;
			}

			/**
			 * This function handles filtering and loading all currently craftable user owned blueprints,
			 * returns ``{outcome: ("Empty Filter" || "Empty Craft")}`` if no blueprints are found/available.
			 * @param {string} filterType BP Type to filter by
			 * @param {object[]} ownedBPList Full List of Owned Blueprints
			 * @returns {Promise <{outcome: string, embeds: EmbedBuilder[], bpRefs: object[]}>}
			 */
			async function loadBPPages(filterType, ownedBPList){
				const finalObj = {outcome: "", embeds: [], bpRefs: []};

				let filteredList;
				switch(filterType){
					case "Potion":
						filteredList = ownedBPList.filter(bp => bp.passivecategory === "Potion");
					break;
					case "Tool":
						filteredList = ownedBPList.filter(bp => bp.passivecategory === "Tool");
					break;
					case "All":
						filteredList = ownedBPList;
					break;
				}

				if (filteredList.length === 0) {
					finalObj.outcome = "Empty Filter";
					return finalObj;
				}

				const ownedMatList = await MaterialStore.findAll({where: {spec_id: interaction.user.id}});

				const canCraftList = [];
				for (const bluey of filteredList){
					const bpMatch = masterBPCrafts.get(bluey.name);
					if (!bpMatch) continue;

					let matCheckFail = false;
					for (const matCraft of bpMatch.CraftList){
						const userMatMatch = ownedMatList.filter(mat => mat.name === matCraft.Name);
						if (userMatMatch.length === 0 || userMatMatch[0].amount < matCraft.Amount){
							matCheckFail = true;
							break;
						}
					}

					if (matCheckFail) continue;
					canCraftList.push(bluey);
				}

				if (canCraftList.length === 0){
					finalObj.outcome = "Empty Craft";
					return finalObj;
				}

				for (const bluey of canCraftList){
					// Used as Object {single: boolean, craft: object, effect: object, neededMats: object[], ownedMats: object[]}
					const finalRefObj = {single: false, craft: "", effect: "", neededMats: [], ownedMats: []};

					const bpMatch = masterBPCrafts.get(bluey.name);
					//if (!bpMatch) continue;
					const exrEff = masterBPEffects.get(bluey.name);

					finalRefObj.craft = bpMatch;
					finalRefObj.effect = exrEff;
					if (!bpMatch.Dupe) finalRefObj.single = true;
					
					const finalFields = [];
					for (const matCraft of bpMatch.CraftList){
						const userMatMatch = ownedMatList.filter(mat => mat.name === matCraft.Name);
						const matAmountOwned = (userMatMatch.length !== 0) ? userMatMatch[0].amount : 0;
						const matRefObj = handleMatNameFilter(matCraft.Name, materialFiles);


						finalRefObj.neededMats.push({name: matCraft.Name, baseAmount: matCraft.Amount}); // type: matRefObj.matType, rarity: matRefObj.matRef.Rarity,
						finalRefObj.ownedMats.push({name: matCraft.Name, totAmount: matAmountOwned}); //  type: matRefObj.matType, rarity: matRefObj.matRef.Rarity,


						const finalValue = `Type: **${makeCapital(matRefObj.matType)}**\nRarity: **${matRefObj.matRef.Rarity}**\n(Owned/Needed) Amount:  **${matAmountOwned}**/${matCraft.Amount}`;

						//const statusEmoji = (matAmountOwned >= matCraft.Amount) ? '✅' : (matAmountOwned > 0) ? '❔': '❌';

						finalFields.push({name: `= **${matCraft.Name}** =`, value: finalValue}); // ${statusEmoji}
					}

					let dynDesc;
					switch(bluey.passivecategory){
						case "Potion":
							dynDesc = `Potion Effect: **${bpMatch.Description}**\nRarity: **${bpMatch.Rarity}**\nLevel Required: **${bpMatch.Level}**\nCraft Cost: **${bpMatch.Cost}**c\nPotion Duration: **${exrEff.Duration}**\nPotion Cooldown: **${exrEff.Cooldown}**\nMaterials Required: `;
						break;
						case "Tool":
							dynDesc = `Used with **${exrEff.Type}** as **${exrEff.SubType}**\nTool Effect: ${bpMatch.Description}\nRarity: **${bpMatch.Rarity}**\nLevel Required: **${bpMatch.Level}**\nCraft Cost: **${bpMatch.Cost}**c\nMaterials Required: `;
						break;
					}

					//dynDesc += '\n\nMaterial Amount Reached: ✅\nMaterial Owned but Amount is *Below* needed: ❔\nMaterial **Not** Owned: ❌';

					const embedColour = grabColour(bpMatch.Rar_id);
					const embed = new EmbedBuilder()
					.setTitle(`== ${bluey.name} ==`)
					.setDescription(dynDesc)
					.setColor(embedColour)
					.addFields(finalFields);

					finalObj.embeds.push(embed);
					finalObj.bpRefs.push(finalRefObj);
				}

				finalObj.outcome = "Loaded";
				return finalObj;
			}

			/**
			 * This function calculates the max number able to be crafted for the given blueprint,
			 * based on the users owned materials.
			 * @param {object} bpRef Blueprint Picked Ref Obj
			 * @returns {number}
			 */
			function handleMaxCraftAmount(bpRef){
				// finalRefObj.neededMats.push({name: matCraft.Name, baseAmount: matCraft.Amount});
				// finalRefObj.ownedMats.push({name: userMatMatch[0].Name, totAmount: matAmountOwned});

				let craftMax = 0;
				for (let i = 0; i < bpRef.neededMats.length; i++){
					const curCheck = Math.floor(bpRef.ownedMats[i].totAmount / bpRef.neededMats[i].baseAmount);
					if (craftMax === 0) craftMax = curCheck;
					if (craftMax > 0 && curCheck < craftMax) craftMax = curCheck; 
				}

				return craftMax;
			}

			/**
			 * This function creates valid embed field objects displaying the material amounts,
			 * given the current blueprint amount to be crafted.
			 * @param {object} bpMenuRef Menu Nav Object
			 * @returns {{name: string, value: string}[]}
			 */
			function handleCurMatAmountDisplay(bpMenuRef){
				const finalFields = [];
				for (let i = -1; i < bpMenuRef.bpPicked.neededMats.length; i++){
					if (i === -1){
						finalFields.push({name: `== Total Coin Cost: ==`, value: `**${bpMenuRef.bpPicked.craft.Cost * bpMenuRef.makeAmount}**c`});
						continue;
					}

					const cMat = bpMenuRef.bpPicked.neededMats[i], uMat = bpMenuRef.bpPicked.ownedMats[i];

					const finalValue = `Amount Required Per Craft: **${cMat.baseAmount}**\nTotal Amount Required: **${cMat.baseAmount * bpMenuRef.makeAmount}**\nAmount Owned: **${uMat.totAmount}**`;

					finalFields.push({name: `= **${cMat.name}** =`, value: finalValue});
				}
				return finalFields;
			}

			/**
			 * This function loads the embed field objects for the final costs for the given blueprint and amount.
			 * @param {object} bpMenuRef Menu Nav Object
			 * @returns {{name: string, value: string}[]}
			 */
			function handleFinalCraftDisplay(bpMenuRef){
				const finalFields = [];
				for (let i = -1; i < bpMenuRef.bpPicked.neededMats.length; i++){
					if (i === -1){
						finalFields.push({name: `== Total Coin Cost: ==`, value: `**${bpMenuRef.bpPicked.craft.Cost * bpMenuRef.makeAmount}**c`});
						continue;
					}

					const cMat = bpMenuRef.bpPicked.neededMats[i];

					const finalValue = `Total Amount Required: **${cMat.baseAmount * bpMenuRef.makeAmount}**`;

					finalFields.push({name: `= **${cMat.name}** =`, value: finalValue});
				}
				return finalFields;
			}




			// const selectMenu = await interaction.reply({
			// 	embeds: [entryEmbed],
			// 	components: [selectRow],
			// });

			// const filterString = (i) => i.user.id === interaction.user.id;

			// const stringCollector = selectMenu.createMessageComponentCollector({
			// 	componentType: ComponentType.StringSelect,
			// 	filterString,
			// 	time: 120000
			// });

			// let pickedOption = 'None';
			// stringCollector.on('collect', async ICS => {
			// 	pickedOption = ICS.values[0];
			// 	await stringCollector.stop();
			// });

			// stringCollector.on('end', async () => {
			// 	if (pickedOption === 'None') {
			// 		return selectMenu.delete().catch(error => {
			// 			if (error.code !== 10008) {
			// 				console.error('Failed to delete the message:', error);
			// 			}
			// 		});
			// 	} 

			// 	let bpsToShow;
			// 	switch(pickedOption){
			// 		// case "equip":
			// 		// 	bpsToShow = allBlueprintsList.filter(bluey => bluey.passivecategory === 'Equip');
			// 		// break;
			// 		case "potion":
			// 			bpsToShow = allBlueprintsList.filter(bluey => bluey.passivecategory === 'Potion');
			// 		break;
			// 		case "tool":
			// 			bpsToShow = allBlueprintsList.filter(bluey => bluey.passivecategory === 'Tool');
			// 		break;
			// 		case "all":
			// 			bpsToShow = allBlueprintsList;
			// 		break;
			// 	}

			// 	await selectMenu.delete().catch(error => {
			// 		if (error.code !== 10008) {
			// 			console.error('Failed to delete the message:', error);
			// 		}
			// 	});
			// 	if (bpsToShow.length <= 0) return await interaction.followUp('No Blueprints of that type found!');
			// 	return mainBlueyHandler(bpsToShow, pickedOption);
			// });
		}

		/**
		 * 
		 * @param {Object[]} bpList Full list of owned blueprints stored in database for user
		 * @param {String} stringChoice String used to filter by type &| show all blueprints
		 * @returns Void
		 */
		async function mainBlueyHandler(bpList, stringChoice){
			const userMaterials = await MaterialStore.findAll({where: {spec_id: interaction.user.id}});
			const stringChoiceComp = stringChoice;
			const amount = interaction.options.getInteger('amount') ?? 1;
			
			const embedPages = [];
			const finalBpObj = [];
			const matCostList = [];

			for (const bluey of bpList){
				let finalFields = [];
				let fieldName = '', fieldValue = '', fieldObj = {};
				let blueyFab = blueprintList.filter(blueFab => blueFab.BlueprintID === bluey.blueprintid);
				blueyFab = blueyFab[0];

				let finalMats = [];

				let blueyReady = true;
				const matTypeAmount = blueyFab.MaterialTypeAmount;
				for (let matPos = 0; matPos < matTypeAmount; matPos++){
					const matOwnedCheck = userMaterials.filter(mat => mat.name === blueyFab[`Material${(matPos + 1)}`] && mat.amount >= (blueyFab[`Material${(matPos + 1)}_Amount`] * amount));
					if (matOwnedCheck.length !== 1) {
						blueyReady = false;
						break;
					} else {
						fieldName = `Material ${matPos + 1}: **${blueyFab[`Material${matPos + 1}`]}**`;
						fieldValue = `Rarity: **${blueyFab[`Rarity${matPos + 1}`]}**\nAmount: **${blueyFab[`Material${matPos + 1}_Amount`]}**\nAmount Owned: **${matOwnedCheck[0].amount}**`;
						fieldObj = {name: fieldName, value: fieldValue};
						finalFields.push(fieldObj);

						const matObj = {
							name: matOwnedCheck[0].name,
							amount: blueyFab[`Material${matPos + 1}_Amount`],
						};
						finalMats.push(matObj);
					}
				}

				if (!blueyReady) continue;

				let embedDesc = '';

				// Using const asignment to repeat check value and still be able to change it
				if (stringChoiceComp === 'all') stringChoice = bluey.passivecategory.toLowerCase();

				// Switch to lowercase to prevent case error
				switch(stringChoice){
					// case "equip":
					// 	embedDesc = `Coin Cost: ${blueyFab.CoinCost} \nRequired Level: ${blueyFab.UseLevel} \nSlot: ${blueyFab.Slot} \nHands: ${blueyFab.Hands} \nRarity: ${blueyFab.Rarity} \nMaterial Types Needed: ${blueyFab.MaterialTypeAmount}`;
					// break;
					case "potion":
						embedDesc = `Coin Cost: ${blueyFab.CoinCost} \nRequired Level: ${blueyFab.UseLevel} \nDuration: ${blueyFab.Duration} \nCoolDown: ${blueyFab.CoolDown} \nMaterial Types Needed: ${blueyFab.MaterialTypeAmount}`;
					break;
					case "tool":
						embedDesc = `Coin Cost: ${blueyFab.CoinCost} \nRequired Level: ${blueyFab.UseLevel} \nRarity: ${blueyFab.Rarity} \nMaterial Types Needed: ${blueyFab.MaterialTypeAmount}`;
					break;
				}

				let embedColour = grabColour((blueyFab.Rar_id ?? 0), false);

				const embed = new EmbedBuilder()
				.setTitle(`${bluey.name}`)
				.setDescription(`${blueyFab.Description} \n${embedDesc}`)
				.setColor(embedColour)
				.addFields(finalFields);

				embedPages.push(embed);
				finalBpObj.push(bluey);
				matCostList.push(finalMats);
			}

			if (embedPages.length <= 0) return await interaction.followUp('No Blueprints ready for crafting! Use ``/blueprint view`` to see owned blueprints!');
			
			const backButton = new ButtonBuilder()
			.setLabel("Back")
			.setStyle(ButtonStyle.Secondary)
			.setEmoji('◀️')
			.setCustomId('back-page');
			
			const forwardButton = new ButtonBuilder()
			.setLabel("Forward")
			.setStyle(ButtonStyle.Secondary)
			.setEmoji('▶️')
			.setCustomId('next-page');

			const cancelButton = new ButtonBuilder()
			.setLabel("Cancel")
			.setStyle(ButtonStyle.Secondary)
			.setEmoji('*️⃣')
			.setCustomId('delete-page');

			const craftButton = new ButtonBuilder()
			.setLabel("Craft")
			.setStyle(ButtonStyle.Success)
			.setEmoji('⚒')
			.setCustomId('craft-button');

			const buttonRow = new ActionRowBuilder().addComponents(backButton, craftButton, forwardButton, cancelButton);

			const pagesMsg = await interaction.followUp({embeds: [embedPages[0]], components: [buttonRow]});

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = pagesMsg.createMessageComponentCollector({
				componentType: ComponentType.Button,
				filter,
				time: 120000,
			});

			let currentPage = 0;
			collector.on('collect', async (COI) => {
				if (COI.customId === 'next-page') {
					await COI.deferUpdate().then(async () => {
						if (currentPage === embedPages.length - 1) {
							currentPage = 0;
							await pagesMsg.edit({ embeds: [embedPages[currentPage]], components: [buttonRow] });
						} else {
							currentPage += 1;
							await pagesMsg.edit({ embeds: [embedPages[currentPage]], components: [buttonRow] });
						}
					});
				}

				if (COI.customId === 'back-page') {
					await COI.deferUpdate().then(async () => {
						if (currentPage === 0) {
							currentPage = embedPages.length - 1;
							await pagesMsg.edit({ embeds: [embedPages[currentPage]], components: [buttonRow] });
						} else {
							currentPage -= 1;
							await pagesMsg.edit({ embeds: [embedPages[currentPage]], components: [buttonRow] });
						}
					});
				}

				if (COI.customId === 'delete-page') {
					collector.stop();
				}

				if (COI.customId === 'craft-button'){
					// Attempt to craft item!!
					const result = await craftBlueprint(finalBpObj[currentPage], matCostList[currentPage], amount);
					console.log(result);
					if (result.status && result.status !== "Complete" || result.outcomeObj.status !== "Complete") {
						switch(result.status){
							case "DUPE EQUIP":
								collector.stop();
								return await interaction.followUp(`You cannot craft more than one **${finalBpObj[currentPage].name}!** It is Unique, just like you :)`);
							case "DUPE TOOL":
								collector.stop();
								return await interaction.followUp(`You cannot craft more than one **${finalBpObj[currentPage].name}!**`);
							default:
								collector.stop();
								return await interaction.followUp(`Something went wrong while crafting that! ${result.status}`);
						}
					}

					collector.stop();
					return await interaction.followUp({embeds: [result.embed]});
				}
			});

			collector.on('end', () => {
				pagesMsg.delete().catch(error => {
					if (error.code !== 10008) {
						console.error('Failed to delete the message:', error);
					}
				});
			});
		}

		async function craftBlueprint(bluey, costObj, amount){
			let theItem = {status: 'None'};
			switch(bluey.passivecategory){
				// case "Equip":
				// 	if (bluey.onlyone === true){
				// 		const dupeCheck = await UniqueCrafted.findOne({where: {spec_id: interaction.user.id, blueprintid: bluey.blueprintid}});
				// 		if (dupeCheck) return {status: "DUPE EQUIP"};
				// 	}
				// 	theItem = await createEquip(bluey);
				// break;
				case "Potion":
					theItem = await createPotion(bluey, amount);
				break;
				case "Tool":
					if (bluey.onlyone === true){
						const dupeCheck = await OwnedTools.findOne({where: {spec_id: interaction.user.id, blueprintid: bluey.blueprintid}});
						if (dupeCheck) return {status: "DUPE TOOL"};
					}
					theItem = await createTool(bluey, amount);
				break;
			}
			if (theItem.status === 'None') return {status: 'Failure: 1'};
			if (!theItem.status || theItem.status !== "Complete") return {status: "Failure: " + theItem.status};

			// Payup Resource
			const duesPaid = await payMaterials(costObj, amount);
			if (duesPaid.failed > 0) await interaction.followUp('Partial Payout Failure!!');
			let bpMatch = blueprintList.filter(blue => blue.Name === bluey.name);
			bpMatch = bpMatch[0];
			const user = await UserData.findOne({where: {userid: interaction.user.id}});
			const coinsPaid = await user.decrement('coins', {by: bpMatch.CoinCost});
			if (!coinsPaid) await interaction.followUp('Coin Payout Failure!!');

			const displayEmbed = new EmbedBuilder()
			.setTitle(`~Crafting Complete~`)
			.setColor('DarkGreen')
			.setDescription(`${bpMatch.Description}`)
			.addFields({
				name: `Amount Created: `,
				value: `${amount}`,
			});

			const finalReturn = {
				embed: displayEmbed,
				outcomeObj: theItem,
			};

			return finalReturn;
		}

		async function payMaterials(costObj, amount){
			const resultReturnObj = {
				success: 0,
				failed: 0,
			};

			for (const material of costObj){
				const storedMat = await MaterialStore.findOne({where: {name: material.name, spec_id: interaction.user.id}});
				if (storedMat.amount === (material.amount * amount)){
					// Destroy Material Entry
					const destroyed = await storedMat.destroy();
					if (destroyed) {
						resultReturnObj.success++;
						continue;
					} else {
						resultReturnObj.failed++;
						continue;
					}
				} else {
					const dec = await storedMat.decrement('amount', {by: (material.amount * amount)});
					if (dec) {
						await storedMat.save();
						resultReturnObj.success++;
						continue;
					} else {
						resultReturnObj.failed++;
						continue;
					}
				}
			}

			return resultReturnObj;
		}

		// async function createEquip(bluey){
		// 	let bpMatch = blueprintList.filter(blue => blue.Name === bluey.name);
		// 	bpMatch = bpMatch[0];

		// 	let slotCheck = bpMatch.Slot;

		// 	let dynHands = 'NONE';
		// 	let dynAtk = 0;
		// 	let dynDef = 0;
		// 	switch(slotCheck){
		// 		case "Mainhand":
		// 			dynHands = bpMatch.Hands;
		// 			dynAtk = bpMatch.Attack;
		// 		break;
		// 		case "Offhand":
		// 			dynHands = "One";
		// 			dynAtk = bpMatch.Attack;
		// 			dynDef = bpMatch.Defence;
		// 		break;
		// 		default:
		// 			dynDef = bpMatch.Defence;
		// 		break;
		// 	}

		// 	const theItem = await UniqueCrafted.create({
		// 		name: bpMatch.Name,
		// 		value: bpMatch.CoinCost,
		// 		totalkills: 0,
		// 		killsthislevel: 0,
		// 		currentlevel: 1,
		// 		Attack: dynAtk,
		// 		Defence: dynDef,
		// 		Type: bpMatch.Type,
		// 		slot: bpMatch.Slot,
		// 		hands: dynHands,
		// 		rarity: bpMatch.Rarity,
		// 		rar_id: bpMatch.Rar_id,
		// 		loot_id: bpMatch.Loot_id,
		// 		spec_id: interaction.user.id,
		// 		blueprintid: bpMatch.BlueprintID,
		// 	});

		// 	if (theItem){
		// 		const user = await UserData.findOne({where: {userid: interaction.user.id}});
		// 		await checkHintUniqueEquip(user, interaction);
		// 		return {status: "Complete", instance: theItem};
		// 	} else return {status: "Failure: UNIQUE"};
		// }

		async function createPotion(bluey, amount){
			let bpMatch = blueprintList.filter(blue => blue.Name === bluey.name);
			bpMatch = bpMatch[0];

			let potCheck = await OwnedPotions.findOne({where: {spec_id: interaction.user.id, name: bluey.name}});
			if (!potCheck){
				potCheck = await OwnedPotions.create({
					name: bluey.name,
					value: bpMatch.CoinCost,
					activecategory: bpMatch.ActiveCategory,
					duration: bpMatch.Duration,
					cooldown: bpMatch.CoolDown,
					potion_id: bpMatch.PotionID,
					blueprintid: bpMatch.BlueprintID,
					amount: 0,
					spec_id: interaction.user.id,	
				});
			}

			if (!potCheck) return {status: "Failure: POT"};

			const inc = await potCheck.increment('amount', {by: amount ?? 1});
			if (inc) {
				await potCheck.save();
				const user = await UserData.findOne({where: {userid: interaction.user.id}});
				await checkHintPotionEquip(user, interaction);
				return {status: "Complete", instance: potCheck};
			} else return {status: "Failure: POT INC"};
		}

		async function createTool(bluey, amount){
			let bpMatch = blueprintList.filter(blue => blue.Name === bluey.name);
			bpMatch = bpMatch[0];

			let toolCheck = await OwnedTools.findOne({where: {spec_id: interaction.user.id, name: bluey.name}});
			if (!toolCheck){
				toolCheck = await OwnedTools.create({
					name: bluey.name,
					spec_id: interaction.user.id,
					activecategory: bpMatch.ActiveCategory,
					activesubcategory: bpMatch.ActiveSubCategory,
					passivecategory: bpMatch.PassiveCategory,
					rarity: bpMatch.Rarity,
					rar_id: bpMatch.Rar_id,
					amount: 0,
					blueprintid: bpMatch.BlueprintID,
					tool_id: bpMatch.ToolID,
				});
			}

			if (!toolCheck) return {status: "Failure: TOOL"};

			const inc = await toolCheck.increment('amount', {by: amount ?? 1});
			if (inc) {
				const user = await UserData.findOne({where: {userid: interaction.user.id}});
				await checkHintPigmyGive(user, interaction);
				await toolCheck.save();
				return {status: "Complete", instance: toolCheck};
			} else return {status: "Failure: TOOL INC"};
		}
	},
};
