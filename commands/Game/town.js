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
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('buildcore')
			.setDescription('Begin construction of a core town building!')
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('upgradecore')
			.setDescription('Begin upgrade for a core town building!')
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
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('withdraw')
			.setDescription('Transfer coins or materials from the towns treasury into your personal balance.')
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

			choices = [slotOne, slotTwo];

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

		const storeButtList = loadTownStoreButts(subCom);
		const storeButtRow = new ActionRowBuilder().addComponents(storeButtList);

		const plotsButtList = loadClaimPlotButts(permList);
		const plotsButtRow = new ActionRowBuilder().addComponents(plotsButtList);

		const oPlotsButtList = loadOwnedPlotSelectButts(permList);
		const oPlotsButtRow = new ActionRowBuilder().addComponents(oPlotsButtList);

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
	},
};
