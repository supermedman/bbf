module.exports = (sequelize, DataTypes) => {
    return sequelize.define('OwnedTools', {
        spec_id: DataTypes.STRING,

        name: DataTypes.TEXT,

        activecategory: DataTypes.STRING,
        activesubcategory: DataTypes.STRING,
        passivecategory: DataTypes.TEXT,

        rarity: DataTypes.STRING,
        rar_id: DataTypes.INTEGER,

        amount: DataTypes.INTEGER,

        blueprintid: DataTypes.INTEGER,
        tool_id: DataTypes.INTEGER,
    },
        {
            timestamps: false,
        });
};