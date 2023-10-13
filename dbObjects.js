const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'username', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'database.sqlite',
});

const Equipped = require('./events/Models/Equipped')(sequelize, Sequelize.DataTypes);
const LootStore = require('./events/Models/LootStore')(sequelize, Sequelize.DataTypes);
const LootShop = require('./events/Models/LootShop')(sequelize, Sequelize.DataTypes);
const LootDrop = require('./events/Models/LootDrop')(sequelize, Sequelize.DataTypes);
const Pigmy = require('./events/Models/Pigmy')(sequelize, Sequelize.DataTypes);
const Pighouse = require('./events/Models/Pighouse')(sequelize, Sequelize.DataTypes);
const Questing = require('./events/Models/Questing')(sequelize, Sequelize.DataTypes);
const ActiveEnemy = require('./events/Models/ActiveEnemy')(sequelize, Sequelize.DataTypes);
const UserData = require('./events/Models/UserData')(sequelize, Sequelize.DataTypes);
const GuildData = require('./events/Models/GuildData')(sequelize, Sequelize.DataTypes);
const Loadout = require('./events/Models/Loadout')(sequelize, Sequelize.DataTypes);

module.exports = { Equipped, LootStore, LootShop, LootDrop, Pigmy, Pighouse, Questing, ActiveEnemy, UserData, GuildData, Loadout };
