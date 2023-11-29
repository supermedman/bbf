const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const {
	warnedForm,
	errorForm,
	successResult,
	failureResult,
	basicInfoForm,
	specialInfoForm
} = require('../chalkPresets.js');
const { GuildData } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('channel')
		.setDescription('channel handling from one command!')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.addSubcommand(subcommand =>
			subcommand
				.setName('assign')
				.setDescription('Assigns the default spawn channel here.')
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
						.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove')
				.setDescription('Removes the default spawn channel here.')),

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
					if (guildID) {
						//First check if channel already exists with inputed channel id
						var newAssign = await GuildData.findOne({ where: [{ guildid: guildID }, { spawnchannel: newChannelID }] });
						if (newAssign) {
							//Channel is already assigned as spawn channel
							await interaction.followUp(`This channel is already assigned as the spawn channel!`);
						} else {
							//channel is new or guild has no assigned channel, procced
							//check if no channel is assigned yet
							newAssign = await GuildData.findOne({ where: { guildid: guildID } });
							console.log(newAssign);
							console.log(`newAssign Channel ID: ${newAssign.spawnchannel}`);
							if (newAssign.spawnchannel === '0') {
								//no channel is assigned complete action and report success!
								const editChannel = await GuildData.update({ spawnchannel: newChannelID }, { where: { guildid: guildID } });

								if (editChannel > 0) {
									//updated spawn channel success!
									//Retrieve Channel object for further use
									const newChannel = await interaction.guild.channels.cache.find(c => c.id === newChannelID);
									await interaction.followUp(`Channel ${newChannel.Name} is now the spawn channel!`);
								} else {/*Something went wrong!*/console.log(`Data edit Falure!`); }

							} else {
								//Retrieve Channel object for further use
								const newChannel = await interaction.guild.channels.cache.find(c1 => c1.id === newChannelID);
								console.log(`New Channel: ${newChannel}`);
								const curChannel = await interaction.guild.channels.cache.find(c2 => c2.id === newAssign.spawnchannel);
								console.log(`Current Channel: ${curChannel}`);
								console.log(`Current Spawn Channel: ${curChannel.Name} \nNew spawn channel: ${newChannel.Name}`);

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
											name: `Channel: ${newChannel.name}`,
											value: `Would you like to make this the new spawn channel?`,

										});

								const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [confirmEmbed] });

								const filter = (i) => i.user.id === interaction.user.id;

								const collector = embedMsg.createMessageComponentCollector({
									ComponentType: ComponentType.Button,
									filter,
									time: 120000,
								});

								collector.on('collect', async (collInteract) => {
									if (collInteract.customId === 'accept') {
										//User has confirmed channel change, procced
										const editChannel = await GuildData.update({ spawnchannel: newChannelID }, { where: { guildid: guildID } });

										if (editChannel > 0) {
											//updated spawn channel success!
											//Retrieve Channel object for further use
											const newChannel = await interaction.guild.channels.cache.find(c => c.id === newChannelID);
											await interaction.followUp(`Channel ${newChannel.name} is now the spawn channel!`);
											await collInteract.deferUpdate();

											acceptButton.setDisabled(true);
											cancelButton.setDisabled(true);

											embedMsg.edit({
												components: [interactiveButtons],
											});
											wait(5000).then(async () => {
												await collector.stop();
											});

										} else {/*Something went wrong!*/console.log(`Data edit Falure!`); }
									}

									if (collInteract.customId === 'cancel') {
										//User has canceled channel change, inform and delete
										collInteract.reply('Channel Change cancelled!');
										await collInteract.deferUpdate();

										acceptButton.setDisabled(true);
										cancelButton.setDisabled(true);

										embedMsg.edit({
											components: [interactiveButtons],
										});
										wait(5000).then(async () => {
											await collector.stop();
										});
									}
								});

								collector.on('end', () => {
									if (embedMsg) {
										embedMsg.delete();
									} else if (!embedMsg) {
										//do nothing
									}
								});								
							}
						}
					}
				} else if (channelType === 'announce') {
					if (guildID) {
						//First check if channel already exists with inputed channel id
						var newAssign = await GuildData.findOne({ where: [{ guildid: guildID }, { announcechannel: newChannelID }] });
						if (newAssign) {
							//Channel is already assigned as spawn channel
							return await interaction.followUp(`This channel is already assigned as the spawn channel!`);
						} else {
							//channel is new or guild has no assigned channel, procced
							//check if no channel is assigned yet
							newAssign = await GuildData.findOne({ where: { guildid: guildID } });
							console.log(newAssign);
							console.log(`newAssign Channel ID: ${newAssign.announcechannel}`);
							if (newAssign.announcechannel === '0') {
								//no channel is assigned complete action and report success!
								const editChannel = await GuildData.update({ announcechannel: newChannelID }, { where: { guildid: guildID } });

								if (editChannel > 0) {
									//updated spawn channel success!
									//Retrieve Channel object for further use
									const newChannel = await interaction.guild.channels.cache.find(c => c.id === newChannelID);
									return await interaction.followUp(`Channel ${newChannel.Name} is now the Announcement channel!`);
								} else {/*Something went wrong!*/console.log(`Data edit Falure!`); }

							} else {
								//Retrieve Channel object for further use
								const newChannel = await interaction.guild.channels.cache.find(c1 => c1.id === newChannelID);
								console.log(`New Channel: ${newChannel}`);
								const curChannel = await interaction.guild.channels.cache.find(c2 => c2.id === newAssign.announcechannel);
								console.log(`Current Channel: ${curChannel}`);
								console.log(`Current Announcement Channel: ${curChannel.Name} \nNew Announcement channel: ${newChannel.Name}`);

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
									.setTitle('Announcement Channel')
									.addFields(
										{
											name: `Channel: ${newChannel.name}`,
											value: `Would you like to make this the new Announcement channel?`,

										});

								const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [confirmEmbed] });

								const filter = (i) => i.user.id === interaction.user.id;

								const collector = embedMsg.createMessageComponentCollector({
									ComponentType: ComponentType.Button,
									filter,
									time: 120000,
								});

								collector.on('collect', async (collInteract) => {
									if (collInteract.customId === 'accept') {
										//User has confirmed channel change, procced
										const editChannel = await GuildData.update({ announcechannel: newChannelID }, { where: { guildid: guildID } });

										if (editChannel > 0) {
											//updated spawn channel success!
											//Retrieve Channel object for further use
											const newChannel = await interaction.guild.channels.cache.find(c => c.id === newChannelID);
											await interaction.followUp(`Channel ${newChannel.name} is now the Announcement channel!`);
											await collInteract.deferUpdate();

											acceptButton.setDisabled(true);
											cancelButton.setDisabled(true);

											embedMsg.edit({
												components: [interactiveButtons],
											});
											wait(5000).then(async () => {
												await collector.stop();
											});

										} else {/*Something went wrong!*/console.log(`Data edit Falure!`); }
									}

									if (collInteract.customId === 'cancel') {
										//User has canceled channel change, inform and delete
										collInteract.reply('Channel Change cancelled!');
										await collInteract.deferUpdate();

										acceptButton.setDisabled(true);
										cancelButton.setDisabled(true);

										embedMsg.edit({
											components: [interactiveButtons],
										});
										wait(5000).then(async () => {
											await collector.stop();
										});
									}
								});

								collector.on('end', () => {
									if (embedMsg) {
										embedMsg.delete();
									} else if (!embedMsg) {
										//do nothing
									}
								});
							}
						}
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
