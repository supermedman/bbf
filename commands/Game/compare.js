const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	helptypes: ['EA', 'Locked'],
	data: new SlashCommandBuilder()
		.setName('compare')
        .setDescription('Compare gear with each other.'),

	async execute(interaction) { 

	},
};