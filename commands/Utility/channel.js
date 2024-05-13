const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const {
	warnedForm,
	errorForm,
	successResult,
	failureResult,
	basicInfoForm,
	specialInfoForm
} = require('../../chalkPresets.js');
const { GuildData } = require('../../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('channel')
		.setDescription('channel handling from one command!')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.addSubcommand(subcommand =>
			subcommand
				.setName('assign')
				.setDescription('Assign a channel')
				.addStringOption(option =>
					option.setName('channeltype')
						.setDescription('Which channel type would you like to assign?')
						.setRequired(true)
						.setChoices(
							{ name: 'Spawn', value: 'spawn' },
							{ name: 'Announce', value: 'announce' },
						))
				.addStringOption(option =>
					option.setName('channelid')
						.setDescription('New Default Channel to be used')
						.setRequired(true))) // Set this to .addChannelOption Instead!!
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove')
				.setDescription('Removes an assigned channel')),

	async execute(interaction) { 
		

		if (interaction.options.getSubcommand() === 'assign') {
			await interaction.deferReply().then(async () => {
				let guildID = interaction.guild.id;
				console.log(`Guild ID: ${guildID}`);
				let member = interaction.user.id;
				console.log(`Member ID: ${member}`);

				const channelType = interaction.options.getString('channeltype') ?? 'NONE';
				if (channelType === 'NONE') return interaction.followUp('That was not a valid option!');

				//prompt user to assign new channel
				//check if channel is already assigned
				const newChannelID = interaction.options.getString('channelid');
				console.log(`New Channel Given, ID: ${newChannelID}`);

				if (channelType === 'spawn') {
					const currentSpawnChl = await GuildData.findOne({where: {guildid: guildID, spawnchannel: newChannelID}});
					if (currentSpawnChl) return await interaction.followUp('This channel is already the spawn channel!');

					const guildRef = await GuildData.findOne({where: {guildid: guildID}});
					if (!guildRef) return await interaction.followUp('This guild is not in the database!!');

					const channelObj = await interaction.guild.channels.cache.find(c => c.id === newChannelID);
					if (!channelObj.name) return await interaction.followUp('This is not a valid channel id!');

					if (guildRef.spawnchannel === '0') {
						const tableUpdate = await guildRef.update({spawnchannel: newChannelID});
						if (tableUpdate) await guildRef.save();
						return await interaction.followUp(`${channelObj.name} is now the spawn channel!`);	
					} else {
						const acceptButton = new ButtonBuilder()
						.setLabel("Yes")
						.setStyle(ButtonStyle.Success)
						.setEmoji('✅')
						.setCustomId('accept');

						const cancelButton = new ButtonBuilder()
						.setLabel("No")
						.setStyle(ButtonStyle.Danger)
						.setEmoji('❌')
						.setCustomId('cancel');

						const interactiveButtons = new ActionRowBuilder().addComponents(acceptButton, cancelButton);

						const confirmEmbed = new EmbedBuilder()
							.setColor('DarkButNotBlack')
							.setTitle('Spawn Channel')
							.addFields(
								{
									name: `Channel: ${channelObj.name}`,
									value: `Would you like to make this the new spawn channel?`,

								});

						const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [confirmEmbed] });

						const filter = (i) => i.user.id === interaction.user.id;

						const collector = embedMsg.createMessageComponentCollector({
							ComponentType: ComponentType.Button,
							filter,
							time: 120000,
						});

						collector.on('collect', async COI => {
							if (COI.customId === 'cancel'){
								await collector.stop();
							}

							if (COI.customId === 'accept'){
								const tableUpdate = await guildRef.update({spawnchannel: newChannelID});
								if (tableUpdate) await guildRef.save();

								await collector.stop();
								
								return await interaction.followUp(`${channelObj.name} is now the spawn channel!`);
							}
						});

						collector.on('end', () => {
							embedMsg.delete().catch(error => {
								if (error.code !== 10008) {
									console.error('Failed to delete the message:', error);
								}
							});
						});
					}
				} else if (channelType === 'announce') {

					const currentAnonChl = await GuildData.findOne({where: {guildid: guildID, announcechannel: newChannelID}});
					if (currentAnonChl) return await interaction.followUp('This channel is already the announcement channel!');

					const guildRef = await GuildData.findOne({where: {guildid: guildID}});
					if (!guildRef) return await interaction.followUp('This guild is not in the database!!');

					const channelObj = await interaction.guild.channels.cache.find(c => c.id === newChannelID);
					if (!channelObj.name) return await interaction.followUp('This is not a valid channel id!');

					if (guildRef.announcechannel === '0') {
						const tableUpdate = await guildRef.update({announcechannel: newChannelID});
						if (tableUpdate) await guildRef.save();
						return await interaction.followUp(`${channelObj.name} is now the announcement channel!`);	
					} else {
						const acceptButton = new ButtonBuilder()
						.setLabel("Yes")
						.setStyle(ButtonStyle.Success)
						.setEmoji('✅')
						.setCustomId('accept');

						const cancelButton = new ButtonBuilder()
						.setLabel("No")
						.setStyle(ButtonStyle.Danger)
						.setEmoji('❌')
						.setCustomId('cancel');

						const interactiveButtons = new ActionRowBuilder().addComponents(acceptButton, cancelButton);

						const confirmEmbed = new EmbedBuilder()
							.setColor('DarkButNotBlack')
							.setTitle('Spawn Channel')
							.addFields(
								{
									name: `Channel: ${channelObj.name}`,
									value: `Would you like to make this the new announcement channel?`,

								});

						const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [confirmEmbed] });

						const filter = (i) => i.user.id === interaction.user.id;

						const collector = embedMsg.createMessageComponentCollector({
							ComponentType: ComponentType.Button,
							filter,
							time: 120000,
						});

						collector.on('collect', async COI => {
							if (COI.customId === 'cancel'){
								await collector.stop();
							}

							if (COI.customId === 'accept'){
								const tableUpdate = await guildRef.update({announcechannel: newChannelID});
								if (tableUpdate) await guildRef.save();

								await collector.stop();
								
								return await interaction.followUp(`${channelObj.name} is now the announcement channel!`);
							}
						});

						collector.on('end', () => {
							embedMsg.delete().catch(error => {
								if (error.code !== 10008) {
									console.error('Failed to delete the message:', error);
								}
							});
						});
					}
				} else return interaction.followUp('That was not a valid option!');
			}).catch(error => {
				console.log(errorForm(error));
			});
		}
		if (interaction.options.getSubcommand() === 'remove') {
			await interaction.deferReply().then(async () => {
				let guildID = interaction.guild.id;
				console.log(`Guild ID: ${guildID}`);
				let member = interaction.user.id;
				console.log(`Member ID: ${member}`);
				//prompt user for confirmation of channel removel
				//prompt user to use assign subcommand to reactiveate bot
				const interactiveButtons = new ActionRowBuilder()
					.addComponents(
						new ButtonBuilder()
							.setLabel("Yes")
							.setStyle(ButtonStyle.Success)
							.setEmoji('✅')
							.setCustomId('accept'),
					)
					.addComponents(
						new ButtonBuilder()
							.setLabel("No")
							.setStyle(ButtonStyle.Danger)
							.setEmoji('❌')
							.setCustomId('cancel'),
					);

				const confirmEmbed = new EmbedBuilder()
					.setColor('DarkButNotBlack')
					.setTitle('Spawn Channel')
					.addFields(
						{
							name: `Channel Removal`,
							value: `Would you like to remove the current spawn channel?`,

						})
				await interaction.followUp({ components: [interactiveButtons], embeds: [confirmEmbed] }).then(async embedMsg => {
					const collectorBut = embedMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

					collectorBut.on('collect', async i => {
						if (i.user.id === interaction.user.id) {
							if (i.customId === 'accept') {
								//User has confirmed channel change, procced
								const editChannel = await GuildData.update({ spawnchannel: 0 }, { where: { guildid: guildID } });

								if (editChannel > 0) {
									//updated spawn channel success!					
									await interaction.followUp(`Channel removed as spawn channel!`);
									await i.deferUpdate();
									wait(5000).then(async () => {
										await embedMsg.delete();
									});
								} else {/*Something went wrong!*/console.log(`Data edit Falure!`); }

							} else if (i.customId === 'cancel') {
								//User has canceled channel change, inform and delete
								i.reply('Channel removal cancelled!');
								await i.deferUpdate();
								wait(5000).then(async () => {
									await embedMsg.delete();
								});
							}
						} else {
							i.reply({ content: `Nice try slick!`, ephemeral: true });
						}
					});
				}).catch(console.error);
			}).catch(error => {
				console.log(errorForm(error));
			});
			
			
		}
	},
};
