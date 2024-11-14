module.exports = (sequelize, DataTypes) => {
    return sequelize.define('CombatThreads', {
        guildid: DataTypes.STRING,
        channelid: DataTypes.STRING,
        threadid: DataTypes.STRING,
        userid: DataTypes.STRING,
        time_limit: DataTypes.INTEGER,
        thread_name: DataTypes.STRING,
        user_thread_count: DataTypes.INTEGER,
    });
};