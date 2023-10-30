module.exports = (sequelize, DataTypes) => {
    return sequelize.define('MaterialStore', {

        name: DataTypes.TEXT,
        value: DataTypes.INTEGER,

        mattype: DataTypes.STRING,
        mat_id: DataTypes.INTEGER,
        
        rarity: DataTypes.TEXT,
        rar_id: DataTypes.INTEGER,

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