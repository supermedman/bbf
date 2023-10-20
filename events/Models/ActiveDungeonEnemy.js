module.exports = (sequelize, DataTypes) => {
    return sequelize.define('ActiveDungeonEnemy', {

        name: DataTypes.STRING,
        description: DataTypes.TEXT,
        level: DataTypes.INTEGER,
        mindmg: DataTypes.INTEGER,
        maxdmg: DataTypes.INTEGER,
        health: DataTypes.INTEGER,
        defence: DataTypes.INTEGER,
        weakto: DataTypes.STRING,
        dead: DataTypes.BOOLEAN,
        xpmin: DataTypes.INTEGER,
        xpmax: DataTypes.INTEGER,
        constkey: DataTypes.INTEGER,
        specid: {
            type: DataTypes.STRING,
            defaultValue: 0,
        },
    },
        {
            timestamps: false
        });

};