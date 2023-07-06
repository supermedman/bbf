
const { UserData } = require('../../dbObjects.js');

/**
 *  Main damage calculating functions for both user and enemies
 *  
 *  Handle whether user has weapon or not 
 *  
 *  Returns damage value after calculations are made
 *  
 *                  ===== Exports { userDamage, enemyDamage } =====
 * */

//========================================
//basic user data refrence method
async function grabU(interaction) {
	uData = await UserData.findOne({ where: { userid: interaction.user.id } });
	return uData;
}

//========================================
// This method calculates damage dealt by the user and returns that value
async function userDamage(interaction, item) {

    /**
     *  CHANGES TO HOW STATS EFFECT COMBAT 
     *  
     *   Speed: Increases % chance to land 2 hits before enemy attacks
     *   
     *   Strength: Increases base health by 10 & base damage by 2
     *   
     *   Dexterity: Increases % chance to land a crit
     *   
     *   Intelligence: Increases base attack by 8
     *   
     *  CHANGES TO HOW CLASSES EFFECT COMBAT
     *   
     *   Warrior: Allrounder
     *      - 5% reduction on damage taken
     *      - 5% increase on damage dealt
     *   
     *   Mage: GlassCannon
     *      - 5% increase on damage taken
     *      - 15% increase on damage dealt
     *      
     *   Thief: Striker
     *      - 10% base chance of double hit
     *      - 10% base chance of crit
     *      
     *   Paladin: Unshakeable
     *      - 15% reduction on damage taken
     *      - 5% reduction on damage dealt
     * */

    /**
     *      Double hits & Critical hits
     *          - Speed stat
     *          - Dexterity stat
     *          
     *      How do they change the % chance?
     *          - +2% per point
     *          - +2% per point
     *          
     *      What is the base % chance?
     *          - Thief 10% both
     *          - 2% for all others
     *      
     * */

    const user = await grabU(interaction);//grabs the user data file for all following assignments

    //=========================
    //const spd = user.speed;
    const str = user.strength;
    //const dex = user.dexterity;
    const int = user.intelligence;
    const pclass = user.pclass;

    var dmgMod = 0;
    //=========================

    dmgMod = ((int * 8) + (str * 2));

    if (pclass === 'Warrior') {
        dmgMod += (dmgMod * 0.05);
    } else if (pclass === 'Paladin') {
        dmgMod -= (dmgMod * 0.05);
    } else if (pclass === 'Mage') {
        dmgMod += (dmgMod * 0.15);
    }

    console.log(`Damage Mod: ${dmgMod}`);

    //-------------------------------------------------------------------------------
    //here the damage modifier is applied to the damage dealt and the final value is returned
    var dmgDealt = dmgMod;

    console.log('ITEM EQUIPPED: ', item);

    if (item) {
        console.log('ITEM DAMAGE: ', item.attack);
        dmgDealt += item.attack;
    }

    console.log('Damage Dealt to Enemy ' + dmgDealt);
    return dmgDealt;
}

//========================================
// This method calculates damage dealt by an enemy and returns that value
function enemyDamage(enemy) {
    // First: grab enemy damage min and max
    // Second: rng between those inclusively 
    // Third: Return the value for further use 

    const dmgDealt = Math.floor(Math.random() * (enemy.maxdmg - enemy.mindmg + 1) + enemy.mindmg);
    return dmgDealt;
}

module.exports = { userDamage, enemyDamage };