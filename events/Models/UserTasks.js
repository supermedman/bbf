module.exports = (sequelize, DataTypes) => {
    return sequelize.define('UserTasks', {
        taskid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV1,
            primaryKey: true,
        },
        userid: {
            type: DataTypes.STRING,
            allowedNull: false,
        },
        npcid:{
            type: DataTypes.STRING,
            allowedNull: false,
        },

        task_type: {
            type: DataTypes.STRING,
            defaultValue: 'Fetch',
        },
        task_difficulty: {
            type: DataTypes.STRING,
            defaultValue: 'Baby'
        },
        name: {
            type: DataTypes.STRING,
            defaultValue: 'None',
        },
        condition: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        total_amount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        amount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },


    });
};