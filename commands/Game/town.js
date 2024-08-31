const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, Collection } = require('discord.js');

const { Town, MediumTile, MaterialStore, TownMaterial, GuildData, UserData, TownPlots, PlayerBuilding, CoreBuilding } = require('../../dbObjects.js');

// const { loadBuilding } = require('./exported/displayBuilding.js');

// const coreReq = require('../../events/Models/json_prefabs/coreBuildings.json');
// const coreBuildCostList = require('../Development/Export/Json/coreBuildCostList.json');
const { 
	checkUserTownPerms, 
	checkUserAsMayor, 
	grabUser, 
	grabTown, 
	grabTownByName, 
	makeCapital, 
	createInteractiveChannelMessage, 
	editTimedChannelMessage, 
	sendTimedChannelMessage, 
	grabLocalTowns,
	createConfirmCancelButtonRow,
	handleCatchDelete
} = require('../../uniHelperFunctions.js');
const { createBasicPageButtons, loadRarStringMenu, loadPriceButts, handlePriceButtPicked, loadNameStringMenu, handleMatNameFilter, loadBasicBackButt } = require('./exported/tradeExtras.js');
// const { checkInboundTownMat, checkOutboundMat, checkInboundMat, checkOutboundTownMat } = require('../Development/Export/itemMoveContainer.js');
// const { updateUserCoins, spendUserCoins } = require('../Development/Export/uni_userPayouts.js');
// const { checkingRar, checkingRarID, baseCheckRarName } = require('../Development/Export/itemStringCore.js');
const {
    loadTownStoreButts,
    loadClaimPlotButts,
    loadOwnedPlotSelectButts,
    loadCoreBuildTypeButtons,
    loadCoreUpgradeTypeButtons,
    createBuildTypeButtonRow,

    generateTownDisplayEmbed,
    generateLocalTownBonuses,
    loadTownBuildingDisplayList,
    loadTownCoreBuildingDisplayList,
    handleTownMaterialStorageDisplay,
    handleCoreCostDisplay,

    grabTownCoreBuildings,
    grabTownPlotList,
    checkTownHasMaterials,
    
    handleJoinTown,
    updateTownCanEditList,
    updateTownMayor,
    handleDepositIntoTown,
    handleWithdrawFromTown,
    handleTownPlotStatusUpdates,
    handleTownPlotClaim,
    handleBuildingOnTownPlot,
    handleCoreBuildingConstruction
} = require('./exported/townExtras.js');


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
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('closeplot')
			.setDescription('Mark a certain amount of town plots as unavailable to anyone belonging to the town.')
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
			// .addStringOption(option =>
			// 	option
			// 	.setName('theplot')
			// 	.setDescription('Which plot would you like to build on?')
			// 	.setRequired(true)
			// 	.setAutocomplete(true)
			// )
			// .addStringOption(option =>
			// 	option
			// 	.setName('buildtype')
			// 	.setDescription('What would you like to build?')
			// 	.setRequired(true)
			// 	.addChoices(
			// 		{ name: 'House', value: 'house' }
			// 	)
			// )
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
			// .addStringOption(option =>
			// 	option
			// 	.setName('townplots')
			// 	.setDescription('Which plot would you like to view?')
			// 	.setRequired(true)
			// 	.setAutocomplete(true)
			// )
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('buildcore')
			.setDescription('Begin construction of a core town building!')
			// .addStringOption(option =>
			// 	option
			// 	.setName('coretype')
			// 	.setDescription('Which core town building would you like to build?')
			// 	.setRequired(true)
			// 	.setAutocomplete(true)
			// )
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('upgradecore')
			.setDescription('Begin upgrade for a core town building!')
			// .addStringOption(option =>
			// 	option
			// 	.setName('coretype')
			// 	.setDescription('Which core town building would you like to upgrade?')
			// 	.setRequired(true)
			// 	.setAutocomplete(true)
			// )
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
			// .addStringOption(option =>
			// 	option
			// 	.setName('coretype')
			// 	.setDescription('Which core town building would you like to view?')
			// 	.setRequired(true)
			// 	.setAutocomplete(true)
			// )
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
			// .addStringOption(option =>
			// 	option
			// 	.setName('type')
			// 	.setDescription('Coins or Materials?')
			// 	.setRequired(true)
			// 	.addChoices(
			// 		{ name: 'Coins', value: 'coin' },
			// 		{ name: 'Materials', value: 'mat' }
			// 	)
			// )
			// .addStringOption(option =>
			// 	option
			// 	.setName('item')
			// 	.setDescription('Which item would you like to deposit?')
			// 	.setAutocomplete(true)
			// )
			// .addIntegerOption(option =>
			// 	option
			// 	.setName('amount')
			// 	.setDescription('How much will you be transfering?')
			// )
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('withdraw')
			.setDescription('Transfer coins or materials from the towns treasury into your personal balance.')
			// .addStringOption(option =>
			// 	option
			// 	.setName('type')
			// 	.setDescription('Coins or Materials?')
			// 	.setRequired(true)
			// 	.addChoices(
			// 		{ name: 'Coins', value: 'coin' },
			// 		{ name: 'Materials', value: 'mat' }
			// 	)
			// )
			// .addStringOption(option =>
			// 	option
			// 	.setName('item')
			// 	.setDescription('Which item would you like to withdraw?')
			// 	.setAutocomplete(true)
			// )
			// .addIntegerOption(option =>
			// 	option
			// 	.setName('amount')
			// 	.setDescription('How much will you be transfering?')
			// )
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
			const slotOne = (medTile.town_one !== '0') ? (await Town.findOne({ where: { townid: medTile.town_one } })).name : 'None';
			const slotTwo = (medTile.town_two !== '0') ? (await Town.findOne({ where: { townid: medTile.town_two } })).name : 'None';

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
		// if (focusedOption.name === 'item') {
		// 	const focusedValue = interaction.options.getFocused(false);
		// 	const type = interaction.options.getString('type');

		// 	let items;

		// 	if (interaction.options.getSubcommand() === 'deposit') {
		// 		if (type !== 'coin') {
		// 			items = await MaterialStore.findAll({
		// 				where: [
		// 					{ spec_id: interaction.user.id }]
		// 			});
		// 		}
		// 	}

		// 	if (interaction.options.getSubcommand() === 'withdraw') {
		// 		const user = await UserData.findOne({ where: { userid: interaction.user.id } });
		// 		let theTown;
		// 		if (user) theTown = await Town.findOne({ where: { townid: user.townid } });

		// 		if (theTown && type !== 'coin') {
		// 			items = await TownMaterial.findAll({
		// 				where: [
		// 					{ townid: theTown.townid }]
		// 			});
		// 		}
		// 	}

		// 	choices = items.map(item => item.name);

		// 	const filtered = choices.filter(choice => choice.startsWith(focusedValue));
		// 	await interaction.respond(
		// 		handleLimitOnOptions(filtered).map(choice => ({ name: choice, value: choice })),
		// 	);
		// }

		// Locate all owned & empty town plots
		// if (focusedOption.name === 'theplot') {
		// 	const focusedValue = interaction.options.getFocused(false);
		// 	const user = await UserData.findOne({ where: { userid: interaction.user.id } });

		// 	let playerPlots;
		// 	if (user && user.townid !== '0') {
		// 		playerPlots = await TownPlots.findAll({
		// 			where:
		// 				[{ townid: user.townid },
		// 				{ ownerid: user.userid },
		// 				{ empty: true }]
		// 		});
        //     }

		// 	if (playerPlots) {
		// 		for (let i = 0; i < playerPlots.length; i++) {
		// 			let plotStr = `Plot Number: ${i + 1}`;
		// 			choices.push(plotStr);
		// 		}
		// 	} else choices = ['None'];
			

		// 	const filtered = choices.filter(choice => choice.startsWith(focusedValue));
		// 	await interaction.respond(
		// 		filtered.map(choice => ({ name: choice, value: choice })),
		// 	);
		// }

		// Locate all built on plots using 'thetown' option outcome as reference
		// if (focusedOption.name === 'townplots') {
		// 	const focusedValue = interaction.options.getFocused(false);
		// 	const townPicked = interaction.options.getString('thetown') ?? 'NONE';

		// 	let theTown;
		// 	if (townPicked !== 'NONE' && townPicked !== 'None') {
		// 		theTown = await Town.findOne({ where: { name: townPicked } });
		// 	}

		// 	let townPlots;
		// 	if (theTown) {
		// 		townPlots = await TownPlots.findAll({
		// 			where:
		// 				[{ townid: theTown.townid },
		// 				{ empty: false }]
		// 		});
		// 	}

		// 	if (townPlots) {
		// 		for (let i = 0; i < townPlots.length; i++) {
		// 			let buildRef = await PlayerBuilding.findOne({ where: { plotid: townPlots[i].plotid } });
		// 			let plotStr = `${buildRef.build_type} at Plot Number: ${i + 1}`;
		// 			choices.push(plotStr);
        //         }
		// 	} else choices = ['None'];

		// 	const filtered = choices.filter(choice => choice.startsWith(focusedValue));
		// 	await interaction.respond(
		// 		filtered.map(choice => ({ name: choice, value: choice })),
		// 	);
		// }

		// Locate exisiting core town buildings, using provided 'thetown' option if none, use users townid as reference  
		// if (focusedOption.name === 'coretype') {
		// 	const focusedValue = interaction.options.getFocused(false);
		// 	const townPicked = interaction.options.getString('thetown') ?? 'NONE';
		// 	const user = await UserData.findOne({ where: { userid: interaction.user.id } });

		// 	let theTown;
		// 	if (interaction.options.getSubcommand() === 'viewcore') {
		// 		if (townPicked !== 'NONE' && townPicked !== 'None') {
		// 			theTown = await Town.findOne({ where: { name: townPicked } });
		// 		}
		// 	} else if (user && user.townid !== '0') theTown = await Town.findOne({ where: { townid: user.townid } });

		// 	if (theTown) {
		// 		if (interaction.options.getSubcommand() === 'buildcore') {
		// 			if (theTown.grandhall_status === 'None') choices.push('Grand Hall');
		// 			if (theTown.bank_status === 'None') choices.push('Bank');
		// 			if (theTown.market_status === 'None') choices.push('Market');
		// 			if (theTown.tavern_status === 'None') choices.push('Tavern');
		// 			if (theTown.clergy_status === 'None') choices.push('Clergy');
		// 		} else {
		// 			if (theTown.grandhall_status !== 'None') choices.push('Grand Hall');
		// 			if (theTown.bank_status !== 'None') choices.push('Bank');
		// 			if (theTown.market_status !== 'None') choices.push('Market');
		// 			if (theTown.tavern_status !== 'None') choices.push('Tavern');
		// 			if (theTown.clergy_status !== 'None') choices.push('Clergy');
        //         }
		// 	} else choices.push('None');

		// 	const filtered = choices.filter(choice => choice.startsWith(focusedValue));
		// 	await interaction.respond(
		// 		filtered.map(choice => ({ name: choice, value: choice })),
		// 	);
        // }
    },
	async execute(interaction) {

		const { betaTester, materialFiles } = interaction.client;

		if (!betaTester.has(interaction.user.id)) return await interaction.reply('This command is under construction!! It is currently only available to early access testers!');

		const subCom = interaction.options.getSubcommand();

		const needsEditPerms = ['deposit', 'withdraw', 'openplot', 'closeplot', 'buildcore', 'upgradecore']; // Requires edit perms to use
		const needsMayorPerms = ['appoint', 'demote', 'transfer']; // Only Mayor can use

		const canEdit = checkUserTownPerms;
		const isMayor = checkUserAsMayor;
		const hasTown = (user) => user.townid !== '0';

		const checkTownPerms = async (user) => {
			return {isMayor: await isMayor(user), canEdit: await canEdit(user), hasTown: hasTown(user), townID: user.townid};
		};

		const user = await grabUser(interaction.user.id);
		const permList = await checkTownPerms(user);

		const targetUser = await grabUser((interaction.options.getUser('target'))?.id ?? interaction.user.id);
		if (!targetUser) return await interaction.reply({content: `Selected user does not have a game profile yet!`, ephemeral: true});
		const targetPermList = await checkTownPerms(targetUser);

		if (!['establish', 'join'].includes(subCom) && !permList.hasTown) return await interaction.reply({content: 'You must first join/establish a town to use this command!', ephemeral: true});
		if (['establish', 'join'].includes(subCom) && permList.hasTown) return await interaction.reply({content: 'You already belong to a town!', ephemeral: true});
		if (needsEditPerms.includes(subCom) && !permList.canEdit) return await interaction.reply({content: 'You do not have the required town permissions to use this command!', ephemeral: true});
		if (needsMayorPerms.includes(subCom) && !permList.isMayor) return await interaction.reply({content: 'Only the mayor can use this command!', ephemeral: true});
		if (subCom === 'belong' && !targetPermList.hasTown) return await interaction.reply({content: 'This user must first join/establish a town to before this command will work!', ephemeral: true});

		const townName = interaction.options.getString('thetown') ?? 'None';

		const grabTownFromOptions = async (subCom) => {
			switch(subCom){
				case "join":
				return await grabTownByName(townName);
				case "belong":
				return await grabTown(targetUser.townid);
				case "viewplot":
				return await grabTownByName(townName);
				default:
				return await grabTown(user.townid);
			}
		};
		const townRef = await grabTownFromOptions(subCom);

		const countUserPlots = async (user, town, checkFor="Owned") => {
			return (await grabTownPlotList(town, checkFor)).reduce((acc, plot) => {return acc + (plot.ownerid === user.userid);}, 0);
		};

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

		const navMenu = {
			navType: subCom,
			typePicked: "", // Used for deposit/withdraw/core types
			typeExtras: { // Used for deposit/withdraw MATERIALS
				rarity: "",
				name: "",
				matType: "",
				ref: "" // Set as object when assigned
			},
			curPage: 0,
			lastPage: 0, // embedPages.length - 1
			embedPages: [],
			pageFiles: [], // Files to display with embeds if used
			pageDetails: [], // Details for each build/core in display list.
			clergyQuest: {
				active: false,
				posIndex: 0,
				callFunction: "" // REPLACED BY handleClergyMystQuest
			},
			costList: { // Material Cost Lists for core building constructs
				need: [],
				owned: []
			},
			maxAmount: 0, // Owned amount total for selected type/item
		    storedAmount: 0, // Total Amount already stored in target location
			moveAmount: 0 // Amount selected for deposit/withdraw
		};

		// FUNCTION MOVED 
		// DEPOSIT/WITHDRAW BUTTS
		// /**
		//  * This function loads the deposit/withdraw type select buttons
		//  * @param {string} subCom Current Subcommand Name
		//  * @returns {ButtonBuilder[]}
		//  */
		// function loadTownStoreButts(subCom){
		// 	const matSelectButt = new ButtonBuilder()
		// 	.setCustomId('mat')
		// 	.setStyle(ButtonStyle.Primary)
		// 	.setLabel(`${subCom} Material`);
		// 	const coinSelectButt = new ButtonBuilder()
		// 	.setCustomId('coin')
		// 	.setStyle(ButtonStyle.Primary)
		// 	.setLabel(`${subCom} Coins`);

		// 	return [matSelectButt, coinSelectButt];
		// }

		const storeButtList = loadTownStoreButts(subCom);
		const storeButtRow = new ActionRowBuilder().addComponents(storeButtList);

		// FUNCTION MOVED 
		// CLAIM PLOTS BUTTS
		// /**
		//  * This function loads the claim town plot buttons
		//  * @param {object} permList Users Town Permission Object 
		//  * @returns {ButtonBuilder[]}
		//  */
		// function loadClaimPlotButts(permList){
		// 	const openedPlotsButt = new ButtonBuilder()
		// 	.setCustomId('open-plot')
		// 	.setStyle(ButtonStyle.Primary)
		// 	.setLabel(`Claim Open Plot`);
		// 	const closedPlotsButt = new ButtonBuilder()
		// 	.setCustomId('closed-plot')
		// 	.setStyle(ButtonStyle.Primary)
		// 	.setDisabled(!permList.canEdit)
		// 	.setLabel(`Claim Closed Plot`);

		// 	return [openedPlotsButt, closedPlotsButt];
		// }

		const plotsButtList = loadClaimPlotButts(permList);
		const plotsButtRow = new ActionRowBuilder().addComponents(plotsButtList);

		// FUNCTION MOVED 
		// OWNED PLOTS BUTTS
		// /**
		//  * This function loads the owned plots selection buttons
		//  * @param {object} permList Users Town Permission Object 
		//  * @returns {ButtonBuilder[]}
		//  */
		// function loadOwnedPlotSelectButts(permList){
		// 	const opOneButt = new ButtonBuilder()
		// 	.setCustomId('plot-one')
		// 	.setStyle(ButtonStyle.Primary)
		// 	.setLabel('Plot One');
		// 	const opTwoButt = new ButtonBuilder()
		// 	.setCustomId('plot-two')
		// 	.setStyle(ButtonStyle.Primary)
		// 	.setDisabled(!permList.canEdit)
		// 	.setLabel('Plot Two');
		// 	const opThreeButt = new ButtonBuilder()
		// 	.setCustomId('plot-three')
		// 	.setStyle(ButtonStyle.Primary)
		// 	.setDisabled(!permList.canEdit)
		// 	.setLabel('Plot Three');

		// 	return [opOneButt, opTwoButt, opThreeButt];
		// }

		const oPlotsButtList = loadOwnedPlotSelectButts(permList);
		const oPlotsButtRow = new ActionRowBuilder().addComponents(oPlotsButtList);

		// FUNCTION MOVED 
		// CORE BUTT LIST
		// /**
		//  * This function loads the button list related to the given towns core buildings
		//  * 
		//  * Buttons are disabled if the ``Core Building`` **is** ``Built``
		//  * IDS: ``build-${coretype}``
		//  * @param {object} town Town DB Object
		//  * @returns {Promise <{noChoices: boolean, buttons: ButtonBuilder[]}>}
		//  */
		// async function loadCoreBuildTypeButtons(town){
		// 	const townCores = await grabTownCoreBuildings(town);

		// 	let totalChoices = 5;
		// 	const coreIsBuilt = (checkType) => townCores.some(core => core.build_type === checkType);

		// 	const coreTypes = ['grandhall', 'bank', 'market', 'tavern', 'clergy'];
		// 	const buttList = [];
		// 	for (const type of coreTypes){
		// 		const isBuilt = coreIsBuilt(type);
		// 		if (isBuilt) totalChoices--;
		// 		const button = new ButtonBuilder()
		// 		.setCustomId(`build-${type}`)
		// 		.setStyle(ButtonStyle.Primary)
		// 		.setDisabled(isBuilt)
		// 		.setLabel(`Build ${makeCapital(type)}`);
		// 		buttList.push(button);
		// 	}

		// 	return {noChoices: totalChoices === 0, buttons: buttList};
		// }

		// FUNCTION MOVED 
		// /**
		//  * This function loads the button list related to the given towns core buildings
		//  * 
		//  * Buttons are disabled if the ``Core Building`` **is not** ``Built``
		//  * IDS: ``upgrade-${coretype}``
		//  * @param {object} town Town DB Object
		//  * @returns {Promise <{noChoices: boolean, buttons: ButtonBuilder[]}>}
		//  */
		// async function loadCoreUpgradeTypeButtons(town){
		// 	const townCores = await grabTownCoreBuildings(town);

		// 	let totalChoices = 5;
		// 	const coreIsBuilt = (checkType) => townCores.some(core => core.build_type === checkType);

		// 	const coreTypes = ['grandhall', 'bank', 'market', 'tavern', 'clergy'];
		// 	const buttList = [];
		// 	for (const type of coreTypes){
		// 		const isBuilt = coreIsBuilt(type);
		// 		if (!isBuilt) totalChoices--;
		// 		const button = new ButtonBuilder()
		// 		.setCustomId(`upgrade-${type}`)
		// 		.setStyle(ButtonStyle.Primary)
		// 		.setDisabled(!isBuilt)
		// 		.setLabel(`Upgrade ${makeCapital(type)}`);
		// 		buttList.push(button);
		// 	}

		// 	return {noChoices: totalChoices === 0, buttons: buttList};
		// }


		const rarSelectEmbed = new EmbedBuilder()
		.setTitle('== Rarity? ==');
		const nameSelectEmbed = new EmbedBuilder()
		.setTitle('== Material Name? ==');
		const amountSelectEmbed = new EmbedBuilder()
		.setTitle('== How Many? ==')
		.setDescription('Current amount selected: 0');
		const baseConfirmEmbed = new EmbedBuilder()
		.setTitle('== Confirm Action? ==');
		const buildTypeEmbed = new EmbedBuilder()
		.setTitle('== Select a Building Type ==');

		let hasActionRow = true, usePagination = false, startNumSelect = false;
		//useActionOneButt = false, useActionTwoButt = false;
		let loadingBuildingList = false, buildLoadAnchor, loadingMatList = false, matLoadAnchor;
		const userPlotCount = await countUserPlots(user, townRef, "Owned");
		switch(subCom){
			case "establish":
			return await interaction.reply('This command is not yet available!!');
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
			case "deposit": // TOWN DEPOSIT MENU
				// USE BUTTON NAV MENU
				// USE AMOUNT/COIN BUTT MENU
				// PAGE 1: TYPE
				firstDisplayEmbed
				.setTitle(`== Deposit ==`)
				.setDescription(`Select one of the shown types for this Deposit`);
				buttonList.splice(0, 2, ...storeButtList);
				// - IF MAT:
				// PAGE 2: RAR
				// PAGE 3: NAME
				// PAGE 4: AMOUNT
				// PAGE 5: CONFIRM
				// - IF COIN:
				// PAGE 2: AMOUNT
				// PAGE 3: CONFIRM
			break;
			case "withdraw": // TOWN WITHDRAW MENU
				// USE BUTTON NAV MENU
				// USE AMOUNT/COIN BUTT MENU
				// PAGE 1: TYPE
				firstDisplayEmbed
				.setTitle(`== Withdraw ==`)
				.setDescription(`Select one of the shown types for this Withdraw`);
				buttonList.splice(0, 2, ...storeButtList);
				// - IF MAT:
				// PAGE 2: RAR
				// PAGE 3: NAME
				// PAGE 4: AMOUNT
				// PAGE 5: CONFIRM
				// - IF COIN:
				// PAGE 2: AMOUNT
				// PAGE 3: CONFIRM
			break;
			case "openplot": // OPEN PLOTS MENU
				// USE BUTTON NAV MENU
				// USE AMOUNT BUTT MENU
				// PAGE 1: AMOUNT
				// PAGE 2: CONFIRM
				navMenu.typePicked = 'Open';
				navMenu.maxAmount = await grabTownPlotList(townRef, "Closed", true);
				navMenu.storedAmount = await grabTownPlotList(townRef, "Open", true);
				startNumSelect = true;
			break;
			case "closeplot": // CLOSE PLOTS MENU
				// USE BUTTON NAV MENU
				// USE AMOUNT BUTT MENU
				// PAGE 1: AMOUNT
				// PAGE 2: CONFIRM
				navMenu.typePicked = 'Closed';
				navMenu.maxAmount = await grabTownPlotList(townRef, "Open", true);
				navMenu.storedAmount = await grabTownPlotList(townRef, "Closed", true);
				startNumSelect = true;
			break;
			case "claimplot": // CLAIM PLOT MENU
				if (!permList.canEdit && userPlotCount >= 1 || permList.canEdit && userPlotCount >= 3) return await interaction.reply({content: `You own ${userPlotCount} plot(s), which is the maximum amount you can own!! `, ephemeral: true});
				// USE BUTTON NAV MENU
				// PAGE 1: SELECT FROM
				// - OPEN PLOTS
				// (WITH PERMS) - CLOSED PLOTS
				firstDisplayEmbed
				.setTitle('== Choose a Plot Type ==');
				buttonList.splice(0, 2, ...plotsButtList);
				// PAGE 2: CONFIRM
			break;
			case "buildplot": // BUILD ON OWNED PLOT MENU
				if (!userPlotCount) return await interaction.reply({content: 'You do not own any plots yet! Use ``/town claimplot`` to obtain one!', ephemeral: true});
				const emptyUserPlots = await countUserPlots(user, townRef, "Empty");
				if (!emptyUserPlots) return await interaction.reply({content: 'You do not have any empty plots! View them using ``/town viewplot``', ephemeral: true});
				// USE BUTTON NAV MENU
				// PAGE 1: SELECT FROM
				firstDisplayEmbed
				.setTitle('== Choose a Plot ==');
				buttonList.splice(0, 2, ...oPlotsButtList);
				// PAGE 2: CONFIRM
			break;
			case "viewplot": // VIEW LOCAL TOWN BUILT ON PLOTS
				const townBuiltPlots = await grabTownPlotList(townRef, "Built", true);
				if (!townBuiltPlots) return await interaction.reply({content: 'This town does not have any buildings yet!', ephemeral: true});
				// USE BUTTON NAV MENU
				// PAGE 1: VIEW PAGES
				actionOneButt
				.setCustomId('view-build')
				.setStyle(ButtonStyle.Secondary)
				.setLabel('Building Details');

				firstDisplayEmbed
				.setTitle('== Loading Buildings ==');

				buildLoadAnchor = await interaction.reply({embeds: [firstDisplayEmbed]});

				// LOAD BUILDING MENU DISPLAY HERE
				const buildViewObj = await loadTownBuildingDisplayList(townRef);
				navMenu.embedPages = buildViewObj.embeds;
				navMenu.lastPage = navMenu.embedPages.length - 1;
				navMenu.pageFiles = buildViewObj.files;
				navMenu.pageDetails = buildViewObj.details;

				loadingBuildingList = true;
				usePagination = true;
			break;
			case "buildcore": // BUILD A TOWN CORE BUILDING
				// USE BUTTON NAV MENU
				const buildButtObj = await loadCoreBuildTypeButtons(townRef);
				if (buildButtObj.noChoices) return await interaction.reply({content: 'This town has built all 5 core buildings! Use ``/town upgradecore`` instead!', ephemeral: true});
				// PAGE 1: TYPE
				firstDisplayEmbed
				.setTitle(`== Build Core Building ==`)
				.setDescription(`Select one of the options below.`);
				buttonList.splice(0, 2, ...buildButtObj.buttons);
				// PAGE 2: COST
				// PAGE 3: CONFIRM
			break;
			case "upgradecore": // UPGRADE A TOWN CORE BUILDING
				// USE BUTTON NAV MENU
				const upgradeButtObj = await loadCoreUpgradeTypeButtons(townRef);
				if (upgradeButtObj.noChoices) return await interaction.reply({content: 'This town has not built any core buildings! Use ``/town buildcore`` instead!', ephemeral: true});
				// PAGE 1: TYPE
				firstDisplayEmbed
				.setTitle(`== Upgrade Core Building ==`)
				.setDescription(`Select one of the options below.`);
				buttonList.splice(0, 2, ...upgradeButtObj.buttons);
				// PAGE 2: COST
				// PAGE 3: CONFIRM
			break;
			case "viewcore": // VIEW BUILT TOWN CORE BUILDINGS
				// USE BUTTON NAV MENU
				const builtCoreCount = await grabTownCoreBuildings(townRef, true);
				if (!builtCoreCount) return await interaction.reply({content: 'This town has not built any core buildings! Use ``/town buildcore`` to make one, or try looking in a different town!', ephemeral: true});
				// PAGE 1: VIEW PAGES
				actionOneButt
				.setCustomId('view-core')
				.setStyle(ButtonStyle.Secondary)
				.setLabel('Core Building Details');

				firstDisplayEmbed
				.setTitle('== Loading Core Buildings ==');

				buildLoadAnchor = await interaction.reply({embeds: [firstDisplayEmbed]});

				// LOAD CORE BUILDING MENU DISPLAY HERE
				const coreBuildViewObj = await loadTownCoreBuildingDisplayList(townRef);
				navMenu.embedPages = coreBuildViewObj.embeds;
				navMenu.lastPage = navMenu.embedPages.length - 1;
				navMenu.pageFiles = coreBuildViewObj.files;
				navMenu.pageDetails = coreBuildViewObj.details;

				if (coreBuildViewObj.clergyQuest.active){
					navMenu.clergyQuest.active = true;
					navMenu.clergyQuest.posIndex = coreBuildViewObj.clergyQuest.posIndex;
					navMenu.clergyQuest.callFunction = coreBuildViewObj.clergyQuest.callFunction;
				}

				loadingBuildingList = true;
				usePagination = true;
			break;
			case "storage": // VIEW TOWN OWNED MATERIALS
				// USE BUTTON NAV MENU
				const townStorageHasItem = await checkTownHasMaterials(townRef);
				if (!townStorageHasItem) return await interaction.reply({content: 'This town has no stored materials! Use ``/town deposit`` to change that!', ephemeral: true});
				// PAGE 1: VIEW PAGES
				firstDisplayEmbed
				.setTitle('== Loading Materials ==');

				matLoadAnchor = await interaction.reply({embeds: [firstDisplayEmbed]});

				const matViewObj = await handleTownMaterialStorageDisplay(townRef, materialFiles);
				navMenu.embedPages = matViewObj;
				navMenu.lastPage = navMenu.embedPages.length - 1;

				loadingMatList = true;
				usePagination = true;
			break;
		}

		if (!hasActionRow){
			replyObj.embeds = [firstDisplayEmbed];
			return await sendTimedChannelMessage(interaction, 120000, replyObj, "Reply");
		}

		if (startNumSelect){
			replyObj.embeds = [amountSelectEmbed];
			replyObj.components = loadPriceButts(true);
		} else {
			if (!usePagination){
				replyObj.embeds = [firstDisplayEmbed];
				replyObj.components = [actionButtRow.addComponents(buttonList)];
			}
		}

		const builtActionOneButt = actionOneButt.data?.custom_id !== undefined;
		const builtActionTwoButt = actionTwoButt.data?.custom_id !== undefined;
		//console.log('Using First Action Button? %d', builtActionOneButt);
		//console.log('Using Second Action Button? %d', builtActionTwoButt);

		const pageButtRow = new ActionRowBuilder();
		if (usePagination) {
			if (builtActionOneButt || builtActionTwoButt){
				const usedActionButts = [];
				if (builtActionOneButt) usedActionButts.push(actionOneButt);
				if (builtActionTwoButt) usedActionButts.push(actionTwoButt);
				basePageButts.push(basePageButts.splice(1, 1, ...usedActionButts)[0]);
			}
			
			pageButtRow.addComponents(basePageButts);
			replyObj.components.unshift(pageButtRow);

			//console.log('Page Button Action Row Being Used: ', ...pageButtRow.components);
		}

		const replyType = (loadingBuildingList) ? "FollowUp" : (loadingMatList) ? "FollowUp" : "Reply";
		if (replyType === 'FollowUp'){
			replyObj.embeds[0] = navMenu.embedPages[0];
			if (loadingBuildingList) replyObj.files = [navMenu.pageFiles[0]];

			if (loadingBuildingList) {
				await handleCatchDelete(buildLoadAnchor);
			} else if (loadingMatList) {
				await handleCatchDelete(matLoadAnchor);
			}
		}

		//console.log('Initial Interaction Response Object Used: ', replyObj);
		//console.log('Action Row Contents: ', ...replyObj.components);
		//console.log(`Response Type Used: ${replyType}`);

		// const replyObj = {embeds: [firstDisplayEmbed], components: [actionButtRow]};
		const {anchorMsg, collector, sCollector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, replyType, "Both");

		// const navMenu = {
		// 	navType: subCom,
		// 	typePicked: "", // Used for deposit/withdraw/core types
		// 	typeExtras: { // Used for deposit/withdraw MATERIALS
		// 		rarity: "",
		// 		name: "",
		//		matType: "",
		// 		ref: "" // Set as object when assigned
		// 	},
		// 	curPage: 0,
		// 	lastPage: 0, // embedPages.length - 1
		// 	embedPages: [],
		// 	pageFiles: [], // Files to display with embeds if used
		//  pageDetails: [], // Details for each build/core in display list.
		//  maxAmount: 0, // Owned amount total for selected type/item
		//  storedAmount: 0, // Total Amount already stored in target location
		// 	moveAmount: 0 // Amount selected for deposit/withdraw
		// };

		const priceIDList = [
			"add-one-c", 'add-ten-c', "add-25-c", "add-100-c", "add-1k-c", "add-10k-c", 
			"minus-one-c", 'minus-ten-c', "minus-25-c", "minus-100-c", "minus-1k-c", "minus-10k-c",
			"mult-ten-c", "mult-100-c", "mult-1k-c"
		];

		// ~~~~~~~~~~~~~~~~~~~~~
		// STRING COLLECTOR
		sCollector.on('collect', async c => {
			await c.deferUpdate().then(async () => {
				let editWith;
				if (c.customId === 'rar-picked'){ // EXTRACT RARITY STRING PICKED
					navMenu.typeExtras.rarity = c.values[0];

					editWith = {embeds: [nameSelectEmbed], components: await loadNameStringMenu({itemType: 'material', rarity: navMenu.typeExtras.rarity}, materialFiles)};
				} else if (c.customId === 'item-name'){ // EXTRACT MAT NAME STRING PICKED
					const nvObj = JSON.parse(c.values[0]);
					navMenu.typeExtras.name = nvObj.name;
					
					const matObj = handleMatNameFilter(nvObj.name, materialFiles);
					navMenu.typeExtras.matType = matObj.matType;
					navMenu.typeExtras.ref = matObj.matRef;
					switch(subCom){
						case "deposit": // USER OWNED
							navMenu.maxAmount = (await MaterialStore.findOne({where: {mattype: matObj.matType, spec_id: user.userid, mat_id: matObj.matRef.Mat_id}}))?.amount ?? 0;
						break;
						case "withdraw": // TOWN OWNED
							navMenu.maxAmount = (await TownMaterial.findOne({where: {mattype: matObj.matType, townid: townRef.townid, mat_id: matObj.matRef.Mat_id}}))?.amount ?? 0;
						break;
					}

					if (navMenu.maxAmount === 0){
						navMenu.typePicked = "";
						// SEND NO OWNED AMOUNT MESSAGE
						await c.followUp({content: `You do not own any ${nvObj.name}!!`, ephemeral: true});
						editWith = {embeds: [nameSelectEmbed], components: await loadNameStringMenu({itemType: 'material', rarity: navMenu.typeExtras.rarity}, materialFiles)};
					} else editWith = {embeds: [amountSelectEmbed], components: loadPriceButts()};
				}

				await anchorMsg.edit(editWith);
			}).catch(e => console.error(e));
		});
		// ~~~~~~~~~~~~~~~~~~~~~

		// =====================
		// EDIT WITH editWith = {embeds: [], components: []};
		// BUTTON COLLECTOR
		collector.on('collect', async c => {
			await c.deferUpdate().then(async () => {
				let editWith, confirmOutcome;
				if (['confirm', 'cancel'].includes(c.customId)){ // CONFIRM/CANCEL HANDLE
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
							}
						break;
						case "cancel":
						return collector.stop('Cancel');
					}
				} else if (['back-rar', 'back-name', 'back-price', 'cancel-movestore', 'cancel-plots', 'cancel-claim', 'cancel-build', 'cancel-core', 'back-core'].includes(c.customId)){ // BACK BUTTONS
					switch(c.customId){
						case "back-rar": // BACK TO TYPE SELECT
							navMenu.typePicked = "";
							editWith = {embeds: [firstDisplayEmbed], components: [storeButtRow]};
						break;
						case "back-name": // BACK TO RAR SELECT
							navMenu.typeExtras.rarity = "";

							editWith = {embeds: [rarSelectEmbed], components: loadRarStringMenu(navMenu.navType)};
						break;
						case "back-price":
							if (['withdraw', 'deposit'].includes(navMenu.navType)){
								switch(navMenu.typePicked){
									case "mat": // BACK TO RAR SELECT
										// - IF MAT:
										navMenu.typeExtras.name = "";
										navMenu.typeExtras.matType = "";
										navMenu.typeExtras.ref = "";
										navMenu.maxAmount = 0;
	
										editWith = {embeds: [nameSelectEmbed], components: loadNameStringMenu({itemType: 'material', rarity: navMenu.typeExtras.rarity}, materialFiles)};
									break;
									case "coin": // BACK TO TYPE SELECT
										// - IF COIN:
										navMenu.typePicked = "";
										navMenu.maxAmount = 0;
	
										editWith = {embeds: [firstDisplayEmbed], components: [storeButtRow]};
									break;
								}
							} else if (['openplot', 'closeplot'].includes(navMenu.navType)){
								navMenu.moveAmount = 0;

								editWith = {embeds: [firstDisplayEmbed], components: loadPriceButts(true)};
							}
						break;
						case "cancel-movestore": // BACK TO NUM SELECT
							editWith = {embeds: [amountSelectEmbed], components: loadPriceButts()}; 
						break;
						case "cancel-plots": // BACK TO NUM SELECT
							navMenu.moveAmount = 0;
							editWith = {embeds: [firstDisplayEmbed], components: loadPriceButts(true)};
						break;
						case "cancel-claim": // BACK TO PLOT TYPE SELECT
							navMenu.navType = "";
							editWith = {embeds: [firstDisplayEmbed], components: [plotsButtRow]};
						break;
						case "cancel-build": // BACK TO OWNED PLOT SELECT
							navMenu.typePicked = "";
							editWith = {embeds: [firstDisplayEmbed], components: [oPlotsButtRow]};
						break;
						case "cancel-core": // BACK TO CORE TYPE SELECT
							navMenu.typePicked = "";
							if (subCom === 'buildcore'){
								editWith = {embeds: [firstDisplayEmbed], components: replyObj.components};
							} else editWith = {embeds: [firstDisplayEmbed], components: replyObj.components};
						break;
						case "back-core": // BACK TO CORE TYPE SELECT
							navMenu.typePicked = "";
							if (subCom === 'buildcore'){
								editWith = {embeds: [firstDisplayEmbed], components: replyObj.components};
							} else editWith = {embeds: [firstDisplayEmbed], components: replyObj.components};
						break;
					}
				} else if (['mat', 'coin'].includes(c.customId)){ // STORE TYPE SELECT
					// if mat loadRarStringMenu(subCom)
					navMenu.typePicked = c.customId;
					switch(c.customId){
						case "mat": // Show rar menu
							editWith = {embeds: [rarSelectEmbed], components: loadRarStringMenu(navMenu.navType)};
						break;
						case "coin": // show amount menu
							switch(subCom){
								case "deposit": // USER OWNED
									navMenu.maxAmount = user.coins;
								break;
								case "withdraw": // TOWN OWNED
									navMenu.maxAmount = townRef.coins;
								break;
							}

							if (navMenu.maxAmount === 0){
								navMenu.typePicked = "";
								// SEND NO OWNED AMOUNT MESSAGE
								editWith = {embeds: [firstDisplayEmbed], components: [storeButtRow]};
							} else editWith = {embeds: [amountSelectEmbed], components: loadPriceButts()};
						break;
					}
				} else if (['grandhall', 'bank', 'market', 'tavern', 'clergy'].includes(c.customId.split('-')[1])){ // CORE TYPE SELECT
					// IF BUILD
					// Level 1 Core Cost
					// Handle Cost Display

					// IF UPGRADE
					// Level ? Core Cost
					// Handle Cost Display
					navMenu.typePicked = c.customId.split('-')[1];
					const coreCostOutcome = await handleCoreCostDisplay(townRef, navMenu, c.customId.split('-')[0], materialFiles);
					navMenu.costList.need = coreCostOutcome.costObj.matCosts;
					navMenu.costList.owned = coreCostOutcome.costObj.matsOwned;
					const coreCostActionRow = (coreCostOutcome.canConfirm) ? [createConfirmCancelButtonRow('core')] : [loadBasicBackButt('core')];
					editWith = {embeds: [coreCostOutcome.embed], components: coreCostActionRow};
				} else if (['plot-one', 'plot-two', 'plot-three'].includes(c.customId)){ // BUILD PLOT SELECT
					navMenu.navType = makeCapital(c.customId.split('-')[1]);

					editWith = {embeds: [buildTypeEmbed], components: [createBuildTypeButtonRow()]};
				} else if (['build-house'].includes(c.customId)){ // BUILD TYPE SELECT
					navMenu.typePicked = c.customId.split('-')[1]; // makeCapital();
					// switch(c.customId){
					// 	case "build-house":
					// 		// CONFIRM BUILD HOUSE
					// 		editWith = {embeds: [baseConfirmEmbed], components: [createConfirmCancelButtonRow('build')]};
					// 	break;
					// 	default:
							
					// 	break;
					// }
					editWith = {embeds: [baseConfirmEmbed], components: [createConfirmCancelButtonRow('build')]};
				} else if (['open-plot', 'closed-plot'].includes(c.customId)){ // PLOT TYPE SELECT
					navMenu.navType = makeCapital(c.customId.split('-')[0]);

					editWith = {embeds: [baseConfirmEmbed], components: [createConfirmCancelButtonRow('claim')]};
				} else if (priceIDList.includes(c.customId) || c.customId === 'reset-price'){ // AMOUNT MOVE BUTTONS
					if (c.customId === 'reset-price'){
						navMenu.moveAmount = 0;
					} else if (["mult-ten-c", "mult-100-c", "mult-1k-c"].includes(c.customId)){
						navMenu.moveAmount *= handlePriceButtPicked(c.customId);
					} else {
						navMenu.moveAmount += handlePriceButtPicked(c.customId);
					}

					if (navMenu.moveAmount > navMenu.maxAmount) {
						// Amount would exceed total amount stored
						navMenu.moveAmount = navMenu.maxAmount;
						if (['withdraw', 'deposit'].includes(subCom)) await c.followUp({content: "Total stored amount reached!!", ephemeral: true});
						if (['openplot', 'closeplot'].includes(subCom)) await c.followUp({content: `Total ${navMenu.typePicked} town plot amount reached`, ephemeral: true});
					}
					if (navMenu.moveAmount < 0) navMenu.moveAmount = 0;
					let amountEmbedDesc;
					if (['withdraw', 'deposit'].includes(subCom)){
						amountEmbedDesc = `Amount selected: ${navMenu.moveAmount}\nTotal Amount Owned: ${navMenu.maxAmount}\nExisting Amount Stored: ${navMenu.storedAmount}`;
					} else if (['openplot', 'closeplot'].includes(subCom)){
						amountEmbedDesc = `Plots selected: ${navMenu.moveAmount}\nTotal Plots Not ${navMenu.typePicked}: ${navMenu.maxAmount}\nPlots Currently ${navMenu.typePicked}: ${navMenu.storedAmount}`
					}
					amountSelectEmbed.setDescription(amountEmbedDesc);

					editWith = {embeds: [amountSelectEmbed], components: loadPriceButts()};
				} else if (['confirm-price', 'confirm-movestore', 'confirm-plots', 'confirm-claim', 'confirm-build', 'confirm-core'].includes(c.customId)){ // CONFIRM BUTTONS
					switch(c.customId){
						case "confirm-price":
							if (['withdraw', 'deposit'].includes(subCom)){ // CONFIRM TOWN STORE
								editWith = {embeds: [baseConfirmEmbed], components: [createConfirmCancelButtonRow('movestore')]};
							} else if (['openplot', 'closeplot'].includes(subCom)){ // CONFIRM PLOT CHANGES
								editWith = {embeds: [baseConfirmEmbed.setDescription('Plots Changing')], components: [createConfirmCancelButtonRow('plots')]};
							}
						break;
						case "confirm-movestore": // HANDLE ITEM TRANSFERS!!
						return collector.stop(subCom);
						case "confirm-plots": // HANDLE TOWN PLOT UPDATES!!
						return collector.stop(subCom);
						case "confirm-claim": // HANDLE TOWN PLOT CLAIM!!
						return collector.stop(subCom);
						case "confirm-build": // HANDLE OWNED PLOT BUILD!!
						return collector.stop(subCom);
						case "confirm-core": // HANDLE CORE BUILDING CONSTRUCT!!
						return collector.stop(subCom);
					}
				} else if (['back-page', 'next-page'].includes(c.customId)){ // BASIC PAGING BUTTONS
					switch(c.customId){
						case "next-page":
							navMenu.curPage = (navMenu.curPage === navMenu.lastPage) ? 0 : navMenu.curPage + 1;
						break;
						case "back-page":
							navMenu.curPage = (navMenu.curPage === 0) ? navMenu.lastPage : navMenu.curPage - 1;
						break;
					}
					if (subCom !== 'storage'){
						editWith = {embeds: [navMenu.embedPages[navMenu.curPage]], components: [pageButtRow], files: [navMenu.pageFiles[navMenu.curPage]]};
					} else editWith = {embeds: [navMenu.embedPages[navMenu.curPage]], components: [pageButtRow]};
					
				} else if (['view-build', 'view-core'].includes(c.customId)){
					await c.followUp({embeds: [navMenu.pageDetails[navMenu.curPage]], ephemeral: true});

					if (c.customId === 'view-core' && navMenu.curPage === navMenu.clergyQuest.posIndex){
						await navMenu.clergyQuest.callFunction(interaction, user);
					}

					editWith = {embeds: [navMenu.embedPages[navMenu.curPage]], components: [pageButtRow], files: [navMenu.pageFiles[navMenu.curPage]]};
				}
				
				// console.log('UPDATING ANCHOR WITH CONTENT: ', ...editWith.components[0].components);
				await anchorMsg.edit(editWith);
				if (confirmOutcome?.status === 'Complete') return collector.stop('Finished');
			}).catch(e => {
				// if (e.code === 50035){
				// 	console.error(e.rawError.errors.components);
				// }
				console.error(e)
			});
		});
		// =====================

		// ~~~~~~~~~~~~~~~~~~~~~
		// STRING COLLECTOR
		sCollector.on('end', async (c, r) => {
			if (!r || r === 'time' || r !== 'Quiet') await handleCatchDelete(anchorMsg);
		});
		// ~~~~~~~~~~~~~~~~~~~~~

		// =====================
		// BUTTON COLLECTOR
		collector.on('end', async (c, r) => {
			if (!r || r === 'time' || r === 'Cancel') await handleCatchDelete(anchorMsg);

			sCollector.stop('Quiet');

			if (r === 'Finished'){
				return await editTimedChannelMessage(anchorMsg, 60000, {embeds: [anchorMsg.embeds[0]], components: []});
			} else if (['deposit', 'withdraw'].includes(r)){
				let updateWith;
				switch(r){
					case "deposit":
						// HANDLE DEPOSIT
						updateWith = await handleDepositIntoTown(townRef, user, navMenu);
					break;
					case "withdraw":
						// HANDLE WITHDRAW
						updateWith = await handleWithdrawFromTown(townRef, user, navMenu);
					break;
				}
				return await editTimedChannelMessage(anchorMsg, 6000, {embeds: [updateWith], components: []});
			} else if (['openplot', 'closeplot'].includes(r)){
				console.log('MANAGING PLOTS');
				await handleTownPlotStatusUpdates(townRef, navMenu);

				const plotUpdateEmbed = new EmbedBuilder()
				.setTitle('== Plots Updated ==');

				return await editTimedChannelMessage(anchorMsg, 6000, {embeds: [plotUpdateEmbed], components: []});
			} else if (r === 'claimplot'){
				await handleTownPlotClaim(townRef, user, navMenu);

				const plotClaimEmbed = new EmbedBuilder()
				.setTitle('== Plot Claimed ==');

				return await editTimedChannelMessage(anchorMsg, 6000, {embeds: [plotClaimEmbed], components: []});
			} else if (r === 'buildplot'){
				await handleCatchDelete(anchorMsg);

				const waitForLoadingEmbed = new EmbedBuilder()
				.setTitle('== Loading Building... ==');

				const loadMsg = await c.followUp({embeds: [waitForLoadingEmbed]});

				const houseDisplayObj = await handleBuildingOnTownPlot(townRef, user, navMenu);

				return await editTimedChannelMessage(loadMsg, 240000, houseDisplayObj);
			} else if (['buildcore', 'upgradecore'].includes(r)){
				await handleCatchDelete(anchorMsg);

				const waitForLoadingEmbed = new EmbedBuilder()
				.setTitle('== Loading Building... ==');

				const loadMsg = await c.followUp({embeds: [waitForLoadingEmbed]});

				const coreBuildDisplayObj = await handleCoreBuildingConstruction(townRef, navMenu);

				return await editTimedChannelMessage(loadMsg, 240000, coreBuildDisplayObj);
			}
		});
		// =====================


		// // Biome Background Texture Array:
		// // Used for Building canvas creation.
		// const biomeBTexList = ["None", "Forest", "Mountain", "Desert", "Plains", "Swamp", "Grassland"];

		// // FUNCTION MOVED
		// /**
		//  * This function checks if the given town has at least one stored material
		//  * @param {object} town Town DB Object
		//  * @returns {Promise <boolean>}
		//  */
		// async function checkTownHasMaterials(town){
		// 	const hasMat = await TownMaterial.findOne({where: {townid: town.townid}});
		// 	return !!hasMat;
		// }

		// // FUNCTION MOVED
		// /**
		//  * This function handles loading the given towns owned material list display.
		//  * @param {object} town Town DB Object
		//  * @returns {Promise <EmbedBuilder[]>}
		//  */
		// async function handleTownMaterialStorageDisplay(town, materialFiles){
		// 	const fullTownMaterialList = await TownMaterial.findAll({where: {townid: town.townid}})
		// 	const materialPages = [];
		// 	for (const [key, value] of materialFiles){
		// 		const matType = key;
		// 		const matEmbed = new EmbedBuilder()
		// 		.setTitle(`== ${makeCapital(matType)} Type Materials ==`);

		// 		const matList = require(value);
		// 		matList.sort((a,b) => a.Rar_id - b.Rar_id);

		// 		const refListLength = matList.length;
		// 		let missingAll = false;

		// 		const matchingOwnedMats = (key === "unique") 
		// 		? fullTownMaterialList.filter(mat => mat.rar_id === 12)
		// 		: fullTownMaterialList.filter(mat => mat.mattype === key);
		// 		if (matchingOwnedMats.length === 0) missingAll = true;

		// 		const orderedUMats = new Array(refListLength);
		// 		if (!missingAll){
		// 			let counter = 0;
		// 			for (const matRef of matList){
		// 				orderedUMats[counter] = (key === "unique") 
		// 				? matchingOwnedMats.filter(mat => mat.mattype === matRef.UniqueMatch)[0] ?? matRef.Rar_id
		// 				: matchingOwnedMats.filter(mat => mat.rar_id === matRef.Rar_id)[0] ?? matRef.Rar_id;
		// 				counter++;
		// 			}
		// 		}

		// 		const matFields = await handleMaterialDisplay(orderedUMats, matList, missingAll);
		// 		matEmbed.addFields(matFields);
				
		// 		materialPages.push(matEmbed);
		// 	}

		// 	return materialPages;
		// }

		// // FUNCTION MOVED
		// /**
        //  * This function constructs the field array to be used for displaying mats,
        //  * by way of EmbedBuilder.addFields(finalFields)
        //  * @param {(object|string)[]} matchMatList Array of owned materials
        //  * @param {object[]} matRefList Material list array
        //  * @param {boolean} emptyMatch true if no matching mats found
        //  * @returns {promise <{name: string, value: string}[]>} Object array 
        //  */
        // async function handleMaterialDisplay(matchMatList, matRefList, emptyMatch){
        //     const finalFields = [];
            
        //     for (let i = 0; i < matRefList.length; i++){
        //         let fieldName = '', fieldValue = '';
        //         if (typeof matchMatList[i] === 'number' || emptyMatch){
        //             // Missing Material
        //             fieldName = `Unknown material of **${matRefList[i].Rarity}** rarity:`;
        //             fieldValue = 'Amount Owned: 0';
        //         } else {
        //             // Matching Material
        //             fieldName = `~= ${matRefList[i].Rarity} Material =~`;
        //             fieldValue = `Name: **__${matchMatList[i].name}__**\nAmount Owned: **${matchMatList[i].amount}**`;
        //         }

        //         finalFields.push({name: fieldName, value: fieldValue});
        //     }

        //     return finalFields;
        // }

		// // FUNCTION MOVED
		// /**
		//  * This function handles both newly built core buildings and upgrading existing ones.
		//  * 
		//  * Is responsable for returning the core building display upon completion.
		//  * @param {object} town Town DB Object
		//  * @param {object} navMenu Nav menu object holding all user selected values needed
		//  * @returns {Promise <{embeds: EmbedBuilder[], files: AttachmentBuilder[]}>}
		//  */
		// async function handleCoreBuildingConstruction(town, navMenu){
		// 	let coreBuilding = await CoreBuilding.findOrCreate({
		// 		where: {
		// 			townid: town.townid,
		// 			build_type: navMenu.typePicked
		// 		},
		// 		defaults: {
		// 			level: 1,
		// 			build_status: "Level 1",
		// 			background_tex: biomeBTexList.indexOf(town.local_biome.split('-')[0])
		// 		}
		// 	});

		// 	// Was created
		// 	let wasUpgraded = true;
		// 	if (coreBuilding[1]){
		// 		wasUpgraded = false;
		// 		await coreBuilding[0].save().then(async cb => {return await cb.reload()});
		// 	} else {
		// 		await coreBuilding[0].update({level: coreBuilding[0].level + 1, build_status: `Level ${coreBuilding[0].level + 1}`})
		// 		.then(async cb => await cb.save())
		// 		.then(async cb => {return await cb.reload()});
		// 	}

		// 	coreBuilding = coreBuilding[0];

		// 	await town.update({[`${navMenu.typePicked}_status`]: `Built: Level ${coreBuilding.level}`})
		// 	.then(async t => await t.save())
		// 	.then(async t => {return await t.reload()});

		// 	const coreBuildingPngFile = await loadBuilding(coreBuilding);

		// 	const dynBuildDesc = (wasUpgraded) ? `${makeCapital(navMenu.typePicked)} upgraded to level **${coreBuilding.level}**!`: `${makeCapital(navMenu.typePicked)} built at level 1!`;
		// 	const constructType = (wasUpgraded) ? 'Upgraded': 'Built';
		// 	const coreBuildingCreateEmbed = new EmbedBuilder()
		// 	.setTitle(`== Core Building ${constructType} ==`)
		// 	.setColor('DarkGold')
		// 	.setDescription(dynBuildDesc);

		// 	return {embeds: [coreBuildingCreateEmbed], files: [coreBuildingPngFile]};
		// }

		// // FUNCTION MOVED
		// /**
		//  * This function handles building the display for the upgrade costs given the construction type picked
		//  * @param {object} town Town DB Object
		//  * @param {object} navMenu Nav menu object holding all user selected values needed
		//  * @param {string} constructType One of ``build`` | ``upgrade``
		//  * @returns {Promise<{canConfirm: boolean, embed: EmbedBuilder, costObj: {matCosts: {name: string, matType: string, amount: number, rar_id: number}[], matsOwned: {name: string, matType: string, amount: number, rar_id: number}[]}}>}
		//  */
		// async function handleCoreCostDisplay(town, navMenu, constructType){
		// 	// Town is needed for checking owned material amounts

		// 	let coreBuildCostObj;
		// 	switch(constructType){
		// 		case "build":
		// 			coreBuildCostObj = await handleCoreCostCalc(town, 0, navMenu.typePicked);
		// 		break;
		// 		case "upgrade":
		// 			const coreRef = (await grabTownCoreBuildings(town)).find(core => core.build_type === navMenu.typePicked);
		// 			coreBuildCostObj = await handleCoreCostCalc(town, coreRef.level, coreRef.build_type);
		// 		break;
		// 	}

		// 	const costEmbed = new EmbedBuilder()
		// 	.setTitle(`== ${makeCapital(constructType)} Cost ==`)
		// 	.setDescription(`Material Requirements to begin core building construction:`);

		// 	const finalFields = [];
		// 	let idxMatch = 0, canConfirm = true;
		// 	for (const matNeeded of coreBuildCostObj.matCosts){
		// 		const matOwned = coreBuildCostObj.matsOwned[idxMatch];
		// 		if (canConfirm && matOwned.amount < matNeeded.amount) canConfirm = false;
		// 		finalFields.push({name: `== ${matNeeded.name} ==`, value: `Rarity: ${baseCheckRarName(matNeeded.rar_id)}\n(Owned/Needed) Amount: ${matOwned.amount}/${matNeeded.amount}`});
		// 		idxMatch++;
		// 	}

		// 	costEmbed.addFields(finalFields);

		// 	return {canConfirm: canConfirm, embed: costEmbed, costObj: coreBuildCostObj};
		// }

		// // FUNCTION MOVED
		// /**
		//  * This function handles calculating the cost to build/upgrade the given ``coreType`` building.
		//  * @param {object} town Town DB Object
		//  * @param {number} level Current Level of the given core building
		//  * @param {string} coreType Core Building ``build_type``
		//  * @returns {Promise <{matCosts: {name: string, matType: string, amount: number, rar_id: number}[], matsOwned: {name: string, matType: string, amount: number, rar_id: number}[]}>}
		//  */
		// async function handleCoreCostCalc(town, level, coreType){
		// 	const matTypeConverter = new Map([
		// 		['rocky', 'Stone'],
		// 		['woody', 'Wood'],
		// 		['metalic', 'Metal'],
		// 		['skinny', 'Hide'],
		// 		['slimy', 'Slime']
		// 	]);

		// 	const coreCostRef = coreBuildCostList.find(core => core.Name === coreType);

		// 	const handleCoreMaterialScale = (lvl, costObj) => {
		// 		return costObj.Amount * (1 + (lvl - (costObj.Level)));
		// 	};

		// 	const handleCoreMaterialRarity = (lvl, costObj) => {
		// 		return costObj.Rarity + Math.floor(lvl / 2);
		// 	};

		// 	const nextLevel = level + 1;
		// 	const materialCostList = [], materialOwnedList = [];
		// 	for (const [matType, convType] of matTypeConverter){
		// 		// Check if next level !requires convType
		// 		if (coreCostRef[convType].Level > nextLevel) continue;
		// 		const curMatCostRef = coreCostRef[convType];

		// 		const matNumNeeded = handleCoreMaterialScale(nextLevel, curMatCostRef);
		// 		const matRarNeeded = handleCoreMaterialRarity(nextLevel, curMatCostRef);
				
		// 		const matRef = grabMaterialByRarID(matRarNeeded, matType, materialFiles);

		// 		materialCostList.push({name: matRef.Name, matType: matType, amount: matNumNeeded, rar_id: matRarNeeded});
			
		// 		const townOwnsMat = await TownMaterial.findOne({where: {townid: town.townid, name: matRef.Name}});
		// 		materialOwnedList.push({name: matRef.Name, matType: matType, amount: townOwnsMat?.amount ?? 0, rar_id: matRarNeeded});
		// 	}

		// 	return {matCosts: materialCostList, matsOwned: materialOwnedList};
		// }

		// // FUNCTION MOVED
		// /**
		//  * This function retrieves a material ref object based on the given ``rar`` & ``matType``
		//  * @param {number} rar RarID to search for
		//  * @param {string} matType Material Type to search for
		//  * @param {Collection} materialFiles Discord Collection object
		//  * @returns {object}
		//  */
		// function grabMaterialByRarID(rar, matType, materialFiles){
		// 	const matFile = require(materialFiles.get(matType));

		// 	const matRef = matFile.find(mat => mat.Rar_id === rar);

		// 	return matRef;
		// }

		// // FUNCTION MOVED
		// /**
		//  * This function loads all player made buildings located within the given town.
		//  * @param {object} town Town DB Object
		//  * @returns {Promise <{embeds: EmbedBuilder[], files: AttachmentBuilder[], details: EmbedBuilder[]}>}
		//  */
		// async function loadTownBuildingDisplayList(town){
		// 	const returnObj = {embeds: [], files: [], details: []};

		// 	const builtPlots = await grabTownPlotList(town, "Built");

		// 	for (const plot of builtPlots){
		// 		const building = await PlayerBuilding.findOne({where: {plotid: plot.plotid}});

		// 		const mainEmbed = new EmbedBuilder()
		// 		.setTitle(`== ${makeCapital(building.build_type)} ==`)
		// 		.setColor('DarkGold');
		// 		returnObj.embeds.push(mainEmbed);

		// 		const mainFile = await loadBuilding(building);
		// 		returnObj.files.push(mainFile);

		// 		const detailEmbed = new EmbedBuilder()
		// 		.setTitle('== Building Details ==')
		// 		.setColor('DarkNavy')
		// 		.setDescription(`Town: ${makeCapital(town.name)}\nOwner: ${makeCapital((await grabUser(building.ownerid)).username)}\nBand: No Linked Band`);
		// 		returnObj.details.push(detailEmbed);
		// 	}

		// 	return returnObj;
		// }

		// // FUNCTION MOVED
		// /**
		//  * This function loads all built core buildings for the given town, ready to be displayed
		//  * @param {object} town Town DB Object
		//  * @returns {Promise <{embeds: EmbedBuilder[], files: AttachmentBuilder[], details: EmbedBuilder[], clergyQuest: {active: boolean, posIndex: number, callFunction: handleClergyMystQuest}}>}
		//  */
		// async function loadTownCoreBuildingDisplayList(town){
		// 	const returnObj = {embeds: [], files: [], details: [], clergyQuest: {active: false, posIndex: 0, callFunction: handleClergyMystQuest}};
		// 	const townCores = await grabTownCoreBuildings(town);

		// 	for (const core of townCores){
		// 		const mainEmbed = new EmbedBuilder()
		// 		.setTitle(`== ${makeCapital(core.build_type)} ==`)
		// 		.setColor('DarkGold');
		// 		returnObj.embeds.push(mainEmbed);

		// 		const mainFile = await loadBuilding(core);
		// 		returnObj.files.push(mainFile);

		// 		const detailEmbed = new EmbedBuilder()
		// 		.setTitle('== Core Building Details ==')
		// 		.setColor('DarkNavy')
		// 		.setDescription(`Town: ${makeCapital(town.name)}\n${makeCapital(core.build_type)} Level: ${core.level}`);
		// 		returnObj.details.push(detailEmbed);

		// 		if (core.build_type === 'clergy'){
		// 			returnObj.clergyQuest.active = true;
		// 			returnObj.clergyQuest.posIndex = returnObj.details.length - 1;
		// 		}
		// 	}

		// 	return returnObj;
		// }

		// // FUNCTION MOVED
		// /**
		//  * This function handles building the selected build type on on of the users owned && empty plots.
		//  * 
		//  * Constructs the building display image for the newly created building and returns it.
		//  * @param {object} town Town DB Object
		//  * @param {object} user UserData DB Object, user building
		//  * @param {object} navMenu Nav menu object holding all user selected values needed
		//  * @returns {Promise<{embeds: EmbedBuilder[]; files: (string | AttachmentBuilder)[];}>}
		//  */
		// async function handleBuildingOnTownPlot(town, user, navMenu){
		// 	const townOwnedPlots = await grabTownPlotList(town, "Empty");
		// 	const ownedPlotPicked = townOwnedPlots.find(plot => plot.ownerid === user.userid);  // .filter(plot => plot.ownerid === user.userid)[0];

		// 	await ownedPlotPicked.update({empty: false})
		// 	.then(async tp => await tp.save())
		// 	.then(async tp => {return await tp.reload()});

		// 	await handleUpdateTownPlotTypeAmounts(town);

		// 	const building = await PlayerBuilding.create({
		// 		townid: town.townid,
		// 		ownerid: user.userid,
		// 		plotid: ownedPlotPicked.plotid,
		// 		can_edit: user.userid,
		// 		build_type: navMenu.typePicked,
		// 		background_tex: biomeBTexList.indexOf(town.local_biome.split('-')[0])
		// 	}).then(async b => await b.save()).then(async b => {return await b.reload()});
		
		// 	const buildingPngFile = await loadBuilding(building);

		// 	let dynBuildDesc = `New ${makeCapital(navMenu.typePicked)} created!`;
		// 	if (navMenu.typePicked === 'house') dynBuildDesc += `\nWelcome home! <3`;
		// 	const buildingCreateEmbed = new EmbedBuilder()
		// 	.setTitle('== Building Created ==')
		// 	.setColor('DarkGold')
		// 	.setDescription(dynBuildDesc);

		// 	return {embeds: [buildingCreateEmbed], files: [buildingPngFile]};
		// }

		// // FUNCTION MOVED
		// /**
		//  * This function loads all plot building option buttons
		//  * 
		//  * houseButt: ``build-house``
		//  * @returns {ActionRowBuilder}
		//  */
		// function createBuildTypeButtonRow(){
		// 	const houseButt = new ButtonBuilder()
		// 	.setCustomId('build-house')
		// 	.setStyle(ButtonStyle.Primary)
		// 	.setLabel('Build House!');

		// 	const buttonRow = new ActionRowBuilder().addComponents(houseButt);

		// 	return buttonRow;
		// }

		// // FUNCTION MOVED
		// /**
		//  * This function handles claiming a random unowned plot, assigning the plot to the given user,
		//  * then updates the plot counts of the given town.
		//  * @param {object} town Town DB Object
		//  * @param {object} user UserData DB Object, user claiming plot
		//  * @param {object} navMenu Nav menu object holding all user selected values needed
		//  */
		// async function handleTownPlotClaim(town, user, navMenu){
		// 	const townPlots = await grabTownPlotList(town, navMenu.navType);

		// 	const thePlot = randArrPos(townPlots);

		// 	await thePlot.update({ownerid: user.userid, private: true})
		// 	.then(async tp => await tp.save())
		// 	.then(async tp => {return await tp.reload()});

		// 	await handleUpdateTownPlotTypeAmounts(town);
		// }

		// // FUNCTION MOVED
		// /**
		//  * This function handles updating ``TownPlot.private`` for the given towns plots of ``currentPlotStatus``. 
		//  * @param {object} town Town DB Object
		//  * @param {object} navMenu Nav menu object holding all user selected values needed
		//  */
		// async function handleTownPlotStatusUpdates(town, navMenu){
		// 	const grabType = (navMenu.typePicked === "Open") ? "Closed" : "Open";
		// 	const townPlots = await grabTownPlotList(town, grabType);

		// 	console.log('Total Plots: %d', townPlots.length);

		// 	for (let i = 0; i < navMenu.moveAmount; i++){
		// 		await townPlots[i].update({private: navMenu.typePicked !== 'Open'})
		// 		.then(async tp => await tp.save())
		// 		.then(async tp => {return await tp.reload()});
		// 	}

		// 	await handleUpdateTownPlotTypeAmounts(town);
		// }

		// // FUNCTION MOVED
		// /**
		//  * This function checks and updates any plots !matching amount values found.
		//  * @param {object} town Town DB Object
		//  */
		// async function handleUpdateTownPlotTypeAmounts(town){
		// 	const openPlots = await grabTownPlotList(town, "Open", true);
		// 	if (town.openplots !== openPlots) await town.update({openplots: openPlots}).then(async t => await t.save()).then(async t => {return await t.reload()});
		// 	const closedPlots = await grabTownPlotList(town, "Closed", true);
		// 	if (town.closedplots !== closedPlots) await town.update({closedplots: closedPlots}).then(async t => await t.save()).then(async t => {return await t.reload()});
		// 	const ownedPlots = await grabTownPlotList(town, "Owned", true);
		// 	if (town.ownedplots !== ownedPlots) await town.update({ownedplots: ownedPlots}).then(async t => await t.save()).then(async t => {return await t.reload()});
		// 	const builtPlots = await grabTownPlotList(town, "Built", true);
		// 	if (town.buildcount !== builtPlots) await town.update({buildcount: builtPlots}).then(async t => await t.save()).then(async t => {return await t.reload()});

		// }

		// // FUNCTION MOVED
		// /**
		//  * This function handles locating all plots belonging to the given town.
		//  * 
		//  * It then filters them based on the provided ``plotStatus``.
		//  * @param {object} town Town DB Object
		//  * @param {string} plotStatus One of: ``Owned``, ``Closed``, ``Open``, ``Built``, ``Empty``
		//  * @param {boolean} returnLength Default: ``false``, set to ``true`` to return found plots list length
		//  * @returns {Promise <object[] | number>}
		//  */
		// async function grabTownPlotList(town, plotStatus, returnLength=false){
		// 	const townPlots = await TownPlots.findAll({where: {townid: town.townid}});

		// 	const hasOwner = (plot) => plot.ownerid !== '0';
		// 	const hasBuild = (plot) => !plot.empty;
		// 	const isClosed = (plot) => plot.private;

		// 	let filteredPlotList = [];
		// 	switch(plotStatus){
		// 		case "Owned":
		// 			filteredPlotList = townPlots.filter(plot => hasOwner(plot));
		// 		break;
		// 		case "Closed":
		// 			filteredPlotList = townPlots.filter(plot => isClosed(plot) && !hasOwner(plot));
		// 		break;
		// 		case "Open":
		// 			filteredPlotList = townPlots.filter(plot => !isClosed(plot) && !hasOwner(plot));
		// 		break;
		// 		case "Built":
		// 			filteredPlotList = townPlots.filter(plot => hasBuild(plot));
		// 		break;
		// 		case "Empty":
		// 			filteredPlotList = townPlots.filter(plot => !hasBuild(plot) && hasOwner(plot));
		// 		break;
		// 		default:
		// 			filteredPlotList = townPlots;
		// 		break;
		// 	}

		// 	return (returnLength) ? filteredPlotList.length : filteredPlotList;
		// }

		// // FUNCTION MOVED 
		// /**
		//  * This function loads all existing core buildings matching the given towns id.
		//  * @param {object} town Town DB Object
		//  * @param {boolean} [returnLength=false] Set to ``true`` to return the ``.length`` for "built" core buildings
		//  * @returns {Promise <object[]>}
		//  */
		// async function grabTownCoreBuildings(town, returnLength=false){
		// 	const coreTypes = ['grandhall', 'bank', 'market', 'tavern', 'clergy'];

		// 	const townCoreList = [];
		// 	for (const type of coreTypes){
		// 		const core = await CoreBuilding.findOne({where: {townid: town.townid, build_type: type}});
		// 		if (!core) continue;
		// 		townCoreList.push(core);
		// 	}

		// 	return (returnLength) ? townCoreList.length : townCoreList;
		// }

		// // FUNCTION MOVED 
		// /**
		//  * This function handles withdraw logic and updating inventories with applicable amounts and items
		//  * @param {object} town Town DB Object, town giving goods
		//  * @param {object} user UserData DB Object, user recieving goods
		//  * @param {object} navMenu Nav menu object holding all user selected values needed
		//  * @returns {Promise <EmbedBuilder>}
		//  */
		// async function handleWithdrawFromTown(town, user, navMenu){
		// 	switch(navMenu.typePicked){
		// 		case "mat":
		// 			// Give to User
		// 			await checkInboundMat(user.userid, navMenu.typeExtras.ref, navMenu.typeExtras.matType, navMenu.moveAmount);
		// 			// Take from Town
		// 			await checkOutboundTownMat(town.townid, navMenu.typeExtras.ref, navMenu.typeExtras.matType, navMenu.moveAmount);
		// 		break;
		// 		case "coin":
		// 			// Give to User
		// 			await updateUserCoins(navMenu.moveAmount, user);
		// 			// Take from Town
		// 			await spendUserCoins(navMenu.moveAmount, town);
		// 		break;
		// 	}

		// 	const finalEmbed = new EmbedBuilder()
		// 	.setTitle('== Withdraw Successful ==');

		// 	return finalEmbed;
		// }
		
		// // FUNCTION MOVED
		// /**
		//  * This function handles deposit logic and updating inventories with applicable amounts and items
		//  * @param {object} town Town DB Object, town recieving goods
		//  * @param {object} user UserData DB Object, user giving goods
		//  * @param {object} navMenu Nav menu object holding all user selected values needed
		//  * @returns {Promise <EmbedBuilder>}
		//  */
		// async function handleDepositIntoTown(town, user, navMenu){
		// 	switch(navMenu.typePicked){
		// 		case "mat":
		// 			// Give to Town
		// 			await checkInboundTownMat(town.townid, navMenu.typeExtras.ref, navMenu.typeExtras.matType, navMenu.moveAmount);
		// 			// Take from user
		// 			await checkOutboundMat(user.userid, navMenu.typeExtras.ref, navMenu.typeExtras.matType, navMenu.moveAmount);
		// 		break;
		// 		case "coin":
		// 			// Give to town
		// 			await updateUserCoins(navMenu.moveAmount, town);
		// 			// take from user
		// 			await spendUserCoins(navMenu.moveAmount, user);
		// 		break;
		// 	}

		// 	const finalEmbed = new EmbedBuilder()
		// 	.setTitle('== Deposit Successful ==');

		// 	return finalEmbed;
		// }

		// // FUNCTION MOVED
		// /**
		//  * This function handles transfering ownership of the given town, to the given user.
		//  * @param {object} town Town DB Object
		//  * @param {object} user UserData DB Object
		//  * @returns {Promise <{embeds: EmbedBuilder, status: string}>}
		//  */
		// async function updateTownMayor(town, user){
		// 	await town.update({mayorid: user.userid}).then(async t => await t.save()).then(async t => {return await t.reload()});

		// 	const returnEmbed = new EmbedBuilder()
		// 	.setTitle('== Transfer Complete ==')
		// 	.setDescription(`${makeCapital(user.username)} has been made the new mayor!`);

		// 	return {embeds: [returnEmbed], status: 'Complete'};
		// }

		// // FUNCTION MOVED
		// /**
		//  * This function handles appointing/demoting a selected user from a given town.
		//  * @param {object} town Town DB Object
		//  * @param {object} user UserData DB Object
		//  * @param {string} changeType One of: ``appoint`` | ``demote``
		//  * @returns {Promise <{embeds: EmbedBuilder, status: string}>}
		//  */
		// async function updateTownCanEditList(town, user, changeType){
		// 	const curEditList = town.can_edit.split('-');

		// 	const returnEmbed = new EmbedBuilder();
		// 	let newEditList;
		// 	switch(changeType){
		// 		case "appoint":
		// 			newEditList = curEditList.push(user.userid);
		// 			returnEmbed
		// 			.setTitle('== User Appointed ==')
		// 			.setDescription(`${makeCapital(user.username)} has been appointed to your town!`);
		// 		break;
		// 		case "demote":
		// 			newEditList = curEditList.filter(id => id !== user.userid);
		// 			returnEmbed
		// 			.setTitle('== User Demoted ==')
		// 			.setDescription(`${makeCapital(user.username)} has been demoted from your town!`);
		// 		break;
		// 	}

		// 	await town.update({can_edit: newEditList.toString()}).then(async t => await t.save()).then(async t => {return await t.reload()});

		// 	return {embeds: [returnEmbed], status: 'Complete'};
		// }

		// // FUNCTION MOVED 
		// /**
		//  * This function loads the display object for all local town material bonuses available.
		//  * @param {object[]} towns List of all local towns
		//  * @returns {{title: string, color: string, fields: {name: string, value: string}[]}}
		//  */
		// function generateLocalTownBonuses(towns){
		// 	const finalObj = {
		// 		title: `== Local Town Bonuses ==`,
		// 		color: "",
		// 		fields: []
		// 	};

		// 	const allignMatBonus = {
		// 		Normal: [10, 5, 3, 3],
		// 		Evil: [5, 3, 1, 1],
		// 		Phase: [10, 8, 5, 5],
		// 	};

		// 	const finalFields = [];
		// 	for (const town of towns){
		// 		const matTypes = town.mat_bonus.split(',');
		// 		const bonusList = allignMatBonus[`${town.local_biome.split('-')[1]}`];

		// 		let bonusIdx = 0, finalValue = "";
		// 		for (const type of matTypes){
		// 			finalValue += `+${bonusList[bonusIdx]} ${makeCapital(type)}\n`;
		// 			bonusIdx++;
		// 		}

		// 		finalFields.push({name: `The Town of ${makeCapital(town.name)} gives: `, value: finalValue});
		// 	}

		// 	finalObj.fields = finalFields;
		// 	finalObj.color = 'DarkGold';

		// 	return finalObj;
		// }

		// // FUNCTION MOVED 
		// /**
		//  * This function generates the embed values for the ``town`` requested.
		//  * @param {object} town Town DB Object
		//  * @param {object} mayor UserData DB Object
		//  * @returns {Promise <{title: string, color: string, fields: {name: string, value: string}[]}>}
		//  */
		// async function generateTownDisplayEmbed(town, mayor){
		// 	const finalObj = {
		// 		title: `== Town of ${makeCapital(town.name)} ==`,
		// 		color: "",
		// 		fields: []
		// 	};

		// 	// finalObj.description = `Current Mayor: ${mayor.username}\nTown Level: ${town.level}\nTreasury Contains: ${town.coins}c\n========\nHuman Population: ${town.population}\nNPC Population: ${town.npc_population}\n========\nMax Buildings: ${town.buildlimit}\nOpen Plots: ${town.openplots}\nClosed Plots: ${town.closedplots}\nOwned Plots: ${town.ownedplots}\nBuildings: ${town.buildcount}\n========\nMain Biome: ${biomeList[0]}\nAllignment: ${biomeList[1]}\n========\n`;

		// 	// Basic Info
        //     // ==========
        //     // Level, Coins, Location, Population
        //     const locationSwitch = town.local_biome.split("-");
        //     const basicField = {
        //         name: '== Basic Info ==',
        //         value: `Town Level: **${town.level}**\nTown Coins: **${town.coins}**c\nTown Biome: **${locationSwitch[1]} ${locationSwitch[0]}**\nPlayer Population: **${town.population}**\nNPC Population: **${town.npc_population}**`
        //     };

        //     // Mayor Info
        //     // ==========
        //     // Cur-User?
        //     // const theMayor = await grabUser(town.mayorid);
        //     const mayorField = {
        //         name: '== The Mayor ==',
        //         value: `**${makeCapital(mayor.username)}**`
        //     };

        //     // Build Info
        //     // ==========
        //     // Tot-Plots, Open, Closed, Built
        //     const buildFields = {
        //         name: '== Plot Info ==',
        //         value: `Total Plots: **${town.buildlimit}**\nOpen Plots: **${town.openplots}**\nClosed Plots: **${town.closedplots}**\nOwned Plots: **${town.ownedplots}**\nDeveloped Plots: **${town.buildcount}**`
        //     };

        //     // Core Info
        //     // =========
        //     // Grandhall, Bank, Market, Tavern, Clergy
		// 	/**
		// 	 * This method loads the appropete display text given the status of a core building.
		// 	 * @param {string} status Corebuilding build status
		// 	 * @returns {string}
		// 	 */
		// 	const loadCoreTextFromStatus = (status) => {
		// 		return (status === 'None') ? "Not Built" : `Progress: ${status.split(': ')[0]} @ ${status.split(': ')[1]}`;
		// 	};
		// 	// 0 Grandhall, 1 Bank, 2 Market, 3 Tavern, 4 Clergy
		// 	const coreTextList = [
		// 		loadCoreTextFromStatus(town.grandhall_status), 
		// 		loadCoreTextFromStatus(town.bank_status), 
		// 		loadCoreTextFromStatus(town.market_status), 
		// 		loadCoreTextFromStatus(town.tavern_status), 
		// 		loadCoreTextFromStatus(town.clergy_status)
		// 	];
        //     const coreFields = {
        //         name: '== Core-Building Info ==',
        //         value: `Grandhall Status: **${coreTextList[0]}**\nBank Status: **${coreTextList[1]}**\nMarket Status: **${coreTextList[2]}**\nTavern Status: **${coreTextList[3]}**\nClergy Status: **${coreTextList[4]}**`
        //     };

		// 	// Embed Fields
		// 	finalObj.fields = [mayorField, basicField, buildFields, coreFields];

		// 	const biomeColours = {
		// 		Forest: 'DarkGreen',
		// 		Mountain: 'LightGrey',
		// 		Desert: 'DarkGold',
		// 		Plains: 'Gold',
		// 		Swamp: 'DarkAqua',
		// 		Grassland: 'Green'
		// 	};

		// 	// Embed Colour
		// 	finalObj.color = biomeColours[`${locationSwitch[0]}`];

		// 	return finalObj;
		// }

		// // FUNCTION MOVED 
		// /**
		//  * This function handles updating both the ``town`` and ``user`` objects given.
		//  * 
		//  * ``town.population++``
		//  * 
		//  * ``user.townid`` = ``town.townid``
		//  * @param {object} town Town DB Object
		//  * @param {object} user UserData DB Object
		//  * @returns {Promise <{embeds: EmbedBuilder, status: string}>}
		//  */
		// async function handleJoinTown(town, user){
		// 	await town.increment('population').then(async t => await t.save()).then(async t => {return await t.reload()});
		// 	await handleTownPopLeveling(town);
		// 	await user.update({townid: town.townid}).then(async u => await u.save()).then(async u => {return await u.reload()});

		// 	const finalEmbed = new EmbedBuilder()
		// 	.setTitle('== Town Joined ==')
		// 	.setDescription(`Congratulations!! You are now a member of ${makeCapital(town.name)}!`);

		// 	return {embeds: finalEmbed, status: 'Complete'};
		// }

		// // FUNCTION MOVED 
		// /**
		//  * This function handles checking if the given ``town`` meets the level up requirements.
		//  * @param {object} town Town DB Object
		//  * @returns {Promise <void>}
		//  */
		// async function handleTownPopLeveling(town){
		// 	const townLevelCheckStart = new Date().getTime();
		// 	let timerEndsText = 'Town Level Checking';

		// 	const staticTownPopLevelReq = (town) => {
		// 		const totPop = town.population + town.npc_population;
		// 		const levelUPReq = town.level * 5;
		// 		return totPop >= levelUPReq;
		// 	};

		// 	if (staticTownPopLevelReq(town)) {
		// 		await town.increment('level').then(async t => await t.save()).then(async t => {return await t.reload()});
		// 		// CHANGE THIS VALUE BASED ON LEVEL/OTHER FACTORS!!
		// 		const plotsNeeded = 5;
		// 		await handleNewTownPlotCreation(town, plotsNeeded);
		// 		timerEndsText += ' (LEVEL UP)';
		// 	}

		// 	endTimer(townLevelCheckStart, timerEndsText);
		// 	return;
		// }

		// // FUNCTION MOVED 
		// /**
		//  * This function generates ``plotAmount`` new plots linked by ``town.townid``.
		//  * @param {object} town Town DB Object
		//  * @param {number} plotAmount Number of new plots to create
		//  * @returns {Promise <void>}
		//  */
		// async function handleNewTownPlotCreation(town, plotAmount){
		// 	const makeNewPlotsStart = new Date().getTime();
		// 	for (let i = 0; i < plotAmount; i++){
		// 		await TownPlots.create({
		// 			townid: town.townid
		// 		}).then(async tp => await tp.save()).then(async tp => {return await tp.reload()});
		// 	}

		// 	await handleUpdateTownPlotTypeAmounts(town);

		// 	endTimer(makeNewPlotsStart, 'Create New Town Plots');
		// 	console.log(`Current Total Plots for ${makeCapital(town.name)}: %d`, await TownPlots.findAll({where: {townid: town.townid}}).length);
		// }


		// // Establish Town
		// if (interaction.options.getSubcommand() === 'establish') {
		// 	const user = await grabU();
		// 	if (!user) return await noUser();

		// 	if (user.townid !== '0') return await interaction.reply('You already belong to a town, therefore you cannot create a new one!');

		// 	if (user.level < 100) return await interaction.reply('You must be at least level 100 to establish your own town, consider joining an existing town until then!!');

		// 	const townName = interaction.options.getString('townname');
		// 	const location = interaction.options.getString('location');

		// 	if (townName === 'NONE' || townName === 'None') return await interaction.reply('Sorry, that name is not useable!!');

		// 	const theGuild = await GuildData.findOne({ where: { guildid: interaction.guild.id } });
		// 	if (!theGuild) return await interaction.reply('Something went wrong while finding guild association!!');

		// 	const medTile = await MediumTile.findOne({ where: { guildid: theGuild.guildid } });
		// 	if (!medTile) return await interaction.reply('Something went wrong while finding Medium Tile association!!');

		// 	if (medTile.town_one !== '0' && medTile.town_two !== '0') return await interaction.reply('This server has reached the max amount of towns!!');

		// 	let locationTaken = true;
		// 	if (location === 'one' && medTile.town_one === '0') locationTaken = false;
		// 	if (location === 'two' && medTile.town_two === '0') locationTaken = false;

		// 	if (locationTaken) return await interaction.reply('That location already has a town!!');

		// 	let localBiomeCheck;
		// 	if (location === 'one') localBiomeCheck = medTile.local_biome_one;
		// 	if (location === 'two') localBiomeCheck = medTile.local_biome_two;

		// 	// biomes = ['Forest', 'Mountain', 'Desert', 'Plains', 'Swamp', 'Grassland'];

		// 	/**		BIOME MAT BONUS:
		// 	 *		
		// 	 *		- Forest
		// 	 *			- woody
		// 	 *			- fleshy
		// 	 *			- skinny
		// 	 *		
		// 	 *		- Mountain
		// 	 *			- metalic
		// 	 *			- rocky
		// 	 *			- gemy
		// 	 *		
		// 	 *		- Desert
		// 	 *			- gemy
		// 	 *			- rocky
		// 	 *			- skinny
		// 	 *		
		// 	 *		- Plains
		// 	 *			- skinny
		// 	 *			- herby
		// 	 *			- fleshy
		// 	 *		
		// 	 *		- Swamp
		// 	 *			- slimy
		// 	 *			- herby
		// 	 *			- woody
		// 	 *		
		// 	 *		- Grassland
		// 	 *			- herby
		// 	 *			- rocky
		// 	 *			- metalic
		// 	 *			
		// 	 *		===============================
		// 	 *		- Normal
		// 	 *			- magical, +10, +5, +3
		// 	 *		- Evil
		// 	 *			- unique, +5, +3, +1
		// 	 *		- Phase
		// 	 *			- tooly, +10, +8, +5
		// 	 * */
		// 	const bonusList = {
		// 		"Forest": ['woody', 'fleshy', 'skinny'],
		// 		"Mountain": ['metalic', 'rocky', 'gemy'],
		// 		"Desert": ['gemy', 'rocky', 'skinny'],
		// 		"Plains": ['skinny', 'herby', 'fleshy'],
		// 		"Swamp": ['slimy', 'herby', 'woody'],
		// 		"Grassland": ['herby', 'rocky', 'metalic']
		// 	};

		// 	const allignBonusList = {
		// 		"Normal": ["magical"],
		// 		"Evil": ["unique"],
		// 		"Phase": ["tooly"]
		// 	};

		// 	const biomeType = localBiomeCheck.split('-');

		// 	const bonusPre = bonusList[`${biomeType[0]}`];
		// 	const bonusPost = allignBonusList[`${biomeType[1]}`];

		// 	const bonusArr = bonusPre.concat(bonusPost);
		// 	const bonusStr = bonusArr.toString();

		// 	let newTown = await Town.create({
		// 		tileid: medTile.tileid,
		// 		tile_location: medTile.tile_location,
		// 		local_biome: localBiomeCheck,
		// 		mat_bonus: bonusStr,
		// 		guildid: medTile.guildid,
		// 		mayorid: interaction.user.id,
		// 		can_edit: interaction.user.id,
		// 		name: townName,
		// 		population: 1,
		// 		npc_population: 0
		// 	});
		// 	console.log(newTown.dataValues);

		// 	const totalPlots = newTown.buildlimit;

		// 	const townPlotList = await TownPlots.findAll({ where: { townid: newTown.townid } });
		// 	if (!townPlotList || townPlotList.length < totalPlots) {
		// 		let plotsNeeded = totalPlots - (townPlotList.length ?? 0);
		// 		for (let i = 0; i < plotsNeeded; i++) {
		// 			let newPlot = await TownPlots.create({
		// 				townid: newTown.townid,
		// 			});
		// 			townPlotList.push(newPlot);
		// 		}
		// 	}

		// 	const userUpdate = await user.update({ townid: newTown.townid });
		// 	if (userUpdate) await user.save();

		// 	let tileUpdate;
		// 	if (location === 'one') tileUpdate = await medTile.update({ town_one: newTown.townid });
		// 	if (location === 'two') tileUpdate = await medTile.update({ town_two: newTown.townid });

		// 	if (tileUpdate) await medTile.save();



		// 	return await interaction.reply('New Town created!!');
		// }

		// This function is temporary
		// /** This function handles checking if a user is eligable for recieving a phasereader needed to craft a personal forge,
		//  *		this will only work once. The contained dialog is to aid in UX for the user, and will better direct the user
		//  *		towards the needed locations and commands to finish the blueprint. Upon completetion Miens storyline will become
		//  *		much clearer and straightforward!
		//  * 
		//  * @param {any} user db instance
		//  * 
		//  */
        //  async function handleClergyMystQuest(user) {
		// 	const { Milestones, ActiveDungeon, OwnedTools } = require('../dbObjects.js');
		// 	const { handleMaterialAdding } = require('./exported/materialDropper.js');
		// 	const { grabColour } = require('./exported/grabRar.js');

		// 	const uniqueMatList = require('../events/Models/json_prefabs/materialLists/uniqueList.json');
		// 	const pr = uniqueMatList.filter(mat => mat.Name === 'Phasereader');
		// 	const phasereader = pr[0];

		// 	const userMilestone = await Milestones.findOne({ where: { userid: user.userid } });
		// 	if (!userMilestone) return;
		// 	if (userMilestone.currentquestline !== 'Myst') return;

		// 	const userDungeon = await ActiveDungeon.findOne({ where: [{ dungeonspecid: user.userid }, { dungeonid: 6 }] });
		// 	if (!userDungeon || !userDungeon.completed) return;

		// 	const schemaCheck = await OwnedTools.findOne({ where: [{ spec_id: user.userid }, { name: 'Machine Schematics' }] });
		// 	if (schemaCheck) return;

		// 	const prCheck = await MaterialStore.findOne({ where: [{ spec_id: user.userid }, { name: 'Phasereader' }] });
		// 	if (prCheck) return;

		// 	const embedDescList = [];
		// 	const buttonLabelList = [];

		// 	embedDescList[0] = 'Hello there, what brings you here today?';
		// 	buttonLabelList[0] = 'Hello';

		// 	embedDescList[1] = 'It has been some time since last we saw you! Whats that in your hand?';
		// 	buttonLabelList[1] = 'What, this old thing?';

		// 	embedDescList[2] = 'Yes! Give it here!';
		// 	buttonLabelList[2] = 'Give Machine Schematics to clergyman';

		// 	embedDescList[3] = 'Oh my! What a truly fascinating contraption! Where did you get this?!';
		// 	buttonLabelList[3] = 'I-i found it. What does it say?';

		// 	embedDescList[4] = 'Hmmm so be it.. I cannot read it without the proper tools, I do believe a *Phasereader* is required!';
		// 	buttonLabelList[4] = 'Where might one find one of those?';

		// 	embedDescList[5] = 'Allow me to check our inventory, we may very well still have one!';
		// 	buttonLabelList[5] = 'Wait for Clergyman';

		// 	embedDescList[6] = '...';
		// 	buttonLabelList[6] = 'Wait for Clergyman';

		// 	embedDescList[7] = '...';
		// 	buttonLabelList[7] = 'Wait for Clergyman';

		// 	embedDescList[8] = 'You are in luck! We do have one. Here, its all yours free of charge. Now go build that machine!!';
		// 	buttonLabelList[8] = 'Thank you kindly!';

		// 	const nextButton = new ButtonBuilder()
		// 		.setCustomId('next-dialog')
		// 		.setLabel(buttonLabelList[0])
		// 		.setStyle(ButtonStyle.Primary);

		// 	const buttonRow = new ActionRowBuilder().addComponents(nextButton);

		// 	const clergyDialogEmbed = new EmbedBuilder()
		// 		.setTitle('Clergyman')
		// 		.setDescription(embedDescList[0])
		// 		.setColor('DarkAqua');

		// 	const dialogMsg = await interaction.followUp({ embeds: [clergyDialogEmbed], components: [buttonRow] });

		// 	const filter = (i) => i.user.id === interaction.user.id;

		// 	const collector = dialogMsg.createMessageComponentCollector({
		// 		componentType: ComponentType.Button,
		// 		filter,
		// 		time: 120000,
		// 	});

		// 	let currentPage = 0;
		// 	collector.on('collect', async (COI) => {
		// 		if (COI.customId === 'next-dialog') {
		// 			await COI.deferUpdate().then(async () => {
		// 				if ((currentPage + 1) === embedDescList.length) {
		// 					const material = await handleMaterialAdding(phasereader, 1, user, 'Phasereader');

		// 					let fieldName = `${material.name}`;
		// 					let fieldValue = `Value: ${material.value}\nRarity: ${material.rarity}\nAmount: 1\nUses: ***Crafting Machine Schematics***`;
		// 					let fieldObj = { name: fieldName, value: fieldValue };
		// 					let finalFields = [fieldObj];

		// 					const embedColour = await grabColour(12);

		// 					const matEmbed = new EmbedBuilder()
		// 						.setTitle('~==~**Material Obtained!**~==~')
		// 						.setColor(embedColour)
		// 						.addFields(finalFields);

		// 					collector.stop();

		// 					return await interaction.channel.send({ embeds: [matEmbed] }).then(embedMsg => setTimeout(() => {
		// 						embedMsg.delete();
		// 					}, 120000)).catch(e => console.error(e));
		// 				} else {
		// 					currentPage++;
		// 					nextButton.setLabel(buttonLabelList[currentPage]);
		// 					clergyDialogEmbed.setDescription(embedDescList[currentPage]);
		// 					await dialogMsg.edit({ embeds: [clergyDialogEmbed], components: [buttonRow] });
		// 				}
		// 			}).catch(e => console.error(e));
        //         }
		// 	});

		// 	collector.on('end', () => {
		// 		dialogMsg.delete().catch(error => {
		// 			if (error.code !== 10008) {
		// 				console.error('Failed to delete the message:', error);
		// 			}
		// 		});
		// 	});

		// 	return;
		// }
	},
};
