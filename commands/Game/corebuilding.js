const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

const { Town, UserData, CoreBuilding } = require('../../dbObjects.js');

const { loadBuilding } = require('./exported/displayBuilding.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('corebuilding')
		.setDescription('The main command for all things core building related!')
		.addSubcommand(subcommand =>
			subcommand
				.setName('belong')
				.setDescription('View all core buildings that belong to you or your town!'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('settings')
				.setDescription('Manage and edit settings for the selected core building.')
				.addStringOption(option =>
					option.setName('thecore')
						.setDescription('The core building to be used.')
						.setRequired(true)
						.setAutocomplete(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('change')
				.setDescription('Change something on a core building.')
				.addStringOption(option =>
					option.setName('thecore')
						.setDescription('The core building to be used.')
						.setRequired(true)
						.setAutocomplete(true))
				.addStringOption(option =>
					option.setName('feature')
						.setDescription('What feature would you like to change?')
						.setRequired(true)
						.addChoices(
							{ name: 'Foreground', value: 'foreground' },
							{ name: 'Roof', value: 'roof' },
							{ name: 'Walls', value: 'wall' },
							{ name: 'Windows', value: 'window' },
							{ name: 'Door', value: 'door' }))
				.addStringOption(option =>
					option.setName('selection')
						.setDescription('Options for the choosen feature.')
						.setRequired(true)
						.setAutocomplete(true))),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);

		let choices = [];

		if (focusedOption.name === 'thecore') {
			const focusedValue = interaction.options.getFocused(false);
			const user = await UserData.findOne({ where: { userid: interaction.user.id } });

			let theTown;
			if (user && user.townid !== '0') theTown = await Town.findOne({ where: { townid: user.townid } });

			if (theTown) {
				if (theTown.grandhall_status !== 'None') choices.push('Grand Hall');
				if (theTown.bank_status !== 'None') choices.push('Bank');
				if (theTown.market_status !== 'None') choices.push('Market');
				if (theTown.tavern_status !== 'None') choices.push('Tavern');
				if (theTown.clergy_status !== 'None') choices.push('Clergy');
			} else choices.push('None');

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}

		if (focusedOption.name === 'selection') {
			const focusedValue = interaction.options.getFocused(false);
			const featureChoice = interaction.options.getString('feature') ?? 'NONE';

			if (featureChoice === 'foreground') choices = ['1', '2', '3', '4', '5', '6'];

			if (featureChoice === 'roof') choices = ['1', '2', '3', '4'];

			if (featureChoice === 'wall') choices = ['1', '2', '3', '4', '5', '6', '7'];

			if (featureChoice === 'window') choices = ['1', '2', '3', '4'];

			if (featureChoice === 'door') choices = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

			if (featureChoice === 'NONE') choices = ['None'];

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
        }
    },
	async execute(interaction) { 
		const { betaTester } = interaction.client;

		if (!betaTester.has(interaction.user.id)) return await interaction.reply('This command is under construction!! It is currently only available to early access testers!');

		const user = await grabU();
		if (!user) return await noUser();

		if (interaction.options.getSubcommand() === 'belong') {
			const ownedBuilds = await CoreBuilding.findAll({ where: { townid: user.townid }});
			if (ownedBuilds.length <= 0) return await interaction.reply('You do not own any buildings!');

			await interaction.deferReply();

			let fileList = [];
			for (const building of ownedBuilds) {
				let attachment = await loadBuilding(building);
				fileList.push(attachment);
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
				.setCustomId('cancel');

			const forwardButton = new ButtonBuilder()
				.setLabel("Forward")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('▶️')
				.setCustomId('next-page');

			const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

			const embedMsg = await interaction.followUp({ components: [interactiveButtons], files: [fileList[0]] });

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				componentType: ComponentType.Button,
				filter,
				time: 120000,
			});

			let currentPage = 0;

			collector.on('collect', async (COI) => {
				if (COI.customId === 'next-page') {
					await COI.deferUpdate().then(async () => {
						if (currentPage === fileList.length - 1) {
							currentPage = 0;
						} else currentPage += 1;
						await embedMsg.edit({ files: [fileList[currentPage]], components: [interactiveButtons] });
					}).catch(error => {
						console.error(error);
					});
				}

				if (COI.customId === 'back-page') {
					await COI.deferUpdate().then(async () => {
						if (currentPage === 0) {
							currentPage = fileList.length - 1;
						} else currentPage -= 1;
						await embedMsg.edit({ files: [fileList[currentPage]], components: [interactiveButtons] });
					}).catch(error => {
						console.error(error);
					});
				}

				if (COI.customId === 'cancel') {
					collector.stop();
				}
			});

			collector.on('end', () => {
				if (embedMsg) {
					embedMsg.delete().catch(error => {
						if (error.code !== 10008) {
							console.error('Failed to delete the message:', error);
						}
					});
				}
			});
		}

		if (interaction.options.getSubcommand() === 'change') {
			const changeType = interaction.options.getString('feature');
			const changeVal = 1 * interaction.options.getString('selection');
			const coreType = extractCoreType(interaction.options.getString('thecore'));

			const theTown = await Town.findOne({ where: { townid: user.townid } });
			if (!theTown) return await interaction.reply('Something went wrong while locating your town!');

			const currentEditList = theTown.can_edit.split(',');
			let exists = false;
			for (const id of currentEditList) {
				if (user.userid === id) {
					exists = true;
					break;
				}
			}
			if (!exists) return await interaction.reply('You do not have permission to use this command for this town!');

			const theBuild = await CoreBuilding.findOne({ where: [{ townid: user.townid }, { build_type: coreType }] });
			if (!theBuild) return await interaction.reply('Something went wrong while locating that core building!');

			let buildUpdate;
			if (changeType === 'foreground') buildUpdate = await theBuild.update({ foreground_tex: changeVal });
			if (changeType === 'roof') buildUpdate = await theBuild.update({ roof_tex: changeVal });
			if (changeType === 'wall') buildUpdate = await theBuild.update({ wall_tex: changeVal });
			if (changeType === 'window') buildUpdate = await theBuild.update({ window_tex: changeVal });
			if (changeType === 'door') buildUpdate = await theBuild.update({ door_tex: changeVal });
			if (buildUpdate) await theBuild.save();

			const attachment = await loadBuilding(theBuild);
			const msgContent = 'Building Updated Successfully!!';

			return await interaction.reply({ content: msgContent, files: [attachment] });
		}

		if (interaction.options.getSubcommand() === 'settings') {
			const coreType = extractCoreType(interaction.options.getString('thecore'));

			const theTown = await Town.findOne({ where: { townid: user.townid } });
			if (!theTown) return await interaction.reply('Something went wrong while locating your town!');

			const currentEditList = theTown.can_edit.split(',');
			let exists = false;
			for (const id of currentEditList) {
				if (user.userid === id) {
					exists = true;
					break;
				}
			}
			if (!exists) return await interaction.reply('You do not have permission to use this command for this town!');

			//let optionsList = [];

			//for (const setting of settingsList) {
			//	let newMenuOption = new StringSelectMenuOptionBuilder()
			//		.setLabel(setting.Name)
			//		.setDescription(setting.Description)
			//		.setValue(setting.OptionValue);

			//	optionsList.push(newMenuOption);
   //         }

			//const settingsSelect = new StringSelectMenuBuilder()
			//	.setCustomId('settingsmenu')
			//	.setPlaceholder('Select a settings option!')
			//	.addOptions(optionsList);

			//const selectRow = new ActionRowBuilder()
			//	.addComponents(settingsSelect);

			//const selectMenu = await interaction.followUp({
			//	content: 'Choose one of the following settings',
			//	components: [selectRow],
			//});

			//const filter = (i) => i.user.id === interaction.user.id;

			//const selectCollector = selectMenu.createMessageComponentCollector({
			//	componentType: ComponentType.StringSelect,
			//	filter,
			//	time: 120000
			//});

			//let sentFollowUp = 'No reply yet.';
			//selectCollector.on('collect', async iCS => {
			//	listedValue = iCS.values[0];
			//	sentFollowUp = 'Value found!';
			//	await selectCollector.stop();
			//});

			//selectCollector.once('end', async () => {
			//	if (sentFollowUp === 'No reply yet.') {
			//		selectMenu.delete().catch(error => {
			//			if (error.code !== 10008) {
			//				console.error('Failed to delete the message:', error);
			//			}
			//		});
			//	} else {
			//		// DO SETTINGS STUFF HERE!
			//  }
			//});
		}

		function extractCoreType(coreType) {
			let type;
			if (coreType === 'Grand Hall') type = 'grandhall';
			if (coreType === 'Bank') type = 'bank';
			if (coreType === 'Market') type = 'market';
			if (coreType === 'Tavern') type = 'tavern';
			if (coreType === 'Clergy') type = 'clergy';
			if (!type) return 'None';
			return type;
		}

		async function grabU() {
			const user = await UserData.findOne({ where: { userid: interaction.user.id } });
			if (!user) return;
			return user;
		}

		async function noUser() {
			await interaction.reply('No player found, Please use ``/start`` to begin your adventure!');
		}
	},
};