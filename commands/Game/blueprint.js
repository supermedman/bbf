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

			// await interaction.deferReply().then(async () => {
			// 	const userData = await UserData.findOne({ where: { userid: interaction.user.id } });
			// 	if (!userData) return interaction.followUp('Welcome new user! Please use ``/start`` to begin your adventure!');

			// 	const userHasBlueprint = await OwnedBlueprints.findOne({ where: { spec_id: interaction.user.id } });
			// 	if (!userHasBlueprint) return interaction.followUp('No blueprints found!');

			// 	const allOwnedMats = await MaterialStore.findAll({ where: { spec_id: interaction.user.id } });
			// 	if (!allOwnedMats) console.log(warnedForm('NO MATERIALS FOUND!'));

			// 	const userBlueprints = await OwnedBlueprints.findAll({ where: { spec_id: interaction.user.id } });

			// 	var embedPages = [];
			// 	var availableCrafts = [];

			// 	let cancelCraftButton = new ButtonBuilder();
			// 	let cancelCraftObject;
			// 	var cancelCraftButtonPages = [];

			// 	const equipList = await userBlueprints.filter(bluey => bluey.passivecategory === 'Equip');
			// 	//console.log(specialInfoForm('equipList: ', equipList));
			// 	if (equipList.length <= 0) {
			// 		console.log(warnedForm('NO EQUIP BLUEPRINTS FOUND'));
			// 	} else {
			// 		let listedDefaults;
			// 		let grabbedMTA = 0;
			// 		let grabbedName;
			// 		let grabbedDescription;

			// 		let listedMatsName;
			// 		let listedMatsValue;
			// 		let finalFields = [];

			// 		let bpSlice = [];
			// 		let i = 0;
			// 		do {

			// 			bpSlice = await blueprintList.filter(blueySlice => blueySlice.BlueprintID === equipList[i].blueprintid);
			// 			//Blueprint reference should be found, use values for display
			// 			if (bpSlice.length > 0) {
			// 				if (bpSlice[0].Hands === undefined) {
			// 					listedDefaults = bpSlice.map(bluey =>
			// 						`Coin Cost: ${bluey.CoinCost} \nRequired Level: ${bluey.UseLevel} \nSlot: ${bluey.Slot} \nRarity: ${bluey.Rarity} \nMaterial Types Needed: ${bluey.MaterialTypeAmount}`);
			// 				} else {
			// 					listedDefaults = bpSlice.map(bluey =>
			// 						`Coin Cost: ${bluey.CoinCost} \nRequired Level: ${bluey.UseLevel} \nSlot: ${bluey.Slot} \nHands: ${bluey.Hands} \nRarity: ${bluey.Rarity} \nMaterial Types Needed: ${bluey.MaterialTypeAmount}`);
			// 				}

			// 				//fieldValueObj = { name: 'info', value: `${listedDefaults}` };
			// 				//finalFields.push(fieldValueObj);

			// 				grabbedMTA = bpSlice.map(bluey => bluey.MaterialTypeAmount);
			// 				//console.log(basicInfoForm('grabbedMTA value First: ', grabbedMTA));
			// 				grabbedName = bpSlice.map(bluey => bluey.Name);
			// 				grabbedDescription = bpSlice.map(bluey => bluey.Description);

			// 				let matStrType = '';
			// 				let matStrAmount = '';
			// 				let matStrRarity = '';
			// 				let curCheckMat;
			// 				let fieldValueObj;
			// 				let totCheckSuccess = 0;
			// 				let filteredResult = false;
			// 				for (var matPos = 0; matPos < grabbedMTA; matPos++) {
			// 					//console.log(basicInfoForm('matPos on current itteration: ', matPos));

			// 					var addingOne = (matPos + 1);

			// 					matStrType = `Material${addingOne}`;
			// 					matStrAmount = `Material${addingOne}_Amount`;

			// 					matStrRarity = `Rarity${addingOne}`;

			// 					var compValTemp = ``;

			// 					compValTemp = bpSlice.map(bluey =>
			// 						`${bluey[`${matStrType}`]}`);

			// 					var compNumTemp = ``;

			// 					compNumTemp = bpSlice.map(bluey =>
			// 						`${bluey[`${matStrAmount}`]}`);

			// 					//FIND MATERIAL FROM OWNED MATERIALS
			// 					curCheckMat = await MaterialStore.findOne({ where: [{ spec_id: interaction.user.id }, { name: compValTemp }] });
			// 					if (!curCheckMat) {
			// 						//Material not found Blueprint is unavailable to craft
			// 						//console.log(failureResult('Material Type not found blueprint discarded'));
			// 						filteredResult = false;
			// 						//finalFields = [];
			// 					} else {
			// 						if (compNumTemp <= curCheckMat.amount) {
			// 							//Player has more material than needed, check success!
			// 							//console.log(successResult('Material Type found, Material Amount suficient!'));
			// 							filteredResult = true;
			// 							totCheckSuccess++;
			// 						} else {
			// 							//console.log(failureResult('Material Amount not sufficient, blueprint discarded'));
			// 							filteredResult = true;
			// 							//finalFields = [];
			// 						}
			// 					}

			// 					if (filteredResult === true) {
			// 						//Embed: fields: {name: this}
			// 						listedMatsName = bpSlice.map(mats =>
			// 							`${matStrType}: ${mats[`${matStrType}`]}`);
			// 						//console.log(basicInfoForm('listedMatsName on current itteration ' + matPos + ': ', listedMatsName));

			// 						//Embed: fields: {value: this}
			// 						listedMatsValue = bpSlice.map(mats =>
			// 							`Rarity: ${mats[`${matStrRarity}`]} \nMaterial Type: ${curCheckMat.mattype} \nAmount Needed: ${mats[`${matStrAmount}`]} \nAmount Owned: ${curCheckMat.amount}`);
			// 						//console.log(basicInfoForm('listedMatsValue on current itteration ' + matPos + ': ', listedMatsValue));

			// 						fieldValueObj = { name: listedMatsName.toString(), value: listedMatsValue.toString(), };
			// 						//console.log(basicInfoForm('fieldValueObj on current itteration ' + matPos + ': ', fieldValueObj));

			// 						finalFields.push(fieldValueObj);
			// 					} else {
			// 						//console.log(failureResult('FilteredResult failure DURING itteration, discarding embed!'));
			// 						//Embed: fields: {name: this}
			// 						listedMatsName = bpSlice.map(mats =>
			// 							`${matStrType}: ${mats[`${matStrType}`]}`);
			// 						//console.log(basicInfoForm('listedMatsName on current itteration ' + matPos + ': ', listedMatsName));

			// 						//Embed: fields: {value: this}
			// 						listedMatsValue = bpSlice.map(mats =>
			// 							`Rarity: ${mats[`${matStrRarity}`]} \nAmount Needed: ${mats[`${matStrAmount}`]} \nAmount Owned: 0`);
			// 						//console.log(basicInfoForm('listedMatsValue on current itteration ' + matPos + ': ', listedMatsValue));

			// 						fieldValueObj = { name: listedMatsName.toString(), value: listedMatsValue.toString(), };
			// 						//console.log(basicInfoForm('fieldValueObj on current itteration ' + matPos + ': ', fieldValueObj));

			// 						finalFields.push(fieldValueObj);
			// 					}
			// 				}

			// 				//console.log(basicInfoForm('grabbedMTA value Second: ', grabbedMTA));
			// 				//console.log(basicInfoForm('finalFields.length: ', finalFields.length));

			// 				var strLength = finalFields.length.toString();

			// 				if (strLength === grabbedMTA.toString()) {
			// 					//console.log(successResult('finalFields Values: ', finalFields));

			// 					let embedColour = 0o0;
			// 					if (bpSlice[0].Rar_id) {
			// 						embedColour = await grabColour(bpSlice[0].Rar_id, false);
			// 					}

			// 					const embed = {
			// 						title: `${grabbedName}`,
			// 						color: embedColour,
			// 						description: `**${grabbedDescription}** \n${listedDefaults}`,
			// 						fields: finalFields,
			// 					};

			// 					embedPages.push(embed);

			// 					if (totCheckSuccess.toString() === grabbedMTA.toString()) {
			// 						//Enable craft button in place of cancel button
			// 						cancelCraftObject = {
			// 							label: "Craft!",
			// 							style: ButtonStyle.Success,
			// 							emoji: "⚒",
			// 							customid: 'craft-page',
			// 						};
			// 						cancelCraftButtonPages.push(cancelCraftObject);
			// 						availableCrafts.push(bpSlice[0]);
			// 					} else {
			// 						cancelCraftObject = {
			// 							label: "Cancel",
			// 							style: ButtonStyle.Secondary,
			// 							emoji: "*️⃣",
			// 							customid: 'delete-page',
			// 						};
			// 						cancelCraftButtonPages.push(cancelCraftObject);
			// 						availableCrafts.push({ Name: 'NONE' });
			// 					}
			// 				} else console.log(errorForm('MISSALIGNED FIELD VALUES, SOMETHING WENT WRONG!'));

			// 			} else console.log(failureResult('BLUEPRINT PREFAB ASSIGNMENT FAILURE!'));

			// 			i++;
			// 			bpSlice = [];
			// 			finalFields = [];
			// 		} while (i < equipList.length)
			// 	}
			// 	//RUN THROUGH POTION BLUEPRINTS SECOND
			// 	const potionList = await userBlueprints.filter(bluey => bluey.passivecategory === 'Potion');
			// 	//console.log(specialInfoForm('potionList: ', potionList));
			// 	if (potionList.length <= 0) {
			// 		console.log(warnedForm('NO POTION BLUEPRINTS FOUND'));
			// 	} else {
			// 		let listedDefaultsP;
			// 		let grabbedMTAP = 0;
			// 		let grabbedNameP;
			// 		let grabbedDescriptionP;

			// 		let listedMatsNameP;
			// 		let listedMatsValueP;
			// 		let finalFieldsP = [];

			// 		let bpSliceP = [];
			// 		let iP = 0;
			// 		do {
			// 			bpSliceP = await blueprintList.filter(blueySlice => blueySlice.BlueprintID === potionList[iP].blueprintid);
			// 			//Blueprint reference should be found, use values for display
			// 			if (bpSliceP.length > 0) {
			// 				listedDefaultsP = bpSliceP.map(bluey =>
			// 					`Coin Cost: ${bluey.CoinCost} \nRequired Level: ${bluey.UseLevel} \nDuration: ${bluey.Duration} \nCoolDown: ${bluey.CoolDown} \nMaterial Types Needed: ${bluey.MaterialTypeAmount}`);

			// 				grabbedMTAP = bpSliceP.map(bluey => bluey.MaterialTypeAmount);
			// 				//console.log(basicInfoForm('grabbedMTA value First: ', grabbedMTAP));
			// 				grabbedNameP = bpSliceP.map(bluey => bluey.Name);
			// 				grabbedDescriptionP = bpSliceP.map(bluey => bluey.Description);

			// 				let matStrTypeP = '';
			// 				let matStrAmountP = '';
			// 				let matStrRarityP = '';
			// 				let fieldValueObjP;
			// 				let totCheckSuccessP = 0;
			// 				let filteredResult = false;
			// 				for (var matPos = 0; matPos < grabbedMTAP; matPos++) {
			// 					//console.log(basicInfoForm('matPos on current itteration: ', matPos));

			// 					var addingOne = (matPos + 1);

			// 					matStrTypeP = `Material${addingOne}`;
			// 					matStrAmountP = `Material${addingOne}_Amount`;

			// 					matStrRarityP = `Rarity${addingOne}`;

			// 					var compValTemp = ``;

			// 					compValTemp = bpSliceP.map(bluey =>
			// 						`${bluey[`${matStrTypeP}`]}`);

			// 					var compNumTemp = ``;

			// 					compNumTemp = bpSliceP.map(bluey =>
			// 						`${bluey[`${matStrAmountP}`]}`);

			// 					//FIND MATERIAL FROM OWNED MATERIALS
			// 					curCheckMat = await MaterialStore.findOne({ where: [{ spec_id: interaction.user.id }, { name: compValTemp }] });
			// 					if (!curCheckMat) {
			// 						//Material not found Blueprint is unavailable to craft
			// 						//console.log(failureResult('Material Type not found blueprint discarded'));
			// 						filteredResult = false;
			// 						//finalFieldsP = [];
			// 						//matPos = grabbedMTAP;
			// 					} else {
			// 						if (compNumTemp <= curCheckMat.amount) {
			// 							//Player has more material than needed, check success!
			// 							//console.log(successResult('Material Type found, Material Amount suficient!'));
			// 							filteredResult = true;
			// 							totCheckSuccessP++;
			// 						} else {
			// 							//console.log(failureResult('Material Amount not sufficient, blueprint discarded'));
			// 							filteredResult = true;
			// 							//finalFieldsP = [];
			// 							//matPos = grabbedMTAP;
			// 						}
			// 					}

			// 					if (filteredResult === true) {
			// 						//Embed: fields: {name: this}
			// 						listedMatsNameP = bpSliceP.map(mats =>
			// 							`${matStrTypeP}: ${mats[`${matStrTypeP}`]}`);
			// 						//console.log(basicInfoForm('listedMatsName on current itteration ' + matPos + ': ', listedMatsNameP));

			// 						//Embed: fields: {value: this}
			// 						listedMatsValueP = bpSliceP.map(mats =>
			// 							`Rarity: ${mats[`${matStrRarityP}`]} \nMaterial Type: ${curCheckMat.mattype} \nAmount Needed: ${mats[`${matStrAmountP}`]} \nAmount Owned: ${curCheckMat.amount}`);
			// 						//console.log(basicInfoForm('listedMatsValue on current itteration ' + matPos + ': ', listedMatsValueP));

			// 						fieldValueObjP = { name: listedMatsNameP.toString(), value: listedMatsValueP.toString(), };
			// 						//console.log(basicInfoForm('fieldValueObj on current itteration ' + matPos + ': ', fieldValueObjP));

			// 						finalFieldsP.push(fieldValueObjP);

			// 					} else {
			// 						//console.log(failureResult('FilteredResult failure DURING itteration, discarding embed!'));

			// 						//Embed: fields: {name: this}
			// 						listedMatsNameP = bpSliceP.map(mats =>
			// 							`${matStrTypeP}: ${mats[`${matStrTypeP}`]}`);
			// 						//console.log(basicInfoForm('listedMatsName on current itteration ' + matPos + ': ', listedMatsNameP));

			// 						//Embed: fields: {value: this}
			// 						listedMatsValueP = bpSliceP.map(mats =>
			// 							`Rarity: ${mats[`${matStrRarityP}`]} \nAmount Needed: ${mats[`${matStrAmountP}`]} \nAmount Owned: 0`);
			// 						//console.log(basicInfoForm('listedMatsValue on current itteration ' + matPos + ': ', listedMatsValueP));

			// 						fieldValueObjP = { name: listedMatsNameP.toString(), value: listedMatsValueP.toString(), };
			// 						//console.log(basicInfoForm('fieldValueObj on current itteration ' + matPos + ': ', fieldValueObjP));

			// 						finalFieldsP.push(fieldValueObjP);

			// 					}
			// 				}

			// 				var strLength = finalFieldsP.length.toString();

			// 				if (strLength === grabbedMTAP.toString()) {
			// 					//console.log(successResult('finalFields Values: ', finalFieldsP));

			// 					let embedColour = 0o0;
			// 					if (bpSliceP[0].Rar_id) {
			// 						embedColour = await grabColour(bpSliceP[0].Rar_id, false);
			// 					}

			// 					const embed = {
			// 						title: `${grabbedNameP}`,
			// 						color: embedColour,
			// 						description: `**${grabbedDescriptionP}** \n${listedDefaultsP}`,
			// 						fields: finalFieldsP,
			// 					};

			// 					embedPages.push(embed);

			// 					if (totCheckSuccessP.toString() === grabbedMTAP.toString()) {
			// 						//Enable craft button in place of cancel button
			// 						cancelCraftObject = {
			// 							label: "Craft!",
			// 							style: ButtonStyle.Success,
			// 							emoji: "⚒",
			// 							customid: 'craft-page',
			// 						};
			// 						cancelCraftButtonPages.push(cancelCraftObject);
			// 						availableCrafts.push(bpSliceP[0]);
			// 					} else {
			// 						cancelCraftObject = {
			// 							label: "Cancel",
			// 							style: ButtonStyle.Secondary,
			// 							emoji: "*️⃣",
			// 							customid: 'delete-page',
			// 						};
			// 						cancelCraftButtonPages.push(cancelCraftObject);
			// 						availableCrafts.push({ Name: 'NONE' });
			// 					}

			// 				} else console.log(errorForm('MISSALIGNED FIELD VALUES, SOMETHING WENT WRONG!'));
			// 			} else console.log(failureResult('BLUEPRINT PREFAB ASSIGNMENT FAILURE!'));
			// 			iP++;
			// 			bpSliceP = [];
			// 			finalFieldsP = [];
			// 		} while (iP < potionList.length)
			// 	}
			// 	//RUN THROUGH TOOL BLUEPRINTS THIRD
			// 	const toolList = userBlueprints.filter(bluey => bluey.passivecategory === 'Tool');
			// 	if (toolList.length <= 0) {
			// 		console.log(warnedForm('NO TOOL BLUEPRINTS FOUND'));
			// 	} else {
			// 		let listedDefaults;
			// 		let grabbedMTA = 0;
			// 		let grabbedName;
			// 		let grabbedDescription;

			// 		let listedMatsName;
			// 		let listedMatsValue;
			// 		let finalFields = [];

			// 		let bpSlice = [];
			// 		let i = 0;
			// 		do {

			// 			bpSlice = await blueprintList.filter(blueySlice => blueySlice.BlueprintID === toolList[i].blueprintid);
			// 			//Blueprint reference should be found, use values for display
			// 			if (bpSlice.length > 0) {
			// 				listedDefaults = bpSlice.map(bluey =>
			// 					`Coin Cost: ${bluey.CoinCost} \nRequired Level: ${bluey.UseLevel} \nSlot: ${bluey.ActiveSubCategory} \nRarity: ${bluey.Rarity} \nMaterial Types Needed: ${bluey.MaterialTypeAmount}`);


			// 				//fieldValueObj = { name: 'info', value: `${listedDefaults}` };
			// 				//finalFields.push(fieldValueObj);

			// 				grabbedMTA = bpSlice.map(bluey => bluey.MaterialTypeAmount);
			// 				//console.log(basicInfoForm('grabbedMTA value First: ', grabbedMTA));
			// 				grabbedName = bpSlice.map(bluey => bluey.Name);
			// 				grabbedDescription = bpSlice.map(bluey => bluey.Description);

			// 				let matStrType = '';
			// 				let matStrAmount = '';
			// 				let matStrRarity = '';
			// 				let curCheckMat;
			// 				let fieldValueObj;
			// 				let totCheckSuccess = 0;
			// 				let filteredResult = false;
			// 				for (var matPos = 0; matPos < grabbedMTA; matPos++) {
			// 					//console.log(basicInfoForm('matPos on current itteration: ', matPos));

			// 					var addingOne = (matPos + 1);

			// 					matStrType = `Material${addingOne}`;
			// 					matStrAmount = `Material${addingOne}_Amount`;

			// 					matStrRarity = `Rarity${addingOne}`;

			// 					var compValTemp = ``;

			// 					compValTemp = bpSlice.map(bluey =>
			// 						`${bluey[`${matStrType}`]}`);

			// 					var compNumTemp = ``;

			// 					compNumTemp = bpSlice.map(bluey =>
			// 						`${bluey[`${matStrAmount}`]}`);

			// 					//FIND MATERIAL FROM OWNED MATERIALS
			// 					curCheckMat = await MaterialStore.findOne({ where: [{ spec_id: interaction.user.id }, { name: compValTemp }] });
			// 					if (!curCheckMat) {
			// 						//Material not found Blueprint is unavailable to craft
			// 						//console.log(failureResult('Material Type not found blueprint discarded'));
			// 						filteredResult = false;
			// 						//finalFields = [];
			// 					} else {
			// 						if (compNumTemp <= curCheckMat.amount) {
			// 							//Player has more material than needed, check success!
			// 							//console.log(successResult('Material Type found, Material Amount suficient!'));
			// 							filteredResult = true;
			// 							totCheckSuccess++;
			// 						} else {
			// 							//console.log(failureResult('Material Amount not sufficient, blueprint discarded'));
			// 							filteredResult = true;
			// 							//finalFields = [];
			// 						}
			// 					}

			// 					if (filteredResult === true) {
			// 						//Embed: fields: {name: this}
			// 						listedMatsName = bpSlice.map(mats =>
			// 							`${matStrType}: ${mats[`${matStrType}`]}`);
			// 						//console.log(basicInfoForm('listedMatsName on current itteration ' + matPos + ': ', listedMatsName));

			// 						//Embed: fields: {value: this}
			// 						listedMatsValue = bpSlice.map(mats =>
			// 							`Rarity: ${mats[`${matStrRarity}`]} \nMaterial Type: ${curCheckMat.mattype} \nAmount Needed: ${mats[`${matStrAmount}`]} \nAmount Owned: ${curCheckMat.amount}`);
			// 						//console.log(basicInfoForm('listedMatsValue on current itteration ' + matPos + ': ', listedMatsValue));

			// 						fieldValueObj = { name: listedMatsName.toString(), value: listedMatsValue.toString(), };
			// 						//console.log(basicInfoForm('fieldValueObj on current itteration ' + matPos + ': ', fieldValueObj));

			// 						finalFields.push(fieldValueObj);
			// 					} else {
			// 						//console.log(failureResult('FilteredResult failure DURING itteration, discarding embed!'));
			// 						//Embed: fields: {name: this}
			// 						listedMatsName = bpSlice.map(mats =>
			// 							`${matStrType}: ${mats[`${matStrType}`]}`);
			// 						//console.log(basicInfoForm('listedMatsName on current itteration ' + matPos + ': ', listedMatsName));

			// 						//Embed: fields: {value: this}
			// 						listedMatsValue = bpSlice.map(mats =>
			// 							`Rarity: ${mats[`${matStrRarity}`]} \nAmount Needed: ${mats[`${matStrAmount}`]} \nAmount Owned: 0`);
			// 						//console.log(basicInfoForm('listedMatsValue on current itteration ' + matPos + ': ', listedMatsValue));

			// 						fieldValueObj = { name: listedMatsName.toString(), value: listedMatsValue.toString(), };
			// 						//console.log(basicInfoForm('fieldValueObj on current itteration ' + matPos + ': ', fieldValueObj));

			// 						finalFields.push(fieldValueObj);
			// 					}
			// 				}

			// 				//console.log(basicInfoForm('grabbedMTA value Second: ', grabbedMTA));
			// 				//console.log(basicInfoForm('finalFields.length: ', finalFields.length));

			// 				var strLength = finalFields.length.toString();

			// 				if (strLength === grabbedMTA.toString()) {
			// 					//console.log(successResult('finalFields Values: ', finalFields));

			// 					let embedColour = 0o0;
			// 					if (bpSlice[0].Rar_id) {
			// 						embedColour = await grabColour(bpSlice[0].Rar_id);
			// 					}

			// 					const embed = {
			// 						title: `${grabbedName}`,
			// 						color: embedColour,
			// 						description: `**${grabbedDescription}** \n${listedDefaults}`,
			// 						fields: finalFields,
			// 					};

			// 					embedPages.push(embed);

			// 					if (totCheckSuccess.toString() === grabbedMTA.toString()) {
			// 						//Enable craft button in place of cancel button
			// 						cancelCraftObject = {
			// 							label: "Craft!",
			// 							style: ButtonStyle.Success,
			// 							emoji: "⚒",
			// 							customid: 'craft-page',
			// 						};
			// 						cancelCraftButtonPages.push(cancelCraftObject);
			// 						availableCrafts.push(bpSlice[0]);
			// 					} else {
			// 						cancelCraftObject = {
			// 							label: "Cancel",
			// 							style: ButtonStyle.Secondary,
			// 							emoji: "*️⃣",
			// 							customid: 'delete-page',
			// 						};
			// 						cancelCraftButtonPages.push(cancelCraftObject);
			// 						availableCrafts.push({ Name: 'NONE' });
			// 					}
			// 				} else console.log(errorForm('MISSALIGNED FIELD VALUES, SOMETHING WENT WRONG!'));

			// 			} else console.log(failureResult('BLUEPRINT PREFAB ASSIGNMENT FAILURE!'));

			// 			i++;
			// 			bpSlice = [];
			// 			finalFields = [];
			// 		} while (i < toolList.length)
			// 	}

			// 	const backButton = new ButtonBuilder()
			// 		.setLabel("Back")
			// 		.setStyle(ButtonStyle.Secondary)
			// 		.setEmoji('◀️')
			// 		.setCustomId('back-page');

			// 	//const cancelButton = new ButtonBuilder()
			// 	//	.setLabel("Cancel")
			// 	//	.setStyle(ButtonStyle.Secondary)
			// 	//	.setEmoji('*️⃣')
			// 	//	.setCustomId('delete-page');

			// 	cancelCraftButton.setLabel(cancelCraftButtonPages[0].label);
			// 	cancelCraftButton.setStyle(cancelCraftButtonPages[0].style);
			// 	cancelCraftButton.setEmoji(cancelCraftButtonPages[0].emoji);
			// 	cancelCraftButton.setCustomId(cancelCraftButtonPages[0].customid);

			// 	const forwardButton = new ButtonBuilder()
			// 		.setLabel("Forward")
			// 		.setStyle(ButtonStyle.Secondary)
			// 		.setEmoji('▶️')
			// 		.setCustomId('next-page');

			// 	const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelCraftButton, forwardButton);
			// 	//const cancelCraftButtons = new ActionRowBuilder().from(firstCancelCraftButton);


			// 	const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

			// 	const filter = (ID) => ID.user.id === interaction.user.id;

			// 	const collector = embedMsg.createMessageComponentCollector({
			// 		componentType: ComponentType.Button,
			// 		filter,
			// 		time: 300000,
			// 	});

			// 	var currentPage = 0;

			// 	collector.on('collect', async (collInteract) => {
			// 		if (collInteract.customId === 'next-page') {
			// 			await collInteract.deferUpdate().then(async () => {
			// 				if (currentPage === embedPages.length - 1) {
			// 					currentPage = 0;
			// 					await embedMsg.edit({ embeds: [embedPages[currentPage]] });
			// 					cancelCraftButton.setLabel(cancelCraftButtonPages[currentPage].label);
			// 					cancelCraftButton.setStyle(cancelCraftButtonPages[currentPage].style);
			// 					cancelCraftButton.setEmoji(cancelCraftButtonPages[currentPage].emoji);
			// 					cancelCraftButton.setCustomId(cancelCraftButtonPages[currentPage].customid);
			// 					await collInteract.editReply({ components: [interactiveButtons] });
			// 				} else {
			// 					currentPage += 1;
			// 					await embedMsg.edit({ embeds: [embedPages[currentPage]] });
			// 					cancelCraftButton.setLabel(cancelCraftButtonPages[currentPage].label);
			// 					cancelCraftButton.setStyle(cancelCraftButtonPages[currentPage].style);
			// 					cancelCraftButton.setEmoji(cancelCraftButtonPages[currentPage].emoji);
			// 					cancelCraftButton.setCustomId(cancelCraftButtonPages[currentPage].customid);
			// 					await collInteract.editReply({ components: [interactiveButtons] });
			// 				}
			// 			}).catch(error => {
			// 				if (error.code !== 10062) {
			// 					console.error('Failed to delete the message:', error);
			// 				}
			// 			});
			// 		}

			// 		if (collInteract.customId === 'back-page') {
			// 			await collInteract.deferUpdate().then(async () => {
			// 				if (currentPage === 0) {
			// 					currentPage = embedPages.length - 1;
			// 					await embedMsg.edit({ embeds: [embedPages[currentPage]] });
			// 					cancelCraftButton.setLabel(cancelCraftButtonPages[currentPage].label);
			// 					cancelCraftButton.setStyle(cancelCraftButtonPages[currentPage].style);
			// 					cancelCraftButton.setEmoji(cancelCraftButtonPages[currentPage].emoji);
			// 					cancelCraftButton.setCustomId(cancelCraftButtonPages[currentPage].customid);
			// 					await collInteract.editReply({ components: [interactiveButtons] });
			// 				} else {
			// 					currentPage -= 1;
			// 					await embedMsg.edit({ embeds: [embedPages[currentPage]] });
			// 					cancelCraftButton.setLabel(cancelCraftButtonPages[currentPage].label);
			// 					cancelCraftButton.setStyle(cancelCraftButtonPages[currentPage].style);
			// 					cancelCraftButton.setEmoji(cancelCraftButtonPages[currentPage].emoji);
			// 					cancelCraftButton.setCustomId(cancelCraftButtonPages[currentPage].customid);
			// 					await collInteract.editReply({ components: [interactiveButtons] });
			// 				}
			// 			}).catch(error => {
			// 				if (error.code !== 10062) {
			// 					console.error('Failed to delete the message:', error);
			// 				}
			// 			});

			// 		}

			// 		if (collInteract.customId === 'delete-page') {
			// 			await collInteract.deferUpdate();
			// 			await collector.stop();
			// 		}

			// 		if (collInteract.customId === 'craft-page') {
			// 			await collInteract.deferUpdate();
			// 			await collector.stop();
			// 			console.log(specialInfoForm('availableCrafts[currentPage].Name DATA: ', availableCrafts[currentPage].Name));
			// 			await craftFromBlueprint(availableCrafts[currentPage], interaction, 1);
			// 		}

			// 		if (!collInteract) {
			// 			await collector.stop();
			// 		}
			// 	});

			// 	collector.on('end', () => {
			// 		if (embedMsg) {
			// 			embedMsg.delete().catch(error => {
			// 				if (error.code !== 10008) {
			// 					console.error('Failed to delete the message:', error);
			// 				}
			// 			});
			// 		}
			// 	});
			// }).catch(error => {
			// 	console.error(errorForm(error));
			// });
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
					case "equip":
						embedDesc = `Coin Cost: ${blueyFab.CoinCost} \nRequired Level: ${blueyFab.UseLevel} \nSlot: ${blueyFab.Slot} \nHands: ${blueyFab.Hands} \nRarity: ${blueyFab.Rarity} \nMaterial Types Needed: ${blueyFab.MaterialTypeAmount}`;
					break;
					case "potion":
						embedDesc = `Coin Cost: ${blueyFab.CoinCost} \nRequired Level: ${blueyFab.UseLevel} \nDuration: ${blueyFab.Duration} \nCoolDown: ${blueyFab.CoolDown} \nMaterial Types Needed: ${blueyFab.MaterialTypeAmount}`;
					break;
					case "tool":
						embedDesc = `Coin Cost: ${blueyFab.CoinCost} \nRequired Level: ${blueyFab.UseLevel} \nRarity: ${blueyFab.Rarity} \nMaterial Types Needed: ${blueyFab.MaterialTypeAmount}`;
					break;
				}

				let embedColour = await grabColour((blueyFab.Rar_id ?? 0), false);

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
				new StringSelectMenuOptionBuilder()
				.setLabel('Equipment')
				.setDescription('Show Equipment Blueprints')
				.setValue('equip'),
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
					case "equip":
						bpsToShow = allBlueprintsList.filter(bluey => bluey.passivecategory === 'Equip');
					break;
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
					case "equip":
						embedDesc = `Coin Cost: ${blueyFab.CoinCost} \nRequired Level: ${blueyFab.UseLevel} \nSlot: ${blueyFab.Slot} \nHands: ${blueyFab.Hands} \nRarity: ${blueyFab.Rarity} \nMaterial Types Needed: ${blueyFab.MaterialTypeAmount}`;
					break;
					case "potion":
						embedDesc = `Coin Cost: ${blueyFab.CoinCost} \nRequired Level: ${blueyFab.UseLevel} \nDuration: ${blueyFab.Duration} \nCoolDown: ${blueyFab.CoolDown} \nMaterial Types Needed: ${blueyFab.MaterialTypeAmount}`;
					break;
					case "tool":
						embedDesc = `Coin Cost: ${blueyFab.CoinCost} \nRequired Level: ${blueyFab.UseLevel} \nRarity: ${blueyFab.Rarity} \nMaterial Types Needed: ${blueyFab.MaterialTypeAmount}`;
					break;
				}

				let embedColour = await grabColour((blueyFab.Rar_id ?? 0), false);

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
				case "Equip":
					if (bluey.onlyone === true){
						const dupeCheck = await UniqueCrafted.findOne({where: {spec_id: interaction.user.id, blueprintid: bluey.blueprintid}});
						if (dupeCheck) return {status: "DUPE EQUIP"};
					}
					theItem = await createEquip(bluey);
				break;
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

		async function createEquip(bluey){
			let bpMatch = blueprintList.filter(blue => blue.Name === bluey.name);
			bpMatch = bpMatch[0];

			let slotCheck = bpMatch.Slot;

			let dynHands = 'NONE';
			let dynAtk = 0;
			let dynDef = 0;
			switch(slotCheck){
				case "Mainhand":
					dynHands = bpMatch.Hands;
					dynAtk = bpMatch.Attack;
				break;
				case "Offhand":
					dynHands = "One";
					dynAtk = bpMatch.Attack;
					dynDef = bpMatch.Defence;
				break;
				default:
					dynDef = bpMatch.Defence;
				break;
			}

			const theItem = await UniqueCrafted.create({
				name: bpMatch.Name,
				value: bpMatch.CoinCost,
				totalkills: 0,
				killsthislevel: 0,
				currentlevel: 1,
				Attack: dynAtk,
				Defence: dynDef,
				Type: bpMatch.Type,
				slot: bpMatch.Slot,
				hands: dynHands,
				rarity: bpMatch.Rarity,
				rar_id: bpMatch.Rar_id,
				loot_id: bpMatch.Loot_id,
				spec_id: interaction.user.id,
				blueprintid: bpMatch.BlueprintID,
			});

			if (theItem){
				const user = await UserData.findOne({where: {userid: interaction.user.id}});
				await checkHintUniqueEquip(user, interaction);
				return {status: "Complete", instance: theItem};
			} else return {status: "Failure: UNIQUE"};
		}

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

		// async function craftFromBlueprint(theBlueprint, interaction, inputAmount) {
		// 	let thisIsBool = false;
		// 	if (theBlueprint.Rarity === 'Unique') {
		// 		thisIsBool = true;
		// 	}
		// 	if (theBlueprint.OnlyOne === true) {
		// 		thisIsBool = true;
        //     }

		// 	let cannotCraft;
		// 	if (thisIsBool === true) {
		// 		const uniqueCheck = await OwnedBlueprints.findAll({ where: [{ spec_id: interaction.user.id }, { onlyone: thisIsBool }] });
		// 		if (!uniqueCheck) return console.log(errorForm('UNIQUE BP CHECK FAILED TO FIND BP, SOMETHING WENT HORRIBLY WRONG'));
				
		// 		if (uniqueCheck) {
		// 			const filterMatch = uniqueCheck.filter(bluey => bluey.blueprintid === theBlueprint.BlueprintID);
		// 			if (filterMatch.PassiveCategory === 'Tool') {
		// 				console.log(specialInfoForm('IS TOOL!'));
		// 				cannotCraft = await OwnedTools.findOne({ where: [{ spec_id: interaction.user.id }, { name: filterMatch[0].name }, { tool_id: theBlueprint.ToolID }] });
		// 			} else if (filterMatch.PassiveCategory === 'Equip') {
		// 				console.log(specialInfoForm('IS LOOT!'));
		// 				cannotCraft = await UniqueCrafted.findOne({ where: [{ spec_id: interaction.user.id }, { name: filterMatch[0].name }, { loot_id: theBlueprint.Loot_id }] });
        //             }
					
		// 		}
		// 	}
			
		// 	if (cannotCraft) {
		// 		//This item already exists and has been crafted, notify user of this!
		// 		return interaction.followUp('You cannot craft another of these, it is unique.. JUST LIKE YOU :)');
		// 	} else {
		// 		let finalFields = [];
		// 		let grabbedMTA = theBlueprint.MaterialTypeAmount;

		// 		let listedDefaults;
				

		// 		if (theBlueprint.PassiveCategory === 'Equip') {
		// 			listedDefaults = `Coin Cost: ${theBlueprint.CoinCost} \nRequired Level: ${theBlueprint.UseLevel} \nSlot: ${theBlueprint.Slot} \nHands: ${theBlueprint.Hands} \nRarity: ${theBlueprint.Rarity} \nMaterial Types Needed: ${theBlueprint.MaterialTypeAmount}`;
		// 		} else if (theBlueprint.PassiveCategory === 'Potion') {
		// 			listedDefaults = `Coin Cost: ${theBlueprint.CoinCost} \nRequired Level: ${theBlueprint.UseLevel} \nDuration: ${theBlueprint.Duration} \nCoolDown: ${theBlueprint.CoolDown} \nMaterial Types Needed: ${theBlueprint.MaterialTypeAmount}`;
		// 		} else if (theBlueprint.PassiveCategory === 'Tool') {
		// 			listedDefaults = `Coin Cost: ${theBlueprint.CoinCost} \nRequired Level: ${theBlueprint.UseLevel} \nSlot: ${theBlueprint.ActiveSubCategory} \nRarity: ${theBlueprint.Rarity} \nMaterial Types Needed: ${theBlueprint.MaterialTypeAmount}`;
        //         }

		// 		let listedMatsName;
		// 		let listedMatsValue;

		// 		let matStrType = '';
		// 		let matStrAmount = '';
		// 		let fieldValueObj;
		// 		for (var matPos = 0; matPos < grabbedMTA; matPos++) {
		// 			//console.log(basicInfoForm('matPos on current itteration: ', matPos));

		// 			var addingOne = (matPos + 1);

		// 			matStrType = `Material${addingOne}`;
		// 			matStrAmount = `Material${addingOne}_Amount`;

		// 			//Embed: fields: {name: this}
		// 			listedMatsName = `${matStrType}: ${theBlueprint[`${matStrType}`]}`;
		// 			//console.log(basicInfoForm('listedMatsName on current itteration ' + matPos + ': ', listedMatsName));

		// 			//Embed: fields: {value: this}
		// 			if (inputAmount > 1) {
		// 				listedMatsValue = `Amount: ${(theBlueprint[`${matStrAmount}`] * inputAmount)}`;
		// 			} else if ((inputAmount === 1) || (!inputAmount)) {
		// 				listedMatsValue = `Amount: ${theBlueprint[`${matStrAmount}`]}`;
        //             }
		// 			//console.log(basicInfoForm('listedMatsValue on current itteration ' + matPos + ': ', listedMatsValue));

		// 			fieldValueObj = { name: listedMatsName.toString(), value: listedMatsValue.toString(), };
		// 			//console.log(basicInfoForm('fieldValueObj on current itteration ' + matPos + ': ', fieldValueObj));

		// 			finalFields.push(fieldValueObj);
		// 		}

		// 		const confirmEmbed = {
		// 			title: `Crafting ${theBlueprint.PassiveCategory}`,
		// 			color: 0o0,
		// 			description: `${theBlueprint.Description} \n\n${listedDefaults}`,
		// 			fields: finalFields,
		// 		}

		// 		const acceptButton = new ButtonBuilder()
		// 			.setLabel("Yes")
		// 			.setStyle(ButtonStyle.Success)
		// 			.setEmoji('✅')
		// 			.setCustomId('accept');

		// 		const cancelButton = new ButtonBuilder()
		// 			.setLabel("No")
		// 			.setStyle(ButtonStyle.Danger)
		// 			.setEmoji('❌')
		// 			.setCustomId('cancel');

		// 		const interactiveButtons = new ActionRowBuilder().addComponents(acceptButton, cancelButton);

		// 		const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [confirmEmbed] });

		// 		const filter = (i) => i.user.id === interaction.user.id;

		// 		const collector = embedMsg.createMessageComponentCollector({
		// 			ComponentType: ComponentType.Button,
		// 			filter,
		// 			time: 120000,
		// 		});

		// 		collector.on('collect', async (collInteract) => {
		// 			if (collInteract.customId === 'accept') {
		// 				//Begin Crafting!
		// 				if (theBlueprint.PassiveCategory === 'Potion') {
		// 					await collInteract.deferUpdate();
		// 					const returnVal = await makePotion(theBlueprint, interaction, grabbedMTA, inputAmount);
		// 					if (returnVal) await collector.stop();
		// 				}
		// 				if (theBlueprint.PassiveCategory === 'Equip') {
		// 					await collInteract.deferUpdate();
		// 					const returnVal = await makeEquip(theBlueprint, interaction, grabbedMTA);
		// 					if (returnVal) await collector.stop();
		// 				}
		// 				if (theBlueprint.PassiveCategory === 'Tool') {
		// 					await collInteract.deferUpdate();
		// 					const returnVal = await makeTool(theBlueprint, interaction, grabbedMTA);
		// 					if (returnVal) await collector.stop();
        //                 }
		// 			}

		// 			if (collInteract.customId === 'cancel') {
		// 				//Cancel Crafting!
		// 				await collInteract.deferUpdate();
		// 				await collector.stop();
		// 			}
		// 		});

		// 		collector.on('end', () => {
		// 			if (embedMsg) {
		// 				embedMsg.delete().catch(error => {
		// 					if (error.code !== 10008) {
		// 						console.error('Failed to delete the message:', error);
		// 					}
		// 				});
		// 			}
		// 		});
        //     }
		// }

		// async function makePotion(potion, interaction, grabbedMTA, inputAmount) {	
		// 	const user = await UserData.findOne({ where: { userid: interaction.user.id } });
		// 	try {
		// 		await checkHintPotionEquip(user, interaction);
		// 		const hasPot = await OwnedPotions.findOne({
		// 			where: [{ spec_id: interaction.user.id }, { potion_id: potion.PotionID }]
		// 		});

		// 		if (hasPot) {
		// 			if ((inputAmount === 1) || (!inputAmount)) {
		// 				const inc = await hasPot.increment('amount');

		// 				if (inc) console.log(successResult('Potion Amount was updated!'));

		// 				await payupMats(grabbedMTA, interaction, potion, inputAmount);

		// 				return await hasPot.save();
		// 			} else if (inputAmount > 1) {
		// 				const newAmount = hasPot.amount + inputAmount;
		// 				const inc = await hasPot.update({ amount: newAmount });

		// 				if (inc > 0) console.log(successResult('Potion Amount updated by inputAmount'));

		// 				await payupMats(grabbedMTA, interaction, potion, inputAmount);

		// 				return await hasPot.save();
		// 			}
		// 		}

		// 		let newPot;
		// 		if ((inputAmount === 1) || (!inputAmount)) {
		// 			newPot = await OwnedPotions.create({
		// 				name: potion.Name,
		// 				value: potion.CoinCost,
		// 				activecategory: potion.ActiveCategory,
		// 				duration: potion.Duration,
		// 				cooldown: potion.CoolDown,
		// 				potion_id: potion.PotionID,
		// 				blueprintid: potion.BlueprintID,
		// 				amount: 1,
		// 				spec_id: interaction.user.id,
		// 			});
		// 		} else if (inputAmount > 1) {
		// 			newPot = await OwnedPotions.create({
		// 				name: potion.Name,
		// 				value: potion.CoinCost,
		// 				activecategory: potion.ActiveCategory,
		// 				duration: potion.Duration,
		// 				cooldown: potion.CoolDown,
		// 				potion_id: potion.PotionID,
		// 				blueprintid: potion.BlueprintID,
		// 				amount: inputAmount,
		// 				spec_id: interaction.user.id,
		// 			});
		// 		}



		// 		if (newPot) {
		// 			const thePotion = await OwnedPotions.findOne({
		// 				where: [{ spec_id: interaction.user.id }, { potion_id: potion.PotionID }]
		// 			});

		// 			await payupMats(grabbedMTA, interaction, potion, inputAmount);

		// 			console.log(successResult(`New Potion Entry: ${thePotion}`));

		// 			const list = `Value: ${potion.CoinCost} \nDuration: ${potion.Duration} \nCooldown: ${potion.CoolDown} \nTotal Amount: ${thePotion.amount}`;

		// 			const potionEmbed = new EmbedBuilder()
		// 				.setTitle('~POTION CREATED~')
		// 				.setColor(0o0)
		// 				.addFields({
		// 					name: `${potion.Name}`, value: list,
		// 				});

		// 			await interaction.followUp({ embeds: [potionEmbed] }).then(async potEmbed => setTimeout(() => {
		// 				potEmbed.delete();
		// 			}, 60000)).catch(console.error);

		// 			//await interaction.followUp(`New Potion Created! You now have ${thePotion.amount} ${thePotion.name}`);

		// 			return thePotion;
		// 		}
		// 	} catch (error) {
		// 		console.error(errorForm(`AN ERROR HAS OCCURED: ${error}`));
        //     }
		// }

		// async function makeEquip(equip, interaction, grabbedMTA) {
		// 	const user = await UserData.findOne({ where: { userid: interaction.user.id } });
		// 	let newEquip;
		// 	if (equip.Slot === 'Mainhand') {
		// 		newEquip = await UniqueCrafted.create({
		// 			name: equip.Name,
		// 			value: equip.CoinCost,
		// 			totalkills: 0,
		// 			killsthislevel: 0,
		// 			currentlevel: 1,
		// 			Attack: equip.Attack,
		// 			Defence: 0,
		// 			Type: equip.Type,
		// 			slot: equip.Slot,
		// 			hands: equip.Hands,
		// 			rarity: equip.Rarity,
		// 			rar_id: equip.Rar_id,
		// 			loot_id: equip.Loot_id,
		// 			spec_id: interaction.user.id,
		// 			blueprintid: equip.BlueprintID,
		// 		});
		// 	} else {
		// 		newEquip = await UniqueCrafted.create({
		// 			name: equip.Name,
		// 			value: equip.CoinCost,
		// 			totalkills: 0,
		// 			killsthislevel: 0,
		// 			currentlevel: 1,
		// 			Attack: equip.Attack ?? 0,
		// 			Defence: equip.Defence,
		// 			Type: equip.Type,
		// 			slot: equip.Slot,
		// 			rarity: equip.Rarity,
		// 			rar_id: equip.Rar_id,
		// 			loot_id: equip.Loot_id,
		// 			spec_id: interaction.user.id,
		// 			blueprintid: equip.BlueprintID,
		// 		});
        //     }

			

		// 	if (newEquip) {
		// 		await checkHintUniqueEquip(user, interaction);
		// 		const theEquip = await UniqueCrafted.findOne({
		// 			where: [{ spec_id: interaction.user.id }, { blueprintid: equip.BlueprintID }, { loot_id: equip.Loot_id,}]
		// 		});

		// 		await payupMats(grabbedMTA, interaction, equip);

		// 		console.log(successResult(`New Unique Entry: ${theEquip}`));

		// 		const list = `Value: ${theEquip.value} \nCurrent Level: ${theEquip.currentlevel} \nType: ${theEquip.Type} \nSlot: ${theEquip.slot} \nHands: ${theEquip.hands}`;

		// 		const equipEmbed = new EmbedBuilder()
		// 			.setTitle('~GEAR CREATED~')
		// 			.setColor(0o0)
		// 			.addFields({
		// 				name: `${theEquip.name}`, value: list,
		// 			});

		// 		await interaction.followUp({ embeds: [equipEmbed] }).then(async eqEmbed => setTimeout(() => {
		// 			eqEmbed.delete();
		// 		}, 60000)).catch(console.error);

		// 		//await interaction.followUp(`New Equip Created! You now have ${theEquip.name}`);

		// 		return theEquip;
        //     }
		// }

		// async function makeTool(tool, interaction, grabbedMTA) {
		// 	const user = await UserData.findOne({ where: { userid: interaction.user.id } });
		// 	let theTool;
		// 	theTool = await OwnedTools.findOne({ where: [{ spec_id: interaction.user.id }, { tool_id: tool.ToolID }] });
		// 	if (theTool) {
		// 		const addedAmount = theTool.amount + 1;
		// 		const tableUpdate = await OwnedTools.update({
		// 			amount: addedAmount,
		// 		}, { where: [{ spec_id: interaction.user.id }, { tool_id: tool.ToolID }] });
		// 		if (tableUpdate > 0) {
		// 			theTool = await OwnedTools.findOne({ where: [{ spec_id: interaction.user.id }, { tool_id: tool.ToolID }] });					
		// 		}
		// 	} else {
		// 		try {
		// 			await OwnedTools.create({
		// 				spec_id: interaction.user.id,
		// 				name: tool.Name,
		// 				activecategory: tool.ActiveCategory,
		// 				activesubcategory: tool.ActiveSubCategory,
		// 				passivecategory: tool.PassiveCategory,
		// 				rarity: tool.Rarity,
		// 				rar_id: tool.Rar_id,
		// 				amount: 1,
		// 				blueprintid: tool.BlueprintID,
		// 				tool_id: tool.ToolID,
		// 			});

		// 			theTool = await OwnedTools.findOne({ where: [{ spec_id: interaction.user.id }, { tool_id: tool.ToolID }] });
		// 		} catch (err) {
		// 			return console.error(errorForm('AN ERROR OCCURED: ', err));
		// 		}
		// 	}

		// 	if (theTool !== undefined) {
		// 		await checkHintPigmyGive(user, interaction);
		// 		await payupMats(grabbedMTA, interaction, tool);
				
		// 		const list = `Value: ${tool.CoinCost} \nSlot: ${theTool.activesubcategory} \nRarity: ${theTool.rarity} \nAmount Owned: ${theTool.amount}`;

		// 		const toolEmbed = new EmbedBuilder()
		// 			.setTitle('~TOOL CREATED~')
		// 			.setColor(0o0)
		// 			.addFields({
		// 				name: `${theTool.name}`, value: list,
		// 			});

		// 		await interaction.followUp({ embeds: [toolEmbed] }).then(async tEmbed => setTimeout(() => {
		// 			tEmbed.delete();
		// 		}, 60000)).catch(console.error);

		// 		return theTool;
		// 	} else console.log(errorForm('ERROR: Tool undefined after update/creation!'));
        // }

		// async function payupMats(runCount, interaction, theFinalBlue, inputAmount) {
		// 	let curRun = 0;
		// 	let matStrType;
		// 	let matStrAmount;
		// 	let curCheckMat;
		// 	do {
		// 		var addingOne = (curRun + 1);

		// 		matStrType = `Material${addingOne}`;
		// 		matStrAmount = `Material${addingOne}_Amount`;

		// 		var compValTemp;

		// 		compValTemp = `${theFinalBlue[`${matStrType}`]}`;

		// 		var compNumTemp;

		// 		compNumTemp = `${theFinalBlue[`${matStrAmount}`]}`;


		// 		//FIND MATERIAL FROM OWNED MATERIALS
		// 		curCheckMat = await MaterialStore.findOne({ where: [{ spec_id: interaction.user.id }, { name: compValTemp }] });

		// 		let subtractResult
		// 		if ((inputAmount === 1) || (!inputAmount)) {
		// 			subtractResult = curCheckMat.amount - compNumTemp;
		// 		} else if (inputAmount > 1) {
		// 			subtractResult = curCheckMat.amount - (compNumTemp * inputAmount);
		// 		}
				

		// 		if (subtractResult <= 0) {
		// 			//destroy entry
		// 			var successCheck = await MaterialStore.destroy(
		// 				{ where: [{ spec_id: interaction.user.id }, { name: compValTemp }] });

		// 			if (successCheck > 0) {
		// 				//Updated successfully, itterate
		// 				curRun++;
		// 			} else console.log(errorForm('Something went wrong while updating materials spent'));
		// 		} else {
		// 			var successCheck = await MaterialStore.update(
		// 				{ amount: subtractResult },
		// 				{ where: [{ spec_id: interaction.user.id }, { name: compValTemp }] });

		// 			if (successCheck > 0) {
		// 				//Updated successfully, itterate
		// 				curRun++;
		// 			} else console.log(errorForm('Something went wrong while updating materials spent'));
        //         }

				
		// 	} while (curRun < runCount)

		// 	const user = await UserData.findOne({ where: { userid: interaction.user.id } });

		// 	let coinCost
		// 	if ((inputAmount === 1) || (!inputAmount)) {
		// 		coinCost = user.coins - theFinalBlue.CoinCost;
		// 	} else if (inputAmount > 1) {
		// 		coinCost = user.coins - (theFinalBlue.CoinCost * inputAmount);
		// 	}

		// 	const coinCostTaken = await UserData.update({ coins: coinCost }, { where: { userid: interaction.user.id } });

		// 	if (coinCostTaken > 0) {
		// 		//Coins taken successfully!
		// 		console.log(successResult('Users coins updated Successfully!'));
        //     }
        // }
	},
};
