const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 60,
	data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Easy access to invite Black Blade'),
	async execute(interaction) { 

        const inviteEmbed = new EmbedBuilder()
        .setTitle('== Black Blade Links ==')
        .setColor('DarkGold')
        .setDescription('The buttons below are direct links to:\n\nBlack Blades Support Server (Bloodstone inn) `Support Link`\n\nBlack Blade App Invite `Black Blade Invite`');

        const bloodstoneINV = new ButtonBuilder()
        .setLabel('Support Link')
        .setURL('https://discord.gg/XHdyQf7hd7')
        .setStyle(ButtonStyle.Link);

        const blackbladeINV = new ButtonBuilder()
        .setLabel('Black Blade Invite')
        .setURL('https://discord.com/oauth2/authorize?client_id=1037837929952858154&permissions=2147871824&scope=bot%20applications.commands')
        .setStyle(ButtonStyle.Link);

        const invButtRow = new ActionRowBuilder().addComponents(bloodstoneINV, blackbladeINV);

        const replyObj = {embeds: [inviteEmbed], components: [invButtRow]};

        return await interaction.reply(replyObj);
	},
};