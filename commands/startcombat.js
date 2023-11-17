const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const {
    warnedForm,
    errorForm,
    successResult,
    failureResult,
    basicInfoForm,
    specialInfoForm
} = require('../chalkPresets.js');

const { UserData, ActiveEnemy, LootStore, Pigmy, Loadout, MaterialStore, ActiveStatus, OwnedPotions } = require('../dbObjects.js');
const { displayEWpic, displayEWOpic } = require('./exported/displayEnemy.js');
const { isLvlUp, isUniqueLevelUp } = require('./exported/levelup.js');
const { grabRar, grabColour } = require('./exported/grabRar.js');
const { stealing } = require('./exported/handleSteal.js');
const { hiding } = require('./exported/handleHide.js');
const { grabMat } = require('./exported/materialDropper.js');

const { dropRandomBlueprint } = require('./exported/createBlueprint.js');

const { userDamageLoadout, enemyDamage } = require('./exported/dealDamage.js');
const { findHelmSlot, findChestSlot, findLegSlot, findMainHand, findOffHand, findPotionOne, findPotionTwo } = require('./exported/findLoadout.js');

//Prefab grabbing 
const enemyList = require('../events/Models/json_prefabs/enemyList.json');
const lootList = require('../events/Models/json_prefabs/lootList.json');
const deathMsgList = require('../events/Models/json_prefabs/deathMsgList.json');
const uniqueLootList = require('../events/Models/json_prefabs/uniqueLootList.json');
const activeCategoryEffects = require('../events/Models/json_prefabs/activeCategoryEffects.json');


module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('startcombat')
        .setDescription('The basic combat initiation!'),

    async execute(interaction) {
        if (!interaction) return;

        var constKey;
        var specCode;
        var stealDisabled = false;
        var isHidden = false;
        var potionOneDisabled = true;

        let messageCount = 0;

        await interaction.deferReply().then(() => startCombat()).catch((err) => {
            return console.log(errorForm('AN ERROR OCCURED!: ', err));
        });

        async function startCombat() {
            //Tally messages to remove when this is called...
            //Figure out how to know how many and then grab them correctly 
            await loadEnemy();           
        }

        //========================================
        //This method Generates an enemy based on the users level
        async function loadEnemy() {
            const uData = await grabU();
            if (!uData) return interaction.followUp(`No User Data.. Please use the \`/start\` command to select a class and begin your adventure!!`);
            if (uData.health <= 0) return playerDead(uData, 'Fayrn');

            let ePool = [];
            //for loop to search enemy prefab list
            for (var i = 0; i < enemyList.length; i++) {
                //if enemy with player level or lower can be found continue
                if (enemyList[i].Level <= uData.level) {
                    ePool.push(enemyList[i]); //enemy found add to ePool
                } else {/**enemy not found keep looking*/ }
            }

            if (ePool.length <= 0) {
                //SOMETHING WENT WRONG DEAL WITH IT HERE
                console.log(ePool);
            } else {
                //this will grab a random number to be used to grab an enemy from the array ePool
                const rEP = Math.floor(Math.random() * (ePool.length));
                console.log('RANDOM ENEMY POSITION: ', rEP);
                console.log('ENEMY GRABBED SHOWN WITH ConstKey: ', ePool[rEP].ConstKey);

                const cEnemy = ePool[rEP];
                //let hasPng = false;
                console.log(cEnemy);

                if (cEnemy.PngRef) {
                    hasPng = true;
                    pFile = cEnemy.Image;
                    pRef = cEnemy.PngRef;
                }

                constKey = cEnemy.ConstKey;
                specCode = interaction.user.id + cEnemy.ConstKey;
                stealDisabled = false;
                isHidden = false;
                await addEnemy(cEnemy, specCode);
                await display();
            }
        }

        //========================================
        //This method Adds the selected enemy into the ActiveEnemy database 
        async function addEnemy(cEnemy, specCode) {

            try {
                var copyCheck = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: constKey }] });

                console.log('Status of finding enemy: ', copyCheck);
                console.log('Values being checked for: ', '\nspecCode: ', specCode, '\nconstKey: ', constKey);

                if (copyCheck) {
                    //enemy already exists return                  
                    return copyCheck;
                } else if (!copyCheck) {

                    console.log('Current constKey of prefab enemy: ', cEnemy.ConstKey);
                    console.log('Current specId of prefab enemy: ', cEnemy.SpecId);

                    var hasUI = false;

                    if (cEnemy.HasUnique) {
                        //enemy has unique item
                        //Assign as true
                        hasUI = true;
                    }
                    //IMPLEMENT LOOT HERE
                    //first calculate whether enemy will have an item
                    //then assign hasitem: true or false
                    //15% chance to have item to start

                    /**
                     *   Outside influences to item drop chance
                     *      - Player stats?      
                     *      - Pigmy currently equiped?
                     *      - Weapon currently equiped?
                     *      - Thief class?
                     *      
                     *   How does it change the outcome?
                     *      - Max 10% extra drop chance
                     *      - Max 20% extra drop chance
                     *      - Max 10% extra drop chance
                     *      - Base 10% extra drop chance
                     *      
                     *   How does it effect the rarity?
                     *      - @ Max stat: 10% chance +1 to rarID
                     *      - @ Max stat: 10% chance +1 to rarID
                     *      - Max 5% chance +1 to rarID
                     *      - Base 5% chance +1 to rarID
                     * 
                     * */

                    var lootChance = Math.random();
                    var chanceToBeat = 0.850;
                    var HI = false;

                    const pigmy = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });
                    const uCheck = await grabU();

                    if (uCheck.pclass === 'Thief') {
                        chanceToBeat -= 0.10;
                    }

                    console.log(basicInfoForm('Chance to beat after ThiefCheck: ', chanceToBeat));

                    if (uCheck.level >= 31) {
                        //User above level 31 increase drop chance
                        if ((Math.floor(uCheck.level / 4) * 0.01) > 0.25) {
                            chanceToBeat -= 0.25;
                        } else {
                            chanceToBeat -= (Math.floor(uCheck.level / 4) * 0.01);
                        }
                    }

                    console.log(basicInfoForm('Chance to beat after LevelCheck: ', chanceToBeat));

                    if (pigmy) {
                        if ((Math.floor(pigmy.level / 3) * 0.02) > 0.25) {
                            chanceToBeat -= 0.25;
                        } else {
                            chanceToBeat -= (Math.floor(pigmy.level / 3) * 0.02); //Pigmy level increases drop rate by 2% per level
                        }
                    }

                    console.log(basicInfoForm('Chance to beat after PigmyCheck: ', chanceToBeat));

                    console.log(specialInfoForm('Rolled Loot Chance:\n' + lootChance + '\nChance to beat:\n', chanceToBeat));

                    if (lootChance >= chanceToBeat) {
                        //hasitem:true
                        HI = true;
                    }
                    else {
                        //hasitem: false
                    }

                    const enemy = await ActiveEnemy.create({


                        name: cEnemy.Name,
                        description: cEnemy.Description,
                        level: cEnemy.Level,
                        mindmg: cEnemy.MinDmg,
                        maxdmg: cEnemy.MaxDmg,
                        health: cEnemy.Health,
                        defence: cEnemy.Defence,
                        weakto: cEnemy.WeakTo,
                        dead: cEnemy.Dead,
                        hasitem: HI,
                        xpmin: cEnemy.XpMin,
                        xpmax: cEnemy.XpMax,
                        constkey: cEnemy.ConstKey,
                        hasunique: hasUI,
                        specid: specCode,

                    });

                    console.log(`Enemy data being added to database: \nNAME: ${enemy.name} \nLEVEL: ${enemy.level} \nHEALTH: ${enemy.health} \nDEFENCE: ${enemy.defence}`);

                    var newE = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: constKey }] });
                    if (newE) {
                        console.log('Enemy data added successfully!');
                        return newE;
                    } else {
                        console.log('Something went wrong while adding an enemy!');
                        return;
                    }

                }
            } catch (err) {
                console.error('An error has occured', err);
            }
        }

        //========================================
        // This method handles when enemy has died 
        /**
         *      Remove enemy killed embed upon set time passing
         *      OR
         *      When player calls startcombat and embed still remains
         * 
         */
        async function enemyDead(enemy) {
            var xpGained = Math.floor(Math.random() * (enemy.xpmax - enemy.xpmin + 1) + enemy.xpmin);

            const activeEffect = await ActiveStatus.findOne({ where: { spec_id: interaction.user.id } });

            if (!activeEffect) {
                //No Active effects to manage
            } else {
                const extraEXP = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, { activec: 'EXP' }] });
                if (extraEXP) {
                    if (extraEXP.duration > 0) {
                        xpGained += xpGained * extraEXP.curreffect;
                    }
                }
            }

            const cCalc = ((xpGained - 5) + 1);

            await isLvlUp(xpGained, cCalc, interaction);

            const user = await grabU();

            let blueyBaseDropRate = 0.98;
            const rolledChance = Math.random();

            if (rolledChance > blueyBaseDropRate) {
                //Blueprint drops!
                await dropRandomBlueprint(user.level, user.userid, interaction);
            }

            var foundMaterial = await grabMat(enemy, user, interaction);
            if (foundMaterial === 0) {
                //Do nothing, invalid return value given
            } else if (!foundMaterial) {
                //Error occured ignore futher..
            } else {
                console.log(basicInfoForm(`foundMaterial: ${foundMaterial}`));                
            }

            if (!activeEffect) {
                //No active effects to manage
            } else if (activeEffect) {
                console.log(specialInfoForm('ACTIVE EFFECTS FOUND'));
                const activeEffects = await ActiveStatus.findAll({ where: { spec_id: interaction.user.id } });
                let runCount = 0;
                let currEffect;
                do {
                    currEffect = activeEffects[runCount];
                    var coolDownReduce = currEffect.cooldown - 1;
                    var durationReduce = currEffect.duration - 1;

                    if (durationReduce <= 0) {
                        durationReduce = 0;
                    }

                    if (coolDownReduce <= 0) {
                        //Cooldown Complete!
                        console.log(basicInfoForm('COOLDOWN COMPLETE!'));
                        await ActiveStatus.destroy({ where: [{ spec_id: interaction.user.id }, { potionid: currEffect.potionid }] });
                    } else {
                        await ActiveStatus.update({ cooldown: coolDownReduce }, { where: [{ spec_id: interaction.user.id }, { potionid: currEffect.potionid }] });
                        await ActiveStatus.update({ duration: durationReduce }, { where: [{ spec_id: interaction.user.id }, { potionid: currEffect.potionid }] });
                    } 
                    runCount++;
                } while (runCount < activeEffects.length)
            }

            await isUniqueLevelUp(interaction, user);

            const newtotalK = user.totalkills + 1;
            const newCurK = user.killsthislife + 1;

            await UserData.update({ totalkills: newtotalK }, { where: { userid: interaction.user.id } });
            await UserData.update({ killsthislife: newCurK }, { where: { userid: interaction.user.id } });

            if (enemy.hasitem) {

                const reference = await makeItem(enemy);

                const item = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: reference.loot_id }] });

                var iVal;

                if (item.slot === 'Mainhand') {
                    //Item is weapon
                    iVal = (`Value: **${item.value}c**\nRarity: **${item.rarity}**\nAttack: **${item.attack}**\nType: **${item.type}**\nSlot: **${item.slot}**\nHands: **${item.hands}**\nAmount Owned: **${item.amount}**`);
                } else if (item.slot === 'Offhand') {
                    iVal = (`Value: **${item.value}c**\nRarity: **${item.rarity}**\nAttack: **${item.attack}**\nType: **${item.type}**\nSlot: **${item.slot}**\nHands: **${item.hands}**\nAmount Owned: **${item.amount}**`);
                } else {
                    iVal = (`Value: **${item.value}c**\nRarity: **${item.rarity}**\nAttack: **${item.defence}**\nType: **${item.type}**\nSlot: **${item.slot}**\nAmount Owned: **${item.amount}**`);
                }

                const dropEmbedColour = await grabColour(item.rar_id);

                const itemDropEmbed = new EmbedBuilder()
                    .setTitle('~LOOT DROPPED~')
                    .setColor(dropEmbedColour)
                    .addFields({

                        name: (`${item.name}\n`),
                        value: iVal
                    });

                await interaction.channel.send({ embeds: [itemDropEmbed] }).then(async dropEmbed => setTimeout(() => {
                    dropEmbed.delete();
                }, 20000)).catch(console.error);
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('spawn-new')
                        .setLabel('New Enemy')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(false)
                        .setEmoji('💀'),
                );

            const killedEmbed = new EmbedBuilder()
                .setTitle("YOU KILLED THE ENEMY!")
                .setColor(0000)
                .setDescription("Well done!")
                .addFields(
                    { name: 'Xp Gained', value: ' ' + xpGained + ' ', inline: true },
                    { name: 'Coins Gained', value: ' ' + cCalc + ' ', inline: true },
                );

            if (interaction.user.id !== '501177494137995264') {
                interaction.channel.send({ embeds: [killedEmbed]/**, components: [ref]*/ }).then(async embedMsg => setTimeout(() => {
                    //const collectorBut = embedMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 40000 });

                    //collectorBut.on('collect', async i => {
                    //    if (i.user.id === interaction.user.id) {
                    //        //delete the embed here
                    //        await embedMsg.delete();
                    //        startCombat();//run the entire script over again

                    //    } else {
                    //        i.reply({ content: `Nice try slick!`, ephemeral: true });
                    //    }
                    //});

                    //collectorBut.on('end', async remove => { if (!embedMsg) { await embedMsg.delete(); } });
                    embedMsg.delete();
                }, 25000)).catch(console.error);
                removeE(constKey);
            } else {

                const embedMsg = await interaction.channel.send({ embeds: [killedEmbed], components: [row] });
                    
                const filter = (i) => i.user.id === interaction.user.id;

                const collector = embedMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    filter,
                    time: 40000,
                });

                collector.on('collect', async (collInteract) => {          
                    if (collInteract.customId === 'spawn-new') {
                        console.log(specialInfoForm('SPAWN-NEW WAS PRESSED!'));
                        await collInteract.deferUpdate();
                        //delete the embed here
                        console.log(specialInfoForm('SPAWN-NEW WAS PRESSED!'));
                        await collector.stop();
                        startCombat();//run the entire script over again
                    }             
                });

                collector.on('end', () => {
                    if (embedMsg) {
                        embedMsg.delete().catch(error => {
                            if (error.code !== 10008) {
                                console.error('Failed to delete the message:', error);
                            }
                        });
                    }
                });
                
                removeE(constKey);
            }
        }

        //========================================
        // This method handles when player has died
        async function playerDead(user, enemy) {         
            /*PLAYER IS DEAD HANDLE HERE*/
            //TEMPORARY EMBED FOR TESTING PURPOSES WILL BE CANVASED LATER

            const reviveButton = new ButtonBuilder()
                .setCustomId('primary')
                .setLabel('Revive')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('💀');

            const grief = new ActionRowBuilder().addComponents(reviveButton);

            const specialMsg = Math.random();
            console.log(`specialMsg: ${specialMsg}`);
            const MsgID = Math.round(Math.random() * (deathMsgList.length - 1));
            console.log(`MsgID: ${MsgID}`);

            if (enemy === 'Fayrn') {
                var list = `Fighting fearlessly till the end, ${user.username} nonetheless fell prey to the gods, please Mourn your loss to revive to full health.`
                await UserData.update({ lastdeath: enemy }, { where: { userid: interaction.user.id } });
            }
            if (specialMsg >= 0.9) {
                var list = deathMsgList[MsgID].Value;
                console.log(`list: ${list}`);
                await updateDiedTo(enemy);
            } else {
                var list = `Fighting fearlessly till the end, ${user.username} nonetheless fell prey to ${enemy.name}`
                await updateDiedTo(enemy);
            }

            await resetKillCount(user);
           
            const deadEmbed = new EmbedBuilder()
                .setTitle('YOU HAVE FALLEN IN COMBAT')
                .setColor('DarkGold')
                .addFields(
                    { name: `Obituary`, value: list, inline: true },
            );

            const embedMsg = await interaction.followUp({ embeds: [deadEmbed], components: [grief] });

            const filter = (i) => i.user.id === interaction.user.id;

            const collector = embedMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 40000,
            });

            collector.on('collect', async (collInteract) => {
                if (collInteract.customId === 'primary') {
                    await collector.stop();
                    await revive(user);
                }
            });

            collector.on('end', () => {
                if (embedMsg) {
                    embedMsg.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }
            });         
        }

        //This method updates the value for lastdeath to be used for other info commands about a user
        async function updateDiedTo(enemy) {
            const tableEdit = await UserData.update({ lastdeath: enemy.name }, { where: { userid: interaction.user.id } });
            if (tableEdit > 0) {
                //Value updated successfully
                console.log(`User Death Updated!`);
            }
        }

        //This method sets the killsthislife value to 0 upon user death
        async function resetKillCount(user) {
            if (user.highestkills < user.killsthislife) {
                const updateKRecord = await UserData.update({ highestkills: user.killsthislife }, { where: { userid: interaction.user.id } });
                if (updateKRecord > 0) {
                    console.log(`NEW KILL RECORD!`);
                }
            }
            const killreset = await UserData.update({ killsthislife: 0 }, { where: { userid: interaction.user.id } });
            if (killreset > 0) {
                console.log(`KILLS RESET!`);
            }
        }

        //========================================
        // This method displays the enemy in its current state
        async function display() {
            const uData = await grabU();
            const hasLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
            if (!hasLoadout) {
                //No loadout keep potions disabled
            } else {
                const checkPotOne = await findPotionOne(hasLoadout.potionone, uData.userid);
                
                if ((checkPotOne === 'NONE')) {
                    //Both potion slots are empty keep buttons disabled
                    potionOneDisabled = true;
                   
                } else {
                    const activeEffects = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, {name: checkPotOne.name}] });
                    if (checkPotOne === 'NONE') {
                        //Keep disabled
                    } else {
                        if (!activeEffects) {
                            //user has no active effects
                            potionOneDisabled = false;                         
                        } else {
                            //Check both effects against currently equipped potions
                            if (activeEffects.cooldown > 0) {
                                potionOneDisabled = true;
                            } else {
                                potionOneDisabled = false;
                            }
                        }                      
                    }                                                
                }
            }
            

            var enemy = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: constKey }] });
            const hasPng = await pngCheck(enemy);

            const hideButton = new ButtonBuilder()
                .setCustomId('hide')
                .setLabel('Try to hide')
                .setDisabled(false)
                .setStyle(ButtonStyle.Secondary);

            const attackButton = new ButtonBuilder()
                .setCustomId('onehit')
                .setLabel('Strike')
                .setStyle(ButtonStyle.Primary);

            const stealButton = new ButtonBuilder()
                .setCustomId('steal')
                .setLabel('Steal Item')
                .setDisabled(stealDisabled)
                .setStyle(ButtonStyle.Secondary);

            const blockButton = new ButtonBuilder()
                .setCustomId('block')
                .setLabel('Block Attack')
                .setStyle(ButtonStyle.Secondary);

            const potionOneButton = new ButtonBuilder()
                .setCustomId('potone')
                .setLabel('Potion One')
                .setDisabled(potionOneDisabled)
                .setStyle(ButtonStyle.Secondary);          

            const row = new ActionRowBuilder().addComponents(hideButton, attackButton, stealButton, blockButton, potionOneButton);

            const pigmy = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });

            var attachment;

            if (hasPng) {
                attachment = await displayEWpic(interaction, enemy, true);
            } else {
                attachment = await displayEWOpic(interaction, enemy, true);
            }

            const message = await interaction.followUp({ components: [row], files: [attachment] });

            const filter = (i) => i.user.id === interaction.user.id;

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 40000,
            });

            collector.on('collect', async (collInteract) => {

                if (collInteract.customId === 'steal') {
                    await collInteract.deferUpdate();
                    const actionToTake = await stealing(enemy, uData, pigmy);
                    //ACTIONS TO HANDLE: 'NO ITEM'||'FAILED'||'UNIQUE ITEM'
                    if (actionToTake === 'NO ITEM') {
                        //Enemy has no item to steal, Prevent further steal attempts & Set steal disabled globally
                        stealDisabled = true;
                        stealButton.setDisabled(true);
                        await collInteract.editReply({ components: [row] });
                        
                        const emptyPockets = new EmbedBuilder()
                            .setTitle('Nothing to steal')
                            .setColor('NotQuiteBlack')
                            .addFields(
                                { name: 'No really..', value: 'There isnt anything here!', inline: true },
                            );

                        await collInteract.channel.send({ embeds: [emptyPockets] }).then(async emptyPockets => setTimeout(() => {
                            emptyPockets.delete();
                        }, 15000)).catch(console.error);

                    } else if (actionToTake === 'FAILED') {
                        //Steal has failed! Punish player
                        const stealFailed = new EmbedBuilder()
                            .setTitle('Failed!')
                            .setColor('DarkRed')
                            .addFields(
                                { name: 'Oh NO!', value: 'You got caught red handed!', inline: true },
                            );

                        await collInteract.channel.send({ embeds: [stealFailed] }).then(async stealFailed => setTimeout(() => {
                            stealFailed.delete();
                        }, 15000)).catch(console.error);

                        await collector.stop();
                        await stealPunish(enemy, uData);
                    } else if (actionToTake === 'UNIQUE ITEM') {
                        //Unique item detected!
                        //Find item here
                        const itemToMake = await getUniqueItem(enemy);
                        const uItemRef = await makeUniqueItem(itemToMake);
                        await showStolen(uItemRef);
                        await collector.stop();
                        await resetHasUniqueItem(enemy, uData);
                    } else {
                        //Steal has either been a success, or an error has occured!
                        //Generate item with actionToTake                          
                        const usedRar = actionToTake;
                        const itemRef = await makeItem(enemy, usedRar);
                        await showStolen(itemRef);
                        stealDisabled = true;
                        await collector.stop();
                        await resetHasItem(enemy); //Upon completion reload enemy
                    }
                }

                if (collInteract.customId === 'hide') {
                    await collInteract.deferUpdate();                    
                    if (isHidden === false) {
                        const actionToTake = await hiding(enemy, uData, pigmy);//'FAILED'||'SUCCESS'
                        if (actionToTake === 'FAILED') {
                            //hide failed 
                            const hideFailed = new EmbedBuilder()
                                .setTitle('Failed!')
                                .setColor('DarkRed')
                                .addFields(
                                    { name: 'Oh NO!', value: 'You failed to hide!', inline: true },
                                );

                            await collInteract.channel.send({ embeds: [hideFailed] }).then(async hideFailed => setTimeout(() => {
                                hideFailed.delete();
                            }, 15000)).catch(console.error);

                            await collector.stop();
                            await stealPunish(enemy, uData);
                        } else if (actionToTake === 'SUCCESS') {
                            const hideSuccess = new EmbedBuilder()
                                .setTitle('Success!')
                                .setColor('LuminousVividPink')
                                .addFields(
                                    { name: 'Well Done!', value: 'You managed to hide!', inline: true },
                                );

                            await collInteract.channel.send({ embeds: [hideSuccess] }).then(async hideSuccess => setTimeout(() => {
                                hideSuccess.delete();
                            }, 15000)).catch(console.error);

                            hideButton.setLabel('Escape!');
                            attackButton.setLabel('BackStab!');
                            await collInteract.editReply({ components: [row] });
                            isHidden = true;
                        }
                    } else {
                        //USER ESCAPED
                        const escapeSuccess = new EmbedBuilder()
                            .setTitle('Success!')
                            .setColor('NotQuiteBlack')
                            .addFields(
                                { name: 'Well Done!', value: 'Escaped successfully!', inline: true },
                            );

                        await collInteract.channel.send({ embeds: [escapeSuccess] }).then(async escapeSuccess => setTimeout(() => {
                            escapeSuccess.delete();
                        }, 15000)).catch(console.error);

                        await collector.stop();
                        isHidden = false;
                    }
                }

                if (collInteract.customId === 'onehit') {
                    //run once reprompt reaction
                    const currentLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
                    if (currentLoadout) {
                        const weapon = await findMainHand(currentLoadout.mainhand, interaction.user.id);
                        var dmgDealt = await userDamageLoadout(uData, weapon);
                        if (isHidden === true) {
                            //BACKSTAB
                            dmgDealt = dmgDealt * 1.5;
                            isHidden = false;
                        } else if (isHidden === false) {
                            await collInteract.deferUpdate();
                        } 
                        await collector.stop();
                        dealDamage(dmgDealt, weapon, enemy, false);
                    } else {
                        //No loadout, no weapon, procced as normal
                        var weapon;
                        var dmgDealt = await userDamageLoadout(uData);
                        if (isHidden === true) {
                            //BACKSTAB
                            dmgDealt = dmgDealt * 1.5;
                            isHidden = false;
                        } else if (isHidden === false) {
                            await collInteract.deferUpdate();
                        }
                        await collector.stop();
                        dealDamage(dmgDealt, weapon, enemy, false);
                    }
                }

                if (collInteract.customId === 'block') {
                    await collInteract.deferUpdate();

                    await collector.stop();
                    await blockAttack(enemy, uData);
                }

                if (collInteract.customId === 'potone') {
                    //Potion One Used!
                    await collInteract.deferUpdate();
                    const currentLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
                    const hasPotOne = await findPotionOne(currentLoadout.potionone, uData.userid);
                    await usePotOne(hasPotOne, uData);
                    await collector.stop();
                    await display();
                    
                }                
            });

            collector.on('end', () => {
                if (message) {
                    message.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }
            });
        }

        /**
        * 
        * @param {any} enemy OBJECT
        * @param {any} user OBJECT
        * @param {any} interaction STATIC INTERACTION OBJECT
        */
        //This method is used when a user fails to steal from an enemy resulting in being attacked
        async function stealPunish(enemy, user) {
            const eDamage = await enemyDamage(enemy);
            console.log(`Enemy damge: ${eDamage}`);
            const dead = await takeDamage(eDamage, user, enemy, false);
            //Reload player info after being attacked           
            if (!dead) {
                return await display();
            }
        }

        /**
        * 
        * @param {any} enemy
        */
        //This method finds a unique item attactched to the enemy that holds it
        async function getUniqueItem(enemy) {
            const neededID = enemy.constkey + 1000;
            for (var i = 0; i < uniqueLootList.length; i++) {
                if (uniqueLootList[i].Loot_id === neededID) {
                    //Item match grab it!
                    return uniqueLootList[i];
                } else {
                    //item not match keep looking
                }
            }

        }
       
        //========================================
        //this method is for dealing damage to an enemy takes the enemy id, damageDealt, and users id 
        async function dealDamage(dmgDealt, item, enemy, isBlocked) {
            //call up the enemy on file that is currently being attacked
            //NEED TO MAKE A NEW ENEMY OF THE SAME TYPE WHEN THIS IS CALLED IN ORDER TO RECORD DAMAGE DONE
            //apply defense and weaknesses to damage given and then deal the final amount to the enemy
            //check if the attack kills, if not a kill display how much health the enemy has left
            //check if the enemy has a higher speed then player to decide who attacks first
            //var enemy = enemyList;  
            const user = await grabU();
            if (enemy.health === null) {
                console.log("Enemy has null as health an error has occured")
                return enemyDead(enemy); //enemy is dead
            }

            var eHealth = enemy.health;
            console.log('Enemy Health = ', eHealth);
            const eDefence = enemy.defence;
            console.log('Enemy Defence = ', eDefence);

            var Itype;
            console.log('dmgDealt: ', dmgDealt);

            if (item === 'NONE') {
                Itype = 'NONE';
            } else {
                try {
                    Itype = item.Type.toLowerCase();
                } catch (error) {
                    console.log(errorForm('AN ERROR OCCURED: ', error));
                }
                if (!Itype) Itype = 'none';
                console.log('Weapon Type after toLowerCase(): ', Itype);

                const Etype = enemy.weakto.toLowerCase();
                console.log('Enemy Weakto after toLowerCase(): ', Etype);

                if (Itype === Etype) {
                    dmgDealt += (dmgDealt * 0.5);
                    console.log('New dmgDealt: ', dmgDealt);
                }
            }

            var embedColour = 'NotQuiteBlack';
            var embedTitle = 'Damage Dealt';

            const pigmy = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });

            var spdUP = 0;
            var dexUP = 0;

            if (pigmy) {
                //pigmy found check for happiness and type                                                     
                if (pigmy.type === 'Fire') {
                    //Fire pigmy equipped apply + 0.10 dex
                    dexUP = 0.10;
                } else if (pigmy.type === 'Frost') {
                    //Frost pigmy equipped apply + 0.10 spd
                    spdUP = 0.10;
                }
            }

            const extraStats = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, { activec: 'Tons' }] });
            if (extraStats) {
                if (extraStats.duration > 0) {
                    spdUP += (extraStats.curreffect / 50);
                    dexUP += (extraStats.curreffect / 50);
                }
            }

            var dhChance;
            var isDH = false;
            let runCount = 1;
            if (user.pclass === 'Thief') {
                dhChance = (((user.speed * 0.02) + 0.10) + spdUP);
            } else { dhChance = ((user.speed * 0.02) + spdUP); }
            console.log('Current 2 hit chance: ', dhChance);

            const procCall1 = Math.random();
            console.log('RNG rolled for double hit: ', procCall1, '\n');

            //======================
            // First proc call if statment to check for double
            if (procCall1 <= dhChance) {
                //double attack has triggered
                runCount = 2;
                console.log('Double hit!\n');
                isDH = true;
                embedColour = 'Aqua';
                embedTitle = 'Double Hit!';
            }
            //======================

            // Do {attack for n times} While (n < runCount)
            var i = 0;
            const staticDmg = dmgDealt;
            do {
                //  Implement Critical here
                dmgDealt = staticDmg;
                var critChance;
                if (user.pclass === 'Thief') {
                    critChance = (((user.dexterity * 0.02) + 0.10) + dexUP);
                } else { critChance = ((user.dexterity * 0.02) + dexUP); }
                console.log('Current crit chance: ', critChance);

                const procCall2 = Math.random();
                console.log('RNG rolled for crit chance: ', procCall2, '\n');

                //======================
                // Second proc call if statment to check for crit
                if (procCall2 <= critChance) {
                    //attack is now a critical hit
                    dmgDealt *= 2;
                    console.log('Critical hit!\nNew damage before defence: ', dmgDealt, '\n');
                    embedColour = 'LuminousVividPink';
                    embedTitle = 'Critical Hit!';
                } else if (isDH) {
                    embedColour = 'Aqua';
                    embedTitle = 'Double Hit!';
                } else {
                    embedColour = 'NotQuiteBlack';
                    embedTitle = 'Damage Dealt';
                }
                //======================

                if (isBlocked === true) {
                    //Defence is ignored when a counter attack is made!
                } else if (isBlocked === false) {
                    dmgDealt -= (eDefence * 2);
                }
                

                //if statment to check if enemy dies after attack
                if ((eHealth - dmgDealt) <= 0) {
                    console.log('ENEMY IS DEAD');
                    dmgDealt = Number.parseFloat(dmgDealt).toFixed(1);

                    const attackDmgEmbed = new EmbedBuilder()
                        .setTitle(embedTitle)
                        .setColor(embedColour)
                        .addFields(
                            { name: 'DAMAGE: ', value: ' ' + dmgDealt + ' ', inline: true },
                        );

                    await interaction.channel.send({ embeds: [attackDmgEmbed] }).then(async attkEmbed => setTimeout(() => {
                        attkEmbed.delete();
                    }, 15000)).catch(console.error);
                    return enemyDead(enemy); // enemy is dead
                } else {
                    eHealth -= dmgDealt;
                    eHealth = Number.parseFloat(eHealth).toFixed(1);
                    dmgDealt = Number.parseFloat(dmgDealt).toFixed(1);
                    console.log('CURRENT ENEMY HEALTH: ', eHealth);

                    const attackDmgEmbed = new EmbedBuilder()
                        .setTitle(embedTitle)
                        .setColor(embedColour)
                        .addFields(
                            { name: 'DAMAGE: ', value: ' ' + dmgDealt + ' ', inline: true },
                        );

                    await interaction.channel.send({ embeds: [attackDmgEmbed] }).then(async attkEmbed => setTimeout(() => {
                        attkEmbed.delete();
                    }, 15000)).catch(console.error);

                    //NEW METHOD TO DEAL DAMAGE  
                    await hitE(eHealth, constKey);
                }
                i++;
            } while (i < runCount)

            /**
                Deal with enemy damaging player calculations and handling here!!
                    
                If enemy is still alive then player gets attacked
        
                Using similar calculations to dealing damage to enemy handle player damage taken
        
                Account for player class and stats when dealing damage
            */

            if (isBlocked === true) {
                await display();
            } else if (isBlocked === false) {
                const eDamage = await enemyDamage(enemy);
                console.log(`Enemy damge: ${eDamage}`);
                const dead = await takeDamage(eDamage, user, enemy, false);

                if (!dead) {
                    await display();
                }
            }
        }

        //This method takes user defence and calculates reflect damage if defence is stronger than enemies attack
        async function blockAttack(enemy, user) {
            var eDamage = await enemyDamage(enemy);

            const extraStats = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, { activec: 'Tons' }] });
            var currentHealth = user.health;
            if (extraStats) {
                if (extraStats.duration > 0) {
                    currentHealth += (extraStats.curreffect * 10);
                }
            }

            if (user.pclass === 'Warrior') {
                //5% damage reduction
                eDamage -= (eDamage * 0.05);
            } else if (user.pclass === 'Paladin') {
                //15% damage reduction
                eDamage -= (eDamage * 0.15);
            } else if (user.pclass === 'Mage') {
                //5% damage increase
                eDamage += (eDamage * 0.05);
            }

            var defence = 0;
            const currentLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
            if (currentLoadout) {
                var headSlotItem = await findHelmSlot(currentLoadout.headslot, interaction.user.id);
                var chestSlotItem = await findChestSlot(currentLoadout.chestslot, interaction.user.id);
                var legSlotItem = await findLegSlot(currentLoadout.legslot, interaction.user.id);

                if (headSlotItem === 'NONE') {
                    //No item equipped
                    defence += 0;
                } else {
                    //Item found add defence
                    defence += headSlotItem.Defence;
                }

                if (chestSlotItem === 'NONE') {
                    //No item equipped
                    defence += 0;
                } else {
                    //Item found add defence
                    defence += chestSlotItem.Defence;
                }

                if (legSlotItem === 'NONE') {
                    //No item equipped
                    defence += 0;
                } else {
                    //Item found add defence
                    defence += legSlotItem.Defence;
                }

                console.log(`Total Defence from Armor: ${defence}`);

                const extraDefence = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, { activec: 'Reinforce' }] });

                if (extraDefence) {
                    if (extraDefence.duration > 0) {
                        defence += extraDefence.curreffect;
                    }                   
                }

                let blockStrength;
                if (defence > 0) {
                    defence *= 1.5;
                    blockStrength = defence;
                    //blockStrength -= eDamage;
                    if ((blockStrength - eDamage) <= 0) {
                        //Player takes damage
                        eDamage -= blockStrength;
                        const dmgBlockedEmbed = new EmbedBuilder()
                            .setTitle("Damage Blocked")
                            .setColor('DarkRed')
                            .addFields({ name: 'BLOCKED: ', value: ' ' + blockStrength + ' ', inline: true });

                        await interaction.channel.send({ embeds: [dmgBlockedEmbed] }).then(async blockedEmbed => setTimeout(() => {
                            blockedEmbed.delete();
                        }, 15000)).catch(console.error);

                        return takeDamage(eDamage, user, enemy, true);
                    } else {
                        //Player deals damage
                        blockStrength -= eDamage;

                        const dmgBlockedEmbed = new EmbedBuilder()
                            .setTitle("Damage Blocked")
                            .setColor('DarkRed')
                            .addFields({ name: 'BLOCKED: ', value: ' ' + blockStrength + ' ', inline: true });

                        await interaction.channel.send({ embeds: [dmgBlockedEmbed] }).then(async blockedEmbed => setTimeout(() => {
                            blockedEmbed.delete();
                        }, 15000)).catch(console.error);

                        var item;
                        let counterDamage = (blockStrength * 0.25) + ((currentHealth * 0.02) * (user.strength * 0.4));
                        console.log(`counterDamage: ${counterDamage}`);

                        const counterEmbed = new EmbedBuilder()
                            .setTitle("Counter Attack!")
                            .setColor('DarkRed')
                            .addFields({ name: 'DAMAGE: ', value: ' ' + counterDamage + ' ', inline: true });

                        await interaction.channel.send({ embeds: [counterEmbed] }).then(async cntrEmbed => setTimeout(() => {
                            cntrEmbed.delete();
                        }, 15000)).catch(console.error);

                        return dealDamage(counterDamage, item, enemy, true);
                    }
                } else {
                    return takeDamage(eDamage, user, enemy, true);
                }
            } else if (!currentLoadout) {
                return takeDamage(eDamage, user, enemy, true);
            }

        }

        //========================================
        // This method calculates damage dealt to user 
        async function takeDamage(eDamage, user, enemy, isBlocked) {
            const extraStats = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, { activec: 'Tons' }] });
            var currentHealth = user.health;
            if (extraStats) {
                if (extraStats.duration > 0) {
                    currentHealth += (extraStats.curreffect * 10);
                }        
            }

            if (isBlocked === true) {
                if ((currentHealth - eDamage) <= 0) {
                    //Player has died
                    console.log('PLAYER IS DEAD :O');
                    await hitP(0);
                    await playerDead(user, enemy);
                    return true;
                } else {
                    currentHealth -= eDamage;
                    currentHealth = Number.parseFloat(currentHealth).toFixed(1);
                    console.log('CURRENT PLAYER HEALTH: ', currentHealth);

                    const attackDmgEmbed = new EmbedBuilder()
                        .setTitle("Damage Taken")
                        .setColor('DarkRed')
                        .addFields(
                            { name: 'DAMAGE: ', value: ' ' + eDamage + ' ', inline: true },
                            { name: 'HEALTH REMAINING: ', value: ' ' + currentHealth + ' ', inline: true },
                        );

                    await interaction.channel.send({ embeds: [attackDmgEmbed] }).then(async attkEmbed => setTimeout(() => {
                        attkEmbed.delete();
                    }, 15000)).catch(console.error);

                    await hitP(currentHealth);
                    return display();
                }
            } else if (isBlocked === false) {

                if (user.pclass === 'Warrior') {
                    //5% damage reduction
                    eDamage -= (eDamage * 0.05);
                } else if (user.pclass === 'Paladin') {
                    //15% damage reduction
                    eDamage -= (eDamage * 0.15);
                } else if (user.pclass === 'Mage') {
                    //5% damage increase
                    eDamage += (eDamage * 0.05);
                }

                var defence = 0;
                const currentLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
                if (currentLoadout) {
                    var headSlotItem = await findHelmSlot(currentLoadout.headslot, interaction.user.id);
                    var chestSlotItem = await findChestSlot(currentLoadout.chestslot, interaction.user.id);
                    var legSlotItem = await findLegSlot(currentLoadout.legslot, interaction.user.id);

                    if (headSlotItem === 'NONE') {
                        //No item equipped
                        defence += 0;
                    } else {
                        //Item found add defence
                        defence += headSlotItem.Defence;
                    }

                    if (chestSlotItem === 'NONE') {
                        //No item equipped
                        defence += 0;
                    } else {
                        //Item found add defence
                        defence += chestSlotItem.Defence;
                    }

                    if (legSlotItem === 'NONE') {
                        //No item equipped
                        defence += 0;
                    } else {
                        //Item found add defence
                        defence += legSlotItem.Defence;
                    }

                    console.log(`Total Defence from Armor: ${defence}`);

                    const extraDefence = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, { activec: 'Reinforce' }] });

                    if (extraDefence) {
                        if (extraDefence.duration > 0) {
                            defence += extraDefence.curreffect;
                        }                     
                    }

                    if (defence > 0) {
                        //Player has defence use accordingly
                        eDamage -= defence;
                    }
                }

                if (eDamage < 0) {
                    eDamage = 0;
                }


                if ((currentHealth - eDamage) <= 0) {
                    //Player has died
                    console.log('PLAYER IS DEAD :O');
                    await hitP(0);
                    await playerDead(user, enemy);
                    return true;
                } else {
                    currentHealth -= eDamage;
                    currentHealth = Number.parseFloat(currentHealth).toFixed(1);
                    console.log('CURRENT PLAYER HEALTH: ', currentHealth);

                    const attackDmgEmbed = new EmbedBuilder()
                        .setTitle("Damage Taken")
                        .setColor('DarkRed')
                        .addFields(
                            { name: 'DAMAGE: ', value: ' ' + eDamage + ' ', inline: true },
                            { name: 'HEALTH REMAINING: ', value: ' ' + currentHealth + ' ', inline: true },
                        );

                    await interaction.channel.send({ embeds: [attackDmgEmbed] }).then(async attkEmbed => setTimeout(() => {
                        attkEmbed.delete();
                    }, 15000)).catch(console.error);

                    await hitP(currentHealth);
                    return false;
                }
            }
        }

        //========================================
        // This method resets player health to full upon death
        async function revive(user) {
            const totalHealth = 100 + (user.strength * 10);
            const editRow = UserData.update({ health: totalHealth }, { where: { userid: interaction.user.id } });
            if (editRow > 0) return console.log('Player successfully revived to full health!');
        }

        //========================================
        //this method updates the enemies health after being attacked and returns
        async function hitE(eHealth, constKey) {
            const dealDmg = ActiveEnemy.update({ health: eHealth }, { where: [{ specid: specCode }, { constkey: constKey }] });
            if (dealDmg) {
                console.log('Enemy Health has been updated');
                return;
            }
        }

        //========================================
        //this method updates the enemies health after being attacked and returns
        async function hitP(currentHealth) {
            const dealDmg = UserData.update({ health: currentHealth }, { where: { userid: interaction.user.id } });
            if (dealDmg) {
                console.log('Player Health has been updated');
                return;
            }
        }

        //========================================
        //this method is for removing an enemy when they have been killed
        async function removeE(constKey) {
            const rowCount = await ActiveEnemy.destroy({ where: [{ specid: specCode }, { constkey: constKey }] });
            if (!rowCount) console.log('That enemy did not exist.');

            console.log('Enemy removal success!!');
            return;
        }

        /**
        * 
        * @param {any} enemy
        * @param {any} user OBJECT: User Data reference
        * @param {any} interaction STATIC INTERACTION OBJECT
        */
        //This method updates the hasitem field in the ActiveEnemy database to prevent extra items being dropped on death
        async function resetHasItem(enemy) {
            const dbEdit = await ActiveEnemy.update({ hasitem: false }, { where: [{ specid: enemy.specid }, { constkey: enemy.constkey }] });
            if (dbEdit > 0) {
                //edit was made prepare reload of display
                return await display();
            }
        }

        //This method updates the hasunique field preventing stealing the same item more than once
        async function resetHasUniqueItem(enemy) {
            const dbEdit = await ActiveEnemy.update({ hasunique: false }, { where: [{ specid: enemy.specid }, { constkey: enemy.constkey }] });
            if (dbEdit > 0) {
                //edit was made prepare reload of display
                return await display();
            }
        }

        //This method spawns a drop embed upon stealing an item successfully
        async function showStolen(itemRef) {
            const item = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: itemRef.loot_id }] });

            var iVal;

            if (item.slot === 'Mainhand') {
                //Item is weapon
                iVal = (`Value: **${item.value}c**\nRarity: **${item.rarity}**\nAttack: **${item.attack}**\nType: **${item.type}**\nSlot: **${item.slot}**\nHands: **${item.hands}**\nAmount Owned: **${item.amount}**`);
            } else if (item.slot === 'Offhand') {
                iVal = (`Value: **${item.value}c**\nRarity: **${item.rarity}**\nAttack: **${item.attack}**\nType: **${item.type}**\nSlot: **${item.slot}**\nHands: **${item.hands}**\nAmount Owned: **${item.amount}**`);
            } else {
                iVal = (`Value: **${item.value}c**\nRarity: **${item.rarity}**\nAttack: **${item.defence}**\nType: **${item.type}**\nSlot: **${item.slot}**\nAmount Owned: **${item.amount}**`);
            }

            
            const itemDropEmbed = new EmbedBuilder()
                .setTitle('~LOOT STOLEN~')
                .setColor(0000)
                .addFields({

                    name: (`${item.name}\n`),
                    value: iVal
                });

            await interaction.channel.send({ embeds: [itemDropEmbed] }).then(async dropEmbed => setTimeout(() => {
                dropEmbed.delete();
            }, 10000)).catch(console.error);
        }

        //This method is used for when an item is unique
        async function makeUniqueItem(prefabItem) {
            const theItem = prefabItem;

            const lootStore = await LootStore.findOne({
                where: { spec_id: interaction.user.id, loot_id: theItem.Loot_id },
            });

            console.log('UserItem: ', lootStore);

            //check if an item was found in the previous .findOne()
            //this checks if there is an item stored in the UserItems and adds one to the amount as defined in the dbInit script
            //then return as a save call on the userItem data
            if (lootStore) {
                const inc = await lootStore.increment('amount');

                if (inc) console.log('AMOUNT WAS UPDATED!');

                return await lootStore.save();
            }


            //increase item total
            //grab reference to user
            const uData = await grabU();
            //increase item total
            uData.totitem += 1;

            await uData.save();

            if (theItem.Slot === 'Mainhand') {
                //Item is a weapon store accordingly
                const newItem = await LootStore.create({
                    name: theItem.Name,
                    value: theItem.Value,
                    loot_id: theItem.Loot_id,
                    spec_id: interaction.user.id,
                    rarity: theItem.Rarity,
                    rar_id: theItem.Rar_id,
                    attack: theItem.Attack,
                    defence: 0,
                    type: theItem.Type,
                    slot: theItem.Slot,
                    hands: theItem.Hands,
                    amount: 1
                });

                const itemAdded = await LootStore.findOne({
                    where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
                });

                console.log(itemAdded);

                return newItem;
            } else if (theItem.Slot === 'Offhand') {
                //Item is an offhand
                const newItem = await LootStore.create({
                    name: theItem.Name,
                    value: theItem.Value,
                    loot_id: theItem.Loot_id,
                    spec_id: interaction.user.id,
                    rarity: theItem.Rarity,
                    rar_id: theItem.Rar_id,
                    attack: theItem.Attack,
                    defence: 0,
                    type: theItem.Type,
                    slot: theItem.Slot,
                    hands: theItem.Hands,
                    amount: 1
                });

                const itemAdded = await LootStore.findOne({
                    where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
                });

                console.log(itemAdded);

                return newItem;
            } else {
                //Item is armor
                const newItem = await LootStore.create({
                    name: theItem.Name,
                    value: theItem.Value,
                    loot_id: theItem.Loot_id,
                    spec_id: interaction.user.id,
                    rarity: theItem.Rarity,
                    rar_id: theItem.Rar_id,
                    attack: 0,
                    defence: theItem.Defence,
                    type: theItem.Type,
                    slot: theItem.Slot,
                    amount: 1
                });

                const itemAdded = await LootStore.findOne({
                    where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
                });

                console.log(itemAdded);

                return newItem;
            }              
        }

        //========================================
        //this method generates an item to be dropped upon an enemies death
        async function makeItem(enemy, hasRar) {
            var rarG;
            console.log('==============================================');
            console.log(`hasRar: ${hasRar}`);
            if (!hasRar) {
                console.log(`No data found for hasRar, run rarity grab script!`);
                rarG = await grabRar(enemy.level); //this returns a number between 0 and 10 inclusive            
            } else {
                console.log(`Data found for hasRar, using data!`);
                rarG = hasRar;
            }
            console.log('Rarity Grabbed: ', rarG);

            //How does it effect the rarity ?
            //  - @Max stat: 10 % chance + 1 to rarID
            //  - @Max stat: 10 % chance + 1 to rarID
            //  - Max 5 % chance + 1 to rarID
            //  - Base 5 % chance + 1 to rarID
            const uData = await grabU();
            const pigmy = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });

            let chanceToBeat = 1;
            let upgradeChance = Math.random();
            if (uData.pclass === 'Thief') {
                chanceToBeat -= 0.05;
            }

            if (pigmy) {
                if ((Math.floor(pigmy.level / 5) * 0.01) > 0.05) {
                    chanceToBeat -= 0.05;
                } else {
                    chanceToBeat -= (Math.floor(pigmy.level / 5) * 0.01);
                }
            }

            if (uData.level >= 31) {
                if ((Math.floor(uData.level / 5) * 0.01) > 0.10) {
                    chanceToBeat -= 0.10;
                } else {
                    chanceToBeat -= (Math.floor(uData.level / 5) * 0.01);
                }
            }

            if (rarG < 10) {
                if (upgradeChance >= chanceToBeat) {
                    rarG++;
                }
            }

            var iPool = [];
            //for loop adding all items of requested rarity to iPool for selection
            for (var i = 0; i < lootList.length; i++) {

                if (lootList[i].Rar_id === rarG) {
                    await iPool.push(lootList[i]);
                    console.log('CONTENTS OF lootList AT POSITION ' + i + ': ', lootList[i].Name, lootList[i].Value, lootList[i].Loot_id, lootList[i].Type, interaction.user.id);
                } else {
                    //item not match keep looking
                }
            }

            console.log('\nLENGTH OF ARRAY pool1: ', iPool.length);

            //list finished, select one item 
            var rIP1;
            if (iPool.length <= 1) {
                rIP1 = 0;
            } else {
                rIP1 = Math.round(Math.random() * (iPool.length - 1));
            }

            console.log('Contents of pool1 at position rIP1: ', iPool[rIP1]);

            //New Item Creation proccess

            //Grab raw prefab values and create the item using that instead 

            const theItem = iPool[rIP1];

            const lootStore = await LootStore.findOne({
                where: { spec_id: interaction.user.id, loot_id: theItem.Loot_id },
            });

            console.log('UserItem: ', lootStore);

            //check if an item was found in the previous .findOne()
            //this checks if there is an item stored in the UserItems and adds one to the amount as defined in the dbInit script
            //then return as a save call on the userItem data
            if (lootStore) {
                const inc = await lootStore.increment('amount');

                if (inc) console.log('AMOUNT WAS UPDATED!');

                return await lootStore.save();
            }


            //increase item total
            //grab reference to user
            
            //increase item total
            uData.totitem += 1;

            await uData.save();

            if (theItem.Slot === 'Mainhand') {
                //Item is a weapon store accordingly
                const newItem = await LootStore.create({
                    name: theItem.Name,
                    value: theItem.Value,
                    loot_id: theItem.Loot_id,
                    spec_id: interaction.user.id,
                    rarity: theItem.Rarity,
                    rar_id: theItem.Rar_id,
                    attack: theItem.Attack,
                    defence: 0,
                    type: theItem.Type,
                    slot: theItem.Slot,
                    hands: theItem.Hands,
                    amount: 1
                });

                const itemAdded = await LootStore.findOne({
                    where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
                });

                console.log(itemAdded);

                return newItem;
            } else if (theItem.Slot === 'Offhand') {
                //Item is an offhand
                const newItem = await LootStore.create({
                    name: theItem.Name,
                    value: theItem.Value,
                    loot_id: theItem.Loot_id,
                    spec_id: interaction.user.id,
                    rarity: theItem.Rarity,
                    rar_id: theItem.Rar_id,
                    attack: theItem.Attack,
                    defence: 0,
                    type: theItem.Type,
                    slot: theItem.Slot,
                    hands: theItem.Hands,
                    amount: 1
                });

                const itemAdded = await LootStore.findOne({
                    where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
                });

                console.log(itemAdded);

                return newItem;
            } else {
                //Item is armor
                const newItem = await LootStore.create({
                    name: theItem.Name,
                    value: theItem.Value,
                    loot_id: theItem.Loot_id,
                    spec_id: interaction.user.id,
                    rarity: theItem.Rarity,
                    rar_id: theItem.Rar_id,
                    attack: 0,
                    defence: theItem.Defence,
                    type: theItem.Type,
                    slot: theItem.Slot,
                    amount: 1
                });

                const itemAdded = await LootStore.findOne({
                    where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
                });

                console.log(itemAdded);

                return newItem;
            }           
        }

        async function usePotOne(potion, user) {
            //User used potion in slot one!
            let appliedCurrEffect;
            if (potion.activecategory === 'Healing') {
                
                const filterHeal = activeCategoryEffects.filter(effect => effect.Name === 'Healing');         
                console.log(basicInfoForm('filterHeal @ potion: ', filterHeal[0][`${potion.name}`]));
                const healAmount = filterHeal[0][`${potion.name}`];
                let newHealth;
                if (healAmount > 0) {
                    console.log(successResult('HEALAMOUNT FOUND TRYING TO HEAL FOR THAT AMOUNT!', healAmount));
                    appliedCurrEffect = 0;
                    const totalHealth = 100 + (user.strength * 10);
                    if (user.health === totalHealth) {
                        return await interaction.followUp('You are already at maximum health!!');
                    } else {
                        if ((user.health + healAmount) > totalHealth) {
                            newHealth = totalHealth;
                            console.log(specialInfoForm('newHealth if max health reached: ', newHealth));
                        } else {
                            newHealth = user.health + healAmount;
                            console.log(specialInfoForm('newHealth if no constraint reached: ', newHealth));
                        }
                        console.log(specialInfoForm('newHealth after checks: ', newHealth));

                        const editRow = UserData.update({ health: newHealth }, { where: { userid: interaction.user.id } });
                        if (editRow > 0) console.log(successResult('USER HEALED SUCCESSFULLY!'));

                        await interaction.followUp(`Healing potion used. Healed for: ${healAmount} Current Health: ${newHealth}`);
                    }
                }
            }
            if (potion.activecategory === 'Reinforce') {
                const filterDefence = activeCategoryEffects.filter(effect => effect.Name === 'Reinforce');
                const defenceAmount = filterDefence[0][`${potion.name}`];               
                if (defenceAmount > 0) {
                    console.log(successResult('FOUND DEFENCE BOOST'));
                    appliedCurrEffect = defenceAmount;
                    await interaction.followUp(`Reinforcement potion used. Defence increased by: ${defenceAmount}`);
                }
            }
            if (potion.activecategory === 'Tons') {
                const filterStats = activeCategoryEffects.filter(effect => effect.Name === 'Tons');
                const statBoost = filterStats[0][`${potion.name}`];                
                if (statBoost > 0) {
                    console.log(successResult('FOUND STAT BOOST'));
                    appliedCurrEffect = statBoost;
                    await interaction.followUp(`Tons of Stats potion used. ALL stats increased by: ${statBoost}`);
                }
            }
            if (potion.activecategory === 'EXP') {
                const filterEXP = activeCategoryEffects.filter(effect => effect.Name === 'EXP');
                const expBoost = filterEXP[0][`${potion.name}`];
                if (expBoost > 0) {
                    console.log(successResult('FOUND EXP BOOST'));
                    appliedCurrEffect = expBoost;
                    await interaction.followUp(`EXP potion used. EXP gain increased by: ${expBoost}`);
                }
            }

            const hasActiveStatus = await ActiveStatus.findOne({ where: [{potionid: potion.potion_id}, { spec_id: user.userid }] });
            try {
                if (!hasActiveStatus) {
                    //Need to create new entry
                    await ActiveStatus.create({
                        name: potion.name,
                        curreffect: appliedCurrEffect,
                        activec: potion.activecategory,
                        cooldown: potion.cooldown,
                        duration: potion.duration,
                        potionid: potion.potion_id,

                        spec_id: user.userid,
                    });

                    const refindPot = await ActiveStatus.findOne({ where: [{ potionid: potion.potion_id }, { spec_id: user.userid }] });

                    if (refindPot) {
                        console.log(successResult('Potion One entry created SUCCESSFULLY!'));

                        const thePotToReduce = await OwnedPotions.findOne({ where: [{ spec_id: user.userid }, { potion_id: potion.potion_id }] });

                        const minusOne = thePotToReduce.amount - 1;

                        if (minusOne <= 0) {
                            //Destroy potion entry
                            const destroyed = await OwnedPotions.destroy({ where: [{ spec_id: user.userid }, { potion_id: potion.potion_id }] });
                            if (destroyed > 0) {
                                console.log(successResult('POTION ENTRY DESTROYED!'));
                            } else console.log(warnedForm('POTION ENTRY NOT DESTROYED!'));
                        } else {
                            const removedPot = await OwnedPotions.update({ amount: minusOne }, { where: [{ spec_id: user.userid }, { potion_id: thePotToReduce.potion_id }] });

                            if (removedPot > 0) {
                                console.log(successResult('AMOUNT DECREASED SUCCESSFULLY'));
                            } else console.log(warnedForm('POTION AMMOUNT NOT DECREASED!'));
                        }                    
                    } else console.log(warnedForm('SOMETHING WENT WRONG CREATING NEW STATUS ENTRY'));
                } else {
                    //Need to update existing entry
                    const updatedEntry = await ActiveStatus.update({
                        name: potion.name,
                        curreffect: appliedCurrEffect,
                        activec: potion.activecategory,
                        cooldown: potion.cooldown,
                        duration: potion.duration,                       
                    }, {
                        where: [{ potionid: potion.potion_id }, { spec_id: user.userid }]
                    });

                    if (updatedEntry > 0) {
                        console.log(successResult('Potion One entry update SUCCESSFULLY!'));
                        const thePotToReduce = await OwnedPotions.findOne({ where: [{ spec_id: user.userid }, { potion_id: potion.potion_id }] });

                        const minusOne = thePotToReduce.amount - 1;

                        if (minusOne <= 0) {
                            //Destroy potion entry
                            const destroyed = await OwnedPotions.destroy({ where: [{ spec_id: user.userid }, { potion_id: potion.potion_id }] });
                            if (destroyed > 0) {
                                console.log(successResult('POTION ENTRY DESTROYED!'));
                            } else console.log(warnedForm('POTION ENTRY NOT DESTROYED!'));
                        } else {
                            const removedPot = await OwnedPotions.update({ amount: minusOne }, { where: [{ spec_id: user.userid }, { potion_id: thePotToReduce.potion_id }] });

                            if (removedPot > 0) {
                                console.log(successResult('AMOUNT DECREASED SUCCESSFULLY'));
                            } else console.log(warnedForm('POTION AMMOUNT NOT DECREASED!'));
                        }
                    } else console.log(warnedForm('SOMETHING WENT WRONG UPDATING STATUS ENTRY'));
                }
            } catch (err) {
                console.log(errorForm('AN ERROR HAS OCCURED! ', err));
            }
        }
     
        //========================================
        //this method grabs user data
        async function grabU() {
            const uData = await UserData.findOne({ where: { userid: interaction.user.id } });
            //console.log(uData);
            return uData;
        }

        //========================================
        //This method checks for enemy png
        function pngCheck(enemy) {
            for (var i = 0; i < enemyList.length; i++) {
                //if enemy with player level or lower can be found continue
                if (enemyList[i].ConstKey === enemy.constkey) {
                    //check if this enemy has a png to display
                    var tmpCheck = enemyList[i];
                    if (tmpCheck.PngRef) {
                        //enemy has png
                        return true;
                    } else return false;
                } else {/**enemy not found keep looking*/ }
            }
        }
    }
};
    

