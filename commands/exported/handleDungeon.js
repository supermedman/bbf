const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');
const EventEmitter = require('events');

const {
    warnedForm,
    errorForm,
    successResult,
    failureResult,
    basicInfoForm,
    specialInfoForm
} = require('../../chalkPresets.js');
const { ActiveDungeonEnemy, ActiveDungeon, UserData, LootStore, ActiveDungeonBoss, Pigmy, Loadout, ActiveStatus, OwnedPotions } = require('../../dbObjects.js');

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

async function loadDungeon(lastFloor, dungeonId, interaction, userID) {
    //const lastFloor = 0;
    //const dungeonId = 1;
    //const interaction = '/dungeon Wadon';
    //const userID = '501177494137995264';

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

    await setFullHealth();
    const bClear = await clearBoss();
    const eClear = await clearEnemies();
    console.log(specialInfoForm(`Status of bClear: ${bClear}\nStatus of eClear: ${eClear}`));

    var fullKilledList = [];
    var killedEnemies = [];

    let activeFloor;
    if (lastFloor === 0) {
        //Start at floor 1
        activeFloor = 1;
    } else activeFloor = lastFloor;
    console.log(specialInfoForm('activeFloor value to pass: ', activeFloor));

    const theDungeon = await findDungeon(dungeonId);
    console.log(successResult(`Dungeon found: ${theDungeon.Name}`));

    const bossFloor = theDungeon.BossFloor;

    let cs = 0;
    let cf = activeFloor;
    console.log(specialInfoForm(`cf: ${cf}`));
    if (cf < bossFloor) {
        console.log(basicInfoForm(`LOADING NORMAL FLOOR`));
        startNormHandle();
    } else if (cf === bossFloor) {
        console.log(specialInfoForm(`LOADING BOSS FLOOR`));
        startBossHandle();
        //loadBossFloor(theDungeon.Boss, interaction, userID, theB);
    } else if (cf > bossFloor) {
        return console.log(errorForm('AN ERROR HAS OCCURED!'));
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

    // This function handles boss stage emitter creation and removal as well as incrementing current stage
    async function startBossHandle() {
        const bossStages = bossList.filter(boss => boss.NameRef === theDungeon.Boss);

        let curStage = bossStages[cs];
        if (userSpecEEFilter.nextStageE === 'NONE') {
            const nextStageEmitter = new EventEmitter();

            userSpecEEFilter.nextStageE = nextStageEmitter;
        } else {
            userSpecEEFilter.nextStageE.removeAllListeners(`${userSpecEEFilter.NSE_UPK}`);
            //if (userSpecEEFilter.nextEnemyE !== 'NONE') userSpecEEFilter.nextEnemyE.removeAllListeners(`${userSpecEEFilter.NEE_UPK}`);
            if (userSpecEEFilter.bKilledE !== 'NONE') {
                //userSpecEEFilter.bKilledE.removeAllListeners(`${userSpecEEFilter.EKE_UPK}`);
                userSpecEEFilter.bKilledE.removeAllListeners(`${userSpecEEFilter.BKE_UPK}`);
                userSpecEEFilter.bKilledE.removeAllListeners(`${userSpecEEFilter.PKE_UPK}`);
            }

            const nextStageEmitter = new EventEmitter();

            userSpecEEFilter.nextStageE = nextStageEmitter;
        }

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
        if (result === 'Success') {
            //Boss created successfully!
            if (userSpecEEFilter.bKilledE === 'NONE') {
                const bKillEmitter = new EventEmitter();

                userSpecEEFilter.bKilledE = bKillEmitter;
            }

            userSpecEEFilter.bKilledE.once(`${userSpecEEFilter.BKE_UPK}`, async () => {
                //Boss stage beaten
                if ((cs + 1) === 3) {
                    //Boss is dead!
                    await dungeonISCOMPLETE(true);
                    giveBossDrops(boss);
                    //userSpecEEFilter.nextStageE.removeAllListeners(`${userSpecEEFilter.NSE_UPK}`);
                    if (userSpecEEFilter.nextEnemyE !== 'NONE') userSpecEEFilter.nextEnemyE.removeAllListeners(`${userSpecEEFilter.NEE_UPK}`);
                    if (userSpecEEFilter.eKilledE !== 'NONE') {
                        userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.EKE_UPK}`);
                        userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.BKE_UPK}`);
                        userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.PKE_UPK}`);
                    }
                    userSpecEEFilter.nextStageE.removeAllListeners(`${userSpecEEFilter.NSE_UPK}`);
                    //if (userSpecEEFilter.nextEnemyE !== 'NONE') userSpecEEFilter.nextEnemyE.removeAllListeners(`${userSpecEEFilter.NEE_UPK}`);
                    if (userSpecEEFilter.bKilledE !== 'NONE') {
                        //userSpecEEFilter.bKilledE.removeAllListeners(`${userSpecEEFilter.EKE_UPK}`);
                        userSpecEEFilter.bKilledE.removeAllListeners(`${userSpecEEFilter.BKE_UPK}`);
                        userSpecEEFilter.bKilledE.removeAllListeners(`${userSpecEEFilter.PKE_UPK}`);
                    }
                } else {
                    const deleteBoss = await removeBoss(constKey);
                    if (deleteBoss === 'Deleted') {
                        userSpecEEFilter.nextStageE.emit(`${userSpecEEFilter.NSE_UPK}`);
                    } else if (deleteBoss === 'Failure') {
                        console.log(errorForm('ERROR: BOSS NOT REMOVED BEFORE LOADING'));
                        return 'ERROR-NO: 0';
                    }
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

            startBossCombat(constKey, boss, interaction, userSpecEEFilter);
        } else return console.log(errorForm(`AN ERROR OCCURED: ${result}`));
    }

    // This function handles db boss creation and deletion where needed
    async function createBoss(boss, constKey) {
        const dupeCheck = await ActiveDungeonBoss.findOne({ where: [{ specid: userID }, { constkey: constKey }] });
        if (dupeCheck) {
            const delResult = await removeBoss(constKey);
            if (delResult === 'Deleted') {
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

                const bossAdded = await ActiveDungeonBoss.findOne({ where: [{ specid: userID }, { constkey: constKey }] });
                if (bossAdded) {
                    console.log(successResult('BOSS CREATED AND FOUND!'));
                    return 'Success';
                } else return 'ERROR-NO: 1';
            } else if (delResult === 'Failure') {
                console.log(errorForm('ERROR: BOSS NOT REMOVED BEFORE LOADING'));
                return 'ERROR-NO: 0';
            }
        } else if (!dupeCheck) {
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

            const bossAdded = await ActiveDungeonBoss.findOne({ where: [{ specid: userID }, { constkey: constKey }] });
            if (bossAdded) {
                console.log(successResult('BOSS CREATED AND FOUND!'));
                return 'Success';
            } else return 'ERROR-NO: 1';
        }
    }

    // This function removes a specified boss
    async function removeBoss(constKey) {
        const tableUpdate = await ActiveDungeonBoss.destroy({ where: [{ specid: userID }, { constkey: constKey }] });
        if (tableUpdate > 0) {
            return 'Deleted';
        } else return 'Failure';
    }

    // This function sets the completed flag in active dungeon to true
    async function dungeonISCOMPLETE(status) {
        const completeStatus = await ActiveDungeon.update({ completed: status }, { where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
        if (completeStatus > 0) {
            return console.log('DUNGEON IS COMPLETE!');
        }
    }

    // This function handles giving boss rewards when defeated
    async function giveBossDrops(boss) {
        const bossForRewards = boss;

        var xpGained = Math.floor(Math.random() * (bossForRewards.XpMax - bossForRewards.XpMin + 1) + bossForRewards.XpMin);
        const extraEXP = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { activec: 'EXP' }] });
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

    //console.log(specialInfoForm())
    //console.log(basicInfoForm())

    // This function handles regular floor combat loading each new floor as called
    async function startNormHandle() {
        //Create EEs To be used for combat end call backs
        let floorStr = `Floor${cf}`;

        if (userSpecEEFilter.nextFloorE === 'NONE') {
            console.log(specialInfoForm('nextFloorEmitter: NONE'));

            const nextFloorEmitter = new EventEmitter();

            userSpecEEFilter.nextFloorE = nextFloorEmitter;
        } else {
            console.log(specialInfoForm(`nextFloorEmitter found, removing all listeners now!`));

            userSpecEEFilter.nextFloorE.removeAllListeners(`${userSpecEEFilter.NFE_UPK}`);
            if (userSpecEEFilter.nextEnemyE !== 'NONE') userSpecEEFilter.nextEnemyE.removeAllListeners(`${userSpecEEFilter.NEE_UPK}`);
            if (userSpecEEFilter.eKilledE !== 'NONE') {
                userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.EKE_UPK}`);
                userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.BKE_UPK}`);
                userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.PKE_UPK}`);
            }

            const nextFloorEmitter = new EventEmitter();

            userSpecEEFilter.nextFloorE = nextFloorEmitter;
        }

        userSpecEEFilter.nextFloorE.on(`${userSpecEEFilter.NFE_UPK}`, () => {
            //Load next floor
            console.log(basicInfoForm('Loading next floor...'));
            cf++;
            floorStr = `Floor${cf}`;
            console.log(specialInfoForm(`Floor being loaded: ${floorStr}`));
            loadFloor(floorStr, theDungeon);
        });

        loadFloor(floorStr, theDungeon);
    }


    // This function retrieves the full floor array of enemy constKeys to be used for loading each enemy
    function loadFloor(floor, dungeon) {
        const floorEnemyCKList = dungeon[`${floor}`];
        console.log(`floorEnemyCK Length: ${floorEnemyCKList.length}`);

        let floorEnemyObjectList = [];
        for (const constKey of floorEnemyCKList) {
            const enemyFab = enemyList.filter(enemy => enemy.ConstKey === constKey);
            floorEnemyObjectList.push(enemyFab[0]);
        }
        if (floorEnemyCKList.length !== floorEnemyObjectList.length) return console.log(errorForm('AN ERROR OCCURED WHILE LOADING ENEMIES!'));

        //EE HANDLING
        if (userSpecEEFilter.nextEnemyE === 'NONE') {
            console.log(specialInfoForm('nextEnemyEmitter: NONE'));
            const nextEnemyEmitter = new EventEmitter();

            userSpecEEFilter.nextEnemyE = nextEnemyEmitter;
        } else {
            console.log(specialInfoForm('nextEnemyEmitter found, removing all listeners now!'));
            if (userSpecEEFilter.nextEnemyE !== 'NONE') userSpecEEFilter.nextEnemyE.removeAllListeners(`${userSpecEEFilter.NEE_UPK}`);
            if (userSpecEEFilter.eKilledE !== 'NONE') {
                userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.EKE_UPK}`);
                //userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.BKE_UPK}`);
                userSpecEEFilter.eKilledE.removeAllListeners(`${userSpecEEFilter.PKE_UPK}`);
            }

            const nextEnemyEmitter = new EventEmitter();

            userSpecEEFilter.nextEnemyE = nextEnemyEmitter;
        }

        let curPos = 0;
        userSpecEEFilter.nextEnemyE.on(`${userSpecEEFilter.NEE_UPK}`, () => {
            //Load next enemy
            console.log(basicInfoForm('Loading next enemy...'));
            curPos++;
            console.log(specialInfoForm(`floorEnemyCKList @ ${curPos} ${floorEnemyCKList[curPos]}`));
            console.log(specialInfoForm(`floorEnemyObjectList @ ${curPos} ${floorEnemyObjectList[curPos]}`));
            handleEnemy(floorEnemyCKList, floorEnemyObjectList, curPos);
        });

        console.log(specialInfoForm(`floorEnemyCKList @ ${curPos} ${floorEnemyCKList[curPos]}`));
        console.log(specialInfoForm(`floorEnemyObjectList @ ${curPos} ${floorEnemyObjectList[curPos]}`));
        handleEnemy(floorEnemyCKList, floorEnemyObjectList, curPos);
    }

    // This function handles single loaded enemies and the associated combat callbacks 
    async function handleEnemy(floorCKList, floorFabList, curPos) {
        let constKey = floorCKList[curPos];
        let enemyToAdd = floorFabList[curPos];


        const result = await createEnemy(enemyToAdd, constKey);
        if (result === 'Success') {
            //Enemy created successfully!
            if (userSpecEEFilter.eKilledE === 'NONE') {
                const eKillEmitter = new EventEmitter();

                userSpecEEFilter.eKilledE = eKillEmitter;
            }

            userSpecEEFilter.eKilledE.once(`${userSpecEEFilter.EKE_UPK}`, async () => {
                //Enemy killed
                console.log(basicInfoForm('Enemy killed...'));
                killedEnemies.push(enemyToAdd);
                if ((curPos + 1) < floorFabList.length) {
                    console.log(basicInfoForm('Next enemy exists, prompting next enemy button input now...'));
                    const nextButton = new ButtonBuilder()
                        .setLabel('NEXT ENEMY')
                        .setCustomId('next-enemy')
                        .setStyle(ButtonStyle.Success)

                    const actionRow = new ActionRowBuilder().addComponents(nextButton);

                    const nextEnemyEmbed = new EmbedBuilder()
                        .setTitle('Enemy Killed')
                        .setColor(0000)
                        .addFields({
                            name: 'Press BUTTON', value: 'To continue..',
                        });

                    const embedMsg = await interaction.followUp({ embeds: [nextEnemyEmbed], components: [actionRow] });

                    const filter = (i) => i.user.id === interaction.user.id;

                    const collector = embedMsg.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        filter,
                        time: 60000,
                    });

                    collector.on('collect', async (collInteract) => {
                        if (collInteract.customId === 'next-enemy') {
                            await collInteract.deferUpdate();
                            await collector.stop();
                            const deleteEnemy = await removeEnemy(constKey);
                            if (deleteEnemy === 'Deleted') {
                                userSpecEEFilter.nextEnemyE.emit(`${userSpecEEFilter.NEE_UPK}`);
                            } else if (deleteEnemy === 'Failure') {
                                console.log(errorForm('ERROR: ENEMY NOT REMOVED BEFORE LOADING'));
                                return 'ERROR-NO: 0';
                            }
                        }
                    });

                    collector.on('end', () => {
                        if (embedMsg) {
                            embedMsg.delete();
                        }
                    });
                } else {
                    await tempFloorSave(killedEnemies);
                    killedEnemies = [];
                    if (((cf + 1) % 5) === 0) {
                        //Save floor
                        console.log(specialInfoForm('Save floor reached, saving user data now...'));
                        await saveFloor((cf + 1));
                        await giveFloorProgress();
                        const eClear = await clearEnemies();
                        console.log(specialInfoForm(`eClear status: ${eClear}`));
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
                        }, 30000)).catch(console.error);
                    }
                    if ((cf + 1) < bossFloor) {
                        console.log(basicInfoForm('No next enemy, prompting next floor button input now...'));
                        const nextFloorButton = new ButtonBuilder()
                            .setLabel('NEXT FLOOR')
                            .setCustomId('next-floor')
                            .setStyle(ButtonStyle.Success)

                        const actionRow = new ActionRowBuilder().addComponents(nextFloorButton);

                        const nextFloorEmbed = new EmbedBuilder()
                            .setTitle(`Floor ${cf} Cleared!`)
                            .setColor('White')
                            .addFields({
                                name: 'Press BUTTON', value: 'To continue..',
                            });

                        const embedMsg = await interaction.followUp({ embeds: [nextFloorEmbed], components: [actionRow] });

                        const filter = (i) => i.user.id === interaction.user.id;

                        const collector = embedMsg.createMessageComponentCollector({
                            componentType: ComponentType.Button,
                            filter,
                            time: 60000,
                        });

                        collector.on('collect', async (collInteract) => {
                            if (collInteract.customId === 'next-floor') {
                                await collInteract.deferUpdate();
                                await collector.stop();
                                userSpecEEFilter.nextFloorE.emit(`${userSpecEEFilter.NFE_UPK}`);
                            }
                        });

                        collector.on('end', () => {
                            if (embedMsg) {
                                embedMsg.delete();
                            }
                        });
                    }
                    if ((cf + 1) === bossFloor) {
                        //Boss floor time
                    }
                }
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

            startCombat(constKey, interaction, userSpecEEFilter);
        } else return console.log(errorForm(`AN ERROR OCCURED: ${result}`));
    }


    async function createEnemy(enemyPrefab, constKey) {
        const fullClear = await clearEnemies();
        console.log(specialInfoForm(`clearEnemies Result: ${fullClear}`));
        //const dupeCheck = await ActiveDungeonEnemy.findOne({ where: [{ specid: userID }, { constkey: constKey}] });
        //if (dupeCheck) {
            //Entry exists await deletion before continuing...
            //const delResult = await removeEnemy(constKey);
            //if (delResult === 'Deleted') {
            //    await ActiveDungeonEnemy.create({
            //        name: enemyPrefab.Name,
            //        description: enemyPrefab.Description,
            //        level: enemyPrefab.Level,
            //        mindmg: enemyPrefab.MinDmg,
            //        maxdmg: enemyPrefab.MaxDmg,
            //        health: enemyPrefab.Health,
            //        defence: enemyPrefab.Defence,
            //        weakto: enemyPrefab.WeakTo,
            //        dead: false,
            //        xpmin: enemyPrefab.XpMin,
            //        xpmax: enemyPrefab.XpMax,
            //        constkey: constKey,
            //        specid: userID,
            //    });

            //    const enemyAdded = await ActiveDungeonEnemy.findOne({ where: [{ specid: userID }, { constkey: enemyPrefab.ConstKey }] });
            //    if (enemyAdded) {
            //        console.log(successResult('ENEMY CREATED AND FOUND!'));
            //        return 'Success';
            //    } else return 'ERROR-NO: 1.1';
            //} else if (delResult === 'Failure') {
            //    console.log(errorForm('ERROR: ENEMY NOT REMOVED BEFORE LOADING'));
            //    return 'ERROR-NO: 0.1';
            //}
        //} else if (!dupeCheck) {
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

            const enemyAdded = await ActiveDungeonEnemy.findOne({ where: [{ specid: userID }, { constkey: enemyPrefab.ConstKey }] });
            if (enemyAdded) {
                console.log(successResult('ENEMY CREATED AND FOUND!'));
                return 'Success';
            } else return 'ERROR-NO: 1.2';
        //}
    }

    async function removeEnemy(constKey) {
        const tableUpdate = await ActiveDungeonEnemy.destroy({ where: [{ specid: userID }, { constkey: constKey }] });
        if (tableUpdate > 0) {
            return 'Deleted';
        } else return 'Failure';
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

        const currentFloorEdit = await ActiveDungeon.update({ currentfloor: floor }, { where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
        const lastSaveEdit = await ActiveDungeon.update({ lastsave: floor }, { where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
        const currentHealthEdit = await ActiveDungeon.update({ currenthealth: totalHealth }, { where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });

        if (currentFloorEdit > 0 && lastSaveEdit > 0 && currentHealthEdit > 0) {
            //Success on all saves!
            return;
        }
    }

    //This method resets player health to full upon calling the dungeon, this prevents incorrect health values persisting upon boss kill
    async function setFullHealth() {
        const user = await UserData.findOne({ where: { userid: userID } });
        const totalHealth = 100 + (user.strength * 10);
        const currentHealthEdit = await ActiveDungeon.update({ currenthealth: totalHealth }, { where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
        if (currentHealthEdit > 0) {
            //Health reset
            return;
        }
    }

    //This method handles loot reward generation and updating userdata values accordingly
    async function giveFloorProgress() {
        let totXP = 0;
        let totCoin = 0;
        let count = 0;
        let totItem = 0;
        let iGained = [];
        while (count < fullKilledList.length) {
            let enemyTempRef = fullKilledList[count];

            let lChance = Math.random();//rng which will decide whether loot is dropped
            let HI = false;

            const multChance = 0.850;

            if (lChance >= multChance) {
                //hasitem:true
                HI = true;
            } else {/**hasitem: false*/ }

            let tmpCopy = [];
            if (HI) {
                //has item add to list 
                totItem += 1;
                let iPool = [];
                tmpCopy = [];//Clear tmp array for each item 

                let randR = await grabRar(enemyTempRef.level);

                for (var n = 0; n < lootList.length; n++) {

                    if (lootList[n].Rar_id === randR) {
                        iPool.push(lootList[n]);
                        //console.log('CONTENTS OF lootList AT POSITION ' + n + ': ', lootList[n].Name, lootList[n].Value, lootList[n].Loot_id, lootList[n].Type, interaction.user.id);
                    } else {
                        //item not match keep looking
                    }
                }

                //  Available items added to array, rng grab one  
                let randItemPos;
                if (iPool.length <= 1) {
                    randItemPos = 0;
                } else {
                    randItemPos = Math.round(Math.random() * (iPool.length - 1));
                }

                tmpCopy.push(iPool[randItemPos]);//ADD ITEM SELECTED TO TEMP ARRAY FOR COMPARING
                //Assume the item added is new until proven otherwise
                let itemNew = true;
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

                    const mappedItem = tmpCopy.map(item => ({ ...item, Amount: 1 }),);
                    //console.log('AFTER MAPPED NEW ITEM: ', mappedItem);

                    //totPages += 1;

                    iGained.push(...mappedItem);
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

        const extraEXP = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { activec: 'EXP' }] });
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
        }, 30000)).catch(console.error);

        await isLvlUp(totXP, totCoin, interaction);
    }

    //This method clears dungeon progress upon player death
    async function clearProgress(battle) {
        const activeDungeon = await ActiveDungeon.findOne({ where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
        const lastSaveReset = await ActiveDungeon.update({ currentfloor: activeDungeon.lastsave }, { where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
        if (lastSaveReset > 0) {
            fullKilledList = [];

            const user = await UserData.findOne({ where: { userid: userID } });
            const totalHealth = 100 + (user.strength * 10);

            const currentHealthEdit = await ActiveDungeon.update({ currenthealth: totalHealth }, { where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
            if (currentHealthEdit > 0) {
                if (battle === 'Enemy') {
                    return await destroyEnemy(userID);
                } else if (battle === 'Boss') {
                    return await destroyBoss(userID);
                }
            }
        }
    }
}

async function startCombat(constKey, interaction, userSpecEEFilter) {
    let isHidden = false;
    let potionOneDisabled = true;
    let userID = userSpecEEFilter.userid;
    let dungeonId = userSpecEEFilter.dungeonid;
    display();

    async function display() {
        const enemy = await ActiveDungeonEnemy.findOne({ where: [{ specid: userID }, { constkey: constKey }] });
        if (!enemy) {
            //Bruh wtf
            console.log(errorForm('An error has occured, ENEMY NOT FOUND'));
        }
        const hasPng = await pngCheck(enemy);

        const user = await UserData.findOne({ where: { userid: userID } });
        const pigmy = await Pigmy.findOne({ where: { spec_id: userID } });
        const currentLoadout = await Loadout.findOne({ where: { spec_id: userID } });
        if (!currentLoadout) {
            //No loadout keep potions disabled
        } else {
            const checkPotOne = await findPotionOne(currentLoadout.potionone, userID);
            if ((checkPotOne === 'NONE')) {
                //Both potion slots are empty keep buttons disabled
                potionOneDisabled = true;
            } else {
                const activeEffects = await ActiveStatus.findOne({ where: { spec_id: userID } });
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

        let attachment;

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
                        stealPunish(enemy, user);
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
                if (currentLoadout) {
                    const weapon = await findMainHand(currentLoadout.mainhand, userID);
                    let dmgDealt = await userDamageLoadout(user, weapon);
                    if (isHidden === true) {
                        //BACKSTAB
                        dmgDealt = dmgDealt * 1.5;
                        isHidden = false;
                    } else await collInteract.deferUpdate();
                    await collector.stop();
                    hitOnce(dmgDealt, weapon, user, enemy, false);
                } else {
                    //Yeah thats funny, im not catching this case... why are you naked in the dungeon lol
                }
            }

            if (collInteract.customId === 'block') {
                await collInteract.deferUpdate();

                await collector.stop();
                blockAttack(enemy, user);
            }

            if (collInteract.customId === 'potone') {
                //Potion One Used!
                await collInteract.deferUpdate();
                const hasPotOne = await findPotionOne(currentLoadout.potionone, userID);
                await usePotOne(hasPotOne, user);
                await collector.stop();
                display();
            }
        });

        collector.on('end', () => {
            if (message) {
                message.delete();
            }
        });
    }

    //This method is used when a user fails to steal from an enemy resulting in being attacked
    async function stealPunish(enemy, user) {
        const eDamage = await enemyDamage(enemy);
        console.log(`Enemy damge: ${eDamage}`);
        takeDamage(eDamage, user, false);
    }

    async function hitOnce(dmgDealt, weapon, user, enemy, isBlocked) {
        let eHealth = enemy.health;
        const eDefence = enemy.defence;

        let Itype;
        if (!weapon) {
            Itype = 'NONE';
        } else {
            Itype = weapon.Type.toLowerCase();
            console.log('Weapon Type after toLowerCase(): ', Itype);

            const Etype = enemy.weakto.toLowerCase();
            console.log('Enemy Weakto after toLowerCase(): ', Etype);

            if (Itype === Etype) {
                dmgDealt *= 1.5;
                console.log('TYPE MATCH! dmgDealt: ', dmgDealt);
            }
        }

        let embedColour = 'NotQuiteBlack';
        let embedTitle = 'Damage Dealt';

        const pigmy = await Pigmy.findOne({ where: { spec_id: userID } });

        let spdUP = 0;
        let dexUP = 0;
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
        console.log(specialInfoForm('Current 2 hit chance: ', dhChance));

        const procCall1 = Math.random();
        console.log(specialInfoForm('RNG rolled for double hit: ', procCall1, '\n'));
        //specialInfoForm()
        //successResult()
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
            console.log(specialInfoForm('RNG rolled for crit chance: ', procCall2, '\n'));

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
                console.log(specialInfoForm('ENEMY IS DEAD'));
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

                userSpecEEFilter.eKilledE.emit(`${userSpecEEFilter.EKE_UPK}`);
                return;
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
                await hitE(eHealth);
            }
            i++;
        } while (i < runCount)

        if (isBlocked === true) {
            return display();
        } else if (isBlocked === false) {
            const eDamage = await enemyDamage(enemy);
            console.log(`Enemy damge, not blocking: ${eDamage}`);
            return takeDamage(eDamage, user, false);
        }
    }

    //This method takes user defence and calculates reflect damage if defence is stronger than enemies attack
    async function blockAttack(enemy, user) {
        let eDamage = await enemyDamage(enemy);
        const dungeonUser = await ActiveDungeon.findOne({ where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
        const extraStats = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { activec: 'Tons' }] });
        var currentHealth = dungeonUser.currenthealth;
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

        let defence = 0;
        const currentLoadout = await Loadout.findOne({ where: { spec_id: userID } });
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

            const extraDefence = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { activec: 'Reinforce' }] });

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
                        .addFields({ name: 'DAMAGE TAKEN REDUCED BY: ', value: ' ' + blockStrength + ' ', inline: true });

                    await interaction.channel.send({ embeds: [dmgBlockedEmbed] }).then(async blockedEmbed => setTimeout(() => {
                        blockedEmbed.delete();
                    }, 15000)).catch(console.error);

                    return takeDamage(eDamage, user, true);
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

                    let ghostWeapon;
                    let counterDamage = (blockStrength * 0.25) + ((currentHealth * 0.02) * (user.strength * 0.4));
                    console.log(`counterDamage: ${counterDamage}`);

                    const counterEmbed = new EmbedBuilder()
                        .setTitle("Counter Attack!")
                        .setColor('DarkRed')
                        .addFields({ name: 'DAMAGE: ', value: ' ' + counterDamage + ' ', inline: true });

                    await interaction.channel.send({ embeds: [counterEmbed] }).then(async cntrEmbed => setTimeout(() => {
                        cntrEmbed.delete();
                    }, 15000)).catch(console.error);

                    return hitOnce(counterDamage, ghostWeapon, user, enemy, true);
                }
            } else {
                return takeDamage(eDamage, user, true);
            }
        } else if (!currentLoadout) {
            return takeDamage(eDamage, user, true);
        }
    }

    //========================================
    // This method calculates damage dealt to user 
    async function takeDamage(theEnemyDamage, user, isBlocked) {
        const dungeonUser = await ActiveDungeon.findOne({ where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
        const extraStats = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { activec: 'Tons' }] });
        let currentHealth = dungeonUser.currenthealth;
        if (extraStats) {
            if (extraStats.duration > 0) {
                currentHealth += (extraStats.curreffect * 10);
            }
        }
        let eDamage = theEnemyDamage;

        if (isBlocked === true) {
            if ((currentHealth - eDamage) <= 0) {
                //Player has died =========================================================== HANDLE THIS DIFFERENTLY!!!!!!
                console.log(failureResult('PLAYER IS DEAD :O'));
                await hitP(0);
                userSpecEEFilter.eKilledE.emit(`${userSpecEEFilter.PKE_UPK}`);
                return;
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

            let defence = 0;
            const currentLoadout = await Loadout.findOne({ where: { spec_id: userID } });
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
                console.log(`EnemyDamage after defence: ${eDamage}`);
            }

            if (eDamage < 0) {
                eDamage = 0;
            }


            if ((currentHealth - eDamage) <= 0) {
                //Player has died =========================================================== HANDLE THIS DIFFERENTLY!!!!!!
                console.log(failureResult('PLAYER IS DEAD :O'));
                await hitP(0);
                userSpecEEFilter.eKilledE.emit(`${userSpecEEFilter.PKE_UPK}`);
                return;
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
        }
    }

    //========================================
    //this method updates the enemies health after being attacked and returns
    async function hitP(currentHealth) {
        const dealDmg = await ActiveDungeon.update({ currenthealth: currentHealth }, { where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
        if (dealDmg > 0) {
            console.log('Player Health has been updated');
            return;
        }
    }

    //========================================
    //this method updates the enemies health after being attacked and returns
    async function hitE(eHealth) {
        const dealDmg = await ActiveDungeonEnemy.update({ health: eHealth }, { where: [{ specid: userID }, { constkey: constKey }] });
        if (dealDmg > 0) {
            console.log('Enemy Health has been updated');
            return;
        }
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
                const dungUser = await ActiveDungeon.findOne({ where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
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

                    const editRow = await ActiveDungeon.update({ currenthealth: newHealth }, { where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
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

    //========================================
    //This method checks for enemy png
    function pngCheck(enemy) {
        const enemyRef = enemyList.filter(eFab => eFab.ConstKey === enemy.constkey);
        if (enemyRef.PngRef) return true;
        return false;
    }
}

async function startBossCombat(constKey, boss, interaction, userSpecEEFilter) {
    console.log(`Loading boss dialog now...`);
    let isHidden = false;
    let potionOneDisabled = true;
    let userID = userSpecEEFilter.userid;
    let dungeonId = userSpecEEFilter.dungeonid;

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
    await embedPages.push(introEmbed);

    const lineOneEmbed = new EmbedBuilder()
        .setTitle(boss.Name)
        .setThumbnail(closeUp)
        .setColor(boss.Line_OneC)
        .setFields({
            name: '\u200b', value: ` ${boss.Line_One}`,
        });
    await embedPages.push(lineOneEmbed);

    const lineTwoEmbed = new EmbedBuilder()
        .setTitle(boss.Name)
        .setThumbnail(closeUp)
        .setColor(boss.Line_TwoC)
        .setFields({
            name: '\u200b', value: ` ${boss.Line_Two}`,
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
            await collInteract.deferUpdate();
            console.log(currentPage);
            if ((currentPage + 1) === 3) {
                //Boss fight starts!
                await collector.stop();

                display();
            } else if ((currentPage + 1) !== 3) {
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
        const enemy = await ActiveDungeonBoss.findOne({ where: [{ specid: userID }, { constkey: constKey }] });
        if (!enemy) {
            //Bruh wtf
            console.log(errorForm('An error has occured while finding the active boss!'));
        }

        const user = await UserData.findOne({ where: { userid: userID } });
        const pigmy = await Pigmy.findOne({ where: { spec_id: userID } });
        const currentLoadout = await Loadout.findOne({ where: { spec_id: userID } });
        if (!currentLoadout) {
            //No loadout keep potions disabled
        } else {
            const checkPotOne = await findPotionOne(currentLoadout.potionone, userID);
            if ((checkPotOne === 'NONE')) {
                //Both potion slots are empty keep buttons disabled
                potionOneDisabled = true;
            } else {
                const activeEffects = await ActiveStatus.findOne({ where: { spec_id: userID } });
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

        const attachment = await displayBossPic(boss, enemy, true);

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
                        stealPunish(enemy, user);
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
                if (currentLoadout) {
                    const weapon = await findMainHand(currentLoadout.mainhand, userID);
                    let dmgDealt = await userDamageLoadout(user, weapon);
                    if (isHidden === true) {
                        //BACKSTAB
                        dmgDealt = dmgDealt * 1.5;
                        isHidden = false;
                    } else await collInteract.deferUpdate();
                    await collector.stop();
                    hitOnce(dmgDealt, weapon, user, enemy, false);
                } else {
                    //Yeah thats funny, im not catching this case... why are you naked in the dungeon lol
                }
            }

            if (collInteract.customId === 'block') {
                await collInteract.deferUpdate();

                await collector.stop();
                blockAttack(enemy, user);
            }

            if (collInteract.customId === 'potone') {
                //Potion One Used!
                await collInteract.deferUpdate();
                const hasPotOne = await findPotionOne(currentLoadout.potionone, userID);
                await usePotOne(hasPotOne, user);
                await collector.stop();
                display();
            }
        });

        collector.on('end', () => {
            if (message) {
                message.delete();
            }
        });
    }

    //This method is used when a user fails to steal from an enemy resulting in being attacked
    async function stealPunish(enemy, user) {
        const eDamage = await enemyDamage(enemy);
        console.log(`Enemy damge: ${eDamage}`);
        takeDamage(eDamage, user, false);
    }

    async function hitOnce(dmgDealt, weapon, user, enemy, isBlocked) {
        let eHealth = enemy.health;
        const eDefence = enemy.defence;

        let Itype;
        if (!weapon) {
            Itype = 'NONE';
        } else {
            Itype = weapon.Type.toLowerCase();
            console.log('Weapon Type after toLowerCase(): ', Itype);

            const Etype = enemy.weakto.toLowerCase();
            console.log('Enemy Weakto after toLowerCase(): ', Etype);

            if (Itype === Etype) {
                dmgDealt *= 1.5;
                console.log('TYPE MATCH! dmgDealt: ', dmgDealt);
            }
        }

        let embedColour = 'NotQuiteBlack';
        let embedTitle = 'Damage Dealt';

        const pigmy = await Pigmy.findOne({ where: { spec_id: userID } });

        let spdUP = 0;
        let dexUP = 0;
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
        console.log(specialInfoForm('Current 2 hit chance: ', dhChance));

        const procCall1 = Math.random();
        console.log(specialInfoForm('RNG rolled for double hit: ', procCall1, '\n'));
        //specialInfoForm()
        //successResult()
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
            console.log(specialInfoForm('RNG rolled for crit chance: ', procCall2, '\n'));

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
            if ((eHealth - dmgDealt) <= boss.StageHealth) {
                console.log(specialInfoForm('ENEMY IS DEAD'));
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

                userSpecEEFilter.bKilledE.emit(`${userSpecEEFilter.BKE_UPK}`);
                return;
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
                await hitE(eHealth);
            }
            i++;
        } while (i < runCount)

        if (isBlocked === true) {
            return display();
        } else if (isBlocked === false) {
            const eDamage = await enemyDamage(enemy);
            console.log(`Enemy damge, not blocking: ${eDamage}`);
            return takeDamage(eDamage, user, false);
        }
    }

    //This method takes user defence and calculates reflect damage if defence is stronger than enemies attack
    async function blockAttack(enemy, user) {
        let eDamage = await enemyDamage(enemy);
        const dungeonUser = await ActiveDungeon.findOne({ where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
        const extraStats = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { activec: 'Tons' }] });
        var currentHealth = dungeonUser.currenthealth;
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

        let defence = 0;
        const currentLoadout = await Loadout.findOne({ where: { spec_id: userID } });
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

            const extraDefence = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { activec: 'Reinforce' }] });

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
                        .addFields({ name: 'DAMAGE TAKEN REDUCED BY: ', value: ' ' + blockStrength + ' ', inline: true });

                    await interaction.channel.send({ embeds: [dmgBlockedEmbed] }).then(async blockedEmbed => setTimeout(() => {
                        blockedEmbed.delete();
                    }, 15000)).catch(console.error);

                    return takeDamage(eDamage, user, true);
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

                    let ghostWeapon;
                    let counterDamage = (blockStrength * 0.25) + ((currentHealth * 0.02) * (user.strength * 0.4));
                    console.log(`counterDamage: ${counterDamage}`);

                    const counterEmbed = new EmbedBuilder()
                        .setTitle("Counter Attack!")
                        .setColor('DarkRed')
                        .addFields({ name: 'DAMAGE: ', value: ' ' + counterDamage + ' ', inline: true });

                    await interaction.channel.send({ embeds: [counterEmbed] }).then(async cntrEmbed => setTimeout(() => {
                        cntrEmbed.delete();
                    }, 15000)).catch(console.error);

                    return hitOnce(counterDamage, ghostWeapon, user, enemy, true);
                }
            } else {
                return takeDamage(eDamage, user, true);
            }
        } else if (!currentLoadout) {
            return takeDamage(eDamage, user, true);
        }
    }

    //========================================
    // This method calculates damage dealt to user 
    async function takeDamage(theEnemyDamage, user, isBlocked) {
        const dungeonUser = await ActiveDungeon.findOne({ where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
        const extraStats = await ActiveStatus.findOne({ where: [{ spec_id: userID }, { activec: 'Tons' }] });
        let currentHealth = dungeonUser.currenthealth;
        if (extraStats) {
            if (extraStats.duration > 0) {
                currentHealth += (extraStats.curreffect * 10);
            }
        }
        let eDamage = theEnemyDamage;

        if (isBlocked === true) {
            if ((currentHealth - eDamage) <= 0) {
                //Player has died =========================================================== HANDLE THIS DIFFERENTLY!!!!!!
                console.log(failureResult('PLAYER IS DEAD :O'));
                await hitP(0);
                userSpecEEFilter.bKilledE.emit(`${userSpecEEFilter.PKE_UPK}`);
                return;
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

            let defence = 0;
            const currentLoadout = await Loadout.findOne({ where: { spec_id: userID } });
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
                console.log(`EnemyDamage after defence: ${eDamage}`);
            }

            if (eDamage < 0) {
                eDamage = 0;
            }


            if ((currentHealth - eDamage) <= 0) {
                //Player has died =========================================================== HANDLE THIS DIFFERENTLY!!!!!!
                console.log(failureResult('PLAYER IS DEAD :O'));
                await hitP(0);
                userSpecEEFilter.bKilledE.emit(`${userSpecEEFilter.PKE_UPK}`);
                return;
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
        }
    }

    //========================================
    //this method updates the enemies health after being attacked and returns
    async function hitP(currentHealth) {
        const dealDmg = await ActiveDungeon.update({ currenthealth: currentHealth }, { where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
        if (dealDmg > 0) {
            console.log('Player Health has been updated');
            return;
        }
    }

    //========================================
    //this method updates the enemies health after being attacked and returns
    async function hitE(eHealth) {
        const dealDmg = await ActiveDungeonBoss.update({ health: eHealth }, { where: [{ specid: userID }, { constkey: constKey }] });
        if (dealDmg > 0) {
            console.log('Enemy Health has been updated');
            return;
        }
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
                const dungUser = await ActiveDungeon.findOne({ where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
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

                    const editRow = await ActiveDungeon.update({ currenthealth: newHealth }, { where: [{ dungeonspecid: userID }, { dungeonid: dungeonId }] });
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

module.exports = { loadDungeon };
