module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Loadout', {

        spec_id: {
            type: DataTypes.STRING,//foreign key from ActiveEnemy/LootShop pertaining to the userid
            primaryKey: true,
        },
        //These values are all stored as loot_id's for quick access and references 
        headslot: DataTypes.INTEGER,
        chestslot: DataTypes.INTEGER,
        legslot: DataTypes.INTEGER,
        mainhand: DataTypes.INTEGER,
        offhand: DataTypes.INTEGER,
    },
        {
            timestamps: false,
        });

};