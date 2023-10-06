module.exports = (sequelize, DataTypes) => {
    return sequelize.define('GuildData', {

        guildid: DataTypes.STRING,
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
