const { Events, Collection } = require('discord.js');
const { GuildData } = require('../dbObjects.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (!message.inGuild) return;
        console.log('MESSAGE CREATED!');
        const guildForXP = message.guild.id;
        console.log(guildForXP);
        const guildFound = await GuildData.findOne({ where: { guildid: guildForXP } });

        if (guildFound) {
            //Guild found, check for cooldown!
            //Add cooldown here
            const { gcooldowns } = message.client;

            if (!gcooldowns.has(guildForXP)) {
                gcooldowns.set(guildForXP, new Collection());
            }

            const now = Date.now();
            const timestamps = gcooldowns.get(guildForXP);
            const defaultCooldownDuration = 5;
            const gcooldownAmount = (defaultCooldownDuration) * 1000;

            if (timestamps.has(guildForXP)) {
                const expirationTime = timestamps.get(message.createdTimestamp) + gcooldownAmount;

                if (now < expirationTime) {
                    const expiredTimestamp = Math.round(expirationTime / 1000);
                    return console.log(`Cooldown active waiting ${expiredTimestamp}`);
                }                
            }
            timestamps.set(guildForXP, now);
            setTimeout(() => timestamps.delete(guildForXP), gcooldownAmount);

            const totalxp = (Math.floor(Math.random() * (25))) + guildFound.guildxp;

            if (totalxp > 500) {
                //ENEMY SPAWNS!!
                //Add enemy spawn interaction here!
                //Call handler script guildDropHandler.js
                //handleSpawn(message);
                const xpOver = totalxp - 500;
                const addGuildXP = GuildData.update({ guildxp: xpOver }, { where: { guildid: guildForXP } });
                if (addGuildXP > 0) {
                    //Guild xp updated correctly
                    console.log(`Xp Added! Current total XP: ${xpOver}`);
                }
            } else {
                const addGuildXP = GuildData.update({ guildxp: totalxp }, { where: { guildid: guildForXP } });

                if (addGuildXP > 0) {
                    //Guild xp updated correctly
                    console.log(`Xp Added! Current total XP: ${totalxp}`);
                }
            }
    
        }
    },
};