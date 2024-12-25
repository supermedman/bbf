const { ThreadAutoArchiveDuration, ChannelType } = require('discord.js');
const {CombatThreads, GuildData} = require('../../../dbObjects');

const {
    makeCapital
} = require('../../../uniHelperFunctions');

async function handleCombatThreading(interaction){
    const threadName = `${makeCapital(interaction.user.username)}'s Combat`;

    if (interaction.channel.type === ChannelType.PrivateThread && interaction.channel.name === threadName) return 'Start Combat';


    const guildObj = await GuildData.findOne({ where: { guildid: interaction.guild.id }});
    if (!guildObj || guildObj.spawnchannel === '0') return 'Start Combat'; // No spawn channel!

    const spawnChannel = await interaction.guild.channels.fetch(guildObj.spawnchannel);
    // console.log(spawnChannel);
    // Locate existing combat thread
    
    const activeThreads = await CombatThreads.findAll( { where: { userid: interaction.user.id } } );
    const threadCount = activeThreads.length;
    // console.log(...activeThreads);
    const matchingStoredThread = activeThreads.find(t => t.channelid === spawnChannel.id);
    const threadCheck = (matchingStoredThread) 
    ? spawnChannel.threads.cache.find(t => t.name === matchingStoredThread.thread_name)
    : false;


    const threadObj = {
        thread: {},
        replyContent: {
            content: '',
            ephemeral: true
        },
        async mentionUser(user){
            await this.thread.send(`<@${user.id}> Use the command \`/startcombat\` to start combat!`);
        }
    };

    if (matchingStoredThread && threadCheck) {
        // Thread found handling completed!
        threadObj.thread = threadCheck;
        threadObj.replyContent.content = `Combat Thread Located! <#${threadObj.thread.id}>`;
    } else {
        // Attempt to create new thread
        threadObj.thread = await spawnChannel.threads.create({
            name: threadName,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
            type: ChannelType.PrivateThread,
            reason: "Personal Combat"
        });

        await threadObj.thread.members.add(interaction.user.id);

        threadObj.replyContent.content = `Combat Thread Created! <#${threadObj.thread.id}>`;
        
        try {
            if (threadCount < 3){
                // Make new thread
                await CombatThreads.create({
                    guildid: interaction.guild.id, 
                    channelid: spawnChannel.id,
                    threadid: threadObj.thread.id,
                    userid: interaction.user.id,
                    time_limit: threadObj.thread.autoArchiveDuration,
                    thread_name: threadName,
                    user_thread_count: threadCount + 1
                });
            } else {
                // replace existing thread
                // Sort by time updated, replacing the oldest thread
                for (const activeT of activeThreads){
                    console.log(`Stored Thread # ${activeT.user_thread_count}`, activeT.updatedAt.getTime());
                }
                activeThreads.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
                const oldestThreadEntry = activeThreads[0];

                console.log('OLDEST THREAD: ', oldestThreadEntry.dataValues.user_thread_count);

                const checkTGuild = t => t.guildid === interaction.guild.id;
                const checkTChannel = t => t.channelid === spawnChannel.id;
                const threadOverwriteOverride = activeThreads.find(t => checkTGuild(t) && checkTChannel(t));
                
                console.log('OVERWRITE THREAD: ', threadOverwriteOverride?.dataValues.user_thread_count);

                const threadEntryUsed = threadOverwriteOverride ?? oldestThreadEntry;

                console.log('USING THREAD ENTRY: ', threadEntryUsed.dataValues.user_thread_count);


                // Remove existing thread channel to prevent confusion
                if (!threadOverwriteOverride){
                    const foundGuild = await interaction.client.guilds.fetch(threadEntryUsed.guildid);
                    const foundChannel = await foundGuild.channels.fetch(threadEntryUsed.channelid);
                    const foundThread = foundChannel.threads.cache.find(t => t.id === threadEntryUsed.threadid);
                    
                    console.log('THREAD TO REMOVE: ', foundThread.id);
                    if (foundThread) {
                        await foundThread.delete();
                        console.log('Thread Deleted: ', foundThread.id);
                    }
                }
                

                // const threadToRemove = await interaction.client.guilds.fetch(threadEntryUsed.guildid)
                // .then(async guild => {
                //     await guild.channels.fetch(threadEntryUsed.channelid)
                //     .then(channel => {
                //         return channel.threads.cache.find(t => t.id === threadEntryUsed.threadid);
                //     });
                // });

                // if (threadToRemove){
                //     console.log(threadToRemove);
                //     await threadToRemove.delete();
                //     console.log('Thread Deleted: ', threadToRemove);
                // }

                await threadEntryUsed.update({
                    guildid: interaction.guild.id,
                    channelid: spawnChannel.id,
                    threadid: threadObj.thread.id
                });
    
                await threadEntryUsed.save();
            }
        } catch(e) {
            console.error('Something went wrong creating a combat thread! ', e);
        }
    }

    // console.log(threadObj);

    if (threadObj.thread){
        await interaction.reply(threadObj.replyContent);
        await threadObj.mentionUser(interaction.user);
    }

    return threadObj;
}

module.exports = {
    handleCombatThreading
};