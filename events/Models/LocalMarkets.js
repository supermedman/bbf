module.exports = (sequelize, DataTypes) => {
    return sequelize.define('LocalMarkets', {
        guildid: DataTypes.STRING,
        target_type: DataTypes.STRING,
        target_id: DataTypes.STRING,
        sale_type: DataTypes.STRING,
        item_type: DataTypes.STRING,
        item_id: DataTypes.STRING,
        listed_value: DataTypes.INTEGER,
        amount_left: DataTypes.INTEGER,
    });
};