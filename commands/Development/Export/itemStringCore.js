// Used for the deconstruction of item string codes into useable values
// As well as the construction of item string codes from valid item objects

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

// CASTE ID
/**
 * Wand-1H: 1
 * Tome-1H: 2
 * Staff-2H: 3
 * Focus-2H: 4
 * Light Blade-1H: 5
 * Mace-1H: 6
 * Polearm-2H: 7
 * Heavy Blade-2H: 8
 * 
 * 1H: [1,2,5,6]
 * 2H: [3,4,7,8]
 * 
 * Magic: [1,2,3,4]
 * Melee: [5,6,7,8]
 * 
 * Extract Using: 
 *
 * ```js
 *  for (const [key, value] of casteKeys) {
 *      if (~~key === dbItemRef.caste_id) {
 *          const casteData = JSON.parse(value);
 *      }
 *  }
 * ```
 */
const casteKeys = new Map([
    ["1", '{"Caste": "Wand", "Hands": 1, "Type": "Magic"}'],
    ["2", '{"Caste": "Tome", "Hands": 1, "Type": "Magic"}'],
    ["3", '{"Caste": "Staff", "Hands": 2, "Type": "Magic"}'],
    ["4", '{"Caste": "Focus", "Hands": 2, "Type": "Magic"}'],
    ["5", '{"Caste": "Light Blade", "Hands": 1, "Type": "Melee"}'],
    ["6", '{"Caste": "Mace", "Hands": 1, "Type": "Melee"}'],
    ["7", '{"Caste": "Polearm", "Hands": 2, "Type": "Melee"}'],
    ["8", '{"Caste": "Heavy Blade", "Hands": 2, "Type": "Melee"}']
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

// ===============================
//      STRING CODE CONSTRUCT
// ===============================

/**
 * This function takes a valid casteObj and converts it into an item string usable for storage, combat, ect.
 * @param {object} item casteObj Template: {...casteObj, dmgTypePairs: object[ { type: string, dmg: number } ], rarity: number, mats: string[]}
 * @returns String: Usable Item Code String
 */
function createMainhandItemCode(item){
    const typePrefix = "TYP_";
    const typeSuffix = "_typ";
    const disPrefix = "DIS_";
    const disSuffix = "_dis";

    // DAMAGE TYPE:VALUE PAIRS
    let typePairs = [];
    for (const pair of item.dmgTypePairs){
        let keyType = "";
        for (const [key, value] of dmgKeys){
            if (value === pair.type) keyType = key;
        }

        keyType += `:${pair.dmg}`;
        typePairs.push(keyType);
    }

    const finalTypePairs = typePairs.join('-');
    const finalTypeStr = typePrefix + finalTypePairs + typeSuffix;

    // RARITY
    const finalRarStr = (item.rarity < 10) ? "r0" + item.rarity : "r" + item.rarity;

    // DISMANTLE TYPES
    let disPicked = [];
    for (const matType of item.mats){
        for (const [key, value] of disKeys){
            if (value === matType) {
                disPicked.push(key);
                break;
            }
        }
    }
    const finalDis = disPicked.join('-');
    const finalDisStr = disPrefix + finalDis + disSuffix;

    // SLOT
    const finalSlotStr = "MAslo"; //Hard coded mainhand item code!

    // FINAL STRING
    const finalStrs = [finalTypeStr, finalRarStr, finalDisStr, finalSlotStr];
    const finalStringCode = finalStrs.join('-');

    return finalStringCode;
}

/**
 * This function takes a Universal Item Object and constructs a TYPE:DMG Item String Code segment.
 * @param {object} item casteObj Template: {...casteObj, dmgTypePairs: object[ { type: string, dmg: number } ]}
 * @returns String: Usable TYPE:DMG Item String Code segment
 */
function uni_CreateDmgTypeString(item){
    const typePrefix = "TYP_";
    const typeSuffix = "_typ";

    // DAMAGE TYPE:VALUE PAIRS
    let typePairs = [];
    for (const pair of item.dmgTypePairs){
        let keyType = "";
        for (const [key, value] of dmgKeys){
            if (value === pair.type) keyType = key;
        }

        keyType += `:${pair.dmg}`;
        typePairs.push(keyType);
    }

    const finalTypePairs = typePairs.join('-');
    const finalTypeStr = typePrefix + finalTypePairs + typeSuffix;

    return finalTypeStr;
}

/**
 * This function creates an Item String Code using a formated Universal Item Object, It does not handle
 * Damage or Defence sections of the string.
 * @param {object} item Universal Item Object {rarity: number, mats: string[], slot: string}
 * @returns String: BasicItemStrCode
 */
function uni_CreateStandardBaseItemCode(item){
    const disPrefix = "DIS_";
    const disSuffix = "_dis";

    // RARITY
    const finalRarStr = (item.rarity < 10) ? "r0" + item.rarity : "r" + item.rarity;

    // DISMANTLE TYPES
    let disPicked = [];
    for (const matType of item.mats){
        for (const [key, value] of disKeys){
            if (value === matType) {
                disPicked.push(key);
                break;
            }
        }
    }
    const finalDis = disPicked.join('-');
    const finalDisStr = disPrefix + finalDis + disSuffix;

    // SLOT
    let finalSlotStr;
    for (const [key, value] of slotKeys){
        if (value === item.slot){
            finalSlotStr = key;
            break;
        }
    }

    // FINAL BASIC STRING
    const finalStrs = [finalRarStr, finalDisStr, finalSlotStr];
    const basicStringCode = finalStrs.join('-');

    return basicStringCode;
}

/**
 * This function combines both a prefix string and a base item string to return a valid full 
 * Item String Code
 * @param {string} PREFIX_TYPE_STRING Prefix string, defence/damage type pairs
 * @param {string} BASE_ITEM_STRING Complete base item string missing Prefix
 * @returns String as Final Item String Code
 */
function uni_CreateCompleteItemCode(PREFIX_TYPE_STRING, BASE_ITEM_STRING){
    return PREFIX_TYPE_STRING + '-' + BASE_ITEM_STRING;
}

// ========================
//     TABLE REFERENCE
// ========================

// CASTE ID
/**
 * Wand-1H: 1
 * Tome-1H: 2
 * Staff-2H: 3
 * Focus-2H: 4
 * Light Blade-1H: 5
 * Mace-1H: 6
 * Polearm-2H: 7
 * Heavy Blade-2H: 8
 * 
 * 1H: [1,2,5,6]
 * 2H: [3,4,7,8]
 * 
 * Magic: [1,2,3,4]
 * Melee: [5,6,7,8]
 */

// USER STORAGE
/**
 * user_id: String
 * name: String
 * value: Int
 * amount: Int
 * item_code: String
 * caste_id: Int
 * creation_id: Int
 * unique_gen_id: UUIDV1
 * item_id: 
 *  IF NOT CRAFTED: `${caste_id + creation_offset_id}`
 *  IF CRAFTED: `${this.unique_gen_id}`
 */
// '../../events/Models/ItemStrings.js'

// STATIC STORAGE
/**
 * name: String
 * value: Int
 * item_code: String
 * caste_id: Int
 * creation_offset_id: Int
 * user_created: Boolean
 */
// '../../events/Models/ItemLootPool.js'

// ============================
//      MOCK DB FUNCTIONS
// ============================

/**
 * This function simulates the process for saving an item to the database using the new loot tables
 * It also generates an item_id based on the method from which the item was first obtained:
 * JSON Prefab
 * DB Entry
 * Newly Crafted
 * @param {object} item uni Item Object: {name: string, value: number, casteType: number, createdBy: number}
 * @param {string} ITEM_CODE Valid item string code
 */
function createNewItemStringEntry(item, ITEM_CODE){
    const mockUserData = {
        id: '501177494137995264',
        username: 'th3ward3n'
    };
    
    /**
     *  === ITEM OBJECT NEEDS ===
     *  - name: String
     *      - Found item name
     * 
     *  - value: Number
     *      - Found item value
     * 
     *  - casteType: Number
     *      - Conditionally decided based on item
     *  
     *  - createdBy: Number
     *      - Dictated by method of acquisition
     *          - Crafted: 2
     *          - ItemLootPool: creation_offset_id (based on current loot_id system)
     */
    // DB Table Reference Example
    const mockItemStrings = {
        user_id: mockUserData.id,
        name: item.name,
        value: item.value,
        amount: 1,
        item_code: ITEM_CODE,
        // ^^^ INHERENT ITEM VALUES ^^^
        caste_id: 1, // Extract from casteType ?? place into caste type given type values
        creation_id: 2, // Dependent on item
        unique_gen_id: "UUIDV1", // Static Gen Prop
        item_id: "String" // Requires caste_id, creation_id, and unique_gen_id to be resolved.
    };


    return mockItemStrings; // This should be a valid, fully filled mock db entry object 
}

// ============================
//        FINAL DISPLAY
// ============================


function displayMainhand(item){
    
}

function displayOffhand(item){

}

function displayArmor(item){

}


// ============================
//        TEMP TESTING
// ============================

/**
 *  name
 *  hands
 *  dmgCat
 *  mats
 *  dmgTypes
 *  typeOverflow
 *  totalTypes
 *  rarity
 *  maxSingleTypeDamage
 *  totalMatsUsed
 *  rarValPairs
 *  totalDamage
 *  dmgTypePairs
 *  value
 *  casteType
 *  
 *  './craftingContainer.js'
 */
const exampleCasteObj = {
    name: 'Lament',
    hands: 1,
    dmgCat: 'Melee',
    mats: ["Metalic", "Woody", "Skinny", "Tooly"],
    dmgTypes: ["Blunt", "Frost"],
    typeOverflow: 2,
    totalTypes: 4,
    rarity: 4,
    maxSingleTypeDamage: 40,
    totalMatsUsed: 30,
    rarValPairs: [
        {rar: 4, val: 75},
        {rar: 4, val: 75},
        {rar: 4, val: 75},
        {rar: 4, val: 75}
    ],
    totalDamage: 75,
    dmgTypePairs: [
        {type: "Blunt", dmg: 38},
        {type: "Frost", dmg: 37}
    ],
    value: 2250,
    casteType: 'Mace'
};

/**
 * {    
 * 
        "Name": "Lament",
        "Value": 225,

        "Attack": 40,
        "Type": "BLUNT",

        "Slot": "Mainhand",
        "Hands": "One",

        "Rarity": "Epic",
        "Rar_id": 4,

        "DismantleTypes": [ "metalic", "skinny" ],

        "Loot_id": 27,
        "Spec_id": 0
    }
 * 
    '../../events/Models/json_prefabs/lootList.json'
 */
const exampleJsonItem = [JSON.parse(JSON.stringify({
    Name: "Lament",
    Value: 225,
    Attack: 40,
    Type: "BLUNT",
    Slot: "Mainhand",
    Hands: "One",
    Rarity: "Epic",
    Rar_id: 4,
    DismantleTypes: ["metalic", "skinny"],
    Loot_id: 27,
}, null, " "))];


const exampleDBItem = {
    spec_id: "0",
    loot_id: 27,
    name: "Lament",
    value: 225,
    attack: 40,
    defence: 0,
    type: "BLUNT",
    slot: "Mainhand",
    hands: "One",
    rarity: "Epic",
    rar_id: 4,
    amount: 1
};

/**
 * This function takes an item object falling into one of three types, and then converts it 
 * into a standard universal item object for all further uses and applications.
 * @param {object} item Can be JSON prefab, crafted, or DB entry.
 * @returns Universal Item Object
 */
function convertMainhand(item){
    const startTime = new Date().getTime(); // Timer Start
    let universalItem;
    // =====================
    

    // ^^ CODE GOES HERE ^^
    // =====================
    const endTime = new Date().getTime(); // Timer End
    console.log(`Final Processing Time: ${endTime - startTime}ms`);
    return universalItem;
}