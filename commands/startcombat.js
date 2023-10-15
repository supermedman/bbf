const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { UserData, ActiveEnemy, Equipped, LootStore, Pigmy, Loadout } = require('../dbObjects.js');
const { displayEWpic, displayEWOpic } = require('./exported/displayEnemy.js');
const { isLvlUp } = require('./exported/levelup.js');
const { grabRar } = require('./exported/grabRar.js');
const { stealing } = require('./exported/handleSteal.js');
const { hiding } = require('./exported/handleHide.js');
const { userDamage, enemyDamage } = require('./exported/dealDamage.js');
const { findHelmSlot, findChestSlot, findLegSlot, findMainHand, findOffHand } = require('./exported/findLoadout.js');

//Prefab grabbing 
const enemyList = require('../events/Models/json_prefabs/enemyList.json');
const lootList = require('../events/Models/json_prefabs/lootList.json');
const deathMsgList = require('../events/Models/json_prefabs/deathMsgList.json');
const uniqueLootList = require('../events/Models/json_prefabs/uniqueLootList.json');

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('startcombat')
        .setDescription('The basic combat initiation!'),

    async execute(interaction) {
        await interaction.deferReply();

        var constKey;
        var specCode;
        var stealDisabled = false;
        var isHidden = false;

        let messageCount = 0;

        startCombat();

        

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

                    var lChance = Math.random();
                    var HI = false;

                    if (lChance >= 0.850) {
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
            const xpGained = Math.floor(Math.random() * (enemy.xpmax - enemy.xpmin + 1) + enemy.xpmin);
            const cCalc = ((xpGained - 5) + 1);

            await isLvlUp(xpGained, cCalc, interaction);

            const user = await grabU();
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

                const itemDropEmbed = new EmbedBuilder()
                    .setTitle('~LOOT DROPPED~')
                    .setColor(0000)
                    .addFields({

                        name: (`${item.name}\n`),
                        value: iVal
                    });

                await interaction.channel.send({ embeds: [itemDropEmbed] }).then(async dropEmbed => setTimeout(() => {
                    dropEmbed.delete();
                }, 10000)).catch(console.error);
            }

            //const ref = new ActionRowBuilder()
            //    .addComponents(
            //        new ButtonBuilder()
            //            .setCustomId('primary')
            //            .setLabel('New Enemy')
            //            .setStyle(ButtonStyle.Success)
            //            .setDisabled(true)
            //            .setEmoji('💀'),
            //    );

            const killedEmbed = new EmbedBuilder()
                .setTitle("YOU KILLED THE ENEMY!")
                .setColor(0000)
                .setDescription("Well done!")
                .addFields(
                    { name: 'Xp Gained', value: ' ' + xpGained + ' ', inline: true },
                    { name: 'Coins Gained', value: ' ' + cCalc + ' ', inline: true },
                );

            interaction.channel.send({ embeds: [killedEmbed]/**, components: [ref]*/ }).then(async embedMsg => setTimeout (() => {
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
                    embedMsg.delete();
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

            const row = new ActionRowBuilder().addComponents(hideButton, attackButton, stealButton);

            const pigmy = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });

            if (hasPng) {
                const attachment = await displayEWpic(interaction, enemy, true);

                const message = await interaction.followUp({ components: [row], files: [attachment] });

                const filter = (i) => i.user.id === interaction.user.id;

                const collector = message.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    filter,
                    time: 40000,
                });

                collector.on('collect', async (collInteract) => {
                    await collInteract.deferUpdate();
                    if (collInteract.customId === 'steal') {
                        const uData = await grabU();
                        const actionToTake = await stealing(enemy, uData, pigmy);
                        //ACTIONS TO HANDLE: 'NO ITEM'||'FAILED'||'UNIQUE ITEM'
                        if (actionToTake === 'NO ITEM') {
                            //Enemy has no item to steal, Prevent further steal attempts & Set steal disabled globally
                            stealDisabled = true;
                            stealButton.setDisabled(true);
                            await collInteract.editReply({ components: [row] });
                            //await collInteract.channel.send({ content: 'Looks like that enemy has empty pockets!', ephemeral: true });

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
                            //Steal has failed!
                            //Punish player
                            //await collInteract.channel.send({ content: 'Oh NO! You got caught red handed!', ephemeral: true });
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
                            await stealPunish(enemy, uData, interaction);
                        } else if (actionToTake === 'UNIQUE ITEM') {
                            //WIP
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
                    } else if (collInteract.customId === 'hide') {
                        const uData = await grabU();
                        if (isHidden === false) {
                            const actionToTake = await hiding(enemy, uData, pigmy);//'FAILED'||'SUCCESS'
                            if (actionToTake === 'FAILED') {
                                //hide failed 
                                //await collInteract.channel.send({ content: 'Oh NO! You failed to hide!', ephemeral: true });

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
                                await stealPunish(enemy, uData, interaction);
                            } else if (actionToTake === 'SUCCESS') {
                                //await collInteract.channel.send({ content: 'You managed to hide!', ephemeral: true });

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
                            //await collInteract.channel.send('Escaped successfully!');

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
                    } else if (collInteract.customId === 'onehit') {
                        //run once reprompt reaction
                        const item = await Equipped.findOne({ where: [{ spec_id: interaction.user.id }] });
                        var dmgDealt = await userDamage(interaction, item);
                        //await i.deferUpdate();
                        if (isHidden === true) {
                            //BACKSTAB
                            dmgDealt = dmgDealt * 1.5;
                            isHidden = false;
                        }
                        await collector.stop();
                        dealDamage(dmgDealt, item);
                    }
                });

                collector.on('end', () => {
                    if (message) {
                        message.delete();
                    }
                });

            } else {
                const attachment = await displayEWOpic(interaction, enemy, true);

                const message = await interaction.followUp({ components: [row], files: [attachment] });

                const filter = (i) => i.user.id === interaction.user.id;

                const collector = message.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    filter,
                    time: 40000,
                });

                collector.on('collect', async (collInteract) => {
                    await collInteract.deferUpdate();
                    if (collInteract.customId === 'steal') {
                        const uData = await grabU();
                        const actionToTake = await stealing(enemy, uData);
                        //ACTIONS TO HANDLE:
                        //'NO ITEM'
                        //'FAILED'
                        //'UNIQUE ITEM'
                        if (actionToTake === 'NO ITEM') {
                            //Enemy has no item to steal, Prevent further steal attempts & Set steal disabled globally
                            stealDisabled = true;
                            stealButton.setDisabled(true);
                            await collInteract.editReply({ components: [row] });
                            //await collInteract.channel.send({ content: 'Looks like that enemy has empty pockets!', ephemeral: true });

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
                            //Steal has failed!
                            //Punish player
                            //await collInteract.channel.send({ content: 'Oh NO! You got caught red handed!', ephemeral: true });
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
                            await stealPunish(enemy, uData, interaction);
                        } else if (actionToTake === 'UNIQUE ITEM') {
                            //WIP
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
                    } else if (collInteract.customId === 'hide') {
                        const uData = await grabU();
                        if (isHidden === false) {
                            const actionToTake = await hiding(enemy, uData);//'FAILED'||'SUCCESS'
                            if (actionToTake === 'FAILED') {
                                //hide failed 
                                //await collInteract.channel.send({ content: 'Oh NO! You failed to hide!', ephemeral: true });

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
                                await stealPunish(enemy, uData, interaction);
                            } else if (actionToTake === 'SUCCESS') {
                                //await collInteract.channel.send({ content: 'You managed to hide!', ephemeral: true });

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
                            //await collInteract.channel.send('Escaped successfully!');

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
                    } else if (collInteract.customId === 'onehit') {
                        //run once reprompt reaction
                        const item = await Equipped.findOne({ where: [{ spec_id: interaction.user.id }] });
                        var dmgDealt = await userDamage(interaction, item);
                        //await i.deferUpdate();
                        if (isHidden === true) {
                            //BACKSTAB
                            dmgDealt = dmgDealt * 1.5;
                            isHidden = false;
                        }
                        await collector.stop();
                        dealDamage(dmgDealt, item);
                    }
                });

                collector.on('end', () => {
                    if (message) {
                        message.delete();
                    }
                });             
            }                                      
        }

        /**
        * 
        * @param {any} enemy OBJECT
        * @param {any} user OBJECT
        * @param {any} interaction STATIC INTERACTION OBJECT
        */
        //This method is used when a user fails to steal from an enemy resulting in being attacked
        async function stealPunish(enemy, user, interaction) {
            const eDamage = await enemyDamage(enemy);
            console.log(`Enemy damge: ${eDamage}`);
            const dead = await takeDamage(eDamage, user, enemy, interaction);
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
        // This method is for dealing damage to an enemy until it dies
        async function dealDeath(dmgDealt, item) {
            //run attack function till enemy health reaches 0
            var enemy = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: constKey }] });
            if (enemy) {
                if (enemy.health === null) {
                    console.log("Enemy has null as health an error has occured")
                    enemy.health = 0;
                    return enemyDead(enemy);
                }

                //while statment to run until enemy has died
                var atkCount = 0;
                var eHealth = enemy.health;

                var Itype;

                if (!item) {
                    Itype = 'NONE';
                } else {
                    Itype = item.type.toLowerCase();

                    console.log('Weapon Type after toLowerCase(): ', Itype);
                }

                const Etype = enemy.weakto.toLowerCase();

                console.log('Enemy Weakto after toLowerCase(): ', Etype);

                if (Itype === Etype) {
                    dmgDealt = dmgDealt * 1.5;
                    console.log('New dmgDealt: ', dmgDealt);
                }

                while (!eDead) {
                    
                    if (enemy.defence <= 0) {
                        //if statment to check if enemy dies after attack when defence = 0
                        if ((eHealth - dmgDealt) <= 0) {
                            //sets the enemy to dead then returns
                            console.log('ENEMY IS DEAD');
                            eDead = true;

                        }
                        else {
                            //deals damage to enemy without defence
                            eHealth = eHealth - dmgDealt;
                            console.log('CURRENT ENEMY HEALTH WITHOUT DEFENCE: ', eHealth);
                        }
                    }
                    else {
                        //if statment to check if enemy dies after attack while applying defence
                        var dmg = ((dmgDealt - (enemy.defence * 2)) + 1);
                        console.log('True damage done to enemy: ',dmg);


                        if (dmg <= 0) {
                            dmg = 1;
                        }

                        if ((eHealth - dmg) <= 0) {
                            //sets the enemy to dead then returns
                            console.log('ENEMY IS DEAD');

                            eDead = true;
                        }
                        else {
                            //deals damage to enemy while including defences                               
                            eHealth = eHealth - dmg;
                            console.log('CURRENT ENEMY HEALTH AFTER DEFENCE: ', eHealth);
                        }
                    }
                    atkCount++;
                }
                //enemy is dead at this point call display and return dead

                const attackCountEmbed = new EmbedBuilder()
                    .setTitle("Attack Counter")
                    .setColor(0000)
                    .addFields(
                        { name: 'Number of Attacks: ', value: ' ' + atkCount + ' ', inline: true },
                    );

                interaction.channel.send({ embeds: [attackCountEmbed] }).then(async attkEmbed => setTimeout(() => {
                    attkEmbed.delete();
                }, 5000));

                return display(eDead, pDead);
            }
            else {
                //no enemy found!
            }
        }

        //========================================
        //this method is for dealing damage to an enemy takes the enemy id, damageDealt, and users id 
        async function dealDamage(dmgDealt, item) {
            //call up the enemy on file that is currently being attacked
            //NEED TO MAKE A NEW ENEMY OF THE SAME TYPE WHEN THIS IS CALLED IN ORDER TO RECORD DAMAGE DONE
            //apply defense and weaknesses to damage given and then deal the final amount to the enemy
            //check if the attack kills, if not a kill display how much health the enemy has left
            //check if the enemy has a higher speed then player to decide who attacks first
            //var enemy = enemyList;
            var copyCheck = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: constKey }] });
            if (copyCheck) {
                const user = await grabU();              
                const enemy = copyCheck;
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

                if (!item) {
                    Itype = 'NONE';
                } else {
                    Itype = item.type.toLowerCase();
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

                    dmgDealt -= (eDefence * 2);

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
                const eDamage = await enemyDamage(enemy);
                console.log(`Enemy damge: ${eDamage}`);
                const dead = await takeDamage(eDamage, user, enemy);

                if (!dead) {
                    await display();
                }
            }
        }

        //========================================
        // This method calculates damage dealt to user 
        async function takeDamage(eDamage, user, enemy) {          
            var currentHealth = user.health;

            var defence = 0;
            const currentLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
            if (currentLoadout) {
                var headSlotItem = await findHelmSlot(currentLoadout.headslot);
                var chestSlotItem = await findChestSlot(currentLoadout.chestslot);
                var legSlotItem = await findLegSlot(currentLoadout.legslot);

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

                if (defence > 0) {
                    //Player has defence use accordingly
                    if ((eDamage -= defence) <= 0) {
                        eDamage = 0;
                    } else {
                        eDamage -= defence;
                    }
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
    

