
const { makeCapital } = require('../../../../uniHelperFunctions');
const { loadCasteDetails } = require('../itemStringCore');

class Craftable {
    constructor(){
        // Basic Props
        // ===========
        // casteType, casteID, slot, hands, combatCat, staticMatTypes

        /** Selected by user
         * @type {string} 
         * */
        this.casteType;
        /** Obtained when loading from casteData
         * @type {number}
         */
        this.casteID;
        /** Selected by user, could be defined by `this.casteType`
         * @type {string} 
         * */
        this.slot;
        /** Defined by `this.casteType`
         * @type {number} 0 | 1 | 2
         */
        this.hands;
        /** Defined by `this.casteType`
         *  Renamed: `dmgCat` => `combatCat`
         * @type {string} Magic | Melee | Special
         */
        this.combatCat;
        /** Defined by `this.casteType`
         *  Renamed: `mats` => `staticMatTypes`
         * @type {string[]}
         */
        this.staticMatTypes;

        // Material Selection
        // ==================
        // pickedMats?, tooly?, imbuing?
        /**
         * @typedef { { rarity: number, value: number, amount: number } } BaseMaterial
         * @typedef { { using: boolean, used: BaseMaterial | undefined } } ConditionalMat
         */
        // @type { { pickedMats: BaseMaterial[], tooly: ConditionalMat, imbue: { one: ConditionalMat, two: ConditionalMat }, addMat(), removeMat(), handleImbued() } }

        /** Contains "Material Selection" data as selected by the user.
         * Makes use of assignment methods to add/remove internal data upon changes made by the user
         */
        this.materials = {
            /**@type {BaseMaterial[]} */
            pickedMats: new Array(3),
            /**@type {ConditionalMat} */
            tooly: {
                using: false,
                used: {}
            },
            imbue: {
                /**@type {ConditionalMat} */
                one: {
                    using: false,
                    used: {}
                },
                /**@type {ConditionalMat} */
                two: {
                    using: false,
                    used: {}
                }
            },
            /**
             * This method adds a material to `this.pickedMats` at the given `position`
             * @param {BaseMaterial} mat User selected material
             * @param {string} position Index position of selected material `'0' | '1' | '2' | '3'` (Selecting idx 3 results in filling `tooly`)
             */
            addMat(mat, position){
                if (['0', '1', '2'].includes(position)) this.pickedMats[position] = mat;
                else { this.tooly.using = true; this.tooly.used = mat; }
            },
            /**
             * This method removes the stored element at `this.pickedMats[position]`
             * @param {string} position Index position to be removed `'0' | '1' | '2' | '3'` (Selecting idx 3 results in removing `tooly`)
             */
            removeMat(position){
                if (['0', '1', '2'].includes(position)) this.pickedMats[position] = undefined;
                else { this.tooly.using = false; this.tooly.used = {}; }
            },
            /**
             * This method can add and remove an imbued material given the position.
             * @param {BaseMaterial} imbued Material used for imbuing
             * @param {string} position Imbue slot being used `"one" | "two"` 
             * @param {string} condition Action to preform on the given imbue position `"Add" | "Remove"`
             */
            handleImbued(imbued, position, condition){
                // This will need some extra work done later!!
                if (condition === 'Add') { 
                    this.imbue[`${position}`] = imbued;
                    this.imbue[`${position}`].using = true;
                } else { 
                    this.imbue[`${position}`] = {};
                    this.imbue[`${position}`].using = false;
                }
            }
        };

        // Generated Values
        // ================
        // rarity, combatTypes(dmgTypes), combatTypeTotal(maxTypeAmount), 

        /**@type {number} */
        this.rarity;
        /**@type {string[]} */
        this.combatTypes;
        /**@type {number} */
        this.combatTypeTotal;
        /**@type {number} */
        this.combatTypeOverflow;
        /**
         * @type { { dmg: { using: boolean, pairs: { dmg: number, type: string}[], total: number }, def: { using: boolean, pairs: { def: number, type: string}[], total: number } } }
         */
        this.combatMagnitude = {
            dmg: {
                using: false,
                pairs: [],
                total: 0
            },
            def: {
                using: false,
                pairs: [],
                total: 0
            }
        };
        /**@type {number} */
        this.value;


        /** THE CRAFTING PROCESS
         *  
         * 
         *  casteObj.rarity = rarPicked;
            casteObj.totalMatsUsed = matTotal;
            casteObj.rarValPairs = rarValPairs;

            casteObj.dmgOptions = itemGenDmgTypes(casteObj);

            casteObj.domMat = materialList[0];

            casteObj.imbuedTypes = [];
            // casteObj.dmgTypes = pickedImbuedTypes;
            casteObj.dmgTypes = [];

            casteObj.dmgTypes = casteObj.dmgTypes.concat(itemGenPickDmgTypes(casteObj));

            casteObj.totalTypes = casteObj.dmgTypes.length + casteObj.typeOverflow;
            delete casteObj.dmgOptions;

            // Handle all damage related calculations
            const itemMaxTypeDamage = itemGenDmgConstant(rarPicked, casteObj.totalTypes, casteObj.hands, matTotal);
            casteObj.maxSingleTypeDamage = itemMaxTypeDamage;

            const totalDamage = dmgTypeAmountGen(casteObj);

            // Handle all defence related calculations
            const itemMaxTypeDefence = itemGenDefConstant(rarPicked, casteObj.totalTypes, casteObj.slot, matTotal);
            casteObj.maxSingleTypeDefence = itemMaxTypeDefence;

            const totalDefence = defTypeAmountGen(casteObj);

            const totalValue = itemValueGenConstant(casteObj);

            const finalItemCode = uni_CreateCompleteItemCode(casteObj);

            // =============================
            //  HANDLE ITEM BENCHMARKS HERE
            // =============================
            const benchmarkStart = new Date().getTime();
            const benchOutcomeObj = benchmarkQualification(casteObj);
            const benchPass = benchOutcomeObj.passCheck;
            endTimer(benchmarkStart, "Benchmarking");

            extractName(casteObj, benchOutcomeObj);
         */
    }

    /**
     * This method loads the basic internals of the crafting object, based on the selected `type`
     * @param {string} type Caste Type Selected During Crafting
     * @param {string} slot Gear Slot Selected During Crafting
     */
    loadFromCasteType(type, slot){
        // Force Capitalization to avoid any case-sensitive checks
        slot = makeCapital(slot);
        type = makeCapital(type);
        // Load casteData from selected `type`
        const casteData = loadCasteDetails(type);

        // Assign internal values
        this.casteType = type;
        this.slot = slot;

        // Assign internal values with data pulled from casteType
        this.casteID = +casteData.id;
        this.combatCat = casteData.data.combatType;
        this.hands = casteData.data.hands;
        this.staticMatTypes = casteData.data.staticMats;
    }

    loadRarityFromMaterials(){
        // Use `this.materials` to calculate
    }

    loadCombatTypes(){
        // Using code from `craftingContainer.js`
    }

    loadCombatMagnitudes(){
        // Using code from `craftingContainer.js`
    }

    loadTotalValue(){
        // Using code from `craftingContainer.js`
    }
}