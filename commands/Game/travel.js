const { SlashCommandBuilder } = require('discord.js');

const {UserData, LocationData} = require('../../dbObjects.js');

const {checkUnlockedBiome, checkSelectedBiome} = require('./exported/locationFilters.js');

//const biomeList = ['Wilds', 'Forest', 'Grassland', 'Swamp', 'Plains', 'Desert', 'Mountain'];

module.exports = {
	helptypes: ['Info', 'Quest'],
	data: new SlashCommandBuilder()
		.setName('travel')
        .setDescription('Travel to somewhere!')
		.addStringOption(option =>
			option.setName('to-hunting')
				.setDescription('Which Hunting Grounds Would you like to enter?')
				.setRequired(true)
				.setAutocomplete(true)),
	async autocomplete(interaction){
		const focusedOption = interaction.options.getFocused(true);

		let choices = [];

		if (focusedOption.name === 'to-hunting'){
			const focusedValue = interaction.options.getFocused(false);

			const user = await UserData.findOne({where: {userid: interaction.user.id}});
			if (user){
				const userLocations = await LocationData.findOne({where: {userid: user.userid}});
				if (userLocations){
					choices = checkUnlockedBiome(userLocations);
				} else choices = ['None'];
			} else choices = ['None'];

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}

	},
	async execute(interaction) { 
        // const {betaTester} = interaction.client;

		// if (!betaTester.has(interaction.user.id)) return await interaction.reply('This command is under construction!! It is currently only available to early access testers!');

		const user = await UserData.findOne({where: {userid: interaction.user.id}});
		if (!user) return await interaction.reply("No user data found, please create a profile using ``/start``!");

		const biomeName = interaction.options.getString('to-hunting');
		const biomeIndex = checkSelectedBiome(biomeName);
		if (biomeIndex === -1) return await interaction.reply("That is not a vaild biome!");
		if (user.current_location === biomeName) return await interaction.reply(`You are already in the ${biomeName}`);

		const tableUpdate = await user.update({current_location: biomeName});
		if (tableUpdate) {
			await user.save();
			return interaction.reply(`You have entered the ${biomeName}!`);
		}
	},
};