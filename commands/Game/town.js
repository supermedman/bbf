const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const { Town, MediumTile, GuildData, UserData, MaterialStore, TownMaterial, TownPlots, PlayerBuilding, CoreBuilding } = require('../../dbObjects.js');

const { loadBuilding } = require('./exported/displayBuilding.js');

const coreReq = require('../../events/Models/json_prefabs/coreBuildings.json');
const { checkUserTownPerms, checkUserAsMayor, grabUser, grabTown, grabTownByName, makeCapital, createInteractiveChannelMessage, editTimedChannelMessage, sendTimedChannelMessage, grabLocalTowns, handleLimitOnOptions } = require('../../uniHelperFunctions.js');
const { createBasicPageButtons } = require('./exported/tradeExtras.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('town')
		.setDescription('The Main command for all things town related!')
		.addSubcommand(subcommand =>
			subcommand
			.setName('join')
			.setDescription('Join an existing town!')
			.addStringOption(option =>
				option
				.setName('thetown')
				.setDescription('Which town would you like to join?')
				.setRequired(true)
				.setAutocomplete(true)
			)
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('belong')
			.setDescription('View the town you belong too, or the town of someone else.')
			.addUserOption(option => option.setName('target').setDescription('The user'))
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('bonus')
			.setDescription('Take a look at the material bonuses from the towns around you!')
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('establish')
			.setDescription('Establish a new town!')
			.addStringOption(option =>
				option
				.setName('townname')
				.setDescription('What would you like to name your town?')
				.setRequired(true)
			)
			.addStringOption(option =>
				option
				.setName('location')
				.setDescription('Where would you like to settle your new town?')
				.setRequired(true)
				.addChoices(
					{ name: 'Location 1', value: 'one' },
					{ name: 'Location 2', value: 'two' }
				)
			)
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('openplot')
			.setDescription('Mark a certain amount of town plots as available to anyone belonging to the town.')
			.addIntegerOption(option =>
				option
				.setName('amount')
				.setDescription('How many plots will be made public?')
			)
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('closeplot')
			.setDescription('Mark a certain amount of town plots as unavailable to anyone belonging to the town.')
			.addIntegerOption(option =>
				option
				.setName('amount')
				.setDescription('How many plots will be made private?')
			)
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('claimplot')
			.setDescription('Claim a Town Plot as your own! Is currently free!')
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('buildplot')
			.setDescription('Build on one of your owned plots!')
			.addStringOption(option =>
				option
				.setName('theplot')
				.setDescription('Which plot would you like to build on?')
				.setRequired(true)
				.setAutocomplete(true)
			)
			.addStringOption(option =>
				option
				.setName('buildtype')
				.setDescription('Which plot would you like to build on?')
				.setRequired(true)
				.addChoices(
					{ name: 'House', value: 'house' }
				)
			)
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('viewplot')
			.setDescription('View a town plot')
			.addStringOption(option =>
				option
				.setName('thetown')
				.setDescription('Which town would you like to view?')
				.setRequired(true)
				.setAutocomplete(true)
			)
			.addStringOption(option =>
				option
				.setName('townplots')
				.setDescription('Which plot would you like to view?')
				.setRequired(true)
				.setAutocomplete(true)
			)
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('buildcore')
			.setDescription('Begin construction of a core town building!')
			.addStringOption(option =>
				option
				.setName('coretype')
				.setDescription('Which core town building would you like to build?')
				.setRequired(true)
				.setAutocomplete(true)
			)
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('upgradecore')
			.setDescription('Begin upgrade for a core town building!')
			.addStringOption(option =>
				option
				.setName('coretype')
				.setDescription('Which core town building would you like to upgrade?')
				.setRequired(true)
				.setAutocomplete(true)
			)
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('viewcore')
			.setDescription('View an existing core town building!')
			.addStringOption(option =>
				option
				.setName('thetown')
				.setDescription('Which town would you like to view?')
				.setRequired(true)
				.setAutocomplete(true)
			)
			.addStringOption(option =>
				option
				.setName('coretype')
				.setDescription('Which core town building would you like to view?')
				.setRequired(true)
				.setAutocomplete(true)
			)
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('appoint')
			.setDescription('Appoint a user to allow them access to town editing commands.')
			.addUserOption(option => option.setName('target').setDescription('The user'))
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('demote')
			.setDescription('Demote a user to revoke access to town editing commands.')
			.addUserOption(option => option.setName('target').setDescription('The user'))
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('transfer')
			.setDescription('Transfer ownership of a town to another user.')
			.addUserOption(option => option.setName('target').setDescription('The user'))
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('deposit')
			.setDescription('Transfer coins or materials from your personal balance into the towns treasury.')
			.addStringOption(option =>
				option
				.setName('type')
				.setDescription('Coins or Materials?')
				.setRequired(true)
				.addChoices(
					{ name: 'Coins', value: 'coin' },
					{ name: 'Materials', value: 'mat' }
				)
			)
			.addStringOption(option =>
				option
				.setName('item')
				.setDescription('Which item would you like to deposit?')
				.setAutocomplete(true)
			)
			.addIntegerOption(option =>
				option
				.setName('amount')
				.setDescription('How much will you be transfering?')
			)
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('withdraw')
			.setDescription('Transfer coins or materials from the towns treasury into your personal balance.')
			.addStringOption(option =>
				option
				.setName('type')
				.setDescription('Coins or Materials?')
				.setRequired(true)
				.addChoices(
					{ name: 'Coins', value: 'coin' },
					{ name: 'Materials', value: 'mat' }
				)
			)
			.addStringOption(option =>
				option
				.setName('item')
				.setDescription('Which item would you like to withdraw?')
				.setAutocomplete(true)
			)
			.addIntegerOption(option =>
				option
				.setName('amount')
				.setDescription('How much will you be transfering?')
			)
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('storage')
			.setDescription('View material storage for your town.')
		),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);

		let choices = [];

		// Locate local towns pertaining to guild command is used on
		if (focusedOption.name === 'thetown') {
			const focusedValue = interaction.options.getFocused(false);

			const medTile = await MediumTile.findOne({ where: { guildid: interaction.guild.id } });
			const slotOne = (medTile.town_one !== '0') ? await Town.findOne({ where: { townid: medTile.town_one } }).name : 'None';
			const slotTwo = (medTile.town_two !== '0') ? await Town.findOne({ where: { townid: medTile.town_two } }).name : 'None';

			// let townOne = 'None', townTwo = 'None';
			// if (medTile.town_one !== '0') {
			// 	townOne = medTile.town_one;
			// 	townOne = await Town.findOne({ where: { townid: townOne } });
			// 	townOne = townOne.name;
			// }
			// if (medTile.town_two !== '0') {
			// 	townTwo = medTile.town_two;
			// 	townTwo = await Town.findOne({ where: { townid: townTwo } });
			// 	townTwo = townTwo.name;
			// }

			choices = [slotOne, slotTwo];

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
				handleLimitOnOptions(filtered).map(choice => ({ name: choice, value: choice })),
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

		// Locate exisiting core town buildings, using provided 'thetown' option if none, use users townid as reference  
		if (focusedOption.name === 'coretype') {
			const focusedValue = interaction.options.getFocused(false);
			const townPicked = interaction.options.getString('thetown') ?? 'NONE';
			const user = await UserData.findOne({ where: { userid: interaction.user.id } });

			let theTown;
			if (interaction.options.getSubcommand() === 'viewcore') {
				if (townPicked !== 'NONE' && townPicked !== 'None') {
					theTown = await Town.findOne({ where: { name: townPicked } });
				}
			} else if (user && user.townid !== '0') theTown = await Town.findOne({ where: { townid: user.townid } });

			if (theTown) {
				if (interaction.options.getSubcommand() === 'buildcore') {
					if (theTown.grandhall_status === 'None') choices.push('Grand Hall');
					if (theTown.bank_status === 'None') choices.push('Bank');
					if (theTown.market_status === 'None') choices.push('Market');
					if (theTown.tavern_status === 'None') choices.push('Tavern');
					if (theTown.clergy_status === 'None') choices.push('Clergy');
				} else {
					if (theTown.grandhall_status !== 'None') choices.push('Grand Hall');
					if (theTown.bank_status !== 'None') choices.push('Bank');
					if (theTown.market_status !== 'None') choices.push('Market');
					if (theTown.tavern_status !== 'None') choices.push('Tavern');
					if (theTown.clergy_status !== 'None') choices.push('Clergy');
                }
			} else choices.push('None');

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
        }
    },
	async execute(interaction) {

		const { betaTester, materialFiles } = interaction.client;

		if (!betaTester.has(interaction.user.id)) return await interaction.reply('This command is under construction!! It is currently only available to early access testers!');

		const subCom = interaction.options.getSubcommand();

		const needsEditPerms = ['deposit', 'withdraw', 'openplot', 'closeplot', 'buildcore', 'upgradecore']; // Requires edit perms to use
		// const wantsEditPerms = ['claimplot']; // More options if edit perms are given
		const needsMayorPerms = ['appoint', 'demote', 'transfer']; // Only Mayor can use

		const canEdit = checkUserTownPerms;
		const isMayor = checkUserAsMayor;
		const hasTown = async (user) => typeof await grabTown(user.townid) !== 'undefined';

		const checkTownPerms = async (user) => {
			return {isMayor: await isMayor(user), canEdit: await canEdit(user), hasTown: await hasTown(user), townID: user.townid};
		};

		const user = await grabUser(interaction.user.id);
		const permList = await checkTownPerms(user);

		const targetUser = await grabUser(interaction.options.getUser('target').id ?? interaction.user.id);
		if (!targetUser) return await interaction.reply({content: `Selected user does not have a game profile yet!`, ephemeral: true});
		const targetPermList = await checkTownPerms(targetUser);

		if (!['establish', 'join'].includes(subCom) && !permList.hasTown) return await interaction.reply({content: 'You must first join/establish a town to use this command!', ephemeral: true});
		if (['establish', 'join'].includes(subCom) && permList.hasTown) return await interaction.reply({content: 'You already belong to a town!', ephemeral: true});
		// if (subCom === 'belong' && !permList.hasTown) return await interaction.reply({content: 'You already belong to a town!', ephemeral: true});
		if (needsEditPerms.includes(subCom) && !permList.canEdit) return await interaction.reply({content: 'You do not have the required town permissions to use this command!', ephemeral: true});
		if (needsMayorPerms.includes(subCom) && !permList.isMayor) return await interaction.reply({content: 'Only the mayor can use this command!', ephemeral: true});

		const townName = interaction.options.getString('thetown') ?? 'None';

		const grabTownFromOptions = async (subCom) => {
			switch(subCom){
				case "join":
				return await grabTownByName(townName);
				case "belong":
				return await grabTown(targetUser.townid);
				default:
				return await grabTown(user.townid);
			}
		};
		const townRef = await grabTownFromOptions(subCom);
		const mayorRef = await grabUser(townRef.mayorid) ?? 'None';

		const localTowns = await grabLocalTowns(interaction.guild.id);

		const confirmButt = new ButtonBuilder()
		.setLabel('Confirm!')
		.setStyle(ButtonStyle.Primary)
		.setCustomId('confirm');
		const cancelButt = new ButtonBuilder()
		.setLabel('Cancel!')
		.setStyle(ButtonStyle.Secondary)
		.setCustomId('cancel');

		const buttonList = [confirmButt, cancelButt];

		const basePageButts = createBasicPageButtons("Primary");

		const actionOneButt = new ButtonBuilder();
		const actionTwoButt = new ButtonBuilder();

		// Empty ActionRowBuilder() & EmbedBuilder()
		const actionButtRow = new ActionRowBuilder();
		const firstDisplayEmbed = new EmbedBuilder();

		// Used for dynamic assignments
		const replyObj = {
			embeds: [], 
			components: []
		};

		let hasActionRow = true, usePagination = false, useActionOneButt = false, useActionTwoButt = false;
		switch(subCom){
			case "establish":

			break;
			case "join": // JOIN AN EXISTING TOWN
				if (!townRef) return await interaction.reply({content: `The town of ${townName} could not be found!`, ephemeral: true});

				firstDisplayEmbed
				.setTitle(`== Join ${makeCapital(townName)} ==`)
				.setColor(0o0)
				.addFields({ name: 'Join: ', value: 'Confirm to join this town!' });
			break;
			case "belong": // VIEW AN EXISTING TOWN
				if (!targetPermList.hasTown) return await interaction.reply({content: `${makeCapital(targetUser.username)} does not belong to a town yet!`, ephemeral: true});

				const townDetails = await generateTownDisplayEmbed(townRef, mayorRef);

				firstDisplayEmbed
				.setTitle(townDetails.title)
				.setColor(townDetails.color)
				.addFields(townDetails.fields);

				hasActionRow = false;
			break;
			case "bonus": // DISPLAY LOCAL TOWN MAT BONUSES
				if (localTowns.length === 0) return await interaction.reply({content: 'No local towns could be found!', ephemeral: true});

				const localBonuses = generateLocalTownBonuses(localTowns);

				firstDisplayEmbed
				.setTitle(localBonuses.title)
				.setColor(localBonuses.color)
				.addFields(localBonuses.fields);

				hasActionRow = false;
			break;
			case "appoint": // GIVE TOWN PERMS
				if (permList.townID !== targetPermList.townID) return await interaction.reply({content: 'The user picked does not belong to your town!', ephemeral: true});
				if (targetPermList.canEdit) return await interaction.reply({content: 'This user has already been appointed!', ephemeral: true});

				firstDisplayEmbed
				.setTitle('== Appoint User ==')
				.setDescription(`Are you sure you would like to appoint ${makeCapital(targetUser.username)}? This will grant them town managment permissions`);
			break;
			case "demote": // TAKE TOWN PERMS
				if (permList.townID !== targetPermList.townID) return await interaction.reply({content: 'The user picked does not belong to your town!', ephemeral: true});
				if (!targetPermList.canEdit) return await interaction.reply({content: 'This user has not been appointed!', ephemeral: true});

				firstDisplayEmbed
				.setTitle('== Demote User ==')
				.setDescription(`Are you sure you would like to demote ${makeCapital(targetUser.username)}? This will revoke there current town managment permissions`);
			break;
			case "transfer": // TRANSFER OWNED TOWN
				if (permList.townID !== targetPermList.townID) return await interaction.reply({content: 'The user picked does not belong to your town!', ephemeral: true});

				buttonList[0].setStyle(ButtonStyle.Danger);

				firstDisplayEmbed
				.setTitle('== TRANSFER OWNERSHIP ==')
				.setColor('Red')
				.setDescription('This process ***CANNOT BE UNDONE!!!***')
				.addFields({ name: 'Are you sure you want to transfer ownership?', value: `${makeCapital(targetUser.username)} will become the new mayor!`});
			break;
			case "deposit":
				// USE BUTTON NAV MENU
				// USE AMOUNT/COIN BUTT MENU
				// PAGE 1: TYPE
				// PAGE 2: AMOUNT
				// PAGE 3: CONFIRM
			break;
			case "withdraw":
				// USE BUTTON NAV MENU
				// USE AMOUNT/COIN BUTT MENU
				// PAGE 1: TYPE
				// PAGE 2: AMOUNT
				// PAGE 3: CONFIRM
			break;
			case "openplot":
				// USE BUTTON NAV MENU
				// USE AMOUNT BUTT MENU
				// PAGE 1: AMOUNT
				// PAGE 2: CONFIRM
			break;
			case "closeplot":
				// USE BUTTON NAV MENU
				// USE AMOUNT BUTT MENU
				// PAGE 1: AMOUNT
				// PAGE 2: CONFIRM
			break;
			case "claimplot":
				// USE BUTTON NAV MENU
				// PAGE 1: SELECT FROM
				// PAGE 2: CONFIRM
			break;
			case "buildplot":
				// USE BUTTON NAV MENU
				// PAGE 1: SELECT FROM
				// PAGE 2: CONFIRM
			break;
			case "viewplot":
				// USE BUTTON NAV MENU
				// PAGE 1: VIEW PAGES
			break;
			case "buildcore":
				// USE BUTTON NAV MENU
				// PAGE 1: TYPE
				// PAGE 2: COST
				// PAGE 3: CONFIRM
			break;
			case "upgradecore":
				// USE BUTTON NAV MENU
				// PAGE 1: TYPE
				// PAGE 2: COST
				// PAGE 3: CONFIRM
			break;
			case "viewcore":
				// USE BUTTON NAV MENU
				// PAGE 1: VIEW PAGES
			break;
			case "storage":
				// USE BUTTON NAV MENU
				// PAGE 1: VIEW PAGES
			break;
		}

		if (!hasActionRow){
			return await sendTimedChannelMessage(interaction, 120000, replyObj, "Reply");
		}

		replyObj.embeds = [firstDisplayEmbed];
		replyObj.components = [actionButtRow.addComponents(buttonList)];

		if (usePagination) {
			if (useActionOneButt || useActionTwoButt){
				const usedActionButts = [];
				if (useActionOneButt) usedActionButts.push(actionOneButt);
				if (useActionTwoButt) usedActionButts.push(actionTwoButt);
				basePageButts.push(basePageButts.splice(1, 1, usedActionButts)[0]);
			}
			
			const pageButts = new ActionRowBuilder().addComponents(basePageButts);
			replyObj.components.push(pageButts);
		}

		// const replyObj = {embeds: [firstDisplayEmbed], components: [actionButtRow]};
		const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, "Reply");

		// =====================
		// BUTTON COLLECTOR
		collector.on('collect', async c => {
			await c.deferUpdate().then(async () => {
				let editWith, confirmOutcome;
				switch(c.customId){
					case "confirm":
						switch(subCom){
							case "join":
								confirmOutcome = await handleJoinTown(townRef, user);
								editWith = {embeds: [confirmOutcome.embeds], components: []};
							break;
							case "appoint":
								confirmOutcome = await updateTownCanEditList(townRef, targetUser, "appoint");
								editWith = {embeds: [confirmOutcome.embeds], components: []};
							break;
							case "demote":
								confirmOutcome = await updateTownCanEditList(townRef, targetUser, "demote");
								editWith = {embeds: [confirmOutcome.embeds], components: []};
							break;
							case "transfer":
								confirmOutcome = await updateTownMayor(townRef, targetUser);
								editWith = {embeds: [confirmOutcome.embeds], components: []};
							break;
							case "":

							break;
						}
					break;
					case "cancel":
						switch(subCom){
							case "join":
							return collector.stop('Cancel');
							case "":

							break;
							default:
							return collector.stop('Cancel');
						}
					break;
				}
				await anchorMsg.edit(editWith);
				if (confirmOutcome.status === 'Complete') return collector.stop('Finished');
			}).catch(e => console.error(e));
		});
		// =====================

		// =====================
		// BUTTON COLLECTOR
		collector.on('end', async (c, r) => {
			if (!r || r === 'time' || r === 'Cancel') await handleCatchDelete(anchorMsg);

			if (r === 'Finished'){
				await editTimedChannelMessage(anchorMsg, 60000, {embeds: [anchorMsg.embeds[0]], components: []});
			}
		});
		// =====================

		/**
		 * This function handles transfering ownership of the given town, to the given user.
		 * @param {object} town Town DB Object
		 * @param {object} user UserData DB Object
		 * @returns {Promise <{embeds: EmbedBuilder, status: string}>}
		 */
		async function updateTownMayor(town, user){
			await town.update({mayorid: user.userid}).then(async t => await t.save()).then(async t => {return await t.reload()});

			const returnEmbed = new EmbedBuilder()
			.setTitle('== Transfer Complete ==')
			.setDescription(`${makeCapital(user.username)} has been made the new mayor!`);

			return {embeds: [returnEmbed], status: 'Complete'};
		}

		/**
		 * This function handles appointing/demoting a selected user from a given town.
		 * @param {object} town Town DB Object
		 * @param {object} user UserData DB Object
		 * @param {string} changeType One of: ``appoint`` | ``demote``
		 * @returns {Promise <{embeds: EmbedBuilder, status: string}>}
		 */
		async function updateTownCanEditList(town, user, changeType){
			const curEditList = town.can_edit.split('-');

			const returnEmbed = new EmbedBuilder();
			let newEditList;
			switch(changeType){
				case "appoint":
					newEditList = curEditList.push(user.userid);
					returnEmbed
					.setTitle('== User Appointed ==')
					.setDescription(`${makeCapital(user.username)} has been appointed to your town!`);
				break;
				case "demote":
					newEditList = curEditList.filter(id => id !== user.userid);
					returnEmbed
					.setTitle('== User Demoted ==')
					.setDescription(`${makeCapital(user.username)} has been demoted from your town!`);
				break;
			}

			await town.update({can_edit: newEditList.toString()}).then(async t => await t.save()).then(async t => {return await t.reload()});

			return {embeds: [returnEmbed], status: 'Complete'};
		}

		/**
		 * This function loads the display object for all local town material bonuses available.
		 * @param {object[]} towns List of all local towns
		 * @returns {{title: string, color: string, fields: {name: string, value: string}[]}}
		 */
		function generateLocalTownBonuses(towns){
			const finalObj = {
				title: `== Local Town Bonuses ==`,
				color: "",
				fields: []
			};

			const allignMatBonus = {
				Normal: [10, 5, 3, 3],
				Evil: [5, 3, 1, 1],
				Phase: [10, 8, 5, 5],
			};

			const finalFields = [];
			for (const town of towns){
				const matTypes = town.mat_bonus.split(',');
				const bonusList = allignMatBonus[`${town.local_biome.split('-')[1]}`];

				let bonusIdx = 0, finalValue = "";
				for (const type of matTypes){
					finalValue += `+${bonusList[bonusIdx]} ${makeCapital(type)}\n`;
					bonusIdx++;
				}

				finalFields.push({name: `The Town of ${makeCapital(town.name)} gives: `, value: finalValue});
			}

			finalObj.fields = finalFields;
			finalObj.color = 'DarkGold';

			return finalObj;
		}

		/**
		 * This function generates the embed values for the ``town`` requested.
		 * @param {object} town Town DB Object
		 * @param {object} mayor UserData DB Object
		 * @returns {Promise <{title: string, color: string, fields: {name: string, value: string}[]}>}
		 */
		async function generateTownDisplayEmbed(town, mayor){
			const finalObj = {
				title: `== Town of ${makeCapital(town.name)} ==`,
				color: "",
				fields: []
			};

			// finalObj.description = `Current Mayor: ${mayor.username}\nTown Level: ${town.level}\nTreasury Contains: ${town.coins}c\n========\nHuman Population: ${town.population}\nNPC Population: ${town.npc_population}\n========\nMax Buildings: ${town.buildlimit}\nOpen Plots: ${town.openplots}\nClosed Plots: ${town.closedplots}\nOwned Plots: ${town.ownedplots}\nBuildings: ${town.buildcount}\n========\nMain Biome: ${biomeList[0]}\nAllignment: ${biomeList[1]}\n========\n`;

			// Basic Info
            // ==========
            // Level, Coins, Location, Population
            const locationSwitch = town.local_biome.split("-");
            const basicField = {
                name: '== Basic Info ==',
                value: `Town Level: **${town.level}**\nTown Coins: **${town.coins}**c\nTown Biome: **${locationSwitch[1]} ${locationSwitch[0]}**\nPlayer Population: **${town.population}**\nNPC Population: **${town.npc_population}**`
            };

            // Mayor Info
            // ==========
            // Cur-User?
            // const theMayor = await grabUser(town.mayorid);
            const mayorField = {
                name: '== The Mayor ==',
                value: `**${makeCapital(mayor.username)}**`
            };

            // Build Info
            // ==========
            // Tot-Plots, Open, Closed, Built
            const buildFields = {
                name: '== Plot Info ==',
                value: `Total Plots: **${town.buildlimit}**\nOpen Plots: **${town.openplots}**\nClosed Plots: **${town.closedplots}**\nOwned Plots: **${town.ownedplots}**\nDeveloped Plots: **${town.buildcount}**`
            };

            // Core Info
            // =========
            // Grandhall, Bank, Market, Tavern, Clergy
			/**
			 * This method loads the appropete display text given the status of a core building.
			 * @param {string} status Corebuilding build status
			 * @returns {string}
			 */
			const loadCoreTextFromStatus = (status) => {
				return (status === 'None') ? "Not Built" : `Progress: ${status.split(': ')[0]} @ ${status.split(': ')[1]}`;
			};
			// 0 Grandhall, 1 Bank, 2 Market, 3 Tavern, 4 Clergy
			const coreTextList = [
				loadCoreTextFromStatus(town.grandhall_status), 
				loadCoreTextFromStatus(town.bank_status), 
				loadCoreTextFromStatus(town.market_status), 
				loadCoreTextFromStatus(town.tavern_status), 
				loadCoreTextFromStatus(town.clergy_status)
			];
            const coreFields = {
                name: '== Core-Building Info ==',
                value: `Grandhall Status: **${coreTextList[0]}**\nBank Status: **${coreTextList[1]}**\nMarket Status: **${coreTextList[2]}**\nTavern Status: **${coreTextList[3]}**\nClergy Status: **${coreTextList[4]}**`
            };

			// Embed Fields
			finalObj.fields = [mayorField, basicField, buildFields, coreFields];

			const biomeColours = {
				Forest: 'DarkGreen',
				Mountain: 'LightGrey',
				Desert: 'DarkGold',
				Plains: 'Gold',
				Swamp: 'DarkAqua',
				Grassland: 'Green'
			};

			// Embed Colour
			finalObj.color = biomeColours[`${locationSwitch[0]}`];

			return finalObj;
		}

		/**
		 * This function handles updating both the ``town`` and ``user`` objects given.
		 * 
		 * ``town.population++``
		 * 
		 * ``user.townid`` = ``town.townid``
		 * @param {object} town Town DB Object
		 * @param {object} user UserData DB Object
		 * @returns {Promise <{embeds: EmbedBuilder, status: string}>}
		 */
		async function handleJoinTown(town, user){
			await town.increment('population').then(async t => await t.save()).then(async t => {return await t.reload()});
			await handleTownPopLeveling(town);
			await user.update({townid: town.townid}).then(async u => await u.save()).then(async u => {return await u.reload()});

			const finalEmbed = new EmbedBuilder()
			.setTitle('== Town Joined ==')
			.setDescription(`Congratulations!! You are now a member of ${makeCapital(town.name)}!`);

			return {embeds: finalEmbed, status: 'Complete'};
		}

		/**
		 * This function handles checking if the given ``town`` meets the level up requirements.
		 * @param {object} town Town DB Object
		 * @returns {Promise <void>}
		 */
		async function handleTownPopLeveling(town){
			const townLevelCheckStart = new Date().getTime();
			let timerEndsText = 'Town Level Checking';

			const staticTownPopLevelReq = (town) => {
				const totPop = town.population + town.npc_population;
				const levelUPReq = town.level * 5;
				return totPop >= levelUPReq;
			};

			if (staticTownPopLevelReq(town)) {
				await town.increment('level').then(async t => await t.save()).then(async t => {return await t.reload()});
				// CHANGE THIS VALUE BASED ON LEVEL/OTHER FACTORS!!
				const plotsNeeded = 5;
				await handleNewTownPlotCreation(town, plotsNeeded);
				timerEndsText += ' (LEVEL UP)';
			}

			endTimer(townLevelCheckStart, timerEndsText);
			return;
		}

		/**
		 * This function generates ``plotAmount`` new plots linked by ``town.townid``.
		 * @param {object} town Town DB Object
		 * @param {number} plotAmount Number of new plots to create
		 * @returns {Promise <void>}
		 */
		async function handleNewTownPlotCreation(town, plotAmount){
			const makeNewPlotsStart = new Date().getTime();
			for (let i = 0; i < plotAmount; i++){
				await TownPlots.create({
					townid: town.townid
				}).then(async tp => await tp.save()).then(async tp => {return await tp.reload()});
			}
			endTimer(makeNewPlotsStart, 'Create New Town Plots');
			console.log(`Current Total Plots for ${makeCapital(town.name)}: %d`, await TownPlots.findAll({where: {townid: town.townid}}).length);
		}


		// Establish Town
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
				npc_population: 0
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

		// Join Town
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
				.setColor(0o0)
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

					let popInc;
					if ((theTown.population + theTown.npc_population) >= theTown.level * 5) popInc = await theTown.increment('level');
					if (popInc) {
						await theTown.save();

						let plotsNeeded = 5;
						for (let i = 0; i < plotsNeeded; i++) {
							let newPlot = await TownPlots.create({
								townid: theTown.townid,
							});
							if (newPlot) await newPlot.save();
						}
					} 

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

		// Same as Town Inspect
		if (interaction.options.getSubcommand() === 'belong') {
			const targetUser = interaction.options.getUser('target') ?? 'NONE';
			let user;
			if (targetUser !== 'NONE') {
				user = await UserData.findOne({ where: { userid: targetUser.id } });
			} else user = await grabU();

			if (!user) return await noUser();
			if (user.townid === '0' && targetUser === 'NONE') return await interaction.reply('You do not belong to a town yet! Use ``/town join`` to join a town!');
			if (user.townid === '0' && targetUser !== 'NONE') return await interaction.reply('That user does not belong to a town yet!');

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

				fieldName = 'GRAND HALL';

				const grandHall = await CoreBuilding.findOne({ where: [{ townid: townRef.townid }, {build_type: 'grandhall'}] });
				fieldValue = `Level: ${grandHall.level}\nConstruction Status: ${grandHall.build_status}\nTown Status: ${townRef.grandhall_status}`;

				fieldObj = { name: fieldName, value: fieldValue, };
				finalFields.push(fieldObj);
			} else finalFields.push({ name: 'GRAND HALL', value: 'Not Built!' });
			// BANK
			if (townRef.bank_status !== 'None') {
				fieldName = '';
				fieldValue = '';

				fieldName = 'BANK';

				const bank = await CoreBuilding.findOne({ where: [{ townid: townRef.townid }, { build_type: 'bank' }] });
				fieldValue = `Level: ${bank.level}\nConstruction Status: ${bank.build_status}\nTown Status: ${townRef.bank_status}`;

				fieldObj = { name: fieldName, value: fieldValue, };
				finalFields.push(fieldObj);
			} else finalFields.push({ name: 'BANK', value: 'Not Built!' });
			// MARKET
			if (townRef.market_status !== 'None') {
				fieldName = '';
				fieldValue = '';

				fieldName = 'MARKET';

				const market = await CoreBuilding.findOne({ where: [{ townid: townRef.townid }, { build_type: 'market' }] });
				fieldValue = `Level: ${market.level}\nConstruction Status: ${market.build_status}\nTown Status: ${townRef.market_status}`;

				fieldObj = { name: fieldName, value: fieldValue, };
				finalFields.push(fieldObj);
			} else finalFields.push({ name: 'MARKET', value: 'Not Built!' });
			// TAVERN
			if (townRef.tavern_status !== 'None') {
				fieldName = '';
				fieldValue = '';

				fieldName = 'TAVERN';

				const tavern = await CoreBuilding.findOne({ where: [{ townid: townRef.townid }, { build_type: 'tavern' }] });
				fieldValue = `Level: ${tavern.level}\nConstruction Status: ${tavern.build_status}\nTown Status: ${townRef.tavern_status}`;

				fieldObj = { name: fieldName, value: fieldValue, };
				finalFields.push(fieldObj);
			} else finalFields.push({ name: 'TAVERN', value: 'Not Built!' });
			// CLERGY
			if (townRef.clergy_status !== 'None') {
				fieldName = '';
				fieldValue = '';

				fieldName = 'CLERGY';

				const clergy = await CoreBuilding.findOne({ where: [{ townid: townRef.townid }, { build_type: 'clergy' }] });
				fieldValue = `Level: ${clergy.level}\nConstruction Status: ${clergy.build_status}\nTown Status: ${townRef.clergy_status}`;

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

		// This pulls all local towns mat bonuses and displays
		if (interaction.options.getSubcommand() === 'bonus') {
			const towns = await Town.findAll({ where: { guildid: interaction.guild.id } });
			if (towns.length <= 0) return await interaction.reply('There are no towns here!');

			const allignBonus = {
				Normal: [10, 5, 3],
				Evil: [5, 3, 1],
				Phase: [10, 8, 5],
			};

			let possibleBonus = [];
			let curPos = 0;
			for (const theTown of towns) {
				const matTypes = theTown.mat_bonus.split(',');

				const allignmentSlices = theTown.local_biome.split('-');
				const allignment = allignmentSlices[1];

				const matchBonus = allignBonus[`${allignment}`];

				possibleBonus[curPos] = matTypes.join(', ') + ':\n +' + matchBonus.join(', +') + ', +' + matchBonus[0];
				curPos++;
			}

			let finalFields = [];
			if (curPos === 1) finalFields.push({ name: towns[0].name, value: possibleBonus[0].toString() });
			if (curPos === 2) finalFields.push({ name: towns[0].name, value: possibleBonus[0].toString() }, { name: towns[1].name, value: possibleBonus[1].toString() });

			const bonusEmbed = new EmbedBuilder()
				.setTitle('Material Bonuses')
				.addFields(finalFields);

			return await interaction.reply({ embeds: [bonusEmbed] });
        }

		// Appoint user to edit permissions
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
				.setColor(0o0)
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

		// Demote user from edit permissions
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
				.setColor(0o0)
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

		// Transfer town ownership
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
				.setColor(0o0)
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

		// Deposit coins or materials to guild storage
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
				item = await MaterialStore.findOne({ where: [{spec_id: user.userid}, { name: theItem }] });
				if (!item || item.amount < amount) return await interaction.reply(`You do not have that many ${theItem}!`);
			} else {
				if (user.coins < amount) return await interaction.reply('You do not have that many coins!!');
            }

			let result = '';
			if (transType === 'mat') result = await depositMaterial(theTown, user, item, amount);
			if (transType === 'coin') result = await depositCoins(theTown, user, amount);

			if (result === 'Success') return await interaction.reply('Deposit Successful!!');
		}

		// Withdraw coins or materials from guild storage
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

		// Open unowned, closed, town plots
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

		// Close unowned, opened, town plots
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

		// Claim open/closed town plot
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

		// Build on owned town plot
		if (interaction.options.getSubcommand() === 'buildplot') {
			const buildingType = interaction.options.getString('buildtype');
			const plotStr = interaction.options.getString('theplot') ?? 'NONE';
			if (plotStr === 'None' || plotStr === 'NONE') return await interaction.reply('The plot you are looking for does not exist, or you selected an invalid option! Double check if you own a town plot first!');

			const plotIndex = createIndexFromStr(plotStr);

			const user = await grabU();
			if (!user) return await noUser();

			const playerPlots = await TownPlots.findAll({ where: [{ townid: user.townid }, { ownerid: user.userid }, { empty: true }] });
			if (playerPlots.length <= 0) return await interaction.reply('No owned plots found!');

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

		// View built on town plots
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
			if (townPlots <= 0) return await interaction.reply('No built on town plots found!');

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
				.setColor(0o0)
				.addFields(finalFields);

			await interaction.deferReply();
			const attachment = await loadBuilding(theBuilding);

			return await interaction.followUp({embeds: [embed], files: [attachment] });
		}

		// Begin core building construction
		if (interaction.options.getSubcommand() === 'buildcore') {
			const coreType = extractCoreType(interaction.options.getString('coretype'));
			if (coreType === 'None') return await interaction.reply('That was not a valid core town building!!');

			const user = await grabU();
			if (!user) return await noUser();

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

			const biomeBackgrounds = {
				"Forest": 1,
				"Mountain": 2,
				"Desert": 3,
				"Plains": 4,
				"Swamp": 5,
				"Grassland": 6
			};

			const biomeList = theTown.local_biome.split('-');
			const buildBackground = biomeBackgrounds[`${biomeList[0]}`];

			const coreLevel = 1;
			const filteredCore = coreReq.filter(core => core.Name === coreType);
			const coreRef = filteredCore[0];

			const reqListing = ['Stone', 'Wood', 'Metal', 'Hide', 'Slime'];
			const matEqui = ['rocky', 'woody', 'metalic', 'skinny', 'slimy'];

			const baseMatReq = {
				"Stone": coreRef.Stone,
				"Stone_Level": coreRef.Stone_Level,
				"Stone_Rar": coreRef.Stone_Rar,
				"Wood": coreRef.Wood,
				"Wood_Level": coreRef.Wood_Level,
				"Wood_Rar": coreRef.Wood_Rar,
				"Metal": coreRef.Metal,
				"Metal_Level": coreRef.Metal_Level,
				"Metal_Rar": coreRef.Metal_Rar,
				"Hide": coreRef.Hide,
				"Hide_Level": coreRef.Hide_Level,
				"Hide_Rar": coreRef.Hide_Rar,
				"Slime": coreRef.Slime,
				"Slime_Level": coreRef.Slime_Level,
				"Slime_Rar": coreRef.Slime_Rar,
			};

			for (let i = 0; i < reqListing.length; i++) {
				let levelStr = `${reqListing[i]}_Level`;
				baseMatReq[`${reqListing[i]}`] = checkLevel(baseMatReq[`${reqListing[i]}`], coreLevel, baseMatReq[`${levelStr}`]);
			}
			
			function checkLevel(amount, curLevel, levelNeeded) {
				if (curLevel >= levelNeeded) return amount;
				return 0;
			}
			// Handle town material storage checking here
			let matObjList = [];
			for (let i = 0; i < reqListing.length; i++) {
				let checkingFor = matEqui[i];
				let matFile = materialFiles.get(checkingFor);
				let matList = require(matFile);

				let amountNeeded = baseMatReq[`${reqListing[i]}`];
				let rarID = baseMatReq[`${reqListing[i]}_Rar`];

				let foundMat = await checkMatStorage(amountNeeded, theTown, checkingFor, matList, rarID);
				matObjList.push(...foundMat);
			}

			let canBuild = true;
			let matRemovalList = [];
			let embedTitle = '';
			let finalFields = [];
			for (const material of matObjList) {
				let fieldName = '';
				let fieldValue = '';
				let fieldObj = {};

				if (material.amountNeeded === 0) { } else {
					if (material.buildStatus === false) canBuild = false;
					if (material.isRef) {
						fieldName = `Material: ${material.Name}\nRarity: ${material.Rarity}`;
						fieldValue = `Amount Stored: ${material.amount}\nAmount Needed: ${material.amountNeeded}`;
					} else {
						fieldName = `Material: ${material.name}\nRarity: ${material.rarity}`;
						fieldValue = `Amount Stored: ${material.amount}\nAmount Needed: ${material.amountNeeded}`;
						matRemovalList.push(material);
					}
					fieldObj = { name: fieldName, value: fieldValue };
					finalFields.push(fieldObj);
                }
            }

			if (canBuild) embedTitle = `BEGIN ${interaction.options.getString('coretype')} CONSTRUCTION?`;
			if (!canBuild) embedTitle = `Resources insufficient to build ${interaction.options.getString('coretype')}`;
			// Handle confirm embed here
			const embed = {
				title: embedTitle,
				color: 0o0,
				fields: finalFields,
			};

			if (!canBuild) return await interaction.reply({embeds: [embed]});

			
			const confirmButton = new ButtonBuilder()
				.setLabel('Confirm!')
				.setStyle(ButtonStyle.Danger)
				.setCustomId('confirm');

			const cancelButton = new ButtonBuilder()
				.setLabel('Cancel!')
				.setStyle(ButtonStyle.Primary)
				.setCustomId('cancel');

			const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

			const embedMsg = await interaction.reply({ embeds: [embed], components: [buttonRow] });

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				ComponentType: ComponentType.Button,
				filter,
				time: 10000,
			});

			// Handle building creation/display here
			collector.on('collect', async (COI) => {
				if (COI.customId === 'confirm') {
					await COI.deferUpdate().then(async () => {
						collector.stop();
						for (const material of matRemovalList) {
							let result = await removeMaterial(theTown, material, material.amountNeeded, 'town');
							if (result !== 'Removed') break;
						}
						const attachment = await handleCoreBuilding(theTown, coreType, buildBackground, 1);
						return await interaction.followUp({ files: [attachment] });
					}).catch(e => console.error(e));
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

		// Begin core building upgrade
		if (interaction.options.getSubcommand() === 'upgradecore') {
			const coreType = extractCoreType(interaction.options.getString('coretype'));
			if (coreType === 'None') return await interaction.reply('That was not a valid core town building!!');

			const user = await grabU();
			if (!user) return await noUser();

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

			// Handle aquiring core building db reference here
			const theCore = await CoreBuilding.findOne({ where: [{ townid: theTown.townid }, { build_type: coreType }] });
			if (!theCore) return await interaction.reply('Something went wrong while locating that core building!');


			const coreLevel = theCore.level + 1;
			if (coreLevel > theTown.level) return await interaction.reply('This building cannot be upgraded to a level higher than the town it is apart of!!');

			const filteredCore = coreReq.filter(core => core.Name === coreType);
			const coreRef = filteredCore[0];

			const reqListing = ['Stone', 'Wood', 'Metal', 'Hide', 'Slime'];
			const matEqui = ['rocky', 'woody', 'metalic', 'skinny', 'slimy'];

			const baseMatReq = {
				"Stone": coreRef.Stone,
				"Stone_Level": coreRef.Stone_Level,
				"Stone_Rar": coreRef.Stone_Rar,
				"Wood": coreRef.Wood,
				"Wood_Level": coreRef.Wood_Level,
				"Wood_Rar": coreRef.Wood_Rar,
				"Metal": coreRef.Metal,
				"Metal_Level": coreRef.Metal_Level,
				"Metal_Rar": coreRef.Metal_Rar,
				"Hide": coreRef.Hide,
				"Hide_Level": coreRef.Hide_Level,
				"Hide_Rar": coreRef.Hide_Rar,
				"Slime": coreRef.Slime,
				"Slime_Level": coreRef.Slime_Level,
				"Slime_Rar": coreRef.Slime_Rar,
			};

			for (let i = 0; i < reqListing.length; i++) {
				let levelStr = `${reqListing[i]}_Level`;
				let rarStr = `${reqListing[i]}_Rar`;
				baseMatReq[`${reqListing[i]}`] = checkLevel(baseMatReq[`${reqListing[i]}`], coreLevel, baseMatReq[`${levelStr}`]);

				baseMatReq[`${reqListing[i]}`] = checkMultiply(baseMatReq[`${reqListing[i]}`], coreLevel, baseMatReq[`${levelStr}`]);

				baseMatReq[`${rarStr}`] = checkRarUp(baseMatReq[`${reqListing[i]}`], coreLevel, baseMatReq[`${rarStr}`]);
			}

			// Check if material is needed for buildings next level
			function checkLevel(amount, curLevel, levelNeeded) {
				if (curLevel >= levelNeeded) return amount;
				return 0;
			}

			// Handle scaling material requirements here

			// Check how much more material is needed based on level
			function checkMultiply(amount, level, matLevel) {
				return amount * (level - (matLevel - 1));
			}

			// Check if material rarity increases based on buildings next level
			function checkRarUp(amount, curLevel, baseRar) {
				if (amount === 0) return baseRar;
				if (((curLevel / 2) % 1) === 0) return baseRar++;
				return baseRar;
			}

			// Handle town material storage checking here
			let matObjList = [];
			for (let i = 0; i < reqListing.length; i++) {
				let checkingFor = matEqui[i];
				let matFile = materialFiles.get(checkingFor);
				let matList = require(matFile);

				let amountNeeded = baseMatReq[`${reqListing[i]}`];
				let rarID = baseMatReq[`${reqListing[i]}_Rar`];

				let foundMat = await checkMatStorage(amountNeeded, theTown, checkingFor, matList, rarID);
				matObjList.push(...foundMat);
			}

			let canBuild = true;
			let matRemovalList = [];
			let embedTitle = '';
			let finalFields = [];
			for (const material of matObjList) {
				let fieldName = '';
				let fieldValue = '';
				let fieldObj = {};

				if (material.amountNeeded === 0) { } else {
					if (material.buildStatus === false) canBuild = false;
					if (material.isRef) {
						fieldName = `Material: ${material.Name}\nRarity: ${material.Rarity}`;
						fieldValue = `Amount Stored: ${material.amount}\nAmount Needed: ${material.amountNeeded}`;
					} else {
						fieldName = `Material: ${material.name}\nRarity: ${material.rarity}`;
						fieldValue = `Amount Stored: ${material.amount}\nAmount Needed: ${material.amountNeeded}`;
						matRemovalList.push(material);
					}
					fieldObj = { name: fieldName, value: fieldValue };
					finalFields.push(fieldObj);
				}
			}

			if (canBuild) embedTitle = `BEGIN ${interaction.options.getString('coretype')} CONSTRUCTION?`;
			if (!canBuild) embedTitle = `Resources insufficient to build ${interaction.options.getString('coretype')}`;

			// Handle confirm embed here
			const embed = {
				title: embedTitle,
				color: 0o0,
				fields: finalFields,
			};

			if (!canBuild) return await interaction.reply({ embeds: [embed] });

			const confirmButton = new ButtonBuilder()
				.setLabel('Confirm!')
				.setStyle(ButtonStyle.Danger)
				.setCustomId('confirm');

			const cancelButton = new ButtonBuilder()
				.setLabel('Cancel!')
				.setStyle(ButtonStyle.Primary)
				.setCustomId('cancel');

			const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

			const embedMsg = await interaction.reply({ embeds: [embed], components: [buttonRow] });

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				ComponentType: ComponentType.Button,
				filter,
				time: 10000,
			});

			// Handle building creation/display here
			collector.on('collect', async (COI) => {
				if (COI.customId === 'confirm') {
					await COI.deferUpdate().then(async () => {
						collector.stop();
						for (const material of matRemovalList) {
							let result = await removeMaterial(theTown, material, material.amountNeeded, 'town');
							if (result !== 'Removed') break;
						}
						const attachment = await handleCoreBuilding(theTown, coreType, buildBackground, newLevel);
						return await interaction.followUp({ files: [attachment] });
					}).catch(e => console.error(e));
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

			// Handle building upgrading/display here
		}

		// View existing core buildings
		if (interaction.options.getSubcommand() === 'viewcore') {
			const townName = interaction.options.getString('thetown') ?? 'NONE';
			if (townName === 'None' || townName === 'NONE') return await interaction.reply('The requested town could not be found, please select from the provided options!');

			const coreType = extractCoreType(interaction.options.getString('coretype'));
			if (coreType === 'None') return await interaction.reply('That was not a valid core town building!!');

			const user = await grabU();
			if (!user) return await noUser();

			const townRef = await Town.findOne({ where: { name: townName } });
			if (!townRef) return await interaction.reply('Something went wrong while locating that town!');

			// Handle aquiring core building db reference here
			const coreRef = await CoreBuilding.findOne({ where: [{ townid: townRef.townid }, { build_type: coreType }] });
			if (!coreRef) return await interaction.reply('Something went wrong while locating that core buildings!');

			// Handle building display here
			const attachment = await loadBuilding(coreRef);
			await interaction.reply({ files: [attachment] });

			if (coreRef.build_type === 'clergy') return await handleClergyMystQuest(user);
			return;
		}

		// View entire listing of town owned materials
		if (interaction.options.getSubcommand() === 'storage') {
			const user = await grabU();
			if (!user) return await noUser();

			const theTown = await Town.findOne({ where: { townid: user.townid } });
			if (!theTown) return await interaction.reply('You do not belong to any towns!');

			await interaction.deferReply();

			let embedTitle = '';
			let finalFields = [];

			let embedPages = [];
			for (const [key, value] of materialFiles) {
				let passType = key;
				embedTitle = `== ${passType} Type Materials ==`;
				finalFields = [];
				let matList = require(value);
				for (let i = 0; i < matList.length; i++) {
					let fieldObj = await buildMatEmbedField(theTown, passType, matList, i);
					finalFields.push(fieldObj);
				}

				let embed = {
					title: embedTitle,
					color: 0o0,
					fields: finalFields
				};
				embedPages.push(embed);
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

			const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

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
						if (currentPage === embedPages.length - 1) {
							currentPage = 0;
						} else currentPage += 1;
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					}).catch(error => {
						console.error(error);
					});
				}

				if (COI.customId === 'back-page') {
					await COI.deferUpdate().then(async () => {
						if (currentPage === 0) {
							currentPage = embedPages.length - 1;
						} else currentPage -= 1;
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
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


		/**
		 * 
		 * @param {any} town
		 * @param {any} coreType
		 * @param {any} background
		 * @param {number} level 
		 */
		async function handleCoreBuilding(town, coreType, background, level) {
			let newCore;
			if (level === 1) {
				newCore = await CoreBuilding.create({
					townid: town.townid,
					build_type: coreType,
					build_status: `Level ${level}`,
					background_tex: background,
				});
			} else {
				newCore = await CoreBuilding.findOne({ where: [{ townid: town.townid }, { build_type: coreType }] });

				const inc = await newCore.increment('level');
				if (inc) await newCore.save();
            }
			

			if (newCore) {
				const buildStatStr = `Built: Level ${level}`;
				let townUpdate; 
				if (coreType === 'grandhall') townUpdate = await town.update({ grandhall_status: buildStatStr });
				if (coreType === 'bank') townUpdate = await town.update({ bank_status: buildStatStr });
				if (coreType === 'market') townUpdate = await town.update({ market_status: buildStatStr });
				if (coreType === 'tavern') townUpdate = await town.update({ tavern_status: buildStatStr });
				if (coreType === 'clergy') townUpdate = await town.update({ clergy_status: buildStatStr });
				if (townUpdate) await town.save();
			}

			let attachment;
			if (newCore) attachment = await loadBuilding(newCore);
			if (attachment) return attachment;
        }

		/**
		 * 
		 * @param {any} town
		 * @param {any} matType
		 * @param {any} matFile
		 * @param {any} rarID
		 */
		async function buildMatEmbedField(town, matType, matFile, rarID) {
			let fieldName = '';
			let fieldValue = '';
			let fieldObj = {};

			let uniID;
			if (matType === 'unique') uniID = 0 + rarID, rarID = 12;

			const filteredMat = matFile.filter(mat => mat.Rar_id === rarID);
			if (uniID) {
				const matRef = filteredMat[uniID];
				
				let theMat = await TownMaterial.findOne({
					where: [{ townid: town.townid },
					{ mat_id: matRef.Mat_id },
					{ rarity: 'Unique' }]
				});

				if (!theMat) {
					fieldName = `Unknown material of ${matRef.Rarity} Rarity:`;
					fieldValue = '0';
				} else {
					fieldName = `${theMat.name}:`;
					fieldValue = `${theMat.amount}`;
				}

				fieldObj = { name: fieldName, value: fieldValue };
				return fieldObj;
            }

			const matRef = filteredMat[0];

			const theMat = await TownMaterial.findOne({
				where:
					[{ townid: town.townid },
					{ mat_id: matRef.Mat_id },
					{ rar_id: matRef.Rar_id },
					{ mattype: matType }]
			});

			if (!theMat) {
				fieldName = `Unknown material of ${matRef.Rarity} Rarity:`;
				fieldValue = '0';
			} else {
				fieldName = `${theMat.name}:`;
				fieldValue = `${theMat.amount}`;
            }

			fieldObj = { name: fieldName, value: fieldValue };
			return fieldObj;
        }

		/**
		 * 
		 * @param {number} amountNeeded Int
		 * @param {object} town DB instance
		 * @param {string} matType Material Type
		 * @param {string} matList required file
		 * @param {number} rarID Rar_id Ref
		 */
		async function checkMatStorage(amountNeeded, town, matType, matList, rarID) {
			const filteredMat = matList.filter(mat => mat.Rar_id === rarID);
			const matRef = filteredMat[0];

			let theMat = await TownMaterial.findOne({
				where:
					[{ townid: town.townid },
					{ mat_id: matRef.Mat_id },
					{ rar_id: matRef.Rar_id },
					{ mattype: matType }]
			});

			let canBuild = true;
			let matfound = true;
			if (!theMat && amountNeeded > 0) matfound = false, canBuild = false;
			if (!theMat) { matfound = false; } else {
				if (theMat.amount < amountNeeded) canBuild = false;
            }
			

			let toMap = [];
			if (matfound) {
				toMap.push(theMat.dataValues);
				theMat = toMap.map(mat => ({ ...mat, amountNeeded: amountNeeded, buildStatus: canBuild }),);
			} else {
				toMap.push(matRef);
				theMat = toMap.map(mat => ({ ...mat, amount: 0, amountNeeded: amountNeeded, buildStatus: canBuild, isRef: true }),);
			}
			
			return theMat;
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


		// This function is temporary
		/** This function handles checking if a user is eligable for recieving a phasereader needed to craft a personal forge,
		 *		this will only work once. The contained dialog is to aid in UX for the user, and will better direct the user
		 *		towards the needed locations and commands to finish the blueprint. Upon completetion Miens storyline will become
		 *		much clearer and straightforward!
		 * 
		 * @param {any} user db instance
		 * 
		 */
		async function handleClergyMystQuest(user) {
			const { Milestones, ActiveDungeon, OwnedTools } = require('../dbObjects.js');
			const { handleMaterialAdding } = require('./exported/materialDropper.js');
			const { grabColour } = require('./exported/grabRar.js');

			const uniqueMatList = require('../events/Models/json_prefabs/materialLists/uniqueList.json');
			const pr = uniqueMatList.filter(mat => mat.Name === 'Phasereader');
			const phasereader = pr[0];

			const userMilestone = await Milestones.findOne({ where: { userid: user.userid } });
			if (!userMilestone) return;
			if (userMilestone.currentquestline !== 'Myst') return;

			const userDungeon = await ActiveDungeon.findOne({ where: [{ dungeonspecid: user.userid }, { dungeonid: 6 }] });
			if (!userDungeon || !userDungeon.completed) return;

			const schemaCheck = await OwnedTools.findOne({ where: [{ spec_id: user.userid }, { name: 'Machine Schematics' }] });
			if (schemaCheck) return;

			const prCheck = await MaterialStore.findOne({ where: [{ spec_id: user.userid }, { name: 'Phasereader' }] });
			if (prCheck) return;

			const embedDescList = [];
			const buttonLabelList = [];

			embedDescList[0] = 'Hello there, what brings you here today?';
			buttonLabelList[0] = 'Hello';

			embedDescList[1] = 'It has been some time since last we saw you! Whats that in your hand?';
			buttonLabelList[1] = 'What, this old thing?';

			embedDescList[2] = 'Yes! Give it here!';
			buttonLabelList[2] = 'Give Machine Schematics to clergyman';

			embedDescList[3] = 'Oh my! What a truly fascinating contraption! Where did you get this?!';
			buttonLabelList[3] = 'I-i found it. What does it say?';

			embedDescList[4] = 'Hmmm so be it.. I cannot read it without the proper tools, I do believe a *Phasereader* is required!';
			buttonLabelList[4] = 'Where might one find one of those?';

			embedDescList[5] = 'Allow me to check our inventory, we may very well still have one!';
			buttonLabelList[5] = 'Wait for Clergyman';

			embedDescList[6] = '...';
			buttonLabelList[6] = 'Wait for Clergyman';

			embedDescList[7] = '...';
			buttonLabelList[7] = 'Wait for Clergyman';

			embedDescList[8] = 'You are in luck! We do have one. Here, its all yours free of charge. Now go build that machine!!';
			buttonLabelList[8] = 'Thank you kindly!';

			const nextButton = new ButtonBuilder()
				.setCustomId('next-dialog')
				.setLabel(buttonLabelList[0])
				.setStyle(ButtonStyle.Primary);

			const buttonRow = new ActionRowBuilder().addComponents(nextButton);

			const clergyDialogEmbed = new EmbedBuilder()
				.setTitle('Clergyman')
				.setDescription(embedDescList[0])
				.setColor('DarkAqua');

			const dialogMsg = await interaction.followUp({ embeds: [clergyDialogEmbed], components: [buttonRow] });

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = dialogMsg.createMessageComponentCollector({
				componentType: ComponentType.Button,
				filter,
				time: 120000,
			});

			let currentPage = 0;
			collector.on('collect', async (COI) => {
				if (COI.customId === 'next-dialog') {
					await COI.deferUpdate().then(async () => {
						if ((currentPage + 1) === embedDescList.length) {
							const material = await handleMaterialAdding(phasereader, 1, user, 'Phasereader');

							let fieldName = `${material.name}`;
							let fieldValue = `Value: ${material.value}\nRarity: ${material.rarity}\nAmount: 1\nUses: ***Crafting Machine Schematics***`;
							let fieldObj = { name: fieldName, value: fieldValue };
							let finalFields = [fieldObj];

							const embedColour = await grabColour(12);

							const matEmbed = new EmbedBuilder()
								.setTitle('~==~**Material Obtained!**~==~')
								.setColor(embedColour)
								.addFields(finalFields);

							collector.stop();

							return await interaction.channel.send({ embeds: [matEmbed] }).then(embedMsg => setTimeout(() => {
								embedMsg.delete();
							}, 120000)).catch(e => console.error(e));
						} else {
							currentPage++;
							nextButton.setLabel(buttonLabelList[currentPage]);
							clergyDialogEmbed.setDescription(embedDescList[currentPage]);
							await dialogMsg.edit({ embeds: [clergyDialogEmbed], components: [buttonRow] });
						}
					}).catch(e => console.error(e));
                }
			});

			collector.on('end', () => {
				dialogMsg.delete().catch(error => {
					if (error.code !== 10008) {
						console.error('Failed to delete the message:', error);
					}
				});
			});

			return;
		}
	},
};
