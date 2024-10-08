const { Collection, EmbedBuilder } = require('discord.js');
const { CombatInstance } = require('./Classes/CombatLoader');
const { EnemyFab } = require('./Classes/EnemyFab');

const {randArrPos, getTypeof, objectEntries, makePrettyNum} = require('../../../uniHelperFunctions');

const { checkingDamage, checkingDefence, uni_displayItem } = require('./itemStringCore');
const { checkInboundItem } = require('./itemMoveContainer');

const {enemyAttack} = require('./combatContainer');

const enemyTestList = require('./Json/newEnemyList.json');

/**
 * This function searches for an existing Collection Instance in the given Collection
 * for the given id, it creates one if not found.
 * @param {string} id Discord User ID
 * @param {Collection} loadedInstance Can be ``combatInstance | dungeonInstance``
 * @returns {CombatInstance} Player Instance Object
 */
const loadPlayer = (id, loadedInstance) => {
    if (loadedInstance.has(id)) return loadedInstance.get(id);
    let newInstance = new CombatInstance(id);
    loadedInstance.set(id, newInstance);
    return newInstance;
};

const loadPickedEnemy = (id, huntingLocation) => { 
    // Filter Enemy List for given id
    let enemyFab = enemyTestList.filter(enemy => enemy.ConstKey === id)[0];
    if (!enemyFab) console.log(`Enemy not found with ConstKey: ${id}`);
    const newEnemy = new EnemyFab(enemyFab, huntingLocation);
    return newEnemy;
};

const loadRandomEnemy = (lvl, enemies, huntingLocation) => {
    const enemyChoiceList = [];
    for (const [key, value] of enemies){
        if (value <= lvl) enemyChoiceList.push(key);
    }
    const idPicked = randArrPos(enemyChoiceList);
    const newEnemy = loadPickedEnemy(idPicked, huntingLocation);
    return newEnemy;
};

/**
 * This function locates a given enemy if provided, if not it selects one from a list
 * of level matching key,value pairs, and then randomly selects from that list
 * creating a new enemy. 
 * @param {number} pLvl Player Level
 * @param {Collection} enemies enemy level/id collection
 * @param {number} eID Defaults to false if not provided
 * @param {string} [huntingLocation="Wilds"] Set this to user location if currently hunting
 * @returns {EnemyFab}
 */
const loadEnemy = (pLvl, enemies, eID=false, huntingLocation="Wilds") => {
    let theEnemy;
    if (eID) theEnemy = loadPickedEnemy(eID, huntingLocation);
    else theEnemy = loadRandomEnemy(pLvl, enemies, huntingLocation);
    return theEnemy;
};

function checkAddDupeTypes(returnArr) {
    let typeArr = []; 
    let valueConst;
    // Collect all Type values and set current DMG||DEF type
    for (const Obj of returnArr) {
        for (let [key, value] of objectEntries(Obj)) {
            if (key === 'Type') typeArr.push(value);
            if (key === 'DMG' || key === 'DEF') valueConst = key;
        }
    }

    // Filter empty type values
    typeArr = typeArr.filter(t => typeof t !== 'undefined');

    // Filter to one of each type
    const singleTypeArr = [];
    for (const type of typeArr){
        if (singleTypeArr.indexOf(type) === -1) singleTypeArr.push(type);
    }

    const combArr = [];
    for (const type of singleTypeArr){
        const combVal = returnArr.filter(obj => obj.Type === type).reduce((acc, obj) => {
            return (acc > 0) ? acc + obj[`${valueConst}`] : obj[`${valueConst}`];
        }, 0);
        combArr.push({Type: type, [`${valueConst}`]: combVal});
    }

    return combArr;
}

const loadDamageItems = (mainhand, offhand) => {
    const emptyDmg = {Type: "True", DMG: 0};
    let returnDamage = [], mainhandDMG, offhandDMG;
    if (mainhand === 'NONE' && offhand === 'NONE') return [{Type: "True", DMG: 1}];

    mainhandDMG = (mainhand !== 'NONE') ? checkingDamage(mainhand): [emptyDmg];
    offhandDMG = (offhand !== 'NONE' && offhand !== mainhand) ? checkingDamage(offhand): [emptyDmg];
    
    returnDamage = mainhandDMG.concat(offhandDMG);
    returnDamage = checkAddDupeTypes(returnDamage);
    return returnDamage;
};

const loadDefenceItems = (loadout) => {
    console.log('Loading defence items!');
    const emptyDef = {Type: "True", DEF: 0};
    let returnDefence = [], offhandDEF, helmDEF, chestDEF, legsDEF;
    if (loadout.offhand === 'NONE' && loadout.headslot === 'NONE' && loadout.chestslot === 'NONE' && loadout.legslot === 'NONE') {
        console.log('Defence Loadout Empty!');
        return [emptyDef];
    }
    offhandDEF = (loadout.offhand === 'NONE') ? [emptyDef] : checkingDefence(loadout.offhand);
    helmDEF = (loadout.headslot === 'NONE') ? [emptyDef] : checkingDefence(loadout.headslot);
    chestDEF = (loadout.chestslot === 'NONE') ? [emptyDef] : checkingDefence(loadout.chestslot);
    legsDEF = (loadout.legslot === 'NONE') ? [emptyDef] : checkingDefence(loadout.legslot);

    returnDefence = offhandDEF.concat(helmDEF, chestDEF, legsDEF);
    returnDefence = checkAddDupeTypes(returnDefence);
    return returnDefence;
}

// ======================
//     COMBAT DISPLAY
// ======================

/**
 * This function generates an embed for the current combat turn, it displays
 * damage dealt, whether the enemy was killed, and to what the last amount of 
 * damage was dealt to.
 * @param {object} combOutcome Combat Outcome Object
 * @param {string} dmgDTo Damaged Type String
 * @param {object} condition Crit and Double Hit outcome object
 * @returns {EmbedBuilder} Display embed for the current combat turn
 */
function genAttackTurnEmbed(combOutcome, dmgDTo, condition){
    const turnReturnEmbed = new EmbedBuilder();

    let theOutcome = combOutcome.outcome;
    if (theOutcome !== 'Dead') {
        theOutcome = theOutcome.split(" ")[0] + " Damaged!";
    } else theOutcome = "Kills!";
    turnReturnEmbed.setTitle(`Attack: ${theOutcome}`);

    let damageFields = [], condStr = [];

    turnReturnEmbed.setColor('DarkOrange');
    if (condition.DH) {
        turnReturnEmbed.setColor('Aqua');
        condStr.push("Double", "Hit!");
    }
    if (condition.Crit) {
        turnReturnEmbed.setColor('LuminousVividPink');
        if (condStr.length > 0){
            condStr[1] = "Crit!";
        } else condStr.push("Critical Hit!");
    }

    if (condStr.length > 0) {
        condStr = condStr.join(" ");
        damageFields.push({name: condStr.toString(), value: "\u0020"});
    }

    if (!dmgDTo) dmgDTo = "Flesh";

    

    damageFields.push(
        {name: `Damage Dealt To **${dmgDTo}**:`, value: `**${makePrettyNum(Math.round(combOutcome.dmgDealt))}**`},
        {name: `Total Damage Dealt:`, value: `**${makePrettyNum(Math.round(combOutcome.finTot))}**`}
    );

    turnReturnEmbed.addFields(damageFields);

    return turnReturnEmbed;
}

/**
 * This function generates an embed to display all status effect damage and 
 * details for the current combat turn.
 * @param {object} statObj Contains all status effect details
 * @returns {EmbedBuilder} Constructed display embed for status effect details 
 */
function genStatusResultEmbed(statObj){
    const statEmbed = new EmbedBuilder()
    .setTitle(`__**Status Effects**__`)
    .setColor('DarkBlue');

    let descStr = "", finalFields = [];
    if (statObj.totalAcc > 0){
        descStr += "Status effect damage Dealt! ";

        finalFields.push({name: "Total Status Damage:", value: `${makePrettyNum(Math.round(statObj.totalAcc))}`});

        if (statObj.physAcc > 0){
            finalFields.push(
                {name: "Physical Damage:", value: `${makePrettyNum(Math.round(statObj.physAcc))}`}
            );
        }
        if (statObj.magiAcc > 0){
            finalFields.push(
                {name: "Magical Damage:", value: `${makePrettyNum(Math.round(statObj.magiAcc))}`}
            );
        }
        if (statObj.blastAcc > 0){
            finalFields.push(
                {name: "Blast Damage:", value: `${makePrettyNum(Math.round(statObj.blastAcc))}`}
            );
        }
    }

    if (statObj.newEffects.length > 0){
        descStr += (statObj.newEffects.length > 1) ? "New status effects applied! " : "New status effect applied! ";

        let fieldObj;
        for (const effect of statObj.newEffects){
            fieldObj = {name: "Effect:", value: `${effect.Effect}`, inline: true};
            finalFields.push(fieldObj);
        }
    }

    statEmbed.setDescription(descStr);
    statEmbed.addFields(finalFields);
    return statEmbed;
}

// ======================
//     COMBAT HANDLES
// ======================

/**
 * This function handles the enemy attacking the player, this allows for an attack
 * to be called from anywhere as needed.
 * @param {CombatInstance} player CombatInstance Object
 * @param {EnemyFab} enemy EnemyFab Object
 * @returns {promise <object>} {outcome: string, replyObj: object}
 */
async function handleEnemyAttack(player, enemy){
    const eAttackEmbed = new EmbedBuilder();

    let pOutcome = {health: player.health, outcome: "RELOAD"};

    const enemyAttacks = enemy.attack();
    if (enemyAttacks === "MISS"){
        eAttackEmbed
        .setTitle('Enemy Misses Attack!')
        .setDescription('You take no damage!');
    } else {
        const eAttackOutcome = enemyAttack(player.staticDefence, enemyAttacks, player);

        eAttackEmbed
        .setTitle('Enemy Attacks!')
        .setColor('DarkRed')
        .setDescription(`${eAttackOutcome.outcome}: ${eAttackOutcome.dmgTaken}`);

        pOutcome = player.takeDamage(eAttackOutcome.dmgTaken);
    }

    eAttackEmbed
    .addFields({name: "Your Health: ", value: `${pOutcome.health}`});

    return {outcome: pOutcome.outcome, replyObj: {embeds: [eAttackEmbed]}};
}

/**
 * This function fully handles an item being dropped, stored, saved, and displayed!
 * @param {Collection} gearDrops Collection Map of all droppable items
 * @param {CombatInstance} player CombatINstance Object
 * @param {EnemyFab} enemy EnemyFab Object
 * @param {(number|undefined)} forcedRar Forced rarity picked || Undefined
 * @returns {promise <EmbedBuilder>}
 */
async function dropItem(gearDrops, player, enemy, forcedRar){
    // Generate Item
    const rar = forcedRar ?? await player.rollItemRar(enemy);

    let choices = [];
    for (const [key, value] of gearDrops) {
        if (value === rar) choices.push(key);
    }

    const picked = randArrPos(choices);
    const theItem = await checkInboundItem(player.userId, picked);

    const itemEmbed = new EmbedBuilder()
    .setTitle('Loot Dropped');

    const grabbedValues = uni_displayItem(theItem, "Single");
    itemEmbed
    .setColor(grabbedValues.color)
    .addFields(grabbedValues.fields);

    return itemEmbed;
}

/**
 * This function handles compressing all enemy payout rewards into a single embed for 
 * a faster display time and reduces overall combat clutter.
 * @param {object[]} payoutList List of enemy reward embed/reply objects
 * @returns {Promise<EmbedBuilder>}
 */
async function enemyPayoutDisplay(payoutList){
    const embedList = [];
    for (const payObj of payoutList){
        if (getTypeof(payObj) === 'EmbedBuilder') {
            embedList.push(payObj);
            continue;
        }
        for (const embed of payObj.embeds){
            embedList.push(embed);
        }
    }
    // Order of embeds: [0: Unique Material, 1: Normal Material, 2: Item Dropped];

   const colourOrder = [0xdddddd, 0xc4c4c4, 0xffe8a4, 0xf9cda0, 0x72a3ad, 0x8d7bc3, 0xa64c78, 0x81200d, 0xe69036, 0xff0707, 0xff06ff, 0xffffff, 0x0000ff, 0x033A57, 0x001620, 0xA8CF84, 0xC7A522, 0x440203, 0x9C32B8, 0x88EAFE, 0xA02FA0];

    const combEmbed = new EmbedBuilder()
    .setTitle('== **Enemy Drops** ==');

    let cPriority = 0;
    for (const embed of embedList){
        combEmbed.addFields({name: `${embed.data.title}\n${embed.data.fields[0].name}: `, value: `\n\n${embed.data.fields[0].value}`, inline: true});
        if (colourOrder.indexOf(embed.data.color) > cPriority) cPriority = colourOrder.indexOf(embed.data.color);
    }

    const embedColour = colourOrder[cPriority];
    combEmbed.setColor(embedColour);

    return combEmbed;
}

module.exports = {
    loadPlayer,
    loadEnemy,
    loadDamageItems,
    loadDefenceItems,
    genAttackTurnEmbed,
    genStatusResultEmbed,
    handleEnemyAttack,
    dropItem,
    enemyPayoutDisplay
}