module.exports = (sequelize, DataTypes) => {
    return sequelize.define('ActiveStatus', {

        name: DataTypes.TEXT, //This is the potion names effect
        curreffect: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        activec: DataTypes.STRING, //This is the activeCategory
        cooldown: DataTypes.INTEGER, //This is the cooldown, once at 0 clear all values
        duration: DataTypes.INTEGER, //This is the duration, if 0 instant use
        potionid: DataTypes.INTEGER, //This is the potionID reference

        spec_id: DataTypes.STRING, //This is the default userID reference 
    },
        {
            timestamps: false,
        });
};