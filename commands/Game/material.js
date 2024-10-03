const { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuOptionBuilder, StringSelectMenuBuilder } = require('discord.js');
const { MaterialStore, UserData } = require('../../dbObjects');

const {
	warnedForm,
	errorForm,
	successResult,
	failureResult,
	basicInfoForm,
	specialInfoForm
} = require('../../chalkPresets.js');
const { grabColour } = require('./exported/grabRar');
const { checkHintMaterialDismantle } = require('./exported/handleHints.js');

const { NavMenu } = require('../Development/Export/Classes/NavMenu.js');
const { grabUser, createInteractiveChannelMessage, handleCatchDelete, makeCapital, createConfirmCancelButtonRow, editTimedChannelMessage } = require('../../uniHelperFunctions.js');
const { loadBasicBackButt } = require('./exported/tradeExtras.js');
const { loadFullDismantleList, loadFullRarNameList, convertRarToID, baseCheckRarName } = require('../Development/Export/itemStringCore.js');
const { convertOldMatStore } = require('./exported/materialContainer.js');
const { loadDefaultAmountButtonActionRows, fnSignConverter } = require('../../uniDisplayFunctions.js');
const { checkInboundMat } = require('../Development/Export/itemMoveContainer.js');

module.exports = {
	helptypes: ['Material'],
	data: new SlashCommandBuilder()
	.setName('material')
	.setDescription('Material options!')
	.addSubcommand(subcommand => 
		subcommand
		.setName('actions')
		.setDescription('Loads the material Action Menu!')
	),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);

		let choices = [];

		if (focusedOption.name === 'type') {
			const focusedValue = interaction.options.getFocused(false);

			choices = ["slimy", "rocky", "woody", "skinny", "herby", "gemy", "magical", "metalic", "fleshy", "silky", "tooly"];

			//Mapping the complete list of options for discord to handle and present to the user
			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}

		if (focusedOption.name === 'typeview') {
			const focusedValue = interaction.options.getFocused(false);

			choices = ["slimy", "rocky", "woody", "skinny", "herby", "gemy", "magical", "metalic", "fleshy", "silky", "tooly", "unique"];

			//Mapping the complete list of options for discord to handle and present to the user
			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}

		if (focusedOption.name === 'rarity') {
			const focusedValue = interaction.options.getFocused(false);

			choices = ["common", "uncommon", "rare", "very rare", "epic", "mystic", "?", "??", "???", "????"];

			//Mapping the complete list of options for discord to handle and present to the user
			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}
    },
	async execute(interaction) { 
		// if (interaction.user.id !== '501177494137995264') return interaction.reply({content: 'This command is under construction! Sorry!', ephemeral: true});

		const subCom = interaction.options.getSubcommand();
		if (subCom !== 'actions') return await interaction.reply({content: 'This feature is either under construction or going to be removed!! Use `/material actions` instead!', ephemeral: true});

		const user = await grabUser(interaction.user.id);

		// /**
		//  * @typedef {{ actionType: string, matType: string, matStore: any | {[s:string]: number}, 
		//  * outcomeStore: any | {materials: FCombStore | FDisStore, materialLimit: number}, 
		//  * rarity: {target: string, extra: string}, targetAmount: number}} extraSpecs
		//  * */
		// /**@type {extraSpecs} */
		const matExtras = {
			actionType: "",
			matType: "",
			matStore: {

			},
			outcomeStore: {

			},
			rarity: {
				target: "",
				extra: ""
			},
			targetAmount: 0
		};

		// Material Action?
		// ================
		// COMBINE || DISMANTLE || **ADVANCED** (Add later)
		const matActionEmbed = new EmbedBuilder()
		.setTitle('== Material Actions ==');

		const matCombButt = new ButtonBuilder()
		.setCustomId('mat-combine')
		.setStyle(ButtonStyle.Primary)
		.setLabel('Combine Material');

		const matDisButt = new ButtonBuilder()
		.setCustomId('mat-dismantle')
		.setStyle(ButtonStyle.Primary)
		.setLabel('Dismantle Material');

		const matActionRow = new ActionRowBuilder().addComponents(matCombButt, matDisButt);

		// Material Type?
		// ==============
		const matTypeEmbed = new EmbedBuilder()
		.setTitle('== Material Type ==');

		// Target Material Rarity?
		// =======================
		const matRarTargetEmbed = new EmbedBuilder()
		.setTitle('== Target Rarity ==');

		// Amount Selection?
		// =================
		const amountSelectEmbed = new EmbedBuilder()
		.setTitle('== Amount Desired ==')
		.setDescription('Amount Currently Selected: 0');

		const confirmActionEmbed = new EmbedBuilder()
		.setTitle('== PlaceHolder Confirm ==');

		// 		===============
		// SENDING INITIAL DISPLAY HERE
		// 		===============
		const replyObj = { embeds: [matActionEmbed], components: [matActionRow] };

		const {anchorMsg, collector, sCollector} = await createInteractiveChannelMessage(interaction, 900000, replyObj, "Reply", "Both");

		// Base NavMenu
		const matMenu = new NavMenu(user, replyObj, replyObj.components, matExtras);

		/**
		 * This function loads the material type selection menu
		 * @returns {[ActionRowBuilder<StringSelectMenuBuilder>, ActionRowBuilder<ButtonBuilder>]}
		 */
		function loadMaterialTypeStringSelectRow(){
			// LOAD FROM DIS LIST
			const matTypeOptions = [];
			for (const mt of loadFullDismantleList()){
				const option = new StringSelectMenuOptionBuilder()
				.setValue(mt)
				.setDescription(`${makeCapital(mt)} Type Materials`)
				.setLabel(makeCapital(mt));
				matTypeOptions.push(option);
			}
			const matTypeSelection = new StringSelectMenuBuilder()
			.setCustomId('mat-type')
			.setPlaceholder('Select a material type!')
			.addOptions(matTypeOptions);

			const matTypeRow = new ActionRowBuilder().addComponents(matTypeSelection);
			const matTypeBackRow = loadBasicBackButt('type');

			return [matTypeRow, matTypeBackRow];
		}

		const grabFormatedUserMatStore = async t => await convertOldMatStore(interaction, t);

		// AFTER MATTYPE HAS BEEN PICKED!!
		// IF COMB
		// Check if any rar amount > 5
		/**
		 * This function checks if any materials of the selected type are able to 
		 * be combined. 
		 * 
		 * If not combine not possible, this return should halt menu progression.
		 * @param {object} store Material Store Object of Type Picked `matMenu.specs.matType`
		 * @returns {boolean}
		 */
		const canComb = store => {
			const moreThanFive = Object.values(store)
			.reduce((acc, v) => {
				if (acc) return acc;
				return acc = (v >= 5);
			}, false);
			return moreThanFive;
		};

		// IF DIS
		// Check if any amount > 0
		/**
		 * This function checks if any materials of the selected type exist.
		 * 
		 * If not, this return should halt menu progression
		 * @param {object} store Material Store Object of Type Picked `matMenu.specs.matType`
		 * @returns {boolean}
		 */
		const canDis = store => {
			const hasAny = Object.values(store)
			.reduce((acc, v) => {
				if (acc) return acc;
				return acc = (v > 0);
			}, false);
			return hasAny;
		};

		/**
		 * This function loads the rarity selection menu, uses the selected `actionType` 
		 * of the given `matMenu.specs.actionType` for filtering, as well as using
		 * `matMenu.specs.matType` for display.
		 * @param {NavMenu} matMenu Material NavMenu
		 * @returns {[ActionRowBuilder<StringSelectMenuBuilder>, ActionRowBuilder<ButtonBuilder>]}
		 */
		function loadMaterialRarStringSelectRow(matMenu){
			// LOAD FROM RAR LIST
			const matTypeStaticList = interaction.client.materials.get(matMenu.specs.matType);
			let highestStaticMatTypeRar = matTypeStaticList.sort((a, b) => b.Rar_id - a.Rar_id)[0].Rar_id; // + (matMenu.specs.actionType === 'combine')
			const menuActionType = matMenu.specs.actionType;

			// Cap at rar 10 for now. Will be replaced with Boss progress unlock conditions
			if (highestStaticMatTypeRar > 10){
				if (menuActionType === 'combine'){
					highestStaticMatTypeRar = 10;
				} else highestStaticMatTypeRar = 9;
			}
			// IF COMB
			// NO COMMON FOR COMB
			const baseMatRarOptions = [];
			for (const rn of loadFullRarNameList(highestStaticMatTypeRar)){
				if (menuActionType === 'combine' && rn === 'Common') continue;
				const option = new StringSelectMenuOptionBuilder()
				.setValue(rn)
				.setDescription(`${rn} ${makeCapital(matMenu.specs.matType)} material`)
				.setLabel(rn);
				baseMatRarOptions.push(option);
			}
			const matRarSelection = new StringSelectMenuBuilder()
			.setCustomId('mat-rar')
			.setPlaceholder('Select a material rarity!')
			.addOptions(baseMatRarOptions);

			const matRarRow = new ActionRowBuilder().addComponents(matRarSelection);
			const matRarBackRow = loadBasicBackButt('rar');
			// IF DIS
			// Second rar menu for max rar to dis from?

			return [matRarRow, matRarBackRow];
		}

		/**
		 * This function filters the full userMaterialStorage object, 
		 * the filter function used depends on the given `actionType`.
		 * 
		 * `Action = "combine"`: `["k"] <= targetRID`
		 * 
		 * `Action = "dismantle"`: `["k"] >= targetRID`
		 * 
		 * Returns a constructed object with the filtered props
		 * @param {{[s: string]: number}} typedMatStore Owned Material Storage Object
		 * @param {number} targetRID Targeted Material Rarity
		 * @param {string} actionType The user selected material action, one of: `combine` or `dismantle`
		 * @returns {{[s: string]: number}} Filtered Owned Material Storage Object
		 */
		function restructUserMatStorage(typedMatStore, targetRID, actionType){
			const combFilter = k => +k <= targetRID;
			const disFilter = k => +k >= targetRID && +k < 13;
			const matchesFilter = (actionType === 'combine') 
			? combFilter 
			: disFilter;

			const restructedMatStore = Object.entries(typedMatStore)
			.filter(([k]) => matchesFilter(k)).reduce((acc, [k, v]) => {
				acc[k] = v;
				return acc;
			}, {});

			return restructedMatStore;
		}

		/**@typedef {{[s:string]: {owned: number, remain: number, used: boolean, dismantled?: number, dismantledInto?: number, isTarget?: boolean}}} FDisStore */
		/**@typedef {{[s:string]: {owned: number, remain: number, used: boolean, combined?: number, combinedInto?: number, isTarget?: boolean}}} FCombStore */

		/**
		 * This function handles the combine calculations for the given `targetAmount` @ `targetRID`
		 * 
		 * given the total contents of `matsStored`, it attempts to met the `targetAmount`
		 * by way of combining lower rarity materials until it succeededs or fails.
		 * @param {number} targetAmount Targeted amount of material to combine to
		 * @param {number} targetRID Targeted Material Rarity to combine to
		 * @param {{[s: string]: number}} matsStored Owned Material Storage Object
		 * @returns {{fields: {name: string, value: string}[], data: {materialStorage: FCombStore, materialLimit: number}}} Vaild EmbedBuilder Fields Array & combine data
		 */
		function handleCombineOutcome(targetAmount, targetRID, matsStored){
			const TR = targetRID, TA = targetAmount;
			let TDiff = TA, carryDown = 0;

			// HANDLING CALCULATIONS FOR COMBINING TO AMOUNT @ RARITY
			const finalCombOutcome = Object.entries(matsStored)
			.reduceRight((acc, [k, v]) => {
				// If TDiff has already been made up and is 0
				if (!TDiff) {
					acc[k] = {
						owned: v,
						remain: v,
						combined: 0,
						combinedInto: 0,
						used: false
					};
					return acc;
				}
				// ["k"]: v
				const CR = +k;
				// Target Rarity being checked for
				if (CR === TR) {
					acc[k] = {
						owned: v,
						used: true,
						isTarget: true
					};
					return acc;
				}
				// Subtract any existing remainder passed down from TDiff,
				// before scaling upto `CR`
				TDiff -= carryDown;
				// ["0"]: 5 === ["1"]: 1 === ["2"]: 0.2
				// Therefor TDiff @ ["k"] === 5 * TDiff @ ["k - 1"]
				TDiff *= 5;

				// Current itter, material needed difference to check against
				// TA * (5 ** (TR - CR))
				const atCRDiff = (TA * (5 ** (TR - CR)));
				// If TDiff is less than atCRDiff, use modded TDiff as difference to check against
				const curDiff = (TDiff < atCRDiff) ? TDiff : atCRDiff;

				// String representing one of "1", "-1", "0"
				const outcome = (Math.sign(v - curDiff)).toString();
				let remain = 0, combined = 0, combinedInto = 0, owned = v;
				switch(outcome){
					case "-1": // Difference remains
						remain = v % 5;
						// Material Amount Divend of ["k + 1"]: v
						combinedInto = Math.floor(v / 5);
						// Material Amount Total combined at ["k"]
						combined = 5 * combinedInto;
						// Subtract Total from TDiff
						TDiff -= combined;
						// Apply remainder to higher scoped `carryDown`
						carryDown = remain;
					break;
					default: // Difference made up || Difference exactly matched
						remain = v - curDiff;
						combined = curDiff;
						combinedInto = Math.floor(combined / 5);
						TDiff = 0;
					break;
				}

				acc[k] = {
					owned,
					remain,
					combined,
					combinedInto,
					used: true
				};

				return acc;
			}, {});

			// Gather maximum total amount that can be combined
			let combineCap = 0;
			const totalCombineDisplayCap = ele => {
				if (!ele.used || ele.isTarget) return;
				if (!combineCap) return combineCap = ele.combinedInto;
				combineCap = Math.floor((ele.owned + combineCap) / 5);
			};

			Object.values(finalCombOutcome).forEach(totalCombineDisplayCap);
			console.log('Display fix value (combineCap): %d', combineCap);

			// CONSTRUCTING EMBEDBUILDER FIELDS ARRAY
			const finalFields = Object.entries(finalCombOutcome)
			.reduce((acc, [r, obj], idx, arr) => {
				if (!obj.used) return acc;
				const CR = +r;

				let fieldName = ``, fieldValue = ``;
				if (CR === TR){
					fieldName = `== TARGET ${baseCheckRarName(CR)} ==`;
					fieldValue = `Currently Owned: **${obj.owned}**\nCombining Will Yield: **${combineCap}** / **${targetAmount}**`;
				} else {
					fieldName = `== ${baseCheckRarName(CR)} ==`;

					let ownedText = `Owned: **${obj.owned}** `;
					if (CR > 0){
						// P (Previous)
						const [PR, POBJ] = arr[idx - 1];
						const prevRar = +PR, prevObj = POBJ;

						if (prevObj.combinedInto > 0){
							ownedText += `+*${prevObj.combinedInto} from ${baseCheckRarName(prevRar)}*`;

							obj.combinedInto = Math.floor((obj.owned + prevObj.combinedInto) / 5);
							obj.remain = (obj.remain + prevObj.combinedInto) % 5;
						}
					}

					const remainText = `Amount Remaining: **${obj.remain}**`;

					// let lastObj, lastRar;
					// if (CR > 0){
					// 	const [LR, LOBJ] = arr[idx - 1];
					// 	lastRar = +LR;
					// 	lastObj = LOBJ;
					// }
					// const ownedTextValue = (CR > 0 && lastObj.combinedInto > 0) 
					// ? `Owned: **${obj.owned}**   +*${lastObj.combinedInto} from ${baseCheckRarName(lastRar)}*`
					// : `Owned: **${obj.owned}**`;
					// const remainTextValue = (CR > 0 && lastObj.combinedInto > 0)
					// ? `Amount Remaining: **${(obj.remain + lastObj.combinedInto) % 5}**`
					// : `Amount Remaining: **${obj.remain}**`;
					fieldValue = `${ownedText}\n${remainText}\nAmount Combined: **${obj.combined}**`;
				}

				acc.push({name: fieldName, value: fieldValue});
				return acc;
			}, []);

			// Return finalCombOutcome as well!
			return {fields: finalFields, data: {materialStorage: finalCombOutcome, materialLimit: combineCap}};
		}

		/**
		 * This function handles the dismantle calculations for the given `targetAmount` @ `targetRID`
		 * 
		 * given the total contents of `matsStored`, it attempts to meet the `targetAmount`
		 * by way of dismantling higher rarity materials until it succeededs or fails.
		 * @param {number} targetAmount Targeted amount of material to dismantle to
		 * @param {number} targetRID Targeted Material Rarity to dismantle to
		 * @param {{[s: string]: number}} matsStored Owned Material Storage Object
		 * @returns {{fields: {name: string, value: string}[], data: {materialStorage: FDisStore, materialLimit: number}}} Vaild EmbedBuilder Fields Array & dismantle data
		 */
		function handleDismantleOutcome(targetAmount, targetRID, matsStored){
			const TR = targetRID, TA = targetAmount;
			let TDiff = TA, splitDiff = {};

			// HANDLING CALCULATIONS FOR DISMANTLING TO AMOUNT @ RARITY
			const finalDisOutcome = Object.entries(matsStored)
			.reduce((acc, [k, v]) => {
				// Itteration starts at TR going ^: Itter 2 = "TR + 1", Itter 3 = "TR + 2"
				// If TDiff has already been made up and is 0
				if (!TDiff) {
					acc[k] = {
						owned: v,
						remain: v,
						dismantled: 0,
						dismantledInto: 0,
						used: false
					};
					return acc;
				}
				// ["k"]: v
				const CR = +k;
				// First Itter will be CR = TR
				if (CR === TR) {
					acc[k] = {
						owned: v,
						used: true,
						isTarget: true
					};
					return acc;
				}
				// console.log('splitDiff condition checked: (((TDiff / 5) % 1) * 5) = ', Math.round(((TDiff / 5) % 1) * 5));
				splitDiff[k] = Math.round(((TDiff / 5) % 1) * 5);
				
				// Divide TDiff by 5 per Itter
				TDiff = Math.ceil(TDiff / 5);
				// atCRDiff = Math.ceil(TA / 5 * (CR - TR));
				const atCRDiff = Math.ceil(TA / (5 * (CR - TR)));
				// curDiff = atCRDiff if TDiff is unmodified
				const curDiff = (TDiff < atCRDiff) ? TDiff : atCRDiff;
				// console.log('Itter Values: TDiff(%d) || atCRDiff(%d) || curDiff(%d)', TDiff, atCRDiff, curDiff);
				// String representing one of "1", "-1", "0"
				const outcome = (Math.sign(v - curDiff)).toString();
				let remain = 0, dismantled = 0, dismantledInto = 0, owned = v;
				switch(outcome){
					case "-1": // Difference remains
						// Total amount * 5
						dismantledInto = v * 5;
						// If not filled, all material is dismantled
						dismantled = v;
						// Subtract Total from TDiff
						TDiff -= dismantled;
					break;
					default: // Difference made up || Difference exactly matched
						remain = v - curDiff;
						dismantled = curDiff;
						dismantledInto = dismantled * 5;

						if (CR - 1 !== TR){
							// Updating all previously checked mat entries
							// Functionally a "cascade" downwards
							for (const [pk, pv] of Object.entries(splitDiff)){
								if (+pk - 1 === TR || !acc[`${+pk - 1}`]) continue;
								acc[`${+pk - 1}`].remain = (!pv) ? pv : 5 - pv;
							}
						}
						TDiff = 0;
					break;
				}

				acc[k] = {
					owned,
					remain,
					dismantled,
					dismantledInto,
					used: true,
					lastCheck: TDiff === 0
				};

				return acc;
			}, {});

			let carriedRemainder = 0;
			const expectedTotalDismantled = Object.values(finalDisOutcome)
			.filter(disProp => disProp.used)
			.reduceRight((acc, finalDisProp, idx, arr) => {
				if (finalDisProp.isTarget) return acc;
				// Grab current prop object total dismantle product
				// Adding to it any amount carried from a higher rarity chain
				/**@type {boolean} */
				const checkTarget = arr[idx - 1].isTarget;

				let disInto = 0;
				if (checkTarget && carriedRemainder){
					// if next itter is target, and remainder has been carried
					disInto = carriedRemainder;
				} else if (!checkTarget && carriedRemainder){
					// if next itter is NOT target, and remainder has been carried
					disInto = carriedRemainder;
				} else {
					// if next itter is NOT target, and no remainder
					disInto = finalDisProp.dismantledInto;
				}
				// If next rar down is not the dismantle target
				if (!arr[idx - 1].isTarget){
					// Difference between current total dismantled product
					// and the remainder of the next lowest rarity
					// `arr[idx - 1].remain` is calculated on runtime to be the amount
					// remaining after dismantling one rarity higher: 
					// EX 1 `3` => 5 `2` - 3 `needed` = `arr[idx - 1].remain = 2` 
					const disDifference = disInto - arr[idx - 1].remain;
					// console.log('disDifference: `disInto` %d - `arr[idx - 1].remain` %d', disInto, arr[idx - 1].remain);
					// The found difference remaining + total of `arr[idx - 1].dismantled`
					// works out to the actual total dismantled at the current rarity itter value
					const totalUsed = arr[idx - 1].dismantled + disDifference;
					// console.log('totalUsed: `arr[idx - 1].dismantled` %d + `disDifference` %d', arr[idx - 1].dismantled, disDifference);
					// Multiply the found total to equal the actual amount passed down 
					// for `arr[idx - 1]`, this amount is then summed to find 
					// the following itter dismantle total, where these calculations are 
					// performed until the next itter object is the targeted rarity.
					carriedRemainder = totalUsed * 5;
					// 	  VVVVV if the next itteration is the targeted rarity, `disInto` is the final total dismantled!
				} else acc = disInto;
				return acc;
			}, 0);

			// Gather Maximum total to be dismantled into
			let dismantleOverflow = expectedTotalDismantled;
			// console.log('Display fix value (dismantleOverflow): %d', dismantleOverflow);

			// CONSTRUCTING EMBEDBUILDER FIELDS ARRAY
			const finalFields = Object.entries(finalDisOutcome)
			.reduce((acc, [r, obj], idx, arr) => {
				if (!obj.used) return acc;
				const CR = +r;

				let fieldName = ``, fieldValue = ``;
				if (CR === TR){
					fieldName = `== TARGET ${baseCheckRarName(CR)} ==`;
					fieldValue = `Currently Owned: **${obj.owned}**\nDismantling Will Yield: **${dismantleOverflow}** / **${TA}**`;
				} else {
					fieldName = `== ${baseCheckRarName(CR)} ==`;
					let nextObj, nextRar;
					if (CR > 0){
						const [NR, NOBJ] = arr[(arr.length - 1 > idx + 1) ? idx + 1 : arr.length - 1];
						nextRar = +NR;
						nextObj = NOBJ;
					}
					// console.log(nextObj, nextRar);
					const ownedTextValue = (CR > 0 && nextObj.dismantledInto > 0) 
					? `Owned: **${obj.owned}**   +*${nextObj.dismantledInto} from ${baseCheckRarName(nextRar)}*`
					: `Owned: **${obj.owned}**`;
					fieldValue = `${ownedTextValue}\nAmount Remaining: **${obj.remain}**\nAmount Dismantled: **${obj.dismantled}**`;
				}
				acc.unshift({name: fieldName, value: fieldValue});
				return acc;
			}, []);

			// Return finalDisOutcome as well!
			return {fields: finalFields, data: {materialStorage: finalDisOutcome, materialLimit: dismantleOverflow}};
		}
		
		/**
		 * This function loads the given `embed` with the calculated display data returned 
		 * from `handleCombineOutcome` || `handleDismantleOutcome` according to the `actionType`.
		 * @param {EmbedBuilder} embed Amount display embed
		 * @param {NavMenu} matMenu Material NavMenu
		 * @returns {{materialStorage: FDisStore | FCombStore, materialLimit: number}}
		 */
		function buildMatAmountEmbed(embed, matMenu){
			const typedMatStore = matMenu.specs.matStore;
			const {actionType, rarity, targetAmount, matType} = matMenu.specs;

			const targetRID = convertRarToID(rarity.target);

			const filteredMatStore = restructUserMatStorage(typedMatStore, targetRID, actionType);

			embed
			.setTitle(`== ${makeCapital(matType)} Amount Desired ==`)
			.setDescription(`Amount Currently Selected: ${targetAmount}`);

			const handleAmountChangeOutcome = (actionType === 'combine') 
			? handleCombineOutcome
			: handleDismantleOutcome;

			const outcomeObject = handleAmountChangeOutcome(targetAmount, targetRID, filteredMatStore);

			embed.setFields(outcomeObject.fields);

			return outcomeObject.data;
		}

		/**
		 * This function handles loading the confirm display onto the given `embed` object.
		 * This function calls `EmbedBuilder` methods on the given `embed` object, mutating the original.
		 * @param {EmbedBuilder} embed Display Embed Object
		 * @param {NavMenu} matMenu Material NavMenu
		 */
		function buildMatConfirmDisplay(embed, matMenu){
			const {actionType, outcomeStore, targetAmount, matType, rarity} = matMenu.specs;
			const capitalAT = makeCapital(actionType);
			const targetRID = convertRarToID(rarity.target);

			let descStr = `${capitalAT}ing will yield `;
			descStr += `**${outcomeStore.materialLimit}** out of the **${targetAmount}** requested *${baseCheckRarName(targetRID)} ${makeCapital(matType)} Materials!*`;
			descStr += '\n\nMaterials used in the process:';

			embed
			.setTitle(`== ${capitalAT} Outcome ==`)
			.setDescription(descStr);

			// Load embed fields
			// Filter out mats used where mat.owned === 0 && mat.remain === 0
			const isEmptyMat = m => m.owned === 0 && m.remain === 0;

			// console.log(outcomeStore.materialStorage);

			const confirmDisplayFields = Object.entries(outcomeStore.materialStorage)
			.filter(([key, mat]) => !isEmptyMat(mat) && mat.used)
			.reduce((acc, [k, v]) => {
				const CR = +k;
				
				const fieldNameStyle = (rar, vObj) => {
					const isNowEmpty = vObj.owned > 0 && vObj.remain === 0;
					return (isNowEmpty) ? `~~ ${baseCheckRarName(rar)} ~~`: `== ${baseCheckRarName(rar)} ==`;
				};

				let fieldName = '', fieldValue = '';
				if (CR === targetRID){
					// Temporary
					return acc;
				} else {
					fieldName = fieldNameStyle(k, v);
					fieldValue = `Currently Owned: **${v.owned}**\nOwned After ${capitalAT}: **${v.remain}**`;
				}
				acc.push({name: fieldName, value: fieldValue});
				return acc;
			}, []);

			embed.setFields(confirmDisplayFields);
		}

		// ~~~~~~~~~~~~~~~~~~~~~
		// STRING COLLECTOR (COLLECT)
		sCollector.on('collect', async c => {
			await c.deferUpdate().then(async () => {
				let editWith = {};
				switch(c.customId){
					case "mat-type":
						matMenu.specs.matType = c.values[0];
						matMenu.specs.matStore = await grabFormatedUserMatStore(matMenu.specs.matType);
						const canContinue = (matMenu.specs.actionType === 'dismantle') 
						? canDis
						: canComb;
						
						if (canContinue(matMenu.specs.matStore)){
							editWith = matMenu.goingForward({embeds: [matRarTargetEmbed], components: [...loadMaterialRarStringSelectRow(matMenu)]});
						} else {
							await c.followUp({content: "You do not own enough of this material type to continue!", ephemeral: true});
							matMenu.specs.matType = "";
							matMenu.specs.matStore = {};
							editWith = matMenu.goingNowhere();
						}
					break;
					case "mat-rar":
						matMenu.specs.rarity.target = c.values[0];

						editWith = matMenu.goingForward({embeds: [amountSelectEmbed], components: [...loadDefaultAmountButtonActionRows()]});
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
				switch(matMenu.whatDoYouHear(c.customId)){
					case "NEXT":
						if (['mat-combine', 'mat-dismantle'].includes(c.customId)){
							matMenu.specs.actionType = c.customId.split('-')[1];
							editWith = matMenu.goingForward({embeds: [matTypeEmbed], components: [...loadMaterialTypeStringSelectRow()]});
						} else if (['minus', 'mult', 'plus'].includes(c.customId.split('-')[0]) || c.customId === 'reset-amount'){
							// Number Change Button
							if (c.customId !== 'reset-amount'){
								matMenu.specs.targetAmount = fnSignConverter.grabCalledEq(c.customId, matMenu.specs.targetAmount);
							} else matMenu.specs.targetAmount = 0;

							if (matMenu.specs.targetAmount < 0) matMenu.specs.targetAmount = 0;

							matMenu.specs.outcomeStore = buildMatAmountEmbed(amountSelectEmbed, matMenu);

							editWith = matMenu.goingNowhere()
						} else if (['confirm'].includes(c.customId.split('-')[0])){
							// Confirm choice
							switch(c.customId.split('-')[1]){
								case "amount":
									if (matMenu.specs.targetAmount > 0){
										buildMatConfirmDisplay(confirmActionEmbed, matMenu);
										const capitalActionTypeButtonLabel = makeCapital(matMenu.specs.actionType);
										editWith = matMenu.goingForward({embeds: [confirmActionEmbed], components: [createConfirmCancelButtonRow('action', ButtonStyle.Success, ButtonStyle.Secondary, capitalActionTypeButtonLabel, capitalActionTypeButtonLabel)]});
									} else {
										editWith = matMenu.goingNowhere();
										await c.followUp({content: 'You have not selected an amount yet!', ephemeral: true})
										.catch(e => console.error(e));
									}
								break;
								case "action":
								return collector.stop('Finished');
							}
						}
					break;
					case "BACK":
						switch(c.customId.split('-')[1]){
							case "type":
								matMenu.specs.actionType = "";
							break;
							case "rar":
								matMenu.specs.matType = "";
							break;
							case "amount":
								matMenu.specs.targetAmount = 0;

								matMenu.specs.outcomeStore = buildMatAmountEmbed(amountSelectEmbed, matMenu);
								amountSelectEmbed.setTitle('== Amount Desired ==');

								matMenu.specs.rarity.target = "";
								matMenu.specs.rarity.extra = "";
							break;
						}
						editWith = matMenu.goingBackward();
					break;
					case "CANCEL":
						switch(c.customId.split('-')[1]){
							case "action":
								editWith = matMenu.goingBackward();
							break;
						}
					break;
					default:
						console.log(matMenu.whatDoYouHear(c.customId));
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

			if (r === 'Finished') {
				sCollector.stop('Quiet');

				// Handle storage update
				const updateDisplay = await handleMaterialActionOutcome(matMenu);

				await editTimedChannelMessage(anchorMsg, 80000, {embeds: [updateDisplay], components: []});
			}
		});
		// =====================


		/**
		 * This function handles updating all applicable material values and entries given the data
		 * in `matMenu.specs.outcomeStore`
		 * @param {NavMenu} matMenu Material NavMenu
		 * @returns {Promise<EmbedBuilder>}
		 */
		async function handleMaterialActionOutcome(matMenu){
			const {materialLimit, materialStorage} = matMenu.specs.outcomeStore;
			const targetRID = convertRarToID(matMenu.specs.rarity.target);

			const storageReadyMaterials = Object.entries(materialStorage)
			.reduce((acc, [k, v]) => {
				acc[k] = (v.isTarget) ? v.owned + materialLimit : v.remain;
				return acc;
			}, {});

			console.log('READY FOR STORAGE UPDATES: ', storageReadyMaterials);

			// Aquire reference data
			/**@type {{name: string, value: number, mattype: string, mat_id: number, rarity: string, rar_id: number, amount: number, spec_id: string}[]} */
			const ownedUserOldMats = await MaterialStore.findAll({where: {spec_id: user.userid, mattype: matMenu.specs.matType}});
			/**@type {string[]} */
			const ownedRarIdList = ownedUserOldMats.map(m => m.rar_id.toString());

			// If new store has amount for id
			// Check if user owned, create entry if missing
			// If owned, prepare for updating

			// If new store has 0 for id
			// Check if user owned, delete entry if found

			/**
			 * @typedef {string} rKey
			 * @typedef {number} rVal
			*/
			/**@param {rKey} key*/
			const getUserOwned = (key) => ownedUserOldMats.find(m => m.rar_id === +key);

			/**@type {{matKey: string, matValue: number, destroy: boolean, update: boolean, create: boolean}[]} */
			const createdActionsList = Object.entries(storageReadyMaterials).reduce((acc, [k, v]) => {
				/**@param {rKey} key*/
				const isUserOwned = (key) => ownedRarIdList.includes(key);
				/**
				 * @param {rKey} key
				 * @param {rVal} newValue
				*/
				const isDestroyed = (key, newValue) => isUserOwned(key) && newValue === 0;
				/**
				 * @param {rKey} key
				 * @param {rVal} newValue
				*/
				const needsUpdate = (key, newValue) => isUserOwned(key) && (getUserOwned(key)).amount !== newValue && newValue > 0;
				/**
				 * @param {rKey} key
				 * @param {rVal} newValue
				*/
				const needsCreate = (key, newValue) => !isUserOwned(key) && newValue > 0;

				/**
				 * @param {rKey} key
				 * @param {rVal} newValue
				*/
				const handleEntryCheck = (key, newValue) => {
					return {matKey: key, matValue: newValue, destroy: isDestroyed(key, newValue), update: needsUpdate(key, newValue), create: needsCreate(key, newValue)};
				};

				acc.push(handleEntryCheck(k, v));
				return acc;
			}, []);
			// console.log(createdActionsList);

			const neededActionsList = createdActionsList.filter(ao => ao.destroy || ao.update || ao.create);
			console.log(neededActionsList);

			const needStaticMatList = (neededActionsList.filter(ao => ao.create)).length > 0;

			let staticMatDataList = [];
			if (needStaticMatList){
				staticMatDataList = interaction.client.materials.get(matMenu.specs.matType);
			}

			for (const actionObject of neededActionsList){
				if (actionObject.update){
					// Update material store
					const userMatMatch = getUserOwned(actionObject.matKey);
					await userMatMatch.update({amount: actionObject.matValue})
					.then(async m => await m.save())
					.then(async m => {return await m.reload()});
				} else if (actionObject.destroy){
					// Delete material entry
					const userMatMatch = getUserOwned(actionObject.matKey);
					await userMatMatch.destroy();
				} else if (actionObject.create){
					// Create material entry
					const staticMatMatch = staticMatDataList.find(mat => mat.Rar_id === +actionObject.matKey);
					await checkInboundMat(user.userid, staticMatMatch, matMenu.specs.matType, actionObject.matValue);
				}
			}

			console.log('Updated Stored Materials');

			const actionDisplayEmbed = new EmbedBuilder()
			.setTitle(`== ${makeCapital(matMenu.specs.actionType)} Complete ==`)
			.addFields({name: `== ${baseCheckRarName(targetRID)} ${makeCapital(matMenu.specs.matType)} ==`, value: `Amount Created: **${materialLimit}**`});
		
			return actionDisplayEmbed;
		}

		// ========
		// OLD CODE
		// ========
		// if (interaction.user.id === "1011") {

		// 	if (interaction.options.getSubcommand() === 'combine') {
		// 		await interaction.deferReply().then(async () => {
		// 			//if (interaction.user.id !== '501177494137995264') return interaction.followUp('This command is under construction! Sorry!');
		// 			//Material type
		// 			const matType = interaction.options.getString('type');
		// 			//Desired rarity after combine
		// 			const rarType = interaction.options.getString('rarity');
		// 			//Amount of material at desired rarity 
		// 			let inputAmount = interaction.options.getInteger('amount') ?? 1; //Default to 1 if none 
		// 			//if (!inputAmount) inputAmount = 1; 
	
		// 			//Convert rarity to int
		// 			var chosenRarID;
		// 			if (rarType === 'common') {
		// 				chosenRarID = 0;
		// 			} else if (rarType === 'uncommon') {
		// 				chosenRarID = 1;
		// 			} else if (rarType === 'rare') {
		// 				chosenRarID = 2;
		// 			} else if (rarType === 'very rare') {
		// 				chosenRarID = 3;
		// 			} else if (rarType === 'epic') {
		// 				chosenRarID = 4;
		// 			} else if (rarType === 'mystic') {
		// 				chosenRarID = 5;
		// 			} else if (rarType === '?') {
		// 				chosenRarID = 6;
		// 			} else if (rarType === '??') {
		// 				chosenRarID = 7;
		// 			} else if (rarType === '???') {
		// 				chosenRarID = 8;
		// 			} else if (rarType === '????') {
		// 				chosenRarID = 9;
		// 			} else {
		// 				return interaction.followUp('That was not a valid option!');
		// 			}
		// 			//ChosenRarID is the wanted material 
		// 			//Check and combine all materials below to calculate the amount recieved if any at all
	
		// 			//Full list of all owned materials of the given type
		// 			const fullMatTypeList = await MaterialStore.findAll({ where: [{ spec_id: interaction.user.id }, { mattype: matType }] });
		// 			if (fullMatTypeList.length <= 0) return interaction.followUp('You have no materials of that type!');
	
		// 			//Filtered list of all owned below the desired rarity
		// 			const filterLower = fullMatTypeList.filter(mat => mat.rar_id < chosenRarID);
		// 			if (filterLower.length <= 0) return interaction.followUp('You have no lower rarity materials of that type to combine!');
	
		// 			//Check if the requested material @ rarity exists in the prefab list
		// 			let listStr;
		// 			listStr = `${matType}List.json`;
	
		// 			const foundMaterialList = require(`../../events/Models/json_prefabs/materialLists/${listStr}`);
		// 			const matRarIsReal = foundMaterialList.filter(mat => mat.Rar_id === chosenRarID);
		// 			if (matRarIsReal.length <= 0) return interaction.followUp(`${matType} cannot be combined to ${rarType}!`);
	
		// 			/**
		// 			 *		We have:
		// 			 *		- reference to prefab list
		// 			 *		- Users materials
		// 			 *		- Requested material type, rarity, amount
		// 			 *		
		// 			 *		We need:
		// 			 *		- To create a checked list of materials for later reference
		// 			 *		- To check if one rarity lower exists
		// 			 *		- &&
		// 			 *		- To check if the requested rarity amount can be made from one rarity lower
		// 			 *		- IF NOT:
		// 			 *			- Add chosenRarID - 1 material to checked list
		// 			 *			- Check how many are missing
		// 			 *			- Multiply that amount by 5
		// 			 *			- Then check next lowest material rarity --
		// 			 *			- IF NONE:
		// 			 *				- Add Material to checked list
		// 			 *				- Multiply missing amount by 5 again
		// 			 *				- Then check next lowest material rarity --
		// 			 *			- IF SOME:
		// 			 *				- Compare Difference by adding total amount of material to amount missing 
		// 			 *				- IF +1 OR 0:
		// 			 *					- Difference has been made up
		// 			 *					- Subtract missing amount from total amount
		// 			 *					- IF REMAINING:
		// 			 *						- Add to remaining list
		// 			 *						- BREAK;
		// 			 *					- IF NONE:
		// 			 *						- Add to destroyed list
		// 			 *						- BREAK:
		// 			 *				- IF -1:
		// 			 *					- Add Material to checked list
		// 			 *					- Difference remains
		// 			 *					- Add total amount to missing amount
		// 			 *					- Multiply by 5
		// 			 *					- Check next lowest rarity --
		// 			 *			- IF CURRENT RARITY BEING CHECKED IS 0:
		// 			 *				- Compare Difference by adding total amount of material to amount missing 
		// 			 *				- IF +1 OR 0:
		// 			 *					- Difference has been made up
		// 			 *					- Subtract missing amount from total amount
		// 			 *					- IF REMAINING:
		// 			 *						- Add to remaining list
		// 			 *						- BREAK;
		// 			 *					- IF NONE:
		// 			 *						- Add to destroyed list
		// 			 *						- BREAK:
		// 			 *				- IF -1:
		// 			 *					- COMBINE FAILED
		// 			 *					- Add total amount to missing amount
		// 			 *					- Multiply missing by -1
		// 			 *					- neededRarMats = this
		// 			 *					- Announce remaining materials needed to combine
		// 			 *					- BREAK;
		// 			 *		- IF CAN:
		// 			 *			- Find total material amount for one rarity lower
		// 			 *			- Multiply requested amount by 5
		// 			 *			- Subtract that from total material amount
		// 			 *			- IF REMAINING:
		// 			 *				- Add to remaining list
		// 			 *			- IF NONE:
		// 			 *				- Add to destroyed list
		// 			 * */
	
		// 			let wasCheckedList = [];
		// 			let checkListPOS = 0;
	
		// 			let remainingMatsList = [];
		// 			let destroyMatsList = [];
		// 			let addedRarMats = 0;
	
		// 			const firstBackCheck = filterLower.filter(mat => mat.rar_id === (chosenRarID - 1));
	
		// 			let fbcMatStaticSlice;
		// 			let fbcTempMatCopy = [];
	
		// 			let materialDifferenceStaticValue = 0;
		// 			//This checks if user has material entry for one rarity lower than requested!
		// 			if (firstBackCheck.length > 0) {
		// 				console.log(successResult('firstBackCheck is FULL!'));
	
		// 				fbcMatStaticSlice = foundMaterialList.filter(mat => mat.Rar_id === (chosenRarID - 1));
		// 				console.log(specialInfoForm('fbcMatStaticSlice.Name: ', fbcMatStaticSlice[0].Name));
		// 				fbcTempMatCopy.push(fbcMatStaticSlice[0]);
	
		// 				var fbcTotalMats = firstBackCheck.reduce((totalAmount, mat) => totalAmount + mat.amount, 0);
	
		// 				const totRemainRarMat = (fbcTotalMats - (5 * inputAmount)); //Remaing old rarity materials
		// 				if (totRemainRarMat > 0) {
		// 					//Prepare remaining entry
		// 					const mappedMat = await fbcTempMatCopy.map(mat => ({ ...mat, NewAmount: totRemainRarMat }),);
	
		// 					fbcTempMatCopy = [];
	
		// 					console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
		// 					console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 					remainingMatsList.push(...mappedMat);
		// 					//checkListPOS++;
		// 					addedRarMats = inputAmount;
		// 				} else if (totRemainRarMat === 0) {
		// 					//Prepare destroy entry
		// 					const mappedMat = await fbcTempMatCopy.map(mat => ({ ...mat, NewAmount: 0 }),);
	
		// 					fbcTempMatCopy = [];
	
		// 					console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
		// 					console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 					destroyMatsList.push(...mappedMat);
		// 					//checkListPOS++;
		// 					addedRarMats = inputAmount;
		// 				} else if (totRemainRarMat < 0) {
		// 					const fbcMappedVal = fbcTempMatCopy.map(mat => ({ ...mat, NewAmount: fbcTotalMats }),);
		// 					//destroyMatsList.push(...fbcMappedVal);
		// 					wasCheckedList.push(...fbcMappedVal);
		// 					checkListPOS++;
		// 					materialDifferenceStaticValue = totRemainRarMat; //This is the amount needed to complete combine
		// 					console.log(specialInfoForm('materialDifferenceStaticValue WITH FOUND MATERIALS: ', materialDifferenceStaticValue));
		// 					materialDifferenceStaticValue *= 5;
		// 					console.log(successResult('materialDifferenceStaticValue AFTER MULT APPLIED: ', materialDifferenceStaticValue));
		// 				}
		// 			} else {
		// 				console.log(failureResult('firstBackCheck is EMPTY!'));
	
		// 				fbcMatStaticSlice = foundMaterialList.filter(mat => mat.Rar_id === (chosenRarID - 1));
		// 				const mappedMat = await fbcMatStaticSlice.map(mat => ({ ...mat, NewAmount: 0 }),);
		// 				wasCheckedList.push(...mappedMat);
		// 				checkListPOS++;
	
		// 				materialDifferenceStaticValue = ((-1) * (5 * inputAmount)); //This is the amount needed to complete combine
		// 				console.log(specialInfoForm('materialDifferenceStaticValue WITH NO MATERIALS: ', materialDifferenceStaticValue));
		// 			}
	
		// 			console.log(basicInfoForm(''));
		// 			console.log(specialInfoForm(''));
		// 			console.log(warnedForm(''));
		// 			console.log(errorForm(''));
		// 			console.log(successResult(''));
		// 			console.log(failureResult(''));
	
		// 			let highestPossibleCombine = {};
	
		// 			//DIFFERENCE REMAINING CHECK
		// 			if (materialDifferenceStaticValue < 0) {
		// 				//DIFFERENCE REMAINS
		// 				console.log(failureResult('INITIAL DIFF CHECK IS NEGATIVE'));
	
		// 				let isOwnedCheck;
		// 				let matPrefabSlice;
	
		// 				let tmpCopy = [];
	
		// 				let compDiffCheck = materialDifferenceStaticValue;
		// 				let curRun = chosenRarID - 2;
		// 				if (curRun === -1) {
		// 					curRun = 0;
		// 				}
		// 				let maxRun = -1;
		// 				do {
		// 					if (curRun === 0) {
		// 						console.log(warnedForm('CURRENTLY CHECKING COMMON RARITY!'));
		// 						isOwnedCheck = filterLower.filter(mat => mat.rar_id === curRun);
	
		// 						if (isOwnedCheck.length <= 0) {
		// 							console.log(errorForm('NO COMMON MATERIALS, COMBINE FAILED!'));
		// 							matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
		// 							const mappedMat = await matPrefabSlice.map(mat => ({ ...mat, NewAmount: 0 }),);
		// 							wasCheckedList.unshift(...mappedMat);
		// 							//checkListPOS++;
		// 							addedRarMats = 0; //THIS IS TEMPORARY!
		// 							break;
		// 						} else {
		// 							console.log(successResult(`COMMON MATERIAL FOUND!`));
	
		// 							const totalStaticMats = isOwnedCheck[0].amount;
		// 							console.log(basicInfoForm(`Total material amount: ${totalStaticMats}`));
	
		// 							const checkingDiff = compDiffCheck + totalStaticMats;
		// 							if (checkingDiff >= 0) {
		// 								console.log(successResult(`DIFFERENCE MADE UP!`));
		// 								const remainingMats = totalStaticMats - checkingDiff;
		// 								//const totalMatsSpent = totalStaticMats - remainingMats;
		// 								if (remainingMats > 0) {
		// 									//Prepare remaining entry
		// 									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
		// 									tmpCopy.push(matPrefabSlice[0]);
	
		// 									const mappedMat = await tmpCopy.map(mat => ({ ...mat, NewAmount: remainingMats }),);
	
		// 									tmpCopy = [];
	
		// 									console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
		// 									console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 									//wasCheckedList.push(...mappedMat);
		// 									remainingMatsList.push(...mappedMat);
		// 									addedRarMats = inputAmount;
		// 									break;
		// 								} else if (remainingMats === 0) {
		// 									//Prepare destroy entry
		// 									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
		// 									tmpCopy.push(matPrefabSlice[0]);
	
		// 									const mappedMat = await tmpCopy.map(mat => ({ ...mat, NewAmount: 0 }),);
	
		// 									tmpCopy = [];
	
		// 									console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
		// 									console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 									//wasCheckedList.push(...mappedMat);
		// 									destroyMatsList.push(...mappedMat);
		// 									addedRarMats = inputAmount;
		// 									break;
		// 								}
		// 							} else {
		// 								console.log(failureResult('DIFFERENCE STILL REMAINS: ', checkingDiff));
		// 								if (totalStaticMats > 5) {
		// 									const totalNewIFCombine = Math.floor(totalStaticMats / 5);
		// 									const remainderIFStillCombine = totalStaticMats - (totalNewIFCombine * 5);
	
		// 									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
		// 									tmpCopy.push(matPrefabSlice[0]);
	
		// 									const oneHigherMatPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === (curRun + 1));
		// 									let oneHigherTmpCopy = [];
		// 									oneHigherTmpCopy.push(oneHigherMatPrefabSlice[0]);
	
		// 									if (!highestPossibleCombine.CurrentAmount) {
		// 										//if ()
		// 										console.log(specialInfoForm('ATTEMPTING TO CREATE NEW HIGHEST COMBINE ENTRY!'));
		// 										highestPossibleCombine = {
		// 											Name: oneHigherTmpCopy[0].Name,
		// 											Value: oneHigherTmpCopy[0].Value,
		// 											MatType: oneHigherTmpCopy[0].MatType,
		// 											Mat_id: oneHigherTmpCopy[0].Mat_id,
		// 											Rarity: oneHigherTmpCopy[0].Rarity,
		// 											Rar_id: oneHigherTmpCopy[0].Rar_id,
		// 											CurrentAmount: totalNewIFCombine,
		// 										};
		// 										console.log(specialInfoForm('Highest combine after entry creation: ', highestPossibleCombine));
		// 									} else {
		// 										console.log(specialInfoForm('ATTEMPTING TO ADD TO HIGHEST COMBINE ENTRY!'));
		// 										const staticMatCostForHIFC = Math.floor((5 ** (highestPossibleCombine.Rar_id - curRun)));
	
		// 										let totalHighestNewIFCombine;
		// 										if (totalStaticMats > staticMatCostForHIFC) {
		// 											totalHighestNewIFCombine = Math.floor(totalStaticMats / staticMatCostForHIFC);
		// 										} else {
		// 											totalHighestNewIFCombine = 0;
		// 										}
	
		// 										if (totalHighestNewIFCombine > 0) {
		// 											const newTotal = totalHighestNewIFCombine + highestPossibleCombine.CurrentAmount;
		// 											highestPossibleCombine.CurrentAmount = newTotal;
		// 										}
		// 										console.log(specialInfoForm(`highestCombine: ${highestPossibleCombine.CurrentAmount}`));
		// 									}
	
		// 									const mappedMat = tmpCopy.map(mat => ({ ...mat, NewAmount: remainderIFStillCombine }),);
	
		// 									tmpCopy = [];
	
		// 									//if (remainderIFStillCombine > 0) {
		// 									//	remainingMatsList.push(...mappedMat);
		// 									//} else if (remainderIFStillCombine === 0) {
		// 									//	destroyMatsList.push(...mappedMat);
		// 									//                           }
	
		// 									if (totalNewIFCombine > 0) {
		// 										const checkEditOneUp = wasCheckedList[0];
		// 										checkEditOneUp.NewAmount += totalNewIFCombine;
		// 									}
	
		// 									wasCheckedList.unshift(...mappedMat);
		// 									checkListPOS++;
		// 								} else if (totalStaticMats > 0) {
		// 									const remainderIFStillCombine = totalStaticMats;
	
		// 									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
		// 									tmpCopy.push(matPrefabSlice[0]);
	
		// 									const mappedMat = tmpCopy.map(mat => ({ ...mat, NewAmount: remainderIFStillCombine }),);
	
		// 									tmpCopy = [];
	
		// 									wasCheckedList.push(...mappedMat);
		// 									//remainingMatsList.push(...mappedMat);
	
		// 									checkListPOS++;
		// 								} else {
		// 									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
		// 									tmpCopy.push(matPrefabSlice[0]);
		// 									const mappedMat = tmpCopy.map(mat => ({ ...mat, NewAmount: 0 }),);
		// 									tmpCopy = [];
		// 									wasCheckedList.unshift(...mappedMat);
		// 									//destroyMatsList.push(...mappedMat);
		// 									checkListPOS++;
		// 								}
		// 								compDiffCheck = checkingDiff;
		// 								addedRarMats = 0; //THIS IS TEMPORARY!
		// 								break;
		// 							}
		// 						}
		// 					} else {
		// 						isOwnedCheck = filterLower.filter(mat => mat.rar_id === curRun);
	
		// 						if (isOwnedCheck.length <= 0) {
		// 							//Material is NOT owned
		// 							console.log(warnedForm(`Material with rar_id ${curRun} NOT found! Adding to checked list..`));
	
		// 							matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
		// 							console.log(basicInfoForm(`Material ${matPrefabSlice[0].Name} added to checked list!`));
	
		// 							const mappedMat = await matPrefabSlice.map(mat => ({ ...mat, NewAmount: 0 }),);
		// 							wasCheckedList.push(...mappedMat);
		// 							checkListPOS++;
		// 							compDiffCheck *= 5;
		// 							curRun--;
		// 						} else {
		// 							console.log(successResult(`Material with rar_id ${curRun} FOUND! Name: ${isOwnedCheck[0].name}`));
	
		// 							const totalStaticMats = isOwnedCheck[0].amount;
		// 							console.log(basicInfoForm(`Total material amount: ${totalStaticMats}`));
	
		// 							const checkingDiff = compDiffCheck + totalStaticMats;
		// 							if (checkingDiff >= 0) {
		// 								const totalMatsSpent = totalStaticMats - checkingDiff;
		// 								const remainingMats = totalStaticMats - totalMatsSpent;
		// 								if (remainingMats > 0) {
		// 									//Prepare remaining entry remainingMats
		// 									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
		// 									tmpCopy.push(matPrefabSlice[0]);
	
		// 									//wasCheckedList.push(matPrefabSlice[0]);
	
		// 									const mappedMat = await tmpCopy.map(mat => ({ ...mat, NewAmount: remainingMats }),);
	
		// 									tmpCopy = [];
	
		// 									console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
		// 									console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 									remainingMatsList.push(...mappedMat);
		// 									addedRarMats = inputAmount;
		// 									break;
		// 								} else if (remainingMats === 0) {
		// 									//Prepare destroy entry
		// 									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
		// 									tmpCopy.push(matPrefabSlice[0]);
	
		// 									//wasCheckedList.push(matPrefabSlice[0]);
	
		// 									const mappedMat = await tmpCopy.map(mat => ({ ...mat, NewAmount: 0 }),);
	
		// 									tmpCopy = [];
	
		// 									console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
		// 									console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 									destroyMatsList.push(...mappedMat);
		// 									addedRarMats = inputAmount;
		// 									break;
		// 								}
		// 							} else if (checkingDiff < 0) {
		// 								console.log(failureResult('DIFFERENCE STILL REMAINS: ', checkingDiff));
		// 								if (totalStaticMats > 5) {
		// 									const totalNewIFCombine = Math.floor(totalStaticMats / 5);
		// 									const remainderIFStillCombine = totalStaticMats - (totalNewIFCombine * 5);
	
		// 									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
		// 									tmpCopy.push(matPrefabSlice[0]);
	
		// 									const oneHigherMatPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === (curRun + 1));
		// 									let oneHigherTmpCopy = [];
		// 									oneHigherTmpCopy.push(oneHigherMatPrefabSlice[0]);
	
		// 									if (!highestPossibleCombine.CurrentAmount) {
		// 										console.log(specialInfoForm('ATTEMPTING TO CREATE NEW HIGHEST COMBINE ENTRY!'));
		// 										highestPossibleCombine = {
		// 											Name: oneHigherTmpCopy[0].Name,
		// 											Value: oneHigherTmpCopy[0].Value,
		// 											MatType: oneHigherTmpCopy[0].MatType,
		// 											Mat_id: oneHigherTmpCopy[0].Mat_id,
		// 											Rarity: oneHigherTmpCopy[0].Rarity,
		// 											Rar_id: oneHigherTmpCopy[0].Rar_id,
		// 											CurrentAmount: totalNewIFCombine,
		// 										};
		// 										console.log(specialInfoForm(`Highest combine ${highestPossibleCombine.Name} after entry creation amount: ${highestPossibleCombine.CurrentAmount}`));
		// 									} else {
		// 										console.log(specialInfoForm('ATTEMPTING TO ADD TO HIGHEST COMBINE ENTRY!'));
		// 										const staticMatCostForHIFC = Math.floor((5 ** (highestPossibleCombine.Rar_id - curRun)));
	
		// 										let totalHighestNewIFCombine;
	
		// 										if (totalStaticMats > staticMatCostForHIFC) {
		// 											totalHighestNewIFCombine = Math.floor(totalStaticMats / staticMatCostForHIFC);
		// 										} else {
		// 											totalHighestNewIFCombine = 0;
		// 										}
	
		// 										if (totalHighestNewIFCombine > 0) {
		// 											const newTotal = totalHighestNewIFCombine + highestPossibleCombine.CurrentAmount;
		// 											highestPossibleCombine.CurrentAmount = newTotal;
		// 										}
		// 										console.log(specialInfoForm(`OUTCOME AMOUNT: ${highestPossibleCombine.CurrentAmount}`));
		// 									}
	
		// 									const mappedMat = tmpCopy.map(mat => ({ ...mat, NewAmount: remainderIFStillCombine }),);
	
		// 									tmpCopy = [];
	
		// 									//if (remainderIFStillCombine > 0) {
		// 									//	remainingMatsList.push(...mappedMat);
		// 									//} else if (remainderIFStillCombine === 0) {
		// 									//	destroyMatsList.push(...mappedMat);
		// 									//}
	
		// 									if (totalNewIFCombine > 0) {
		// 										const checkEditOneUp = wasCheckedList[0];
		// 										checkEditOneUp.NewAmount += totalNewIFCombine;
		// 									}
	
		// 									wasCheckedList.unshift(...mappedMat);
		// 									checkListPOS++;
		// 								} else if (totalStaticMats > 0) {
		// 									const remainderIFStillCombine = totalStaticMats;
	
		// 									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
		// 									tmpCopy.push(matPrefabSlice[0]);
	
		// 									const mappedMat = tmpCopy.map(mat => ({ ...mat, NewAmount: remainderIFStillCombine }),);
	
		// 									tmpCopy = [];
	
		// 									wasCheckedList.unshift(...mappedMat);
		// 									//remainingMatsList.push(...mappedMat);
	
		// 									checkListPOS++;
		// 								} else {
		// 									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
		// 									tmpCopy.push(matPrefabSlice[0]);
		// 									const mappedMat = tmpCopy.map(mat => ({ ...mat, NewAmount: 0 }),);
		// 									tmpCopy = [];
		// 									wasCheckedList.unshift(...mappedMat);
		// 									//destroyMatsList.push(...mappedMat);
		// 									checkListPOS++;
		// 								}
		// 								compDiffCheck = checkingDiff;
		// 								compDiffCheck *= 5;
		// 								curRun--;
		// 							}
		// 						}
		// 					}
		// 				} while (curRun > maxRun)
	
		// 			} else if (materialDifferenceStaticValue >= 0) {
		// 				//DIFFERENCE IS 0 OR GREATER
		// 				console.log(successResult('INITIAL DIFF CHECK IS POSITIVE'));
		// 			}
	
		// 			if (highestPossibleCombine && highestPossibleCombine.CurrentAmount > 0) {
		// 				//BACK TRACK VALUES TO MAKE HIGHEST POSSIBLE COMBINE WITH VALUES PROVIDED!
		// 				console.log(warnedForm('INCOMPLETE COMBINE RECONSTRUCTION IN PROGRESS!'));
		// 				let carryUpVal = 0;
		// 				let breakPoint = checkListPOS;
		// 				console.log(specialInfoForm(`breakPoint = checkListPOS: ${breakPoint}, Length of wasCheckedList: ${wasCheckedList.length}`));
		// 				for (const material of wasCheckedList) {
		// 					console.log(specialInfoForm(`OLD VALUES!! Name: ${material.Name} \nNewAmount: ${material.NewAmount}`));
	
		// 					const matModFive = Math.floor((material.NewAmount + carryUpVal) % 5);
		// 					console.log(basicInfoForm(`carryUpVal 1st @ ${breakPoint}: ${carryUpVal}`));
	
		// 					//carryUpVal = 0;
		// 					if (matModFive > 0) {
		// 						carryUpVal = Math.floor((material.NewAmount + carryUpVal) / 5);
		// 						material.NewAmount = matModFive;
		// 						remainingMatsList.push(material);
		// 					} else {
		// 						carryUpVal = Math.floor((material.NewAmount + carryUpVal) / 5);
		// 						material.NewAmount = 0;
		// 						destroyMatsList.push(material);
		// 					}
	
		// 					if (carryUpVal <= 0) carryUpVal = 0;
		// 					console.log(basicInfoForm(`carryUpVal 2nd @ ${breakPoint}: ${carryUpVal}`));
	
		// 					console.log(specialInfoForm(`NEW VALUES!! Name: ${material.Name} \nNewAmount: ${material.NewAmount}`));
		// 					breakPoint--;
		// 					if (breakPoint === 0) break;
		// 				}
		// 				if (carryUpVal > 0) {
		// 					const theWantedMaterial = foundMaterialList.filter(mat => mat.Rar_id === chosenRarID);
		// 					highestPossibleCombine = {
		// 						Name: theWantedMaterial[0].Name,
		// 						Value: theWantedMaterial[0].Value,
		// 						MatType: theWantedMaterial[0].MatType,
		// 						Mat_id: theWantedMaterial[0].Mat_id,
		// 						Rarity: theWantedMaterial[0].Rarity,
		// 						Rar_id: theWantedMaterial[0].Rar_id,
		// 						CurrentAmount: carryUpVal,
		// 					};
		// 				}
		// 			}
	
		// 			// How to handle amount specification...
	
		// 			// inputAmount = final result wanted
		// 			// chosenRarID = * 5
	
		// 			// For each rarity below * 5 until common
	
		// 			// EXAMPLE:
	
		// 			// First check item with rar_id: (chosenRarID - 1);
		// 			// Compare and check if material has enough to complete requested combine
	
		// 			// const firstBackCheck = filterLower.filter(mat => mat.rar_id === (chosenRarID - 1));
	
		// 			// matListStaticSlice = foundMaterialList.filter(mat => mat.Rar_id === (chosenRarID - 1));
		// 			// tempMatCopy.push(matListStaticSlice[0]);
	
		// 			// const fbcTotalMats = firstBackCheck.reduce((totalAmount, mat) => totalAmount + mat.amount, 0);
	
		// 			//	if (fbcTotalMats < (5 * inputAmount)) { 
		// 			// Try to combine lower as normal
		// 			// chosenRarID = 2 (Rare)
		// 			// inputAmount = 1
	
		// 			// Uncommon needed = 5
		// 			// Common needed = 25
	
		// 			// Formula for common = (5 ** chosenRarID) * inputAmount;
		// 			// Formula for uncommon = (5 ** (chosenRarID - 1)) * inputAmount;
		// 			// Formula for rare = (5 ** (chosenRarID - 2)) * inputAmount;
		// 			// Formula for very rare = (5 ** (chosenRarID - 3)) * inputAmount;
		// 			// Formula for epic = (5 ** (chosenRarID - 4)) * inputAmount;
	
		// 			// Formula to implement 
	
		// 			// totNewRarMat = (((5 ** (chosenRarID - rarRun)) * inputAmount) / 5);
		// 			// addedRarMats = totNewRarMat;
	
	
		// 			// totRemainingRarMat = totRarMat - ((5 ** (chosenRarID - rarRun)) * inputAmount);
	
		// 			//	} else { 
		// 			// Leave all lower values alone and finish using only these values
	
		// 			//	} 
	
		// 			// ChosenRarID can be used to iterate
		// 			//let curRarRunList;
	
		// 			//let matListStaticSlice;
		// 			//let tempMatCopy = [];
	
	
		// 			//let rarRun = 0;
		// 			//if (firstBackCheck.length <= 0) {
		// 			//	//Try to combine lower as normal
		// 			//	do {
		// 			//		curRarRunList = filterLower.filter(mat => mat.rar_id === rarRun);
	
		// 			//		if (curRarRunList.length <= 0) {
		// 			//			//No materials of this rarity found, ignore for now and continue to next rarity
		// 			//			addedRarMats /= 5;
		// 			//			addedRarMats = Math.floor(addedRarMats);
		// 			//			if (addedRarMats <= 0) addedRarMats = 0;
		// 			//			rarRun++;
		// 			//		} else {
		// 			//			console.log(specialInfoForm(`Current material being checked: ${curRarRunList[0].name}`));
	
		// 			//			matListStaticSlice = foundMaterialList.filter(mat => mat.Rar_id === rarRun);
		// 			//			tempMatCopy.push(matListStaticSlice[0]);
	
		// 			//			const totRarMat = await curRarRunList.reduce((totalAmount, mat) => totalAmount + mat.amount, addedRarMats);
		// 			//			if (totRarMat < ((5 ** (chosenRarID - rarRun)) * inputAmount)) {
		// 			//				//Not enough to combine, ignore for now and continue to next rarity
		// 			//				rarRun++;
		// 			//			} else {
		// 			//				let totNewRarMat;
		// 			//				if (rarRun === chosenRarID) {
		// 			//					totNewRarMat = inputAmount;
		// 			//				} else {
		// 			//					totNewRarMat = Math.floor((((5 ** (chosenRarID - rarRun)) * inputAmount) / 5)); //New Rarity materials created
		// 			//				}
	
		// 			//				if (totNewRarMat > 0) {
		// 			//					addedRarMats = totNewRarMat; //This will assign the final outcome value passed further!
		// 			//				} else {
		// 			//					addedRarMats = 0;
		// 			//				} 
	
		// 			//				let totRemainRarMat;
		// 			//				if (rarRun === chosenRarID) {
		// 			//					totRemainRarMat = inputAmount;
		// 			//				} else {
		// 			//					totRemainRarMat = (totRarMat - ((5 ** (chosenRarID - rarRun)) * inputAmount)); //Remaing old rarity materials
		// 			//                         }
	
	
		// 			//				if (totRemainRarMat > 0) {
		// 			//					//Prepare remaining entry
		// 			//					const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: totRemainRarMat }),);
	
		// 			//					tempMatCopy = [];
	
		// 			//					console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
		// 			//					console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 			//					remainingMatsList.push(...mappedMat);
		// 			//				} else {
		// 			//					//Prepare destroy entry
		// 			//					const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: 0 }),);
	
		// 			//					tempMatCopy = [];
	
		// 			//					console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
		// 			//					console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 			//					destroyMatsList.push(...mappedMat);
		// 			//				}
		// 			//				rarRun++;
		// 			//			}
		// 			//		}
		// 			//	} while (rarRun < (chosenRarID + 1)) 
		// 			//} else if (fbcTotalMats < (5 * inputAmount)) {
		// 			//	const fbcMatDiffStatic = (fbcTotalMats - (5 * inputAmount)); //THIS WILL BE A NEGATIVE VALUE!!
		// 			//	let fbcMatDiffValue = fbcMatDiffStatic * 5;
		// 			//	addedRarMats = 0;
		// 			//	rarRun = chosenRarID - 2; //This one less than last rar checked allowing access to this logic
		// 			//	do {
		// 			//		curRarRunList = filterLower.filter(mat => mat.rar_id === rarRun);
	
		// 			//		if (curRarRunList.length <= 0) {
		// 			//			//No materials of this rarity found, ignore for now and continue to next rarity
		// 			//			//addedRarMats = 0;
		// 			//			fbcMatDiffValue *= 5;
		// 			//			rarRun--;
		// 			//		} else {
		// 			//			tempMatCopy = [];
		// 			//			console.log(specialInfoForm(`Current material being checked: ${curRarRunList[0].name}`));
		// 			//			matListStaticSlice = foundMaterialList.filter(mat => mat.Rar_id === rarRun);
		// 			//			tempMatCopy.push(matListStaticSlice[0]);
	
		// 			//			console.log(specialInfoForm(`Current material being checked: ${matListStaticSlice[0].Name}`));
	
		// 			//			const totRarMat = await curRarRunList.reduce((totalAmount, mat) => totalAmount + mat.amount, addedRarMats);
	
		// 			//			if (totRarMat < (5 * inputAmount)) {
		// 			//				//Not enough to combine, ignore for now and continue to next rarity
		// 			//				console.log(specialInfoForm('NOT ENOUGH TO COMBINE, CHECKING NEXT RARITY'));
		// 			//				fbcMatDiffValue *= 5;
		// 			//				rarRun--;
		// 			//			} else {
		// 			//				// if final rarity is epic, chosenRarID = 4
		// 			//				// at this point very rare has been checked and failed
	
		// 			//				// if rarity being checked is rare, rarRun = 2
		// 			//				// if rarity being checked is uncommon, rarRun = 1
		// 			//				// if rarity being checked is common, rarRun = 0
	
		// 			//				const totNewRarMat = Math.floor((((5 ** (chosenRarID - rarRun)) * inputAmount) / 5));
	
		// 			//				const checkDiffOne = fbcMatDiffValue + totNewRarMat;
		// 			//				if (Math.sign(checkDiffOne) === 1) {
		// 			//					console.log(specialInfoForm('DIFFERENCE HAS BEEN MADE UP'));
		// 			//					//Difference has been made up, stop search and start upwards proccess
	
		// 			//					//This value is the remaining after subtracting the needed materials
		// 			//					const totRemainingRarMats = (totRarMat - ((-1 * fbcMatDiffValue) * inputAmount));
		// 			//					console.log(specialInfoForm(`totRemainingRarMats: ${totRemainingRarMats}`));
		// 			//					//This gives the number of base materials needed to set fbcMatDiffValue to 0
		// 			//					const totNeededForCombine = totRarMat - totRemainingRarMats;
		// 			//					console.log(specialInfoForm(`totNeededForCombine: ${totNeededForCombine}`));
	
		// 			//					addedRarMats = totNeededForCombine;
	
		// 			//					//This checks which list to put the material into for later handling
		// 			//					if (totRemainingRarMats > 0) {
		// 			//						//Prepare remaining entry
		// 			//						const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: totRemainingRarMats }),);
	
		// 			//						tempMatCopy = [];
	
		// 			//						console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
		// 			//						console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 			//						remainingMatsList.push(...mappedMat);
		// 			//					} else {
		// 			//						//Prepare destroy entry
		// 			//						const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: 0 }),);
	
		// 			//						tempMatCopy = [];
	
		// 			//						console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
		// 			//						console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 			//						destroyMatsList.push(...mappedMat);
		// 			//					}
	
		// 			//					if (rarRun === (chosenRarID - 2)) {
		// 			//						console.log(specialInfoForm('RARRUN IS @ STARTING POSITION HANDLE EXITING'));
		// 			//						//Currently at second top most level || Rarity first evaluated
		// 			//						//Recheck firstBackCheck with further backchecked values then try to combineCheck
		// 			//						matListStaticSlice = foundMaterialList.filter(mat => mat.Rar_id === (chosenRarID - 1));
		// 			//						tempMatCopy.push(matListStaticSlice[0]);
	
		// 			//						fbcTotalMats = firstBackCheck.reduce((totalAmount, mat) => totalAmount + mat.amount, addedRarMats);
	
		// 			//						//Success!!
		// 			//						const fbcRemainingMats = fbcTotalMats - (5 * inputAmount);
		// 			//						if (fbcRemainingMats > 0) {
		// 			//							//Prepare remaining entry
		// 			//							const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: fbcRemainingMats }),);
	
		// 			//							tempMatCopy = [];
	
		// 			//							console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
		// 			//							console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 			//							remainingMatsList.push(...mappedMat);
		// 			//						} else {
		// 			//							//Prepare destroy entry
		// 			//							const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: 0 }),);
	
		// 			//							tempMatCopy = [];
	
		// 			//							console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
		// 			//							console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 			//							destroyMatsList.push(...mappedMat);
		// 			//						}
	
		// 			//						addedRarMats = inputAmount;
		// 			//						fbcMatDiffValue = 0;
		// 			//						break;
		// 			//					} else {
		// 			//						fbcMatDiffValue /= 5;
		// 			//						rarRun++;
		// 			//					}
		// 			//				} else if (Math.sign(checkDiffOne) === -1) {
		// 			//					//Difference has not yet been made up, continue search
		// 			//					console.log(specialInfoForm('DIFFERENCE REMAINING CHECKING NEXT RAR DOWN'));
		// 			//					fbcMatDiffValue += totNewRarMat;
		// 			//					fbcMatDiffValue *= 5;
		// 			//					rarRun--;
		// 			//				} else if (Math.sign(checkDiffOne) === 0) {
		// 			//					console.log(specialInfoForm('DIFFERENCE IS EXACTLY 0'));
		// 			//					//This means an exact match was made and the outcome is 0
		// 			//					//This value is the remaining after subtracting the needed materials
		// 			//					const totRemainingRarMats = (totRarMat - ((-1 * fbcMatDiffValue) * 5));
		// 			//					//This gives the number of base materials needed to set fbcMatDiffValue to 0
		// 			//					const totNeededForCombine = totRarMat - totRemainingRarMats;
	
		// 			//					addedRarMats = totNeededForCombine;
	
		// 			//					//This checks which list to put the material into for later handling
		// 			//					if (totRemainingRarMats > 0) {
		// 			//						//Prepare remaining entry
		// 			//						const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: totRemainingRarMats }),);
	
		// 			//						tempMatCopy = [];
	
		// 			//						console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
		// 			//						console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 			//						remainingMatsList.push(...mappedMat);
		// 			//					} else {
		// 			//						//Prepare destroy entry
		// 			//						const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: 0 }),);
	
		// 			//						tempMatCopy = [];
	
		// 			//						console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
		// 			//						console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 			//						destroyMatsList.push(...mappedMat);
		// 			//					}
	
		// 			//					if (rarRun === (chosenRarID - 2)) {
		// 			//						//Currently at second top most level || Rarity first evaluated
		// 			//						//Recheck firstBackCheck with further backchecked values then try to combineCheck
		// 			//						matListStaticSlice = foundMaterialList.filter(mat => mat.Rar_id === (chosenRarID - 1));
		// 			//						tempMatCopy.push(matListStaticSlice[0]);
	
		// 			//						fbcTotalMats = firstBackCheck.reduce((totalAmount, mat) => totalAmount + mat.amount, addedRarMats);
	
		// 			//						//Success!!
		// 			//						const fbcRemainingMats = fbcTotalMats - (5 * inputAmount);
		// 			//						if (fbcRemainingMats > 0) {
		// 			//							//Prepare remaining entry
		// 			//							const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: fbcRemainingMats }),);
	
		// 			//							tempMatCopy = [];
	
		// 			//							console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
		// 			//							console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 			//							remainingMatsList.push(...mappedMat);
		// 			//						} else {
		// 			//							//Prepare destroy entry
		// 			//							const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: 0 }),);
	
		// 			//							tempMatCopy = [];
	
		// 			//							console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
		// 			//							console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 			//							destroyMatsList.push(...mappedMat);
		// 			//						}
	
		// 			//						addedRarMats = inputAmount;
		// 			//						fbcMatDiffValue = 0;
		// 			//					} else {
		// 			//						fbcMatDiffValue /= 5;
		// 			//						rarRun++;
		// 			//					}
		// 			//				}
		// 			//			}
		// 			//		}
		// 			//		rarRun--;
		// 			//		if (rarRun === -1) break;
		// 			//		if (rarRun === chosenRarID) break;
		// 			//	} while (fbcMatDiffValue !== 0)
	
		// 			//	if (rarRun === -1) console.log(warnedForm('Combine check unsucsessful, providing options for continuing anyway..'));
		// 			//} else {
		// 			//	//Leave all lower values alone and finish using only these values
		// 			//	//fbcTotalMats
		// 			//	const totNewRarMat = inputAmount;
		// 			//	if (totNewRarMat > 0) {
		// 			//		addedRarMats = totNewRarMat; //This will assign the final outcome value passed further!
		// 			//	} else addedRarMats = 0;
	
		// 			//	const totRemainRarMat = (fbcTotalMats - (5 * inputAmount)); //Remaing old rarity materials
		// 			//	if (totRemainRarMat > 0) {
		// 			//		//Prepare remaining entry
		// 			//		const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: totRemainRarMat }),);
	
		// 			//		tempMatCopy = [];
	
		// 			//		console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
		// 			//		console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 			//		remainingMatsList.push(...mappedMat);
		// 			//	} else {
		// 			//		//Prepare destroy entry
		// 			//		const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: 0 }),);
	
		// 			//		tempMatCopy = [];
	
		// 			//		console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
		// 			//		console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 			//		destroyMatsList.push(...mappedMat);
		// 			//	}
		// 			//}
	
		// 			//if (rarRun === -1) {
		// 			//	//Attempting to preform incomplete combine!!
		// 			//	addedRarMats = 0;
		// 			//	let newRarRun = 0;
		// 			//	do {
		// 			//		curRarRunList = filterLower.filter(mat => mat.rar_id === newRarRun);
		// 			//		console.log(specialInfoForm(`Current material being checked: ${curRarRunList[0].name}`));
	
		// 			//		if (curRarRunList.length <= 0) {
		// 			//			//Material not found skip for now
		// 			//			addedRarMats = 0;
		// 			//			newRarRun++;
		// 			//		} else {
		// 			//			matListStaticSlice = foundMaterialList.filter(mat => mat.Rar_id === newRarRun);
		// 			//			tempMatCopy.push(matListStaticSlice[0]);
	
		// 			//			const totRarMat = await curRarRunList.reduce((totalAmount, mat) => totalAmount + mat.amount, addedRarMats);
		// 			//			if (totRarMat < 5) {
		// 			//				//Not enough to combine, ignore for now and continue to next rarity
		// 			//				addedRarMats = 0;
		// 			//				newRarRun++;
		// 			//			} else {
		// 			//				const totNewRarMat = Math.floor(totRarMat / 5); //New Rarity materials created
		// 			//				if (totNewRarMat > 0) {
		// 			//					addedRarMats = totNewRarMat; //This will assign the final outcome value passed further!
		// 			//				} else addedRarMats = 0;
	
		// 			//				const totRemainRarMat = (totRarMat % 5); //Remaing old rarity materials
		// 			//				if (totRemainRarMat > 0) {
		// 			//					//Prepare remaining entry
		// 			//					const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: totRemainRarMat }),);
	
		// 			//					tempMatCopy = [];
	
		// 			//					console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
		// 			//					console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 			//					remainingMatsList.push(...mappedMat);
		// 			//				} else {
		// 			//					//Prepare destroy entry
		// 			//					const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: 0 }),);
	
		// 			//					tempMatCopy = [];
	
		// 			//					console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
		// 			//					console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));
	
		// 			//					destroyMatsList.push(...mappedMat);
		// 			//				}
		// 			//				newRarRun++;
		// 			//                     }
		// 			//                 }
	
		// 			//	} while (newRarRun < (chosenRarID - 1))
	
		// 			//	addedRarMats = 0;
		// 			//         }
	
		// 			const acceptButton = new ButtonBuilder()
		// 				.setLabel("Yes")
		// 				.setStyle(ButtonStyle.Success)
		// 				.setEmoji('✅')
		// 				.setCustomId('accept');
	
		// 			const cancelButton = new ButtonBuilder()
		// 				.setLabel("No")
		// 				.setStyle(ButtonStyle.Danger)
		// 				.setEmoji('❌')
		// 				.setCustomId('cancel');
	
		// 			const interactiveButtons = new ActionRowBuilder().addComponents(acceptButton, cancelButton);
	
		// 			//if (wasCheckedList.length > 0) {
		// 			//	let checkListRun = 0;
		// 			//	do {
		// 			//		for (const theMat of wasCheckedList) {
		// 			//			if (theMat.NewAmount > 0) {
		// 			//				remainingMatsList.push(theMat);
		// 			//				checkListRun++;
		// 			//				break;
		// 			//			} else if (theMat.NewAmount <= 0) {
		// 			//				destroyMatsList.push(theMat);
		// 			//				checkListRun++;
		// 			//				break;
		// 			//			}
		// 			//		}
		// 			//	} while (checkListRun < wasCheckedList.length)
		// 			//}
	
		// 			let remainingMaterialsEmbed;
		// 			if (remainingMatsList.length > 0) {
		// 				let embedMatSlice;
	
		// 				let fieldValName;
		// 				let fieldValValue;
		// 				let fieldObject;
	
		// 				let remainingMatsFields = [];
	
		// 				//Handle fields values for each with remaining
		// 				let embedRun = 0;
		// 				do {
		// 					embedMatSlice = remainingMatsList[embedRun];
	
		// 					fieldValName = `${embedMatSlice.Name}`;
		// 					fieldValValue = `Rarity: **${embedMatSlice.Rarity}**\nAmount remaining: ${embedMatSlice.NewAmount}`;
	
		// 					fieldObject = { name: fieldValName.toString(), value: fieldValValue.toString(), };
	
		// 					remainingMatsFields.push(fieldObject);
	
		// 					embedRun++;
		// 				} while (embedRun < remainingMatsList.length)
	
		// 				//Create embed
		// 				remainingMaterialsEmbed = {
		// 					title: `~REMAINING MATERIALS~`,
		// 					color: 0o0,
		// 					description: `Remaining materials after combining!`,
		// 					fields: remainingMatsFields,
		// 				};
		// 			} else {
		// 				//Create embed
		// 				remainingMaterialsEmbed = {
		// 					title: `~NO REMAINING MATERIALS~`,
		// 					color: 0o0,
		// 					description: `Nothing remains after this combine!`,
		// 				};
		// 			}
	
	
	
		// 			let destroyedMaterialsEmbed;
		// 			if (destroyMatsList.length > 0) {
		// 				let embedMatSlice;
	
		// 				let fieldValName;
		// 				let fieldValValue;
		// 				let fieldObject;
	
		// 				let destroyedMatsFields = [];
	
		// 				//Handle fields values for each with remaining
		// 				let embedRun = 0;
		// 				do {
		// 					embedMatSlice = destroyMatsList[embedRun];
	
		// 					fieldValName = `${embedMatSlice.Name}`;
		// 					fieldValValue = `Rarity: **${embedMatSlice.Rarity}**\nAmount remaining: ${embedMatSlice.NewAmount}`;
	
		// 					fieldObject = { name: fieldValName.toString(), value: fieldValValue.toString(), };
	
		// 					destroyedMatsFields.push(fieldObject);
	
		// 					embedRun++;
		// 				} while (embedRun < destroyMatsList.length)
	
		// 				//Create embed
		// 				destroyedMaterialsEmbed = {
		// 					title: `~DESTROYED MATERIALS~`,
		// 					color: 0o0,
		// 					description: `Removed materials after combining!`,
		// 					fields: destroyedMatsFields,
		// 				};
		// 			} else {
		// 				//Create embed
		// 				destroyedMaterialsEmbed = {
		// 					title: `~NO DESTROYED MATERIALS~`,
		// 					color: 0o0,
		// 					description: `Nothing is destroyed after this combine!`,
		// 				};
		// 			}
	
		// 			let materialOutcomeEmbed
		// 			if (addedRarMats <= 0) {
		// 				//REQUESTED MATERIALS NOT CREATED
		// 				//Have access to addedRarMats, needed for display of requested materials 
		// 				if (highestPossibleCombine) {
		// 					if (highestPossibleCombine.CurrentAmount > 0) {
		// 						materialOutcomeEmbed = {
		// 							title: `~COMBINE INCOMPLETE~`,
		// 							color: 0o0,
		// 							description: `Combining will not yield any requested materials! It will instead yield ${highestPossibleCombine.CurrentAmount} ${highestPossibleCombine.Name}. Continue?`,
		// 						}
		// 					} else {
		// 						materialOutcomeEmbed = {
		// 							title: `~COMBINE INCOMPLETE~`,
		// 							color: 0o0,
		// 							description: `Combining will not yield any requested materials! Continue?`,
		// 						}
		// 					}
		// 				} else {
		// 					materialOutcomeEmbed = {
		// 						title: `~COMBINE INCOMPLETE~`,
		// 						color: 0o0,
		// 						description: `Combining will not yield any requested materials! Continue?`,
		// 					}
		// 				}
		// 			} else {
		// 				//MATERIALS CREATED
		// 				materialOutcomeEmbed = {
		// 					title: `~COMBINE COMPLETE~`,
		// 					color: 0o0,
		// 					description: `Combining will yield ${addedRarMats} of the requested material! Continue?`,
		// 				}
		// 			}
	
		// 			const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [remainingMaterialsEmbed, destroyedMaterialsEmbed, materialOutcomeEmbed] });
	
		// 			const filter = (i) => i.user.id === interaction.user.id;
	
		// 			const collector = embedMsg.createMessageComponentCollector({
		// 				ComponentType: ComponentType.Button,
		// 				filter,
		// 				time: 120000,
		// 			});
	
		// 			collector.on('collect', async (collInteract) => {
		// 				if (collInteract.customId === 'accept') {
		// 					await collInteract.deferUpdate().then(async () => {
		// 						const user = await UserData.findOne({ where: { userid: interaction.user.id } });
		// 						await checkHintMaterialDismantle(user, interaction);
		// 						await handleMultiCombine(remainingMatsList, destroyMatsList, matType, chosenRarID, addedRarMats, highestPossibleCombine);
		// 						await collector.stop();
		// 					}).catch(error => {
		// 						console.log(errorForm(error));
		// 					});
		// 				}
	
		// 				if (collInteract.customId === 'cancel') {
		// 					await collInteract.deferUpdate();
		// 					await collector.stop();
		// 				}
		// 			});
	
		// 			collector.on('end', () => {
		// 				if (embedMsg) {
		// 					embedMsg.delete().catch(error => {
		// 						if (error.code !== 10008) {
		// 							console.error('Failed to delete the message:', error);
		// 						}
		// 					});
		// 				}
		// 			});
		// 		}).catch(error => {
		// 			console.log(error);
		// 		});
		// 	}
	
		// 	if (interaction.options.getSubcommand() === 'view') {
		// 		await interaction.deferReply();
		// 		const matType = interaction.options.getString('typeview');
		// 		const showAll = interaction.options.getBoolean('all');
		// 		const rarType = interaction.options.getString('rarity');
	
		// 		if (showAll === true) {
		// 			var fullMatMatchList;
		// 			if (matType !== 'unique') {
		// 				fullMatMatchList = await MaterialStore.findAll({ where: [{ spec_id: interaction.user.id }, { mattype: matType }] });
		// 				console.log(specialInfoForm(`fullMatMatchList NOT UNIQUE: ${fullMatMatchList}`));
	
		// 				if (fullMatMatchList.length <= 0) return interaction.followUp('You have no materials of that type!');
		// 			} else {
		// 				fullMatMatchList = await MaterialStore.findAll({ where: [{ spec_id: interaction.user.id }, { rarity: 'Unique' }] });
		// 				console.log(specialInfoForm(`fullMatMatchList IS UNIQUE: ${fullMatMatchList}`));
	
		// 				if (fullMatMatchList.length <= 0) return interaction.followUp('You have no materials of that type!');
		// 			}
					
		// 			var embedPages = [];
	
		// 			const rarityTypes = ["Common", "Uncommon", "Rare", "Very Rare", "Epic", "Mystic", "?", "??", "???", "????"];
		// 			let fullRarList;
		// 			let rarCheckNum = 0;
	
		// 			let embedColour = 0o0;
		// 			let list = ``;
	
		// 			let curRun = 0;
		// 			if (matType !== 'unique') {
		// 				do {
		// 					fullRarList = fullMatMatchList.filter(mat => mat.rarity === rarityTypes[rarCheckNum]);
							
		// 					if (fullRarList.length <= 0) {
		// 						rarCheckNum++;
		// 					} else {	
		// 						embedColour = await grabColour(rarCheckNum);
								
		// 						for (const matCheck of fullRarList) {
		// 							list = `Type: ${matCheck.mattype}\nValue: ${matCheck.value}\nRarity: ${matCheck.rarity}\nAmount: ${matCheck.amount}`;
	
		// 							const displayEmbed = new EmbedBuilder()
		// 								.setTitle('~MATERIAL~')
		// 								.setColor(embedColour)
		// 								.addFields({
		// 									name: `${matCheck.name}`, value: list,
		// 								});
		// 							embedPages.push(displayEmbed);
		// 							break;
		// 						}
		// 						rarCheckNum++;
		// 						curRun++;
		// 					}
		// 				} while (curRun < fullMatMatchList.length)
		// 			} else {
		// 				do {
		// 					fullRarList = fullMatMatchList.filter(mat => mat.rarity === 'Unique');
							
		// 					if (fullRarList.length <= 0) {
		// 						//rarCheckNum++;
		// 					} else {
		// 						embedColour = await grabColour(12);
		// 						let breakPoint = 0;
		// 						for (const matCheck of fullRarList) {
		// 							list = `Type: ${matCheck.mattype}\nValue: ${matCheck.value}\nRarity: ${matCheck.rarity}\nAmount: ${matCheck.amount}`;
	
		// 							const displayEmbed = new EmbedBuilder()
		// 								.setTitle('~MATERIAL~')
		// 								.setColor(embedColour)
		// 								.addFields({
		// 									name: `${matCheck.name}`, value: list,
		// 								});
		// 							embedPages.push(displayEmbed);
		// 							breakPoint++;
		// 							if (breakPoint === fullRarList.length) break;
		// 						}
		// 					}
		// 					curRun++;
		// 					//rarCheckNum++;
		// 				} while (curRun < fullMatMatchList.length)
		// 			}
	
		// 			const backButton = new ButtonBuilder()
		// 				.setLabel("Back")
		// 				.setStyle(ButtonStyle.Secondary)
		// 				.setEmoji('◀️')
		// 				.setCustomId('back-page');
	
		// 			const cancelButton = new ButtonBuilder()
		// 				.setLabel("Cancel")
		// 				.setStyle(ButtonStyle.Secondary)
		// 				.setEmoji('*️⃣')
		// 				.setCustomId('delete-page');
	
		// 			const forwardButton = new ButtonBuilder()
		// 				.setLabel("Forward")
		// 				.setStyle(ButtonStyle.Secondary)
		// 				.setEmoji('▶️')
		// 				.setCustomId('next-page');
	
		// 			const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);
	
		// 			const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });
	
		// 			const filter = (ID) => ID.user.id === interaction.user.id;
	
		// 			const collector = embedMsg.createMessageComponentCollector({
		// 				componentType: ComponentType.Button,
		// 				filter,
		// 				time: 300000,
		// 			});
	
		// 			var currentPage = 0;
	
		// 			collector.on('collect', async (collInteract) => {
		// 				if (collInteract.customId === 'next-page') {
		// 					if (currentPage === embedPages.length - 1) {
		// 						currentPage = 0;
		// 						await collInteract.deferUpdate().then(async () => {
		// 							await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] })
		// 						});
		// 					} else {
		// 						currentPage += 1;
		// 						await collInteract.deferUpdate().then(async () => {
		// 							await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] })
		// 						});
		// 					}
		// 				}
	
		// 				if (collInteract.customId === 'back-page') {
		// 					if (currentPage === 0) {
		// 						currentPage = embedPages.length - 1;
		// 						await collInteract.deferUpdate().then(async () => {
		// 							await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] })
		// 						});
		// 					} else {
		// 						currentPage -= 1;
		// 						await collInteract.deferUpdate().then(async () => {
		// 							await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] })
		// 						});
		// 					}
		// 				}
	
		// 				if (collInteract.customId === 'delete-page') {
		// 					await collInteract.deferUpdate();
		// 					await collector.stop();
		// 				}
		// 			});
	
		// 			collector.on('end', () => {
		// 				if (embedMsg) {
		// 					embedMsg.delete().catch(error => {
		// 						if (error.code !== 10008) {
		// 							console.error('Failed to delete the message:', error);
		// 						}
		// 					});
		// 				}
		// 			});
	
		// 		} else if (showAll === false) {
		// 			if (!rarType) return interaction.followUp('Please select a rarity to display!');
		// 			var chosenRarID;
		// 			if (matType === 'unique') {
		// 				return await interaction.channel.send('You cannot view one of unique material type, please use this command where <all> is <true> and leave the <rarity> option blank!');
		// 			} else {
		// 				if (rarType === 'common') {
		// 					chosenRarID = 0;
		// 				} else if (rarType === 'uncommon') {
		// 					chosenRarID = 1;
		// 				} else if (rarType === 'rare') {
		// 					chosenRarID = 2;
		// 				} else if (rarType === 'very rare') {
		// 					chosenRarID = 3;
		// 				} else if (rarType === 'epic') {
		// 					chosenRarID = 4;
		// 				} else if (rarType === 'mystic') {
		// 					chosenRarID = 5;
		// 				} else if (rarType === '?') {
		// 					chosenRarID = 6;
		// 				} else if (rarType === '??') {
		// 					chosenRarID = 7;
		// 				} else if (rarType === '???') {
		// 					chosenRarID = 8;
		// 				} else if (rarType === '????') {
		// 					chosenRarID = 9;
		// 				} else {
		// 					return interaction.followUp('That was not a valid option!');
		// 				}
		// 			}
		// 			const fullMatMatchList = await MaterialStore.findAll({ where: [{ spec_id: interaction.user.id }, { rar_id: chosenRarID }, { mattype: matType }] });
	
		// 			if (fullMatMatchList.length <= 0) return interaction.followUp('You have no materials of that type or rarity!');
	
		// 			const theMaterial = fullMatMatchList[0];
	
		// 			const embedColour = await grabColour(chosenRarID);
	
		// 			const list = `Category: ${theMaterial.mattype} \nRarity: ${theMaterial.rarity} \nValue: ${theMaterial.value} \nAmount: ${theMaterial.amount}`;
	
		// 			const displayEmbed = new EmbedBuilder()
		// 				.setTitle('~MATERIAL~')
		// 				.setColor(embedColour)
		// 				.addFields({
		// 					name: `${theMaterial.name}`, value: list,
		// 				});
	
		// 			await interaction.followUp({ embeds: [displayEmbed] }).then(async embedMsg => setTimeout(() => {
		// 				embedMsg.delete();
		// 			}, 60000)).catch(error => {
		// 				if (error.code !== 10008) {
		// 					console.error('Failed to delete the message:', error);
		// 				}
		// 			});
		// 		}
		// 	}
	
		// 	if (interaction.options.getSubcommand() === 'dismantle') {
		// 		await interaction.deferReply();
		// 		const matType = interaction.options.getString('type');
		// 		const rarType = interaction.options.getString('rarity');
	
		// 		var chosenRarID;
		// 		if (rarType === 'common') {
		// 			chosenRarID = 0;
		// 		} else if (rarType === 'uncommon') {
		// 			chosenRarID = 1;
		// 		} else if (rarType === 'rare') {
		// 			chosenRarID = 2;
		// 		} else if (rarType === 'very rare') {
		// 			chosenRarID = 3;
		// 		} else if (rarType === 'epic') {
		// 			chosenRarID = 4;
		// 		} else if (rarType === 'mystic') {
		// 			chosenRarID = 5;
		// 		} else if (rarType === '?') {
		// 			chosenRarID = 6;
		// 		} else if (rarType === '??') {
		// 			chosenRarID = 7;
		// 		} else if (rarType === '???') {
		// 			chosenRarID = 8;
		// 		} else if (rarType === '????') {
		// 			chosenRarID = 9;
		// 		} else {
		// 			return interaction.followUp('That was not a valid option!');
		// 		}
	
		// 		const fullMatMatchList = await MaterialStore.findAll({ where: [{ spec_id: interaction.user.id }, { rar_id: chosenRarID }, { mattype: matType }] });
	
		// 		if (fullMatMatchList.length <= 0) return interaction.followUp('You have no materials of that type or rarity!');
		// 		const theAmount = interaction.options.getInteger('amount');
		// 		let totalMaterials;
		// 		let totalNewMaterials;
		// 		let theRemainder;
		// 		if (!theAmount) {
		// 			totalMaterials = await fullMatMatchList.reduce((totalAmount, item) => totalAmount + item.amount, 0);
		// 			console.log(basicInfoForm('totalMaterials: ', totalMaterials));
	
		// 			totalNewMaterials = Math.floor((totalMaterials * 5));
		// 			console.log(basicInfoForm('totalNewMaterials: ', totalNewMaterials));
		// 		} else {
		// 			totalMaterials = await fullMatMatchList.reduce((totalAmount, item) => totalAmount + item.amount, 0);
		// 			console.log(basicInfoForm('totalMaterials: ', totalMaterials));
		// 			if (totalMaterials < theAmount) {
		// 				return interaction.followUp('You do not have that many materials of that type or rarity!');
		// 			} else if (totalMaterials === theAmount) {
		// 				totalNewMaterials = Math.floor((totalMaterials * 5));
		// 				console.log(basicInfoForm('totalNewMaterials: ', totalNewMaterials));
		// 			} else {
		// 				theRemainder = totalMaterials - theAmount;
		// 				totalMaterials = theAmount;
		// 				totalNewMaterials = Math.floor((totalMaterials * 5));
		// 				console.log(basicInfoForm('totalNewMaterials: ', totalNewMaterials));
		// 			}
		// 		}
				
	
		// 		const acceptButton = new ButtonBuilder()
		// 			.setLabel("Yes")
		// 			.setStyle(ButtonStyle.Success)
		// 			.setEmoji('✅')
		// 			.setCustomId('accept');
	
		// 		const cancelButton = new ButtonBuilder()
		// 			.setLabel("No")
		// 			.setStyle(ButtonStyle.Danger)
		// 			.setEmoji('❌')
		// 			.setCustomId('cancel');
	
		// 		const interactiveButtons = new ActionRowBuilder().addComponents(acceptButton, cancelButton);
	
		// 		const list = `Total materials to be dismantled ${totalMaterials}, Total new materials ${totalNewMaterials}`;
	
	
		// 		const confirmEmbed = new EmbedBuilder()
		// 			.setColor('Blurple')
		// 			.setTitle('Confirm Dismantle')
		// 			.addFields(
		// 				{
		// 					name: `Would you really like to dismantle ${totalMaterials}: ${rarType} ${matType} owned?`,
		// 					value: list,
	
		// 				});
	
		// 		const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [confirmEmbed] });
	
		// 		const filter = (i) => i.user.id === interaction.user.id;
	
		// 		const collector = embedMsg.createMessageComponentCollector({
		// 			ComponentType: ComponentType.Button,
		// 			filter,
		// 			time: 120000,
		// 		});
	
		// 		collector.on('collect', async (collInteract) => {
		// 			if (collInteract.customId === 'accept') {
		// 				await collInteract.deferUpdate();
		// 				await handleDismantleMaterials(totalNewMaterials, matType, chosenRarID, theRemainder);
		// 				await collector.stop();
		// 			}
	
		// 			if (collInteract.customId === 'cancel') {
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
	
		// 	// This method handles dismantling materials into their counterparts
		// 	async function handleDismantleMaterials(newMatAmount, matType, chosenRarID, theRemainder) {
		// 		let remainingMatAmount = 0;
		// 		if (theRemainder) {
		// 			remainingMatAmount = theRemainder;
		// 		}
		// 		var passType;
		// 		let listStr;
		// 		listStr = `${matType}List.json`;
		// 		passType = `${matType}`;
	
		// 		const foundMaterialList = require(`../../events/Models/json_prefabs/materialLists/${listStr}`);
		// 		if (!foundMaterialList) {
		// 			console.log(errorForm('MaterialList NOT FOUND!'));
		// 			return 0;
		// 		}
	
		// 		var foundRar = (chosenRarID - 1);
	
		// 		let matDropPool = [];
		// 		for (var x = 0; x < foundMaterialList.length; x++) {
		// 			if (foundMaterialList[x].Rar_id === foundRar) {
		// 				//Rarity match add to list
		// 				matDropPool.push(foundMaterialList[x]);
		// 			} else {/**KEEP LOOKING*/ }
		// 		}
	
		// 		if (matDropPool.length > 0) {
		// 			console.log(successResult(`matDropPool Contents: ${matDropPool}`));
	
		// 			const finalMaterial = matDropPool[0];
		// 			console.log(successResult(`Material Dropped: ${finalMaterial.Name}`));
	
		// 			let droppedNum = newMatAmount;
	
		// 			const result = await handleMaterialAdding(finalMaterial, droppedNum, interaction.user.id, passType);
		// 			await interaction.followUp(`${droppedNum} ${finalMaterial.Name} Dropped!`);
		// 			if (result) {
		// 				if (remainingMatAmount === 0) {
		// 					const matDestroyed = await MaterialStore.destroy({ where: [{ spec_id: interaction.user.id }, { rar_id: chosenRarID }, { mattype: passType }] });
		// 					if (matDestroyed > 0) {
		// 						//Material updated successfully
		// 						console.log(successResult('Material dismantled and destroyed!'));
		// 					}
		// 				} else {
		// 					const matUpdated = await MaterialStore.update({ amount: remainingMatAmount }, { where: [{ spec_id: interaction.user.id }, { rar_id: chosenRarID }, { mattype: passType }] });
		// 					if (matUpdated > 0) {
		// 						//Material updated successfully
		// 						console.log(successResult('Material dismantled!'));
		// 					}
		// 				}
		// 			}
		// 		} else return interaction.followUp('That item cannot be dismantled further!');
		// 	}
	
		// 	// This method cycles through the given material lists in order to update, create, or destroy the related data
		// 	async function handleMultiCombine(remainingMatList, destroyMatList, matType, chosenRarID, droppedNum, altMaterial) {
		// 		var passType;
		// 		let listStr;
		// 		listStr = `${matType}List.json`;
		// 		passType = `${matType}`;
	
		// 		const foundMaterialList = require(`../../events/Models/json_prefabs/materialLists/${listStr}`);
		// 		if (!foundMaterialList) {
		// 			console.log(errorForm('MaterialList NOT FOUND!'));
		// 			return 0;
		// 		}
	
		// 		if (remainingMatList.length <= 0) {
		// 			//No remaining materials to handle
		// 		} else {
		// 			//Remaining materials to handle
		// 			let remainBreakConst = 0;
		// 			for (const theMaterial of remainingMatList) {
		// 				const firstCheck = await MaterialStore.findOne({ where: [{ spec_id: interaction.user.id }, { rar_id: theMaterial.Rar_id }, { matType: passType }] });
		// 				if (!firstCheck) {
		// 					//Material does not exist yet
		// 					await MaterialStore.create({
		// 						name: theMaterial.Name,
		// 						value: theMaterial.Value,
		// 						mattype: matType,
		// 						mat_id: theMaterial.Mat_id,
		// 						rarity: theMaterial.Rarity,
		// 						rar_id: theMaterial.Rar_id,
		// 						amount: theMaterial.NewAmount,
		// 						spec_id: interaction.user.id
		// 					});
	
		// 					const secondCheck = await MaterialStore.findOne({ where: [{ spec_id: interaction.user.id }, { rar_id: theMaterial.Rar_id }, { matType: passType }] });
		// 					if (secondCheck) {
		// 						//Material entry created!
		// 						console.log(successResult('Material created successful!'));
		// 						remainBreakConst++;
		// 					} else console.log(warnedForm('Something went wrong while creating new material'));
		// 				} else {
		// 					const matUpdated = await MaterialStore.update({ amount: theMaterial.NewAmount }, { where: [{ spec_id: interaction.user.id }, { rar_id: theMaterial.Rar_id }, { mattype: passType }] });
		// 					if (matUpdated > 0) {
		// 						//Material updated successfully
		// 						console.log(successResult('Material update successful!'));
		// 						remainBreakConst++;
		// 					} else console.log(warnedForm('Something went wrong when updating material'));
		// 				}
	
		// 				if (remainBreakConst === remainingMatList.length) break;
		// 			}
		// 		}
	
		// 		if (destroyMatList.length <= 0) {
		// 			//No materials to destroy!
		// 		} else {
		// 			//Materials to destroy!
		// 			let destroyBreakConst = 0;
		// 			for (const theMaterial of destroyMatList) {
		// 				const firstCheck = await MaterialStore.findOne({ where: [{ spec_id: interaction.user.id }, { rar_id: theMaterial.Rar_id }, { matType: passType }] });
		// 				if (!firstCheck) {
		// 					//Do nothing, entry already doesnt exist 
		// 					destroyBreakConst++;
		// 				} else {
		// 					const matDestroyed = await MaterialStore.destroy({ where: [{ spec_id: interaction.user.id }, { rar_id: theMaterial.Rar_id }, { mattype: passType }] });
		// 					if (matDestroyed) {
		// 						//Material updated successfully
		// 						console.log(successResult('Material destroyed successful!'));
		// 						destroyBreakConst++;
		// 					} else console.log(warnedForm('Something went wrong while destroying material'));
		// 				}
	
		// 				if (destroyBreakConst === destroyMatList.length) break;
		// 			}
		// 		}
	
		// 		if (droppedNum > 0) {
		// 			var foundRar = chosenRarID;
	
		// 			let matDropPool = [];
		// 			for (var x = 0; x < foundMaterialList.length; x++) {
		// 				if (foundMaterialList[x].Rar_id === foundRar) {
		// 					//Rarity match add to list
		// 					matDropPool.push(foundMaterialList[x]);
		// 				} else {/**KEEP LOOKING*/ }
		// 			}
	
		// 			if (matDropPool.length > 0) {
		// 				const finalMaterial = matDropPool[0];
		// 				console.log(successResult(`Material Dropped: ${finalMaterial.Name}`));
	
		// 				await handleMaterialAdding(finalMaterial, droppedNum, interaction.user.id, passType);
		// 				await interaction.followUp(`${droppedNum} ${finalMaterial.Name} Dropped!`);
		// 			}
		// 		} else {
		// 			if (altMaterial.CurrentAmount > 0) {
		// 				var foundRar = altMaterial.Rar_id;
	
		// 				let matDropPool = [];
		// 				for (var x = 0; x < foundMaterialList.length; x++) {
		// 					if (foundMaterialList[x].Rar_id === foundRar) {
		// 						//Rarity match add to list
		// 						matDropPool.push(foundMaterialList[x]);
		// 					} else {/**KEEP LOOKING*/ }
		// 				}
	
		// 				if (matDropPool.length > 0) {
		// 					const finalMaterial = matDropPool[0];
		// 					console.log(successResult(`Material Dropped: ${finalMaterial.Name}`));
	
		// 					await handleMaterialAdding(finalMaterial, altMaterial.CurrentAmount, interaction.user.id, passType);
		// 					await interaction.followUp(`${altMaterial.CurrentAmount} ${finalMaterial.Name} Dropped!`);
		// 				}
		// 			}
		// 		}
		// 	}
	
		// 	// This method is outdated and no longer used!
		// 	async function handleMaterials(newMatAmount, remainingMatAmount, matType, chosenRarID) {
	
		// 		var passType;
		// 		let listStr;
		// 		listStr = `${matType}List.json`;
		// 		passType = `${matType}`;
	
		// 		const foundMaterialList = require(`../../events/Models/json_prefabs/materialLists/${listStr}`);
		// 		if (!foundMaterialList) {
		// 			console.log(errorForm('MaterialList NOT FOUND!'));
		// 			return 0;
		// 		}
	
		// 		var foundRar = (chosenRarID + 1);
	
		// 		let matDropPool = [];
		// 		for (var x = 0; x < foundMaterialList.length; x++) {
		// 			if (foundMaterialList[x].Rar_id === foundRar) {
		// 				//Rarity match add to list
		// 				matDropPool.push(foundMaterialList[x]);
		// 			} else {/**KEEP LOOKING*/ }
		// 		}
	
		// 		if (matDropPool.length > 0) {
		// 			console.log(successResult(`matDropPool Contents: ${matDropPool}`));
	
		// 			const finalMaterial = matDropPool[0];
		// 			console.log(successResult(`Material Dropped: ${finalMaterial.Name}`));
	
		// 			let droppedNum = newMatAmount;
	
		// 			const result = await handleMaterialAdding(finalMaterial, droppedNum, interaction.user.id, passType);
		// 			await interaction.followUp(`${droppedNum} ${finalMaterial.Name} Dropped!`);
		// 			if (result) {
		// 				if (remainingMatAmount === 0) {
		// 					const matDestroyed = await MaterialStore.destroy({ where: [{ spec_id: interaction.user.id }, { rar_id: chosenRarID }, { mattype: passType }] });
		// 					if (matDestroyed > 0) {
		// 						//Material updated successfully
		// 					}
		// 				} else {
		// 					const matUpdated = await MaterialStore.update({ amount: remainingMatAmount }, { where: [{ spec_id: interaction.user.id }, { rar_id: chosenRarID }, { mattype: passType }] });
		// 					if (matUpdated > 0) {
		// 						//Material updated successfully
		// 					}
		// 				}
		// 			}
		// 		} else return interaction.followUp('That item cannot be combined further!');
		// 	}
	
		// 	//This method creates a new material entry || increments an existing one
		// 	async function handleMaterialAdding(material, droppedAmount, userID, matType) {
		// 		const matStore = await MaterialStore.findOne({
		// 			where: [{ spec_id: userID }, { mat_id: material.Mat_id }, { mattype: matType }]
		// 		});
	
		// 		console.log(basicInfoForm('UserMaterial: ', matStore));
	
		// 		if (matStore) {
		// 			droppedAmount += matStore.amount;
		// 			const inc = await MaterialStore.update({ amount: droppedAmount },
		// 				{ where: [{ spec_id: userID }, { mat_id: material.Mat_id }, { mattype: matType }] });
	
		// 			if (inc) console.log(successResult('AMOUNT WAS UPDATED!', droppedAmount));
	
		// 			return matStore;
		// 		}
	
		// 		const newMat = await MaterialStore.create({
		// 			name: material.Name,
		// 			value: material.Value,
		// 			mattype: matType,
		// 			mat_id: material.Mat_id,
		// 			rarity: material.Rarity,
		// 			rar_id: material.Rar_id,
		// 			amount: droppedAmount,
		// 			spec_id: userID
		// 		});
	
		// 		if (newMat) {
		// 			const materialEntry = await MaterialStore.findOne({
		// 				where: [{ spec_id: userID }, { mat_id: material.Mat_id }, { mattype: matType }]
		// 			});
	
		// 			console.log(successResult(`Material Entry: ${materialEntry}`));
	
		// 			return materialEntry;
		// 		}
		// 	}
		// }
	},
};
