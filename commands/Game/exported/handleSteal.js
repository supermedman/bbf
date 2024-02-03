const { grabRar } = require('./grabRar.js');
const { pigmyTypeStats } = require('./handlePigmyDamage.js');

//User attempts to steal an item from the enemy 
//Chance increases based on dex && speed
//Steal automatically fails if enemy does not have an item
//Steal becomes unavailable after first successful attempt
//Add check if enemy has preset item that can be stolen
//If enemy has item and steal fails, enemy attacks
//If enemy does not have item causing steal to fail, enemy does nothing
async function stealing(enemy, uData, pigmy) {

    if (enemy.hasunique === true) {
        //Item can be stolen
        //Enemy may still have item 
        return 'UNIQUE ITEM';
    }
    if (enemy.hasunique === false) {
        //Enemy has no special items
        if (enemy.hasitem === false) { return 'NO ITEM';/**No item, check failed*/ }
    }

    var spdUP = 0;
    var dexUP = 0;

    let pigmyStats = {
        pigmyDmg: 0,
        int: 0,
        dex: 0,
        str: 0,
        spd: 0
    };
    if (pigmy) pigmyStats = pigmyTypeStats(pigmy);

    spdUP += Math.floor(pigmyStats.spd / 50);
    dexUP += Math.floor(pigmyStats.dex / 50);

    const spd = uData.speed;
    const dex = uData.dexterity;

    const baseChance = (((spd * 0.02) + spdUP) + ((dex * 0.02) + dexUP));
    console.log(`baseChance: ${baseChance}`);
    var totalChance;
    //HANDLE UNIQUE ITEMS HERE
   
     

    //============================
    /**
        0 = common (No change in difficulty)
        1 = uncommon (0.02 change in difficulty)
        2 = rare (0.04 change ...)
        3 = very rare (0.06 change ...)
        4 = epic (0.08)
        5 = mystic (0.10)
        6 = ? (0.12)
        7 = ?? (0.14)
        8 = ??? (0.16)
        9 = ???? (0.18)
        10 = FORGOTTEN (0.20)
     */
    const itemRarity = await grabRar(enemy.level);
    console.log(`RarID: ${itemRarity}`);
    if (itemRarity === 0) {
        //no change in difficulty
        totalChance = baseChance;
    } else {
        const difficultyChange = itemRarity * 0.02;
        console.log(`difficultyChange: ${difficultyChange}`);
        if ((baseChance - difficultyChange) <= 0) {
            //Total chance is 0 or less than 0
            //STEAL HAS FAILED!
            return 'FAILED';
        } else {totalChance = baseChance - difficultyChange;}    
    }
    console.log(`totalChance: ${totalChance}`);
    const rolledChance = Math.random();
    console.log(`rolledChance: ${rolledChance}`);
    if (rolledChance < totalChance) {
        //Steal has been successful!!
        return itemRarity;
    } else {
        //Steal has failed
        return 'FAILED';
    }
}

module.exports = { stealing };
