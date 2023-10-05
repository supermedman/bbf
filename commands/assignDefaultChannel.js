const { SlashCommandBuilder } = require('discord.js');
const { GuildData } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('template')
        		.setDescription('Description here!'),

	async execute(interaction) { 

	},
};