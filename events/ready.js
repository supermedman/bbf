const { Events } = require('discord.js');
const { Equipped, LootStore, LootShop, LootDrop, Pigmy, Pighouse, Questing, ActiveEnemy, UserData, GuildData } = require('../dbObjects.js');

//const { } = require('../dbObjects.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
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
