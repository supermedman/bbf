const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');

const Canvas = require('@napi-rs/canvas');

//const HBimg = require('../events/Models/json_prefabs/image_extras/healthbar.png');
const enemyList = require('../../events/Models/json_prefabs/enemyList.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('devcreate')
        		.setDescription('Dev Based Creative Enviroment!')
				.addSubcommand(subcommand =>
					subcommand
						.setName('enemy-style')
						.setDescription('Canvas Testing for enemy based display')
						.addStringOption(option =>
							option.setName('enemy')
								.setDescription('Which enemy would you like displayed?')
								.setRequired(true)
								.setAutocomplete(true))),
	async autocomplete(interaction) { 
		const focusedOption = interaction.options.getFocused(true);

		let choices = [];

		const makeCapital = (str) => { return str.charAt(0).toUpperCase() + str.slice(1) };

		if (focusedOption.name === 'enemy') {
			const focusedValue = interaction.options.getFocused(false);
			const findName = makeCapital(interaction.options.getString('enemy'));

			choices = enemyList.filter(enemy => enemy.Name.startsWith(findName));
			console.log(...choices);

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}
	},
	async execute(interaction) { 
		if (interaction.user.id !== '501177494137995264') return interaction.reply({content: 'This command is not for you!', ephemeral: true});
		
	},
};