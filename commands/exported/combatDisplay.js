const { EmbedBuilder } = require('discord.js');


const { display } = require('./combatDisplay.js');
const { isLvlUp } = require('./levelup.js');
const { grabRar } = require('./grabRar.js');
const { ActiveEnemy, LootStore, LootDrop, UserData } = require('../../dbObjects.js');

const lootList = require('../../events/Models/json_prefabs/lootList.json');

//========================================
//this method is for dealing damage to an enemy takes the enemy id, damageDealt, and users id 
async function hitOnce(dmgDealt, item, user, Enemy, interaction, specCode) {
    //call up the enemy on file that is currently being attacked
    //NEED TO MAKE A NEW ENEMY OF THE SAME TYPE WHEN THIS IS CALLED IN ORDER TO RECORD DAMAGE DONE
    //apply defense and weaknesses to damage given and then deal the final amount to the enemy
    //check if the attack kills, if not a kill display how much health the enemy has left
    //check if the enemy has a higher speed then player to decide who attacks first
    //var enemy = enemyList;
    console.log(Enemy);
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
                await hitE(eHealth, enemy, specCode);
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

        if (!dead) {
            console.log(`uData: ${uData} \nspecCode: ${specCode} \ninteraction: ${interaction} \nEnemy: ${Enemy}`);
            await display(uData, specCode, interaction, Enemy);
        }
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
async function enemyDead(enemy, interaction, user) {
    const xpGained = Math.floor(Math.random() * (enemy.xpmax - enemy.xpmin + 1) + enemy.xpmin);
    const cCalc = ((xpGained - 5) + 1);

    await isLvlUp(xpGained, cCalc, interaction, user);

    if (enemy.hasitem) {

        const reference = await makeItem(enemy);

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
        }, 15000));

        await hitP(currentHealth, user);
        return false;
    }
}

//========================================
//this method updates the enemies health after being attacked and returns
async function hitE(eHealth, enemy, specCode) {
    const dealDmg = ActiveEnemy.update({ health: eHealth }, { where: [{ specid: specCode }, { constkey: enemy.constkey }] });
    if (dealDmg) {
        console.log('Enemy Health has been updated');
        return;
    }
}

//========================================
//this method updates the enemies health after being attacked and returns
async function hitP(currentHealth, user) {
    const dealDmg = UserData.update({ health: currentHealth }, { where: { userid: user.userid } });
    if (dealDmg) {
        console.log('Player Health has been updated');
        return;
    }
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
//this method generates an item to be dropped upon an enemies death
async function makeItem(enemy, uData, interaction) {

    var rarG = 0;
    //==================================================================
    await console.log('==============================================');
    rarG = await grabRar(enemy.level); //this returns a number between 0 and 10 inclusive

    console.log('Rarity Grabbed 1: ', rarG);


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

        //await Promise(maker);
        console.log('ITEM UPDATED!', maker);

        var item = await LootDrop.findOne({ where: [{ spec_id: interaction.user.id }] });

        console.log('LOOT UPDATED: ', item);

        var iFound = await addItem(item, uData, interaction);

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

        //await Promise(maker);
        console.log('ITEM CREATED!', maker);

        var item = await LootDrop.findOne({ where: [{ spec_id: interaction.user.id }] });

        console.log('LOOT CREATED: ', item);

        var iFound = await addItem(item, uData, interaction);

        return iFound;
    }
}

//========================================
//this method adds the dropped item into the players inventory
async function addItem(item, uData, interaction) {
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
    uData.totitem += 1;

    await uData.save();

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

module.exports = { hitOnce };
