module.exports = (sequelize, DataTypes) => {
    return sequelize.define('BasicShoppe', {
        user_id: DataTypes.STRING,

        refcost: DataTypes.INTEGER,

        slot_one: DataTypes.STRING,
        cost_one: DataTypes.INTEGER,

        slot_two: DataTypes.STRING,
        cost_two: DataTypes.INTEGER,

        slot_three: DataTypes.STRING,
        cost_three: DataTypes.INTEGER,
        
        slot_four: DataTypes.STRING,
        cost_four: DataTypes.INTEGER,
    },
    {
        timestamps: false
    });
};