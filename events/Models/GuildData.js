module.exports = (sequelize, DataTypes) => {
    return sequelize.define('GuildData', {

        guildid: DataTypes.STRING,
        announcechannel: DataTypes.STRING,
        spawnchannel: DataTypes.STRING,
        guildxp: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },	
    },
        {
            timestamps: false
        });

};
