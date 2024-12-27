const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const {
	warnedForm,
	errorForm,
	successResult,
	failureResult,
	basicInfoForm,
	specialInfoForm
} = require('../../chalkPresets.js');

const { Milestones } = require('../../dbObjects.js');

const loreList = require('../../events/Models/json_prefabs/loreList.json');
const { loadDefaultPagingButtonActionRow } = require('../../uniDisplayFunctions.js');
const { createInteractiveChannelMessage, grabUser, handleCatchDelete } = require('../../uniHelperFunctions.js');
const { NavMenu } = require('../Development/Export/Classes/NavMenu.js');

module.exports = {
	helptypes: ['Story', 'Quest', 'Level', 'Info'],
	cooldown: 30,
	data: new SlashCommandBuilder()
	.setName('lore')
	.setDescription('Recall the tellings of your great adventures!')
	.addSubcommand(subcommand =>
		subcommand
		.setName('story')
		.setDescription('Retell the story already lived')
		.addStringOption(option =>
			option
			.setName('line')
			.setDescription('Which story line would you like to recall?')
			.setAutocomplete(true)
			.setRequired(true)
		)
	),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);
		let choices = [];

		if (focusedOption.name === 'line') {
			const focusedValue = interaction.options.getFocused(false);

			const storyLines = ["Souls", "Dark", "Torture", "Chaos", "Law", "Hate", "Myst", "Secret", "Dream"];

			const foundMilestone = await Milestones.findOne({ where: { userid: interaction.user.id } });
			if (foundMilestone) {
				for (let i = 0; i < storyLines.length; i++) {
					if (storyLines[i] === foundMilestone.currentquestline) {
						choices.push(storyLines[i]);
						break;
					} else choices.push(storyLines[i]);
				}
            }

			//Mapping the complete list of options for discord to handle and present to the user
			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
        }
    },
	async execute(interaction) { 
		
		if (interaction.options.getSubcommand() === 'story') {
			await interaction.deferReply();
			const storyStr = interaction.options.getString('line');

			const staticStoryLines = ["Souls", "Dark", "Torture", "Chaos", "Law", "Hate", "Myst", "Secret", "Dream"];
			if (staticStoryLines.indexOf(storyStr) === -1) return interaction.followUp('That was not a valid option!');
			const chosenStory = staticStoryLines.indexOf(storyStr) + 1;

			const userMilestones = await Milestones.findOne({ where: { userid: interaction.user.id } });
			if (!userMilestones) return interaction.followUp('You have not completed or started any quests yet! Use the command ``/quest start`` to start and ``/quest claim`` to check/finish a quest!');
			if (userMilestones.nextstoryquest === 5) return interaction.followUp('You have not completed any story quests yet! Try raiding ``Krelyas`` hideaway');

			// Compile full list of lore for selected storyline
			// Filter by ID of last story quest completed
			const loreIsUnlocked = l => l.QuestID <= userMilestones.laststoryquest;
			const storyLineLoreList = loreList.filter(lore => lore.StoryLine === chosenStory);
			const unlockedStoryLore = storyLineLoreList.filter(lore => loreIsUnlocked(lore));

			if (!unlockedStoryLore.length) {
				// User has not unlocked the selected storyline yet!
				const rulerList = ['Wadon', 'Dyvulla', 'Ados', 'Zimmir', 'Phamnera', 'Xogdia', 'Mien', 'Nizdea']
				// This could be due to the previous dungeon not being defeated
				if (userMilestones.questlinedungeon === chosenStory - 1 && userMilestones.nextstoryquest === userMilestones.laststoryquest) {
					return interaction.followUp({ content: `You must defeat \`${rulerList[chosenStory - 2]}\` before this storyline will be unlocked, enter their \`/dungeon\` to challenge them!`, ephemeral: true });
				} else return interaction.followUp({ content: 'This storyline is unknown to you!! Continue `/quest`ing to progress further through the current story!', ephemeral: true });
			}

			let embedPages = [];
			for (const storyObj of unlockedStoryLore) {
				const storyPartsLocked = storyLineLoreList.length - unlockedStoryLore.length;

				// Added if full storyline is not unlocked yet
				const partsLockedNotice = ` ${(storyPartsLocked === 0) ? "" : `- *${storyPartsLocked} part${(storyPartsLocked > 1) ? "s are" : " is"} yet to be unlocked*`}`;
				// Base contents to be used for the description field, added to during assignment if displaying lore `subParts`
				const dynamicDescription = `Part ${storyObj.StoryPart} of ${storyLineLoreList.length}${partsLockedNotice}`;
				
				// If lore section exceeds discord limit of 1024 characters, handle splitting contents into smaller chunks
				// TODO: 
				// Adding method of word detection, preventing mid word splits.
				// Adding method of MD styling detection, preventing splits occuring while MD tags remain open.
				if (storyObj.Lore.length > 1024){
					// Handle splits here
					const loreSubPartCount = Math.ceil(storyObj.Lore.length / 1024);
					for (let i = 0; i < loreSubPartCount; i++){
						// Slice entire string 1024 characters at a time, if current loop itter is last itter, slice to end of string
						const loreSubSection = storyObj.Lore.slice(i * 1024, (i + 1 !== loreSubPartCount) ? 1024 : undefined);
						// console.log('Lore Sub Section: ', loreSubSection);

						const subPartEmbed = new EmbedBuilder()
						.setTitle(`== The Story of ${staticStoryLines[chosenStory - 1]} ==`)
						.setDescription(dynamicDescription + `\nSubpart ${i + 1} of ${loreSubPartCount}`)
						.setColor('DarkAqua')
						.addFields(
							{
								name: '= The Adventure =',
								value: loreSubSection
							}
						);

						embedPages.push(subPartEmbed);
					}
				} else {
					const embed = new EmbedBuilder()
					.setTitle(`== The Story of ${staticStoryLines[chosenStory - 1]} ==`)
					.setDescription(dynamicDescription)
					.setColor('DarkAqua')
					.addFields(
						{ 
							name: '= The Adventure =', 
							value: storyObj.Lore 
						}
					);

					embed.

					embedPages.push(embed);
				}
			}

			// This probably isnt needed anymore, doesnt hurt to leave it in however
			if (embedPages.length <= 0) return console.log(errorForm('Something went wrong after adding embed pages!'));


			const pageButts = loadDefaultPagingButtonActionRow(true);
			const replyObj = { embeds: [embedPages[0]], components: [pageButts] };

			const { anchorMsg, collector } = await createInteractiveChannelMessage(interaction, 300000, replyObj, "FollowUp");

			const loreMenu = new NavMenu((await grabUser(interaction.user.id)), replyObj, replyObj.components);
			loreMenu.loadPageDisplays({ embeds: embedPages });

			// =====================
			// BUTTON COLLECTOR (COLLECT)
			collector.on('collect', async c => {
				await c.deferUpdate().then(async () => {
					let editWith = {};
					
					switch(loreMenu.whatDoYouHear(c.customId)){
						case "PAGE":
							loreMenu.handlePaging(c.customId);
                        	editWith = loreMenu.loadNextPage();
						break;
						case "CANCEL":
						return collector.stop('Cancelled');
					}

					if (editWith.embeds) await anchorMsg.edit(editWith);
				}).catch(e => console.error(e));
			});
			// =====================

			// =====================
			// BUTTON COLLECTOR (END)
			collector.on('end', async (c, r) => {
				if (!r || r === 'time') return await handleCatchDelete(anchorMsg);

				if (r === 'Cancelled'){
					await handleCatchDelete(anchorMsg);
					loreMenu.destroy();
				}
			});
			// =====================
        }
	},
};
