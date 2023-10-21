const { SlashCommandBuilder } = require('discord.js');
const { UserData, Pighouse } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
        		.setDescription('Basic tips, tricks, and assistance!'),

	async execute(interaction) { 
		const uData = await UserData.findOne({ where: { userid: interaction.user.id } });
		if (!uData) return interaction.reply(`Welcome new user! To get started use the command \`/start\`. If you still need help afterwards use the help command again!`);

		if (uData.health === 0) {
			//User is dead
			return interaction.reply(`Oh dear, looks like you've fallen in combat and forgot to mourn the loss of life! Do not fear, using \`/startcombat\` will give you another chance and restore you to full health!`);
		}

		if (uData.points > 0) {
			//User has unspent points
			return interaction.reply(`Looks like you've got some perk points to spend! ${uData.points} to be exact. You can use \`/stats info <stat name>\` for more information on what each stat does, when you're ready use \`/addpoint\` to spend them!`);
        }

		if (uData.health <= 5 && uData.lastdeath === 'None') {
			//User very likely doesnt want to die :3
			return interaction.reply(`Oh my, it would appear your health situation is rather dire! I am estatic to inform you that upon mourning your death when prompted, if you should fall in combat, will bless you back to full health!`);
        }

		if (uData.level < 2) {
			//User probably needs help starting combat
			return interaction.reply(`Well well, a brand new ${uData.pclass}! Fantastic choice, now as promised... give the command \`/startcombat\` a try once or twice.. or as many times as you'd like!`);
        }

		if (uData.level < 5) {
			//User has not yet reached 'FIRST LEVEL MILESTONE' 
			return interaction.reply(`Welcome back! Looks like you've tested your skills once or twice, however you still lack the experience needed to strike out on your own through quests! Come back once you've reached level 5! :)`);
		}

		if (uData.level >= 5 && uData.qt === 0) {
			//User can start quests and has not 
			return interaction.reply(`Congratulations on your success, you are now ready for \`/quest start\`! Good luck out there.`);
		}

		if (uData.level > 6 && uData.qt >= 10) {
			//User has completed quest check for owned pigmy
			const haspig = await Pighouse.findOne({ where: { spec_id: interaction.user.id } });
			if (!haspig) {
				//No pigmies found!
				return interaction.reply(`Quite the ${uData.pclass} you've become! Looks like you're ready for something new, give \`/pigmyshop\` a try!`);
            }
		}

		if (uData.totitem >= 15 && uData.coins <= 5000) {
			//User has many items, and not a lot of coins
			return interaction.reply(`Busy are we? Seems like you've started quite the collection of loot. These commands should be of use to you now! \`/myloot\` to pull up your inventory. \`/equip <Item name>\` This one is case sensitive! \`/sell <Item name>\` This one is too!`);
		}

		if (uData.totitem < 15 && uData.coins >= 6500) {
			//User has some items and is piling up coins
			return interaction.reply(`Your pockets are filling up nicely, why not try your luck in the \`/shop\`!`);
        }

		if (uData.level > 30) {
			//Unlikely..
			return interaction.reply(`Well then, you must think yourself awfully funny, or think I am daft... If you truely still need help you'll have to wait as this is the furthest I can take you for now`);
        }
	},
};
