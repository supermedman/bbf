module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Equipped', {

        spec_id: {
            type: DataTypes.INTEGER,//foreign key from ActiveEnemy/LootShop pertaining to the userid
            primaryKey: true,
        },

        loot_id: {
            type: DataTypes.INTEGER,//id of item, obtained from lootList.json, retreived from ActiveEnemy/LootShop
        },

        //MORE FIELDS TO BE ADDED LATER
        name: DataTypes.TEXT,//name of the item
        value: DataTypes.INTEGER,//value of the item

        attack: DataTypes.INTEGER,//attack damage of the item
        type: DataTypes.TEXT,//type of attack damage

        rarity: DataTypes.TEXT,//rarity of the item in text format 
        rar_id: DataTypes.INTEGER,//rarity of the item in num format       

    },
        {
            timestamps: false,
        });

};