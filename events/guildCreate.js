const { Events } = require('discord.js');
const { GuildData } = require('../dbObjects.js');

const { checkBigTiles } = require('../commands/exported/createTile.js');

module.exports = {
	name: Events.GuildCreate,
	async execute(guild) {
		const guildID = guild.id;
		let newGuild = await GuildData.findOne({ where: { guildid: guildID } }); //Check if guild is already stored!
		if (newGuild) return;

		//Guild is new, add to db
		newGuild = await GuildData.create({
			guildid: guildID,
		});
		console.log("\n\n\nBB joined new server! Adding to DB with ID: ", guildID);

		const result = await checkBigTiles(newGuild);
		if (result) return console.log('Medium Tile Created, Big Tile Updated!!!\n\n\n');
	},
};
