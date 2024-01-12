const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');
const EventEmitter = require('events');
const { Op } = require('sequelize');

const { UserData, ActiveDungeonEnemy, ActiveDungeon, ActiveDungeonBoss, Pigmy, Loadout, ActiveStatus, OwnedPotions, UniqueCrafted } = require('../../dbObjects.js');

const { createEnemyDisplay, displayBossPic } = require('./displayEnemy.js');
const { grabRar } = require('./grabRar.js');
const { isLvlUp } = require('./levelup.js');
const { createNewBlueprint } = require('./createBlueprint.js');
const { checkOwned } = require('./createGear.js');

const dungeonList = require('../../events/Models/json_prefabs/dungeonList.json');
const bossList = require('../../events/Models/json_prefabs/bossList.json');
const enemyList = require('../../events/Models/json_prefabs/enemyList.json');
const lootList = require('../../events/Models/json_prefabs/lootList.json');
const uniqueLootList = require('../../events/Models/json_prefabs/uniqueLootList.json');
const aCATE = require('../../events/Models/json_prefabs/activeCategoryEffects.json');

const { Player } = require('./MadeClasses/Player.js');
const { Enemy } = require('./MadeClasses/Enemy.js');


/** This method retrives Defence values from all given gear ids
 * 
 * @param {string} userID user id snowflake
 * @param {any[]} gear list of all gear containing defence values
 */
const grabDefenceGear = async (userID, gear) => {
    let totalDs = [];
    for (const id of gear) {
        let pushVal = 0;
        let itemRef;
        if (id === 0) {

        } else if (id >= 30000) {
            itemRef = await UniqueCrafted.findOne({ where: [{ spec_id: userID }, { loot_id: id }] });
            pushVal = itemRef.Defence;
        } else if (id < 1000 || id >= 20000) {
            itemRef = lootList.filter(item => item.Loot_id === id);
            pushVal = itemRef[0].Defence;
        } else if (id > 1000) {
            itemRef = uniqueLootList.filter(item => item.Loot_id === id);
            pushVal = itemRef[0].Defence;
        }
        totalDs.push(pushVal);
    }
    return totalDs;
};

/** This method retrives Damage values from all given gear ids
 * 
 * @param {string} userID user id snowflake
 * @param {any[]} gear list of all gear containing attack values
 */
const grabDamageGear = async (userID, gear) => {
    let totalAs = [];
    for (const id of gear) {
        let pushVal = 0;
        let itemRef;
        if (id === 0) {

        } else if (id >= 30000) {
            itemRef = await UniqueCrafted.findOne({ where: [{ spec_id: userID }, { loot_id: id }] });
            pushVal = itemRef.Attack;
        } else if (id < 1000 || id >= 20000) {
            itemRef = lootList.filter(item => item.Loot_id === id);
            pushVal = itemRef[0].Attack;
        } else if (id > 1000) {
            itemRef = uniqueLootList.filter(item => item.Loot_id === id);
            pushVal = itemRef[0].Attack;
        }
        totalAs.push(pushVal);
    }
    return totalAs;
};

/** This method retrives Damage values from all given gear ids
 * 
 * @param {string} userID user id snowflake
 * @param {any[]} gear list of all gear containing type values
 */
const grabGearTypes = async (userID, gear) => {
    let totalTypes = [];
    for (const id of gear) {
        let pushVal = 'NONE';
        let itemRef;
        if (id === 0) {

        } else if (id >= 30000) {
            itemRef = await UniqueCrafted.findOne({ where: [{ spec_id: userID }, { loot_id: id }] });
            pushVal = itemRef.Type;
        } else if (id < 1000 || id >= 20000) {
            itemRef = lootList.filter(item => item.Loot_id === id);
            pushVal = itemRef[0].Type;
        } else if (id > 1000) {
            itemRef = uniqueLootList.filter(item => item.Loot_id === id);
            pushVal = itemRef[0].Type;
        }
        totalTypes.push(pushVal);
    }
    return totalTypes;
};

const findPotion = async (potionOneID, userID) => {
    let potionOne;
    console.log(potionOneID);
    if (potionOneID === 0) {
        //Nothing equipped
        return 'NONE';
    } else {
        potionOne = await OwnedPotions.findOne({ where: [{ spec_id: userID }, { potion_id: potionOneID }] });
        if (!potionOne) {
            //console.log(warnedForm('PotionOne NOT FOUND AMOUNT LIKELY 0!'));
            return 'HASNONE';
        }
        if (potionOne.amount > 0) return potionOne;
    }
};

const enemyExtraGen = (eFab) => {
    const lvl = eFab.Level;
    let nxtLvl;
    if (lvl < 20) {
        nxtLvl = 50 * (Math.pow(lvl, 2) - 1);
    } else if (lvl === 20) {
        nxtLvl = 75 * (Math.pow(lvl, 2) - 1);
    } else if (lvl > 20) {
        const lvlScale = 1.5 * (Math.floor(lvl / 5));
        nxtLvl = (75 + lvlScale) * (Math.pow(lvl, 2) - 1);
    }

    let XpMax = Math.floor((nxtLvl / 15) + (0.2 * (100 - lvl)));
    let XpMin = XpMax - Math.floor(XpMax / 5.2);

    const avgDmgRef = eFab.AvgDmg;
    let DmgMax = Math.floor(avgDmgRef * 1.5 + (0.02 * Math.floor(lvl / 6)));
    let DmgMin = DmgMax - Math.floor(DmgMax / 4.8);

    const calcValueObj = {
        maxDmg: DmgMax,
        minDmg: DmgMin,
        maxXp: XpMax,
        minXp: XpMin,
    };

    return calcValueObj;
};

const randArrPos = (arr) => {
    let returnIndex = 0;
    if (arr.length > 1) returnIndex = Math.floor(Math.random() * arr.length);
    return arr[returnIndex];
};


async function loadDungeon(lastFloor, dungeonId, interaction, userID) {
    /**
     *      userSpecEEFilter:
     *          - Reference object 
     *          - Receives initial user/dungeon IDs
     *          - Is used to attach EEs upon creation for further function ref
     *      
     *      EX.
     *      { 
     *          userid: userID,
     *          dungeonid: dungeonId,
     *          
     *          nextFloorE: 'NONE' || nextFloorEmitter,
     *          NFE_UPK: `Cleared-Button-${501177494137995264}`,
     *          
     *          nextEnemyE: 'NONE' || nextEnemyEmitter,
     *          NEE_UPK: `New-Enemy-Button-${501177494137995264}`,
     *          
     *          eKilledE: 'NONE' || eKillEmitter,
     *          EKE_UPK: `Enemy-Kill-${501177494137995264}`,
     *          
     *          nextStageE: 'NONE' || nextStageEmitter,
     *          NSE_UPK: `Boss-Stage-${501177494137995264}`,
     *          
     *          bKilledE: 'NONE' || bKilledEmitter,
     *          BKE_UPK: `Boss-Kill-${501177494137995264}`,
     *          
     *          PKE_UPK: `Player-Kill-${501177494137995264}`,
     *      }
     *      
     * 
     * */
    const userSpecEEFilter = {
        userid: userID,
        dungeonid: dungeonId,
        nextFloorE: 'NONE',
        NFE_UPK: `Cleared-Button-${userID}`,
        nextEnemyE: 'NONE',
        NEE_UPK: `New-Enemy-Button-${userID}`,
        eKilledE: 'NONE',
        EKE_UPK: `Enemy-Kill-${userID}`,
        nextStageE: 'NONE',
        NSE_UPK: `Boss-Stage-${userID}`,
        bKilledE: 'NONE',
        BKE_UPK: `Boss-Kill-${userID}`,
        PKE_UPK: `Player-Kill-${userID}`,
    };
    const user = await UserData.findOne({ where: { userid: userID } });
    await setFullHealth();

    const thePlayer = await generatePlayerClass();
    const theDungeon = findDungeon(dungeonId);
    const bossFloor = theDungeon.BossFloor;

    let fullKilledList = [];
    let killedEnemies = [];

    await clearBoss();
    await clearEnemies();

    let activeFloor;
    if (lastFloor === 0) {
        //Start at floor 1
        activeFloor = 1;
    } else activeFloor = lastFloor;

    let cs = 0;
    let cf = activeFloor;
    if (cf === bossFloor) {
        try {
            startBossHandle();
        } catch (error) {
            console.error('Error @ handleDungeon/startBossHandle:', error);
        }
    } else if (cf < bossFloor) {
        try {
            startNormHandle();
        } catch (error) {
            console.error('Error @ handleDungeon/startNormHandle:', error);
        }
    } else return console.error('AN ERROR OCCURED LOADING IN THE DUNGEON');

    async function generatePlayerClass() {
        const curPlayer = new Player(user, interaction);

        const dungeonUser = await ActiveDungeon.findOne({ where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });

        curPlayer.setHealth(dungeonUser.currenthealth);
        curPlayer.checkDealtBuffs();
        curPlayer.checkTakenBuffs();
        curPlayer.checkStrongUsing();

        const pigmy = await Pigmy.findOne({ where: { spec_id: userID } });
        curPlayer.checkPigmyUps(pigmy);

        curPlayer.checkCritChance();
        curPlayer.checkDHChance();

        curPlayer.checkLootDrop(pigmy);
        curPlayer.checkLootUP(pigmy);

        curPlayer.checkBaseDamage();

        const loadoutChecking = await Loadout.findOne({ where: { spec_id: userID } });
        if (!loadoutChecking) { } else {
            curPlayer.loadLoadout(loadoutChecking);

            const allGear = curPlayer.loadout.slice(0, 5);
            const typeVals = await grabGearTypes(userID, allGear);
            curPlayer.setLoadoutTypes(typeVals);

            const defGear = curPlayer.loadout.slice(0, 4);
            const atkGear = curPlayer.loadout.slice(3, 5);

            const defVals = await grabDefenceGear(userID, defGear);
            const atkVals = await grabDamageGear(userID, atkGear);

            curPlayer.checkTotalDefence(defVals);
            curPlayer.checkTotalDamage(atkVals);
            curPlayer.checkAgainstLoadoutTypes();
        }

        const activeEffect = await ActiveStatus.findOne({ where: { spec_id: userID } });
        if (!activeEffect) { } else {
            const reinEffects = await ActiveStatus.findAll({ where: [{ spec_id: userID }, { activec: 'Reinforce' }, { duration: { [Op.gt]: 0 } }] });
            if (reinEffects > 0) player.updateDefence(reinEffects);
            const tonEffects = await ActiveStatus.findAll({ where: [{ spec_id: userID }, { activec: 'Tons' }, { duration: { [Op.gt]: 0 } }] });
            if (tonEffects > 0) player.updateUPs(tonEffects);
        }

        return curPlayer;
    }

    function findDungeon(dungeonId) {
        const dungeonMatch = dungeonList.filter(dung => dung.DungeonID === dungeonId);
        if (dungeonMatch.length === 0) {
            //Match not found, something went wrong!
        } else {
            return dungeonMatch[0];
        }
    }

    // This function handles boss stage emitter creation and removal as well as incrementing current stage
    function startBossHandle() {
        const bossStages = bossList.filter(boss => boss.NameRef === theDungeon.Boss);

        let curStage = bossStages[cs];
        if (userSpecEEFilter.nextStageE !== 'NONE') {
            userSpecEEFilter.nextStageE.removeAllListeners(`${userSpecEEFilter.NSE_UPK}`);
            if (userSpecEEFilter.bKilledE !== 'NONE') {
                userSpecEEFilter.bKilledE.removeAllListeners(`${userSpecEEFilter.BKE_UPK}`);
                userSpecEEFilter.bKilledE.removeAllListeners(`${userSpecEEFilter.PKE_UPK}`);
            }
        }

        const nextStageEmitter = new EventEmitter();
        userSpecEEFilter.nextStageE = nextStageEmitter;

        userSpecEEFilter.nextStageE.on(`${userSpecEEFilter.NSE_UPK}`, () => {
            //Load next stage
            cs++;
            curStage = bossStages[cs];
            handleBoss(curStage);
        });

        handleBoss(curStage);
    }

    // This function handles sending and recieving combat outcomes and handles accordingly
    async function handleBoss(curStage) {
        let constKey = curStage.ConstKey;
        let boss = curStage;

        const result = await createBoss(boss, constKey);
        if (result !== 'Success') return console.error(errorForm(`AN ERROR OCCURED: ${result}`));
        //Boss created successfully!

        if (userSpecEEFilter.bKilledE === 'NONE') {
            const bKillEmitter = new EventEmitter();
            userSpecEEFilter.bKilledE = bKillEmitter;
        }

        userSpecEEFilter.bKilledE.once(`${userSpecEEFilter.BKE_UPK}`, async () => {
            //Boss stage beaten
            if ((cs + 1) !== 3) {
                if (userSpecEEFilter.bKilledE !== 'NONE') userSpecEEFilter.bKilledE.removeAllListeners(`${userSpecEEFilter.PKE_UPK}`);
                return userSpecEEFilter.nextStageE.emit(`${userSpecEEFilter.NSE_UPK}`);
            }

            //Boss is dead!
            giveBossDrops(boss);

            if (userSpecEEFilter.nextEnemyE !== 'NONE') userSpecEEFilter.nextEnemyE.removeAllListeners(`${userSpecEEFilter.NEE_UPK}`);
            if (userSpecEEFilter.eKilledE !== 'NONE') {
                userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.EKE_UPK}`);
                userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.BKE_UPK}`);
                userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.PKE_UPK}`);
            }
            userSpecEEFilter.nextStageE.removeAllListeners(`${userSpecEEFilter.NSE_UPK}`);
            if (userSpecEEFilter.bKilledE !== 'NONE') {
                userSpecEEFilter.bKilledE.removeAllListeners(`${userSpecEEFilter.BKE_UPK}`);
                userSpecEEFilter.bKilledE.removeAllListeners(`${userSpecEEFilter.PKE_UPK}`);
            }
        });

        userSpecEEFilter.bKilledE.once(`${userSpecEEFilter.PKE_UPK}`, async () => {
            //Player killed
            const reviveButton = new ButtonBuilder()
                .setCustomId('primary')
                .setLabel('Revive')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('💀');

            const grief = new ActionRowBuilder().addComponents(reviveButton);

            const activeDung = await ActiveDungeon.findOne({ where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });

            var list = `Fighting fearlessly till the end, you nonetheless succumbed to the darkness..`;

            var lastCheckpoint = `Floor ${activeDung.lastsave}`;

            const playerDeadEmbed = new EmbedBuilder()
                .setTitle('You have fallen..')
                .setColor('DarkGold')
                .addFields(

                    { name: `Obituary`, value: list, inline: true },
                    { name: `Last checkpoint:`, value: lastCheckpoint, inline: true }
                );

            const embedMsg = await interaction.channel.send({ embeds: [playerDeadEmbed], components: [grief] });

            const filter = (i) => i.user.id === interaction.user.id;

            const collector = embedMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 40000,
            });

            collector.on('collect', (collInteract) => {
                if (collInteract.customId === 'primary') {
                    collector.stop();
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
        });

        try {
            startBossCombat(constKey, boss, interaction, userSpecEEFilter, thePlayer);
        } catch (error) {
            console.error(error);
        }

    }

    // This function handles db boss creation and deletion where needed
    async function createBoss(boss, constKey) {
        const result = await clearBoss();
        if (!result) return;

        try {
            await ActiveDungeonBoss.create({
                name: boss.Name,
                level: boss.Level,
                mindmg: boss.MinDmg,
                maxdmg: boss.MaxDmg,
                health: boss.Health,
                defence: boss.Defence,
                weakto: boss.WeakTo,
                constkey: constKey,
                specid: userID,
            });
        } catch (error) {
            console.error('Error Loading Boss:', error);
        }

        const bossAdded = await ActiveDungeonBoss.findOne({ where: [{ specid: userID }, { constkey: constKey }] });
        if (bossAdded) return 'Success';
        return 'Failure';
    }

    // This function handles giving boss rewards when defeated
    async function giveBossDrops(boss) {
        await ActiveDungeon.update({ completed: true }, { where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });

        const bossForRewards = boss;

        var xpGained = Math.floor(Math.random() * (bossForRewards.XpMax - bossForRewards.XpMin + 1) + bossForRewards.XpMin);
        const extraEXP = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { activec: 'EXP' }] });
        if (extraEXP) {
            if (extraEXP.duration > 0) {
                xpGained += xpGained * extraEXP.curreffect;
            }
        }
        const cGained = xpGained + Math.floor(Math.random() * (10 - 1) + 1);

        const blueprint = bossForRewards.Blueprint;
        const bpID = bossForRewards.BlueprintID;

        await createNewBlueprint(bpID, userID);

        const sBPID = bossForRewards.SecretBPID;
        await createNewBlueprint(sBPID, userID);

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

        await interaction.channel.send({ embeds: [bossDefeatedEmbed] }).then(bossDefeatEmbed => setTimeout(() => {
            bossDefeatEmbed.delete();
        }, 120000)).catch(console.error);

        await isLvlUp(xpGained, cGained, interaction);
    }

    function startNormHandle() {
        let floorStr = `Floor${cf}`;

        if (userSpecEEFilter.nextFloorE !== 'NONE') {
            userSpecEEFilter.nextFloorE.removeAllListeners(`${userSpecEEFilter.NFE_UPK}`);
            if (userSpecEEFilter.nextEnemyE !== 'NONE') userSpecEEFilter.nextEnemyE.removeAllListeners(`${userSpecEEFilter.NEE_UPK}`);
            if (userSpecEEFilter.eKilledE !== 'NONE') {
                userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.EKE_UPK}`);
                userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.BKE_UPK}`);
                userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.PKE_UPK}`);
            }
        }

        const nextFloorEmitter = new EventEmitter();
        userSpecEEFilter.nextFloorE = nextFloorEmitter;

        userSpecEEFilter.nextFloorE.on(`${userSpecEEFilter.NFE_UPK}`, () => {
            //Load next floor
            cf++;
            floorStr = `Floor${cf}`;
            loadFloor(floorStr, theDungeon);
        });

        loadFloor(floorStr, theDungeon);
    }

    // This function retrieves the full floor array of enemy constKeys to be used for loading each enemy
    function loadFloor(floor, dungeon) {
        const floorEnemyCKList = dungeon[`${floor}`];

        let floorEnemyObjectList = [];
        for (const constKey of floorEnemyCKList) {
            const enemyFab = enemyList.filter(enemy => enemy.ConstKey === constKey);
            floorEnemyObjectList.push(enemyFab[0]);
        }
        if (floorEnemyCKList.length !== floorEnemyObjectList.length) return console.error(errorForm('AN ERROR OCCURED WHILE LOADING ENEMIES!'));

        //EE HANDLING
        if (userSpecEEFilter.nextEnemyE !== 'NONE') {
            if (userSpecEEFilter.nextEnemyE !== 'NONE') userSpecEEFilter.nextEnemyE.removeAllListeners(`${userSpecEEFilter.NEE_UPK}`);
            if (userSpecEEFilter.eKilledE !== 'NONE') {
                userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.EKE_UPK}`);
                userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.PKE_UPK}`);
            }
        }

        const nextEnemyEmitter = new EventEmitter();
        userSpecEEFilter.nextEnemyE = nextEnemyEmitter;

        let curPos = 0;
        userSpecEEFilter.nextEnemyE.on(`${userSpecEEFilter.NEE_UPK}`, () => {
            //Load next enemy
            curPos++;
            handleEnemy(floorEnemyCKList, floorEnemyObjectList, curPos);
        });

        handleEnemy(floorEnemyCKList, floorEnemyObjectList, curPos);
    }

    // This function handles single loaded enemies and the associated combat callbacks 
    async function handleEnemy(floorCKList, floorFabList, curPos) {
        let constKey = floorCKList[curPos];
        let enemyToAdd = floorFabList[curPos];

        const result = await createEnemy(enemyToAdd, constKey);
        if (result !== 'Success') return console.error(errorForm(`AN ERROR OCCURED: ${result}`));
        //Enemy created successfully!

        if (userSpecEEFilter.eKilledE === 'NONE') {
            const eKillEmitter = new EventEmitter();
            userSpecEEFilter.eKilledE = eKillEmitter;
        }

        userSpecEEFilter.eKilledE.once(`${userSpecEEFilter.EKE_UPK}`, async () => {
            //Enemy killed
            userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.PKE_UPK}`);
            killedEnemies.push(enemyToAdd);

            let embed;

            let embedTitle = '';
            let embedColour = 'DarkButNotBlack';
            let fieldName = 'Press BUTTON';
            let fieldValue = 'To continue..';
            let fieldObj = [];

            let actionRow;

            if ((curPos + 1) < floorFabList.length) {
                const nextButton = new ButtonBuilder()
                    .setLabel('NEXT ENEMY')
                    .setCustomId('next-enemy')
                    .setStyle(ButtonStyle.Success)

                actionRow = new ActionRowBuilder().addComponents(nextButton);

                embedTitle = 'Enemy Killed!';
            } else {
                fullKilledList = fullKilledList.concat(killedEnemies);
                killedEnemies = [];

                if (((cf + 1) % 5) === 0) await checkPoint();

                if ((cf + 1) < bossFloor) {
                    const nextFloorButton = new ButtonBuilder()
                        .setLabel('NEXT FLOOR')
                        .setCustomId('next-floor')
                        .setStyle(ButtonStyle.Success)

                    actionRow = new ActionRowBuilder().addComponents(nextFloorButton);

                    embedTitle = `Floor ${cf} Cleared!`;
                    embedColour = 'White';
                }

                if ((cf + 1) === bossFloor) {
                    //Boss floor time
                }
            }

            if (embedTitle !== '') {
                fieldObj.push({ name: fieldName, value: fieldValue });

                embed = new EmbedBuilder()
                    .setTitle(embedTitle)
                    .setColor(embedColour)
                    .addFields(fieldObj);
            }

            const embedMsg = await interaction.followUp({ embeds: [embed], components: [actionRow] });

            const filter = (i) => i.user.id === interaction.user.id;

            const collector = embedMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 60000,
            });

            collector.on('collect', async (collInteract) => {
                if (collInteract.customId === 'next-floor') {
                    await collInteract.deferUpdate();
                    collector.stop();
                    return userSpecEEFilter.nextFloorE.emit(`${userSpecEEFilter.NFE_UPK}`);
                }

                if (collInteract.customId === 'next-enemy') {
                    await collInteract.deferUpdate();
                    collector.stop();
                    return userSpecEEFilter.nextEnemyE.emit(`${userSpecEEFilter.NEE_UPK}`);
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
        });

        userSpecEEFilter.eKilledE.once(`${userSpecEEFilter.PKE_UPK}`, async () => {
            //Player killed
            const reviveButton = new ButtonBuilder()
                .setCustomId('primary')
                .setLabel('Revive')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('💀');

            const grief = new ActionRowBuilder().addComponents(reviveButton);

            const activeDung = await ActiveDungeon.findOne({ where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });

            let list = `Fighting fearlessly till the end, you nonetheless succumbed to the darkness..`;

            let lastCheckpoint = `Floor ${activeDung.lastsave}`;

            const playerDeadEmbed = new EmbedBuilder()
                .setTitle('You have fallen..')
                .setColor('DarkGold')
                .addFields(

                    { name: `Obituary`, value: list, inline: true },
                    { name: `Last checkpoint:`, value: lastCheckpoint, inline: true }
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
                    collector.stop();
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
        });

        try {
            startCombat(constKey, interaction, userSpecEEFilter, thePlayer);
        } catch (error) {
            console.error(error);
        }
    }

    async function createEnemy(enemyPrefab, constKey) {
        const result = await clearEnemies();
        if (!result) return;

        if (!enemyPrefab.NewSpawn || enemyPrefab.NewSpawn === false) {
            try {
                await ActiveDungeonEnemy.create({
                    name: enemyPrefab.Name,
                    description: enemyPrefab.Description,
                    level: enemyPrefab.Level,
                    mindmg: enemyPrefab.MinDmg,
                    maxdmg: enemyPrefab.MaxDmg,
                    health: enemyPrefab.Health,
                    defence: enemyPrefab.Defence,
                    weakto: enemyPrefab.WeakTo,
                    dead: false,
                    xpmin: enemyPrefab.XpMin,
                    xpmax: enemyPrefab.XpMax,
                    constkey: constKey,
                    specid: userID,
                });
            } catch (error) {
                console.error('Error @ handleDungeon/createEnemy/OldSpawn:', error);
            }
        } else {
            try {
                const extraVals = enemyExtraGen(enemyPrefab);
                await ActiveDungeonEnemy.create({
                    name: enemyPrefab.Name,
                    description: enemyPrefab.Description,
                    level: enemyPrefab.Level,
                    health: enemyPrefab.Health,
                    defence: enemyPrefab.Defence,
                    weakto: enemyPrefab.WeakTo,
                    constkey: constKey,
                    specid: userID,
                    mindmg: extraVals.minDmg,
                    maxdmg: extraVals.maxDmg,
                    xpmin: extraVals.minXp,
                    xpmax: extraVals.maxXp,
                    dead: false,
                });
            } catch (error) {
                console.error('Error @ handleDungeon/createEnemy/NewSpawn:', error);
            }
        }

        const enemyAdded = await ActiveDungeonEnemy.findOne({ where: [{ specid: userID }, { constkey: enemyPrefab.ConstKey }] });
        if (enemyAdded) return 'Success';
        return 'Failure';
    }

    async function checkPoint() {
        await saveFloor((cf + 1));
        await giveFloorProgress();
        await clearEnemies();

        let addingCF = cf + 1;
        let saveFloorValList = ` ${addingCF}`

        const checkpointEmbed = new EmbedBuilder()
            .setTitle('Progress saved!')
            .setColor('DarkVividPink')
            .addFields({
                name: 'Floor: ', value: ` ${saveFloorValList}`, inline: true
            });

        return await interaction.channel.send({ embeds: [checkpointEmbed] }).then(checkpointEmbed => setTimeout(() => {
            checkpointEmbed.delete();
        }, 30000)).catch(error => console.error(error));
    }

    //This method saves floor progress at intervals of 5
    async function saveFloor(floor) {
        const totalHealth = 100 + (user.strength * 10);
        thePlayer.setHealth(totalHealth);

        const currentFloorEdit = await ActiveDungeon.update({ currentfloor: floor }, { where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
        const lastSaveEdit = await ActiveDungeon.update({ lastsave: floor }, { where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
        const currentHealthEdit = await ActiveDungeon.update({ currenthealth: totalHealth }, { where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });

        if (currentFloorEdit > 0 && lastSaveEdit > 0 && currentHealthEdit > 0) {
            //Success on all saves!
            return;
        }
    }

    async function clearEnemies() {
        const tableUpdate = await ActiveDungeonEnemy.destroy({ where: { specid: userID } });
        if (tableUpdate > 0) {
            return 'Deleted';
        } else return 'Failure';
    }

    async function clearBoss() {
        const tableUpdate = await ActiveDungeonBoss.destroy({ where: { specid: userID } });
        if (tableUpdate > 0) {
            return 'Deleted';
        } else return 'Failure';
    }

    //This method resets player health to full upon calling the dungeon, this prevents incorrect health values persisting upon boss kill
    async function setFullHealth() {
        const totalHealth = 100 + (user.strength * 10);
        const currentHealthEdit = await ActiveDungeon.update({ currenthealth: totalHealth }, { where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
        if (currentHealthEdit > 0) {
            //Health reset
            return;
        }
    }

    //This method handles loot reward generation and updating userdata values accordingly
    async function giveFloorProgress() {

        const { gearDrops } = interaction.client;

        let totalXP = 0;
        let totalCoins = 0;
        const lootChance = thePlayer.mods[4];

        let itemCount = 0;
        let curRun = 0;
        do {
            let thisE = fullKilledList[curRun];

            let rolledChance = Math.random();
            if (rolledChance >= lootChance) itemCount++;

            if (thisE.XpMax >= 0) {
                totalXP += Math.floor(Math.floor(Math.random() * (thisE.XpMax - thisE.XpMin + 1) + thisE.XpMin) / 2);
            } else {
                const lvl = thisE.Level;
                let nxtLvl;
                if (lvl < 20) {
                    nxtLvl = 50 * (Math.pow(lvl, 2) - 1);
                } else if (lvl === 20) {
                    nxtLvl = 75 * (Math.pow(lvl, 2) - 1);
                } else if (lvl > 20) {
                    const lvlScale = 1.5 * (Math.floor(lvl / 5));
                    nxtLvl = (75 + lvlScale) * (Math.pow(lvl, 2) - 1);
                }

                let XpMax = Math.floor((nxtLvl / 25) + (0.2 * (100 - lvl)));
                let XpMin = XpMax - Math.floor(XpMax / 5.2);

                totalXP += Math.floor(Math.floor(Math.random() * (XpMax - XpMin + 1) + XpMin) / 2);
            }
            curRun++;
        } while (curRun < fullKilledList.length)

        const extraEXP = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, { activec: 'EXP' }] });
        if (extraEXP) {
            if (extraEXP.duration > 0) {
                totalXP += totalXP * extraEXP.curreffect;
            }
        }

        totalCoins = totalXP * 1.5;

        const upgradeChance = thePlayer.mods[5];

        const totalItems = [];
        curRun = 0;
        do {
            let foundRar = await grabRar(31);
            let rolledUpgrade = Math.random();
            if (foundRar < 10 && rolledUpgrade >= upgradeChance) foundRar++;

            let choices = [];
            for (const [key, value] of gearDrops) {
                if (value === foundRar) choices.push(key);
            }

            let picked = randArrPos(choices);
            let thisI = lootList.filter(item => item.Loot_id === picked);

            let newItem = true;
            for (const item of totalItems) {
                if (item.Loot_id === thisI[0].Loot_id) {
                    newItem = false;
                    item.Amount += 1;
                    break;
                }
            }

            if (newItem) {
                const mappedItem = thisI.map(item => ({ ...item, Amount: 1 }),);
                totalItems.push(...mappedItem);
            }

            curRun++;
        } while (curRun < itemCount)

        await isLvlUp(totalXP, totalCoins, interaction);

        for (const item of totalItems) {
            let result = await checkOwned(user, item, item.Amount);
            if (result !== 'Finished') console.log('Item Adding Failure');
        }

        const xpGainList = `Xp Gained: ${totalXP}`;
        const coinGainList = `Coins Gained: ${totalCoins}`;
        const totalItemsList = `Total items Gained: ${totalItems.length}`;

        const floorRewardsEmbed = new EmbedBuilder()
            .setTitle('Rewards!')
            .setColor('Green')
            .addFields(
                { name: `Total `, value: `Gains:` },
                { name: `XP:`, value: ` ${xpGainList}`, inline: true },
                { name: `COINS:`, value: ` ${coinGainList}`, inline: true },
                { name: `ITEMS:`, value: ` ${totalItemsList}`, inline: true });

        return await interaction.channel.send({ embeds: [floorRewardsEmbed] }).then(floorDropEmbed => setTimeout(() => {
            floorDropEmbed.delete();
        }, 30000)).catch(console.error);
    }
}

async function startCombat(constKey, interaction, userSpecEEFilter, player) {
    let userID = userSpecEEFilter.userid;

    const foundE = await ActiveDungeonEnemy.findOne({ where: [{ constkey: constKey }, { specid: userID }] });
    const enemy = new Enemy(foundE);

    handleCombat(player, enemy, interaction, userSpecEEFilter, false);
}

async function startBossCombat(constKey, boss, interaction, userSpecEEFilter, player) {
    let userID = userSpecEEFilter.userid;
    const foundBoss = await ActiveDungeonBoss.findOne({ where: [{ constkey: constKey }, { specid: userID }] });
    const enemy = new Enemy(foundBoss);
    enemy.stageHealth(boss);

    const nextButton = new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Continue..')
        .setStyle(ButtonStyle.Secondary);

    const interactiveButtons = new ActionRowBuilder().addComponents(nextButton);

    const closeUpFile = new AttachmentBuilder(boss.PngRef_Closeup);
    const closeUp = boss.Image_Closeup;

    const embedPages = [];

    const introEmbed = new EmbedBuilder()
        .setTitle(boss.Name)
        .setThumbnail(closeUp)
        .setColor(boss.IntroC)
        .setFields({
            name: '\u200b', value: ` ${boss.Intro}`,
        });
    embedPages.push(introEmbed);

    const lineOneEmbed = new EmbedBuilder()
        .setTitle(boss.Name)
        .setThumbnail(closeUp)
        .setColor(boss.Line_OneC)
        .setFields({
            name: '\u200b', value: ` ${boss.Line_One}`,
        });
    embedPages.push(lineOneEmbed);

    const lineTwoEmbed = new EmbedBuilder()
        .setTitle(boss.Name)
        .setThumbnail(closeUp)
        .setColor(boss.Line_TwoC)
        .setFields({
            name: '\u200b', value: ` ${boss.Line_Two}`,
        });
    embedPages.push(lineTwoEmbed);

    const dialogEmbed = await interaction.channel.send({ components: [interactiveButtons], embeds: [embedPages[0]], files: [closeUpFile] });

    const filter = (i) => i.user.id === interaction.user.id;

    const collector = dialogEmbed.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter,
        time: 120000,
    });

    let currentPage = 0;
    collector.on('collect', async (collInteract) => {
        if (collInteract.customId === 'next') {
            await collInteract.deferUpdate();
            if ((currentPage + 1) === 3) {
                //Boss fight starts!
                await collector.stop();
                return handleCombat(player, enemy, interaction, userSpecEEFilter, true);
            } else if ((currentPage + 1) !== 3) {
                //Show next embed!
                currentPage += 1;
                await dialogEmbed.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons], files: [closeUpFile] });
            }
        }
    });

    collector.on('end', () => {
        if (dialogEmbed) {
            dialogEmbed.delete().catch(error => {
                if (error.code !== 10008) {
                    console.error('Failed to delete the message:', error);
                }
            });
        }
    });
}

async function handleCombat(player, enemy, interaction, userSpecEEFilter, bossCombat) {
    let userID = userSpecEEFilter.userid;
    display(player, enemy);

    async function display(player, enemy) {
        if (bossCombat) {
            if (player.dead === true || player.health <= 0) return userSpecEEFilter.bKilledE.emit(`${userSpecEEFilter.PKE_UPK}`);
            if (enemy.health <= enemy.stagehealth) return userSpecEEFilter.bKilledE.emit(`${userSpecEEFilter.BKE_UPK}`);
        } else {
            if (player.dead === true || player.health <= 0) return userSpecEEFilter.eKilledE.emit(`${userSpecEEFilter.PKE_UPK}`);
            if (enemy.dead === true || enemy.health <= 0) return userSpecEEFilter.eKilledE.emit(`${userSpecEEFilter.EKE_UPK}`);
        }

        if (player.hasLoadout) {
            const thePotion = await Loadout.findOne({ where: { spec_id: userID } });
            player.checkCurrentPotion(thePotion.potionone);
            const potionCheck = await findPotion(player.loadout[5], userID);
            if (potionCheck === 'NONE' || potionCheck === 'HASNONE') {
                //Both potion slots are empty keep buttons disabled
                player.potionDisabled = true;
                if (potionCheck === 'NONE') player.potionTxt = 'No Potion';
                if (potionCheck === 'HASNONE') player.potionTxt = '0 Remaining';
            } else {
                const activeEffects = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { name: potionCheck.name }] });
                if (!activeEffects || activeEffects.cooldown <= 0) {
                    //user has no active effects
                    player.potionDisabled = false;
                    player.potionTxt = `${potionCheck.amount} ${potionCheck.name}`;
                } else {
                    player.potionDisabled = true;
                    player.potionTxt = `CoolDown: ${activeEffects.cooldown}`;
                }
            }
        }

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
            .setLabel(player.potionTxt)
            .setDisabled(player.potionDisabled)
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(hideButton, attackButton, stealButton, blockButton, potionOneButton);

        let attachment;
        if (bossCombat) {
            attachment = await displayBossPic(enemy);
        } else attachment = await createEnemyDisplay(enemy);

        const combatEmbed = await interaction.followUp({ components: [row], files: [attachment] });

        const filter = (i) => i.user.id === userID;

        const collector = combatEmbed.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter,
            time: 40000,
        });

        collector.on('collect', async (COI) => {
            // Hiding!!
            if (COI.customId === 'hide') {
                let embedTitle = '';
                let embedColour = 'Black';
                let fieldName = '';
                let fieldValue = '';
                let fieldObj = [];

                let failHide = false;
                const dmgTaken = enemy.randDamage();

                const result = player.hide(enemy);
                if (result === 'FAILURE') {
                    embedTitle = 'Failed!';
                    embedColour = 'DarkRed';
                    fieldName = 'Oh NO!';
                    fieldValue = 'You failed to hide!';
                    failHide = true;
                } else if (result === 'SUCCESS') {
                    embedTitle = 'Success!';
                    embedColour = 'LuminousVividPink';
                    fieldName = 'Well Done!';
                    fieldValue = 'You managed to hide!';

                    hideButton.setDisabled(true);
                    attackButton.setLabel('Backstab!');
                    await COI.update({ components: [row] });
                }

                if (embedTitle !== '') {
                    fieldObj.push({ name: fieldName, value: fieldValue, });

                    const embed = new EmbedBuilder()
                        .setTitle(embedTitle)
                        .setColor(embedColour)
                        .addFields(fieldObj);

                    await COI.channel.send({ embeds: [embed] }).then(embedmsg => setTimeout(() => {
                        embedmsg.delete();
                    }, 20000)).catch(error => console.error(error));
                    if (failHide === true) {
                        player.takeDamge(dmgTaken);
                        await showDamageTaken(player, dmgTaken);
                    }
                    if (!player.isHidden) {
                        collector.stop();
                        return display(player, enemy);
                    }
                }
            }
            // Striking!!
            if (COI.customId === 'onehit') {
                collector.stop();
                await runCombatTurn(player, enemy);
                return;
            }
            // Blocking!
            if (COI.customId === 'block') {
                collector.stop();
                let dmgTaken = enemy.randDamage();

                let blockStrength;
                if (player.totalDefence <= 0) {
                    dmgTaken = player.takeDamge(dmgTaken);
                } else {
                    blockStrength = player.totalDefence * 1.5;
                    if ((blockStrength - dmgTaken) <= 0) {
                        dmgTaken -= blockStrength;
                        dmgTaken = player.takeDamge(dmgTaken);
                    } else {
                        blockStrength -= dmgTaken;
                        let counterDamage = (blockStrength * 0.25) + ((player.health * 0.02) * (player.str * 0.4));
                        await runCombatTurn(player, enemy, counterDamage);
                    }
                }
                await showDamageTaken(player, dmgTaken, true);
                return display(player, enemy);
            }
            // DRINK POTION!
            if (COI.customId === 'potone') {
                const potionUsed = await findPotion(player.loadout[5], userID);
                const result = await handleUsePotion(potionUsed, player);
                const reinEffects = await ActiveStatus.findAll({ where: [{ spec_id: userID }, { activec: 'Reinforce' }, { duration: { [Op.gt]: 0 } }] });
                if (reinEffects > 0) player.updateDefence(reinEffects);
                const tonEffects = await ActiveStatus.findAll({ where: [{ spec_id: userID }, { activec: 'Tons' }, { duration: { [Op.gt]: 0 } }] });
                if (tonEffects > 0) player.updateUPs(tonEffects);
                if (result !== 'Success') console.log('Potion effect not applied!');
                collector.stop();
                return display(player, enemy);
            }
        });

        collector.on('end', () => {
            combatEmbed.delete().catch(error => {
                if (error.code !== 10008) {
                    console.error('Failed to delete the message:', error);
                }
            });
        });
    }

    async function showDamageTaken(player, dmg, blocked) {
        let embedTitle = 'Damage Taken';
        dmg = Number.parseFloat(dmg).toFixed(1);
        player.health = Number.parseFloat(player.health).toFixed(1);
        if (blocked) embedTitle = 'Damage Blocked';

        const attackDmgEmbed = new EmbedBuilder()
            .setTitle(embedTitle)
            .setColor('DarkRed')
            .addFields(
                { name: 'DAMAGE: ', value: `${dmg}`, inline: true },
                { name: 'HEALTH REMAINING: ', value: `${player.health}`, inline: true },
            );

        await interaction.channel.send({ embeds: [attackDmgEmbed] }).then(attkEmbed => setTimeout(() => {
            attkEmbed.delete();
        }, 15000)).catch(error => console.error(error));
        return;
    }

    async function runCombatTurn(player, enemy, blocking) {
        let embedTitle = 'Damage Dealt';
        let embedColour = 'NotQuiteBlack';
        let fieldName = '';
        let fieldValue = '';
        let fieldObj = {};
        let finalFields = [];

        let initialDamage;
        if (!blocking) initialDamage = player.curDamage;
        if (blocking) initialDamage = blocking;

        if (player.isHidden) {
            initialDamage += initialDamage * 0.5;
            player.isHidden = false;
        }

        const critChance = player.mods[2];
        const dhChance = player.mods[3];
        const gearTypes = player.loadoutTypes.slice(3, 5);
        for (const type of gearTypes) {
            if (type.toLowerCase() === enemy.weakTo.toLowerCase()) {
                initialDamage += initialDamage * 0.5;
            }
        }

        const staticDamage = initialDamage;
        const turns = [];
        let turnDamageOne = {
            type: 'Normal',
            dmg: staticDamage,
        };

        let turnDamageTwo = {
            type: 'Normal',
            dmg: staticDamage,
        };

        const rolledDH = Math.random();
        let runFor = 1;
        if (rolledDH <= dhChance) {
            runFor = 2;
            turnDamageOne.type = 'Double Hit';
            turnDamageTwo.type = 'Double Hit';
            embedColour = 'Aqua';
        }

        let i = 0;
        let thisTurn;
        do {
            if (i === 0) thisTurn = turnDamageOne;
            if (i === 1) thisTurn = turnDamageTwo;
            initialDamage = staticDamage;

            let rolledCrit = Math.random();
            if (rolledCrit <= critChance) {
                embedColour = 'LuminousVividPink';
                initialDamage *= 2;
                thisTurn.type = 'Critical Hit';
                thisTurn.dmg = initialDamage;
            } else {
                thisTurn.type = 'Normal';
                thisTurn.dmg = initialDamage;
            }
            turns.push(thisTurn);
            i++;
        } while (i < runFor)

        for (let i = 0; i < turns.length; i++) {
            fieldName = turns[i].type;

            let newDmg;
            if (!blocking) {
                newDmg = turns[i].dmg - (enemy.defence * 2);
                enemy.curHealth(turns[i].dmg);
            } else {
                newDmg = turns[i].dmg + (enemy.defence * 2); // Reseting Defence during enemy taking damage
                enemy.curHealth(newDmg);
            }
            newDmg = Number.parseFloat(newDmg).toFixed(1);
            fieldValue = newDmg;

            fieldObj = { name: fieldName, value: `${fieldValue}`, inline: true };
            finalFields.push(fieldObj);
        }

        if (finalFields.length > 0) {
            const embed = new EmbedBuilder()
                .setTitle(embedTitle)
                .setColor(embedColour)
                .addFields(finalFields);

            await interaction.channel.send({ embeds: [embed] }).then(embedMsg => setTimeout(() => {
                embedMsg.delete();
            }, 20000)).catch(error => console.error(error));
            if (enemy.dead) {
                if (bossCombat) {
                    return userSpecEEFilter.bKilledE.emit(`${userSpecEEFilter.BKE_UPK}`);
                } else {
                    return userSpecEEFilter.eKilledE.emit(`${userSpecEEFilter.EKE_UPK}`);
                }
            }
            if (player.dead) {
                if (bossCombat) {
                    return userSpecEEFilter.bKilledE.emit(`${userSpecEEFilter.PKE_UPK}`);
                } else return userSpecEEFilter.eKilledE.emit(`${userSpecEEFilter.PKE_UPK}`);
            }
            if (!blocking) {
                let dmgTaken = enemy.randDamage();
                dmgTaken = player.takeDamge(dmgTaken);
                await showDamageTaken(player, dmgTaken);
                return display(player, enemy);
            }
            return;
        }
    }

    async function handleUsePotion(potion, player) {
        let appliedEffect;
        if (potion.activecategory === 'Healing') {
            const filterHeal = aCATE.filter(effect => effect.Name === 'Healing');
            const healAmount = filterHeal[0][`${potion.name}`];
            let newHealth;
            if (healAmount <= 0) return;
            appliedEffect = 0;
            const totalHealth = 100 + (player.str * 10);
            if (player.health === totalHealth) return await interaction.followUp('You are already at maximum health!!');
            if ((player.health + healAmount) > totalHealth) {
                newHealth = totalHealth;
            } else newHealth = player.health + healAmount;
            player.healthHealth(newHealth);
            await interaction.followUp(`Healing potion used. Healed for: ${healAmount}\nCurrent Health: ${player.health}`);
        }
        if (potion.activecategory === 'Reinforce') {
            const filterDefence = aCATE.filter(effect => effect.Name === 'Reinforce');
            const defenceAmount = filterDefence[0][`${potion.name}`];
            if (defenceAmount > 0) {
                //console.log(successResult('FOUND DEFENCE BOOST'));
                appliedEffect = defenceAmount;
                await interaction.followUp(`Reinforcement potion used. Defence increased by: ${defenceAmount}`);
            }
        }
        if (potion.activecategory === 'Tons') {
            const filterStats = aCATE.filter(effect => effect.Name === 'Tons');
            const statBoost = filterStats[0][`${potion.name}`];
            if (statBoost > 0) {
                //console.log(successResult('FOUND STAT BOOST'));
                appliedEffect = statBoost;
                await interaction.followUp(`Tons of Stats potion used. ALL stats increased by: ${statBoost}`);
            }
        }
        if (potion.activecategory === 'EXP') {
            const filterEXP = aCATE.filter(effect => effect.Name === 'EXP');
            const expBoost = filterEXP[0][`${potion.name}`];
            if (expBoost > 0) {
                //console.log(successResult('FOUND EXP BOOST'));
                appliedEffect = expBoost;
                await interaction.followUp(`EXP potion used. EXP gain increased by: ${expBoost}`);
            }
        }
        const result = await applyStatus(appliedEffect, potion);
        if (result !== 'Success') return 'Failure';
        return 'Success';
    }

    async function applyStatus(appliedEffect, potion) {
        const activeDC = await ActiveStatus.findOne({ where: [{ potionid: potion.potion_id }, { spec_id: userID }] });
        if (activeDC) {
            const tableUpdate = await activeDC.update({ cooldown: potion.cooldown, duration: potion.duration });
            if (tableUpdate <= 0) return 'Failure';
        } else {
            await ActiveStatus.create({
                name: potion.name,
                curreffect: appliedEffect,
                activec: potion.activecategory,
                cooldown: potion.cooldown,
                duration: potion.duration,
                potionid: potion.potion_id,
                spec_id: userID,
            });
        }

        if ((potion.amount - 1) <= 0) {
            const potionUpdate = await OwnedPotions.destroy({ where: [{ potion_id: potion.potion_id }, { spec_id: userID }] });
            if (potionUpdate > 0) return 'Success';
        } else {
            await potion.decrement('amount');
            await potion.save();
            return 'Success';
        }
    }
}

module.exports = { loadDungeon };
