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
    EarlyAccess,
    LocationData,
    UserTasks,
    NPCTable
} = require('../dbObjects.js');

async function loadEarlyAccess(client){
    const {betaTester, newEnemy} = client;

    const allEA = await EarlyAccess.findAll();
    for (const user of allEA){
        if (!betaTester.has(user.userid)){
            betaTester.set(user.userid, true);
        }
    }

    const newSpawnFilter = allEA.filter(user => user.spawn_new === true);
    for (const user of newSpawnFilter){
        if (!newEnemy.has(user.userid)){
            newEnemy.set(user.userid, true);
        }
    }

    //console.log(...newEnemy);
	//console.log(...betaTester);
    console.log("Finished Applying Access Permissions!");
}

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

        LocationData.sync();

        UserTasks.sync();
        NPCTable.sync();

        try {
            loadEarlyAccess(client);
        } catch (e){
            console.error(e);
        }
	},
};
