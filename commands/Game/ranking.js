const { SlashCommandBuilder } = require('discord.js');
const {
	warnedForm,
	errorForm,
	successResult,
	failureResult,
	basicInfoForm,
	specialInfoForm
} = require('../../chalkPresets.js');
const { UserData } = require('../../dbObjects');
const { makeCapital, makePrettyNum } = require('../../uniHelperFunctions.js');

module.exports = {
	helptypes: ['Info', 'Stats'],
	data: new SlashCommandBuilder()
		.setName('ranking')
		.setDescription('Show the top players in black blade sorted by one of the following!')
		.addSubcommand(subcommand =>
			subcommand
				.setName('topten')
				.setDescription('View the top ten players!')
				.addStringOption(option =>
					option.setName('input')
						.setDescription('Which rank list would you like to view?')
						.setAutocomplete(true)
						.setRequired(true))),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);

		let choices = [];

		if (focusedOption.name === 'input') {
			const focusedValue = interaction.options.getFocused(false);

			choices = ["level", "coins", "total items", "qts", "total kills", "highest life kills", "total perk points"];

			//Mapping the complete list of options for discord to handle and present to the user
			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}
    },
	async execute(interaction) { 
		await interaction.deferReply();

		// New Ranking Options
		// ===================
		// STATIC_CRAFTS, HOURS_QUESTED, STRONGEST_(WEAPON/OFFHAND/ARMOR)


		//if (interaction.user.id !== '501177494137995264') return interaction.followUp('This command is under construction, please check back later!');

		if (interaction.options.getSubcommand() === 'topten') {
			const sortBy = interaction.options.getString('input');
			//console.log(specialInfoForm(`Ranking list requested: ${sortBy}`));

			let whereValue;
			let displayWhereValue;
			if (sortBy === "level") {
				whereValue = sortBy;
				displayWhereValue = 'Level';
			} else if (sortBy === "coins") {
				whereValue = sortBy;
				displayWhereValue = 'Coins';
			} else if (sortBy === "total items") {
				whereValue = 'totitem';
				displayWhereValue = 'Total Items';
			} else if (sortBy === "qts") {
				whereValue = 'qt';
				displayWhereValue = 'Quest Tokens';
			} else if (sortBy === "total kills") {
				whereValue = 'totalkills';
				displayWhereValue = 'Total Kills';
			} else if (sortBy === "highest life kills") {
				whereValue = 'highestkills';
				displayWhereValue = 'Most Kills in One Life';
			} else if (sortBy === "total perk points") {
				whereValue = 'SPECIALCASE: 1';
			} else {
				//INVALID
			}

			if (whereValue === 'SPECIALCASE: 1') return interaction.followUp('This option is not ready yet, please check back later!');

			const fullUserList = await UserData.findAll();

			let topTenList = [];

			const topRankingUser = fullUserList.reduce((highest, user) => {
				return (highest[`${whereValue}`] || 0) > user[`${whereValue}`] ? highest : user;
			}, {});
			//console.log(successResult(`Highest ${whereValue} ranking user: ${topRankingUser.username}`));

			let equalRankingList = fullUserList.filter(user => user[`${whereValue}`] === topRankingUser[`${whereValue}`]);
			
			if (equalRankingList.length > 1) {
				if (whereValue === 'level') {
					equalRankingList.sort((highest, user) => {
						if (highest['xp'] > user['xp']) return -1;
						if (highest['xp'] < user['xp']) return 1;
						return 0;
					});
					topTenList = topTenList.concat(equalRankingList);
				} else {

                }
			} else topTenList.push(topRankingUser);

			let lowerRankingList = fullUserList.filter(user => user[`${whereValue}`] < topRankingUser[`${whereValue}`]);

			lowerRankingList.sort((highest, user) => {
				if (highest[`${whereValue}`] > user[`${whereValue}`]) return -1;
				if (highest[`${whereValue}`] < user[`${whereValue}`]) return 1;
				return 0;
			});

			//let userPos = 0 + (topTenList.length - 1);
			// for (const unrankedUser of lowerRankingList) {
			// 	//console.log(specialInfoForm(`${(userPos + 1)} place ${whereValue} unranked user: ${unrankedUser.username} value ${unrankedUser[`${whereValue}`]}`));
			// 	userPos++;
			// 	if (userPos === 9) break;
			// }

			const copyPasteArr = lowerRankingList.slice(0, 9);

			topTenList = topTenList.concat(copyPasteArr);

			let embedFieldObj;
			let embedFieldName = ``;
			let embedFieldValue = ``;

			let finalFields = [];
			let userPos = 0;
			for (const rankedUser of topTenList) {
				//console.log(specialInfoForm(`${(userPos + 1)} place ${whereValue} ranking user: ${rankedUser.username} value ${rankedUser[`${whereValue}`]}`));

				embedFieldName = `**RANK ${((userPos + 1))}**`;

				/**
				 * This function pretties up large numbers in the format `1,000,000`
				 * @param {number | string} v The value used to rank the user
				 * @returns {string}
				 */
				const applyPrettyFormat = v => {
					if (isNaN(v)) return v;
					const prettyV = makePrettyNum(v);
					if (whereValue === 'coins') return prettyV + 'c';
					return prettyV;
				};

				const rankedByValue = applyPrettyFormat(rankedUser[`${whereValue}`]);

				embedFieldValue = `Name: **${makeCapital(rankedUser.username)}**\n${makeCapital(whereValue)}: **${rankedByValue}**`;

				embedFieldObj = { name: embedFieldName.toString(), value: embedFieldValue.toString(), };
				finalFields.push(embedFieldObj);
				userPos++;
            }

			const embed = {
				title: `~Top 10, RANKED BY ${displayWhereValue}~`,
				color: 0o0,
				fields: finalFields,
			};

			await interaction.followUp({ embeds: [embed] }).then(async embedMsg => setTimeout(() => {
				embedMsg.delete();
			}, 180000));

        }

	},
};
