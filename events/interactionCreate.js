const { Events, Collection } = require('discord.js');
const { warnedForm } = require('../chalkPresets');
//const wait = require('node:timers/promises').setTimeout;
// 

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			const { cooldowns } = interaction.client;

			if (!cooldowns.has(command.data.name)) {
				cooldowns.set(command.data.name, new Collection());
			}

			const now = Date.now();
			const timestamps = cooldowns.get(command.data.name);
			const defaultCooldownDuration = 3;
			const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

			if (timestamps.has(interaction.user.id)) {
				const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

				if (now < expirationTime) {
					const expiredTimestamp = Math.round(expirationTime / 1000);
					//await interaction.deferReply();
					console.log(warnedForm(`${interaction.user.username} on cooldown for ${command.data.name}`));
					return interaction.reply({ content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, ephemeral: true });
				}
			}

			timestamps.set(interaction.user.id, now);
			setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(`Error executing ${interaction.commandName}`);
				console.error(error);
				if (!interaction) {
					return console.log('INTERACTION FAILED TO BE FOUND LOGGING FAILURE!');
				} else {
					console.log('INTERACTION FOUND DISPLAYING FAILURE!');
					if (interaction.replied || interaction.deferred) {
						await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
					} else {
						await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: false });
					}
                }
			}
		} else if (interaction.isButton()) {
			// Button Interaction!!
			console.log('Button Interaction:', interaction.user.username + ' ' + interaction.customId);

			// interaction.user.id === 'userid'
			// interaction.customId === 'buttonid'


		} else if (interaction.isAutocomplete()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.autocomplete(interaction);
			} catch (error) {
				if (error.code !== 50035) {
					console.error(`Error executing ${interaction.commandName}`);
					console.error(error);
                }	
			}
		}
	},
};
