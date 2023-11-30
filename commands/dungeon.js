const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const {
	warnedForm,
	errorForm,
	successResult,
	failureResult,
	basicInfoForm,
	specialInfoForm
} = require('../chalkPresets.js');

const { UserData, Milestones, ActiveDungeon } = require('../dbObjects.js');
const { loadDungeon } = require('./exported/handleDungeon.js');

const dungeonList = require('../events/Models/json_prefabs/dungeonList.json');

module.exports = {
	cooldown: 60,
	data: new SlashCommandBuilder()
		.setName('dungeon')
		.setDescription('Delve deep and find riches!')
		.addStringOption(option =>
			option.setName('name')
				.setDescription('Who does the dungeon belong too?')
				.setRequired(true)),

	async execute(interaction) { 
		//return interaction.reply('This command is under construction, please check back later!');

		await interaction.deferReply();
		const userData = await UserData.findOne({ where: { userid: interaction.user.id } });
		if (!userData) return interaction.followUp('Welcome new user! Please use ``/start`` to begin your adventure!');

		/**
					DUNGEON HANDLING YAAAAYYYY :)
						- Take user input name as dungeonList locater
						- If no match give some hints, reference quest lore and check last completed story quest
						- This should be more than enough to get them able to continue
						- If they still cant find it... sucks to suck they aint gonna beat this

					How will the user see and enter the dungeon?
						- User is shown dungeon info with confirm and cancel options
						- User gets prompted with ruleset for dungeons upon calling command
						- Following this dungeon is generated in db
							- Users health is set to full upon creation

		 
		 */

		const givenDungeon = interaction.options.getString('name');

		const dungeonName = givenDungeon.toLowerCase();

		const dungeonMatch = [];
		for (var i = 0; i < dungeonList.length; i++) {
			if (dungeonList[i].Boss.toLowerCase() === dungeonName) {
				//Match found
				dungeonMatch.push(dungeonList[i]);
			}
		}

		if (dungeonMatch.length === 0) {
			const userMilesCheck = await Milestones.findOne({ where: { userid: interaction.user.id } });

			if (userMilesCheck.currentquestline === 'Souls') {
				if (userMilesCheck.laststoryquest < 10) {
					return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
				}
				dungeonMatch.push(dungeonList[0]);
			}

			if (userMilesCheck.currentquestline === 'Dark') {
				if (userMilesCheck.laststoryquest < 15) {
					return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
				}
				dungeonMatch.push(dungeonList[1]);
			}

			if (userMilesCheck.currentquestline === 'Torture') {
				if (userMilesCheck.laststoryquest < 22) {
					return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
				}
				dungeonMatch.push(dungeonList[2]);
			}

			if (userMilesCheck.currentquestline === 'Chaos') {
				if (userMilesCheck.laststoryquest < 25) {
					return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
				}
				dungeonMatch.push(dungeonList[3]);
			}

			if (userMilesCheck.currentquestline === 'Law') {
				if (userMilesCheck.laststoryquest < 32) {
					return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
				}
				dungeonMatch.push(dungeonList[4]);
			}

			if (userMilesCheck.currentquestline === 'Hate') {
				if (userMilesCheck.laststoryquest < 39) {
					return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
				}
				dungeonMatch.push(dungeonList[5]);
			}

			if (userMilesCheck.currentquestline === 'Myst') {
				if (userMilesCheck.laststoryquest < 45) {
					return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
				}
				dungeonMatch.push(dungeonList[6]);
			}

			if (userMilesCheck.currentquestline === 'Secret') {
				if (userMilesCheck.laststoryquest < 52) {
					return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
				}
				dungeonMatch.push(dungeonList[7]);
			}

			if (userMilesCheck.currentquestline === 'Dream') {
				if (userMilesCheck.laststoryquest < 57) {
					return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
				}
				dungeonMatch.push(dungeonList[8]);
			}

			const noMatchEmbed = new EmbedBuilder()
				.setTitle('Dungeon Not Found!')
				.setDescription(dungeonName)
				.setColor('DarkRed')
				.addFields({
					name: 'Who rules the dungeon? Hint:', value: `${dungeonMatch[0].DungeonHint}`
				});

			return await interaction.followUp({ embeds: [noMatchEmbed] }).then(embedMsg => setTimeout(() => {
				embedMsg.delete();
			}, 30000)).catch(console.error);
        }

		//First check ActiveDungeon for dungeon progress
		const activeDungeon = await ActiveDungeon.findOne({ where: [{ dungeonspecid: interaction.user.id }, {dungeonid: dungeonMatch[0].DungeonID}] });
		if (activeDungeon) {
			//ActiveDungeon found, begin loading dungeon progress!
			console.log('ACTIVE DUNGEON FOUND LOADING UP!');
			//LOAD DUNGEON HERE

			await interaction.followUp(`Dungeon Progress found, NOW LOADING!!`).then(async loadingMessage => setTimeout(() => {
				loadingMessage.delete();
			}, 1000)).catch(console.error);

			try {
				await loadDungeon(activeDungeon.currentfloor, activeDungeon.dungeonid, interaction, interaction.user.id);
			} catch (error) {
				console.error(error);
				console.log(errorForm(`AN ERROR OCCURED: ${error}`));
				await interaction.followUp('An error occured while running the dungeon!');
			}
		} else {
			//Second Check Milestones progress for dungeon access

			const userMilestone = await Milestones.findOne({ where: { userid: interaction.user.id } });

			if (!userMilestone) return interaction.followUp('You have yet to start a quest! Please use ``/quest start``');
			if (givenDungeon === 'wadon') {
				if (userMilestone.currentquestline === 'Souls') {
					if (userMilestone.laststoryquest < 10) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
				} else {
					if (userMilestone.laststoryquest < 10) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
                }
			}

			if (givenDungeon === 'dyvulla') {
				if (userMilestone.currentquestline === 'Dark') {
					if (userMilestone.laststoryquest < 15) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
				} else {
					if (userMilestone.laststoryquest < 15) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
                }
			}

			if (givenDungeon === 'ados') {
				if (userMilestone.currentquestline === 'Torture') {
					if (userMilestone.laststoryquest < 22) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
				} else {
					if (userMilestone.laststoryquest < 22) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
                }
			}

			if (givenDungeon === 'zimmir') {
				if (userMilestone.currentquestline === 'Chaos') {
					if (userMilestone.laststoryquest < 25) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
				} else {
					if (userMilestone.laststoryquest < 25) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
                }
			}

			if (givenDungeon === 'phamnera') {
				if (userMilestone.currentquestline === 'Law') {
					if (userMilestone.laststoryquest < 32) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
				} else {
					if (userMilestone.laststoryquest < 32) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
                }
			}

			if (givenDungeon === 'xogdia') {
				if (userMilestone.currentquestline === 'Hate') {
					if (userMilestone.laststoryquest < 39) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
				} else {
					if (userMilestone.laststoryquest < 39) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
                }
			}

			if (givenDungeon === 'mien') {
				if (userMilestone.currentquestline === 'Myst') {
					if (userMilestone.laststoryquest < 45) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
				} else {
					if (userMilestone.laststoryquest < 45) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
                }
			}

			if (givenDungeon === 'nizdea') {
				if (userMilestone.currentquestline === 'Secret') {
					if (userMilestone.laststoryquest < 52) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
				} else {
					if (userMilestone.laststoryquest < 52) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
                }
			}

			if (givenDungeon === 'fayrn') {
				if (userMilestone.currentquestline === 'Dream') {
					if (userMilestone.laststoryquest < 57) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
				} else {
					if (userMilestone.laststoryquest < 57) {
						return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');
					}
                }
			}
			//if (userMilestone.laststoryquest !== 10) return interaction.followUp('You dont even know there is a dungeon to find, keep questing!');

			if (dungeonMatch.length === 0) {
				//No match found!!

				const noMatchEmbed = new EmbedBuilder()
					.setTitle('Dungeon Not Found!')
					.setDescription(dungeonName)
					.setColor('DarkRed')
					.addFields({
						name: 'Who rules the dungeon? Hint:', value: `${dungeonMatch[0].DungeonHint}`
					});

				await interaction.followUp({ embeds: [noMatchEmbed] }).then(embedMsg => setTimeout(() => {
					embedMsg.delete();
				}, 30000)).catch(console.error);
			} else {
				//DUNGEON MATCH FOUND TIME FOR THE GOOD STUFF!!!
				console.log(dungeonMatch);

				const acceptButton = new ButtonBuilder()
					.setLabel("Begin")
					.setStyle(ButtonStyle.Success)
					.setEmoji('✅')
					.setCustomId('accept');

				const cancelButton = new ButtonBuilder()
					.setLabel("Wait I'm not ready!")
					.setStyle(ButtonStyle.Danger)
					.setEmoji('❌')
					.setCustomId('cancel');

				const interactiveButtons = new ActionRowBuilder().addComponents(acceptButton, cancelButton);

				const ruler = ` ${dungeonMatch[0].Boss}`;
				console.log(`Ruler: ${ruler}`);
				console.log(`dungeonMatch[0].Boss: ${dungeonMatch[0].Boss}`);

				const floors = ` ${dungeonMatch[0].Floors}`;
				console.log(`floors: ${floors}`);
				console.log(`dungeonMatch[0].Floors: ${dungeonMatch[0].Floors}`);

				const checkpoints = ` ${dungeonMatch[0].SavePoints}`;
				console.log(`checkpoints: ${checkpoints}`);
				console.log(`dungeonMatch[0].SavePoints: ${dungeonMatch[0].SavePoints}`);

				const dungName = ` ${dungeonMatch[0].Name}`

				const dungeonInfoEmbed = new EmbedBuilder()
					.setTitle(`${dungName}`)
					.setColor('DarkAqua')
					.addFields(
						{ name: 'Ruler:', value: ruler, inline: true },
						{ name: 'Floors:', value: floors, inline: true },
						{ name: 'Checkpoints:', value: checkpoints, inline: true });

				const rulesListed = `Defeating the dungeon ruler is your goal! You will find them on the final floor!\n\nProgress is saved at the start of every 5th floor, dying will set you back to the last checkpoint.\nLoot, xp, and coins are given upon reaching a checkpoint every 5th floor!\nYour health in the dungeon is separated from regular combat, always starts at full when starting, and is fully restored upon reaching a checkpoint!`;

				const dungeonRulesEmbed = new EmbedBuilder()
					.setTitle('Dungeon Rules:')
					.setColor('White')
					.addFields({ name: 'Adventurer Beware:', value: rulesListed });

				const infoEmbed = await interaction.followUp({ components: [interactiveButtons], embeds: [dungeonInfoEmbed] });

				const filter = (i) => i.user.id === interaction.user.id;

				const collector = infoEmbed.createMessageComponentCollector({
					ComponentType: ComponentType.Button,
					filter,
					time: 180000,
				});

				//Keep track of current dungeon page
				var currentPage = 0;

				collector.on('collect', async (collInteract) => {
					if (collInteract.customId === 'accept') {
						if (currentPage === 0) {
							//Dungeon info has been read and user is ready to procceed
							//Display ruleset page next!
							collInteract.deferUpdate();
							await infoEmbed.edit({ embeds: [dungeonRulesEmbed], components: [interactiveButtons] });
							currentPage++;
						} else if (currentPage === 1) {
							//Dungeon ruleset has been read and user is ready for the dungeon!!
							//Handle dungeon creation here
							const dungeonCreated = await createNewDungeon(dungeonMatch[0], userData);
							//Dungeon created begin exploring
							//LOAD DUNGEON HERE
							collInteract.deferUpdate();

							acceptButton.setDisabled(true);
							cancelButton.setDisabled(true);
							await infoEmbed.edit({ components: [interactiveButtons] });

							await collInteract.followUp(`Dungeon Created, NOW LOADING!!`).then(async loadingMessage => setTimeout(() => {
								loadingMessage.delete();
							}, 1000)).catch(console.error);

							await collector.stop();
							try {
								await loadDungeon(dungeonCreated.currentfloor, dungeonCreated.dungeonid, collInteract, interaction.user.id);
							} catch (error) {
								console.error(error);
								console.log(errorForm(`AN ERROR OCCURED: ${error}`));
								await interaction.followUp('An error occured while running the dungeon!');
                            }
													
						}

					}

					if (collInteract.customId === 'cancel') {
						collInteract.reply('Well come back when you ARE ready!');
						acceptButton.setDisabled(true);
						cancelButton.setDisabled(true);

						await infoEmbed.edit({ components: [interactiveButtons] });
						await collector.stop();
					}

				});

				collector.on('end', () => {
					if (infoEmbed) {
						infoEmbed.delete().catch(error => {
							if (error.code !== 10008) {
								console.error('Failed to delete the message:', error);
							}
						});
					}
				});
			}	
        }

		//This method Creates a new ActiveDungeon database entry and returns the object
		async function createNewDungeon(dungeon, user) {
			//Grab userdata to calculate total health at full
			const totalHealth = 100 + (user.strength * 10);
			try {
				//Create dungeon entry
				await ActiveDungeon.create({
					dungeonid: dungeon.DungeonID,
					dungeonspecid: interaction.user.id,
					currentfloor: 0,
					lastsave: 0,
					currenthealth: totalHealth,
				});

				//Grab dungeon reference after creation
				const addedDungeon = await ActiveDungeon.findOne({ where: [{ dungeonspecid: interaction.user.id }, {dungeonid: dungeon.DungeonID}] });
				if (!addedDungeon) {
					//Dungeon not added something went wrong 
				} else {
					console.log('New dungeon added!');
					return addedDungeon;//Return dungeon object 
				}
			} catch (err) {
				return console.log(errorForm(`An error has occured! Logging ERROR: ${err}`));
            }			
        }
	},
};
