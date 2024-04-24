const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType, ActionRowBuilder } = require('discord.js');

const {UserTasks, Milestones, UserData, LocationData, MaterialStore, LootStore, OwnedPotions} = require('../../dbObjects.js');
const { checkUnlockedBiome } = require('./exported/locationFilters.js');
const { checkOwned } = require('./exported/createGear.js');
const {handleMaterialAdding} = require('./exported/materialDropper.js');

const npcRewardCaste = require('../../events/Models/json_prefabs/NPC_Prefabs/npcRewardCaste.json');
const lootList = require('../../events/Models/json_prefabs/lootList.json');
const blueprintList = require('../../events/Models/json_prefabs/blueprintList.json');
const { isLvlUp } = require('./exported/levelup.js');

const randArrPos = (arr) => {
    return arr[(arr.length > 1) ? Math.floor(Math.random() * arr.length) : 0];
};

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

        const user = await checkUser();
        if (user === "No User") return await interaction.reply('No userdata found, please use ``/start`` to make a profile!');

        const { betaTester } = interaction.client;

		if (!betaTester.has(interaction.user.id)) return await interaction.reply('This command is under construction!! It is currently only available to early access testers!');

        if (interaction.options.getSubcommandGroup() === 'quests'){
            
            console.log('Quest SubcommandGroup Entered!');

            if (interaction.options.getSubcommand() === 'story'){
                // Gather Story progress
                // Milestones.findOne
                if (interaction.user.id !== '501177494137995264') return await interaction.reply('This command is currently not available!');
            }
    
            if (interaction.options.getSubcommand() === 'hunting'){
                // Gather Hunting progress
                // LocationData.findOne
                const locData = await LocationData.findOne({where: {userid: user.userid}});
                if (!locData) return await interaction.reply('No unlocked locations found! You must first complete a "Location Quest" in order to unlock new locations! *Try this quest:*||Free Whitepool Woods from Bandits||');
                const unlockedBiomes = checkUnlockedBiome(locData);
                console.log(...unlockedBiomes);
            }
        }

        

        if (interaction.options.getSubcommandGroup() === 'tasks'){
            
            console.log('Task SubcommandGroup Entered!');

            if (interaction.options.getSubcommand() === 'complete'){
                // Gather Complete Tasks
                // UserTasks.findAll
                const completeList = await UserTasks.findAll({where: {userid: user.userid, complete: true}});
                if (completeList.length <= 0) return await interaction.reply('No completed tasks found! Use ``/view tasks active`` to see all current tasks you have not completed!');
    
                let embedPages = [];
                const pageCounter = {
                    fetch: 1,
                    combat: 1,
                    gather: 1,
                    craft: 1
                };
                for (const task of completeList){
                    const embed = new EmbedBuilder()
                    .setTitle(generateTitle(task, pageCounter))
                    .setDescription(`Completed on: ${task.updatedAt}`)
                    .addFields(generateDisplayFields(task, false));
                    embedPages.push(embed);
                }
                
                console.log(`Completed Tasks Pages to display: ${embedPages.length}`);
                handleEmbedPages(embedPages, false);
            }
    
            if (interaction.options.getSubcommand() === 'active'){
                // Gather Active Tasks
                // UserTasks.findAll
                const activeList = await UserTasks.findAll({where: {userid: user.userid, complete: false, failed: false}});
                if (activeList.length <= 0) return await interaction.reply('No active tasks found! After speaking to an NPC and accepting their task, it will show up here!');
                
                let embedPages = [];
                const pageCounter = {
                    fetch: 1,
                    combat: 1,
                    gather: 1,
                    craft: 1
                };
                for (const task of activeList){
                    const embed = new EmbedBuilder()
                    .setTitle(generateTitle(task, pageCounter))
                    .setDescription(`Started on: ${task.createdAt}`)
                    .addFields(generateDisplayFields(task, true));
                    embedPages.push(embed);
                }
    
                console.log(`Active Tasks Pages to display: ${embedPages.length}`);
                handleEmbedPages(embedPages, true, activeList);
            }
    
            if (interaction.options.getSubcommand() === 'failed'){
                // Gather Failed Tasks
                // UserTasks.findAll
                const failedList = await UserTasks.findAll({where: {userid: user.userid, failed: true}});
                if (failedList.length <= 0) return await interaction.reply('No failed tasks found! Congrats!! You have yet to fail a task! **Make sure to pay attention to the time limit if you wish to avoid seeing tasks here!!**');
            
                let embedPages = [];
                const pageCounter = {
                    fetch: 1,
                    combat: 1,
                    gather: 1,
                    craft: 1
                };
                for (const task of activeList){
                    const embed = new EmbedBuilder()
                    .setTitle(generateTitle(task, pageCounter))
                    .setDescription(`Failed on: ${task.updatedAt}`)
                    .addFields(generateDisplayFields(task, true));
                    embedPages.push(embed);
                }
                
                console.log(`Failed Tasks Pages to display: ${embedPages.length}`);
                handleEmbedPages(embedPages, false);
            }
        }
        
        async function checkUser(){
            const uCheck = await UserData.findOne({where: {userid: interaction.user.id}});
            if (!uCheck) return "No User";
            return uCheck;
        }
        
        function generateDisplayFields(taskObj, isActive, madeProgress){
            let fieldName = '', fieldValue = '', fieldObj = {};
            
            switch(taskObj.task_type){
                case "Fetch":
                    fieldName = "Fetch Request: ";
                    fieldValue = `Difficulty: ${taskObj.task_difficulty}\nName: ${taskObj.name}\nRarity: ${grabRarNameFromID(taskObj.condition)}\nAmount: ${taskObj.total_amount}`;
                    break;
                case "Combat":
                    fieldName = "Enemies To Kill: ";
                    fieldValue = `Difficulty: ${taskObj.task_difficulty}\nLevel: ${taskObj.condition}+\nAmount: ${taskObj.total_amount}`;
                    break;
                case "Gather":
                    fieldName = "Material Requested: ";
                    fieldValue = `Difficulty: ${taskObj.task_difficulty}\nName: ${taskObj.name}\nRarity: ${grabRarNameFromID(taskObj.condition)}\nAmount: ${taskObj.total_amount}`;
                    break;
                case "Craft":
                    
                    break;
            }

            if (isActive && !madeProgress) fieldValue += `\nProgress: ${taskObj.amount}`;
            
            if (isActive && madeProgress){
                if (madeProgress.status === "Complete"){
                    fieldValue += `\nNew Progress: ${taskObj.total_amount}`; 
                } else if (madeProgress.status === "Partial"){
                    fieldValue += `\nNew Progress: ${(taskObj.amount + madeProgress.has)}`; 
                } else if (madeProgress.status === "Incomplete"){
                    fieldValue += `\nCurrent Progress: ${taskObj.amount}`;
                }
            } 
            
            fieldObj = {name: fieldName, value: fieldValue};
            const finalFields = [fieldObj];
            return finalFields;
        }

        function generateTitle(taskObj, pageCounter){
            let embedTitle = "";
                    
            switch(taskObj.task_type){
                case "Fetch":
                    embedTitle = `Fetch Task #${pageCounter.fetch}`;
                    pageCounter.fetch++;
                break;
                case "Combat":
                    embedTitle = `Combat Task #${pageCounter.combat}`;
                    pageCounter.combat++;
                break;
                case "Gather":
                    embedTitle = `Gather Task #${pageCounter.gather}`;
                    pageCounter.gather++;
                break;
                case "Craft":
                    embedTitle = `Craft Task #${pageCounter.craft}`;
                    pageCounter.craft++;
                break;
            }
            return embedTitle;
        }

        function grabRarNameFromID(rarID){
            const rarityList = ["Common", "Uncommon", "Rare", "Very Rare", "Epic", "Mystic", "?", "??", "???", "????", "FORGOTTEN"];
            return rarityList[rarID];
        }

        async function handleEmbedPages(embedPages, isActive, taskList){
            const backButton = new ButtonBuilder()
				.setLabel("Back")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('◀️')
				.setCustomId('back-page');

			const cancelButton = new ButtonBuilder()
				.setLabel("Cancel")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('*️⃣')
				.setCustomId('cancel');

			const forwardButton = new ButtonBuilder()
				.setLabel("Forward")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('▶️')
				.setCustomId('next-page');

            const actionButton = new ButtonBuilder()
                .setLabel("Fill Request")
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅')
                .setCustomId('action-button');

			const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

            if (isActive) interactiveButtons.addComponents(actionButton);

			const embedMsg = await interaction.reply({ components: [interactiveButtons], embeds: [embedPages[0]] });

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				componentType: ComponentType.Button,
				filter,
				time: 120000,
			});

			let currentPage = 0;
            collector.on('collect', async COI => {
                if (COI.customId === 'next-page') {
					await COI.deferUpdate().then(async () => {
						if (currentPage === embedPages.length - 1) {
							currentPage = 0;
						} else currentPage += 1;
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					}).catch(error => {
						console.error(error);
					});
				}

				if (COI.customId === 'back-page') {
					await COI.deferUpdate().then(async () => {
						if (currentPage === 0) {
							currentPage = embedPages.length - 1;
						} else currentPage -= 1;
						await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
					}).catch(error => {
						console.error(error);
					});
				}

				if (COI.customId === 'cancel') {
					collector.stop();
				}

                if (COI.customId === 'action-button'){
                    // Preform Request fill if possible!
                    const result = await attemptTaskFill(taskList[currentPage]);
                    //console.log(result);
                    
                    let responseTitle = " ";
                    let responseColour = "DarkButNotQuiteBlack";
                    let responseDesc = "Task rewards recieved upon pressing confirm!";
                    const madeProgress = result;
                    switch(result.status){
                        case "Complete":
                            // Task can be completed, or is complete
                            if (!result.has){
                                // Combat Task Completed
                                responseTitle = "Combat Task Complete!";
                                responseColour = "Green";
                            } else {
                                responseTitle = `${taskList[currentPage].task_type} Task Complete!`;
                                responseColour = "Yellow";
                                responseDesc = 'Pressing confirm will consume the requested items from your inventory and complete the task, rewards will be recevied simultaneously';
                            }
                        break;
                        case "Incomplete":
                            // Task makes no completion progress
                            responseTitle = "No New Progress Made!";
                            responseColour = "Red";
                            responseDesc = "Pressing confirm will not consume any items, nor will it make any task progress. You do not have anything needed for task progression in your inventory!";
                        break;
                        case "Partial":
                            // Task makes partial progress
                            responseTitle = "Task Progress Made!";
                            responseColour = "Yellow";
                            responseDesc = "Pressing confirm will consume the requested items from your inventory, the task will remain partially incomplete. Rewards will be recevied upon full completion!";
                        break;
                        case "Dupe":
                            // Task was already complete, preventing dupe rewards
                            responseTitle = "TASK FOUND ALREADY COMPLETE";
                            responseColour = "White";
                            responseDesc = "You have already completed this task!! Please use ``/view task active`` for an updated list, or use ``/view task complete`` to see this task as is.";
                            collector.stop();
                        return;
                    }

                    const respConfirmButton = new ButtonBuilder()
                        .setLabel('Confirm')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅')
                        .setCustomId('comp-confirm');

                    const respCancelButton = new ButtonBuilder()
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                        .setCustomId('comp-cancel');

                    const respButtonRow = new ActionRowBuilder().addComponents(respConfirmButton, respCancelButton);

                    const responseEmbed = new EmbedBuilder()
                    .setTitle(responseTitle)
                    .setColor(responseColour)
                    .setDescription(responseDesc)
                    .addFields(generateDisplayFields(taskList[currentPage], true, madeProgress));
                    
                    const respEmbedMsg = await interaction.followUp({embeds: [responseEmbed], components: [respButtonRow]});

                    const respCollector = respEmbedMsg.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        filter,
                        time: 120000,
                    });

                    respCollector.on('collect', async RCOI => {
                        if (RCOI.customId === 'comp-confirm'){
                            // Procced with task updates
                            if (result.status === "Incomplete") return respCollector.stop();
                            const finalOutcome = await handleTaskProgress(taskList[currentPage], madeProgress);
                            //console.log(finalOutcome);
                            if (finalOutcome !== "Finished") {
                                await RCOI.reply({content: "Something went wrong while updating the database!", ephemeral: true});
                                await respCollector.stop();
                            } else {
                                const finalEmbed = {
                                    title: "Task Updated!",
                                    color: 0o0,
                                };
                                await RCOI.reply({embeds: [finalEmbed], ephemeral: true}).then(msgSent => setTimeout(() =>{
                                    msgSent.delete();
                                }, 25000)).catch(e => console.error(e));
                                await respCollector.stop();
                            }
                        }

                        if (RCOI.customId === 'comp-cancel'){
                            // Canceled, Do nothing
                            await respCollector.stop();
                        }
                    });

                    respCollector.on('end', () => {
                        respEmbedMsg.delete().catch(error => {
                            if (error.code !== 10008) {
                                console.error('Failed to delete the message:', error);
                            }
                        });
                    });
                }
            });

            collector.on('end', () => {
                embedMsg.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Failed to delete the message:', error);
                    }
                });
            });
        }

        async function handleTaskProgress(taskObj, progressObj){
            if (progressObj.status === "Complete" && !progressObj.has) {
                //Combat, Complete
                const tableUpdate = await taskObj.update({complete: true, amount: taskObj.total_amount});
                if (tableUpdate) {
                    await taskObj.save();
                    const userInc = await user.increment("tasks_complete");
                    if (userInc) await user.save();
                    await handleRewardPayout(taskObj);
                    return "Finished";
                } else return "Failure: 1";
            }

            let userEntry;
            let isItem = false;
            const checkItem = lootList.filter(item => item.Name === taskObj.name);
            if (checkItem.length === 1){
                isItem = true;
                userEntry = await LootStore.findOne({where: {spec_id: user.userid, name: taskObj.name}});
            } else if (checkItem.length <= 0){
                userEntry = await MaterialStore.findOne({where: {spec_id: user.userid, name: taskObj.name}});
            } else return "Failure: 2";

            if (!userEntry) return "Failure: 3";

            let amountRemove = 0;
            if (taskObj.amount !== 0){
                amountRemove = taskObj.total_amount - taskObj.amount;
            } else amountRemove = taskObj.total_amount;

            if (amountRemove >= userEntry.amount){
                const entryDestroyed = await userEntry.destroy();
                if (isItem && entryDestroyed){
                    await user.decrement('totitem');
                    await user.save();
                    //return "Finished";
                } else if (!isItem && entryDestroyed){
                    //return "Finished";
                } else return "Failure: 4";
            } else {
                const tableUpdate = await userEntry.decrement('amount', {by: amountRemove});
                if (tableUpdate){
                    await userEntry.save();
                    //return "Finished";
                } else return "Failure: 5";
            }

            if (progressObj.status === "Complete"){
                const taskUpdate = await taskObj.update({complete: true, amount: taskObj.total_amount});
                if (taskUpdate){
                    await taskObj.save();
                    const userInc = await user.increment("tasks_complete");
                    if (userInc) await user.save();
                    await handleRewardPayout(taskObj);
                    return "Finished";
                } else return "Failure: 6";
            } else {
                const inc = await taskObj.increment('amount', {by: progressObj.has});
                if (inc){
                    await taskObj.save();
                    return "Finished";
                } else return "Failure: 7";
            }
        }

        async function attemptTaskFill(taskObj){
            //console.log(taskObj);
            const dupeFillCheck = await UserTasks.findOne({where: {taskid: taskObj.taskid}});
            if (dupeFillCheck.complete) return {status: "Dupe"};

            if (taskObj.name === 'None') return (taskObj.total_amount <= taskObj.amount) ? {status: "Complete"}:{status: "Incomplete"};

            const checkItem = lootList.filter(item => item.Name === taskObj.name);
            if (checkItem.length === 1){
                // Is Item
                const userItem = await LootStore.findOne({where: {spec_id: user.userid, name: taskObj.name}});
                if (!userItem) return {status: "Incomplete", has: 0};
                if (userItem.amount >= taskObj.total_amount || userItem.amount >= (taskObj.total_amount - taskObj.amount))return {status: "Complete", has: userItem.amount}; // User has enough of item to complete task request!
                return {status: "Partial", has: userItem.amount};
            } else if (checkItem.length <= 0){
                // Is Material
                const userMat = await MaterialStore.findOne({where: {spec_id: user.userid, name: taskObj.name}});
                if (!userMat) return {status: "Incomplete", has: 0};
                if (userMat.amount >= taskObj.total_amount || userMat.amount >= (taskObj.total_amount - taskObj.amount)) return {status: "Complete", has: userMat.amount};
                return {status: "Partial", has: userMat.amount};
            }
        }

        async function handleRewardPayout(taskObj){
            const rewardCaste = npcRewardCaste.filter(caste => caste.Rated === taskObj.task_difficulty);
            const reapPicked = randArrPos(rewardCaste[0].Options);
            //console.log(reapPicked);
            
            let finalResult;
            switch(reapPicked.Contents.Type){
                case "Potion":
                    finalResult = await handlePotionReward(reapPicked);
                break;
                case "Item":
                    finalResult = await handleItemReward(reapPicked);
                break;
                case "Material":
                    finalResult = await handleMaterialReward(reapPicked);
                break;
            }

            if (finalResult.status !== "Complete") return "Reward Error: " + finalResult.status;
            
            //console.log(finalResult);
            // XP && Gold reward here!
            const rateScale = new Map();

            rateScale.set("Baby", 10);
            rateScale.set("Easy", 15);
            rateScale.set("Medium", 20);
            rateScale.set("Hard", 30);
            rateScale.set("GodGiven", 75);

            /**
             * 
             * @param {number} diffScale Grabbed from rateScale Map() 
             * @param {number} amountTotal Total Amount requested for task completetion
             * @param {number} multiplier Task Rated Scaler
             * @param {number} rarScale Rarity of requested items/materials || 1 if combat
             */            
            const xpCalc = (diffScale, amountTotal, multiplier, rarScale) => {
                let intitalScale = (diffScale / (0.1 * (rarScale === 0) ? 1 : rarScale)) * amountTotal;
                intitalScale += intitalScale * multiplier;
                intitalScale = Math.round(intitalScale);
                return intitalScale;
            };
            
            const scaleOne = rateScale.get(taskObj.task_difficulty);
            const xpGained = xpCalc(scaleOne, taskObj.total_amount, reapPicked.Contents.Multiplier, (taskObj.task_type === "Combat") ? 1 : taskObj.condition);
            const coinGained = Math.abs(Math.floor(Math.random() * (xpGained - (xpGained - 50) + 1) + (xpGained - 50)));
            
            await isLvlUp(xpGained, coinGained, interaction, user);

            let embedTitle = `**${taskObj.task_difficulty} ${taskObj.task_type} Rewards:**`;
            let embedDesc = ``;

            let fieldName = '', fieldValue = '', fieldObj = {};
            const finalFields = [];

            switch(reapPicked.Contents.Type){
                case "Potion":
                    // INSTANCE finalResult.instance
                    embedDesc = `You recieved **Potions**!! You can find them by using the command \`\`/myloot potions\`\`. Details listed below: `;
                    fieldName = `Name: **${finalResult.instance.name}**`;
                    fieldValue = `Value: **${finalResult.instance.value}**\nCooldown: **${finalResult.instance.cooldown}**\nDuration: **${finalResult.instance.duration}**\nAmount Acquired: **${reapPicked.Contents.Amount}**`;
                    fieldObj = {name: fieldName, value: fieldValue};
                break;
                case "Item":
                    // RAW finalResult.raw
                    embedDesc = `You recieved **Items**!! You can find them by using the command \`\`/myloot gear\`\`. Details listed below: `;
                    fieldName = `Name: **${finalResult.raw.Name}**`;
                    fieldValue = loadItemFieldValues(finalResult.raw) + `\nAmount Acquired: **${reapPicked.Contents.Amount}**`;
                    fieldObj = {name: fieldName, value: fieldValue};
                break;
                case "Material":
                    // INSTANCE finalResult.instance
                    embedDesc = `You recieved **Materials**!! You can find them by using the command \`\`/myloot material\`\`. Details listed below: `;
                    fieldName = `Name: **${finalResult.instance.name}**`;
                    fieldValue = `Value: **${finalResult.instance.value}**\nType: **${finalResult.instance.mattype}**\nRarity: **${finalResult.instance.rarity}**\nAmount Acquired: **${reapPicked.Contents.Amount}**`
                    fieldObj = {name: fieldName, value: fieldValue};
                break;
            }

            finalFields.push(fieldObj);
            finalFields.push({name: "Xp Gained: ", value: `${xpGained}`});
            finalFields.push({name: "Coins Gained: ", value: `${coinGained}c`});
            
            // Create Reward Display Here!
            const rewardEmbed = new EmbedBuilder()
            .setTitle(embedTitle)
            .setColor('DarkNavy')
            .setDescription(embedDesc)
            .addFields(finalFields);

            return await interaction.followUp({embeds: [rewardEmbed]}).then(eMsg => setTimeout(() => {
                eMsg.delete();
            }, 60000)).catch(e=>console.error(e));
        }

        function loadItemFieldValues(fabItem){
            let returnString = `Value: **${fabItem.Value}**c\nType: **${fabItem.Type}**\nSlot: **${fabItem.Slot}**\nRarity: **${fabItem.Rarity}**`;
            switch(fabItem.Slot){
                case "Mainhand":
                    returnString += `\nHands: **${fabItem.Hands}**\nAttack: **${fabItem.Attack}**`;
                break;
                case "Offhand":
                    returnString += `\nHands: **${fabItem.Hands}**\nAttack: **${fabItem.Attack}**\nDefence: **${fabItem.Defence}**`;
                break;
                case "Headslot":
                    returnString += `\nDefence: **${fabItem.Defence}**`;
                break;
                case "Chestslot":
                    returnString += `\nDefence: **${fabItem.Defence}**`;
                break;
                case "Legslot":
                    returnString += `\nDefence: **${fabItem.Defence}**`;
                break;
            }

            return returnString;
        }

        async function handlePotionReward(reapObj){
            let bluey = blueprintList.filter(bluey => bluey.Name === reapObj.Contents.Name);
            bluey = bluey[0];

            let potCheck = await OwnedPotions.findOne({where: {spec_id: user.userid, name: reapObj.Contents.Name}});
            if (!potCheck) {
                // Create potion
                potCheck = await OwnedPotions.create({
                    name: reapObj.Contents.Name,
                    value: bluey.CoinCost,
                    activecategory: bluey.ActiveCategory,
                    duration: bluey.Duration,
                    cooldown: bluey.CoolDown,
                    potion_id: bluey.PotionID,
                    blueprintid: bluey.BlueprintID,
                    amount: 0,
                    spec_id: user.userid,
                });
            }

            if (!potCheck) return {status: "Failure: Potion"};
            
            // Increase Potion
            const inc = await potCheck.increment('amount', {by: reapObj.Contents.Amount});
            if (inc){
                await potCheck.save();
                return {status: "Complete", instance: potCheck};
            } else return {status: "Failure: Pot INC"};
        }

        async function handleItemReward(reapObj){
            const {gearDrops} = interaction.client;

            const keyList = [];
            for (const [key, value] of gearDrops){
                if (value === reapObj.Contents.Extra) keyList.push(key);
            }

            const pickedKey = randArrPos(keyList);
            let theItem = lootList.filter(item => item.Loot_id === pickedKey);
            theItem = theItem[0];
            const itemAddOutcome = await checkOwned(user, theItem, reapObj.Contents.Amount);
            if (itemAddOutcome !== "Finished") return {status: "Failure: Item"};
            return {status: "Complete", raw: theItem};
        }

        async function handleMaterialReward(reapObj){
            const {materialFiles} = interaction.client;

            const typeList = [];
            for (const [key, value] of materialFiles){
                typeList.push({type: key, file: value});
            }

            const pickedType = randArrPos(typeList);
            const passType = pickedType.type;
            const matFile = require(pickedType.file);

            let theMat = matFile.filter(mat => mat.Rar_id === reapObj.Contents.Extra);
            theMat = theMat[0];

            const materialAddOutcome = await handleMaterialAdding(theMat, reapObj.Contents.Amount, user, passType);
            if (!materialAddOutcome.name) return {status: "Failure: Material"};
            return {status: "Complete", instance: materialAddOutcome};
        }
	},
};