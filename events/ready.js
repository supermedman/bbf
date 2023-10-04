const { Events } = require('discord.js');
const { Equipped, LootStore, LootShop, LootDrop, Pigmy, Pighouse, Questing, ActiveEnemy, UserData, GuildData } = require('../dbObjects.js');

//const { } = require('../dbObjects.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        const Guilds = client.guilds.cache.map(guild => guild.id);
        console.log(`Grabbing current server list! ${Guilds}`);
        Equipped.sync();
        LootShop.sync();
        LootStore.sync();
        LootDrop.sync();
        Pigmy.sync();
        Pighouse.sync();
        Questing.sync();
        UserData.sync();
        GuildData.sync();
        ActiveEnemy.sync({ force: true });
	},
};
