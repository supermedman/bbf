module.exports = (sequelize, DataTypes) => {
    return sequelize.define('NPC', {
        npcid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV1,
            primaryKey: true,
        },
        townid: {
            type: DataTypes.STRING,
            defaultValue: '0',
        },
        plotid: {
            type: DataTypes.STRING,
            defaultValue: '0',
        },
        taskid: {
            type: DataTypes.STRING,
            defaultValue: '0',
        },
        
        name: DataTypes.STRING,
        level: DataTypes.INTEGER,
        happiness: DataTypes.INTEGER,

        can_hire: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },

        combat_skill:{
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        gather_skill:{
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        craft_skill:{
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },

        favbiome: {
            type: DataTypes.STRING,
            defaultValue: 'Wilds',
        },
        curbiome: {
            type: DataTypes.STRING,
            defaultValue: 'Wilds',
        },

        move_conditions: {
            type: DataTypes.STRING,
            defaultValue: 'None',
        },

        requests: {
            type: DataTypes.STRING,
            defaultValue: 'None',
        },
    });
};