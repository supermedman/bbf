// Used for any external methods, calls, filtering related to crafting/item generation.
// =======================
//    HOW WILL IT WORK?
// =======================
/**     WEAPONS/MAINHAND
 *  - Castes:
 *   - 3 CATS:
 *      - Magic
 *      - Melee
 *      - Special
 *   - 1 || 2 hands
 * 
 *  - Requirements: (Ordered by amount needed)
 *   - Magic:
 *      - Magical (Both)
 *      - Skinny (Tome/1 Hand)|| Woody (Staff/2 Hand)
 *      - Gemy (Both)
 *   - Melee:
 *      - Metalic (Blade/1||2 Hands) || Woody (Polearm/2 Hands)
 *      - Skinny (Blade/1||2 Hands) || Metalic (Polearm/2 Hands)
 *      - Woody (Blade/1||2 Hands) || Skinny (Polearm/2 Hands)
 *   - Special: TBD
 *      - Fleshy?
 *      - Slimy?
 *      - Rocky?
 *   - ALL CATS:
 *      - Tooly
 * 
 *  - Types:
 *   - Between 1 and 5 different types
 *   - Caste CATS have predefined "Natural Types"
 *      - Magic: Magic, Fire, Frost, Dark, Light
 *      - Melee: Blunt, Slash, Rad?
 *      - Special: Spirit, Pain, Chaos, Null
 *   - Additional types can be "Imbued" by using PURE essence 
 *      - This is capped at 2, and adds a flat damage value
 *      - If a damage type already exists this flat value is additive towards it
 * 
 *  - Damage:
 *   - Min damage value locked at 1 (maybe 2?)
 *   - Max damage value will be soft capped dependent on testing 
 *   - Initial Base Damage Formula:
 * 
 *       = ((25 + ((5 * h1)/a2)) * (1 + a1))log(x)
 * 
 * where 'a1' is rarity (0-10), 'a2' is damage type amount (1-5),
 * where 'h1' is hands required (1 or 2), 
 * and where 'x' (51 < x > 1) is material amount
 * 
 */
// ===============
//  CASTE OPTIONS
// ===============
/**
 *  == MAGIC 1H ==
 *   - Wand (Magical, Woody, Gemy, Tooly?)
 *   - Tome (Magical, Skinny, Gemy, Tooly?)
 * 
 *  == MAGIC 2H ==
 *   - Staff (Magical, Woody, Gemy, Tooly?)
 *   - Focus (Magical, Metalic, Gemy, Tooly?)
 * 
 *  == MELEE 1H ==
 *   - Light Blade (Metalic, Skinny, Woody, Tooly?)
 *   - Mace (Metalic, Woody, Skinny, Tooly?)
 * 
 *  == MELEE 2H ==
 *   - Polearm (Woody, Metalic, Skinny, Tooly?)
 *   - Heavy Blade (Metalic, Skinny, Woody, Tooly?)
 * 
 *  == SPECIAL 1H ==
 *   - TBD
 * 
 *  == SPECIAL 2H ==
 *   - TBD
 */
// =======================
//   WHAT IS ALLOWED?
// =======================
/**
 *  == What is user input defined? ==
 *  - Caste CAT
 *      - CAT Style (If any: EX. Blade||Polearm)
 *  - Hands Required?
 *  - PURE Types to add
 * 
 *  == What follows this prompt? ==
 *  - Required Material types
 *  - Minimum Material Amount
 *      - Required Base Total: 30
 *      - Mat 1 (m1): 15
 *      - Mat 2 (m2): 10
 *      - Mat 3 (m3): 5
 *  - Additional Material Amount
 *      - Optional Added Total: 31-50
 *      - Mat 4 (m4)(typeof Tooly): 1-20
 *  
 *  == How are these values used? ==
 *  - Used for itemGenConstant()
 *  - Used to calculate rarity 
 *      - Weighted by amount
 *      - Averaged to find final rarity
 *      - Formula:
 *  w1 = 30% = (m1 * 2)
 *  w2 = 20% = (m2 * 2)
 *  w3 = 10% = (m3 * 2)
 * 
 *  w4? = 40% = (m4 * 2)
 *  m4 = 0 
 *  ? (w1 + 20%, w2 + 10%, w3 + 10%) 
 *  : (w3 + (10% - w4), w2 + (10% - w4), w1 + (20% - w4))
 * 
 *  r1 = m1 Rar
 *  r2 = m2 Rar
 *  r3 = m3 Rar
 *  r4? = m4 Rar
 *  
 *  Highest Weighted Rarity:
 *  Rarity = func()
 */
const { rollChance, inclusiveRandNum, randArrPos, getTypeof, makeCapital } = require('../../../uniHelperFunctions');
//const { Craftable } = require('./Classes/CraftingCaste');
const { baseCheckRarName } = require('./itemStringCore');

// ===============================
//       HELPER METHODS
// ===============================

// const inclusiveRandNum = (max, min) => {
//     return Math.floor(Math.random() * (max - min + 1) + min);
// };

// const randArrPos = (arr) => {
//     return arr[(arr.length > 1) ? Math.floor(Math.random() * arr.length) : 0];
// };


// ===============================
//         GEN FUNCTIONS
// ===============================

/**
 * This method takes item properties and calculates the final total max damage possible for 
 * each damage type based on the given parameters
 * 
 * EX. itemGenDmgConstant(10, 5, 1, 50); 
 * 
 * Returns 485.905421
 * @param {number} rarity Base rarity of the item being crafted
 * @param {number} dmgAmount Number of different damage types
 * @param {number} hands Number of hands to use: 1 or 2
 * @param {number} matAmount Total number of materials used for crafting
 * @returns {number}
 */
const itemGenDmgConstant = (rarity, dmgAmount, hands, matAmount) => {
    let a1 = rarity, a2 = dmgAmount, h1 = hands, x = matAmount;

    let dmgReturn = ((25 + ((5 * h1) / a2)) * (1 + a1)) * Math.log10(x);

    console.log(`Rarity: ${a1}, Dmg Type Amount: ${a2}, Hands: ${h1}, Material Amount: ${x}`);
    //console.log(dmgReturn);
    return dmgReturn;
};

/**
 * This method takes item properties anc calculates the final total max defence possible for 
 * each type based on the given parameters
 * 
 * EX. itemGenDefConstant(10, 5, "Chestslot", 50);
 * 
 * Returns 37.377
 * @param {number} rarity Base rarity of the item being crafted
 * @param {number} defAmount Number of different defence types
 * @param {string} slotType Items slot type
 * @param {number} matAmount Total number of materials used for crafting
 * @returns {number}
 */
const itemGenDefConstant = (rarity, defAmount, slotType, matAmount) => {
    let a1 = rarity, a2 = defAmount, h1 = (slotType === 'Chestslot') ? 2 : 1, x = matAmount;

    let defReturn = (((5 * h1) * (1 + a1)) / a2) * Math.log10(x);
    console.log(`Rarity: ${a1}, Def Type Amount: ${a2}, Slot Type: ${h1}, Material Amount: ${x}`);
    return defReturn;
};

/**
 * This method checks the caste type and preloads the casteObj with the needed values 
 * in order to be used further.
 * casteObj is the base Object for the final item.
 * @param {string} type The specific caste type name picked for use by user
 * @param {string} slot The slot of the item
 * @returns {({name: string, hands: number, dmgCat: string, mats: string[]})}
 */
const itemCasteFilter = (type, slot) => {
    let casteObj = {
        name: type,
        slot: slot,
        hands: 1,
        dmgCat: "",
        mats: []
    };
    switch(slot) {
        case "Mainhand":
            switch(type){
                case "Wand":
                    casteObj.mats = ["Magical", "Woody", "Gemy"];
                    casteObj.dmgCat = "Magic";
                break;
                case "Tome":
                    casteObj.mats =  ["Magical", "Skinny", "Gemy"];
                    casteObj.dmgCat = "Magic";
                break;
                case "Staff":
                    casteObj.mats =  ["Magical", "Woody", "Gemy"];
                    casteObj.hands = 2;
                    casteObj.dmgCat = "Magic";
                break;
                case "Focus":
                    casteObj.mats =  ["Magical", "Metalic", "Gemy"];
                    casteObj.hands = 2;
                    casteObj.dmgCat = "Magic";
                break;
                case "Light Blade":
                    casteObj.mats =  ["Metalic", "Skinny", "Woody"];
                    casteObj.dmgCat = "Melee";
                break;
                case "Mace":
                    casteObj.mats =  ["Metalic", "Woody", "Skinny"];
                    casteObj.dmgCat = "Melee";
                break;
                case "Polearm":
                    casteObj.mats =  ["Woody", "Metalic", "Skinny"];
                    casteObj.hands = 2;
                    casteObj.dmgCat = "Melee";
                break;
                case "Heavy Blade":
                    casteObj.mats =  ["Metalic", "Skinny", "Woody"];
                    casteObj.hands = 2;
                    casteObj.dmgCat = "Melee";
                break;
                case "Eye Stone":
                    casteObj.mats =  ["Magical", "Rocky", "Metalic"];
                    casteObj.hands = 1;
                    casteObj.dmgCat = "Special";
                break;
                case "Mage Blade":
                    casteObj.mats =  ["Magical", "Gemy", "Skinny"];
                    casteObj.hands = 2;
                    casteObj.dmgCat = "Special";
                break;
                case "Claw":
                    casteObj.mats =  ["Metalic", "Skinny", "Fleshy"];
                    casteObj.hands = 1;
                    casteObj.dmgCat = "Special";
                break;
                case "Lance":
                    casteObj.mats =  ["Metalic", "Woody", "Skinny"];
                    casteObj.hands = 2;
                    casteObj.dmgCat = "Special";
                break;
            }
        break;
        case "Offhand":
            switch(type){
                case "Light Buckler":
                    casteObj.mats =  ["Magical", "Skinny", "Metalic"];
                    casteObj.hands = 1;
                    casteObj.dmgCat = "Magic";
                break;
                case "Heavy Shield":
                    casteObj.mats =  ["Metalic", "Woody", "Skinny"];
                    casteObj.hands = 1;
                    casteObj.dmgCat = "Melee";
                break;
                case "Phased Carapace":
                    casteObj.mats =  ["Metalic", "Magical", "Skinny"];
                    casteObj.hands = 1;
                    casteObj.dmgCat = "Special";
                break;
            }
        break;
        case "Headslot":
            switch(type){
                case "Light Cap":
                    casteObj.mats =  ["Silky", "Gemy", "Magical"];
                    casteObj.hands = 0;
                    casteObj.dmgCat = "Magic";
                break;
                case "Heavy Helm":
                    casteObj.mats =  ["Metalic", "Skinny", "Silky"];
                    casteObj.hands = 0;
                    casteObj.dmgCat = "Melee";
                break;
                case "Phased Helm":
                    casteObj.mats =  ["Metalic", "Skinny", "Magical"];
                    casteObj.hands = 0;
                    casteObj.dmgCat = "Special";
                break;
            }
        break;
        case "Chestslot":
            switch(type){
                case "Light Robe":
                    casteObj.mats =  ["Silky", "Gemy", "Magical"];
                    casteObj.hands = 0;
                    casteObj.dmgCat = "Magic";
                break;
                case "Heavy Chestplate":
                    casteObj.mats =  ["Metalic", "Skinny", "Silky"];
                    casteObj.hands = 0;
                    casteObj.dmgCat = "Melee";
                break;
                case "Phased Garments":
                    casteObj.mats =  ["Metalic", "Skinny", "Magical"];
                    casteObj.hands = 0;
                    casteObj.dmgCat = "Special";
                break;
            }
        break;
        case "Legslot":
            switch(type){
                case "Light Leggings":
                    casteObj.mats =  ["Silky", "Gemy", "Magical"];
                    casteObj.hands = 0;
                    casteObj.dmgCat = "Magic";
                break;
                case "Heavy Greaves":
                    casteObj.mats =  ["Metalic", "Skinny", "Silky"];
                    casteObj.hands = 0;
                    casteObj.dmgCat = "Melee";
                break;
                case "Phased Leggings":
                    casteObj.mats =  ["Metalic", "Skinny", "Magical"];
                    casteObj.hands = 0;
                    casteObj.dmgCat = "Special";
                break;
            }
        break;
    }
    casteObj.mats.push("Tooly");
    return casteObj;
};

/**
 * This method checks the casteObj.dmgCat for which array of damage types to return
 * @param {object} casteObj The base item Object 
 * @returns {string[]} with all possible natural damage types
 */
const itemGenDmgTypes = (casteObj) => {
    let dmgTypeChoices = [];
    // Failsafe check for old/new `Craftable` handling
    const combatTypeVal = casteObj.dmgCat ?? casteObj.combatCat;
    const casteTypeVal = casteObj.casteType ?? casteObj.name;
    switch(combatTypeVal){
        case "Magic":
            switch(casteObj.slot){
                case "Mainhand":
                    dmgTypeChoices.push("Magic");
                    if (["Wand", "Focus", "Staff"].includes(casteTypeVal)){
                        dmgTypeChoices.push("Fire", "Frost");
                    }
                    if (["Wand", "Tome", "Focus"].includes(casteTypeVal)){
                        dmgTypeChoices.push("Dark", "Light");
                    }
                break;
                case "Offhand":
                    dmgTypeChoices.push("Magic");
                break;
                default:
                    dmgTypeChoices = ["Magic", "Fire", "Frost", "Dark", "Light"];
                break;
            }
        break;
        case "Melee":
            switch(casteObj.slot){
                case "Mainhand":
                    if (["Polearm", "Mace"].includes(casteTypeVal)){
                        // Can have Blunt damage type
                        dmgTypeChoices.push("Blunt");
                    } 
                    if (["Polearm", "Heavy Blade", "Light Blade"].includes(casteTypeVal)){
                        // Can have Slash and Pierce damage types
                        dmgTypeChoices.push("Slash", "Pierce");
                    }
                break;
                case "Offhand":
                    dmgTypeChoices.push("Blunt");
                break;
                default:
                    dmgTypeChoices = ["Blunt", "Slash", "Pierce"];
                break;
            }
        break;
        case "Special":
            dmgTypeChoices = ["Spirit", "Pain", "Chaos", "Rad", "Null"];
        break;
    }
    return dmgTypeChoices;
};

/**
 * This method rolls damage types from the casteObj checking/setting any dmg type overflow
 * for use later in damage calculations
 * @param {object} casteObj The base item Object
 * @returns {string[]} of picked damage types
 */
const itemGenPickDmgTypes = (casteObj) => {
    // Rarity is defined, determine max types from rarity.
    let maxTNum = (casteObj.rarity || casteObj.rarity === 0) ? 0 : 5;
    if (casteObj.rarity || casteObj.rarity === 0){
        // console.log('Checking max type amount from rarity');
        if (casteObj.rarity > 6){
            maxTNum = 5;
        } else if (casteObj.rarity > 5){
            maxTNum = 4;
        } else if (casteObj.rarity >= 4){
            maxTNum = 3;
        } else if (casteObj.rarity <= 3){
            maxTNum = 2;
        }
    }

    // console.log('Max Set @: %d', maxTNum);
    // Types contained here are set by Imbued types
    const extractTypes = casteObj.dmgTypes ?? casteObj.combatTypes;
    // Types contained here are set by itemGenDmgTypes()
    const extractOptions = casteObj.dmgOptions ?? casteObj.combatTypeOptions;

    const maxTypeAmount = inclusiveRandNum(maxTNum - extractTypes.length, 1);
    const dmgTypeOptions = extractOptions;

    // Preventing Imbued Pure types from being double selected
    if (extractTypes.length > 0){
        for (const pure of extractTypes){
            if (dmgTypeOptions.indexOf(pure) !== -1) 
                dmgTypeOptions.splice(dmgTypeOptions.indexOf(pure), 1);
        }
    }

    // This prevents any one type being picked more than once
    const dmgTypesPicked = [];
    let overflow = 0;
    for (let i = 0; i < maxTypeAmount; i++){
        if (dmgTypeOptions.length <= 0) {
            overflow = maxTypeAmount - i;
            break;
        }
        let randPicked = randArrPos(dmgTypeOptions);
        dmgTypesPicked.push(randPicked);
        dmgTypeOptions.splice(dmgTypeOptions.indexOf(randPicked), 1);
    }
    //console.log(dmgTypesPicked);
    //console.log('Overflow Types: %d', overflow);
    if (casteObj.combatTypeOverflow){
        casteObj.combatTypeOverflow = overflow;
    } else { casteObj.typeOverflow = overflow; }
    return dmgTypesPicked;
};

/**@typedef { { rarity: number, value: number, amount: number } } BaseMaterial */

/**
 * This method takes 4 Basic Material Objects and through a series of calculations, logical comparisons,
 * and formulas determines the final overall rarity that the casteObj should receive.
 * @param {BaseMaterial} matOne Basic Material Object
 * @param {BaseMaterial} matTwo Basic Material Object
 * @param {BaseMaterial} matThree Basic Material Object
 * @param {BaseMaterial} matFour Basic Material Object
 * @returns {number} Final Rarity (0-10) (!11|12) (13-20)
 */
const rarityGenConstant = (matOne, matTwo, matThree, matFour) => {
    const m1 = matOne, m2 = matTwo, m3 = matThree, m4 = matFour;
    const r1 = m1.rarity, r2 = m2.rarity, r3 = m3.rarity, r4 = m4.rarity;
    if (r1 === r2 && r2 === r3  && r3 === r4) return r1;
    let w1 = (m1.amount * 2), w2 = (m2.amount * 2), w3 = (m3.amount * 2), w4 = (m4.amount * 2);
    
    let RW = 40 - w4;
    //console.log(RW);
    if (RW === 0) {} else {
        w3 += RW >= 10 ? 10 : RW;
        RW -= RW >= 10 ? 10 : RW;
        if (RW > 0){
            w2 += RW >= 10 ? 10 : RW;
            RW -= RW >= 10 ? 10 : RW;
        }

        if (RW > 0){
            w1 += RW >= 20 ? 20 : RW;
            RW = 0;
        }
    }
    const finalArr = [{rarity: r1, weight: w1}, {rarity: r2, weight: w2}, {rarity: r3, weight: w3}, {rarity: r4, weight: w4}];
    finalArr.sort((a,b) => b.weight - a.weight);

    const rarArr = [r1, r2, r3, r4];
    //const maxRar = rarArr[0];

    rarArr.sort((a,b) => b - a);
    const tmpArr = [];
    const dupeCheck = [];
    for (const rar of rarArr){
        if (tmpArr.indexOf(rar) !== -1 && dupeCheck.indexOf(rar) === -1){
            dupeCheck.push(rar);
            continue;
        }
        tmpArr.push(rar);
    }
    // =======================
    // THIS NEEDS REVISIONS FOR HIGH RAR SCALES
    // =======================
    let addedWeights = [];
    if (dupeCheck.length > 0){
        // Add dupe rar weight % together, then finish weighted calculations
        for (const rar of dupeCheck){
            const addedWeight = finalArr.filter(obj => obj.rarity === rar).reduce((acc, rarObj) => {
                return (acc > 0) ? acc + rarObj.weight : rarObj.weight;
            }, 0);
            addedWeights.push({rarity: rar, weight: addedWeight});
        }
    }

    let finalFilterArr = finalArr;

    if (addedWeights.length > 0){
        finalFilterArr = finalArr.filter(rarObj => addedWeights.some(moddedRar => rarObj.rarity !== moddedRar.rarity));
        finalFilterArr = finalFilterArr.concat(addedWeights);
        finalFilterArr.sort((a,b) => b.weight - a.weight);
    }
    if (finalFilterArr[1].rarity / 2 >= finalFilterArr[0].rarity * 2 && finalFilterArr[0].weight <= finalFilterArr[1].weight / 1.5){
        finalFilterArr[0].rarity += 2;
    }

    // Avoid setting final rarity as `11` (Temp Items) or `12` (Unique Items)
    if (finalFilterArr[0].rarity === 11){
        finalFilterArr[0].rarity = 10;
    } else if (finalFilterArr[0].rarity === 12){
        finalFilterArr[0].rarity = 13;
    }

    return finalFilterArr[0].rarity; // Returns final rarity after calculations are complete!!!
};

/**
 * This function loads the dmg/type pairs for the given `Craftable`
 * @param {Craftable} casteObj Craftable Class Object
 */
const loadCombatDmgTypePairs = (casteObj) => {
    let totalDamage = 0, dmgTypePairs = [];

    //const carryOverflow = casteObj.combatTypeOverflow;
    const singleDmgMax = casteObj.combatMagnitude.dmg.single;

    const overflowDmg = Math.round((casteObj.combatTypeOverflow * inclusiveRandNum(singleDmgMax, singleDmgMax - (singleDmgMax * 0.25))) / casteObj.combatTypes.length);
    for (const type of casteObj.combatTypes){
        const typeMag = inclusiveRandNum(singleDmgMax, singleDmgMax - (singleDmgMax * 0.25)) + overflowDmg;
        totalDamage += typeMag;
        dmgTypePairs.push( { type: type, dmg: typeMag } );
    }

    casteObj.combatMagnitude.dmg.pairs = dmgTypePairs;
    casteObj.combatMagnitude.dmg.total = totalDamage;
};

/**
 * This method calculates and creates type:dmg pairs for use with item value and item string creation.
 * @param {object} casteObj Base Item Object
 * @returns {number} Total Item Damage
 */
const dmgTypeAmountGen = (casteObj) => {
    let totalDamage = 0;
    let dmgTypePairs = [];

    // Retain overflow value for offhand edge case
    const overflowPlaceholder = casteObj.typeOverflow;

    // Spread overflow evenly across all existing dmgtypes
    const maxSinDMG = casteObj.maxSingleTypeDamage;
    
    const overflowDMGSpread = Math.round((casteObj.typeOverflow * inclusiveRandNum(maxSinDMG, maxSinDMG - (maxSinDMG * 0.25))) / casteObj.dmgTypes.length);

    for (const type of casteObj.dmgTypes){
        let typeValue = inclusiveRandNum(maxSinDMG, maxSinDMG - (maxSinDMG * 0.25)) + overflowDMGSpread;
        
        // Mod typeValue against overflow types for proper damage distributions
        // if (casteObj.typeOverflow > 0) {
        //     typeValue *= 2;
        //     casteObj.typeOverflow--;
        // }

        // t1 = tooly rarity
        // t2 = tooly amount
        // ((1.2 + t1) * (0.08 * t2)) / 2

        totalDamage += typeValue; // Total Item damage used for easy display + final value total
        dmgTypePairs.push({type: type, dmg: typeValue});
    }

    // Reassign overflow value for offhand edge case
    if (casteObj.slot === 'Offhand') casteObj.typeOverflow = overflowPlaceholder;
    casteObj.totalDamage = totalDamage;
    casteObj.dmgTypePairs = dmgTypePairs;
    return totalDamage;
};

/**
 * This function loads the def/type pairs for the given `Craftable`
 * @param {Craftable} casteObj Craftable Class Object
 */
const loadCombatDefTypePairs = (casteObj) => {
    let totalDefence = 0, defTypePairs = [];

    //const carryOverflow = casteObj.combatTypeOverflow;
    const singleDefMax = casteObj.combatMagnitude.def.single;

    const overflowDef = Math.round((casteObj.combatTypeOverflow * inclusiveRandNum(singleDefMax, singleDefMax - (singleDefMax * 0.25))) / casteObj.combatTypes.length);
    for (const type of casteObj.combatTypes){
        const typeMag = inclusiveRandNum(singleDefMax, singleDefMax - (singleDefMax * 0.25)) + overflowDef;
        totalDefence += typeMag;
        defTypePairs.push( { type: type, def: typeMag } );
    }

    casteObj.combatMagnitude.def.pairs = defTypePairs;
    casteObj.combatMagnitude.def.total = totalDefence;
};

/**
 * This method calculates and creates type:def pairs for use with item value and item string creation.
 * @param {object} casteObj Base Item Object
 * @returns {number} Total Item Defence
 */
const defTypeAmountGen = (casteObj) => {
    let totalDefence = 0;
    let defTypePairs = [];

    const maxSinDEF = casteObj.maxSingleTypeDefence;
    const overflowDEFSpread = Math.round((casteObj.typeOverflow * inclusiveRandNum(maxSinDEF, maxSinDEF - (maxSinDEF * 0.25))) / casteObj.dmgTypes.length);

    for (const type of casteObj.dmgTypes){
        let typeValue = inclusiveRandNum(maxSinDEF, maxSinDEF - (maxSinDEF*0.25)) + overflowDEFSpread;
        
        // Mod typeValue against overflow types for proper defence distributions
        // if (casteObj.typeOverflow > 0) {
        //     typeValue *= 2;
        //     casteObj.typeOverflow--;
        // }

        // t1 = tooly rarity
        // t2 = tooly amount
        // ((1.2 + t1) * (0.08 * t2)) / 2

        totalDefence += typeValue; // Total Item defence used for easy display + final value total
        defTypePairs.push({type: type, def: typeValue});
    }

    casteObj.totalDefence = totalDefence;
    casteObj.defTypePairs = defTypePairs;
    return totalDefence;
};

/**
 * This method calculates and assigns the items total value based off damage, materials, hands, and rarity
 * @param {object} casteObj Base Item Object
 * @returns {number} Total Item Value
 */
const itemValueGenConstant = (casteObj) => {
    let totalValue = 0;

    const calcRarVal = (rarValPairs, rarity) => {
        let domRarTotal = 0, otherRarTotal = 0;
        for (const pair of rarValPairs){
            if (pair.rar === rarity) domRarTotal += pair.val * 2;
            if (pair.rar < rarity) otherRarTotal += pair.val;
            if (pair.rar > (rarity + 1) * 2) {
                otherRarTotal += (pair.val / 3);
            } else if (pair.rar > rarity) {
                otherRarTotal += (pair.val / 2);
            }
        }
        domRarTotal *= (1 + rarity);
        otherRarTotal += otherRarTotal * ((1 + rarity) / 20);
        return domRarTotal + otherRarTotal;
    };

    const totDmg = casteObj.totalDamage ?? 0;
    const totDef = casteObj.totalDefence ?? 0;
    totalValue = (1 + casteObj.rarity) * (totDmg + (totDef * (3 + (casteObj.rarity / 3))));

    if (casteObj.hands === 0) {
        totalValue *= (casteObj.slot !== "Chestslot") ? 1.75 : 2.2;
    } else {
        totalValue *= (casteObj.hands === 1) ? 1.4 : 1.8;
    }
    
    totalValue += totalValue * (casteObj.totalTypes / 10);

    const matValues = calcRarVal(casteObj.rarValPairs, casteObj.rarity);
    //console.log('Final Mats Value: %d', matValues);

    totalValue += matValues;

    totalValue = Math.floor(totalValue);
    //console.log('Final Value: %d', totalValue);

    casteObj.value = totalValue;
    return totalValue;
};

/**
 * This function calculates the given casteObj's total value.
 * @param {Craftable} casteObj Craftable Instance
 * @returns {number} Final calculated total item value for given `Craftable`
 */
const generateItemValue = (casteObj) => {
    let totalValue = 0;

    /**
     * This function handles generating the base value provided from the materials used to craft.
     * @param { { r: number, v: number }[] } rarValPairs Arr containing rarity/value pairs
     * @param {number} rarity Craftables final rarity value
     * @returns {number} Final Material Value Total
     */
    const generateBaseMaterialValue = (rarValPairs, rarity) => {
        let domRarTotal = 0, otherRarTotal = 0;

        for (const {r, v} of rarValPairs){
            // Rarity Matches items rarity
            if (r === rarity) domRarTotal += v * 2;
            // Rarity is below items rarity
            if (r < rarity) otherRarTotal += v;
            // Rarity is above items rarity
            if (r > (rarity + 1) * 2) {
                otherRarTotal += (v / 3);
            } else if (r > rarity) {
                otherRarTotal += (v / 2);
            }
        }
        domRarTotal *= (1 + rarity);
        otherRarTotal += otherRarTotal * ((1 + rarity) / 20);
        return domRarTotal + otherRarTotal;
    };

    const totalDamage = casteObj.combatMagnitude.dmg.total;
    const totalDefence = casteObj.combatMagnitude.def.total;

    // Apply initial value, based on rarity, totalDamage, and totalDefence
    totalValue = (1 + casteObj.rarity) * (totalDamage + (totalDefence * (3 + (casteObj.rarity / 3))));

    // Apply value multiplier based on either slot or hands
    if (casteObj.hands === 0) {
        totalValue *= (casteObj.slot !== "Chestslot") ? 1.75 : 2.2;
    } else {
        totalValue *= (casteObj.hands === 1) ? 1.4 : 1.8;
    }

    // Apply additive value scalar based on total combatTypes 
    totalValue += totalValue * (casteObj.combatTypeTotal / 10);

    // Calculate total base value from materials used
    const baseMaterialValue = generateBaseMaterialValue(casteObj.materials.loadRarityValuePairs(), casteObj.rarity);

    // Add base material value to total
    totalValue += baseMaterialValue;

    // Floor final total
    totalValue = Math.floor(totalValue);

    // Return final value
    return totalValue;
};

// ===============================
//         ITEM FUNCTIONS
// ===============================

/**
 * @typedef { { check: boolean, diff: number } } DiffCheck
 * @typedef { { single: DiffCheck, total: DiffCheck } } CombatTypeDiff
 * @typedef { { passCheck: boolean, standard: string, totalDiff: number, dmg: CombatTypeDiff, def: CombatTypeDiff, types: { total: DiffCheck }, value: DiffCheck, prefix?: { changeRar: string, changeMag: string } } } Benchmarker
 * */
//

/**
 * This function is 
 * # **F\*!#ING HUGE DAMN BRO SWITCH CASE GO 200 LINE CRAZY**
 * 
 * ``True``: Add to database static loot pool
 * 
 * ``False``: Dont do this ^
 * @param {object} castedInput Complete Item Caste Object
 * @returns {boolean}
 */
function benchmarkQualification(castedInput){
    let casteObj = {};
    switch(getTypeof(castedInput)){
        case "Craftable":
            // Convert Craftable into expected casteObj form
            // Doing this as a placeholder to rewritting this entire function!!! :(
            casteObj = {
                rarity: castedInput.rarity,
                value: castedInput.value,
                slot: castedInput.slot,
                hands: castedInput.hands,
                totalTypes: castedInput.combatTypeTotal,
                totalDamage: castedInput.combatMagnitude.dmg.total,
                dmgTypePairs: castedInput.combatMagnitude.dmg.pairs,
                totalDefence: castedInput.combatMagnitude.def.total,
                defTypePairs: castedInput.combatMagnitude.def.pairs,
            };
        break;
        default:
            // Do nothing, default object
            casteObj = castedInput;
        break;
    }


    const qualObj = {
        dmg: {
            single: 0,
            max: 0,
            min: 0
        },
        def: {
            single: 0,
            max: 0,
            min: 0
        },
        typeAmount: {
            max: 0,
            min: 0
        },
        value: {
            max: 0,
            min: 0
        }
    }
    // Switch for rarity
    const r = casteObj.rarity;
    switch(r.toString()){
        case "0":
            qualObj.dmg.single = 45;
            qualObj.dmg.max = 50;
            qualObj.dmg.min = 25;

            // DEFENCE WIP
            qualObj.def.single = 5;
            qualObj.def.max = 10;
            qualObj.def.min = 2;

            qualObj.typeAmount.max = 2;
            qualObj.typeAmount.min = 1;

            qualObj.value.max = 275;
            qualObj.value.min = 125;
        break;
        case "1":
            qualObj.dmg.single = 80;
            qualObj.dmg.max = 150;
            qualObj.dmg.min = 80;

            // DEFENCE WIP
            qualObj.def.single = 12;
            qualObj.def.max = 14;
            qualObj.def.min = 6;

            qualObj.typeAmount.max = 2;
            qualObj.typeAmount.min = 1;

            qualObj.value.max = 675;
            qualObj.value.min = 500;
        break;
        case "2":
            qualObj.dmg.single = 120;
            qualObj.dmg.max = 250;
            qualObj.dmg.min = 100;

            // DEFENCE WIP
            qualObj.def.single = 18;
            qualObj.def.max = 18;
            qualObj.def.min = 12;

            qualObj.typeAmount.max = 3;
            qualObj.typeAmount.min = 1;

            qualObj.value.max = 2000;
            qualObj.value.min = 999;
        break;
        case "3":
            qualObj.dmg.single = 150;
            qualObj.dmg.max = 400;
            qualObj.dmg.min = 150;

            // DEFENCE WIP
            qualObj.def.single = 20;
            qualObj.def.max = 24;
            qualObj.def.min = 16;

            qualObj.typeAmount.max = 3;
            qualObj.typeAmount.min = 1;

            qualObj.value.max = 4000;
            qualObj.value.min = 3000;
        break;
        case "4":
            qualObj.dmg.single = 235;
            qualObj.dmg.max = 550;
            qualObj.dmg.min = 250;

            // DEFENCE WIP
            qualObj.def.single = 24;
            qualObj.def.max = 32;
            qualObj.def.min = 18;

            qualObj.typeAmount.max = 4;
            qualObj.typeAmount.min = 1;

            qualObj.value.max = 7500;
            qualObj.value.min = 5000;
        break;
        case "5":
            qualObj.dmg.single = 350;
            qualObj.dmg.max = 675;
            qualObj.dmg.min = 450;

            // DEFENCE WIP
            qualObj.def.single = 30;
            qualObj.def.max = 40;
            qualObj.def.min = 26;

            qualObj.typeAmount.max = 4;
            qualObj.typeAmount.min = 2;

            qualObj.value.max = 12000;
            qualObj.value.min = 8000;
        break;
        case "6":
            qualObj.dmg.single = 445;
            qualObj.dmg.max = 800;
            qualObj.dmg.min = 550;

            // DEFENCE WIP
            qualObj.def.single = 30;
            qualObj.def.max = 46;
            qualObj.def.min = 22;

            qualObj.typeAmount.max = 4;
            qualObj.typeAmount.min = 2;

            qualObj.value.max = 18000;
            qualObj.value.min = 12500;
        break;
        case "7":
            qualObj.dmg.single = 550;
            qualObj.dmg.max = 999;
            qualObj.dmg.min = 600;

            // DEFENCE WIP
            qualObj.def.single = 35;
            qualObj.def.max = 55;
            qualObj.def.min = 30;

            qualObj.typeAmount.max = 5;
            qualObj.typeAmount.min = 2;

            qualObj.value.max = 30000;
            qualObj.value.min = 26000;
        break;
        case "8":
            qualObj.dmg.single = 645;
            qualObj.dmg.max = 1290;
            qualObj.dmg.min = 875;

            // DEFENCE WIP
            qualObj.def.single = 38;
            qualObj.def.max = 60;
            qualObj.def.min = 40;

            qualObj.typeAmount.max = 5;
            qualObj.typeAmount.min = 2;

            qualObj.value.max = 69000;
            qualObj.value.min = 54000;
        break;
        case "9":
            qualObj.dmg.single = 750;
            qualObj.dmg.max = 1300;
            qualObj.dmg.min = 1000;

            // DEFENCE WIP
            qualObj.def.single = 40;
            qualObj.def.max = 75;
            qualObj.def.min = 52;

            qualObj.typeAmount.max = 5;
            qualObj.typeAmount.min = 3;

            qualObj.value.max = 370000;
            qualObj.value.min = 330000;
        break;
        case "10":
            qualObj.dmg.single = 45;
            qualObj.dmg.max = 50;
            qualObj.dmg.min = 25;

            // DEFENCE WIP
            qualObj.def.single = 15;
            qualObj.def.max = 25;
            qualObj.def.min = 15;

            qualObj.typeAmount.max = 5;
            qualObj.typeAmount.min = 3;

            qualObj.value.max = 250;
            qualObj.value.min = 150;
        break;
    }
    
    switch(casteObj.slot){
        case "Mainhand":
            if (casteObj.hands === 2){
                qualObj.dmg.single += qualObj.dmg.single * 0.25;
                qualObj.dmg.max += qualObj.dmg.max * 0.50;
                qualObj.dmg.min += qualObj.dmg.min * 0.35;
                qualObj.value.max += qualObj.value.max * 0.20;
                qualObj.value.min += qualObj.value.min * 0.25;
            }
        break;
        case "Chestslot":
            qualObj.def.single *= 2;
            qualObj.def.max *= 2;
            qualObj.def.min *= 2;
        break;
        case "Offhand":
            // qualObj.def.single *= 2;
            // qualObj.def.max *= 2;
            // qualObj.def.min *= 2;
        break;
        default:
            // Helm, Legs
            let reducMod = (casteObj.rarity > 5) ? (0.40 - (casteObj.rarity * 0.02)) : 0.40;
            reducMod = (casteObj.rarity > 8) ? 0 : reducMod;
            qualObj.value.max -= qualObj.value.max * reducMod;
            qualObj.value.min -= qualObj.value.min * reducMod;
        break;
    }

    const modCheckObj = {
        passCheck: false,
        standard: "Standard",
        totalDiff: 0,
        dmg: {
            single: {
                check: false,
                diff: 0
            },
            total: {
                check: false,
                diff: 0
            }
        },
        def: {
            single: {
                check: false,
                diff: 0
            },
            total: {
                check: false,
                diff: 0
            }
        },
        types: {
            total: {
                check: false,
                diff: 0
            }
        },
        value: {
            check: false,
            diff: 0
        }
    };

    const checkSingleMaxDamageCap = (dmgArr) => {
        let underCap = true;
        for (const dmgObj of dmgArr){
            if (dmgObj.dmg <= qualObj.dmg.single) continue;
            if (dmgObj.dmg > qualObj.dmg.single) {
                underCap = false;

                modCheckObj.dmg.single.check = true;
                modCheckObj.dmg.single.diff = qualObj.dmg.single - dmgObj.dmg;

                console.log('Break on Single Damage Type! %d', dmgObj.dmg);
                break;
            }
        }
        return underCap;
    };

    const checkSingleMaxDefenceCap = (defArr) => {
        let underCap = true;
        for (const defObj of defArr){
            if (defObj.def <= qualObj.def.single) continue;
            if (defObj.def > qualObj.def.single) {
                underCap = false;

                modCheckObj.def.single.check = true;
                modCheckObj.def.single.diff = qualObj.def.single - defObj.def;

                console.log('Break on Single Defence Type! %d', defObj.def);
                break;
            }
        }
        return underCap;
    };

    const checkDamageCondition = (casteObj) => {
        if (casteObj.totalDamage > qualObj.dmg.max) {
            modCheckObj.dmg.total.check = true;
            modCheckObj.dmg.total.diff = qualObj.dmg.max - casteObj.totalDamage;
            return false;
        }
        if (casteObj.totalDamage < qualObj.dmg.min) {
            modCheckObj.dmg.total.check = true;
            modCheckObj.dmg.total.diff = qualObj.dmg.max - casteObj.totalDamage;
            return false;
        }
        const finalCheck = checkSingleMaxDamageCap(casteObj.dmgTypePairs);
        return finalCheck;
    };

    const checkDefenceCondition = (casteObj) => {
        if (casteObj.totalDefence > qualObj.def.max){ 
            modCheckObj.def.total.check = true;
            modCheckObj.def.total.diff = qualObj.def.max - casteObj.totalDefence;
            return false;
        }
        if (casteObj.totalDefence < qualObj.def.min){
            modCheckObj.def.total.check = true;
            modCheckObj.def.total.diff = qualObj.def.max - casteObj.totalDefence;
            return false;
        }
        const finalCheck = checkSingleMaxDefenceCap(casteObj.defTypePairs);
        return finalCheck;
    };

    const checkTotalTypeCondition = (casteObj) => {
        if (casteObj.totalTypes > qualObj.typeAmount.max) {
            modCheckObj.types.check = true;
            modCheckObj.types.diff = qualObj.typeAmount.max - casteObj.totalTypes;
            return false;
        }
        if (casteObj.totalTypes < qualObj.typeAmount.min) {
            modCheckObj.types.check = true;
            modCheckObj.types.diff = qualObj.typeAmount.min - casteObj.totalTypes;
            return false;
        }
        return true;
    }

    const checkValueCondition = (casteObj) => {
        if (casteObj.value > qualObj.value.max) {
            modCheckObj.value.check = true;
            modCheckObj.value.diff = qualObj.value.max - casteObj.value;
            return false;
        }
        if (casteObj.value < qualObj.value.min) {
            modCheckObj.value.check = true;
            modCheckObj.value.diff = qualObj.value.min - casteObj.value;
            return false;
        }
        return true;
    }

    const switchCheckUni = (casteObj) => {
        // Check Type Amount Total
        let typesChecked = checkTotalTypeCondition(casteObj);
        // Check Total Value
        let valueChecked = checkValueCondition(casteObj);
        // Check Damage or Defence or Both
        let damageChecked = true, defenceChecked = true;
        switch(casteObj.slot){
            case "Mainhand":
                // Check damage conditions
                damageChecked = checkDamageCondition(casteObj);
            break;
            case "Offhand":
                // Check damage/defence conditions
                damageChecked = checkDamageCondition(casteObj);
                defenceChecked = checkDefenceCondition(casteObj);
            break;
            default:
                // Check defence conditions
                defenceChecked = checkDefenceCondition(casteObj);
            break;
        }
        if (!damageChecked) console.log('Total Damage too high or too low! %d', casteObj.totalDamage);
        if (!defenceChecked) console.log('Total Defence too high or too low! %d', casteObj.totalDefence);
        if (!typesChecked) console.log('Too many or too few Types! %d', casteObj.totalTypes);
        if (!valueChecked) console.log('Total Value too high or too low! %d', casteObj.value);

        if (damageChecked && defenceChecked && typesChecked && valueChecked) return true;
        return false;
    }

    const itemQualifies = switchCheckUni(casteObj);
    modCheckObj.passCheck = itemQualifies;
    console.log('Item Qualifies for becoming a permanent Loot Drop Option: ', itemQualifies);

    /**@param {Benchmarker} standObj */
    const handleFinalStandard = (standObj) => {
        let runningTotal = 0;
        runningTotal += standObj.dmg.single.diff;
        runningTotal += standObj.dmg.total.diff;

        runningTotal += standObj.def.single.diff;
        runningTotal += standObj.def.total.diff;

        runningTotal += (standObj.types.total.diff * 50);

        runningTotal += standObj.value.diff;

        const finalDiff = Math.sign(runningTotal);

        if (finalDiff > 0){
            // Below Standard
            standObj.standard = "Below";
        } else if (finalDiff === 0){
            // At Standard
        } else {
            // Above Standard
            standObj.standard = "Above";
        }

        standObj.totalDiff = runningTotal;
    }

    handleFinalStandard(modCheckObj);

    console.log(modCheckObj);

    return modCheckObj;
}


/**
 * This function handles generating a name for a newly crafted item.
 * 
 * This proccess using the `benchmark outcome (bench)` and the `item` itself.
 * @param {Craftable} item Craftable Instance
 * @param {Benchmarker} bench Benchmarker Object
 * @returns {string} Newly generated item name
 */
function handleNamingNewItem(item, bench){
    // Check if item can become "Black Blade, render of The Dream".
    const bbCandidate = c => {
        return c.rarity === 20 && c.slot === "Mainhand" && c.casteType === "Heavy Blade";
    };
    if (bbCandidate(item)){
        // Handle extra checking stuff here.
    }

    const nameAddition = {
        prefix: randArrPos(loadPrefixOptions(item, bench)),
        suffix: ""
    };
    nameAddition.suffix = randArrPos(loadDescOptions(nameAddition.prefix, item, bench));

    const usingImbued = item.materials.extractImbued().length > 0;

    // If item was imbued, handle special naming conventions
    if (usingImbued){
        const imbuedChanges = loadImbuedAddition(item);
        // Overwrite standard naming
        nameAddition.prefix = imbuedChanges.prefix;
        nameAddition.suffix = imbuedChanges.suffix;
    }

    let useSpecialNaming = false;
    if (item.rarity > 5){
        // Handle special name gen
        const specialNameChance = 0.05 + (item.rarity * 0.03);
        if (rollChance(specialNameChance)) useSpecialNaming = true;
    }

    // WIP NEEDS MORE WORK AND MUCH MORE TIME!!
    if (useSpecialNaming){
        const specialNameOutcome = loadSpecialName(item, bench);
        // If unique name:
        // uName, Imbue1? Imbue2? (of | of the) material/benchmark
        if (specialNameOutcome.uniqueName !== ""){
            nameAddition.suffix = `${nameAddition.prefix} ${nameAddition.suffix}`;
            nameAddition.prefix = `${specialNameOutcome.uniqueName}, ${specialNameOutcome.caste}`;
        }

        // If not unique name:
        // rarity? casteTyped? (of | of the) Imbue1? Imbue2? benchmark
        if (specialNameOutcome.rarity !== ""){
            nameAddition.prefix = `${specialNameOutcome.rarity} ${nameAddition.prefix}`;
        }

        // If no rar and not unique:
        // material casteTyped (of | of the) benchmark
        if (specialNameOutcome.rarity === "" && specialNameOutcome.uniqueName === ""){
            nameAddition.prefix = `${specialNameOutcome.caste} ${nameAddition.prefix}`;
        }
    }

    const pickedPrefix = nameAddition.prefix;
    const pickedDescription = nameAddition.suffix;

    const newNameCollector = [];
    
    if (pickedPrefix !== 'None') newNameCollector.push(pickedPrefix);
    if (pickedDescription !== 'None') newNameCollector.push(pickedDescription);

    newNameCollector.push(item.materials.pickedMats[0].name);

    // restructedCasteType: reCT (Alias)
    let reCT = item.casteType;

    const heavyCheck = ["Heavy Greaves", "Heavy Helm", "Heavy Chestplate"],
    lightCheck = ["Light Leggings", "Light Robe", "Light Cap"],
    reorderCheck = ["Light Blade", "Heavy Blade", "Light Buckler", "Heavy Shield"];

    // If casteType is included in check, remove "prefix" of "Heavy"
    if (heavyCheck.indexOf(item.casteType)){
        const heavyRegEx = /Heavy /; 
        const heavyPOS = item.casteType.search(heavyRegEx);

        reCT = item.casteType.slice(heavyPOS + 6,);
    }

    // If casteType is included in check, remove "prefix" of "Light"
    if (lightCheck.indexOf(item.casteType)){
        const lightRegEx = /Light /; 
        const lightPOS = item.casteType.search(lightRegEx);

        reCT = item.casteType.slice(lightPOS + 6,);
    }
    
    // If casteType is included in check, apply conditional reordering.
    if (reorderCheck.includes(item.casteType)){
        // This value directly relates to any applied prefix/description
        const orderPos = newNameCollector.length;

        // Ex: "Heavy"
        const firstSec = item.casteType.slice(0, 5);
        // Ex: "Blade"
        const secondSec = item.casteType.slice(6,);
        if (orderPos === 1){
            // No prefix or desc

            // Shift casteType "prefix" to the start of the collector
            newNameCollector.unshift(firstSec);
        } else if (orderPos === 2){
            // Prefix or desc

            // Splice casteType "prefix" after item prefix/description
            const removedSec = newNameCollector.splice(1, 1, firstSec);
            // Push casteType's type into the collector
            newNameCollector.push(removedSec);
        } else if (orderPos === 3){
            // Prefix and desc

            // Splice casteType "prefix" after item prefix & description
            const removedSec = newNameCollector.splice(2, 1, firstSec);
            // Push casteType's type into the collector
            newNameCollector.push(removedSec);
        }

        // Store second section to be appended to the end of the collector
        reCT = secondSec;
    }

    // Append restructed casteType as is stored in `reCT`
    newNameCollector.push(reCT);

    // Join all collected name strings, results in final name.
    const generatedName = newNameCollector.join(" ");

    return generatedName;
}

/**
 * This function constructs a somewhat resonable looking name for the english language.
 * 
 * Uses conditional logic to formulate a name based on common Linguistic formations
 * @returns {string}
 */
function constructRandomName(){
    const abcd = 'abcdefghijklmnopqrstuvwxyz';
    const vowels = 'aeiou';
    const withoutVowels = abcd.split("").filter(l => !vowels.includes(l)).join("");

    const fullNameContainer = {
        letters: [abcd[inclusiveRandNum(26, 0)]],
        grabCurrentLength(){
            return this.letters.join("").length;
        },
        grabLastLetter(){
            if (this.letters.at(-1)?.length > 1) return this.letters.at(-1)[1];
            return this.letters.at(-1);
        },
        filterLastLetter(){
            return abcd.split("").filter(l => l !== this.grabLastLetter()).join("");
        },
        grabLastLetterType(){
            const lastLetter = this.grabLastLetter();
            if (vowels.includes(lastLetter)) return "Vowel";
            return "Not Vowel";
        },
        addRandomLetter(checkLast=false){
            if (!checkLast) {
                this.letters.push(abcd[inclusiveRandNum(26, 0)]);
            } else {
                this.letters.push(this.filterLastLetter()[inclusiveRandNum(25, 0)]);
            }
        },
        addRandomNOTVowel(){
            this.letters.push(withoutVowels[inclusiveRandNum(21, 0)]);
        },
        addRandomVowel(){
            this.letters.push(vowels[inclusiveRandNum(5, 0)]);
        },
        addToLetters(letter){
            this.letters.push(letter);
        },
        finalizeName(){
            return makeCapital(this.letters.join(""));
        }
    };

    const nameLength = inclusiveRandNum(8, 5);

    // common starting letters:  bl, br, cl, dr, fl, gl, pl, tr, sp
    const starterLetters = ["bl", "br", "cl", "dr", "fl", "gl", "pl", "tr", "sp"];
    const matchingStarters = starterLetters.filter(l => l.startsWith(fullNameContainer.letters[0]));
    
    // common prefixes: un-, re-
    const starterPrefixes = ["un", "re"];

    // First letter had matches
    if (matchingStarters.length > 0) fullNameContainer.letters[0] = randArrPos(matchingStarters);
    
    // common vowel combinations ( which is a diphthong ) : ai, ea, oo, oi, ou
    const vowelCombos = ["ai", "ea", "oo", "oi", "ou"];
    // common consonant combos: ch, sh, th, ph, wh
    const consonantCombos = ["ch", "sh", "th", "ph", "wh"];

    // If starts with vowel add consonant, else add vowel or vowel combo
    if (vowels.includes(fullNameContainer.letters[0][0])){
        fullNameContainer.addToLetters(randArrPos(consonantCombos));
    } else {
        if (rollChance(0.25)){
            fullNameContainer.addToLetters(randArrPos(vowelCombos));
        } else fullNameContainer.addRandomVowel();
    }

    // common ending letters: nd, st, nt, lk, mp
    const endingLetters = ["nd", "st", "nt", "lk", "mp"];
    // common suffixes: -ing, -ed, -ly
    const endingSuffixes = ["ing", "ed", "ly"];

    // silent letters: ps, gn, kn
    const silentLetters = ["ps", "gn", "kn"];

    // Name is at limit
    if (fullNameContainer.grabCurrentLength() === nameLength) return fullNameContainer.finalizeName();

    // Check how many letters can be added
    let lettersRemaining = nameLength - fullNameContainer.grabCurrentLength();
    if (lettersRemaining === 1){
        fullNameContainer.addRandomLetter(true);
        return fullNameContainer.finalizeName();
    }

    do {
        // If two letters remain, fill with random ending
        if (lettersRemaining === 2){
            fullNameContainer.addToLetters(randArrPos(endingLetters));
            break;
        }

        // If last letter was vowel, pick random letter excluding vowels
        if (fullNameContainer.grabLastLetterType() === "Vowel"){
            fullNameContainer.addRandomNOTVowel();
            lettersRemaining--;
        } else {
            // Otherwise pick random letter not matching last letter found
            fullNameContainer.addRandomLetter(true);
            lettersRemaining--;
        }

    } while (lettersRemaining > 0);

    return fullNameContainer.finalizeName();
}

/**
 * This function handles generating a specialized name for the given `item`.
 * @param {Craftable} item Craftable Instance
 * @param {Benchmarker} bench Benchmark Object
 */
function loadSpecialName(item, bench){
    const nameContainer = {
        caste: "",
        rarity: "",
        uniqueName: "",
        material: "",
        benchmark: ""
    };
    // Naming for casteType?

    switch(item.slot){
        case "Mainhand":
            switch(item.combatCat){
                case "Magic":
                    nameContainer.caste = randArrPos(["Malificent", "Vindictive"]);
                break;
                case "Melee":
                    nameContainer.caste = randArrPos(["Great", "War", "Fierce"]);
                break;
                case "Special":
                    nameContainer.caste = randArrPos(["Judgement"]);
                break;
            }
        break;
        case "Offhand":
            switch(item.combatCat){
                case "Magic":
                    nameContainer.caste = randArrPos(["Peace Maker"]);
                break;
                case "Melee":
                    nameContainer.caste = randArrPos(["Vengeance"]);
                break;
                case "Special":
                    nameContainer.caste = randArrPos(["Cataclysm"]);
                break;
            }
        break;
        default:
            // Armor
            switch(item.combatCat){
                case "Magic":
                    nameContainer.caste = randArrPos(["Incarnated"]);
                break;
                case "Melee":
                    nameContainer.caste = randArrPos(["Defender"]);
                break;
                case "Special":
                    nameContainer.caste = randArrPos(["Deflector"]);
                break;
            }
        break;
    }

    // Naming for rarity?
    // Roll for using unique name
    const useUniqueName = rollChance((0.02 + (item.rarity * 0.02)));
    if (useUniqueName){
        // Using unique name
        nameContainer.uniqueName = constructRandomName();
    } else if (!baseCheckRarName(item.rarity).includes("?") && !useUniqueName){
        // If rarity is not "?" | "??" | "???" | "????"
        nameContainer.rarity = baseCheckRarName(item.rarity);
    }

    // Naming for materials?

    // Naming for benchmark devience?

    return nameContainer;
}

/**
 * This function handles loading naming options given the types imbued with.
 * @param {Craftable} item Craftable Instance
 * @returns { { prefix: string, suffix: string } } Final decided imbued additions
 */
function loadImbuedAddition(item){
    const imbuedWithList = item.materials.extractImbued();

    const imbuePrefixContainer = [], imbueSuffixContainer = [];
    for (const imbueType of imbuedWithList){
        switch(imbueType){
            case "slash":
                imbuePrefixContainer.push(["Serrated", "Vicious"]);
                imbueSuffixContainer.push(["Bloodletter"]);
            break;
            case "blunt":
                imbuePrefixContainer.push(["Forceful", "Blunted"]); 
                imbueSuffixContainer.push(["Mountain Shaker"]);
            break;
            case "pierce":
                // Not in use yet
            break;
            case "magic":
                imbuePrefixContainer.push(["Arcane", "Empowered"]);
                imbueSuffixContainer.push(["Purifier"]);
            break;
            case "dark":
                imbuePrefixContainer.push(["Veiled", "Shaded"]);
                imbueSuffixContainer.push(["Stalker"]);
            break;
            case "light":
                imbuePrefixContainer.push(["Radiant", "Blinding"]);
                imbueSuffixContainer.push(["Dawnbringer"]);
            break;
            case "fire":
                imbuePrefixContainer.push(["Scorching", "Flamed"]);
                imbueSuffixContainer.push(["Hellbringer"]);
            break;
            case "frost":
                imbuePrefixContainer.push(["Chilling", "Frozen"]);
                imbueSuffixContainer.push(["Frostbringer"]);
            break;
            case "null":
                imbuePrefixContainer.push(["Voidsung", "Voidcast"]);
                imbueSuffixContainer.push(["Emptier"]);
            break;
            case "nessy":
                imbuePrefixContainer.push(["UwU"]);
                imbueSuffixContainer.push(["Pretty Pink"]);
            break;
        }
    }

    const imbuedPartsContainer = {
        prefix: "",
        suffix: ""
    };

    if (imbuedWithList.length === 2){
        imbuedPartsContainer.prefix = randArrPos(randArrPos(imbuePrefixContainer));
        imbuedPartsContainer.suffix = randArrPos(randArrPos(imbueSuffixContainer));
    } else {
        imbuedPartsContainer.prefix = randArrPos(randArrPos(imbuePrefixContainer));
    }

    return imbuedPartsContainer;
}

/**
 * This function handles logically managing the possible ``Prefix`` options for the given
 * ``item`` and respective ``benchObj``
 * @param {Craftable | object} item Crafted Item Object
 * @param {Benchmarker} benchObj Benchmark outcome tracking object
 * @returns {string[]}
 */
function loadPrefixOptions(item, benchObj){
    let baseDiffChance = 0, changeRar = "", changeMag = "";

    if (Math.abs(benchObj.totalDiff) < 250) benchObj.standard = "Standard";

    switch(benchObj.standard){
        case "Above":
            // -value
            changeRar = "UP";
            changeMag = "None";
            if (benchObj.totalDiff < -5000){
                // Highly above
                changeMag = "Large";
                baseDiffChance = 1;
            } else if (benchObj.totalDiff < -2500){
                // Above
                changeMag = "Normal";
                baseDiffChance = 0.5;
            } else if (benchObj.totalDiff < -1000){
                // Slightly Above
                changeMag = "Small";
                baseDiffChance = 0.25;
            } else baseDiffChance = 0.15;
        break;
        case "Below":
            // +value
            changeRar = "DOWN";
            changeMag = "None";
            if (benchObj.totalDiff > 5000){
                // Very Below
                changeMag = "Large";
                baseDiffChance = 1;
            } else if (benchObj.totalDiff > 2500){
                // Below
                changeMag = "Normal";
                baseDiffChance = 0.5;
            } else if (benchObj.totalDiff > 1000){
                // Slightly Below
                changeMag = "Small";
                baseDiffChance = 0.25;
            } else baseDiffChance = 0.15;
        break;
        case "Standard":
            // 0 Change
            changeRar = (rollChance(0.5)) ? "UP": "DOWN";
            changeMag = "None";
            baseDiffChance = 0.01;
        break;
    }

    //console.log('Base chance to mod rar: %d', baseDiffChance);
    //console.log('Direction of Rarity change: ', changeRar);
    //console.log('Magnitude of change: ', changeMag);

    const changeRarCheck = rollChance(baseDiffChance);

    let normChoices = [];
    if (changeRarCheck) {
        switch(changeRar){
            case "UP":
                switch(changeMag){
                    case "None":
                        normChoices.push("Well");
                    break;
                    case "Small":
                        normChoices.push("Finely");
                    break;
                    case "Normal":
                        normChoices.push("Exquisitely");
                    break;
                    case "Large":
                        normChoices.push("Perfectly");
                    break;
                }
            break;
            case "DOWN":
                switch(changeMag){
                    case "None":
                        normChoices.push("Poorly");
                    break;
                    case "Small":
                        normChoices.push("Badly");
                    break;
                    case "Normal":
                        normChoices.push("Horribly");
                    break;
                    case "Large":
                        normChoices.push("Awfully");
                    break;
                }
            break;
        }
    } else changeRar = "NONE";

    benchObj.prefix = {
        changeRar,
        changeMag
    };

    const domMatType = (item.mats ?? item.staticMatTypes)[0];

    switch(changeRar){
        case "UP":
            normChoices.push("Neat");
            switch(domMatType){
                case "Magical":
                    normChoices.push("Glowing", "Powerful");
                break;
                case "Metalic":
                    switch(item.slot){
                        case "Mainhand":
                            normChoices.push("Sharp", "Unfettered");
                        break;
                        case "Offhand":
                            normChoices.push("Sturdy", "Solid");
                        break;
                        default:
                            normChoices.push("Sturdy", "Solid");
                        break;
                    }
                break;
                case "Silky":
                    normChoices.push("Tough", "Robust");
                break;
                case "Woody":
                    normChoices.push("Sturdy", "Solid");
                break;
            }
        break;
        case "DOWN":
            normChoices.push("Boring")
            switch(domMatType){
                case "Magical":
                    normChoices.push("Faulty", "Broken");
                break;
                case "Metalic":
                    normChoices.push("Rusty", "Cracked");
                break;
                case "Silky":
                    normChoices.push("Torn", "Rotten");
                break;
                case "Woody":
                    normChoices.push("Rotten", "Broken");
                break;
            }
        break;
        default:
            normChoices.push("Plain", "Clean", "Normal", "Basic", "None");
        break;
    }

    return normChoices;
}

/**
 * This function handles follow up string options per the given prefix.
 * @param {string} prefix Prefix choice picked
 * @param {object} item Crafted Item Object
 * @param {Benchmarker} benchObj Benchmark Outcome tracking object
 * @returns {string[]}
 */
function loadDescOptions(prefix, item, benchObj){
    const descChoices = [];

    // First check for double up prefix match
    //const preUPMatchList = ["Well", "Finely", "Exquisitely", "Perfectly"];
    //const preDNMatchList = ["Poorly", "Badly", "Horribly", "Awfully"];
    const preFullMatchList = ["Well", "Finely", "Exquisitely", "Perfectly", "Poorly", "Badly", "Horribly", "Awfully"];

    const switchWith = (item.mats ?? item.staticMatTypes)[0];

    if (preFullMatchList.includes(prefix)){
        descChoices.push("Crafted", "Designed", "Put-Together");
        switch(switchWith){
            case "Magical":
                descChoices.push("Enchanted", "Designed");
            break;
            case "Metalic":
                switch(item.slot){
                    case "Mainhand":
                        descChoices.push("Sharpened", "Tempered");
                    break;
                    case "Offhand":
                        descChoices.push("Polished", "Tempered");
                    break;
                    default:
                        descChoices.push("Polished", "Formed");
                    break;
                }
            break;
            case "Silky":
                descChoices.push("Woven", "Stitched", "Hemmed");
            break;
            case "Woody":
                descChoices.push("Carved", "Bound", "Weighted");
            break;
        }
        return descChoices;
    }

    // Second check if prefix is "None"
    if (prefix === "None"){
        descChoices.push("Plain", "Clean", "Normal", "Basic", "None");
        return descChoices;
    }

    switch(benchObj.prefix.changeRar){
        case "UP":
            descChoices.push("None");
            switch(benchObj.prefix.changeMag){
                case "None":

                break;
                case "Small":

                break;
                case "Normal":

                break;
                case "Large":

                break;
            }
        break;
        case "DOWN":
            descChoices.push("None");
            switch(benchObj.prefix.changeMag){
                case "None":

                break;
                case "Small":

                break;
                case "Normal":

                break;
                case "Large":

                break;
            }
        break;
        default:
            descChoices.push("None");
        break;
    }

    return descChoices;
}


function handleExtraNameStuff(item, benchObj){
    // Load Prefix Options
    const prefixChoices = loadPrefixOptions(item, benchObj);
    //console.log(prefixChoices);
    const prefixPicked = randArrPos(prefixChoices);
    //console.log('Prefix Picked: ', prefixPicked);

    // Load Desc Options
    const descChoices = loadDescOptions(prefixPicked, item, benchObj);
    //console.log(descChoices);
    const descPicked = randArrPos(descChoices);
    //console.log('Descriptor Picked: ', descPicked);

    // if (item.rarity < 4){
    //     // Remove 2 Name Pieces
    // } else if (item.rarity < 7){
    //     // Remove 1 Name Piece
    // }
    //const extraNameSection = prefixPicked + (descPicked === 'None') ?  " " : ` ${descPicked}`;

    let newNameArr = [];
    if (prefixPicked !== "None") newNameArr.push(prefixPicked);
    if (descPicked !== "None") newNameArr.push(descPicked);

    // Handle Material conditionals here
    // Silly Mat Names:
    // Raw Ore

    newNameArr.push(item.domMat.name);


    // Handle Caste Type conditionals here
    // Silly Caste Wording:
    // Switch Light/Heavy Blade to ``Light/Heavy`` ``DOM_MAT_NAME`` ``Caste Type``
    let moddedCasteType = item.name;
    const heavyCheck = ["Heavy Greaves", "Heavy Helm", "Heavy Shield", "Heavy Chestplate"];
    if (heavyCheck.includes(item.name)){
        const heavyRegEx = /Heavy /;
        const heavyStarts = item.name.search(heavyRegEx);
        const nameSec = item.name.slice(heavyStarts + 6,);

        moddedCasteType = nameSec;
    }

    const lightCheck = ["Light Leggings", "Light Robe", "Light Cap", "Light Shield"];
    if (lightCheck.includes(item.name)){
        const lightRegEx = /Light /;
        const lightStarts = item.name.search(lightRegEx);
        const nameSec = item.name.slice(lightStarts + 6,);

        moddedCasteType = nameSec;
    }

    const reorderCheck = ["Light Blade", "Heavy Blade", "Light Buckler", "Heavy Shield"];
    if (reorderCheck.includes(item.name)){
        const orderPos = newNameArr.length;

        const firstSec = item.name.slice(0, 5);
        const secondSec = item.name.slice(6,);
        if (orderPos === 1){
            // No prefix or desc
            newNameArr.unshift(firstSec);
        } else if (orderPos === 2){
            // Prefix or desc
            const removedSec = newNameArr.splice(1, 1, firstSec);
            newNameArr.push(removedSec);
        } else if (orderPos === 3){
            // Prefix and desc
            const removedSec = newNameArr.splice(2, 1, firstSec);
            newNameArr.push(removedSec);
        }

        moddedCasteType = secondSec;
    }

    newNameArr.push(moddedCasteType);

    // Handle Suffix logic here

    const newItemName = newNameArr.join(" ");
    //console.log(newItemName);
    
    return newItemName;
}


function extractName(item, benchObj){
    let newName;
    if (benchObj) {
        newName = handleExtraNameStuff(item, benchObj);
    } else {
        // ==========
        // PREFIX

        // Above Standard
        // Use "Upwards" Prefix
        // Pull from rar + 1 List
        // EX: Common item pulls from this list
        // const uncomPrefix = ["Weak", "Misshapen", "Thin", "Worn"];

        // Below Standard
        // Use "Downwards" Prefix
        // Pull from rar - 1 List
        // EX: Uncommon item pulls from this list
        // const comPrefix = ["Broken", "Rusty", "Torn", "Rotten"];

        // Two parter specific `Above Standard`
        // const doubleUPPrefix = ["Well", "Finely", "Exquisitely", "Perfectly"];

        // Two parter specific `Below Standard`
        // const doubleDWNPrefix = ["Awfully", "Horribly", "Badly", "Poorly"];

        // ==========
        // DESC

        // First check PREFIX value for specific describer
        // const doubleDesc = ["Designed", "Formed", "Crafted", "Woven", "Stitched", "Carved", "Tempered", "Polished"];
        
        // Add second descriptor
        
        // IF Value above Standard
        // const valUPDesc = ["Etched", "Engraved", "Embroidered", "Guilded"];

        // IF Total/Single DMG above Standard
        // const dmgUPDesc = ["Deadly", "Dangerous", "Powerful"];

        // IF Total/Single DEF above Standard
        // const defUPDesc = ["Sturdy", "Rivited", "Robust"];


        /**  === Reworking Name Scheme ===
         *
         * Name Layout: Prefix + Desc_1 + Dom_Mat_Type? + Caste_Type_Suffix
         * 
         *       Prefix  Desc       Common, Woody   Caste_Suffix
         * EX_1: Worn    Engraved   Sturdy Branch   Wand
         * Item_1: Uncommon Wand
         * 
         *       Prefix      Desc   Epic, Metalic  Caste_Suffix 
         * EX_2: Exquisitely Formed Raw Phasemetal Light Blade
         * Item_2: Epic Light Blade
         * 
         *       Frost  Desc   Mystic, Metalic  Caste_Suffix
         * EX_3: Shiver Bourne Phasemetal Scrap Mace
         * Item_3: Mystic Mace (Imbued Frost)
         * 
         *       Fire      Blunt    ???, Skinny          Desc    ???, Woody  Caste_Suffix
         * EX_4: Brimstone Battery, Worked Phase-Leather Wrapped Phaseflower Polearm
         * Item_4: ??? Polearm (Imbued Fire, Blunt)
         * 
         * 
         *  Name Construct:
         * 
         *  NO IMBUE: ``Prefix + Desc + Dom_Mat_Name + Caste_Type``
         * 
         *  ONE IMBUE: ``Imbue + Desc + Dom_Mat_Name + Caste_Type``
         * 
         *  TWO IMBUE: ``Imbue_1 + Imbue_2 + (Mat_2 || Mat_3) + Desc + Caste_Type``
         */
        const nameFormConstruction = require('./Json/craftNameForm.json');
        let filterTmpBy;
        if (item.imbuedTypes.length === 0){
            filterTmpBy = "No_Imbue";
        } else if (item.imbuedTypes.length === 1){
            filterTmpBy = "One_Imbue";
        } else if (item.imbuedTypes.length === 2){
            filterTmpBy = "Two_Imbue";
        }

        const baseNameTemplate = nameFormConstruction.filter(tmp => tmp.Name === "Name_Template")[0].Templates[`${filterTmpBy}`];

        
        switch(filterTmpBy){
            case "No_Imbue":
                // NO IMBUE
                // Prefix Filter by: item.rarity item.mats[0]
                baseNameTemplate.Prefix = randArrPos(nameFormConstruction
                    .filter(tmp => tmp.Name === "Prefix")[0]
                    .Filter.filter(rar => rar.Rarity === baseCheckRarName(item.rarity))[0]
                    .Base_Mat.filter(matT => matT.Type === item.mats[0])[0].Options
                );

                // Norm_Desc Filter by: item.rarity item.mats[0]
                baseNameTemplate.Norm_Desc = randArrPos(nameFormConstruction
                    .filter(tmp => tmp.Name === "Norm_Desc")[0]
                    .Filter.filter(rar => rar.Rarity === baseCheckRarName(item.rarity))[0]
                    .Base_Mat.filter(matT => matT.Type === item.mats[0])[0].Options
                );

                if (item.rarity < 2){
                    const excludeType = randArrPos(["Prefix", "Norm_Desc"]);
                    switch(excludeType){
                        case "Prefix":
                            baseNameTemplate.Prefix = "";
                        break;
                        case "Norm_Desc":
                            baseNameTemplate.Norm_Desc = "";
                        break;
                    }
                }

                // Dom_Mat_Name
                baseNameTemplate.Dom_Mat_Name = item.domMat.name;

                // Caste_Type
                baseNameTemplate.Caste_Type = item.name;

                newName = [baseNameTemplate.Prefix, baseNameTemplate.Norm_Desc, baseNameTemplate.Dom_Mat_Name, baseNameTemplate.Caste_Type].join(" ");
            break;
            case "One_Imbue":
                
            break;
            case "Two_Imbue":

            break;
        }

        // console.log(baseNameTemplate);
        
        

        // const nameCaste = require('./Json/nameCaste.json');

        // const casteFiltered = nameCaste.filter(ele => ele.Caste_Type === item.name);
        // const name = randArrPos(casteFiltered[0].Caste_Forms);
    }
    
    item.casteType = item.name;
    item.name = newName;
    return;
}

module.exports = {
    itemGenDmgConstant,
    itemGenDefConstant,
    itemCasteFilter,
    itemGenDmgTypes, 
    itemGenPickDmgTypes, 
    rarityGenConstant,
    loadCombatDmgTypePairs,
    loadCombatDefTypePairs,
    dmgTypeAmountGen,
    defTypeAmountGen,
    generateItemValue,
    itemValueGenConstant,
    handleNamingNewItem,
    extractName,
    benchmarkQualification,
    constructRandomName
};