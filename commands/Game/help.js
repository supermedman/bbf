const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Collection } = require('discord.js');
// const { UserData, Pighouse } = require('../../dbObjects.js');
const { grabUser, createInteractiveChannelMessage, handleCatchDelete } = require('../../uniHelperFunctions.js');
const { NavMenu } = require('../Development/Export/Classes/NavMenu.js');
const { loadBasicBackButt } = require('./exported/tradeExtras.js');

module.exports = {
	helptypes: ['Material', 'Payout', 'Combat', 'Quest'],
	data: new SlashCommandBuilder()
	.setName('help')
    .setDescription('Basic tips, tricks, and assistance!'),
	async execute(interaction) {
		if (interaction.user.id !== '501177494137995264') return await interaction.reply({content: 'This command is under construction! Please check back later!'});
		const user = await grabUser(interaction.user.id);

		// Help categories
		// ===============
		// COMMANDS, GAMEPLAY, SETUP, OTHER
		const generalHelpEmbed = new EmbedBuilder()
		.setTitle('== What do you need help with? ==');

		const comHelpButt = new ButtonBuilder()
		.setCustomId('help-command')
		.setStyle(ButtonStyle.Primary)
		.setLabel('Command Help');
		const gameHelpButt = new ButtonBuilder()
		.setCustomId('help-gameplay')
		.setStyle(ButtonStyle.Primary)
		.setLabel('Gameplay Help')
		.setDisabled(true);
		const setupHelpButt = new ButtonBuilder()
		.setCustomId('help-setup')
		.setStyle(ButtonStyle.Primary)
		.setLabel('Setup Help')
		.setDisabled(true);
		const otherHelpButt = new ButtonBuilder()
		.setCustomId('help-other')
		.setStyle(ButtonStyle.Primary)
		.setLabel('Other Help')
		.setDisabled(true);
		const helpTypeRow = new ActionRowBuilder().addComponents(comHelpButt, gameHelpButt, setupHelpButt, otherHelpButt);
		const backTypeRow = loadBasicBackButt('type');

		// COMMANDS
		// ========
		// helptypes: [],
		// helptypes:

		// GAINS: Material, Payout(Coins/XP), Gear
		// 'Material', 'Gear', 'Payout'

		// PROGRESSION: Story, Quest, Level
		// 'Story', 'Quest', 'Level'

		// INFO: Info, Stats
		// 'Info', 'Stats'

		// USER-USER/USER-SYSTEM: Trade, Town, Payup(Coins, Mats, Items)
		// 'Trade', 'Town', 'Payup', 'Craft'
		
		// COMBAT: Combat(Dungeon, Startcombat, SpawnedCombat)
		// Combat ==> Payout, Material, Gear
		// 'Combat'
		
		// MECHANICS: NPC(Dialog, Tasks, Towns), Mechanics(Status Effects, Damage Types, CraftingCore) 
		// /Stats Info('HP', 'DMG', 'DEF')
		// 'NPC', 'Luck', 'Blueprint'

		// OTHER: EarlyAccess, New, Testing
		// 'EA', 'New', 'Testing', 'Locked', 'Support'

		// Dynamically loaded embed display
		const commandCatEmbed = loadCommandCatDisplay();

		function loadCommandCatDisplay(){
			// Sort commands into more specific categories
			const commandList = interaction.client.commands;
			// Filter out dev commands
			const isDevCommand = c => c.helpcat === 'Development';
			// Remove `help` command
			const isHelpCommand = c => c.data.name === 'help';
			// Filter out any commands missing "help" related props
			const hasHelpType = c => 'helptypes' in c;

			/**@type { Collection<string, { helpcat: string, helptypes: string[], data: { name: string, description: string, options?: object[], execute(), autocomplete?() } }> } */
			const helpSupportedCommands = commandList.filter(c => !isDevCommand(c) && !isHelpCommand(c) && hasHelpType(c));

			console.log(helpSupportedCommands.size);

			const gameHelpList = helpSupportedCommands.filter(c => c.helpcat === 'Game');
			const gameComFields = gameHelpList.map(c => `**\`/${c.data.name}\`** `).join();
			const gameFieldObj = { name: '== Gameplay ==', value: gameComFields };

			const utilHelpList = helpSupportedCommands.filter(c => c.helpcat === 'Utility');
			const utilComFields = utilHelpList.map(c => `**\`/${c.data.name}\`** `).join();
			const utilFieldObj = { name: '== Utility ==', value: utilComFields };

			const embed = new EmbedBuilder()
			.setTitle('== Command Categories ==')
			.setDescription('Select one of the following command categories!')
			.addFields(gameFieldObj, utilFieldObj);

			return embed;
		}

		const gameCatButt = new ButtonBuilder()
		.setCustomId('help-cat-game')
		.setStyle(ButtonStyle.Primary)
		.setLabel('Game Commands');
		const utilCatButt = new ButtonBuilder()
		.setCustomId('help-cat-util')
		.setStyle(ButtonStyle.Primary)
		.setLabel('Utility Commands');
		const comCatRow = new ActionRowBuilder().addComponents(gameCatButt, utilCatButt);
		
		// COMMAND CAT DISPLAY
		const commandCatDisplay = {embeds: [commandCatEmbed], components: [comCatRow, backTypeRow]};

		// GAMEPLAY
		// ========
		const gameplayCatEmbed = new EmbedBuilder()
		.setTitle('== Gameplay Categories ==')
		.setDescription('Select one of the following gameplay categories!');
		// GAMEPLAY CAT DISPLAY
		const gameplayCatDisplay = {embeds: [gameplayCatEmbed], components: [backTypeRow]};

		// SETUP
		// =====
		// Direct to `/setup help`
		const setupCatEmbed = new EmbedBuilder()
		.setTitle('== Setup Help ==')
		.setDescription('For Setup help use the command `/setup help`');
		// SETUP DISPLAY
		const setupCatDisplay = {embeds: [setupCatEmbed], components: [backTypeRow]};

		// OTHER
		// =====
		const otherCatEmbed = new EmbedBuilder()
		.setTitle('== Other Categories ==')
		.setDescription('Select one of the following categories!');
		// OTHER CAT DISPLAY
		const otherCatDisplay = {embeds: [otherCatEmbed], components: [backTypeRow]};

		const replyObj = {embeds: [generalHelpEmbed], components: [helpTypeRow]};

		const {anchorMsg, collector, sCollector} = await createInteractiveChannelMessage(interaction, 450000, replyObj, "Reply", "Both");

		const helpExtras = {
			helpType: "",
			helpCat: "",
			helpSubCat: "",
			helpWith: ""
		};

		const helpMenu = new NavMenu(user, replyObj, replyObj.components, helpExtras);

		// ~~~~~~~~~~~~~~~~~~~~~
		// STRING COLLECTOR (COLLECT)
		sCollector.on('collect', async c => {
			await c.deferUpdate().then(async () => {

			}).catch(e => console.error(e));
		});
		// ~~~~~~~~~~~~~~~~~~~~~

		// =====================
		// BUTTON COLLECTOR (COLLECT)
		collector.on('collect', async c => {
			await c.deferUpdate().then(async () => {
				let editWith;
				switch(helpMenu.whatDoYouHear(c.customId)){
					case "NEXT":
						const idSplits = c.customId.split('-');
						console.log(...idSplits);
						switch(idSplits[1]){
							case "cat":

							break;
							case "subcat":

							break;
							case "with":

							break;
							default:
								// Help Type selected
								helpMenu.specs.helpType = idSplits[1];
								switch(idSplits[1]){
									case "command":
										editWith = helpMenu.goingForward(commandCatDisplay);
									break;
									case "gameplay":
										editWith = helpMenu.goingForward(gameplayCatDisplay);
									break;
									case "setup":
										editWith = helpMenu.goingForward(setupCatDisplay);
									break;
									case "other":
										editWith = helpMenu.goingForward(otherCatDisplay);
									break;
								}
							break;
						}
					break;
					case "BACK":
						switch(c.customId.split('-')[1]){
							case "type":
								helpMenu.specs.helpType = "";
							break;
						}
						editWith = helpMenu.goingBackward();
					break;
					case "CANCEL":

					break;
					default:
						console.log(helpMenu.whatDoYouHear(c.customId));
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
		});
		// =====================




		// const uData = await UserData.findOne({ where: { userid: interaction.user.id } });
		// if (!uData) return interaction.reply(`Welcome new user! To get started use the command \`/start\`. If you still need help afterwards use the help command again!`);

		// if (uData.health === 0) {
		// 	//User is dead
		// 	return interaction.reply(`Oh dear, looks like you've fallen in combat and forgot to mourn the loss of life! Do not fear, using \`/startcombat\` will give you another chance and restore you to full health!`);
		// }

		// if (uData.points > 0) {
		// 	//User has unspent points
		// 	return interaction.reply(`Looks like you've got some perk points to spend! ${uData.points} to be exact. You can use \`/stats info <stat name>\` for more information on what each stat does, when you're ready use \`/addpoint\` to spend them!`);
        // }

		// if (uData.health <= 5 && uData.lastdeath === 'None') {
		// 	//User very likely doesnt want to die :3
		// 	return interaction.reply(`Oh my, it would appear your health situation is rather dire! I am estatic to inform you that upon mourning your death when prompted, if you should fall in combat, will bless you back to full health!`);
        // }

		// if (uData.level < 2) {
		// 	//User probably needs help starting combat
		// 	return interaction.reply(`Well well, a brand new ${uData.pclass}! Fantastic choice, now as promised... give the command \`/startcombat\` a try once or twice.. or as many times as you'd like!`);
        // }

		// if (uData.level < 5) {
		// 	//User has not yet reached 'FIRST LEVEL MILESTONE' 
		// 	return interaction.reply(`Welcome back! Looks like you've tested your skills once or twice, however you still lack the experience needed to strike out on your own through quests! Come back once you've reached level 5! :)`);
		// }

		// if (uData.level >= 5 && uData.qt === 0) {
		// 	//User can start quests and has not 
		// 	return interaction.reply(`Congratulations on your success, you are now ready for \`/quest start\`! Good luck out there.`);
		// }

		// if (uData.level > 6 && uData.qt >= 10) {
		// 	//User has completed quest check for owned pigmy
		// 	const haspig = await Pighouse.findOne({ where: { spec_id: interaction.user.id } });
		// 	if (!haspig) {
		// 		//No pigmies found!
		// 		return interaction.reply(`Quite the ${uData.pclass} you've become! Looks like you're ready for something new, give \`/pigmyshop\` a try!`);
        //     }
		// }

		// if (uData.totitem >= 15 && uData.coins <= 5000) {
		// 	//User has many items, and not a lot of coins
		// 	return interaction.reply(`Busy are we? Seems like you've started quite the collection of loot. These commands should be of use to you now! \`/myloot\` to pull up your inventory. \`/equip <Item name>\` This one is case sensitive! \`/sell <Item name>\` This one is too!`);
		// }

		// if (uData.totitem < 15 && uData.coins >= 6500) {
		// 	//User has some items and is piling up coins
		// 	return interaction.reply(`Your pockets are filling up nicely, why not try your luck in the \`/shop\`!`);
        // }

		// if (uData.level > 30) {
		// 	//Unlikely..
		// 	return interaction.reply(`Well then, you must think yourself awfully funny, or think I am daft... If you truely still need help you'll have to wait as this is the furthest I can take you for now`);
        // }
	},
};
