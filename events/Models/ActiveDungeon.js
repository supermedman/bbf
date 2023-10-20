module.exports = (sequelize, DataTypes) => {
    return sequelize.define('ActiveDungeon', {
        dungeonid: DataTypes.INTEGER,
        dungeonspecid: {
            type: DataTypes.STRING,
            unique: true,
        },
        currentfloor: DataTypes.INTEGER,
        lastsave: DataTypes.INTEGER,
        currenthealth: DataTypes.INTEGER,
    });
};