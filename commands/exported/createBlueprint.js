const chalk = require('chalk');

const warnedForm = chalk.bold.yellowBright;
//console.log(warnedForm('Testing warning here!'));
const errorForm = chalk.bold.redBright.bgWhite;
//console.log(errorForm('Testing error here!'));
const successResult = chalk.italic.whiteBright.bgGreen;
//console.log(successResult('Testing success here!'));
const failureResult = chalk.italic.whiteBright.dim.bgRed;
//console.log(failureResult('Testing failure here!'));
const basicInfoForm = chalk.dim.whiteBright.bgBlackBright;
//console.log(basicInfoForm('Testing basic info here!'));
const specialInfoForm = chalk.bold.cyan.bgBlackBright;
//console.log(specialInfoForm('Testing special info here!'));

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

module.exports = { createNewBlueprint };