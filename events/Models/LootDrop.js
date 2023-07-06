module.exports = (sequelize, DataTypes) => {
    return sequelize.define('LootDrop', {

        //primary key 
        spec_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        }, 
        
        loot_id: DataTypes.INTEGER,//id of item, obtained from lootList.json, currently attatched to ActiveEnemy


        name: DataTypes.TEXT,//name of the item
        value: DataTypes.INTEGER,//value of the item

        attack: DataTypes.INTEGER,
        type: DataTypes.TEXT,

        rarity: DataTypes.TEXT,//rarity of the item in text format 
        rar_id: DataTypes.INTEGER,
        
    },
        {
            timestamps: false,
        });

};