const { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const {chlkPreset, chalk} = require('../../chalkPresets');

const { CombatInstance } = require('./Export/Classes/CombatLoader');
const { EnemyFab } = require('./Export/Classes/EnemyFab');

const { createNewEnemyImage } = require('../Game/exported/displayEnemy');

const { attackEnemy, handleActiveStatus, applyActiveStatus } = require('./Export/combatContainer');

const {
    loadPlayer,
    loadEnemy,
    loadDamageItems,
    loadDefenceItems,
    genAttackTurnEmbed,
    genStatusResultEmbed,
    handleEnemyAttack,
    dropItem
} = require('./Export/finalCombatExtras');
const { handleEnemyMat } = require('./Export/materialFactory');

const {endTimer, sendTimedChannelMessage, createInteractiveChannelMessage, grabUser} = require('../../uniHelperFunctions');
const { handleUserPayout } = require('./Export/uni_userPayouts');

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

const statusColourMatch = new Map([
    ["Little Bleed", {rank: 1, colour: 0xEA9999}],
    ["Bleed", {rank: 1, colour: 0xE06666}],
    ["Big Bleed", {rank: 1, colour: 0xC91B1B}],
    ["Smolder", {rank: 1, colour: 0xD94720}],
    ["Burn", {rank: 1, colour: 0xCC2B00}],
    ["Inferno", {rank: 1, colour: 0x1AA199}],
    ["Concussion", {rank: 2, colour: 0x8E7CC3}],
    ["Confusion", {rank: 2, colour: 0xD5A6BD}],
    ["Slow", {rank: 3, colour: 0x9FC5E8}],
    ["Blind", {rank: 4, colour: 0x434343}],
    ["Flash", {rank: 4, colour: 0xFFFFFF}],
    ["MagiWeak", {rank: 5, colour: 0xF1C232}]
]);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('finalcombat')
        .setDescription('Final Testing Grounds for Combat V3'),

	async execute(interaction) { 

        const { enemies, combatInstance, betaTester, gearDrops } = interaction.client; 

        if (!betaTester.has(interaction.user.id)) return await interaction.reply('Sorry, this command is being tested and is unavailable.');

        let startTime, displayStartTime;
        async function preloadCombat(){
            await interaction.deferReply();

            const preLoadStart = new Date().getTime();

            const thePlayer = loadPlayer(interaction.user.id, combatInstance);
            if (!thePlayer.staticStats) await thePlayer.retrieveBasicStats();
            if (thePlayer.loadout.ids.length === 0) {
                await thePlayer.retrieveLoadout();
            } else {
                await thePlayer.reloadInternals();
            }

            const theEnemy = loadEnemy(thePlayer.level, enemies);
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

            const useImageDisplay = true; // Used for display testing
            const replyType = {};

            displayStartTime = new Date().getTime();

            if (useImageDisplay){
                const eFile = await createNewEnemyImage(enemy);
                replyType.files = [eFile];
            } else {
                const combEmbed = genEnemyEmbed(enemy);
                replyType.embeds = [combEmbed];
            }

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
            const combatResult = attackEnemy(player.staticDamage, enemy, rolledCondition, player.staticDamageBoost);
            if (combatResult.outcome === 'Dead'){
                console.log(chlkPreset.bInfoOne('Enemy dies to first strike'));
                // Handle Dead Enemy
                enemyDead = true;
            }

            let wasStatusChecked = "Status Not Checked";
            let returnedStatus = 'None';
            if (!enemyDead){
                wasStatusChecked =  handleActiveStatus(combatResult, enemy, rolledCondition);
                if (wasStatusChecked !== "Status Not Checked" || enemy.activeEffects.length > 0){
                    returnedStatus = applyActiveStatus(combatResult, enemy);
                }
            }
            
            // ================
            // RECHECK DEAD STATUS
            // ================
            if (enemy.flesh.HP <= 0){
                console.log(chlkPreset.bInfoOne('Enemy dies to status effects'));
                enemyDead = true;
            }

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

            console.log(enemy);
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
            let newAccess = true;

            // =============
            // Enemy Payouts
            // =============
            let xpGain = enemy.rollXP();
            let coinGain = xpGain + Math.floor(xpGain * 0.10);

            await handleUserPayout(xpGain, coinGain, interaction, await grabUser(player.userId));

            // Material Drops
            const { materialFiles } = interaction.client;
            const matDropReplyObj = await handleEnemyMat(enemy, player.userId, materialFiles, interaction);
            await sendTimedChannelMessage(interaction, 60000, matDropReplyObj);
            // Item Drops
            if (enemy.payouts.item){
                const iE = await dropItem(gearDrops, player, enemy);
                await sendTimedChannelMessage(interaction, 60000, iE);
            }

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

            const killedEmbed = new EmbedBuilder()
            .setTitle("Enemy Killed!")
            .setColor(0o0)
            .setDescription("Your rewards: ")
            .addFields(
                {name: "Xp Gained: ", value: `${xpGain}`, inline: true},
                {name: "Coins Gained: ", value: `${coinGain}`, inline: true}
            );

            if (!newAccess){
                await sendTimedChannelMessage(interaction, 35000, killedEmbed);
            } else {
                const combReplyObj = {embeds: [killedEmbed], components: [eRow]};
                const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 80000, combReplyObj);

                collector.on('collect', async c => {
                    await c.deferUpdate().then(async () => {
                        if (c.customId === 'spawn-new'){
                            collector.stop();
                            return combatLooper(player, loadEnemy(player.level, enemies));
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
            }
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
            .setTitle('Potion')
            .setDescription(outcome)
            .addFields({name: "Your Health: ", value: `${player.health}`});

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
                    .setTitle('Uni Item Text');
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

        /**
         * This function generates the enemies embed for each combat turn,
         * Its colour changes depending on if any status effects are active and 
         * the colour itself is based on which effect(s) are present.
         * @param {EnemyFab} enemy EnemyFab Instance Object
         * @returns {EmbedBuilder}
         */
        function genEnemyEmbed(enemy){
            const enemyEmbed = new EmbedBuilder()
            .setTitle(`Level ${enemy.level}: **${enemy.name}**`)
            .setDescription(`Description: *${enemy.description}*`);

            let finalFields = [];
            let hpFields = genEnemyHPFields(enemy);

            let statusFields = [], finalColour = 'DarkButNotBlack';
            if (enemy.activeEffects.length > 0){
                const bldList = ["Little Bleed", "Bleed", "Big Bleed"];
                const brnList = ["Smolder", "Burn", "Inferno"];
                let rankedColour = {rank: 0, colour: 0x000000};
                let strgBleed = -1, strgBrn = -1;
                let fieldValues = "";
                let curRun = 0, lastRun = enemy.activeEffects.length;
                for (const effect of enemy.activeEffects){
                    if (bldList.indexOf(effect.Type) !== -1){
                        strgBleed = (strgBleed > bldList.indexOf(effect.Type)) ? strgBleed : bldList.indexOf(effect.Type);
                    }
                    if (brnList.indexOf(effect.Type) !== -1){
                        strgBrn = (strgBrn > brnList.indexOf(effect.Type)) ? strgBrn : brnList.indexOf(effect.Type);
                    }
                    
                    // Decide Embed Colour Here
                    if (bldList.indexOf(effect.Type) === brnList.indexOf(effect.Type) === -1){
                        let rankObj = statusColourMatch.get(effect.Type);
                        if (rankObj.rank > rankedColour.rank){
                            rankedColour.rank = rankObj.rank;
                            rankedColour.colour = rankObj.colour;
                        }
                    }

                    curRun++;
                    fieldValues += (curRun < lastRun) ? `${effect.Type}, `: `${effect.Type}`;
                }
                const fieldObj = {name: "Active Effects:", value: fieldValues};
                statusFields.push(fieldObj);

                if (rankedColour.rank < 2){
                    if (strgBleed > -1 || strgBrn > -1){
                        let rankMatch;
                        if (strgBleed === -1) {
                            rankMatch = statusColourMatch.get(brnList[strgBrn]);
                            rankedColour.colour = rankMatch.colour;
                        } else if (strgBrn === -1){
                            rankMatch = statusColourMatch.get(bldList[strgBleed]);
                            rankedColour.colour = rankMatch.colour;
                        } else {
                            const strongestMatch = (strgBleed > strgBrn) ? statusColourMatch.get(bldList[strgBleed]) : statusColourMatch.get(brnList[strgBrn]);
                            rankedColour.colour = strongestMatch.colour;
                        }
                    }
                }
                finalColour = rankedColour.colour;
            }
            finalFields = hpFields.concat(statusFields);

            enemyEmbed.setColor(finalColour);
            enemyEmbed.addFields(finalFields);

            return enemyEmbed;
        }

        /**
         * This function generates the HP type display portion of the enemy combat embed
         * @param {EnemyFab} enemy Enemy Instance Object
         * @returns {object[]} Array of {name: string, value: string} objects
         */
        function genEnemyHPFields(enemy){
            let hpFields = [];
            for (let i = 0; i < 3; i++){
                let fieldName = '', fieldValue = '', fieldObj = {};
                if (i === 0){
                    fieldName = '**Flesh**';
                    fieldValue = `Type: ${enemy.flesh.Type}\nHP: ${enemy.flesh.HP}`;
                } else if (i === 1){
                    fieldName = (enemy.armor.HP > 0) ? '**Armor**' : '**NO ARMOR**';
                    fieldValue = (enemy.armor.HP > 0) ? `Type: ${enemy.armor.Type}\nHP: ${enemy.armor.HP}` : 'None';
                } else if (i === 2){
                    fieldName = (enemy.shield.HP > 0) ? '**Shield**' : '**NO SHIELD**';
                    fieldValue = (enemy.shield.HP > 0) ? `Type: ${enemy.shield.Type}\nHP: ${enemy.shield.HP}` : 'None';
                }
                fieldObj = {name: fieldName, value: fieldValue};
                hpFields.push(fieldObj);
            }
            return hpFields;
        }

        preloadCombat();
	},
};