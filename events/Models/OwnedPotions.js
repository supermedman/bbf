module.exports = (sequelize, DataTypes) => {
    return sequelize.define('OwnedPotions', {

        name: DataTypes.TEXT,
        value: DataTypes.INTEGER,

        activecategory: DataTypes.STRING,

        duration: DataTypes.INTEGER,
        cooldown: DataTypes.INTEGER,

        potion_id: DataTypes.INTEGER,
        blueprintid: DataTypes.INTEGER,

        amount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

        spec_id: DataTypes.STRING,
    },
        {
            timestamps: false,
        });
};