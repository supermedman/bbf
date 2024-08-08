const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ChannelType } = require('discord.js');
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
				.addChannelOption(option => 
					option
						.setName('thechannel')
						.setDescription('The channel to use for assignment.')
						.setRequired(true)
						.addChannelTypes(ChannelType.GuildText)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove')
				.setDescription('Removes an assigned channel')
				.addStringOption(option =>
					option.setName('channeltype')
						.setDescription('Which channel type would you like to remove?')
						.setRequired(true)
						.setChoices(
							{ name: 'Spawn', value: 'spawn' },
							{ name: 'Announce', value: 'announce' },
						))),

	async execute(interaction) { 
		const theGuild = await GuildData.findOne({where: {guildid: interaction.guild.id}});
        if (!theGuild) return interaction.reply("This guild has no database entry! Please visit the offical support server for help! <https://discord.gg/XHdyQf7hd7>"); 

		const theChannelType = interaction.options.getString('channeltype');

		let theChannel = interaction.options.getChannel('thechannel') ?? 'None';
		if (theChannel !== 'None') {
			theChannel = (typeof theChannel === 'string') ? await interaction.guild.channels.fetch(theChannel) : await interaction.guild.channels.fetch(theChannel.id);
		}

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

		const filter = (i) => i.user.id === interaction.user.id;

		switch(interaction.options.getSubcommand()){
			case "assign":
				if (typeof theChannel !== 'object' || theChannel.type !== ChannelType.GuildText) return interaction.reply('This is not a vaild channel');
				if (theGuild[theChannelType] === '0'){
					// No current channel assigned
					const tableUpdate = await theGuild.update({[theChannelType]: theChannel.id});
					if (!tableUpdate) return interaction.reply("Something went wrong while updating the database!!");
					await theGuild.save();
					return await interaction.reply(`${theChannel.name} is now the ${theChannelType} channel!`);
				} else {
					// Channel already assigned, overwrite needed
					if (theGuild[theChannelType] === theChannel.id) return interaction.reply(`${theChannel.name} is already the ${theChannelType} channel!`);
					
					// Handle confirmation proccess
					const interactiveButtons = new ActionRowBuilder().addComponents(acceptButton, cancelButton);
					
					const confirmEmbed = new EmbedBuilder()
					.setTitle(`${theChannelType} Channel`)
					.setColor('DarkOrange')
					.addFields([
						{
							name: `${theChannel.name}`,
							value: `Would you like to make this the new ${theChannelType} channel?`,
						}
					]);

					const embedMsg = await interaction.reply({ components: [interactiveButtons], embeds: [confirmEmbed] });
				
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
							// Update Channel here!
							const tableUpdate = await theGuild.update({[theChannelType]: theChannel.id});
							if (!tableUpdate) return interaction.followUp("Something went wrong while updating the database!!");
							await theGuild.save();
							
							collector.stop();

							return await interaction.followUp(`${theChannel.name} is now the ${theChannelType} channel!`);
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
			break;
			case "remove":
				if (theGuild[theChannelType] === '0') return interaction.reply(`The ${theChannelType} channel has not yet been assigned!`);
				
				const confirmEmbed = new EmbedBuilder()
				.setTitle(`== Unassign ${theChannelType} Channel ==`)
				.setColor('DarkRed')
				.addFields([
					{
						name: `${theChannel.name}`,
						value: `Will be unassigned as the ${theChannelType} channel! Continue?`,
					}
				]);

				const interactiveButtons = new ActionRowBuilder().addComponents(acceptButton, cancelButton);

				const embedMsg = await interaction.reply({ components: [interactiveButtons], embeds: [confirmEmbed] });
			
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
						// Update Channel here!
						const tableUpdate = await theGuild.update({[theChannelType]: '0'});
						if (!tableUpdate) return interaction.followUp("Something went wrong while updating the database!!");
						await theGuild.save();
						
						collector.stop();

						return await interaction.followUp(`${theChannel.name} is no longer the ${theChannelType} channel!`);
					}
				});

				collector.on('end', () => {
					embedMsg.delete().catch(error => {
						if (error.code !== 10008) {
							console.error('Failed to delete the message:', error);
						}
					});
				});
			break;
		}

		return;
	},
};
