const { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder} = require('discord.js');

const {checkingDamage} = require('./Export/combatContainer');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('protocombat')
        .setDescription('Combat Prototypes to be tested!!'),

	async execute(interaction) { 
        if (interaction.user.id !== '501177494137995264') return interaction.reply('This command is not available yet!');
        
        const startTime = new Date().getTime();
        let endTime;

        const welcomeEmbed = new EmbedBuilder()
        .setTitle('Welcome to the first combat prototype!')
        .setDescription('In this prototype you will be asked to select one of three weapons, with your choosen weapon, fight a number of enemies. They cannot fight back, yet.')
        .setColor('DarkGold');

        // ========================
        // Create Weapon Codes here
        // ========================

        // INFERNO TEST
        // MAGIC, FIRE - 100 Total
        // TYP_MAma:60-FIma:40_typ-r00-DIS_SL_dis-MAslo-100001
        const wepOne = 'TYP_MAma:60-FIma:40_typ-r00-DIS_SL_dis-MAslo-100001';

        // BLAST TEST
        // FROST, FIRE - 100 Total
        // TYP_FRma:50-FIma:50_typ-r00-DIS_SL_dis-MAslo-100001
        const wepTwo = 'TYP_FRma:50-FIma:50_typ-r00-DIS_SL_dis-MAslo-100001';

        // BLEED TEST
        // MAGIC, SLASH - 100 Total
        // TYP_MAma:40-SLph:60_typ-r00-DIS_SL_dis-MAslo-100001
        const wepThree = 'TYP_MAma:40-SLph:60_typ-r00-DIS_SL_dis-MAslo-100001';

        // RANDOM GEN - CAN BE PICKED AFTER ALL THREE ARE TESTED?
        const wepFour = '';

        const weaponList = [wepOne, wepTwo, wepThree];

        // Loading embed fields and string select options with wep values
        let finalFields = [];
        let stringSelectOptions = [];
        let wepCounter = 1;
        for (const wep of weaponList){
            let fieldName = '', fieldValue = '', fieldObj = {};
            
            fieldName = `**WEAPON ${wepCounter}: **` + wep;
            fieldValue = checkingDamage(wep).map(dmgObj => `\nType: ${dmgObj.Type}\nDamage: ${dmgObj.DMG}`).toString();
            
            fieldObj = {name: fieldName, value: fieldValue};
            finalFields.push(fieldObj);
            
            let option = new StringSelectMenuOptionBuilder()
            .setLabel(`WEAPON ${wepCounter}`)
            .setDescription('Weapon Choice')
            .setValue(`${wepCounter}`);

            stringSelectOptions.push(option);
            
            wepCounter++;
        }

        // ========================
        // Display Weapon stats
        // ========================

        const weaponSelectEmbed = new EmbedBuilder()
        .setTitle('Select a weapon!')
        .setDescription('The weapon you pick will be used for the remainder of this current command usage. You are free to try all three separately!!')
        .addFields(finalFields);

        const filter = (i) => i.user.id === interaction.user.id;
        
        // Button Building
        const acceptButton = new ButtonBuilder()
        .setCustomId('accept-protocomb')
        .setLabel('Start!')
        .setStyle(ButtonStyle.Primary);

        const buttonRow = new ActionRowBuilder().addComponents(acceptButton);

        // String Select Building
        const weaponSelectOptionMenu = new StringSelectMenuBuilder()
        .setCustomId('wep-select-menu')
        .setPlaceholder('Select a weapon!')
        .addOptions(stringSelectOptions);

        const stringRow = new ActionRowBuilder().addComponents(weaponSelectOptionMenu);

        // Begin UI Displaying
        const welcomeMessage = await interaction.reply({embeds: [welcomeEmbed], components: [buttonRow]});

        // Button Collecting
        const buttCollecter = welcomeMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter,
            time: 120000
        });

        buttCollecter.on('collect', COI => {
            if (COI.customId === 'accept-protocomb'){
                buttCollecter.stop('Accept');
            }
        });
        
        buttCollecter.on('end', async (c, reason) => {
            if (reason !== 'Accept') {
                // Collecter ended, ended without accept
                welcomeMessage.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Failed to delete the message:', error);
                    }
                });
                endTime = new Date().getTime();
                console.log(`Command took ${endTime - startTime}ms to complete!`);
            } else {
                // User accept
                welcomeMessage.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Failed to delete the message:', error);
                    }
                });
                
                // Select weapon here!
                const weaponSelectMessage = await interaction.followUp({embeds: [weaponSelectEmbed], components: [stringRow]});

                const stringCollecter = weaponSelectMessage.createMessageComponentCollector({
                    componentType: ComponentType.StringSelect,
                    filter,
                    time: 120000
                });

                let weaponPicked = '';
                stringCollecter.on('collect', iCS => {
                    weaponPicked = iCS.values[0]; // Weapon index selected!!
                    ~~weaponPicked;

                    // This is the final code executed!!!!
                    console.log(`Weapon Picked by INDEX: ${weaponList[weaponPicked - 1]}`);

                    stringCollecter.stop('Weapon');
                });

                stringCollecter.on('end', (c, reason) => {
                    if (reason !== 'Weapon'){
                        // No weapon, collecter ended
                        weaponSelectMessage.delete().catch(error => {
                            if (error.code !== 10008) {
                                console.error('Failed to delete the message:', error);
                            }
                        });
                        endTime = new Date().getTime();
                        console.log(`Command took ${endTime - startTime}ms to complete!`);
                    } else {
                        // Weapon, collecter ended!
                        weaponSelectMessage.delete().catch(error => {
                            if (error.code !== 10008) {
                                console.error('Failed to delete the message:', error);
                            }
                        });

                        const finalWeapon = weaponList[weaponPicked - 1];

                        // ==============================
                        //     TEMP COMBAT CODE HERE
                        // ==============================

                        const {Combat} = require('./Export/Classes/Combat');
                        
                        const newPlayer = new Combat(interaction.user, finalWeapon);

                        runCombat(newPlayer);
                    }
                });
            } 
        });
        
        // ==============================
        //    ENEMY HANDLING CODE HERE
        // ==============================

        const {EnemyFab} = require('./Export/Classes/EnemyFab');

        // Seven enemies
        
        //      FLESH TEST
        // Flesh, no armor, no shield
        // Flesh, armor, no shield
        // Flesh, armor, shield
        // Flesh = 150, armor = 75, shield = 25
        const fleshTestDummies = [new EnemyFab(), new EnemyFab(), new EnemyFab()];

        //      MAGIC TEST
        // Magiflesh, bark, no shield
        // Magiflesh, fossil, no shield
        // Magiflesh, demon, no shield
        // Magiflesh = 150, armor = 75, shield = 0
        const magicTestDummies = [new EnemyFab(), new EnemyFab(), new EnemyFab()];

        //      SPECTER TEST
        // Specter, no armor, no shield
        // Specter = 150, armor = 0, shield = 0
        const specterTestDummies = [new EnemyFab()];

        let remainingEnemyList = [];

        function preloadEnemies(){
            let i = 0;
            // Preset Flesh Tests
            for (const enemy of fleshTestDummies){
                enemy.flesh.Type = 'Flesh';
                enemy.flesh.HP = 150;
                if (i === 0) {
                    enemy.level = 10;
                    enemy.armor.HP = 0;
                    enemy.shield.HP = 0;
                } else if (i === 1){
                    enemy.level = 15;
                    enemy.armor.Type = 'Armor';
                    enemy.armor.HP = 75;
                    enemy.shield.HP = 0;
                } else if (i === 2){
                    enemy.level = 20;
                    enemy.armor.Type = 'Armor';
                    enemy.armor.HP = 75;
                    enemy.shield.Type = 'Phase Aura';
                    enemy.shield.HP = 25;
                }

                enemy.reloadMaxHP();
                //console.log('== Flesh Dummy %d ==', i);
                //console.log(enemy);
                i++;
            }

            i = 0;
            // Preset Magic Tests
            for (const enemy of magicTestDummies){
                enemy.flesh.Type = 'Magical Flesh';
                enemy.flesh.HP = 150;
                enemy.armor.HP = 75;
                enemy.shield.HP = 0;
                if (i === 0) {
                    enemy.level = 15;
                    enemy.armor.Type = 'Bark';
                } else if (i === 1){
                    enemy.level = 15;
                    enemy.armor.Type = 'Fossil';
                } else if (i === 2){
                    enemy.level = 15;
                    enemy.armor.Type = 'Demon';
                }

                enemy.reloadMaxHP();
                //console.log('== Magic Dummy %d ==', i);
                //console.log(enemy);
                i++;
            }

            // Preset Specter Tests
            for (const enemy of specterTestDummies){
                enemy.flesh.Type = 'Specter';
                enemy.level = 15;
                enemy.flesh.HP = 150;
                enemy.armor.HP = 0;
                enemy.shield.HP = 0;

                enemy.reloadMaxHP();
                //console.log('== Specter Dummy 1 ==');
                //console.log(enemy);
            }

            remainingEnemyList = fleshTestDummies.concat(magicTestDummies, specterTestDummies);
            return 'Finished';
        }

        function prepareNextEnemy(){
            if (remainingEnemyList.length === 0) return "List Empty";

            let enemyToReturn = remainingEnemyList.splice(0,1);
            enemyToReturn = enemyToReturn[0];
            return enemyToReturn;
        }

        // ==============================
        //     TEMP DISPLAY CODE HERE
        // ==============================

        function generateEnemyEmbed(enemy){
            const returnEmbed = {
                Title: 'Title',
                Description: 'Desc',
                Color: 0o0,
                Fields: []
            };

            returnEmbed.Title = `Enemy #${6 - remainingEnemyList.length}`;
            returnEmbed.Description = `This is a testing dummy, it is: LEVEL ${enemy.level}`;

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

            returnEmbed.Fields = hpFields;

            return returnEmbed;
        }

        function generateAttackTurnEmbed(combatLog, damagedType, statusLog, enemy){
            const returnEmbed = {
                Title: 'Title',
                Description: 'Desc',
                Color: 0o0,
                Fields: []
            };
            const finalFields = [];

            // Load direct combat logs
            returnEmbed.Title = `Combat Turn Outcome: ${combatLog.outcome}`;

            // ====================
            // Check current enemy hp values with maxHp values to find aprox damage dealt to each type
            // ====================
            let dealtTo = (statusLog === 'None') ? 'Shield' : damagedType;
            if (combatLog.outcome === 'Dead') dealtTo = 'Flesh';

            returnEmbed.Description = `Total Base Damage Dealt to ${dealtTo}: ${combatLog.dmgDealt}`;

            if (combatLog.dmgCheck){
                for (const dmgObj of combatLog.dmgCheck){
                    let fieldName = '', fieldValue = '', fieldObj = {};
                    
                    fieldName = `Damage Type: **${dmgObj.Type}**`;
                    fieldValue = `Dealt ${dmgObj.DMG} against ${dmgObj.Against.Type}`;

                    fieldObj = {name: fieldName, value: fieldValue};
                    finalFields.push(fieldObj);
                }
            }
            
            // Load status logs if exist
            if (statusLog !== 'None'){
                let fieldName = '', fieldValue = '', fieldObj = {};

                fieldName = `Total Status Effect Damage Dealt: ${statusLog.totalAcc}`;
                
                let valueStr = '';
                valueStr += (statusLog.physAcc > 0) ? `Physical DoT dealt: ${statusLog.physAcc}\n` : 'No Physical DoT dealt\n';
                valueStr += (statusLog.magiAcc > 0) ? `Magical DoT dealt: ${statusLog.magiAcc}\n` : 'No Magical DoT dealt\n';
                valueStr += (statusLog.blastAcc > 0) ? `Blast Damage dealt: ${statusLog.blastAcc}\n` : '\n';
                fieldValue = valueStr;

                fieldObj = {name: fieldName, value: fieldValue};
                finalFields.push(fieldObj);

                if (statusLog.newEffects.length > 0){
                    // New Status effects applied!
                    for (const effect of statusLog.newEffects){
                        fieldName = 'Effect:';
                        fieldValue = effect.Effect;

                        fieldObj = {name: fieldName, value: fieldValue, inline: true};
                        finalFields.push(fieldObj);
                    }
                }
            }

            // Check enemy stats for effect changes if status log exists
            if (enemy.activeEffects.length > 0){
                let fieldName = '', fieldValue = '', fieldObj = {};

                const otherTypeList = ["Slow", "Flash", "Blind", "Confusion"];
                const physProcList = ["Confusion", "Concussion"];

                const otherProc = (ele) => otherTypeList.some(eff => ele.Type === eff);
                const concProc = (ele) => physProcList.some(eff => ele.Type === eff);
                const magiProc = (ele) => ele.Type === "MagiWeak";

                // Magic Weakness
                if (enemy.activeEffects.findIndex(magiProc) !== -1){
                    fieldValue = '';
                    const enemyMagicWeak = enemy.internalEffects.Weakness.Magical;
                    const mappedMagiWeak = [enemyMagicWeak.Magic, enemyMagicWeak.Fire, enemyMagicWeak.Frost, enemyMagicWeak.Light, enemyMagicWeak.Dark];
                    const typeMap = ["Magic", "Fire", "Frost", "Light", "Dark"];

                    fieldName = 'Magical Weakness Applied:';
                    for (let i = 0; i < mappedMagiWeak.length; i++){
                        fieldValue += `${typeMap[i]}: ${mappedMagiWeak[i]}\n`;
                    }
                    fieldObj = {name: fieldName, value: fieldValue};
                    finalFields.push(fieldObj);
                }

                // Concussion/Confusion
                if (enemy.activeEffects.findIndex(concProc) !== -1){
                    fieldValue = '';
                    const enemyPhysWeak = enemy.internalEffects.Weakness.Physical;
                    const mappedPhysWeak = [enemyPhysWeak.Blunt, enemyPhysWeak.Slash];
                    const typeMap = ["Blunt", "Slash"];

                    fieldName = 'Physical Weakness Applied:';
                    for (let i = 0; i < mappedPhysWeak.length; i++){
                        if (mappedPhysWeak[i] <= 0) continue;
                        fieldValue += `${typeMap[i]}: ${mappedPhysWeak[i]}\n`;
                    }

                    fieldValue += (enemy.internalEffects.HitStrength < 1) ? `Hit Strength: ${enemy.internalEffects.HitStrength}` : '\n';

                    fieldObj = {name: fieldName, value: fieldValue};
                    finalFields.push(fieldObj);
                }

                // Slow, Blind, Flash, Confusion
                if (enemy.activeEffects.findIndex(otherProc) !== -1){
                    fieldValue = '';

                    fieldName = 'Attack Condition Effects:';
                    fieldValue += (enemy.externalRedux.DHChance > 0) ? `Double Hit Chance: ${enemy.externalRedux.DHChance}` : `\n`;
                    fieldValue += (enemy.externalRedux.CritChance > 0) ? `Critical Hit Chance: ${enemy.externalRedux.CritChance}` : `\n`;

                    fieldObj = {name: fieldName, value: fieldValue};
                    finalFields.push(fieldObj);

                    fieldValue = '';

                    fieldName = 'Enemy Attack Effects:';
                    fieldValue += (enemy.internalEffects.HitChance < 1) ? `Enemy Hit Chance: ${enemy.internalEffects.HitChance}` : `\n`;
                    fieldValue += (enemy.internalEffects.HitStrength < 1) ? `Enemy Hit Strength: ${enemy.internalEffects.HitStrength}` : `\n`;

                    fieldObj = {name: fieldName, value: fieldValue};
                    finalFields.push(fieldObj);
                }
            }

            if (combatLog.outcome === 'Dead') {
                returnEmbed.Fields = [{name: 'Enemy Is Dead!', value: 'No damage data ready... *YET*'}];
            } else returnEmbed.Fields = (finalFields.length > 0) ? finalFields : [{name: 'Embed Failsafe', value: '@ me if you see this'}];
            

            return returnEmbed;
        }

        // ==============================
        //     TEMP COMBAT CODE HERE
        // ==============================

        const {attackEnemy, handleActiveStatus, applyActiveStatus} = require('./Export/combatContainer');

        async function runCombat(player) {
            const enemyLoadStart = new Date().getTime();
            const isDone = preloadEnemies();
            const enemyLoadEnd = new Date().getTime();

            if (isDone !== 'Finished') return await interaction.followUp('Something went wrong while loading the enemies!! :(');
            
            // Enemies are now loaded, prepare combat!!
            console.log(`Enemies loaded! Took: ${enemyLoadEnd - enemyLoadStart}ms`);

            // player.staticDamage contains all needed damage values for combat.
            player.staticDamage = checkingDamage(player.mainHand);
            console.log(player);

            combatLooper(player, prepareNextEnemy());
                            
            endTime = new Date().getTime();
            console.log(`Command took ${endTime - startTime}ms to complete!`);
        }

        
        async function combatLooper(player, enemy){
            const currCombEmbed = generateEnemyEmbed(enemy);

            const attackButton = new ButtonBuilder()
            .setCustomId('attack')
            .setLabel('Attack')
            .setStyle(ButtonStyle.Primary);   

            const actionRow = new ActionRowBuilder().addComponents(attackButton);

            const combatRef = await interaction.followUp({embeds: [currCombEmbed], components: [actionRow]});

            const combCollecter = combatRef.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 120000
            });

            let enemyDead = false;
            combCollecter.on('collect', async COI => {
                await COI.deferUpdate().then(async () => {
                    if (COI.customId === 'attack'){
                        // ATTACKING ENEMY!!
                        console.log('Attacking!!');

                        const attackStartTime = new Date().getTime();
                        const combatResult = attackEnemy(player.staticDamage, enemy);
                        const attackEndTime =  new Date().getTime();
                        console.log(`Attack took: ${attackEndTime - attackStartTime}ms`);

                        if (combatResult.outcome === 'Dead') {
                            // Handle next enemy reload here!
                            console.log('Enemy is dead!');
                            enemyDead = true;
                        }

                        let wasStatusChecked = "Status Not Checked";
                        let returnedStatus = 'None';
                        if (!enemyDead) {
                            // ================
                            // STATUS EFFECT CHECK
                            // ================

                            // "Status Not Checked" || "Status Checked"
                            const statusCheckStartTime = new Date().getTime();
                            wasStatusChecked = handleActiveStatus(combatResult, enemy);
                            const statusCheckEndTime = new Date().getTime();
                            console.log(`Status Check took: ${statusCheckEndTime - statusCheckStartTime}ms`);

                            console.log(wasStatusChecked);

                            // ================ ================
                            // ENEMY STATUS UPDATES & DEAL DoT
                            // ================ ================
                            
                            if (wasStatusChecked !== "Status Not Checked" || enemy.activeEffects.length > 0){
                                const statusApplyStartTime = new Date().getTime();
                                returnedStatus = applyActiveStatus(combatResult, enemy);
                                const statusApplyEndTime = new Date().getTime();
                                console.log(`Status Apply took: ${statusApplyEndTime - statusApplyStartTime}ms`);

                                console.log(returnedStatus);
                            }
                            
                            // ================
                            // RECHECK DEAD STATUS
                            // ================
                            if (enemy.flesh.HP <= 0){
                                console.log('Enemy is dead now.');
                                enemyDead = true;
                            }
                        }
                        

                        // ================
                        // BUILD DAMAGE EMBED & DISPLAY IT
                        // ================
                        const turnDisplayStartTime = new Date().getTime();
                        const turnOutcomeEmbed = generateAttackTurnEmbed(combatResult, wasStatusChecked, returnedStatus, enemy);
                        const turnDisplayEndTime = new Date().getTime();
                        console.log(`Final Turn Display Embed Took: ${turnDisplayEndTime - turnDisplayStartTime}ms`);

                        await interaction.followUp({embeds: [turnOutcomeEmbed]}).then(statsEmbed => setTimeout(() => {
                            statsEmbed.delete();
                        }, 120000)).catch(err => console.log(err));

                        // ================
                        // RELOAD/NEW LOAD
                        // ================
                        (enemyDead) ? combCollecter.stop('Load') : combCollecter.stop('Reload');
                    }
                });
            });

            combCollecter.on('end', (c, reason) => {
                // Collecter Ended, No user input
                if (reason !== 'Load' || reason !== 'Reload'){
                    combatRef.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }

                // Turn ended, user input.
                if (reason === 'Load'){
                    // Enemy Dead Load new
                    combatRef.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                    return combatLooper(player, prepareNextEnemy());
                }

                if (reason === 'Reload'){
                    // Enemy Alive Reload
                    combatRef.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                    return combatLooper(player, enemy);
                }
            });
        }


    },
};