const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');

const {
	warnedForm,
	errorForm,
	successResult,
	failureResult,
	basicInfoForm,
	specialInfoForm
} = require('../../chalkPresets.js');

const { UserData, Milestones, ActiveDungeon } = require('../../dbObjects.js');
//const { loadDungeon } = require('./exported/handleDungeon.js');

const dungeonList = require('../../events/Models/json_prefabs/dungeonList.json');
const loreList = require('../../events/Models/json_prefabs/loreList.json');
const bossList = require('../../events/Models/json_prefabs/bossList.json');
const { 
	grabUser, 
	sendTimedChannelMessage, 
	createInteractiveChannelMessage, 
	handleCatchDelete, 
	endTimer, 
	dropChance,
	inclusiveRandNum
} = require('../../uniHelperFunctions.js');
const { 
	loadPlayer, 
	genAttackTurnEmbed, 
	genStatusResultEmbed, 
	handleEnemyAttack, 
	loadDamageItems, 
	loadDefenceItems 
} = require('../Development/Export/finalCombatExtras.js');
const { preloadFloor, loadBossStage } = require('./exported/dungeonCombatExtras.js');
const { CombatInstance } = require('../Development/Export/Classes/CombatLoader.js');
const { createNewEnemyImage, displayBossPic } = require('./exported/displayEnemy.js');
const { attackEnemy, handleActiveStatus, applyActiveStatus } = require('../Development/Export/combatContainer.js');
const { EnemyFab, xpPayoutScale } = require('../Development/Export/Classes/EnemyFab.js');
const { handleLootDrops } = require('../Development/Export/questUpdate.js');
const { handleUserPayout } = require('../Development/Export/uni_userPayouts.js');
//const { createNewBlueprint } = require('./exported/createBlueprint.js');
const { dropBlueprint, grabBPRef } = require('../Development/Export/blueprintFactory.js');
const { mienSpeaks } = require('./exported/mienSpeaks.js');

const loadCombButts = (player) => {
    const attackButton = new ButtonBuilder()
    .setCustomId('attack')
    .setLabel('Strike')
    .setStyle(ButtonStyle.Primary);

    const hideButton = new ButtonBuilder()
    .setCustomId('hide')
    .setLabel(player.buttonState.hide.txt)
    .setDisabled(player.buttonState.hide.disable)
    .setStyle(ButtonStyle.Secondary);

    const stealButton = new ButtonBuilder()
    .setCustomId('steal')
    .setLabel(player.buttonState.steal.txt)
    .setDisabled(true)
    .setStyle(ButtonStyle.Secondary);

    const blockButton = new ButtonBuilder()
    .setCustomId('block')
    .setLabel('Block Attack')
    .setDisabled(true)
    .setStyle(ButtonStyle.Secondary);

    let buttLabel, usePot = true;
    if (player.potion.name !== ""){
        if (player.potion.amount <= 0){
            buttLabel = `0 ${player.potion.name} Remain`;
        } else if (player.potion.isCooling){
            buttLabel = `CoolDown: ${player.potion.cCount}`;
        } else {
            buttLabel = `${player.potion.amount} ${player.potion.name}`;
            usePot = false;
        }
    } else buttLabel = "No Potion";

    const potButton = new ButtonBuilder()
    .setCustomId('potion')
    .setLabel(buttLabel)
    .setDisabled(usePot)
    .setStyle(ButtonStyle.Secondary);

    return [hideButton, attackButton, stealButton, blockButton, potButton];
};

module.exports = {
	cooldown: 60,
	helptypes: ['Combat', 'Story', 'Quest'],
	data: new SlashCommandBuilder()
	.setName('dungeon')
	.setDescription('Delve deep and find riches!')
	.addStringOption(option =>
		option
		.setName('name')
		.setDescription('Who does the dungeon belong too?')
		.setRequired(true)
	),

	async execute(interaction) { 
		// if (interaction.user.id !== '501177494137995264') return interaction.reply('This command is under construction, please check back later!');

		const { dungeonInstance, gearDrops, masterBPCrafts } = interaction.client;

		await interaction.deferReply();

		/**
		 * This function contains all preloading/display logic to allow for combat 
		 * looping abilities within this command scope.
		 * @returns {Promise<void>}
		 */
		async function startDungeonHandle(){
			const user = await grabUser(interaction.user.id);
			if (user.level < 25) return await interaction.followUp('You must reach a higher level before the secrets of the dungeons can be revealed! ||Level 25||');

			const nameGiven = interaction.options.getString('name').toLowerCase();
			const filterDungeon = dungeonList.filter(d => d.Boss.toLowerCase() === nameGiven)[0] ?? 'None';

			let theDungeon = filterDungeon;

			// Check milestones for progress.
			const storyData = await Milestones.findOne({where: {userid: user.userid}});
			if (!storyData) return await interaction.followUp('You must complete a quest first! ``/quest start`` and ``/quest claim``');

			const lineList = ["None", "Souls", "Dark", "Torture", "Chaos", "Law", "Hate", "Myst", "Secret", "Dream"];
			const nameList = ["None", "wadon", "dyvulla", "ados", "zimmir", "phamnera", "xogdia", "mien", "nizdea", "fayrn"];
			
			console.log(theDungeon);

			const maxStoryLine = lineList.indexOf(storyData.currentquestline);
			const activeStory = (nameList.includes(nameGiven)) ? nameList.indexOf(nameGiven) : lineList.indexOf(storyData.currentquestline);
			if (activeStory > maxStoryLine) return await interaction.followUp(`You must defeat ${Math.abs(activeStory - maxStoryLine)} bosses before this one!!`);

			let lineFilter = loreList.filter(lore => lore.StoryLine === activeStory);
			lineFilter = lineFilter[lineFilter.length - 1];
			console.log(lineFilter);
			const reqQuestID = lineFilter.QuestID;
			console.log(reqQuestID);

			if (storyData.laststoryquest < reqQuestID) return await interaction.followUp('This dungeon is still unknown to you! Keep questing!');

			// Match not found
			if (theDungeon === 'None'){
				theDungeon = dungeonList[activeStory - 1];
				
				const hintDungeonEmbed = new EmbedBuilder()
				.setTitle('Dungeon Not Found')
				.setDescription(`${theDungeon.Name} remains closed!`)
				.setColor('DarkRed')
				.addFields(
					{name: "Who rules this dungeon? Hint:", value: `${theDungeon.DungeonHint}`}
				);

				const hintReply = {embeds: [hintDungeonEmbed]};

				return await sendTimedChannelMessage(interaction, 60000, hintReply, "FollowUp");
			}

			// Check for existing dungeons
			let dungMatch, loadDung = false;
			const foundMatch = await ActiveDungeon.findOne({
				where: {
					dungeonspecid: user.userid,
					dungeonid: theDungeon.DungeonID
				}
			});

			if (foundMatch){
				loadDung = true;
				dungMatch = foundMatch;
			} else {
				console.log('CREATING NEW DUNGEON ENTRY');
				dungMatch = await handleDungeonLoad(theDungeon);
			}

			if (loadDung){
				// Enter the dungeon
				console.log('DUNGEON FOUND, LOADING DUNGEON NOW');
				return beginDungeon(dungMatch);
			}

			// let userDungeon, loadReady = false, overwrite = false, needUpdate = false;
			// const existingDungeon = await ActiveDungeon.findOne({where: {dungeonspecid: user.userid, dungeonid: theDungeon.DungeonID}});
			// if (existingDungeon){
			// 	// Dungeon exists
			// 	if (existingDungeon.dungeonid === theDungeon.DungeonID){
			// 		// Dungeon match found
			// 		loadReady = true;
			// 		userDungeon = existingDungeon;
			// 	} else if (existingDungeon.completed) {
			// 		// Dungeon completed, overwrite has no effect
			// 		needUpdate = true;
			// 		userDungeon = existingDungeon;
			// 	} else {
			// 		// Dungeon will be overwritten
			// 		overwrite = true;
			// 	}
			// }

			// if (!existingDungeon){
			// 	// Create new dungeon
				
			// 	userDungeon = await handleDungeonLoad(theDungeon);
			// }
			// (overwrite) ? "Overwrite existing dungeon?":
			const acceptLabel = "Begin";

			const acceptButt = new ButtonBuilder()
			.setCustomId('accept')
			.setLabel(acceptLabel)
			.setStyle(ButtonStyle.Success)
			.setEmoji('✅');

			const cancelButt = new ButtonBuilder()
			.setCustomId('cancel')
			.setLabel('Cancel')
			.setStyle(ButtonStyle.Danger)
			.setEmoji('❌');

			const buttRow = new ActionRowBuilder().addComponents(acceptButt, cancelButt);

			// const overWriteEmbed = new EmbedBuilder()
			// .setTitle("Overwrite Dungeon")
			// .setColor('DarkRed')
			// .setDescription("Clear current dungeon progress and load new dungeon?");

			const dungeonEmbed = new EmbedBuilder()
			.setTitle(`${theDungeon.Name}`)
			.setColor('DarkAqua')
			.addFields(
				{name: 'Ruler: ', value: `**${theDungeon.Boss}**`, inline: true},
				{name: "Floors: ", value: `**${theDungeon.Floors}**`, inline: true},
				{name: "Checkpoints: ", value: `**${theDungeon.SavePoints}**`, inline: true}
			);

			const theRules = "Defeating the dungeon ruler is your goal! You will find them on the final floor!\n\nProgress is saved at the start of every 5th floor, dying will set you back to the last checkpoint.\nLoot, xp, and coins are given upon reaching a checkpoint every 5th floor!\nYour health in the dungeon is separated from regular combat, always starts at full when starting, and is fully restored upon reaching a checkpoint!";
			
			const rulesEmbed = new EmbedBuilder()
			.setTitle('Dungeon Rules')
			.setColor('White')
			.setDescription(theRules);
			//(overwrite) ? [overWriteEmbed, dungeonEmbed, rulesEmbed] :
			const embedList = [dungeonEmbed, rulesEmbed];
			const replyObj = {embeds: [embedList[0]], components: [buttRow]};

			const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, "FollowUp");

			let embedPage = 0;
			collector.on('collect', async c => {
				await c.deferUpdate().then(async () => {
					switch(c.customId){
						case "accept":
							if (embedPage + 1 === embedList.length){
								// Last page
								// Start dungeon
								return collector.stop('Loaded');
							} else {
								embedPage++;
							}
							// if (overwrite){
							// 	// Dungeon needs to be overwritten
							// 	userDungeon = await handleDungeonLoad(theDungeon, needUpdate);
							// 	embedPage++;
							// 	overwrite = false;
							// 	acceptButt.setLabel('Begin');
							// } else {
								
							// }
						break;
						case "cancel":
						return collector.stop('Canceled');
					}
					await anchorMsg.edit({embeds: [embedList[embedPage]], components: [buttRow]});
				}).catch(e => console.error(e));
			});

			collector.on('end', async (c, r) => {
				if (!r || r !== "Loaded"){
					return await handleCatchDelete(anchorMsg);
				}

				await handleCatchDelete(anchorMsg);

				return beginDungeon(dungMatch);
			});

			/**
			 * This function handles loading/updating a user assigned dungeon object,
			 * it returns the reloaded dungeon for further use.
			 * @param {object} dungeon JSON dungeon object 
			 * @param {boolean} update True if DB dungeon object needs updated values
			 * @returns {Promise<object>}
			 */
			async function handleDungeonLoad(dungeon, update){
				const healthModC = ["Mage", "Thief", "Warrior", "Paladin"];
				const healthModM = [1.1, 1.2, 1.5, 2];
				const healthBase = 100;

				const healthCalc = (healthBase + (user.level * 2) + (user.strength * 5)) * healthModM[healthModC.indexOf(user.pclass)];

				let finalDungeon = await ActiveDungeon.findOrCreate({
					where: {
						dungeonspecid: user.userid,
						dungeonid: dungeon.DungeonID,
					},
					defaults: {
						currentfloor: 1,
						lastsave: 1,
						currenthealth: healthCalc,
						completed: false
					}
				});

				if (finalDungeon[1]){
					await finalDungeon[0].save().then(async f => {return await f.reload()});
				}

				finalDungeon = finalDungeon[0];

				if (update){
					await finalDungeon.update({
						dungeonid: dungeon.DungeonID,
						currentfloor: 0,
						lastsave: 0,
						currenthealth: healthCalc
					}).then(async f => await f.save()).then(async f => {return await f.reload()});
				}

				return finalDungeon;
			}
		}

		
		async function beginDungeon(dungeon){
			const loadDungeonEmbed = new EmbedBuilder()
			.setTitle('Loading...')
			.setColor('Blurple')
			.setDescription('Dungeon Loading in progress, please hold...');

			const loadMsg = await interaction.followUp({embeds: [loadDungeonEmbed]});

			const startingFloor = (dungeon.lastsave > dungeon.currentfloor) 
			? dungeon.lastsave : dungeon.currentfloor;

			const dungeonRef = dungeonList.filter(d => d.DungeonID === dungeon.dungeonid)[0];

			// Create floor reference container
			const floorObj = {};
			for (let i = 0; i < dungeonRef.Floors - 1; i++){
				// Set floor cont to matching prop name of JSON dungeon ref
				// Assign new floor prop to ConstKey array from JSON dungeon ref
				floorObj[`Floor${i + 1}`] = dungeonRef[`Floor${i + 1}`];
			}
			//console.log(floorObj);

			const player = await handlePlayerLoad();
			// DUNGEON LOOPER
			dungeonLooper(dungeon, dungeonRef, floorObj, startingFloor, player);

			await handleCatchDelete(loadMsg);
		}

		/**
		 * This function handles the initial load of the players combatInstance.
		 * @returns {Promise<CombatInstance>}
		 */
		async function handlePlayerLoad(){
			const preLoadStart = new Date().getTime();

			const thePlayer = loadPlayer(interaction.user.id, dungeonInstance);
			if (!thePlayer.staticStats) await thePlayer.retrieveBasicStats(true);
            if (thePlayer.loadout.ids.length === 0) {
                await thePlayer.retrieveLoadout();
            } else {
                await thePlayer.reloadInternals(true);
            }

			const loadObj = thePlayer.loadout;
            thePlayer.staticDamage = loadDamageItems(loadObj.mainhand, loadObj.offhand);
            thePlayer.staticDefence = loadDefenceItems(loadObj);

			if (thePlayer.health < thePlayer.maxHealth) thePlayer.health = thePlayer.maxHealth;

			endTimer(preLoadStart, "Dungeon Combat Preload");

			return thePlayer;
		}

		/**
		 * This function handles all active dungeon processes, from saving to combat.
		 * @param {object} dungeon ActiveDungeon Instance Object
		 * @param {object} dungeonRef JSON Dungeon Reference
		 * @param {object} floorObj Container of all dungeon floor data
		 * @param {number} floorStart Floor number to start on
		 * @param {CombatInstance} player CombatInstance Player Object
		 */
		async function dungeonLooper(dungeon, dungeonRef, floorObj, floorStart, player){
			
			// ==== First Combat Loop ====
			// Load full floor
			// grab first enemy
			// Start combat looping against enemy
			// Load next enemy on combat win
			// Load next floor on empty enemy list

			let fEList = [], floorTracker = floorStart, eKillList = [], bossStage = 0;
			function loadFloor(){
				// Load Current Full Floor
				console.log('Current Floor: %d', floorTracker);

				const floorLoadStart = new Date().getTime();
				fEList = preloadFloor(floorObj[`Floor${floorTracker}`]);
				endTimer(floorLoadStart, "Dungeon Floor Loading");

				// console.log('Floor Loaded with data: ', ...fEList);
			}

			// Catch case starting at boss floor
			if (floorTracker < dungeonRef.BossFloor){
				loadFloor();
			}

			/**
			 * This function handles checking the current floors enemy list, according
			 * to the contents of the list will either first load the next floors enemies
			 * and then load the first enemy or load the next enemy for the current floor.
			 * @param {boolean} combCheck True if called from combat, Default: false
			 * @returns {Promise<EnemyFab>}
			 */
			async function loadNextEnemy(combCheck=false){
				if (bossStage < 1 && floorTracker < dungeonRef.BossFloor){
					if (combCheck){
						const enemyDefeatedEmbed = new EmbedBuilder()
						.setTitle('Enemy Defeated')
						.setColor('Grey')
						.setDescription('Next Enemy Spawned Automatically');
						await sendTimedChannelMessage(interaction, 25000, enemyDefeatedEmbed);
					}
					
	
					if (fEList.length === 0) {
						// Handle Floor Complete Message
						const floorClearEmbed = new EmbedBuilder()
						.setTitle('Floor Cleared')
						.setDescription(`Floor ${floorTracker} has been cleared!`)
						.setColor('White');
						await sendTimedChannelMessage(interaction, 25000, floorClearEmbed);
	
						floorTracker++;
						if (floorTracker % 5 === 0){
							// Checkpoint reached, Handle payouts
							await handleCheckpoint(floorTracker);
						}
						// Dont load boss floor
						if (floorTracker !== dungeonRef.BossFloor){
							loadFloor();
						}
					}
					// Dont handle boss floor
					if (floorTracker !== dungeonRef.BossFloor){
						let nextEnemy = fEList.splice(0,1);
						nextEnemy = nextEnemy[0];
	
						if (combCheck){
							await player.checkPotionUse();
							await player.handlePotionCounters();
						}
	
						return nextEnemy;
					}
				}

				if (bossStage === 3){
					// Boss killed, handle payouts here
					return handleBossPayouts(dungeonRef.Boss);
				}
				
				// Do boss floor stuff here
				bossStage++;
				
				const nextButt = new ButtonBuilder()
				.setCustomId('next')
				.setLabel('Continue..')
				.setStyle(ButtonStyle.Secondary);

				const dialogRow = new ActionRowBuilder().addComponents(nextButt);

				const {bossEmbeds, thumbFile} = loadBossDialog();
				const bossReply = {embeds: [bossEmbeds[0]], components: [dialogRow], files: [thumbFile]};

				const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, bossReply, "FollowUp");

				let curLine = 0;
				collector.on('collect', async c => {
					await c.deferUpdate().then(async () => {
						if (c.customId === 'next'){
							if (curLine + 1 === 3) return collector.stop('Boss Fight');

							curLine++;
							const isMienChoice = dungeonRef.Boss === 'Mien' && bossStage === 3 && curLine === 2;
							if (!isMienChoice) return await anchorMsg.edit({embeds: [bossEmbeds[curLine]], components: [dialogRow], files: [thumbFile]});

							// If mien choice active, send option button row, timeout on disabled buttons
							const mienButtRow = loadMienChoice();
							const mienReply = {embeds: [bossEmbeds[curLine]], components: mienButtRow, files: [thumbFile]};
							
							await anchorMsg.edit(mienReply);

							(setTimeout(async () => {
								for (const b of mienReply.components){
									b.setDisabled(false);
								}
		
								await anchorMsg.edit(mienReply);
							}, 10000))();
						} else if (c.customId === 'friend'){
							// Load extra mien dialog, Dungeon is complete!
							handleBossPayouts(dungeonRef.Boss);
							collector.stop('Friend');
							return mienSpeaks(interaction, await grabUser(interaction.user.id), thumbFile);
						}
						
					}).catch(e => console.error(e));
				});

				collector.on('end', async (c, r) => {
					await handleCatchDelete(anchorMsg);

					if (r !== 'Boss Fight') return;

					const loadedBoss = loadBossStage(bossStage, dungeonRef.Boss);
					return combatLooper(loadedBoss, true);
				});

				function loadMienChoice(){
					const dialogButtList = [];
					
					const befriendButt = new ButtonBuilder()
					.setCustomId('friend')
					.setLabel('Join Mien')
					.setDisabled(true)
					.setStyle(ButtonStyle.Primary);

					dialogButtList.push(befriendButt);

					nextButt
					.setLabel('Never!')
					.setDisabled(true)
					.setStyle(ButtonStyle.Primary);

					// "Next Button" placed as the first button displayed by default
					dialogButtList.unshift(nextButt);

					return new ActionRowBuilder().addComponents(...dialogButtList);
				}
			}

			/**
			 * This function creates and returns the fully constructed object reference list
			 * for all needed display objects to complete the current stages dialog.
			 * @returns {object{bossEmbeds: EmbedBuilder[], thumbFile: AttachmentBuilder}}
			 */
			function loadBossDialog(){
				const theBoss = bossList.find(boss => boss.NameRef === dungeonRef.Boss && boss.Stage === bossStage);

				const thumbFile = new AttachmentBuilder(theBoss.PngRef_Closeup);
				const thumb = theBoss.Image_Closeup;

				const bossEmbeds = [];
				const introEmbed = new EmbedBuilder(), lineOneEmbed = new EmbedBuilder(), lineTwoEmbed = new EmbedBuilder();
				introEmbed
				.setTitle(theBoss.Name)
				.setThumbnail(thumb)
				.setColor(theBoss.IntroC)
				.addFields(
					{name: '\u200b', value: `${theBoss.Intro}`}
				);
				lineOneEmbed
				.setTitle(theBoss.Name)
				.setThumbnail(thumb)
				.setColor(theBoss.Line_OneC)
				.addFields(
					{name: '\u200b', value: `${theBoss.Line_One}`}
				);
				lineTwoEmbed
				.setTitle(theBoss.Name)
				.setThumbnail(thumb)
				.setColor(theBoss.Line_TwoC)
				.addFields(
					{name: '\u200b', value: `${theBoss.Line_Two}`}
				);
				bossEmbeds.push(introEmbed, lineOneEmbed, lineTwoEmbed);

				return {bossEmbeds, thumbFile};
			}

			/**
			 * This function handles giving boss kill rewards. This includes blueprints
			 * coins, xp, and achievements. It also sets the dungeon as completed allowing
			 * for storyline progress to continue!
			 * @param {string} boss The name of the boss to use as a reference
			 */
			async function handleBossPayouts(boss){
				const checkPreComplete = dungeon.completed;
				await dungeon.update({completed: true}).then(async d => await d.save()).then(async d => {return await d.reload()});

				const bossRef = bossList.filter(b => b.NameRef === boss && b.Stage === 3)[0];
				const bossXP = Math.round(inclusiveRandNum(bossRef.XpMax, bossRef.XpMin));
				const bossCoin = Math.round(bossXP * 1.3);

				await handleUserPayout(bossXP, bossCoin, interaction, await grabUser(player.userId));

				// ======================
				// HANDLE THIS DIFFERENTLY 
				// ======================

				// Bosses when defeated unlock ``/craft`` progress upgrades,
				// they no longer drop gear blueprints!!

				// All bosses still drop pigmy toy plushies!!

				// Xogdia drops phasereader for forge blueprint still
				// Mien drops forge upgrade?

				const baseBoss = {
					craftText: bossRef.CraftText,
					repText: bossRef.RepeatText,
					checkBP: bossRef.HasBluey,
					sbpID: bossRef.SecretBPID,
					achive: bossRef.AchievementGet
				};

				const payOutFields = [], unlockFields = [];
				payOutFields.push({name: 'XP Gained: ', value: `${bossXP}`, inline: true}, {name: 'Coins Gained: ', value: `${bossCoin}c`, inline: true});

				if (!checkPreComplete) {
					// Plushie Blueprint
					await dropBlueprint(grabBPRef(masterBPCrafts, baseBoss.sbpID), await grabUser(player.userId), interaction);
					// await createNewBlueprint(baseBoss.sbpID, player.userId);

					// Crafting unlock fields
					unlockFields.push({name: 'CRAFTING PROGRESS: ', value: `${baseBoss.craftText}`});
				
					// Check Bluey unlock fields
					if (baseBoss.checkBP){
						await dropBlueprint(grabBPRef(masterBPCrafts, bossRef.BlueprintID), await grabUser(player.userId), interaction);
						// await createNewBlueprint(bossRef.BlueprintID, player.userId);
						unlockFields.push({name: 'BLUEPRINT UNLOCKED: ', value: `${bossRef.Blueprint}`});
					}

					// Achievement unlock fields
					unlockFields.push({name: 'ACHIEVEMENT UNLOCKED: ', value: `${baseBoss.achive}`});
				} else unlockFields.push({name: 'NO NEW PROGRESS!', value: `${baseBoss.repText} ...`});

				const titleChange = (bossRef.NameRef === 'Mien') ? "BOSS BEFRIENDED": "BOSS DEFEATED";

				const bossDefeatedEmbed = new EmbedBuilder()
				.setTitle(titleChange)
				.setColor('DarkAqua')
				.addFields(payOutFields)
				.addFields(unlockFields);

				await sendTimedChannelMessage(interaction, 120000, bossDefeatedEmbed);
			}

			/**
			 * This function handles payouts, healing, and dungeon updates upon reaching
			 * a checkpoint floor.
			 * @param {number} curFloor Current floor of the dungeon
			 */
			async function handleCheckpoint(curFloor){
				// Update dungeon checkpoint
				await dungeon.update({lastsave: curFloor, currentfloor: curFloor}).then(async d => await d.save()).then(async d => {return await d.reload()});

				// Heal Player
				player.health = player.maxHealth;

				// Handle Payouts
				const payoutEmbed = await handleDungeonPayouts();
				await sendTimedChannelMessage(interaction, 45000, payoutEmbed);

				// Reset Kill list
				eKillList = [];
			}

			/**
			 * This function handles payouts from the previous enemies defeated,
			 * returns the display of gained rewards.
			 * @returns {Promise<EmbedBuilder>}
			 */
			async function handleDungeonPayouts(){
				let totalXP = 0, totalCoins = 0, itemCount = 0, lvlTot = 0;
				for (const lvl of eKillList){
					if (dropChance(player.dropChance)) itemCount++;
					const payoutRange = xpPayoutScale(lvl);
					totalXP += inclusiveRandNum(payoutRange.max, payoutRange.min);
					lvlTot += lvl;
				}

				totalCoins = totalXP * 1.5;

				if (itemCount > 0){
					// Handle Item payouts
					const midLevel = Math.round(lvlTot / eKillList.length);
					const itemOutcome = await handleLootDrops(midLevel, itemCount, gearDrops, player.userId, true);
					console.log('Item Payouts: ', itemOutcome);
				}

				await handleUserPayout(totalXP, totalCoins, interaction, await grabUser(player.userId));

				const rewardEmbed = new EmbedBuilder()
				.setTitle('Checkpoint Rewards')
				.setColor('Green')
				.setDescription(`Rewards have been given, checkpoint has been set at ${dungeon.lastsave}`)
				.addFields(
					{name: 'XP: ', value: `${totalXP}`, inline: true},
					{name: 'COINS: ', value: `${totalCoins}`, inline: true},
					{name: 'ITEMS: ', value: `${itemCount}`, inline: true}
				);

				return rewardEmbed;
			}

			/**
			 * This function handles the core combat looping functionality, it is 
			 * modified from standard combat to allow for sequential enemy loading
			 * based on the dungeon floor data. There are no direct payouts, however
			 * upon enemy kill the level is tracked and stored for payouts.
			 * @param {EnemyFab} enemy EnemyFab Object
			 * @param {boolean} [bossGen=false] Set to true if loading boss image
			 */
			async function combatLooper(enemy, bossGen=false){
				if (!enemy) return console.log('Caught Boss Dialog Load!');
				await player.reloadInternals(true);

				const replyType = {};

				const displayStartTime = new Date().getTime();

				const eFile = (bossGen) ? await displayBossPic(enemy) : await createNewEnemyImage(enemy);
                replyType.files = [eFile];

				endTimer(displayStartTime, "Dungeon Final Display");

				const buttRow = new ActionRowBuilder().addComponents(loadCombButts(player));
				replyType.components = [buttRow];

				// REPLY TIME LOG
				const msgStart = new Date().getTime();

				const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 60000, replyType, "FollowUp");
				const combatMessage = anchorMsg, combCollector = collector;

				// REPLY TIME LOG
				endTimer(msgStart, "Dungeon Final Interaction Reply");

				combCollector.on('collect', async c => {
					await c.deferUpdate().then(async () => {
						// startTime = new Date().getTime();
						switch(c.customId){
							case "attack":
								await combCollector.stop(await handleCombatTurn(player, enemy));
							break;
							case "block":
								// NOT IN USE
							break;
							case "hide":
								await combCollector.stop(await handleHiding(player, enemy));
							break;
							case "steal":
								// await combCollector.stop(await handleStealing(player, enemy));
							break;
							case "potion":
								await combCollector.stop(await handlePotionUsed(player, enemy));
							break;
						}
					}).catch(e => console.error(e));
				});

				combCollector.on('end', async (c, r) => {
					console.log('Collector: ended with reason ', r);
	
					if (!r || r === 'time' || r === 'None') {
						return handleCatchDelete(combatMessage);
					}
	
					await handleCatchDelete(combatMessage);
	
					if (typeof r !== 'string'){
						await sendTimedChannelMessage(interaction, 35000, r.replyObj);
						r = r.outcome;
					}
	
					switch(r){
						case "EDEAD":
							if (!bossGen) eKillList.push(enemy.level);
						return combatLooper(await loadNextEnemy(true));
						case "PDEAD":
						return await handlePlayerDead(player, enemy);
						case "RELOAD":
							if (bossGen){
								// Boss turns count as cooldown turns
								await player.handlePotionCounters();
							}
						return combatLooper(enemy, bossGen);
					}
				});
			}

			/**
			 * This function contains the core functionality of all attacking related code
			 * @param {CombatInstance} player Combat Instance Object
			 * @param {EnemyFab} enemy Enemy Instance Object
			 * @returns {promise <string>} string: Action to take when ending collector
			 */
			async function handleCombatTurn(player, enemy){
				let enemyDead = false, playerCombEmbeds = [];
				const rolledCondition = {
					DH: player.rollDH(),
					Crit: player.rollCrit()
				};
				const combatResult = attackEnemy(player.staticDamage, enemy, rolledCondition, player);
				if (combatResult.outcome === 'Dead') enemyDead = true;
	
				let wasStatusChecked = "Status Not Checked";
				let returnedStatus = 'None';
				if (!enemyDead){
					wasStatusChecked = handleActiveStatus(combatResult, enemy, rolledCondition);
					if (wasStatusChecked !== "Status Not Checked" || enemy.activeEffects.length > 0){
						returnedStatus = applyActiveStatus(combatResult, enemy);
					}
				}
				
				// ================
				// RECHECK DEAD STATUS
				// ================
				if (enemy.flesh.HP <= 0) enemyDead = true;
	
				// ================
				// BUILD DAMAGE EMBED & DISPLAY IT
				// ================
	
				// REGULAR ATTACK TURN EMBED
				const dmgDealtEmbed = genAttackTurnEmbed(combatResult, wasStatusChecked?.DamagedType, rolledCondition);
				playerCombEmbeds.push(dmgDealtEmbed);
	
				// STATUS EFFECTS/DAMAGE EMBED?
				if (returnedStatus !== "None"){
					if (returnedStatus.totalAcc > 0 || returnedStatus.newEffects.length > 0){
						const statusEmbed = genStatusResultEmbed(returnedStatus);
						
						playerCombEmbeds.push(statusEmbed);
					}
				}
				const replyObj = {embeds: playerCombEmbeds};
				await sendTimedChannelMessage(interaction, 35000, replyObj);
	
				//console.log(enemy);
				//console.log(player);
				if (enemyDead) {
					// =================== TIMER END
					// endTimer(startTime, "Final Combat");
					// =================== TIMER END
					console.log("Enemy is dead!");
					return "EDEAD";
				}
	
				const eTurnOutcome = await handleEnemyAttack(player, enemy);
				await sendTimedChannelMessage(interaction, 35000, eTurnOutcome.replyObj);
				// =================== TIMER END
				// endTimer(startTime, "Final Combat");
				// =================== TIMER END
				return eTurnOutcome.outcome;
			}

			/**
			 * This function handles the effects of the held potion being used.
			 * @param {CombatInstance} player CombatInstance Object
			 * @param {EnemyFab} enemy EnemyFab Object
			 */
			async function handlePotionUsed(player, enemy){
				const outcome = await player.potionUsed();
				// Handle active potion status entry
				
				const potEmbed = new EmbedBuilder()
				.setTitle(outcome.title)
				.setDescription(outcome.desc);

				if (outcome.type === 'Heal'){
					potEmbed.addFields({name: "Your Health: ", value: `${player.health}`});
				}
				
				await sendTimedChannelMessage(interaction, 35000, potEmbed);
				return "RELOAD";
			}

			/**
			 * This function handles hiding and its outcomes.
			 * @param {CombatInstance} player CombatInstance Object
			 * @param {EnemyFab} enemy EnemyFab Object
			 * @returns {promise <string>}"RELOAD"
			 */
			async function handleHiding(player, enemy){
				const hideEmbed = new EmbedBuilder();
				let fail = false;
	
				const outcome = player.hiding(enemy);
				if (!outcome){
					// Hiding fail
					hideEmbed
					.setTitle('Failed!')
					.setColor('DarkRed')
					.addFields({name: "OH NO!", value: "You failed to hide!"});
					fail = true;
				} else {
					hideEmbed
					.setTitle('Success!')
					.setColor('LuminousVividPink')
					.addFields({name: "Well Done!", value: "You managed to hide!"});
					player.buttonState.hide.txt = "Escape!";
					player.buttonState.hide.disable = true;
				}
	
				await sendTimedChannelMessage(interaction, 45000, hideEmbed);
				return (fail) ? await handleEnemyAttack(player, enemy) : "RELOAD";
			}

			/**
			 * This function handles all updates due to the player dying.
			 * @param {CombatInstance} player Combat Instance Object
			 * @param {EnemyFab} enemy Enemy Instance Object
			 */
			async function handlePlayerDead(player, enemy){
				// ==========================
				// SETUP DB UPDATE QUE SYSTEM
				// ==========================
	
				// =============
				//  Player Dead
				// =============
				const reviveButton = new ButtonBuilder()
				.setCustomId('revive')
				.setLabel('Revive')
				.setStyle(ButtonStyle.Danger)
				.setEmoji('💀');
	
				const grief = new ActionRowBuilder().addComponents(reviveButton);
				
				const deathReminder = 'Fighting fearlessly till the end, you nonetheless succumbed to the darkness..';
				const checkpointCheck = `Floor ${dungeon.lastsave}`;

				const deadEmbed = new EmbedBuilder()
				.setTitle('You have fallen..')
				.setColor('DarkGold')
				.addFields(
					{ name: `Obituary`, value: deathReminder, inline: true },
					{name: 'Last Checkpoint: ', value: checkpointCheck, inline: true}
				);
	
				const combReplyObj = {embeds: [deadEmbed], components: [grief]};
				const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 60000, combReplyObj);
				const embedMsg = anchorMsg;
				
				// =============
				//    Revive
				// =============
				collector.on('collect', async c => {
					await c.deferUpdate().then(async () => {
						if (c.customId === 'revive'){
							// Handle dungeon stuff here

							return collector.stop('Revived');
						}
					}).catch(e => console.error(e));
				});
	
				collector.on('end', async (c, r) => {
					handleCatchDelete(embedMsg);

					player.health = player.maxHealth;
				});
			}

			combatLooper(await loadNextEnemy());
		}

		startDungeonHandle();
	},
};
