const { SlashCommandBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('echo')
    .setDescription('Replies with your input!')
    .addSubcommand(subcommand =>
        subcommand
        .setName('todo')
        .setDescription('Static echo channel location, adds input to running todo list.')
        .addStringOption(option =>
            option
            .setName('input')
            .setDescription('The input to echo back')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
        subcommand
        .setName('testing')
        .setDescription('Echo input given into channel given, otherwise outputs locally.')
        .addStringOption(option =>
            option
            .setName('input')
            .setDescription('The input to echo back')
            .setRequired(true)
        )
        //Being ephemeral does not work when also specifing channel to send in!!!
        .addBooleanOption(option =>
            option
            .setName('ephemeral')
            .setDescription('Whether or not the echo should be ephemeral')
        )
        .addChannelOption(option =>
            option
            .setName('channel')
            .setDescription('The channel to echo into')
            .addChannelTypes(ChannelType.GuildText)
        )
    ),
    async execute(interaction) {
        if (interaction.user.id !== '501177494137995264') return await interaction.reply({content: 'This command is for developers, you do not have access!', ephemeral: true});

        const subCom = interaction.options.getSubcommand();
        const input = interaction.options.getString('input');

        if (interaction.options.getBoolean('ephemeral')) return await interaction.reply({ content: input, ephemeral: true});

        let echoChannel, finalOutputDisplay = '';
        switch(subCom){
            case "todo":
                echoChannel = await interaction.client.guilds.fetch("892659101878849576").then(async g => {
                    return await g.channels.fetch("1193639127766282240");
                }).catch(e => console.error('Failed to retrieve Bloodstone inn: ', e));
                finalOutputDisplay = `TODO: \n\n\`${input}\``;
            break;
            case "testing":
                echoChannel = interaction.options.getChannel('channel') ?? interaction.channel;
                finalOutputDisplay = input;
            break;
        }

        if (echoChannel.id !== interaction.channel.id){
            await interaction.deferReply({ ephemeral: true });
            await echoChannel.send(finalOutputDisplay);
            await interaction.editReply({ content: 'Message Echoed Successfully!'});
        } else await interaction.reply(finalOutputDisplay);

        
        // const ephemeral = interaction.options.getBoolean('ephemeral');
        // const channel = interaction.options.getChannel('channel') ?? interaction.channel;
        // //console.log(channel);

        // if (ephemeral) {
        //     await interaction.reply({ content: input, ephemeral: true })
        // } else {
        //     if (channel !== interaction.channel) {
        //         await interaction.deferReply({ ephemeral: true });
        //         await channel.send(input);
        //         await interaction.editReply({ content: 'message sent sucssefully!', ephemeral: true });
        //     } else {
        //         await interaction.reply(input);
        //     }
            
        // }
        
    },
    
};