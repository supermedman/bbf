module.exports = (sequelize, DataTypes) => {
    return sequelize.define('GuildEvents', {
        guildid: DataTypes.STRING,
        eventid: DataTypes.STRING,
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

    });
};