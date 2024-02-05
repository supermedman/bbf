const fs = require('node:fs');
const path = require('node:path');

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reload')
        .setDescription('Reloads Cached Data During Active Process.')
		.addSubcommand(subcommand => 
				subcommand
					.setName('type-command')
					.setDescription('Reloads an active slashcommand.')
						.addStringOption(option=>
							option.setName('name')
								.setDescription('Name of Command to be reloaded.')
								.setRequired(true)))
		.addSubcommand(subcommand => 
				subcommand
					.setName('type-other')
					.setDescription('WIP')),

	async execute(interaction) { 
		if (interaction.user.id !== '501177494137995264') return interaction.reply('This is a dev only command!');

		if (interaction.options.getSubcommand() === 'type-command'){
			const commandName = interaction.options.getString('name', true).toLowerCase();
			const command = interaction.client.commands.get(commandName);
			
			if (!command) {
				return interaction.reply(`There is no command with name \`${commandName}\`!`);
			}
			
			// Here the dir base path is resolved to a string format
			let foldersPath = path.resolve(__dirname,);
			// Then modified to back out a sublevel for further use
			foldersPath = path.join(`${foldersPath}`, '..');

			// This uses the resulting folderPath as a dir sync to gain reference to all command locations
			const commandFolders = fs.readdirSync(foldersPath);

			let folderCheck = '';
			for (const folder of commandFolders){
				const commandsPath = path.join(foldersPath, folder);//access commands folder as directory
				const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));//searches for any file within this dir ending with .js (being a javascript file)

				// Check for matching command by name, exiting loop upon location, setting folderCheck to the assiociated file path needed
				for (const file of commandFiles){
					const filePath = path.join(commandsPath, file);
					const command = require(filePath);
					if (command.data.name === commandName) {
						folderCheck = filePath;
						break;
					}
				}
			}

			// Delete require cache of found command
			delete require.cache[require.resolve(folderCheck)];
			//?? delete require.cache[require.resolve(`../${command.data.name}.js`)];

			// Attempt to re-require command file into the command collection and cache
			try {
				interaction.client.commands.delete(command.data.name);
				const newCommand = require(folderCheck);
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