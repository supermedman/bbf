const {EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType, ActionRowBuilder} = require('discord.js');

const {NPCTable, UserTasks} = require('../../../dbObjects.js');
const { NPC } = require('./MadeClasses/NPC.js');
const { createInteractiveChannelMessage, editTimedChannelMessage, handleCatchDelete } = require('../../../uniHelperFunctions.js');

/**
 * This function handles loading, displaying, and db updates dependent on user choices
 * @param {NPC} npc NPC spawned
 * @param {object} interaction Discord Interaction Object
 * @param {object} user UserData DB Object
 */
async function initialDialog(npc, interaction, user) {
    
    const npcDialogEmbed = new EmbedBuilder()
    .setTitle(npc.name)
    .setDescription(npc.dialogList[0])
    .setColor('DarkAqua');

    const stringSelectOptionList = [];

    for (const optionList of npc.replyOptions){
        let pushObj = [];
        for (const optionObj of optionList){
            let option = new StringSelectMenuOptionBuilder()
            .setLabel(optionObj.Label)
            .setDescription(optionObj.Description)
            .setValue(optionObj.Value);
            pushObj.push(option);
        }
        stringSelectOptionList.push(pushObj);
    }

    const userReplyOptionMenu = new StringSelectMenuBuilder()
    .setCustomId('reply-option')
    .setPlaceholder('Select a reply!')
    .addOptions(stringSelectOptionList[0]);

    const selectRow = new ActionRowBuilder().addComponents(userReplyOptionMenu);

    const replyObj = {embeds: [npcDialogEmbed], components: [selectRow]};

    const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, "", "String");

    const dialogMenu = {
        curPage: 0,
        lastPage: npc.dialogList.length,
        optionsObj: userReplyOptionMenu,
        selectRow: selectRow,
        optionList: stringSelectOptionList,
        npcEmbed: npcDialogEmbed,
        npcDialogList: npc.dialogList,
        rudeReplies: 0,
        maxRudeness: 2
    };

    // ~~~~~~~~~~~~~~~~~~~~~
    // STRING COLLECTOR
    collector.on('collect', async c => {
        await c.deferUpdate().then(async () => {
            // If player is rude, this adds 1
            // If not, this adds 0
            dialogMenu.rudeReplies += c.values[0] === 'Decline';
            if (
                (dialogMenu.rudeReplies >= dialogMenu.maxRudeness) ||
                (c.values[0] === 'Decline' && dialogMenu.curPage === dialogMenu.lastPage - 1)
            ) return collector.stop('Was Rude'); // NPC leaves from rudeness lol, or Decline option picked as final option

            dialogMenu.curPage++;
            if (dialogMenu.curPage === dialogMenu.lastPage) return collector.stop('Task Taken');

            dialogMenu.optionsObj.setOptions(dialogMenu.optionList[dialogMenu.curPage]);
            // console.log(dialogMenu.optionsObj);

            dialogMenu.npcEmbed.setDescription(dialogMenu.npcDialogList[dialogMenu.curPage]);

            await anchorMsg.edit({embeds: [dialogMenu.npcEmbed], components: [dialogMenu.selectRow]});
        }).catch(e => console.error(e));
    });
    // ~~~~~~~~~~~~~~~~~~~~~

    // ~~~~~~~~~~~~~~~~~~~~~
    // STRING COLLECTOR
    collector.on('end', async (c, r) => {
        if (!r || r === 'time') return await handleCatchDelete(anchorMsg);

        const finalNPCEmbed = new EmbedBuilder();

        switch(r){
            case "Was Rude":
                // Load reply embed with rude dialog
                finalNPCEmbed
                .setTitle(npc.name)
                .setColor('DarkRed')
                .setDescription('It would appear as if you have no intrest, good day.. *although I would rather you had a bad one!* ***Hmph***');
            break;
            case "Task Taken":
                // Load reply embed with task details
                let reqDesc = `${npc.name} wants you to ${npc.taskType}`;
                reqDesc += (npc.taskType === 'Combat') ? ' enemies: ':' something: ';

                finalNPCEmbed
                .setTitle(npc.taskType)
                .setDescription(reqDesc)
                .setColor('Gold')
                .addFields(npc.grabTaskDisplayFields());

                const theTask = await handleTaskCreation(npc, user);
                console.log('TASK LOADED: ', theTask.dataValues);
            break;
        }

        return await editTimedChannelMessage(anchorMsg, 120000, {embeds: [finalNPCEmbed], components: []});
    });
    // ~~~~~~~~~~~~~~~~~~~~~

    
    
    
    // const npcRequestEmbed = new EmbedBuilder()
    // .setTitle(npc.taskType)
    // .setDescription(reqDesc)
    // .setColor('Gold')
    // .addFields(npc.grabTaskDisplayFields());

    

    // const dialogMenu = await interaction.followUp({
    //     embeds: [npcDialogEmbed], 
    //     components: [selectRow],
    // });

    // const filter = (i) => i.user.id === interaction.user.id;

    // const dialogCollector = dialogMenu.createMessageComponentCollector({
    //     componentType: ComponentType.StringSelect,
    //     filter,
    //     time: 120000
    // });

    // const valuesPickedList = [];
    // let currentStep = 0;
    // dialogCollector.on('collect', async iCS => {
    //     valuesPickedList[currentStep] = iCS.values[0];
    //     console.log(`Reply Selected! ${valuesPickedList[currentStep]}`);
    //     console.log(`Dialog Count: ${currentStep}\nDialog Length: ${npc.dialogList.length}`);
    //     if (valuesPickedList[currentStep] === 'Decline') return await dialogCollector.stop();

    //     await iCS.deferUpdate().then(async () => {
    //         if ((currentStep + 1) === npc.dialogList.length){
    //             //Last Dialog Piece
    //             const result = await saveStateTask(npc, user);
    //             if (result !== 'Success') return await interaction.followUp('Something went wrong while adding that task!');
                
    //             //const requestEmbedMessage = 
    //             await interaction.followUp({embeds: [npcRequestEmbed]});
    //             //console.log(requestEmbedMessage);

    //             await dialogCollector.stop();
    //         } else {
    //             // Still In Dialog
    //             currentStep++;
    //             userReplyOptionMenu.setOptions(stringSelectOptionList[currentStep]);
    //             npcDialogEmbed.setDescription(npc.dialogList[currentStep]);
    //             await dialogMenu.edit({
    //                 embeds: [npcDialogEmbed],
    //                 components: [selectRow],
    //             });
    //         }
    //     }).catch(e=>console.error(e));
    // });

    // dialogCollector.on('end', () => {
    //     console.log('Select Menu Expired!');

    //     dialogMenu.delete().catch(error => {
    //         if (error.code !== 10008) {
    //             console.error('Failed to delete the message:', error);
    //         }
    //     });
    // });
}

/**
 * This function saves both the npc and given task into the database
 * @param {NPC} npc NPC Object
 * @param {object} user UserData DB Object
 * @returns {Promise <object>}
 */
async function handleTaskCreation(npc, user){
    const newNPC = await NPCTable.create({
        name: npc.name,
        level: npc.level,
        happiness: 0,
        curbiome: npc.curBiome
    });

    const givenTask = await UserTasks.create({
        userid: user.userid,
        npcid: newNPC.npcid,
        task_type: npc.taskType,
        task_difficulty: npc.taskTags[1],
        name: npc.taskRequest.Name ?? 'None',
        condition: npc.taskRequest.MinLevel ?? npc.taskRequest.Rar_id,
        total_amount: npc.taskRequest.Amount
    });

    return givenTask;
}

// async function saveStateTask(npc, user){
//     let dbNpc = await NPCTable.create({
//         name: npc.name,
//         level: npc.level,
//         happiness: 0,
//         curbiome: npc.curbiome,
//     });

//     if (dbNpc) dbNpc = await NPCTable.findOne({where: {name: npc.name, level: npc.level}});

//     let newTask = await UserTasks.create({
//         userid: user.userid,
//         npcid: dbNpc.npcid,
//         task_type: npc.taskType,
//         task_difficulty: npc.taskTags[1],
//         name: npc.taskRequest.Name ?? 'None',
//         condition: (npc.taskRequest.MinLevel) ? npc.taskRequest.MinLevel : npc.taskRequest.Rar_id,
//         total_amount: npc.taskRequest.Amount, 
//     });

//     if (newTask) console.log(newTask);

//     if (dbNpc.npcid === newTask.npcid) return 'Success';
//     return 'Failure';
// }

module.exports = { initialDialog };