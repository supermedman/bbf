const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const {
    warnedForm,
    errorForm,
    successResult,
    failureResult,
    basicInfoForm,
    specialInfoForm
} = require('../../chalkPresets.js');

const { ActiveEnemy, LootStore, UserData, Pigmy, Loadout, MaterialStore, ActiveStatus, OwnedPotions } = require('../../dbObjects.js');
const { displayEWpic, displayEWOpic } = require('./displayEnemy.js');
const { userDamageLoadout } = require('./dealDamage.js');
const { isLvlUp, isUniqueLevelUp } = require('./levelup.js');
const { grabRar, grabColour } = require('./grabRar.js');
const { stealing } = require('./handleSteal.js');
const { hiding } = require('./handleHide.js');
const { grabMat } = require('./materialDropper.js');
const { findHelmSlot, findChestSlot, findLegSlot, findMainHand, findOffHand, findPotionOne } = require('./findLoadout.js');

const enemyList = require('../../events/Models/json_prefabs/enemyList.json');
const lootList = require('../../events/Models/json_prefabs/lootList.json');
const deathMsgList = require('../../events/Models/json_prefabs/deathMsgList.json');
const uniqueLootList = require('../../events/Models/json_prefabs/uniqueLootList.json');
const activeCategoryEffects = require('../../events/Models/json_prefabs/activeCategoryEffects.json');

var constKey;
var specCode;
var stealDisabled = false;
var isHidden = false;
var potionOneDisabled = true;

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
    isHidden = false;
    if (interaction === false) {

    }
    if (uData.health <= 0) return playerDead(uData, 'Fayrn', interaction);
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
    const hasLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
    if (!hasLoadout) {
        //No loadout keep potions disabled
    } else {
        const checkPotOne = await findPotionOne(hasLoadout.potionone, uData.userid);

        if ((checkPotOne === 'NONE')) {
            //Both potion slots are empty keep buttons disabled
            potionOneDisabled = true;

        } else {
            const activeEffects = await ActiveStatus.findOne({ where: { spec_id: interaction.user.id } });
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

    const enemy = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: constKey }] });
    if (!enemy) {
        //Something went horribly wrong :)
        console.error(error);
    }

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
            const actionToTake = await stealing(enemy, uData, pigmy);//'NO ITEM'||'FAILED'||'UNIQUE ITEM'
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
                await stealPunish(enemy, uData, interaction);
            } else if (actionToTake === 'UNIQUE ITEM') {
                //Unique item detected! Find item here
                const itemToMake = await getUniqueItem(enemy);
                const uItemRef = await makeUniqueItem(itemToMake, interaction, uData);
                await showStolen(uItemRef, interaction);
                await collector.stop();
                await resetHasUniqueItem(enemy, uData, interaction);
            } else {
                //Steal has either been a success, or an error has occured!
                //Generate item with actionToTake                          
                const usedRar = actionToTake;
                const itemRef = await makeItem(enemy, interaction, uData, usedRar);
                await showStolen(itemRef, interaction);
                stealDisabled = true;
                await collector.stop();
                await resetHasItem(enemy, uData, interaction); //Upon completion reload enemy
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
                    await stealPunish(enemy, uData, interaction);
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
            const currentLoadout = await Loadout.findOne({ where: { spec_id: uData.userid } });
            if (currentLoadout) {
                const weapon = await findMainHand(currentLoadout.mainhand, uData.userid);
                var dmgDealt = await userDamageLoadout(uData, weapon);
                if (isHidden === true) {
                    //BACKSTAB
                    dmgDealt = dmgDealt * 1.5;
                    isHidden = false;
                } else {
                    await collInteract.deferUpdate();
                }
                await collector.stop();
                await hitOnce(dmgDealt, weapon, uData, enemy, interaction, false);
            } else {
                //No loadout, no weapon, procced as normal
                var weapon;
                var dmgDealt = await userDamageLoadout(uData);
                if (isHidden === true) {
                    //BACKSTAB
                    dmgDealt = dmgDealt * 1.5;
                    isHidden = false;
                } else {
                    await collInteract.deferUpdate();
                }
                await collector.stop();
                await hitOnce(dmgDealt, weapon, uData, enemy, interaction, false);
            }
        }

        if (collInteract.customId === 'block') {
            await collInteract.deferUpdate();

            await collector.stop();
            await blockAttack(enemy, uData, interaction);
        }

        if (collInteract.customId === 'potone') {
            //Potion One Used!
            await collInteract.deferUpdate();
            const currentLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
            const hasPotOne = await findPotionOne(currentLoadout.potionone, uData.userid);
            await usePotOne(hasPotOne, uData, interaction);
            await collector.stop();
            await display(interaction, uData);

        }
    });

    collector.on('end', () => {
        if (message) {
            message.delete();
        }
    });   
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
    const dead = await takeDamage(eDamage, user, enemy, interaction, false);
    //Reload player info after being attacked
    const uData = await UserData.findOne({ where: { userid: interaction.user.id } });
    if (!dead) {
        return await display(interaction, uData);
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

/**
 * 
 * @param {any} dmgDealt
 * @param {any} item
 * @param {any} user OBJECT: User Data reference
 * @param {any} enemy
 * @param {any} interaction STATIC INTERACTION OBJECT
 */
//========================================
//This method handles the bulk of combat calculations and value changes.
async function hitOnce(dmgDealt, item, user, enemy, interaction, isBlocked) {
    //call up the enemy on file that is currently being attacked
    //apply defense and weaknesses to damage given and then deal the final amount to the enemy
    //check if the attack kills, if not a kill, display how much health the enemy has left   
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
        Itype = item.Type.toLowerCase();
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
            }, 15000)).catch(console.error);

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
    if (isBlocked === true) {
        const uData = await UserData.findOne({ where: { userid: interaction.user.id } });
        return await display(interaction, uData);
    } else if (isBlocked === false) {
        const eDamage = await enemyDamage(enemy);
        console.log(`Enemy damge: ${eDamage}`);
        const dead = await takeDamage(eDamage, user, enemy, interaction, false);
        const uData = await UserData.findOne({ where: { userid: interaction.user.id } });

        if (!dead) {
            console.log(`uData: ${uData} \nspecCode: ${specCode} \ninteraction: ${interaction} \nEnemy: ${enemy}`);
            return await display(interaction, uData);
        }
    }   
}

async function blockAttack(enemy, user, interaction) {
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

                return takeDamage(eDamage, user, enemy, interaction, true);
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

                return hitOnce(counterDamage, item, user, enemy, interaction, true);
            }
        } else {
            return takeDamage(eDamage, user, enemy, interaction, true);
        }
    } else if (!currentLoadout) {
        return takeDamage(eDamage, user, enemy, interaction, true);
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
    var xpGained = Math.floor(Math.random() * (enemy.xpmax - enemy.xpmin + 1) + enemy.xpmin);
    const extraEXP = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, { activec: 'EXP' }] });
    if (extraEXP) {
        if (extraEXP.duration > 0) {
            xpGained *= extraEXP.curreffect;
        }
    }
    const cCalc = ((xpGained - 5) + 1);

    await isLvlUp(xpGained, cCalc, interaction, user);

    var foundMaterial = await grabMat(enemy, user, interaction);
    if (foundMaterial === 0) {
        //Do nothing, invalid return value given
    } else if (!foundMaterial) {
        //Error occured ignore futher..
    } else {
        console.log(basicInfoForm(`foundMaterial: ${foundMaterial}`));
        //const updatedMat = await MaterialStore.findOne({ where: [{ name: foundMaterial.name }, { spec_id: interaction.user.id }] });

        //if (updatedMat) foundMaterial = updatedMat;

        //var materialListed = `Value: ${foundMaterial.value}\nRarity: ${foundMaterial.rarity}\nAmount: ${foundMaterial.amount}`;

        //const matDropEmbedColour = await grabColour(updatedMat.rar_id);

        //const materialDropEmbed = new EmbedBuilder()
        //    .setTitle('~MATERIALS DROPPED~')
        //    .setColor(matDropEmbedColour)
        //    .addFields({
        //        name: `${foundMaterial.name}\n`,
        //        value: materialListed
        //    });

        //await interaction.channel.send({ embeds: [materialDropEmbed] }).then(async matDropEmbed => setTimeout(() => {
        //    matDropEmbed.delete();
        //}, 20000)).catch(console.error);
    }

    const activeEffect = await ActiveStatus.findOne({ where: { spec_id: interaction.user.id } });
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

        const reference = await makeItem(enemy, interaction, user);

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
    }, 25000)).catch(console.error);
    removeE(enemy);
}

/**
 * 
 * @param {any} user OBJECT: User Data reference
 * @param {any} enemy OBJECT || 'Fayrn': Message display reference 
 * @param {any} interaction STATIC INTERACTION OBJECT
 */
//========================================
// This method handles when player has died
async function playerDead(user, enemy, interaction) {
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
    }
    if (specialMsg >= 0.9) {
        var list = deathMsgList[MsgID].Value;
        console.log(`list: ${list}`);
    } else {
        var list = `Fighting fearlessly till the end, ${user.username} nonetheless fell prey to ${enemy.name}`
    }

    await updateDiedTo(enemy, interaction);

    await resetKillCount(user, interaction);

    const deadEmbed = new EmbedBuilder()
        .setTitle('YOU HAVE FALLEN IN COMBAT')
        .setColor('DarkGold')
        .addFields(
            { name: `Obituary`, value: list, inline: true },
    );

    const embedMsg = await interaction.channel.send({ embeds: [deadEmbed], components: [grief] });

    const filter = (i) => i.user.id === interaction.user.id;

    const collector = embedMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter,
        time: 40000,
    });

    collector.on('collect', async (collInteract) => {
        if (collInteract.customId === 'primary') {
            await collector.stop();
            await revive(user, interaction);
        }
    });

    collector.on('end', () => {
        if (embedMsg) {
            embedMsg.delete();
        }
    }); 
}

//This method updates the value for lastdeath to be used for other info commands about a user
async function updateDiedTo(enemy, interaction) {
    const tableEdit = await UserData.update({ lastdeath: enemy.name }, { where: { userid: interaction.user.id } });
    if (tableEdit > 0) {
        //Value updated successfully
        console.log(`User Death Updated!`);
    }
}

//This method sets the killsthislife value to 0 upon user death
async function resetKillCount(user, interaction) {
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

//This method spawns a drop embed upon stealing an item successfully
async function showStolen(itemRef, interaction) {
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

/**
 * 
 * @param {any} eDamage
 * @param {any} user OBJECT: User Data reference
 * @param {any} enemy
 * @param {any} interaction STATIC INTERACTION OBJECT
 */
//========================================
// This method calculates damage dealt to user 
async function takeDamage(eDamage, user, enemy, interaction, isBlocked) {
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
            }, 15000)).catch(console.error);

            await hitP(currentHealth, user);
            return display(interaction, user);
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
                if ((eDamage - defence) <= 0) {
                    eDamage = 0;
                } else {
                    eDamage -= defence;
                }
            }
        }

        if (eDamage < 0) {
            eDamage = 0;
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
            }, 15000)).catch(console.error);

            await hitP(currentHealth, user);
            return false;
        }
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

//This method updates the hasunique field preventing stealing the same item more than once
async function resetHasUniqueItem(enemy, user, interaction) {
    const dbEdit = await ActiveEnemy.update({ hasunique: false }, { where: [{ specid: enemy.specid }, { constkey: enemy.constkey }] });
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

//This method is used for when an item is unique
async function makeUniqueItem(prefabItem, interaction, user) {
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
    //increase item total
    user.totitem += 1;

    await user.save();

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
    if (!hasRar) {
        rarG = await grabRar(enemy.level); //this returns a number between 0 and 10 inclusive
    } else {
        rarG = hasRar;
    } 
    console.log('Rarity Grabbed: ', rarG);

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

    if (user.level >= 31) {
        if ((Math.floor(user.level / 5) * 0.01) > 0.10) {
            chanceToBeat -= 0.10;
        } else {
            chanceToBeat -= (Math.floor(user.level / 5) * 0.01);
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
    user.totitem += 1;

    await user.save();

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

async function usePotOne(potion, user, interaction) {
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
            }
        }
    }
    if (potion.activecategory === 'Reinforce') {
        const filterDefence = activeCategoryEffects.filter(effect => effect.Name === 'Reinforce');
        const defenceAmount = filterDefence[0][`${potion.name}`];
        if (defenceAmount > 0) {
            console.log(successResult('FOUND DEFENCE BOOST'));
            appliedCurrEffect = defenceAmount;
        }
    }
    if (potion.activecategory === 'Tons') {
        const filterStats = activeCategoryEffects.filter(effect => effect.Name === 'Tons');
        const statBoost = filterStats[0][`${potion.name}`];
        if (statBoost > 0) {
            console.log(successResult('FOUND STAT BOOST'));
            appliedCurrEffect = statBoost;
        }
    }
    if (potion.activecategory === 'EXP') {
        const filterEXP = activeCategoryEffects.filter(effect => effect.Name === 'EXP');
        const expBoost = filterEXP[0][`${potion.name}`];
        if (expBoost > 0) {
            console.log(successResult('FOUND EXP BOOST'));
            appliedCurrEffect = expBoost;
        }
    }

    const hasActiveStatus = await ActiveStatus.findOne({ where: [{ potionid: potion.potion_id }, { spec_id: user.userid }] });
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

module.exports = { initialDisplay };
