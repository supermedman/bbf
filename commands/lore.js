const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const {
	warnedForm,
	errorForm,
	successResult,
	failureResult,
	basicInfoForm,
	specialInfoForm
} = require('../chalkPresets.js');

const { Milestones } = require('../dbObjects.js');

const loreList = require('../events/Models/json_prefabs/loreList.json');

module.exports = {
	cooldown: 30,
	data: new SlashCommandBuilder()
		.setName('lore')
		.setDescription('Recall the tellings of your great adventures!')
		.addSubcommand(subcommand =>
			subcommand
				.setName('story')
				.setDescription('Retell the story already lived')
				.addStringOption(option =>
					option.setName('line')
						.setDescription('Which story line would you like to recall?')
						.setAutocomplete(true)
						.setRequired(true))),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);
		let choices = [];

		if (focusedOption.name === 'line') {
			const focusedValue = interaction.options.getFocused(false);

			choices = ["Souls", "Dark", "Torture", "Chaos"];

			if (focusedValue) {
				console.log(choices);
				console.log(focusedValue);

				//Mapping the complete list of options for discord to handle and present to the user
				const filtered = choices.filter(choice => choice.startsWith(focusedValue));
				await interaction.respond(
					filtered.map(choice => ({ name: choice, value: choice })),
				);
			}
        }
    },
	async execute(interaction) { 
		
		if (interaction.options.getSubcommand() === 'story') {
			await interaction.deferReply();
			const storyStr = interaction.options.getString('line');

			var chosenStory;
			if (storyStr === 'Souls') {
				chosenStory = 1;
			} else if (storyStr === 'Dark') {
				chosenStory = 2;
			} else if (storyStr === 'Torture') {
				chosenStory = 3;
			} else if (storyStr === 'Chaos') {
				chosenStory = 4;
			} else return interaction.followUp('That was not a valid option!');

			const userMilestones = await Milestones.findOne({ where: { userid: interaction.user.id } });
			if (!userMilestones) return interaction.followUp('You have not completed or started any quests yet! Use the command ``/quest start`` to start and ``/quest claim`` to check/finish a quest!');
			if (userMilestones.nextstoryquest === 5) return interaction.followUp('You have not completed any story quests yet! Try raiding ``Krelyas`` hideaway');

			let embedPages = [];

			let furthestLore = userMilestones.laststoryquest;
			if (chosenStory === 1) {
				if (furthestLore >= 10) {
					furthestLore = 3; //Full Story
				} else if (furthestLore === 8) {
					furthestLore = 2; //2 parts of Story
				} else if (furthestLore === 5) {
					furthestLore = 1; //First part of Story
				} else return console.log(errorForm('Something went wrong while assigning furthestLore!!'));

				const fullLoreList = await loreList.filter(lore => lore.StoryLine === chosenStory);
				console.log(specialInfoForm('Contents of fullLoreList: ', fullLoreList));
				let currLorePiece;
				let currRun = 0;
				do {
					currLorePiece = await fullLoreList[currRun];
					console.log(specialInfoForm('Contents of currLorePiece.Lore: ', currLorePiece.Lore));

					var theAdventure = `${currLorePiece.Lore}`;

					const questStoryEmbed = new EmbedBuilder()
						.setTitle('Quest Progress')
						.setDescription(`Page: ${(currRun + 1)}/${furthestLore}`)
						.setColor('DarkAqua')
						.addFields({
							name: 'Adventure', value: theAdventure
						});
					embedPages.push(questStoryEmbed);
					currRun++;
                } while (currRun < furthestLore)
			}


			if (chosenStory === 2) {
				if (furthestLore >= 15) {
					furthestLore = 4; //Full Story
				} else if (furthestLore === 14) {
					furthestLore = 3; //3 parts of Story
				} else if (furthestLore === 13) {
					furthestLore = 2; //2 parts of Story
				} else if (furthestLore === 12) {
					furthestLore = 1; //First part of Story
				} else if (furthestLore === 10) {
					//No new story, First complete previous dungeon!
					if (userMilestones.currentquestline === 'Souls') {						
						return interaction.followUp('You have not yet defeated ``Wadon``! Use the command ``/dungeon`` to enter the dungeon!');
					} else return interaction.followUp('You have yet to begin this story line, take a look at the available quests!');
				} else return console.log(errorForm('Something went wrong while assigning furthestLore!!'));

				const fullLoreList = loreList.filter(lore => lore.StoryLine === chosenStory);
				let currLorePiece;
				let currRun = 0;
				do {
					currLorePiece = fullLoreList[currRun];

					var theAdventure = `${currLorePiece.Lore}`;

					const questStoryEmbed = new EmbedBuilder()
						.setTitle('~Tales Retold~')
						.setDescription(`Page: ${(currRun + 1)}/${furthestLore}`)
						.setColor('DarkAqua')
						.addFields({
							name: 'Adventure', value: theAdventure
						});
					embedPages.push(questStoryEmbed);
					currRun++;
				} while (currRun < furthestLore)
			}


			if (chosenStory === 3) {
				if (furthestLore >= 22) {
					furthestLore = 7;
				} else if (furthestLore === 21) {
					furthestLore = 6;
				} else if (furthestLore === 20) {
					furthestLore = 5;
				} else if (furthestLore === 19) {
					furthestLore = 4;
				} else if (furthestLore === 18) {
					furthestLore = 3;
				} else if (furthestLore === 17) {
					furthestLore = 2;
				} else if (furthestLore === 16) {
					furthestLore = 1;
				} else if (furthestLore === 15) {
					if (userMilestones.currentquestline === 'Dark') {
						return interaction.followUp('You have not yet defeated ``Dyvulla``! Use the command ``/dungeon`` to enter the dungeon!');
					} else return interaction.followUp('You have yet to begin this story line, take a look at the available quests!');
				} else return console.log(errorForm('Something went wrong while assigning furthestLore!!'));

				const fullLoreList = await loreList.filter(lore => lore.StoryLine === chosenStory);
				console.log(specialInfoForm('Contents of fullLoreList: ', fullLoreList));
				let currLorePiece;
				let currRun = 0;
				do {
					currLorePiece = await fullLoreList[currRun];
					console.log(specialInfoForm('Contents of currLorePiece.Lore: ', currLorePiece.Lore));

					var theAdventure = `${currLorePiece.Lore}`;

					const questStoryEmbed = new EmbedBuilder()
						.setTitle('Quest Progress')
						.setDescription(`Page: ${(currRun + 1)}/${furthestLore}`)
						.setColor('DarkAqua')
						.addFields({
							name: 'Adventure', value: theAdventure
						});
					embedPages.push(questStoryEmbed);
					currRun++;
				} while (currRun < furthestLore)
			}


			if (chosenStory === 4) {
				if (furthestLore >= 25) {
					furthestLore = 3;
				} else if (furthestLore === 24) {
					furthestLore = 2;
				} else if (furthestLore === 23) {
					furthestLore = 1;
				} else if (furthestLore === 22) {
					if (userMilestones.currentquestline === 'Torture') {
						return interaction.followUp('You have not yet defeated ``Ados``! Use the command ``/dungeon`` to enter the dungeon!');
					} else return interaction.followUp('You have yet to begin this story line, take a look at the available quests!');
				} else return console.log(errorForm('Something went wrong while assigning furthestLore!!'));

				const fullLoreList = loreList.filter(lore => lore.StoryLine === chosenStory);
				let currLorePiece;
				let currRun = 0;
				do {
					currLorePiece = fullLoreList[currRun];

					var theAdventure = `${currLorePiece.Lore}`;

					const questStoryEmbed = new EmbedBuilder()
						.setTitle('~Tales Retold~')
						.setDescription(`Page: ${(currRun + 1)}/${furthestLore}`)
						.setColor('DarkAqua')
						.addFields({
							name: 'Adventure', value: theAdventure
						});
					embedPages.push(questStoryEmbed);
					currRun++;
				} while (currRun < furthestLore)
			}

			if (embedPages.length <= 0) return console.log(errorForm('Something went wrong after adding embed pages!'));

			const backButton = new ButtonBuilder()
				.setLabel("Back")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('◀️')
				.setCustomId('back-page');

			const selectButton = new ButtonBuilder()
				.setLabel("Cancel")
				.setStyle(ButtonStyle.Danger)
				.setEmoji('❌')
				.setCustomId('delete-page');

			const forwardButton = new ButtonBuilder()
				.setLabel("Forward")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('▶️')
				.setCustomId('next-page');

			const interactiveButtons = new ActionRowBuilder().addComponents(backButton, selectButton, forwardButton);


			const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				componentType: ComponentType.Button,
				filter,
				time: 120000,
			});

			var currentPage = 0;

			collector.on('collect', async (collInteract) => {
				if (collInteract.customId === 'next-page') {
					if (currentPage === embedPages.length - 1) {
						currentPage = 0;
						await collInteract.deferUpdate();
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					} else {
						currentPage += 1;
						await collInteract.deferUpdate();
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					}
				}
				if (collInteract.customId === 'back-page') {
					if (currentPage === 0) {
						currentPage = embedPages.length - 1;
						await collInteract.deferUpdate();
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					} else {
						currentPage -= 1;
						await collInteract.deferUpdate();
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					}
				}
				if (collInteract.customId === 'delete-page') {
					await collInteract.deferUpdate();
					await collector.stop();
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
	},
};
