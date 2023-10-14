module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Loadout', {

        spec_id: {
            type: DataTypes.STRING,//foreign key from ActiveEnemy/LootShop pertaining to the userid
            primaryKey: true,
        },
        //These values are all stored as loot_id's for quick access and references 
        headslot: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        chestslot: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        legslot: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        mainhand: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        offhand: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
    },
        {
            timestamps: false,
        });

};
