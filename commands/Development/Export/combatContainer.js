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

function handleActiveStatus(result, enemy){
    const statusBrain = /Active: Check Status/;
    const indexedResult = (result) ? result.outcome.search(statusBrain) : 'None';
    if (indexedResult === 'None' || indexedResult === -1) return "Status Not Checked";
    
    // Checking status effects
    // Clean wipe remaining HP values before checking status effects
    const hpTypeSlice = result.outcome.slice(0, indexedResult - 1);
    switch(hpTypeSlice){
        case "Armor":
            enemy.shield.HP = 0;
        break;
        case "Flesh":
            enemy.shield.HP = 0;
            enemy.armor.HP = 0;
        break;
    }

    // Status effects need to be checked using given damage types.
    for (const dmgObj of result.dmgCheck){
        // Use the outcome for applicable effect construction
        const effectOutcome = statusCheck(dmgObj, enemy);

        // ==========================
        // APPLY CRIT/DH DAMAGE MODS HERE
        // ==========================

        // If outcome is true or false, 
        // Otherwise create applicable effect and push to enemy effects list
        if (effectOutcome instanceof Object) {
            const effectObj = (effectOutcome.Strength) ? { Type: effectOutcome.Strength, IsNew: true } : { Type: statusKeys.get(effectOutcome.Type), IsNew: true } ;

            // If effect type is already applied to the enemy, prevent reapplication
            const doubleCheck = enemy.activeEffects.filter(effect => effect.Type === effectObj.Type);
            if (doubleCheck.length > 0) continue;
            enemy.activeEffects.push(effectObj);
        }
    }

    switch(hpTypeSlice){
        case "Armor":
            enemy.armor.HP -= result.dmgDealt;
        break;
        case "Flesh":
            enemy.flesh.HP -= result.dmgDealt;
        break;
    }
    
    return {DamagedType: hpTypeSlice};
}

function applyActiveStatus(result, enemy){
    const damageReturnObj = {
        totalAcc: 0,
        physAcc: 0,
        magiAcc: 0,
        blastAcc: 0,
        newEffects: []
    };

    let totalEffectDamage = 0;

    let physAcc = 0, magiAcc = 0;
    for (const effect of enemy.activeEffects){
        // Checking DOT effects
        switch(effect.Type){
            case "Little Bleed":
                // 5% Max HP dmg
                physAcc += (enemy.maxFleshHP * 0.05); 
            break;
            case "Bleed":
                // 10% Max HP dmg
                physAcc += (enemy.maxFleshHP * 0.10); 
            break;
            case "Big Bleed":
                // 15% Max HP dmg
                physAcc += (enemy.maxFleshHP * 0.15); 
            break;
            case "Inferno":
                // 15% Max HP dmg + 25% armor redux (Only Applies Once!)
                enemy.applyArmorBurn();
                magiAcc += (enemy.armor.HP > 0) ? (enemy.maxArmorHP * 0.15) : (enemy.maxFleshHP * 0.15); 
            break;
            case "Burn":
                // 12% Max HP dmg
                magiAcc += (enemy.armor.HP > 0) ? (enemy.maxArmorHP * 0.12) : (enemy.maxFleshHP * 0.12); 
            break;
            case "Smolder":
                // 7% Max HP dmg
                magiAcc += (enemy.armor.HP > 0) ? (enemy.maxArmorHP * 0.07) : (enemy.maxFleshHP * 0.07); 
            break;
            default:
                // No damage dealt
            break;
        }
        // ============================
        // APPLY ANY ADDITIONAL EFFECT MODIFIERS HERE 
        // ============================
        if (!effect.IsNew) continue;
        damageReturnObj.newEffects.push({Effect: effect.Type});
        switch(effect.Type) {
            case "Concussion":
                // -25% base damage, apply armorCrack
                enemy.applyArmorCrack();
            break;
            case "MagiWeak":
                // +25% damage from magic types
                enemy.applyMagiWeak();
            break;
            case "Confusion":
                // Enemy hit chance -25%, Physical damage +50%
                enemy.applyConfusion();
            break;
            case "Slow":
                // Double hit chance +50% 
                enemy.applySlow();
            break;
            case "Blind":
                // Enemy hit chance -50%, Double hit chance +50%
                enemy.applyBlind();
            break;
            case "Flash":
                // Enemy hit chance -50%, Crit chance +50% 
                enemy.applyFlash();
            break;
        }
        effect.IsNew = false;
    }
    if ((physAcc + magiAcc) > 0) console.log('DOT damage to be dealt, BEFORE MODS: %d', physAcc + magiAcc);

    // Adjust armor values here, accounting for any status effects applied this turn
    if (enemy.internalEffects.ArmorStrength !== 0) console.log('Armor Strength After Effects: %d', enemy.internalEffects.ArmorStrength);

    // ============================
    // DEAL DoT TO ENEMY HERE, ACCOUNT FOR ARMOR REDUX AND WEAKNESSES
    // ============================
    physAcc = physAcc + (physAcc * enemy.internalEffects.Weakness.Physical.Slash);
    magiAcc = magiAcc + (magiAcc * enemy.internalEffects.Weakness.Magical.Fire);
    
    if ((physAcc + magiAcc) > 0) console.log('DOT damage to be dealt, AFTER MODS: %d', physAcc + magiAcc);

    // Check if bleed is dealt to bark, if not, dealt to flesh instead
    if (enemy.armor.Type === "Bark" && enemy.armor.HP > 0) {enemy.armor.HP -= physAcc;} else {
        enemy.flesh.HP -= physAcc;
    }

    // Check if burn is dealt to armor, if not, dealt to flesh instead
    // If bleed is dealt to bark and bark is broken, this damage will automatically be dealt to flesh hp, even if it scaled with armor!!
    if (enemy.armor.HP > 0) {enemy.armor.HP -= magiAcc;} else {
        enemy.flesh.HP -= magiAcc;
    }

    damageReturnObj.physAcc = physAcc;
    damageReturnObj.magiAcc = magiAcc;

    // Track total damage to compare later
    totalEffectDamage = physAcc + magiAcc;

    // CHECKING FOR BLAST DAMAGE HERE!
    const fireProcList = ["Inferno", "Burn", "Smolder"];
    const checkFireStatusProc = (ele) => fireProcList.some(type => ele.Type === type);
    const checkSlowStatusProc = (ele) => ele.Type === "Slow";

    // Check if both damage types have been dealt at once to see if blast can still activate
    const checkFireDamage = (ele) => ele.Type === "Fire";
    const checkFrostDamage = (ele) => ele.Type === "Frost";

    // Crazy blast proc check 
    if ((enemy.activeEffects.findIndex(checkFireStatusProc) !== -1 && enemy.activeEffects.findIndex(checkSlowStatusProc) !== -1) || ((result.dmgCheck.findIndex(checkFireDamage) !== -1 && result.dmgCheck[result.dmgCheck.findIndex(checkFireDamage)].DMG > 0) && (result.dmgCheck.findIndex(checkFrostDamage) !== -1 && result.dmgCheck[result.dmgCheck.findIndex(checkFrostDamage)].DMG > 0))){
        const fireDamage = result.dmgCheck[result.dmgCheck.findIndex(checkFireDamage)].DMG;
        const frostDamage = result.dmgCheck[result.dmgCheck.findIndex(checkFrostDamage)].DMG;

        const blastOutcome = statusContainer.Blast(enemy.armor, enemy.flesh, fireDamage, frostDamage, enemy.internalEffects.Weakness, magiAcc);
        if (blastOutcome.DMG > 0) {
            totalEffectDamage += blastOutcome.DMG;
            damageReturnObj.blastAcc = blastOutcome.DMG;

            if (blastOutcome.Armor && blastOutcome.DMG > enemy.armor.HP){
                // Armor Breaks, carry damage to HP
                blastOutcome.DMG -= enemy.armor.HP;
                enemy.armor.HP = 0;
                enemy.flesh.HP -= blastOutcome.DMG;
            } else if (blastOutcome.Armor) {
                // Armor Remains
                enemy.armor.HP -= blastOutcome.DMG;
            } else {
                // No Armor
                enemy.flesh.HP -= blastOutcome.DMG;
            }

            // Remove any slow/burn effects currently active.
            if (enemy.activeEffects.findIndex(checkFireStatusProc) !== -1) {
                // If inferno removed, remove armor burn as well
                if (enemy.activeEffects[enemy.activeEffects.findIndex(checkFireStatusProc)].Type === "Inferno") enemy.removeArmorBurn(); 
                enemy.activeEffects.splice(enemy.activeEffects.findIndex(checkFireStatusProc), 1);
            }
            if (enemy.activeEffects.findIndex(checkSlowStatusProc) !== -1) {
                enemy.activeEffects.splice(enemy.activeEffects.findIndex(checkSlowStatusProc), 1);
                enemy.removeSlow();
            }
        }
    }

    damageReturnObj.totalAcc = totalEffectDamage;

    return damageReturnObj;
}

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
 * @returns {Object outcome: String, dmgDealt: Number, dmgCheck?: Object[]}
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
            enemy.shield.HP = 0;
            return {outcome: 'Shield Break: Damage Exhausted', dmgDealt: totalShieldDmg};
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
            enemy.armor.HP = 0;
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
        return {outcome: 'Dead', dmgDealt: totalFleshDMG};
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

// ===============================
//     CORE INTERACTIVE CODE
// ===============================

const {Combat} = require('./Classes/Combat');

// Generate combat instance
async function combatStartedTEMP(interaction, weaponCode){
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

    const combatInstance = new Combat(interaction.user, weaponCode/*, buttonObject, actionRow, combCollecter*/);



    combCollecter.on('collect', (COI) => {
        if (COI.customId === buttonObject.attackButton.customId){
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
/*
const { AttachmentBuilder } = require('discord.js');

const Canvas = require('@napi-rs/canvas');

const canvas = Canvas.createCanvas(700, 300);
const ctx = canvas.getContext('2d');

ctx.fillStyle = 0x1d1f20;
ctx.fillRect(0, 0, canvas.width, canvas.height);
*/


module.exports = {attackEnemy, checkingDamage, handleActiveStatus, applyActiveStatus};