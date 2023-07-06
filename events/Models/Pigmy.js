module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Pigmy', {
        //ACTIVE PIGMY STORAGE
        spec_id: {
            type: DataTypes.INTEGER,//taken as userid
            primaryKey: true,
        },

        name: DataTypes.TEXT,//set to given name from prefab, can be user defined
        type: DataTypes.TEXT,//static reference to prefab
        level: {
            type: DataTypes.INTEGER,//not static
            defaultValue: 1,
            allowNull: false,
        },
        exp: DataTypes.INTEGER,//not static
        mood: DataTypes.TEXT,
        happiness: DataTypes.INTEGER,//not static
        playcount: DataTypes.INTEGER,//not static
        tomorrow: DataTypes.TEXT,//not static
        lcm: DataTypes.INTEGER,      
        /*
         * - LCM = Last-Claim-Made (Using timestamps, mark a time log specifically for the claim interaction)
         */


        refid: DataTypes.INTEGER, //refrence id for grabbing from json

        /*
        type: DataTypes.TEXT,//type of pigmy

        png: DataTypes.TEXT,//file link to png of pigmy

        missions: DataTypes.INTEGER,//number of missions pigmy has gone on

        kills: DataTypes.INTEGER,//number of enemies killed
        */
    },
        {
            timestamps: true,
        });

};