module.exports = (sequelize, DataTypes) => {
    return sequelize.define('GuildData', {

        guildid: DataTypes.STRING,
        announcechannel: {
            type: DataTypes.STRING,
            defaultValue: '0',
        },
        spawnchannel: {
            type: DataTypes.STRING,
            defaultValue: '0',
        },
        guildxp: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },	
        total_spawns: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
    },
        {
            timestamps: false
        });

};
