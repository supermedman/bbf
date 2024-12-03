module.exports = (sequelize, DataTypes) => {
    return sequelize.define('GlobalMarkets', {
        guildid: DataTypes.STRING,
        target_type: DataTypes.STRING,
        target_id: DataTypes.STRING,
        sale_type: DataTypes.STRING,
        item_type: DataTypes.STRING,
        item_id: DataTypes.STRING,
        item_name: {
            type: DataTypes.STRING,
            defaultValue: 'Name'
        },
        item_rar: {
            type: DataTypes.STRING,
            defaultValue: 'Common'
        },
        item_caste: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        item_code: {
            type: DataTypes.STRING,
            defaultValue: 'None'
        },
        listed_value: DataTypes.INTEGER,
        amount_left: DataTypes.INTEGER,
        expires_at: DataTypes.INTEGER
    });
};