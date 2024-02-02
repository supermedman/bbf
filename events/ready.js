const { Events } = require('discord.js');
const {
    //Equipped,
    LootStore,
    LootShop,
    //LootDrop,
    Pigmy,
    Pighouse,
    Questing,
    ActiveEnemy,
    UserData,
    GuildData,
    Loadout,
    Milestones,
    ActiveDungeon,
    ActiveDungeonEnemy,
    ActiveDungeonBoss,
    MaterialStore,
    OwnedBlueprints,
    OwnedPotions,
    UniqueCrafted,
    ActiveStatus,
    OwnedTools,
    UserHints,
	Town,
	BigTile,
	MediumTile,
	TownMaterial,
	TownPlots,
	PlayerBuilding,
	CoreBuilding,
    EarlyAccess
} = require('../dbObjects.js');

//const { } = require('../dbObjects.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        const Guilds = client.guilds.cache.map(guild => guild.id);
        console.log(`Grabbing current server list! ${Guilds}`);
        GuildData.sync();

        Loadout.sync();
        //Equipped.sync();

        LootShop.sync();
        
        //LootDrop.sync();

        Pigmy.sync();
        Pighouse.sync();

        Milestones.sync();
        UserHints.sync();
        Questing.sync();

        UserData.sync();
        ActiveStatus.sync();
        
        LootStore.sync();
        UniqueCrafted.sync();

        OwnedBlueprints.sync();
        OwnedPotions.sync();
        OwnedTools.sync();
        MaterialStore.sync();

        ActiveDungeon.sync();
        ActiveDungeonEnemy.sync({ force: true });
        ActiveDungeonBoss.sync({ force: true });
        
        ActiveEnemy.sync();

        Town.sync();
	    BigTile.sync();
	    MediumTile.sync();
	    TownMaterial.sync();
	    TownPlots.sync();
	    PlayerBuilding.sync();
	    CoreBuilding.sync();

        EarlyAccess.sync();
	},
};
