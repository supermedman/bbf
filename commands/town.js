const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const { Town, MediumTile, GuildData, UserData, MaterialStore, TownMaterial, TownPlots, PlayerBuilding } = require('../dbObjects.js');

const { loadBuilding } = require('./exported/displayBuilding.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('town')
		.setDescription('The Main command for all things town related!')
		.addSubcommand(subcommand =>
			subcommand
				.setName('join')
				.setDescription('Join an existing town!')
				.addStringOption(option =>
					option.setName('thetown')
						.setDescription('Which town would you like to join?')
						.setRequired(true)
						.setAutocomplete(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('belong')
				.setDescription('View the town you belong too.'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('establish')
				.setDescription('Establish a new town!')
				.addStringOption(option =>
					option.setName('townname')
						.setDescription('What would you like to name your town?')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('location')
						.setDescription('Where would you like to settle your new town?')
						.setRequired(true)
						.addChoices(
							{ name: 'Location 1', value: 'one' },
							{ name: 'Location 2', value: 'two' })))
		.addSubcommand(subcommand =>
			subcommand
				.setName('openplot')
				.setDescription('Mark a certain amount of town plots as available to anyone belonging to the town.')
				.addIntegerOption(option =>
					option.setName('amount')
						.setDescription('How many plots will be made public?')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('closeplot')
				.setDescription('Mark a certain amount of town plots as unavailable to anyone belonging to the town.')
				.addIntegerOption(option =>
					option.setName('amount')
						.setDescription('How many plots will be made private?')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('claimplot')
				.setDescription('Claim a Town Plot as your own! Is currently free!'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('buildplot')
				.setDescription('Build on one of your owned plots!')
				.addStringOption(option =>
					option.setName('theplot')
						.setDescription('Which plot would you like to build on?')
						.setRequired(true)
						.setAutocomplete(true))
				.addStringOption(option =>
					option.setName('buildtype')
						.setDescription('Which plot would you like to build on?')
						.setRequired(true)
						.addChoices(
							{ name: 'House', value: 'house' })))
		.addSubcommand(subcommand =>
			subcommand
				.setName('viewplot')
				.setDescription('View a town plot')
				.addStringOption(option =>
					option.setName('thetown')
						.setDescription('Which town would you like to view?')
						.setRequired(true)
						.setAutocomplete(true))
				.addStringOption(option =>
					option.setName('townplots')
						.setDescription('Which plot would you like to view?')
						.setRequired(true)
						.setAutocomplete(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('appoint')
				.setDescription('Appoint a user to allow them access to town editing commands.')
				.addUserOption(option => option.setName('target').setDescription('The user')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('demote')
				.setDescription('Demote a user to revoke access to town editing commands.')
				.addUserOption(option => option.setName('target').setDescription('The user')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('transfer')
				.setDescription('Transfer ownership of a town to another user.')
				.addUserOption(option => option.setName('target').setDescription('The user')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('deposit')
				.setDescription('Transfer coins or materials from your personal balance into the towns treasury.')
				.addStringOption(option =>
					option.setName('type')
						.setDescription('Coins or Materials?')
						.setRequired(true)
						.addChoices(
							{ name: 'Coins', value: 'coin' },
							{ name: 'Materials', value: 'mat' }))
				.addStringOption(option =>
					option.setName('item')
						.setDescription('Which item would you like to deposit?')
						.setAutocomplete(true))
				.addIntegerOption(option =>
					option.setName('amount')
						.setDescription('How much will you be transfering?')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('withdraw')
				.setDescription('Transfer coins or materials from the towns treasury into your personal balance.')
				.addStringOption(option =>
					option.setName('type')
						.setDescription('Coins or Materials?')
						.setRequired(true)
						.addChoices(
							{ name: 'Coins', value: 'coin' },
							{ name: 'Materials', value: 'mat' }))
				.addStringOption(option =>
					option.setName('item')
						.setDescription('Which item would you like to withdraw?')
						.setAutocomplete(true))
				.addIntegerOption(option =>
					option.setName('amount')
						.setDescription('How much will you be transfering?'))),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);

		let choices = [];

		// Locate local towns pertaining to guild command is used on
		if (focusedOption.name === 'thetown') {
			const focusedValue = interaction.options.getFocused(false);

			const medTile = await MediumTile.findOne({ where: { guildid: interaction.guild.id } });
			let townOne = 'None', townTwo = 'None';
			if (medTile.town_one !== '0') {
				townOne = medTile.town_one;
				townOne = await Town.findOne({ where: { townid: townOne } });
				townOne = townOne.name;
			}
			if (medTile.town_two !== '0') {
				townTwo = medTile.town_two;
				townTwo = await Town.findOne({ where: { townid: townTwo } });
				townTwo = townTwo.name;
			}

			choices = [townOne, townTwo];

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
        }

		// Handle transaction type, and subsequent location if transaction involves materials
		if (focusedOption.name === 'item') {
			const focusedValue = interaction.options.getFocused(false);
			const type = interaction.options.getString('type');

			let items;

			if (interaction.options.getSubcommand() === 'deposit') {
				if (type !== 'coin') {
					items = await MaterialStore.findAll({
						where: [
							{ spec_id: interaction.user.id }]
					});
				}
			}

			if (interaction.options.getSubcommand() === 'withdraw') {
				const user = await UserData.findOne({ where: { userid: interaction.user.id } });
				let theTown;
				if (user) theTown = await Town.findOne({ where: { townid: user.townid } });

				if (theTown && type !== 'coin') {
					items = await TownMaterial.findAll({
						where: [
							{ townid: theTown.townid }]
					});
				}
			}

			choices = items.map(item => item.name);

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}

		// Locate all owned & empty town plots
		if (focusedOption.name === 'theplot') {
			const focusedValue = interaction.options.getFocused(false);
			const user = await UserData.findOne({ where: { userid: interaction.user.id } });

			let playerPlots;
			if (user && user.townid !== '0') {
				playerPlots = await TownPlots.findAll({
					where:
						[{ townid: user.townid },
						{ ownerid: user.userid },
						{ empty: true }]
				});
            }

			if (playerPlots) {
				for (let i = 0; i < playerPlots.length; i++) {
					let plotStr = `Plot Number: ${i + 1}`;
					choices.push(plotStr);
				}
			} else choices = ['None'];
			

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}

		// Locate all built on plots using 'thetown' option outcome as reference
		if (focusedOption.name === 'townplots') {
			const focusedValue = interaction.options.getFocused(false);
			const townPicked = interaction.options.getString('thetown') ?? 'NONE';

			let theTown;
			if (townPicked !== 'NONE' && townPicked !== 'None') {
				theTown = await Town.findOne({ where: { name: townPicked } });
			}

			let townPlots;
			if (theTown) {
				townPlots = await TownPlots.findAll({
					where:
						[{ townid: theTown.townid },
						{ empty: false }]
				});
			}

			if (townPlots) {
				for (let i = 0; i < townPlots.length; i++) {
					let buildRef = await PlayerBuilding.findOne({ where: { plotid: townPlots[i].plotid } });
					let plotStr = `${buildRef.build_type} at Plot Number: ${i + 1}`;
					choices.push(plotStr);
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

		if (!betaTester.has(interaction.user.id)) return await interaction.reply('This command is under construction!!');

		if (interaction.options.getSubcommand() === 'establish') {
			const user = await grabU();
			if (!user) return await noUser();

			if (user.townid !== '0') return await interaction.reply('You already belong to a town, therefore you cannot create a new one!');

			if (user.level < 100) return await interaction.reply('You must be at least level 100 to establish your own town, consider joining an existing town until then!!');

			const townName = interaction.options.getString('townname');
			const location = interaction.options.getString('location');

			if (townName === 'NONE' || townName === 'None') return await interaction.reply('Sorry, that name is not useable!!');

			const theGuild = await GuildData.findOne({ where: { guildid: interaction.guild.id } });
			if (!theGuild) return await interaction.reply('Something went wrong while finding guild association!!');

			const medTile = await MediumTile.findOne({ where: { guildid: theGuild.guildid } });
			if (!medTile) return await interaction.reply('Something went wrong while finding Medium Tile association!!');

			if (medTile.town_one !== '0' && medTile.town_two !== '0') return await interaction.reply('This server has reached the max amount of towns!!');

			let locationTaken = true;
			if (location === 'one' && medTile.town_one === '0') locationTaken = false;
			if (location === 'two' && medTile.town_two === '0') locationTaken = false;

			if (locationTaken) return await interaction.reply('That location already has a town!!');

			let localBiomeCheck;
			if (location === 'one') localBiomeCheck = medTile.local_biome_one;
			if (location === 'two') localBiomeCheck = medTile.local_biome_two;

			// biomes = ['Forest', 'Mountain', 'Desert', 'Plains', 'Swamp', 'Grassland'];

			/**		BIOME MAT BONUS:
			 *		
			 *		- Forest
			 *			- woody
			 *			- fleshy
			 *			- skinny
			 *		
			 *		- Mountain
			 *			- metalic
			 *			- rocky
			 *			- gemy
			 *		
			 *		- Desert
			 *			- gemy
			 *			- rocky
			 *			- skinny
			 *		
			 *		- Plains
			 *			- skinny
			 *			- herby
			 *			- fleshy
			 *		
			 *		- Swamp
			 *			- slimy
			 *			- herby
			 *			- woody
			 *		
			 *		- Grassland
			 *			- herby
			 *			- rocky
			 *			- metalic
			 *			
			 *		===============================
			 *		- Normal
			 *			- magical, +10, +5, +3
			 *		- Evil
			 *			- unique, +5, +3, +1
			 *		- Phase
			 *			- tooly, +10, +8, +5
			 * */
			const bonusList = {
				"Forest": ['woody', 'fleshy', 'skinny'],
				"Mountain": ['metalic', 'rocky', 'gemy'],
				"Desert": ['gemy', 'rocky', 'skinny'],
				"Plains": ['skinny', 'herby', 'fleshy'],
				"Swamp": ['slimy', 'herby', 'woody'],
				"Grassland": ['herby', 'rocky', 'metalic']
			};

			const allignBonusList = {
				"Normal": ["magical"],
				"Evil": ["unique"],
				"Phase": ["tooly"]
			};

			const biomeType = localBiomeCheck.split('-');

			const bonusPre = bonusList[`${biomeType[0]}`];
			const bonusPost = allignBonusList[`${biomeType[1]}`];

			const bonusArr = bonusPre.concat(bonusPost);
			const bonusStr = bonusArr.toString();

			let newTown = await Town.create({
				tileid: medTile.tileid,
				tile_location: medTile.tile_location,
				local_biome: localBiomeCheck,
				mat_bonus: bonusStr,
				guildid: medTile.guildid,
				mayorid: interaction.user.id,
				can_edit: interaction.user.id,
				name: townName,
				population: 1,
			});
			console.log(newTown.dataValues);

			const totalPlots = newTown.buildlimit;

			const townPlotList = await TownPlots.findAll({ where: { townid: newTown.townid } });
			if (!townPlotList || townPlotList.length < totalPlots) {
				let plotsNeeded = totalPlots - (townPlotList.length ?? 0);
				for (let i = 0; i < plotsNeeded; i++) {
					let newPlot = await TownPlots.create({
						townid: newTown.townid,
					});
					townPlotList.push(newPlot);
				}
			}

			const userUpdate = await user.update({ townid: newTown.townid });
			if (userUpdate) await user.save();

			let tileUpdate;
			if (location === 'one') tileUpdate = await medTile.update({ town_one: newTown.townid });
			if (location === 'two') tileUpdate = await medTile.update({ town_two: newTown.townid });

			if (tileUpdate) await medTile.save();



			return await interaction.reply('New Town created!!');
		}

		if (interaction.options.getSubcommand() === 'join') {

			const townName = interaction.options.getString('thetown') ?? 'NONE';
			if (townName === 'NONE' || townName === 'None') return await interaction.reply('That was not a vaild town, or it does not exist!');

			const user = await grabU();
			if (!user) return await noUser();
			
			const theTown = await Town.findOne({ where: { name: townName } });
			if (!theTown) return await interaction.reply('Something went wrong while locating that town!');

			if (theTown.mayorid === user.userid) return await interaction.reply('You are already the mayor of this town!');
			if (user.townid !== '0') return await interaction.reply('You already belong to a town, you must first leave it before joining a new one!');

			await interaction.deferReply();

			// Confirm button embed here!!
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
				.setTitle('JOINING TOWN')
				.setColor(0000)
				.addFields({ name: 'Join this town?', value: 'Select a button below.' });

			const embedMsg = await interaction.followUp({ embeds: [embed], components: [buttonRow] });

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				ComponentType: ComponentType.Button,
				filter,
				time: 10000,
			});

			collector.on('collect', async (COI) => {
				if (COI.customId === 'confirm') {
					const townInc = await theTown.increment('population');
					if (townInc) await theTown.save();

					collector.stop();

					const userUpdate = await user.update({ townid: theTown.townid });
					if (userUpdate) return await interaction.followUp(`Congratulations!! You are now apart of ${theTown.name}`);
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
			if (user.townid === '0') return await interaction.reply('You do not belong to a town yet! Use ``/town join`` to join a town!');

			const townRef = await Town.findOne({ where: { townid: user.townid } });
			if (!townRef) return await interaction.reply('Something went wrong while locating your town!');

			const mayor = await UserData.findOne({ where: { userid: townRef.mayorid } });

			const biomeColours = {
				"Forest": 'DarkGreen',
				"Mountain": 'LightGrey',
				"Desert": 'DarkGold',
				"Plains": 'Gold',
				"Swamp": 'DarkAqua',
				"Grassland": 'Green'
			};

			const biomeList = townRef.local_biome.split('-');
			const townColour = biomeColours[`${biomeList[0]}`];

			const townDesc = `Current Mayor: ${mayor.username}\nTown Level: ${townRef.level}\nTreasury Contains: ${townRef.coins}c\n========\nHuman Population: ${townRef.population}\nNPC Population: ${townRef.npc_population}\n========\nMax Buildings: ${townRef.buildlimit}\nOpen Plots: ${townRef.openplots}\nClosed Plots: ${townRef.closedplots}\nOwned Plots: ${townRef.ownedplots}\nBuildings: ${townRef.buildcount}\n========\nMain Biome: ${biomeList[0]}\nAllignment: ${biomeList[1]}\n========\n`;

			let fieldName = '';
			let fieldValue = '';
			let fieldObj = {};
			let finalFields = [];

			// BAND ONE
			if (townRef.band_one !== '0') {
				fieldName = '';
				fieldValue = '';


				fieldObj = { name: fieldName, value: fieldValue, };
				finalFields.push(fieldObj);
			} else finalFields.push({ name: 'Band One', value: 'Vacant!' });
			// BAND TWO
			if (townRef.band_two !== '0') {
				fieldName = '';
				fieldValue = '';


				fieldObj = { name: fieldName, value: fieldValue, };
				finalFields.push(fieldObj);
			} else finalFields.push({ name: 'Band Two', value: 'Vacant!' });

			// GRAND HALL
			if (townRef.grandhall_status !== 'None') {
				fieldName = '';
				fieldValue = '';


				fieldObj = { name: fieldName, value: fieldValue, };
				finalFields.push(fieldObj);
			} else finalFields.push({ name: 'GRAND HALL', value: 'Not Built!' });
			// BANK
			if (townRef.bank_status !== 'None') {
				fieldName = '';
				fieldValue = '';


				fieldObj = { name: fieldName, value: fieldValue, };
				finalFields.push(fieldObj);
			} else finalFields.push({ name: 'BANK', value: 'Not Built!' });
			// MARKET
			if (townRef.market_status !== 'None') {
				fieldName = '';
				fieldValue = '';


				fieldObj = { name: fieldName, value: fieldValue, };
				finalFields.push(fieldObj);
			} else finalFields.push({ name: 'MARKET', value: 'Not Built!' });
			// TAVERN
			if (townRef.tavern_status !== 'None') {
				fieldName = '';
				fieldValue = '';


				fieldObj = { name: fieldName, value: fieldValue, };
				finalFields.push(fieldObj);
			} else finalFields.push({ name: 'TAVERN', value: 'Not Built!' });
			// CLERGY
			if (townRef.clergy_status !== 'None') {
				fieldName = '';
				fieldValue = '';


				fieldObj = { name: fieldName, value: fieldValue, };
				finalFields.push(fieldObj);
			} else finalFields.push({ name: 'CLERGY', value: 'Not Built!' });

			const townEmbed = new EmbedBuilder()
				.setTitle(townRef.name)
				.setDescription(townDesc)
				.setColor(townColour)
				.addFields(finalFields);

			return await interaction.reply({ embeds: [townEmbed] }).then(embedMsg => setTimeout(() => {
				embedMsg.delete();
			}, 120000)).catch(error => console.error(error));
		}

		if (interaction.options.getSubcommand() === 'appoint') {
			const user = await grabU();
			if (!user) return await noUser();

			const theTown = await Town.findOne({ where: { mayorid: interaction.user.id } });
			if (!theTown) return await interaction.reply('You are not the mayor of any existing towns!');

			const targetUser = interaction.options.getUser('target');
			const targetCheck = await UserData.findOne({ where: [{ userid: targetUser.id }, { townid: theTown.townid }] });
			if (!targetCheck) return await interaction.reply('That user doesnt have a game profile or belongs to another town!!');

			const currentEditList = theTown.can_edit.split(',');
			let exists = false;
			for (const id of currentEditList) {
				if (targetUser.id === id) {
					exists = true;
					break;
                }
			}
			if (exists) return await interaction.reply('That user has already been appointed for this town!!');

			// Confirm Embed HERE!!!
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
					const townUpdate = await theTown.update({ can_edit: canEditStr });
					if (townUpdate) await theTown.save();
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
			const user = await grabU();
			if (!user) return await noUser();

			const theTown = await Town.findOne({ where: { mayorid: interaction.user.id } });
			if (!theTown) return await interaction.reply('You are not the mayor of any existing towns!');

			const targetUser = interaction.options.getUser('target');
			const targetCheck = await UserData.findOne({ where: [{ userid: targetUser.id }, { townid: theTown.townid }] });
			if (!targetCheck) return await interaction.reply('That user doesnt have a game profile or belongs to another town!!');

			const currentEditList = theTown.can_edit.split(',');
			let exists = false;
			for (const id of currentEditList) {
				if (targetUser.id === id) {
					exists = true;
					break;
				}
			}
			if (!exists) return await interaction.reply('That user has not been appointed for this town!!');

			// Confirm Embed HERE!!!
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
					const townUpdate = await theTown.update({ can_edit: canEditStr });
					if (townUpdate) await theTown.save();
					return await interaction.followUp(`${targetUser.username} has been demoted.`);
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

		if (interaction.options.getSubcommand() === 'transfer') {
			const user = await grabU();
			if (!user) return await noUser();

			const theTown = await Town.findOne({ where: { mayorid: interaction.user.id } });
			if (!theTown) return await interaction.reply('You are not the mayor of any existing towns!');

			const targetUser = interaction.options.getUser('target');
			const targetCheck = await UserData.findOne({ where: [{ userid: targetUser.id }, { townid: theTown.townid }] });
			if (!targetCheck) return await interaction.reply('That user doesnt have a game profile or belongs to another town!!');

			// Confirm Embed HERE!!!
			const confirmButton = new ButtonBuilder()
				.setLabel('Confirm!')
				.setStyle(ButtonStyle.Danger)
				.setCustomId('confirm');

			const cancelButton = new ButtonBuilder()
				.setLabel('Cancel!')
				.setStyle(ButtonStyle.Primary)
				.setCustomId('cancel');

			const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

			const embed = new EmbedBuilder()
				.setTitle('TRANSFER OWNERSHIP')
				.setColor(0000)
				.setDescription('This process **CANNOT BE UNDONE!!!**')
				.addFields({ name: 'Are you sure you want to transfer ownership?', value: `${targetUser.username} will become the new mayor!` });

			const embedMsg = await interaction.reply({ embeds: [embed], components: [buttonRow] });

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				ComponentType: ComponentType.Button,
				filter,
				time: 10000,
			});

			collector.on('collect', async (COI) => {
				if (COI.customId === 'confirm') {
					collector.stop();
					const townUpdate = await theTown.update({ mayorid: targetUser.id });
					if (townUpdate) await theTown.save();
					return await interaction.followUp(`${targetUser.username} is the new mayor!!`);
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

		if (interaction.options.getSubcommand() === 'deposit') {
			const transType = interaction.options.getString('type');
			const theItem = interaction.options.getString('item') ?? 'NONE';
			const amount = interaction.options.getInteger('amount') ?? 1;

			if (transType === 'mat' && theItem === 'NONE') return await interaction.reply('That was not a valid material option!!');

			const user = await grabU();
			if (!user) return await noUser();

			const theTown = await Town.findOne({ where: { townid: user.townid } });
			if (!theTown) return await interaction.reply('You do not belong to any towns!');

			const currentEditList = theTown.can_edit.split(',');
			let exists = false;
			for (const id of currentEditList) {
				if (user.userid === id) {
					exists = true;
					break;
				}
			}
			if (!exists) return await interaction.reply('You do not have permission to use this command for this town!');

			let item;
			if (transType === 'mat') {
				item = await MaterialStore.findOne({ where: { name: theItem } });
				if (item.amount < amount || !item) return await interaction.reply(`You do not have that many ${theItem}!`);
			} else {
				if (user.coins < amount) return await interaction.reply('You do not have that many coins!!');
            }

			let result = '';
			if (transType === 'mat') result = await depositMaterial(theTown, user, item, amount);
			if (transType === 'coin') result = await depositCoins(theTown, user, amount);

			if (result === 'Success') return await interaction.reply('Deposit Successful!!');
		}

		if (interaction.options.getSubcommand() === 'withdraw') {
			const transType = interaction.options.getString('type');
			const theItem = interaction.options.getString('item') ?? 'NONE';
			const amount = interaction.options.getInteger('amount') ?? 1;

			if (transType === 'mat' && theItem === 'NONE') return await interaction.reply('That was not a valid material option!!');

			const user = await grabU();
			if (!user) return await noUser();

			const theTown = await Town.findOne({ where: { townid: user.townid } });
			if (!theTown) return await interaction.reply('You do not belong to any towns!');

			const currentEditList = theTown.can_edit.split(',');
			let exists = false;
			for (const id of currentEditList) {
				if (user.userid === id) {
					exists = true;
					break;
				}
			}
			if (!exists) return await interaction.reply('You do not have permission to use this command for this town!');

			let item;
			if (transType === 'mat') {
				item = await TownMaterial.findOne({ where: { name: theItem } });
				if (item.amount < amount || !item) return await interaction.reply(`The town does not have that many ${theItem}!`);
			} else {
				if (theTown.coins < amount) return await interaction.reply('The town does not have that many coins!!');
			}

			let result = '';
			if (transType === 'mat') result = await withdrawMaterial(theTown, user, item, amount);
			if (transType === 'coin') result = await withdrawCoins(theTown, user, amount);

			if (result === 'Success') return await interaction.reply('Withdraw Successful!!');
		}

		if (interaction.options.getSubcommand() === 'openplot') {
			const amount = interaction.options.getInteger('amount') ?? 1;

			const user = await grabU();
			if (!user) return await noUser();

			const theTown = await Town.findOne({ where: { townid: user.townid } });
			if (!theTown) return await interaction.reply('You do not belong to any towns!');

			const currentEditList = theTown.can_edit.split(',');
			let exists = false;
			for (const id of currentEditList) {
				if (user.userid === id) {
					exists = true;
					break;
				}
			}
			if (!exists) return await interaction.reply('You do not have permission to use this command for this town!');

			const totalPlots = theTown.openplots + theTown.closedplots;
			const emptyPlots = theTown.buildlimit - theTown.ownedplots;
			if (amount > totalPlots || amount > emptyPlots) return await interaction.reply('This town does not have that many plots of land available!');

			const closedPlots = theTown.closedplots;
			if (amount > closedPlots) return await interaction.reply('This town does not have that many closed plots!');

			const townPlotList = await TownPlots.findAll({ where: { townid: theTown.townid } });
			//if (!townPlotList || townPlotList.length < totalPlots) {
			//	let plotsNeeded = totalPlots - (townPlotList.length ?? 0);
			//	for (let i = 0; i < plotsNeeded; i++) {
			//		let newPlot = await TownPlots.create({
			//			townid: theTown.townid,
			//		});
			//		townPlotList.push(newPlot);
			//	}
			//}

			const publicPlots = townPlotList.filter(plot => !plot.private && plot.ownerid === '0');
			const privatePlots = townPlotList.filter(plot => plot.private && plot.ownerid === '0');

			if (privatePlots.length === closedPlots) {
				const plotsToChange = privatePlots.slice(0, amount);
				for (const plot of plotsToChange) {
					let updatedPlot = await plot.update({ private: false });
					await plot.save();
					publicPlots.push(updatedPlot);
				}
			}

			const inc = await theTown.increment('openplots', { by: amount });
			const dec = await theTown.decrement('closedplots', { by: amount });
			if (!inc || !dec) return await interaction.reply('Something went wrong while updating town plots');

			await theTown.save();

			return await interaction.reply('Town Plots Updated!!');
		}

		if (interaction.options.getSubcommand() === 'closeplot') {
			const amount = interaction.options.getInteger('amount') ?? 1;

			const user = await grabU();
			if (!user) return await noUser();

			const theTown = await Town.findOne({ where: { townid: user.townid } });
			if (!theTown) return await interaction.reply('You do not belong to any towns!');

			const currentEditList = theTown.can_edit.split(',');
			let exists = false;
			for (const id of currentEditList) {
				if (user.userid === id) {
					exists = true;
					break;
				}
			}
			if (!exists) return await interaction.reply('You do not have permission to use this command for this town!');

			const totalPlots = theTown.openplots + theTown.closedplots;
			const emptyPlots = theTown.buildlimit - theTown.ownedplots;
			if (amount > totalPlots || amount > emptyPlots) return await interaction.reply('This town does not have that many plots of land available!');

			const openPlots = theTown.openplots;
			if (amount > openPlots) return await interaction.reply('This town does not have that many open plots!');

			const townPlotList = await TownPlots.findAll({ where: { townid: theTown.townid } });
			//if (!townPlotList || townPlotList.length < totalPlots) {
			//	let plotsNeeded = totalPlots - (townPlotList.length ?? 0);
			//	for (let i = 0; i < plotsNeeded; i++) {
			//		let newPlot = await TownPlots.create({
			//			townid: theTown.townid,
			//		});
			//		townPlotList.push(newPlot);
			//	}
			//}

			const publicPlots = townPlotList.filter(plot => !plot.private && plot.ownerid === '0');
			const privatePlots = townPlotList.filter(plot => plot.private && plot.ownerid === '0');

			if (publicPlots.length === openPlots) {
				const plotsToChange = publicPlots.slice(0, amount);
				for (const plot of plotsToChange) {
					let updatedPlot = await plot.update({ private: true });
					await plot.save();
					privatePlots.push(updatedPlot);
                }
			}

			const inc = await theTown.increment('closedplots', { by: amount });
			const dec = await theTown.decrement('openplots', { by: amount });
			if (!inc || !dec) return await interaction.reply('Something went wrong while updating town plots');
			await theTown.save();

			return await interaction.reply('Town Plots Updated!!');
		}

		if (interaction.options.getSubcommand() === 'claimplot') {
			const user = await grabU();
			if (!user) return await noUser();

			const theTown = await Town.findOne({ where: { townid: user.townid } });
			if (!theTown) return await interaction.reply('You do not belong to any towns!');

			const currentEditList = theTown.can_edit.split(',');
			let exists = false;
			for (const id of currentEditList) {
				if (user.userid === id) {
					exists = true;
					break;
				}
			}

			const playerPlots = await TownPlots.findAll({ where: { ownerid: user.userid } });
			if (theTown.mayorid !== user.userid) {
				if (playerPlots.length > 1 && !exists) return await interaction.reply('You already own the maximum amount of plots!');
				if (playerPlots.length > 3 && exists) return await interaction.reply('You already own the maximum amount of plots!');
            }

			const emptyPlots = theTown.buildlimit - theTown.buildcount;

			if (emptyPlots === 0) return await interaction.reply('There are no empty plots available!!');

			let useOpenPlots = false;

			const openPlots = theTown.openplots;
			if (!exists && openPlots === 0) return await interaction.reply('There are no open plots available!');
			if (!exists) useOpenPlots = true;

			const closedPlots = theTown.closedplots;
			if (exists && closedPlots === 0) useOpenPlots = true;

			let thePlot;
			if (useOpenPlots) thePlot = await TownPlots.findOne({ where: [{ townid: theTown.townid }, { ownerid: '0' }, { empty: true }, { private: false }] });
			if (!useOpenPlots) thePlot = await TownPlots.findOne({ where: [{ townid: theTown.townid }, { ownerid: '0' }, { empty: true }, { private: true }] });

			if (!thePlot) return await interaction.reply('Something went wrong while location a Town Plot!');

			const plotUpdate = await thePlot.update({ ownerid: user.userid, private: true });
			if (plotUpdate) await thePlot.save();

			let dec;
			if (useOpenPlots) dec = await theTown.decrement('openplots');
			if (!useOpenPlots) dec = await theTown.decrement('closedplots');

			const inc = await theTown.increment('ownedplots');
			if (!dec || !inc) console.error('Something went wrong while updating theTown');

			await theTown.save();

			return await interaction.reply('You are now the owner of a Town Plot!!');
		}

		if (interaction.options.getSubcommand() === 'buildplot') {
			const buildingType = interaction.options.getString('buildtype');
			const plotStr = interaction.options.getString('theplot') ?? 'NONE';
			if (plotStr === 'None' || plotStr === 'NONE') return await interaction.reply('The plot you are looking for does not exist, or you selected an invalid option! Double check if you own a town plot first!');

			const plotIndex = createIndexFromStr(plotStr);

			const user = await grabU();
			if (!user) return await noUser();

			const playerPlots = await TownPlots.findAll({ where: [{ townid: user.townid }, { ownerid: user.userid }, { empty: true }] });
			if (!playerPlots) return await interaction.reply('Something went wrong while locating your plots!');

			const thePlot = playerPlots[plotIndex];

			const biomeBackgrounds = {
				"Forest": 1,
				"Mountain": 2,
				"Desert": 3,
				"Plains": 4,
				"Swamp": 5,
				"Grassland": 6
			};

			const townRef = await Town.findOne({ where: { townid: user.townid } });
			if (!townRef) return await interaction.reply('Something went wrong while locating your town!');

			const biomeList = townRef.local_biome.split('-');
			const buildBackground = biomeBackgrounds[`${biomeList[0]}`];

			let newBuild = await PlayerBuilding.create({
				townid: user.townid,
				ownerid: user.userid,
				plotid: thePlot.plotid,
				can_edit: user.userid,
				build_type: buildingType,
				background_tex: buildBackground
			});

			if (!newBuild) return await interaction.reply('Something went wrong while creating that building!!');

			const inc = await townRef.increment('buildcount');
			if (inc) await townRef.save();

			const updatePlot = await thePlot.update({ empty: false });
			if (updatePlot) await thePlot.save();

			// CREATE BUILDING ATTATCHMENT HERE!!
			await interaction.deferReply();
			const attachment = await loadBuilding(newBuild);

			let messageStr = 'Building Created!';
			if (buildingType === 'house') messageStr += ' Welcome Home! :)';

			return await interaction.followUp({ content: messageStr, files: [attachment]});
		}

		if (interaction.options.getSubcommand() === 'viewplot') {
			const townName = interaction.options.getString('thetown') ?? 'NONE';
			if (townName === 'None' || townName === 'NONE') return await interaction.reply('The requested town could not be found, please select from the provided options!');
			const plotStr = interaction.options.getString('townplots') ?? 'NONE';
			if (plotStr === 'None' || plotStr === 'NONE') return await interaction.reply('The plot you are looking for does not exist, or you selected an invalid option!');

			const plotIndex = createIndexFromStr(plotStr);

			const user = await grabU();
			if (!user) return await noUser();

			const townRef = await Town.findOne({ where: { name: townName } });
			if (!townRef) return await interaction.reply('Something went wrong while locating that town!');

			const townPlots = await TownPlots.findAll({ where: [{ townid: townRef.townid }, { empty: false }] });
			if (!townPlots) return await interaction.reply('Something went wrong while locating town plots!');

			const thePlot = townPlots[plotIndex];
			const theBuilding = await PlayerBuilding.findOne({ where: { plotid: thePlot.plotid } });
			if (!theBuilding) return await interaction.reply('Something went wrong while locating that building!');

			const ownerRef = await UserData.findOne({ where: { userid: theBuilding.ownerid } });

			const notFound = 'Not Found';

			const embedTitle = `Owned By: ${ownerRef.username ?? notFound}`;
			const embedDesc = `Building Type: ${theBuilding.build_type}`;

			let fieldName = '';
			let fieldValue = '';
			let fieldObj = {};
			let finalFields = [];

			if (theBuilding.band_owned) {
				fieldName = '';
				fieldValue = '';


				fieldObj = { name: fieldName, value: fieldValue };
				finalFields.push(fieldObj);
			} else finalFields.push({ name: 'Band:', value: 'No Band Linked' });

			// ADD INFO EMBED FOR CONTEXT TO SHOWN BUILDING!
			const embed = new EmbedBuilder()
				.setTitle(embedTitle)
				.setDescription(embedDesc)
				.setColor(0000)
				.addFields(finalFields);

			await interaction.deferReply();
			const attachment = await loadBuilding(theBuilding);

			return await interaction.followUp({embeds: [embed], files: [attachment] });
		}


		function createIndexFromStr(str) {
			const pieces = str.split(': ');
			let indexVal = pieces[1] - 1;
			return indexVal;
        }

		/**
		 * 
		 * @param {object} town DB instance object
		 * @param {object} user DB instance object
		 * @param {object} item DB instance object
		 * @param {number} amount int
		 */
		async function depositMaterial(town, user, item, amount) {
			let addSuccess = await addMaterial(town, item, amount, 'town');
			if (addSuccess !== 'Added') return 'Failure 1';

			let removeSuccess = await removeMaterial(user, item, amount, 'user');
			if (removeSuccess !== 'Removed') return 'Failure 2';

			return 'Success';
		}

		/**
		 * 
		 * @param {object} town DB instance object
		 * @param {object} user DB instance object
		 * @param {object} item DB instance object
		 * @param {number} amount int
		 */
		async function withdrawMaterial(town, user, item, amount) {
			let addSuccess = await addMaterial(user, item, amount, 'user');
			if (addSuccess !== 'Added') return 'Failure 1';

			let removeSuccess = await removeMaterial(town, item, amount, 'town');
			if (removeSuccess !== 'Removed') return 'Failure 2';

			return 'Success';
		}

		/**
		 * 
		 * @param {object} target DB instance object
		 * @param {object} item DB instance object
		 * @param {number} amount int
		 * @param {string} type town || user
		 */
		async function addMaterial(target, item, amount, type) {
			let matStore;
			if (type === 'town') {
				matStore = await TownMaterial.findOne({
					where: [{ townid: target.townid }, { mat_id: item.mat_id }, { mattype: item.mattype }]
				});
			}
			if (type === 'user') {
				matStore = await MaterialStore.findOne({
					where: [{ spec_id: target.userid }, { mat_id: item.mat_id }, { mattype: item.mattype }]
				});
			}

			if (matStore) {
				const inc = await matStore.increment('amount', { by: amount });
				if (inc) await matStore.save();
				return 'Added';
			}

			let newMat;
			try {
				if (type === 'town') newMat = await TownMaterial.create({ townid: target.townid, amount: amount });
				if (type === 'user') newMat = await MaterialStore.create({ spec_id: target.userid, amount: amount });

				if (newMat) {
					await newMat.update({
						name: item.name,
						value: item.value,
						mattype: item.mattype,
						mat_id: item.mat_id,
						rarity: item.rarity,
						rar_id: item.rar_id,
					});

					await newMat.save();
					return 'Added';
                }
			} catch (error) {
				console.error(error);
            }
		}

		/**
		 * 
		 * @param {object} target DB instance object
		 * @param {object} item DB instance object
		 * @param {number} amount int
		 * @param {string} type town || user
		 */
		async function removeMaterial(target, item, amount, type) {
			let destroy = false;
			if ((item.amount - amount) === 0) destroy = true;

			let matStore;
			if (type === 'town') {
				matStore = await TownMaterial.findOne({
					where: [{ townid: target.townid }, { mat_id: item.mat_id }, { mattype: item.mattype }]
				});
			}
			if (type === 'user') {
				matStore = await MaterialStore.findOne({
					where: [{ spec_id: target.userid }, { mat_id: item.mat_id }, { mattype: item.mattype }]
				});
			}

			if (destroy) {
				const destroyed = await matStore.destroy();
				if (destroyed) return 'Removed';
			}
			const dec = await matStore.decrement('amount', { by: amount });
			if (dec) await matStore.save();
			return 'Removed';
		}

		/**
		 * 
		 * @param {object} town DB instance object
		 * @param {object} user DB instance object
		 * @param {number} amount int
		 */
		async function depositCoins(town, user, amount) {
			const inc = await town.increment('coins', { by: amount });
			const dec = await user.decrement('coins', { by: amount });
			if (!inc || !dec) return 'Failure 1';
			return 'Success';
		}

		/**
		 * 
		 * @param {object} town  DB instance object
		 * @param {object} user  DB instance object
		 * @param {number} amount int
		 */
		async function withdrawCoins(town, user, amount) {
			const inc = await user.increment('coins', { by: amount });
			const dec = await town.decrement('coins', { by: amount });
			if (!inc || !dec) return 'Failure 1';
			return 'Success';
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
