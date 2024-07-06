const Sequelize = require('sequelize');

const { sqlUser, sqlPass } = require('./config.json');

const sequelize = new Sequelize('database', sqlUser, sqlPass, {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'database.sqlite',
});

//const Equipped = require('./events/Models/Equipped')(sequelize, Sequelize.DataTypes);
const LootStore = require('./events/Models/LootStore')(sequelize, Sequelize.DataTypes);
const LootShop = require('./events/Models/LootShop')(sequelize, Sequelize.DataTypes);
//const LootDrop = require('./events/Models/LootDrop')(sequelize, Sequelize.DataTypes);
const Pigmy = require('./events/Models/Pigmy')(sequelize, Sequelize.DataTypes);
const Pighouse = require('./events/Models/Pighouse')(sequelize, Sequelize.DataTypes);
const Questing = require('./events/Models/Questing')(sequelize, Sequelize.DataTypes);
const ActiveEnemy = require('./events/Models/ActiveEnemy')(sequelize, Sequelize.DataTypes);
const UserData = require('./events/Models/UserData')(sequelize, Sequelize.DataTypes);
const GuildData = require('./events/Models/GuildData')(sequelize, Sequelize.DataTypes);
const Loadout = require('./events/Models/Loadout')(sequelize, Sequelize.DataTypes);
const Milestones = require('./events/Models/Milestones')(sequelize, Sequelize.DataTypes);
const ActiveDungeon = require('./events/Models/ActiveDungeon')(sequelize, Sequelize.DataTypes);
const ActiveDungeonEnemy = require('./events/Models/ActiveDungeonEnemy')(sequelize, Sequelize.DataTypes);
const ActiveDungeonBoss = require('./events/Models/ActiveDungeonBoss')(sequelize, Sequelize.DataTypes);
const MaterialStore = require('./events/Models/MaterialStore')(sequelize, Sequelize.DataTypes);
const OwnedBlueprints = require('./events/Models/OwnedBlueprints')(sequelize, Sequelize.DataTypes);
const OwnedPotions = require('./events/Models/OwnedPotions')(sequelize, Sequelize.DataTypes);
const UniqueCrafted = require('./events/Models/UniqueCrafted')(sequelize, Sequelize.DataTypes);
const ActiveStatus = require('./events/Models/ActiveStatus')(sequelize, Sequelize.DataTypes);
const OwnedTools = require('./events/Models/OwnedTools')(sequelize, Sequelize.DataTypes);
const UserHints = require('./events/Models/UserHints')(sequelize, Sequelize.DataTypes);

const Town = require('./events/Models/Town')(sequelize, Sequelize.DataTypes);
const BigTile = require('./events/Models/BigTile')(sequelize, Sequelize.DataTypes);
const MediumTile = require('./events/Models/MediumTile')(sequelize, Sequelize.DataTypes);
const TownMaterial = require('./events/Models/TownMaterial')(sequelize, Sequelize.DataTypes);
const TownPlots = require('./events/Models/TownPlots')(sequelize, Sequelize.DataTypes);
const PlayerBuilding = require('./events/Models/PlayerBuilding')(sequelize, Sequelize.DataTypes);
const CoreBuilding = require('./events/Models/CoreBuilding')(sequelize, Sequelize.DataTypes);

const EarlyAccess = require('./events/Models/EarlyAccess')(sequelize, Sequelize.DataTypes);

const LocationData = require('./events/Models/LocationData')(sequelize, Sequelize.DataTypes);

const UserTasks = require('./events/Models/UserTasks')(sequelize, Sequelize.DataTypes);
const NPCTable = require('./events/Models/NPCTable')(sequelize, Sequelize.DataTypes);

const ItemStrings = require('./events/Models/ItemStrings')(sequelize, Sequelize.DataTypes);
const ItemLootPool = require('./events/Models/ItemLootPool')(sequelize, Sequelize.DataTypes);

module.exports = {
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
	NPCTable,
	ItemStrings,
	ItemLootPool
};
