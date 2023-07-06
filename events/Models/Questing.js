module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Questing', {
        user_id: {
            type: DataTypes.INTEGER,
            unique: true,
        },

        qlength: DataTypes.INTEGER,
        qlevel: DataTypes.INTEGER,
        qname: DataTypes.TEXT,

    });
};