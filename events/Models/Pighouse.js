module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Pighouse', {
        //ALL OWNED PIGMY STORAGE
        spec_id: {
            type: DataTypes.INTEGER,//taken as userid
        },
        name: DataTypes.TEXT,//set to given name from prefab, can be user defined
        type: DataTypes.TEXT,//static reference to prefab
        level: {
            type: DataTypes.INTEGER,//static while !Active
            defaultValue: 1,
            allowNull: false,
        },
        exp: DataTypes.INTEGER,//static while !Active
        mood: DataTypes.TEXT,
        happiness: DataTypes.INTEGER,//static while !Active
        playcount: DataTypes.INTEGER,//static while !Active
        tomorrow: DataTypes.TEXT,//static while !Active
        refid: DataTypes.INTEGER, //refrence id for grabbing from json

        /*
        type: DataTypes.TEXT,//type of pigmy

        png: DataTypes.TEXT,//file link to png of pigmy

        missions: DataTypes.INTEGER,//number of missions pigmy has gone on

        kills: DataTypes.INTEGER,//number of enemies killed
        */
    },
        {
            timestamps: false,
        });

};