const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('travel')
        .setDescription('Travel to somewhere!'),

	async execute(interaction) { 
        
	},
};