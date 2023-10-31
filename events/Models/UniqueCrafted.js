module.exports = (sequelize, DataTypes) => {
    return sequelize.define('UniqueCrafted', {

        name: DataTypes.TEXT,
        value: DataTypes.INTEGER,

        totalkills: DataTypes.INTEGER,
        killsthislevel: DataTypes.INTEGER,

        currentlevel: DataTypes.INTEGER,

        damage: DataTypes.INTEGER,
        type: DataTypes.STRING,

        slot: DataTypes.STRING,
        hands: DataTypes.STRING,

        rarity: DataTypes.STRING,
        rar_id: DataTypes.INTEGER,

        loot_id: DataTypes.INTEGER,
        spec_id: DataTypes.STRING,

        blueprintid: DataTypes.INTEGER,
    },
        {
            timestamps: false,
        });
};