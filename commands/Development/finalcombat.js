const { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const {chlkPreset, chalk} = require('../../chalkPresets');

const { CombatInstance } = require('./Export/Classes/CombatLoader');
const { EnemyFab } = require('./Export/Classes/EnemyFab');

const { createNewEnemyImage } = require('../Game/exported/displayEnemy');

const { attackEnemy, enemyAttack, handleActiveStatus, applyActiveStatus } = require('./Export/combatContainer');

const {
    loadPlayer,
    loadEnemy,
    loadDamageItems,
    loadDefenceItems
} = require('./Export/finalCombatExtras');
const { checkInboundItem } = require('./Export/itemMoveContainer');
const { uni_displayItem } = require('./Export/itemStringCore');
const { handleEnemyMat } = require('./Export/materialFactory');

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

const randArrPos = (arr) => {
    return arr[(arr.length > 1) ? Math.floor(Math.random() * arr.length) : 0];
};

/**
 * This method handles styling timers based on time difference found, and then
 * handles logging the output accordingly.
 * @param {number} startTime Start Time for measurement
 * @param {string} measureName Display String for measurement
 */
const endTimer = (startTime, measureName) => {
    const endTime = new Date().getTime();
    const timeDiff = endTime - startTime;
    let preStyle;
    if (timeDiff === 0){
        preStyle = chalk.blueBright.bgGrey;
    } else if (timeDiff >= 25000){
        preStyle = chlkPreset.err;
    } else if (timeDiff >= 10000){
        preStyle = chalk.red.bgGrey;
    } else if (timeDiff >= 5000){
        preStyle = chalk.redBright.bgGrey;
    } else if (timeDiff >= 2500){
        preStyle = chalk.yellowBright.bgGrey;
    } else if (timeDiff >= 1000){
        preStyle = chalk.yellow.bgGrey;
    } else if (timeDiff >= 500){
        preStyle = chalk.green.dim.bgGrey;
    } else if (timeDiff >= 150){
        preStyle = chalk.greenBright.bgGrey;
    } else {
        preStyle = chalk.blueBright.bgGrey;
    }
    console.log(preStyle(`${measureName} Duration: ${timeDiff}ms`));
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('finalcombat')
        .setDescription('Final Testing Grounds for Combat V3'),

	async execute(interaction) { 

        const { enemies, combatInstance, betaTester } = interaction.client; 

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
            const combatMessage = await interaction.followUp(replyType);

            // REPLY TIME LOG
            endTimer(msgStart, "Final Interaction Reply");
            const filter = (i) => i.user.id === interaction.user.id;

            const combCollector = combatMessage.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 60000,
            });

            combCollector.on('collect', async c => {
                await c.deferUpdate().then(async () => {
                    // let collectorReason = "None";
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
            
            await interaction.channel.send({embeds: playerCombEmbeds}).then(embedMsg => setTimeout(() => {
                embedMsg.delete();
            }, 35000)).catch(e => console.error(e));

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
            return eTurnOutcome;
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
            
            
            // Spawn New Enemy Access
            let newAccess = true;


            
            // =============
            // Enemy Payouts
            // =============
            let xpGain = enemy.rollXP();
            let coinGain = xpGain + Math.floor(xpGain * 0.10);

            
            // Material Drops
            const { materialFiles } = interaction.client;

            const matDropReplyObj = await handleEnemyMat(enemy, player.userId, materialFiles, interaction);
            await interaction.channel.send(matDropReplyObj).then(matMsg => setTimeout(() => {
                matMsg.delete();
            }, 60000)).catch(e=>console.error(e));


            // Item Drops
            if (enemy.payouts.item){
                const iE = await dropItem(player, enemy);
                await interaction.channel.send({embeds: [iE]}).then(dropEmbed => setTimeout(() => {
                    dropEmbed.delete();
                }, 60000)).catch(e => console.error(e));
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
                await interaction.channel.send({embeds: [killedEmbed]}).then(embedMsg => setTimeout(() => {
                    embedMsg.delete();
                }, 30000)).catch(e => console.error(e));
            } else {
                const embedMsg = await interaction.channel.send({embeds: [killedEmbed], components: [eRow]});

                const filter = (i) => i.user.id === interaction.user.id;

                const newCollector = embedMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    filter,
                    time: 80000
                });

                newCollector.on('collect', async c => {
                    await c.deferUpdate().then(async () => {
                        if (c.customId === 'spawn-new'){
                            newCollector.stop();
                            return combatLooper(player, loadEnemy(player.level, enemies));
                        }
                    }).catch(e => console.error(e));
                });

                newCollector.on('end', (c, r) => {
                    embedMsg.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                });
            }
        }


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

            const embedMsg = await interaction.channel.send({ embeds: [deadEmbed], components: [grief]});
            
            const filter = (i) => i.user.id === interaction.user.id;

            const collector = embedMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 40000,
            });
            
            // =============
            //    Revive
            // =============
            collector.on('collect', async c => {
                await c.deferUpdate().then(async () => {
                    if (c.customId === 'revive'){
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
            .setDescription(outcome);

            await interaction.channel.send({embeds: [potEmbed]}).then(potMsg => setTimeout(() => {
                potMsg.delete();
            }, 35000)).catch(e=>console.error(e));
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
                    stealEmbed = await dropItem(player, enemy, outcome);
                    player.buttonState.steal.disable = true;
                break;
            }

            await interaction.channel.send({embeds: [stealEmbed]}).then(stealMsg => setTimeout(() => {
                stealMsg.delete();
            }, 45000)).catch(e=>console.error(e));
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

            await interaction.channel.send({embeds: [hideEmbed]}).then(hideMsg => setTimeout(() => {
                hideMsg.delete();
            }, 45000)).catch(e=>console.error(e));
            return (fail) ? await handleEnemyAttack(player, enemy) : "RELOAD";
        }

        /**
         * This function fully handles an item being dropped, stored, saved, and displayed!
         * @param {CombatInstance} player CombatINstance Object
         * @param {EnemyFab} enemy EnemyFab Object
         * @param {(number|undefined)} forcedRar Forced rarity picked || Undefined
         * @returns {promise <EmbedBuilder>}
         */
        async function dropItem(player, enemy, forcedRar){
            // Generate Item
            const rar = forcedRar ?? await player.rollItemRar(enemy);

            const { gearDrops } = interaction.client;

            let choices = [];
            for (const [key, value] of gearDrops) {
                if (value === rar) choices.push(key);
            }

            const picked = randArrPos(choices);
            const theItem = await checkInboundItem(player.userId, picked);

            const itemEmbed = new EmbedBuilder()
            .setTitle('Loot Dropped');

            const grabbedValues = uni_displayItem(theItem, "Single");
            itemEmbed
            .setColor(grabbedValues.color)
            .addFields(grabbedValues.fields);

            return itemEmbed;
        }

        /**
         * This function handles the enemy attacking the player, this allows for an attack
         * to be called from anywhere as needed.
         * @param {CombatInstance} player CombatInstance Object
         * @param {EnemyFab} enemy EnemyFab Object
         * @returns {promise <string>} "RELOAD"
         */
        async function handleEnemyAttack(player, enemy){
            const enemyAttacks = enemy.attack();
            if (enemyAttacks === "MISS"){
                // Enemy Miss, combat turn ends .stop('RELOAD');
                const enemyMissEmbed = new EmbedBuilder()
                .setTitle('Enemy Misses Attack!!')
                .setDescription('You take no damage!');

                await interaction.followUp({embeds: [enemyMissEmbed]}).then(embedMsg => setTimeout(() => {
                    embedMsg.delete();
                }, 35000)).catch(e => console.error(e));
                // =================== TIMER END
                endTimer(startTime, "Final Combat");
                // =================== TIMER END
                return "RELOAD";
            }
            // Enemy Attack
            const enemyAttackOutcome = enemyAttack(player.staticDefence, enemyAttacks);

            // =================== TIMER END
            endTimer(startTime, "Final Combat");
            // =================== TIMER END

            const enemyAttacksEmbed = new EmbedBuilder()
            .setTitle('Enemy Attacks!!')
            .setColor('DarkRed')
            .setDescription(`${enemyAttackOutcome.outcome}: ${enemyAttackOutcome.dmgTaken}`);

            await interaction.channel.send({embeds: [enemyAttacksEmbed]}).then(embedMsg => setTimeout(() => {
                embedMsg.delete();
            }, 35000)).catch(e => console.error(e));
            
            return "RELOAD"; // TEMP
            // PLAYER DEAD ? true .stop('PDEAD') : false .stop('RELOAD');
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

        /**
         * This function generates an embed to display all status effect damage and 
         * details for the current combat turn.
         * @param {object} statObj Contains all status effect details
         * @returns {EmbedBuilder} Constructed display embed for status effect details 
         */
        function genStatusResultEmbed(statObj){
            const statEmbed = new EmbedBuilder()
            .setTitle(`__**Status Effects**__`)
            .setColor('DarkBlue');

            let descStr = "", finalFields = [];
            if (statObj.totalAcc > 0){
                descStr += "Status effect damage Dealt! ";

                finalFields.push({name: "Total Status Damage:", value: `${Math.round(statObj.totalAcc)}`});

                if (statObj.physAcc > 0){
                    finalFields.push(
                        {name: "Physical Damage:", value: `${Math.round(statObj.physAcc)}`}
                    );
                }
                if (statObj.magiAcc > 0){
                    finalFields.push(
                        {name: "Magical Damage:", value: `${Math.round(statObj.magiAcc)}`}
                    );
                }
                if (statObj.blastAcc > 0){
                    finalFields.push(
                        {name: "Blast Damage:", value: `${Math.round(statObj.blastAcc)}`}
                    );
                }
            }

            if (statObj.newEffects.length > 0){
                descStr += (statObj.newEffects.length > 1) ? "New status effects applied! " : "New status effect applied! ";

                let fieldObj;
                for (const effect of statObj.newEffects){
                    fieldObj = {name: "Effect:", value: `${effect.Effect}`, inline: true};
                    finalFields.push(fieldObj);
                }
            }

            statEmbed.setDescription(descStr);
            statEmbed.addFields(finalFields);
            return statEmbed;
        }

        /**
         * This function generates an embed for the current combat turn, it displays
         * damage dealt, whether the enemy was killed, and to what the last amount of 
         * damage was dealt to.
         * @param {object} combOutcome Combat Outcome Object
         * @param {string} dmgDTo Damaged Type String
         * @param {object} condition Crit and Double Hit outcome object
         * @returns {EmbedBuilder} Display embed for the current combat turn
         */
        function genAttackTurnEmbed(combOutcome, dmgDTo, condition){
            const turnReturnEmbed = new EmbedBuilder();

            let theOutcome = combOutcome.outcome;
            if (theOutcome !== 'Dead') {
                theOutcome = theOutcome.split(" ")[0] + " Damaged!";
            } else theOutcome = "Kills!";
            turnReturnEmbed.setTitle(`Attack: ${theOutcome}`);

            let damageFields = [], condStr = [];

            turnReturnEmbed.setColor('DarkOrange');
            if (condition.DH) {
                turnReturnEmbed.setColor('Aqua');
                condStr.push("Double", "Hit!");
            }
            if (condition.Crit) {
                turnReturnEmbed.setColor('LuminousVividPink');
                if (condStr.length > 0){
                    condStr[1] = "Crit!";
                } else condStr.push("Critical Hit!");
            }

            if (condStr.length > 0) {
                condStr = condStr.join(" ");
                damageFields.push({name: condStr.toString(), value: "\u0020"});
            }

            if (!dmgDTo) dmgDTo = "Flesh";

            damageFields.push(
                {name: `Damage Dealt To **${dmgDTo}**:`, value: `**${Math.round(combOutcome.dmgDealt)}**`},
                {name: `Total Damage Dealt:`, value: `**${Math.round(combOutcome.finTot)}**`}
            );

            turnReturnEmbed.addFields(damageFields);

            return turnReturnEmbed;
        }

        preloadCombat();
	},
};