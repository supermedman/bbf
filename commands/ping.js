const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction) {
        await interaction.reply('Pong!');
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