const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('suggest')
		.setDescription('Leave a suggestion, or report a bug. Your message will arrive in bloodstone inn!')
		.addStringOption(option =>
			option.setName('input')
				.setDescription('Your text should be typed here!')
				.setRequired(true)),
	async execute(interaction) { 
		const suggestion = interaction.options.getString('input');
		await interaction.deferReply();
		if (suggestion.length > 1000) {
			//message is too long abort send
			interaction.followUp('That message is too long, please reduce your suggestion length!');
		} else {
			let guild = await interaction.client.guilds.fetch("892659101878849576"), // returns a Guild or undefined
				channel;			

			if (guild) {
				channel = await guild.channels.fetch("910249829186285608");
				if (channel) {
					interaction.followUp('Suggestion sent successfully!');
					channel.send(`${suggestion}`).then(async MSG => {
						await MSG.react('👍🏼');
						await MSG.react('👎🏼');
					});
				} else console.log('Channel not found!');
			} else console.log('Guild not found!');
        }		
	},
};
