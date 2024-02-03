const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reload')
        .setDescription('Reloads Cached Data During Active Process.')
		.addSubcommand(subcommand => 
				subcommand
					.setName('command')
					.setDescription('Reloads an active slashcommand.')
					.addStringOption(option=>
						option
						.setName('name')
						.setDescription('Name of Command to be reloaded.')
						.setRequired(true)))
		.addSubcommand(subcommand => 
				subcommand
					.setName('other')
					.setDescription('WIP')),

	async execute(interaction) { 
		if (interaction.user.id !== '501177494137995264') return interaction.reply('This is a dev only command!');

		if (interaction.options.getSubcommand() === 'command'){
			const commandName = interaction.options.getString('command', true).toLowerCase();
			const command = interaction.client.commands.get(commandName);
	
			if (!command) {
				return interaction.reply(`There is no command with name \`${commandName}\`!`);
			}

			delete require.cache[require.resolve(`./${command.data.name}.js`)];

			try {
				interaction.client.commands.delete(command.data.name);
				const newCommand = require(`./${command.data.name}.js`);
				interaction.client.commands.set(newCommand.data.name, newCommand);
				await interaction.reply(`Command \`${newCommand.data.name}\` was reloaded!`);
			} catch (error) {
				console.error(error);
				await interaction.reply(`There was an error while reloading a command \`${command.data.name}\`:\n\`${error.message}\``);
			}
		}
		
		if (interaction.options.getSubcommand() === 'other'){
			return;
		}
	},
};