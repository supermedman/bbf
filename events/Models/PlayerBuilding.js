module.exports = (sequelize, DataTypes) => {
    return sequelize.define('PlayerBuilding', {
        townid: DataTypes.STRING,
        ownerid: DataTypes.STRING,
        plotid: DataTypes.STRING,
        can_edit: DataTypes.STRING,
        build_type: DataTypes.STRING,
        background_tex: DataTypes.STRING,
        build_style: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
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
        band_owned: {type: DataTypes.BOOLEAN, defaultValue: false}
    },
    {
        timestamps: false,
    });
};