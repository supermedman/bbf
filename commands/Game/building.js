const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const { PlayerBuilding, UserData, OwnedTools } = require('../../dbObjects.js');

const { loadBuilding } = require('./exported/displayBuilding.js');

const acToolE = require('../../events/Models/json_prefabs/acToolEffects.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('building')
		.setDescription('The main command for all things building related!')
		.addSubcommand(subcommand =>
			subcommand
				.setName('appoint')
				.setDescription('Appoint a user to allow them access to building editing commands.')
				.addStringOption(option =>
					option.setName('thebuild')
						.setDescription('The building to be used.')
						.setRequired(true)
						.setAutocomplete(true))
				.addUserOption(option => option.setName('target').setDescription('The user')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('demote')
				.setDescription('Demote a user to revoke access to building editing commands.')
				.addStringOption(option =>
					option.setName('thebuild')
						.setDescription('The building to be used.')
						.setRequired(true)
						.setAutocomplete(true))
				.addUserOption(option => option.setName('target').setDescription('The user')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('belong')
				.setDescription('View all buildings that belong to you!'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('install')
				.setDescription('Install something on a building you own.')
				.addStringOption(option =>
					option.setName('thebuild')
						.setDescription('The building to be used.')
						.setRequired(true)
						.setAutocomplete(true))
				.addStringOption(option =>
					option.setName('thetool')
						.setDescription('Tools available for installing.')
						.setRequired(true)
						.setAutocomplete(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('change')
				.setDescription('Change something on a building.')
				.addStringOption(option =>
					option.setName('thebuild')
						.setDescription('The building to be used.')
						.setRequired(true)
						.setAutocomplete(true))
				.addStringOption(option =>
					option.setName('feature')
						.setDescription('What feature would you like to change?')
						.setRequired(true)
						.addChoices(
							{ name: 'Building Style', value: 'build_style' },
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

		if (focusedOption.name === 'thebuild') {
			const focusedValue = interaction.options.getFocused(false);
			const user = await UserData.findOne({ where: { userid: interaction.user.id } });

			let ownedBuilds;
			if (user && user.townid !== '0') {
				ownedBuilds = await PlayerBuilding.findAll({
					where:
						[{ townid: user.townid },
						{ ownerid: user.userid }]
				});

				if (interaction.options.getSubcommand() === 'change') {
					let townBuildings = await PlayerBuilding.findAll({ where: { townid: user.townid } });
					if (townBuildings) {
						for (const building of townBuildings) {
							let currentEditList = building.can_edit.split(',');
							for (const id of currentEditList) {
								if (user.userid === id && building.ownerid !== user.userid) {
									ownedBuilds.push(building);
									break;
								}
							}
                        }
                    }
                }
			}

			if (ownedBuilds) {
				for (let i = 0; i < ownedBuilds.length; i++) {
					let buildStr = `${ownedBuilds[i].build_type} at Plot Number: ${i + 1}`;
					choices.push(buildStr);
                }
			} else choices = ['None'];

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}

		if (focusedOption.name === 'selection') {
			const focusedValue = interaction.options.getFocused(false);
			const featureChoice = interaction.options.getString('feature') ?? 'NONE';

			if (featureChoice === 'build_style') choices = ['1', '2', '3'];

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

		if (focusedOption.name === 'thetool') {
			const focusedValue = interaction.options.getFocused(false);
			const buildStr = interaction.options.getString('thebuild') ?? 'NONE';

			const user = await UserData.findOne({ where: { userid: interaction.user.id } });

			function createIndexFromStr(str) {
				const pieces = str.split(': ');
				let indexVal = pieces[1] - 1;
				return indexVal;
			}

			let ownedBuilds;
			if (user && user.townid !== '0') {
				ownedBuilds = await PlayerBuilding.findAll({
					where:
						[{ townid: user.townid },
						{ ownerid: user.userid }]
				});

				let theBuild;
				if (buildStr !== 'NONE' && buildStr !== 'None') {
					if (ownedBuilds) {
						const buildIndex = createIndexFromStr(buildStr);
						theBuild = ownedBuilds[buildIndex];
					} else choices = ['None'];
				} else choices = ['None'];

				let buildTools = await OwnedTools.findAll({ where: [{ spec_id: user.userid }, { activecategory: 'Town' }, { activesubcategory: 'Build' }] });

				if (theBuild && buildTools.length > 0) {
					const catMatch = acToolE.filter(cat => cat.Name === 'Town');
					const subCat = catMatch[0]['SubCategory'];
					const subMatch = subCat.filter(sub => sub.Name === 'Build');

					const subCatObj = subMatch[0];

					let typeMatch = [];
					for (const tool of buildTools) {
						if (subCatObj[`${tool.name}`]['BuildType'] === theBuild.build_type) {
							typeMatch.push(tool.name);
                        }						
					}

					if (typeMatch.length > 0) {
						choices = typeMatch;
					} else choices = ['None'];
				}
			} else choices = ['None'];

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
        }
	},
	async execute(interaction) {

		const { betaTester } = interaction.client;

		if (!betaTester.has(interaction.user.id)) return await interaction.reply('This command is under construction!! It is currently only available to early access testers!');

		if (interaction.options.getSubcommand() === 'appoint') {
			const buildStr = interaction.options.getString('thebuild') ?? 'NONE';
			if (buildStr === 'NONE' || buildStr === 'None') return await interaction.reply('That is not a vaild building!');

			const buildIndex = createIndexFromStr(buildStr);

			const user = await grabU();
			if (!user) return await noUser();

			const targetUser = interaction.options.getUser('target');
			const targetCheck = await UserData.findOne({ where: [{ userid: targetUser.id }, { townid: user.townid }] });
			if (!targetCheck) return await interaction.reply('That user doesnt have a game profile or belongs to another town!!');

			const ownedBuilds = await PlayerBuilding.findAll({ where: [{ townid: user.townid }, { ownerid: user.userid }] });
			if (ownedBuilds.length <= 0) return await interaction.reply('You do not own any buildings!');

			const theBuild = ownedBuilds[buildIndex];

			const currentEditList = theBuild.can_edit.split(',');
			let exists = false;
			for (const id of currentEditList) {
				if (targetUser.id === id) {
					exists = true;
					break;
				}
			}
			if (exists) return await interaction.reply('That user has already been appointed for this building!!');

			const confirmButton = new ButtonBuilder()
				.setLabel('Confirm!')
				.setStyle(ButtonStyle.Primary)
				.setCustomId('confirm');

			const cancelButton = new ButtonBuilder()
				.setLabel('Cancel!')
				.setStyle(ButtonStyle.Danger)
				.setCustomId('cancel');

			const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

			const embed = new EmbedBuilder()
				.setTitle('APPOINTING USER')
				.setColor(0000)
				.addFields({ name: `Appoint ${targetUser.username}?`, value: 'Select a button below.' });

			const embedMsg = await interaction.reply({ embeds: [embed], components: [buttonRow] });

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				ComponentType: ComponentType.Button,
				filter,
				time: 10000,
			});

			collector.on('collect', async (COI) => {
				if (COI.customId === 'confirm') {
					currentEditList.push(targetUser.id);

					const canEditStr = currentEditList.toString();

					collector.stop();

					const buildUpdate = await theBuild.update({ can_edit: canEditStr });
					if (buildUpdate) await theBuild.save();
					return await interaction.followUp(`${targetUser.username} has been appointed!`);
				}
				if (COI.customId === 'cancel') {
					collector.stop();
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

		if (interaction.options.getSubcommand() === 'demote') {
			const buildStr = interaction.options.getString('thebuild') ?? 'NONE';
			if (buildStr === 'NONE' || buildStr === 'None') return await interaction.reply('That is not a vaild building!');

			const buildIndex = createIndexFromStr(buildStr);

			const user = await grabU();
			if (!user) return await noUser();

			const targetUser = interaction.options.getUser('target');
			const targetCheck = await UserData.findOne({ where: [{ userid: targetUser.id }, { townid: user.townid }] });
			if (!targetCheck) return await interaction.reply('That user doesnt have a game profile or belongs to another town!!');

			const ownedBuilds = await PlayerBuilding.findAll({ where: [{ townid: user.townid }, { ownerid: user.userid }] });
			if (ownedBuilds.length <= 0) return await interaction.reply('You do not own any buildings!');

			const theBuild = ownedBuilds[buildIndex];

			const currentEditList = theBuild.can_edit.split(',');
			let exists = false;
			for (const id of currentEditList) {
				if (targetUser.id === id) {
					exists = true;
					break;
				}
			}
			if (!exists) return await interaction.reply('That user has not been appointed for this building!!');

			const confirmButton = new ButtonBuilder()
				.setLabel('Confirm!')
				.setStyle(ButtonStyle.Primary)
				.setCustomId('confirm');

			const cancelButton = new ButtonBuilder()
				.setLabel('Cancel!')
				.setStyle(ButtonStyle.Danger)
				.setCustomId('cancel');

			const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

			const embed = new EmbedBuilder()
				.setTitle('DEMOTING USER')
				.setColor(0000)
				.addFields({ name: `Demote ${targetUser.username}?`, value: 'Select a button below.' });

			const embedMsg = await interaction.reply({ embeds: [embed], components: [buttonRow] });

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				ComponentType: ComponentType.Button,
				filter,
				time: 10000,
			});

			collector.on('collect', async (COI) => {
				if (COI.customId === 'confirm') {
					const newEditList = currentEditList.filter(id => id !== targetUser.id);
					const canEditStr = newEditList.toString();

					collector.stop();

					const buildUpdate = await theBuild.update({ can_edit: canEditStr });
					if (buildUpdate) await theBuild.save();
					return await interaction.followUp(`${targetUser.username} has been demoted!`);
				}
				if (COI.customId === 'cancel') {
					collector.stop();
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

		if (interaction.options.getSubcommand() === 'belong') {
			const user = await grabU();
			if (!user) return await noUser();

			const ownedBuilds = await PlayerBuilding.findAll({ where: [{ townid: user.townid }, { ownerid: user.userid }] });
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
			const buildStr = interaction.options.getString('thebuild') ?? 'NONE';
			if (buildStr === 'NONE' || buildStr === 'None') return await interaction.reply('That is not a vaild building!');

			const buildIndex = createIndexFromStr(buildStr);

			const user = await grabU();
			if (!user) return await noUser();

			const ownedBuilds = await PlayerBuilding.findAll({ where: [{ townid: user.townid }, { ownerid: user.userid }] });
			const townBuildings = await PlayerBuilding.findAll({ where: { townid: user.townid } });
			if (townBuildings.length <= 0 && ownedBuilds.length <= 0) return await interaction.reply('You do not own any buildings, nor were any buildings found in the town you belong to!');

			if (townBuildings.length > 0) {
				for (const building of townBuildings) {
					let currentEditList = building.can_edit.split(',');
					for (const id of currentEditList) {
						if (user.userid === id && building.ownerid !== user.userid) {
							ownedBuilds.push(building);
							break;
						}
					}
				}
            }

			const theBuild = ownedBuilds[buildIndex];

			let buildUpdate;
			if (changeType === 'build_style') buildUpdate = await theBuild.update({ build_style: changeVal });
			if (changeType === 'foreground') buildUpdate = await theBuild.update({ foreground_tex: changeVal });
			if (changeType === 'roof') buildUpdate = await theBuild.update({ roof_tex: changeVal });
			if (changeType === 'wall') buildUpdate = await theBuild.update({ wall_tex: changeVal });
			if (changeType === 'window') buildUpdate = await theBuild.update({ window_tex: changeVal });
			if (changeType === 'door') buildUpdate = await theBuild.update({ door_tex: changeVal });
			if (buildUpdate) await theBuild.save();

			const attachment = await loadBuilding(theBuild);
			const msgContent = 'Building Updated Successfully!!';

			return await interaction.reply({ content: msgContent, files: [attachment]});
		}

		if (interaction.options.getSubcommand() === 'install') {
			const buildStr = interaction.options.getString('thebuild') ?? 'NONE';
			if (buildStr === 'NONE' || buildStr === 'None') return await interaction.reply('That is not a vaild building!');

			const toolName = interaction.options.getString('thetool') ?? 'NONE';
			if (toolName === 'NONE' || toolName === 'None') return await interaction.reply('That is not a vaild tool!');

			const buildIndex = createIndexFromStr(buildStr);

			const user = await grabU();
			if (!user) return await noUser();

			const ownedBuilds = await PlayerBuilding.findAll({ where: [{ townid: user.townid }, { ownerid: user.userid }] });
			if (ownedBuilds.length <= 0) return await interaction.reply('You do not own any buildings!');

			const theBuild = ownedBuilds[buildIndex];
        }

		function createIndexFromStr(str) {
			const pieces = str.split(': ');
			let indexVal = pieces[1] - 1;
			return indexVal;
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
