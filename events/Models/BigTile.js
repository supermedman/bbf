module.exports = (sequelize, DataTypes) => {
    return sequelize.define('BigTile', {
        tileid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowedNull: false,
        },

        mainbiome_one: DataTypes.STRING,
        medtile_one: {
            type: DataTypes.STRING,
            defaultValue: '0',
        },

        mainbiome_two: DataTypes.STRING,
        medtile_two: {
            type: DataTypes.STRING,
            defaultValue: '0',
        },

        mainbiome_three: DataTypes.STRING,
        medtile_three: {
            type: DataTypes.STRING,
            defaultValue: '0',
        },

        mainbiome_four: DataTypes.STRING,
        medtile_four: {
            type: DataTypes.STRING,
            defaultValue: '0',
        },
    },
    {
        timestamps: false,
    });
};