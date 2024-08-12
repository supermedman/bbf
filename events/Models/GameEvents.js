module.exports = (sequelize, DataTypes) => {
    return sequelize.define('GameEvents', {
        eventid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV1
        },
        name: DataTypes.STRING,
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        event_type: {
            type: DataTypes.STRING,
            defaultValue: 'TYPE'
        },
        event_details: {
            type: DataTypes.STRING,
            defaultValue: '{"Effect": ["EXP"], "Value": [0.15]}'
        }
    });
};