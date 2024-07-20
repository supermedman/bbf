module.exports = (sequelize, DataTypes) => {
    return sequelize.define('TownPlots', {
        townid: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        plotid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV1
        },
        ownerid: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: '0',
        },
        private: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        empty: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    },
    {
        timestamps: false,
    });
};