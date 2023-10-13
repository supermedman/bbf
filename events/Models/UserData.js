module.exports = (sequelize, DataTypes) => {
    return sequelize.define('UserData', {
        userid: {
            type: DataTypes.STRING,
            unique: true,
        },
        username: DataTypes.TEXT,
        health: {
            type: DataTypes.INTEGER,
            defaultValue: 100,
            allowNull: false,
        },
        speed: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            allowNull: false,
        },
        strength: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            allowNull: false,
        },
        dexterity: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            allowNull: false,
        },
        intelligence: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            allowNull: false,
        },
        level: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            allowNull: false,
        },
        xp: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false,
        },
        points: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false,
        },
        coins: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false,
        },
        qt: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false,
        },
        totitem: DataTypes.INTEGER,
        shopresets: DataTypes.INTEGER,
        refreshcount: DataTypes.INTEGER,
        pclass: DataTypes.STRING,
        totalkills: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        killsthislife: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        highestkills: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        lastdeath: {
            type: DataTypes.STRING,
            defaultValue: 'None',
        },

    });
};
