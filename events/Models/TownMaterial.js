module.exports = (sequelize, DataTypes) => {
    return sequelize.define('TownMaterial', {
        townid: DataTypes.STRING,
        name: DataTypes.STRING,
        value: DataTypes.INTEGER,
        mattype: DataTypes.STRING,
        mat_id: DataTypes.INTEGER,
        rarity: DataTypes.STRING,
        rar_id: DataTypes.INTEGER,
        amount: DataTypes.INTEGER
    },
    {
        timestamps: false,
    });
};