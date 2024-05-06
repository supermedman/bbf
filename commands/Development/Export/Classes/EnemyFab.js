// Main enemy class container

const randArrPos = (arr) => {
    return arr[(arr.length > 1) ? Math.floor(Math.random() * arr.length) : 0];
};

const fleshTypes = ["Flesh", "Magical Flesh", "Specter", "Boss"];
const armorTypes = ["Armor", "Bark", "Fossil", "Demon"];
const shieldTypes = ["Phase Demon", "Phase Aura", /*"Plot Armor"*/];

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

/**
 * Main enemy class constructor
 * Contains methods for all status effects being applied and removed.
 */
class EnemyFab {
    constructor() {
        //Math.floor(Math.random() * (this.taskContents.MaxNeed - this.taskContents.MinNeed + 1) + this.taskContents.MinNeed);
        //const enemyLevel = Math.floor(Math.random() * (100 - 1 + 1) + 1);
        this.level = Math.floor(Math.random() * (100 - 1 + 1) + 1);

        this.flesh = {
            Type: randArrPos(fleshTypes)
        };
        this.flesh.HP = fleshHPRange(this.level, this.flesh.Type);
        this.maxFleshHP = this.flesh.HP;
        
        this.armor = {
            Type: randArrPos(armorTypes)
        };
        this.armor.HP = armorHPRange(this.level, this.armor.Type);
        this.maxArmorHP = this.armor.HP;

        this.shield = {
            Type: randArrPos(shieldTypes)
        };
        this.shield.HP = shieldHPRange(this.level, this.shield.Type);
        this.maxShieldHP = this.shield.HP;

        this.activeEffects = [];

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