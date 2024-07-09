const { Collection } = require('discord.js');
const { CombatInstance } = require('./Classes/CombatLoader');
const { EnemyFab } = require('./Classes/EnemyFab');

const { checkingDamage, checkingDefence } = require('./itemStringCore');

const enemyTestList = require('./Json/newEnemyList.json');

const randArrPos = (arr) => {
    return arr[(arr.length > 1) ? Math.floor(Math.random() * arr.length) : 0];
};

/**
 * This function searches for an existing combatInstance for the given id,
 * it creates one if not found.
 * @param {string} id Discord User ID
 * @param {Collection} combatInstance combat instance collection
 * @returns {CombatInstance} Player Instance Object
 */
const loadPlayer = (id, combatInstance) => {
    if (combatInstance.has(id)) return combatInstance.get(id);
    let newInstance = new CombatInstance(id);
    combatInstance.set(id, newInstance);
    return newInstance;
};

const loadPickedEnemy = (id) => {
    // Filter Enemy List for given id
    let enemyFab = enemyTestList.filter(enemy => enemy.ConstKey === id)[0];
    if (!enemyFab) console.log(`Enemy not found with ConstKey: ${id}`);
    const newEnemy = new EnemyFab(enemyFab);
    return newEnemy;
};

const loadRandomEnemy = (lvl, enemies) => {
    const enemyChoiceList = [];
    for (const [key, value] of enemies){
        if (value <= lvl) enemyChoiceList.push(key);
    }
    const idPicked = randArrPos(enemyChoiceList);
    const newEnemy = loadPickedEnemy(idPicked);
    return newEnemy;
};

/**
 * This function locates a given enemy if provided, if not it selects one from a list
 * of level matching key,value pairs, and then randomly selects from that list
 * creating a new enemy. 
 * @param {number} pLvl Player Level
 * @param {Collection} enemies enemy level/id collection
 * @param {number} eID Defaults to false if not provided
 * @returns {EnemyFab}
 */
const loadEnemy = (pLvl, enemies, eID=false) => {
    let theEnemy;
    if (eID) theEnemy = loadPickedEnemy(eID);
    else theEnemy = loadRandomEnemy(pLvl, enemies);
    return theEnemy;
};

function* objectEntries(obj) {
    for (let key of Object.keys(obj)) {
        yield [key, obj[key]];
    }
}

function checkAddDupeTypes(returnArr) {
    let typeArr = []; 
    let valueConst;
    for (const Obj of returnArr) {
        for (let [key, value] of objectEntries(Obj)) {
            if (key === 'Type') typeArr.push(value);
            if (key === 'DMG' || key === 'DEF') valueConst = key;
        }
    }

    let dupeCheck = [], tmpArr = [];
    for (const type of typeArr){
        if (tmpArr.indexOf(type) !== -1 && dupeCheck.indexOf(type) === -1){
            dupeCheck.push(type);
            continue;
        }
        tmpArr.push(type);
    }

    let addedValues = [];
    if (dupeCheck.length > 0){
        for (const type of dupeCheck){
            const addValue = returnArr.filter(obj => obj.Type === type).reduce((acc, obj) => {
                return (acc > 0) ? acc + obj[`${valueConst}`] : obj[`${valueConst}`];
            }, 0);
            if (valueConst === 'DMG') addedValues.push({Type: type, DMG: addValue});
            if (valueConst === 'DEF') addedValues.push({Type: type, DEF: addValue});
        }
    }

    if (addedValues.length > 0){
        returnArr = returnArr.filter(obj => addedValues.some(moddedVal => obj.Type !== moddedVal.Type));
        returnArr = returnArr.concat(addedValues);
        //returnDamage.sort((a,b) => b.DMG - a.DMG);
    }

    return returnArr;
}

const loadDamageItems = (mainhand, offhand) => {
    const emptyDmg = {Type: "True", DMG: 0};
    let returnDamage = [], mainhandDMG, offhandDMG;
    if (mainhand === 'None' && offhand === 'None') return [emptyDmg];

    mainhandDMG = (mainhand !== 'None') ? checkingDamage(mainhand): [emptyDmg];
    offhandDMG = (offhand !== 'None') ? checkingDamage(offhand): [emptyDmg];
    
    returnDamage = mainhandDMG.concat(offhandDMG);
    returnDamage = checkAddDupeTypes(returnDamage);
    return returnDamage;
};

const loadDefenceItems = (loadout) => {
    const emptyDef = {Type: "True", DEF: 0};
    let returnDefence = [], offhandDEF, helmDEF, chestDEF, legsDEF;
    if (loadout.offhand === 'None' && loadout.headslot === 'None' && loadout.chestslot === 'None' && loadout.legslot === 'None') {
        return [emptyDef];
    }
    offhandDEF = (loadout.offhand === 'None') ? [emptyDef] : checkingDefence(loadout.offhand);
    helmDEF = (loadout.headslot === 'None') ? [emptyDef] : checkingDefence(loadout.headslot);
    chestDEF = (loadout.chestslot === 'None') ? [emptyDef] : checkingDefence(loadout.chestslot);
    legsDEF = (loadout.legslot === 'None') ? [emptyDef] : checkingDefence(loadout.legslot);

    returnDefence = offhandDEF.concat(helmDEF, chestDEF, legsDEF);
    returnDefence = checkAddDupeTypes(returnDefence);
    return returnDefence;
}

module.exports = {
    loadPlayer,
    loadEnemy,
    loadDamageItems,
    loadDefenceItems
}