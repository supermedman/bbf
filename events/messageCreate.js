const { Events, Collection } = require('discord.js');
const { GuildData } = require('../dbObjects.js');
const { handleSpawn } = require('./guildDropHandler.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (!message.inGuild) return;
        if (message.mentions.users.has(message.client.user.id)) {
            if (message.author.id === '501177494137995264') {
                await message.reply('You called big daddy ward?');
            } else if (message.author.id === '951980834469060629') {
                const sixDecades = 1830303216000;
                const now = Date.now();
                const timeTOgo = sixDecades + now;
                const timeRemaining = Math.round(timeTOgo / 1000)
                const choices = [
                    'I LOVE YOOOOU',
                    'I love you more than a t-rex loves chicken heheh',
                    'I Want to have ur babies <:thirst:1172416137141702678>',
                    'Youre the most beautiful lady on this planet!!',
                    'I will always adore you baby <3',
                    'Youre the cutiest cutiepie!!',
                    `<t:${timeRemaining}:R>`,
                    'Hideaway 24/7 <3',
                    'Cant ever get enough of you ;)',
                    'Just keep falling for you, over and over <3',
                    'Coffee in the early mornings next to you <a:mhmmhm:1174048444025929790>',
                    '�',
                    'You always smell so nice hehe',
                    'Taste like a dream!',
                    'Built like an angel <3',
                    'You have the most aweinspiring eyes!',
                    'This chair.. mmmmmmhmmmmm <3',
                    'I love how smart you are!',
                    'You are the absolute coolest person ;)'
                ];

                const theOutcome = Math.floor(Math.random() * choices.length);

                await message.reply({ content: `${choices[theOutcome]}`, ephemeral: true });
            } else if (message.author.id === '1125409544328192131') {
                await message.reply('**Yo DAWG! WAAASS GOOD Macha!! **');
            } else if (message.author.id === '498781063531724800') {
                await message.reply('Your offerings are ready my Queen <:VampBite:1095735400682758215>');
            } else if (message.author.id === '574969335311761419') {
                await message.reply('Who`s the bitch who pinged me');
            } else if (message.author.id === '463102823270449192') {
                await message.reply('Worm is love, worm is life');
            }
        }


        const guildForXP = message.guild.id;
        const guildCheck = await GuildData.findOne({ where: { guildid: guildForXP } });
        
        let guildFound = {};
        if (!guildCheck) {
            guildFound = await GuildData.create({
                guildid: guildForXP,    
            });
        } else {
            guildFound = guildCheck;
        }
        
        const xpGain = Math.floor(Math.random() * 25 + 1);

        let spawned = false;
        if (xpGain + guildFound.guildxp >= 300){
            spawned = true;
            handleSpawn(message);
        }

        let newTotalXp = xpGain + guildFound.guildxp;
        if (spawned) {
            newTotalXp -= 300;
            const inc = guildFound.increment('total_spawns', {by: 1});
            if (inc) {
                await guildFound.save();
                console.log('Total Enemies spawned: ', guildFound.total_spawns);
            }
        }

        console.log(`Xp changed, current total: ${newTotalXp}`);

        const tableUpdate = await guildFound.update({guildxp: newTotalXp});
        if (tableUpdate > 0) return await guildFound.save();

        //Guild found, check for cooldown!
        //Add cooldown here
        //const { gcooldowns } = message.client;

        //if (!gcooldowns.has(guildForXP)) {
        //    gcooldowns.set(guildForXP, new Collection());
        //}

        //const now = Date.now();
        //const timestamps = gcooldowns.get(guildForXP);
        //const defaultCooldownDuration = 5;
        //const gcooldownAmount = (defaultCooldownDuration) * 1000;

        //if (timestamps.has(guildForXP)) {
        //    const expirationTime = timestamps.get(message.createdTimestamp) + gcooldownAmount;

        //    if (now < expirationTime) {
        //        const expiredTimestamp = Math.round(expirationTime / 1000);
        //        return console.log(`Cooldown active waiting ${expiredTimestamp}`);
        //    }                
        //}
        //timestamps.set(guildForXP, now);
        //setTimeout(() => timestamps.delete(guildForXP), gcooldownAmount);

        // const totalxp = (Math.floor(Math.random() * (25) + 1)) + guildFound.guildxp;
        // //console.log(`Guild: ${guildForXP} \nCurrent Xp: ${totalxp} \nUser ID: ${message.author.id}`);
        // if (totalxp > 300) {
        //     //ENEMY SPAWNS!!
        //     //Add enemy spawn interaction here!
        //     //Call handler script guildDropHandler.js
        //     await handleSpawn(message);
        //     const xpOver = totalxp - 300;
        //     const addGuildXP = await GuildData.update({ guildxp: xpOver }, { where: { guildid: guildForXP } });
        //     if (addGuildXP > 0) {
        //         //Guild xp updated correctly
        //         console.log(`Xp Added! Current total XP: ${xpOver}`);
        //     }
        // } else {
        //     const addGuildXP = await GuildData.update({ guildxp: totalxp }, { where: { guildid: guildForXP } });

        //     if (addGuildXP > 0) {
        //         //Guild xp updated correctly
        //         console.log(`Xp Added! Current total XP: ${totalxp}`);
        //     }
        // }
    
        
    },
};
