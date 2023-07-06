const { SlashCommandBuilder } = require('discord.js');
const { UserData } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('roll')
		.setDescription('Care to take a gamble?')
		.addStringOption(option =>
			option.setName('game')
				.setDescription('Game to play')
				.setAutocomplete(true)
				.setRequired(true))
		.addIntegerOption(option =>
			option.setName('amount')
				.setDescription('Amount to bet with')
				.setRequired(true)),
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();
		const choices = ['dice'];
		const filtered = choices.filter(choice => choice.startsWith(focusedValue));
		await interaction.respond(
			filtered.map(choice => ({ name: choice, value: choice })),
		);
    },
	async execute(interaction) {
		await interaction.deferReply();
		const gameload = interaction.options.getString('game');
		const bet = interaction.options.getInteger('amount');

		if (gameload === 'dice') {
			const uData = await grabU();
			if (uData.coins < bet) {
				//out of coins, suggest getting more and how
				return interaction.followUp("Sorry pal I can't make somethin from nothin :/ \n(To get more coins use the command ``startcombat``)");
			} else {
				roll(bet);
			}
		} else {
			return interaction.followUp("That game was not found, please select from the options provided when using this command!");
        }

		//rng dice rolling function
		function roll(bet) {

			var die1 = 0;
			var die2 = 0;
			var totalr = 0;

			die1 = Math.floor(Math.random() * (6) + 1);
			die2 = Math.floor(Math.random() * (6) + 1);

			console.log('Number rolled', die1);
			console.log('Number rolled', die2);

			totalr = (die1 + die2);

			if ((totalr & 1) == 0) {
				//NUMBER IS EVEN
				console.log('Rolled: EVEN');
				//WINNER
				var wins = bet * 2;
				payout(wins);
				interaction.followUp(`YOU ROLLED A ${totalr} AND WON: ${wins}c`);
			}
			else {
				//NUMBER IS ODD
				console.log('Rolled: ODD');
				//LOSER
				var losses = bet;
				takeout(losses);
				interaction.followUp(`YOU ROLLED A ${totalr} AND LOST: ${losses}c`);
			}

		}

		//grabbing user data for external use
		async function grabU() {		
			uData = await UserData.findOne({ where: { userid: interaction.user.id } });
			//console.log(uData);
			return uData;
		}

		//add winnings to correct users balance
		async function payout(wins) {
			//add and update users coins here
			uData = await grabU();
			var total = wins + uData.coins;
			console.log('Coins Won: ', wins);
			await UserData.update({ coins: total }, { where: { username: uData.username } });
		}

		//remove losses from correct users balance
		async function takeout(losses) {
			//remove and update users coins here
			uData = await grabU();
			var total = uData.coins - losses;
			console.log('Coins Lost: ', losses);
			await UserData.update({ coins: total }, { where: { username: uData.username } });
		}
	},

};