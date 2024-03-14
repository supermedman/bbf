module.exports = (sequelize, DataTypes) => {
    return sequelize.define('LocationData', {
        userid: {
            type: DataTypes.STRING,
            unique: true,
        },
        unlocked_locations:{
            type: DataTypes.STRING,
            defaultValue: '0',
        },

    }, {timestamps: false});
};