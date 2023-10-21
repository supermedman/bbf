const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');

const EventEmitter = require('events');
const wait = require('node:timers/promises').setTimeout;

const { ActiveDungeonEnemy, ActiveDungeon, UserData, LootStore, ActiveDungeonBoss, Pigmy, Loadout } = require('../../dbObjects.js');
//const { dungeonCombat } = require('./dungeonCombat.js');
const { isLvlUp } = require('./levelup.js');
const { grabRar } = require('./grabRar.js');

const { findHelmSlot, findChestSlot, findLegSlot, findMainHand, findOffHand } = require('./findLoadout.js');
const { displayEWpic, displayEWOpic, displayBossPic } = require('./displayEnemy.js');
const { hiding } = require('./handleHide.js');
const { userDamageLoadout } = require('./dealDamage.js');

const dungeonList = require('../../events/Models/json_prefabs/dungeonList.json');
const enemyList = require('../../events/Models/json_prefabs/enemyList.json');
const bossList = require('../../events/Models/json_prefabs/bossList.json');
const lootList = require('../../events/Models/json_prefabs/lootList.json');


const combatEmitter = new EventEmitter();

const destroyerE = new EventEmitter();

destroyerE.on('endALL', () => {
    combatEmitter.removeAllListeners();
});


var interaction;
var userID;
var fullKilledList = [];
var killedEnemies = [];
var theE = 0;
var theB = 0;

//This method loads one floor for combat 
async function loadDungeon(currentFloor, dungeonId, interactionRef, collectedUserID) {
    
    combatEmitter.on('LoadEnemy', async (floorEnemies, constKey) => {
        console.log('Loading next enemy');
        console.log(`theE: ${theE}`);

        constKey = floorEnemies[theE];
        console.log(`constKey: ${constKey}`);

        const enemyLoadEmitter = new EventEmitter();

        enemyLoadEmitter.once('EnemyLoaded', async (enemyToFight) => {
            console.log(`enemyToFight: ${enemyToFight}`);

            const killEmitter = new EventEmitter();

            dungeonCombat(constKey, interaction, killEmitter);

            killEmitter.once('EKill', async () => {
                console.log('Enemy killed');
                killedEnemies.push(enemyToFight);
                await destroyEnemy();
                theE++;
                if (theE < floorEnemies.length) {
                    combatEmitter.emit('LoadEnemy', floorEnemies, constKey);
                } else if (theE >= floorEnemies.length) {
                    theE = 0;
                    await tempFloorSave(killedEnemies);
                    killedEnemies = [];
                    combatEmitter.emit('Cleared');
                }
            });

            killEmitter.once('EKilled', async () => {
                console.log('Player killed');
                await clearProgress('Enemy');
                combatEmitter.emit('Failed');
            });
        });

        await loadEnemy(constKey, enemyLoadEmitter);
    });




    combatEmitter.on('LoadBoss', async (bossRef) => {
        console.log(`Loading Boss at stage: `);
        console.log(`theB: ${theB}`);

        var constKey = bossRef[theB].ConstKey;
        console.log(`constKey Boss: ${constKey}`);       

        const bossLoadEmitter = new EventEmitter();

        bossLoadEmitter.once('BossLoaded', async (madeBoss) => {
            console.log('BOSS LOADED');
            const bossKillEmitter = new EventEmitter();

            loadBossStage(madeBoss, bossRef[theB], interaction, bossKillEmitter);

            bossKillEmitter.once('BKill', async () => {
                console.log('Boss stage Complete!');
                await destroyBoss();
                theB++;
                if (theB < bossRef.length) {
                    combatEmitter.emit('LoadBoss', bossRef, constKey);
                } else if (theB >= bossRef.length) {
                    //Boss is dead!!!
                    //VICTORY!!!!
                    theB = 0;
                    combatEmitter.emit('Victory');
                }
            });

            bossKillEmitter.once('BKilled', async () => {
                console.log('Player killed');
                await clearProgress('Boss');
                combatEmitter.emit('Failed');
            });
        });

        await loadBoss(constKey, bossLoadEmitter);
    });


    combatEmitter.on('LoadFloor', async () => {
        console.log('Loading Floor');
        floorStr = `Floor${cf}`;
        await loadFloor(floorStr, theDungeon);
    });

    combatEmitter.on('Cleared', async () => {
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
            await saveFloor((cf + 1));
            await giveFloorProgress();

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
            combatEmitter.emit('LoadFloor');
        }
        if (cf === bossFloor) {
            //Boss floor reached handle differently
            await loadBossFloor(theDungeon.Boss);            
        } 
    });

    combatEmitter.on('Failed', async () => {
        console.log('Player has died');
        await destroyBoss();
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

    combatEmitter.on('Victory', async () => {
        console.log('Boss has been killed!');
        theB = 0;
        destroyerE.emit('endALL');
        await dungeonISCOMPLETE(true);
        await giveBossDrops(theDungeon.Boss);
    });

    //Grab reference to dungeonList grabbing 
    interaction = interactionRef;
    userID = collectedUserID;
    theE = 0;
    theB = 0;
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
    await destroyBoss();
    await destroyEnemy();



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
        await loadFloor(floorStr, theDungeon);
    } else if (cf === bossFloor) {
        console.log(`LOADING BOSS FLOOR`);
        await loadBossFloor(theDungeon.Boss);
    }
}

//This function loads the current floor as given, grabs full array object from dungeon and iterates for each enemy combat
async function loadFloor(floor, dungeon) {
    const floorEnemies = dungeon[`${floor}`];
    console.log(`floorEnemies: ${floorEnemies}`);
   
    var constKey = 0;
    console.log('Var passed', constKey);

    combatEmitter.emit('LoadEnemy', floorEnemies, constKey);    
}

//This method loads the inital prefab enemy pertaining to the constKey provided, then attempts to add it as an active enemy
async function loadEnemy(constKey, enemyLoadEmitter) {
    let currentEnemy;
    console.log(`currentEnemy before search: ${currentEnemy}`);
    for (var i = 0; i < enemyList.length;) {
        if (enemyList[i].ConstKey === constKey) {
            //Enemy match found!
            //Adding to active list and preparing for combat
            currentEnemy = await addEnemy(enemyList[i], enemyLoadEmitter);
            console.log(`currentEnemy after search: ${currentEnemy}`);
            i = enemyList.length.length;
        } else { i++;/**NOT FOUND*/ }
        console.log(`currentEnemy during search: ${currentEnemy}`);
    }
}

async function addEnemy(enemyFab, enemyLoadEmitter) {
    const dupeEnemyData = await ActiveDungeonEnemy.findOne({ where: [{ specid: userID }, { constkey: enemyFab.ConstKey }] });
    if (dupeEnemyData) {
        await destroyEnemy();
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

            return enemyLoadEmitter.emit('EnemyLoaded', enemy);

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

            return enemyLoadEmitter.emit('EnemyLoaded', enemy);

        } catch (err) {
            console.error('An error has occured!', err);
        }
    }
}

//This method loads dungeon boss combat
async function loadBossFloor(boss) {
    const bossRef = bossList.filter(theBoss => theBoss.NameRef === boss);
    console.log(`CONTENTS OF bossRef: ${bossRef}`);

    combatEmitter.emit('LoadBoss', bossRef);          
}

async function loadBoss(constKey, bossLoadEmitter) {
    let currentBoss;
    console.log(`currentBoss before search: ${currentBoss}`);
    for (var i = 0; i < bossList.length;) {
        if (bossList[i].ConstKey === constKey) {
            //Boss match found!
            //Adding to active list and preping for combat
            currentBoss = await addBoss(bossList[i], bossLoadEmitter);
            console.log(`currentBoss after search: ${currentBoss}`);
            i = bossList.length;
            //return bossLoadEmitter.emit('BossLoaded', currentBoss);            
        } else { i++;/**NOT FOUND*/ }
        console.log(`currentBoss during search: ${currentBoss}`);        
    }
}

//This method adds a new boss to the activeDungeonBoss db
async function addBoss(boss, bossLoadEmitter) {
    const dupeBossData = await ActiveDungeonBoss.findOne({ where: [{ specid: userID }, { constkey: boss.ConstKey }] });
    if (dupeBossData) {
        await destroyBoss();
        
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

            return bossLoadEmitter.emit('BossLoaded', enemy);
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
            return bossLoadEmitter.emit('BossLoaded', enemy);
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
async function saveFloor(floor) {
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

//This method handles loot reward generation and updating userdata values accordingly
async function giveFloorProgress() {
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
async function giveBossDrops(bossName) {
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

    const xpGained = Math.floor(Math.random() * (bossForRewards.XpMax - bossForRewards.XpMin + 1) + bossForRewards.XpMin);
    const cGained = Math.round((xpGained - 5) * 1.5);

    const blueprint = bossForRewards.Blueprint;

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

async function dungeonISCOMPLETE(status) {
    const completeStatus = await ActiveDungeon.update({ completed: status }, { where: { dungeonspecid: userID } });
    if (completeStatus > 0) {
        return console.log('DUNGEON IS COMPLETE!');
    }
}

async function destroyEnemy() {
    const dataChange = await ActiveDungeonEnemy.destroy({ where: { specid: userID } });
    if (dataChange > 0) {
        return console.log('ENEMY DESTROYED');
    }
}

async function destroyBoss() {
    const dataChange = await ActiveDungeonBoss.destroy({ where: { specid: userID } });
    if (dataChange > 0) {
        return console.log('BOSS DESTROYED');
    }
}



//This method clears dungeon progress upon player death
async function clearProgress(battle) {
    const activeDungeon = await ActiveDungeon.findOne({ where: { dungeonspecid: userID } });
    const lastSaveReset = await ActiveDungeon.update({ currentfloor: activeDungeon.lastsave }, { where: { dungeonspecid: userID } });
    if (lastSaveReset > 0) {
        fullKilledList = [];

        const user = await UserData.findOne({ where: { userid: userID } });
        const totalHealth = 100 + (user.strength * 10);

        const currentHealthEdit = ActiveDungeon.update({ currenthealth: totalHealth }, { where: { dungeonspecid: userID } });
        if (currentHealthEdit > 0) {
            if (battle === 'Enemy') {
                return await destroyEnemy();
            } else if (battle === 'Boss') {
                return await destroyBoss();
            }
        }
    }
}

//=========================================================================
//TEMP FIX FOR COMBAT FOR NOW!!!

async function dungeonCombat(enemyConstKey, interaction, killEmitter) {
    var constKey = enemyConstKey;
    console.log(`constKey: ${constKey}`);
    var specCode = userID;
    console.log(`specCode: ${specCode}`);
    console.log(`userID: ${userID}`);
    console.log(`interaction: ${interaction}`);

    var isHidden = false; 
    await display();
    
    async function display() {
        const user = await UserData.findOne({ where: { userid: interaction.user.id } });
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

        const row = new ActionRowBuilder().addComponents(hideButton, attackButton, stealButton);

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
                    const weapon = await findMainHand(currentLoadout.mainhand);
                    var dmgDealt = await userDamageLoadout(user, weapon);
                    if (isHidden === true) {
                        //BACKSTAB
                        dmgDealt = dmgDealt * 1.5;
                        isHidden = false;
                    }
                    await collector.stop();
                    await hitOnce(dmgDealt, weapon, user, enemy);
                } else {
                    //Yeah thats funny, im not catching this case... why are you naked in the dungeon lol
                }
            }
        });

        collector.on('end', () => {
            if (message) {
                message.delete();
            }
        });
    }

    async function hitOnce(dmgDealt, weapon, user, enemy) {
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
                killEmitter.emit('EKill');
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

        const eDamage = await enemyDamage(enemy);
        console.log(`Enemy damge: ${eDamage}`);
        const dead = await takeDamage(eDamage, user, enemy);

        if (!dead) {
            await display();
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
        const dead = await takeDamage(eDamage, user, enemy);
        //Reload player info after being attacked
        if (!dead) {
            return await display();
        }
    }

    //========================================
    // This method calculates damage dealt to user 
    async function takeDamage(theEnemyDamage, user, enemy) {
        const dungeonUser = await ActiveDungeon.findOne({ where: { dungeonspecid: interaction.user.id } });
        var currentHealth = dungeonUser.currenthealth;
        var eDamage = theEnemyDamage;

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
            killEmitter.emit('EKilled');
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

async function loadBossStage(enemy, bossRef, interaction, bossKillEmitter) {
    console.log(`ATTEMPTING TO LOAD BOSS HERE!`);
    constKey = enemy.constkey;
    specCode = enemy.specid;
    var isHidden = false;

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

        const row = new ActionRowBuilder().addComponents(hideButton, attackButton, stealButton);

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
                    const weapon = await findMainHand(currentLoadout.mainhand);
                    var dmgDealt = await userDamageLoadout(user, weapon);
                    if (isHidden === true) {
                        //BACKSTAB
                        dmgDealt = dmgDealt * 1.5;
                        isHidden = false;
                    }
                    await collector.stop();
                    await hitOnce(dmgDealt, weapon, user, enemy);
                } else {
                    //Yeah thats funny, im not catching this case... why are you naked in the dungeon lol
                }
            }
        });

        collector.on('end', () => {
            if (message) {
                message.delete();
            }
        });
    }

    async function hitOnce(dmgDealt, weapon, user, enemy) {
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
                bossKillEmitter.emit('BKill');
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

        const eDamage = await enemyDamage(enemy);
        console.log(`Enemy damge: ${eDamage}`);
        const dead = await takeDamage(eDamage, user, enemy);

        if (!dead) {
            await display();
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
        const dead = await takeDamage(eDamage, user, enemy);
        //Reload player info after being attacked
        if (!dead) {
            return await display();
        }
    }

    //========================================
    // This method calculates damage dealt to user 
    async function takeDamage(theEnemyDamage, user, enemy) {
        const dungeonUser = await ActiveDungeon.findOne({ where: { dungeonspecid: interaction.user.id } });
        var currentHealth = dungeonUser.currenthealth;
        var eDamage = theEnemyDamage;

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
            bossKillEmitter.emit('BKilled');
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
}

module.exports = { loadDungeon };
