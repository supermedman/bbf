module.exports = (sequelize, DataTypes) => {
    return sequelize.define('MediumTile', {
        tileid: {
            type: DataTypes.STRING,
            defaultValue: '0',
        },
        guildid: {
            type: DataTypes.STRING,
            defaultValue: '0',
        },

        tile_location: DataTypes.STRING,

        local_biome_one: DataTypes.STRING,
        town_one: {
            type: DataTypes.STRING,
            defaultValue: '0',
        },

        local_biome_two: DataTypes.STRING,
        town_two: {
            type: DataTypes.STRING,
            defaultValue: '0',
        },
    },
    {
        timestamps: false,
    });
};