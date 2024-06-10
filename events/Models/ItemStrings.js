module.exports = (sequelize, DataTypes) => {
    return sequelize.define('ItemStrings', {
        user_id: {
            type: DataTypes.STRING,
            allowNull: false
        }, // Main Reference Handle Pointing to USER
        name: {
            type: DataTypes.STRING,
            defaultValue: 'Missing Name',
            allowNull: false
        }, // Items Name, failsafe default: "Missing Name"
        value: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            allowNull: false
        }, // Items Total Value
        amount: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            allowNull: false
        }, // Amount of Items
        item_code: {
            type: DataTypes.STRING,
            allowNull: false
        }, // Item String Code
        caste_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        }, // Item Caste ID
        creation_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        }, // ID representing method of obtainment. EX. Crafted: 2 || Loot_Drop: ItemLootPool.creation_offset_id
        unique_gen_id:{
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV1
        },
        /**
         * Generated using a method if no value is provided during entry creation.
         * Default Values:
         *      IF NOT CRAFTED: `${caste_id + creation_id}`
         *      IF CRAFTED: `${this.unique_gen_id}`
         */
        item_id: {
            type: DataTypes.STRING,
            // This value is generated by condition
            defaultValue: (this.creation_id !== 2) ? `${this.caste_id + this.creation_id}`: `${this.unique_gen_id}`, 
            allowNull: false
        }
    },
    {
        timestamps: false
    });
};