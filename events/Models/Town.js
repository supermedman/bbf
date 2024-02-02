module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Town', {
        tileid: DataTypes.STRING,
        tile_location: DataTypes.STRING,

        townid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV1,
            primaryKey: true,
        },
        
        guildid: DataTypes.STRING,
        mayorid: DataTypes.STRING,
        can_edit: DataTypes.STRING,

        local_biome: DataTypes.STRING,
        mat_bonus: DataTypes.STRING,
        
        name: DataTypes.STRING,
        
        level: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
        },
        coins: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },

        buildlimit: {
            type: DataTypes.INTEGER,
            defaultValue: 10,
        },

        openplots: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        closedplots: {
            type: DataTypes.INTEGER,
            defaultValue: 10,
        },
        ownedplots: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        buildcount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },

        population: DataTypes.INTEGER,
        npc_population: DataTypes.INTEGER,

        band_one: {
            type: DataTypes.STRING,
            defaultValue: '0',
        },
        band_two: {
            type: DataTypes.STRING,
            defaultValue: '0',
        },

        grandhall_status: {
            type: DataTypes.STRING,
            defaultValue: 'None',
        },
        bank_status: {
            type: DataTypes.STRING,
            defaultValue: 'None',
        },
        market_status: {
            type: DataTypes.STRING,
            defaultValue: 'None',
        },
        tavern_status: {
            type: DataTypes.STRING,
            defaultValue: 'None',
        },
        clergy_status: {
            type: DataTypes.STRING,
            defaultValue: 'None',
        },
    },
    {
        timestamps: false,
    });
};