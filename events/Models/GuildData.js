module.exports = (sequelize, DataTypes) => {
    return sequelize.define('GuildData', {

        guildid: DataTypes.INTEGER,
        spawnchannel: DataTypes.INTEGER,
        guildxp: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },	
    },
        {
            timestamps: false
        });

};