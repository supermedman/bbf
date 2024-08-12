module.exports = (sequelize, DataTypes) => {
    return sequelize.define('CraftControllers', {
        user_id: DataTypes.STRING,
        milestone_id: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        max_rar: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        drop_rar: {
            type: DataTypes.INTEGER,
            defaultValue: 10
        },
        use_tooly: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        max_tooly: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        rar_tooly: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        imbue_one: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        imbue_two: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        caste_options: {
            type: DataTypes.STRING,
            defaultValue: "Class Type"
        },
        // Collected values from users crafting endeavors
        tot_crafted: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        value_crafted: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        times_imbued: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        // Crafting Personal Bests
        strongest_weapon: {
            type: DataTypes.STRING,
            defaultValue: "None"
        },
        strongest_armor: {
            type: DataTypes.STRING,
            defaultValue: "None"
        },
        strongest_offhand: {
            type: DataTypes.STRING,
            defaultValue: "None"
        },
        highest_rarity: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        // Big Money Makers
        highest_value: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        valuble_item: {
            type: DataTypes.STRING,
            defaultValue: "None"
        },
        // High Rarity Crafts
        rarity_tracker: {
            type: DataTypes.STRING,
            defaultValue: '{"13": 0, "14": 0, "15": 0, "16": 0, "17": 0, "18": 0, "19": 0, "20": 0}'
        },
        // Loot Pool Qualified Items Crafted
        benchmark_crafts: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    },
    {
        timestamps: false
    });
};