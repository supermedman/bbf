// ===============================
//       STATUS EFFECTS
// ===============================
 
const statusContainer = {
    /**
     * This method checks if the Cuncusion status effect should be applied
     * @param {Object} armor Armor HP obj
     * @param {Object} flesh Flesh HP obj 
     * @param {Number} blunt Blunt damage being dealt
     * @param {Object} condition Attack Conditions: {Crit: boolean, DH: boolean}
     * @param {Object[]} curEffects Object array of any and all currently applied status effects
     * @returns {boolean}
     */
    Concussion: (armor, flesh, blunt, condition, curEffects) => {
        if (flesh.Type === 'Specter' || flesh.Type === 'Magical Flesh' && curEffects.findIndex(eff => eff.Type === 'MagiWeak') === -1) return false;
        
        if (armor.HP > 0){
            switch(armor.Type){
                case "Armor":
                    // Blunt > (armor.HP * 0.5) = true
                    if (blunt > (armor.HP * 0.5)) return true;
                return false;
                case "Bark":
                    // Immune = false
                return false;
                case "Fossil":
                    // Immune = false
                return false;
                case "Demon":
                    // Blunt > (armor.HP * 0.5) && MagiWeak = true
                    if (blunt > (armor.HP * 0.5) && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) return true;
                return false;
            }
        }
        
        switch(flesh.Type){
            case "Flesh":
                // Crit & 0 armor = true
                if (armor.HP === 0 && condition.Crit) return true;
            return false;
            case "Magical Flesh":
                // MagiWeak = true
                if (curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) return true;
            return false;
            default:
                // Immune || Not Checked
            return false;
        }
    },
    /**
     * This method checks if the Bleed status effect should be applied
     * @param {Object} armor Armor HP Obj
     * @param {Object} flesh Flesh HP Obj
     * @param {Number} slash Slash Dmg being dealt
     * @param {Object} condition Contains {Crit: boolean, DH: boolean}
     * @param {Object[]} curEffects Object array of any and all currently applied status effects
     * @returns {({Strength: string}) | boolean}
     */
    Bleed: (armor, flesh, slash, condition, curEffects) => {
        if (flesh.Type === "Flesh" && armor.HP > 0 || flesh.Type === "Magical Flesh" && curEffects.findIndex(eff => eff.Type === 'MagiWeak') === -1) return false;

        if (armor.HP > 0){
            switch(armor.Type){
                case "Armor":
                    // Immune to Bleed
                return false;
                case "Bark":
                    // Slash > armor.HP * 0.5 && Burn = true
                    if (slash > (armor.HP * 0.5) && curEffects.findIndex(eff => eff.Type === 'Burn') !== -1) {
                        // Crit && DH = Big Bleed 
                        // Crit || DH = Bleed
                        // Little Bleed
                        if (condition.Crit && condition.DH) {
                            return { Strength: "Big Bleed"};
                        } else if (condition.Crit || condition.DH){
                            return { Strength: "Bleed" };
                        } else return { Strength: "Little Bleed"};
                    }
                return false;
                case "Fossil":
                    // Immune to Bleed
                return false;
                case "Demon":
                    // Immune to Bleed
                return false;
            }
        }
        
        switch(flesh.Type){
            case "Flesh":
                // Crit && DH = Big Bleed 
                // Crit || DH = Bleed
                // Little Bleed
                if (condition.Crit && condition.DH) {
                    return { Strength: "Big Bleed"};
                } else if (condition.Crit || condition.DH){
                    return { Strength: "Bleed" };
                } else return { Strength: "Little Bleed"};
            case "Magical Flesh":
                // Crit && DH = Big Bleed 
                // Crit || DH = Bleed
                // Little Bleed
                if (condition.Crit && condition.DH) {
                    return { Strength: "Big Bleed"};
                } else if (condition.Crit || condition.DH){
                    return { Strength: "Bleed" };
                } else return { Strength: "Little Bleed"};
            case "Specter":
                // Immune to Bleed
            return false;
        }
        return false;
    },
    /**
     * This method checks if the MagiWeak status effect should be applied
     * @param {Object} armor Armor HP Obj
     * @param {Object} flesh Flesh HP Obj
     * @param {Object} condition Contains {Crit: boolean, DH: boolean}
     * @param {Object[]} curEffects Object array of any and all currently applied status effects
     * @returns {boolean}
     */
    Magic_Weakness: (armor, flesh, magic, condition, curEffects) => {
        if (armor.HP === 0 && flesh.Type === 'Specter') return false;

        if (armor.HP > 0){
            switch(armor.Type){
                case "Armor":
                    if (curEffects.findIndex(eff => eff.Type === 'Concussion') !== -1 && condition.Crit) return true;
                return false;
                case "Bark":
                    if (condition.Crit) return true;
                return false;
                case "Fossil":
                    if (condition.Crit) return true;
                return false;
                case "Demon":
                    if (condition.Crit) return true;
                return false;
            }
        }

        switch(flesh.Type){
            case "Flesh":
                if (condition.Crit) return true;
            return false;
            case "Magical Flesh":
            
            return true;
            case "Specter":
                // Immune 
            return false;
        }
        return false;
    },
    /**
     * 
     * @param {Object} armor Armor HP Obj
     * @param {Object} flesh Flesh HP Obj
     * @param {Number} rad Radiation damage
     * @param {Object} condition Contains {Crit: boolean, DH: boolean}
     * @param {Object[]} curEffects Object array of any and all currently applied status effects
     * @returns {boolean}
     */
    Confusion: (armor, flesh, rad, condition, curEffects) => {
        if (armor.HP === 0 && flesh.Type === 'Specter') return false;

        if (armor.HP > 0){
            switch(armor.Type){
                case "Armor":
                    if (rad > (armor.HP * 0.5) && condition.Crit) return true;
                return false;
                case "Bark":
                    // Immune
                return false;
                case "Fossil":
                    // Immune
                return false;
                case "Demon":
                    if (rad > (armor.HP * 0.5) && curEffects.findIndex(eff => eff.Type === 'Concussion') !== -1) return true;
                return false;
            }
        }

        switch(flesh.Type){
            case "Flesh":
                // Crit & 0 armor = true
            return true;
            case "Magical Flesh":
                // MagiWeak = true
                if (condition.Crit) return true;
            return false;
        }
        return false;
    },
    /**
     * This method checks if the Slow status effect should be applied
     * @param {Object} armor Armor HP Obj
     * @param {Object} flesh Flesh HP Obj
     * @param {Number} frost Frost damage being dealt
     * @param {Object} condition Contains {Crit: boolean, DH: boolean}
     * @param {Object[]} curEffects Object array of any and all currently applied status effects
     * @returns {boolean}
     */
    Slow: (armor, flesh, frost, condition, curEffects) => {

        if (armor.HP > 0){
            switch(armor.Type){
                case "Armor":
                    // Applied
                return true;
                case "Bark":
                    // Applied
                return true;
                case "Fossil":
                    if (condition.Crit && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) return true;
                return false;
                case "Demon":
                    // Applied
                return true;
            }
        }

        switch(flesh.Type){
            case "Flesh":
                if (condition.Crit) return true;
            return false;
            case "Magical Flesh":
                if (condition.Crit && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) return true;
            return false;
            case "Specter":
                // Immune
            return false;
        }
        return false;
    },
    /**
     * This method checks if the Burn status effect should be applied
     * @param {Object} armor Armor HP Obj
     * @param {Object} flesh Flesh HP Obj
     * @param {Number} fire Fire damage being dealt
     * @param {Object} condition Contains {Crit: boolean, DH: boolean}
     * @param {Object[]} curEffects Object array of any and all currently applied status effects
     * @returns {({Strength: string}) | boolean}
     */
    Burn: (armor, flesh, fire, condition, curEffects) => {

        if (armor.HP > 0){
            switch(armor.Type){
                case "Armor":
                    if (condition.Crit && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) {
                        if (condition.DH) {
                            return { Strength: "Inferno"};
                        } else return { Strength: "Burn"};
                    }
                return false;
                case "Bark":
                    // Applied
                    if (condition.DH) {
                        return { Strength: "Inferno"};
                    } else return { Strength: "Burn"};
                case "Fossil":
                    // Immune
                return false;
                case "Demon":
                    if (fire > (armor.HP * 0.5) && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1){
                        if (condition.Crit && condition.DH) {
                            return { Strength: "Inferno"};
                        } else if (condition.Crit || condition.DH){
                            return { Strength: "Burn"};
                        } else return { Strength: "Smolder"};
                    }
                return false;
            }
        }

        switch(flesh.Type){
            case "Flesh":
                if (condition.Crit && condition.DH) {
                    return { Strength: "Inferno"};
                } else if (condition.Crit || condition.DH){
                    return { Strength: "Burn"};
                } else return { Strength: "Smolder"};
            case "Magical Flesh":
                if (condition.Crit && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) {
                    if (condition.DH) {
                        return { Strength: "Inferno"};
                    } else return { Strength: "Burn"};
                }
            return false;
            case "Specter":
                // Immune
            return false;
            default:
                // Immune || Not Checked
            return false;
        }
    },
    /**
     * This method checks if the Blind status effect should be applied
     * @param {Object} armor Armor HP Obj
     * @param {Object} flesh Flesh HP Obj
     * @param {Number} dark Dark damage being dealt
     * @param {Object} condition Contains {Crit: boolean, DH: boolean}
     * @param {Object[]} curEffects Object array of any and all currently applied status effects
     * @returns {boolean}
     */
    Blind: (armor, flesh, dark, condition, curEffects) => {

        if (armor.HP > 0){
            switch(armor.Type){
                case "Armor":
                    // Immune
                return false;
                case "Bark":
                    if (condition.Crit) return true;
                return false;
                case "Fossil":
                    // Immune
                return false;
                case "Demon":
                    // Immune
                return false;
            }
        }

        switch(flesh.Type){
            case "Flesh":
                if (condition.Crit) return true;
            return false;
            case "Magical Flesh":
                if (condition.Crit && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) return true;
            return false;
            case "Specter":
                if (curEffects.findIndex(eff => eff.Type === 'Flash') !== -1) return true;
            return false;
        }
        return false;
    },
    /**
     * This method checks if the Flash status effect should be applied
     * @param {Object} armor Armor HP Obj
     * @param {Object} flesh Flesh HP Obj
     * @param {Number} light Light damage being dealt
     * @param {Object} condition Contains {Crit: boolean, DH: boolean}
     * @param {Object[]} curEffects Object array of any and all currently applied status effects
     * @returns {boolean}
     */
    Flash: (armor, flesh, light, condition, curEffects) => {

        if (armor.HP > 0){
            switch(armor.Type){
                case "Armor":
                    if (condition.Crit && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) return true;
                return false;
                case "Bark":
                    // Immune
                return false;
                case "Fossil":
                    if (condition.Crit && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) return true;
                return false;
                case "Demon":
                    // Applied
                return true;
            }
        }

        switch(flesh.Type){
            case "Flesh":
                if (condition.Crit) return true;
            return false;
            case "Magical Flesh":
                if (condition.Crit && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) return true;
            return false;
            case "Specter":
                // Applied
            return true;
        }
        return false;
    },
    Blast: (armor, flesh, fireDamage, frostDamage, weakness, magiAcc) => {
        /**
         * This method takes fire, frost, enemy.Weakness, dmgMultipler, and accumulated DoT total. It calculates and returns blast damage dealt.
         * @param {Number} fire Fire Damage dealt
         * @param {Number} frost Frost Damage dealt
         * @param {Object} weak Enemy Weakness Object 
         * @param {Number} mult Total Multiplier for final damage total based on hp type
         * @param {Number} acc Accumulated damage over time total to be added 
         * @returns Number
         */
        const blastCalc = (fire, frost, weak, mult, acc) => {
            let returnDmg = 0, finalFire = 0, finalFrost = 0;
            finalFire = fire + (fire * weak.Fire) + acc;
            finalFrost = frost + (frost * weak.Frost) + acc;
            returnDmg = (finalFire + finalFrost) * mult;
            return returnDmg;
        };

        let blastDamage = 0, blastArmor = false;
        if (armor.HP > 0){
            switch(armor.Type){
                case "Armor":
                    blastDamage = blastCalc(fireDamage, frostDamage, weakness.Magical, 0.75, magiAcc);
                break;
                case "Bark":
                    blastDamage = blastCalc(fireDamage, frostDamage, weakness.Magical, 1.75, magiAcc);
                break;  
                case "Fossil":
                    blastDamage = frostDamage + (frostDamage * weakness.Magical.Frost) + magiAcc;
                    blastDamage = blastDamage + (blastDamage * 0.5);
                break;
                case "Demon":
                    blastDamage = blastCalc(fireDamage, frostDamage, weakness.Magical, 0.75, magiAcc);
                break;
            }
        }

        if (blastDamage > 0) blastArmor = true;

        if (armor.HP === 0) {
            switch(flesh.Type){
                case "Flesh":
                    blastDamage = blastCalc(fireDamage, frostDamage, weakness.Magical, 1.5, magiAcc);
                break;
                case "Magical Flesh":
                    blastDamage = blastCalc(fireDamage, frostDamage, weakness.Magical, 1, magiAcc);
                break;
                case "Specter":
                    blastDamage = 0;
                break;
                case "Hellion":
                    blastDamage = blastCalc(fireDamage, frostDamage, weakness.Magical, 0.25, magiAcc);
                break;
                case "Boss":
                    blastDamage = blastCalc(fireDamage, frostDamage, weakness.Magical, 0.50, magiAcc);
                break;
            }
        }

        return {DMG: blastDamage, Armor: blastArmor};
    }
}

module.exports = {statusContainer};