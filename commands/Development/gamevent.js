const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
	.setName('gamevent')
    .setDescription('Manage an in-game event!')
    .addSubcommand(subcommand => 
        subcommand
        .setName('add')
        .setDescription('Add a new in-game event.')
        .addStringOption(option => 
            option
            .setName('name')
            .setDescription('The name for the new in-game event.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName('activate')
        .setDescription('Activate an existing deactive in-game event.')
        .addStringOption(option => 
            option
            .setName('name')
            .setDescription('The name of the event to be activated.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName('deactivate')
        .setDescription('Deactivate an existing active in-game event.')
        .addStringOption(option => 
            option
            .setName('name')
            .setDescription('The name of the event to be deactivated.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName('remove')
        .setDescription('Remove an existing in-game event.')
        .addStringOption(option => 
            option
            .setName('name')
            .setDescription('The name of the event to be removed.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName('list')
        .setDescription('List all existing in-game event.')
        .addStringOption(option => 
            option
            .setName('type')
            .setDescription('Filter events by this value.')
        )
    ),
    async autocomplete(interaction){
        
    },
	async execute(interaction) { 

	},
};