const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SelectMenuOptionBuilder } = require('discord.js');

const { Town, UserData, CoreBuilding } = require('../../dbObjects.js');

const { loadBuilding, countBuildingDisplayOptions } = require('./exported/displayBuilding.js');
const {makeCapital, grabUser, grabTown, checkUserTownPerms, checkUserAsMayor, sendTimedChannelMessage, editTimedChannelMessage, createInteractiveChannelMessage, handleCatchDelete, getTypeof, objectEntries} = require('../../uniHelperFunctions.js');
const { grabTownCoreBuildings, loadBuiltCoreTypeButtons } = require('./exported/townExtras.js');
const { loadBasicBackButt } = require('./exported/tradeExtras.js');
const { NavMenu } = require('../Development/Export/Classes/NavMenu.js');

module.exports = {
	helptypes: ['EA', 'Town', 'Info', 'Payup', 'Story', 'NPC'],
	data: new SlashCommandBuilder()
		.setName('corebuilding')
		.setDescription('The main command for all things core building related!')
		.addSubcommand(subcommand =>
			subcommand
			.setName('belong')
			.setDescription('View all core buildings that belong to you or your town!')
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('settings')
			.setDescription('Manage and edit settings for the selected core building.')
			// .addStringOption(option =>
			// 	option
			// 	.setName('thecore')
			// 	.setDescription('The core building to be used.')
			// 	.setRequired(true)
			// 	.setAutocomplete(true)
			// )
		)
		.addSubcommand(subcommand =>
			subcommand
			.setName('change')
			.setDescription('Change something on a core building.')
			.addStringOption(option =>
				option
				.setName('thecore')
				.setDescription('The core building to be used.')
				.setRequired(true)
				.setAutocomplete(true)
			)
			.addStringOption(option =>
				option
				.setName('feature')
				.setDescription('What feature would you like to change?')
				.setRequired(true)
				.addChoices(
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

		if (focusedOption.name === 'thecore') {
			const focusedValue = interaction.options.getFocused(false);
			const user = await grabUser(interaction.user.id);
			const theTown = await grabTown(user.townid);

			if (theTown){
				const builtCores = await grabTownCoreBuildings(theTown);
				choices = builtCores.map(core => makeCapital(core.build_type));
			} else choices = ['None'];
			

			//const user = await UserData.findOne({ where: { userid: interaction.user.id } });
			

			// let theTown;
			// if (user && user.townid !== '0') theTown = await Town.findOne({ where: { townid: user.townid } });

			// if (theTown) {
			// 	if (theTown.grandhall_status !== 'None') choices.push('Grand Hall');
			// 	if (theTown.bank_status !== 'None') choices.push('Bank');
			// 	if (theTown.market_status !== 'None') choices.push('Market');
			// 	if (theTown.tavern_status !== 'None') choices.push('Tavern');
			// 	if (theTown.clergy_status !== 'None') choices.push('Clergy');
			// } else choices.push('None');

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}

		if (focusedOption.name === 'selection') {
			const focusedValue = interaction.options.getFocused(false);
			const featureChoice = interaction.options.getString('feature') ?? 'NONE';

			if (featureChoice !== 'NONE'){
				// const choiceArray = new Array(countBuildingDisplayOptions(makeCapital(featureChoice))).fill(1); 
				choices = Array.from(new Array(countBuildingDisplayOptions(makeCapital(featureChoice))).fill(1), (v, t) => `${t + v}`); // [], (v, t) => `${t + 1}`
			} else choices = ['None'];

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
    },
	async execute(interaction) { 
		const { betaTester } = interaction.client;

		if (!betaTester.has(interaction.user.id)) return await interaction.reply('This command is under construction!! It is currently only available to early access testers!');

		const subCom = interaction.options.getSubcommand();

		const needPermsList = ['change', 'settings'];

		const canEdit = checkUserTownPerms;
		const isMayor = checkUserAsMayor;
		const hasTown = (user) => user.townid !== '0';

		const checkTownPerms = async (user) => {
			return {isMayor: await isMayor(user), canEdit: await canEdit(user), hasTown: hasTown(user), townID: user.townid};
		};

		const user = await grabUser(interaction.user.id);
		const permList = await checkTownPerms(user);

		if (!permList.hasTown) return await interaction.reply({content: "You must first join a town before you can use this command!", ephemeral: true});
		if (!permList.canEdit && needPermsList.includes(subCom)) return await interaction.reply({content: "You need town editing permissions before you can use this command!", ephemeral: true});

		const townRef = await grabTown(permList.townID);

		const builtCores = await grabTownCoreBuildings(townRef);
		if (!builtCores) return await interaction.reply({content: "You must first build a town core building before you can use this command! Use ``/town buildcore`` instead!", ephemeral: true});

		if (subCom === 'belong') {
			const ownedBuilds = await CoreBuilding.findAll({ where: { townid: user.townid }});
			if (ownedBuilds.length <= 0) return await interaction.reply('You do not own any buildings!');

			const loadingCoreDisplays = new EmbedBuilder()
			.setTitle('== Loading Core Buildings ==');

			const buildLoadAnchor = await interaction.reply({embeds: [loadingCoreDisplays]});

			// await interaction.deferReply();

			const coreFileList = [];
			for (const building of ownedBuilds) {
				const attachment = await loadBuilding(building);
				coreFileList.push(attachment);
			}

			const backButton = new ButtonBuilder()
			.setLabel("Back")
			.setStyle(ButtonStyle.Primary)
			.setEmoji('◀️')
			.setCustomId('back-page');

			const cancelButton = new ButtonBuilder()
			.setLabel("Cancel")
			.setStyle(ButtonStyle.Secondary)
			.setEmoji('*️⃣')
			.setCustomId('cancel');

			const forwardButton = new ButtonBuilder()
			.setLabel("Forward")
			.setStyle(ButtonStyle.Primary)
			.setEmoji('▶️')
			.setCustomId('next-page');

			const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

			const navMenu = {
				curPage: 0,
				lastPage: 0,
				fileList: coreFileList
			};
			navMenu.lastPage = coreFileList.length - 1;

			const replyObj = {components: [interactiveButtons], files: [navMenu.fileList[0]]};

			await handleCatchDelete(buildLoadAnchor);

			const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, "FollowUp");

			// const embedMsg = await interaction.followUp({ components: [interactiveButtons], files: [coreFileList[0]] });

			// const filter = (i) => i.user.id === interaction.user.id;

			// const collector = embedMsg.createMessageComponentCollector({
			// 	componentType: ComponentType.Button,
			// 	filter,
			// 	time: 120000,
			// });

			// let currentPage = 0;

			collector.on('collect', async c => {
				await c.deferUpdate().then(async () => {
					switch(c.customId){
						case "next-page":
							navMenu.curPage = (navMenu.curPage === navMenu.lastPage) ? 0 : navMenu.curPage + 1;
						break;
						case "back-page":
							navMenu.curPage = (navMenu.curPage === 0) ? navMenu.lastPage : navMenu.curPage - 1;
						break;
						case "cancel":
						return collector.stop('Cancel');
					}

					await anchorMsg.edit({components: [interactiveButtons], files: [navMenu.fileList[navMenu.curPage]]});
				}).catch(e => console.error(e));

				// if (COI.customId === 'next-page') {
				// 	await COI.deferUpdate().then(async () => {
				// 		if (currentPage === fileList.length - 1) {
				// 			currentPage = 0;
				// 		} else currentPage += 1;
				// 		await embedMsg.edit({ files: [fileList[currentPage]], components: [interactiveButtons] });
				// 	}).catch(error => {
				// 		console.error(error);
				// 	});
				// }

				// if (COI.customId === 'back-page') {
				// 	await COI.deferUpdate().then(async () => {
				// 		if (currentPage === 0) {
				// 			currentPage = fileList.length - 1;
				// 		} else currentPage -= 1;
				// 		await embedMsg.edit({ files: [fileList[currentPage]], components: [interactiveButtons] });
				// 	}).catch(error => {
				// 		console.error(error);
				// 	});
				// }

				// if (COI.customId === 'cancel') {
				// 	collector.stop();
				// }
			});

			collector.on('end', async (c, r) => {
				if (!r || r === 'time' || r === 'cancel') await handleCatchDelete(anchorMsg);
				// if (embedMsg) {
				// 	embedMsg.delete().catch(error => {
				// 		if (error.code !== 10008) {
				// 			console.error('Failed to delete the message:', error);
				// 		}
				// 	});
				// }
			});
		}

		if (subCom === 'change') {
			const changeType = interaction.options.getString('feature');
			const changeVal = +interaction.options.getString('selection');
			const coreType = interaction.options.getString('thecore').toLowerCase(); // extractCoreType(interaction.options.getString('thecore'))

			// const townRef = await grabTown(user.townid);
			// if (!townRef) return await interaction.reply({content: 'No town was found!', ephemeral: true});


			// const theTown = await Town.findOne({ where: { townid: user.townid } });
			// if (!theTown) return await interaction.reply('Something went wrong while locating your town!');

			// const currentEditList = theTown.can_edit.split(',');
			// let exists = false;
			// for (const id of currentEditList) {
			// 	if (user.userid === id) {
			// 		exists = true;
			// 		break;
			// 	}
			// }
			// if (!exists) return await interaction.reply('You do not have permission to use this command for this town!');

			const theBuild = builtCores.find(core => core.build_type === coreType); // await CoreBuilding.findOne({ where: {townid: townRef.townid, build_type: coreType}}); // [{ townid: user.townid }, { build_type: coreType }] 
			if (!theBuild) return await interaction.reply('Something went wrong while locating that core building!');

			const buildLoadEmbed = new EmbedBuilder()
			.setTitle('== Loading Core Building Display ==')
			.setDescription('Please hold...');

			const buildLoadingMsg = await interaction.reply({embeds: [buildLoadEmbed]});

			await theBuild.update({[`${changeType}_tex`]: changeVal}).then(async cb => await cb.save()).then(async cb => {return await cb.reload()});

			// let buildUpdate;
			// if (changeType === 'foreground') buildUpdate = await theBuild.update({ foreground_tex: changeVal });
			// if (changeType === 'roof') buildUpdate = await theBuild.update({ roof_tex: changeVal });
			// if (changeType === 'wall') buildUpdate = await theBuild.update({ wall_tex: changeVal });
			// if (changeType === 'window') buildUpdate = await theBuild.update({ window_tex: changeVal });
			// if (changeType === 'door') buildUpdate = await theBuild.update({ door_tex: changeVal });
			// if (buildUpdate) await theBuild.save();

			const attachment = await loadBuilding(theBuild);
			const updateEmbed = new EmbedBuilder()
			.setTitle('== Building Updated ==')
			.setDescription(`${makeCapital(coreType)} ${makeCapital(changeType)} have been updated!!`);
			
			//const msgContent = 'Building Updated Successfully!!';

			return await editTimedChannelMessage(buildLoadingMsg, 120000, {embeds: [updateEmbed], files: [attachment]});

			// return await interaction.reply({ content: msgContent, files: [attachment] });
		}

		if (subCom === 'settings') {
			const coreTypeRow = new ActionRowBuilder().addComponents((await loadBuiltCoreTypeButtons(townRef)).buttons);
			const coreTypeEmbed = new EmbedBuilder()
			.setTitle('== Select a Core Building ==')
			.setDescription('Select one of the core buildings below to access its settings! Buttons are disabled if the core building is not yet built!');


			/**
			 * This function creates a single ``ButtonBuilder()`` object 
			 * 
			 * ID: ``back-${idExtension}``
			 * @param {string} idExtension Used in setting the customId: ``back-${idExtension}``
			 * @param {ButtonStyle} buttStyle Used to style the button, Default: ``ButtonStyle.Secondary``
			 * @param {string} replaceLabel Used to set the buttons label, Default: ``"Go Back"``
			 * @returns {ButtonBuilder}
			 */
			function createBasicBackButt(idExtension, buttStyle=ButtonStyle.Secondary, replaceLabel=""){
				const backButt = new ButtonBuilder()
				.setCustomId(`back-${idExtension}`)
				.setStyle(buttStyle)
				.setLabel((replaceLabel !== "") ? `${replaceLabel}`: "Go Back");

				return backButt;
			}

			// PAGE 2 MENU
			const settingsAccessTypeEmbed = new EmbedBuilder()
			.setTitle('== View or Edit? ==');

			const viewSetButt = new ButtonBuilder()
			.setCustomId('view-settings')
			.setStyle(ButtonStyle.Primary)
			.setLabel('View Settings'); 
			const editSetButt = new ButtonBuilder()
			.setCustomId('edit-settings')
			.setStyle(ButtonStyle.Primary)
			.setLabel('Edit Settings'); 
			const backToCoreButt = createBasicBackButt('core');

			const settingsAccessRow = new ActionRowBuilder().addComponents(viewSetButt, editSetButt, backToCoreButt);
			
			const settingsAccessDisplay = {embeds: [settingsAccessTypeEmbed], components: [settingsAccessRow]};
			//console.log('Setting Access Type Row: ', settingsAccessRow);

			// PAGE 3 MENU
			
			// VIEW
			const viewSettingsEmbed = new EmbedBuilder()
			.setTitle('== Viewing Settings ==');
			
			// EDIT
			const editSettingsEmbed = new EmbedBuilder()
			.setTitle('== Setting Select ==')
			.setDescription('Select a setting you wish to change!');
			
			// BACK BUTTON
			const backToSetButt = createBasicBackButt('setting');
			const activeSettingsButtRow = new ActionRowBuilder().addComponents(backToSetButt);

			// SETTING SELECT MENU
			const activeSettingSelectMenu = new StringSelectMenuBuilder()
			.setCustomId('select-setting')
			.setPlaceholder('Select a setting!')
			.addOptions(
				new StringSelectMenuOptionBuilder()
				.setLabel('Setting Option Example')
				.setDescription('Setting Option Description')
				.setValue('settingName'),
			);

			const activeSettingsStringRow = new ActionRowBuilder().addComponents(activeSettingSelectMenu);

			const viewSettingsDisplay = {embeds: [viewSettingsEmbed], components: [activeSettingsButtRow]};
			const editSettingsDisplay = {embeds: [editSettingsEmbed], components: [activeSettingsStringRow, activeSettingsButtRow]};



			const replyObj = {embeds: [coreTypeEmbed], components: [coreTypeRow]};

			const {anchorMsg, collector, sCollector} = await createInteractiveChannelMessage(interaction, 600000, replyObj, "Reply", "Both");

			const listeningMethod = (id, arr) => arr.includes(id);

			/**
			 * This function creates a listening string array usable for both ``navMenu.listenForBack[]`` && ``navMenu.listenForNext[]``
			 * @param {ActionRowBuilder} row Action Row to be displayed
			 * @param {boolean} getBack Set true to filter for back-buttonid
			 * @returns {[string[], string[]] | string[]} Returns: ``[nextButtIDS[], backButtIDS[]]`` || ``stringSelectMenuID[]``
			 */
			const extractComponentIDS = (row, getBack=false) => {
				if (getTypeof(row) !== 'ActionRowBuilder') return ['Wrong Input Type!'];
				//console.log('Given ActionRow Contains: ', ...row.components);

				// If row is string select, return first id as 1 is max string select per ActionRow.
				if (getTypeof(row.components[0]) === 'StringSelectMenuBuilder') return [row.components[0].data.custom_id];

				const isBackButton = (bid) => bid.startsWith('back-');

				const idFilter = row.components.filter(c => getTypeof(c) === 'ButtonBuilder').map(bb => bb.data.custom_id);
				console.log(`${(getBack) ? `(Grabbing BackButton ID) `: ""}ActionRow Button Ids: `, idFilter);

				return (!getBack) 
				? idFilter.filter(bid => !isBackButton(bid))
				: idFilter.filter(bid => isBackButton(bid));
			};

			/**
			 * This function extracts the ``custom_id``'s from all ``ButtonBuilder`` & ``StringSelectMenuBuilder`` 
			 * components within the given ``rows``. 
			 * 
			 * This function iterates through each ``ActionRowBuilder`` adding all ``StringSelect`` and all ``Buttons``
			 * with IDS not starting with ``back-`` to the given ``next[]``
			 * 
			 * Any and all ``Buttons`` with IDS starting with ``back-`` are added to the given ``back[]``
			 * @param {object} navMenu base navMenu object, ``navMenu.listenForNext[]`` ``navMenu.listenForBack[]``
			 * @param  {...ActionRowBuilder} rows Between 1 - 5 Active ActionRowBuilders
			 */
			const extractRowDisplayGroupIDS = (navMenu, ...rows) => {
				const isBackButton = (bid) => bid.startsWith('back-');
				const isButtBuilder = (c) => getTypeof(c) === 'ButtonBuilder';
				const isStringBuilder = (c) => getTypeof(c) === 'StringSelectMenuBuilder';

				const nextList = [], backList = [];
				for (const actionRow of rows){
					if (isStringBuilder(actionRow.components[0])){
						nextList.push(actionRow.components[0].data.custom_id);
						continue;
					}

					const curRowIDList = actionRow.components.filter(c => isButtBuilder(c)).map(bb => bb.data.custom_id);
					nextList.push(...curRowIDList.filter(bid => !isBackButton(bid)));
					backList.push(...curRowIDList.filter(bid => isBackButton(bid)));
				}

				navMenu.listenForNext.push(nextList);
				navMenu.listenForBack.push(backList);

				// const baseIDList = row.components.filter(c => getTypeof(c) === 'ButtonBuilder').map(bb => bb.data.custom_id);

				// next.push(baseIDList.filter(bid => !isBackButton(bid)));
				// back.push(baseIDList.filter(bid => isBackButton(bid)));
			}

			const oldNavMenu = {
				userUsing: user.userid,
				navDisplayPath: [replyObj], // First entry = {embeds: [coreTypeEmbed], components: [coreTypeRow]}
				/**
				 * This function extracts the ``custom_id``'s from all ``ButtonBuilder`` & ``StringSelectMenuBuilder`` 
				 * components within the given ``rows``. 
				 * 
				 * This function iterates through each ``ActionRowBuilder`` adding all ``StringSelect`` and all ``Buttons``
				 * with IDS not starting with ``back-`` to the given ``next[]``
				 * 
				 * Any and all ``Buttons`` with IDS starting with ``back-`` are added to the given ``back[]``
				 * @param  {...ActionRowBuilder} rows Between 1 - 5 Active ActionRowBuilders
				 */
				extractActionRowIDS(...rows) {
					const isBackButton = (bid) => bid.startsWith('back-');
					const isButtBuilder = (c) => getTypeof(c) === 'ButtonBuilder';
					const isStringBuilder = (c) => getTypeof(c) === 'StringSelectMenuBuilder';

					const nextList = [], backList = [];
					for (const actionRow of rows){
						if (isStringBuilder(actionRow.components[0])){
							nextList.push(actionRow.components[0].data.custom_id);
							continue;
						}

						const curRowIDList = actionRow.components.filter(c => isButtBuilder(c)).map(bb => bb.data.custom_id);
						nextList.push(...curRowIDList.filter(bid => !isBackButton(bid)));
						backList.push(...curRowIDList.filter(bid => isBackButton(bid)));
					}

					this.listenForNext.push(nextList);
					this.listenForBack.push(backList);
				},
				goingBack() {
					if (this.navDisplayPath.length === 1) return;

					this.navDisplayPath.pop();
					this.listenForBack.pop();
					this.listenForNext.pop();
				},
				// extractIDList: extractRowDisplayGroupIDS, // Used to load ``navMenu.listenForBack[]`` && ``navMenu.listenForNext[]``

				listenForBack: [], // First entry = []. c.customId to listen for to go back, checked using ``navMenu.backWasHeard(c.customId, navMenu.listenForBack.at(-1))``
				backWasHeard: listeningMethod,

				listenForNext: [
					['select-grandhall', 'select-bank', 'select-market', 'select-tavern', 'select-clergy']
				], // c.customId to listen for, checked using ``navMenu.nextWasHeard(c.customId, navMenu.listenForNext.at(-1))``
				nextWasHeard: listeningMethod,

				// ~~== Specialized Option Storage Section ==~~
				coreType: "",
				coreObj: "", // Filled with selected ``navMenu.coreType`` DB object instance
				settings: {
					view: false, // true if viewing current settings
					edit: false, // true if editing current settings
					data: "", // Filled with existing settings data from ``navMenu.coreObj.core_settings``
					picked: "" // Filled with ``navMenu.settings.data['picked-setting']``
				}
			};

			const firstNavRowIDS = ['select-grandhall', 'select-bank', 'select-market', 'select-tavern', 'select-clergy'];
			const navSpecOptions = {
				// ~~== Specialized Option Storage Section ==~~
				coreType: "",
				coreObj: "", // Filled with selected ``navMenu.coreType`` DB object instance
				settings: {
					view: false, // true if viewing current settings
					edit: false, // true if editing current settings
					data: "", // Filled with existing settings data from ``navMenu.coreObj.core_settings``
					picked: "" // Filled with ``navMenu.settings.data['picked-setting']``
				}
			}

			const navMenu = new NavMenu(user, replyObj, firstNavRowIDS, navSpecOptions);

			console.log(navMenu);

			// == navMenu.navDisplayPath[] ==
			// Use this to track current menu position. 
			// for each "forward" interaction push display contents to array.
			// for each "backward" interaction show display after ``navMenu.navDisplayPath.pop()`` using ``navMenu.navDisplayPath.at(-1)`` 

			// Basic Menu Pathing
			// ==================

			// Page 1:
			// Select Core Type
			// ================
			// BUTTON-OPTIONS: ("All Built Core Builds") AS ['select-grandhall', 'select-bank', 'select-market', 'select-tavern', 'select-clergy']
			// ~~~~~											   ~~~~~
			// sets ``navMenu.coreType`` to ``c.customId.split('-')[1]``
			// sets ``navMenu.coreObj`` to ``builtCores.find(core => core.build_type === navMenu.coreType)``



			// Page 2:
			// Select Settings method
			// ======================
			// BUTTON-OPTIONS: ("VIEW", "EDIT" && "BACK") AS next['view-settings', 'edit-settings'] && back['back-core']
			// ~~~~~													  ~~~~~
			// BACK: sets ``navMenu.coreType = ""`` && ``navMenu.coreObj = ""``
			// sets ``navMenu.settings['Option-Picked'] = true``
			// sets ``navMenu.settings.data = navMenu.coreObj.core_settings``



			// Page 3: "VIEW" || "EDIT"
			// ~~  ================  ~~

			// "VIEW": Current Settings Display
			// ================================
			// DISPLAY: Built from ``navMenu.settings.data`` content
			// BUTTON-OPTIONS: ("BACK") AS back['back-setting']
			// ~~~~~									  								~~~~~
			// BACK: sets ``navMenu.settings.view = false`` && ``navMenu.settings.data = ""``

			// "EDIT": Select Setting Type
			// ===========================
			// STRING-OPTIONS: ("List Built from ``navMenu.settings.data``") AS next['select-setting']
			// BUTTON-OPTIONS: ("BACK") AS back['back-setting']
			// ~~~~~									  					   			~~~~~
			// BACK: sets ``navMenu.settings.view = false`` && ``navMenu.settings.data = ""``
			// sets ``navMenu.settings.picked = navMenu.settings.data[c.values[0]]``


			

			// ~~~~~~~~~~~~~~~~~~~~~
			// STRING COLLECTOR (Collecting STRINGS)
			sCollector.on('collect', async c => {
				await c.deferUpdate().then(async () => {

				}).catch(e => console.error(e));
			});
			// ~~~~~~~~~~~~~~~~~~~~~

			// =====================
			// BUTTON COLLECTOR (Collecting BUTTONS)
			collector.on('collect', async c => {
				await c.deferUpdate().then(async () => {
					if (navMenu.nextWasHeard(c.customId)){
						// Next Menu Activated
						console.log('NEXT WAS HEARD!!');

						const idSplitList = c.customId.split('-');
						if (idSplitList[0] !== 'select'){
							switch(idSplitList[1]){
								case "settings":
									// const coreSettingsDataMap = new Map(objectEntries(coreSettingsRawData));


									
									// // Handle for user specific settings?
									// let finalTemplate;
									// if (coreSettingsDataMap.get('Users')){
									// 	// Unique User Base Exists
									// 	const userSetList = coreSettingsDataMap.get('Users');
									// 	let usersSettings = userSetList.find(sObj => sObj.UserID === navMenu.userUsing);
									// 	if (!usersSettings){
									// 		const settingTemplate = coreSettingsDataMap.get('Template');
									// 		usersSettings = settingTemplate;
									// 		usersSettings.UserID = navMenu.userUsing;
									// 	}

									// 	finalTemplate = coreSettingsRawData;
									// 	delete finalTemplate.Users;
									// 	finalTemplate.Template = usersSettings;
									// 	finalTemplate = finalTemplate.Template; // new Map(objectEntries(finalTemplate));
									// } else finalTemplate = coreSettingsDataMap.get("Data");

									// navMenu.settings.data = finalTemplate;
									
									// console.log(finalTemplate);
									// console.log(navMenu.settings.data);

									// for (const [key, value] of objectEntries(navMenu.settings.data)){
									// 	if (key === 'Users'){
									// 		let usersSettings = value.find(uData => uData.UserID === navMenu.userUsing);
									// 		if (!usersSettings){

									// 		}
									// 	}
									// }

									// Extract Selected Settings Data for further use
									const coreSettingsRawData = JSON.parse(navMenu.specs.coreObj.core_settings);
									// for (const setting of coreSettingsRawData.Settings){
									// 	console.log(setting);
									// }

									switch(idSplitList[0]){
										case "view":
											navMenu.specs.settings.view = true;
											// Update Display Embed
											//const settingDataPairs = objectEntries(navMenu.settings.data);
											//console.log(settingDataPairs);
											cleanPlaceholderEmbed(viewSettingsDisplay.embeds[0]);

											const viewSettFields = [];
											for (const setting of coreSettingsRawData.Settings){
												let finalValue = `Description: ${setting.Description}\nStandard Setting: **${(setting.Standard) ? "Yes": "No"}**\n\nCurrent Settings: `;

												if (!setting.Standard) {
													const usersSettings = setting.Users.find(sett => sett.UserID === navMenu.userUsing);
													if (usersSettings) {
														finalValue += `\n${[...objectEntries(usersSettings.Data)].map(([k, v]) => (getTypeof(v) !== "Object") ? `${k}: ${v}\n`:"").join('')}`;
													} else finalValue += "\n**No Personal Settings Exist yet!**";
												} else {
													finalValue += `\n${[...objectEntries(setting.Data)].map(([k, v]) => (getTypeof(v) !== "Object") ? `${k}: ${v}\n`:"").join('')}`;
												}

												viewSettFields.push({name: `== ${setting.Name} ==`, value: finalValue});
											}
											viewSettingsDisplay.embeds[0].addFields(viewSettFields); // coreSettingsRawData.Settings.map(setting => ({name: `== ${setting.Name} ==`, value: `Description: ${setting.Description}\nStandard Setting: ${(setting.Standard) ? "Yes": "No"}\nCurrent Values: `}))

											// Update Display List
											navMenu.navDisplayPath.push(viewSettingsDisplay);
											// Update Listening Lists
											navMenu.extractActionRowIDS(activeSettingsButtRow);
										break;
										case "edit":
											navMenu.specs.settings.edit = true;
											// Update Display List
											navMenu.navDisplayPath.push(editSettingsDisplay);
											// Update Listening Lists
											navMenu.extractActionRowIDS(activeSettingsButtRow, activeSettingsStringRow);
										break;
									}
								break;
								default:
									console.log('idSplitList CONTENTS: ', ...idSplitList);
								break;
							}
						} else {
							// Core Type Selected
							navMenu.specs.coreType = idSplitList[1];
							navMenu.specs.coreObj = builtCores.find(core => core.build_type === navMenu.specs.coreType);

							navMenu.extractActionRowIDS(settingsAccessRow);

							// navMenu.listenForBack.push(navMenu.extractIDList(settingsAccessRow, true));
							// navMenu.listenForNext.push(navMenu.extractIDList(settingsAccessRow));
							//console.log(navMenu.extractIDList(settingsAccessRow));

							navMenu.navDisplayPath.push(settingsAccessDisplay);
						}
					} else if (navMenu.backWasHeard(c.customId)){
						// Back Menu Activated
						console.log('BACK WAS HEARD!!');

						switch(c.customId.split('-')[1]){
							case "core":
								navMenu.specs.coreType = "";
								navMenu.specs.coreObj = "";
							break;
							case "setting":
								navMenu.specs.settings.view = false;
								navMenu.specs.settings.edit = false;
								navMenu.specs.settings.data = "";
							break;
						}

						navMenu.goingBack();
					}

					await anchorMsg.edit(navMenu.navDisplayPath.at(-1));
				}).catch(e => console.error(e));
			});
			// =====================

			// ~~~~~~~~~~~~~~~~~~~~~
			// STRING COLLECTOR (Ending)
			sCollector.on('end', async (c, r) => {
				if (!r || r === 'time') await handleCatchDelete(anchorMsg);
			});
			// ~~~~~~~~~~~~~~~~~~~~~

			// =====================
			// BUTTON COLLECTOR (Ending)
			collector.on('end', async (c, r) => {
				if (!r || r === 'time') await handleCatchDelete(anchorMsg);

				// sCollector.stop('Quiet');
			});
			// =====================

			/**
			 * This function resets the contents of the given embed to prevent improper values from being retained
			 * @param {EmbedBuilder} embed Embed to be wiped clean
			 */
			function cleanPlaceholderEmbed(embed){
				embed.setColor('DarkButNotBlack');
				if (embed.data.description) embed.setDescription('Temp');
				if (embed.data.fields?.length > 0) embed.spliceFields(0, embed.data.fields.length); // , {name: 'TMP', value: 'Placeholder'}
			}


			// const coreType = interaction.options.getString('thecore').toLowerCase(); // extractCoreType(interaction.options.getString('thecore'));

			// const theTown = await Town.findOne({ where: { townid: user.townid } });
			// if (!theTown) return await interaction.reply('Something went wrong while locating your town!');

			// const currentEditList = theTown.can_edit.split(',');
			// let exists = false;
			// for (const id of currentEditList) {
			// 	if (user.userid === id) {
			// 		exists = true;
			// 		break;
			// 	}
			// }
			// if (!exists) return await interaction.reply('You do not have permission to use this command for this town!');

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

		// function extractCoreType(coreType) {
		// 	let type;
		// 	if (coreType === 'Grand Hall') type = 'grandhall';
		// 	if (coreType === 'Bank') type = 'bank';
		// 	if (coreType === 'Market') type = 'market';
		// 	if (coreType === 'Tavern') type = 'tavern';
		// 	if (coreType === 'Clergy') type = 'clergy';
		// 	if (!type) return 'None';
		// 	return type;
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