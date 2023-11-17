const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const {
    warnedForm,
    errorForm,
    successResult,
    failureResult,
    basicInfoForm,
    basicInfoForm2,
    specialInfoForm,
    specialInfoForm2,
    updatedValueForm,
    updatedValueForm2
} = require('../../chalkPresets.js');

const { ActiveEnemy, LootStore, UserData, Pigmy, Loadout, ActiveStatus, OwnedPotions } = require('../../dbObjects.js');
const { displayEWpic, displayEWOpic } = require('./displayEnemy.js');
const { userDamageLoadout } = require('./dealDamage.js');
const { isLvlUp, isUniqueLevelUp } = require('./levelup.js');
const { grabRar, grabColour } = require('./grabRar.js');
const { stealing } = require('./handleSteal.js');
const { hiding } = require('./handleHide.js');
const { grabMat } = require('./materialDropper.js');
const { findHelmSlot, findChestSlot, findLegSlot, findMainHand, findOffHand, findPotion } = require('./findLoadout.js');

const { dropRandomBlueprint } = require('./createBlueprint.js');

const enemyList = require('../../events/Models/json_prefabs/enemyList.json');
const lootList = require('../../events/Models/json_prefabs/lootList.json');
const deathMsgList = require('../../events/Models/json_prefabs/deathMsgList.json');
const uniqueLootList = require('../../events/Models/json_prefabs/uniqueLootList.json');
const activeCategoryEffects = require('../../events/Models/json_prefabs/activeCategoryEffects.json');

//var constKey;
//var specCode;
//var stealDisabled = false;
//var isHidden = false;
//var potionOneDisabled = true;

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
    const specCode = carriedCode;
    const constKey = theEnemy.constkey;

    let stealDisabled = false;
    let isHidden = false;

    let potionOneDisabled = true;
    let potionTxt = 'No Potion';

    let foundLoadout = false;

    const userID = interaction.user.id;
    let user = uData;

    if (user.health <= 0) return playerDead('Fayrn');
    display();

    //========================================
    //This method is used after the first time displaying an enemy for continued combat handles
    async function display() {
        const userLoadout = await Loadout.findOne({ where: { spec_id: userID } });
        if (userLoadout) foundLoadout = true;
        if (foundLoadout === false) {
            //No loadout keep potions disabled
        } else {
            const userPotion = await findPotion(userLoadout.potionone, userID);
            if (userPotion === 'NONE') {
                //Both potion slots are empty keep buttons disabled
                potionOneDisabled = true;
                potionTxt = 'No Potion';
            } else if (userPotion === 'HASNONE') {
                potionOneDisabled = true;
                potionTxt = '0 Remaining';
            } else {
                const activeEffects = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { name: userPotion.name }] });
                if (!activeEffects) {
                    //user has no active effects
                    potionOneDisabled = false;
                    potionTxt = `${userPotion.amount} ${userPotion.name}`;
                } else {
                    //Check both effects against currently equipped potions
                    if (activeEffects.cooldown > 0) {
                        potionOneDisabled = true;
                        potionTxt = `CoolDown: ${userPotion.cooldown}`;
                    } else {
                        potionOneDisabled = false;
                        potionTxt = `${userPotion.amount} ${userPotion.name}`;
                    }
                }
            }
        }

        const pigmy = await Pigmy.findOne({ where: { spec_id: userID } });

        const enemy = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: constKey }] });
        if (!enemy) console.log(errorForm('ENEMY NOT FOUND!?'));

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
            .setLabel(potionTxt)
            .setDisabled(potionOneDisabled)
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(hideButton, attackButton, stealButton, blockButton, potionOneButton);

        var attachment;

        if (hasPng) {
            attachment = await displayEWpic(interaction, enemy, true);
        } else {
            attachment = await displayEWOpic(interaction, enemy, true);
        }

        const combatEmbed = await interaction.followUp({ components: [row], files: [attachment] });

        const filter = (i) => i.user.id === userID;

        const collector = combatEmbed.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter,
            time: 40000,
        });

        collector.on('collect', async (collInteract) => {

            if (collInteract.customId === 'steal') {
                await collInteract.deferUpdate();

                const actionToTake = await stealing(enemy, user, pigmy);//'NO ITEM'||'FAILED'||'UNIQUE ITEM'
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
                    await stealPunish(enemy);
                } else if (actionToTake === 'UNIQUE ITEM') {
                    //Unique item detected! Find item here
                    const itemToMake = await getUniqueItem(enemy);
                    const uItemRef = await makeUniqueItem(itemToMake);
                    await showStolen(uItemRef);
                    await collector.stop();
                    await resetHasUniqueItem(enemy);
                } else {
                    //Steal has either been a success, or an error has occured!
                    //Generate item with actionToTake                          
                    const usedRar = actionToTake;
                    const itemRef = await makeItem(enemy, usedRar, pigmy);
                    await showStolen(itemRef);
                    stealDisabled = true;
                    await collector.stop();
                    await resetHasItem(enemy); //Upon completion reload enemy
                }
            }

            if (collInteract.customId === 'hide') {
                if (isHidden === false) {
                    await collInteract.deferUpdate();
                    const actionToTake = await hiding(enemy, user, pigmy);//'FAILED'||'SUCCESS'
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
                        await stealPunish(enemy);
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
                //const currentLoadout = await Loadout.findOne({ where: { spec_id: uData.userid } });
                let weapon;
                let offHand;
                let dmgDealt;
                if (foundLoadout === true) {
                    weapon = await findMainHand(userLoadout.mainhand, userID);
                    if (userLoadout.mainhand !== userLoadout.offhand) {
                        offHand = await findOffHand(userLoadout.offhand, userID);
                        console.log(specialInfoForm2(`offHand equipped: ${offHand}`));
                    }
                }

                dmgDealt = await userDamageLoadout(user, weapon, offHand);

                if (isHidden === true) {
                    //BACKSTAB
                    dmgDealt = dmgDealt * 1.5;
                    isHidden = false;
                } else {
                    await collInteract.deferUpdate();
                }
                await collector.stop();
                await hitOnce(dmgDealt, weapon, offHand, enemy, false);
            }

            if (collInteract.customId === 'block') {
                await collInteract.deferUpdate();

                await collector.stop();
                await blockAttack(enemy);
            }

            if (collInteract.customId === 'potone') {
                //Potion One Used!
                await collInteract.deferUpdate();
                const userPotion = await findPotion(userLoadout.potionone, userID);
                await usePotOne(userPotion);
                await collector.stop();
                await display();

            }
        });

        collector.on('end', () => {
            if (combatEmbed) {
                combatEmbed.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Failed to delete the message:', error);
                    }
                });
            }
        });
    }


    //========================================
    //This method checks for enemy png
    function pngCheck(enemy) {
        const enemyRef = enemyList.filter(eFab => eFab.ConstKey === enemy.constkey);
        if (enemyRef[0].PngRef) return true;
        return false;
    }

    //========================================
    //This method is used when a user fails to steal from an enemy resulting in being attacked
    async function stealPunish(enemy) {
        const eDamage = await enemyDamage(enemy);

        //Reload player info after being attacked
        const dead = await takeDamage(eDamage, enemy, false);
        user = await UserData.findOne({ where: { userid: userID } });
        if (dead === false) {
            return display();
        }
    }

    //========================================
    //This method finds a unique item attactched to the enemy that holds it
    async function getUniqueItem(enemy) {
        const returnLoot = uniqueLootList.filter(item => item.Loot_id === (enemy.constkey + 1000));
        if (returnLoot) return returnLoot;
    }

    //========================================
    //This method is used for when an item is unique
    async function makeUniqueItem(prefabItem) {
        const theItem = prefabItem;

        const lootStore = await LootStore.findOne({
            where: { spec_id: userID, loot_id: theItem.Loot_id },
        });

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
            await LootStore.create({
                name: theItem.Name,
                value: theItem.Value,
                loot_id: theItem.Loot_id,
                spec_id: userID,
                rarity: theItem.Rarity,
                rar_id: theItem.Rar_id,
                attack: theItem.Attack,
                defence: 0,
                type: theItem.Type,
                slot: theItem.Slot,
                hands: theItem.Hands,
                amount: 1
            });
        }
        if (theItem.Slot === 'Offhand') {
            await LootStore.create({
                name: theItem.Name,
                value: theItem.Value,
                loot_id: theItem.Loot_id,
                spec_id: userID,
                rarity: theItem.Rarity,
                rar_id: theItem.Rar_id,
                attack: theItem.Attack,
                defence: theItem.Defence,
                type: theItem.Type,
                slot: theItem.Slot,
                hands: 'One',
                amount: 1
            });
        } else {
            //IS ARMOR
            await LootStore.create({
                name: theItem.Name,
                value: theItem.Value,
                loot_id: theItem.Loot_id,
                spec_id: userID,
                rarity: theItem.Rarity,
                rar_id: theItem.Rar_id,
                attack: 0,
                defence: theItem.Defence,
                type: theItem.Type,
                slot: theItem.Slot,
                hands: 'NONE',
                amount: 1
            });
        }

        const itemAdded = await LootStore.findOne({
            where: { spec_id: userID, loot_id: theItem.loot_id },
        });

        return itemAdded;
    }

    //========================================
    //This method updates the hasunique field preventing stealing the same item more than once
    async function resetHasUniqueItem(enemy) {
        const dbEdit = await ActiveEnemy.update({ hasunique: false }, { where: [{ specid: enemy.specid }, { constkey: enemy.constkey }] });
        if (dbEdit > 0) {
            //edit was made prepare reload of display
            return display();
        }

    }

    //========================================
    //this method generates an item to be dropped upon an enemies death
    async function makeItem(enemy, hasRar, pigmy) {
        let foundRar = 0;
        if (!hasRar) {
            foundRar = await grabRar(enemy.level); //this returns a number between 0 and 10 inclusive
        } else {
            foundRar = hasRar;
        }
        console.log('Rarity Grabbed: ', foundRar);

        let chanceToBeat = 1;
        let upgradeChance = Math.random();
        if (user.pclass === 'Thief') {
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

        if (foundRar < 10) {
            if (upgradeChance >= chanceToBeat) {
                foundRar++;
            }
        }

        let iPool = lootList.filter(item => item.Rar_id === foundRar);
        //list finished, select one item 
        let randPos;
        if (iPool.length <= 1) {
            randPos = 0;
        } else {
            randPos = Math.floor(Math.random() * (iPool.length - 1));
        }
        const theItem = iPool[randPos];

        const lootStore = await LootStore.findOne({
            where: { spec_id: interaction.user.id, loot_id: theItem.Loot_id },
        });

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
            await LootStore.create({
                name: theItem.Name,
                value: theItem.Value,
                loot_id: theItem.Loot_id,
                spec_id: userID,
                rarity: theItem.Rarity,
                rar_id: theItem.Rar_id,
                attack: theItem.Attack,
                defence: 0,
                type: theItem.Type,
                slot: theItem.Slot,
                hands: theItem.Hands,
                amount: 1
            });
        }
        if (theItem.Slot === 'Offhand') {
            await LootStore.create({
                name: theItem.Name,
                value: theItem.Value,
                loot_id: theItem.Loot_id,
                spec_id: userID,
                rarity: theItem.Rarity,
                rar_id: theItem.Rar_id,
                attack: theItem.Attack,
                defence: theItem.Defence,
                type: theItem.Type,
                slot: theItem.Slot,
                hands: 'One',
                amount: 1
            });
        } else {
            //IS ARMOR
            await LootStore.create({
                name: theItem.Name,
                value: theItem.Value,
                loot_id: theItem.Loot_id,
                spec_id: userID,
                rarity: theItem.Rarity,
                rar_id: theItem.Rar_id,
                attack: 0,
                defence: theItem.Defence,
                type: theItem.Type,
                slot: theItem.Slot,
                hands: 'NONE',
                amount: 1
            });
        }

        const itemAdded = await LootStore.findOne({
            where: { spec_id: userID, loot_id: theItem.loot_id },
        });

        return itemAdded;
    }

    //========================================
    //This method updates the hasitem field in the ActiveEnemy database to prevent extra items being dropped on death
    async function resetHasItem(enemy) {
        const dbEdit = await ActiveEnemy.update({ hasitem: false }, { where: [{ specid: enemy.specid }, { constkey: enemy.constkey }] });
        if (dbEdit > 0) {
            //edit was made prepare reload of display
            return display();
        }

    }

    //========================================
    //This method spawns a drop embed upon stealing an item successfully
    async function showStolen(itemRef) {
        const item = itemRef;
        let listedDefaults;
        if (item.slot === 'Mainhand') {
            //Item is weapon
            listedDefaults =
                `Value: **${item.value}c**\nRarity: **${item.rarity}**\nAttack: **${item.attack}**\nType: **${item.type}**\nSlot: **${item.slot}**\nHands: **${item.hands}**\nAmount Owned: **${item.amount}**`;
        } else if (item.slot === 'Offhand') {
            listedDefaults =
                `Value: **${item.value}c**\nRarity: **${item.rarity}**\nAttack: **${item.attack}**\nDefence: **${item.defence}**\nType: **${item.type}**\nSlot: **${item.slot}**\nHands: **${item.hands}**\nAmount Owned: **${item.amount}**`;
        } else {
            listedDefaults =
                `Value: **${item.value}c**\nRarity: **${item.rarity}**\nDefence: **${item.defence}**\nType: **${item.type}**\nSlot: **${item.slot}**\nAmount Owned: **${item.amount}**`;
        }

        let embedColour = await grabColour(item.loot_id, false);

        const itemDropEmbed = new EmbedBuilder()
            .setTitle('~LOOT STOLEN~')
            .setColor(embedColour)
            .addFields({

                name: `${item.name}`,
                value: listedDefaults
            });

        await interaction.channel.send({ embeds: [itemDropEmbed] }).then(async dropEmbed => setTimeout(() => {
            dropEmbed.delete();
        }, 10000)).catch(console.error);
    }

    //========================================
    // This function takes the enemies damage and comps against player defence resulting in either taking damage or dealing damage
    async function blockAttack(enemy) {
        let eDamage = await enemyDamage(enemy);

        const extraStats = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { activec: 'Tons' }] });
        let currentHealth = user.health;
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
        const currentLoadout = await Loadout.findOne({ where: { spec_id: userID } });
        if (currentLoadout) {
            let headSlotItem = await findHelmSlot(currentLoadout.headslot, userID);
            let chestSlotItem = await findChestSlot(currentLoadout.chestslot, userID);
            let legSlotItem = await findLegSlot(currentLoadout.legslot, userID);
            let offHandItem;
            if (currentLoadout.offhand === currentLoadout.mainhand) {
                offHandItem = 'NONE';
            } else offHandItem = await findOffHand(currentLoadout.offhand, userID);

            if (headSlotItem !== 'NONE') {
                defence += headSlotItem.Defence;
            }

            if (chestSlotItem !== 'NONE') {
                defence += chestSlotItem.Defence;
            }

            if (legSlotItem !== 'NONE') {
                defence += legSlotItem.Defence;
            }
            console.log(updatedValueForm(`Total Defence from Armor: ${defence}`));

            if (offHandItem !== 'NONE') {
                defence += offHandItem.Defence;
            }
            console.log(updatedValueForm2(`Total Defence Plus offhand: ${defence}`));

            const extraDefence = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { activec: 'Reinforce' }] });

            if (extraDefence) {
                if (extraDefence.duration > 0) {
                    defence += extraDefence.curreffect;
                }
            }

            let blockStrength;
            if (defence > 0) {
                blockStrength = defence * 1.5;
                if ((blockStrength - eDamage) <= 0) {
                    //Player takes damage
                    eDamage -= blockStrength;

                    const dmgBlockedEmbed = new EmbedBuilder()
                        .setTitle("Damage Blocked")
                        .setColor('DarkRed')
                        .addFields({ name: 'DAMAGE TAKEN REDUCED BY: ', value: ' ' + blockStrength + ' ', inline: true });

                    await interaction.channel.send({ embeds: [dmgBlockedEmbed] }).then(async blockedEmbed => setTimeout(() => {
                        blockedEmbed.delete();
                    }, 15000)).catch(console.error);

                    return takeDamage(eDamage, enemy, true);
                } else {
                    //Player deals damage
                    blockStrength -= eDamage;

                    const dmgBlockedEmbed = new EmbedBuilder()
                        .setTitle("Damage Blocked")
                        .setColor('DarkRed')
                        .addFields({ name: 'BLOCK STRENGTH REMAINING: ', value: ' ' + blockStrength + ' ', inline: true });

                    await interaction.channel.send({ embeds: [dmgBlockedEmbed] }).then(async blockedEmbed => setTimeout(() => {
                        blockedEmbed.delete();
                    }, 15000)).catch(console.error);

                    let counterDamage = (blockStrength * 0.25) + ((currentHealth * 0.02) * (user.strength * 0.4));
                    console.log(`counterDamage: ${counterDamage}`);

                    const counterEmbed = new EmbedBuilder()
                        .setTitle("Counter Attack!")
                        .setColor('DarkRed')
                        .addFields({ name: 'DAMAGE: ', value: ' ' + counterDamage + ' ', inline: true });

                    await interaction.channel.send({ embeds: [counterEmbed] }).then(async cntrEmbed => setTimeout(() => {
                        cntrEmbed.delete();
                    }, 15000)).catch(console.error);

                    let ghostWep, ghostOff;

                    return hitOnce(counterDamage, ghostWep, ghostOff, enemy, true);
                }
            } else {
                return takeDamage(eDamage, enemy, true);
            }
        } else if (!currentLoadout) {
            return takeDamage(eDamage, enemy, true);
        }
    }

    //========================================
    //This method handles the bulk of combat calculations and value changes.
    async function hitOnce(dmgDealt, weapon, offHand, enemy, isBlocked) {
        if (enemy.health === null) {
            console.log("Enemy has null as health an error has occured")
            return enemyDead(enemy); //enemy is dead
        }
        const pigmy = await Pigmy.findOne({ where: { spec_id: userID } });

        let eHealth = enemy.health;
        const eDefence = enemy.defence;

        let mainDmgType;
        let offDmgType;
        console.log(basicInfoForm(`User damage Dealt before any bonuses or reductions: ${dmgDealt}`));

        if (!weapon) {
            mainDmgType = 'NONE';
        }
        if (!offHand) {
            offDmgType = 'NONE';
        }

        const Etype = enemy.weakto.toLowerCase();
        console.log('Enemy Weakto: ', Etype);

        if (mainDmgType === 'NONE' && offDmgType === 'NONE') {
            //Do nothing no type match
        } else {
            if (mainDmgType !== 'NONE') {
                mainDmgType = weapon.Type.toLowerCase();
                console.log('Weapon Type: ', mainDmgType);
            }
            if (offDmgType !== 'NONE') {
                offDmgType = offHand.Type.toLowerCase();
                console.log('Offhand Type: ', offDmgType);
            }
        }

        if (mainDmgType === Etype) {
            dmgDealt += (dmgDealt * 0.5);
            console.log(specialInfoForm(`User damage Dealt TYPEMATCH: ${dmgDealt}`));
        }
        if (offDmgType === Etype) {
            dmgDealt += (dmgDealt * 0.5);
            console.log(specialInfoForm(`User damage Dealt TYPEMATCH: ${dmgDealt}`));
        }

        let embedColour = 'NotQuiteBlack';
        let embedTitle = 'Damage Dealt';

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

        const extraStats = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { activec: 'Tons' }] });
        if (extraStats) {
            if (extraStats.duration > 0) {
                spdUP += (extraStats.curreffect / 50);
                dexUP += (extraStats.curreffect / 50);
            }
        }

        let dhChance;
        let isDH = false;
        let runCount = 1;
        if (user.pclass === 'Thief') {
            dhChance = (((user.speed * 0.02) + 0.10) + spdUP);
        } else { dhChance = ((user.speed * 0.02) + spdUP); }
        //console.log('Current 2 hit chance: ', dhChance);
        console.log(specialInfoForm(`Current double hit chance: ${dhChance}`));

        const procCall1 = Math.random();
        console.log(basicInfoForm(`RNG for double hit: ${procCall1}\n`));
        //console.log('RNG rolled for double hit: ', procCall1, '\n');

        //======================
        // First proc call if statment to check for double
        if (procCall1 <= dhChance) {
            //double attack has triggered
            runCount = 2;
            console.log(successResult('Double hit!\n'));
            isDH = true;
            embedColour = 'Aqua';
            embedTitle = 'Double Hit!';
        }
        //======================

        const activeEffect = await ActiveStatus.findOne({ where: { spec_id: userID } });
        if (!activeEffect) {
            //No active effects to manage
        } else if (activeEffect) {
            console.log(specialInfoForm('ACTIVE EFFECTS FOUND'));
            const activeEffects = await ActiveStatus.findAll({ where: { spec_id: userID } });
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
                    await ActiveStatus.destroy({ where: [{ spec_id: userID }, { potionid: currEffect.potionid }] });
                } else {
                    await ActiveStatus.update({ cooldown: coolDownReduce }, { where: [{ spec_id: userID }, { potionid: currEffect.potionid }] });
                    await ActiveStatus.update({ duration: durationReduce }, { where: [{ spec_id: userID }, { potionid: currEffect.potionid }] });
                }
                runCount++;
            } while (runCount < activeEffects.length)
        }

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
            console.log(specialInfoForm('Current crit chance: ', critChance));

            const procCall2 = Math.random();
            console.log(basicInfoForm('RNG rolled for crit chance: ', procCall2, '\n'));

            //======================
            // Second proc call if statment to check for crit
            if (procCall2 <= critChance) {
                //attack is now a critical hit
                dmgDealt *= 2;
                console.log(successResult('Critical hit!\nNew damage before defence: ', dmgDealt, '\n'));
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
                console.log(updatedValueForm(`CURRENT ENEMY HEALTH: ${eHealth}`));
                //console.log('', );

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
            user = await UserData.findOne({ where: { userid: userID } });
            return display();
        } else if (isBlocked === false) {
            const eDamage = await enemyDamage(enemy);
            console.log(basicInfoForm2(`Enemy damage before +-: ${eDamage}`));

            const dead = await takeDamage(eDamage, enemy, false);
            user = await UserData.findOne({ where: { userid: userID } });

            if (dead === false) {
                //console.log(`uData: ${uData} \nspecCode: ${specCode} \ninteraction: ${interaction} \nEnemy: ${enemy}`);
                return display();
            }
        }
    }

    //========================================
    // This method calculates damage dealt to user 
    async function takeDamage(eDamage, enemy, isBlocked) {
        const extraStats = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { activec: 'Tons' }] });
        let currentHealth = user.health;
        if (extraStats) {
            if (extraStats.duration > 0) {
                currentHealth += (extraStats.curreffect * 10);
            }
        }

        if (isBlocked === true) {
            if ((currentHealth - eDamage) <= 0) {
                //Player has died
                console.log(failureResult('PLAYER IS DEAD :O'));
                await hitP(0, user);
                await playerDead(enemy);
                return true;
            } else {
                currentHealth -= eDamage;
                currentHealth = Number.parseFloat(currentHealth).toFixed(1);
                console.log(successResult(`Current player health: ${currentHealth}`));
                //console.log('CURRENT PLAYER HEALTH: ', currentHealth);

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

            let defence = 0;
            const currentLoadout = await Loadout.findOne({ where: { spec_id: userID } });
            if (currentLoadout) {
                let headSlotItem = await findHelmSlot(currentLoadout.headslot, userID);
                let chestSlotItem = await findChestSlot(currentLoadout.chestslot, userID);
                let legSlotItem = await findLegSlot(currentLoadout.legslot, userID);
                let offHandItem;
                if (currentLoadout.offhand === currentLoadout.mainhand) {
                    offHandItem = 'NONE';
                } else offHandItem = await findOffHand(currentLoadout.offhand, userID);

                if (headSlotItem !== 'NONE') {
                    defence += headSlotItem.Defence;
                }

                if (chestSlotItem !== 'NONE') {
                    defence += chestSlotItem.Defence;
                }

                if (legSlotItem !== 'NONE') {
                    defence += legSlotItem.Defence;
                }
                console.log(updatedValueForm(`Total Defence from Armor: ${defence}`));

                if (offHandItem !== 'NONE') {
                    defence += offHandItem.Defence;
                }
                console.log(updatedValueForm2(`Total Defence Plus offhand: ${defence}`));

                const extraDefence = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { activec: 'Reinforce' }] });

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
                console.log(failureResult('PLAYER IS DEAD :O'));
                await hitP(0);
                await playerDead(enemy);
                return true;
            } else {
                currentHealth -= eDamage;
                currentHealth = Number.parseFloat(currentHealth).toFixed(1);
                console.log(successResult(`Current player health: ${currentHealth}`));

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
    //this method updates the enemies health after being attacked and returns
    async function hitP(currentHealth) {
        const dealDmg = await UserData.update({ health: currentHealth }, { where: { userid: userID } });
        if (dealDmg) {
            console.log(updatedValueForm('Player Health has been updated'));
            return;
        }
    }

    //========================================
    //this method updates the enemies health after being attacked and returns
    async function hitE(eHealth, enemy) {
        const dealDmg = await ActiveEnemy.update({ health: eHealth }, { where: [{ specid: specCode }, { constkey: enemy.constkey }] });
        if (dealDmg) {
            console.log('Enemy Health has been updated');
            return;
        }
    }

    //========================================
    // This method handles when player has died
    async function playerDead(enemy) {
        /*PLAYER IS DEAD HANDLE HERE*/
        //TEMPORARY EMBED FOR TESTING PURPOSES WILL BE CANVASED LATER

        const reviveButton = new ButtonBuilder()
            .setCustomId('primary')
            .setLabel('Revive')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('💀');

        const grief = new ActionRowBuilder().addComponents(reviveButton);

        const specialMsg = Math.random();
        //console.log(`specialMsg: ${specialMsg}`);
        const MsgID = Math.round(Math.random() * (deathMsgList.length - 1));
        //console.log(`MsgID: ${MsgID}`);
        let deathMsgListing;
        if (enemy === 'Fayrn') {
            deathMsgListing =
                `Fighting fearlessly till the end, ${user.username} nonetheless fell prey to the gods, please Mourn your loss to revive to full health.`
        }
        if (specialMsg >= 0.9) {
            deathMsgListing = deathMsgList[MsgID].Value;
            //console.log(`list: ${list}`);
        } else {
            deathMsgListing =
                `Fighting fearlessly till the end, ${user.username} nonetheless fell prey to ${enemy.name}`
        }

        await updateDiedTo(enemy);

        await resetKillCount();

        const deadEmbed = new EmbedBuilder()
            .setTitle('YOU HAVE FALLEN IN COMBAT')
            .setColor('DarkGold')
            .addFields(
                { name: `Obituary`, value: deathMsgListing, inline: true },
            );

        const embedMsg = await interaction.channel.send({ embeds: [deadEmbed], components: [grief] });

        const filter = (i) => i.user.id === userID;

        const collector = embedMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter,
            time: 40000,
        });

        collector.on('collect', async (collInteract) => {
            if (collInteract.customId === 'primary') {
                await collector.stop();
                await revive();
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

    //========================================
    // This method resets player health to full upon death
    async function revive() {
        const totalHealth = 100 + (user.strength * 10);
        const editRow = await UserData.update({ health: totalHealth }, { where: { userid: userID } });
        if (editRow > 0) return console.log(successResult('Player successfully revived to full health!'));
    }

    //========================================
    //This method updates the value for lastdeath to be used for other info commands about a user
    async function updateDiedTo(enemy) {
        const tableEdit = await UserData.update({ lastdeath: enemy.name }, { where: { userid: userID } });
        if (tableEdit > 0) {
            //Value updated successfully
            console.log(updatedValueForm(`User Death Updated!`));
            return;
        }
    }

    //========================================
    //This method sets the killsthislife value to 0 upon user death
    async function resetKillCount() {
        if (user.highestkills < user.killsthislife) {
            const updateKRecord = await UserData.update({ highestkills: user.killsthislife }, { where: { userid: userID } });
            if (updateKRecord > 0) {
                console.log(updatedValueForm(`NEW KILL RECORD!`));
            }
        }
        const killreset = await UserData.update({ killsthislife: 0 }, { where: { userid: userID } });
        if (killreset > 0) {
            console.log(updatedValueForm2(`KILLS RESET!`));
        }
    }

    //========================================
    // This method handles when enemy has died 
    async function enemyDead(enemy) {
        let xpGained = Math.floor(Math.random() * (enemy.xpmax - enemy.xpmin + 1) + enemy.xpmin);

        const extraEXP = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { activec: 'EXP' }] });
        if (extraEXP) {
            if (extraEXP.duration > 0) {
                xpGained += xpGained * extraEXP.curreffect;
            }
        }
        const cCalc = ((xpGained - 5) + 1);

        await isLvlUp(xpGained, cCalc, interaction, user);

        let blueyBaseDropRate = 0.98;
        const rolledChance = Math.random();

        if (rolledChance > blueyBaseDropRate) {
            //Blueprint drops!
            await dropRandomBlueprint(user.level, userID, interaction);
        }

        let foundMaterial = await grabMat(enemy, user, interaction);
        if (foundMaterial === 0) {
            //Do nothing, invalid return value given
        } else if (!foundMaterial) {
            //Error occured ignore futher..
        } else {
            console.log(basicInfoForm(`foundMaterial: ${foundMaterial}`));
        }

        await isUniqueLevelUp(interaction, user);

        const newtotalK = user.totalkills + 1;
        const newCurK = user.killsthislife + 1;

        await UserData.update({ totalkills: newtotalK }, { where: { userid: userID } });
        await UserData.update({ killsthislife: newCurK }, { where: { userid: userID } });

        if (enemy.hasitem) {
            const item = await makeItem(enemy);

            let listedDefaults;
            if (item.slot === 'Mainhand') {
                //Item is weapon
                listedDefaults =
                    `Value: **${item.value}c**\nRarity: **${item.rarity}**\nAttack: **${item.attack}**\nType: **${item.type}**\nSlot: **${item.slot}**\nHands: **${item.hands}**\nAmount Owned: **${item.amount}**`;
            } else if (item.slot === 'Offhand') {
                listedDefaults =
                    `Value: **${item.value}c**\nRarity: **${item.rarity}**\nAttack: **${item.attack}**\nDefence: **${item.defence}**\nType: **${item.type}**\nSlot: **${item.slot}**\nHands: **${item.hands}**\nAmount Owned: **${item.amount}**`;
            } else {
                listedDefaults =
                    `Value: **${item.value}c**\nRarity: **${item.rarity}**\nDefence: **${item.defence}**\nType: **${item.type}**\nSlot: **${item.slot}**\nAmount Owned: **${item.amount}**`;
            }

            const dropEmbedColour = await grabColour(item.rar_id);

            const itemDropEmbed = new EmbedBuilder()
                .setTitle('~LOOT DROPPED~')
                .setColor(dropEmbedColour)
                .addFields({

                    name: (`${item.name}\n`),
                    value: listedDefaults
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

    //========================================
    //this method is for removing an enemy when they have been killed
    async function removeE(enemy) {
        const rowCount = await ActiveEnemy.destroy({ where: [{ specid: enemy.specid }, { constkey: enemy.constkey }] });
        if (!rowCount) console.log('That enemy did not exist.');

        console.log('Enemy removal success!!');
        return;
    }

    //========================================
    // This method calculates damage dealt by an enemy and returns that value
    function enemyDamage(enemy) {
        // First: grab enemy damage min and max
        // Second: rng between those inclusively 
        // Third: Return the value for further use 

        const dmgDealt = Math.floor(Math.random() * (enemy.maxdmg - enemy.mindmg + 1) + enemy.mindmg);
        return dmgDealt;
    }

    //========================================
    // This function handles using an equipped potion
    async function usePotOne(potion) {
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

                    const editRow = UserData.update({ health: newHealth }, { where: { userid: userID } });
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

        const hasActiveStatus = await ActiveStatus.findOne({ where: [{ potionid: potion.potion_id }, { spec_id: userID }] });
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

                    spec_id: userID,
                });

                const refindPot = await ActiveStatus.findOne({ where: [{ potionid: potion.potion_id }, { spec_id: userID }] });

                if (refindPot) {
                    console.log(successResult('Potion One entry created SUCCESSFULLY!'));

                    const thePotToReduce = await OwnedPotions.findOne({ where: [{ spec_id: userID }, { potion_id: potion.potion_id }] });

                    const minusOne = thePotToReduce.amount - 1;

                    if (minusOne <= 0) {
                        //Destroy potion entry
                        const destroyed = await OwnedPotions.destroy({ where: [{ spec_id: userID }, { potion_id: potion.potion_id }] });
                        if (destroyed > 0) {
                            console.log(successResult('POTION ENTRY DESTROYED!'));
                        } else console.log(warnedForm('POTION ENTRY NOT DESTROYED!'));
                    } else {
                        const removedPot = await OwnedPotions.update({ amount: minusOne }, { where: [{ spec_id: userID }, { potion_id: thePotToReduce.potion_id }] });

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
                    where: [{ potionid: potion.potion_id }, { spec_id: userID }]
                });

                if (updatedEntry > 0) {
                    console.log(successResult('Potion One entry update SUCCESSFULLY!'));
                    const thePotToReduce = await OwnedPotions.findOne({ where: [{ spec_id: userID }, { potion_id: potion.potion_id }] });

                    const minusOne = thePotToReduce.amount - 1;

                    if (minusOne <= 0) {
                        //Destroy potion entry
                        const destroyed = await OwnedPotions.destroy({ where: [{ spec_id: userID }, { potion_id: potion.potion_id }] });
                        if (destroyed > 0) {
                            console.log(successResult('POTION ENTRY DESTROYED!'));
                        } else console.log(warnedForm('POTION ENTRY NOT DESTROYED!'));
                    } else {
                        const removedPot = await OwnedPotions.update({ amount: minusOne }, { where: [{ spec_id: userID }, { potion_id: thePotToReduce.potion_id }] });

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
}

module.exports = { initialDisplay };
