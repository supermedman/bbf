module.exports = (sequelize, DataTypes) => {
    return sequelize.define('UserMaterials', {
        userid: DataTypes.STRING,
        mattype: DataTypes.STRING,
        matdata: DataTypes.STRING
    }, {
        timestamps: false
    });
};