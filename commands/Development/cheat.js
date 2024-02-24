const { SlashCommandBuilder } = require('discord.js');

const {UserData} = require('../../dbObjects.js');
const lootList = require('../../events/Models/json_prefabs/lootList.json');
const { checkOwned } = require('../Game/exported/createGear.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cheat')
        .setDescription('Dev Command')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('Item ID'))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Item Amount')),

	async execute(interaction) { 
        if (interaction.user.id !== '501177494137995264') return await interaction.reply('Nope!');
        
        const itemID = interaction.options.getInteger('id');

        let filterItem = lootList.filter(item => item.Loot_id === itemID);
        
        filterItem = filterItem[0];
        
        const user = await UserData.findOne({where: {userid: interaction.user.id}});

        const outcome = await checkOwned(user, filterItem, 1);
        if (outcome === 'Finished') return await interaction.reply('Item added!', filterItem.Name);
    },
};