module.exports = (sequelize, DataTypes) => {
    return sequelize.define('LootStore', {

        spec_id: DataTypes.STRING,//foreign key from ActiveEnemy/LootShop pertaining to the userid

        loot_id: DataTypes.INTEGER,
        
        //MORE FIELDS TO BE ADDED LATER
        name: DataTypes.TEXT,//name of the item
        value: DataTypes.INTEGER,//value of the item

        attack: DataTypes.INTEGER,
        defence: DataTypes.INTEGER,
        type: DataTypes.TEXT,

        slot: DataTypes.TEXT,
        hands: DataTypes.TEXT,

        rarity: DataTypes.TEXT,//rarity of the item in text format 
        rar_id: DataTypes.INTEGER,

        //amount of loot items user currently has stored
        amount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

    },
        {
            timestamps: false,
        });

};
