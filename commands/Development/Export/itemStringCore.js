// Used for the deconstruction of item code strings into useable values

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
//      STRING CODE DESTRUCT
// ===============================

/**
 * 
 * @param {String} TEST_CODE ITEM_CODE used for deconstruction
 * @returns Object[{Type: String, DMG: Number}]: Useable damage type/value object list
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

/**
 * 
 * @param {String} TEST_CODE ITEM_CODE used for deconstruction
 * @returns String: Useable rarity value
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
 * @returns String[]: Useable dismantled types list
 */
function checkingDismantle(TEST_CODE) {
    const entryDis = /DIS_/;
    const exitDis = /_dis/;
    
    let startIndex = TEST_CODE.search(entryDis);
    let endIndex = TEST_CODE.search(exitDis);
    
    const disSlice = TEST_CODE.slice(startIndex + 4, endIndex);
    const disListed = disSlice.split("-");
    
    const finalListed = [];
    for (const DIS of disListed){
        finalListed.push(disKeys.get(DIS));
    }
    
    return finalListed;
}

/**
 * 
 * @param {String} TEST_CODE ITEM_CODE used for deconstruction
 * @returns String: Usable item slot value
 */
function checkingSlot(TEST_CODE){
    const SLOT = /-\D{2}slo/;
    const slotStarts = TEST_CODE.search(SLOT);
  
    const slotCode =  TEST_CODE.slice(slotStarts + 1, slotStarts + 6);
    const foundSlot = slotKeys.get(slotCode);
  
    return foundSlot;
}