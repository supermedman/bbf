const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

//const { Op } = require('sequelize');
//const { grabRar, grabColour } = require('./exported/grabRar.js');
//const { createEnemyDisplay } = require('./exported/displayEnemy.js');
//const { checkOwned } = require('./exported/createGear.js');
// const { UserData, ActiveEnemy, Pigmy, Loadout, ActiveStatus, OwnedPotions, UniqueCrafted, UserTasks } = require('../../dbObjects.js');

//const enemyList = require('../../events/Models/json_prefabs/enemyList.json');
//const lootList = require('../../events/Models/json_prefabs/lootList.json');
//const uniqueLootList = require('../../events/Models/json_prefabs/uniqueLootList.json');
//const deathMsgList = require('../../events/Models/json_prefabs/deathMsgList.json');
//const aCATE = require('../../events/Models/json_prefabs/activeCategoryEffects.json');

//const { isLvlUp, isUniqueLevelUp } = require('./exported/levelup.js');
//const { dropRandomBlueprint } = require('./exported/createBlueprint.js');
//const { grabMat } = require('./exported/materialDropper.js');
const { checkHintStats, checkHintLootView } = require('./exported/handleHints.js');

//const { Player } = require('./exported/MadeClasses/Player.js');
//const { Enemy } = require('./exported/MadeClasses/Enemy.js');

// /** This method retrives Defence values from all given gear ids
//  * 
//  * @param {string} userID user id snowflake
//  * @param {any[]} gear list of all gear containing defence values
//  */
// const grabDefenceGear = async (userID, gear) => {
//     let totalDs = [];
//     for (const id of gear) {
//         let pushVal = 0;
//         let itemRef;
//         if (id === 0) {

//         } else if (id >= 30000) {
//             itemRef = await UniqueCrafted.findOne({ where: [{ spec_id: userID }, { loot_id: id }] });
//             pushVal = itemRef.Defence;
//         } else if (id < 1000 || id >= 20000) {
//             itemRef = lootList.filter(item => item.Loot_id === id);
//             pushVal = itemRef[0].Defence;
//         } else if (id > 1000) {
//             itemRef = uniqueLootList.filter(item => item.Loot_id === id);
//             pushVal = itemRef[0].Defence;
//         }
//         totalDs.push(pushVal);
//     }
//     return totalDs;
// };

// /** This method retrives Damage values from all given gear ids
//  * 
//  * @param {string} userID user id snowflake
//  * @param {any[]} gear list of all gear containing attack values
//  */
// const grabDamageGear = async (userID, gear) => {
//     let totalAs = [];
//     for (const id of gear) {
//         let pushVal = 0;
//         let itemRef;
//         if (id === 0) {

//         } else if (id >= 30000) {
//             itemRef = await UniqueCrafted.findOne({ where: [{ spec_id: userID }, { loot_id: id }] });
//             pushVal = itemRef.Attack;
//         } else if (id < 1000 || id >= 20000) {
//             itemRef = lootList.filter(item => item.Loot_id === id);
//             pushVal = itemRef[0].Attack;
//         } else if (id > 1000) {
//             itemRef = uniqueLootList.filter(item => item.Loot_id === id);
//             pushVal = itemRef[0].Attack;
//         }
//         totalAs.push(pushVal);
//     }
//     return totalAs;
// };

// /** This method retrives Damage values from all given gear ids
//  * 
//  * @param {string} userID user id snowflake
//  * @param {any[]} gear list of all gear containing type values
//  */
// const grabGearTypes = async (userID, gear) => {
//     let totalTypes = [];
//     for (const id of gear) {
//         let pushVal = 'NONE';
//         let itemRef;
//         if (id === 0) {

//         } else if (id >= 30000) {
//             itemRef = await UniqueCrafted.findOne({ where: [{ spec_id: userID }, { loot_id: id }] });
//             pushVal = itemRef.Type;
//         } else if (id < 1000 || id >= 20000) {
//             itemRef = lootList.filter(item => item.Loot_id === id);
//             pushVal = itemRef[0].Type;
//         } else if (id > 1000) {
//             itemRef = uniqueLootList.filter(item => item.Loot_id === id);
//             pushVal = itemRef[0].Type;
//         }
//         totalTypes.push(pushVal);
//     }
//     return totalTypes;
// };

// const findPotion = async (potionOneID, userID) => {
//     let potionOne;
//     console.log(potionOneID);
//     if (potionOneID === 0) {
//         //Nothing equipped
//         return 'NONE';
//     } else {
//         potionOne = await OwnedPotions.findOne({ where: [{ spec_id: userID }, { potion_id: potionOneID }] });
//         if (!potionOne) {
//             //console.log(warnedForm('PotionOne NOT FOUND AMOUNT LIKELY 0!'));
//             return 'HASNONE';
//         }
//         if (potionOne.amount > 0) return potionOne;
//     }
// }

// const randArrPos = (arr) => {
//     let returnIndex = 0;
//     if (arr.length > 1) returnIndex = Math.floor(Math.random() * arr.length);
//     return arr[returnIndex];
// };

// const enemyExtraGen = (eFab) => {
//     const lvl = eFab.Level;
//     let nxtLvl;
//     if (lvl < 20) {
//         nxtLvl = 50 * (Math.pow(lvl, 2) - 1);
//     } else if (lvl === 20) {
//         nxtLvl = 75 * (Math.pow(lvl, 2) - 1);
//     } else if (lvl > 20) {
//         const lvlScale = 1.5 * (Math.floor(lvl / 5));
//         nxtLvl = (75 + lvlScale) * (Math.pow(lvl, 2) - 1);
//     }

//     let XpMax = Math.floor((nxtLvl / 15) + (0.2 * (100 - lvl)));
//     let XpMin = XpMax - Math.floor(XpMax * 0.25);

//     // This needs balancing, damage needs to scale up/down off of avg by 50% rough outline
//     const avgDmgRef = eFab.AvgDmg;
//     let DmgMax = Math.floor(avgDmgRef * 1.5 + (0.02 * Math.floor(lvl / 6)));
//     let DmgMin = DmgMax - Math.floor(DmgMax / 4.8);

//     const calcValueObj = {
//         maxDmg: DmgMax,
//         minDmg: DmgMin,
//         maxXp: XpMax,
//         minXp: XpMin,
//     };

//     return calcValueObj;
// };

const { CombatInstance } = require('../Development/Export/Classes/CombatLoader');
const { EnemyFab } = require('../Development/Export/Classes/EnemyFab');

const {
    loadPlayer,
    loadEnemy,
    loadDamageItems,
    loadDefenceItems,
    genAttackTurnEmbed,
    genStatusResultEmbed,
    handleEnemyAttack,
    dropItem,
    enemyPayoutDisplay
} = require('../Development/Export/finalCombatExtras');
const {handleHunting} = require('./exported/locationFilters.js');

const { createNewEnemyImage } = require('./exported/displayEnemy');
const { attackEnemy, handleActiveStatus, applyActiveStatus } = require('../Development/Export/combatContainer');

const { handleEnemyMat } = require('../Development/Export/materialFactory');
const {endTimer, sendTimedChannelMessage, createInteractiveChannelMessage, grabUser, dropChance, makePrettyNum} = require('../../uniHelperFunctions');
const { handleUserPayout } = require('../Development/Export/uni_userPayouts');
const { rollRandBlueprint } = require('../Development/Export/blueprintFactory.js');

const loadCombButts = (player) => {
    const attackButton = new ButtonBuilder()
    .setCustomId('attack')
    .setLabel('Strike')
    .setStyle(ButtonStyle.Primary);

    const hideButton = new ButtonBuilder()
    .setCustomId('hide')
    .setLabel(player.buttonState.hide.txt)
    .setDisabled(player.buttonState.hide.disable)
    .setStyle(ButtonStyle.Secondary);

    const stealButton = new ButtonBuilder()
    .setCustomId('steal')
    .setLabel(player.buttonState.steal.txt)
    .setDisabled(player.buttonState.steal.disable)
    .setStyle(ButtonStyle.Secondary);

    const blockButton = new ButtonBuilder()
    .setCustomId('block')
    .setLabel('Block Attack')
    .setDisabled(true)
    .setStyle(ButtonStyle.Secondary);

    let buttLabel, usePot = true;
    if (player.potion.name !== ""){
        if (player.potion.amount <= 0){
            buttLabel = `0 ${player.potion.name} Remain`;
        } else if (player.potion.isCooling){
            buttLabel = `CoolDown: ${player.potion.cCount}`;
        } else {
            buttLabel = `${player.potion.amount} ${player.potion.name}`;
            usePot = false;
        }
    } else buttLabel = "No Potion";

    const potButton = new ButtonBuilder()
    .setCustomId('potion')
    .setLabel(buttLabel)
    .setDisabled(usePot)
    .setStyle(ButtonStyle.Secondary);

    return [hideButton, attackButton, stealButton, blockButton, potButton];
};

module.exports = {
    helptypes: ['Material', 'Gear', 'Payout', 'Combat'],
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('startcombat')
        .setDescription('The basic combat initiation!'),

    async execute(interaction) {
        // if (interaction.user.id !== '501177494137995264') return await interaction.reply('Sorry, this command is being tested and is unavailable.');
        
        const { enemies, combatInstance, gearDrops, newEnemy } = interaction.client;

        let enemiesToPass = enemies;

        let startTime, displayStartTime;
        async function preloadCombat(){
            await interaction.deferReply();

            const preLoadStart = new Date().getTime();

            const thePlayer = loadPlayer(interaction.user.id, combatInstance);
            if (!thePlayer.staticStats) await thePlayer.retrieveBasicStats();
            if (thePlayer.loadout.ids.length === 0) {
                console.log('Retrieving Loadout');
                await thePlayer.retrieveLoadout();
            } else {
                console.log('Reloading Loadout/Internals');
                await thePlayer.reloadInternals();
            }

            const user = await grabUser(interaction.user.id);

            const huntingCheck = handleHunting(user);
            enemiesToPass = (huntingCheck.size > 0) ? huntingCheck : enemies;
            const theEnemy = loadEnemy(thePlayer.level, enemiesToPass, false, user.current_location);
            theEnemy.loadItems(thePlayer);

            const loadObj = thePlayer.loadout;
            thePlayer.staticDamage = loadDamageItems(loadObj.mainhand, loadObj.offhand);
            thePlayer.staticDefence = loadDefenceItems(loadObj);

            endTimer(preLoadStart, "Combat Preload");

            combatLooper(thePlayer, theEnemy);
        }

        /**
         * This function contains the core functionality of all combat metrics
         * @param {CombatInstance} player Combat Instance Object
         * @param {EnemyFab} enemy Enemy Instance Object
         */
        async function combatLooper(player, enemy){
            await player.reloadInternals();

            //const useImageDisplay = true; // Used for display testing
            const replyType = {};

            displayStartTime = new Date().getTime();

            const eFile = await createNewEnemyImage(enemy);
            replyType.files = [eFile];

            // if (useImageDisplay){
                
            // } else {
            //     const combEmbed = genEnemyEmbed(enemy);
            //     replyType.embeds = [combEmbed];
            // }

            endTimer(displayStartTime, "Final Display");
            
            const buttRow = new ActionRowBuilder().addComponents(loadCombButts(player));
            
            replyType.components = [buttRow];
            
            // REPLY TIME LOG
            const msgStart = new Date().getTime();

            const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 60000, replyType, "FollowUp");
            const combatMessage = anchorMsg, combCollector = collector;

            // REPLY TIME LOG
            endTimer(msgStart, "Final Interaction Reply");

            combCollector.on('collect', async c => {
                await c.deferUpdate().then(async () => {
                    startTime = new Date().getTime();
                    switch(c.customId){
                        case "attack":
                            await combCollector.stop(await handleCombatTurn(player, enemy));
                        break;
                        case "block":
                            // NOT IN USE
                        break;
                        case "hide":
                            await combCollector.stop(await handleHiding(player, enemy));
                        break;
                        case "steal":
                            await combCollector.stop(await handleStealing(player, enemy));
                        break;
                        case "potion":
                            await combCollector.stop(await handlePotionUsed(player, enemy));
                        break;
                    }
                }).catch(e => console.error(e));
            });

            combCollector.on('end', async (c, r) => {
                console.log('Collector: ended with reason ', r);

                if (!r || r === 'time' || r === 'None') {
                    return combatMessage.delete().catch(e => {
                        if (e.code !== 10008) {
                            console.error('Failed to delete the message:', e);
                        }
                    });
                }

                await combatMessage.delete().catch(e => {
                    if (e.code !== 10008) {
                        console.error('Failed to delete the message:', e);
                    }
                });

                if (typeof r !== 'string'){
                    await sendTimedChannelMessage(interaction, 35000, r.replyObj);
                    r = r.outcome;
                }

                switch(r){
                    case "EDEAD":
                    return handleEnemyDead(player, enemy); // Handle Dead Enemy
                    case "PDEAD":
                    return handlePlayerDead(player, enemy);
                    case "RELOAD":
                    return combatLooper(player, enemy);
                }
            });
        }

        /**
         * This function contains the core functionality of all attacking related code
         * @param {CombatInstance} player Combat Instance Object
         * @param {EnemyFab} enemy Enemy Instance Object
         * @returns {promise <string>} string: Action to take when ending collector
         */
        async function handleCombatTurn(player, enemy){
            let enemyDead = false, playerCombEmbeds = [];
            const rolledCondition = {
                DH: player.rollDH(),
                Crit: player.rollCrit()
            };
            const combatResult = attackEnemy(player.staticDamage, enemy, rolledCondition, player);
            if (combatResult.outcome === 'Dead') enemyDead = true;

            let wasStatusChecked = "Status Not Checked";
            let returnedStatus = 'None';
            if (!enemyDead){
                wasStatusChecked = handleActiveStatus(combatResult, enemy, rolledCondition);
                if (wasStatusChecked !== "Status Not Checked" || enemy.activeEffects.length > 0){
                    returnedStatus = applyActiveStatus(combatResult, enemy);
                }
            }
            
            // ================
            // RECHECK DEAD STATUS
            // ================
            if (enemy.flesh.HP <= 0) enemyDead = true;

            // ================
            // BUILD DAMAGE EMBED & DISPLAY IT
            // ================

            // REGULAR ATTACK TURN EMBED
            const dmgDealtEmbed = genAttackTurnEmbed(combatResult, wasStatusChecked?.DamagedType, rolledCondition);
            playerCombEmbeds.push(dmgDealtEmbed);

            // STATUS EFFECTS/DAMAGE EMBED?
            if (returnedStatus !== "None"){
                if (returnedStatus.totalAcc > 0 || returnedStatus.newEffects.length > 0){
                    const statusEmbed = genStatusResultEmbed(returnedStatus);
                    
                    playerCombEmbeds.push(statusEmbed);
                }
            }
            const replyObj = {embeds: playerCombEmbeds};
            await sendTimedChannelMessage(interaction, 35000, replyObj);

            //console.log(enemy);
            //console.log(player);
            if (enemyDead) {
                // =================== TIMER END
                endTimer(startTime, "Final Combat");
                // =================== TIMER END
                console.log("Enemy is dead!");
                return "EDEAD";
            }

            const eTurnOutcome = await handleEnemyAttack(player, enemy);
            await sendTimedChannelMessage(interaction, 35000, eTurnOutcome.replyObj);
            // =================== TIMER END
            endTimer(startTime, "Final Combat");
            // =================== TIMER END
            return eTurnOutcome.outcome;
        }

        /**
         * This function handles all updates, payouts, and progress from the completed
         * combat turn.
         * @param {CombatInstance} player Combat Instance Object
         * @param {EnemyFab} enemy Enemy Instance Object
         */
        async function handleEnemyDead(player, enemy){
            // ==========================
            // SETUP DB UPDATE QUE SYSTEM
            // ==========================
            // Handle potions used
            await player.checkPotionUse();
            // Handle potion durations/cooldowns
            await player.handlePotionCounters();
            // Handle health updates
            await player.checkHealth();
            // Handle kill counts/combat tasks
            await player.handleCombatWin(enemy, interaction);
            // Spawn New Enemy Access
            // let newAccess = true;

            // =============
            // Enemy Payouts
            // =============
            let xpGain = enemy.rollXP();
            let coinGain = xpGain + Math.floor(xpGain * 0.10);

            const user = await grabUser(player.userId);

            await handleUserPayout(xpGain, coinGain, interaction, user);

            if (dropChance(0.92)){
                await rollRandBlueprint(user, interaction.client.masterBPCrafts, interaction);
            }

            const payoutEmbeds = [];

            // Material Drops
            const { materialFiles } = interaction.client;
            const matDropReplyObj = await handleEnemyMat(enemy, player.userId, materialFiles, interaction);
            payoutEmbeds.push(matDropReplyObj);
            // await sendTimedChannelMessage(interaction, 60000, matDropReplyObj);
            // Item Drops
            if (enemy.payouts.item){
                await checkHintLootView(user, interaction);
                const iE = await dropItem(gearDrops, player, enemy);
                payoutEmbeds.push(iE);
                //await sendTimedChannelMessage(interaction, 60000, iE);
            }

            const compDropEmbed = await enemyPayoutDisplay(payoutEmbeds);
            const RepObj = {embeds: [compDropEmbed]};
            await sendTimedChannelMessage(interaction, 70000, RepObj);


            // =============
            //   New Enemy 
            // =============
            //      OR
            // =============
            //  Combat End
            // =============
            const eRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                .setCustomId('spawn-new')
                .setLabel('New Enemy')
                .setStyle(ButtonStyle.Success)
                .setDisabled(false)
                .setEmoji('💀')
            );

            const embedTitle = "Enemy Killed!"; // (!newEnemy.has(player.userId)) ? "Enemy Killed! ``/startcombat`` to continue!":

            const killedEmbed = new EmbedBuilder()
            .setTitle(embedTitle)
            .setColor(0o0)
            .setDescription("Your rewards: ")
            .addFields(
                {name: "Xp Gained: ", value: `${makePrettyNum(xpGain)}`, inline: true},
                {name: "Coins Gained: ", value: `${makePrettyNum(coinGain)}c`, inline: true}
            );

            

            // Changing Button Access to the default. Progress can be boosted/restricted through other methods, this change intends to promote base player retention!
            const combReplyObj = {embeds: [killedEmbed], components: [eRow]};
            const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 80000, combReplyObj, "FollowUp");

            collector.on('collect', async c => {
                await c.deferUpdate().then(async () => {
                    if (c.customId === 'spawn-new'){
                        collector.stop();
                        return combatLooper(player, loadEnemy(player.level, enemiesToPass, false, (await grabUser(player.userId)).current_location));
                    }
                }).catch(e => console.error(e));
            });

            collector.on('end', (c, r) => {
                anchorMsg.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Failed to delete the message:', error);
                    }
                });
            });

            // if (!newEnemy.has(player.userId)){
            //     await sendTimedChannelMessage(interaction, 35000, killedEmbed);
            // } else {
            //     const combReplyObj = {embeds: [killedEmbed], components: [eRow]};
            //     const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 80000, combReplyObj, "FollowUp");

            //     collector.on('collect', async c => {
            //         await c.deferUpdate().then(async () => {
            //             if (c.customId === 'spawn-new'){
            //                 collector.stop();
            //                 return combatLooper(player, loadEnemy(player.level, enemiesToPass, false, (await grabUser(player.userId)).current_location));
            //             }
            //         }).catch(e => console.error(e));
            //     });

            //     collector.on('end', (c, r) => {
            //         anchorMsg.delete().catch(error => {
            //             if (error.code !== 10008) {
            //                 console.error('Failed to delete the message:', error);
            //             }
            //         });
            //     });
            // }
        }

        /**
         * This function handles all updates due to the player dying.
         * @param {CombatInstance} player Combat Instance Object
         * @param {EnemyFab} enemy Enemy Instance Object
         */
        async function handlePlayerDead(player, enemy){
            // ==========================
            // SETUP DB UPDATE QUE SYSTEM
            // ==========================

            // =============
            //  Player Dead
            // =============
            const reviveButton = new ButtonBuilder()
            .setCustomId('revive')
            .setLabel('Revive')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('💀');

            const grief = new ActionRowBuilder().addComponents(reviveButton);

            const deadEmbed = new EmbedBuilder()
            .setTitle('YOU HAVE FALLEN IN COMBAT')
            .setColor('DarkGold')
            .addFields(
                { name: `Obituary`, value: "You have fallen in combat!!", inline: true }
            );

            const combReplyObj = {embeds: [deadEmbed], components: [grief]};
            const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 80000, combReplyObj);
            const embedMsg = anchorMsg;
            
            // =============
            //    Revive
            // =============
            collector.on('collect', async c => {
                await c.deferUpdate().then(async () => {
                    if (c.customId === 'revive'){
                        await player.revive(enemy);
                        return collector.stop();
                    }
                }).catch(e => console.error(e));
            });

            collector.on('end', (c, r) => {
                embedMsg.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Failed to delete the message:', error);
                    }
                });
            });
        }

        /**
         * This function handles the effects of the held potion being used.
         * @param {CombatInstance} player CombatInstance Object
         * @param {EnemyFab} enemy EnemyFab Object
         */
        async function handlePotionUsed(player, enemy){
            const outcome = await player.potionUsed();
            // Handle active potion status entry
            
            const potEmbed = new EmbedBuilder()
            .setTitle(outcome.title)
            .setDescription(outcome.desc);

            if (outcome.type === 'Heal'){
                potEmbed.addFields({name: "Your Health: ", value: `${player.health}`});
            }
            
            await sendTimedChannelMessage(interaction, 35000, potEmbed);
            return "RELOAD";
        }

        /**
         * This function handles stealing and its outcomes.
         * @param {CombatInstance} player CombatInstance Object
         * @param {EnemyFab} enemy EnemyFab Object
         * @returns {promise <string>}"RELOAD"
         */
        async function handleStealing(player, enemy){
            let stealEmbed = new EmbedBuilder(), fail = false;

            const outcome = await enemy.steal(player);
            switch(outcome){
                case "Unique":
                    // Not possible yet
                    stealEmbed
                    .setTitle('Work In Progress!');
                break;
                case "No Item":
                    // Disable Stealing
                    stealEmbed
                    .setTitle('Nothing to steal!')
                    .setColor('NotQuiteBlack')
                    .addFields({name: "No really..", value: "There isnt anything here!"});
                    player.buttonState.steal.disable = true;
                break;
                case "Fail":
                    // Take Damage
                    stealEmbed
                    .setTitle('Failed!')
                    .setColor('DarkRed')
                    .addFields({name: "OH NO!", value: "You got caught redhanded!"});
                    fail = true;
                break;
                default:
                    // Item stolen
                    stealEmbed = await dropItem(gearDrops, player, enemy, outcome);
                    player.buttonState.steal.disable = true;
                break;
            }

            await sendTimedChannelMessage(interaction, 45000, stealEmbed);
            return (fail) ? await handleEnemyAttack(player, enemy) : 'RELOAD';
        }

        /**
         * This function handles hiding and its outcomes.
         * @param {CombatInstance} player CombatInstance Object
         * @param {EnemyFab} enemy EnemyFab Object
         * @returns {promise <string>}"RELOAD"
         */
        async function handleHiding(player, enemy){
            const hideEmbed = new EmbedBuilder();
            let fail = false;

            const outcome = player.hiding(enemy);
            if (!outcome){
                // Hiding fail
                hideEmbed
                .setTitle('Failed!')
                .setColor('DarkRed')
                .addFields({name: "OH NO!", value: "You failed to hide!"});
                fail = true;
            } else {
                hideEmbed
                .setTitle('Success!')
                .setColor('LuminousVividPink')
                .addFields({name: "Well Done!", value: "You managed to hide!"});
                player.buttonState.hide.txt = "Escape!";
            }

            await sendTimedChannelMessage(interaction, 45000, hideEmbed);
            return (fail) ? await handleEnemyAttack(player, enemy) : "RELOAD";
        }

        preloadCombat();

        // const userID = interaction.user.id;

        // await interaction.deferReply().then(() => startCombat()).catch(error => console.log('Error @ startcombat:', error));

        // async function startCombat() {
        //     let thePlayer;
        //     let theEnemy;
        //     await generatePlayerClass()
        //         .then(async player => {
        //             thePlayer = player;
        //             await loadEnemy(player)
        //                 .then((enemy) => theEnemy = enemy)
        //                 .catch(error => console.error('Error @ startCombat, loadEnemy:', error));
        //         })
        //         .catch(error => console.error('Error @ startCombat, generatePlayerClass:', error));
        //     console.log('thePlayer:', thePlayer);
        //     console.log('theEnemy:', theEnemy);

        //     if (thePlayer === 'NO USER') return 'ERROR';
        //     if (thePlayer !== 'NO USER') return display(thePlayer, theEnemy);
        // }

        // async function generatePlayerClass() {
        //     const user = await grabU();
        //     if (user === 'NO USER') return await interaction.followUp('No user found! Create a user profile by using ``/start``!');
        //     //if (!activeCombats.has(interaction.user.id)) {
        //     //    activeCombats.set(interaction.user.id, new Collection());
        //     //}

        //     //const userCombat = activeCombats.get(interaction.user.id);
        //     //if (userCombat.has(interaction.id)) {

        //     //}
        //     const curPlayer = new Player(user, interaction);

        //     curPlayer.setHealth(user.health);
        //     curPlayer.checkDealtBuffs();
        //     curPlayer.checkTakenBuffs();
        //     curPlayer.checkStrongUsing();

        //     const pigmy = await Pigmy.findOne({ where: { spec_id: userID } });
        //     curPlayer.checkPigmyUps(pigmy);

        //     curPlayer.checkCritChance();
        //     curPlayer.checkDHChance();

        //     curPlayer.checkLootDrop(pigmy);
        //     curPlayer.checkLootUP(pigmy);

        //     curPlayer.checkBaseDamage();

        //     const loadoutChecking = await Loadout.findOne({ where: { spec_id: userID } });
        //     if (!loadoutChecking) { } else {
        //         curPlayer.loadLoadout(loadoutChecking);

        //         const allGear = curPlayer.loadout.slice(0, 5);
        //         const typeVals = await grabGearTypes(userID, allGear);
        //         curPlayer.setLoadoutTypes(typeVals);

        //         const defGear = curPlayer.loadout.slice(0, 4);

        //         const atkGear = curPlayer.loadout.slice(3, 5);

        //         const defVals = await grabDefenceGear(userID, defGear);
        //         const atkVals = await grabDamageGear(userID, atkGear);

        //         curPlayer.checkTotalDefence(defVals);
        //         curPlayer.checkTotalDamage(atkVals);
        //         curPlayer.checkAgainstLoadoutTypes();
        //     }

        //     const activeEffect = await ActiveStatus.findOne({ where: { spec_id: userID } });
        //     if (!activeEffect) { } else {
        //         const reinEffects = await ActiveStatus.findAll({ where: [{ spec_id: userID }, { activec: 'Reinforce' }, { duration: { [Op.gt]: 0 } }] });
        //         if (reinEffects > 0) curPlayer.updateDefence(reinEffects);
        //         const tonEffects = await ActiveStatus.findAll({ where: [{ spec_id: userID }, { activec: 'Tons' }, { duration: { [Op.gt]: 0 } }] });
        //         if (tonEffects > 0) curPlayer.updateUPs(tonEffects);
        //     }

        //     //userCombat.set(interaction.user.id, curPlayer);
        //     //setTimeout(() => userCombat.delete(interaction.user.id), 900000);

        //     return curPlayer;
        // }

        // async function grabU() {
        //     const uData = await UserData.findOne({ where: { userid: interaction.user.id } });
        //     if (uData) return uData;
        //     return 'NO USER';
        // }

        // async function loadEnemy(player) {
        //     if (player === 'NO USER') return 'NO USER';

        //     // This preloads an array with all enemy constkeys for enemies at or below the players level
        //     let choices = [];
        //     choices = checkSpawnBiome(await grabU());

        //     if (choices.length <= 0){
        //         for (const [key, value] of enemies) {
        //             if (value <= player.level) choices.push(key);
        //         }
        //     }

        //     if (choices.length <= 0) {
        //         console.error('NO ENEMY CHOICES FOR PLAYER LEVEL:', player.level);
        //         return await interaction.reply('Something went wrong while spawning that enemy!');
        //     }

        //     const picked = randArrPos(choices);
        //     const filtered = enemyList.filter(fab => fab.ConstKey === picked);
        //     const eFab = filtered[0];

        //     const specCode = interaction.user.id + eFab.ConstKey;
        //     const copyCheck = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: eFab.ConstKey }] });
        //     if (copyCheck) {
        //         const returnEnemy = new Enemy(copyCheck);
        //         return returnEnemy;
        //     }

        //     let hasUI = false;
        //     if (eFab.HasUnique) hasUI = true;

        //     let hasI = false;
        //     let lootChance = Math.random();
        //     let playerChance = player.mods[4];
        //     if (lootChance >= playerChance) hasI = true;

        //     if (!eFab.NewSpawn || eFab.NewSpawn === false) {
        //         try {
        //             await ActiveEnemy.create({
        //                 name: eFab.Name,
        //                 description: eFab.Description,
        //                 level: eFab.Level,
        //                 mindmg: eFab.MinDmg,
        //                 maxdmg: eFab.MaxDmg,
        //                 health: eFab.Health,
        //                 defence: eFab.Defence,
        //                 weakto: eFab.WeakTo,
        //                 dead: false,
        //                 hasitem: hasI,
        //                 xpmin: eFab.XpMin,
        //                 xpmax: eFab.XpMax,
        //                 constkey: eFab.ConstKey,
        //                 hasunique: hasUI,
        //                 specid: specCode,
        //             });
        //         } catch (error) {
        //             console.error('Error @ startcombat/loadEnemy/OldSpawn:', error);
        //         }
        //     } else if (eFab.NewSpawn === true) {
        //         try {
        //             const extraVals = enemyExtraGen(eFab);
        //             await ActiveEnemy.create({
        //                 name: eFab.Name,
        //                 description: eFab.Description,
        //                 level: eFab.Level,
        //                 health: eFab.Health,
        //                 defence: eFab.Defence,
        //                 weakto: eFab.WeakTo,
        //                 constkey: eFab.ConstKey,
        //                 specid: specCode,
        //                 mindmg: extraVals.minDmg,
        //                 maxdmg: extraVals.maxDmg,
        //                 xpmin: extraVals.minXp,
        //                 xpmax: extraVals.maxXp,
        //                 hasitem: hasI,
        //                 hasunique: hasUI,
        //                 dead: false,
        //             });
        //         } catch (error) {
        //             console.error('Error @ startcombat/loadEnemy/NewSpawn:', error);
        //         }
        //     }

        //     const addedEnemy = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: eFab.ConstKey }] });
        //     if (addedEnemy) {
        //         const returnEnemy = new Enemy(addedEnemy);
        //         return returnEnemy;
        //     }
        // }

        // async function display(player, enemy) {
        //     if (player.dead === true || player.health <= 0) return playerDead(enemy);
        //     if (enemy.dead === true || enemy.health <= 0) return enemyDead(player, enemy);
        //     if (player.hasLoadout) {
        //         const potionCheck = await findPotion(player.loadout[5], userID);
        //         if (potionCheck === 'NONE' || potionCheck === 'HASNONE') {
        //             //Both potion slots are empty keep buttons disabled
        //             player.potionDisabled = true;
        //             if (potionCheck === 'NONE') player.potionTxt = 'No Potion';
        //             if (potionCheck === 'HASNONE') player.potionTxt = '0 Remaining';
        //         } else {
        //             const activeEffects = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { name: potionCheck.name }] });
        //             if (!activeEffects || activeEffects.cooldown <= 0) {
        //                 //user has no active effects
        //                 player.potionDisabled = false;
        //                 player.potionTxt = `${potionCheck.amount} ${potionCheck.name}`;
        //             } else {
        //                 player.potionDisabled = true;
        //                 player.potionTxt = `CoolDown: ${activeEffects.cooldown}`;
        //             }
        //         }
        //     }

        //     const hideButton = new ButtonBuilder()
        //         .setCustomId('hide')
        //         .setLabel('Try to hide')
        //         .setDisabled(false)
        //         .setStyle(ButtonStyle.Secondary);

        //     const attackButton = new ButtonBuilder()
        //         .setCustomId('onehit')
        //         .setLabel('Strike')
        //         .setStyle(ButtonStyle.Primary);

        //     const stealButton = new ButtonBuilder()
        //         .setCustomId('steal')
        //         .setLabel('Steal Item')
        //         .setDisabled(player.stealDisabled)
        //         .setStyle(ButtonStyle.Secondary);

        //     const blockButton = new ButtonBuilder()
        //         .setCustomId('block')
        //         .setLabel('Block Attack')
        //         .setStyle(ButtonStyle.Secondary);

        //     const potionOneButton = new ButtonBuilder()
        //         .setCustomId('potone')
        //         .setLabel(player.potionTxt)
        //         .setDisabled(player.potionDisabled)
        //         .setStyle(ButtonStyle.Secondary);

        //     const row = new ActionRowBuilder().addComponents(hideButton, attackButton, stealButton, blockButton, potionOneButton);

        //     const attachment = await createEnemyDisplay(enemy);

        //     const combatEmbed = await interaction.followUp({ components: [row], files: [attachment] });

        //     const filter = (i) => i.user.id === userID;

        //     const collector = combatEmbed.createMessageComponentCollector({
        //         componentType: ComponentType.Button,
        //         filter,
        //         time: 40000,
        //     });

        //     collector.on('collect', async (COI) => {
        //         // Stealing!
        //         if (COI.customId === 'steal') {
        //             const result = await enemy.stealing(player);
        //             let embedTitle = '';
        //             let embedColour = 'Black';
        //             let fieldName = '';
        //             let fieldValue = '';
        //             let fieldObj = [];

        //             let failSteal = false;
        //             const dmgTaken = enemy.randDamage();

        //             if (result === 'FAILURE') {
        //                 embedTitle = 'Failed!';
        //                 embedColour = 'DarkRed';
        //                 fieldName = 'Oh NO!';
        //                 fieldValue = 'You got caught redhanded!';
        //                 failSteal = true;
        //             } else if (result === 'NO ITEM') {
        //                 embedTitle = 'Nothing to steal';
        //                 embedColour = 'NotQuiteBlack';
        //                 fieldName = 'No really..';
        //                 fieldValue = 'There isnt anything here!';
        //                 player.stealDisabled = true;
        //             } else if (result === 'UNIQUE') {
        //                 const uniqueFilter = uniqueLootList.filter(item => item.Loot_id === (enemy.constkey + 1000));
        //                 const uniqueItem = uniqueFilter[0];
        //                 const checkUser = await grabU();
        //                 const itemCreated = await checkOwned(checkUser, uniqueItem);
        //                 if (itemCreated !== 'Finished') return await interaction.followUp(`Something went wrong while adding an item ${itemCreated}`);

        //                 embedTitle = '~LOOT STOLEN~';
        //                 embedColour = await grabColour(uniqueItem.Rar_id, false);
        //                 fieldName = uniqueItem.Name;
        //                 fieldValue = makeItemText(uniqueItem);
        //             } else {
        //                 const item = await findItem(player, enemy, result);
        //                 if (item === 'FAILURE') return await interaction.followUp(`Something went wrong while finding an item!`);
        //                 const checkUser = await grabU();
        //                 const itemCheck = await checkOwned(checkUser, item);
        //                 if (itemCheck !== 'Finished') return await interaction.followUp(`Something went wrong while adding an item ${item.Name}`);
        //                 player.stealDisabled = true;
        //                 embedTitle = '~LOOT STOLEN~';
        //                 embedColour = await grabColour(item.Rar_id, false);
        //                 fieldName = item.Name;
        //                 fieldValue = makeItemText(item);
        //             }

        //             if (embedTitle !== '') {
        //                 fieldObj.push({ name: fieldName, value: fieldValue, });

        //                 const embed = new EmbedBuilder()
        //                     .setTitle(embedTitle)
        //                     .setColor(embedColour)
        //                     .addFields(fieldObj);

        //                 collector.stop();
        //                 await COI.channel.send({ embeds: [embed], ephemeral: true }).then(embedmsg => setTimeout(() => {
        //                     embedmsg.delete();
        //                 }, 20000)).catch(error => console.error(error));
        //                 if (failSteal === true) {
        //                     player.takeDamge(dmgTaken);
        //                     await showDamageTaken(player, dmgTaken);
        //                 }
        //                 return display(player, enemy);
        //             }
        //         }
        //         // HIDE!
        //         if (COI.customId === 'hide') {
        //             let embedTitle = '';
        //             let embedColour = 'Black';
        //             let fieldName = '';
        //             let fieldValue = '';
        //             let fieldObj = [];
        //             let escaped = false;

        //             let failHide = false;
        //             const dmgTaken = enemy.randDamage();

        //             if (!player.isHidden) {
        //                 const result = player.hide(enemy);
        //                 if (result === 'FAILURE') {
        //                     embedTitle = 'Failed!';
        //                     embedColour = 'DarkRed';
        //                     fieldName = 'Oh NO!';
        //                     fieldValue = 'You failed to hide!';
        //                     failHide = true;
        //                 } else if (result === 'SUCCESS') {
        //                     embedTitle = 'Success!';
        //                     embedColour = 'LuminousVividPink';
        //                     fieldName = 'Well Done!';
        //                     fieldValue = 'You managed to hide!';

        //                     hideButton.setLabel('Escape!');
        //                     attackButton.setLabel('Backstab!');
        //                     await COI.update({ components: [row] });
        //                 }
        //             } else {
        //                 embedTitle = 'Success!';
        //                 embedColour = 'NotQuiteBlack';
        //                 fieldName = 'Well Done!';
        //                 fieldValue = 'Escaped Successfully!';
        //                 escaped = true;
        //             }


        //             if (embedTitle !== '') {
        //                 fieldObj.push({ name: fieldName, value: fieldValue, });

        //                 const embed = new EmbedBuilder()
        //                     .setTitle(embedTitle)
        //                     .setColor(embedColour)
        //                     .addFields(fieldObj);

        //                 if (escaped) {
        //                     collector.stop();
        //                 }
        //                 await COI.channel.send({ embeds: [embed], ephemeral: true }).then(embedmsg => setTimeout(() => {
        //                     embedmsg.delete();
        //                 }, 20000)).catch(error => console.error(error));
        //                 if (failHide === true) {
        //                     player.takeDamge(dmgTaken);
        //                     await showDamageTaken(player, dmgTaken);
        //                 }
        //                 if (!player.isHidden) {
        //                     collector.stop();
        //                     return display(player, enemy);
        //                 }
        //             }
        //         }
        //         // Striking!!
        //         if (COI.customId === 'onehit') {
        //             collector.stop();
        //             await runCombatTurn(player, enemy);
        //             return;
        //         }
        //         // Blocking!
        //         if (COI.customId === 'block') {
        //             collector.stop();
        //             let dmgTaken = enemy.randDamage();

        //             let blockStrength;
        //             if (player.totalDefence <= 0) {
        //                 dmgTaken = player.takeDamge(dmgTaken);
        //             } else {
        //                 blockStrength = player.totalDefence * 1.5;
        //                 if ((blockStrength - dmgTaken) <= 0) {
        //                     dmgTaken -= blockStrength;
        //                     dmgTaken = player.takeDamge(dmgTaken);
        //                 } else {
        //                     blockStrength -= dmgTaken;
        //                     let counterDamage = (blockStrength * 0.25) + ((player.health * 0.02) * (player.str * 0.4));
        //                     await runCombatTurn(player, enemy, counterDamage);
        //                 }
        //             }
        //             if (enemy.dead) return;
        //             await showDamageTaken(player, dmgTaken, true);
        //             return display(player, enemy);
        //         }
        //         // Potion Break!
        //         if (COI.customId === 'potone') {
        //             const potionUsed = await findPotion(player.loadout[5], userID);
        //             const result = await handleUsePotion(potionUsed, player);
        //             const reinEffects = await ActiveStatus.findAll({ where: [{ spec_id: userID }, { activec: 'Reinforce' }, { duration: {[Op.gt]: 0}}] });
        //             if (reinEffects > 0) player.updateDefence(reinEffects);
        //             const tonEffects = await ActiveStatus.findAll({ where: [{ spec_id: userID }, { activec: 'Tons' }, { duration: { [Op.gt]: 0 } }] });
        //             if (tonEffects > 0) player.updateUPs(tonEffects);
        //             if (result !== 'Success') console.log('Potion effect not applied!');
        //             collector.stop();
        //             return display(player, enemy);
        //         }
        //     });

        //     collector.on('end', () => {
        //         combatEmbed.delete().catch(error => {
        //             if (error.code !== 10008) {
        //                 console.error('Failed to delete the message:', error);
        //             }
        //         });
        //     });
        // }

        // async function findItem(player, enemy, stealRar) {
        //     let foundRar = 0;
        //     if (!stealRar) {
        //         foundRar = await grabRar(enemy.level);
        //     } else foundRar = stealRar;

        //     const upgradeChance = Math.random();
        //     if (foundRar < 10) if (upgradeChance >= player.mods[5]) foundRar++;

        //     let choices = [];
        //     for (const [key, value] of gearDrops) {
        //         if (value === foundRar) choices.push(key);
        //     }

        //     if (choices.length <= 0) {
        //         console.error('NO ITEM CHOICES FOR FOUND RARITY:', foundRar);
        //         return await interaction.followUp('Something went wrong while spawning that item!');
        //     }

        //     const picked = randArrPos(choices);
        //     const filtered = lootList.filter(item => item.Loot_id === picked);
        //     const itemFound = filtered[0];
        //     if (itemFound) return itemFound;
        // }

        // function makeItemText(item) {
        //     let itemText;

        //     if (item.Slot === 'Mainhand') {
        //         itemText =
        //             `Value: ${item.Value}c\nRarity: ${item.Rarity}\nAttack: ${item.Attack}\nType: ${item.Type}\nHands: ${item.Hands}\nSlot: ${item.Slot}`;
        //     } else if (item.Slot === 'Offhand') {
        //         itemText =
        //             `Value: ${item.Value}c\nRarity: ${item.Rarity}\nAttack: ${item.Attack}\nDefence: ${item.Defence}\nType: ${item.Type}\nHands: ${item.Hands}\nSlot: ${item.Slot}`;
        //     } else {
        //         itemText =
        //             `Value: ${item.Value}c\nRarity: ${item.Rarity}\nDefence: ${item.Defence}\nType: ${item.Type}\nSlot: ${item.Slot}`;
        //     }

        //     return itemText;
        // }

        // async function showDamageTaken(player, dmg, blocked) {
        //     let embedTitle = 'Damage Taken';
        //     dmg = Number.parseFloat(dmg).toFixed(1);
        //     player.health = Number.parseFloat(player.health).toFixed(1);
        //     if (blocked) embedTitle = 'Damage Blocked';
        //     const attackDmgEmbed = new EmbedBuilder()
        //         .setTitle(embedTitle)
        //         .setColor('DarkRed')
        //         .addFields(
        //             { name: 'DAMAGE: ', value: `${dmg}`, inline: true },
        //             { name: 'HEALTH REMAINING: ', value: `${player.health}`, inline: true },
        //         );

        //     await interaction.channel.send({ embeds: [attackDmgEmbed], ephemeral: true }).then(attkEmbed => setTimeout(() => {
        //         attkEmbed.delete();
        //     }, 15000)).catch(error => console.error(error));
        //     return;
        // }

        // async function playerDead(enemy) {
        //     const reviveButton = new ButtonBuilder()
        //         .setCustomId('primary')
        //         .setLabel('Revive')
        //         .setStyle(ButtonStyle.Danger)
        //         .setEmoji('💀');

        //     const grief = new ActionRowBuilder().addComponents(reviveButton);

        //     const enemyRef = await ActiveEnemy.findOne({ where: [{ constkey: enemy.constkey }] });
        //     const userRef = await grabU();

        //     const specMsgChance = Math.random();
        //     const msgID = randArrPos(deathMsgList);
        //     let deathMsg;
        //     if (specMsgChance >= 0.9) {
        //         deathMsg = msgID.Value;
        //     } else {
        //         deathMsg = `Fighting fearlessly till the end, ${userRef.username}, nonetheless fell prey to ${enemyRef.name}`;
        //     }

        //     await updateDiedTo(enemyRef, userRef);

        //     const deadEmbed = new EmbedBuilder()
        //         .setTitle('YOU HAVE FALLEN IN COMBAT')
        //         .setColor('DarkGold')
        //         .addFields(
        //             { name: `Obituary`, value: deathMsg, inline: true });

        //     const embedMsg = await interaction.channel.send({ embeds: [deadEmbed], components: [grief], ephemeral: true });

        //     const filter = (i) => i.user.id === userID;

        //     const collector = embedMsg.createMessageComponentCollector({
        //         componentType: ComponentType.Button,
        //         filter,
        //         time: 40000,
        //     });

        //     collector.on('collect', (collInteract) => {
        //         if (collInteract.customId === 'primary') {
        //             collector.stop();
        //             return revive(userRef);
        //         }
        //     });

        //     collector.on('end', () => {
        //         if (embedMsg) {
        //             embedMsg.delete().catch(error => {
        //                 if (error.code !== 10008) {
        //                     console.error('Failed to delete the message:', error);
        //                 }
        //             });
        //         }
        //     });
        // }

        // async function updateDiedTo(enemy, user) {
        //     await UserData.update({ lastdeath: enemy.name }, { where: { userid: userID } });
        //     if (user.highestkills < user.killsthislife) {
        //         await UserData.update({ highestkills: user.killsthislife }, { where: { userid: userID } });
        //     }
        //     const killreset = await UserData.update({ killsthislife: 0 }, { where: { userid: userID } });
        //     if (killreset > 0) return;
        // }

        // async function revive(user) {
        //     const totalHealth = 100 + (user.strength * 10);
        //     const editRow = await UserData.update({ health: totalHealth }, { where: { userid: userID } });
        //     if (editRow > 0) return;
        // }

        // async function enemyDead(player, enemy) {
        //     const enemyRef = await ActiveEnemy.findOne({ where: { constkey: enemy.constkey } });
        //     const userRef = await grabU();
        //     await updateValues(player, userRef);

        //     let xpGained = Math.floor(Math.random() * (enemyRef.xpmax - enemyRef.xpmin + 1) + enemyRef.xpmin);

        //     const coinsGained = xpGained + Math.floor(Math.random() * (10 - 1) + 1);


        //     await isLvlUp(xpGained, coinsGained, interaction, userRef);

        //     let blueyDropRate = 0.98;
        //     const blueyRolled = Math.random();
        //     if (blueyRolled > blueyDropRate) {
        //         await dropRandomBlueprint(userRef.level, userID, interaction);
        //     }

        //     await grabMat(enemyRef, userRef, interaction);

        //     const activeEffect = await ActiveStatus.findOne({ where: { spec_id: userID } });
        //     if (activeEffect) {
        //         const activeEffects = await ActiveStatus.findAll({ where: { spec_id: userID } });
        //         let runCount = 0;
        //         let currEffect;
        //         do {
        //             currEffect = activeEffects[runCount];
        //             var coolDownReduce = currEffect.cooldown - 1;
        //             var durationReduce = currEffect.duration - 1;

        //             if (durationReduce <= 0) {
        //                 durationReduce = 0;
        //             }

        //             if (coolDownReduce <= 0) {
        //                 //Cooldown Complete!
        //                 //console.log(basicInfoForm('COOLDOWN COMPLETE!'));
        //                 await ActiveStatus.destroy({ where: [{ spec_id: userID }, { potionid: currEffect.potionid }] });
        //             } else {
        //                 await ActiveStatus.update({ cooldown: coolDownReduce }, { where: [{ spec_id: userID }, { potionid: currEffect.potionid }] });
        //                 await ActiveStatus.update({ duration: durationReduce }, { where: [{ spec_id: userID }, { potionid: currEffect.potionid }] });
        //             }
        //             runCount++;
        //         } while (runCount < activeEffects.length)
        //     }

        //     await isUniqueLevelUp(interaction, userRef);

        //     const activeCombatTasks = await UserTasks.findAll({where: {userid: userRef.userid, task_type: "Combat", complete: false, failed: false}});
        //     if (activeCombatTasks.length > 0){
        //         //Combat tasks found, check if conditions met
        //         const filterTasks = activeCombatTasks.filter(task => task.condition <= enemy.level);
        //         if (filterTasks.length > 0) {
        //             for (const task of filterTasks){
        //                 const inc = await task.increment('amount');
        //                 if (inc) await task.save();
        //             }
        //             console.log('Combat tasks updated!');
        //         }
        //     }

        //     await userRef.increment(['totalkills', 'killsthislife'], { by: 1 });
        //     await userRef.save();

        //     if (userRef.totalkills > 10) {
        //         await checkHintStats(userRef, interaction);
        //     }

        //     if (enemy.hasItem) {
        //         const madeItem = await findItem(player, enemy);
        //         const itemCheck = await checkOwned(userRef, madeItem);
        //         if (itemCheck !== 'Finished') return await interaction.followUp(`Something went wrong while adding an item ${madeItem.Name}`);

        //         const fieldName = `${madeItem.Name}`;
        //         const fieldValue = makeItemText(madeItem);
        //         const embedColour = await grabColour(madeItem.Rar_id);

        //         const itemDropEmbed = new EmbedBuilder()
        //             .setTitle('~LOOT DROPPED~')
        //             .setColor(embedColour)
        //             .addFields(
        //                 { name: fieldName, value: fieldValue });

        //         await interaction.channel.send({ embeds: [itemDropEmbed], ephemeral: true }).then(embedMsg => setTimeout(() => {
        //             embedMsg.delete();
        //         }, 25000)).catch(error => console.error(error));
        //     }

        //     const row = new ActionRowBuilder()
        //         .addComponents(
        //             new ButtonBuilder()
        //                 .setCustomId('spawn-new')
        //                 .setLabel('New Enemy')
        //                 .setStyle(ButtonStyle.Success)
        //                 .setDisabled(false)
        //                 .setEmoji('💀'));

        //     const killedEmbed = new EmbedBuilder()
        //         .setTitle("YOU KILLED THE ENEMY!")
        //         .setColor(0o0)
        //         .setDescription("Well done!")
        //         .addFields(
        //             { name: 'Xp Gained', value: `${xpGained}`, inline: true },
        //             { name: 'Coins Gained', value: `${coinsGained}`, inline: true },
        //         );

        //     const specCode = userID + enemyRef.constkey;

        //     await ActiveEnemy.destroy({ where: [{ specid: specCode }, { constkey: enemyRef.constkey }] });

        //     if (!newEnemy.has(userID)) {
        //         await interaction.channel.send({ embeds: [killedEmbed], ephemeral: true }).then(embedMsg => setTimeout(() => {
        //             embedMsg.delete();
        //         }, 25000)).catch(error => console.error(error));
        //     } else {
        //         const embedMsg = await interaction.channel.send({ embeds: [killedEmbed], components: [row], ephemeral: true });

        //         const filter = (i) => i.user.id === userID;

        //         const collector = embedMsg.createMessageComponentCollector({
        //             componentType: ComponentType.Button,
        //             filter,
        //             time: 40000,
        //         });

        //         collector.on('collect', async (collInteract) => {
        //             if (collInteract.customId === 'spawn-new') {
        //                 //console.log(specialInfoForm('SPAWN-NEW WAS PRESSED!'));
        //                 await collInteract.deferUpdate();
        //                 //delete the embed here
        //                 collector.stop();
        //                 startCombat();//run the entire script over again
        //             }
        //         });

        //         collector.on('end', () => {
        //             if (embedMsg) {
        //                 embedMsg.delete().catch(error => {
        //                     if (error.code !== 10008) {
        //                         console.error('Failed to delete the message:', error);
        //                     }
        //                 });
        //             }
        //         });


        //     }
        // }

        // async function updateValues(player, user) {
        //     const tableUpdate = await user.update({
        //         health: player.health
        //     });
        //     if (tableUpdate > 0) return await user.save();
        // }

        // async function runCombatTurn(player, enemy, blocking) {
        //     let embedTitle = 'Damage Dealt';
        //     let embedColour = 'NotQuiteBlack';
        //     let fieldName = '';
        //     let fieldValue = '';
        //     let fieldObj = {};
        //     let finalFields = [];

        //     let initialDamage;
        //     if (!blocking) initialDamage = player.curDamage;
        //     if (blocking) initialDamage = blocking;

        //     if (player.isHidden) {
        //         initialDamage += initialDamage * 0.5;
        //         player.isHidden = false;
        //     } 

        //     const critChance = player.mods[2];
        //     const dhChance = player.mods[3];
        //     const gearTypes = player.loadoutTypes.slice(3, 5);
        //     for (const type of gearTypes) {
        //         if (type.toLowerCase() === enemy.weakTo.toLowerCase()) {
        //             initialDamage += initialDamage * 0.5;
        //         }
        //     }

        //     const staticDamage = initialDamage;
        //     const turns = [];
        //     let turnDamageOne = {
        //         type: 'Normal',
        //         dmg: staticDamage,
        //     };

        //     let turnDamageTwo = {
        //         type: 'Normal',
        //         dmg: staticDamage,
        //     };

        //     const rolledDH = Math.random();
        //     let runFor = 1;
        //     if (rolledDH <= dhChance) {
        //         runFor = 2;
        //         turnDamageOne.type = 'Double Hit';
        //         turnDamageTwo.type = 'Double Hit';
        //         embedColour = 'Aqua';
        //     }

        //     let i = 0;
        //     let thisTurn;
        //     do {
        //         if (i === 0) thisTurn = turnDamageOne;
        //         if (i === 1) thisTurn = turnDamageTwo;
        //         initialDamage = staticDamage;

        //         let rolledCrit = Math.random();
        //         if (rolledCrit <= critChance) {
        //             embedColour = 'LuminousVividPink';
        //             initialDamage *= 2;                  
        //             thisTurn.type = 'Critical Hit';
        //             thisTurn.dmg = initialDamage;
        //         } else {
        //             thisTurn.type = 'Normal';
        //             thisTurn.dmg = initialDamage;
        //         }
        //         turns.push(thisTurn);
        //         i++;
        //     } while (i < runFor)

        //     for (let i = 0; i < turns.length; i++) {
        //         fieldName = turns[i].type;

        //         let newDmg;
        //         if (!blocking) {
        //             newDmg = turns[i].dmg - (enemy.defence * 2);
        //             enemy.curHealth(turns[i].dmg);
        //         } else {
        //             newDmg = turns[i].dmg + (enemy.defence * 2); // Reseting Defence during enemy taking damage
        //             enemy.curHealth(newDmg);
        //         }
        //         newDmg = Number.parseFloat(newDmg).toFixed(1);
        //         fieldValue = newDmg;

        //         fieldObj = { name: fieldName, value: `${fieldValue}`, inline: true };
        //         finalFields.push(fieldObj);
        //     }

        //     if (finalFields.length > 0) {
        //         const embed = new EmbedBuilder()
        //             .setTitle(embedTitle)
        //             .setColor(embedColour)
        //             .addFields(finalFields);

        //         await interaction.channel.send({ embeds: [embed], ephemeral: true }).then(embedMsg => setTimeout(() => {
        //             embedMsg.delete();
        //         }, 20000)).catch(error => console.error(error));
        //         if (enemy.dead) return enemyDead(player, enemy);
        //         if (player.dead) return playerDead(enemy);
        //         if (!blocking) {
        //             let dmgTaken = enemy.randDamage();
        //             dmgTaken = player.takeDamge(dmgTaken);
        //             await showDamageTaken(player, dmgTaken);
        //             return display(player, enemy);
        //         } 
        //         return;
        //     }
        // }

        // async function handleUsePotion(potion, player) {
        //     let appliedEffect;
        //     if (potion.activecategory === 'Healing') {
        //         const filterHeal = aCATE.filter(effect => effect.Name === 'Healing');
        //         const healAmount = filterHeal[0][`${potion.name}`];
        //         let newHealth;
        //         if (healAmount <= 0) return "No Heal";
        //         appliedEffect = 0;
        //         const totalHealth = 100 + (player.str * 10);
        //         if (player.health === totalHealth) return await interaction.followUp('You are already at maximum health!!');
        //         if ((player.health + healAmount) > totalHealth) {
        //             newHealth = totalHealth;
        //         } else newHealth = player.health + healAmount;
        //         console.log('Player Health: ', player.health);
        //         console.log('New Health: ', newHealth);
        //         player.health = newHealth;
        //         await interaction.followUp(`Healing potion used. Healed for: ${healAmount}\nCurrent Health: ${player.health}`);
        //     }
        //     if (potion.activecategory === 'Reinforce') {
        //         const filterDefence = aCATE.filter(effect => effect.Name === 'Reinforce');
        //         const defenceAmount = filterDefence[0][`${potion.name}`];
        //         if (defenceAmount > 0) {
        //             //console.log(successResult('FOUND DEFENCE BOOST'));
        //             appliedEffect = defenceAmount;
        //             await interaction.followUp(`Reinforcement potion used. Defence increased by: ${defenceAmount}`);
        //         }
        //     }
        //     if (potion.activecategory === 'Tons') {
        //         const filterStats = aCATE.filter(effect => effect.Name === 'Tons');
        //         const statBoost = filterStats[0][`${potion.name}`];
        //         if (statBoost > 0) {
        //             //console.log(successResult('FOUND STAT BOOST'));
        //             appliedEffect = statBoost;
        //             await interaction.followUp(`Tons of Stats potion used. ALL stats increased by: ${statBoost}`);
        //         }
        //     }
        //     if (potion.activecategory === 'EXP') {
        //         const filterEXP = aCATE.filter(effect => effect.Name === 'EXP');
        //         const expBoost = filterEXP[0][`${potion.name}`];
        //         if (expBoost > 0) {
        //             //console.log(successResult('FOUND EXP BOOST'));
        //             appliedEffect = expBoost;
        //             await interaction.followUp(`EXP potion used. EXP gain increased by: ${expBoost}`);
        //         }
        //     }
        //     const result = await applyStatus(appliedEffect, potion);
        //     if (result !== 'Success') return 'Failure';
        //     return 'Success';
        // }

        // async function applyStatus(appliedEffect, potion) {
        //     const activeDC = await ActiveStatus.findOne({ where: [{ potionid: potion.potion_id }, { spec_id: userID }] });
        //     if (activeDC) {
        //         const tableUpdate = await activeDC.update({ cooldown: potion.cooldown, duration: potion.duration });
        //         if (tableUpdate <= 0) return 'Failure';
        //     } else {
        //         await ActiveStatus.create({
        //             name: potion.name,
        //             curreffect: appliedEffect,
        //             activec: potion.activecategory,
        //             cooldown: potion.cooldown,
        //             duration: potion.duration,
        //             potionid: potion.potion_id,
        //             spec_id: userID,
        //         });
        //     }

        //     if ((potion.amount - 1) <= 0) {
        //         const potionUpdate = await OwnedPotions.destroy({ where: [{ potion_id: potion.potion_id }, { spec_id: userID }] });
        //         if (potionUpdate > 0) return 'Success';
        //     } else {
        //         await potion.decrement('amount');
        //         await potion.save();
        //         return 'Success';
        //     }
        // }
    }
};
