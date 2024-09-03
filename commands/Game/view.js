const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType, ActionRowBuilder } = require('discord.js');

const {UserTasks, Milestones, UserData, LocationData, MaterialStore, LootStore, OwnedPotions, ItemLootPool, ItemStrings} = require('../../dbObjects.js');
const { checkUnlockedBiome } = require('./exported/locationFilters.js');
const { checkOwned } = require('./exported/createGear.js');
const {handleMaterialAdding} = require('./exported/materialDropper.js');

const npcRewardCaste = require('../../events/Models/json_prefabs/NPC_Prefabs/npcRewardCaste.json');
const lootList = require('../../events/Models/json_prefabs/lootList.json');
const blueprintList = require('../../events/Models/json_prefabs/blueprintList.json');
const { isLvlUp } = require('./exported/levelup.js');
const { 
    makeCapital, 
    createInteractiveChannelMessage, 
    createConfirmCancelButtonRow, 
    inclusiveRandNum, 
    sendTimedChannelMessage, 
    grabUser, 
    handleCatchDelete, 
    grabUserTaskList,
    randArrPos
} = require('../../uniHelperFunctions.js');
const { baseCheckRarName, uni_displayItem, uni_displaySingleMaterial } = require('../Development/Export/itemStringCore.js');
const { createBasicPageButtons, handleMatNameLoad } = require('./exported/tradeExtras.js');
const { handleUserPayout } = require('../Development/Export/uni_userPayouts.js');
const { checkInboundItem, checkInboundMat } = require('../Development/Export/itemMoveContainer.js');
const { grabColour } = require('./exported/grabRar.js');
const { checkHintPotionEquip } = require('./exported/handleHints.js');

// const randArrPos = (arr) => {
//     return arr[(arr.length > 1) ? Math.floor(Math.random() * arr.length) : 0];
// };

module.exports = {
	data: new SlashCommandBuilder()
		.setName('view')
        .setDescription('View different areas of content or progression')
        .addSubcommandGroup(subcommandGroup => 
            subcommandGroup
            .setName('quests')
            .setDescription('View quest related content')
            .addSubcommand(subcommand => 
                subcommand
                .setName('story')
                .setDescription('View storyline progress.'))
            .addSubcommand(subcommand =>
                subcommand
                .setName('hunting')
                .setDescription('View hunting grounds progress.')))
        .addSubcommandGroup(subcommandGroup =>
            subcommandGroup
            .setName('tasks')
            .setDescription('View task related content')
            .addSubcommand(subcommand => 
                subcommand
                .setName('complete')
                .setDescription('View completed tasks.'))
            .addSubcommand(subcommand =>
                subcommand
                .setName('active')
                .setDescription('View active tasks.'))
            .addSubcommand(subcommand =>
                subcommand
                .setName('failed')
                .setDescription('View failed tasks.'))),

	async execute(interaction) { 

        const user = await grabUser(interaction.user.id);

        // const user = await checkUser();
        // if (user === "No User") return await interaction.reply('No userdata found, please use ``/start`` to make a profile!');

        const { betaTester } = interaction.client;

		if (!betaTester.has(interaction.user.id)) return await interaction.reply('This command is under construction!! It is currently only available to early access testers!');

        const subComGroup = interaction.options.getSubcommandGroup();
        const subCom = interaction.options.getSubcommand();

        if (subComGroup === 'quests'){
            
            console.log('Quest SubcommandGroup Entered!');

            if (subCom === 'story'){
                // Gather Story progress
                // Milestones.findOne
                if (interaction.user.id !== '501177494137995264') return await interaction.reply('This command is currently not available!');
            }
    
            if (subCom === 'hunting'){
                // Gather Hunting progress
                // LocationData.findOne
                const locData = await LocationData.findOne({where: {userid: user.userid}});
                if (!locData) return await interaction.reply('No unlocked locations found! You must first complete a "Location Quest" in order to unlock new locations! *Try this quest:*||Free Whitepool Woods from Bandits||');
                
                const unlockedBiomes = checkUnlockedBiome(locData);

                const locationEmbed = new EmbedBuilder()
                .setTitle('== Known Locations ==')
                .setDescription('This is a list containing all locations currently known to you. They can be accessed by using ``/travel <location-name>``!')
                .setColor("Aqua")
                .addFields({name: "== Locations ==", value: `${unlockedBiomes.map(l => `Location Name: **${l}**`).join('\n\n')}`});

                return await sendTimedChannelMessage(interaction, 120000, locationEmbed, "Reply");
            }
        }

        // USER TASK HANDLING

        // COMPLETED
        // If no matching npc can be found with valid task id, remove.

        // FAILED
        // Setup functionality based on length. NOT FUNCTIONAL YET

        // ACTIVE
        // Handle Normally, Clean up code

        if (subComGroup === 'tasks'){
            const taskMatchList = await grabUserTaskList(user, subCom);
            if (typeof taskMatchList === 'string'){
                switch(taskMatchList){
                    case "No Tasks":
                        // User has no tasks of any kind
                    return await interaction.reply({content: `No tasks found! You must first speak with an NPC to start a task!`, ephemeral: true});
                    case "No Tasks Match":
                        // User has no tasks matching given status
                        const taskStatusOptions = ['complete', 'failed', 'active'];
                        taskStatusOptions.splice(taskStatusOptions.indexOf(subCom), 1);
                    return await interaction.reply({content: `No ${makeCapital(subCom)} tasks found! Use one of these commands instead: ${taskStatusOptions.map(t => `\n\`\`/view ${makeCapital(t)}\`\`\n`).join('\n')}`, ephemeral: true});
                    case "No Type Tasks Match":
                        // User has no tasks matching given type
                    return await interaction.reply({content: `No TASKTYPE tasks found! Try a different TASKTYPE or view all types instead!`, ephemeral: true});
                }
            }


            if (subCom !== 'active') return handleInactiveTaskCore(interaction, subCom, taskMatchList);

            return handleActiveTaskCore(interaction, user, subCom, taskMatchList);
        }


        /**
         * This function handles loading, displaying, and managing page change interactivity,
         * for the given Active ``taskList``. 
         * @param {object} interaction Base Discord Interaction Object
         * @param {object} user UserData DB Object
         * @param {string} subCom Used with display loading, task status being viewed
         * @param {object[]} taskList UserTasks DB Object List
         */
        async function handleActiveTaskCore(interaction, user, subCom, taskList){
            const activeTaskDisplay = loadActiveTaskDisplayPages(subCom, taskList);
            const navMenu = {
                curPage: 0,
                lastPage: 0,
                embedPages: activeTaskDisplay.embeds,
                orderedTasks: activeTaskDisplay.tasks,
                selectedTask: "", // Active Task Obj Picked
                progressObj: "" // Progress Obj for task picked
            };

            navMenu.lastPage = navMenu.embedPages.length - 1;

            const basePageButts = createBasicPageButtons("Primary");

            const taskSelectButt = new ButtonBuilder()
            .setCustomId('select-task')
            .setStyle(ButtonStyle.Success)
            .setLabel('Select Task');
            basePageButts.push(basePageButts.splice(1, 1, taskSelectButt)[0]);

            // First Selection Page
            const taskPickButtRow = createConfirmCancelButtonRow('task', ButtonStyle.Success, ButtonStyle.Secondary, 'Task');
            const taskPickEmbed = new EmbedBuilder()
            .setTitle('== Fill Task? ==');

            // Second Selection Page
            const taskFillButtRow = createConfirmCancelButtonRow('fill', ButtonStyle.Success, ButtonStyle.Secondary, 'Fill');
            const taskFillEmbed = new EmbedBuilder()
            .setTitle('== Confirm Changes ==');


            const pageButtRow = new ActionRowBuilder().addComponents(basePageButts);

            const replyObj = {embeds: [navMenu.embedPages[0]], components: [pageButtRow]};

            const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, "Reply");

            // =====================
            // BUTTON COLLECTOR
            collector.on('collect', async c => {
                await c.deferUpdate().then(async () => {
                    let editWith;
                    if (['next-page', 'back-page'].includes(c.customId)){ // PAGE BUTTONS
                        switch(c.customId){
                            case "next-page":
                                navMenu.curPage = (navMenu.curPage === navMenu.lastPage) ? 0 : navMenu.curPage + 1;
                            break;
                            case "back-page":
                                navMenu.curPage = (navMenu.curPage === 0) ? navMenu.lastPage : navMenu.curPage - 1;
                            break;
                        }
                        editWith = {embeds: [navMenu.embedPages[navMenu.curPage]], components: [pageButtRow]};
                    } else if (['select-task', 'confirm-task', 'confirm-fill'].includes(c.customId)){ // SELECT/CONFIRM BUTTONS
                        switch(c.customId){
                            case "select-task":
                                // Handle Task Details display and extra action buttons
                                navMenu.selectedTask = navMenu.orderedTasks[navMenu.curPage];

                                // EDIT ``taskPickEmbed`` CONTENTS BASED ON ``handleActiveTaskFillDisplay()``
                                const pickTaskOutcome = await handleActiveTaskFillDisplay(navMenu.selectedTask, user);
                                navMenu.progressObj = pickTaskOutcome;

                                let pickDesc, pickColour;
                                switch(pickTaskOutcome.status){
                                    case "Complete":
                                        pickDesc = "Task can be completed!";
                                        pickColour = 'Green';
                                    break;
                                    case "Partial":
                                        pickDesc = "Task progress can be made!";
                                        pickColour = 'DarkGold';
                                    break;
                                    case "Incomplete":
                                        pickDesc = "Task is still incomplete! No new progress can be made!";
                                        pickColour = 'DarkRed';
                                    break;
                                }
                                
                                if (pickTaskOutcome.amountChange > 0) pickDesc += `\nNew Progress Possible: ${pickTaskOutcome.amountChange}`;

                                pickDesc += '\nContinue?';

                                taskPickEmbed
                                .setDescription(pickDesc)
                                .setColor(pickColour);

                                editWith = {embeds: [taskPickEmbed], components: [taskPickButtRow]};
                            break;
                            case "confirm-task":
                                // Confirm Fill Task: ATTEMPT FILL TASK
                                const fillTaskDisplay = await handleConfirmActiveTaskFillDisplay(navMenu.selectedTask, user, navMenu.progressObj);

                                taskFillEmbed
                                .setDescription(fillTaskDisplay.description)
                                .setColor(fillTaskDisplay.color)
                                .addFields(fillTaskDisplay.fields);

                                editWith = {embeds: [taskFillEmbed], components: [taskFillButtRow]};
                            break;
                            case "confirm-fill":
                                // Confirm Fill Task: ATTEMPT FILL TASK
                                switch(navMenu.progressObj.status){
                                    case "Incomplete":
                                        navMenu.selectedTask = "";
                                        navMenu.progressObj = "";

                                        cleanPlaceholderEmbed(taskFillEmbed);
                                        cleanPlaceholderEmbed(taskPickEmbed);

                                        editWith = {embeds: [navMenu.embedPages[navMenu.curPage]], components: [pageButtRow]};
                                    break;
                                    case "Complete":
                                        await handleUpdateTaskProgress(navMenu.selectedTask, user, navMenu.progressObj, interaction);
                                        // Splice currently shown embed and task out of active list
                                        navMenu.embedPages.splice(navMenu.curPage, 1);
                                        navMenu.orderedTasks.splice(navMenu.curPage, 1);
                                        navMenu.lastPage--;
                                        navMenu.curPage = 0;

                                        navMenu.selectedTask = "";
                                        navMenu.progressObj = "";

                                        cleanPlaceholderEmbed(taskFillEmbed);
                                        cleanPlaceholderEmbed(taskPickEmbed);
                                        // Show task payout rewards
                                        // return to active task list select
                                        editWith = {embeds: [navMenu.embedPages[navMenu.curPage]], components: [pageButtRow]};
                                    break;
                                    case "Partial":
                                        const updatedTaskObj = await handleUpdateTaskProgress(navMenu.selectedTask, user, navMenu.progressObj, interaction);
                                        navMenu.orderedTasks[navMenu.curPage] = updatedTaskObj;
                                        // return to active task list select

                                        navMenu.selectedTask = "";
                                        navMenu.progressObj = "";

                                        cleanPlaceholderEmbed(taskFillEmbed);
                                        cleanPlaceholderEmbed(taskPickEmbed);

                                        editWith = {embeds: [navMenu.embedPages[navMenu.curPage]], components: [pageButtRow]};
                                    break;
                                }
                            break;
                        }
                    } else if (['cancel-task', 'cancel-fill'].includes(c.customId)){ // CANCEL BUTTONS
                        switch(c.customId){
                            case "cancel-task":
                                // Cancel Pick Task: GO BACK TO SELECT
                                navMenu.selectedTask = "";
                                navMenu.progressObj = "";

                                cleanPlaceholderEmbed(taskFillEmbed);
                                cleanPlaceholderEmbed(taskPickEmbed);

                                editWith = {embeds: [navMenu.embedPages[navMenu.curPage]], components: [pageButtRow]};
                            break;
                            case "cancel-fill":
                                // Cancel Fill Task: GO BACK TO SELECT
                                navMenu.selectedTask = "";
                                navMenu.progressObj = "";

                                cleanPlaceholderEmbed(taskFillEmbed);
                                cleanPlaceholderEmbed(taskPickEmbed);

                                editWith = {embeds: [navMenu.embedPages[navMenu.curPage]], components: [pageButtRow]};
                            break;
                        }
                    }

                    if (editWith) await anchorMsg.edit(editWith);
                }).catch(e => console.error(e));
            });
            // =====================

            // =====================
            // BUTTON COLLECTOR
            collector.on('end', async (c, r) => {
                if (!r || r === 'time') await handleCatchDelete(anchorMsg);

                await handleCatchDelete(anchorMsg);
            });
            // =====================
        }

        /**
         * This function resets the contents of the given embed to prevent improper values from being retained
         * @param {EmbedBuilder} embed Embed to be wiped clean
         */
        function cleanPlaceholderEmbed(embed){
            embed.setColor('DarkButNotBlack');
            if (embed.data.description) embed.setDescription('Temp');
            if (embed.data.fields?.length > 0) embed.spliceFields(0, embed.data.fields.length); // , {name: 'TMP', value: 'Placeholder'}
        }

        /**
         * This function handles task updates, if task is completed handles payouts. 
         * 
         * Returns updated task object
         * @param {object} task Active Type UserTasks DB Object
         * @param {object} user UserData DB Object
         * @param {object} fillCheckObj task details related to task status after filling the given task.
         * @param {object} interaction Base Discord Interaction Object
         * @returns {Promise <object>}
         */
        async function handleUpdateTaskProgress(task, user, fillCheckObj, interaction){
            await task.increment('amount', {by: fillCheckObj.amountChange}).then(async t => await t.save()).then(async t => {return await t.reload()});

            if (task.amount >= task.total_amount){
                await task.update({complete: true}).then(async t => await t.save()).then(async t => {return await t.reload()});
                await user.increment('tasks_complete').then(async u => await u.save()).then(async u => {return await u.reload()});

                await handleTaskCompletePayout(task, user, interaction);
            }

            return task;
        }

        /**
         * This function handles all task completion payouts for the given user.
         * @param {object} task Active Type UserTasks DB Object
         * @param {object} user UserData DB Object
         * @param {object} interaction Base Discord Interaction Object
         * @returns {Promise <void>}
         */
        async function handleTaskCompletePayout(task, user, interaction){
            const payoutObj = randArrPos(npcRewardCaste.find(caste => caste.Rated === task.task_difficulty).Options).Contents;
            
            const baseDisplay = await handleTaskBasePayout(task, user, payoutObj, interaction);
            const objectDisplay = await handleTaskObjPayout(user, payoutObj, interaction);

            //console.log('baseDisplay Object: ', baseDisplay);
            //console.log('payout reward objectDisplay: ', objectDisplay);

            const finalColour = objectDisplay.embed.color;

            const finalEmbed = new EmbedBuilder()
            .setTitle(`== **${task.task_difficulty} ${task.task_type} Rewards** ==`)
            .setDescription(objectDisplay.embed.description)
            .setColor(finalColour)
            .addFields(baseDisplay.concat(objectDisplay.embed.fields));

            return await sendTimedChannelMessage(interaction, 60000, finalEmbed, "FollowUp");
        }

        /**
         * This function handles item, material, or potions, dropped as task rewards
         * @param {object} user UserData DB Object
         * @param {object} payoutObj JSON Reward object
         * @param {object} interaction Base Discord Interaction Object
         * @returns {Promise<{ref: string, embed: {description: string, color: number, fields: [{name: string, value: string}]}}>}
         */
        async function handleTaskObjPayout(user, payoutObj, interaction){
            const rewardDisplay = {ref: "", embed: {description: "", color: 0, fields: []}};
            switch(payoutObj.Type){
                case "Potion":
                    const potMatch = {
                        craft: interaction.client.masterBPCrafts.get(payoutObj.Name),
                        effect: interaction.client.masterBPEffects.get(payoutObj.Name)
                    };
                    rewardDisplay.ref = await handlePotionDrop(potMatch, payoutObj.Amount, interaction);
                    rewardDisplay.embed.description = 'You recieved **Potions**!! You can find them by using the command ``/myloot potions``. Details listed below: ';
                    rewardDisplay.embed.fields.push({name: `== ${potMatch.craft.Name} ==`, value: `Potion Effect: **${potMatch.craft.Description}**\nRarity: **${potMatch.craft.Rarity}**\nLevel Required: **${potMatch.craft.Level}**\nPotion Duration: **${potMatch.effect.Duration}**\nPotion Cooldown: **${potMatch.effect.Cooldown}**`});
                    rewardDisplay.embed.color = grabColour(potMatch.craft.Rarity);
                break;
                case "Item":
                    rewardDisplay.ref = await handleItemDrop(payoutObj, user, interaction);
                    rewardDisplay.embed.description = 'You recieved **Items**!! You can find them by using the command ``/myloot gear``. Details listed below: ';
                    const itemDetails = uni_displayItem(rewardDisplay.ref, "Single-Quest", payoutObj.Amount);
                    rewardDisplay.embed.fields.push(itemDetails.fields);
                    rewardDisplay.embed.color = itemDetails.color;
                break;
                case "Material":
                    rewardDisplay.ref = await handleMatDrop(payoutObj, user, interaction);
                    rewardDisplay.embed.description = 'You recieved **Materials**!! You can find them by using the command ``/myloot material``. Details listed below: ';
                    const materialDetails = uni_displaySingleMaterial(rewardDisplay.ref, payoutObj.Amount);
                    rewardDisplay.embed.fields.push(materialDetails.fields[0]);
                    rewardDisplay.embed.color = materialDetails.color;
                break;
            }



            return rewardDisplay;
        }

        /**
         * This function rolls and drops a random material matching ``payoutObj.Rarity``
         * @param {object} payoutObj JSON Reward object
         * @param {object} user UserData DB Object
         * @param {object} interaction Base Discord Interaction Object
         * @returns {Promise <object>}
         */
        async function handleMatDrop(payoutObj, user, interaction){
            const matMatchRarList = handleMatNameLoad({rarity: baseCheckRarName(payoutObj.Extra)}, interaction.client.materialFiles);
        
            const matPicked = randArrPos(matMatchRarList);

            const theMat = await checkInboundMat(user.userid, matPicked.matRef, matPicked.type, payoutObj.Amount);

            return theMat;
        }

        /**
         * This function rolls and drops a random item matching ``payoutObj`` rarity specs.
         * @param {object} payoutObj JSON Reward object
         * @param {object} user UserData DB Object
         * @param {object} interaction Base Discord Interaction Object
         * @returns {Promise <object>}
         */
        async function handleItemDrop(payoutObj, user, interaction){
            const {gearDrops} = interaction.client;

            const dropPool = [];
            for (const [id, rarID] of gearDrops){
                if (rarID === payoutObj.Extra) dropPool.push(id);
            }

            const idPicked = randArrPos(dropPool);

            const theItem = await checkInboundItem(user.userid, idPicked, payoutObj.Amount);

            return theItem;
        }

        /**
         * This function creates a new potion entry if one is not found, 
         * it then updates the entry amount based on the amount given.
         * @param {object} bpObj Full Blueprint Object Container
         * @param {number} amount Amount to Drop
         * @param {object} interaction Base Discord Interaction Object
         * @returns {Promise<object>}
         */
        async function handlePotionDrop(bpObj, amount, interaction){
            const bpCraft = bpObj.craft, bpEffect = bpObj.effect;
            let potion = await OwnedPotions.findOrCreate({
                where: {
                    name: bpCraft.Name,
                    spec_id: interaction.user.id
                }, 
                defaults: {
                    value: bpCraft.Cost,
                    activecategory: bpEffect.Type,
                    duration: bpEffect.Duration,
                    cooldown: bpEffect.Cooldown,
                    potion_id: bpCraft.PotionID,
                    blueprintid: bpCraft.BlueprintID
                }
            });

            if (potion[1]){
                await potion[0].save().then(async p => {return await p.reload()});
            }

            potion = potion[0];

            await potion.increment('amount', {by: amount}).then(async p => await p.save()).then(async p => {return await p.reload()});
            
            await checkHintPotionEquip(await grabUser(interaction.user.id), interaction);

            return potion;
        }

        /**
         * This function handles coin and xp rewards from the completed task
         * @param {object} task Active Type UserTasks DB Object
         * @param {object} user UserData DB Object
         * @param {object} payoutObj JSON Reward object
         * @param {object} interaction Base Discord Interaction Object
         * @returns {Promise <{name: string, value: string, inline: boolean}[]>}
         */
        async function handleTaskBasePayout(task, user, payoutObj, interaction){
            const diffMods = new Map([
                ["Baby", 10],
                ["Easy", 15],
                ["Medium", 20],
                ["Hard", 30],
                ["GodGiven", 75]
            ]);

            /**
             * This method calculates the xp to be paid given the conditions of the task
             * @param {number} diffMod Difficulty Modifier
             * @param {number} totalAmount Total task requested amount
             * @param {number} payoutMod ``payoutObj.Multiplier``
             * @param {number} rarity Rarity condition of the task, set to 1 if combat task
             * @returns {number}
             */
            const taskRewardXPScale = (diffMod, totalAmount, payoutMod, rarity) => {
                const scale = diffMod / (0.1 * (1 + rarity));
                const baseXP = totalAmount * scale;
                const finalXP = baseXP + (baseXP * payoutMod)
                return Math.floor(finalXP);
            };

            const taskRar = (task.tast_type === "Combat") ? 1 : task.condition;
            const xpGain = taskRewardXPScale(diffMods.get(task.task_difficulty), task.total_amount, payoutObj.Multiplier, taskRar);
            const coinGain = Math.floor(inclusiveRandNum(xpGain, xpGain * 0.25));

            await handleUserPayout(xpGain, coinGain, interaction, user);

            return [{name: "XP Gained: ", value: `${xpGain}`, inline: true}, {name: "COINS Gained: ", value: `${coinGain}c`, inline: true}];
        }

        /**
         * This function loads the final confirmation page before updating the selected task.
         * @param {object} task Active Type UserTasks DB Object
         * @param {object} user UserData DB Object
         * @param {object} fillCheckObj task details related to task status after filling the given task.
         * @returns {Promise <{description: string, color: string, fields: {name: string, value: string}[]}>}
         */
        async function handleConfirmActiveTaskFillDisplay(task, user, fillCheckObj){
            const returnDisplayObj = {description: "", color: "", fields: []};

            switch(fillCheckObj.status){
                case "Complete":
                    returnDisplayObj.description = 'Pressing confirm will consume the requested items from your inventory, which will complete the task!';
                    returnDisplayObj.color = 'Green';
                break;
                case "Partial":
                    returnDisplayObj.description = 'Pressing confirm will consume the requested items from your inventory, which will updated the task\'s progress but not complete it!';
                    returnDisplayObj.color = 'DarkGold';
                break;
                case "Incomplete":
                    returnDisplayObj.description = 'Pressing confirm will not consume any items from your inventory, nor will any progress be made!';
                    returnDisplayObj.color = 'DarkRed';
                break;
            }

            returnDisplayObj.description += '\nRewards will be automatically recieved upon completing a task!!';

            // Loading Field value
            const isCollectingTask = () => ['Fetch', 'Gather'].includes(task.task_type);
            const isMakingProgress = () => ['Complete', 'Partial'].includes(fillCheckObj.status);

            if (isCollectingTask() && isMakingProgress()){
                const fetchingItem = async (name) => {
                    return !!(await ItemLootPool.findOne({where: {name: name}}));
                };

                returnDisplayObj.description += `\n\nThese are the ${(await fetchingItem(task.name)) ? 'Items' : 'Materials'} that will be consumed: `;

                const isOwned = async (type) => {
                    switch(type){
                        case "Material": // Handle Material Checks
                        return await MaterialStore.findOne({where: {spec_id: user.userid, name: task.name}});
                        case "Item": // Handle Item Checks
                        return await ItemStrings.findOne({where: {user_id: user.userid, name: task.name}});
                    }
                };

                if (await fetchingItem(task.name)){
                    const theItem = await isOwned("Item");
                    const itemDisplayVals = uni_displayItem(theItem, "Single-Quest", fillCheckObj.amountChange);
                    returnDisplayObj.fields.push(itemDisplayVals.fields);
                } else {
                    const theMat = await isOwned("Material");
                    const matDisplayVals = uni_displaySingleMaterial(theMat, fillCheckObj.amountChange);
                    returnDisplayObj.fields.push(matDisplayVals.fields[0]);
                }
            }

            return returnDisplayObj;
        }

        /**
         * This function handles checking the given task for progress changes.
         * 
         * Returns any changes made, if task is complete, and the amount changing by.
         * @param {object} task Active Type UserTasks DB Object
         * @param {object} user UserData DB Object
         * @returns {Promise <{status: string, isComplete: boolean, amountChange: number}>}
         */
        async function handleActiveTaskFillDisplay(task, user){
            const progressObj = {status: "Incomplete", isComplete: false, amountChange: 0};

            const fetchingItem = async (name) => {
                return !!(await ItemLootPool.findOne({where: {name: name}}));
            };

            const isCollectingTask = () => ['Fetch', 'Gather'].includes(task.task_type);
            
            let fillingTaskWithAmount = 0;
            if (isCollectingTask()){
                const isOwned = async (type) => {
                    switch(type){
                        case "Material": // Handle Material Checks
                        return await MaterialStore.findOne({where: {spec_id: user.userid, name: task.name}});
                        case "Item": // Handle Item Checks
                        return await ItemStrings.findOne({where: {user_id: user.userid, name: task.name}});
                    }
                };

                const amountOwned = async (type) => {
                    return (await isOwned(type))?.amount ?? 0;
                };

                // Check if Fetch is item or material, Retrieve amount owned if owned, if not default return is 0
                fillingTaskWithAmount = (await fetchingItem(task.name)) 
                ? await amountOwned("Item") 
                : await amountOwned("Material");
            }

            // Compare if filling amount finishes tasks requested amount.
            progressObj.isComplete = task.amount + fillingTaskWithAmount >= task.total_amount;

            // Check change in progress
            if (progressObj.isComplete && isCollectingTask()){ // Task Complete, IS GATHER OR FETCH TYPE
                progressObj.amountChange = task.total_amount - task.amount;
            } else if (!progressObj.isComplete && isCollectingTask()){ // Task Incomplete, IS GATHER OR FETCH TYPE
                progressObj.amountChange = fillingTaskWithAmount;
            }

            if (progressObj.isComplete) progressObj.status = "Complete"; // TASK COMPLETE
            if (!progressObj.isComplete && isCollectingTask() && progressObj.amountChange > 0) progressObj.status = "Partial"; // NEW AMOUNT CHANGE BUT NOT COMPLETE

            return progressObj;
        }

        /**
         * This function loads the active tasks embed display pages,
         * it also loads an index matching task list for user selection.
         * @param {string} subCom Used with display loading, task status being viewed
         * @param {object[]} taskList UserTasks DB Object List
         * @returns {{embeds: EmbedBuilder[], tasks: object[]}}
         */
        function loadActiveTaskDisplayPages(subCom, taskList){
            const returnObj = {embeds: [], tasks: []};

            const taskTypes = ['Fetch', 'Gather', 'Combat', 'Craft'];
            // Sort tasks by type, ordered as defined above.
            taskList.sort((a, b) => taskTypes.indexOf(a.task_type) - taskTypes.indexOf(b.task_type));

            const timeOrderedTaskList = [];
            for (const type of taskTypes){
                const taskTypeList = taskList.filter(task => task.task_type === type);
                taskTypeList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                timeOrderedTaskList.push(...taskTypeList);
            }

            let taskTypeCounter = 1, currentTypeCheck = 'Fetch';
            for (const task of timeOrderedTaskList){
                // Reset Type counter to 1, as a new task type is being checked
                if (task.task_type !== currentTypeCheck){
                    currentTypeCheck = task.task_type;
                    taskTypeCounter = 1;
                }

                const taskCreatedAt = new Date(task.createdAt).getTime();

                const embed = new EmbedBuilder()
                .setTitle(`== ${makeCapital(subCom)} ${currentTypeCheck} Task #${taskTypeCounter} ==`)
                .setDescription(`Task Started: <t:${Math.floor(taskCreatedAt / 1000)}:f>`)
                .addFields(loadBaseTaskFields(task, subCom));

                returnObj.embeds.push(embed);
                returnObj.tasks.push(task);

                taskTypeCounter++;
            }

            return returnObj;
        }

        /**
         * This function handles loading, displaying, and managing page change interactivity,
         * for the given ``taskList``. 
         * @param {object} interaction Discord Interaction Object
         * @param {string} subCom Used with display loading, task status being viewed
         * @param {object[]} taskList UserTasks DB Object List
         */
        async function handleInactiveTaskCore(interaction, subCom, taskList){
            const navMenu = {
                curPage: 0,
                lastPage: 0,
                embedPages: loadInactiveTaskDisplayPages(subCom, taskList)
            };

            navMenu.lastPage = navMenu.embedPages.length - 1;

            const pageButtRow = new ActionRowBuilder().addComponents(createBasicPageButtons("Primary"));

            const replyObj = {embeds: [navMenu.embedPages[0]], components: [pageButtRow]};

            const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, "Reply");

            // =====================
            // BUTTON COLLECTOR
            collector.on('collect', async c => {
                await c.deferUpdate().then(async () => {
                    switch(c.customId){
                        case "next-page":
                            navMenu.curPage = (navMenu.curPage === navMenu.lastPage) ? 0 : navMenu.curPage + 1;
                        break;
                        case "back-page":
                            navMenu.curPage = (navMenu.curPage === 0) ? navMenu.lastPage : navMenu.curPage - 1;
                        break;
                        case "cancel":
                        return collector.stop('Canceled');
                    }
                    await anchorMsg.edit({embeds: [navMenu.embedPages[navMenu.curPage]], components: [pageButtRow]});
                }).catch(e => console.error(e));
            });
            // =====================

            // =====================
            // BUTTON COLLECTOR
            collector.on('end', async (c, r) => {
                if (!r || r === 'time') await handleCatchDelete(anchorMsg);

                await handleCatchDelete(anchorMsg);
            });
            // =====================
        }

        /**
         * This function loads the embed page list for the given taskList.
         * @param {string} subCom Used with display loading, task status being viewed
         * @param {object[]} taskList UserTasks DB Object List
         * @returns {EmbedBuilder[]}
         */
        function loadInactiveTaskDisplayPages(subCom, taskList){
            const taskTypes = ['Fetch', 'Gather', 'Combat', 'Craft'];
            // Sort tasks by type, ordered as defined above.
            taskList.sort((a, b) => taskTypes.indexOf(a.task_type) - taskTypes.indexOf(b.task_type));

            const timeOrderedTaskList = [];
            for (const type of taskTypes){
                const taskTypeList = taskList.filter(task => task.task_type === type);
                taskTypeList.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
                timeOrderedTaskList.push(...taskTypeList);
            }

            const finalEmbeds = [];
            let taskTypeCounter = 1, currentTypeCheck = 'Fetch';
            for (const task of timeOrderedTaskList){
                // Reset Type counter to 1, as a new task type is being checked
                if (task.task_type !== currentTypeCheck){
                    currentTypeCheck = task.task_type;
                    taskTypeCounter = 1;
                }

                const lastUpdated = new Date(task.updatedAt).getTime();


                const embed = new EmbedBuilder()
                .setTitle(`== ${makeCapital(subCom)} ${currentTypeCheck} Task #${taskTypeCounter} ==`)
                .setDescription(`${makeCapital(subCom)}: <t:${Math.floor(lastUpdated / 1000)}:f>`)
                .addFields(loadBaseTaskFields(task, subCom));

                finalEmbeds.push(embed);

                taskTypeCounter++;
            }

            return finalEmbeds;
        }

        /**
         * This function loads the field value for the given inactive task, based on the tasks type.
         * @param {object} task UserTasks DB Object
         * @param {string} status Given tasks active status
         * @returns {[{name: string, value: string}]}
         */
        function loadBaseTaskFields(task, status){
            const fieldObj = {name: "", value: ""};
            switch(task.task_type){
                case "Fetch":
                    fieldObj.name = "Fetch Request: ";
                    fieldObj.value = `Difficulty: **${task.task_difficulty}**\nName: **${task.name}**\nRarity: **${baseCheckRarName(task.condition)}**\nRequested Amount: **${task.total_amount}**`;
                break;
                case "Gather":
                    fieldObj.name = "Material Requested: ";
                    fieldObj.value = `Difficulty: **${task.task_difficulty}**\nMaterial Name: **${task.name}**\nRarity: **${baseCheckRarName(task.condition)}**\nRequested Amount: **${task.total_amount}**`;
                break;
                case "Combat":
                    fieldObj.name = "Enemies To Kill: ";
                    fieldObj.value = `Difficulty: **${task.task_difficulty}**\nEnemy Level: **${task.condition}**+\nRequested Amount: **${task.total_amount}**`;
                break;
                case "Craft":
                    fieldObj.name = "Requested Crafts: ";
                    fieldObj.value = `Difficulty: **${task.task_difficulty}**\nCraft Slot: **${task.name}**\nRarity: **${baseCheckRarName(task.condition)}**\nRequested Amount: **${task.total_amount}**`;
                break;
            }

            if (status === 'active'){
                fieldObj.value += `\nCurrent Amount Progress: **${task.amount}**`; // Adding current Progress of active task
            } else fieldObj.value += `\nFinal Amount Progress: **${task.amount}**`; // Adding total Progress of inactive task

            return [fieldObj];
        }

        // /**
        //  * This function handles loading the given users task list, 
        //  * then filters it for the given ``taskStatus`` and ``taskType`` if !"All"
        //  * @param {object} user UserData DB Object
        //  * @param {string} taskStatus One of: ``complete``, ``failed``, ``active``
        //  * @param {string} taskType One of: ``Fetch``, ``Gather``, ``Combat``, ``Craft``. Default: ``All``
        //  * @returns {Promise <object[] | string>}
        //  */
        // async function grabUserTaskList(user, taskStatus, taskType="All"){
        //     const userTaskList = await UserTasks.findAll({where: {userid: user.userid}});
        //     if (userTaskList.length === 0) return "No Tasks";

        //     let filteredTaskList;
        //     switch(taskStatus){
        //         case "complete":
        //             filteredTaskList = userTaskList.filter(task => task.complete);
        //         break;
        //         case "failed":
        //             filteredTaskList = userTaskList.filter(task => task.failed);
        //         break;
        //         case "active":
        //             filteredTaskList = userTaskList.filter(task => !task.failed && !task.complete);
        //         break;
        //     }
        //     if (filteredTaskList.length === 0) return "No Tasks Match";


        //     const matchTaskType = (task, type) => {
        //         return task.task_type === type;
        //     };

        //     if (taskType !== 'All') {
        //         filteredTaskList = filteredTaskList.filter(task => matchTaskType(task, taskType));
        //         if (filteredTaskList.length === 0) return "No Type Tasks Match";
        //     }

        //     return filteredTaskList;
        // }




        // if (subComGroup === 'tasks'){
            
        //     console.log('Task SubcommandGroup Entered!');

        //     if (interaction.options.getSubcommand() === 'complete'){
        //         // Gather Complete Tasks
        //         // UserTasks.findAll
        //         const completeList = await UserTasks.findAll({where: {userid: user.userid, complete: true}});
        //         if (completeList.length <= 0) return await interaction.reply('No completed tasks found! Use ``/view tasks active`` to see all current tasks you have not completed!');
    
        //         let embedPages = [];
        //         const pageCounter = {
        //             fetch: 1,
        //             combat: 1,
        //             gather: 1,
        //             craft: 1
        //         };
        //         for (const task of completeList){
        //             const embed = new EmbedBuilder()
        //             .setTitle(generateTitle(task, pageCounter))
        //             .setDescription(`Completed on: ${task.updatedAt}`)
        //             .addFields(generateDisplayFields(task, false));
        //             embedPages.push(embed);
        //         }
                
        //         console.log(`Completed Tasks Pages to display: ${embedPages.length}`);
        //         handleEmbedPages(embedPages, false);
        //     }
    
        //     if (interaction.options.getSubcommand() === 'active'){
        //         // Gather Active Tasks
        //         // UserTasks.findAll
        //         const activeList = await UserTasks.findAll({where: {userid: user.userid, complete: false, failed: false}});
        //         if (activeList.length <= 0) return await interaction.reply('No active tasks found! After speaking to an NPC and accepting their task, it will show up here!');
                
        //         let embedPages = [];
        //         const pageCounter = {
        //             fetch: 1,
        //             combat: 1,
        //             gather: 1,
        //             craft: 1
        //         };
        //         for (const task of activeList){
        //             const embed = new EmbedBuilder()
        //             .setTitle(generateTitle(task, pageCounter))
        //             .setDescription(`Started on: ${task.createdAt}`)
        //             .addFields(generateDisplayFields(task, true));
        //             embedPages.push(embed);
        //         }
    
        //         console.log(`Active Tasks Pages to display: ${embedPages.length}`);
        //         handleEmbedPages(embedPages, true, activeList);
        //     }
    
        //     if (interaction.options.getSubcommand() === 'failed'){
        //         // Gather Failed Tasks
        //         // UserTasks.findAll
        //         const failedList = await UserTasks.findAll({where: {userid: user.userid, failed: true}});
        //         if (failedList.length <= 0) return await interaction.reply('No failed tasks found! Congrats!! You have yet to fail a task! **Make sure to pay attention to the time limit if you wish to avoid seeing tasks here!!**');
            
        //         let embedPages = [];
        //         const pageCounter = {
        //             fetch: 1,
        //             combat: 1,
        //             gather: 1,
        //             craft: 1
        //         };
        //         for (const task of activeList){
        //             const embed = new EmbedBuilder()
        //             .setTitle(generateTitle(task, pageCounter))
        //             .setDescription(`Failed on: ${task.updatedAt}`)
        //             .addFields(generateDisplayFields(task, true));
        //             embedPages.push(embed);
        //         }
                
        //         console.log(`Failed Tasks Pages to display: ${embedPages.length}`);
        //         handleEmbedPages(embedPages, false);
        //     }
        // }
        
        // async function checkUser(){
        //     const uCheck = await UserData.findOne({where: {userid: interaction.user.id}});
        //     if (!uCheck) return "No User";
        //     return uCheck;
        // }
        
        // function generateDisplayFields(taskObj, isActive, madeProgress){
        //     let fieldName = '', fieldValue = '', fieldObj = {};
            
        //     switch(taskObj.task_type){
        //         case "Fetch":
        //             fieldName = "Fetch Request: ";
        //             fieldValue = `Difficulty: ${taskObj.task_difficulty}\nName: ${taskObj.name}\nRarity: ${grabRarNameFromID(taskObj.condition)}\nAmount: ${taskObj.total_amount}`;
        //             break;
        //         case "Combat":
        //             fieldName = "Enemies To Kill: ";
        //             fieldValue = `Difficulty: ${taskObj.task_difficulty}\nLevel: ${taskObj.condition}+\nAmount: ${taskObj.total_amount}`;
        //             break;
        //         case "Gather":
        //             fieldName = "Material Requested: ";
        //             fieldValue = `Difficulty: ${taskObj.task_difficulty}\nName: ${taskObj.name}\nRarity: ${grabRarNameFromID(taskObj.condition)}\nAmount: ${taskObj.total_amount}`;
        //             break;
        //         case "Craft":
                    
        //             break;
        //     }

        //     if (isActive && !madeProgress) fieldValue += `\nProgress: ${taskObj.amount}`;
            
        //     if (isActive && madeProgress){
        //         if (madeProgress.status === "Complete"){
        //             fieldValue += `\nNew Progress: ${taskObj.total_amount}`; 
        //         } else if (madeProgress.status === "Partial"){
        //             fieldValue += `\nNew Progress: ${(taskObj.amount + madeProgress.has)}`; 
        //         } else if (madeProgress.status === "Incomplete"){
        //             fieldValue += `\nCurrent Progress: ${taskObj.amount}`;
        //         }
        //     } 
            
        //     fieldObj = {name: fieldName, value: fieldValue};
        //     const finalFields = [fieldObj];
        //     return finalFields;
        // }

        // function generateTitle(taskObj, pageCounter){
        //     let embedTitle = "";
                    
        //     switch(taskObj.task_type){
        //         case "Fetch":
        //             embedTitle = `Fetch Task #${pageCounter.fetch}`;
        //             pageCounter.fetch++;
        //         break;
        //         case "Combat":
        //             embedTitle = `Combat Task #${pageCounter.combat}`;
        //             pageCounter.combat++;
        //         break;
        //         case "Gather":
        //             embedTitle = `Gather Task #${pageCounter.gather}`;
        //             pageCounter.gather++;
        //         break;
        //         case "Craft":
        //             embedTitle = `Craft Task #${pageCounter.craft}`;
        //             pageCounter.craft++;
        //         break;
        //     }
        //     return embedTitle;
        // }

        // function grabRarNameFromID(rarID){
        //     const rarityList = ["Common", "Uncommon", "Rare", "Very Rare", "Epic", "Mystic", "?", "??", "???", "????", "FORGOTTEN"];
        //     return rarityList[rarID];
        // }

        // async function handleEmbedPages(embedPages, isActive, taskList){
        //     const backButton = new ButtonBuilder()
		// 		.setLabel("Back")
		// 		.setStyle(ButtonStyle.Secondary)
		// 		.setEmoji('◀️')
		// 		.setCustomId('back-page');

		// 	const cancelButton = new ButtonBuilder()
		// 		.setLabel("Cancel")
		// 		.setStyle(ButtonStyle.Secondary)
		// 		.setEmoji('*️⃣')
		// 		.setCustomId('cancel');

		// 	const forwardButton = new ButtonBuilder()
		// 		.setLabel("Forward")
		// 		.setStyle(ButtonStyle.Secondary)
		// 		.setEmoji('▶️')
		// 		.setCustomId('next-page');

        //     const actionButton = new ButtonBuilder()
        //         .setLabel("Fill Request")
        //         .setStyle(ButtonStyle.Success)
        //         .setEmoji('✅')
        //         .setCustomId('action-button');

		// 	const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

        //     if (isActive) interactiveButtons.addComponents(actionButton);

		// 	const embedMsg = await interaction.reply({ components: [interactiveButtons], embeds: [embedPages[0]] });

		// 	const filter = (i) => i.user.id === interaction.user.id;

		// 	const collector = embedMsg.createMessageComponentCollector({
		// 		componentType: ComponentType.Button,
		// 		filter,
		// 		time: 120000,
		// 	});

		// 	let currentPage = 0;
        //     collector.on('collect', async COI => {
        //         if (COI.customId === 'next-page') {
		// 			await COI.deferUpdate().then(async () => {
		// 				if (currentPage === embedPages.length - 1) {
		// 					currentPage = 0;
		// 				} else currentPage += 1;
		// 				await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
		// 			}).catch(error => {
		// 				console.error(error);
		// 			});
		// 		}

		// 		if (COI.customId === 'back-page') {
		// 			await COI.deferUpdate().then(async () => {
		// 				if (currentPage === 0) {
		// 					currentPage = embedPages.length - 1;
		// 				} else currentPage -= 1;
		// 				await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
		// 			}).catch(error => {
		// 				console.error(error);
		// 			});
		// 		}

		// 		if (COI.customId === 'cancel') {
		// 			collector.stop();
		// 		}

        //         if (COI.customId === 'action-button'){
        //             // Preform Request fill if possible!
        //             const result = await attemptTaskFill(taskList[currentPage]);
        //             //console.log(result);
                    
        //             let responseTitle = " ";
        //             let responseColour = "DarkButNotQuiteBlack";
        //             let responseDesc = "Task rewards recieved upon pressing confirm!";
        //             const madeProgress = result;
        //             switch(result.status){
        //                 case "Complete":
        //                     // Task can be completed, or is complete
        //                     if (!result.has){
        //                         // Combat Task Completed
        //                         responseTitle = "Combat Task Complete!";
        //                         responseColour = "Green";
        //                     } else {
        //                         responseTitle = `${taskList[currentPage].task_type} Task Complete!`;
        //                         responseColour = "Yellow";
        //                         responseDesc = 'Pressing confirm will consume the requested items from your inventory and complete the task, rewards will be recevied simultaneously';
        //                     }
        //                 break;
        //                 case "Incomplete":
        //                     // Task makes no completion progress
        //                     responseTitle = "No New Progress Made!";
        //                     responseColour = "Red";
        //                     responseDesc = "Pressing confirm will not consume any items, nor will it make any task progress. You do not have anything needed for task progression in your inventory!";
        //                 break;
        //                 case "Partial":
        //                     // Task makes partial progress
        //                     responseTitle = "Task Progress Made!";
        //                     responseColour = "Yellow";
        //                     responseDesc = "Pressing confirm will consume the requested items from your inventory, the task will remain partially incomplete. Rewards will be recevied upon full completion!";
        //                 break;
        //                 case "Dupe":
        //                     // Task was already complete, preventing dupe rewards
        //                     responseTitle = "TASK FOUND ALREADY COMPLETE";
        //                     responseColour = "White";
        //                     responseDesc = "You have already completed this task!! Please use ``/view task active`` for an updated list, or use ``/view task complete`` to see this task as is.";
        //                     collector.stop();
        //                 return;
        //             }

        //             const respConfirmButton = new ButtonBuilder()
        //                 .setLabel('Confirm')
        //                 .setStyle(ButtonStyle.Success)
        //                 .setEmoji('✅')
        //                 .setCustomId('comp-confirm');

        //             const respCancelButton = new ButtonBuilder()
        //                 .setLabel('Cancel')
        //                 .setStyle(ButtonStyle.Danger)
        //                 .setEmoji('❌')
        //                 .setCustomId('comp-cancel');

        //             const respButtonRow = new ActionRowBuilder().addComponents(respConfirmButton, respCancelButton);

        //             const responseEmbed = new EmbedBuilder()
        //             .setTitle(responseTitle)
        //             .setColor(responseColour)
        //             .setDescription(responseDesc)
        //             .addFields(generateDisplayFields(taskList[currentPage], true, madeProgress));
                    
        //             const respEmbedMsg = await interaction.followUp({embeds: [responseEmbed], components: [respButtonRow]});

        //             const respCollector = respEmbedMsg.createMessageComponentCollector({
        //                 componentType: ComponentType.Button,
        //                 filter,
        //                 time: 120000,
        //             });

        //             respCollector.on('collect', async RCOI => {
        //                 if (RCOI.customId === 'comp-confirm'){
        //                     // Procced with task updates
        //                     if (result.status === "Incomplete") return respCollector.stop();
        //                     const finalOutcome = await handleTaskProgress(taskList[currentPage], madeProgress);
        //                     //console.log(finalOutcome);
        //                     if (finalOutcome !== "Finished") {
        //                         await RCOI.reply({content: "Something went wrong while updating the database!", ephemeral: true});
        //                         await respCollector.stop();
        //                     } else {
        //                         const finalEmbed = {
        //                             title: "Task Updated!",
        //                             color: 0o0,
        //                         };
        //                         await RCOI.reply({embeds: [finalEmbed], ephemeral: true}).then(msgSent => setTimeout(() =>{
        //                             msgSent.delete();
        //                         }, 25000)).catch(e => console.error(e));
        //                         await respCollector.stop();
        //                     }
        //                 }

        //                 if (RCOI.customId === 'comp-cancel'){
        //                     // Canceled, Do nothing
        //                     await respCollector.stop();
        //                 }
        //             });

        //             respCollector.on('end', () => {
        //                 respEmbedMsg.delete().catch(error => {
        //                     if (error.code !== 10008) {
        //                         console.error('Failed to delete the message:', error);
        //                     }
        //                 });
        //             });
        //         }
        //     });

        //     collector.on('end', () => {
        //         embedMsg.delete().catch(error => {
        //             if (error.code !== 10008) {
        //                 console.error('Failed to delete the message:', error);
        //             }
        //         });
        //     });
        // }

        // async function handleTaskProgress(taskObj, progressObj){
        //     if (progressObj.status === "Complete" && !progressObj.has) {
        //         //Combat, Complete
        //         const tableUpdate = await taskObj.update({complete: true, amount: taskObj.total_amount});
        //         if (tableUpdate) {
        //             await taskObj.save();
        //             const userInc = await user.increment("tasks_complete");
        //             if (userInc) await user.save();
        //             await handleRewardPayout(taskObj);
        //             return "Finished";
        //         } else return "Failure: 1";
        //     }

        //     let userEntry;
        //     let isItem = false;
        //     const checkItem = lootList.filter(item => item.Name === taskObj.name);
        //     if (checkItem.length === 1){
        //         isItem = true;
        //         userEntry = await LootStore.findOne({where: {spec_id: user.userid, name: taskObj.name}});
        //     } else if (checkItem.length <= 0){
        //         userEntry = await MaterialStore.findOne({where: {spec_id: user.userid, name: taskObj.name}});
        //     } else return "Failure: 2";

        //     if (!userEntry) return "Failure: 3";

        //     let amountRemove = 0;
        //     if (taskObj.amount !== 0){
        //         amountRemove = taskObj.total_amount - taskObj.amount;
        //     } else amountRemove = taskObj.total_amount;

        //     if (amountRemove >= userEntry.amount){
        //         const entryDestroyed = await userEntry.destroy();
        //         if (isItem && entryDestroyed){
        //             await user.decrement('totitem');
        //             await user.save();
        //             //return "Finished";
        //         } else if (!isItem && entryDestroyed){
        //             //return "Finished";
        //         } else return "Failure: 4";
        //     } else {
        //         const tableUpdate = await userEntry.decrement('amount', {by: amountRemove});
        //         if (tableUpdate){
        //             await userEntry.save();
        //             //return "Finished";
        //         } else return "Failure: 5";
        //     }

        //     if (progressObj.status === "Complete"){
        //         const taskUpdate = await taskObj.update({complete: true, amount: taskObj.total_amount});
        //         if (taskUpdate){
        //             await taskObj.save();
        //             const userInc = await user.increment("tasks_complete");
        //             if (userInc) await user.save();
        //             await handleRewardPayout(taskObj);
        //             return "Finished";
        //         } else return "Failure: 6";
        //     } else {
        //         const inc = await taskObj.increment('amount', {by: progressObj.has});
        //         if (inc){
        //             await taskObj.save();
        //             return "Finished";
        //         } else return "Failure: 7";
        //     }
        // }

        // async function attemptTaskFill(taskObj){
        //     //console.log(taskObj);
        //     const dupeFillCheck = await UserTasks.findOne({where: {taskid: taskObj.taskid}});

        //     // if (dupeFillCheck.complete) return {status: "Dupe"};

        //     if (dupeFillCheck.complete === 1) return {status: "Dupe"};


        //     if (taskObj.name === 'None') return (taskObj.total_amount <= taskObj.amount) ? {status: "Complete"}:{status: "Incomplete"};

        //     const checkItem = lootList.filter(item => item.Name === taskObj.name);
        //     if (checkItem.length === 1){
        //         // Is Item
        //         const userItem = await LootStore.findOne({where: {spec_id: user.userid, name: taskObj.name}});
        //         if (!userItem) return {status: "Incomplete", has: 0};
        //         if (userItem.amount >= taskObj.total_amount || userItem.amount >= (taskObj.total_amount - taskObj.amount))return {status: "Complete", has: userItem.amount}; // User has enough of item to complete task request!
        //         return {status: "Partial", has: userItem.amount};
        //     } else if (checkItem.length <= 0){
        //         // Is Material
        //         const userMat = await MaterialStore.findOne({where: {spec_id: user.userid, name: taskObj.name}});
        //         if (!userMat) return {status: "Incomplete", has: 0};
        //         if (userMat.amount >= taskObj.total_amount || userMat.amount >= (taskObj.total_amount - taskObj.amount)) return {status: "Complete", has: userMat.amount};
        //         return {status: "Partial", has: userMat.amount};
        //     }
        // }

        // async function handleRewardPayout(taskObj){
        //     const rewardCaste = npcRewardCaste.filter(caste => caste.Rated === taskObj.task_difficulty);
        //     const reapPicked = randArrPos(rewardCaste[0].Options);
        //     //console.log(reapPicked);
            
        //     let finalResult;
        //     switch(reapPicked.Contents.Type){
        //         case "Potion":
        //             finalResult = await handlePotionReward(reapPicked);
        //         break;
        //         case "Item":
        //             finalResult = await handleItemReward(reapPicked);
        //         break;
        //         case "Material":
        //             finalResult = await handleMaterialReward(reapPicked);
        //         break;
        //     }

        //     if (finalResult.status !== "Complete") return "Reward Error: " + finalResult.status;
            
        //     //console.log(finalResult);
        //     // XP && Gold reward here!
        //     const rateScale = new Map();

        //     rateScale.set("Baby", 10);
        //     rateScale.set("Easy", 15);
        //     rateScale.set("Medium", 20);
        //     rateScale.set("Hard", 30);
        //     rateScale.set("GodGiven", 75);

        //     /**
        //      * 
        //      * @param {number} diffScale Grabbed from rateScale Map() 
        //      * @param {number} amountTotal Total Amount requested for task completetion
        //      * @param {number} multiplier Task Rated Scaler
        //      * @param {number} rarScale Rarity of requested items/materials || 1 if combat
        //      */            
        //     const xpCalc = (diffScale, amountTotal, multiplier, rarScale) => {
        //         let intitalScale = (diffScale / (0.1 * (rarScale === 0) ? 1 : rarScale)) * amountTotal;
        //         intitalScale += intitalScale * multiplier;
        //         intitalScale = Math.round(intitalScale);
        //         return intitalScale;
        //     };
            
        //     const scaleOne = rateScale.get(taskObj.task_difficulty);
        //     const xpGained = xpCalc(scaleOne, taskObj.total_amount, reapPicked.Contents.Multiplier, (taskObj.task_type === "Combat") ? 1 : taskObj.condition);
        //     const coinGained = Math.abs(Math.floor(Math.random() * (xpGained - (xpGained - 50) + 1) + (xpGained - 50)));
            
        //     await isLvlUp(xpGained, coinGained, interaction, user);

        //     let embedTitle = `**${taskObj.task_difficulty} ${taskObj.task_type} Rewards:**`;
        //     let embedDesc = ``;

        //     let fieldName = '', fieldValue = '', fieldObj = {};
        //     const finalFields = [];

        //     switch(reapPicked.Contents.Type){
        //         case "Potion":
        //             // INSTANCE finalResult.instance
        //             embedDesc = `You recieved **Potions**!! You can find them by using the command \`\`/myloot potions\`\`. Details listed below: `;
        //             fieldName = `Name: **${finalResult.instance.name}**`;
        //             fieldValue = `Value: **${finalResult.instance.value}**\nCooldown: **${finalResult.instance.cooldown}**\nDuration: **${finalResult.instance.duration}**\nAmount Acquired: **${reapPicked.Contents.Amount}**`;
        //             fieldObj = {name: fieldName, value: fieldValue};
        //         break;
        //         case "Item":
        //             // RAW finalResult.raw
        //             embedDesc = `You recieved **Items**!! You can find them by using the command \`\`/myloot gear\`\`. Details listed below: `;
        //             fieldName = `Name: **${finalResult.raw.Name}**`;
        //             fieldValue = loadItemFieldValues(finalResult.raw) + `\nAmount Acquired: **${reapPicked.Contents.Amount}**`;
        //             fieldObj = {name: fieldName, value: fieldValue};
        //         break;
        //         case "Material":
        //             // INSTANCE finalResult.instance
        //             embedDesc = `You recieved **Materials**!! You can find them by using the command \`\`/myloot material\`\`. Details listed below: `;
        //             fieldName = `Name: **${finalResult.instance.name}**`;
        //             fieldValue = `Value: **${finalResult.instance.value}**\nType: **${finalResult.instance.mattype}**\nRarity: **${finalResult.instance.rarity}**\nAmount Acquired: **${reapPicked.Contents.Amount}**`
        //             fieldObj = {name: fieldName, value: fieldValue};
        //         break;
        //     }

        //     finalFields.push(fieldObj);
        //     finalFields.push({name: "Xp Gained: ", value: `${xpGained}`});
        //     finalFields.push({name: "Coins Gained: ", value: `${coinGained}c`});
            
        //     // Create Reward Display Here!
        //     const rewardEmbed = new EmbedBuilder()
        //     .setTitle(embedTitle)
        //     .setColor('DarkNavy')
        //     .setDescription(embedDesc)
        //     .addFields(finalFields);

        //     return await interaction.followUp({embeds: [rewardEmbed]}).then(eMsg => setTimeout(() => {
        //         eMsg.delete();
        //     }, 60000)).catch(e=>console.error(e));
        // }

        // function loadItemFieldValues(fabItem){
        //     let returnString = `Value: **${fabItem.Value}**c\nType: **${fabItem.Type}**\nSlot: **${fabItem.Slot}**\nRarity: **${fabItem.Rarity}**`;
        //     switch(fabItem.Slot){
        //         case "Mainhand":
        //             returnString += `\nHands: **${fabItem.Hands}**\nAttack: **${fabItem.Attack}**`;
        //         break;
        //         case "Offhand":
        //             returnString += `\nHands: **${fabItem.Hands}**\nAttack: **${fabItem.Attack}**\nDefence: **${fabItem.Defence}**`;
        //         break;
        //         case "Headslot":
        //             returnString += `\nDefence: **${fabItem.Defence}**`;
        //         break;
        //         case "Chestslot":
        //             returnString += `\nDefence: **${fabItem.Defence}**`;
        //         break;
        //         case "Legslot":
        //             returnString += `\nDefence: **${fabItem.Defence}**`;
        //         break;
        //     }

        //     return returnString;
        // }

        // async function handlePotionReward(reapObj){
        //     let bluey = blueprintList.filter(bluey => bluey.Name === reapObj.Contents.Name);
        //     bluey = bluey[0];

        //     let potCheck = await OwnedPotions.findOne({where: {spec_id: user.userid, name: reapObj.Contents.Name}});
        //     if (!potCheck) {
        //         // Create potion
        //         potCheck = await OwnedPotions.create({
        //             name: reapObj.Contents.Name,
        //             value: bluey.CoinCost,
        //             activecategory: bluey.ActiveCategory,
        //             duration: bluey.Duration,
        //             cooldown: bluey.CoolDown,
        //             potion_id: bluey.PotionID,
        //             blueprintid: bluey.BlueprintID,
        //             amount: 0,
        //             spec_id: user.userid,
        //         });
        //     }

        //     if (!potCheck) return {status: "Failure: Potion"};
            
        //     // Increase Potion
        //     const inc = await potCheck.increment('amount', {by: reapObj.Contents.Amount});
        //     if (inc){
        //         await potCheck.save();
        //         return {status: "Complete", instance: potCheck};
        //     } else return {status: "Failure: Pot INC"};
        // }

        // async function handleItemReward(reapObj){
        //     const {gearDrops} = interaction.client;

        //     const keyList = [];
        //     for (const [key, value] of gearDrops){
        //         if (value === reapObj.Contents.Extra) keyList.push(key);
        //     }

        //     const pickedKey = randArrPos(keyList);
        //     let theItem = lootList.filter(item => item.Loot_id === pickedKey);
        //     theItem = theItem[0];
        //     const itemAddOutcome = await checkOwned(user, theItem, reapObj.Contents.Amount);
        //     if (itemAddOutcome !== "Finished") return {status: "Failure: Item"};
        //     return {status: "Complete", raw: theItem};
        // }

        // async function handleMaterialReward(reapObj){
        //     const {materialFiles} = interaction.client;

        //     const typeList = [];
        //     for (const [key, value] of materialFiles){
        //         typeList.push({type: key, file: value});
        //     }

        //     const pickedType = randArrPos(typeList);
        //     const passType = pickedType.type;
        //     const matFile = require(pickedType.file);

        //     let theMat = matFile.filter(mat => mat.Rar_id === reapObj.Contents.Extra);
        //     theMat = theMat[0];

        //     const materialAddOutcome = await handleMaterialAdding(theMat, reapObj.Contents.Amount, user, passType);
        //     if (!materialAddOutcome.name) return {status: "Failure: Material"};
        //     return {status: "Complete", instance: materialAddOutcome};
        // }
	},
};
