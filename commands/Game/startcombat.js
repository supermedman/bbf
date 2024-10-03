const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { checkHintStats, checkHintLootView } = require('./exported/handleHints.js');

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
                await thePlayer.retrieveLoadout(interaction);
            } else {
                console.log('Reloading Loadout/Internals');
                await thePlayer.reloadInternals(interaction);
            }

            if (thePlayer.internalEffects.potions.length === 0){
                await thePlayer.preloadEffects(interaction);
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
            await player.reloadInternals(interaction);

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
            await player.updatePotionCounters(interaction);
            // // Handle potions used
            // await player.checkPotionUse();
            // // Handle potion durations/cooldowns
            // await player.handlePotionCounters();
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

            if (dropChance(0.94)){
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
            const outcome = await player.potionUsed(interaction);
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
    }
};
