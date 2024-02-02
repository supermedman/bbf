const { pigmyTypeStats } = require('../handlePigmyDamage.js');

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
    interactionToken;
    constructor(user, interaction) {
        this.interactionToken = interaction.id;

        this.stealDisabled = false;
        this.isHidden = false;

        this.potionDisabled = true;
        this.potionTxt = 'No Potion';

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
        this.dead = false;

        this.baseDmg = 0;

        // Mods will contain buff data for damage; 
        // dealt[0], 
        // taken[1], 
        // critChance[2], 
        // dhChance[3], 
        // lootDrop[4], 
        // lootUP[5]
        this.mods = [];

        // Loadout will contain item ids positioned in place for each loadout slot, either 0 or validID
        this.loadout = [0, 0, 0, 0, 0, 0];
        this.loadoutTypes = new Array(5).fill('NONE');
        this.hasLoadout = false;

        this.strongUsing = [];

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

    checkStrongUsing() {
        if (this.pClass === 'Mage') {
            this.strongUsing = ['magic', 'fire', 'frost', 'light', 'dark'];
        } else if (this.pClass === 'Thief') {
            this.strongUsing = ['one', 'slash', 'dark', 'pain'];
        } else if (this.pClass === 'Warrior') {
            this.strongUsing = ['two', 'slash', 'blunt', 'fire'];
        } else if (this.pClass === 'Paladin') {
            this.strongUsing = ['one', 'two', 'null', 'blunt', 'rad'];
        }

        this.strongUsing.push('spirit', 'pain', 'chaos');
    }

    /** This method takes a pigmy, and sets all this.statsUP values to the corrisponding values 
     *  found from the given pigmy
     * 
     * @param {any} pigmy pigmy db instance
     */
    checkPigmyUps(pigmy) {
        if (!pigmy) return;
        const pigmyStats = pigmyTypeStats(pigmy)
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
        this.hasLoadout = true;
        // Armor
        this.loadout[0] = userLoadout.headslot;
        this.loadout[1] = userLoadout.chestslot;
        this.loadout[2] = userLoadout.legslot;
        // Mainhand & Offhand
        if (userLoadout.offhand === userLoadout.mainhand) {
            this.loadout[3] = 0;
            this.loadout[4] = userLoadout.mainhand;
        } else {
            this.loadout[3] = userLoadout.offhand;
            this.loadout[4] = userLoadout.mainhand;
        }
        // Potion
        this.loadout[5] = userLoadout.potionone;
    }

    /** This method sets the this.totalDefence value
     * 
     * @param {any[]} def array of defence values from armor and offhand
     */
    checkTotalDefence(def) {
        for (let i = 0; i < def.length; i++) {
            this.totalDefence += def[i];
        }
    }

    /** This method sets the this.totalDamage value
     * 
     * @param {any[]} atk array of attack values from mainhand and offhand
     */
    checkTotalDamage(atk) {
        for (let i = 0; i < atk.length; i++) {
            this.totalDamage += atk[i];
        }
    }

    /** This method sets loadoutTypes to gear types given
     * 
     * @param {any[]} gear array of gear types
     */
    setLoadoutTypes(gear) {
        this.loadoutTypes = gear;
    }

    checkCurrentPotion(potionID) {
        if (this.loadout[5] !== potionID) {
            this.loadout[5] = potionID;
        }
    }

    checkAgainstLoadoutTypes() {
        const proxTimes = this.loadoutTypes.filter(type => {
            if (this.strongUsing.some((strong) => type.toLowerCase() === strong)) {
                return true;
            } else return false;
        });

        console.log(proxTimes);

        if (proxTimes.length > 0) {
            for (let i = 0; i < proxTimes.length; i++) {
                this.totalDamage += this.totalDamage * 0.65;
            }
        }
    }

    get curDefence() {
        return this.totalDefence;
    }

    get curDamage() {
        return this.totalDamage + this.baseDmg;
    }

    get curHealth() {
        return this.health;
    }

    get isDead() {
        return this.dead;
    }

    takeDamge(dmg) {
        dmg -= dmg * this.mods[1];
        dmg -= this.totalDefence;
        if (dmg < 0) dmg = 0;
        this.health -= dmg;
        if (this.health <= 0) this.dead = true;
        return dmg;
    }

    set healHealth(heal) {
        this.health += heal;
    }

    hide(enemy) {
        let totalChance;
        const baseChance = (((this.spd * 0.02) + this.spdUP) + ((this.dex * 0.02) + this.dexUP));
        const difficultyChange = enemy.level * 0.01;
        if ((baseChance - difficultyChange) <= 0) return 'FAILURE';
        totalChance = baseChance - difficultyChange;

        const rolledChance = Math.random();
        if (rolledChance < totalChance) {
            this.isHidden = true;
            return 'SUCCESS';
        }
        return 'FAILURE';
    }

    updateUPs(statusEffects) {
        if (statusEffects.length <= 0) return '0';
        let totalInc;
        if (statusEffects.length > 1) {
            for (const effect of statusEffects) {
                totalInc += effect.curreffect;
            }
        } else totalInc = statusEffects[0].curreffect;
        this.spdUP += totalInc;
        this.strUP += totalInc;
        this.dexUP += totalInc;
        this.intUP += totalInc;
        this.checkBaseDamage();
        this.checkCritChance();
        this.checkDHChance();
        return '1';
    }

    updateDefence(statusEffects) {
        if (statusEffects.length <= 0) return '0';
        let totalInc;
        if (statusEffects.length > 1) {
            for (const effect of statusEffects) {
                totalInc += effect.curreffect;
            }
        } else totalInc = statusEffects[0].curreffect;
        this.totalDefence += totalInc;
        return '1';
    }
}

module.exports = { Player };