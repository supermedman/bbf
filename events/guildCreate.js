const { Events } = require('discord.js');
const { GuildData } = require('../dbObjects.js');

module.exports = {
	name: Events.GuildCreate,
	async execute(guild) {
		const guildID = guild.id;
		newGuild = await GuildData.findOne({ where: { guildid: guildID } });//Check if guild is already stored!
		if (newGuild) {
			//Guild is not new, ignore database!		
			console.log(`Old Guild!`);
		} else {
			//Guild is new, add to db
			await GuildData.create({
				guildid: guildID,
				spawnchannel: 0,
			});
			console.log("BB joined new server! Adding to DB with ID: ", guildID);
        }		
	},
};
