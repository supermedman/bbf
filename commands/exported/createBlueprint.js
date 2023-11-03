const { EmbedBuilder } = require('discord.js');

const {
    warnedForm,
    errorForm,
    successResult,
    failureResult,
    basicInfoForm,
    specialInfoForm
} = require('../../chalkPresets.js');

const blueprintList = require('../../events/Models/json_prefabs/blueprintList.json');

const { OwnedBlueprints } = require('../../dbObjects.js');

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
    console.log(successResult('BLUEPRINT FOUND'));

    let thisIsBool = false;
    if (blueprintFound.Rarity === 'Unique') {
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
            console.log(successResult('NEW BLUEPRINT ADDED!'));
            const theBlueprint = await OwnedBlueprints.findOne({
                where: [{ blueprintid: BPID }, { spec_id: userID }]
            });

            console.log(specialInfoForm('theBlueprint: ', theBlueprint));
        }

    } catch (err) {
        return console.log(errorForm('AN ERROR HAS OCCURED: ', err));
    }
}

async function checkUnlockedBluey(level, userID, interaction) {
    const levelBPs = blueprintList.filter(bluey => bluey.UseLevel <= level);
    if (levelBPs.length > 0) {
        //Blueprints NEED checking
        const userBPs = await OwnedBlueprints.findAll({ where: { spec_id: userID } });
        if (!userBPs) {
            console.log(warnedForm('USER HAS NO BLUEPRINTS!'));
        } else {
            const firstFilter = levelBPs.filter(bluey => (bluey.IsUnlocked === true) && (bluey.IsDropped === false));
            const secondFilter = firstFilter.filter(bluey => bluey.BlueprintID !== userBPs.blueprintid);
            console.log(basicInfoForm('secondFilter results: ', secondFilter));

            if (!secondFilter) return console.log(errorForm('SOMETHING WENT WRONG WHILE FILTERING!!'));
            await itterateMakeBluey(secondFilter, secondFilter.length, userID, interaction);
        }
    } else {
        //No blueprints to check
        console.log(specialInfoForm('NO BLUEPRINTS FOR LEVELS'));
    }
}

async function itterateMakeBluey(unlockedList, runCount, userID, interaction) {
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

module.exports = { createNewBlueprint, checkUnlockedBluey };
