
const { UserData, Pigmy, ActiveStatus } = require('../../dbObjects.js');
const { pigmyTypeStats } = require('./handlePigmyDamage.js');

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


/**
 *  Main Player Class
 *  
 *  user = db UserData instance
 *      new Player(user);
 * 
 *  Contains:
 *  .setHealth(dbHealth);
 *  
 *  .checkDealtBuffs();
 *  .checkTakenBuffs();
 *  
 *  .checkPigmyUps(pigmy);
 *  
 *  .checkBaseDamage();
 *  .checkCritChance();
 *  .checkDHChance();
 *  
 *  .checkLootDrop(pigmy);
 *  .checkLootUP(pigmy);
 *  
 *  .loadLoadout();
 *  .checkTotalDefence(...def);
 *  .checkTotalDamage(...atk);
 * */
class Player {
    constructor(user) {
        this.level = user.level;
        this.pClass = user.pclass;
        this.stats = [user.speed, user.strength, user.dexterity, user.intelligence];

        this.spd = this.stats[0];
        this.spdUP = 0;

        this.str = this.stats[1];
        this.strUP = 0;

        this.dex = this.stats[2];
        this.dexUP = 0;

        this.int = this.stats[3];
        this.intUP = 0;

        this.health = 100;

        this.baseDmg = 0;

        // Mods will contain buff data for damage; dealt[0], taken[1], critChance[2], dhChance[3], lootDrop[4], lootUP[5]
        this.mods = [];

        // Loadout will contain item ids positioned in place for each loadout slot, either 0 or validID
        this.loadout = [0, 0, 0, 0, 0, 0];

        this.totalDefence = 0;
        this.totalDamage = 0;
    }

    /** This method will set player health to 100 + this.str * 10 || dbHealth
     * 
     * @param {number} dbHealth
     */
    setHealth(dbHealth) {
        if (dbHealth !== (this.health + this.str * 10)) {
            this.health = dbHealth;
        } else this.health += this.str * 10;
    }

    /** This method checks and sets damage dealt to this.mods[0]*/
    checkDealtBuffs() {
        // Set damage Dealt Mod
        if (this.pClass === 'Warrior') {
            this.mods[0] = 0.05;
        } else if (this.pClass === 'Mage') {
            this.mods[0] = 0.15;
        } else if (this.pClass === 'Paladin') {
            this.mods[0] = -0.05;
        } else this.mods[0] = 0;
    }

    /** This method checks and sets damage taken to this.mods[1]*/
    checkTakenBuffs() {
        // Set damage taken Mod
        if (this.pClass === 'Warrior') {
            this.mods[1] = -0.05;
        } else if (this.pClass === 'Paladin') {
            this.mods[1] = -0.15;
        } else if (this.pClass === 'Mage') {
            this.mods[1] = 0.05;
        } else this.mods[1] = 0;
    }

    /** This method takes a pigmy, and sets all this.statsUP values to the corrisponding values 
     *  found from the given pigmy
     * 
     * @param {any} pigmy pigmy db instance
     */
    checkPigmyUps(pigmy) {
        if (!pigmy) return;
        let pigmyStats;
        pigmyStats = pigmyTypeStats(pigmy);
        this.spdUP = pigmyStats.spd;
        this.strUP = pigmyStats.str;
        this.dexUP = pigmyStats.dex;
        this.intUP = pigmyStats.int;
    }

    checkBaseDamage() {
        this.baseDmg = (((this.int + this.intUP) * 8) + ((this.str + this.strUP) * 2));
        this.baseDmg += this.baseDmg * this.mods[0];
    }

    /** This method checks and sets the crit chance to this.mods[2]*/
    checkCritChance() {
        let critChance = 0;
        if (this.pClass === 'Thief') {
            critChance = (((this.dex * 0.02) + 0.10) + this.dexUP);
        } else critChance = ((this.dex * 0.02) + this.dexUP);
        this.mods[2] = critChance;
    }

    /** This method checks and sets the dh chance to this.mods[3]*/
    checkDHChance() {
        let dhChance = 0;
        if (this.pClass === 'Thief') {
            dhChance = (((this.spd * 0.02) + 0.10) + this.spdUP);
        } else dhChance = ((this.spd * 0.02) + this.spdUP);
        this.mods[3] = dhChance;
    }

    /** This method checks and sets the loot drop chance to this.mods[4]
     * 
     * @param {any} pigmy pigmy db instance
     */
    checkLootDrop(pigmy) {
        let chanceToBeat = 0.850;
        if (this.pClass === 'Thief') chanceToBeat -= 0.10;
        if (this.level >= 31) {
            if ((Math.floor(this.level / 4) * 0.01) > 0.25) {
                chanceToBeat -= 0.25;
            } else chanceToBeat -= (Math.floor(this.level / 4) * 0.01);
        }
        if (pigmy) {
            if ((Math.floor(pigmy.level / 3) * 0.02) > 0.25) {
                chanceToBeat -= 0.25;
            } else chanceToBeat -= (Math.floor(pigmy.level / 3) * 0.02);
        }
        this.mods[4] = chanceToBeat;
    }

    /** This method checks and sets the loot upgrade chance to this.mods[5]
     * 
     * @param {any} pigmy pigmy db instance
     */
    checkLootUP(pigmy) {
        let chanceToBeat = 1;
        if (this.pClass === 'Thief') chanceToBeat -= 0.05;
        if (this.level >= 31) {
            if ((Math.floor(this.level / 5) * 0.01) > 0.10) {
                chanceToBeat -= 0.10;
            } else chanceToBeat -= (Math.floor(this.level / 5) * 0.01);
        }
        if (pigmy) {
            if ((Math.floor(pigmy.level / 5) * 0.01) > 0.05) {
                chanceToBeat -= 0.05;
            } else chanceToBeat -= (Math.floor(pigmy.level / 5) * 0.01);
        }
        this.mods[5] = chanceToBeat;
    }

    /** This method retrives loadout data and sets this.loadout[slot] to the values found 
     * 
     * @param {any} userLoadout loadout db instance
     */
    loadLoadout(userLoadout) {
        // Armor
        this.loadout[0] = userLoadout.headslot;
        this.loadout[1] = userLoadout.chestslot;
        this.loadout[2] = userLoadout.legslot;
        // Mainhand & Offhand
        this.loadout[3] = userLoadout.offhand;
        this.loadout[4] = userLoadout.mainhand;
        // Potion
        this.loadout[5] = userLoadout.potionone;
    }

    /** This method sets the this.totalDefence value
     * 
     * @param {any[]} def array of defence values from armor and offhand
     */
    checkTotalDefence(...def) {
        for (let i = 0; i < def.length; i++) {
            this.totalDefence += def[i];
        }
    }

    /** This method sets the this.totalDamage value
     * 
     * @param {any[]} atk array of attack values from mainhand and offhand
     */
    checkTotalDamage(...atk) {
        for (let i = 0; i < atk.length; i++) {
            this.totalDamage += atk[i];
        }
    }
}

//========================================
// This method calculates damage dealt by the user and returns that value
async function userDamageLoadout(user, item, offHand) {
    const pigmy = await Pigmy.findOne({ where: { spec_id: user.userid } });

    const extraStats = await ActiveStatus.findOne({ where: [{ spec_id: user.userid }, { activec: 'Tons' }] });

    var totDamageBuff = 0;
    var strUP = 0;
    var intUP = 0;

    let pigmyStats = {
        pigmyDmg: 0,
        int: 0,
        dex: 0,
        str: 0,
        spd: 0
    };
    if (pigmy) pigmyStats = pigmyTypeStats(pigmy);

    totDamageBuff += pigmyStats.pigmyDmg;
    strUP += pigmyStats.str;
    intUP += pigmyStats.int;

    if (extraStats && extraStats.duration > 0) {
        strUP += extraStats.curreffect;
        intUP += extraStats.curreffect;  
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

    if (item) {
        //console.log('ITEM EQUIPPED: ', item);
        if (item === 'NONE') {

        } else {
            console.log('ITEM DAMAGE: ', item.Attack);
            dmgDealt += item.Attack;
        }
    }

    if (offHand) {
        if (offHand === 'NONE') {

        } else {
            console.log('OFFHAND DAMAGE: ', offHand.Attack);
            if (offHand.Attack > 0) dmgDealt += offHand.Attack;
        }
    }

    //console.log('Damage Dealt to Enemy ' + dmgDealt);
    return dmgDealt;
}


async function generatePlayerClass(user) {
    const pigmy = await Pigmy.findOne({ where: { spec_id: user.userid } });
    const curPlayer = new Player(user);

    curPlayer.setHealth(user.health);
    curPlayer.checkDealtBuffs();
    curPlayer.checkTakenBuffs();

    curPlayer.checkPigmyUps(pigmy);

    curPlayer.checkCritChance();
    curPlayer.checkDHChance();

    curPlayer.checkLootDrop(pigmy);
    curPlayer.checkLootUP(pigmy);

    curPlayer.checkBaseDamage();

    return curPlayer;
}



async function checkClassBuffs(user) {
    if (pclass === 'Warrior') {
        dmgMod += (dmgMod * 0.05);
    } else if (pclass === 'Mage') {
        dmgMod += (dmgMod * 0.15);
    }

    if (user.pclass === 'Warrior') {
        //5% damage reduction
        eDamage -= (eDamage * 0.05);
    } else if (user.pclass === 'Paladin') {
        //15% damage reduction
        eDamage -= (eDamage * 0.15);
    } 
}


async function checkClassDebuffs(user) {
    if (pclass === 'Paladin') {
        dmgMod -= (dmgMod * 0.05);
    }

    if (user.pclass === 'Mage') {
        //5% damage increase
        eDamage += (eDamage * 0.05);
    }
}

// This function will calculate full armor defence values to use in other calculations
async function checkArmor() {

}

// This function will calculate block force when blocking an attack
async function checkBlockForce() {

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

module.exports = { userDamage, userDamageAlt, userDamageLoadout, enemyDamage, generatePlayerClass };
