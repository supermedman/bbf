module.exports = (sequelize, DataTypes) => {
    return sequelize.define('CoreBuilding', {
        townid: DataTypes.STRING,
        level: DataTypes.INTEGER,
        core_settings: {
            type: DataTypes.STRING,
            defaultValue: '{"Active": false}'
        },
        build_status: DataTypes.STRING,
        build_type: DataTypes.STRING,
        background_tex: DataTypes.STRING,
        foreground_tex: {
            type: DataTypes.STRING,
            defaultValue: '1'
        },
        roof_tex: {
            type: DataTypes.STRING,
            defaultValue: '1'
        },
        wall_tex: {
            type: DataTypes.STRING,
            defaultValue: '1'
        },
        window_tex: {
            type: DataTypes.STRING,
            defaultValue: '1'
        },
        door_tex: {
            type: DataTypes.STRING,
            defaultValue: '1'
        },

    });
};