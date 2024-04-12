const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { Questing, UserData, Milestones, ActiveStatus, ActiveDungeon, Pigmy, LocationData } = require('../../dbObjects.js');
const { checkHintQuest, checkHintStoryQuest, checkHintLore, checkHintDungeon, checkHintPigmy } = require('./exported/handleHints.js');

const { isLvlUp } = require('./exported/levelup.js');
const { grabRar, grabColour } = require('./exported/grabRar.js');
const { checkOwned } = require('./exported/createGear.js');
const {spawnNpc} = require('./exported/npcSpawner.js');

const enemyList = require('../../events/Models/json_prefabs/enemyList.json');
const lootList = require('../../events/Models/json_prefabs/lootList.json');
const questList = require('../../events/Models/json_prefabs/questList.json');
const loreList = require('../../events/Models/json_prefabs/loreList.json');


const randArrPos = (arr) => {
	let returnIndex = 0;
	if (arr.length > 1) returnIndex = Math.floor(Math.random() * arr.length);
	return arr[returnIndex];
};

/** This method returns the static loot rar upgrade chance
	 * 
	 * @param {any} pigmy pigmy db instance
	 * @param {any} user user db instance
	 */
const checkLootUP = (pigmy, user) => {
	let chanceToBeat = 1;
	if (user.pclass === 'Thief') chanceToBeat -= 0.05;
	if (user.level >= 31) {
		if ((Math.floor(user.level / 5) * 0.01) > 0.10) {
			chanceToBeat -= 0.10;
		} else chanceToBeat -= (Math.floor(user.level / 5) * 0.01);
	}
	if (pigmy) {
		if ((Math.floor(pigmy.level / 5) * 0.01) > 0.05) {
			chanceToBeat -= 0.05;
		} else chanceToBeat -= (Math.floor(pigmy.level / 5) * 0.01);
	}
	return chanceToBeat;
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('quest')
		.setDescription('Gain loot and xp while youre away!')
		.addSubcommand(subcommand =>
			subcommand
				.setName('start')
				.setDescription('Start a quest'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('claim')
				.setDescription('Claim quest rewards')),
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'start') {
			const activeQuest = await Questing.findOne({ where: { user_id: interaction.user.id } });
			const user = await grabU();
			if (!user) return await interaction.reply('No User Data.. Please use the ``/start`` command to select a class and begin your adventure!!')
			if (user.level < 5) return await interaction.reply('You must reach level 5 before you can be allowed to go on quests!! Use ``/startcombat`` to get some more levels!!');

			if (activeQuest) {
				await checkHintQuest(user, interaction);
				return interaction.reply('You already have a quest in progress.. Use ``/quest claim`` for more info!');
			}

			const maxQLvl = Math.floor(user.level / 5);
			let userMilestone = await Milestones.findOne({ where: { userid: user.userid } });

			if (!userMilestone) {
				await Milestones.create({
					userid: user.userid,
					currentquestline: 'Souls',
					nextstoryquest: 5,
					questlinedungeon: 1,
				});

				userMilestone = await Milestones.findOne({ where: { userid: user.userid } });
			}

			const userDungeon = await ActiveDungeon.findOne({ where: [{ dungeonspecid: user.userid }, { dungeonid: userMilestone.questlinedungeon }] });
			// If dungeon is completed update milestones to reflect that
			if (!userDungeon) { } else if (userDungeon.completed) {
				const storyLine = userMilestone.currentquestline;
				let chosenStory;
				let nxtLine;
				if (storyLine === 'Souls') {
					chosenStory = 1;
					nxtLine = 'Dark';
				} else if (storyLine === 'Dark') {
					chosenStory = 2;
					nxtLine = 'Torture';
				} else if (storyLine === 'Torture') {
					chosenStory = 3;
					nxtLine = 'Chaos';
				} else if (storyLine === 'Chaos') {
					chosenStory = 4;
					nxtLine = 'Law';
				} else if (storyLine === 'Law') {
					chosenStory = 5;
					nxtLine = 'Hate';
				} else if (storyLine === 'Hate') {
					chosenStory = 6;
					nxtLine = 'Myst';
				} else if (storyLine === 'Myst') {
					chosenStory = 7;
					nxtLine = 'Secret';
				} else if (storyLine === 'Secret') {
					chosenStory = 8;
					nxtLine = 'Dream';
				} else if (storyLine === 'Dream') {
					chosenStory = 9;
				}

				const nxtDung = chosenStory + 1;
				const nxtStory = loreList.filter(lore => lore.StoryLine === nxtDung)
					.filter(lore => lore.StoryPart === 1);

				const tableUpdate = await userMilestone.update({
					currentquestline: nxtLine,
					nextstoryquest: nxtStory[0].QuestID,
					questlinedungeon: nxtDung,
				});

				if (tableUpdate) await userMilestone.save();
			}

			const normalQuests = questList.filter(quest => !quest.Story)
				.filter(quest => quest.Level <= maxQLvl);
			const storyQuests = questList.filter(quest => quest.Story)
				.filter(quest => quest.Level <= maxQLvl);

			const lastQuest = userMilestone.laststoryquest;
			const nextQuest = storyQuests.filter(quest => quest.ID === userMilestone.nextstoryquest);

			let allQuests;
			if (lastQuest === userMilestone.nextstoryquest) {
				allQuests = normalQuests;
			} else allQuests = nextQuest.concat(normalQuests);

			let embedPages = [];
			let questCount = 1;
			for (const quest of allQuests) {
				const questEmbed = new EmbedBuilder()
					.setColor(0o0)
					.setTitle(`Quest: ${questCount}`)
					.addFields(
						{
							name: `Name: ${quest.Name}`,
							value: `Quest Level: ${quest.Level}\n Length: ${quest.Time}\n Enemy Level: ${quest.ELevel}\n`,
						});
				embedPages.push(questEmbed);
				questCount++;
			}

			const backButton = new ButtonBuilder()
				.setLabel("Back")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('◀️')
				.setCustomId('back-page');

			const selectButton = new ButtonBuilder()
				.setLabel("Select")
				.setStyle(ButtonStyle.Success)
				.setEmoji('*️⃣')
				.setCustomId('select-quest');

			const forwardButton = new ButtonBuilder()
				.setLabel("Forward")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('▶️')
				.setCustomId('next-page');

			const interactiveButtons = new ActionRowBuilder().addComponents(backButton, selectButton, forwardButton);

			const embedMsg = await interaction.reply({ components: [interactiveButtons], embeds: [embedPages[0]] });

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				componentType: ComponentType.Button,
				filter,
				time: 120000,
			});

			let currentPage = 0;

			collector.on('collect', async (collInteract) => {
				if (collInteract.customId === 'next-page') {
					await collInteract.deferUpdate().then(async () => {
						//if statment to check if currently on the last page
						if (currentPage === embedPages.length - 1) {
							currentPage = 0;
						} else currentPage += 1;
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					}).catch(error => {
						console.error(error);
					});
				}
				if (collInteract.customId === 'back-page') {
					await collInteract.deferUpdate().then(async () => {
						if (currentPage === 0) {
							currentPage = embedPages.length - 1;
						} else currentPage -= 1;
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					}).catch(error => {
						console.error(error);
					});
				}
				if (collInteract.customId === 'select-quest') {
					const quest = allQuests[currentPage];

					await Questing.create({
						user_id: interaction.user.id,
						qlength: quest.Length,
						qlevel: quest.Level,
						qname: quest.Name,
						qid: quest.ID,
						qstory: quest.Story,
					});

					await interaction.followUp(`You have started a quest in ${quest.Name}!`);
					await collector.stop();
					console.log(`Quest ${quest.ID} started`);
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


		if (interaction.options.getSubcommand() === 'claim') {
			const activeQuest = await Questing.findOne({ where: { user_id: interaction.user.id } });
			const user = await grabU();
			if (!user) return await interaction.reply('No User Data.. Please use the ``/start`` command to select a class and begin your adventure!!')
			if (user.level < 5) return await interaction.reply('You must reach level 5 before you can be allowed to go on quests!! Use ``/startcombat`` to get some more levels!!');
			if (!activeQuest) return await interaction.reply('You have no quest in progress.. Use ``/quest start`` to start one now!');

			const then = new Date(activeQuest.createdAt).getTime();
			const now = new Date().getTime();

			const diffTime = Math.abs(now - then);
			const timeLeft = Math.round(activeQuest.qlength - diffTime);
			let shownTime = now + timeLeft;
			shownTime = Math.round(shownTime / 1000);
			if (timeLeft > 0) return await interaction.reply(`Your quest is still in progress! You can claim it, <t:${shownTime}:R>!`);

			const { enemies, gearDrops } = interaction.client;

			const hrs = await Math.floor(activeQuest.qlength / (1000 * 60 * 60));

			let maxE = ((8 * hrs) + (Math.round(Math.random() * 4) * activeQuest.qlevel));
			if (activeQuest.qlevel > 5 && hrs > 8) maxE -= 15;

			const lvlMax = 5 * activeQuest.qlevel;
			const lvlMin = lvlMax - 5;

			let choices = [];
			for (const [key, value] of enemies) {
				if (value <= lvlMax && value >= lvlMin) choices.push(key);
			}

			let totalXP = 0;
			let totalCoins = 0;
			const totalQT = (1 * hrs) + (1 * Math.floor(hrs / 4));

			const lootChance = 0.850 - (0.050 * activeQuest.qlevel);
			let itemCount = 0;
			let curRun = 0;
			do {
				let picked = randArrPos(choices);
				let eFound = enemyList.filter(enemy => enemy.ConstKey === picked);
				let thisE = eFound[0];

				let rolledChance = Math.random();
				if (rolledChance >= lootChance) itemCount++;

				if (thisE.XpMax >= 0) {
					totalXP += Math.floor(Math.floor(Math.random() * (thisE.XpMax - thisE.XpMin + 1) + thisE.XpMin) / 4);
				} else {
					const lvl = thisE.Level;
					let nxtLvl;
					if (lvl < 20) {
						nxtLvl = 50 * (Math.pow(lvl, 2) - 1);
					} else if (lvl === 20) {
						nxtLvl = 75 * (Math.pow(lvl, 2) - 1);
					} else if (lvl > 20) {
						const lvlScale = 1.5 * (Math.floor(lvl / 5));
						nxtLvl = (75 + lvlScale) * (Math.pow(lvl, 2) - 1);
					}

					let XpMax = Math.floor((nxtLvl / 25) + (0.2 * (100 - lvl)));
					let XpMin = XpMax - Math.floor(XpMax / 5.2);

					totalXP += Math.floor(Math.floor(Math.random() * (XpMax - XpMin + 1) + XpMin) / 4);
				}
				curRun++;
			} while (curRun < maxE)

			const extraEXP = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, { activec: 'EXP' }] });
			if (extraEXP) {
				if (extraEXP.duration > 0) {
					totalXP += totalXP * extraEXP.curreffect;
				}
			}

			totalCoins = totalXP * 2;

			const midLevel = Math.round((lvlMax + lvlMin) / 5);
			const pigmy = await grabPigmy(user);
			const upgradeChance = checkLootUP(pigmy, user);

			const totalItems = [];
			let totalPages = 1;
			curRun = 0;
			do {
				let foundRar = await grabRar(midLevel);
				let rolledUpgrade = Math.random();
				if (foundRar < 10 && rolledUpgrade >= upgradeChance) foundRar++;

				choices = [];
				for (const [key, value] of gearDrops) {
					if (value === foundRar) choices.push(key);
				}

				let picked = randArrPos(choices);
				let thisI = lootList.filter(item => item.Loot_id === picked);

				let newItem = true;
				for (const item of totalItems) {
					if (item.Loot_id === thisI[0].Loot_id) {
						newItem = false;
						item.Amount += 1;
						break;
					}
				}

				if (newItem) {
					const mappedItem = thisI.map(item => ({ ...item, Amount: 1 }),);
					totalPages++;
					totalItems.push(...mappedItem);
				}

				curRun++;
			} while (curRun < itemCount)

			await isLvlUp(totalXP, totalCoins, interaction);

			await updateQTs(user, totalQT);

			let embedPages = [];

			const gained = `Quest Summary:\n${totalCoins}c\n${totalXP}xp\n${totalQT}qts\n${totalItems.length}items\n${maxE}killed`;

			const statsEmbed = new EmbedBuilder()
				.setTitle("~QUEST COMPLETE~")
				.setDescription(`Page 1/${totalPages}`)
				.setColor(0o0)
				.addFields(
					{
						name: "<< SUMMARY >>",
						value: gained
					});
			embedPages.push(statsEmbed);

			let curPage = 1;
			for (const item of totalItems) {
				let result = await checkOwned(user, item, item.Amount);
				if (result !== 'Finished') { totalPages--; } else {
					let fieldValue = makeItemText(item);
					let embedColour = await grabColour(item.Rar_id);
					let embed = new EmbedBuilder()
						.setTitle("~LOOT GAINED~")
						.setDescription(`Page ${curPage + 1}/${totalPages}`)
						.setColor(embedColour)
						.addFields({
							name: `<< ${item.Name} >>`,
							value: fieldValue
						});
					embedPages.push(embed);
					curPage++;
				}
			}

			let userMilestone = await Milestones.findOne({ where: { userid: user.userid } });
			if (!userMilestone) {
				await Milestones.create({
					userid: user.userid,
					currentquestline: 'Souls',
					nextstoryquest: 5,
					questlinedungeon: 1,
				});
				userMilestone = await Milestones.findOne({ where: { userid: user.userid } });
			}
			//let dungeonComplete = false;
			//const userDungeon = await ActiveDungeon.findOne({ where: [{ dungeonspecid: user.userid }, { dungeonid: userMilestone.questlinedungeon }] });
			//if (!userDungeon) { } else if (userDungeon.completed) dungeonComplete = true;

			// SOULS    - lvl 35    - PARTS: 3
			// DARK     - lvl 45    - PARTS: 4
			// TORTURE  - lvl 50    - PARTS: 7
			// CHAOS    - lvl 55    - PARTS: 3
			// LAW      - lvl 65    - PARTS: 6
			// HATE     - lvl 75    - PARTS: 6
			// MYST     - lvl 85    - PARTS: 5
			// SECRET   - lvl 95    - PARTS: 6
			// DREAM    - lvl 100   - PARTS: 5

			// This checks if the current quest is a story quest
			const storyCheck = questList.filter(quest => quest.Story)
				.filter(quest => quest.ID === activeQuest.qid);

			if (storyCheck.length <= 0) { } else {
				await checkHintStoryQuest(user, interaction);
				const storyLine = userMilestone.currentquestline;
				let chosenStory;
				//let nxtLine;
				if (storyLine === 'Souls') {
					chosenStory = 1;
					//nxtLine = 'Dark';
				} else if (storyLine === 'Dark') {
					chosenStory = 2;
					//nxtLine = 'Torture';
				} else if (storyLine === 'Torture') {
					chosenStory = 3;
					//nxtLine = 'Chaos';
				} else if (storyLine === 'Chaos') {
					chosenStory = 4;
					//nxtLine = 'Law';
				} else if (storyLine === 'Law') {
					chosenStory = 5;
					//nxtLine = 'Hate';
				} else if (storyLine === 'Hate') {
					chosenStory = 6;
					//nxtLine = 'Myst';
				} else if (storyLine === 'Myst') {
					chosenStory = 7;
					//nxtLine = 'Secret';
				} else if (storyLine === 'Secret') {
					chosenStory = 8;
					//nxtLine = 'Dream';
				} else if (storyLine === 'Dream') {
					chosenStory = 9;
				}

				//// If dungeon is completed update milestones to reflect that
				//if (dungeonComplete) {
				//	const nxtDung = chosenStory + 1;
				//	const nxtStory = loreList.filter(lore => lore.StoryLine === nxtDung)
				//		.filter(lore => lore.StoryPart === 1);

				//	const tableUpdate = await userMilestone.update({
				//		currentquestline: nxtLine,
				//		nextstoryquest: nxtStory[0].QuestID,
				//		questlinedungeon: nxtDung,
				//	});

				//	if (tableUpdate) await userMilestone.save();
				//}

				// Obtain full questLine from milestone defined section 
				const questLine = loreList.filter(lore => lore.StoryLine === chosenStory);
				// Obtain current quest reference from active quest
				const thisQuest = questLine.filter(lore => lore.QuestID === activeQuest.qid);
				// Obtain next quest in questline
				const nextQuest = questLine.filter(lore => lore.StoryPart === thisQuest[0].StoryPart + 1);

				let embedDesc = 'NEW Quest Unlocked!';
				// Quest found is final quest in story line
				if (nextQuest.length <= 0) {
					embedDesc = 'NEW Dungeon Unlocked!';
					const tableUpdate = await userMilestone.update({ laststoryquest: activeQuest.qid });
					if (tableUpdate) await userMilestone.save();
					await checkHintDungeon(user, interaction);
				} else {
					const tableUpdate = await userMilestone.update({ laststoryquest: activeQuest.qid, nextstoryquest: nextQuest[0].QuestID });
					if (tableUpdate) await userMilestone.save();
					await checkHintLore(user, interaction);
				}

				const theAdventure = thisQuest[0].Lore;

				const storyEmbed = new EmbedBuilder()
					.setTitle('Quest Progress')
					.setDescription(embedDesc)
					.setColor('DarkAqua')
					.addFields({
						name: 'Adventure', value: theAdventure,
					});

				await interaction.reply({ embeds: [storyEmbed] }).then(embedMsg => setTimeout(() => {
					embedMsg.delete();
				}, 300000)).catch(error => console.error(error));
			}

			
			const huntingCheck = questList.filter(quest => quest.Hunting)
			.filter(quest => quest.ID === activeQuest.qid);

			if (huntingCheck.length <= 0) { } else {
				let userLocation = await LocationData.findOne({where: {userid: user.userid}});
				if (!userLocation) userLocation = await LocationData.create({userid: user.userid});

				const theQuest = huntingCheck[0];
				let locationIDs = userLocation.unlocked_locations.split(',');
				
				let exists = false;
				for (const id of locationIDs){
					if (theQuest.ZoneID === id){ exists = true; break;}
				}

				if (!exists){ 
					locationIDs.push(theQuest.ZoneID);
					locationIDs.sort((a,b) => {
						if (a > b) return 1;
						if (a < b) return -1;
						return 0;
					});
					
					const tableUpdate = await userLocation.update({unlocked_locations: locationIDs.toString()});
					if (tableUpdate > 0) await userLocation.save();
				}
				
			}

			await destroyQuest();

			const backButton = new ButtonBuilder()
				.setLabel("Back")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('◀️')
				.setCustomId('back-page');

			const finishButton = new ButtonBuilder()
				.setLabel("Finish")
				.setStyle(ButtonStyle.Success)
				.setEmoji('*️⃣')
				.setCustomId('delete-page');

			const forwardButton = new ButtonBuilder()
				.setLabel("Forward")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('▶️')
				.setCustomId('next-page');

			const interactiveButtons = new ActionRowBuilder().addComponents(backButton, finishButton, forwardButton);

			let embedMsg;
			if (interaction.replied || interaction.deferred) {
				embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });
			} else embedMsg = await interaction.reply({ components: [interactiveButtons], embeds: [embedPages[0]] });
			
			// ==== SPAWNING NPC SETUP ====
			const rollNeeded = 0.33, npcRoll = Math.random();
			if (npcRoll >= rollNeeded) spawnNpc(user, interaction);
			// ====					   ====

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				componentType: ComponentType.Button,
				filter,
				time: 120000,
			});

			let currentPage = 0;
			collector.on('collect', async (collInteract) => {
				if (collInteract.customId === 'next-page') {
					//console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);
					await collInteract.deferUpdate().then(async () => {
						//if statment to check if currently on the last page
						if (currentPage === embedPages.length - 1) {
							currentPage = 0;
							await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] })
						} else {
							currentPage += 1;
							await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] })
						}
					}).catch(error => {
						console.error(error);
					});
				}
				if (collInteract.customId === 'back-page') {
					//console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);
					await collInteract.deferUpdate().then(async () => {
						if (currentPage === 0) {
							currentPage = embedPages.length - 1;
							await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] })
						} else {
							currentPage -= 1;
							await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] })
						}
					}).catch(error => {
						console.error(error);
					});
				}
				if (collInteract.customId === 'delete-page') {
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

		async function grabU() {
			const uData = await UserData.findOne({ where: { userid: interaction.user.id } });
			return uData;
		}

		async function updateQTs(user, qts) {
			const tableUpdate = await user.increment('qt', { by: qts });
			if (tableUpdate) await user.save();
			if (user.qt >= 10) await checkHintPigmy(user, interaction);
			return;
		}

		async function grabPigmy(user) {
			const thePig = await Pigmy.findOne({ where: { spec_id: user.userid } });
			return thePig;
		}

		// This method is used to remove completed quests
		async function destroyQuest() {
			await Questing.destroy({ where: { user_id: interaction.user.id } });
			//console.log('Quest removed!');
		}

		function makeItemText(item) {
			let itemText;

			if (item.Slot === 'Mainhand') {
				itemText =
					`Value: ${item.Value}\nRarity: ${item.Rarity}\nAttack: ${item.Attack}\nType: ${item.Type}\nHands: ${item.Hands}\nSlot: ${item.Slot}\nAmount: ${item.Amount}`;
			} else if (item.Slot === 'Offhand') {
				itemText =
					`Value: ${item.Value}\nRarity: ${item.Rarity}\nAttack: ${item.Attack}\nDefence: ${item.Defence}\nType: ${item.Type}\nHands: ${item.Hands}\nSlot: ${item.Slot}\nAmount: ${item.Amount}`;
			} else {
				itemText =
					`Value: ${item.Value}\nRarity: ${item.Rarity}\nDefence: ${item.Defence}\nType: ${item.Type}\nSlot: ${item.Slot}\nAmount: ${item.Amount}`;
			}

			return itemText;
		}
	},

};
