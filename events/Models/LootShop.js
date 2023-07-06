module.exports = (sequelize, DataTypes) => {
    return sequelize.define('LootShop', {

        //rowid: {
        //    type: DataTypes.INTEGER,
        //    primaryKey: true,
        //},
        ////primary key 

        shop_slot: DataTypes.INTEGER,//position in shop, can be 1, 2, 3, 4

        loot_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        //spec_id = userid - loot_id;
        spec_id: {
            type: DataTypes.INTEGER,//spec_id set to the above calculation
            allowNull: false,
        },

        //pos: DataTypes.INTEGER,

        name: DataTypes.TEXT,//name of the item
        value: DataTypes.INTEGER,//value of the item

        attack: DataTypes.INTEGER,
        type: DataTypes.TEXT,


        rarity: DataTypes.TEXT,//rarity of the item in text format 
        rar_id: DataTypes.INTEGER,

        //MORE FIELDS TO BE ADDED LATER

    },
        {
            timestamps: false,
        });

};