const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Collection, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, SlashCommandSubcommandGroupBuilder, SlashCommandSubcommandBuilder } = require('discord.js');
// const { UserData, Pighouse } = require('../../dbObjects.js');
const { grabUser, createInteractiveChannelMessage, handleCatchDelete, makeCapital, getTypeof } = require('../../uniHelperFunctions.js');
const { NavMenu } = require('../Development/Export/Classes/NavMenu.js');
const { loadBasicBackButt } = require('./exported/tradeExtras.js');

module.exports = {
	helptypes: ['Material', 'Payout', 'Combat', 'Quest'],
	data: new SlashCommandBuilder()
	.setName('help')
    .setDescription('Basic tips, tricks, and assistance!'),
	async execute(interaction) {
		// if (interaction.user.id !== '501177494137995264') return await interaction.reply({content: 'This command is under construction! Please check back later!'});
		const user = await grabUser(interaction.user.id);

		// Help categories
		// ===============
		// COMMANDS, GAMEPLAY, SETUP, OTHER
		const generalHelpEmbed = new EmbedBuilder()
		.setTitle('== What do you need help with? ==');

		const comHelpButt = new ButtonBuilder()
		.setCustomId('help-command')
		.setStyle(ButtonStyle.Primary)
		.setLabel('Command Help');
		const gameHelpButt = new ButtonBuilder()
		.setCustomId('help-gameplay')
		.setStyle(ButtonStyle.Primary)
		.setLabel('Gameplay Help')
		.setDisabled(true);
		const setupHelpButt = new ButtonBuilder()
		.setCustomId('help-setup')
		.setStyle(ButtonStyle.Primary)
		.setLabel('Setup Help')
		.setDisabled(true);
		const otherHelpButt = new ButtonBuilder()
		.setCustomId('help-other')
		.setStyle(ButtonStyle.Primary)
		.setLabel('Other Help')
		.setDisabled(true);
		const helpTypeRow = new ActionRowBuilder().addComponents(comHelpButt, gameHelpButt, setupHelpButt, otherHelpButt);
		
		const backTypeRow = loadBasicBackButt('type');
		const backCatRow = loadBasicBackButt('cat');
		const backSubCatRow = loadBasicBackButt('subcat');
		const backWithRow = loadBasicBackButt('with');

		// COMMANDS
		// ========
		// helptypes: [],
		// helptypes:

		// GAINS: Material, Payout(Coins/XP), Gear
		// 'Material', 'Gear', 'Payout'

		// PROGRESSION: Story, Quest, Level
		// 'Story', 'Quest', 'Level'

		// INFO: Info, Stats
		// 'Info', 'Stats'

		// USER-USER/USER-SYSTEM: Trade, Town, Payup(Coins, Mats, Items)
		// 'Trade', 'Town', 'Payup', 'Craft'
		
		// COMBAT: Combat(Dungeon, Startcombat, SpawnedCombat)
		// Combat ==> Payout, Material, Gear
		// 'Combat'
		
		// MECHANICS: NPC(Dialog, Tasks, Towns), Mechanics(Status Effects, Damage Types, CraftingCore) 
		// /Stats Info('HP', 'DMG', 'DEF')
		// 'NPC', 'Luck', 'Blueprint'

		// OTHER: EarlyAccess, New, Testing
		// 'EA', 'New', 'Testing', 'Locked', 'Support'

		// Define helpcom formatting.
		/**@typedef {{type: number, name: string, description: string, choices?: {name: string, value: string}[], autocomplete: boolean, required: boolean, max_length?: number, min_length?: number}} BaseOption */
		/**@typedef {{ helpcat: string, helptypes: string[], data: { name: string, description: string, execute(): void, options?: SlashCommandSubcommandGroupBuilder<SlashCommandSubcommandBuilder<BaseOption>>[] | SlashCommandSubcommandBuilder<BaseOption>[] | BaseOption[], autocomplete?(): void } }} baseCommand */
		/**@typedef { Collection<string, baseCommand> } CommandCollection */

		/**
		 * This function loads all of the "help" formatted commands from `interaction.client.commands` Collection()
		 * @returns {CommandCollection}
		 */
		function loadAllHelpfulCommands(){
			// Sort commands into more specific categories
			const commandList = interaction.client.commands;
			// Filter out dev commands
			const isDevCommand = c => c.helpcat === 'Development';
			// Remove `help` command
			const isHelpCommand = c => c.data.name === 'help';
			// Filter out any commands missing "help" related props
			const hasHelpType = c => 'helptypes' in c;

			const allHelpfulComsList = commandList.filter(c => !isDevCommand(c) && !isHelpCommand(c) && hasHelpType(c));
			// console.log(allHelpfulComsList.size);

			return allHelpfulComsList;
		}
	
		const helpSupportedCommands = loadAllHelpfulCommands();
		
		/**@param {baseCommand} c */
		const isHelpfulGameCom = c => c.helpcat === 'Game';
		/**@param {baseCommand} c */
		const isHelpfulUtilCom = c => c.helpcat === 'Utility';

		/**
		 * This function loads the base cat display for all "help" filtered commands 
		 * @param {CommandCollection} commandsList Preloaded helpful commands list
		 * @returns {EmbedBuilder}
		 */
		function loadCommandCatDisplay(commandsList){
			const gameHelpList = commandsList.filter(c => isHelpfulGameCom(c));
			const gameComFields = gameHelpList.map(c => `**\`/${c.data.name}\`**`).join(', ');
			const gameFieldObj = { name: '== Gameplay ==', value: gameComFields };

			const utilHelpList = commandsList.filter(c => isHelpfulUtilCom(c));
			const utilComFields = utilHelpList.map(c => `**\`/${c.data.name}\`**`).join(', ');
			const utilFieldObj = { name: '== Utility ==', value: utilComFields };

			const embed = new EmbedBuilder()
			.setTitle('== Command Categories ==')
			.setDescription('Select one of the following command categories!')
			.addFields(gameFieldObj, utilFieldObj);

			return embed;
		}

		// Dynamically loaded embed display
		const commandCatEmbed = loadCommandCatDisplay(helpSupportedCommands);

		const gameCatButt = new ButtonBuilder()
		.setCustomId('help-cat-game')
		.setStyle(ButtonStyle.Primary)
		.setLabel('Game Commands');
		const utilCatButt = new ButtonBuilder()
		.setCustomId('help-cat-util')
		.setStyle(ButtonStyle.Primary)
		.setLabel('Utility Commands');
		const comCatRow = new ActionRowBuilder().addComponents(gameCatButt, utilCatButt);
		
		// COMMAND CAT SELECT DISPLAY
		const commandCatSelectDisplay = {embeds: [commandCatEmbed], components: [comCatRow, backTypeRow]};

		// COMMAND SUBCAT SELECT DISPLAY
		const commandSubCatSelectDisplay = {
			display: {embeds: [], components: []},
			/**
			 * This method loads the needed help display given the contents of `menu.specs`
			 * @param {CommandCollection} comList 
			 * @param {NavMenu} menu 
			 * @returns {{embeds: EmbedBuilder[], components: ActionRowBuilder[]}}
			 */
			load(comList, menu) {
				const {embeds, components} = loadPickedHelpCatDisplay(comList, menu);
				this.display.embeds = embeds;
				this.display.components = components;
				return this.display;
			}
		};

		const commandHelpWithSelectDisplay = {
			display: {embeds: [], components: []},
			load(comList, menu) {
				const {embeds, components} = loadPickedHelpSubCatDisplay(comList, menu);
				this.display.embeds = embeds;
				this.display.components = components;
				return this.display;
			}
		};

		// Gain: 'Material', 'Gear', 'Payout'
		// Progress: 'Story', 'Quest', 'Level'
		// Info: 'Info', 'Stats'
		// Transaction: 'Trade', 'Town', 'Payup', 'Craft'
		// Combat: 'Combat'
		// Misc: 'NPC', 'Luck', 'Blueprint'
		// Other: 'EA', 'New', 'Testing', 'Locked', 'Support'
		const subCatGroupTypes = new Map([
			["Gain", ['Material', 'Gear', 'Payout']],
			["Progress", ['Story', 'Quest', 'Level']],
			["Information", ['Info', 'Stats']],
			["Transaction", ['Trade', 'Town', 'Payup', 'Craft']],
			["Combat", ['Combat']],
			["Misc", ['NPC', 'Luck', 'Blueprint']],
			["Other", ['EA', 'New', 'Testing', 'Locked', 'Support']]
		]);

		/**
		 * @typedef {string} baseCat 
		 * One of 
		 * ```js
		 * "game" | "utility"
		 * ```
		 * */
		// ===================

		/**@param {baseCat} cat*/
		const filterComType = cat => {
			return (cat === 'game') ? isHelpfulGameCom : isHelpfulUtilCom;
		};

		/**
		 * @param {baseCat} cat
		 * @param {CommandCollection} coms
		 * @returns {CommandCollection}
		 * */
		const isMatchingCatType = (cat, coms) => {
			const isCatType = filterComType(cat);
			return coms.filter(c => isCatType(c));
		};

		/**
		 * @param {baseCat} cat
		 * @param {CommandCollection} coms
		 * @returns {string[]}
		 * */
		const grabSubCatTypeList = (cat, coms) => {
			return isMatchingCatType(cat, coms).reduce((acc, c) => {
				acc.push(...c.helptypes.filter(sc => !acc.includes(sc)));
				return acc;
			}, []);
		};

		/**
		 * @param {baseCat} cat
		 * @param {CommandCollection} coms
		 * @returns {{fields: {name: string, value: string}[], optionObj: string[]}} Valid EmbedBuilder Field Object Array
		 * */
		const groupSubCatTypeList = (cat, coms) => {
			const existingSubCatTypes = grabSubCatTypeList(cat, coms);
			existingSubCatTypes.sort();

			const nameList = [], valueList = [], shownGroupTypes = [];
			for (const [group, types] of subCatGroupTypes.entries()){
				const matchingTypes = types.filter(sc => existingSubCatTypes.includes(sc));
				// If current `[group]: types[]` finds no matches within existingSubCatTypes
				// skip group, excluding it from return display.
				if (matchingTypes.length === 0) continue;
				shownGroupTypes.push(...matchingTypes);
				const subCatHeaderList = matchingTypes.join(' | ');
				nameList.push(`== __${group} Related Categories__ ==> ${subCatHeaderList}`);

				const subCatContainsList = matchingTypes.reduce((acc, type) => {
					const isComAddedForType = c => acc.some(addedCom => addedCom.data.name === c.data.name);
					
					const curTypeComMatchList = isMatchingSubCatType(cat, type, coms);
					const unaddedTypeComMatches = curTypeComMatchList.filter(c => !isComAddedForType(c));

					acc.push(...unaddedTypeComMatches.map(c => c));

					return acc;
				}, []).map(c => `**\`/${c.data.name}\`**`).join(', ');
				valueList.push(subCatContainsList + '\n\n');
			}

			// const fieldNameValueMap = [];
			// new Array(nameList.length).fill(0).forEach((__, idx) => {
			// 	fieldNameValueMap.push([nameList[idx], valueList[idx]]);
			// });

			//const f = ;

			const selectionDisplayObj = {
				fields: nameList.map((n, i) => ({name: n, value: valueList[i]})), // fieldNameValueMap.map(([n, v]) => ({name: n, value: v})),
				optionObj: shownGroupTypes
			};

			return selectionDisplayObj;
		};

		/**
		 * @param {baseCat} cat
		 * @param {string} subCat
		 * @param {CommandCollection} coms
		 * @returns {CommandCollection}
		 * */
		const isMatchingSubCatType = (cat, subCat, coms) => {
			const catMatchList = isMatchingCatType(cat, coms);
			return catMatchList.filter(c => c.helptypes.includes(subCat));
		};


		/**
		 * This function loads the selected `help cat`'s, `subcat` options menu
		 * @param {CommandCollection} commandList Helpful Commands List
		 * @param {NavMenu} menu Standard Navigation Menu
		 * @returns {{embeds: EmbedBuilder[], components: ActionRowBuilder[]}}
		 */
		function loadPickedHelpCatDisplay(commandList, menu){
			const displayObj = groupSubCatTypeList(menu.specs.helpCat, commandList);
			const subCatOptions = [];
			for (const type of displayObj.optionObj){
				const option = new StringSelectMenuOptionBuilder()
				.setLabel(makeCapital(type))
				.setValue(type)
				.setDescription(`Commands related to ${makeCapital(type)}`);

				subCatOptions.push(option);
			}

			const subCatOptionMenu = new StringSelectMenuBuilder()
			.setCustomId('help-subcat')
			.setPlaceholder('Select an option to continue!')
			.addOptions(subCatOptions);

			const subCatOptionMenuRow = new ActionRowBuilder().addComponents(subCatOptionMenu);

			const embed = new EmbedBuilder()
			.setTitle(`== ${makeCapital(menu.specs.helpCat)} Command Categories ==`)
			.setDescription('Select one of the following categories!')
			.addFields(displayObj.fields);

			return {embeds: [embed], components: [subCatOptionMenuRow, backCatRow]};
		}

		/**
		 * This function loads the selected `help subcat`'s, `command` options menu
		 * @param {CommandCollection} commandList Helpful Commands List
		 * @param {NavMenu} menu Standard Navigation Menu
		 * @returns {{embeds: EmbedBuilder[], components: ActionRowBuilder[]}}
		 */
		function loadPickedHelpSubCatDisplay(commandList, menu){
			const subCatPickedList = isMatchingSubCatType(menu.specs.helpCat, menu.specs.helpSubCat, commandList);

			const helpWithFields = [], helpWithOptions = [];
			for (const [comName, com] of subCatPickedList){
				const option = new StringSelectMenuOptionBuilder()
				.setLabel(makeCapital(comName))
				.setValue(comName)
				.setDescription(`/${makeCapital(comName)} command`);

				helpWithOptions.push(option);
				helpWithFields.push({name: `== \`/${com.data.name}\` ==`, value: `Description: ${com.data.description}`});
			}

			const helpWithOptionMenu = new StringSelectMenuBuilder()
			.setCustomId('help-with')
			.setPlaceholder('Select an option to continue!')
			.addOptions(helpWithOptions);

			const helpWithOptionMenuRow = new ActionRowBuilder().addComponents(helpWithOptionMenu);

			const embed = new EmbedBuilder()
			.setTitle(`== ${makeCapital(menu.specs.helpSubCat)} Commands ==`)
			.setDescription('Select one of the following commands!')
			.addFields(helpWithFields);

			return {embeds: [embed], components: [helpWithOptionMenuRow, backSubCatRow]};
		}

		/**
		 * This function loads the selected `command`'s help menu display
		 * @param {CommandCollection} commandList Helpful Commands List
		 * @param {NavMenu} menu Standard Navigation Menu
		 * @returns {{embeds: EmbedBuilder[], components: ActionRowBuilder[]}}
		 */
		function loadFullPickedCommandInfoSheet(commandList, menu){
			const isCommandMatch = c => c.data.name === menu.specs.helpWith;
			const commandMatch = commandList.find(c => isCommandMatch(c));

			const comDesc = `Help Tags: \`${commandMatch.helptypes.map(ht => `${ht}`).join(`\`, \``)}\`\n\nDescription: *${commandMatch.data.description}*`;

			const commandEmbed = new EmbedBuilder()
			.setTitle(`===> Command: \`/${commandMatch.data.name}\``)
			.setDescription(comDesc);

			if (commandMatch.data.options.length > 0){
				const comFields = createCommandOptionDisplayFields(commandMatch);
				commandEmbed.setFields(comFields);
			}

			return {embeds: [commandEmbed], components: [backWithRow]};
		}


		/**
		 * This function handles loading the selected commands `slashcommand` data, which it converts into valid `APIEmbedField` data.
		 * @param {baseCommand} pickedCommand Selected command for help
		 * @returns {{name: string, value: string}[]}
		 */
		function createCommandOptionDisplayFields(pickedCommand){
			const comOptionTypeKeys = new Map([
				[1, "SubCom"],
				[2, "SubComGroup"],
				[3, "Text"],
				[4, "Number"],
				[5, "Yes/No"],
				[6, "User"],
				[7, "Channel"],
				[8, "Role"],
				[9, "Mentionable"],
				[10, "Number"],
				[11, "File Attachment :paperclip:"]
			]);

			const optionExampleKeys = new Map([
				['rarity', 'EX: `Common`\n'],
				['item', 'EX: `Sword`, `Minor Healing`, `Shield`\n'],
				['gear', 'EX: `Sword`, `Minor Healing`, `Shield`\n'],
				['amount', 'EX: `10`\n'],
				['target', `EX: <@${interaction.user.id}>\n`]
			]);

			/**
			 * const comOptionTypeKeys = new Map([
				[1, "SubCom"],
				[2, "SubComGroup"],
				[3, "Text :abc:"],
				[4, "Number 0️⃣"],
				[5, "Yes/No ✅/❌"],
				[6, "User :bust_in_silhouette:"],
				[7, "Channel :speech_left:"],
				[8, "Role :crown:"],
				[9, "Mentionable"],
				[10, "Number 0️⃣"],
				[11, "File Attachment :paperclip:"]
			]);
			 */

			// console.log(pickedCommand.data.options);

			/**@param {BaseOption} o */
			const hasChoices = o => o.choices;
			/**@param {BaseOption} o */
			const isAutocomplete = o => o.autocomplete;
			/**@param {BaseOption} o */
			const isRequired = o => o.required;

			/**@param {BaseOption} o */
			const extraOptionDisplay = o => {
				return {choices: hasChoices(o), autocomplete: isAutocomplete(o), required: isRequired(o)};
			};

			/**@param {BaseOption} o */
			const extractOptionExtras = o => {
				let extraStr = "";
				const objExtras = extraOptionDisplay(o);
				if (!objExtras.autocomplete && !objExtras.required && !objExtras.choices) return {extraStr};
				if (objExtras.required) extraStr += '\n❗ **Option is required!** ❗';
				if (objExtras.autocomplete) extraStr += '\n❔ **Uses Autocomplete!** ❔';
				if (!objExtras.choices) return {extraStr};
				return {choiceStr: '**Choices given:** \n' + objExtras.choices.map(choice => `> - **${choice.name}**`).join('\n'), extraStr};
			};


			const extractSubcomName = sc => `=> Subcommand: \`${sc.name}\``;
			const extractSubcomData = sc => `Description: *${sc.description}*`;

			/**@param {BaseOption} o */
			const extractOptionName = o => `**> Option Name: \`${o.name}\`**`;

			/**@param {BaseOption} o */
			const extractOptionTitleExample = o => {
				const oName = `${extractOptionName(o)} ${(optionExampleKeys.has(o.name)) ? optionExampleKeys.get(o.name) : ""}`;
				return oName;
			};

			/**@param {BaseOption} o */
			const extractOptionData = o => {
				const optionExtras = extractOptionExtras(o);
				const baseStr = `Description: *${o.description}*\nInput Type: **${comOptionTypeKeys.get(o.type)}**` + optionExtras.extraStr;
				if (!optionExtras.choiceStr) return baseStr;
				return optionExtras.choiceStr + '\n' + baseStr;
			};
			/**@param {BaseOption} o */
			const extractFullOptionData = o => extractOptionTitleExample(o) + '\n' + extractOptionData(o) + '\n\n';

			const finalFields = [];
			if (getTypeof(pickedCommand.data.options[0]) === 'SlashCommandSubcommandGroupBuilder'){
				for (const subcomGroup of pickedCommand.data.options){
					let subcomGroupStr = `Description: *${subcomGroup.description}*\n\n`;
					for (const subcom of subcomGroup.options){
						subcomGroupStr += extractSubcomName(subcom) + '\n' + extractSubcomData(subcom) + '\n\n';
						//subcomGroupStr += `=> Subcommand: \`${subcom.name}\`\nDescription: ${subcom.description}\n\n`;
						for (const option of subcom.options){
							subcomGroupStr += extractFullOptionData(option);
						}
					}
					finalFields.push({name: `==> Subcommand Group: \`${subcomGroup.name}\``, value: subcomGroupStr});
				}
				return finalFields;
			}

			if (getTypeof(pickedCommand.data.options[0]) === 'SlashCommandSubcommandBuilder'){
				for (const subcom of pickedCommand.data.options){
					let subcomStr = extractSubcomData(subcom) + `\n\n`;
					for (const option of subcom.options){
						subcomStr += extractFullOptionData(option);
					}
					finalFields.push({name: extractSubcomName(subcom), value: subcomStr});
				}
				return finalFields;
			}

			for (const option of pickedCommand.data.options){
				finalFields.push({name: extractOptionTitleExample(option), value: extractOptionData(option)});
			}
			return finalFields;
		}


		// GAMEPLAY
		// ========
		const gameplayCatEmbed = new EmbedBuilder()
		.setTitle('== Gameplay Categories ==')
		.setDescription('Select one of the following gameplay categories!');
		// GAMEPLAY CAT DISPLAY
		const gameplayCatDisplay = {embeds: [gameplayCatEmbed], components: [backTypeRow]};

		// SETUP
		// =====
		// Direct to `/setup help`
		const setupCatEmbed = new EmbedBuilder()
		.setTitle('== Setup Help ==')
		.setDescription('For Setup help use the command `/setup help`');
		// SETUP DISPLAY
		const setupCatDisplay = {embeds: [setupCatEmbed], components: [backTypeRow]};

		// OTHER
		// =====
		const otherCatEmbed = new EmbedBuilder()
		.setTitle('== Other Categories ==')
		.setDescription('Select one of the following categories!');
		// OTHER CAT DISPLAY
		const otherCatDisplay = {embeds: [otherCatEmbed], components: [backTypeRow]};

		const replyObj = {embeds: [generalHelpEmbed], components: [helpTypeRow]};

		const {anchorMsg, collector, sCollector} = await createInteractiveChannelMessage(interaction, 450000, replyObj, "Reply", "Both");

		const helpExtras = {
			helpType: "",
			helpCat: "",
			helpSubCat: "",
			helpWith: ""
		};

		const helpMenu = new NavMenu(user, replyObj, replyObj.components, helpExtras);

		// ~~~~~~~~~~~~~~~~~~~~~
		// STRING COLLECTOR (COLLECT)
		sCollector.on('collect', async c => {
			await c.deferUpdate().then(async () => {
				let editWith = {};
				switch(helpMenu.whatDoYouHear(c.customId)){
					case "NEXT":
						const idSplits = c.customId.split('-');
						switch(idSplits[1]){
							case "subcat":
								helpMenu.specs.helpSubCat = c.values[0];
								editWith = helpMenu.goingForward(commandHelpWithSelectDisplay.load(helpSupportedCommands, helpMenu));
							break;
							case "with":
								helpMenu.specs.helpWith = c.values[0];
								editWith = helpMenu.goingForward(loadFullPickedCommandInfoSheet(helpSupportedCommands, helpMenu));
							break;
						}
					break;
					default:
						console.log(helpMenu.whatDoYouHear(c.customId));
					break;
				}
				if (editWith.embeds) await anchorMsg.edit(editWith);
			}).catch(e => console.error(e));
		});
		// ~~~~~~~~~~~~~~~~~~~~~

		// =====================
		// BUTTON COLLECTOR (COLLECT)
		collector.on('collect', async c => {
			await c.deferUpdate().then(async () => {
				let editWith = {};
				switch(helpMenu.whatDoYouHear(c.customId)){
					case "NEXT":
						const idSplits = c.customId.split('-');
						console.log(...idSplits);
						switch(idSplits[1]){
							case "cat":
								helpMenu.specs.helpCat = idSplits[2];
								editWith = helpMenu.goingForward(commandSubCatSelectDisplay.load(helpSupportedCommands, helpMenu));
							break;
							default:
								// Help Type selected
								helpMenu.specs.helpType = idSplits[1];
								switch(idSplits[1]){
									case "command":
										editWith = helpMenu.goingForward(commandCatSelectDisplay);
									break;
									case "gameplay":
										editWith = helpMenu.goingForward(gameplayCatDisplay);
									break;
									case "setup":
										editWith = helpMenu.goingForward(setupCatDisplay);
									break;
									case "other":
										editWith = helpMenu.goingForward(otherCatDisplay);
									break;
								}
							break;
						}
					break;
					case "BACK":
						switch(c.customId.split('-')[1]){
							case "type":
								helpMenu.specs.helpType = "";
							break;
							case "cat":
								helpMenu.specs.helpCat = "";
							break;
							case "subcat":
								helpMenu.specs.helpSubCat = "";
							break;
							case "with":
								helpMenu.specs.helpWith = "";
							break;
						}
						editWith = helpMenu.goingBackward();
					break;
					case "CANCEL":

					break;
					default:
						console.log(helpMenu.whatDoYouHear(c.customId));
					break;
				}
				if (editWith.embeds) await anchorMsg.edit(editWith);
			}).catch(e => console.error(e));
		});
		// =====================

		// ~~~~~~~~~~~~~~~~~~~~~
		// STRING COLLECTOR (END)
		sCollector.on('end', async (c, r) => {
			if (!r || r === 'time') return await handleCatchDelete(anchorMsg);
		});
		// ~~~~~~~~~~~~~~~~~~~~~

		// =====================
		// BUTTON COLLECTOR (END)
		collector.on('end', async (c, r) => {
			if (!r || r === 'time') return await handleCatchDelete(anchorMsg);
		});
		// =====================




		// const uData = await UserData.findOne({ where: { userid: interaction.user.id } });
		// if (!uData) return interaction.reply(`Welcome new user! To get started use the command \`/start\`. If you still need help afterwards use the help command again!`);

		// if (uData.health === 0) {
		// 	//User is dead
		// 	return interaction.reply(`Oh dear, looks like you've fallen in combat and forgot to mourn the loss of life! Do not fear, using \`/startcombat\` will give you another chance and restore you to full health!`);
		// }

		// if (uData.points > 0) {
		// 	//User has unspent points
		// 	return interaction.reply(`Looks like you've got some perk points to spend! ${uData.points} to be exact. You can use \`/stats info <stat name>\` for more information on what each stat does, when you're ready use \`/addpoint\` to spend them!`);
        // }

		// if (uData.health <= 5 && uData.lastdeath === 'None') {
		// 	//User very likely doesnt want to die :3
		// 	return interaction.reply(`Oh my, it would appear your health situation is rather dire! I am estatic to inform you that upon mourning your death when prompted, if you should fall in combat, will bless you back to full health!`);
        // }

		// if (uData.level < 2) {
		// 	//User probably needs help starting combat
		// 	return interaction.reply(`Well well, a brand new ${uData.pclass}! Fantastic choice, now as promised... give the command \`/startcombat\` a try once or twice.. or as many times as you'd like!`);
        // }

		// if (uData.level < 5) {
		// 	//User has not yet reached 'FIRST LEVEL MILESTONE' 
		// 	return interaction.reply(`Welcome back! Looks like you've tested your skills once or twice, however you still lack the experience needed to strike out on your own through quests! Come back once you've reached level 5! :)`);
		// }

		// if (uData.level >= 5 && uData.qt === 0) {
		// 	//User can start quests and has not 
		// 	return interaction.reply(`Congratulations on your success, you are now ready for \`/quest start\`! Good luck out there.`);
		// }

		// if (uData.level > 6 && uData.qt >= 10) {
		// 	//User has completed quest check for owned pigmy
		// 	const haspig = await Pighouse.findOne({ where: { spec_id: interaction.user.id } });
		// 	if (!haspig) {
		// 		//No pigmies found!
		// 		return interaction.reply(`Quite the ${uData.pclass} you've become! Looks like you're ready for something new, give \`/pigmyshop\` a try!`);
        //     }
		// }

		// if (uData.totitem >= 15 && uData.coins <= 5000) {
		// 	//User has many items, and not a lot of coins
		// 	return interaction.reply(`Busy are we? Seems like you've started quite the collection of loot. These commands should be of use to you now! \`/myloot\` to pull up your inventory. \`/equip <Item name>\` This one is case sensitive! \`/sell <Item name>\` This one is too!`);
		// }

		// if (uData.totitem < 15 && uData.coins >= 6500) {
		// 	//User has some items and is piling up coins
		// 	return interaction.reply(`Your pockets are filling up nicely, why not try your luck in the \`/shop\`!`);
        // }

		// if (uData.level > 30) {
		// 	//Unlikely..
		// 	return interaction.reply(`Well then, you must think yourself awfully funny, or think I am daft... If you truely still need help you'll have to wait as this is the furthest I can take you for now`);
        // }
	},
};
