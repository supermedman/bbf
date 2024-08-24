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
const { grabColour } = require('./exported/grabRar.js');

const { checkHintPotionEquip, checkHintUniqueEquip, checkHintPigmyGive } = require('./exported/handleHints.js');

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
		

		if (interaction.options.getSubcommand() === 'view') {
			//View ALL owned blueprints

			//if (interaction.user.id !== '501177494137995264') return await interaction.reply('This command is under construction!');

			const userBPS = await OwnedBlueprints.findAll({where: {spec_id: interaction.user.id}});
			if (userBPS.length <= 0) return interaction.reply('No Blueprints Owned!');

			return buildBPDisplay(userBPS);
		}

		async function buildBPDisplay(bpList){	
			//if (bpList.length <= 0) return await interaction.reply('No Blueprints owned!');		
			const userMaterials = await MaterialStore.findAll({where: {spec_id: interaction.user.id}});
			const embedPages = [];

			for (const bluey of bpList){
				let finalFields = [];
				let fieldName = '', fieldValue = '', fieldObj = {};
				let blueyFab = blueprintList.filter(blueFab => blueFab.BlueprintID === bluey.blueprintid);
				blueyFab = blueyFab[0];

				const matTypeAmount = blueyFab.MaterialTypeAmount;
				for (let matPos = 0; matPos < matTypeAmount; matPos++){
					const matOwnedCheck = userMaterials.filter(mat => mat.name === blueyFab[`Material${(matPos + 1)}`]); //&& mat.amount >= (blueyFab[`Material${(matPos + 1)}_Amount`] * amount
					const ownedMatAmount = (matOwnedCheck.length === 1) ? matOwnedCheck[0].amount : 0;

					fieldName = `Material ${matPos + 1}: **${blueyFab[`Material${matPos + 1}`]}**`;
					fieldValue = `Rarity: **${blueyFab[`Rarity${matPos + 1}`]}**\nAmount: **${blueyFab[`Material${matPos + 1}_Amount`]}**\nAmount Owned: **${ownedMatAmount}**`;
					fieldObj = {name: fieldName, value: fieldValue};
					
					finalFields.push(fieldObj);
				}

				let embedDesc = '';

				// Using const asignment to repeat check value and still be able to change it
				let stringChoice = bluey.passivecategory.toLowerCase();

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
			}

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

			const buttonRow = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

			const pagesMsg = await interaction.reply({embeds: [embedPages[0]], components: [buttonRow]});

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

				// if (COI.customId === 'craft-button'){
				// 	// Attempt to craft item!!
				// 	const result = await craftBlueprint(finalBpObj[currentPage], matCostList[currentPage], amount);
				// 	console.log(result);
				// 	if (result.status && result.status !== "Complete" || result.outcomeObj.status !== "Complete") {
				// 		switch(result.status){
				// 			case "DUPE EQUIP":
				// 				collector.stop();
				// 				return await interaction.followUp(`You cannot craft more than one **${finalBpObj[currentPage].name}!** It is Unique, just like you :)`);
				// 			case "DUPE TOOL":
				// 				collector.stop();
				// 				return await interaction.followUp(`You cannot craft more than one **${finalBpObj[currentPage].name}!**`);
				// 			default:
				// 				collector.stop();
				// 				return await interaction.followUp(`Something went wrong while crafting that! ${result.status}`);
				// 		}
				// 	}

				// 	collector.stop();
				// 	return await interaction.followUp({embeds: [result.embed]});
				// }
			});

			collector.on('end', () => {
				pagesMsg.delete().catch(error => {
					if (error.code !== 10008) {
						console.error('Failed to delete the message:', error);
					}
				});
			});
		}

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
				.setValue('potion'),
				new StringSelectMenuOptionBuilder()
				.setLabel('Tools')
				.setDescription('Show Tool Blueprints')
				.setValue('tool'),
				new StringSelectMenuOptionBuilder()
				.setLabel('All')
				.setDescription('Show All Blueprints')
				.setValue('all'),
			);
			
			const selectRow = new ActionRowBuilder().addComponents(bpTypeStringSelect);

			const selectMenu = await interaction.reply({
				embeds: [entryEmbed],
				components: [selectRow],
			});

			const filterString = (i) => i.user.id === interaction.user.id;

			const stringCollector = selectMenu.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				filterString,
				time: 120000
			});

			let pickedOption = 'None';
			stringCollector.on('collect', async ICS => {
				pickedOption = ICS.values[0];
				await stringCollector.stop();
			});

			stringCollector.on('end', async () => {
				if (pickedOption === 'None') {
					return selectMenu.delete().catch(error => {
						if (error.code !== 10008) {
							console.error('Failed to delete the message:', error);
						}
					});
				} 

				let bpsToShow;
				switch(pickedOption){
					// case "equip":
					// 	bpsToShow = allBlueprintsList.filter(bluey => bluey.passivecategory === 'Equip');
					// break;
					case "potion":
						bpsToShow = allBlueprintsList.filter(bluey => bluey.passivecategory === 'Potion');
					break;
					case "tool":
						bpsToShow = allBlueprintsList.filter(bluey => bluey.passivecategory === 'Tool');
					break;
					case "all":
						bpsToShow = allBlueprintsList;
					break;
				}

				await selectMenu.delete().catch(error => {
					if (error.code !== 10008) {
						console.error('Failed to delete the message:', error);
					}
				});
				if (bpsToShow.length <= 0) return await interaction.followUp('No Blueprints of that type found!');
				return mainBlueyHandler(bpsToShow, pickedOption);
			});
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
