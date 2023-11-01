const { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const {
	warnedForm,
	errorForm,
	successResult,
	failureResult,
	basicInfoForm,
	specialInfoForm
} = require('../chalkPresets.js');

const { OwnedBlueprints, MaterialStore, UniqueCrafted, UserData } = require('../dbObjects.js');

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
								description: `${grabbedDescription}`,
								fields: [
									{ name: 'Info', value: `${listedDefaults}` },
								],
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
								description: `${grabbedDescriptionP}`,
								fields: [
									{ name: 'Info', value: `${listedDefaultsP}` },
								],
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
		}
	},
};
