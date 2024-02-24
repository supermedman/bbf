const { SlashCommandBuilder } = require('discord.js');

const {UserData} = require('../../dbObjects.js');
const lootList = require('../../events/Models/json_prefabs/lootList.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cheat')
        .setDescription('Dev Command')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('Item ID')),

	async execute(interaction) { 
        if (interaction.user.id !== '501177494137995264') return await interaction.reply('Nope!');
        
        const itemID = interaction.options.getInteger('id');

        let filterItem = lootList.filter(item => item.Loot_id === itemID);
        
    },
};