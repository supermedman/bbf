module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Milestones', {
        userid: {
            type: DataTypes.STRING,
            unique: true,
        },
        currentquestline: {
            type: DataTypes.STRING,
            defaultValue: 'None',
        },
        laststoryquest: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        }, 
        nextstoryquest: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        }, 
        questlinedungeon: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        }, 
    });
};