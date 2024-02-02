module.exports = (sequelize, DataTypes) => {
    return sequelize.define('EarlyAccess', {
        userid: DataTypes.STRING,
        spawn_new: DataTypes.BOOLEAN,
    },
    {
        timestamps: false,
    });
};