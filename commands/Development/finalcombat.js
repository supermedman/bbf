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
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('finalcombat')
        .setDescription('Final Testing Grounds for Combat V3'),

	async execute(interaction) { 
        if (interaction.user.id !== '501177494137995264') return await interaction.reply('Sorry, this command is being tested and is unavailable.');

        const { enemies, combatInstance } = interaction.client; 

        let startTime, endTime, displayStartTime, displayEndTime;
        async function preloadCombat(){
            await interaction.deferReply();

            displayStartTime = new Date().getTime();

            const thePlayer = loadPlayer(interaction.user.id, combatInstance);
            if (!thePlayer.staticStats) await thePlayer.retrieveBasicStats();
            if (thePlayer.loadout.ids.length === 0) await thePlayer.retrieveLoadout();

            const theEnemy = loadEnemy(thePlayer.level, enemies);

            const loadObj = thePlayer.loadout;
            thePlayer.staticDamage = loadDamageItems(loadObj.mainhand, loadObj.offhand);
            thePlayer.staticDefence = loadDefenceItems(loadObj);
            combatLooper(thePlayer, theEnemy);
        }

        /**
         * This function contains the core functionality of all combat metrics
         * @param {CombatInstance} player Combat Instance Object
         * @param {EnemyFab} enemy Enemy Instance Object
         */
        async function combatLooper(player, enemy){

            const enemyEmbedFields = genEnemyFields(enemy);

            const tempCombEmbed = new EmbedBuilder()
            .setTitle(`Level ${enemy.level}: **${enemy.name}**`)
            .setDescription(`Description: *${enemy.description}*`)
            .setColor('Random')
            .addFields(enemyEmbedFields);

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
                console.log('collector end reason: ', r);

                if (!r || r === 'Time' || r === 'None') {
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
                    return combatLooper(player, loadEnemy(player.level, enemies)); // Handle Dead Enemy
                    case "PDEAD":
                    return; // Handle Dead Player
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
            if (wasStatusChecked !== "Status Not Checked"){
                const statusCheckedEmbed = new EmbedBuilder()
                .setTitle(`${wasStatusChecked.DamagedType}`);

                //playerCombEmbeds.push(statusCheckedEmbed);
            }

            // STATUS EFFECTS/DAMAGE EMBED?
            if (returnedStatus !== "None"){
                const statusEmbed = new EmbedBuilder()
                .setTitle(`${returnedStatus}`);

                //playerCombEmbeds.push(statusEmbed);
            }
            
            await interaction.followUp({embeds: playerCombEmbeds}).then(embedMsg => setTimeout(() => {
                embedMsg.delete();
            }, 45000)).catch(e => console.error(e));

            console.log(combatResult);
            console.log(wasStatusChecked);
            console.log(returnedStatus);
            console.log(enemy);
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
            console.log(enemyAttackOutcome);
            // =================== TIMER END
            endTime = new Date().getTime();
            console.log(chlkPreset.bInfoTwo(`Final Time: ${endTime - startTime}ms`));
            // =================== TIMER END

            const enemyAttacksEmbed = new EmbedBuilder()
            .setTitle('Enemy Attacks!!')
            .setDescription(`${enemyAttackOutcome.outcome}: ${enemyAttackOutcome.dmgTaken}`);

            await interaction.followUp({embeds: [enemyAttacksEmbed]}).then(embedMsg => setTimeout(() => {
                embedMsg.delete();
            }, 45000)).catch(e => console.error(e));
            
            return "RELOAD"; // TEMP
            // PLAYER DEAD ? true .stop('PDEAD') : false .stop('RELOAD');
        }

        /**
         * This function generates the HP type display portion of the combat embed
         * @param {EnemyFab} enemy Enemy Instance Object
         * @returns {object[]} Array of {name: string, value: string} objects
         */
        function genEnemyFields(enemy){
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


        function genAttackTurnEmbed(combOutcome, dmgDTo, condition){
            const turnReturnEmbed = new EmbedBuilder();

            let theOutcome = combOutcome.outcome;
            if (theOutcome !== 'Dead') {
                theOutcome = theOutcome.split(" ")[0] + " Damaged!";
            }
            turnReturnEmbed.setTitle(`Attack Outcome: ${theOutcome}`);

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