const { EmbedBuilder } = require('discord.js');

const {
    warnedForm,
    errorForm,
    successResult,
    failureResult,
    basicInfoForm,
    specialInfoForm
} = require('../../../chalkPresets.js');

const blueprintList = require('../../../events/Models/json_prefabs/blueprintList.json');

const { OwnedBlueprints, UserData } = require('../../../dbObjects.js');

const { checkHintPotionBluey, checkHintToolBluey, checkHintUniqueBluey, checkHintViewBluey } = require('./handleHints.js');

async function createNewBlueprint(BPID, userID) {
    const foundBP = await OwnedBlueprints.findOne({ where: [{ spec_id: userID }, { blueprintid: BPID }] });
    if (foundBP) return console.log(failureResult('BluePrint Already exists!'));

    let blueprintFound;
    for (var i = 0; i < blueprintList.length; i++) {
        if (blueprintList[i].BlueprintID === BPID) {
            //Blueprint found adding now
            blueprintFound = blueprintList[i];
        } else {/**KEEP LOOKING NOT FOUND*/}
    }

    if (!blueprintFound) return console.log(errorForm('BLUEPRINT NOT FOUND'));
    //console.log(successResult('BLUEPRINT FOUND'));

    let thisIsBool = false;
    if (blueprintFound.Rarity === 'Unique') {
        thisIsBool = true;
    }
    if (blueprintFound.OnlyOne === true) {
        thisIsBool = true;
    }

    try {
        const newBP = await OwnedBlueprints.create({
            name: blueprintFound.Name,
            onlyone: thisIsBool,
            passivecategory: blueprintFound.PassiveCategory,
            blueprintid: blueprintFound.BlueprintID,
            spec_id: userID,
        });

        if (newBP) {
            //Blueprint added successfully!
            //console.log(successResult('NEW BLUEPRINT ADDED!'));
            //const theBlueprint = await OwnedBlueprints.findOne({
            //    where: [{ blueprintid: BPID }, { spec_id: userID }]
            //});

            //console.log(specialInfoForm('theBlueprint: ', theBlueprint));
            return;
        }

    } catch (err) {
        return console.error('AN ERROR HAS OCCURED: ', err);
    }
}

async function dropRandomBlueprint(level, userID, interaction) {
    const levelUnlockedBPList = blueprintList.filter(bluey => bluey.UseLevel <= level);
    if (levelUnlockedBPList.length > 0) {
        const userBPList = await OwnedBlueprints.findAll({ where: { spec_id: userID } });
        if (!userBPList) {
            console.log(warnedForm('USER HAS NO BLUEPRINTS!'));
        } else {
            const droppedFilter = levelUnlockedBPList.filter(bluey => (bluey.IsUnlocked === true) && (bluey.IsDropped === true));
            if (droppedFilter.length <= 0) return console.log(errorForm('SOMETHING WENT WRONG DURING DROPPED FILTER!'));
            //if (arr.some((arrVal) => filter.callback.id === arrVal.id)) 
            //if true convert to false
            //if false convert to true
            //return
            //return userBPList.some((BPID) => bluey.BlueprintID === BPID.blueprintid)       
            const notOwnedFilter = droppedFilter.filter(bluey => {
                if (userBPList.some((BPID) => bluey.BlueprintID === BPID.blueprintid)) {
                    return false;
                } else return true;                      
            });
            //console.log(basicInfoForm('notOwnedFilter length: ', notOwnedFilter.length));
            if (notOwnedFilter.length <= 0) return console.log(warnedForm('No unowned blueprints found!'));

            const randChoice = Math.floor(Math.random() * notOwnedFilter.length);
            const BPID = notOwnedFilter[randChoice].BlueprintID;

            let blueprintFound;
            for (var i = 0; i < blueprintList.length; i++) {
                if (blueprintList[i].BlueprintID === BPID) {
                    //Blueprint found adding now
                    blueprintFound = blueprintList[i];
                } else {/**KEEP LOOKING NOT FOUND*/ }
            }

            if (!blueprintFound) return console.log(errorForm('BLUEPRINT NOT FOUND'));
            //console.log(successResult('BLUEPRINT FOUND'));

            const user = await UserData.findOne({ where: { userid: userID } });

            let thisIsBool = false;
            if (blueprintFound.Rarity === 'Unique') {
                thisIsBool = true;
                await checkHintUniqueBluey(user, interaction);
            }
            if (blueprintFound.OnlyOne === true) {
                thisIsBool = true;
            }

            let newBP;
            try {
                await OwnedBlueprints.create({
                    name: blueprintFound.Name,
                    onlyone: thisIsBool,
                    passivecategory: blueprintFound.PassiveCategory,
                    blueprintid: blueprintFound.BlueprintID,
                    spec_id: userID,
                });

                const theBlueprint = await OwnedBlueprints.findOne({
                    where: [{ blueprintid: BPID }, { spec_id: userID }]
                });

                if (theBlueprint) {
                    //Blueprint added successfully!
                    //console.log(successResult('NEW BLUEPRINT ADDED!'));
                    //console.log(specialInfoForm('theBlueprint: ', theBlueprint));
                    newBP = theBlueprint;
                }

            } catch (err) {
                return console.log(errorForm('AN ERROR HAS OCCURED: ', err));
            }

            if (newBP.passivecategory === 'Potion') {
                await checkHintPotionBluey(user, interaction);
            }
            if (newBP.passivecategory === 'Tool') {
                await checkHintToolBluey(user, interaction);
            }

            const list = `Blueprint Type: ${newBP.passivecategory} \nBlueprint Level: ${blueprintFound.UseLevel}`

            const blueyEmbed = new EmbedBuilder()
                .setTitle('~BLUEPRINT UNLOCKED~')
                .addFields({
                    name: `${newBP.name}`, value: list,
                });

            return await interaction.channel.send({ embeds: [blueyEmbed] }).then(async embedMsg => setTimeout(() => {
                embedMsg.delete();
            }, 90000));
        }
    } else {
        console.log(warnedForm('NO BLUEPRINTS CAN DROP'));
    }
}

async function checkUnlockedBluey(level, userID, interaction) {
    const levelBPs = blueprintList.filter(bluey => bluey.UseLevel <= level);
    if (levelBPs.length > 0) {
        //Blueprints NEED checking
        const userBPs = await OwnedBlueprints.findAll({ where: { spec_id: userID } });
        if (!userBPs) {
            console.log(warnedForm('USER HAS NO BLUEPRINTS!'));
            const firstFilter = levelBPs.filter(bluey => (bluey.IsUnlocked === true) && (bluey.IsDropped === false));
            if (!firstFilter) return console.log(errorForm('SOMETHING WENT WRONG WHILE FILTERING!!'));
            await itterateMakeBluey(firstFilter, firstFilter.length, userID, interaction);
        } else {
            const firstFilter = levelBPs.filter(bluey => (bluey.IsUnlocked === true) && (bluey.IsDropped === false));
            const secondFilter = firstFilter.filter(bluey => {
                if (userBPs.some((BPID) => bluey.BlueprintID === BPID.blueprintid)) {
                    return false;
                } else return true;
                //return userBPs.some((BPID) => bluey.BlueprintID !== BPID.blueprintid)
            });
            console.log(basicInfoForm('secondFilter results: ', secondFilter.length));

            if (secondFilter.length <= 0) return console.log(errorForm('SOMETHING WENT WRONG WHILE FILTERING!!'));
            await itterateMakeBluey(secondFilter, secondFilter.length, userID, interaction);
        }
    } else {
        //No blueprints to check
        console.log(specialInfoForm('NO BLUEPRINTS FOR LEVELS'));
    }
}

async function itterateMakeBluey(unlockedList, runCount, userID, interaction) {
    const user = await UserData.findOne({ where: { userid: userID } });
    await checkHintViewBluey(user, interaction);
    let curRun = 0;
    do {
        try {
            const copyCheck = await OwnedBlueprints.findOne({
                where: [{ spec_id: userID }, { blueprintid: unlockedList[curRun].BlueprintID }]
            });

            if (copyCheck) {
                curRun++;
            } else {
                let thisIsBool = false;
                if (unlockedList[curRun].Rarity === 'Unique') {
                    thisIsBool = true;
                    await checkHintUniqueBluey(user, interaction);
                }
                if (unlockedList[curRun].OnlyOne === true) {
                    thisIsBool = true;
                }

                const newBP = await OwnedBlueprints.create({
                    name: unlockedList[curRun].Name,
                    onlyone: thisIsBool,
                    passivecategory: unlockedList[curRun].PassiveCategory,
                    blueprintid: unlockedList[curRun].BlueprintID,
                    spec_id: userID,
                });

                if (newBP) {
                    //Blueprint added successfully!
                    console.log(successResult('NEW BLUEPRINT ADDED!'));
                    const theBlueprint = await OwnedBlueprints.findOne({
                        where: [{ blueprintid: unlockedList[curRun].BlueprintID }, { spec_id: userID }]
                    });

                    console.log(specialInfoForm('theBlueprint: ', theBlueprint));

                    const list = `Blueprint Type: ${unlockedList[curRun].PassiveCategory} \nBlueprint Level: ${unlockedList[curRun].UseLevel}`

                    if (unlockedList[curRun].passivecategory === 'Potion') {
                        await checkHintPotionBluey(user, interaction);
                    }
                    if (unlockedList[curRun].passivecategory === 'Tool') {
                        await checkHintToolBluey(user, interaction);
                    }

                    const blueyEmbed = new EmbedBuilder()
                        .setTitle('~BLUEPRINT UNLOCKED~')
                        .addFields({
                            name: `${unlockedList[curRun].Name}`, value: list,
                        });

                    await interaction.channel.send({ embeds: [blueyEmbed] }).then(async embedMsg => setTimeout(() => {
                        embedMsg.delete();
                    }, 90000));
                    curRun++;
                }
            }
        } catch (err) {
            return console.log(errorForm('AN ERROR HAS OCCURED: ', err));
        }
    } while (curRun < runCount) 
}

module.exports = { createNewBlueprint, checkUnlockedBluey, dropRandomBlueprint };
