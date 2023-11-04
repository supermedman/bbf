const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');

const EventEmitter = require('events');
//const wait = require('node:timers/promises').setTimeout;

const { ActiveDungeonEnemy, ActiveDungeon, UserData, LootStore, ActiveDungeonBoss, Pigmy, Loadout, ActiveStatus, OwnedPotions } = require('../../dbObjects.js');
//const { dungeonCombat } = require('./dungeonCombat.js');
const { isLvlUp } = require('./levelup.js');
const { grabRar } = require('./grabRar.js');
const { createNewBlueprint } = require('./createBlueprint.js');

const { findHelmSlot, findChestSlot, findLegSlot, findMainHand, findOffHand, findPotionOne } = require('./findLoadout.js');
const { displayEWpic, displayEWOpic, displayBossPic } = require('./displayEnemy.js');
const { hiding } = require('./handleHide.js');
const { userDamageLoadout } = require('./dealDamage.js');

const dungeonList = require('../../events/Models/json_prefabs/dungeonList.json');
const enemyList = require('../../events/Models/json_prefabs/enemyList.json');
const bossList = require('../../events/Models/json_prefabs/bossList.json');
const lootList = require('../../events/Models/json_prefabs/lootList.json');
const activeCategoryEffects = require('../../events/Models/json_prefabs/activeCategoryEffects.json');


const combatEmitter = new EventEmitter();

const destroyerE = new EventEmitter();

destroyerE.on('endALL', () => {
    combatEmitter.removeAllListeners();
});


//var interaction;
//var userID;
var fullKilledList = [];
var killedEnemies = [];
//var theE = 0;
//var theB = 0;

/**
 *  THERE IS AN ISSUE WITH DUPING CAUSED BY A COUNT FOUND IN THE DATABASE
 *  LOOK INTO WHERE THE BOSSES AND ENEMIES ARE FOUND/ADDED
 *  VALUES ARE BEING MIXED AROUND AND IT APPEARS AS IF MORE THAN ONE THING IS DUPING DURING COMBAT!!!
 *  
 *  POSSIBLE FIX IS REMOVAL OF GLOBAL DECLARATION OF USERID AND INTERACTION
 *  
 * @param {any} currentFloor
 * @param {any} dungeonId
 * @param {any} interactionRef
 * @param {any} collectedUserID
 */
//This method loads one floor for combat 
async function loadDungeon(currentFloor, dungeonId, interactionRef, collectedUserID) {
    
    combatEmitter.on('LoadEnemy', async (floorEnemies, constKey, interaction, userID, theE, theB) => {
        console.log(`CURRENT ATTATCHED USER: ${interaction.user.id}`);
        console.log('Loading next enemy');
        console.log(`theE: ${theE}`);

        constKey = floorEnemies[theE];
        console.log(`constKey: ${constKey}`);

        const enemyLoadEmitter = new EventEmitter();

        enemyLoadEmitter.once('EnemyLoaded', async (enemyToFight, interaction, userID, theE) => {
            console.log(`enemyToFight: ${enemyToFight}`);

            const killEmitter = new EventEmitter();

            dungeonCombat(constKey, interaction, killEmitter, userID, theE);

            killEmitter.once('EKill', async (interaction, userID, theE) => {
                console.log('Enemy killed');
                killedEnemies.push(enemyToFight);
                await destroyEnemy(userID);
                theE++;
                if (theE < floorEnemies.length) {
                    combatEmitter.emit('LoadEnemy', floorEnemies, constKey, interaction, userID, theE);
                } else if (theE >= floorEnemies.length) {
                    theE = 0;
                    await tempFloorSave(killedEnemies);
                    killedEnemies = [];
                    combatEmitter.emit('Cleared', interaction, userID, theE);
                }
            });

            killEmitter.once('EKilled', async (interaction, userID, theE) => {
                console.log('Player killed');
                await clearProgress('Enemy', interaction, userID);
                combatEmitter.emit('Failed', interaction, userID, theE);
            });
        });

        await loadEnemy(constKey, enemyLoadEmitter, interaction, userID, theE, theB);
    });




    combatEmitter.on('LoadBoss', async (bossRef, interaction, userID, theB) => {
        console.log(`CURRENT ATTATCHED USER: ${interaction.user.id}`);
        console.log(`Loading Boss at stage: `);
        console.log(`theB: ${theB}`);

        var constKey = bossRef[theB].ConstKey;
        console.log(`constKey Boss: ${constKey}`);       

        const bossLoadEmitter = new EventEmitter();

        bossLoadEmitter.once('BossLoaded', async (madeBoss, interaction, userID, theB) => {
            console.log('BOSS LOADED');
            const bossKillEmitter = new EventEmitter();

            loadBossStage(madeBoss, bossRef[theB], interaction, bossKillEmitter, userID, theB);

            bossKillEmitter.once('BKill', async (interaction, userID, theB) => {
                console.log('Boss stage Complete!');
                await destroyBoss(userID);
                theB++;
                if (theB < bossRef.length) {
                    combatEmitter.emit('LoadBoss', bossRef, interaction, userID, theB);
                } else if (theB >= bossRef.length) {
                    //Boss is dead!!!
                    //VICTORY!!!!
                    theB = 0;
                    combatEmitter.emit('Victory', interaction, userID, theB);
                }
            });

            bossKillEmitter.once('BKilled', async (interaction, userID, theB) => {
                console.log('Player killed');
                await clearProgress('Boss', interaction, userID);
                combatEmitter.emit('Failed', interaction, userID, 0, theB);
            });
        });

        await loadBoss(constKey, bossLoadEmitter, interaction, userID, theB);
    });


    combatEmitter.on('LoadFloor', async (interaction, userID, theE) => {
        console.log(`CURRENT ATTATCHED USER: ${interaction.user.id}`);
        console.log('Loading Floor');
        floorStr = `Floor${cf}`;
        await loadFloor(floorStr, theDungeon, interaction, userID, theE);
    });

    combatEmitter.on('Cleared', async (interaction, userID, theE, theB) => {
        console.log(`CURRENT ATTATCHED USER: ${interaction.user.id}`);
        console.log('Floor Cleared!');

        const floorClearedEmbed = new EmbedBuilder()
            .setTitle('Floor Cleared!')
            .setColor('White')
            .addFields({
                name: 'Floor: ', value: ` ${cf}`, inline: true
            });

        await interaction.channel.send({ embeds: [floorClearedEmbed] }).then(async floorClearEmbed => setTimeout(() => {
            floorClearEmbed.delete();
        }, 10000)).catch(console.error);

        if (((cf + 1) % 5) === 0) {
            //Int of 5, save floor reached!
            console.log('SAVE POINT REACHED!');
            await saveFloor((cf + 1), interaction, userID);
            await giveFloorProgress(interaction, userID);

            var addingCF = cf + 1;
            var saveFloorValList = ` ${addingCF}`

            const checkpointEmbed = new EmbedBuilder()
                .setTitle('Progress saved!')
                .setColor('DarkVividPink')
                .addFields({
                    name: 'Floor: ', value: ` ${saveFloorValList}`, inline: true
                });

            await interaction.channel.send({ embeds: [checkpointEmbed] }).then(async checkpointEmbed => setTimeout(() => {
                checkpointEmbed.delete();
            }, 10000)).catch(console.error);
        }
        if ((cf + 1) !== bossFloor) {
            cf++;
            combatEmitter.emit('LoadFloor', interaction, userID, theE);
        }
        if (cf === bossFloor) {
            //Boss floor reached handle differently
            await loadBossFloor(theDungeon.Boss, interaction, userID, theB);
        } 
    });

    combatEmitter.on('Failed', async (interaction, userID, theE, theB) => {
        console.log(`CURRENT ATTATCHED USER: ${interaction.user.id}`);
        console.log('Player has died');
        await destroyBoss(userID);
        destroyerE.emit('endALL');

        theE = 0;
        theB = 0;

        const reviveButton = new ButtonBuilder()
            .setCustomId('primary')
            .setLabel('Revive')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('💀');

        const grief = new ActionRowBuilder().addComponents(reviveButton);

        const activeDung = await ActiveDungeon.findOne({ where: { dungeonspecid: userID } });

        var list = `Fighting fearlessly till the end, you nonetheless succumbed to the darkness..`;

        var lastCheckpoint = `Floor ${activeDung.lastsave}`;

        const playerDeadEmbed = new EmbedBuilder()
            .setTitle('You have fallen..')
            .setColor('DarkGold')
            .addFields(
                
                { name: `Obituary`, value: list, inline: true },
                { name: `Last checkpoint:`, value: lastCheckpoint, inline: true}
            );

        const embedMsg = await interaction.channel.send({ embeds: [playerDeadEmbed], components: [grief] });

        const filter = (i) => i.user.id === interaction.user.id;

        const collector = embedMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter,
            time: 40000,
        });

        collector.on('collect', async (collInteract) => {
            if (collInteract.customId === 'primary') {
                await collector.stop();                
            }
        });

        collector.on('end', () => {
            if (embedMsg) {
                embedMsg.delete();
            }
        });

    });

    combatEmitter.on('Victory', async (interaction, userID, theB) => {
        console.log(`CURRENT ATTATCHED USER: ${interaction.user.id}`);
        console.log('Boss has been killed!');
        theB = 0;
        destroyerE.emit('endALL');
        await dungeonISCOMPLETE(true, interaction, userID);
        await giveBossDrops(theDungeon.Boss, interaction, userID);
    });

    //Grab reference to dungeonList grabbing 
    const interaction = interactionRef;
    const userID = collectedUserID;


    var theE = 0;
    var theB = 0;
    //console.log(`CollectedUserID: ${collectedUserID}`);
    console.log(`userID: ${userID}`);
    //console.log(`InteractionRef: ${interactionRef}`);
    //console.log(`Interaction: ${interaction}`);  
    //ex. 
    // Floor1 is loaded
    // Floor1 = [79, 79, 61, 61]
    // Load enemy w. constKey 79 
    // Initiate combat script
    // Combat script returns 'Kill'||'Killed'
    // 'Kill' - Enemy is dead add data to kill array
    // 'Killed' - Player is dead, clear kill array, set currentFloor to last save
    // for (var i = 0; i < Floor1.length;) 
    // await loadEnemy(Floor1[i])
    // Returns 'Kill'||'Killed'
    // If (Kill)
    // .push(enemy)
    // i++;
    // If (Killed)
    // = []
    // currentFloor = lastsave
    // Return 'DEAD' to dungeon.js
    // embed('Continue?') 'Yes'||'No'
    await destroyBoss(userID);
    await destroyEnemy(userID);
    await setFullHealth(userID);


    var activeFloor;
    console.log('activeFloor First: ', activeFloor);
    if (currentFloor === 0) {
        //Start at floor 1
        activeFloor = 1;
    } else {
        activeFloor = currentFloor;
    }
    console.log('activeFloor Second: ', activeFloor);

    const theDungeon = await findDungeon(dungeonId);
    console.log(`theDungeon.Name: ${theDungeon.Name}`);

    const bossFloor = theDungeon.BossFloor;

    var cf = activeFloor;
    console.log(`cf: ${cf}`);

    if (cf !== bossFloor) {
        console.log(`LOADING NORMAL FLOOR`);
        var floorStr = `Floor${cf}`;
        await loadFloor(floorStr, theDungeon, interaction, userID, theE);
    } else if (cf === bossFloor) {
        console.log(`LOADING BOSS FLOOR`);
        await loadBossFloor(theDungeon.Boss, interaction, userID, theB);
    }
}

//This function loads the current floor as given, grabs full array object from dungeon and iterates for each enemy combat
async function loadFloor(floor, dungeon, interaction, userID, theE) {
    const floorEnemies = dungeon[`${floor}`];
    console.log(`floorEnemies: ${floorEnemies}`);
   
    var constKey = 0;
    console.log('Var passed', constKey);

    combatEmitter.emit('LoadEnemy', floorEnemies, constKey, interaction, userID, theE);
}

//This method loads the inital prefab enemy pertaining to the constKey provided, then attempts to add it as an active enemy
async function loadEnemy(constKey, enemyLoadEmitter, interaction, userID, theE) {
    let currentEnemy;
    console.log(`currentEnemy before search: ${currentEnemy}`);
    for (var i = 0; i < enemyList.length;) {
        if (enemyList[i].ConstKey === constKey) {
            //Enemy match found!
            //Adding to active list and preparing for combat
            currentEnemy = await addEnemy(enemyList[i], enemyLoadEmitter, interaction, userID, theE);
            console.log(`currentEnemy after search: ${currentEnemy}`);
            i = enemyList.length.length;
        } else { i++;/**NOT FOUND*/ }
        console.log(`currentEnemy during search: ${currentEnemy}`);
    }
}

async function addEnemy(enemyFab, enemyLoadEmitter, interaction, userID, theE) {
    const dupeEnemyData = await ActiveDungeonEnemy.findOne({ where: [{ specid: userID }, { constkey: enemyFab.ConstKey }] });
    if (dupeEnemyData) {
        await destroyEnemy(userID);
        try {
            console.log(`TRYING TO ADD NEW ENEMY! 1`);
            const createEnemy = await ActiveDungeonEnemy.create({
                name: enemyFab.Name,
                description: enemyFab.Description,
                level: enemyFab.Level,
                mindmg: enemyFab.MinDmg,
                maxdmg: enemyFab.MaxDmg,
                health: enemyFab.Health,
                defence: enemyFab.Defence,
                weakto: enemyFab.WeakTo,
                dead: false,
                xpmin: enemyFab.XpMin,
                xpmax: enemyFab.XpMax,
                constkey: enemyFab.ConstKey,
                specid: userID,
            });

            const enemy = await ActiveDungeonEnemy.findOne({ where: [{ specid: userID }, { constkey: createEnemy.constkey }] });

            return enemyLoadEmitter.emit('EnemyLoaded', enemy, interaction, userID, theE);

        } catch (err) {
            console.error('An error has occured!', err);
        }
    } else if (!dupeEnemyData){
        try {
            console.log(`TRYING TO ADD NEW ENEMY! 2`);
            const createEnemy = await ActiveDungeonEnemy.create({
                name: enemyFab.Name,
                description: enemyFab.Description,
                level: enemyFab.Level,
                mindmg: enemyFab.MinDmg,
                maxdmg: enemyFab.MaxDmg,
                health: enemyFab.Health,
                defence: enemyFab.Defence,
                weakto: enemyFab.WeakTo,
                dead: false,
                xpmin: enemyFab.XpMin,
                xpmax: enemyFab.XpMax,
                constkey: enemyFab.ConstKey,
                specid: userID,
            });

            const enemy = await ActiveDungeonEnemy.findOne({ where: [{ specid: userID }, { constkey: createEnemy.constkey }] });

            return enemyLoadEmitter.emit('EnemyLoaded', enemy, interaction, userID, theE);

        } catch (err) {
            console.error('An error has occured!', err);
        }
    }
}

//This method loads dungeon boss combat
async function loadBossFloor(boss, interaction, userID, theB) {
    const bossRef = bossList.filter(theBoss => theBoss.NameRef === boss);
    console.log(`CONTENTS OF bossRef: ${bossRef}`);

    combatEmitter.emit('LoadBoss', bossRef, interaction, userID, theB);
}

async function loadBoss(constKey, bossLoadEmitter, interaction, userID, theB) {
    let currentBoss;
    console.log(`currentBoss before search: ${currentBoss}`);
    for (var i = 0; i < bossList.length;) {
        if (bossList[i].ConstKey === constKey) {
            //Boss match found!
            //Adding to active list and preping for combat
            currentBoss = await addBoss(bossList[i], bossLoadEmitter, interaction, userID, theB);
            console.log(`currentBoss after search: ${currentBoss}`);
            i = bossList.length;
            //return bossLoadEmitter.emit('BossLoaded', currentBoss);            
        } else { i++;/**NOT FOUND*/ }
        console.log(`currentBoss during search: ${currentBoss}`);        
    }
}

//This method adds a new boss to the activeDungeonBoss db
async function addBoss(boss, bossLoadEmitter, interaction, userID, theB) {
    const dupeBossData = await ActiveDungeonBoss.findOne({ where: [{ specid: userID }, { constkey: boss.ConstKey }] });
    if (dupeBossData) {
        await destroyBoss(userID);
        
        try {
            console.log(`TRYING TO ADD NEW BOSS! 1`);
            const createEnemy = await ActiveDungeonBoss.create({
                name: boss.Name,
                level: boss.Level,
                mindmg: boss.MinDmg,
                maxdmg: boss.MaxDmg,
                health: boss.Health,
                defence: boss.Defence,
                weakto: boss.WeakTo,
                constkey: boss.ConstKey,
                specid: userID,
            });

            const enemy = await ActiveDungeonBoss.findOne({ where: [{ specid: userID }, { constkey: createEnemy.constkey }] });

            return bossLoadEmitter.emit('BossLoaded', enemy, interaction, userID, theB);
        } catch (err) {
            console.error('An error has occured!', err);
        }
         
    } else if (!dupeBossData) {
        try {
            console.log(`TRYING TO ADD NEW BOSS! 2`);
            const createEnemy = await ActiveDungeonBoss.create({
                name: boss.Name,
                level: boss.Level,
                mindmg: boss.MinDmg,
                maxdmg: boss.MaxDmg,
                health: boss.Health,
                defence: boss.Defence,
                weakto: boss.WeakTo,
                constkey: boss.ConstKey,
                specid: userID,
            });

            const enemy = await ActiveDungeonBoss.findOne({ where: [{ specid: userID }, { constkey: createEnemy.constkey }] });
            console.log(`BOSS AFTER BEING ADDED TO DATABASE WAITING TO RETURN TO COMBAT ${enemy}`);
            return bossLoadEmitter.emit('BossLoaded', enemy, interaction, userID, theB);
        } catch (err) {
            console.error('An error has occured!', err);
        }
    }
}

//This method retrieves dungeon reference for all further interactions
async function findDungeon(dungeonId) {
    const dungeonMatch = await dungeonList.filter(dung => dung.DungeonID === dungeonId);
    if (dungeonMatch.length === 0) {
        //Match not found, something went wrong!
    } else {
        return dungeonMatch[0];
    }
}

//This method saves floor progress at intervals of 5
function tempFloorSave(killedEnemies) {
    console.log('Floor saved temp!');
    fullKilledList = fullKilledList.concat(killedEnemies);
    return;
}

//This method saves floor progress at intervals of 5
async function saveFloor(floor, interaction, userID) {
    const user = await UserData.findOne({ where: { userid: userID } });
    const totalHealth = 100 + (user.strength * 10);

    const currentFloorEdit = ActiveDungeon.update({ currentfloor: floor }, { where: { dungeonspecid: userID } });
    const lastSaveEdit = ActiveDungeon.update({ lastsave: floor }, { where: { dungeonspecid: userID } });
    const currentHealthEdit = ActiveDungeon.update({ currenthealth: totalHealth }, { where: { dungeonspecid: userID } });

    if (currentFloorEdit > 0 && lastSaveEdit > 0 && currentHealthEdit > 0) {
        //Success on all saves!
        return;
    }
}

//This method resets player health to full upon calling the dungeon, this prevents incorrect health values persisting upon boss kill
async function setFullHealth(userID) {
    const user = await UserData.findOne({ where: { userid: userID } });
    const totalHealth = 100 + (user.strength * 10);
    const currentHealthEdit = ActiveDungeon.update({ currenthealth: totalHealth }, { where: { dungeonspecid: userID } });
    if (currentHealthEdit > 0) {
        //Health reset
        return;
    }
}

//This method handles loot reward generation and updating userdata values accordingly
async function giveFloorProgress(interaction, userID) {
    var totXP = 0;
    var totCoin = 0;
    var count = 0;
    var totItem = 0;
    var iGained = [];
    while (count < fullKilledList.length) {
        var enemyTempRef = fullKilledList[count];

        var lChance = Math.random();//rng which will decide whether loot is dropped
        var HI = false;

        const multChance = 0.850;

        if (lChance >= multChance) {
            //hasitem:true
            HI = true;
        } else {/**hasitem: false*/ }

        var tmpCopy = [];

        if (HI) {
            //has item add to list 
            totItem += 1;
            var iPool = [];
            tmpCopy = [];//Clear tmp array for each item 

            var randR = await grabRar(enemyTempRef.level);

            for (var n = 0; n < lootList.length; n++) {

                if (lootList[n].Rar_id === randR) {
                    await iPool.push(lootList[n]);
                    //console.log('CONTENTS OF lootList AT POSITION ' + n + ': ', lootList[n].Name, lootList[n].Value, lootList[n].Loot_id, lootList[n].Type, interaction.user.id);
                } else {
                    //item not match keep looking
                }
            }

            //  Available items added to array, rng grab one  
            var randItemPos;
            if (iPool.length <= 1) {
                randItemPos = 0;
            } else {
                randItemPos = Math.round(Math.random() * (iPool.length - 1));
            }

            await tmpCopy.push(iPool[randItemPos]);//ADD ITEM SELECTED TO TEMP ARRAY FOR COMPARING
            //Assume the item added is new until proven otherwise
            var itemNew = true;
            for (const item of iGained) {
                if (item.Loot_id === tmpCopy[0].Loot_id) {
                    itemNew = false;//Item is a dupe, change to false, bypassing new entry creation
                    console.log('DUPLICATE ITEM FOUND: ', iGained);
                    item.Amount += 1;
                    console.log('FILTERED RESULT', item.Name, '\n');
                    break;
                }
            }

            //Item is new: create new entry and attach amount value, push to array and continue
            if (itemNew) {
                console.log('BEFORE MAPPED NEW ITEM: ', tmpCopy[0].Name);

                //const filtered = await tmpCopy.filter(item => item.Loot_id === tmpCopy[0].Loot_id);
                //console.log('FILTERED RESULT', filtered.Name);

                const mappedItem = await tmpCopy.map(item => ({ ...item, Amount: 1 }),);
                //console.log('AFTER MAPPED NEW ITEM: ', mappedItem);

                //totPages += 1;

                await iGained.push(...mappedItem);
            }

            var theItem = iPool[randItemPos];

            const lootStore = await LootStore.findOne({
                where: { spec_id: userID, loot_id: theItem.Loot_id },
            });

            console.log('UserItem: ', lootStore);

            //check if an item was found in the previous .findOne()
            //this checks if there is an item stored in the UserItems and adds one to the amount as defined in the dbInit script
            //then return as a save call on the userItem data
            if (lootStore) {
                const inc = await lootStore.increment('amount');

                if (inc) console.log('AMOUNT WAS UPDATED!');

                await lootStore.save();
            } else {
                //increase item total
                //grab reference to user
                const uData = await UserData.findOne({ where: { userid: userID } });
                //increase item total
                uData.totitem += 1;

                await uData.save();

                if (theItem.Slot === 'Mainhand') {
                    //Item is a weapon store accordingly
                    const newItem = await LootStore.create({
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

                    const itemAdded = await LootStore.findOne({
                        where: { spec_id: userID, loot_id: newItem.loot_id },
                    });

                    console.log(itemAdded);
                } else if (theItem.Slot === 'Offhand') {
                    //Item is an offhand
                    const newItem = await LootStore.create({
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

                    const itemAdded = await LootStore.findOne({
                        where: { spec_id: userID, loot_id: newItem.loot_id },
                    });

                    console.log(itemAdded);
                } else {
                    //Item is armor
                    const newItem = await LootStore.create({
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
                        amount: 1
                    });

                    const itemAdded = await LootStore.findOne({
                        where: { spec_id: userID, loot_id: newItem.loot_id },
                    });

                    console.log(itemAdded);
                }
            }
        }
        var xpGained = Math.floor(Math.random() * (enemyTempRef.xpmax - enemyTempRef.xpmin + 1) + enemyTempRef.xpmin);
        //console.log(`Before calc:`, xpGained);
        //xpGained = xpGained * 1 + ((-1) * (1.5 * hrs) ** 0.4 + 3.7); // ** is the same as Math.pow()
        //console.log(`After calc:`, xpGained);
        totXP += xpGained;

        //calculate coins gained and add to overall total
        var cGained = ((xpGained - 5) + 1);
        totCoin += cGained;

        count++;//increase count and run through again 
    }

    totXP = Math.round(totXP);
    totCoin = Math.round(totCoin);

    const extraEXP = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, { activec: 'EXP' }] });
    if (extraEXP) {
        if (extraEXP.duration > 0) {
            totXP *= extraEXP.curreffect;
        }
    }

    var xpGainList = `Xp Gained: ${totXP}`;
    var coinGainList = `Coins Gained: ${totCoin}`;
    var totalItemsList = `Total items Gained: ${totItem}`;

    const floorRewardsEmbed = new EmbedBuilder()
        .setTitle('Rewards!')
        .setColor('Green')
        .addFields(
            { name: `Total `, value: `Gains:` },
            { name: `XP:`, value: ` ${xpGainList}`, inline: true },
            { name: `COINS:`, value: ` ${coinGainList}`, inline: true },
            { name: `ITEMS:`, value: ` ${totalItemsList}`, inline: true });

    await interaction.channel.send({ embeds: [floorRewardsEmbed] }).then(async floorDropEmbed => setTimeout(() => {
        floorDropEmbed.delete();
    }, 20000)).catch(console.error);

    await isLvlUp(totXP, totCoin, interaction);
}

//This method locates the stage 3 of a boss for reward distribution
async function giveBossDrops(bossName, interaction, userID) {
    let bossForRewards;
    for (var i = 0; i < bossList.length; i++) {
        if (bossList[i].NameRef === bossName) {
            //Boss match found!
            if (bossList[i].Stage === 3) {
                //Boss stage found!

                bossForRewards = bossList[i];
            }
        }
    }

    var xpGained = Math.floor(Math.random() * (bossForRewards.XpMax - bossForRewards.XpMin + 1) + bossForRewards.XpMin);
    const extraEXP = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, { activec: 'EXP' }] });
    if (extraEXP) {
        if (extraEXP.duration > 0) {
            xpGained *= extraEXP.curreffect;
        }
    }
    const cGained = Math.round((xpGained - 5) * 1.5);

    const blueprint = bossForRewards.Blueprint;
    const bpID = bossForRewards.BlueprintID;

    await createNewBlueprint(bpID, userID);

    const newAchievement = bossForRewards.AchievementGet;

    const bossDefeatedEmbed = new EmbedBuilder()
        .setTitle('BOSS DEFEATED!')
        .setColor('DarkAqua')
        .addFields(
            { name: 'XP Gained: ', value: ` ${xpGained}`, inline: true },
            { name: 'Coins Gained: ', value: ` ${cGained}`, inline: true })
        .addFields(
            { name: 'BLUEPRINT UNLOCKED: ', value: ` ${blueprint}` },
            { name: 'ACHIEVEMENT: ', value: ` ${newAchievement}` });

    await interaction.channel.send({ embeds: [bossDefeatedEmbed] }).then(async bossDefeatEmbed => setTimeout(() => {
        bossDefeatEmbed.delete();
    }, 120000)).catch(console.error);

    await isLvlUp(xpGained, cGained, interaction);
}

async function dungeonISCOMPLETE(status, interaction, userID) {
    const completeStatus = await ActiveDungeon.update({ completed: status }, { where: { dungeonspecid: userID } });
    if (completeStatus > 0) {
        return console.log('DUNGEON IS COMPLETE!');
    }
}

async function destroyEnemy(userID) {
    const dataChange = await ActiveDungeonEnemy.destroy({ where: { specid: userID } });
    if (dataChange > 0) {
        return console.log('ENEMY DESTROYED');
    }
}

async function destroyBoss(userID) {
    const dataChange = await ActiveDungeonBoss.destroy({ where: { specid: userID } });
    if (dataChange > 0) {
        return console.log('BOSS DESTROYED');
    }
}

//This method clears dungeon progress upon player death
async function clearProgress(battle, interaction, userID) {
    const activeDungeon = await ActiveDungeon.findOne({ where: { dungeonspecid: userID } });
    const lastSaveReset = await ActiveDungeon.update({ currentfloor: activeDungeon.lastsave }, { where: { dungeonspecid: userID } });
    if (lastSaveReset > 0) {
        fullKilledList = [];

        const user = await UserData.findOne({ where: { userid: userID } });
        const totalHealth = 100 + (user.strength * 10);

        const currentHealthEdit = ActiveDungeon.update({ currenthealth: totalHealth }, { where: { dungeonspecid: userID } });
        if (currentHealthEdit > 0) {
            if (battle === 'Enemy') {
                return await destroyEnemy(userID);
            } else if (battle === 'Boss') {
                return await destroyBoss(userID);
            }
        }
    }
}

//=========================================================================
//TEMP FIX FOR COMBAT FOR NOW!!!

async function dungeonCombat(enemyConstKey, interactionRef, killEmitter, userIDRef, theE) {
    var constKey = enemyConstKey;
    console.log(`constKey: ${constKey}`);
    var specCode = userIDRef;
    console.log(`specCode: ${specCode}`);
    var interaction = interactionRef;
    var userID = userIDRef;
    console.log(`userID: ${userID}`);
    console.log(`interaction: ${interaction}`);

    var isHidden = false;
    var potionOneDisabled = true;
    await display();
    
    async function display() {
        const user = await UserData.findOne({ where: { userid: interaction.user.id } });
        const hasLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
        if (!hasLoadout) {
            //No loadout keep potions disabled
        } else {
            const checkPotOne = await findPotionOne(hasLoadout.potionone, user.userid);

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

        const enemy = await ActiveDungeonEnemy.findOne({ where: [{ specid: specCode }, { constkey: constKey }] });
        if (!enemy) {
            //Bruh wtf
            console.error('An error has occured!');
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
            .setDisabled(true)
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
            time: 60000,
        });

        collector.on('collect', async (collInteract) => {
            if (collInteract.customId === 'hide') {
                if (isHidden === false) {
                    await collInteract.deferUpdate();
                    const actionToTake = await hiding(enemy, user, pigmy);
                    if (actionToTake === 'FAILED') {
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
                        await stealPunish(enemy, user);
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

                        hideButton.setDisabled(true);
                        attackButton.setLabel('BackStab!');
                        await collInteract.editReply({ components: [row] });
                        isHidden = true;
                    } 
                }
            }

            if (collInteract.customId === 'onehit') {
                const currentLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
                if (currentLoadout) {
                    const weapon = await findMainHand(currentLoadout.mainhand, userID);
                    var dmgDealt = await userDamageLoadout(user, weapon);
                    if (isHidden === true) {
                        //BACKSTAB
                        dmgDealt = dmgDealt * 1.5;
                        isHidden = false;
                    }
                    await collector.stop();
                    await hitOnce(dmgDealt, weapon, user, enemy, false);
                } else {
                    //Yeah thats funny, im not catching this case... why are you naked in the dungeon lol
                }
            }

            if (collInteract.customId === 'block') {
                await collInteract.deferUpdate();

                await collector.stop();
                await blockAttack(enemy, user);
            }

            if (collInteract.customId === 'potone') {
                //Potion One Used!
                await collInteract.deferUpdate();
                const currentLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
                const hasPotOne = await findPotionOne(currentLoadout.potionone, uData.userid);
                await usePotOne(hasPotOne, user);
                await collector.stop();
                await display();

            }
        });

        collector.on('end', () => {
            if (message) {
                message.delete();
            }
        });
    }

    async function hitOnce(dmgDealt, weapon, user, enemy, isBlocked) {
        var eHealth = enemy.health;
        console.log('Enemy Health = ', eHealth);
        const eDefence = enemy.defence;
        console.log('Enemy Defence = ', eDefence);

        var Itype;
        console.log('dmgDealt: ', dmgDealt);

        if (!weapon) {
            Itype = 'NONE';
        } else {
            Itype = weapon.Type.toLowerCase();
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

                killEmitter.emit('EKill', interaction, userID, theE);
                return; // enemy is dead
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
            var headSlotItem = await findHelmSlot(currentLoadout.headslot, userID);
            var chestSlotItem = await findChestSlot(currentLoadout.chestslot, userID);
            var legSlotItem = await findLegSlot(currentLoadout.legslot, userID);

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

                    return hitOnce(counterDamage, item, user, enemy, true);
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
    async function takeDamage(theEnemyDamage, user, enemy, isBlocked) {
        const dungeonUser = await ActiveDungeon.findOne({ where: { dungeonspecid: interaction.user.id } });   
        const extraStats = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, { activec: 'Tons' }] });
        var currentHealth = dungeonUser.currenthealth;
        if (extraStats) {
            if (extraStats.duration > 0) {
                currentHealth += (extraStats.curreffect * 10);
            }
        }
        var eDamage = theEnemyDamage;

        if (isBlocked === true) {
            if ((currentHealth - eDamage) <= 0) {
                //Player has died =========================================================== HANDLE THIS DIFFERENTLY!!!!!!
                console.log('PLAYER IS DEAD :O');
                await hitP(0);
                killEmitter.emit('EKilled', interaction, userID, theE);
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
                return await display();
            }
        } else if (isBlocked === false) {
            console.log(`EnemyDamage before class mod: ${eDamage}`);
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
            console.log(`EnemyDamage after class mod: ${eDamage}`);

            var defence = 0;
            const currentLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
            if (currentLoadout) {
                var headSlotItem = await findHelmSlot(currentLoadout.headslot, userID);
                var chestSlotItem = await findChestSlot(currentLoadout.chestslot, userID);
                var legSlotItem = await findLegSlot(currentLoadout.legslot, userID);

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
                console.log(`EnemyDamage after defence: ${eDamage}`);
            }

            if (eDamage < 0) {
                eDamage = 0;
            }


            if ((currentHealth - eDamage) <= 0) {
                //Player has died =========================================================== HANDLE THIS DIFFERENTLY!!!!!!
                console.log('PLAYER IS DEAD :O');
                await hitP(0);
                killEmitter.emit('EKilled', interaction, userID, theE);
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
    //this method updates the enemies health after being attacked and returns
    async function hitP(currentHealth) {
        const dealDmg = ActiveDungeon.update({ currenthealth: currentHealth }, { where: { dungeonspecid: interaction.user.id } });
        if (dealDmg) {
            console.log('Player Health has been updated');
            return;
        }
    }

    //========================================
    //this method updates the enemies health after being attacked and returns
    async function hitE(eHealth) {
        const dealDmg = ActiveDungeonEnemy.update({ health: eHealth }, { where: [{ specid: specCode }, { constkey: constKey }] });
        if (dealDmg) {
            console.log('Enemy Health has been updated');
            return;
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
                const dungUser = await ActiveDungeon.findOne({ where: { dungeonspecid: interaction.user.id } });
                if (dungUser.currenthealth === totalHealth) {
                    return await interaction.followUp('You are already at maximum health!!');
                } else {
                    if ((dungUser.currenthealth + healAmount) > totalHealth) {
                        newHealth = totalHealth;
                        console.log(specialInfoForm('newHealth if max health reached: ', newHealth));
                    } else {
                        newHealth = dungUser.currenthealth + healAmount;
                        console.log(specialInfoForm('newHealth if no constraint reached: ', newHealth));
                    }
                    console.log(specialInfoForm('newHealth after checks: ', newHealth));

                    const editRow = ActiveDungeon.update({ currenthealth: newHealth }, { where: { dungeonspecid: interaction.user.id } });
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
}

//=========================================================
//This method handles BOSS COMBAT
async function loadBossStage(enemy, bossRef, interaction, bossKillEmitter, userID, theB) {
    console.log(`ATTEMPTING TO LOAD BOSS HERE!`);
    constKey = enemy.constkey;
    specCode = enemy.specid;
    var isHidden = false;
    var potionOneDisabled = true;

    const nextButton = new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Continue..')
        .setStyle(ButtonStyle.Secondary);

    const interactiveButtons = new ActionRowBuilder().addComponents(nextButton);

    const closeUpFile = new AttachmentBuilder(bossRef.PngRef_Closeup);
    const closeUp = bossRef.Image_Closeup;

    const embedPages = [];

    const introEmbed = new EmbedBuilder()
        .setTitle(bossRef.Name)
        .setThumbnail(closeUp)
        .setColor(bossRef.IntroC)
        .setFields({
            name: '\u200b', value: ` ${bossRef.Intro}`,
        });
    await embedPages.push(introEmbed);

    const lineOneEmbed = new EmbedBuilder()
        .setTitle(bossRef.Name)
        .setThumbnail(closeUp)
        .setColor(bossRef.Line_OneC)
        .setFields({
            name: '\u200b', value: ` ${bossRef.Line_One}`,
        });
    await embedPages.push(lineOneEmbed);

    const lineTwoEmbed = new EmbedBuilder()
        .setTitle(bossRef.Name)
        .setThumbnail(closeUp)
        .setColor(bossRef.Line_TwoC)
        .setFields({
            name: '\u200b', value: ` ${bossRef.Line_Two}`,
        });
    await embedPages.push(lineTwoEmbed);

    console.log(`embedPages: ${embedPages}`);

    const dialogEmbed = await interaction.channel.send({ components: [interactiveButtons], embeds: [embedPages[0]], files: [closeUpFile] });

    const filter = (i) => i.user.id === interaction.user.id;

    const collector = dialogEmbed.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter,
        time: 120000,
    });

    var currentPage = 0;

    collector.on('collect', async (collInteract) => {
        if (collInteract.customId === 'next') {
            collInteract.deferUpdate();
            console.log(currentPage);
            if ((currentPage + 1) === 3) {
                //Boss fight starts!
                await collector.stop();
                
                display();
            } else {
                //Show next embed!
                currentPage += 1;
                await dialogEmbed.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons], files: [closeUpFile] });
            }
        }
    });

    collector.on('end', () => {
        if (dialogEmbed) {
            dialogEmbed.delete();
        }
    });        

    async function display() {
        const user = await UserData.findOne({ where: { userid: interaction.user.id } });

        const hasLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
        if (!hasLoadout) {
            //No loadout keep potions disabled
        } else {
            const checkPotOne = await findPotionOne(hasLoadout.potionone, user.userid);

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

        const enemy = await ActiveDungeonBoss.findOne({ where: [{ specid: specCode }, { constkey: constKey }] });
        if (!enemy) {
            //Bruh wtf
            console.error('An error has occured!');
        }

        //const hasPng = await pngCheck(enemy);

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
            .setDisabled(true)
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

        const attachment = await displayBossPic(bossRef, enemy, true);

        const message = await interaction.channel.send({ components: [row], files: [attachment] });

        const filter = (i) => i.user.id === interaction.user.id;

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter,
            time: 60000,
        });

        collector.on('collect', async (collInteract) => {
            if (collInteract.customId === 'hide') {
                await collInteract.deferUpdate();
                if (isHidden === false) {
                    const actionToTake = await hiding(enemy, user);
                    if (actionToTake === 'FAILED') {
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
                        await stealPunish(enemy, user);
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

                        hideButton.setDisabled(true);
                        attackButton.setLabel('BackStab!');
                        await collInteract.editReply({ components: [row] });
                        isHidden = true;
                    }
                }
            }

            if (collInteract.customId === 'onehit') {
                const currentLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
                if (currentLoadout) {
                    const weapon = await findMainHand(currentLoadout.mainhand, userID);
                    var dmgDealt = await userDamageLoadout(user, weapon);
                    if (isHidden === true) {
                        //BACKSTAB
                        dmgDealt = dmgDealt * 1.5;
                        isHidden = false;
                    }
                    await collector.stop();
                    await hitOnce(dmgDealt, weapon, user, enemy, false);
                } else {
                    //Yeah thats funny, im not catching this case... why are you naked in the dungeon lol
                }
            }

            if (collInteract.customId === 'block') {
                await collInteract.deferUpdate();

                await collector.stop();
                await blockAttack(enemy, user);
            }

            if (collInteract.customId === 'potone') {
                //Potion One Used!
                await collInteract.deferUpdate();
                const currentLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
                const hasPotOne = await findPotionOne(currentLoadout.potionone, user.userid);
                await usePotOne(hasPotOne, user);
                await collector.stop();
                await display();

            }
        });

        collector.on('end', () => {
            if (message) {
                message.delete();
            }
        });
    }

    async function hitOnce(dmgDealt, weapon, user, enemy, isBlocked) {
        var eHealth = enemy.health;
        console.log('Enemy Health = ', eHealth);
        const eDefence = enemy.defence;
        console.log('Enemy Defence = ', eDefence);

        var Itype;
        console.log('dmgDealt: ', dmgDealt);

        if (!weapon) {
            Itype = 'NONE';
        } else {
            Itype = weapon.Type.toLowerCase();
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
            if ((eHealth - dmgDealt) <= bossRef.StageHealth) {
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

                bossKillEmitter.emit('BKill', interaction, userID, theB);
                return; // enemy is dead
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
            var headSlotItem = await findHelmSlot(currentLoadout.headslot, userID);
            var chestSlotItem = await findChestSlot(currentLoadout.chestslot, userID);
            var legSlotItem = await findLegSlot(currentLoadout.legslot, userID);

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

                    return hitOnce(counterDamage, item, user, enemy, true);
                }
            } else {
                return takeDamage(eDamage, user, enemy, true);
            }
        } else if (!currentLoadout) {
            return takeDamage(eDamage, user, enemy, true);
        }

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

    //========================================
    // This method calculates damage dealt to user 
    async function takeDamage(theEnemyDamage, user, enemy, isBlocked) {
        const dungeonUser = await ActiveDungeon.findOne({ where: { dungeonspecid: interaction.user.id } });      
        const extraStats = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, { activec: 'Tons' }] });
        var currentHealth = dungeonUser.currenthealth;
        if (extraStats) {
            if (extraStats.duration > 0) {
                currentHealth += (extraStats.curreffect * 10);
            }
        }
        var eDamage = theEnemyDamage;

        if (isBlocked === true) {
            if ((currentHealth - eDamage) <= 0) {
                //Player has died =========================================================== HANDLE THIS DIFFERENTLY!!!!!!
                console.log('PLAYER IS DEAD :O');
                await hitP(0);
                bossKillEmitter.emit('BKilled', interaction, userID, theB);
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
                return await display();
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
                var headSlotItem = await findHelmSlot(currentLoadout.headslot, userID);
                var chestSlotItem = await findChestSlot(currentLoadout.chestslot, userID);
                var legSlotItem = await findLegSlot(currentLoadout.legslot, userID);

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
                //Player has died =========================================================== HANDLE THIS DIFFERENTLY!!!!!!
                console.log('PLAYER IS DEAD :O');
                await hitP(0);
                bossKillEmitter.emit('BKilled', interaction, userID, theB);
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
    //this method updates the enemies health after being attacked and returns
    async function hitP(currentHealth) {
        const dealDmg = ActiveDungeon.update({ currenthealth: currentHealth }, { where: { dungeonspecid: interaction.user.id } });
        if (dealDmg) {
            console.log('Player Health has been updated');
            return;
        }
    }

    //========================================
    //this method updates the enemies health after being attacked and returns
    async function hitE(eHealth) {
        const dealDmg = ActiveDungeonBoss.update({ health: eHealth }, { where: [{ specid: specCode }, { constkey: constKey }] });
        if (dealDmg) {
            console.log('Enemy Health has been updated');
            return;
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
                const dungUser = await ActiveDungeon.findOne({ where: { dungeonspecid: interaction.user.id } });
                if (dungUser.currenthealth === totalHealth) {
                    return await interaction.followUp('You are already at maximum health!!');
                } else {
                    if ((dungUser.currenthealth + healAmount) > totalHealth) {
                        newHealth = totalHealth;
                        console.log(specialInfoForm('newHealth if max health reached: ', newHealth));
                    } else {
                        newHealth = dungUser.currenthealth + healAmount;
                        console.log(specialInfoForm('newHealth if no constraint reached: ', newHealth));
                    }
                    console.log(specialInfoForm('newHealth after checks: ', newHealth));

                    const editRow = ActiveDungeon.update({ currenthealth: newHealth }, { where: { dungeonspecid: interaction.user.id } });
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
}

module.exports = { loadDungeon };
