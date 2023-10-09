const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { ActiveEnemy, Equipped, LootStore, LootDrop, UserData } = require('../../dbObjects.js');
const { displayEWpic, displayEWOpic } = require('./displayEnemy.js');
const { userDamageAlt } = require('./dealDamage.js');
const { isLvlUp } = require('./levelup.js');
const { grabRar } = require('./grabRar.js');
const { stealing } = require('./handleSteal.js');

const enemyList = require('../../events/Models/json_prefabs/enemyList.json');
const lootList = require('../../events/Models/json_prefabs/lootList.json');
const deathMsgList = require('../../events/Models/json_prefabs/deathMsgList.json');

var constKey;
var specCode;
var stealDisabled = false;

/**
 * 
 * @param {any} uData OBJECT Static upon initial call
 * @param {any} carriedCode ID STRING Static refrence to enemy specCode
 * @param {any} interaction STATIC INTERACTION OBJECT
 * @param {any} theEnemy Static upon initial call
 */
//========================================
// This method displays the enemy in its initial state
async function initialDisplay(uData, carriedCode, interaction, theEnemy) {
    specCode = carriedCode;
    constKey = theEnemy.constkey;
    stealDisabled = false;
    if (uData.health <= 0) return playerDead(uData, 'Fayrn');
    //Only user && interaction objects need to be passed futher!
    await display(interaction, uData);
}

/**
 * 
 * @param {any} interaction STATIC INTERACTION OBJECT
 * @param {any} uData OBJECT: User Data reference
 */
//========================================
//This method is used after the first time displaying an enemy for continued combat handles
async function display(interaction, uData) {
    const enemy = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: constKey }] });
    const hasPng = await pngCheck(enemy);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('hide')
                .setLabel('Try to hide')
                .setDisabled(true)
                .setStyle(ButtonStyle.Secondary),
        )
        .addComponents(
            new ButtonBuilder()
                .setCustomId('onehit')
                .setLabel('Strike')
                .setStyle(ButtonStyle.Primary),
        )
        .addComponents(
            new ButtonBuilder()
                .setCustomId('steal')
                .setLabel('Steal Item')
                .setDisabled(stealDisabled)
                .setStyle(ButtonStyle.Secondary),
        );

    if (hasPng) {
        const attachment = await displayEWpic(interaction, enemy, true);

        interaction.channel.send({ components: [row], files: [attachment] }).then(async message => {
            const collectorBut = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 40000 });

            collectorBut.on('collect', async i => {
                if (i.user.id === uData.userid) {
                    await i.deferUpdate();
                    if (i.customId === 'steal') {
                        //WIP
                        //User attempts to steal an item from the enemy 
                        //Chance increases based on dex && speed
                        //Steal automatically fails if enemy does not have an item 
                        //Steal becomes unavailable after first successful attempt 
                        //Add check if enemy has preset item that can be stolen
                        //If enemy has item and steal fails, enemy attacks
                        //If enemy does not have item causing steal to fail, enemy does nothing 
                        const actionToTake = await stealing(enemy, uData);
                        //ACTIONS TO HANDLE:
                        //'NO ITEM'
                        //'FAILED'
                        //'UNIQUE ITEM'
                        if (actionToTake === 'NO ITEM') {
                            //Enemy has no item to steal, Prevent further steal attempts & Set steal disabled globally
                            stealDisabled = true;
                            row.components[2].setDisabled(true);
                            await i.editReply({ components: [row] });
                            await i.channel.send({ content: 'Looks like that enemy has empty pockets!', ephemeral: true });
                        } else if (actionToTake === 'FAILED') {
                            //Steal has failed!
                            //Punish player
                            await i.channel.send({ content: 'Oh NO! You got caught red handed!', ephemeral: true });
                            await message.delete();
                            await stealPunish(enemy, uData, interaction);
                        } else if (actionToTake === 'UNIQUE ITEM') {
                            //WIP
                        } else {
                            //Steal has either been a success, or an error has occured!
                            //Generate item with actionToTake                          
                            const usedRar = actionToTake;
                            const itemRef = await makeItem(enemy, interaction, user, usedRar);
                            await showStolen(itemRef, interaction);
                            stealDisabled = true;                         
                            await message.delete();
                            await resetHasItem(enemy, uData, interaction); //Upon completion reload enemy
                        }
                    }
                    if (i.customId === 'hide') {
                        //WIP
                    }
                    if (i.customId === 'onehit') {
                        //run once reprompt reaction
                        const item = await Equipped.findOne({ where: [{ spec_id: uData.userid }] });
                        var dmgDealt = await userDamageAlt(uData, item);
                        await message.delete();
                        await hitOnce(dmgDealt, item, uData, enemy, interaction);
                    }
                } else {
                    i.reply({ content: `Nice try slick!`, ephemeral: true });
                }
            });
            collectorBut.on('end', async remove => { if (!message) { await message.delete(); } });
        })
    } else {
        const attachment = await displayEWOpic(interaction, enemy, true);

        interaction.channel.send({ components: [row], files: [attachment] }).then(async message => {
            const collectorBut = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 40000 });

            collectorBut.on('collect', async i => {
                if (i.user.id === uData.userid) {
                    await i.deferUpdate();
                    if (i.customId === 'steal') {
                        //WIP
                        const actionToTake = await stealing(enemy, uData);
                        //ACTIONS TO HANDLE:
                        //'NO ITEM'
                        //'FAILED'
                        //'UNIQUE ITEM'
                        if (actionToTake === 'NO ITEM') {
                            //Enemy has no item to steal, Prevent further steal attempts & Set steal disabled globally
                            stealDisabled = true;
                            row.components[2].setDisabled(true);
                            await i.editReply({ components: [row] });
                            await i.channel.send({ content: 'Looks like that enemy has empty pockets!', ephemeral: true });
                        } else if (actionToTake === 'FAILED') {
                            //Steal has failed!
                            //Punish player
                            await i.channel.send({ content: 'Oh NO! You got caught red handed!', ephemeral: true });
                            await message.delete();
                            await stealPunish(enemy, uData, interaction);
                        } else if (actionToTake === 'UNIQUE ITEM') {
                            //WIP
                        } else {
                            //Steal has either been a success, or an error has occured!
                            //Generate item with actionToTake                          
                            const usedRar = actionToTake;
                            const itemRef = await makeItem(enemy, interaction, user, usedRar);
                            await showStolen(itemRef, interaction);
                            stealDisabled = true;
                            await message.delete();
                            await resetHasItem(enemy, uData, interaction); //Upon completion reload enemy
                        }
                    }
                    if (i.customId === 'hide') {
                        //WIP
                    }
                    if (i.customId === 'onehit') {
                        //run once reprompt reaction
                        const item = await Equipped.findOne({ where: [{ spec_id: uData.userid }] });
                        var dmgDealt = await userDamageAlt(uData, item);
                        await message.delete();
                        await hitOnce(dmgDealt, item, uData, enemy, interaction);
                    }
                } else {
                    i.reply({ content: `Nice try slick!`, ephemeral: true });
                }
            });
            collectorBut.on('end', async remove => { if (!message) { await message.delete(); } });
        })
    }
}

/**
 * 
 * @param {any} enemy OBJECT
 */
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
    const uData = await UserData.findOne({ where: { userid: interaction.user.id } });
    if (!dead) {
        return await display(interaction, uData);
    }
}

/**
 * 
 * @param {any} dmgDealt
 * @param {any} item
 * @param {any} user OBJECT: User Data reference
 * @param {any} Enemy
 * @param {any} interaction STATIC INTERACTION OBJECT
 */
//========================================
//This method handles the bulk of combat calculations and value changes.
async function hitOnce(dmgDealt, item, user, Enemy, interaction) {
    //call up the enemy on file that is currently being attacked
    //apply defense and weaknesses to damage given and then deal the final amount to the enemy
    //check if the attack kills, if not a kill, display how much health the enemy has left
    console.log(Enemy.constkey);
    var copyCheck = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: Enemy.constkey }] });
    if (copyCheck) {
        const enemy = copyCheck;
        if (enemy.health === null) {
            console.log("Enemy has null as health an error has occured")
            return enemyDead(enemy, interaction, user); //enemy is dead
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

        var dhChance;
        var isDH = false;
        let runCount = 1;
        if (user.pclass === 'Thief') {
            dhChance = ((user.speed * 0.02) + 0.10);
        } else { dhChance = (user.speed * 0.02); }
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
                critChance = ((user.dexterity * 0.02) + 0.10);
            } else { critChance = (user.dexterity * 0.02); }
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
                }, 15000));
                return enemyDead(enemy, interaction, user); // enemy is dead
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
                }, 15000));

                //NEW METHOD TO DEAL DAMAGE  
                await hitE(eHealth, enemy);
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
        const dead = await takeDamage(eDamage, user, enemy, interaction);
        const uData = await UserData.findOne({ where: { userid: interaction.user.id } });

        if (!dead) {
            console.log(`uData: ${uData} \nspecCode: ${specCode} \ninteraction: ${interaction} \nEnemy: ${Enemy}`);
            return await display(interaction, uData);
        }
    }
}

/**
 * 
 * @param {any} enemy
 * @param {any} interaction STATIC INTERACTION OBJECT
 * @param {any} user OBJECT: User Data reference
 */
//========================================
// This method handles when enemy has died 
async function enemyDead(enemy, interaction, user) {
    const xpGained = Math.floor(Math.random() * (enemy.xpmax - enemy.xpmin + 1) + enemy.xpmin);
    const cCalc = ((xpGained - 5) + 1);

    await isLvlUp(xpGained, cCalc, interaction, user);

    if (enemy.hasitem) {

        const reference = await makeItem(enemy, interaction, user);

        const item = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: reference.loot_id }] });

        const iVal = (`Value: **${item.value}c**\nRarity: **${item.rarity}**\nAttack: **${item.attack}**\nType: **${item.type}**\nAmount Owned: **${item.amount}**`)

        const itemDropEmbed = new EmbedBuilder()
            .setTitle('~LOOT DROPPED~')
            .setColor(0000)
            .addFields({

                name: (`${item.name}\n`),
                value: iVal
            });

        await interaction.channel.send({ embeds: [itemDropEmbed] }).then(async dropEmbed => setTimeout(() => {
            dropEmbed.delete();
        }, 10000));
    }

    const killedEmbed = new EmbedBuilder()
        .setTitle("YOU KILLED THE ENEMY!")
        .setColor(0000)
        .setDescription("Well done!")
        .addFields(
            { name: 'Xp Gained', value: ' ' + xpGained + ' ', inline: true },
            { name: 'Coins Gained', value: ' ' + cCalc + ' ', inline: true },
        );

    await interaction.channel.send({ embeds: [killedEmbed] }).then(async embedMsg => setTimeout(() => {
        embedMsg.delete();
    }, 10000));
    removeE(enemy);
}

/**
 * 
 * @param {any} user OBJECT: User Data reference
 * @param {any} enemy
 * @param {any} interaction STATIC INTERACTION OBJECT
 */
//========================================
// This method handles when player has died
async function playerDead(user, enemy, interaction) {
    /*PLAYER IS DEAD HANDLE HERE*/
    //TEMPORARY EMBED FOR TESTING PURPOSES WILL BE CANVASED LATER

    const grief = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('primary')
                .setLabel('Revive')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('💀'),
        );

    const specialMsg = Math.random();
    const MsgID = Math.round(Math.random() * (deathMsgList.length - 1));

    if (enemy === 'Fayrn') {
        var list = `Fighting fearlessly till the end, ${user.username} nonetheless fell prey to the gods, please Mourn your loss to revive to full health.`
    }
    if (specialMsg >= 0.9) {
        var list = deathMsgList[MsgID];
    } else {
        var list = `Fighting fearlessly till the end, ${user.username} nonetheless fell prey to ${enemy.name}`
    }

    const deadEmbed = new EmbedBuilder()
        .setTitle('YOU HAVE FALLEN IN COMBAT')
        .setColor('DarkGold')
        .addFields(
            { name: `Obituary`, value: list, inline: true },
        );
    await interaction.channel.send({ embeds: [deadEmbed], components: [grief] }).then(async embedMsg => {
        const collectorBut = embedMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 40000 });

        collectorBut.on('collect', async i => {
            if (i.user.id === interaction.user.id) {
                //delete the embed here
                await embedMsg.delete();
                await revive(user, interaction);
            } else {
                i.reply({ content: `Nice try slick!`, ephemeral: true });
            }
        });
        collectorBut.on('end', async remove => { if (!embedMsg) { await embedMsg.delete(); } });
    });
}

//This method spawns a drop embed upon stealing an item successfully
async function showStolen(itemRef, interaction) {
    const item = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { loot_id: itemRef.loot_id }] });

    const iVal = (`Value: **${item.value}c**\nRarity: **${item.rarity}**\nAttack: **${item.attack}**\nType: **${item.type}**\nAmount Owned: **${item.amount}**`)

    const itemDropEmbed = new EmbedBuilder()
        .setTitle('~LOOT STOLEN~')
        .setColor(0000)
        .addFields({

            name: (`${item.name}\n`),
            value: iVal
        });

    await interaction.channel.send({ embeds: [itemDropEmbed] }).then(async dropEmbed => setTimeout(() => {
        dropEmbed.delete();
    }, 10000));
}

/**
 * 
 * @param {any} eDamage
 * @param {any} user OBJECT: User Data reference
 * @param {any} enemy
 * @param {any} interaction STATIC INTERACTION OBJECT
 */
//========================================
// This method calculates damage dealt to user 
async function takeDamage(eDamage, user, enemy, interaction) {
    var currentHealth = user.health;

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

    if ((currentHealth - eDamage) <= 0) {
        //Player has died
        console.log('PLAYER IS DEAD :O');
        await hitP(0, user);
        await playerDead(user, enemy, interaction);
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
        }, 15000));

        await hitP(currentHealth, user);
        return false;
    }
}

/**
 * 
 * @param {any} user OBJECT: User Data reference
 * @param {any} interaction STATIC INTERACTION OBJECT
 */
//========================================
// This method resets player health to full upon death
async function revive(user, interaction) {
    const totalHealth = 100 + (user.strength * 10);
    const editRow = UserData.update({ health: totalHealth }, { where: { userid: interaction.user.id } });
    if (editRow > 0) return console.log('Player successfully revived to full health!');
}

/**
 * 
 * @param {any} eHealth INTEGER: Enemy Health reference
 * @param {any} enemy
 */
//========================================
//this method updates the enemies health after being attacked and returns
async function hitE(eHealth, enemy) {
    const dealDmg = ActiveEnemy.update({ health: eHealth }, { where: [{ specid: specCode }, { constkey: enemy.constkey }] });
    if (dealDmg) {
        console.log('Enemy Health has been updated');
        return;
    }
}

/**
 * 
 * @param {any} currentHealth INTEGER: User Health reference
 * @param {any} user OBJECT: User Data reference
 */
//========================================
//this method updates the enemies health after being attacked and returns
async function hitP(currentHealth, user) {
    const dealDmg = UserData.update({ health: currentHealth }, { where: { userid: user.userid } });
    if (dealDmg) {
        console.log('Player Health has been updated');
        return;
    }
}

/**
 * 
 * @param {any} enemy
 */
//========================================
//this method is for removing an enemy when they have been killed
async function removeE(enemy) {
    const rowCount = await ActiveEnemy.destroy({ where: [{ specid: enemy.specid }, { constkey: enemy.constkey }] });
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
async function resetHasItem(enemy, user, interaction) {
    const dbEdit = await ActiveEnemy.update({ hasitem: false }, { where: [{ specid: enemy.specid }, { constkey: enemy.constkey }] });
    if (dbEdit > 0) {
        //edit was made prepare reload of display
        return await display(interaction, user);
    }

}

/**
 * 
 * @param {any} enemy
 */
//========================================
// This method calculates damage dealt by an enemy and returns that value
function enemyDamage(enemy) {
    // First: grab enemy damage min and max
    // Second: rng between those inclusively 
    // Third: Return the value for further use 

    const dmgDealt = Math.floor(Math.random() * (enemy.maxdmg - enemy.mindmg + 1) + enemy.mindmg);
    return dmgDealt;
}

/**
 * 
 * @param {any} enemy
 * @param {any} interaction STATIC INTERACTION OBJECT
 * @param {any} hasRar Returns NULL or INT
 * @param {any} user OBJECT: User Data reference
 */
//========================================
//this method generates an item to be dropped upon an enemies death
async function makeItem(enemy, interaction, user, hasRar) {

    var rarG = 0;
    await console.log('==============================================');
    if (hasRar) {
        rarG = hasRar;
    } else {
        rarG = await grabRar(enemy.level); //this returns a number between 0 and 10 inclusive
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

    const edit = await LootDrop.findOne({ where: [{ spec_id: interaction.user.id }] });

    if (edit) {
        const maker = await LootDrop.update(
            {
                name: iPool[rIP1].Name,
                value: iPool[rIP1].Value,
                rarity: iPool[rIP1].Rarity,
                rar_id: iPool[rIP1].Rar_id,
                attack: iPool[rIP1].Attack,
                type: iPool[rIP1].Type,
                loot_id: iPool[rIP1].Loot_id,
                spec_id: interaction.user.id,
            }, { where: [{ spec_id: interaction.user.id }] });

        console.log('ITEM UPDATED!', maker);

        var item = await LootDrop.findOne({ where: [{ spec_id: interaction.user.id }] });

        console.log('LOOT UPDATED: ', item);

        var iFound = await addItem(item, user, interaction);

        return iFound;
    }
    else if (!edit) {
        const maker = await LootDrop.create(
            {
                name: iPool[rIP1].Name,
                value: iPool[rIP1].Value,
                rarity: iPool[rIP1].Rarity,
                rar_id: iPool[rIP1].Rar_id,
                attack: iPool[rIP1].Attack,
                type: iPool[rIP1].Type,
                loot_id: iPool[rIP1].Loot_id,
                spec_id: interaction.user.id,
            });

        console.log('ITEM CREATED!', maker);

        var item = await LootDrop.findOne({ where: [{ spec_id: interaction.user.id }] });

        console.log('LOOT CREATED: ', item);

        var iFound = await addItem(item, user, interaction);

        return iFound;
    }
}

/**
 * 
 * @param {any} item
 * @param {any} user OBJECT: User Data reference
 * @param {any} interaction STATIC INTERACTION OBJECT
 */
//========================================
//this method adds the dropped item into the players inventory
async function addItem(item, user, interaction) {
    //create new search var to find any Item within the UserItem file pertaining to the User in question
    //.findOne() retrevies a single row of data
    //where : {} ensures only the row desired is grabbed
    const lootStore = await LootStore.findOne({
        where: { spec_id: interaction.user.id, loot_id: item.loot_id },
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
    user.totitem += 1;

    await user.save();

    //if item is not found create a new one with the values requested
    console.log('TOTAL ITEM COUNT WAS INCREASED!');

    const newItem = await LootStore.create({
        name: item.name,
        value: item.value,
        loot_id: item.loot_id,
        spec_id: interaction.user.id,
        rarity: item.rarity,
        rar_id: item.rar_id,
        attack: item.attack,
        type: item.type,
        amount: 1
    });

    const itemAdded = await LootStore.findOne({
        where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
    });

    console.log(itemAdded);

    return newItem;
}

module.exports = { initialDisplay };
