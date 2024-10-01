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
const { makeCapital, grabUser, grabActivePigmy, sendTimedChannelMessage, createConfirmCancelButtonRow, createInteractiveChannelMessage, handleCatchDelete, editTimedChannelMessage, randArrPos, inclusiveRandNum, endTimer, makePrettyNum } = require('../../uniHelperFunctions.js');
const { loadFullDismantleList, baseCheckRarName } = require('../Development/Export/itemStringCore.js');
const { checkInboundMat } = require('../Development/Export/itemMoveContainer.js');
const { handleUserPayout, handlePigmyPayouts, pigLvlScaleCheck } = require('../Development/Export/uni_userPayouts.js');
const { createBasicPageButtons } = require('./exported/tradeExtras.js');
const {NavMenu} = require('../Development/Export/Classes/NavMenu.js');


module.exports = {
	helptypes: ['Material', 'Payout', 'Combat', 'Quest', 'Luck', 'Level'],
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

				const isOverwrite = pigmy[`${toolType}`] !== 'NONE';
				const isEquipped = isOverwrite && pigmy[`${toolType}`] === toolName;
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
					.setDescription(`Replace current ${makeCapital(toolType)} ${pigmy[`${toolType}`]} with **${toolName}**?`);
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
				// if (interaction.user.id !== '501177494137995264') return await interaction.reply({content: 'Command under construction! Check back later!', ephemeral: true});
				const pigmyInspectDisplay = await loadPigmyDisplay(pigmy);

				const pigPicLoadAnchor = await interaction.reply({embeds: [new EmbedBuilder().setTitle('Loading Pigmy!')]});

			return await editTimedChannelMessage(pigPicLoadAnchor, 120000, {files: [pigmyInspectDisplay], embeds: []});
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


		async function loadPigmyDisplay(pig){
			const drawDisplayStartTime = new Date().getTime();
			const {masterBPCrafts} = interaction.client;
			const pRef = pigmyList.find(p => p.ID === pig.refid);

			const canvas = Canvas.createCanvas(700, 400);
			const ctx = canvas.getContext('2d');

			// Load Background & Pigmy Picture
			const background = await Canvas.loadImage(pRef.BackRef);
			const pigPic = await Canvas.loadImage(pRef.PngRef);
			ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

			const baseStyle = {
				fontSize: '25px',
				font: 'sans-serif',
				fillStyle: 'white',
				clearCurrentStyles(){
					ctx.font = this.fontSize + " " + this.font;
					ctx.fillStyle = this.fillStyle;
				},
				clearCurrentSize(){
					ctx.font = this.fontSize + " " + this.font;
				},
				clearCurrentColour(){
					ctx.fillStyle = this.fillStyle;
				},
				applySize(px){
					ctx.font = `${px}px ` + this.font;
				},
				applyColour(colour){
					ctx.fillStyle = colour;
				}
			};

			// ctx.font = baseStyle.fontSize + " " + baseStyle.font;
			// ctx.fillStyle = baseStyle.fillStyle;
			baseStyle.clearCurrentStyles();

			// PigmyPicDimensions: (Alias) ppDims
			const ppDims = {
				w: 250,
				h: 250
			};

			const topMargin = 65;
			const leftMargin = 20;

			// LineSpacing: (Alias) lsp
			const lsp = {
				// Standard spacing between text groups
				spaceBetween: 35, 
				// Standard spacing between text lines
				spaceBelow: 25,
				// Combined total text height bottoms
				bottomTotal: 0, 
				// Line data Object
				lines: {
					// Above PigmyPic
					one: leftMargin, 
					// Last string measured of line one
					oneLastTxt: '', 
					// Bottom of `lsp.one`
					oneB: topMargin,

					// Right of PigmyPic
					two: leftMargin + ppDims.w, 
					// Last string measured of line two
					twoLastTxt: '', 
					// Bottom of `lsp.two`
					twoB: topMargin, 

					// Right of PigmyPic
					three: leftMargin + ppDims.w, 
					// Last string measured of line three
					threeLastTxt: '', 
					// Bottom of `lsp.three`
					threeB: topMargin,

					// Right of PigmyPic
					four: leftMargin + ppDims.w, 
					// Last string measured of line four
					fourLastTxt: '', 
					// Bottom of `lsp.four`
					fourB: topMargin, 
				},
				/**
				 * This method increases the given `line` by the given `pxInc`
				 * @param {string} line Line to increase
				 * @param {number} pxInc Pixel Width to add to given `line`
				 * @returns {number} Updated Pixel Width of given `line`
				 */
				incLineWidth(line, pxInc){
					this.lines[line] += pxInc;
					return this.lines[line];
				},
				/**
				 * This method measures the given `text`,
				 * first setting `this.lines["${line}LastText"]` to `text`, 
				 * then passing the Pixel width to `this.incLineWidth` as 
				 * `(line, text.width + this.spaceBetween)`
				 *  
				 * returns the total updated Pixel width
				 * @param {string} line Line to increase
				 * @param {string} text Text being draw on the canvas
				 * @returns {number} Updated Pixel Width of given `line`
				 */
				addLineTxt(line, text){
					const txtWidth = ctx.measureText(text).width;
					this.lines[`${line}LastTxt`] = text;
					return this.incLineWidth(line, txtWidth + this.spaceBetween);
				},
				textLineWidth(text){
					return ctx.measureText(text).width;
				},
				outLineWidth(line){
					console.log(`Measured Total Width of Line ${line}: `, this.lines[line], 'px');
				},
				/**
				 * This method handles checking the bottom bounding box of the given `line`'s
				 * text. It adds this to the `this.bottomTotal` and returns its value. 
				 * @param {string} line Line to set bottom height of
				 * @returns {number} Total Pixel Height from ctx.top to bottom of `line` given
				 */
				bottomLineSet(line){
					const bottomPX = ctx.measureText(this.lines[`${line}LastTxt`]).actualBoundingBoxAscent;
					this.bottomTotal += bottomPX; //this.lines[`${line}B`];
					this.lines[`${line}B`] += this.bottomTotal + this.spaceBelow; // bottomPX
					// console.log(`Line ${line} bottom set at: ${this.lines[`${line}B`]}`);
					return this.bottomTotal;
				},
				bottomTotalSet(line){
					this.bottomTotal = this.lines[`${line}B`];
				},
				bottomLineGet(line){
					return this.lines[`${line}B`];
				},
				handleOutOfBound(line, text){
					const isOutOfBounds = (txt) => (this.lines[line] + ctx.measureText(txt).width) >= canvas.width;
					if (isOutOfBounds(text)){
						// Resize font until not out of bounds
						let fontSize = 25;
						do {
							// Downsize font by 5px
							fontSize -= 5;
							// Failsafe
							if (fontSize <= 0) break; 
							// Apply size to ctx
							baseStyle.applySize(fontSize);
						} while (isOutOfBounds(text));
					} else return;
				},
				handleMaxSetLength(text, pxMax){
					const isOutOfBounds = (txt) => ctx.measureText(txt).width >= pxMax;
					if (isOutOfBounds(text)){
						let fontSize = 25;
						do {
							// Downsize font by 5px
							fontSize -= 5;
							// Failsafe
							if (fontSize <= 0) break; 
							// Apply size to ctx
							baseStyle.applySize(fontSize);
						} while (isOutOfBounds(text));
					} else return;
				}
			};

			if (pig.title !== 'NONE'){
				const titleMatch = masterBPCrafts.get(pig.title);
				baseStyle.applyColour(grabColour(titleMatch.Rar_id, true));
			}


			// Load/Draw Title ==> Name
			const titleText = (pig.title === 'NONE') ? "No Title": pig.title;
			// !!TITLE!! Placement is || margin => titleText <== (((PigmyPic.width - leftMargin) - titleText.width) / 2) 
			ctx.fillText(titleText, lsp.incLineWidth('one', ((ppDims.w - lsp.textLineWidth(titleText)) / 2) - leftMargin), topMargin);
			baseStyle.clearCurrentColour();
			// lsp.lines.one
			lsp.addLineTxt('one', titleText);

			// Load/Draw Name
			const nameText = makeCapital(pig.name);
			// Remaining Canvas Width
			const rcw = canvas.width - lsp.lines.one;
			// !!NAME!! Placement is || lsp.lines.one => {== (Remaining Canvas Width - nameText.width) / 2 ==} ==> nameText <== {== Remaining Canvas Width / 2 ==} ||
			ctx.fillText(nameText, lsp.incLineWidth('one', ((rcw - lsp.textLineWidth(nameText)) / 2)), topMargin);
			// lsp.outLineWidth('one');
			lsp.bottomLineSet('one');
			
			//ctx.strokeStyle = 'red';
			//ctx.strokeRect(leftMargin, lsp.bottomLineGet('one') - 25, ppDims.w, ppDims.h);
			
			//ctx.strokeStyle = 'blue';
			//ctx.strokeRect(leftMargin, lsp.bottomTotal, ppDims.w, ppDims.h);
			// console.log(lsp.bottomTotal);
			// Draw pigmy picture
			ctx.drawImage(pigPic, leftMargin, lsp.bottomTotal + lsp.spaceBelow, ppDims.w, ppDims.h);
			const pigPicSpacing = (lsp.bottomTotal + lsp.spaceBelow + ppDims.h);
			lsp.bottomTotalSet('one');
			// Load/Draw Pigmy Type Below ^^^
			// Load proper pigmy Type Text
			const typeText = (pRef.Type === 'NONE') 
			? 'Typeless Pigmy'
			: `${pRef.Type} Pigmy`;

			// If not NONE, apply colour to type
			if (pRef.Type !== 'NONE'){
				switch(pRef.Type){
					case "Fire":
						baseStyle.applyColour('red');
					break;
					case "Frost":
						baseStyle.applyColour('cyan');
					break;
					case "Light":
						baseStyle.applyColour('#ECFFDC');
					break;
					case "Dark":
						baseStyle.applyColour('#191970');
					break;
					case "Magic":
						baseStyle.applyColour('#DAA520');
					break;
					case "Elder":
						baseStyle.applyColour('burgundy');
					break;
					case "NULL":
						baseStyle.applyColour('rebeccapurple');
					break;
				}
			}
			ctx.fillText(typeText, leftMargin + (((ppDims.w - leftMargin) - lsp.textLineWidth(typeText)) / 2), pigPicSpacing);
			baseStyle.clearCurrentColour();

			// Load/Draw Level ==> XP (Cur/Nxt) ==> Mood
			const infoText = {
				lvlTxt: `Level: ${pig.level}`,
				xpTxt: `XP: ${pig.exp}/${pigLvlScaleCheck(pig.level)}`,
				moodTxt: `Mood: ${pig.mood}`
			};

			// console.log('START OF LINE TWO');
			// lsp.outLineWidth('two');
			// Draw Level info
			ctx.fillText(infoText.lvlTxt, lsp.lines.two, lsp.bottomLineGet('one'));
			lsp.addLineTxt('two', infoText.lvlTxt);
			//lsp.outLineWidth('two');

			// const XPTEXT = 'XP:';
			// // Draw XP: text inline
			// ctx.fillText(XPTEXT, lsp.lines.two, lsp.bottomLineGet('one'));
			// // Handle xp text length
			// const xpTextBase = lsp.textLineWidth(XPTEXT);
			lsp.handleMaxSetLength(infoText.xpTxt, 100);
			// Draw XP info
			ctx.fillText(infoText.xpTxt, lsp.lines.two, lsp.bottomLineGet('one')); //  + xpTextBase
			//lsp.addLineTxt('two', XPTEXT);
			lsp.addLineTxt('two', infoText.xpTxt);
			baseStyle.clearCurrentStyles();

			// Check if Current mood text will display outside canvas bounds.
			// Resizes font accordingly
			lsp.handleOutOfBound('two', infoText.moodTxt);
			// Draw Mood info
			ctx.fillText(infoText.moodTxt, lsp.lines.two, lsp.bottomLineGet('one'));
			lsp.addLineTxt('two', infoText.moodTxt);
			// Reset ctx styles to defaults
			baseStyle.clearCurrentStyles();
			//lsp.outLineWidth('two');
			lsp.bottomLineSet('two');
			lsp.bottomTotalSet('two');


			//console.log('START OF LINE THREE');
			//lsp.outLineWidth('three');
			// Load/Draw Hat ===> Buff
			if (pig.hat !== 'NONE'){
				const hatMatch = masterBPCrafts.get(pig.hat);
				baseStyle.applyColour(grabColour(hatMatch.Rar_id, true));
			}
			const hatText = (pig.hat === 'NONE') 
			? 'No Hat!'
			: pig.hat;
			// Draw Hat: text above
			ctx.fillText('Hat:', lsp.lines.three, lsp.bottomLineGet('two') - 25);
			// Handle hat name length
			lsp.handleMaxSetLength(hatText, 150);
			// Draw hat text
			ctx.fillText(hatText, lsp.lines.three, lsp.bottomLineGet('two'));
			// Add to line length
			lsp.addLineTxt('three', hatText);
			// Clear hat styling
			baseStyle.clearCurrentStyles();
			

			// Draw Buff: text above
			ctx.fillText('Buff:', lsp.lines.three, lsp.bottomLineGet('two') - 25);
			
			const buffText = `${pRef.Buff}`;
			// Handle buff text out of bounds
			lsp.handleOutOfBound('three', buffText);
			// Draw buff text
			ctx.fillText(buffText, lsp.lines.three, lsp.bottomLineGet('two'));
			// Add to line length
			lsp.addLineTxt('three', buffText);
			// Clear font changes
			baseStyle.clearCurrentSize();

			lsp.bottomLineSet('three');
			lsp.bottomTotalSet('three');

			// Load/Draw Toy ===> D.P.L (dmg per lvl)
			if (pig.toy !== 'NONE'){
				const toyMatch = masterBPCrafts.get(pig.toy);
				baseStyle.applyColour(grabColour(toyMatch.Rar_id, true));
			}
			const toyText = (pig.toy === 'NONE') 
			? 'No Toy!'
			: pig.toy;
			// Draw Toy: text above
			ctx.fillText('Toy:', lsp.lines.four, lsp.bottomLineGet('three') - 25);
			// Handle toy name length
			lsp.handleMaxSetLength(toyText, 175);
			// Draw toy text
			ctx.fillText(toyText, lsp.lines.four, lsp.bottomLineGet('three'));
			// Add to line length
			lsp.addLineTxt('four', toyText);
			// Clear toy styling
			baseStyle.clearCurrentStyles();

			// Draw D.P.L: text above
			ctx.fillText(`D.P.L: ${pRef.DPL}`, lsp.lines.four, lsp.bottomLineGet('three') - 25);
			
			const dmgText = `Dmg Bonus: ${pRef.DPL * pig.level}`;
			// Handle dmg text out of bounds
			lsp.handleOutOfBound('four', dmgText);
			// Draw dmg text
			ctx.fillText(dmgText, lsp.lines.four, lsp.bottomLineGet('three'));
			// Add to line length
			lsp.addLineTxt('four', dmgText);
			// Clear font changes
			baseStyle.clearCurrentSize();

			const finalImage = new AttachmentBuilder(await canvas.encode('png'), {name: 'pigmy-inspect-image.png'});
			endTimer(drawDisplayStartTime, 'Total Pigmy Inspect Draw Display');

			return finalImage;
		}

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

			//console.log(claimBuffs);

			const staticMatChoices = loadFullDismantleList();
			//console.log(staticMatChoices);

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

					if (matRollObject.r === 10) matRollObject.r = 9;
					
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
				//console.log(matTypeList);
				const matTypeEmbed = new EmbedBuilder()
				.setTitle(`== ${makeCapital(matTypeList[0].matType)} Materials ==`)
				.setColor(grabColour((matTypeList.at(-1)).matRef?.Rar_id) ?? 0o0);

				const finalFields = [];
				for (const matDropObj of matTypeList){
					if (!matDropObj.matRef) throw new Error('MISSING MATERIAL INFO, LOGGING MAT LIST: ', ...matTypeList);
					//if (!matDropObj.matRef?.Rarity) console.log('MISSING MATERIAL INFO, LOGGING MAT LIST: ', ...matTypeList);
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
			console.log('Current Pigmy Happiness: %d\nNew Pigmy Happiness: %d', pig.happiness, happinessAfterClaim);
			
			// Final base display embed data
			const baseClaimDisplay = {
				title: `== ${makeCapital(pig.name)}'s Latest Bounty ==`,
				description: `After gathering and collecting for ${claimHours} hours straight, ${makeCapital(pig.name)} provides rewards!`,
				fields: [
					{
						name: "== Pigmy Rewards ==",
						value: `XP: **${makePrettyNum(finalPigmyXP)}**`
					},
					{
						name: "== Pigmy Happiness ==",
						value: `Mood changed!\n**${grabMoodString(pig.happiness)}** ==> **${grabMoodString(happinessAfterClaim)}**`
					},
					{
						name: "== Your Rewards ==",
						value: `XP: **${makePrettyNum(finalPlayerXP)}**\nCOIN: **${makePrettyNum(finalPlayerCoin)}**c`
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
			const toolUpdateObj = {[details.toolType]: details.toolName};
			await pig.update(toolUpdateObj).then(async p => await p.save()).then(async p => {return await p.reload()});

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
	},
};
