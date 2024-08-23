const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
//const wait = require('node:timers/promises').setTimeout;
const { Pighouse, UserData } = require('../../dbObjects.js');

const pigmyList = require('../../events/Models/json_prefabs/pigmyList.json');
const { grabUser, createInteractiveChannelMessage, sendTimedChannelMessage, handleCatchDelete } = require('../../uniHelperFunctions.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pigmyshop')
        	.setDescription('The place to pick up your own pigmy!'),

	async execute(interaction) {

		const user = await grabUser(interaction.user.id);
		if (user.level < 5) return await interaction.reply('You must be at least level 5 before the Pigmies will allow entry! ``/startcombat`` will help!');
		if (user.qt === 0) return await interaction.reply('You must have completed your first quest before the Pigmies will accept you! ``/quest start`` can change that!');

		await interaction.deferReply();

		const userOwnsPigsList = await Pighouse.findAll({where: {spec_id: user.userid}});
		const ownedPigIDList = [];
		if (userOwnsPigsList.length !== 0){
			for (const oPig of userOwnsPigsList){
				ownedPigIDList.push(oPig.refid);
			}
		}

		const pigMenu = {
			curPage: 0,
			lastPage: 0, // pigEmbeds.length - 1
			pigEmbeds: [],
			pigPics: [],
			pigRefs: [],
			ownedRef: [],
			affordRef: []
		};

		const loadedPigDisplay = loadPigmyMenu();
		const theFirstPiggy = {
			owned: loadedPigDisplay.owned[0],
			afford: loadedPigDisplay.afford[0]
		};

		pigMenu.pigEmbeds = loadedPigDisplay.embeds;
		pigMenu.lastPage = pigMenu.pigEmbeds.length - 1;

		pigMenu.pigPics = loadedPigDisplay.pics;
		pigMenu.pigRefs = loadedPigDisplay.pigs;

		pigMenu.ownedRef = loadedPigDisplay.owned;
		pigMenu.affordRef = loadedPigDisplay.afford;

		const pageButtRow = loadPageButts(theFirstPiggy);

		const replyObj = {embeds: [pigMenu.pigEmbeds[0]], components: [pageButtRow], files: [pigMenu.pigPics[0]]};

		const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, "FollowUp");

		// =====================
		// BUTTON COLLECTOR
		collector.on('collect', async c => {
			await c.deferUpdate().then(async () => {
				switch(c.customId){
					case "next-page":
						pigMenu.curPage = (pigMenu.curPage === pigMenu.lastPage) ? 0 : pigMenu.curPage + 1;
					break;
					case "back-page":
						pigMenu.curPage = (pigMenu.curPage === 0) ? pigMenu.lastPage : pigMenu.curPage - 1;
					break;
					case "select-pig":
					return collector.stop('Pig Picked');
				}

				// === HANDLE SELECT BUTTON UPDATES ===
				let labelUpdate = 'Select', offUpdate = false;
				if (!pigMenu.affordRef[pigMenu.curPage]){
					labelUpdate = 'Cannot Afford';
					offUpdate = true;
				}
				if (pigMenu.ownedRef[pigMenu.curPage]){
					labelUpdate = 'Owned!';
					offUpdate = true;
				}
				pageButtRow.components[1].setLabel(labelUpdate);
				pageButtRow.components[1].setDisabled(offUpdate);
				// ^^^ HANDLE SELECT BUTTON UPDATES ^^^

				const editWith = {embeds: [pigMenu.pigEmbeds[pigMenu.curPage]], components: [pageButtRow], files: [pigMenu.pigPics[pigMenu.curPage]]};

				await anchorMsg.edit(editWith);
			}).catch(e => console.error(e));
		});
		// =====================

		// =====================
		// BUTTON COLLECTOR
		collector.on('end', async (c, r) => {
			if (!r || r === 'time') await handleCatchDelete(anchorMsg);

			if (r === 'Pig Picked'){
				await handleCatchDelete(anchorMsg);

				const pickedPig = pigMenu.pigRefs[pigMenu.curPage];

				const newPigmy = await Pighouse.create({
					spec_id: interaction.user.id,
					name: pickedPig.Name,
					type: pickedPig.Type,
					level: 1,
					exp: 0,
					mood: 'Well',
					happiness: 50,
					refid: pickedPig.ID,
				}).then(async p => await p.save()).then(async p => {return await p.reload()});

				const newPigEmbed = new EmbedBuilder()
				.setTitle('== Pigmy Obtained ==')
				.setDescription(`Consider yourself the proud owner of your new ${newPigmy.name}!`);

				return await sendTimedChannelMessage(interaction, 60000, newPigEmbed);
			}
		});
		// =====================

		/**
		 * This function loads the pigmy shop display embed list, returning an object with 3 index aligned arrays.
		 * @returns {{embeds: EmbedBuilder[], pics: object[], pigs: object[], owned: boolean[], afford: boolean[]}}
		 */
		function loadPigmyMenu(){
			const finalObj = {embeds: [], pics: [], pigs: [], owned: [], afford: []};

			const sortedPigmyList = pigmyList;

			sortedPigmyList.sort((a,b) => a.Cost - b.Cost);

			let pageCount = 1;
			for (const pig of sortedPigmyList){
				finalObj.pigs.push(pig);
				finalObj.pics.push(pig.PngRef);

				const embed = new EmbedBuilder()
				.setTitle('== Pigmy Shoppe ==')
				.setDescription(`Pigmy: ${pageCount}/${sortedPigmyList.length}`)
				.setFooter({text: `Your QTs: ${user.qt} qts`})
				.setImage(pig.Image)
				.addFields(
					{
						name: `Name: **${pig.Name}**`,
						value: `Pigmy Type: **${pig.Type}**\nQT Required: **${pig.Cost}**\nDamage per Level: **${pig.DPL}** DMG\nBuff: *${pig.Buff}*`
					}
				);
				finalObj.embeds.push(embed);
				
				// boolean check if pigmy is already owned
				finalObj.owned.push(ownedPigIDList.includes(pig.ID));

				// boolean check if user can afford pigmy
				const canAffordPig = (user.qt >= pig.Cost) ? true : false;
				finalObj.afford.push(canAffordPig);
				pageCount++;
			}
			return finalObj;
		}

		/**
		 * This function handles creating the page buttons for the pigmy display menu, using the given ``firstPigInfo``,
		 * 
		 * sets the ``selectButt``.label to "Cannot Afford", "Owned!", or by default "Select"
		 * 
		 * sets the ``selectButt``.setDisabled to ``true``, ``true``, or by default ``false``
		 * @param {object} firstPigInfo Contains ``{owned: boolean, afford: boolean}`` for first pigmy shown
		 * @returns {ActionRowBuilder}
		 */
		function loadPageButts(firstPigInfo){
			const backButt = new ButtonBuilder()
			.setLabel("Backward")
			.setStyle(ButtonStyle.Primary)
			.setEmoji('◀️')
			.setCustomId('back-page');

			let pickButtLabel = 'Select', pickButtOff = false;
			if (!firstPigInfo.afford){
				pickButtLabel = 'Cannot Afford';
				pickButtOff = true;
			}
			if (firstPigInfo.owned){
				pickButtLabel = 'Owned!';
				pickButtOff = true;
			}

			const selectButt = new ButtonBuilder()
			.setLabel(pickButtLabel)
			.setStyle(ButtonStyle.Success)
			.setEmoji('*️⃣')
			.setDisabled(pickButtOff)
			.setCustomId('select-pig');

			const nextButt = new ButtonBuilder()
			.setLabel("Forward")
			.setStyle(ButtonStyle.Primary)
			.setEmoji('▶️')
			.setCustomId('next-page');

			const buttRow = new ActionRowBuilder().addComponents(backButt, selectButt, nextButt);

			return buttRow;
		}

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
