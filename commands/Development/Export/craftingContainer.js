// Used for any external methods, calls, filtering related to crafting/item generation.

// ===============================
//          ITEM KEYS
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

const slotKeys = new Map([
    ["HEslo", "Headslot"],
    ["CHslo", "Chestslot"],
    ["LEslo", "Legslot"],
    ["MAslo", "Mainhand"],
    ["OFslo", "Offhand"]
]);

// ===============================
//       HELPER METHODS
// ===============================

const inclusiveRandNum = (max, min) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

const randArrPos = (arr) => {
    return arr[(arr.length > 1) ? Math.floor(Math.random() * arr.length) : 0];
};


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
 * @returns number
 */
const itemGenDmgConstant = (rarity, dmgAmount, hands, matAmount) => {
    let a1 = rarity, a2 = dmgAmount, h1 = hands, x = matAmount;

    let dmgReturn = ((25 + ((5 * h1) / a2)) * (1 + a1)) * Math.log10(x);

    console.log(`Rarity: ${a1}, Dmg Type Amount: ${a2}, Hands: ${h1}, Material Amount: ${x}`);
    //console.log(dmgReturn);
    return dmgReturn;
};

/**
 * This method checks the caste type and preloads the casteObj with the needed values 
 * in order to be used further.
 * casteObj is the base Object for the final item.
 * @param {string} type The specific caste type name picked for use by user
 * @returns Object {name: string, hands: number, dmgCat: string, mats: string[]}
 */
const itemGenCaste = (type) => {
    const typeCasteCheck = (type) => {
        const casteObj = {
            name: type,
            hands: 1,
            dmgCat: "",
            mats: []
        };
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
        }
        casteObj.mats.push("Tooly");
        return casteObj;
    }

    const casteObj = typeCasteCheck(type);
    //console.log(casteObj);
    return casteObj;
};

/**
 * This method checks the casteObj.dmgCat for which array of damage types to return
 * @param {object} casteObj The base item Object 
 * @returns string[] with all possible natural damage types
 */
const itemGenDmgTypes = (casteObj) => {
    let dmgTypeChoices = [];
    switch(casteObj.dmgCat){
        case "Magic":
            dmgTypeChoices = ["Magic", "Fire", "Frost", "Dark", "Light"];
        break;
        case "Melee":
            dmgTypeChoices = ["Blunt", "Slash"];
        break;
        case "Special":
            dmgTypeChoices = ["Spirit", "Pain", "Chaos", "Rad", "Null"]
        break;
    }
    return dmgTypeChoices;
};

/**
 * This method rolls damage types from the casteObj checking/setting any dmg type overflow
 * for use later in damage calculations
 * @param {object} casteObj The base item Object
 * @returns string[] of picked damage types
 */
const itemGenPickDmgTypes = (casteObj) => {
    const maxTypeAmount = inclusiveRandNum(5 - casteObj.dmgTypes.length, 1);
    const dmgTypeOptions = casteObj.dmgOptions;

    // Preventing Imbued Pure types from being double selected
    if (casteObj.dmgTypes.length > 0){
        for (const pure of casteObj.dmgTypes){
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
    casteObj.typeOverflow = overflow;
    return dmgTypesPicked;
};

/**
 * This method takes 4 Basic Material Objects and through a series of calculations, logical comparisons,
 * and formulas determines the final overall rarity that the casteObj should receive.
 * @param {object} matOne Basic Material Object: {rarity: number, amount: number}
 * @param {object} matTwo Basic Material Object: {rarity: number, amount: number}
 * @param {object} matThree Basic Material Object: {rarity: number, amount: number}
 * @param {object} matFour Basic Material Object: {rarity: number, amount: number}
 * @returns Number for Final Rarity
 */
const rarityGenConstant = (matOne, matTwo, matThree, matFour) => {
    const m1 = matOne, m2 = matTwo, m3 = matThree, m4 = matFour;
    const r1 = m1.rarity, r2 = m2.rarity, r3 = m3.rarity, r4 = m4.rarity;
    if (r1 === r2 === r3 === r4) return r1;
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
    return finalFilterArr[0].rarity; // Returns final rarity after calculations are complete!!!
};

/**
 * This method calculates and creates type:dmg pairs for use with item value and item string creation.
 * @param {object} casteObj Base Item Object
 * @returns Number: Total Item Damage
 */
const dmgTypeAmountGen = (casteObj) => {
    let totalDamage = 0;
    let dmgTypePairs = [];

    for (const type of casteObj.dmgTypes){
        let typeValue = inclusiveRandNum(casteObj.maxSingleTypeDamage, casteObj.maxSingleTypeDamage - (casteObj.maxSingleTypeDamage*0.25));
        
        // Mod typeValue against overflow types for proper damage distributions
        if (casteObj.typeOverflow > 0) {
            typeValue *= 2;
            casteObj.typeOverflow--;
        }

        // t1 = tooly rarity
        // t2 = tooly amount
        // ((1.2 + t1) * (0.08 * t2)) / 2

        totalDamage += typeValue; // Total Item damage used for easy display + final value total
        dmgTypePairs.push({type: type, dmg: typeValue});
    }

    casteObj.totalDamage = totalDamage;
    casteObj.dmgTypePairs = dmgTypePairs;
    return totalDamage;
};

/**
 * This method calculates and assigns the items total value based off damage, materials, hands, and rarity
 * @param {object} casteObj Base Item Object
 * @returns Number: Total Item Value
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

    totalValue = (1 + casteObj.rarity) * casteObj.totalDamage;

    totalValue *= (casteObj.hands === 1) ? 1.4 : 1.8;

    totalValue += totalValue * (casteObj.totalTypes / 10);

    const matValues = calcRarVal(casteObj.rarValPairs, casteObj.rarity);
    //console.log('Final Mats Value: %d', matValues);

    totalValue += matValues;

    totalValue = Math.floor(totalValue);
    //console.log('Final Value: %d', totalValue);

    casteObj.value = totalValue;
    return totalValue;
};

// ===============================
//   TEMP STRING CODE DESTRUCT
// ===============================

/**
 * 
 * @param {String} TEST_CODE ITEM_CODE used for deconstruction
 * @returns Useable rarity value
 */
function checkingRar(TEST_CODE) {
    const RAR = /-r\d{2}-/;
    const rarStarts = TEST_CODE.search(RAR);
    
    const rarCode = TEST_CODE.slice(rarStarts + 1, rarStarts + 4);
    const foundRar = rarKeys.get(rarCode);
    
    return foundRar;
}

/**
 * 
 * @param {String} TEST_CODE ITEM_CODE used for deconstruction
 * @returns Usable item slot value
 */
function checkingSlot(TEST_CODE){
    const SLOT = /-\D{2}slo/;
    const slotStarts = TEST_CODE.search(SLOT);
  
    const slotCode =  TEST_CODE.slice(slotStarts + 1, slotStarts + 6);
    const foundSlot = slotKeys.get(slotCode);
  
    return foundSlot;
}


// ===============================
//         ITEM FUNCTIONS
// ===============================

/**
 * This method generates a usable String Code for item storage, deconstruction, and further use.
 * @param {object} casteObj Base Item Object
 * @returns String of casteObj as usable item code
 */
function createNewItemCode(casteObj){
    const typePrefix = "TYP_";
    const typeSuffix = "_typ";
    const disPrefix = "DIS_";
    const disSuffix = "_dis";
    
    // DAMAGE TYPE:VALUE PAIRS
    let typePairs = [];
    for (const pair of casteObj.dmgTypePairs){
        let keyType = "";
        for (const [key, value] of dmgKeys){
            if (value === pair.type) keyType = key;
        }

        keyType += `:${pair.dmg}`;
        typePairs.push(keyType);
    }

    // let totalValue = 0;
    // let totalDamage = 0;
    // for (const type of casteObj.dmgTypes){
    //     let typeValue = inclusiveRandNum(casteObj.maxSingleTypeDamage, casteObj.maxSingleTypeDamage - (casteObj.maxSingleTypeDamage*0.25));
    //     // Retrieve Keys from value matches
    //     let keyType = "";
    //     for (const [key, value] of dmgKeys){
    //         if (value === type) keyType = key;
    //     }

    //     // Mod typeValue against overflow types for proper damage distributions
    //     if (casteObj.typeOverflow > 0) {
    //         typeValue *= 2;
    //         casteObj.typeOverflow--;
    //     }
    //     totalDamage += typeValue; // Total Item damage used for easy display + final value total
    //     keyType += `:${typeValue}`;
    //     typePairs.push(keyType);
    // }

    //console.log('Total Item Damage: %d', totalDamage);

    // totalValue = (1 + casteObj.rarity) * totalDamage;
    
    // const calcRarVal = (rarValPairs, rarity) => {
    //     let domRarTotal = 0, otherRarTotal = 0;
    //     for (const pair of rarValPairs){
    //         if (pair.rar === rarity) domRarTotal += pair.val * 2;
    //         if (pair.rar < rarity) otherRarTotal += pair.val;
    //         if (pair.rar > (rarity + 1) * 2) {
    //             otherRarTotal += (pair.val / 3);
    //         } else if (pair.rar > rarity) {
    //             otherRarTotal += (pair.val / 2);
    //         }
    //     }
    //     domRarTotal *= (1 + rarity);
    //     otherRarTotal += otherRarTotal * ((1 + rarity) / 20);
    //     return domRarTotal + otherRarTotal;
    // };

    // totalValue *= (casteObj.hands === 1) ? 1.4 : 1.8;

    // totalValue += totalValue * (casteObj.totalTypes / 20);

    // const matValues = calcRarVal(casteObj.rarValPairs, casteObj.rarity);
    // //console.log('Final Mats Value: %d', matValues);

    // totalValue += matValues;

    // totalValue = Math.floor(totalValue);
    // //console.log('Final Value: %d', totalValue);

    // casteObj.value = totalValue;

    const finalTypePairs = typePairs.join('-');
    const finalTypeStr = typePrefix + finalTypePairs + typeSuffix;

    const finalRarStr = (casteObj.rarity < 10) ? "r0" + casteObj.rarity : "r" + casteObj.rarity;

    let disPicked = [];
    for (const matType of casteObj.mats){
        for (const [key, value] of disKeys){
            if (value === matType) {
                disPicked.push(key);
                break;
            }
        }
    }
    const finalDis = disPicked.join('-');
    const finalDisStr = disPrefix + finalDis + disSuffix;

    const finalSlotStr = "MAslo"; //Hard coded mainhand item code!

    const finalStrs = [finalTypeStr, finalRarStr, finalDisStr, finalSlotStr];
    const finalStringCode = finalStrs.join('-');

    return finalStringCode;
}

// !!WIP!!
function extractName(item){
    const nameCaste = require('./Json/nameCaste.json');

    const casteFiltered = nameCaste.filter(ele => ele.Caste_Type === item.name);
    const name = randArrPos(casteFiltered[0].Caste_Forms);
    item.casteType = item.name;
    item.name = name;
    return;
}

module.exports = {
    itemGenDmgConstant, 
    itemGenCaste, 
    itemGenDmgTypes, 
    itemGenPickDmgTypes, 
    rarityGenConstant,
    dmgTypeAmountGen,
    itemValueGenConstant,
    checkingRar,
    checkingSlot,
    createNewItemCode,
    extractName
};