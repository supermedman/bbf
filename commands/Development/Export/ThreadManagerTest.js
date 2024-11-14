const { ThreadAutoArchiveDuration, ChannelType } = require('discord.js');
const {CombatThreads, GuildData} = require('../../../dbObjects');

const {
    makeCapital
} = require('../../../uniHelperFunctions');


async function handleCombatThreadingTest(interaction){
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

    const threadObj = {
        thread: {},
        replyContent: {
            content: '',
            ephemeral: true
        },
        async mentionUser(user){
            await this.thread.send(`<@${user.id}>`);
        }
    };

    if (matchingStoredThread) {
        // Thread found handling completed!
        threadObj.thread = spawnChannel.threads.cache.find(t => t.name === matchingStoredThread.thread_name);
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
                activeThreads.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
            
                await activeThreads[0].update({
                    guildid: interaction.guild.id,
                    channelid: spawnChannel.id,
                    threadid: threadObj.thread.id
                });
    
                await activeThreads[0].save();
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
    handleCombatThreadingTest
};