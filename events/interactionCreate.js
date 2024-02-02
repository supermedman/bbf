const { Events, Collection } = require('discord.js');
const { warnedForm } = require('../chalkPresets');

const {EarlyAccess} = require('../dbObjects.js');

let collectionRunOnce = false;

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

			if (interaction.customId === 'this-gives-early-access'){
				//ADD ROLE GIVING HERE!
				const { betaTester, newEnemy } = interaction.client;
				const {New_Spawn} = require('../userStorage.json');
				const roleId = '903105915383865415';

				const role = interaction.guild.roles.cache.get(roleId);

				if (!role) return await interaction.reply({content: 'Role not found!', ephemeral: true});

				return interaction.member.roles.add(role).then(async (member) => {
					await interaction.reply({content: `Role added to ${member}!`, ephemeral: true});
					
					let eaCheck = await EarlyAccess.findOne({where: {userid: interaction.user.id}});
					let hasButtonPerm = false;

					const mappingCheck = new Map();
					for (const id of New_Spawn){
						mappingCheck.set(id, true);
					}
					console.log(...mappingCheck);
					if (mappingCheck.has(interaction.user.id)) hasButtonPerm = true;

					if (!eaCheck) eaCheck = await EarlyAccess.create({userid: interaction.user.id, spawn_new: hasButtonPerm});

					if (!betaTester.has(interaction.user.id)){
						betaTester.set(interaction.user.id, true);
					}
					
					if (collectionRunOnce === false){
						collectionRunOnce = true;

						const allEA = await EarlyAccess.findAll();
						console.log(...allEA);

						for (const id of allEA){
							if (!betaTester.has(id)){
								betaTester.set(id, true);
							}
						}

						const newSpawnFilter = allEA.filter(user => user.spawn_new === true);
						console.log(...newSpawnFilter);

						for (const id of newSpawnFilter){
							if (!newEnemy.has(id)){
								newEnemy.set(id, true);
							}
						}
					}

				}).catch(error => {
					console.error(error);
					interaction.reply({content: 'Something went wrong adding that role!', ephemeral: true});
				});
			}
			
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
