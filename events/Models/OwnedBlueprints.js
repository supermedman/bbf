module.exports = (sequelize, DataTypes) => {
    return sequelize.define('OwnedBlueprints', {

        name: DataTypes.TEXT,

        onlyone: DataTypes.BOOLEAN,
        passivecategory: DataTypes.TEXT,

        blueprintid: DataTypes.INTEGER,
        spec_id: DataTypes.STRING,
    },
        {
            timestamps: false,
        });
};