module.exports = (sequelize, DataTypes) => {
    return sequelize.define('InstalledBuild', {
        userid: DataTypes.STRING,
        plotid: DataTypes.STRING,
        slot: DataTypes.STRING
    },
    {
        timestamps: false,
    });
};