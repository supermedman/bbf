const { CombatInstance } = require('./Classes/CombatLoader');
const { EnemyFab } = require('./Classes/EnemyFab');

const enemyTestList = require('./Json/newEnemyList.json');
const { checkingDamage, checkingDefence } = require('./itemStringCore');
const { attackEnemy, enemyAttack, handleActiveStatus, applyActiveStatus } = require('./combatContainer');


const randArrPos = (arr) => {
    return arr[(arr.length > 1) ? Math.floor(Math.random() * arr.length) : 0];
};

// =======================
//  STANDARD 
//  - /startcombat
//  - /dungeon
//  - combatDisplay.js
// =======================

// ===============
//      TEMP
// ===============
const interaction = {
    user: {
        id: "501177494137995264"
    }
};

const combatInstanceList = new Map(); // Replace with client.collection()

const enemyTestListKV = new Map(); // Replace with client.enemies
for (const enemy of enemyTestList){
    enemyTestListKV.set(enemy.ConstKey, enemy.Level);
}

//      =======================
//   /startcombat && combatDisplay.js
//      =======================

const loadPlayer = (id) => {
    if (combatInstanceList.has(id)) return combatInstanceList.get(id);
    let newInstance = new CombatInstance(id);
    combatInstanceList.set(id, newInstance);
    return newInstance;
};

const loadPickedEnemy = (id) => {
    // Filter Enemy List for given id
    let enemyFab = enemyTestList.filter(enemy => enemy.ConstKey === id)[0];
    if (!enemyFab) console.log(`Enemy not found with ConstKey: ${id}`);
    const newEnemy = new EnemyFab(enemyFab.Level, enemyFab.Body, enemyFab.Armor, enemyFab.Shield);
    return newEnemy;
};

const loadRandomEnemy = (lvl) => {
    const enemyChoiceList = [];
    for (const [key, value] of enemyTestListKV){
        if (value <= lvl) enemyChoiceList.push(key);
    }
    const idPicked = randArrPos(enemyChoiceList);
    const newEnemy = loadPickedEnemy(idPicked);
    return newEnemy;
};

const loadEnemy = (pLvl, eID=false) => {
    let theEnemy;
    if (eID) theEnemy = loadPickedEnemy(eID);
    else theEnemy = loadRandomEnemy(pLvl);
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

let startTime, endTime;
async function combatWrapper() {
    // Obtain Loadout Here!
    // =================== TIMER START
    startTime = new Date().getTime();
    // =================== TIMER START
    const thePlayer = loadPlayer(interaction.user.id);
    if (!thePlayer.staticStats) /*await*/ thePlayer.retrieveBasicStats();
    if (thePlayer.loadout.ids.length === 0) /*await*/ thePlayer.retrieveLoadout();

    const theEnemy = loadEnemy(thePlayer.level);

    // Load Damage and Defence Values
    const loadOBJ = thePlayer.loadout;
    thePlayer.staticDamage = loadDamageItems(loadOBJ.mainhand, loadOBJ.offhand);
    thePlayer.staticDefence = loadDefenceItems(loadOBJ);
    //console.log(thePlayer);
    combatLooper(thePlayer, theEnemy);
}
combatWrapper();

/**
 * This function contains the core functionality of all combat metrics
 * @param {CombatInstance} player Combat Instance Object
 * @param {EnemyFab} enemy Enemy Instance Object
 */
async function combatLooper(player, enemy){

    /**
     *      Buttons, Embeds, Interaction Collectors...
     */
    // ====================
    // COLLECTER.ON {COLLECT}
    // Player Attack
    let enemyDead = false;
    const combatResult = attackEnemy(player.staticDamage, enemy, player.staticCondition);
    if (combatResult.outcome === 'Dead'){
        console.log('Enemy dies to first strike');
        // Handle Dead Enemy
        enemyDead = true;
    }

    let wasStatusChecked = handleActiveStatus(combatResult, enemy, player.staticCondition);
    let returnedStatus = 'None';
    if (wasStatusChecked !== "Status Not Checked" || enemy.activeEffects.length > 0){
        returnedStatus = applyActiveStatus(combatResult, enemy);
    }

    // ================
    // RECHECK DEAD STATUS
    // ================
    if (enemy.flesh.HP <= 0){
        console.log('Enemy dies to status effects');
        enemyDead = true;
    }

    // ================
    // BUILD DAMAGE EMBED & DISPLAY IT
    // ================
    
    console.log(combatResult);
    console.log(wasStatusChecked);
    console.log(returnedStatus);
    console.log(enemy);
    if (enemyDead) {
        // =================== TIMER END
        endTime = new Date().getTime();
        console.log(`Final Time: ${endTime - startTime}ms`);
        // =================== TIMER END
        return console.log("Enemy is dead!");
    }
    //(enemyDead) ? console.log("enemy is dead") : console.log('Enemy is alive');
    // ENEMY DEAD ? true .stop('EDEAD') : false "Continue";

    const enemyAttacks = enemy.attack();
    if (enemyAttacks === "MISS"){
        // Enemy Miss, combat turn ends .stop('RELOAD');
        // =================== TIMER END
        endTime = new Date().getTime();
        console.log(`Final Time: ${endTime - startTime}ms`);
        // =================== TIMER END
        return;
    }
    // Enemy Attack
    const enemyAttackOutcome = enemyAttack(player.staticDefence, enemyAttacks);
    console.log(enemyAttackOutcome);
    // =================== TIMER END
    endTime = new Date().getTime();
    console.log(`Final Time: ${endTime - startTime}ms`);
    // =================== TIMER END

    // PLAYER DEAD ? true .stop('PDEAD') : false .stop('RELOAD');
    // ====================
    // COLLECTER.ON {END}
    // reason === 'PDEAD'
    //  Handle player death here
    // reason === 'EDEAD'
    //  Handle enemy death here
    // reason === 'RELOAD'
    //  Prepare next combat turn. return combatLooper(player, enemy);
}

// =======================
//  CRAFTED LOADOUT
//  - /startcombat
//  - /dungeon
//  - combatDisplay.js
// =======================
