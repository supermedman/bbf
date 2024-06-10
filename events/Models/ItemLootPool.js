module.exports = (sequelize, DataTypes) => {
    return sequelize.define('ItemLootPool', {
        // Used for Static Item Storage (SIS)
        // Will contain ALL pre-existing items
        // Will be updated and added to when new items are crafted that meet 
        // rarity bracket limits
        name: {
            type: DataTypes.STRING,
            defaultValue: 'Missing Name',
            allowNull: false
        }, // Items Name
        value: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            allowNull: false
        }, // Items Total Value
        item_code: {
            type: DataTypes.STRING,
            allowNull: false
        }, // Item String Code
        caste_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        }, // Item Caste ID
        creation_offset_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        }, // ID offset for static Loot Pool ids
        user_created: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    });
};