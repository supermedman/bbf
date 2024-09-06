const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
//const wait = require('node:timers/promises').setTimeout;
const { Pighouse, Pigmy, ActiveStatus, MaterialStore, OwnedTools } = require('../../dbObjects.js');
const { isLvlUp, isPigLvlUp } = require('./exported/levelup.js');
const Canvas = require('@napi-rs/canvas');

const {
	warnedForm,
	errorForm,
	successResult,
	failureResult,
	basicInfoForm,
	specialInfoForm,
    specialInfoForm2
} = require('../../chalkPresets.js');

const { grabRar, grabColour } = require('./exported/grabRar');

const acToolEffects = require('../../events/Models/json_prefabs/acToolEffects.json');
const pigmyList = require('../../events/Models/json_prefabs/pigmyList.json');
const blueprintList = require('../../events/Models/json_prefabs/blueprintList.json');
const { makeCapital, grabUser, grabActivePigmy, sendTimedChannelMessage, createConfirmCancelButtonRow, createInteractiveChannelMessage, handleCatchDelete, editTimedChannelMessage, randArrPos, inclusiveRandNum, endTimer } = require('../../uniHelperFunctions.js');
const { loadFullDismantleList, baseCheckRarName } = require('../Development/Export/itemStringCore.js');
const { checkInboundMat } = require('../Development/Export/itemMoveContainer.js');
const { handleUserPayout, handlePigmyPayouts } = require('../Development/Export/uni_userPayouts.js');
const { createBasicPageButtons } = require('./exported/tradeExtras.js');
const {NavMenu} = require('../Development/Export/Classes/NavMenu.js');


module.exports = {
	data: new SlashCommandBuilder()
	.setName('pigmy')
	.setDescription('All your pigmies needs in one place!')
	.addSubcommand(subcommand =>
		subcommand
		.setName('equip')
		.setDescription('Equip or switch your active pigmy!')
		.addStringOption(option =>
			option
			.setName('choice')
			.setDescription('The pigmy')
			.setAutocomplete(true)
			.setRequired(true)
		)
	)
	.addSubcommand(subcommand =>
		subcommand
		.setName('give')
		.setDescription('Give your pigmy something to use!')
		.addStringOption(option =>
			option
			.setName('type')
			.setDescription('Which tool type would you like to give from?')
			.setRequired(true)
			.addChoices(
				{ name: 'Toy', value: 'toy' },
				{ name: 'Hat', value: 'hat' },
				{ name: 'Title', value: 'title' },
			)
		)
		.addStringOption(option =>
			option
			.setName('tool')
			.setDescription(`Which tool would you like to give?`)
			.setRequired(true)
			.setAutocomplete(true)
		)
	)
	.addSubcommand(subcommand =>
		subcommand
		.setName('claim')
		.setDescription('Claims collected rewards from active pigmy!')
	)
	.addSubcommand(subcommand =>
		subcommand
		.setName('inspect')
		.setDescription('Info about active pigmy.')
	)
	.addSubcommand(subcommand =>
		subcommand
		.setName('play')
		.setDescription('Play with your pigmy to increase happiness!')
	)
	.addSubcommand(subcommand =>
		subcommand
		.setName('rename')
		.setDescription('Change the name of your active pigmy!')
		.addStringOption(option =>
			option
			.setName('new-name')
			.setDescription('New name for your pigmy')
			.setMaxLength(25)
			.setMinLength(2)
			.setRequired(true)
		)
	),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);

		let choices = [];

		if (focusedOption.name === 'choice') {
			const focusedValue = interaction.options.getFocused(false);
			const ownedPigs = await Pighouse.findAll({where: {spec_id: interaction.user.id}});
			
			choices = ownedPigs.map(pig => pig.name);


			//const pigs = await Pighouse.findAll({ where: [{ spec_id: interaction.user.id }] });

			//choices = pigs.map(pig => pig.name.toString());

			//Mapping the complete list of options for discord to handle and present to the user
			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}

		if (focusedOption.name === 'tool') {
			const focusedValue = interaction.options.getFocused(false);
			const toolType = makeCapital(interaction.options.getString('type') ?? "None");

			//let toolType = interaction.options.getString('type') ?? 'NONE';

			//const makeCapital = (str) => { return str.charAt(0).toUpperCase() + str.slice(1) };
			//toolType = makeCapital(toolType);

			const userPigmyTools = await OwnedTools.findAll({
				where: {
					spec_id: interaction.user.id,
					activecategory: 'Pigmy',
					activesubcategory: toolType
				}
			});

			// const tools = await OwnedTools.findAll({
			// 	where: [
			// 		{ spec_id: interaction.user.id },
			// 		{ activecategory: 'Pigmy' },
			// 		{ activesubcategory: toolType }]
			// });

			choices = userPigmyTools.map(tool => tool.name);

			//choices = tools.map(tool => tool.name);

			//console.log(basicInfoForm(`Current Choices: ${choices} for ${toolType}s`));

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}
	},
	async execute(interaction) {

		//if (interaction.user.id !== '501177494137995264') return await interaction.reply({content: 'Command under construction! Check back later!', ephemeral: true});

		const subCom = interaction.options.getSubcommand();

		const user = await grabUser(interaction.user.id);
		const pigmy = await grabActivePigmy(user.userid);
		if (subCom !== 'equip' && !pigmy) {
			const hasAnyPigmy = !!(await Pighouse.findOne({where: {spec_id: user.userid}}));
			if (!hasAnyPigmy) return await interaction.reply({content: 'You must first use `/pigmyshop` to purchase a pigmy before using this command!', ephemeral: true});
			return await interaction.reply({content: 'You must first `/pigmy equip <pigmy-name>` a pigmy before using this command!', ephemeral: true});
		} else if (subCom !== 'equip'){
			const isSuperBitchy = pig => pig.mood === 'Corrupted!';

			const needsGoodMood = ['claim', 'inspect', 'rename'];
			if (needsGoodMood.includes(subCom) && isSuperBitchy(pigmy)){
				switch(subCom){
					case "claim":
					return await interaction.reply({content: `${makeCapital(pigmy.name)} has been neglected, they will do no work to aid your mistreatment. ||\`/pigmy play\` with them!||`, ephemeral: true});
					case "inspect":
					return await interaction.reply({content: `${makeCapital(pigmy.name)} feels unworthy of attention, this poor creature is tormented by your lack of care! ||\`/pigmy play\` with them!||`, ephemeral: true});
					case "rename":
					return await interaction.reply({content: `${makeCapital(pigmy.name)} will accept no name from their abuser! ||\`/pigmy play\` with them!||`, ephemeral: true});
				}
			}
		}

		

		const displayEmbed = new EmbedBuilder();

		const passingObject = {};

		let usingButtons = false, claimingPigmy = false;
		switch(subCom){
			case "equip":
				const equipPigNamed = interaction.options.getString('choice');
				if (!equipPigNamed) return await interaction.reply({content: 'That was not a valid name!', ephemeral: true});
				const equipPigMatch = await Pighouse.findOne({where: {spec_id: interaction.user.id, name: equipPigNamed}});
				if (!equipPigMatch) return await interaction.reply({content: `Pigmy with name ${equipPigNamed} was not found!`, ephemeral: true});
				if (pigmy?.name === equipPigMatch.name) return await interaction.reply({content: `${equipPigNamed} is already equipped!`, ephemeral: true});

				const equippedPigmy = await handlePigmyEquip(equipPigMatch, user);
				// console.log(equippedPigmy);

				displayEmbed
				.setTitle('== Pigmy Equipped ==')
				.setDescription(`**${equippedPigmy.name}** has been equipped!`);
			break;
			case "give":
				const toolType = interaction.options.getString('type') ?? "None";
				const toolName = interaction.options.getString('tool') ?? "None";
				if ([toolType, toolName].includes('None')) return await interaction.reply({content: `Cannot give invalid ('None') ${makeCapital(toolType)} ${toolName} to pigmy!`, ephemeral: true});

				const theTool = await OwnedTools.findOne({where: {spec_id: user.userid, name: toolName, activecategory: 'Pigmy'}});
				if (!theTool) return await interaction.reply({content: 'Tool selected was either not found, or not a valid pigmy option! Use `/myloot tools` to view tools, use `/blueprint available` to make a tool!', ephemeral: true});

				const isOverwrite = pigmy[toolType] === 'NONE';
				const isEquipped = isOverwrite && pigmy[toolType] === toolName;
				if (isEquipped) return await interaction.reply({content: `Pigmy already has ${toolName} equipped in the ${makeCapital(toolType)} slot!`, ephemeral: true});

				usingButtons = isOverwrite;
				if (!usingButtons){
					displayEmbed
					.setTitle(`== ${makeCapital(toolType)} Equipped ==`)
					.setDescription(`**${toolName}** has been equipped!`);
				} else {
					passingObject.toolType = toolType;
					passingObject.toolName = toolName;
					passingObject.tool = theTool;

					displayEmbed
					.setTitle(`== Equip ${makeCapital(toolType)} ==`)
					.setDescription(`Replace current ${makeCapital(toolType)} ${pigmy[toolType]} with **${toolName}**?`);
				}
			break;
			case "claim":
				const claimCheckOutcome = isClaimReady(pigmy);
				if (!claimCheckOutcome.ready) return await interaction.reply({content: claimCheckOutcome.display, ephemeral: true});

				const finalClaimResult = await handlePigmyClaim(pigmy);

				displayEmbed
				.setTitle(finalClaimResult.display.title)
				.setDescription(finalClaimResult.display.description)
				.addFields(finalClaimResult.display.fields);

				passingObject.embeds = finalClaimResult.pages;

				usingButtons = true;
				claimingPigmy = true;
			break;
			case "inspect":
			return await interaction.reply({content: 'Command under construction! Check back later!', ephemeral: true});;
			case "play":
				const pigmyPlayCount = await handleTomorrowCheck(pigmy);
				if (pigmyPlayCount === 5) return await interaction.reply({content: `${makeCapital(pigmy.name)} is too tired to play anymore today!`, ephemeral: true});
				if (pigmy.happiness === 100) return await interaction.reply({content: `${makeCapital(pigmy.name)} is already as happy as can be!`, ephemeral: true});

				const playOutcome = await handlePigmyPlay(pigmy);
				
				displayEmbed
				.setTitle(playOutcome.title)
				.addFields(playOutcome.fields);
			break;
			case "rename":
				const newPigName = interaction.options.getString('new-name');
				if (!newPigName) return await interaction.reply({content: `Invalid name: ${newPigName}`, ephemeral: true});
				// Profanity filter here?
				const ownedPigNameMatch = await Pighouse.findOne({where: {spec_id: user.userid, name: newPigName}});
				if (ownedPigNameMatch) return await interaction.reply({content: `Invalid name: ${newPigName}, you already have a pigmy with this name!`, ephemeral: true});

				usingButtons = true;

				passingObject.newName = newPigName;

				displayEmbed
				.setTitle(`== Rename Pigmy ==`)
				.setDescription(`Change ${pigmy.name}'s name to ${newPigName}?`);
			break;
		}

		if (!usingButtons){
			return await sendTimedChannelMessage(interaction, 120000, displayEmbed, "Reply");
		}

		const replyObj = {}, replyType = (claimingPigmy) ? "FollowUp": "Reply";
		if (!claimingPigmy){
			const confirmButts = createConfirmCancelButtonRow(subCom);

			replyObj.embeds = [displayEmbed];
			replyObj.components = [confirmButts];
		} else {
			// Claiming from pigmy

			await sendTimedChannelMessage(interaction, 120000, displayEmbed, "Reply");

			const pageButts = createBasicPageButtons("Primary");
			const finishViewButt = new ButtonBuilder()
			.setCustomId('cancel-page')
			.setStyle(ButtonStyle.Secondary)
			.setLabel('Close Menu');
			pageButts.push(pageButts.splice(1,1,finishViewButt)[0]);

			const pageButtRow = new ActionRowBuilder().addComponents(pageButts);

			replyObj.embeds = [passingObject.embeds[0]];
			replyObj.components = [pageButtRow];
		}

		// const replyObj = {embeds: [displayEmbed], components: [confirmButts]};

		const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, replyType);

		const pageNav = new NavMenu(user, replyObj, replyObj.components);
		if (claimingPigmy) pageNav.loadPagingMenu(passingObject);

		// =====================
		// BUTTON COLLECTOR
		collector.on('collect', async c => {
			await c.deferUpdate().then(async () => {
				switch(pageNav.whatDoYouHear(c.customId)){
					case "PAGE":
						pageNav.handlePaging(c.customId);
						await anchorMsg.edit(pageNav.loadNextPage());
					break;
					case "NEXT":
						const cSplit = c.customId.split('-');
						switch(cSplit[0]){
							case "confirm":
							return collector.stop(subCom);
							case "cancel":
							return collector.stop('Canceled');
						}
					break;
					case "CANCEL":
					return collector.stop('Canceled');
				}
			}).catch(e => console.error(e));
		});
		// =====================

		// =====================
		// BUTTON COLLECTOR
		collector.on('end', async (c, r) => {
			if (!r || r === 'time' || r === 'Canceled') {
				pageNav.destroy();
				return await handleCatchDelete(anchorMsg);
			}

			let finalReply;
			switch(r){
				case "give":
					// Handle Giving
					finalReply = await givePigmyTool(pigmy, passingObject);
				break;
				case "rename":
					// Handle Renaming
					finalReply = await updatePigmyName(pigmy, passingObject);
				break;
			}			

			return await editTimedChannelMessage(anchorMsg, 90000, {embeds: [finalReply], components: []});
		});
		// =====================

		/**
		 * This function handles pigmy playtime, increasing the given pigmys happiness based on,
		 * 
		 * any toys equipped. Returns a display conveying the outcome of playtime.
		 * @param {object} pig Active Pigmy DB Object
		 * @returns {Promise <{title: string, fields: {name: string, value: string}[]}>}
		 */
		async function handlePigmyPlay(pig){
			const {masterBPEffects} = interaction.client;

			const pigmyPlaytime = {
				base: 6,
				toy: {
					name: pig.toy,
					effect: 0
				}
			};

			if (pigmyPlaytime.toy.name !== 'NONE'){
				const toyEffMatch = masterBPEffects.get(pigmyPlaytime.toy.name);
				pigmyPlaytime.toy.effect = toyEffMatch.Strength;
			}

			const totalPlaytimeEffect = pigmyPlaytime.base + pigmyPlaytime.toy.effect;
			const newPigmyHappiness = ((totalPlaytimeEffect + pig.happiness) > 100) 
			? 100 
			: totalPlaytimeEffect + pig.happiness;

			const playTextChoices = ['Awwe how cute!', 'What joy!', 'They loved it!', 'Too bad cameras dont exist yet!'];

			const playingWithToy = (pigmyPlaytime.toy.name !== 'NONE') 
			? `Played with their ${pigmyPlaytime.toy.name}. ${randArrPos(playTextChoices)}`
			: "Has nothing to play with...";

			const playtimeDisplay = {
				title: '~== Pigmy Playtime ==~',
				fields: [
					{
						name: `${makeCapital(pig.name)}`,
						value: playingWithToy
					}
				]
			}

			const currMood = grabMoodString(pig.happiness);
			const newMood = grabMoodString(newPigmyHappiness);

			const changeInHappy = currMood !== newMood;
			const moodOutcome = (!changeInHappy) 
			? {name: 'Pigmy mood: ', value: `**${currMood}**`}
			: {name: 'Mood Change: ', value: `**${currMood}** ==> **${newMood}**`};

			playtimeDisplay.fields.push(moodOutcome);

			await updatePigmyHappiness(pig, newPigmyHappiness);
			await increasePlayCount(pig);

			return playtimeDisplay;
		}

		/**
		 * This function handles every aspect of using `/pigmy claim`, 
		 * it is also quite complex in tasks completed. 
		 * 
		 * Code within is more extensively detailed.
		 * @param {object} pig Active Pigmy DB Object
		 * @returns {Promise <{display: {title: string, description: string, fields: {name: string, value: string}[]}, pages: EmbedBuilder[]}>}
		 */
		async function handlePigmyClaim(pig){
			// Timer Start
			const claimStartTime = new Date().getTime();
			
			const lastClaim = pig.lcm;
			const now = new Date().getTime();
			const timeDiff = Math.abs(now - lastClaim);

			const hourInMs = 3600000;
			const baseHours = Math.round(timeDiff / hourInMs);

			let baseMaxHours = 72;
			if (pig.level >= 25) {
				//Every 5 pigmy levels allows for an additional 3 hours
				const hourMaxIncrease = 3 * Math.floor(pig.level / 5);
				baseMaxHours += hourMaxIncrease;
			}

			// Set actual claim hours based on hours since claim, 
			// if base > max: actual = max
			// else: actual = base
			const claimHours = (baseHours > baseMaxHours) ? baseMaxHours : baseHours;

			// MATERIAL DROPS
			// ==============

			const {materialFiles, masterBPEffects} = interaction.client;

			// If hat, check bonuses
			// Else do nothing
			const claimBuffs = {
				hat: {
					name: pig.hat,
					material: {
						base: 0, // bpEffect.Strength
						bonus: {
							types: [], // bpEffect.MultType
							base: 0 // bpEffect.Mult
						}
					},
					/**
					 * This method checks if the given type matches a hat bonus type
					 * @param {string} t Type to check
					 * @returns {boolean}
					 */
					doesTypeMatch(t){
						this.material.bonus.types.includes(t)
					}
				},
				title: {
					name: pig.title,
					base: {
						pigXP: 1, // bpEffect.PigXP
						playerXP: 1, // bpEffect.UserXP
						coin: 1
					}
				}
			};

			// Load hat buff
			if (claimBuffs.hat.name !== 'NONE'){
				const buffFound = masterBPEffects.get(claimBuffs.hat.name);
				claimBuffs.hat.material.base = buffFound.Strength;
				claimBuffs.hat.material.bonus.types = buffFound.MultType;
				claimBuffs.hat.material.bonus.base = buffFound.Mult;
			}

			// Load title buff
			if (claimBuffs.title.name !== 'NONE'){
				const buffFound = masterBPEffects.get(claimBuffs.title.name);
				claimBuffs.title.base.pigXP += buffFound.PigXP;
				claimBuffs.title.base.playerXP += buffFound.UserXP;
			}

			console.log(claimBuffs);

			const staticMatChoices = loadFullDismantleList();
			console.log(staticMatChoices);

			// Pigmy Mood modifier: 1 - difference of (mood / 100) 
			// pig.happy === 100 => unhappyMod = 0
			// pig.happy === 99 => unhappyMod = 0.01
			// pig.happy === 50 => unhappyMod = 0.5
			const unhappyMod = 1 - (pig.happiness / 100);
			// Extra +1 base materials +1 * lvl/5
			const pigLevelMatBonus = 1 + Math.floor(pig.level / 5);
			// Base mats per hour = 5;
			// Max base m/hr @ plevel 100: 30 m/hr
			// Min base m/hr @ plevel 1: 6 m/hr
			const baseHourMats = 5;

			// Single Material Drop Objects List
			// Contains: `{r: (Rarity)number, t: (MatType)string, a: (AmountDropped)number}`
			const fullMatRollList = [];

			// materialContainer: (alias) matCont
			const matCont = {
				rolledList: [],
				rolledTypes: [],
				combinedTypes: [],
				finalRefList: [],
				extractTypes(){
					// Extract each MatType that appears in full listing
					this.rolledTypes = this.rolledList.reduce((acc, mObj) => {
						if (!acc.includes(mObj.t)) acc.push(mObj.t);
						return acc;
					}, []);
				},
				reduceDupes(){
					// Extract each Rarity for each MatType
					this.combinedTypes = this.rolledTypes.reduce((acc, type) => {
						// Filter by MatType
						const result = this.rolledList.filter(mObj => mObj.t === type)
						.reduce((accType, mObj) => {
							// Set matType if not set
							if (!accType.matType) accType.matType = type;
							// If !acc['Rar_id']: set it to mObj.amount
							// If acc['Rar_id']: inc by mObj.amount
							if (!accType[`${mObj.r}`]) {
								accType[`${mObj.r}`] = mObj.a;
							} else accType[`${mObj.r}`] += mObj.a;
							return accType;
						}, {})
						// Push reduced object to array
						acc.push(result);
						return acc;
					}, []);
				},
				extractRefs(){
					this.finalRefList = this.combinedTypes.reduce((acc, rarObj) => {
						// Import material file for current matType
						const matFile = require(materialFiles.get(rarObj.matType));
						// Destruct rarObj into [key:'rar_id', value:amountDropped] pairs
						const matTypeResult = Object.entries(rarObj)
						.reduce((accType, [key, value]) => {
							// Skip over material type prop
							if (key === 'matType') return accType;
							// Grab static JSON material Reference
							const matMatchResult = matFile.find(matRef => matRef.Rar_id === +key);
							// Construct detail object with all components needed for material adding
							accType.push({matType: rarObj.matType, matRef: matMatchResult, amount: value});
							// Return accType[]
							return accType;
						}, []);
						// Push final material type rarity reference array to combined array
						acc.push(matTypeResult);
						// Iterate process
						return acc;
					}, []);
				},
				/**
				 * This method constructs the full finished drop table for all materials rolled
				 * given by `matDropList`
				 * @param {{r: number, t: string, a: number}[]} matDropList Constructed material drops
				 * @returns {{matType: string, matRef: object, amount: number}[][]}
				 */
				constructMatRefList(matDropList){
					this.rolledList = matDropList;

					const matContWorkerStart = new Date().getTime();

					this.extractTypes();
					endTimer(matContWorkerStart, 'Mat Cont. (TYPES)');

					this.reduceDupes();
					endTimer(matContWorkerStart, 'Mat Cont. (AMOUNTS)');

					this.extractRefs();
					endTimer(matContWorkerStart, 'Mat Cont. (REFS)');

					const logPrettyDetails = (ele) => {
						const logMatType = `\n== ${makeCapital(ele.matType)} Materials ==\n`;
						const logMatDetails = Object.entries(ele)
						.filter(([key]) => key !== 'matType')
						.reduce((acc, [key, value]) => {
							return acc += `\n${baseCheckRarName(+key)}\nTotal Amount: ${value}\n`;
						}, "");

						console.log(logMatType + logMatDetails);
					}

					// this.combinedTypes.forEach(logPrettyDetails);

					console.log('Material References completed!');

					return this.finalRefList;
				}
			}


			// FOR LOOP PER HOURS CLAIMED
			// ==========================
			for (let h = 0; h < claimHours; h++){
				// For each hour, pick two DIFFERENT material types
				const matTypeFirstPicked = randArrPos(staticMatChoices);
				const perHourMatTypes = [matTypeFirstPicked, randArrPos(staticMatChoices.filter(type => type !== matTypeFirstPicked))];
				
				
				// Additional +((1 + (lvl/5)) - (5 + (lvl/5))) Materials  
				const randLevelBonus = inclusiveRandNum(5 + pigLevelMatBonus, 1 + pigLevelMatBonus);
				
				// Total initial materials this hour
				const totalBaseHourMats = baseHourMats + randLevelBonus;
				// UnhappyMod Material amount reduction 
				const unhappyReduction = Math.floor(unhappyMod * totalBaseHourMats);
				
				// Actual amount of materials this hour, min = 1
				const actualHourMats = (totalBaseHourMats - unhappyReduction <= 0) 
				? 1
				: totalBaseHourMats - unhappyReduction;

				// FOR LOOP PER MAT AMOUNT THIS HOUR
				// =================================
				for (let m = 0; m < actualHourMats; m++){
					/**
					 * `r: Rarity, t: MatType, a: AmountDropped`
					 */
					const matRollObject = {
						r: grabRar(pig.level), 
						t: randArrPos(perHourMatTypes), 
						a: 0
					};
					
					// Base Material Drop rates
					const baseMaterialDropped = (1 + claimBuffs.hat.material.base) + Math.floor(100 * ((pig.level * 0.01) - ((matRollObject.r * 0.02) + 0.02)));
					// Set Amount, minimum of 1
					matRollObject.a = (baseMaterialDropped <= 0) ? 1 : baseMaterialDropped;

					// Type picked matches hat bonus mat type
					if (claimBuffs.hat.doesTypeMatch(matRollObject.t)){
						matRollObject.a *= claimBuffs.hat.material.bonus.base;
					}
					
					// Push to full material list
					fullMatRollList.push(matRollObject);
				}
			}

			endTimer(claimStartTime, 'Pigmy Claim (Base Mats)');
			console.log('Initial Material Loading Complete');
			// console.log(fullMatRollList);

			const matDisplayPages = [];
			// Give materials to user, construct displays
			for (const matTypeList of matCont.constructMatRefList(fullMatRollList)){
				const matTypeEmbed = new EmbedBuilder()
				.setTitle(`== ${makeCapital(matTypeList[0].matType)} Materials ==`)
				.setColor(grabColour(matTypeList.at(-1).matRef.Rar_id));

				const finalFields = [];
				for (const matDropObj of matTypeList){
					finalFields.push({
						name: `~= ${matDropObj.matRef.Rarity} Material =~`,
						value: `Name: **__${matDropObj.matRef.Name}__**\nAmount Dropped: **${matDropObj.amount}**`
					});

					await checkInboundMat(user.userid, matDropObj.matRef, matDropObj.matType, matDropObj.amount);
				}

				matTypeEmbed.addFields(finalFields);

				matDisplayPages.push(matTypeEmbed);
			}

			endTimer(claimStartTime, 'Pigmy Claim (FULL DISPLAY, STORAGE UPDATED)');

			// handle xp/coin payouts, construct displays
			const xpLvlMod = pig.level * 1.5;
			const xpHourRate = claimHours * 100;
			const maxBaseXP = xpLvlMod + xpHourRate;
			const minBaseXP = maxBaseXP - maxBaseXP * 0.25;
			// Random base xp roll
			const basePlayerXP = inclusiveRandNum(maxBaseXP, minBaseXP);
			// Modify upwards against player xp
			const basePigmyXP = basePlayerXP * (0.5 * (pig.level / 6));

			// Mod both base xp amounts against title buff, defaults to x1
			const totalPlayerXP = basePlayerXP * claimBuffs.title.base.playerXP;
			const totalPigmyXP = basePigmyXP * claimBuffs.title.base.pigXP;

			const applyUnhappyMod = (modThis) => Math.round(modThis - Math.floor(unhappyMod * modThis));

			// Mod total amounts against happiness modifier
			const finalPlayerXP = applyUnhappyMod(totalPlayerXP);
			const finalPlayerCoin = Math.floor(finalPlayerXP * 1.2);
			const finalPigmyXP = applyUnhappyMod(totalPigmyXP);

			// Calculate pigmies happiness after claim is complete
			const happinessAfterClaim = pig.happiness - (10 + Math.ceil(claimHours / (12 - (pig.level * 0.04))));
			
			// Final base display embed data
			const baseClaimDisplay = {
				title: `== ${makeCapital(pig.name)}'s Latest Bounty ==`,
				description: `After gathering and collecting for ${claimHours} hours straight, ${makeCapital(pig.name)} provides rewards!`,
				fields: [
					{
						name: "== Pigmy Rewards ==",
						value: `XP: **${finalPigmyXP}**`
					},
					{
						name: "== Pigmy Happiness ==",
						value: `Mood changed!\n**${grabMoodString(pig.happiness)}** ==> **${grabMoodString(happinessAfterClaim)}**`
					},
					{
						name: "== Your Rewards ==",
						value: `XP: **${finalPlayerXP}**\nCOIN: **${finalPlayerCoin}**c`
					}
				]
			};

			// Handle user db payouts
			await handleUserPayout(finalPlayerXP, finalPlayerCoin, interaction, user);

			// Handle pigmy db payouts
			await handlePigmyPayouts(finalPigmyXP, pig, interaction, true);
			await updatePigmyHappiness(pig, happinessAfterClaim);

			return {display: baseClaimDisplay, pages: matDisplayPages};
		}

		/**
		 * This function returns a happiness string based on the given `h` value
		 * @param {number} h Happiness value represented as a number: 1 - 100
		 * @returns {string}
		 */
		function grabMoodString(h){
			if (h < 10){
				return 'Corrupted!';
			} else if (h <= 25){
				return 'Dejected';
			} else if (h <= 40){
				return 'Unhappy';
			} else if (h <= 50){
				return 'Uneasy';
			} else if (h <= 65){
				return 'Content';
			} else if (h <= 75){
				return 'Unfettered';
			} else if (h <= 90){
				return 'Happy!';
			} else return "Fantastic!";
		}

		/**
		 * This function handles checking if the given `pig` is ready for claiming.
		 * @param {object} pig Active Pigmy DB Object
		 * @returns {{ready: boolean, display?: string}}
		 */
		function isClaimReady(pig){
			const lastClaim = pig.lcm;
			const now = new Date().getTime();

			// 7,200,000ms is 2 hours
			// 3,600,000ms is 1 hour
			// Minimum time needed before claiming is possible
			// Increase min by 1 hour for every 5 pig levels starting at lvl 25
			const hourInMs = 3600000;

			let baseMinHours = hourInMs * 2;
			if (pig.level >= 25){
				const hourMinIncrease = Math.floor(pig.level / 5);
				baseMinHours += Math.floor(hourInMs * hourMinIncrease);
			}

			const timeDiff = Math.abs(now - lastClaim);
			const timeLeft = Math.round(baseMinHours - timeDiff);

			if (timeLeft <= 0) return {ready: true};
			return {ready: false, display: `${makeCapital(pig.name)} can claim again <t:${Math.round((now + timeLeft) / 1000)}:R>!`};
		}

		/**
		 * This function updates `pig[details.toolType] = details.toolName` for the given `pig`.
		 * @param {object} pig Active Pigmy DB Object
		 * @param {{toolType: string, toolName: string, tool: object}} details User options object, contains `toolType` and `toolName`
		 * @returns {Promise <EmbedBuilder>}
		 */
		async function givePigmyTool(pig, details){
			await pig.update({[details.toolType]: details.toolName}).then(async p => await p.save()).then(async p => {return await p.reload()});

			const finalEmbed = new EmbedBuilder()
			.setTitle(`== ${makeCapital(details.toolType)} Given ==`)
			.setDescription(`New ${makeCapital(details.toolType)}, ${details.toolName} equipped on ${makeCapital(pig.name)}`);

			return finalEmbed;
		}

		/**
		 * This function updates `.name` for the given `pig` and its `Pighouse` counterpart
		 * @param {object} pig Active Pigmy DB Object
		 * @param {{newName: string}} details User options object, contains new name
		 * @returns {Promise <EmbedBuilder>}
		 */
		async function updatePigmyName(pig, details){
			await pig.update({name: details.newName}).then(async p => await p.save()).then(async p => {return await p.reload()});
			await Pighouse.update({name: details.newName}, {where: {spec_id: pig.spec_id, refid: pig.refid}});//.then(async pr => await pr.save()).then(async pr => {return await pr.reload()});

			const finalEmbed = new EmbedBuilder()
			.setTitle('== Name Updated ==');

			return finalEmbed;
		}

		/**
		 * This function updates the given `pig` and its `Pighouse` counterpart `.happiness` & `.mood` values.
		 * @param {object} pig Active Pigmy DB Object
		 * @param {number} happiness New Pigmy Happiness
		 */
		async function updatePigmyHappiness(pig, happiness){
			const newMood = grabMoodString(happiness);
			await pig.update({happiness: happiness, mood: newMood}).then(async p => await p.save()).then(async p => {return await p.reload()});
			await Pighouse.update({happiness: happiness, mood: newMood}, {where: {spec_id: pig.spec_id, refid: pig.refid}}); //.then(async pr => await pr.save()).then(async pr => {return await pr.reload()});
		}

		/**
		 * This function locates an active `Pigmy`, creating one if not found.
		 * @param {object} pigmyRef Pighouse DB Object
		 * @param {object} user UserData DB Object
		 * @returns {Promise <object>} The newly equipped `Pigmy` instance
		 */
		async function handlePigmyEquip(pigmyRef, user){
			let equippedPigmy = await Pigmy.findOrCreate({
				where: {
					spec_id: user.userid
				},
				defaults: {
					name: pigmyRef.name,
					type: pigmyRef.type,
					level: pigmyRef.level,
					exp: pigmyRef.exp,
					mood: pigmyRef.mood,
					happiness: pigmyRef.happiness,
					refid: pigmyRef.refid
				}
			});

			if (equippedPigmy[1]){
				// Pigmy Created
				await equippedPigmy[0].save().then(async p => {return await p.reload()});
			} else {
				// Pigmy Found
				await equippedPigmy[0].update({
					name: pigmyRef.name,
					type: pigmyRef.type,
					level: pigmyRef.level,
					exp: pigmyRef.exp,
					mood: pigmyRef.mood,
					happiness: pigmyRef.happiness,
					playcount: pigmyRef.playcount,
					refid: pigmyRef.refid
				}).then(async ep => await ep.save()).then(async ep => {return await ep.reload()});
			}

			equippedPigmy = equippedPigmy[0];

			const updateClaimTime = new Date().getTime();

			await equippedPigmy.update({lcm: updateClaimTime}).then(async ep => await ep.save()).then(async ep => {return await ep.reload()});
			await setNewTomorrow(equippedPigmy);

			return equippedPigmy;
		}

		/**
		 * This function handles `checkForTomorrow(pig)`, given the `type` returns differently
		 * 
		 * IF `type = 'play'` checks if new tomorrow, true returns 0, false returns current playcount
		 * @param {object} pig Active Pigmy DB Object
		 * @param {string} type Default: `play`
		 * @returns {Promise <number>}
		 */
		async function handleTomorrowCheck(pig, type='play'){
			const isTomorrow = checkForTomorrow(pig);
			// set new tomorrow
			if (isTomorrow) await setNewTomorrow(pig);
			switch(type){
				case "play":
					// Reset play count
					if (isTomorrow) await resetPlayCount(pig);
				return pig.playcount;
			}
		}

		/**
		 * This function sets and updates the date that is `1 + today`,
		 * updating `tomorrow` for both the given `pig` and its `Pighouse` counterpart
		 * @param {object} pig Active Pigmy DB Object
		 */
		async function setNewTomorrow(pig){
			// Create Date() for tomorrow
			const today = new Date();
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);
			tomorrow.setHours(0, 0, 0, 0);

			const newDay = tomorrow.getTime();

			// Update active pigmy and stored pigmy
			await pig.update({tomorrow: newDay}).then(async p => await p.save()).then(async p => {return await p.reload()});
			await Pighouse.update({tomorrow: newDay}, {where: {spec_id: pig.spec_id, refid: pig.refid}});//.then(async pr => await pr.save()).then(async pr => {return await pr.reload()});
		}

		/**
		 * This function returns true if the given pigmy's `.tomorrow` is <= `today`
		 * @param {object} pig Active Pigmy DB Object
		 * @returns {boolean}
		 */
		function checkForTomorrow(pig){
			return pig.tomorrow <= new Date().getTime();
		}

		/**
		 * This function resets the `playcount` for both the given `pig` and its `Pighouse` counterpart
		 * @param {object} pig Active Pigmy DB Object
		 */
		async function resetPlayCount(pig){
			await pig.update({playcount: 0}).then(async p => await p.save()).then(async p => {return await p.reload()});
			await Pighouse.update({playcount: 0}, {where: {spec_id: pig.spec_id, refid: pig.refid}});//.then(async pr => await pr.save()).then(async pr => {return await pr.reload()});
		}

		/**
		 * This function increments the `playcount` by 1, for both the given `pig` and its `Pighouse` counterpart 
		 * @param {object} pig Active Pigmy DB Object
		 */
		async function increasePlayCount(pig){
			await pig.increment('playcount').then(async p => await p.save()).then(async p => {return await p.reload()});
			await Pighouse.increment('playcount', {where: {spec_id: pig.spec_id, refid: pig.refid}});//.then(async pr => await pr.save()).then(async pr => {return await pr.reload()});
		}


		// if (interaction.options.getSubcommand() === 'equip') {
		// 	//if (interaction.user.id !== '501177494137995264') return interaction.reply('This command is under construction, please check back later!');
		// 	await interaction.deferReply();
		// 	const pigname = interaction.options.getString('choice');

		// 	const pigmyHRef = await Pighouse.findOne({ where: [{ spec_id: interaction.user.id }, { name: pigname }] });
		// 	if (!pigmyHRef) return interaction.followUp(`That pigmy wasnt found! ${pigname}`);
		// 	const userPigmy = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });
		// 	if (userPigmy) {
		// 		if (userPigmy.name === pigname) return interaction.followUp('That pigmy is already equipped!');

		// 		const lastclaim = new Date(userPigmy.updatedAt).getTime();

		// 		const tableUpdate = await Pigmy.update({
		// 			name: pigmyHRef.name,
		// 			type: pigmyHRef.type,
		// 			level: pigmyHRef.level,
		// 			exp: pigmyHRef.exp,
		// 			mood: pigmyHRef.mood,
		// 			happiness: pigmyHRef.happiness,
		// 			lcm: lastclaim,
		// 			refid: pigmyHRef.refid,
		// 		}, { where: { spec_id: interaction.user.id } });

		// 		if (tableUpdate > 0) {
		// 			const newPig = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });
		// 			await setTomorrow(newPig);
		// 			return await interaction.followUp(`${pigname} was equipped successfully!`);
		// 		} else return await interaction.followUp(`Something went wrong while equipping ${pigname}`);
		// 	} else {
		// 		await Pigmy.create({
		// 			name: pigmyHRef.name,
		// 			type: pigmyHRef.type,
		// 			level: pigmyHRef.level,
		// 			exp: pigmyHRef.exp,
		// 			mood: pigmyHRef.mood,
		// 			happiness: pigmyHRef.happiness,
		// 			refid: pigmyHRef.refid,
		// 			spec_id: interaction.user.id,
		// 		});

		// 		let newPig = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });
		// 		if (!newPig) return await interaction.followUp(`Something went wrong while equipping ${pigname}`);

		// 		const lastclaim = new Date(newPig.updatedAt).getTime();

		// 		const tableUpdate = await Pigmy.update({
		// 			lcm: lastclaim,
		// 		}, { where: { spec_id: interaction.user.id } });

		// 		if (tableUpdate > 0) {
		// 			newPig = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });
		// 			await setTomorrow(newPig);
		// 			return await interaction.followUp(`${pigname} was equipped successfully!`);
		// 		}
		// 	}
		// }

		// if (interaction.options.getSubcommand() === 'give') {
		// 	//if (interaction.user.id !== '501177494137995264') return interaction.reply('This command is under construction, please check back later!');
		// 	await interaction.deferReply();
		// 	const toolType = interaction.options.getString('type');
		// 	const theToolName = interaction.options.getString('tool') ?? 'NONE';

		// 	const userPigmy = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });
		// 	if (!userPigmy) return interaction.followUp('You have no equipped pigmy, please use ``/pigmy equip <pigmy-name>`` first!');

		// 	const makeCapital = (str) => { return str.charAt(0).toUpperCase() + str.slice(1) };
		// 	const tempType = makeCapital(toolType);

		// 	const theTool = await OwnedTools.findOne({ where: [{ spec_id: interaction.user.id }, { name: theToolName }, { activesubcategory: tempType}] });
		// 	if (theTool === 'NONE') return interaction.followUp('You do not have that tool! Check your tools with ``/myloot tools`` or create one using ``/blueprint view``');

		// 	let isOverwrite = true;
		// 	if (userPigmy[`${toolType}`] === 'NONE') {
		// 		isOverwrite = false;
		// 	} else if (userPigmy[`${toolType}`] === theToolName) return interaction.followUp(`${userPigmy.name} already has ${theToolName} as its ${toolType}!`);
		// 	console.log(specialInfoForm(`isOverwrite status: ${isOverwrite}`));

		// 	const acceptButton = new ButtonBuilder()
		// 		.setLabel("Yes")
		// 		.setStyle(ButtonStyle.Success)
		// 		.setEmoji('✅')
		// 		.setCustomId('accept');

		// 	const cancelButton = new ButtonBuilder()
		// 		.setLabel("No")
		// 		.setStyle(ButtonStyle.Danger)
		// 		.setEmoji('❌')
		// 		.setCustomId('cancel');

		// 	const interactiveButtons = new ActionRowBuilder().addComponents(acceptButton, cancelButton);

		// 	let confirmEmbed;

		// 	if (isOverwrite === true) {
		// 		confirmEmbed = {
		// 			title: `~OVERWRITE ${toolType}~`,
		// 			color: 0o0,
		// 			fields: [{ name: `${theTool.name}`, value: `Giving this will overwrite the current ${toolType}. Continue?` }],
		// 		};
		// 	} else if (isOverwrite === false) {
		// 		confirmEmbed = {
		// 			title: `~GIVE ${toolType}~`,
		// 			color: 0o0,
		// 			fields: [{ name: `${theTool.name}`, value: `Give this tool?` }],
		// 		};
		// 	}

		// 	const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [confirmEmbed] });

		// 	const filter = (i) => i.user.id === interaction.user.id;

		// 	const collector = embedMsg.createMessageComponentCollector({
		// 		ComponentType: ComponentType.Button,
		// 		filter,
		// 		time: 120000,
		// 	});

		// 	collector.on('collect', async (collInteract) => {
		// 		if (collInteract.customId === 'accept') {
		// 			await collInteract.deferUpdate();
		// 			const tableUpdated = await equipTool(userPigmy, theTool, toolType);
		// 			if (tableUpdated === 'Success') {
		// 				await interaction.followUp(`${toolType} Updated!`);
		// 				await collector.stop();
		// 			} else if (tableUpdated === 'Failure') {
		// 				await interaction.followUp('Something went wrong when giving that tool!');
		// 				await collector.stop();
		// 			}
		// 		}
		// 		if (collInteract.customId === 'cancel') {
		// 			await collInteract.deferUpdate();
		// 			await collector.stop();
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


		// 	async function equipTool(pigmy, tool, toolType) {
		// 		if (toolType === 'toy') {
		// 			const updateReturn = await Pigmy.update({
		// 				toy: tool.name,
		// 			}, { where: [{ spec_id: pigmy.spec_id }] });

		// 			if (updateReturn > 0) return 'Success';
		// 			return 'Failure';
		// 		}
		// 		if (toolType === 'hat') {
		// 			const updateReturn = await Pigmy.update({
		// 				hat: tool.name,
		// 			}, { where: [{ spec_id: pigmy.spec_id }] });

		// 			if (updateReturn > 0) return 'Success';
		// 			return 'Failure';
		// 		}
		// 		if (toolType === 'title') {
		// 			const updateReturn = await Pigmy.update({
		// 				title: tool.name,
		// 			}, { where: [{ spec_id: pigmy.spec_id }] });

		// 			if (updateReturn > 0) return 'Success';
		// 			return 'Failure';
		// 		}
		// 	}
		// }

		// if (interaction.options.getSubcommand() === 'claim') {
		// 	//if (interaction.user.id !== '501177494137995264') return interaction.reply('This command is under construction, please check back later!');
		// 	await interaction.deferReply();
		// 	//everything contained here needs to base off of the lcm value
		// 	const userPigmy = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });
		// 	if (!userPigmy) return await interaction.followUp('You have no pigmy equipped! Use the command ``/pigmy equip <pigmy-name>`` to equip one, or ``/pigmyshop`` to buy one!');
		// 	if (userPigmy.mood === 'Corrupted!') return await interaction.followUp(`${userPigmy.name} has been corrupted due to your negligence and refuses to help!`);

		// 	const then = userPigmy.lcm;
		// 	const now = new Date().getTime();

		// 	// 7,200,000ms is 2 hours
		// 	// Minimum time needed before claiming is possible
		// 	const timeDiff = Math.abs(now - then);
		// 	const timeLeft = Math.round(7200000 - timeDiff);
		// 	if (timeLeft > 0) {
		// 		let shownTime = now + timeLeft;
		// 		shownTime = Math.round(shownTime / 1000);
		// 		return await interaction.followUp(`${userPigmy.name} can claim again <t:${shownTime}:R>!`);
		// 	} else if (timeLeft <= 0) {
		// 		let hrs = Math.abs(Math.floor(timeLeft / (1000 * 60 * 60)));
		// 		console.log(specialInfoForm(`Hours since last claim: ${hrs}`));

		// 		// Set max claim hours to a default of 72
		// 		let maxClaimLength = 72;
		// 		if (userPigmy.level >= 25) {
		// 			//Every 5 pigmy levels allows for an additional 3 hours
		// 			maxClaimLength += Math.floor(3 * (userPigmy.level / 5) + 1);
		// 		}
		// 		console.log(specialInfoForm(`maxClaimLength: ${maxClaimLength}`));

		// 		if (hrs > maxClaimLength) {
		// 			hrs = maxClaimLength;
		// 		}

		// 		// MATERIAL DROP HANDLING HERE ============================
		// 		const pigmyHat = userPigmy.hat;
		// 		let hatMatBuff;
		// 		let hatMatTypeBuff;
		// 		if (pigmyHat === 'NONE') {
		// 			hatMatBuff = 0;
		// 			hatMatTypeBuff = 'NONE'
		// 		} else {
		// 			const filterPigmy = acToolEffects.filter(effect => effect.Name === 'Pigmy');
		// 			console.log(specialInfoForm(`Contents of Pigmy-SubCategory @ 1: ${filterPigmy[0]['SubCategory'][1][`${pigmyHat}`]}`));
		// 			//const filterSubCategory = filterPigmy.filter(subCat => subCat.Name === 'Hat');
		// 			const hatBuffObject = filterPigmy[0]['SubCategory'][1][`${pigmyHat}`];
		// 			hatMatBuff = hatBuffObject[0];
		// 			hatMatBuff = ~~hatMatBuff;
		// 			hatMatTypeBuff = hatBuffObject[1];
		// 		}

		// 		//console.log(specialInfoForm(`Contents of Pigmy-SubCategory @ 0: ${filterPigmy[0]['SubCategory'][0][`${pigmyToy}`]}`));
		// 		//const toyBuffObject = filterPigmy[0]['SubCategory'][0][`${pigmyToy}`];

		// 		console.log(specialInfoForm(`Current matBuff: ${hatMatBuff}\nCurrent matTypeBuff: ${hatMatTypeBuff}`));

		// 		let choices = ["slimy", "rocky", "woody", "skinny", "herby", "gemy", "magical", "metalic", "fleshy", "silky"];

		// 		let critChoices = [];
		// 		if (hatMatTypeBuff !== 'NONE') {
		// 			critChoices = critChoices.concat(hatMatTypeBuff);
		// 		}

		// 		var totPages = 0;

		// 		let matHrChoices = [];
		// 		let matsThisHr;

		// 		let matsToAdd = [];

		// 		let pigDiffHappy = Math.abs((100 - userPigmy.happiness) / 100);
		// 		let curRun = 0;
		// 		do {
		// 			matHrChoices = [];
		// 			var chanceChoiceONE = Math.floor(Math.random() * (choices.length - 1));
		// 			var chanceChoiceTWO = Math.floor(Math.random() * (choices.length - 1));

		// 			matHrChoices.push(choices[chanceChoiceONE]);
		// 			matHrChoices.push(choices[chanceChoiceTWO]);

		// 			// This is 5 + ((1-5) + (1 per 5 pig levels)
		// 			// Maximum 30 @ pigLevel 100
		// 			// Minimum 6 @ pigLevel 1
		// 			matsThisHr = 5 + (Math.floor(Math.random() * ((1 - 5) + 1) + Math.floor(userPigmy.level / 5)));

		// 			matsThisHr -= Math.floor(pigDiffHappy * matsThisHr);

		// 			if (matsThisHr <= 0) matsThisHr = 1;

		// 			var passType;
		// 			let listStr;

		// 			let matTypeChosen;
		// 			let rolledMatPos;
		// 			let foundRar;

		// 			let foundMaterialList;
		// 			let tmpMat = [];
		// 			for (var matRun = 0; matRun < matsThisHr; matRun++) {
		// 				tmpMat = [];

		// 				rolledMatPos = Math.floor(Math.random() * (matHrChoices.length - 1));
		// 				//console.log(specialInfoForm('rolledMatPos: ', rolledMatPos));
		// 				matTypeChosen = matHrChoices[rolledMatPos];



		// 				listStr = `${matTypeChosen}List.json`;
		// 				passType = `${matTypeChosen}`;

		// 				foundMaterialList = require(`../../events/Models/json_prefabs/materialLists/${listStr}`);

		// 				foundRar = await grabRar(userPigmy.level);

		// 				let matDropPool = foundMaterialList.filter(mat => mat.Rar_id === foundRar);
		// 				if (matDropPool.length > 0) {
		// 					tmpMat.push(matDropPool[0]);

		// 					var droppedNum = Math.floor(100 * ((userPigmy.level * 0.01) - ((foundRar * 0.02) + 0.02)));

		// 					if (droppedNum <= 0) {
		// 						droppedNum = 1;
		// 					}

		// 					droppedNum += hatMatBuff;

		// 					if (critChoices.length > 0) {
		// 						const isCrit = critChoices.filter(type => type === passType);
		// 						if (isCrit.length > 0) {
		// 							droppedNum *= 3;
		// 						}
		// 					}


		// 					var matNew = true;
		// 					for (const item of matsToAdd) {
		// 						if (item.Name === tmpMat[0].Name) {
		// 							matNew = false;
		// 							//console.log(basicInfoForm('DupeMat'));
		// 							item.Amount += droppedNum;
		// 							break;
		// 						}
		// 					}

		// 					if (matNew === true) {
		// 						console.log(basicInfoForm('BEFORE MAPPED NEW MAT: ', tmpMat[0].Name));

		// 						const mappedMat = await tmpMat.map(mat => ({ ...mat, Amount: droppedNum }),);

		// 						totPages += 1;

		// 						matsToAdd.push(...mappedMat);
		// 					}

		// 					var theMaterial = matDropPool[0];

		// 					const matStore = await MaterialStore.findOne({
		// 						where: [{ spec_id: interaction.user.id }, { mat_id: theMaterial.Mat_id }, { mattype: passType }]
		// 					});

		// 					if (matStore) {
		// 						droppedNum += matStore.amount;
		// 						await MaterialStore.update({ amount: droppedNum },
		// 							{
		// 								where: [{ spec_id: interaction.user.id }, { mat_id: theMaterial.Mat_id }, { mattype: passType }]
		// 							});

		// 						//const inc = 
		// 						//if (inc) console.log(successResult('Amount was UPDATED!'));
		// 					} else {
		// 						await MaterialStore.create({
		// 							name: theMaterial.Name,
		// 							value: theMaterial.Value,
		// 							mattype: passType,
		// 							mat_id: theMaterial.Mat_id,
		// 							rarity: theMaterial.Rarity,
		// 							rar_id: theMaterial.Rar_id,
		// 							amount: droppedNum,
		// 							spec_id: interaction.user.id
		// 						});

		// 						//const createdMat =
		// 						//if (createdMat) console.log(successResult('New Material Added!'));
		// 					}
		// 				}
		// 			}
		// 			curRun++;
		// 		} while (curRun < hrs)

		// 		let totXP = 0;
		// 		let totCoin = 0;

		// 		//Xp gained min and max is based on length of time since last claim
		// 		//And active pigmies level
		// 		const XpMax = ((userPigmy.level * 1.5) + (100 * hrs));
		// 		const XpMin = (((userPigmy.level * 1.5) + (100 * hrs)) - 75);

		// 		//calculate xp gained and add to overall total
		// 		let xpGained = Math.floor(Math.random() * (XpMax - XpMin + 1) + XpMin);
		// 		console.log(specialInfoForm(`Gained xp before applying buffs: ${xpGained}`));
		// 		//Give boost per the following formula
		// 		//xpGained = xpGained * 1 + ((-1) * (2 * hrs) ** 0.4 + 3.7);
		// 		//add to total
		// 		totXP += xpGained;

		// 		//MODIFY XP GAIN BASED ON TITLE EQUIPPED
		// 		const pigmyTitle = userPigmy.title;
		// 		let titlePigmyBuff;
		// 		let titlePlayerBuff;
		// 		if (pigmyTitle === 'NONE') {
		// 			titlePigmyBuff = 0;
		// 			titlePlayerBuff = 0;
		// 		} else {
		// 			const filterPigmy = acToolEffects.filter(effect => effect.Name === 'Pigmy');
		// 			console.log(specialInfoForm(`Contents of Pigmy-SubCategory @ 2: ${filterPigmy[0]['SubCategory'][2][`${pigmyTitle}`]}`));
		// 			//const filterSubCategory = filterPigmy.filter(subCat => subCat.Name === 'Title');
		// 			const titleBuffObject = filterPigmy[0]['SubCategory'][2][`${pigmyTitle}`];
		// 			titlePigmyBuff = titleBuffObject[0];
		// 			titlePigmyBuff *= 1;
		// 			titlePlayerBuff = titleBuffObject[1];
		// 			titlePlayerBuff *= 1;
		// 		}

		// 		console.log(specialInfoForm(`Current pigmy titleBuff: ${titlePigmyBuff}\nCurrent player titleBuff: ${titlePlayerBuff}`));
		// 		console.log(specialInfoForm(`Total xp before applying buffs: ${totXP}`));

		// 		if (titlePlayerBuff !== 0) {
		// 			totXP = Math.floor(totXP + (totXP * titlePlayerBuff));
		// 		}
		// 		totXP = Math.round(totXP);
		// 		console.log(basicInfoForm(`Total XP gained after rounding, before happiness reduce: ${totXP}`));

		// 		//Calculate cointotal
		// 		let cGained = (((xpGained - 5) * 1.2) + 1);
		// 		totCoin += cGained;
		// 		totCoin = Math.round(totCoin);
		// 		console.log(basicInfoForm(`Total Coins gained after rounding, before happiness reduce: ${totCoin}`));

		// 		//calculate pigmy xp gained
		// 		let pigXp = Math.floor(xpGained * (100 * ((userPigmy.level / 6) * 0.005)));
		// 		if (titlePigmyBuff !== 0) {
		// 			pigXp = Math.floor(pigXp + (pigXp * titlePigmyBuff));
		// 		}
		// 		pigXp = Math.round(pigXp);
		// 		console.log(basicInfoForm(`Total Pigmy XP gained after rounding, before happiness reduce: ${pigXp}`));

		// 		//==============================
		// 		//	Alter final results based on happiness of the pigmy
		// 		//	pigDiffHappy
		// 		//	matsThisHr -= Math.floor(pigDiffHappy * matsThisHr);
		// 		let newHappiness = userPigmy.happiness;
		// 		if (userPigmy.happiness < 85) {
		// 			totXP -= Math.floor(pigDiffHappy * totXP);
		// 			totCoin -= Math.floor(pigDiffHappy * totCoin);
		// 			pigXp -= Math.floor(pigDiffHappy * pigXp);
		// 			newHappiness -= (10 + (hrs / 24));
		// 		} else {
		// 			newHappiness -= (10 + (hrs / 24));
		// 		}

		// 		const pigmyHappyStr = await updateHappiness(userPigmy, newHappiness);

		// 		const extraEXP = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, { activec: 'EXP' }] });
		// 		if (extraEXP) {
		// 			if (extraEXP.duration > 0) {
		// 				totXP += totXP * extraEXP.curreffect;
		// 			}
		// 		}

		// 		totXP = Math.round(totXP);
		// 		console.log(basicInfoForm(`Total XP gained after rounding, after happiness reduce: ${totXP}`));
		// 		totCoin = Math.round(totCoin);
		// 		console.log(basicInfoForm(`Total Coins gained after rounding, after happiness reduce: ${totCoin}`));
		// 		pigXp = Math.round(pigXp);
		// 		console.log(basicInfoForm(`Total Pigmy XP gained after rounding, after happiness reduce: ${pigXp}`));


		// 		//==============================
		// 		//Basic levelup check for user, ending with updating xp and coins in database
		// 		await isLvlUp(totXP, totCoin, interaction);

		// 		//==============================
		// 		//Next check if pigmy passes levelup
		// 		await isPigLvlUp(pigXp, userPigmy, interaction, true);

		// 		//==============================
		// 		//Generate the rewards embed and prep for user
		// 		const rewards = `${userPigmy.name} has collected: \n**For you** \n${totCoin}c \n${totXP}xp \n**For ${userPigmy.name}** \n${pigXp}xp`;
		// 		const dynDes = `After searching tirelessly for hours ${userPigmy.name} had success!`;

		// 		hrs = Math.floor(hrs);

		// 		const pigClaimEmbed = new EmbedBuilder()
		// 			.setTitle('==**YOU CLAIMED REWARDS**==')
		// 			.setDescription(dynDes)
		// 			.setColor(0o0)
		// 			.addFields(
		// 				{
		// 					name: `Rewards after ${hrs}hours`,
		// 					value: rewards
		// 				},
		// 				{
		// 					name: `${userPigmy.name} is now:`,
		// 					value: `${pigmyHappyStr}!`
		// 				});
		// 		await interaction.followUp({ embeds: [pigClaimEmbed] }).then(async pigClaimEmbed => setTimeout(() => {
		// 			pigClaimEmbed.delete();
		// 		}, 100000)).catch(console.error);

		// 		const backButton = new ButtonBuilder()
		// 			.setLabel("Back")
		// 			.setStyle(ButtonStyle.Secondary)
		// 			.setEmoji('◀️')
		// 			.setCustomId('back-page');

		// 		const finishButton = new ButtonBuilder()
		// 			.setLabel("Finish")
		// 			.setStyle(ButtonStyle.Success)
		// 			.setEmoji('*️⃣')
		// 			.setCustomId('delete-page');

		// 		const forwardButton = new ButtonBuilder()
		// 			.setLabel("Forward")
		// 			.setStyle(ButtonStyle.Secondary)
		// 			.setEmoji('▶️')
		// 			.setCustomId('next-page');

		// 		const interactiveButtons = new ActionRowBuilder().addComponents(backButton, finishButton, forwardButton);

		// 		const rarityTypes = ["Common", "Uncommon", "Rare", "Very Rare", "Epic", "Mystic", "?", "??", "???", "????"];

		// 		let fullRarList;
		// 		let rarCheckNum = 0;

		// 		let embedColour;
		// 		let matListings;

		// 		let embedPages = [];

		// 		let pageRun = 0;
		// 		do {
		// 			fullRarList = matsToAdd.filter(mat => mat.Rarity === rarityTypes[rarCheckNum]);
		// 			if (fullRarList.length <= 0) {
		// 				//There are no mats of this rarity, check next Rarity
		// 				rarCheckNum++;
		// 			} else {
		// 				embedColour = await grabColour(rarCheckNum);
		// 				let breakPoint = 0;
		// 				for (const matCheck of fullRarList) {
		// 					matListings = `Value: ${matCheck.Value}\nRarity: ${matCheck.Rarity}\nAmount: ${matCheck.Amount}`;

		// 					const theMaterialEmbed = new EmbedBuilder()
		// 						.setTitle('~Material Dropped~')
		// 						.setDescription(`Page ${(pageRun + 1)}/${totPages}`)
		// 						.setColor(embedColour)
		// 						.addFields({
		// 							name: `${matCheck.Name}`,
		// 							value: matListings
		// 						});

		// 					embedPages.push(theMaterialEmbed);
		// 					pageRun++;
		// 					breakPoint++;
		// 					if (breakPoint === fullRarList.length) break;
		// 				}
		// 				rarCheckNum++;
		// 			}
		// 		} while (pageRun < matsToAdd.length)

		// 		const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

		// 		const filter = (ID) => ID.user.id === interaction.user.id;

		// 		const collector = embedMsg.createMessageComponentCollector({
		// 			componentType: ComponentType.Button,
		// 			filter,
		// 			time: 300000,
		// 		});

		// 		var currentPage = 0;

		// 		collector.on('collect', async (collInteract) => {
		// 			if (collInteract.customId === 'next-page') {
		// 				await collInteract.deferUpdate().then(async () => {
		// 					if (currentPage === embedPages.length - 1) {
		// 						currentPage = 0;
		// 						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
		// 					} else {
		// 						currentPage += 1;
		// 						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
		// 					}
		// 				}).catch(error => {
		// 					console.log(errorForm(error));
		// 				});
		// 			}

		// 			if (collInteract.customId === 'back-page') {
		// 				await collInteract.deferUpdate().then(async () => {
		// 					if (currentPage === 0) {
		// 						currentPage = embedPages.length - 1;
		// 						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
		// 					} else {
		// 						currentPage -= 1;
		// 						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
		// 					}
		// 				}).catch(error => {
		// 					console.log(errorForm(error));
		// 				});
		// 			}

		// 			if (collInteract.customId === 'delete-page') {
		// 				await collInteract.deferUpdate();
		// 				await collector.stop();
		// 			}
		// 		});

		// 		collector.on('end', () => {
		// 			if (embedMsg) {
		// 				embedMsg.delete().catch(error => {
		// 					if (error.code !== 10008) {
		// 						console.error('Failed to delete the message:', error);
		// 					}
		// 				});
		// 			}
		// 		});
		// 	}
		// }

		if (interaction.options.getSubcommand() === 'inspect') {
			//if (interaction.user.id !== '501177494137995264') return interaction.reply('This command is under construction, please check back later!');
			await interaction.deferReply();
			const userPigmy = await Pigmy.findOne({ where: [{ spec_id: interaction.user.id }] });
			if (!userPigmy) {
				return interaction.followUp('You have no pigmy equipped! Use command ``/pigmy equip <pigmy-name>`` to equip one.');
			}
			if (userPigmy.mood === 'Corrupted!') return interaction.followUp(`${userPigmy.name} has been corrupted, and will remain in the darkness!`);
			/**
			 * TO DO
			 * 
			 * ALTER TEXT TO FIT CONSITANTLY WITH CHANGING VALUES 
			 * 
			 * MAYBE TRY SETTING DIFFERENT STATS TO DIFFERENT LOCATIONS
			 * 
			 * */
			let pigRef = pigmyList.filter(pig => pig.ID === userPigmy.refid);

			const canvas = Canvas.createCanvas(700, 250);
			const context = canvas.getContext('2d');

			// Pass the entire Canvas object because you'll need access to its width and context
			const applyText = (canvas, text, txtType) => {
				const context = canvas.getContext('2d');

				// Declare a base size of the font
				let fontSize;
				let minusVal;
				if (txtType === 'Name') {
					fontSize = 70;
					minusVal = 300;
				} else if (txtType === 'Title') {
					fontSize = 70;
					minusVal = 500;
				} else if (txtType === 'Stats') {
					fontSize = 60;
					minusVal = 150;
				} else if (txtType === 'Types') {
					fontSize = 55;
					minusVal = 150;
				} else if (txtType === 'Equip') {
					fontSize = 60;
					minusVal = 300;
				}


				do {
					// Assign the font to the context and decrement it so it can be measured again
					context.font = `${fontSize -= 10}px sans-serif`;
					// Compare pixel width of the text to the canvas minus the approximate avatar size
				} while (context.measureText(text).width > canvas.width - minusVal);

				// Return the result to use in the actual canvas
				return context.font;
			};
			// This uses the canvas dimensions to stretch the image onto the entire canvas
			const background = await Canvas.loadImage(pigRef[0].BackRef);
			context.drawImage(background, 0, 0, canvas.width, canvas.height);


			let fillColourTitle;
			let fillColourEquip;
			//assign values to be used on the canvas
			const pigStuffOne = `Level: ${userPigmy.level}   XP: ${userPigmy.exp}   Mood: ${userPigmy.mood}`;

			const pigStuffTwo = `Type: ${userPigmy.type}   Buffs: ${pigRef[0].Buff}`;

			const pigStuffThree = `Toy: ${userPigmy.toy}  Hat: ${userPigmy.hat}`;

			// Assign the decided font to the canvas
			context.font = applyText(canvas, `${userPigmy.name}`, 'Name');
			context.fillStyle = '#ffffff';
			context.fillText(`${userPigmy.name}`, canvas.width / 3.1, canvas.height / 3);

			if (userPigmy.title !== 'NONE') {
				// Assign the decided font to the canvas
				context.font = applyText(canvas, `${userPigmy.title}`, 'Title');
				//=====================================
				let foundRar = 0;
				const bpFiltered = blueprintList.filter(bluey => bluey.Name === userPigmy.title);
				foundRar = bpFiltered[0].Rar_id;
				fillColourTitle = await grabColour(foundRar, true);// This will be updated to include varying rarids from titles
				
				context.fillStyle = `${fillColourTitle}`;
				//=====================================
				context.fillText(`${userPigmy.title}`, 10, canvas.height / 3);
            }
			
			// Slightly smaller text placed below and to the left of the pigmy's display name
			context.font = applyText(canvas, pigStuffOne, 'Stats');
			context.fillStyle = '#ffffff';
			context.fillText(pigStuffOne, canvas.width / 4.5, canvas.height / 1.7);

			// Slightly smaller text placed below and to the left of the pigmy's display name
			context.font = applyText(canvas, pigStuffTwo, 'Types');
			context.fillStyle = '#ffffff';
			context.fillText(pigStuffTwo, canvas.width / 4.5, canvas.height / 1.4);

			if (userPigmy.toy === 'NONE' && userPigmy.hat === 'NONE') {

			} else {
				// Slightly smaller text placed below and to the left of the pigmy's display name
				context.font = applyText(canvas, pigStuffThree, 'Equip');
				//=====================================
				let foundRar = 0;
				let bpFiltered = blueprintList.filter(bluey => bluey.Name === userPigmy.toy);
				if (bpFiltered.length <= 0) bpFiltered = bpFiltered.filter(bluey => bluey.Name === userPigmy.hat);
				foundRar = (bpFiltered.length <= 0) ? 0 : bpFiltered[0].Rar_id;
				fillColourEquip = await grabColour(foundRar, true);// This will be updated to include varying rarids from titles
				context.fillStyle = `${fillColourEquip}`;
				//=====================================
				context.fillText(pigStuffThree, canvas.width / 4.5, canvas.height / 1.1);
            }
			

			//grab reference to the pigmy in question and load it onto the canvas
			const pigmyImage = await Canvas.loadImage(pigRef[0].PngRef);
			context.drawImage(pigmyImage, 10, 60, 200, 200);

			const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'pigmy-image.png' });

			interaction.followUp({ files: [attachment] }).then(async pigCanvas => setTimeout(() => {
				pigCanvas.delete();
			}, 60000)).catch(console.error);
		}

		// if (interaction.options.getSubcommand() === 'play') {
		// 	//if (interaction.user.id !== '501177494137995264') return interaction.reply('This command is under construction, please check back later!');
		// 	await interaction.deferReply();
		// 	/**
		// 			How does happiness effect gameplay?
		// 				- Increase/Decrease rewards where pigmies are used
		// 				- Increases/Decreases time it takes to be able to claim from pigmy
		// 				- Gives the user a sense of purpose and duty to their pigmy

		// 			How does "Playing" effect the pigmy?
		// 				- Increases happiness
		// 				- Gives a small amount of xp to the pigmy
		// 				- Possible chance for pigmy to drop a weapon

		// 			What restrictions/Limits will be in place?
		// 				- Set limit of play chances per day?
		// 				- If pigmy is max happiness play is prevented
		// 				- Very low chance of item drop
					
		// 			How can the user play?
		// 				- Prompt user with a mini game 
		// 				- Mini game chosen by the pigmy
		// 				- Start with 2 mini games once code base is working
		// 	 */

		// 	//First set a limit to play chances
		// 	//Second handle the interaction
		// 	//Third update the database
		// 	//Fourth display to user the outcome 
		// 	const userPigmy = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });
		// 	if (!userPigmy) return await interaction.followUp('You have no pigmy equipped! Use ``/pigmy equip <pigmy-name>`` to change that!');
		// 	if (!userPigmy.tomorrow) {
		// 		await setTomorrow(userPigmy);
		// 	}
		// 	const playCheck = await checkTomorrow(userPigmy);

		// 	if (playCheck === 5) return interaction.followUp(`${userPigmy.name} has refused to play anymore today!!`);
		// 	if (userPigmy.happiness === 100) return interaction.followUp(`${userPigmy.name} is already the happiest pigmy around!`);

		// 	const pigmyToy = userPigmy.toy;
		// 	console.log(specialInfoForm(`Current pigmy toy: ${pigmyToy}`));
		// 	let happyInc = 10;
		// 	let newHappy = userPigmy.happiness;
		// 	if (pigmyToy === 'NONE') {
		// 		console.log(failureResult('NO TOY'));
		// 		happyInc += 0;
		// 	} else {
		// 		const filterPigmy = acToolEffects.filter(effect => effect.Name === 'Pigmy');
		// 		console.log(specialInfoForm(`Length of filterPigmy: ${filterPigmy.length}`));
		// 		console.log(specialInfoForm(`Contents of Pigmy-SubCategory @ 0: ${filterPigmy[0]['SubCategory'][0][`${pigmyToy}`]}`));
		// 		//console.log(specialInfoForm(`Contents of Pigmy-SubCategory @ 0: ${filterPigmy[0]['SubCategory'][1]}`));
				

		// 		//const filterSubCategory = filterPigmy.filter(subCat => subCat.Name === 'Toy');
		// 		//console.log(specialInfoForm(`Length of filterSubCategory: ${filterSubCategory.length}`));
		// 		//console.log(specialInfoForm(`Contents of filtersubCategory @ ${pigmyToy} ${filterSubCategory[`${pigmyToy}`]}`));

		// 		const toyBuffObject = filterPigmy[0]['SubCategory'][0][`${pigmyToy}`];
		// 		console.log(specialInfoForm(`Toy buff from filterSubCategory: ${toyBuffObject}`));
		// 		happyInc += toyBuffObject;
		// 	}

		// 	newHappy += happyInc;
		// 	console.log(specialInfoForm2(`newHappy is now ${newHappy}`));
		// 	if (newHappy > 100) newHappy = 100;

		// 	let moodChange = await updateHappiness(userPigmy, newHappy);
		// 	console.log(specialInfoForm2(`moodChange is now ${moodChange}`));
		// 	if (moodChange === 'NOMOOD') {
		// 		return interaction.followUp('Something went wrong while playing!');
		// 	} else {
		// 		const incPlay = playCheck + 1;
		// 		await updatePlayCount(userPigmy, incPlay);

		// 		const playTextChoices = ['Awwe how cute!', 'What joy!', 'They loved it!', 'Too bad cameras dont exist yet!'];
		// 		const theChoiceNum = Math.floor(Math.random() * (playTextChoices.length - 1));

		// 		const altPlayText = playTextChoices[theChoiceNum];

		// 		let playedWithVal;
		// 		if (pigmyToy === 'NONE') {
		// 			playedWithVal = 'Doesnt have a toy to play with..';
		// 		} else {
		// 			playedWithVal = `Played with their ${pigmyToy}. ${altPlayText}`;
		// 		}

		// 		const playEmbed = new EmbedBuilder()
		// 			.setTitle(`~PLAYTIME~`)
		// 			.setColor(0o0)
		// 			.setFields(
		// 				{
		// 					name: `${userPigmy.name}`, value: playedWithVal,
		// 				},
		// 				{
		// 					name: `Current mood: `, value: `${moodChange}`,
		// 				});
		// 		await interaction.followUp({ embeds: [playEmbed] }).then(async playEmbed => setTimeout(() => {
		// 			playEmbed.delete();
		// 		}, 20000)).catch(console.error);
        //     }
		// }

		// if (interaction.options.getSubcommand() === 'rename') {
		// 	//if (interaction.user.id !== '501177494137995264') return interaction.reply('This command is under construction, please check back later!');
		// 	await interaction.deferReply();
		// 	const newpigname = interaction.options.getString('new-name');
		// 	const lengthCheck = newpigname.length;
		// 	if (lengthCheck > 25) return await interaction.followUp('That name is too long, the maximum length is 25 characters!');

		// 	let userPigmy = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });
		// 	if (!userPigmy) return await interaction.followUp('You have not equipped a pigmy! Use ``/pigmy equip <pigmy-name>`` to equip one, or ``/pigmyshop`` to buy one!');
		// 	if (userPigmy.mood === 'Corrupted!') return await interaction.followUp(`${userPigmy.name} has been corrupted, they will accept no name from you!`);

		// 	const passCheck = await editPigName(userPigmy, newpigname);
		// 	if (passCheck === 'Updated') {
		// 		userPigmy = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });
		// 		let pigRef = pigmyList.filter(pig => pig.ID === userPigmy.refid);

		// 		const pigmyInfoStr = `Level: ${userPigmy.level} \nXP: ${userPigmy.exp} \nType: ${userPigmy.type} \nMood: ${userPigmy.mood} \nBuffs: ${pigRef[0].Buff}`

		// 		const pigEmbed = new EmbedBuilder()
		// 			.setColor(0o0)
		// 			.setTitle(`${interaction.user.username}'s Pigmy`)
		// 			.setImage(pigRef[0].Image)
		// 			.addFields(
		// 				{
		// 					name: `New name: ${userPigmy.name}`,
		// 					value: pigmyInfoStr,
		// 				});
		// 		await interaction.followUp({ embeds: [pigEmbed], files: [pigRef[0].PngRef] }).then(async pigEmbed => setTimeout(() => {
		// 			pigEmbed.delete();
		// 		}, 60000)).catch(console.error);

		// 	} else if (passCheck === 'Failure') {
		// 		return await interaction.followUp('Something went wrong while renaming, please try again.');
		// 	}
		// }


		//========================================
		//This method updates the name of both the active pigmy and its pighouse counterpart 
		// async function editPigName(pig, newpigname) {
		// 	const activePig = await Pigmy.update({ name: newpigname }, { where: { spec_id: interaction.user.id } });
		// 	const housePig = await Pighouse.update({ name: newpigname }, { where: { spec_id: interaction.user.id, refid: pig.refid } });

		// 	if (activePig > 0 && housePig > 0) {
		// 		console.log(successResult('Both checks passed, name updated successfully!'));
		// 		return 'Updated';
		// 	} else return 'Failure';
		// }

		//========================================
		// This method sets the date of tomorrow with the refrence of today
		// async function setTomorrow(pigmy) {
		// 	//	Give refrence to what day is today 
		// 	// Set what day is tomorrow in the pigmy database
		// 	// Use that date to know when to reset play chances
		// 	const today = new Date();
		// 	const tomorrow = new Date(today);
		// 	tomorrow.setDate(tomorrow.getDate() + 1);
		// 	tomorrow.setHours(0, 0, 0, 0);

		// 	const newDay = tomorrow.getTime();
		// 	console.log(newDay);

		// 	const activePig = await Pigmy.update({ tomorrow: newDay }, { where: { spec_id: interaction.user.id } });
		// 	const housePig = await Pighouse.update({ tomorrow: newDay }, { where: { spec_id: interaction.user.id, refid: pigmy.refid } });

		// 	if (activePig > 0) {
		// 		if (housePig > 0) {

		// 			return console.log('Both checks passed, the day that is next has been set/updated!');
		// 		}
		// 	}
		// }

		//========================================
		// This method sets the date of tomorrow with the refrence of today
		// async function checkTomorrow(pigmy) {
		// 	const today = new Date();
		// 	console.log(today.getTime());
		// 	console.log(pigmy.tomorrow);

		// 	if (pigmy.tomorrow <= today.getTime()) {
		// 		// Its been a day time to reset play count!
		// 		console.log('IS TOMORROW!');
		// 		await setTomorrow(pigmy);
		// 		await updatePlayCount(pigmy, 0);
		// 		return 0;
		// 	} else {
		// 		// Not tomorrow current playcount is valid
		// 		console.log('IS STILL TODAY!');
		// 		return pigmy.playcount;
		// 	}
		// }

		//========================================
		// This method increments play count of both the active pigmy and its pighouse counterpart
		// async function updatePlayCount(pigmy, currentplay) {
		// 	const activePig = await Pigmy.update({ playcount: currentplay }, { where: { spec_id: interaction.user.id } });
		// 	const housePig = await Pighouse.update({ playcount: currentplay }, { where: { spec_id: interaction.user.id, refid: pigmy.refid } });
		// 	if (activePig > 0) {
		// 		if (housePig > 0) {

		// 			return console.log('Both checks passed, Play count has been updated!');
		// 		}
		// 	}
		// }

		//========================================
		//This method updates the happiness of both the active pigmy and its pighouse counterpart
		// async function updateHappiness(pigmy, newHappiness) {
		// 	let newMood;
		// 	if (newHappiness === 100) {
		// 		//Pigmy is fantasitc!
		// 		newMood = 'Fantastic!';
		// 	} else if (newHappiness < 10) {
		// 		//Pigmy is Corrupted!
		// 		newMood = 'Corrupted!';
		// 	} else if (newHappiness <= 25) {
		// 		//Pigmy is Dejected
		// 		newMood = 'Dejected';
		// 	} else if (newHappiness <= 40) {
		// 		//Pigmy is Unhappy
		// 		newMood = 'Unhappy';
		// 	} else if (newHappiness <= 50) {
		// 		//Pigmy is Uneasy
		// 		newMood = 'Uneasy';
		// 	} else if (newHappiness <= 75) {
		// 		//Pigmy is Content
		// 		newMood = 'Content';
		// 	} else if (newHappiness <= 90) {
		// 		//Pigmy is Happy!
		// 		newMood = 'Happy!';
		// 	} else if (newHappiness < 100) {
		// 		//Pigmy is Happy!
		// 		newMood = 'Happy!';
		// 	}

		// 	const activePig = await Pigmy.update({ happiness: newHappiness, mood: newMood }, { where: { spec_id: interaction.user.id } });
		// 	const housePig = await Pighouse.update({ happiness: newHappiness, mood: newMood }, { where: { spec_id: interaction.user.id, refid: pigmy.refid } });

		// 	if (activePig > 0) {
		// 		if (housePig > 0) {
		// 			console.log('Both checks passed, Happiness and Mood updated!');
		// 			return newMood;
		// 		} else return 'NOMOOD';
		// 	} else return 'NOMOOD';
		// }
	},
};
