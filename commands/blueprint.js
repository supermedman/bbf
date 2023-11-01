const { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const {
	warnedForm,
	errorForm,
	successResult,
	failureResult,
	basicInfoForm,
	specialInfoForm
} = require('../chalkPresets.js');

const { OwnedBlueprints, MaterialStore, UniqueCrafted, OwnedPotions, UserData } = require('../dbObjects.js');

const blueprintList = require('../events/Models/json_prefabs/blueprintList.json');

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
					.setDescription('View all currently craftable blueprints')),

	async execute(interaction) { 
		await interaction.deferReply();

		const userData = await UserData.findOne({ where: { userid: interaction.user.id } });
		if (!userData) return interaction.followUp('Welcome new user! Please use ``/start`` to begin your adventure!');

		const userHasBlueprint = await OwnedBlueprints.findOne({ where: { spec_id: interaction.user.id } });
		if (!userHasBlueprint) return interaction.followUp('No blueprints found!');

		if (interaction.options.getSubcommand() === 'view') {
			//View ALL owned blueprints
			
			const userBlueprints = await OwnedBlueprints.findAll({ where: { spec_id: interaction.user.id } });

			var embedPages = [];

			const equipList = await userBlueprints.filter(bluey => bluey.passivecategory === 'Equip');
			console.log(specialInfoForm('equipList: ', equipList));
			if (equipList.length <= 0) {
				console.log(warnedForm('NO EQUIP BLUEPRINTS FOUND'));
			} else {
				let listedDefaults;
				let grabbedMTA = 0;
				let grabbedName;
				let grabbedDescription;

				let listedMatsName;
				let listedMatsValue;
				let finalFields = [];

				let bpSlice = [];
				let i = 0;
				do {

					bpSlice = await blueprintList.filter(blueySlice => blueySlice.BlueprintID === equipList[i].blueprintid);
					//Blueprint reference should be found, use values for display
					if (bpSlice.length > 0) {
						listedDefaults = bpSlice.map(bluey =>
							`Coin Cost: ${bluey.CoinCost} \nRequired Level: ${bluey.UseLevel} \nSlot: ${bluey.Slot} \nHands: ${bluey.Hands} \nRarity: ${bluey.Rarity} \nMaterial Types Needed: ${bluey.MaterialTypeAmount}`);

						//fieldValueObj = { name: 'info', value: `${listedDefaults}` };
						//finalFields.push(fieldValueObj);

						grabbedMTA = bpSlice.map(bluey => bluey.MaterialTypeAmount);
						console.log(basicInfoForm('grabbedMTA value First: ', grabbedMTA));
						grabbedName = bpSlice.map(bluey => bluey.Name);
						grabbedDescription = bpSlice.map(bluey => bluey.Description);

						let matStrType = '';
						let matStrAmount = '';
						let fieldValueObj;
						for (var matPos = 0; matPos < grabbedMTA; matPos++) {
							console.log(basicInfoForm('matPos on current itteration: ', matPos));

							var addingOne = (matPos + 1);

							matStrType = `Material${addingOne}`;
							matStrAmount = `Material${addingOne}_Amount`;

							//Embed: fields: {name: this}
							listedMatsName = bpSlice.map(mats =>
								`${matStrType}: ${mats[`${matStrType}`]}`);
							console.log(basicInfoForm('listedMatsName on current itteration ' + matPos + ': ', listedMatsName));

							//Embed: fields: {value: this}
							listedMatsValue = bpSlice.map(mats =>
								`Amount: ${mats[`${matStrAmount}`]}`);
							console.log(basicInfoForm('listedMatsValue on current itteration ' + matPos + ': ', listedMatsValue));

							fieldValueObj = { name: listedMatsName.toString(), value: listedMatsValue.toString(), inline: true, };
							console.log(basicInfoForm('fieldValueObj on current itteration ' + matPos + ': ', fieldValueObj));

							finalFields.push(fieldValueObj);
						}

						console.log(basicInfoForm('grabbedMTA value Second: ', grabbedMTA));
						console.log(basicInfoForm('finalFields.length: ', finalFields.length));

						var strLength = finalFields.length.toString();

						if (strLength === grabbedMTA.toString()) {
							console.log(successResult('finalFields Values: ', finalFields));

							const embed = {
								title: `${grabbedName}`,
								color: 0000,
								description: `**${grabbedDescription}** \n${listedDefaults}`,
								fields: finalFields,
							};

							embedPages.push(embed);
						} else console.log(errorForm('MISSALIGNED FIELD VALUES, SOMETHING WENT WRONG!'));

					} else console.log(failureResult('BLUEPRINT PREFAB ASSIGNMENT FAILURE!'));

					i++;
					bpSlice = [];
					finalFields = [];
				} while (i < equipList.length)
            }
			//RUN THROUGH POTION BLUEPRINTS SECOND
			const potionList = await userBlueprints.filter(bluey => bluey.passivecategory === 'Potion');
			console.log(specialInfoForm('potionList: ', potionList));
			if (potionList.length <= 0) {
				console.log(warnedForm('NO POTION BLUEPRINTS FOUND'));
			} else {
				let listedDefaultsP;
				let grabbedMTAP = 0;
				let grabbedNameP;
				let grabbedDescriptionP;

				let listedMatsNameP;
				let listedMatsValueP;
				let finalFieldsP = [];

				let bpSliceP = [];
				let iP = 0;
				do {
					bpSliceP = await blueprintList.filter(blueySlice => blueySlice.BlueprintID === potionList[iP].blueprintid);
					//Blueprint reference should be found, use values for display
					if (bpSliceP.length > 0) {
						listedDefaultsP = bpSliceP.map(bluey =>
							`Coin Cost: ${bluey.CoinCost} \nRequired Level: ${bluey.UseLevel} \nDuration: ${bluey.Duration} \nCoolDown: ${bluey.CoolDown} \nMaterial Types Needed: ${bluey.MaterialTypeAmount}`);

						grabbedMTAP = bpSliceP.map(bluey => bluey.MaterialTypeAmount);
						console.log(basicInfoForm('grabbedMTA value First: ', grabbedMTAP));
						grabbedNameP = bpSliceP.map(bluey => bluey.Name);
						grabbedDescriptionP = bpSliceP.map(bluey => bluey.Description);

						let matStrTypeP = '';
						let matStrAmountP = '';
						let fieldValueObjP;
						for (var matPos = 0; matPos < grabbedMTAP; matPos++) {
							console.log(basicInfoForm('matPos on current itteration: ', matPos));

							var addingOne = (matPos + 1);

							matStrTypeP = `Material${addingOne}`;
							matStrAmountP = `Material${addingOne}_Amount`;

							//Embed: fields: {name: this}
							listedMatsNameP = bpSliceP.map(mats =>
								`${matStrTypeP}: ${mats[`${matStrTypeP}`]}`);
							console.log(basicInfoForm('listedMatsName on current itteration ' + matPos + ': ', listedMatsNameP));

							//Embed: fields: {value: this}
							listedMatsValueP = bpSliceP.map(mats =>
								`Amount: ${mats[`${matStrAmountP}`]}`);
							console.log(basicInfoForm('listedMatsValue on current itteration ' + matPos + ': ', listedMatsValueP));

							fieldValueObjP = { name: listedMatsNameP.toString(), value: listedMatsValueP.toString(), inline: true, };
							console.log(basicInfoForm('fieldValueObj on current itteration ' + matPos + ': ', fieldValueObjP));

							finalFieldsP.push(fieldValueObjP);
						}

						var strLength = finalFieldsP.length.toString();

						if (strLength === grabbedMTAP.toString()) {
							console.log(successResult('finalFields Values: ', finalFieldsP));

							const embed = {
								title: `${grabbedNameP}`,
								color: 0000,
								description: `**${grabbedDescriptionP}** \n${listedDefaultsP}`,
								fields: finalFieldsP,
							};

							embedPages.push(embed);
						} else console.log(errorForm('MISSALIGNED FIELD VALUES, SOMETHING WENT WRONG!'));
					} else console.log(failureResult('BLUEPRINT PREFAB ASSIGNMENT FAILURE!'));
					iP++;
					bpSliceP = [];
					finalFieldsP = [];
				} while (iP < potionList.length)
            }

			const backButton = new ButtonBuilder()
				.setLabel("Back")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('◀️')
				.setCustomId('back-page');

			const cancelButton = new ButtonBuilder()
				.setLabel("Cancel")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('*️⃣')
				.setCustomId('delete-page');

			const forwardButton = new ButtonBuilder()
				.setLabel("Forward")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('▶️')
				.setCustomId('next-page')

			const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);



			const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

			const filter = (ID) => ID.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				componentType: ComponentType.Button,
				filter,
				time: 300000,
			});

			var currentPage = 0;

			collector.on('collect', async (collInteract) => {
				if (collInteract.customId === 'next-page') {
					await collInteract.deferUpdate();
					if (currentPage === embedPages.length - 1) {
						currentPage = 0;
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					} else {
						currentPage += 1;
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					}
				}

				if (collInteract.customId === 'back-page') {
					await collInteract.deferUpdate();
					if (currentPage === 0) {
						currentPage = embedPages.length - 1;
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					} else {
						currentPage -= 1;
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					}
				}

				if (collInteract.customId === 'delete-page') {
					await collInteract.deferUpdate();
					await collector.stop();
				}
			});

			collector.on('end', () => {
				if (embedMsg) {
					embedMsg.delete();
				}
			});
		}

		if (interaction.options.getSubcommand() === 'available') {
			//View ONLY blueprints ready for crafting
			const userBlueprints = await OwnedBlueprints.findAll({ where: { spec_id: interaction.user.id } });
			const userMaterial = await MaterialStore.findOne({ where: { spec_id: interaction.user.id } });
			if (!userMaterial) return interaction.followUp('You have no materials yet! Get some by killing enemies');

			var embedPages = [];
			var availableCrafts = [];

			const equipList = await userBlueprints.filter(bluey => bluey.passivecategory === 'Equip');
			console.log(specialInfoForm('equipList: ', equipList));
			if (equipList.length <= 0) {
				console.log(warnedForm('NO EQUIP BLUEPRINTS FOUND'));
			} else {
				let grabbedMTA = 0;
				let grabbedName;
				let grabbedDescription;

				let finalFields = [];
				let listedMatsName;
				let listedMatsValue;

				

				let bpSlice = [];
				let i = 0;
				do {
					bpSlice = await blueprintList.filter(blueySlice => blueySlice.BlueprintID === equipList[i].blueprintid);
					if (bpSlice.length > 0) {
						//Single entry found, compare each mat until success or failure 
						listedDefaults = bpSlice.map(bluey =>
							`Coin Cost: ${bluey.CoinCost} \nRequired Level: ${bluey.UseLevel} \nSlot: ${bluey.Slot} \nHands: ${bluey.Hands} \nRarity: ${bluey.Rarity} \nMaterial Types Needed: ${bluey.MaterialTypeAmount}`);

						grabbedMTA = bpSlice.map(bluey => bluey.MaterialTypeAmount);
						grabbedName = bpSlice.map(bluey => bluey.Name);
						grabbedDescription = bpSlice.map(bluey => bluey.Description);

						let filteredResult;

						let matStrType = '';
						let matStrAmount = '';
						let fieldValueObj;
						let curCheckMat;
						let totCheckSuccess = 0;
						for (var matPos = 0; matPos < grabbedMTA; matPos++) {
							console.log(basicInfoForm('matPos on current itteration: ', matPos));

							var addingOne = (matPos + 1);

							matStrType = `Material${addingOne}`;
							matStrAmount = `Material${addingOne}_Amount`;

							var compValTemp = ``;

							compValTemp = bpSlice.map(bluey =>
								`${bluey[`${matStrType}`]}`);

							var compNumTemp = ``;

							compNumTemp = bpSlice.map(bluey =>
								`${bluey[`${matStrAmount}`]}`);

							//FIND MATERIAL FROM OWNED MATERIALS
							curCheckMat = await MaterialStore.findOne({ where: [{ spec_id: interaction.user.id }, { name: compValTemp }] });
							if (!curCheckMat) {
								//Material not found Blueprint is unavailable to craft
								console.log(failureResult('Material Type not found blueprint discarded'));
								filteredResult = false;
								finalFields = [];
							} else {
								if (compNumTemp <= curCheckMat.amount) {
									//Player has more material than needed, check success!
									console.log(successResult('Material Type found, Material Amount suficient!'));
									filteredResult = true;
									totCheckSuccess++;
								} else {
									console.log(failureResult('Material Amount not sufficient, blueprint discarded'));
									filteredResult = false;
									finalFields = [];
								}
                            }

							if (filteredResult === true) {
								//Embed: fields: {name: this}
								listedMatsName = bpSlice.map(mats =>
									`${matStrType}: ${mats[`${matStrType}`]}`);
								console.log(basicInfoForm('listedMatsName on current itteration ' + matPos + ': ', listedMatsName));

								//Embed: fields: {value: this}
								listedMatsValue = bpSlice.map(mats =>
									`Amount: ${mats[`${matStrAmount}`]}`);
								console.log(basicInfoForm('listedMatsValue on current itteration ' + matPos + ': ', listedMatsValue));

								fieldValueObj = { name: listedMatsName.toString(), value: listedMatsValue.toString(), inline: true, };
								console.log(basicInfoForm('fieldValueObj on current itteration ' + matPos + ': ', fieldValueObj));

								finalFields.push(fieldValueObj);
							} else console.log(failureResult('FilteredResult failure DURING itteration, discarding embed!'));
						}

						if (totCheckSuccess.toString() === grabbedMTA.toString()) {
							const embed = {
								title: `${grabbedName}`,
								color: 0000,
								description: `**${grabbedDescription}** \n${listedDefaults}`,
								fields: finalFields,
							};

							embedPages.push(embed);
							availableCrafts.push(bpSlice[0]);

						} else console.log(failureResult('FilteredResult failure AFTER itteration, discarding embed!'));
					} else console.log(warnedForm('BLUEPRINT PREFAB ASSIGNMENT FAILURE!'));

					bpSlice = [];
					finalFields = [];
					i++;
				} while (i < equipList.length)			
			}

			const potionList = await userBlueprints.filter(bluey => bluey.passivecategory === 'Potion');
			console.log(specialInfoForm('potionList: ', potionList));
			if (potionList.length <= 0) {
				console.log(warnedForm('NO POTION BLUEPRINTS FOUND'));
			} else {
				let listedDefaultsP;
				let grabbedMTAP = 0;
				let grabbedNameP;
				let grabbedDescriptionP;

				let listedMatsNameP;
				let listedMatsValueP;
				let finalFieldsP = [];

				let bpSliceP = [];
				let iP = 0;
				do {
					bpSliceP = await blueprintList.filter(blueySlice => blueySlice.BlueprintID === potionList[iP].blueprintid);
					//Blueprint reference should be found, use values for display
					if (bpSliceP.length > 0) {
						listedDefaultsP = bpSliceP.map(bluey =>
							`Coin Cost: ${bluey.CoinCost} \nRequired Level: ${bluey.UseLevel} \nDuration: ${bluey.Duration} \nCoolDown: ${bluey.CoolDown} \nMaterial Types Needed: ${bluey.MaterialTypeAmount}`);

						grabbedMTAP = bpSliceP.map(bluey => bluey.MaterialTypeAmount);
						console.log(basicInfoForm('grabbedMTA value First: ', grabbedMTAP));
						grabbedNameP = bpSliceP.map(bluey => bluey.Name);
						console.log(specialInfoForm('Potion NAME: ', grabbedNameP));
						grabbedDescriptionP = bpSliceP.map(bluey => bluey.Description);

						let filteredResult;

						let matStrTypeP = '';
						let matStrAmountP = '';
						let fieldValueObjP;
						let curCheckMat;
						let totCheckSuccess = 0;
						for (var matPos = 0; matPos < grabbedMTAP; matPos++) {
							console.log(basicInfoForm('matPos on current itteration: ', matPos));

							var addingOne = (matPos + 1);

							matStrTypeP = `Material${addingOne}`;
							matStrAmountP = `Material${addingOne}_Amount`;

							var compValTemp = ``;

							compValTemp = bpSliceP.map(bluey =>
								`${bluey[`${matStrTypeP}`]}`);

							var compNumTemp = ``;

							compNumTemp = bpSliceP.map(bluey =>
								`${bluey[`${matStrAmountP}`]}`);

							//FIND MATERIAL FROM OWNED MATERIALS
							curCheckMat = await MaterialStore.findOne({ where: [{ spec_id: interaction.user.id }, { name: compValTemp }] });
							if (!curCheckMat) {
								//Material not found Blueprint is unavailable to craft
								console.log(failureResult('Material Type not found blueprint discarded'));
								filteredResult = false;
								finalFieldsP = [];
							} else {
								if (compNumTemp <= curCheckMat.amount) {
									//Player has more material than needed, check success!
									console.log(successResult('Material Type found, Material Amount suficient!'));
									filteredResult = true;
									totCheckSuccess++;
								} else {
									console.log(failureResult('Material Amount not sufficient, blueprint discarded'));
									filteredResult = false;
									finalFieldsP = [];
								}
							}

							if (filteredResult === true) {
								//Embed: fields: {name: this}
								listedMatsNameP = bpSliceP.map(mats =>
									`${matStrTypeP}: ${mats[`${matStrTypeP}`]}`);
								console.log(basicInfoForm('listedMatsName on current itteration ' + matPos + ': ', listedMatsNameP));

								//Embed: fields: {value: this}
								listedMatsValueP = bpSliceP.map(mats =>
									`Amount: ${mats[`${matStrAmountP}`]}`);
								console.log(basicInfoForm('listedMatsValue on current itteration ' + matPos + ': ', listedMatsValueP));

								fieldValueObjP = { name: listedMatsNameP.toString(), value: listedMatsValueP.toString(), inline: true, };
								console.log(basicInfoForm('fieldValueObj on current itteration ' + matPos + ': ', fieldValueObjP));

								finalFieldsP.push(fieldValueObjP);
							} else console.log(failureResult('FilteredResult failure DURING itteration, discarding embed!'));											
						}

						if (totCheckSuccess.toString() === grabbedMTAP.toString()) {
							console.log(successResult('All materials passed checks, adding embed to crafting list'));
							const embed = {
								title: `${grabbedNameP}`,
								color: 0000,
								description: `**${grabbedDescriptionP}** \n${listedDefaultsP}`,
								fields: finalFieldsP,
							};

							embedPages.push(embed);
							availableCrafts.push(bpSliceP[0]);
						} else console.log(failureResult('FilteredResult failure AFTER itteration, discarding embed!'));

					} else console.log(warnedForm('BLUEPRINT PREFAB ASSIGNMENT FAILURE!'));

					bpSliceP = [];
					finalFieldsP = [];
					iP++;
				} while (iP < potionList.length)
            }

			if (embedPages.length <= 0) return interaction.followUp('You have no blueprints available for crafting!');

			const backButton = new ButtonBuilder()
				.setLabel("Back")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('◀️')
				.setCustomId('back-page');

			const cancelButton = new ButtonBuilder()
				.setLabel("Cancel")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('*️⃣')
				.setCustomId('delete-page');

			const forwardButton = new ButtonBuilder()
				.setLabel("Forward")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('▶️')
				.setCustomId('next-page');

			const craftButton = new ButtonBuilder()
				.setLabel("Craft!")
				.setStyle(ButtonStyle.Primary)
				.setEmoji('⚒')
				.setCustomId('craft-item');

			const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton, craftButton);

			const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

			const filter = (ID) => ID.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				componentType: ComponentType.Button,
				filter,
				time: 300000,
			});

			var currentPage = 0;

			collector.on('collect', async (collInteract) => {
				if (collInteract.customId === 'next-page') {
					await collInteract.deferUpdate();
					if (currentPage === embedPages.length - 1) {
						currentPage = 0;
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					} else {
						currentPage += 1;
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					}
				}

				if (collInteract.customId === 'back-page') {
					await collInteract.deferUpdate();
					if (currentPage === 0) {
						currentPage = embedPages.length - 1;
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					} else {
						currentPage -= 1;
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					}
				}

				if (collInteract.customId === 'delete-page') {
					await collInteract.deferUpdate();
					await collector.stop();
				}

				if (collInteract.customId === 'craft-item') {
					//Craft item here
					await collInteract.deferUpdate();
					await collector.stop();
					await craftFromBlueprint(availableCrafts[currentPage], interaction);
                }
			});

			collector.on('end', () => {
				if (embedMsg) {
					embedMsg.delete();
				}
			});
		}


		async function craftFromBlueprint(theBlueprint, interaction) {
			let thisIsBool = false;
			if (theBlueprint.Rarity === 'Unique') {
				thisIsBool = true;
			}

			const uniqueCheck = await OwnedBlueprints.findOne({ where: [{ spec_id: interaction.user.id }, { onlyone: thisIsBool }] });
			if (!uniqueCheck) return console.log(errorForm('UNIQUE BP CHECK FAILED TO FIND BP, SOMETHING WENT HORRIBLY WRONG'));
			const cannotCraft = await UniqueCrafted.findOne({ where: [{ spec_id: interaction.user.id }, { name: uniqueCheck.name }] });
			if (cannotCraft) {
				//This item already exists and has been crafted, notify user of this!
				return interaction.followUp('You cannot craft another of these, it is unique.. JUST LIKE YOU :)');
			} else {
				let finalFields = [];
				let grabbedMTA = theBlueprint.MaterialTypeAmount;

				let listedDefaults;
				

				if (theBlueprint.PassiveCategory === 'Equip') {
					listedDefaults = `Coin Cost: ${theBlueprint.CoinCost} \nRequired Level: ${theBlueprint.UseLevel} \nSlot: ${theBlueprint.Slot} \nHands: ${theBlueprint.Hands} \nRarity: ${theBlueprint.Rarity} \nMaterial Types Needed: ${theBlueprint.MaterialTypeAmount}`;
				} else if (theBlueprint.PassiveCategory === 'Potion') {
					listedDefaults = `Coin Cost: ${theBlueprint.CoinCost} \nRequired Level: ${theBlueprint.UseLevel} \nDuration: ${theBlueprint.Duration} \nCoolDown: ${theBlueprint.CoolDown} \nMaterial Types Needed: ${theBlueprint.MaterialTypeAmount}`;
                }

				let listedMatsName;
				let listedMatsValue;

				let matStrType = '';
				let matStrAmount = '';
				let fieldValueObj;
				for (var matPos = 0; matPos < grabbedMTA; matPos++) {
					console.log(basicInfoForm('matPos on current itteration: ', matPos));

					var addingOne = (matPos + 1);

					matStrType = `Material${addingOne}`;
					matStrAmount = `Material${addingOne}_Amount`;

					//Embed: fields: {name: this}
					listedMatsName = `${matStrType}: ${theBlueprint[`${matStrType}`]}`;
					console.log(basicInfoForm('listedMatsName on current itteration ' + matPos + ': ', listedMatsName));

					//Embed: fields: {value: this}
					listedMatsValue = `Amount: ${theBlueprint[`${matStrAmount}`]}`;
					console.log(basicInfoForm('listedMatsValue on current itteration ' + matPos + ': ', listedMatsValue));

					fieldValueObj = { name: listedMatsName.toString(), value: listedMatsValue.toString(), inline: true, };
					console.log(basicInfoForm('fieldValueObj on current itteration ' + matPos + ': ', fieldValueObj));

					finalFields.push(fieldValueObj);
				}

				const confirmEmbed = {
					title: 'Crafting',
					color: 0000,
					description: `${theBlueprint.Description} \n\n${listedDefaults}`,
					fields: finalFields,
				}

				const acceptButton = new ButtonBuilder()
					.setLabel("Yes")
					.setStyle(ButtonStyle.Success)
					.setEmoji('✅')
					.setCustomId('accept');

				const cancelButton = new ButtonBuilder()
					.setLabel("No")
					.setStyle(ButtonStyle.Danger)
					.setEmoji('❌')
					.setCustomId('cancel');

				const interactiveButtons = new ActionRowBuilder().addComponents(acceptButton, cancelButton);

				const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [confirmEmbed] });

				const filter = (i) => i.user.id === interaction.user.id;

				const collector = embedMsg.createMessageComponentCollector({
					ComponentType: ComponentType.Button,
					filter,
					time: 120000,
				});

				collector.on('collect', async (collInteract) => {
					if (collInteract.customId === 'accept') {
						//Begin Crafting!
						if (theBlueprint.PassiveCategory === 'Potion') {
							await collInteract.deferUpdate();
							const returnVal = await makePotion(theBlueprint, interaction, grabbedMTA);
							if (returnVal) await collector.stop();
						}
						if (theBlueprint.PassiveCategory === 'Equip') {
							await collInteract.deferUpdate();
							const returnVal = await makeEquip(theBlueprint, interaction, grabbedMTA);
							if (returnVal) await collector.stop();
                        }
					}

					if (collInteract.customId === 'cancel') {
						//Cancel Crafting!
						await collInteract.deferUpdate();
						await collector.stop();
					}
				});

				collector.on('end', () => {
					if (embedMsg) {
						embedMsg.delete();
					}
				});
            }
		}

		async function makePotion(potion, interaction, grabbedMTA) {

			await payupMats(grabbedMTA, interaction, potion);

			const hasPot = await OwnedPotions.findOne({
				where: [{ spec_id: interaction.user.id }, { potion_id: potion.PotionID }]
			});

			if (hasPot) {
				const inc = await hasPot.increment('amount');

				if (inc) console.log(successResult('Potion Amount was updated!'));

				return await hasPot.save();
			}

			const newPot = await OwnedPotions.create({
				name: potion.Name,
				value: potion.CoinCost,
				activecategory: potion.ActiveCategory,
				duration: potion.Duration,
				cooldown: potion.CoolDown,
				potion_id: potion.PotionID,
				blueprintid: potion.BlueprintID,
				amount: 1,
				spec_id: interaction.user.id,
			});

			if (newPot) {
				const thePotion = await OwnedPotions.findOne({
					where: [{ spec_id: interaction.user.id }, { potion_id: potion.PotionID }]
				});

				console.log(successResult(`New Potion Entry: ${thePotion}`));

				return thePotion;
            }
		}

		async function makeEquip(equip, interaction, grabbedMTA) {

			await payupMats(grabbedMTA, interaction, equip);

			const newEquip = await UniqueCrafted.create({
				name: equip.Name,
				value: equip.CoinCost,
				totalkills: 0,
				killsthislevel: 0,
				currentlevel: 1,
				Attack: equip.Damage,
				Defence: 0,
				Type: equip.Type,
				slot: equip.Slot,
				hands: equip.Hands,
				rarity: equip.Rarity,
				rar_id: equip.Rar_id,
				loot_id: equip.Loot_id,
				spec_id: interaction.user.id,
			});

			if (newEquip) {
				const theEquip = await UniqueCrafted.findOne({
					where: [{ spec_id: interaction.user.id }, { blueprintid: equip.BlueprintID }]
				});

				console.log(successResult(`New Unique Entry: ${theEquip}`));

				return theEquip;
            }
		}

		async function payupMats(runCount, interaction, theFinalBlue) {
			let curRun = 0;
			let matStrType;
			let matStrAmount;
			let curCheckMat;
			do {
				var addingOne = (curRun + 1);

				matStrType = `Material${addingOne}`;
				matStrAmount = `Material${addingOne}_Amount`;

				var compValTemp = ``;

				compValTemp = `${theFinalBlue[`${matStrType}`]}`;

				var compNumTemp = ``;

				compNumTemp = `${theFinalBlue[`${matStrAmount}`]}`;


				//FIND MATERIAL FROM OWNED MATERIALS
				curCheckMat = await MaterialStore.findOne({ where: [{ spec_id: interaction.user.id }, { name: compValTemp }] });

				var subtractResult = curCheckMat.amount - compNumTemp;

				var successCheck = await MaterialStore.update(
					{ amount: subtractResult },
					{ where: [{ spec_id: interaction.user.id }, { name: compValTemp }] });

				if (successCheck > 0) {
					//Updated successfully, itterate
					curRun++;
				} else console.log(errorForm('Something went wrong while updating materials spent'));
			} while (curRun < runCount)

			const user = await UserData.findOne({ where: { userid: interaction.user.id } });

			const coinCost = user.coins - theFinalBlue.CoinCost;
			const coinCostTaken = await UserData.update({ coins: coinCost }, { where: { userid: interaction.user.id } });

			if (coinCostTaken > 0) {
				//Coins taken successfully!
				console.log(successResult('Users coins updated Successfully!'));
            }
        }
	},
};