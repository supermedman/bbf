module.exports = (sequelize, DataTypes) => {
    return sequelize.define('ActiveDungeonBoss', {

        name: DataTypes.STRING,        
        level: DataTypes.INTEGER,
        mindmg: DataTypes.INTEGER,
        maxdmg: DataTypes.INTEGER,
        health: DataTypes.INTEGER,
        defence: DataTypes.INTEGER,
        weakto: DataTypes.STRING,
        constkey: DataTypes.INTEGER,
        specid: {
            type: DataTypes.STRING,
            defaultValue: 0,
            unique: true,
        },
    },
        {
            timestamps: false
        });

};
