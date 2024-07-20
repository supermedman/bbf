const { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const {chlkPreset} = require('../../chalkPresets');

const { CombatInstance } = require('./Export/Classes/CombatLoader');
const { EnemyFab } = require('./Export/Classes/EnemyFab');

const { attackEnemy, enemyAttack, handleActiveStatus, applyActiveStatus } = require('./Export/combatContainer');

const {
    loadPlayer,
    loadEnemy,
    loadDamageItems,
    loadDefenceItems
} = require('./Export/finalCombatExtras');

const loadCombButts = () => {
    const attackButton = new ButtonBuilder()
    .setCustomId('attack')
    .setLabel('Strike')
    .setStyle(ButtonStyle.Primary);

    const hideButton = new ButtonBuilder()
    .setCustomId('hide')
    .setLabel('Try to hide')
    .setDisabled(true)
    .setStyle(ButtonStyle.Secondary);

    const stealButton = new ButtonBuilder()
    .setCustomId('steal')
    .setLabel('Steal Item')
    .setDisabled(true)
    .setStyle(ButtonStyle.Secondary);

    const blockButton = new ButtonBuilder()
    .setCustomId('block')
    .setLabel('Block Attack')
    .setDisabled(true)
    .setStyle(ButtonStyle.Secondary);

    const potButton = new ButtonBuilder()
    .setCustomId('potion')
    .setLabel('Potion')
    .setDisabled(true)
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

        const { enemies, combatInstance, betaTester } = interaction.client; 

        if (!betaTester.has(interaction.user.id)) return await interaction.reply('Sorry, this command is being tested and is unavailable.');

        let startTime, endTime, displayStartTime, displayEndTime;
        async function preloadCombat(){
            await interaction.deferReply();

            displayStartTime = new Date().getTime();

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

            //console.log(thePlayer);

            combatLooper(thePlayer, theEnemy);
        }

        /**
         * This function contains the core functionality of all combat metrics
         * @param {CombatInstance} player Combat Instance Object
         * @param {EnemyFab} enemy Enemy Instance Object
         */
        async function combatLooper(player, enemy){
            await player.reloadInternals();
            const tempCombEmbed = genEnemyEmbed(enemy);

            // const enemyEmbedFields = genEnemyHPFields(enemy);

            // const tempCombEmbed = new EmbedBuilder()
            // .setTitle(`Level ${enemy.level}: **${enemy.name}**`)
            // .setDescription(`Description: *${enemy.description}*`)
            // .setColor('DarkButNotBlack')
            // .addFields(enemyEmbedFields);

            const buttRow = new ActionRowBuilder().addComponents(loadCombButts());

            const combatMessage = await interaction.followUp({embeds: [tempCombEmbed], components: [buttRow]});

            const filter = (i) => i.user.id === interaction.user.id;

            const combCollector = combatMessage.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 60000,
            });

            displayEndTime = new Date().getTime();
            console.log(chlkPreset.bInfoTwo(`Final Display Time: ${displayEndTime - displayStartTime}ms`));

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
                            // NOT IN USE
                        break;
                        case "steal":
                            // NOT IN USE
                        break;
                        case "potion":
                            // NOT IN USE
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

                // ====================
                // COLLECTER.ON {END}
                // reason === 'PDEAD'
                //  Handle player death here
                // reason === 'EDEAD'
                //  Handle enemy death here
                // reason === 'RELOAD'
                //  Prepare next combat turn. return combatLooper(player, enemy);
            });
        }

        /**
         * This function contains the core functionality of all attacking related code
         * @param {CombatInstance} player Combat Instance Object
         * @param {EnemyFab} enemy Enemy Instance Object
         * @returns {string} string: Action to take when ending collector
         */
        async function handleCombatTurn(player, enemy){
            let enemyDead = false, playerCombEmbeds = [];
            const rolledCondition = {
                DH: player.rollDH(),
                Crit: player.rollCrit()
            };
            const combatResult = attackEnemy(player.staticDamage, enemy, rolledCondition);
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

            // STATUS CHECKED EMBED?
            // if (wasStatusChecked !== "Status Not Checked"){
            //     const statusCheckedEmbed = new EmbedBuilder()
            //     .setTitle(`${wasStatusChecked.DamagedType}`);

            //     //playerCombEmbeds.push(statusCheckedEmbed);
            // }

            // STATUS EFFECTS/DAMAGE EMBED?
            if (returnedStatus !== "None"){
                if (returnedStatus.totalAcc > 0 || returnedStatus.newEffects.length > 0){
                    const statusEmbed = genStatusResultEmbed(returnedStatus);
                    
                    playerCombEmbeds.push(statusEmbed);
                }
            }
            
            await interaction.channel.send({embeds: playerCombEmbeds}).then(embedMsg => setTimeout(() => {
                embedMsg.delete();
            }, 45000)).catch(e => console.error(e));

            //console.log(combatResult);
            //console.log(wasStatusChecked);
            //console.log(returnedStatus);
            console.log(enemy);
            console.log(player);
            if (enemyDead) {
                // =================== TIMER END
                endTime = new Date().getTime();
                console.log(chlkPreset.bInfoTwo(`Final Time: ${endTime - startTime}ms`));
                // =================== TIMER END
                console.log("Enemy is dead!");
                return "EDEAD";
            }
            //(enemyDead) ? console.log("enemy is dead") : console.log('Enemy is alive');
            // ENEMY DEAD ? true .stop('EDEAD') : false "Continue";

            const enemyAttacks = enemy.attack();
            if (enemyAttacks === "MISS"){
                // Enemy Miss, combat turn ends .stop('RELOAD');
                const enemyMissEmbed = new EmbedBuilder()
                .setTitle('Enemy Misses Attack!!')
                .setDescription('You take no damage!');

                await interaction.followUp({embeds: [enemyMissEmbed]}).then(embedMsg => setTimeout(() => {
                    embedMsg.delete();
                }, 45000)).catch(e => console.error(e));
                // =================== TIMER END
                endTime = new Date().getTime();
                console.log(chlkPreset.bInfoTwo(`Final Time: ${endTime - startTime}ms`));
                // =================== TIMER END
                return "RELOAD";
            }
            // Enemy Attack
            const enemyAttackOutcome = enemyAttack(player.staticDefence, enemyAttacks);
            //console.log(enemyAttackOutcome);
            // =================== TIMER END
            endTime = new Date().getTime();
            console.log(chlkPreset.bInfoTwo(`Final Time: ${endTime - startTime}ms`));
            // =================== TIMER END

            const enemyAttacksEmbed = new EmbedBuilder()
            .setTitle('Enemy Attacks!!')
            .setColor('DarkRed')
            .setDescription(`${enemyAttackOutcome.outcome}: ${enemyAttackOutcome.dmgTaken}`);

            await interaction.channel.send({embeds: [enemyAttacksEmbed]}).then(embedMsg => setTimeout(() => {
                embedMsg.delete();
            }, 45000)).catch(e => console.error(e));
            
            return "RELOAD"; // TEMP
            // PLAYER DEAD ? true .stop('PDEAD') : false .stop('RELOAD');
        }


        async function handleEnemyDead(player, enemy){
            // ==========================
            // SETUP DB UPDATE QUE SYSTEM
            // ==========================
            let newAccess = true;
            
            // =============
            // Enemy Payouts
            // =============
            let xpGain = enemy.rollXP();
            let coinGain = xpGain + Math.floor(xpGain * 0.10);


            if (enemy.payouts.item){
                // Generate Item
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
                    time: 40000
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

            turnReturnEmbed.setColor('DarkOrange');
            if (condition.DH) turnReturnEmbed.setColor('Aqua');
            if (condition.Crit) turnReturnEmbed.setColor('LuminousVividPink');

            if (!dmgDTo) dmgDTo = "Flesh";

            // turnReturnEmbed.setDescription(`Damage Dealt To **${dmgDTo}**: **${combOutcome.dmgDealt}**\nTotal Damage Dealt: **${combOutcome.finTot}**`);

            turnReturnEmbed.addFields(
                {name: `Damage Dealt To **${dmgDTo}**:`, value: `**${combOutcome.dmgDealt}**`},
                {name: `Total Damage Dealt:`, value: `**${combOutcome.finTot}**`}
            );

            return turnReturnEmbed;
        }

        preloadCombat();
	},
};