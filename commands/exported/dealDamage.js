
const { UserData, Pigmy, ActiveStatus } = require('../../dbObjects.js');

/**
 *  Main damage calculating functions for both user and enemies
 *  
 *  Handle whether user has weapon or not 
 *  
 *  Returns damage value after calculations are made
 *  
 *                  ===== Exports { userDamage, userDamageAlt, enemyDamage } =====
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

    /**
     *      Pigmy alterations & buffs
     *          - Level
     *          - Type
     *          - Happiness
     *          
     *      How does this effect damage?
     *          - damage + (damage * (pigmy.level * 0.02))
     *          
     *          - Normal (pigmy.level * 1 = dmg) 
     *          - Fire (pigmy.level * 1 = dmg) (+ 0.10 dex + 5 strength)
     *          - Frost (pigmy.level * 1 = dmg) (+ 0.10 spd + 5 intelligence)
     *          
     *          - if (happiness > 50)  
     *          - damage buff applied
     *          - stat mod applied
     *          
     *          - if (happiness < 50)
     *          - damage buff ignored
     *          - stat mod applied
     * 
     * */

    const user = await grabU(interaction);//grabs the user data file for all following assignments
    const pigmy = await Pigmy.findOne({ where: { spec_id: interaction.user.id } });

    var totDamageBuff = 0;
    var strUP = 0;
    var intUP = 0;

    if (pigmy) {
        //pigmy found check for happiness and type
        totDamageBuff = pigmy.level * 0.02;
        if (pigmy.happiness >= 50) {
            //Pigmy is still happy apply damage buff
            if (pigmy.type === 'NONE') {
                //Normal pigmy equipped apply additional damage
                totDamageBuff += (pigmy.level * 1);
            } else if (pigmy.type === 'Fire') {
                //Fire pigmy equipped apply 1.5x damage
                totDamageBuff += (pigmy.level * 1.5);
                //str + 5
                strUP = 5;
            } else if (pigmy.type === 'Frost') {
                //Frost pigmy equipped apply 2x damage
                totDamageBuff += (pigmy.level * 2);
                //int + 5
                intUP = 5;
            }
        } else if (pigmy.happiness < 50) {
            if (pigmy.type === 'Fire') {
                strUP = 5;
            } else if (pigmy.type === 'Frost') {
                intUP = 5;
            }
        }
    }
    console.log(`Pigmy Damage Buff: ${totDamageBuff}`);

    //=========================
    //const spd = user.speed;
    const str = user.strength;
    //const dex = user.dexterity;
    const int = user.intelligence;
    const pclass = user.pclass;

    var dmgMod = 0;
    //=========================

    dmgMod = (((int + intUP) * 8) + ((str + strUP) * 2));

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
    var dmgDealt = dmgMod + totDamageBuff;

    console.log('ITEM EQUIPPED: ', item);

    if (item) {
        console.log('ITEM DAMAGE: ', item.attack);
        dmgDealt += item.attack;
    }

    console.log('Damage Dealt to Enemy ' + dmgDealt);
    return dmgDealt;
}

//========================================
// This method calculates damage dealt by the user and returns that value
async function userDamageAlt(user, item) {
    const pigmy = await Pigmy.findOne({ where: { spec_id: user.userid } });

    var totDamageBuff = 0;
    var strUP = 0;
    var intUP = 0;

    if (pigmy) {
        //pigmy found check for happiness and type
        totDamageBuff = pigmy.level * 0.02;
        if (pigmy.happiness >= 50) {
            //Pigmy is still happy apply damage buff
            if (pigmy.type === 'NONE') {
                //Normal pigmy equipped apply additional damage
                totDamageBuff += (pigmy.level * 1);
            } else if (pigmy.type === 'Fire') {
                //Fire pigmy equipped apply 1.5x damage
                totDamageBuff += (pigmy.level * 1.5);
                //str + 5
                strUP = 5;
            } else if (pigmy.type === 'Frost') {
                //Frost pigmy equipped apply 2x damage
                totDamageBuff += (pigmy.level * 2);
                //int + 5
                intUP = 5;
            }
        } else if (pigmy.happiness < 50) {
            if (pigmy.type === 'Fire') {
                strUP = 5;
            } else if (pigmy.type === 'Frost') {
                intUP = 5;
            }
        }
    }

    console.log(`Pigmy Damage Buff: ${totDamageBuff}`);
    //=========================
    //const spd = user.speed;
    const str = user.strength;
    //const dex = user.dexterity;
    const int = user.intelligence;
    const pclass = user.pclass;

    var dmgMod = 0;
    //=========================

    dmgMod = (((int + intUP) * 8) + ((str + strUP) * 2));

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
    var dmgDealt = dmgMod + totDamageBuff;

    console.log('ITEM EQUIPPED: ', item);

    if (item) {
        console.log('ITEM DAMAGE: ', item.attack);
        dmgDealt += item.attack;
    }

    console.log('Damage Dealt to Enemy ' + dmgDealt);
    return dmgDealt;
}

//========================================
// This method calculates damage dealt by the user and returns that value
async function userDamageLoadout(user, item) {
    const pigmy = await Pigmy.findOne({ where: { spec_id: user.userid } });

    const extraStats = await ActiveStatus.findOne({ where: [{ spec_id: user.userid }, { activec: 'Tons' }] });

    var totDamageBuff = 0;
    var strUP = 0;
    var intUP = 0;

    if (pigmy) {
        //pigmy found check for happiness and type
        totDamageBuff = pigmy.level * 0.02;
        if (pigmy.happiness >= 50) {
            //Pigmy is still happy apply damage buff
            if (pigmy.type === 'NONE') {
                //Normal pigmy equipped apply additional damage
                totDamageBuff += (pigmy.level * 1);
            } else if (pigmy.type === 'Fire') {
                //Fire pigmy equipped apply 1.5x damage
                totDamageBuff += (pigmy.level * 1.5);
                //str + 5
                strUP = 5;
            } else if (pigmy.type === 'Frost') {
                //Frost pigmy equipped apply 2x damage
                totDamageBuff += (pigmy.level * 2);
                //int + 5
                intUP = 5;
            } else if (pigmy.type === 'NULL') {
                //Phase pigmy equipped apply 20x damage
                totDamageBuff += (pigmy.level * 20);
                //int + 5
                //intUP = 5;
            }
        } else if (pigmy.happiness < 50) {
            if (pigmy.type === 'Fire') {
                strUP = 5;
            } else if (pigmy.type === 'Frost') {
                intUP = 5;
            }
        }
    }

    if (extraStats) {
        if (extraStats.duration > 0) {
            strUP += extraStats.curreffect;
            intUP += extraStats.curreffect;
        }     
    }

    console.log(`Pigmy Damage Buff: ${totDamageBuff}`);
    //=========================
    //const spd = user.speed;
    const str = user.strength;
    //const dex = user.dexterity;
    const int = user.intelligence;
    const pclass = user.pclass;

    var dmgMod = 0;
    //=========================

    dmgMod = (((int + intUP) * 8) + ((str + strUP) * 2));

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
    var dmgDealt = dmgMod + totDamageBuff;

    console.log('ITEM EQUIPPED: ', item);

    if (item !== 'NONE') {
        console.log('ITEM DAMAGE: ', item.Attack);
        dmgDealt += item.Attack;
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

module.exports = { userDamage, userDamageAlt, userDamageLoadout, enemyDamage };
