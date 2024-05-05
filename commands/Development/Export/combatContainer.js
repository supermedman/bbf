// Used for any external methods, calls, filtering related to combat itself. 
const {ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType} = require('discord.js');

// ===============================
//       COMBAT/ITEM KEYS
// ===============================
const dmgKeys = new Map([
    ["BLph", "Blunt"],
    ["SLph", "Slash"],
    ["MAma", "Magic"],
    ["RAma", "Rad"],
    ["FRma", "Frost"],
    ["FIma", "Fire"],
    ["DAma", "Dark"],
    ["LIma", "Light"],
    ["NUsp", "Null"],
    ["PAsp", "Pain"],
    ["SPsp", "Spirit"],
    ["CHsp", "Chaos"]
]);

// Not currently in use!
const rarKeys = new Map([
    ["r00", "Common"],
    ["r01", "Uncommon"],
    ["r02", "Rare"],
    ["r03", "Very Rare"],
    ["r04", "Epic"],
    ["r05", "Mystic"],
    ["r06", "?"],
    ["r07", "??"],
    ["r08", "???"],
    ["r09", "????"],
    ["r10", "Forgotten"],
    ["r12", "Unique"]
]);

// Not currently in use!
const disKeys = new Map([
    ["SL", "Slimy"],
    ["HE", "Herby"],
    ["WO", "Woody"],
    ["SK", "Skinny"],
    ["FL", "Fleshy"],
    ["SI", "Silky"],
    ["MA", "Magical"],
    ["ME", "Metalic"],
    ["RO", "Rocky"],
    ["GE", "Gemy"],
    ["TO", "Tooly"],
    ["UN", "Unique"]
]);

// Not currently in use!
const slotKeys = new Map([
    ["HEslo", "Headslot"],
    ["CHslo", "Chestslot"],
    ["LEslo", "Legslot"],
    ["MAslo", "Mainhand"],
    ["OFslo", "Offhand"]
]);

const statusKeys = new Map([
    ["Blunt", "Concussion"],
    ["Slash", "Bleed"],
    ["Magic", "MagiWeak"],
    ["Rad", "Confusion"],
    ["Frost", "Slow"],
    ["Fire", "Burn"],
    ["Dark", "Blind"],
    ["Light", "Flash"]
]);

// ===============================
//       ITEM STRUCTING
// ===============================

/**
 * 
 * @param {String} TEST_CODE ITEM_CODE used for deconstruction
 * @returns Useable damage type/value object list
 */
function checkingDamage(TEST_CODE) {
    const entryType = /TYP_/;
    const exitType = /_typ/;
  
    let startIndex = TEST_CODE.search(entryType);
    let endIndex = TEST_CODE.search(exitType);

    const dmgSlice = TEST_CODE.slice(startIndex + 4, endIndex);
    const dmgListed = dmgSlice.split("-");
  
    // Merge contents from any offhand equipped during this construction
    // Create entries for new values, Sum existing entries.
    const finalTypes = [];
    for (const DT of dmgListed){
      let cutStr = DT.split(":");
  
      const pushObj = {
        Type: dmgKeys.get(cutStr[0]),
        DMG: ~~cutStr[1]
      };
  
      if (pushObj.Type !== "Magic") finalTypes.push(pushObj);
      // Shifting magic to the front to make sure it always gets checked first when applying status effects!
      if (pushObj.Type === "Magic") finalTypes.unshift(pushObj); 
    }
    return finalTypes;
}

// ===============================
//       LOOKUP TABLES
// ===============================

const fleshTypes = ["Flesh", "Magical Flesh", "Specter", "Boss"];
const armorTypes = ["Armor", "Bark", "Fossil", "Demon"];
const shieldTypes = ["Phase Demon", "Phase Aura", /*"Plot Armor"*/];

const damageModifier = [-0.75, -0.50, -0.25, 0, 0.25, 0.50, 0.75];
const damageKeyIndexer = ["---", "--", "-", "=", "+", "++", "+++"];

const columnMatch = ["Flesh", "Armor", "Bark", "Fossil", "Magical Flesh", "Specter", "Demon", "Phase Demon", "Phase Aura", "Boss", "Plot Armor"];
const rowMatch = ["Blunt", "Slash", "Magic", "Rad", "Frost", "Fire", "Dark", "Light", "Null", "Pain", "Spirit", "Chaos", "True"];

const damageMatchTable = [
    ["+", "+++", "+", "++", "-", "---", "=", "=", "---", "-", "---",],
    ["++", "-", "+", "-", "+", "---", "=", "=", "---", "-", "---"],
    ["=","=","=","=","--","++","+","-","-","-", "---"],
    ["+++","+","=","=","++","--","+","+","++","+", "---"],
    ["+","++","++","-","-","-","++","--","-","-", "---"],
    ["++", "-", "+++", "-", "-", "-", "-", "-", "-", "-", "---"],
    ["=","=","+","=","-","--","--","+++","-","-", "---"],
    ["=","=","--","=","-","+++","+++","--","-","-", "---"],
    ["=","=","=","=","+++","=","+","++","+++","++", "---"],
    ["++","+","+","+","+","+","+","+","+","++", "---"],
    ["+","+","+","+","++","+","+","+","+","++", "---"],
    ["++","+","+","+","+","+","+","+","+","++", "---"],
];

// ===============================
//       STATUS EFFECTS
// ===============================

const {statusContainer} = require('./statusEffect');


// ===============================
//       HELPER METHODS
// ===============================

const rollChance = (chance) => {
    return (Math.random() <= chance) ? 1 : 0;
};

// ===============================
//       CORE ATTACK CODE
// ===============================

const {EnemyFab} = require('./Classes/EnemyFab');

/**
 * 
 * @param {Object[]} dmgList Array of DMG Objects ready to be modified
 * @param {EnemyFab} enemy Enemy Class Object
 * @returns {Object outcome: String, dmgDealt?: Number, dmgCheck?: Object[]}
 */
function attackEnemy(dmgList, enemy){
    let shieldDMG = [], armorDMG = [], fleshDMG = [];
    const hpREF = [enemy.shield.Type, enemy.armor.Type, enemy.flesh.Type];

    // Initial locator for applying additive damage due to applied status effects
    // Physical Damage
    const enemyPhysWeak = enemy.internalEffects.Weakness.Physical;
    const mappedPhysWeak = [enemyPhysWeak.Blunt, enemyPhysWeak.Slash];
    const physTypeMap = ["Blunt", "Slash"];

    const applyPhysMod = (dmgObj) => {
        if (physTypeMap.indexOf(dmgObj.Type) !== -1) return mappedPhysWeak[physTypeMap.indexOf(dmgObj.Type)];
        return 0;
    };

    // Initial locator for applying additive damage due to applied status effects
    // Magical Damage
    const enemyMagicWeak = enemy.internalEffects.Weakness.Magical;
    const mappedMagiWeak = [enemyMagicWeak.Magic, enemyMagicWeak.Fire, enemyMagicWeak.Frost, enemyMagicWeak.Light, enemyMagicWeak.Dark];
    const magiTypeMap = ["Magic", "Fire", "Frost", "Light", "Dark"];

    const applyMagiMod = (dmgObj) => {
        if (magiTypeMap.indexOf(dmgObj.Type) !== -1) return mappedMagiWeak[magiTypeMap.indexOf(dmgObj.Type)];
        return 0;
    };

    //Shield = 0, Armor = 1, Flesh = 2
    for (let i = 0; i < 3; i++){
        for (const dmgObj of dmgList){
            // Lookup damage x hp type match with table ref
            const yLookup = rowMatch.indexOf(dmgObj.Type);
            const xLookup = columnMatch.indexOf(hpREF[i]);

            // Create modified damage value
            let modBY = damageModifier[damageKeyIndexer.indexOf(damageMatchTable[yLookup][xLookup])];

            if (enemy.activeEffects.length > 0){
                modBY += applyPhysMod(dmgObj); // if (dmgTypePhysComp(dmgObj)) 
                modBY += applyMagiMod(dmgObj); // if (dmgTypeMagiComp(dmgObj))
            }

            // Create new obj containing modified damage and the hp type modified against
            const moddedDMG = {
                Type: dmgObj.Type,
                DMG: dmgObj.DMG + (dmgObj.DMG * modBY),
                Against: { Type: hpREF[i] }
            };

            // Filter to correct list for faster checking later
            if (i === 0) shieldDMG.push(moddedDMG);
            if (i === 1) armorDMG.push(moddedDMG);
            if (i === 2) fleshDMG.push(moddedDMG);
        }
    }

    // Check for active shield, skip if none
    if (enemy.shield.HP > 0) {
        const totalShieldDmg = shieldDMG.reduce((total, dobj) => total + dobj.DMG, 0);
        console.log('Total Shield Damage: %d', totalShieldDmg);
        if (totalShieldDmg < enemy.shield.HP) {
            // Shield remains after damage, skip status effect calculations as well as further armor/flesh damage calculations
            enemy.shield.HP -= totalShieldDmg;
            return {outcome: 'Shield Active'};
        } else if (totalShieldDmg === enemy.shield.HP) {
            // Shield breaks, no damage remains, skip status effect & further dmg calculations
            //enemy.shield.HP = 0;
            return {outcome: 'Shield Break: Damage Exhausted'};
        }

        // =========================
        // BULK CODE
        // =========================
        
        // Sort dmg highest to lowest before looping on shield
        shieldDMG.sort((a, b) => { return b.DMG - a.DMG; });

        // Shield can be broken, calculate values after damage to shield is dealt.
        let enemyShieldRef = enemy.shield.HP;
        for (const sDmg of shieldDMG){
            if (sDmg.DMG > enemyShieldRef){
                // Shield Break, damage overflow
                sDmg.DMG -= enemyShieldRef;
                sDmg.used = true;
                enemyShieldRef = 0;
            } else if (sDmg.DMG === enemyShieldRef){
                // Shield Break, damage exhausted
                sDmg.DMG = 0;
                sDmg.spent = true;
                enemyShieldRef = 0;
            } else {
                // Shield Remains, prepare next loop.
                enemyShieldRef -= sDmg.DMG;
                sDmg.DMG = 0;
                sDmg.spent = true;
            }
            // Shield has been broken
            if (enemyShieldRef <= 0) break;
        }

        let shieldDmgUsed = shieldDMG.filter(dObj => dObj.used);
        const shieldDmgSpent = shieldDMG.filter(dObj => dObj.spent);
        if (shieldDmgSpent.length > 0) {
            // Damage spent, remove entries from other type lists
            for (const spentDmg of shieldDmgSpent){
                const checkFor = (ele) => ele.Type === spentDmg.Type;
                // Apply spent prop to both entries found using the above predicate method
                // While also setting DMG values to 0
                armorDMG[armorDMG.findIndex(checkFor)].spent = true;
                armorDMG[armorDMG.findIndex(checkFor)].DMG = 0;

                fleshDMG[fleshDMG.findIndex(checkFor)].spent = true;
                fleshDMG[fleshDMG.findIndex(checkFor)].DMG = 0;
            }
        } 
        if (shieldDmgUsed.length > 0) {
            // Modify damage type used after checking diff values  
            shieldDmgUsed = shieldDmgUsed[0];
            const checkFor = (ele) => ele.Type === shieldDmgUsed.Type;
            // If remaining dmg is > armor dmg do nothing, preventing excessive dmg scaling
            // If remaining dmg is < armor dmg scale dmg using type match to prevent dmg loss
            if (armorDMG[armorDMG.findIndex(checkFor)].DMG > shieldDmgUsed.DMG) {
                //console.log('Type Damage after shield break, before mod: %d', shieldDmgUsed.DMG);
                const shieldDmgCarry = singleLookup(shieldDmgUsed, applyPhysMod(shieldDmgUsed), applyMagiMod(shieldDmgUsed));
                //console.log('Type Damage after shield break, after mod: %d', shieldDmgCarry.DMG);
                armorDMG[armorDMG.findIndex(checkFor)].DMG = shieldDmgCarry.DMG;
            }
        }
    }

    // Check for active armor, skip if none
    if (enemy.armor.HP > 0) {
        const totalArmorDMG = armorDMG.reduce((total, dObj) => total + dObj.DMG, 0);
        console.log('Total Armor Damage: %d', totalArmorDMG);
        if (totalArmorDMG < enemy.armor.HP){
            // Armor left after damage dealt
            // Check if status effects can be applied!
            return {outcome: 'Armor Active: Check Status', dmgDealt: totalArmorDMG, dmgCheck: armorDMG};
        } else if (totalArmorDMG === enemy.armor.HP){
            // Armor break, all damage exhausted. 
            return {outcome: 'Armor Break: Damage Exhausted', dmgDealt: totalArmorDMG};
        }

        // =========================
        // BULK CODE
        // =========================

        // Sort damage highest to lowest before looping on armor
        armorDMG.sort((a, b) => { return b.DMG - a.DMG; });

        // Armor can be broken, loop till broken and calculate remaining values
        let enemyArmorRef = enemy.armor.HP;
        for (const aDmg of armorDMG) {
            if (aDmg.DMG > enemyArmorRef){
                // Armor Break, damage overflow
                aDmg.DMG -= enemyArmorRef;
                aDmg.used = true;
                enemyArmorRef = 0;
            } else if (aDmg.DMG === enemyArmorRef){
                // Armor Break, damage exhausted
                aDmg.DMG = 0;
                aDmg.spent = true;
                enemyArmorRef = 0;
            } else {
                // Armor Remains, prepare next loop.
                enemyArmorRef -= aDmg.DMG;
                aDmg.DMG = 0;
                aDmg.spent = true;
            }
            // Armor has been broken
            if (enemyArmorRef <= 0) break;
        }

        let armorDmgUsed = armorDMG.filter(dObj => dObj.used);
        const armorDmgSpent = armorDMG.filter(dObj => dObj.spent);
        if (armorDmgSpent.length > 0) {
            for (const spentDmg of armorDmgSpent){
                const checkFor = (ele) => ele.Type === spentDmg.Type;
                // Apply spent prop to both entries found using the above predicate method
                // While also setting DMG values to 0
                fleshDMG[fleshDMG.findIndex(checkFor)].spent = true;
                fleshDMG[fleshDMG.findIndex(checkFor)].DMG = 0;
            }
        }
        if (armorDmgUsed.length > 0) {
            // Modify damage type used after checking diff values  
            armorDmgUsed = armorDmgUsed[0];
            const checkFor = (ele) => ele.Type === armorDmgUsed.Type;
            // If remaining dmg is > flesh dmg do nothing, preventing excessive dmg scaling
            // If remaining dmg is < flesh dmg scale dmg using type match to prevent dmg loss
            if (fleshDMG[fleshDMG.findIndex(checkFor)].DMG > armorDmgUsed.DMG) {
                //console.log('Type Damage after armor break, before mod: %d', armorDmgUsed.DMG);
                const armorDmgCarry = singleLookup(armorDmgUsed, applyPhysMod(armorDmgUsed), applyMagiMod(armorDmgUsed));
                //console.log('Type Damage after armor break, after mod: %d', armorDmgCarry.DMG);
                fleshDMG[fleshDMG.findIndex(checkFor)].DMG = armorDmgCarry.DMG;
            }
        }
    }

    // Check if flesh HP can be reduced to 0
    const totalFleshDMG = fleshDMG.reduce((total, dObj) => total + dObj.DMG, 0);
    console.log('Total Flesh Damage: %d', totalFleshDMG);
    if (totalFleshDMG < enemy.flesh.HP) {
        // Enemy stays alive
        // Check for status effects to be applied
        return {outcome: 'Flesh Active: Check Status', dmgDealt: totalFleshDMG, dmgCheck: fleshDMG};
    } else {
        // Enemy is dead if this is reached!
        return {outcome: 'Dead'};
    }
}

/**
 * 
 * @param {Object} dmgObj Damage Object containing HP types and dmg values
 * @param {...[Object]} extraMod Results from checking against both phys and magi enemy.internalEffects.Weakness
 */
function singleLookup(dmgObj, ...extraMod) {
    const yLookup = rowMatch.indexOf(dmgObj.Type);
    const xLookup = columnMatch.indexOf(dmgObj.Against.Type);

    const modBY = damageModifier[damageKeyIndexer.indexOf(damageMatchTable[yLookup][xLookup])] + extraMod[0] + extraMod[1];

    dmgObj.DMG = dmgObj.DMG + (dmgObj.DMG * modBY);

    return dmgObj;
}

/**
 * This function handles all status checks based on damage type using status effect container object methods
 * @param {Object} dmgObj Damage object used to check for status effect
 * @param {Object} enemy EnemyFab object type
 * @returns false | {Type: String}
 */
function statusCheck(dmgObj, enemy){
    const flesh = enemy.flesh;
    const armor = enemy.armor;
    const curEffects = enemy.activeEffects;
    
    
    // Modify the chances for each based on enemy.externalRedux
    // Base values of 0.15 during prototyping
    const critChance = 0.15 + enemy.externalRedux.CritChance;
    const doubleHitChance = 0.15 + enemy.externalRedux.DHChance;

    const condition = {
        Crit: rollChance(critChance),
        DH: rollChance(doubleHitChance)
    };

    let returnOutcome = false;
    switch(dmgObj.Type){
        case "Blunt":
            returnOutcome = statusContainer.Concussion(armor, flesh, dmgObj.DMG, condition, curEffects);
        break;
        case "Slash":
            returnOutcome = statusContainer.Bleed(armor, flesh, dmgObj.DMG, condition, curEffects);
            //console.log('Slash Proc: ', returnOutcome);
            if (returnOutcome.Strength){
                return returnOutcome = {
                    Type: dmgObj.Type,
                    Strength: returnOutcome.Strength
                };
            }
        break;
        case "Magic":
            returnOutcome = statusContainer.Magic_Weakness(armor, flesh, dmgObj.DMG, condition, curEffects);
        break;
        case "Rad":
            returnOutcome = statusContainer.Confusion(armor, flesh, dmgObj.DMG, condition, curEffects);
        break;
        case "Frost":
            returnOutcome = statusContainer.Slow(armor, flesh, dmgObj.DMG, condition, curEffects);
        break;
        case "Fire":
            returnOutcome = statusContainer.Burn(armor, flesh, dmgObj.DMG, condition, curEffects);
            //console.log('Fire Proc: ', returnOutcome);
            if (returnOutcome.Strength){
                return returnOutcome = {
                    Type: dmgObj.Type,
                    Strength: returnOutcome.Strength
                };
            }
        break;
        case "Dark":
            returnOutcome = statusContainer.Blind(armor, flesh, dmgObj.DMG, condition, curEffects);
        break;
        case "Light":
            returnOutcome = statusContainer.Flash(armor, flesh, dmgObj.DMG, condition, curEffects);
        break;
        default:
            // No effect applied
            //console.log('DEFAULT REACHED!');
        break;
    }

    //console.log(returnOutcome);
    if (returnOutcome){
        returnOutcome = {
            Type: dmgObj.Type
        };
    }

    return returnOutcome;
}

// ===============================
//     CORE INTERACTIVE CODE
// ===============================

const {Combat} = require('./Classes/Combat');

// Generate combat instance
async function combatStartedTEMP(interaction){
    const buttonObject = {
        attackButton: new ButtonBuilder()
        .setCustomId(`attack-${interaction.user.id}`)
        .setLabel('Strike')
        .setStyle(ButtonStyle.Primary)
    };

    const actionRow = new ActionRowBuilder().addComponents(buttonObject.attackButton);

    const combatMessage = await interaction.followUp({content: 'Combat Started', components: [actionRow]});

    const filter = (i) => i.user.id === interaction.user.id;

    const combCollecter = combatMessage.createMessageComponentCollecter({
        ComponentType: ComponentType.Button,
        filter,
        time: 900000,
    });

    const combatInstance = new Combat(interaction.user, weaponCode, buttonObject, actionRow, combCollecter);



    combatInstance.combCollecter.on('collect', (COI) => {
        if (COI.customId === combatInstance.attackButton.customId){
            combatInstance.setActive();

            attackEnemy(weaponDamage, enemy);
        }
    });
}
// Setup Universal Button Handles


const combatLog = {
    title: "Enemy",
    color: 0o0,
    description: "Enemy Info Here",
    fields: [
        {name: "Shield", value: 10},
        {name: "Armor", value: 150},
        {name: "Flesh", value: 300},
    ]
};


// Display +-00-+
const { AttachmentBuilder } = require('discord.js');

const Canvas = require('@napi-rs/canvas');

const canvas = Canvas.createCanvas(700, 300);
const ctx = canvas.getContext('2d');

ctx.fillStyle = 0x1d1f20;
ctx.fillRect(0, 0, canvas.width, canvas.height);



module.exports = {attackEnemy, statusCheck, checkingDamage};