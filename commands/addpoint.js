const { SlashCommandBuilder } = require('discord.js');
const { errorForm } = require('../chalkPresets.js');
const { UserData } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addpoint')
        .setDescription('Add skill points!')
		.addStringOption(option =>
			option.setName('skill')
				.setDescription('Skill to increase')
				.setAutocomplete(true)
				.setRequired(true))
		.addIntegerOption(option =>
			option.setName('amount')
				.setDescription('Amount to increase by')
				.setRequired(true)),
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();
		const choices = ['speed', 'strength', 'dexterity', 'intelligence'];
		const filtered = choices.filter(choice => choice.startsWith(focusedValue));
		await interaction.respond(
			filtered.map(choice => ({ name: choice, value: choice })),
		);
	},
	async execute(interaction) {
		await interaction.deferReply().then(async () => {
			const skillname = interaction.options.getString('skill');
			const pointcount = interaction.options.getInteger('amount');

			uData = await UserData.findOne({ where: { userid: interaction.user.id } });
			if (uData) {
				if (uData.points > 0) {
					if (uData.points >= pointcount) {
						//SPEED========================
						if (skillname === 'speed') {
							const spd = uData.speed += pointcount;
							const rem = uData.points = uData.points - pointcount;

							const incStat = await UserData.update({ speed: spd }, { where: { username: uData.username } });
							const removePoint = await UserData.update({ points: rem }, { where: { username: uData.username } });
							console.log(removePoint);

							if (incStat > 0) {
								return interaction.followUp(`Speed stat has been increased for ${uData.username} succsesfully!`);
							}
							return interaction.followUp(`Could not find data for ${uData.username}.`);
						}
						//STRENGTH========================
						if (skillname === 'strength') {
							const str = uData.strength += pointcount;
							const rem = uData.points = uData.points - pointcount;
							var tothp = 100 + (str * 10);
							if (uData.health != (tothp - 10)) {
								//player is currently wounded add 10 to current health
								tothp = (uData.health + 10);
							}

							const incStat = await UserData.update({ strength: str }, { where: { username: uData.username } });
							const incHealth = await UserData.update({ health: tothp }, { where: { username: uData.username } });
							const removePoint = await UserData.update({ points: rem }, { where: { username: uData.username } });
							console.log(removePoint);

							if (incStat > 0) {
								if (incHealth > 0) {
									return interaction.followUp(`Strength stat has been increased for ${uData.username} succsesfully!`);
								}
							}
							return interaction.followUp(`Could not find data for ${uData.username}.`);
						}
						//dexterity========================
						if (skillname === 'dexterity') {
							const dex = uData.dexterity += pointcount;
							const rem = uData.points = uData.points - pointcount;

							const incStat = await UserData.update({ dexterity: dex }, { where: { username: uData.username } });
							const removePoint = await UserData.update({ points: rem }, { where: { username: uData.username } });
							console.log(removePoint);

							if (incStat > 0) {
								return interaction.followUp(`Dexterity stat has been increased for ${uData.username} succsesfully!`);
							}
							return interaction.followUp(`Could not find data for ${uData.username}.`);
						}
						//intelligence========================
						if (skillname === 'intelligence') {
							const int = uData.intelligence += pointcount;
							const rem = uData.points = uData.points - pointcount;

							const incStat = await UserData.update({ intelligence: int }, { where: { username: uData.username } });
							const removePoint = await UserData.update({ points: rem }, { where: { username: uData.username } });
							console.log(removePoint);

							if (incStat > 0) {
								return interaction.followUp(`Intelligence stat has been increased for ${uData.username} succsesfully!`);
							}
							return interaction.followUp(`Could not find data for ${uData.username}.`);
						}
						else {
							return interaction.channel.send(`You have not selected a valid skill to increase, ${interaction.username}!`);
						}
					}
					return interaction.followUp('You do not have enough points, to check your current point total please use ``/stats user``');
				} else if (uData.points <= 0) {
					return interaction.followUp("You have no perk points.. kill enemies for xp to level up, each time you level up you will gain a point!");
				}
			}
		}).catch(error => {
			console.log(errorForm(error));
		});
	},

};
