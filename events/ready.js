const { Events } = require('discord.js');

const {
    //Equipped,
    LootStore,
    LootShop,
    //LootDrop,
    Pigmy,
    Pighouse,
    Questing,
    //ActiveEnemy,
    UserData,
    GuildData,
    Loadout,
    Milestones,
    ActiveDungeon,
    //ActiveDungeonEnemy,
    //ActiveDungeonBoss,
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
    InstalledBuild,
    EarlyAccess,
    LocationData,
    UserTasks,
    NPCTable,
    ItemStrings,
	ItemLootPool,
    BasicShoppe,
    GameEvents,
    GuildEvents,
    CraftControllers,
    LocalMarkets,
    GlobalMarkets,
    UserMaterials,
    CombatThreads
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

const { checkingRarID, checkingRar } = require("../commands/Development/Export/itemStringCore");


/**
 * This function creates and fills a new "Map()"/Discord.js Collection()  with the full droppable item list as stored
 * in the ItemLootPool DB table.
 * @param {object} client Application Proccess
 * @returns {Promise<Map<{itemID: (number|string), rarID: number}>>}
 */
async function preloadItemList(client){
    const {gearDrops} = client;

    const fullItemPool = await ItemLootPool.findAll();

    for (const item of fullItemPool){
        const rarMatch = checkingRarID(checkingRar(item.item_code));
        if (!gearDrops.get(item.creation_offset_id)) gearDrops.set(item.creation_offset_id, rarMatch);
    }

    return gearDrops;
}

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        const Guilds = client.guilds.cache.map(guild => guild.id);
        console.log(`Grabbing current server list! BB is active in ${Guilds.length} servers!!`);
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
        // ActiveDungeonEnemy.sync({ force: true });
        // ActiveDungeonBoss.sync({ force: true });
        
        // ActiveEnemy.sync();

        Town.sync();
	    BigTile.sync();
	    MediumTile.sync();
	    TownMaterial.sync();
	    TownPlots.sync();
	    PlayerBuilding.sync();
	    CoreBuilding.sync();
        InstalledBuild.sync();

        EarlyAccess.sync();

        LocationData.sync();

        UserTasks.sync();
        NPCTable.sync();

        ItemStrings.sync();
        ItemLootPool.sync();

        BasicShoppe.sync();

        GameEvents.sync();
        GuildEvents.sync();

        CraftControllers.sync();

        LocalMarkets.sync();
        GlobalMarkets.sync();
        UserMaterials.sync();

        CombatThreads.sync();

        try {
            loadEarlyAccess(client);
            preloadItemList(client);
        } catch (e){
            console.error(e);
        }
	},
};
