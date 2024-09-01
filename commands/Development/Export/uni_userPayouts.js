const { EmbedBuilder } = require("discord.js");
const { sendTimedChannelMessage } = require("../../../uniHelperFunctions");
const { checkHintLevelOneHundred, checkHintLevelThirty, checkHintLevelFive } = require("../../Game/exported/handleHints");
const { checkUnlockedBluey } = require("../../Game/exported/createBlueprint");
const { Pighouse, Milestones, ActiveDungeon } = require("../../../dbObjects");
const {chlkPreset} = require('../../../chalkPresets');
const { checkLevelBlueprint } = require("./blueprintFactory");

/**
 * This method uses the given level to output the required xp needed to reach the next
 * level.
 * @param {number} level Level being checked
 * @returns {number} Required xp to reach the next level (level + 1)
 */
const lvlScaleCheck = (level) => {
    let baseScale = 50, baseLvlMult = (Math.pow(level, 2) - 1), addScale = 0;

    if (level === 20){
        baseScale = 75;
    } else if (level >= 100){
        baseScale = 75;
        addScale = 10 * Math.floor(level / 3);
    } else if (level > 20){
        baseScale = 75;
        addScale = 1.5 * Math.floor(level / 5);
    }

    return Math.floor((baseScale + addScale) * baseLvlMult);
};

/**
 * This method calculates the needed xp to reach the next level and returns it.
 * @param {number} level Pigmy Level being checked
 * @returns {number} Required xp to reach the next level (level + 1)
 */
const pigLvlScaleCheck = (level) => {
    return Math.floor(50 * (Math.pow(level, 2) - 1));
}

/**
 * This function handles all needed checks for leveling up, and handles updating all values
 * where/when needed.
 * @param {number} xp New xp to be added
 * @param {number} coin New coins to be added
 * @param {object} interaction Discord Interaction Object
 * @param {object} user UserData DB Instance Entry Object
 * @returns {promise <void>}
 */
async function handleUserPayout(xp, coin, interaction, user){
    let totalXP = Math.round(user.xp + xp);
    let newLevel = user.level;
    const totalCoin = Math.round(user.coins + coin);

    const isDreaming = async (user) => {
        if (user.level < 100) return true;
        const m = await Milestones.findOne({where: {userid: user.userid}});
        if (m?.currentquestline !== "Dream") return true;
        const d = await ActiveDungeon.findOne({where: {dungeonspecid: user.userid, dungeonid: 9, completed: true}});
        // Additional Check for Fayrn complete
        return !!d;
    };

    const lvlUpOutcome = (await isDreaming(user)) 
    ? (user.level === 100) ? "No Level" : handleLevelCheck(totalXP, user) 
    : "No Level"; // Handle post dream lvl 100+ here

    if (lvlUpOutcome !== "No Level"){
        await sendTimedChannelMessage(interaction, 45000, {embeds: [lvlUpOutcome.embeds]});
        if (lvlUpOutcome.level >= 100){
            await checkHintLevelOneHundred(user, interaction);
        } else if (lvlUpOutcome.level >= 30){
            await checkHintLevelThirty(user, interaction);
        } else if (lvlUpOutcome.level >= 5){
            await checkHintLevelFive(user, interaction);
        }
        // ADD CHECK HINT LVL: 10, 15, 25
        totalXP = lvlUpOutcome.xp;
        newLevel = lvlUpOutcome.level;
        const bpOutcome = await checkLevelBlueprint(user, interaction.client.masterBPCrafts, interaction);
        // await checkUnlockedBluey(newLevel, user.userid, interaction);
        if (typeof bpOutcome !== 'string' && bpOutcome.length > 0){
            let finalValue = 'Blueprint: \n';
            for (const bp of bpOutcome){
                finalValue += `${bp.name}\n`;
            }

            const theField = {name: '== Unlocks ==', value: finalValue};
            const bpUnlockEmbed = new EmbedBuilder()
            .setTitle('Blueprints Unlocked')
            .setColor('Blurple')
            .addFields(theField);

            await sendTimedChannelMessage(interaction, 45000, bpUnlockEmbed);
        }
        await addPoints(user, lvlUpOutcome.points);
    }

    await updateUserBasics(totalXP, totalCoin, newLevel, user);

    return;
}

/**
 * This function handles checking if the given user will level up, and how many times.
 * It will create and return an embed if there is a level up, "No Level" if not.
 * @param {number} totXP Current total user xp
 * @param {object} user UserData DB Instance Entry Object
 * @returns {(object|string)} ```{embeds: EmbedBuilder(), xp: number, level: number, points: number}``` || "No Level"
 */
function handleLevelCheck(totXP, user){
    let reqXP = lvlScaleCheck(user.level);

    console.log(`XP for next Level/Current XP: ${chlkPreset.bInfoOne(`${totXP} / ${reqXP}`)}`);

    let newLvl = user.level;
    // Check for level up
    if (reqXP <= totXP){
        // User Levels UP!!
        let lvlCount = 0;
        do {
            console.log(`Level Up! ${chlkPreset.bInfoTwo(newLvl)}`);
            totXP -= reqXP;
            newLvl++;
            reqXP = lvlScaleCheck(newLvl);
            lvlCount++;
        } while (reqXP <= totXP);

        console.log(`XP for next Level/Current XP: ${chlkPreset.bInfoOne(`${totXP} / ${reqXP}`)}`);

        let embedDesc = (lvlCount > 1) ? `You leveled up ${lvlCount} times!` : `You leveled up!`;
        embedDesc += '\nUse the command ``/addpoint`` to spend your new points!!';
        embedDesc += `\n\nLevel ==> *New* Level: **${user.level}** ==> **${newLvl}**`;

        const lvlUpEmbed = new EmbedBuilder()
        .setTitle("~== **LEVEL UP** ==~")
        .setColor('Blurple')
        .setDescription(embedDesc);

        return {embeds: lvlUpEmbed, xp: totXP, level: newLvl, points: lvlCount};
    } else return "No Level";
}

/**
 * This function increments the users current point total by the amount of newPoints given.
 * It then saves and reloads the user object to retain updated values.
 * @param {object} user UserData DB Instance Entry Object
 * @param {number} newPoints Amount of points to add
 * @returns {promise <void>}
 */
async function addPoints(user, newPoints){
    return await user.increment('points', {by: newPoints}).then(async u => await u.save()).then(async u => {return await u.reload()});
}

/**
 * This function updates all given values for level, coins, and xp.
 * It then saves and reloads the user object to retain updated values.
 * @param {number} xp Total XP
 * @param {number} coin Total Coins
 * @param {number} level Current Level
 * @param {object} user UserData DB Instance Entry Object
 * @returns {promise <void>}
 */
async function updateUserBasics(xp, coin, level, user){
    return await user.update({level: level, coins: coin, xp: xp}).then(async u => await u.save()).then(async u => {return await u.reload()});
}

/**
 * This function increments the given users coins by the amount of coins given.
 * @param {number} coin Amount of coins gained
 * @param {object} user UserData Instance Object
 * @returns {Promise<void>}
 */
async function updateUserCoins(coin, user){
    return await user.increment('coins', {by: coin}).then(async u => await u.save()).then(async u => {return await u.reload()});
}

/**
 * This function decrements the given users coins by the amount of coins spent.
 * @param {number} cost Amount of coins spent
 * @param {object} user UserData Instance Object
 * @returns {Promise<void>}
 */
async function spendUserCoins(cost, user){
    return await user.decrement('coins', {by: cost}).then(async u => await u.save()).then(async u => {return await u.reload()});
}

/**
 * This function handles/displays all pigmy related payouts where/when needed.
 * @param {number} xp Gained XP
 * @param {object} pigmy Pigmy DB Instance Entry Object
 * @param {object} interaction Discord Interaction Object
 * @param {boolean} claimed True if function called from claim
 * @returns {promise<void>}
 */
async function handlePigmyPayouts(xp, pigmy, interaction, claimed){
    let totalXP = Math.round(pigmy.exp + xp);
    let newLevel = pigmy.level;
    
    const pigUpOutcome = handlePigLevelCheck(totalXP, pigmy);
    if (pigUpOutcome !== "No Level"){
        await sendTimedChannelMessage(interaction, 45000, {embeds: [pigUpOutcome.embeds]});
        totalXP = pigUpOutcome.xp;
        newLevel = pigUpOutcome.level;
    }

    await updatePigmyValues(totalXP, newLevel, pigmy, claimed);

    return;
}

/**
 * This function handles all checks needed for a pigmy leveling up, doing so until
 * it can no longer level up. If it could not level up returns "No Level". 
 * @param {number} totXP Total pigmy xp
 * @param {object} pigmy Pigmy DB Instance Entry Object
 * @returns {(object|string)}
 */
function handlePigLevelCheck(totXP, pigmy){
    let reqXP = pigLvlScaleCheck(pigmy.level);

    let newLvl = pigmy.level;
    if (reqXP <= totXP){
        let lvlCount = 0;
        do {
            totXP -= reqXP;
            newLvl++;
            reqXP = pigLvlScaleCheck(newLvl);
            lvlCount++;
        } while (reqXP <= totXP);

        let embedDesc = (lvlCount > 1) ? `${pigmy.name} leveled up ${lvlCount} times!` : `${pigmy.name} leveled up!`;
        embedDesc += `\n\nLevel ==> *New* Level: **${pigmy.level}** ==> **${newLvl}**`;

        const lvlUpEmbed = new EmbedBuilder()
        .setTitle("~== **PIGMY LEVEL UP** ==~")
        .setColor('Blurple')
        .setDescription(embedDesc);

        return {embeds: lvlUpEmbed, xp: totXP, level: newLvl};
    } else return "No Level";
}

/**
 * This function handles updating relavent pigmy values as well as matching Pighouse 
 * values. If claimed, updates lcm to represent the current time being the most recent 
 * claim made.
 * @param {number} xp total XP
 * @param {number} level New Pigmy Level
 * @param {object} pigmy Pigmy DB Instance Entry Object
 * @param {boolean} claimed True if function chain called from claiming
 * @returns {promise<void>}
 */
async function updatePigmyValues(xp, level, pigmy, claimed){
    const pigRef = await Pighouse.findOne({where: {spec_id: pigmy.spec_id, refid: pigmy.refid}});
    await pigRef.update({exp: xp, level: level}).then(async p => await p.save()).then(async p => {return await p.reload()});
    await pigmy.update({exp: xp, level: level}).then(async p => await p.save()).then(async p => {return await p.reload()});

    if (claimed){
        const lastClaim = new Date(pigmy.updatedAt).getTime();
        await pigmy.update({lcm: lastClaim}).then(async p => await p.save()).then(async p => {return await p.reload()});
    }

    return;
}

module.exports = {lvlScaleCheck, handleUserPayout, handlePigmyPayouts, updateUserCoins, spendUserCoins};