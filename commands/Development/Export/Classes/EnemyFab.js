// Main enemy class container

const randArrPos = (arr) => {
    return arr[(arr.length > 1) ? Math.floor(Math.random() * arr.length) : 0];
};

const inclusiveRandNum = (max, min) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

const hitChance = (chance) => {
    return (Math.random() <= chance) ? true : false;
};

const fleshTypes = ["Flesh", "Magical Flesh", "Specter", "Boss"];
// Flesh based on Material Drop Order: [0[1st], 1[2nd], 2[3rd]];
/** == Flesh ==
 *  If only 'fleshy' drop: Pick Flesh
 *  If only 2 drop types, 'fleshy' 1st & 'magical' !2nd: Pick Flesh
 *  
 */
/** == Magical Flesh ==
 * 
 */
/** == Specter ==
 * 
 */
const armorTypes = ["Armor", "Bark", "Fossil", "Demon"];
/** == Armor ==
 * 
 */
/** == Bark ==
 * 
 */
/** == Fossil ==
 * 
 */
/** == Demon ==
 * 
 */
const shieldTypes = ["Phase Demon", "Phase Aura", /*"Plot Armor"*/];
// Phase Demon
// Phase Aura

// This is better for actual values being created, not the best for current testing however.
//let scaleMult = (level, HPStrIndex) => 1 + (level * ((HPStrIndex + 0.01)/0.2));
// Using much much lower scale values to check for proper status effects
let scaleMult = (level, HPStrIndex) => 1 + (level * (HPStrIndex/2 + 0.04));

// Rand Gen Flesh HP
const fleshHPRange = (level, HPType) => {
    const staticMin = 5;
    const staticMax = 25;

    const scaleBY = scaleMult(level, fleshTypes.indexOf(HPType));

    const finalFlesh = Math.floor(Math.random() * ((staticMax * scaleBY) - (staticMin * scaleBY) + 1) + (staticMin * scaleBY));
    //console.log(finalFlesh);
    return finalFlesh;
}

// Rand Gen Armor HP
const armorHPRange = (level, HPType) => {
    const staticMin = 0;
    const staticMax = 10;

    const scaleBY = scaleMult(level, armorTypes.indexOf(HPType));

    const finalArmor = Math.floor(Math.random() * ((staticMax * scaleBY) - (staticMin + 1 * scaleBY)) + (staticMin * scaleBY));
    //console.log(finalArmor);
    return finalArmor;
}

// Rand Gen Shield HP
const shieldHPRange = (level, HPType) => {
    const staticMin = 0;
    const staticMax = 5;

    const scaleBY = scaleMult(level, shieldTypes.indexOf(HPType));

    const finalShield = Math.floor(Math.random() * ((staticMax * scaleBY) - (staticMin + 1 * scaleBY)) + (staticMin * scaleBY));
    return finalShield;
}

// Generate Damage Range
const dmgOutputRange = (level) => {
    const levelMultDmgMods = new Map([
        [1, {mod: 1.5, min: 2, max: 5}],
        [25, {mod: 1.7, min: 5, max: 10}],
        [50, {mod: 2, min: 15, max: 25}],
        [75, {mod: 2.5, min: 25, max: 35}],
        [100, {mod: 3, min: 40, max: 50}]
    ]);
    const dmgModRef = {
        mod: 1,
        min: 2,
        max: 5
    };
    for (const [key, value] of levelMultDmgMods){
        if (key === level) {
            // Key match found, end loop.
            dmgModRef.mod = value.mod; 
            dmgModRef.min = value.min;
            dmgModRef.max = value.max;
            break;
        } else if (key < level) {
            // Level falls into key range, continue.
            dmgModRef.mod = value.mod; 
            dmgModRef.min = value.min;
            dmgModRef.max = value.max;
        } else if (key > level) break; // last assigned key range is a match, end loop.
    }

    dmgModRef.min += (dmgModRef.mod * level);
    dmgModRef.max += (dmgModRef.mod * level);
    return {maxDmg: dmgModRef.max, minDmg: dmgModRef.min};
}

/**
 * Main enemy class constructor
 * Contains methods for all status effects being applied and removed.
 */
class EnemyFab {
    constructor(lvl, fabFlesh, fabArmor, fabShield) {
        //Math.floor(Math.random() * (this.taskContents.MaxNeed - this.taskContents.MinNeed + 1) + this.taskContents.MinNeed);
        //const enemyLevel = Math.floor(Math.random() * (100 - 1 + 1) + 1);
        this.level = (lvl) ? lvl : Math.floor(Math.random() * (100 - 1 + 1) + 1);

        this.flesh = {
            Type: (fabFlesh) ? fabFlesh : randArrPos(fleshTypes)
        };
        this.flesh.HP = fleshHPRange(this.level, this.flesh.Type);
        this.maxFleshHP = this.flesh.HP;
        
        this.armor = {
            Type: (fabArmor) ? fabArmor : randArrPos(armorTypes)
        };
        this.armor.HP = (this.armor.Type === 'None') ? 0 : armorHPRange(this.level, this.armor.Type);
        this.maxArmorHP = this.armor.HP;

        this.shield = {
            Type: (fabShield) ? fabShield : randArrPos(shieldTypes)
        };
        this.shield.HP = (this.shield.Type === 'None') ? 0 : shieldHPRange(this.level, this.shield.Type);
        this.maxShieldHP = this.shield.HP;

        this.activeEffects = [];

        this.staticDmgRange = dmgOutputRange(this.level);

        this.internalEffects = {
            HitChance: 1,
            HitStrength: 1,
            ArmorStrength: 0, // Total armor inc/dec
            ArmorBurn: false, // Caused by inferno -25% armor
            ArmorCrack: false, // Caused by Concussion -50% armor
            Weakness: {
                Physical: {
                    Blunt: 0,
                    Slash: 0
                },
                Magical: {
                    Magic: 0,
                    Fire: 0,
                    Frost: 0,
                    Light: 0,
                    Dark: 0
                }
            }
        }

        this.externalRedux = {
            DHChance: 0,
            CritChance: 0
        }
    }

    attack(){
        let attackDmg = inclusiveRandNum(this.staticDmgRange.maxDmg, this.staticDmgRange.minDmg);
        attackDmg *= this.internalEffects.HitStrength;
        let landHit = (this.internalEffects.HitChance < 1) ? hitChance(this.internalEffects.HitChance) : true;

        if (landHit) return attackDmg;
        return "MISS";
    }

    applyArmorBurn(){
        if (this.internalEffects.ArmorBurn) return;
        this.internalEffects.ArmorBurn = true;
        this.internalEffects.ArmorStrength -= 0.25;
    }

    removeArmorBurn(){
        if (!this.internalEffects.ArmorBurn) return;
        this.internalEffects.ArmorBurn = false;
        this.internalEffects.ArmorStrength += 0.25;
    }

    applyArmorCrack(){
        if (this.internalEffects.ArmorCrack) return;
        this.internalEffects.ArmorCrack = true;
        this.internalEffects.ArmorStrength -= 0.50;
        this.internalEffects.HitStrength -= 0.25;
    }

    removeArmorCrack(){
        if (!this.internalEffects.ArmorCrack) return;
        this.internalEffects.ArmorCrack = false;
        this.internalEffects.ArmorStrength += 0.50;
        this.internalEffects.HitStrength += 0.25;
    }

    applyMagiWeak() {
        this.internalEffects.Weakness.Magical.Magic += 0.25;
        this.internalEffects.Weakness.Magical.Fire += 0.25;
        this.internalEffects.Weakness.Magical.Frost += 0.25;
        this.internalEffects.Weakness.Magical.Light += 0.25;
        this.internalEffects.Weakness.Magical.Dark += 0.25;
    }

    removeMagiWeak(){
        this.internalEffects.Weakness.Magical.Magic -= 0.25;
        this.internalEffects.Weakness.Magical.Fire -= 0.25;
        this.internalEffects.Weakness.Magical.Frost -= 0.25;
        this.internalEffects.Weakness.Magical.Light -= 0.25;
        this.internalEffects.Weakness.Magical.Dark -= 0.25;
    }

    applyConfusion(){
        this.internalEffects.Weakness.Physical.Blunt += 0.50;
        this.internalEffects.Weakness.Physical.Slash += 0.50;
        this.internalEffects.HitChance -= 0.25;
    }

    removeConfusion(){
        this.internalEffects.Weakness.Physical.Blunt -= 0.50;
        this.internalEffects.Weakness.Physical.Slash -= 0.50;
        this.internalEffects.HitChance += 0.25;
    }

    applySlow(){
        this.externalRedux.DHChance += 0.50;
    }

    removeSlow(){
        this.externalRedux.DHChance -= 0.50;
    }

    applyBlind(){
        this.internalEffects.HitChance -= 0.50;
        this.externalRedux.DHChance += 0.50;
    }

    removeBlind(){
        this.internalEffects.HitChance += 0.50;
        this.externalRedux.DHChance -= 0.50;
    }

    applyFlash(){
        this.internalEffects.HitChance -= 0.50;
        this.externalRedux.CritChance += 0.50;
    }

    removeFlash(){
        this.internalEffects.HitChance += 0.50;
        this.externalRedux.CritChance -= 0.50;
    }

    reloadMaxHP(){
        this.maxFleshHP = this.flesh.HP;
        this.maxArmorHP = this.armor.HP;
        this.maxShieldHP = this.shield.HP;
    }
}

module.exports = {EnemyFab};