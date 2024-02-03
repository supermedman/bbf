const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        interaction.editReply(`Roundtrip latency: ${sent.createdTimestamp - interaction.createdTimestamp}ms`);
        //await interaction.followUp('Pong again!');
        //const message = await interaction.fetchReply();
        //console.log(message);
        //await interaction.deleteReply();
        //await interaction.followUp({ content: 'Pong again!', ephemeral: true });
        //ex. for making a message user specific ({content: 'secret pong!', ephemeral: true});

        /**
        const locales = {
            pl: 'Witaj Świecie!',
            de: 'Hallo Welt!',
        };
        interaction.reply(locales[interaction.locale] ?? 'Hello World (default is english)');
        **/
    },
    
};