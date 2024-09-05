const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const { PlayerBuilding, UserData, OwnedTools } = require('../../dbObjects.js');

const { loadBuilding, countBuildingDisplayOptions } = require('./exported/displayBuilding.js');

// const acToolE = require('../../events/Models/json_prefabs/acToolEffects.json');
const { grabUser, grabTown, checkUserBuildPerms, makeCapital, createInteractiveChannelMessage, handleCatchDelete, createConfirmCancelButtonRow, sendTimedChannelMessage, editTimedChannelMessage } = require('../../uniHelperFunctions.js');
const { grabTownPlotList, grabTownBuildingList, loadOwnedBuildingDisplayList, updateBuildingCanEditList } = require('./exported/townExtras.js');
const { NavMenu } = require('../Development/Export/Classes/NavMenu.js');
const { createBasicPageButtons } = require('./exported/tradeExtras.js');

module.exports = {
	data: new SlashCommandBuilder()
	.setName('building')
	.setDescription('The main command for all things building related!')
	.addSubcommand(subcommand =>
		subcommand
		.setName('appoint')
		.setDescription('Appoint a user to allow them access to building editing commands.')
		.addStringOption(option =>
			option
			.setName('thebuild')
			.setDescription('The building to be used.')
			.setRequired(true)
			.setAutocomplete(true)
		)
		.addUserOption(option => option.setName('target').setDescription('The user'))
	)
	.addSubcommand(subcommand =>
		subcommand
		.setName('demote')
		.setDescription('Demote a user to revoke access to building editing commands.')
		.addStringOption(option =>
			option
			.setName('thebuild')
			.setDescription('The building to be used.')
			.setRequired(true)
			.setAutocomplete(true)
		)
		.addUserOption(option => option.setName('target').setDescription('The user'))
	)
	.addSubcommand(subcommand =>
		subcommand
		.setName('belong')
		.setDescription('View all buildings that belong to you!')
	)
	.addSubcommand(subcommand =>
		subcommand
		.setName('install')
		.setDescription('Install something on a building you own.')
		.addStringOption(option =>
			option
			.setName('thebuild')
			.setDescription('The building to be used.')
			.setRequired(true)
			.setAutocomplete(true)
		)
		.addStringOption(option =>
			option
			.setName('thetool')
			.setDescription('Tools available for installing.')
			.setRequired(true)
			.setAutocomplete(true)
		)	
	)
	.addSubcommand(subcommand =>
		subcommand
		.setName('change')
		.setDescription('Change something on a building.')
		.addStringOption(option =>
			option
			.setName('thebuild')
			.setDescription('The building to be used.')
			.setRequired(true)
			.setAutocomplete(true)
		)
		.addStringOption(option =>
			option
			.setName('feature')
			.setDescription('What feature would you like to change?')
			.setRequired(true)
			.addChoices(
				{ name: 'Building Style', value: 'build_style' },
				{ name: 'Foreground', value: 'foreground' },
				{ name: 'Roof', value: 'roof' },
				{ name: 'Walls', value: 'wall' },
				{ name: 'Windows', value: 'window' },
				{ name: 'Door', value: 'door' }
			)
		)
		.addStringOption(option =>
			option
			.setName('selection')
			.setDescription('Options for the choosen feature.')
			.setRequired(true)
			.setAutocomplete(true)
		)
	),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);

		let choices = [];

		if (focusedOption.name === 'thebuild') {
			const focusedValue = interaction.options.getFocused(false);
			const subCom = interaction.options.getSubcommand();

			const user = await grabUser(interaction.user.id);
			const townRef = await grabTown(user.townid);

			const userOwns = bID => bID === user.userid;

			const buildingAccessList = [];
			if (townRef){
				const townBuiltBuildings = await grabTownBuildingList(townRef);
				if (townBuiltBuildings.length){
					
					if (subCom === 'change'){
						buildingAccessList.push(...townBuiltBuildings.filter(build => userOwns(build.ownerid) || checkUserBuildPerms(user, build)));
					} else buildingAccessList.push(...townBuiltBuildings.filter(build => userOwns(build.ownerid)));
				}
			}

			if (buildingAccessList.length) {
				const grabIndexOfBuild = b => 1 + buildingAccessList.indexOf(b);
				const ownedStr = b => (userOwns(b.ownerid)) ? ` owned by ${makeCapital(user.username)}`: "";
				choices = buildingAccessList.map(build => ({n: `${makeCapital(build.build_type)}${ownedStr(build)}. Plot #${grabIndexOfBuild(build)}`, v: `${build.plotid}`}));
			} else choices = ["None"];



			// let ownedBuilds;
			// if (user && user.townid !== '0') {
			// 	ownedBuilds = await PlayerBuilding.findAll({
			// 		where:
			// 			[{ townid: user.townid },
			// 			{ ownerid: user.userid }]
			// 	});

			// 	if (interaction.options.getSubcommand() === 'change') {
			// 		let townBuildings = await PlayerBuilding.findAll({ where: { townid: user.townid } });
			// 		if (townBuildings) {
			// 			for (const building of townBuildings) {
			// 				let currentEditList = building.can_edit.split(',');
			// 				for (const id of currentEditList) {
			// 					if (user.userid === id && building.ownerid !== user.userid) {
			// 						ownedBuilds.push(building);
			// 						break;
			// 					}
			// 				}
            //             }
            //         }
            //     }
			// }

			// if (ownedBuilds) {
			// 	for (let i = 0; i < ownedBuilds.length; i++) {
			// 		let buildStr = `${ownedBuilds[i].build_type} at Plot Number: ${i + 1}`;
			// 		choices.push(buildStr);
            //     }
			// } else choices = ['None'];
			if (choices[0] === 'None'){
				// NO CHOICES, HANDLE NORMALLY
				const filtered = choices.filter(choice => choice.startsWith(focusedValue));
				await interaction.respond(
					filtered.map(choice => ({ name: choice, value: choice })),
				);
			} else {
				// CHOICES, HANDLE DIFFERENTLY
				const filtered = choices.filter(choice => choice.n.startsWith(focusedValue));
				console.log(...filtered);
				await interaction.respond(
					filtered.map(choice => ({ name: choice.n, value: choice.v })),
				);
			}
		}

		if (focusedOption.name === 'selection') {
			const focusedValue = interaction.options.getFocused(false);
			const featureChoice = interaction.options.getString('feature') ?? 'NONE';

			switch(featureChoice){
				case "NONE":
					choices = ['None'];
				break;
				case "build_style":
					choices = ['1', '2', '3'];
				break;
				default:
					choices = Array.from(new Array(countBuildingDisplayOptions(makeCapital(featureChoice))).fill(1), (v, t) => `${t + v}`);
				break;
			}

			// if (featureChoice === 'build_style') choices = ['1', '2', '3'];

			// if (featureChoice === 'foreground') choices = ['1', '2', '3', '4', '5', '6'];

			// if (featureChoice === 'roof') choices = ['1', '2', '3', '4'];

			// if (featureChoice === 'wall') choices = ['1', '2', '3', '4', '5', '6', '7'];

			// if (featureChoice === 'window') choices = ['1', '2', '3', '4'];

			// if (featureChoice === 'door') choices = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

			// if (featureChoice === 'NONE') choices = ['None'];

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}

		if (focusedOption.name === 'thetool') {
			const focusedValue = interaction.options.getFocused(false);
			const buildPlotID = interaction.options.getString('thebuild') ?? 'NONE';

			const user = await grabUser(interaction.user.id);
			const building = await PlayerBuilding.findOne({where: {plotid: buildPlotID}});
			if (building){
				// Grab all town building related tools owned
				const buildingTools = await OwnedTools.findAll({
					where: {
						spec_id: user.userid,
						activecategory: 'Town',
						activesubcategory: 'Build'
					}
				});
				// If any tools found
				if (buildingTools.length){
					// Check if static bp is found within owned tools 
					const checkBPNameMatch = staticBP => buildingTools.some(userBP => userBP.name === staticBP.Name);
					// Check if static bp matches `Town` `Build` types
					const bpTypesMatch = staticBP => staticBP.Type === 'Town' && staticBP.SubType === 'Build';
					// Check if static bp matches selected buildings `build_type`
					const matchesBuildingType = staticBP => staticBP.BuildType === building.build_type;

					// Check all conditions
					const masterListFilter = staticBP => {
						return bpTypesMatch(staticBP) && checkBPNameMatch(staticBP) && matchesBuildingType(staticBP);
					};

					// Filter against all conditions
					const filteredMasterBPEffectList = interaction.client.masterBPEffects.filter(bp => masterListFilter(bp));
					if (filteredMasterBPEffectList.length){
						choices = filteredMasterBPEffectList.map(bp => bp.Name);
					}
				}
			}

			if (!choices.length) choices = ['None'];

			//const buildStr = interaction.options.getString('thebuild') ?? 'NONE';

			//const user = await UserData.findOne({ where: { userid: interaction.user.id } });

			// function createIndexFromStr(str) {
			// 	const pieces = str.split(': ');
			// 	let indexVal = pieces[1] - 1;
			// 	return indexVal;
			// }

			// let ownedBuilds;
			// if (user && user.townid !== '0') {
			// 	ownedBuilds = await PlayerBuilding.findAll({
			// 		where:
			// 			[{ townid: user.townid },
			// 			{ ownerid: user.userid }]
			// 	});

			// 	let theBuild;
			// 	if (buildStr !== 'NONE' && buildStr !== 'None') {
			// 		if (ownedBuilds) {
			// 			const buildIndex = createIndexFromStr(buildStr);
			// 			theBuild = ownedBuilds[buildIndex];
			// 		} else choices = ['None'];
			// 	} else choices = ['None'];

			// 	let buildTools = await OwnedTools.findAll({ where: [{ spec_id: user.userid }, { activecategory: 'Town' }, { activesubcategory: 'Build' }] });

			// 	if (theBuild && buildTools.length > 0) {
			// 		const catMatch = acToolE.filter(cat => cat.Name === 'Town');
			// 		const subCat = catMatch[0]['SubCategory'];
			// 		const subMatch = subCat.filter(sub => sub.Name === 'Build');

			// 		const subCatObj = subMatch[0];

			// 		let typeMatch = [];
			// 		for (const tool of buildTools) {
			// 			if (subCatObj[`${tool.name}`]['BuildType'] === theBuild.build_type) {
			// 				typeMatch.push(tool.name);
            //             }						
			// 		}

			// 		if (typeMatch.length > 0) {
			// 			choices = typeMatch;
			// 		} else choices = ['None'];
			// 	}
			// } else choices = ['None'];

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
        }
	},
	async execute(interaction) {

		const { betaTester } = interaction.client;

		if (!betaTester.has(interaction.user.id)) return await interaction.reply('This command is under construction!! It is currently only available to early access testers!');

		const subCom = interaction.options.getSubcommand();

		const needPermsList = ['change'];
		const isOwnerList = ['appoint', 'demote', 'install'];

		const building = (subCom === 'belong') 
		? await PlayerBuilding.findOne({where: {ownerid: interaction.user.id}})
		: await PlayerBuilding.findOne({where: {plotid: interaction.options.getString('thebuild')}});
		if (subCom !== 'belong' && !building) return await interaction.reply({content: "You must first build a building before you can use this command!", ephemeral: true});

		const canEdit = checkUserBuildPerms;
		const userOwns = (user, build) => build.ownerid === user.userid;
		const isOwner = userOwns;
		const hasTown = user => user.townid !== '0';

		const checkBuildPerms = user => {
			return {isOwner: isOwner(user, building), canEdit: canEdit(user, building), hasTown: hasTown(user), townID: user.townid};
		};

		const user = await grabUser(interaction.user.id);
		const permList = checkBuildPerms(user);

		if (!permList.hasTown) return await interaction.reply({content: "You must first join a town before you can use this command!", ephemeral: true});
		if (!permList.canEdit && needPermsList.includes(subCom)) return await interaction.reply({content: "You need building editing permissions before you can use this command!", ephemeral: true});
		if (!permList.isOwner && isOwnerList.includes(subCom)) return await interaction.reply({content: "Only the buildings owner may use this command!", ephemeral: true});

		const buildChangeType = interaction.options.getString('feature') ?? 'None';
		const buildChangeValue = +interaction.options.getString('selection') ?? 'None';

		const targetUser = await grabUser((interaction.options.getUser('target'))?.id ?? interaction.user.id);
		if (!targetUser) return await interaction.reply({content: "Selected user does not have a game profile yet!", ephemeral: true});
		const targetPermList = checkBuildPerms(targetUser);

		const confirmSelectEmbed = new EmbedBuilder();

		const confirmSelectRow = [];

		const loadingAnchorObj = {
			usingAnchor: false,
			usingComponents: true,
			noCompReply: {
				embeds: [],
				files: []
			},
			replyType: "Reply",
			theAnchor: ""
		};

		const pageDisplayObj = {
			usePages: false,
			curPage: 0,
			lastPage: 0,
			container: {
				embeds: [],
				files: []
			},
			extra: {
				details: []
			}
		};

		switch(subCom){
			case "appoint":
				if (permList.townID !== targetPermList.townID) return await interaction.reply({content: 'The user picked does not belong to your town!', ephemeral: true});
				if (targetPermList.canEdit) return await interaction.reply({content: 'This user has already been appointed!', ephemeral: true});

				confirmSelectRow.push(createConfirmCancelButtonRow('appoint'));

				confirmSelectEmbed
				.setTitle('== Appoint User ==')
				.setDescription(`Are you sure you would like to appoint ${makeCapital(targetUser.username)}? This will grant them building managment permissions`);
			break;
			case "demote":
				if (permList.townID !== targetPermList.townID) return await interaction.reply({content: 'The user picked does not belong to your town!', ephemeral: true});
				if (!targetPermList.canEdit) return await interaction.reply({content: 'This user has not been appointed!', ephemeral: true});

				confirmSelectRow.push(createConfirmCancelButtonRow('demote'));

				confirmSelectEmbed
				.setTitle('== Demote User ==')
				.setDescription(`Are you sure you would like to demote ${makeCapital(targetUser.username)}? This will revoke their current building managment permissions`);
			break;
			case "belong":
				const bTownRef = await grabTown(permList.townID);
				const fullBuiltList = await grabTownBuildingList(bTownRef);
				if (!fullBuiltList.length) return await interaction.reply({content: 'Your town has no player buildings yet!', ephemeral: true});
				const ownedBuiltList = fullBuiltList.filter(build => isOwner(user, build));
				if (!ownedBuiltList.length) return await interaction.reply({content: 'You own no buildings yet!', ephemeral: true});

				const belongBuildLoad = new EmbedBuilder()
				.setTitle('== Loading Buildings ==')
				.setDescription('Please hold..');

				loadingAnchorObj.theAnchor = await interaction.reply({embeds: [belongBuildLoad]});
				loadingAnchorObj.usingAnchor = true;
				loadingAnchorObj.replyType = 'FollowUp';

				// Load Building displays
				const buildViewObj = await loadOwnedBuildingDisplayList(bTownRef, ownedBuiltList);
				pageDisplayObj.container.embeds = buildViewObj.embeds;
				pageDisplayObj.lastPage = buildViewObj.embeds.length - 1;
				pageDisplayObj.container.files = buildViewObj.files;
				pageDisplayObj.extra.details = buildViewObj.details;
				pageDisplayObj.usePages = true;
			break;
			case "change":
				const changeBuildLoad = new EmbedBuilder()
				.setTitle('== Loading Buildings ==')
				.setDescription('Please hold..');

				loadingAnchorObj.theAnchor = await interaction.reply({embeds: [changeBuildLoad]});
				loadingAnchorObj.usingAnchor = true;
				loadingAnchorObj.replyType = 'FollowUp';
				loadingAnchorObj.usingComponents = false;

				const buildPropTexChange = (buildChangeType === 'build_style') 
				? 'build_style'
				: `${buildChangeType}_tex`;

				await building.update({[buildPropTexChange]: buildChangeValue}).then(async cb => await cb.save()).then(async cb => {return await cb.reload()});

				const changedBuildFile = await loadBuilding(building);
				confirmSelectEmbed
				.setTitle('== Building Updated ==')
				.setDescription(`${makeCapital(building.build_type)} has been updated!`);

				loadingAnchorObj.noCompReply.embeds.push(confirmSelectEmbed);
				loadingAnchorObj.noCompReply.files.push(changedBuildFile);
			break;
			case "install": // WIP
			return await interaction.reply({content: 'This feature is not yet functional, please check back later!', ephemeral: true});
		}

		if (!loadingAnchorObj.usingComponents){
			return await editTimedChannelMessage(loadingAnchorObj.theAnchor, 60000, loadingAnchorObj.noCompReply);
		}

		const replyWithObj = {}, pagingExtras = pageDisplayObj.extra;
		if (pageDisplayObj.usePages){
			// IF DISPLAY USES PAGING
			replyWithObj.embeds = [pageDisplayObj.container.embeds[0]];
			replyWithObj.files = [pageDisplayObj.container.files[0]];

			// ADD COMPONENTS
			const actionViewButt = new ButtonBuilder()
			.setCustomId('view-build')
			.setStyle(ButtonStyle.Secondary)
			.setLabel('Building Details');

			const pageButts = createBasicPageButtons('Primary');
			pageButts.push(pageButts.splice(1, 1, actionViewButt)[0]);

			const pageRow = new ActionRowBuilder().addComponents(pageButts);

			replyWithObj.components = [pageRow];
		} else {
			// DISPLAY DOES NOT USE PAGING
			replyWithObj.embeds = [confirmSelectEmbed];
			replyWithObj.components = confirmSelectRow;
		}

		// IF ANCHOR EXISTS DELETE IT
		if (loadingAnchorObj.usingAnchor) await handleCatchDelete(loadingAnchorObj.theAnchor);

		const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyWithObj, loadingAnchorObj.replyType);

		const buildNav = new NavMenu(user, replyWithObj, replyWithObj.components);

		if (pagingExtras.details.length) {
			buildNav.loadPageDisplays(pageDisplayObj.container);
			buildNav.loadPageExtras(pagingExtras);
			//console.log(buildNav.paging.storedExtras.details);
		}

		console.log(buildNav);

		// const positionOutcomeEmbed = new EmbedBuilder()
		// .setTitle(`== User ${(subCom === 'demote') ? "Demoted":"Appointed"} ==`);

		// =====================
		// BUTTON COLLECTOR
		collector.on('collect', async c => {
			await c.deferUpdate().then(async () => {
				let editWith;
				if (buildNav.pageWasHeard(c.customId)){
					// Paging Menu ACTIVE
					buildNav.handlePaging(c.customId);
					editWith = buildNav.loadNextPage();
				} else if (buildNav.nextWasHeard(c.customId)){
					// Forward Menu ACTIVE
					const cSplits = c.customId.split('-');
					switch(cSplits[0]){
						case "confirm":
							// Last Menu Page?
							if (['appoint', 'demote'].includes(cSplits[1])) return collector.stop(cSplits[1]);
						break;
						case "view":
							// Show Build Details
							await c.followUp({embeds: [buildNav.paging.storedExtras.details[buildNav.paging.curPage]], ephemeral: true});
						break;
					}
				} else if (buildNav.backWasHeard(c.customId)){
					// Backward Menu ACTIVE
					editWith = buildNav.goingBackward();
				} else if (buildNav.cancelWasHeard(c.customId)){
					// Cancel Menu ACTIVE
					editWith = buildNav.goingBackward();
				}

				//console.log(editWith);

				if (editWith) await anchorMsg.edit(editWith);
			}).catch(e => console.error(e));
		});
		// =====================

		// =====================
		// BUTTON COLLECTOR
		collector.on('end', async (c, r) => {
			if (!r || r === 'time') {
				buildNav.destroy();
				await handleCatchDelete(anchorMsg);
			}

			if (['appoint', 'demote'].includes(r)){
				const positionOutcomeObj = await updateBuildingCanEditList(building, targetUser, r);
				return await editTimedChannelMessage(anchorMsg, 60000, {embeds: positionOutcomeObj.embeds, components: []});
			}

			
		});
		// =====================


		// if (interaction.options.getSubcommand() === 'appoint') {
		// 	const buildStr = interaction.options.getString('thebuild') ?? 'NONE';
		// 	if (buildStr === 'NONE' || buildStr === 'None') return await interaction.reply('That is not a vaild building!');

		// 	const buildIndex = createIndexFromStr(buildStr);

		// 	const user = await grabU();
		// 	if (!user) return await noUser();

		// 	const targetUser = interaction.options.getUser('target');
		// 	const targetCheck = await UserData.findOne({ where: [{ userid: targetUser.id }, { townid: user.townid }] });
		// 	if (!targetCheck) return await interaction.reply('That user doesnt have a game profile or belongs to another town!!');

		// 	const ownedBuilds = await PlayerBuilding.findAll({ where: [{ townid: user.townid }, { ownerid: user.userid }] });
		// 	if (ownedBuilds.length <= 0) return await interaction.reply('You do not own any buildings!');

		// 	const theBuild = ownedBuilds[buildIndex];

		// 	const currentEditList = theBuild.can_edit.split(',');
		// 	let exists = false;
		// 	for (const id of currentEditList) {
		// 		if (targetUser.id === id) {
		// 			exists = true;
		// 			break;
		// 		}
		// 	}
		// 	if (exists) return await interaction.reply('That user has already been appointed for this building!!');

		// 	const confirmButton = new ButtonBuilder()
		// 		.setLabel('Confirm!')
		// 		.setStyle(ButtonStyle.Primary)
		// 		.setCustomId('confirm');

		// 	const cancelButton = new ButtonBuilder()
		// 		.setLabel('Cancel!')
		// 		.setStyle(ButtonStyle.Danger)
		// 		.setCustomId('cancel');

		// 	const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

		// 	const embed = new EmbedBuilder()
		// 		.setTitle('APPOINTING USER')
		// 		.setColor(0o0)
		// 		.addFields({ name: `Appoint ${targetUser.username}?`, value: 'Select a button below.' });

		// 	const embedMsg = await interaction.reply({ embeds: [embed], components: [buttonRow] });

		// 	const filter = (i) => i.user.id === interaction.user.id;

		// 	const collector = embedMsg.createMessageComponentCollector({
		// 		ComponentType: ComponentType.Button,
		// 		filter,
		// 		time: 10000,
		// 	});

		// 	collector.on('collect', async (COI) => {
		// 		if (COI.customId === 'confirm') {
		// 			currentEditList.push(targetUser.id);

		// 			const canEditStr = currentEditList.toString();

		// 			collector.stop();

		// 			const buildUpdate = await theBuild.update({ can_edit: canEditStr });
		// 			if (buildUpdate) await theBuild.save();
		// 			return await interaction.followUp(`${targetUser.username} has been appointed!`);
		// 		}
		// 		if (COI.customId === 'cancel') {
		// 			collector.stop();
		// 		}
		// 	});

		// 	collector.on('end', () => {
		// 		embedMsg.delete().catch(error => {
		// 			if (error.code !== 10008) {
		// 				console.error('Failed to delete the message:', error);
		// 			}
		// 		});
		// 	});
		// }

		// if (interaction.options.getSubcommand() === 'demote') {
		// 	const buildStr = interaction.options.getString('thebuild') ?? 'NONE';
		// 	if (buildStr === 'NONE' || buildStr === 'None') return await interaction.reply('That is not a vaild building!');

		// 	const buildIndex = createIndexFromStr(buildStr);

		// 	const user = await grabU();
		// 	if (!user) return await noUser();

		// 	const targetUser = interaction.options.getUser('target');
		// 	const targetCheck = await UserData.findOne({ where: [{ userid: targetUser.id }, { townid: user.townid }] });
		// 	if (!targetCheck) return await interaction.reply('That user doesnt have a game profile or belongs to another town!!');

		// 	const ownedBuilds = await PlayerBuilding.findAll({ where: [{ townid: user.townid }, { ownerid: user.userid }] });
		// 	if (ownedBuilds.length <= 0) return await interaction.reply('You do not own any buildings!');

		// 	const theBuild = ownedBuilds[buildIndex];

		// 	const currentEditList = theBuild.can_edit.split(',');
		// 	let exists = false;
		// 	for (const id of currentEditList) {
		// 		if (targetUser.id === id) {
		// 			exists = true;
		// 			break;
		// 		}
		// 	}
		// 	if (!exists) return await interaction.reply('That user has not been appointed for this building!!');

		// 	const confirmButton = new ButtonBuilder()
		// 		.setLabel('Confirm!')
		// 		.setStyle(ButtonStyle.Primary)
		// 		.setCustomId('confirm');

		// 	const cancelButton = new ButtonBuilder()
		// 		.setLabel('Cancel!')
		// 		.setStyle(ButtonStyle.Danger)
		// 		.setCustomId('cancel');

		// 	const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

		// 	const embed = new EmbedBuilder()
		// 		.setTitle('DEMOTING USER')
		// 		.setColor(0o0)
		// 		.addFields({ name: `Demote ${targetUser.username}?`, value: 'Select a button below.' });

		// 	const embedMsg = await interaction.reply({ embeds: [embed], components: [buttonRow] });

		// 	const filter = (i) => i.user.id === interaction.user.id;

		// 	const collector = embedMsg.createMessageComponentCollector({
		// 		ComponentType: ComponentType.Button,
		// 		filter,
		// 		time: 10000,
		// 	});

		// 	collector.on('collect', async (COI) => {
		// 		if (COI.customId === 'confirm') {
		// 			const newEditList = currentEditList.filter(id => id !== targetUser.id);
		// 			const canEditStr = newEditList.toString();

		// 			collector.stop();

		// 			const buildUpdate = await theBuild.update({ can_edit: canEditStr });
		// 			if (buildUpdate) await theBuild.save();
		// 			return await interaction.followUp(`${targetUser.username} has been demoted!`);
		// 		}
		// 		if (COI.customId === 'cancel') {
		// 			collector.stop();
		// 		}
		// 	});

		// 	collector.on('end', () => {
		// 		embedMsg.delete().catch(error => {
		// 			if (error.code !== 10008) {
		// 				console.error('Failed to delete the message:', error);
		// 			}
		// 		});
		// 	});
		// }

		// if (interaction.options.getSubcommand() === 'belong') {
		// 	const user = await grabU();
		// 	if (!user) return await noUser();

		// 	const ownedBuilds = await PlayerBuilding.findAll({ where: [{ townid: user.townid }, { ownerid: user.userid }] });
		// 	if (ownedBuilds.length <= 0) return await interaction.reply('You do not own any buildings!');

		// 	await interaction.deferReply();

		// 	let fileList = [];
		// 	for (const building of ownedBuilds) {
		// 		let attachment = await loadBuilding(building);
		// 		fileList.push(attachment);
        //     }

		// 	const backButton = new ButtonBuilder()
		// 		.setLabel("Back")
		// 		.setStyle(ButtonStyle.Secondary)
		// 		.setEmoji('◀️')
		// 		.setCustomId('back-page');

		// 	const cancelButton = new ButtonBuilder()
		// 		.setLabel("Cancel")
		// 		.setStyle(ButtonStyle.Secondary)
		// 		.setEmoji('*️⃣')
		// 		.setCustomId('cancel');

		// 	const forwardButton = new ButtonBuilder()
		// 		.setLabel("Forward")
		// 		.setStyle(ButtonStyle.Secondary)
		// 		.setEmoji('▶️')
		// 		.setCustomId('next-page');

		// 	const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

		// 	const embedMsg = await interaction.followUp({ components: [interactiveButtons], files: [fileList[0]] });

		// 	const filter = (i) => i.user.id === interaction.user.id;

		// 	const collector = embedMsg.createMessageComponentCollector({
		// 		componentType: ComponentType.Button,
		// 		filter,
		// 		time: 120000,
		// 	});

		// 	let currentPage = 0;

		// 	collector.on('collect', async (COI) => {
		// 		if (COI.customId === 'next-page') {
		// 			await COI.deferUpdate().then(async () => {
		// 				if (currentPage === fileList.length - 1) {
		// 					currentPage = 0;
		// 				} else currentPage += 1;
		// 				await embedMsg.edit({ files: [fileList[currentPage]], components: [interactiveButtons] });
		// 			}).catch(error => {
		// 				console.error(error);
		// 			});
		// 		}

		// 		if (COI.customId === 'back-page') {
		// 			await COI.deferUpdate().then(async () => {
		// 				if (currentPage === 0) {
		// 					currentPage = fileList.length - 1;
		// 				} else currentPage -= 1;
		// 				await embedMsg.edit({ files: [fileList[currentPage]], components: [interactiveButtons] });
		// 			}).catch(error => {
		// 				console.error(error);
		// 			});
		// 		}

		// 		if (COI.customId === 'cancel') {
		// 			collector.stop();
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
		// }

		// if (interaction.options.getSubcommand() === 'change') {
		// 	const changeType = interaction.options.getString('feature');
		// 	const changeVal = 1 * interaction.options.getString('selection');
		// 	const buildStr = interaction.options.getString('thebuild') ?? 'NONE';
		// 	if (buildStr === 'NONE' || buildStr === 'None') return await interaction.reply('That is not a vaild building!');

		// 	const buildIndex = createIndexFromStr(buildStr);

		// 	const user = await grabU();
		// 	if (!user) return await noUser();

		// 	const ownedBuilds = await PlayerBuilding.findAll({ where: [{ townid: user.townid }, { ownerid: user.userid }] });
		// 	const townBuildings = await PlayerBuilding.findAll({ where: { townid: user.townid } });
		// 	if (townBuildings.length <= 0 && ownedBuilds.length <= 0) return await interaction.reply('You do not own any buildings, nor were any buildings found in the town you belong to!');

		// 	if (townBuildings.length > 0) {
		// 		for (const building of townBuildings) {
		// 			let currentEditList = building.can_edit.split(',');
		// 			for (const id of currentEditList) {
		// 				if (user.userid === id && building.ownerid !== user.userid) {
		// 					ownedBuilds.push(building);
		// 					break;
		// 				}
		// 			}
		// 		}
        //     }

		// 	const theBuild = ownedBuilds[buildIndex];

		// 	let buildUpdate;
		// 	if (changeType === 'build_style') buildUpdate = await theBuild.update({ build_style: changeVal });
		// 	if (changeType === 'foreground') buildUpdate = await theBuild.update({ foreground_tex: changeVal });
		// 	if (changeType === 'roof') buildUpdate = await theBuild.update({ roof_tex: changeVal });
		// 	if (changeType === 'wall') buildUpdate = await theBuild.update({ wall_tex: changeVal });
		// 	if (changeType === 'window') buildUpdate = await theBuild.update({ window_tex: changeVal });
		// 	if (changeType === 'door') buildUpdate = await theBuild.update({ door_tex: changeVal });
		// 	if (buildUpdate) await theBuild.save();

		// 	const attachment = await loadBuilding(theBuild);
		// 	const msgContent = 'Building Updated Successfully!!';

		// 	return await interaction.reply({ content: msgContent, files: [attachment]});
		// }

		// if (interaction.options.getSubcommand() === 'install') {
		// 	const buildStr = interaction.options.getString('thebuild') ?? 'NONE';
		// 	if (buildStr === 'NONE' || buildStr === 'None') return await interaction.reply('That is not a vaild building!');

		// 	const toolName = interaction.options.getString('thetool') ?? 'NONE';
		// 	if (toolName === 'NONE' || toolName === 'None') return await interaction.reply('That is not a vaild tool!');

		// 	const buildIndex = createIndexFromStr(buildStr);

		// 	const user = await grabU();
		// 	if (!user) return await noUser();

		// 	const ownedBuilds = await PlayerBuilding.findAll({ where: [{ townid: user.townid }, { ownerid: user.userid }] });
		// 	if (ownedBuilds.length <= 0) return await interaction.reply('You do not own any buildings!');

		// 	const theBuild = ownedBuilds[buildIndex];
        // }

		// function createIndexFromStr(str) {
		// 	const pieces = str.split(': ');
		// 	let indexVal = pieces[1] - 1;
		// 	return indexVal;
		// }

		// async function grabU() {
		// 	const user = await UserData.findOne({ where: { userid: interaction.user.id } });
		// 	if (!user) return;
		// 	return user;
		// }

		// async function noUser() {
		// 	await interaction.reply('No player found, Please use ``/start`` to begin your adventure!');
		// }
	},
};
