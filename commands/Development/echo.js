const { SlashCommandBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('echo')
        .setDescription('Replies with your input!')
        .addStringOption(option =>
            option.setName('input')
                .setDescription('The input to echo back')
                .setRequired(true))
        //Being ephemeral does not work when also specifing channel to send in!!!
        .addBooleanOption(option =>
            option.setName('ephemeral')
                .setDescription('Whether or not the echo should be ephemeral'))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to echo into')
                .addChannelTypes(ChannelType.GuildText)),
    async execute(interaction) {
        const input = interaction.options.getString('input');
        const ephemeral = interaction.options.getBoolean('ephemeral');
        const channel = interaction.options.getChannel('channel') ?? interaction.channel;
        //console.log(channel);

        if (ephemeral) {
            await interaction.reply({ content: input, ephemeral: true })
        } else {
            if (channel !== interaction.channel) {
                await interaction.deferReply({ ephemeral: true });
                await channel.send(input);
                await interaction.editReply({ content: 'message sent sucssefully!', ephemeral: true });
            } else {
                await interaction.reply(input);
            }
            
        }
        
    },
    
};