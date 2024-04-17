const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const { Pighouse, UserData } = require('../../dbObjects.js');

const pigmyList = require('../../events/Models/json_prefabs/pigmyList.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pigmyshop')
        	.setDescription('The place to pick up your own pigmy!'),

	async execute(interaction) {
		await interaction.deferReply().then(async () => {
			const powned = await Pighouse.findAll({ where: [{ spec_id: interaction.user.id }] });//first check for what pigmies are already owned

			for (var n = 0; n < powned.length; n++) {
				if (powned[n].spec_id !== interaction.user.id) {
					powned[n].spec_id = interaction.user.id;
				}
			}

			const user = await grabU();
			const qts = user.qt;
			var setDis = false;
			var setLab = "Select";
			if (user.level < 5 || qts <= 0) {
				return interaction.followUp('Sorry! You need to be at least level 5 and have completed your first quest to access pigmies.. ``/startcombat`` use this to gain some levels!')
			}
			if (qts < 10) {
				setDis = true;
				setLab = "Insufficient Qts";
			}
			if (powned[0]) {
				if (powned[0].refid === 0) {
					//first pigmy displayed is already owned, disable button on load
					setDis = true;
					setLab = "Owned";
				}
			}

			const backButton = new ButtonBuilder()
				.setLabel("Back")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('◀️')
				.setCustomId('back-page');

			const selectButton = new ButtonBuilder()
				.setLabel(setLab)
				.setStyle(ButtonStyle.Success)
				.setEmoji('*️⃣')
				.setDisabled(setDis)
				.setCustomId('select-pig');

			const nextButton = new ButtonBuilder()
				.setLabel("Forward")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('▶️')
				.setCustomId('next-page');

			const interactiveButtons = new ActionRowBuilder().addComponents(backButton, selectButton, nextButton);

			var pigs = [];
			var embedPages = [];

			for (var i = 0; i < pigmyList.length; i++) {
				pigs.push(pigmyList[i]);
				const pigEmbed = new EmbedBuilder()
					.setColor(0o0)
					.setTitle(`Pigmy: ${i + 1}`)
					.setImage(pigmyList[i].Image)
					.addFields(
						{
							name: `Name: ${pigmyList[i].Name}`,
							value: `Pigmy Type: ${pigmyList[i].Type}\n Cost: ${pigmyList[i].Cost}\n Damage per Level: ${pigmyList[i].DPL}\n Buff: ${pigmyList[i].Buff}\n`,
						},
						{
							name: 'Your Qts: ',
							value: `${user.qt}QTs`
						}
					);
				embedPages.push(pigEmbed);
			}

			const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]], files: [pigmyList[0].PngRef] });

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				componentType: ComponentType.Button,
				filter,
				time: 120000,
			});

			var currentPage = 0;
			var currentPig = 0;

			collector.on('collect', async (collInteract) => {
				if (collInteract.customId === 'next-page') {
					//always start on first page
					//check what page is currently active
					//add 1 to embed array 
					//show results and increase currentPage + 1
					//console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);

					//if statment to check if currently on the last page
					if (currentPage === embedPages.length - 1) {
						currentPage = 0;
						currentPig = 0;
						//await i.deferUpdate();
						await wait(1000);
						if (powned[currentPig]) {
							if (powned[currentPig].refid === pigs[currentPig].ID) {
								interactiveButtons.components[1].setDisabled(true);
								interactiveButtons.components[1].setLabel("Owned");
								await collInteract.update({ components: [interactiveButtons] });
							}
						} else if (pigs[currentPig].Cost > qts) {
							interactiveButtons.components[1].setDisabled(true);
							interactiveButtons.components[1].setLabel("Insufficient Qts");
							await collInteract.update({ components: [interactiveButtons] });
						} else {
							interactiveButtons.components[1].setDisabled(false);
							interactiveButtons.components[1].setLabel("Select");
							await collInteract.update({ components: [interactiveButtons] });
						}
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons], files: [pigmyList[currentPig].PngRef] });
					} else {
						currentPage += 1;
						currentPig += 1;
						//await i.deferUpdate();
						await wait(1000);
						if (powned[currentPig]) {
							if (powned[currentPig].refid === pigs[currentPig].ID) {
								interactiveButtons.components[1].setDisabled(true);
								interactiveButtons.components[1].setLabel("Owned");
								await collInteract.update({ components: [interactiveButtons] });
							}
						} else if (pigs[currentPig].Cost > qts) {
							interactiveButtons.components[1].setDisabled(true);
							interactiveButtons.components[1].setLabel("Insufficient Qts");
							await collInteract.update({ components: [interactiveButtons] });
						} else {
							interactiveButtons.components[1].setDisabled(false);
							interactiveButtons.components[1].setLabel("Select");
							await collInteract.update({ components: [interactiveButtons] });
						}
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons], files: [pigmyList[currentPig].PngRef] });
					}
				} else if (collInteract.customId === 'back-page') {
					//check what page is currently active
					//add 1 to embed array 
					//show results and decrease currentPage - 1
					//console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);

					if (currentPage === 0) {
						currentPage = embedPages.length - 1;
						currentPig = embedPages.length - 1;
						//await i.deferUpdate();
						await wait(1000);
						if (powned[currentPig]) {
							if (powned[currentPig].refid === pigs[currentPig].ID) {
								interactiveButtons.components[1].setDisabled(true);
								interactiveButtons.components[1].setLabel("Owned");
								await collInteract.update({ components: [interactiveButtons] });
							}
						} else if (pigs[currentPig].Cost > qts) {
							interactiveButtons.components[1].setDisabled(true);
							interactiveButtons.components[1].setLabel("Insufficient Qts");
							await collInteract.update({ components: [interactiveButtons] });
						} else {
							interactiveButtons.components[1].setDisabled(false);
							interactiveButtons.components[1].setLabel("Select");
							await collInteract.update({ components: [interactiveButtons] });
						}
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons], files: [pigmyList[currentPig].PngRef] });
					} else {
						currentPage -= 1;
						currentPig -= 1;
						//await i.deferUpdate();
						await wait(1000);
						if (powned[currentPig]) {
							if (powned[currentPig].refid === pigs[currentPig].ID) {
								interactiveButtons.components[1].setDisabled(true);
								interactiveButtons.components[1].setLabel("Owned");
								await collInteract.update({ components: [interactiveButtons] });
							}
						} else if (pigs[currentPig].Cost > qts) {
							interactiveButtons.components[1].setDisabled(true);
							interactiveButtons.components[1].setLabel("Insufficient Qts");
							await collInteract.update({ components: [interactiveButtons] });
						} else {
							interactiveButtons.components[1].setDisabled(false);
							interactiveButtons.components[1].setLabel("Select");
							await collInteract.update({ components: [interactiveButtons] });
						}
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons], files: [pigmyList[currentPig].PngRef] });
					}
				} else if (collInteract.customId === 'select-pig') {
					await collInteract.deferUpdate();
					await wait(1000);
					console.log('Pigmy Selected!');
					const pig = pigs[currentPig];
					await Pighouse.create(
						{
							spec_id: interaction.user.id,
							name: pig.Name,
							type: pig.Type,
							level: 1,
							exp: 0,
							mood: 'Well',
							happiness: 50,
							refid: pig.ID,
						}
					);
					await interaction.followUp(`You are now the proud owner of a ${pig.Name}!`);
					await collector.stop();
					console.log(`Pigmy ${pig.ID} obtained!`);
				}
			});

			collector.on('end', () => {
				if (embedMsg) {
					embedMsg.delete();
				}
			});

			//========================================
			//basic user data refrence method
			async function grabU() {
				uData = await UserData.findOne({ where: { userid: interaction.user.id } });
				//console.log(uData);
				return uData;
			}
		});
			//console.log('Interaction defered!'));
		
		//HERE WE GO BABY 

		//Step one: Obtaining a pigmy
		//Conditions: Level 5, Completed n# quest(s)
		//==========Functional==========
		/** 
		 *  ONLY ONE OF EACH PIGMY!!
		 *  UNLOCK!!
		 *  SLOW PASSIVE ITEM GAIN ONCE EQUIPPED!!
		 *  DATABASE SPACE FOR THE FOLLOWING VARIABLES WHEN:
		 *  Pighouse.js ===============================
		 *  - Level (static while !Active)
		 *  - Type (static reference to prefab)
		 *  - Current xp (static while !Active)
		 *  - Happiness (static while !Active)
		 *  - Name (set to given name from prefab, can be user defined)
		 *  - specId (user.id)
		 *  - Active (reference to isEquiped)
		 *  Pigmy.js ===============================
		 *  - Level (not static)
		 *  - Type (static reference to prefab)
		 *  - Current xp (not static)
		 *  - Happiness (not static)
		 *  - Name (set to given name from prefab, can be user defined)
		 *  - specId (user.id)
		 *  - LCM = Last-Claim-Made (Using timestamps, mark a time log specifically for the claim interaction)
		 *  EXAMPLE FOR THE ABOVE STATMENT:
		 *  Assign a new field the UpdatedAt timestamp on command claim call
		 *  Leave said value untouched until claim is called again 
		 *  When claim is called, 
		 *  check the time difference, 
		 *  if less than x amount of time,
		 *  tell user no rewards to collect yet,
		 *  leave LCM untouched in this case.
		 *  if more than x amount of time,
		 *  tell user items have been claimed,
		 *  handle drop code following this,
		 *  then update timestamp to time at claim command called.
		 *  
		**/
		//==========UX TINGS==========
		/**
		 * DISABLE BUTTONS FOR ALREADY OWNED PIGMIES
		 * CLAIM BUTTON FOR NEW OBTAINABLE PIGMIES
		 * 
		 **/
		//==========TrashCan for now==========
		/**
		 * More than one of each kind of pigmy at once?
		 * Unlock or purchace?
		 * Passive item gain or player controlled "questing"?
		**/
		//==========ADDITINAL FEATURES FOR LATER==========
		/**
		 * Interacting with pigmys?
		 * Leveling for pigmies increases certain stats?
		 * Pigmy mini-games?
		 **/
		//only 3 options for now
        //when option selected check for dupe in pighouse
        //use userid as location of item, use refid for unique constrant check
        //if both pass buy is rejected for copy found
        //if either fail buy is success
	},
};
