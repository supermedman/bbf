const { Collection, EmbedBuilder } = require("discord.js");
const { OwnedBlueprints } = require("../../../dbObjects");
const { randArrPos, sendTimedChannelMessage } = require("../../../uniHelperFunctions");
const { checkHintPotionBluey, checkHintToolBluey, checkHintViewBluey } = require("../../Game/exported/handleHints");
const { grabRar } = require("../../Game/exported/grabRar");

/**
 * This function handles checking all level unlocked bps not owned by the given user.
 * returns ``No Unlocks`` if unowned list is empty
 * @param {object} user UserData Instance Object
 * @param {Collection} bpList Discord Cache: BP Master List
 * @param {object} interaction Base Discord Interaction Object
 * @returns {Promise<object[] | string>}
 */
async function checkLevelBlueprint(user, bpList, interaction){
    console.log('CHECKING LEVEL BLUEY');
    const userBPS = await OwnedBlueprints.findAll({where: {spec_id: user.userid}});
    if (userBPS.length === 0) userBPS.push({name: "None"});

    const crossCheckOwned = (bp) => userBPS.some(uBP => uBP.blueprintid !== bp.BlueprintID);
    const levelReqList = bpList.filter(bp => bp.Level <= user.level && !crossCheckOwned(bp) && !bp.Drop && bp.Unlock);
    if (levelReqList.size === 0) return "No Unlocks";

    const addedBPList = [];
    for (const [key, bp] of levelReqList){
        // console.log('== BP LEVEL UNLOCK ==');
        // console.log(key);
        // console.log(bp);
        // console.log('=====================');
        const createdBP = await dropBlueprint(bp, user, interaction);
        if (createdBP !== 'Dupe') addedBPList.push(createdBP);
    }

    return addedBPList;
}

/**
 * This function drops a random unowned bp, returns ``No Match`` if unowned list is empty
 * @param {object} user UserData Instance Object
 * @param {Collection} bpList Discord Cache: BP Master List
 * @param {object} interaction Base Discord Interaction Object
 * @returns {Promise <object | string>}
 */
async function rollRandBlueprint(user, bpList, interaction){
    console.log('ROLLING RAND BLUEY');
    /**@type {object[]} */
    const userBPS = await OwnedBlueprints.findAll({where: {spec_id: user.userid}});
    if (userBPS.length === 0) userBPS.push({name: "None", blueprintid: 0});

    // Convert Owned BPs to single entry number array contain all owned blueprintids
    const ownedBpIDs = userBPS.map(bp => bp.blueprintid);

    /**@typedef {{Name: string, Drop: boolean, Unlock: boolean, BlueprintID: number, Level: number, Rar_id: number}} BaseBP */

    /**@param {BaseBP} bp */
    const hasLevelReq = bp => bp.Level <= user.level;
    /**@param {BaseBP} bp */
    const bpIsOwned = bp => ownedBpIDs.includes(bp.BlueprintID);
    /**@param {BaseBP} bp */
    const isDropable = bp => bp.Drop && bp.Unlock;

    /**@param {BaseBP} bp */
    const isAvailable = bp => {
        return hasLevelReq(bp) && !bpIsOwned(bp) && isDropable(bp);
    };

    // const crossCheckOwned = (bp) => userBPS.some(uBP => uBP.blueprintid !== bp.BlueprintID);
    const levelReqList = bpList.filter(bp => isAvailable(bp));
    if (levelReqList.size === 0) return "No Match";

    const rolledRarity = grabRar(user.level);

    /**
     * This function filters blueprints surpassing the rolled rarity limit
     * @param {number} r Rar_id Number value
     * @param {BaseBP} bp BaseBlueprint
     * @returns {boolean}
     */
    const isUnderRarLimit = (r, bp) => bp.Rar_id <= r;
    /**@type {Collection<string, BaseBP>} */
    const rarFilteredList = levelReqList.filter(bp => isUnderRarLimit(rolledRarity, bp));
    if (rarFilteredList.size === 0) return "No Match";

    const pickFromArray = [];
    for (const [key, bp] of rarFilteredList){
        pickFromArray.push(bp);
    }

    const bpPicked = randArrPos(pickFromArray);

    const theBP = await dropBlueprint(bpPicked, user, interaction);

    const theField = {name: '== Drops ==', value: `Blueprint Name: ${theBP.name}\nBlueprint Type: ${theBP.passivecategory}\nBlueprint Rarity: ${bpPicked.Rarity}`};
    const bpUnlockEmbed = new EmbedBuilder()
    .setTitle('New Blueprint Dropped')
    .setColor('Blurple')
    .addFields(theField);

    await sendTimedChannelMessage(interaction, 45000, bpUnlockEmbed);

    return theBP;
}

/**
 * This function attempts to create a new blueprint entry from the given bp ref,
 * 
 * if a dupe is found returns ``Dupe``.
 * @param {object} bpRef Single BP Ref JSON Object
 * @param {object} user UserData Instance Object
 * @param {object} interaction Base Discord Interaction Object
 * @returns {Promise <object | string>}
 */
async function dropBlueprint(bpRef, user, interaction){
    await checkHintViewBluey(user, interaction);
    const passiveCheck = (bpRef.PotionID) ? "Potion" : "Tool";
    switch(passiveCheck){
        case "Potion":
            await checkHintPotionBluey(user, interaction);
        break;
        case "Tool":
            await checkHintToolBluey(user, interaction);
        break;
    }

    let theBluey = await OwnedBlueprints.findOrCreate({
        where: {
            name: bpRef.Name,
            spec_id: user.userid
        },
        defaults: {
            onlyone: (!bpRef.Dupe) ? true : false,
            passivecategory: passiveCheck,
            blueprintid: bpRef.BlueprintID
        }
    });

    if (theBluey[1]){
        await theBluey[0].save().then(async b => {return await b.reload()});
    } else return "Dupe";

    theBluey = theBluey[0];

    return theBluey;
}

/**
 * This function grabs the requested BPRef Obj from the master list and returns it.
 * @param {Collection} bpList Discord Cache: BP Master List
 * @param {number} bpID Wanted BPID
 * @returns {object}
 */
function grabBPRef(bpList, bpID){
    for (const [key, value] of bpList){
        if (value.BlueprintID === bpID){
            return value;
        }
    }
}


module.exports = {
    checkLevelBlueprint,
    rollRandBlueprint,
    dropBlueprint,
    grabBPRef
}