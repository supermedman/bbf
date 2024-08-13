const { Events, Collection, EmbedBuilder } = require('discord.js');
const { warnedForm } = require('../chalkPresets');

const {EarlyAccess, UserData} = require('../dbObjects.js');
const { spawnNpc } = require('../commands/Game/exported/npcSpawner.js');

//let collectionRunOnce = false;

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			if (command.data.name !== 'start'){
				const userCheck = await UserData.findOne({where: {userid: interaction.user.id}});
				if (!userCheck) return await interaction.reply("Please use the command ``/start`` to create a user profile!");
				const rollNpc = 0.98, rolled = Math.random();
				if (rolled >= rollNpc) spawnNpc(userCheck, interaction);
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

			if (interaction.user.id !== '501177494137995264'){
				timestamps.set(interaction.user.id, now);
				setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
			}
			
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
					if (mappingCheck.has(interaction.user.id)) hasButtonPerm = true;

					if (!eaCheck) eaCheck = await EarlyAccess.create({userid: interaction.user.id, spawn_new: hasButtonPerm});

					if (!betaTester.has(interaction.user.id)){
						betaTester.set(interaction.user.id, true);
					}
					
					// if (collectionRunOnce === false){
					// 	collectionRunOnce = true;

					// 	const allEA = await EarlyAccess.findAll();
					// 	for (const user of allEA){
					// 		if (!betaTester.has(user.userid)){
					// 			betaTester.set(user.userid, true);
					// 		}
					// 	}

					// 	const newSpawnFilter = allEA.filter(user => user.spawn_new === true);
					// 	for (const user of newSpawnFilter){
					// 		if (!newEnemy.has(user.userid)){
					// 			newEnemy.set(user.userid, true);
					// 		}
					// 	}

					// 	console.log(...newEnemy);
					// 	console.log(...betaTester);
					// }

				}).catch(error => {
					console.error(error);
					interaction.reply({content: 'Something went wrong adding that role!', ephemeral: true});
				});
			}
			
			// interaction.user.id === 'userid'
			// interaction.customId === 'buttonid'


		} else if (interaction.isModalSubmit()){
			const filterBy = interaction.customId;

			let guild = await interaction.client.guilds.fetch("892659101878849576"); // returns a Guild or undefined
			let channel;
			if (guild) {
				channel = await guild.channels.fetch("1193639127766282240");
			}

			const replyEmbed = new EmbedBuilder();

			let responseType;
			switch(filterBy){
				case "modal-report":
					replyEmbed
					.setTitle('== Report ==')
					.addFields(
						{name: "Command: ", value: `**${interaction.fields.getTextInputValue('com-location')}**`},
						{name: "Issue: ", value: `**${interaction.fields.getTextInputValue('issue')}**`}
					);
					responseType = "Report"
				break;
				default:
					replyEmbed
					.setTitle('== Modal ==');

					responseType = "Modal";
				break;
			}

			const replyObj = {embeds: [replyEmbed]};

			if (channel){
				await interaction.reply({content: `${responseType} Submitted Successfully!`, ephemeral: true});
				return await channel.send(replyObj);
			}
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
