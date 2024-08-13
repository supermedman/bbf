const { EnemyFab } = require("../../Development/Export/Classes/EnemyFab");
const { loadEnemy } = require("../../Development/Export/finalCombatExtras");
const bossList = require('../../../events/Models/json_prefabs/bossList.json');

/**
 * This function preloads an array of defined EnemyFab objects based on constkeys,
 * the resulting array is ready to be used in dungeon combat loading
 * @param {number[]} keyList Array list of enemy ConstKeys
 * @returns {EnemyFab[]}
 */
function preloadFloor(keyList){
    const floorList = [];
    for (const id of keyList){
        floorList.push(loadEnemy(0, null, id));
    }

    return floorList;
}

/**
 * This function finds and loads the requested boss with the appropreate values.
 * @param {number} stage The current boss stage to load
 * @param {string} name The name of the boss to load
 * @returns {EnemyFab}
 */
function loadBossStage(stage, name){
    const bossRef = bossList.filter(boss => boss.NameRef === name && boss.Stage === stage)[0];
    console.log(name + ' Found at stage: %d', stage);

    const bFailSafe = {Level: bossRef.Level, Body: bossRef.Body, Armor: bossRef.Armor, Shield: bossRef.Shield, Name: bossRef.Name, Description: '', UniqueItem: false, ConstKey: bossRef.ConstKey};

    const boss = new EnemyFab(bFailSafe);

    boss.flesh.HP = bossRef.Body_HP;
    boss.armor.HP = bossRef.Armor_HP;
    boss.shield.HP = bossRef.Shield_HP;

    boss.reloadMaxHP();

    boss.imageCheck.checkKey = bossRef.ConstKey;
    boss.imageCheck.hasPng = true;
    boss.imageCheck.pngRef = bossRef.PngRef;

    boss.staticDmgRange.maxDmg = bossRef.MaxDmg;
    boss.staticDmgRange.minDmg = bossRef.MinDmg;

    if (stage === 3){
        boss.payouts.xp.max = bossRef.XpMax;
        boss.payouts.xp.min = bossRef.XpMin;
    }
    
    console.log('Boss Loaded!!');
    //console.log(boss);

    return boss;
}



module.exports = {preloadFloor, loadBossStage};