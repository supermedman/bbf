
const { makeCapital } = require('../../../../uniHelperFunctions');
const { rarityGenConstant, itemGenDmgTypes, itemGenPickDmgTypes, itemGenDmgConstant, itemGenDefConstant, loadCombatDmgTypePairs, loadCombatDefTypePairs, generateItemValue } = require('../craftingContainer');
const { loadCasteDetails } = require('../itemStringCore');

/**
 * @typedef { { name: string, rarity: number, value: number, amount: number } } BaseMaterial
 * @typedef { { name: string, value: number, amount: number } } ImbueMaterial
 * 
 * @typedef { { using: boolean, used: ImbueMaterial | undefined } } ConditionalImbue
 * @typedef { { using: boolean, used: BaseMaterial | undefined } } ConditionalMat
 */
// @type { { pickedMats: BaseMaterial[], tooly: ConditionalMat, imbue: { one: ConditionalMat, two: ConditionalMat }, addMat(), removeMat(), handleImbued() } }


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
                /**@type {ConditionalImbue} */
                one: {
                    using: false,
                    used: {}
                },
                /**@type {ConditionalImbue} */
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
             * @param {ImbueMaterial} imbued Material used for imbuing
             * @param {string} position Imbue slot being used `"one" | "two"` 
             * @param {string} condition Action to preform on the given imbue position `"Add" | "Remove"`
             */
            handleImbued(imbued, position, condition){
                // This will need some extra work done later!!
                if (condition === 'Add') { 
                    this.imbue[`${position}`].used = imbued;
                    this.imbue[`${position}`].using = true;
                } else { 
                    this.imbue[`${position}`].used = {};
                    this.imbue[`${position}`].using = false;
                }
            },
            /**
             * This method retrieves the useable combatType key from any imbued materials
             * 
             * Returns an empty array if not imbued.
             * @returns {string[]}
             */
            extractImbued(){
                const imbuedWithList = [];
                const usingImbued = this.imbue.one.using || this.imbue.two.using;
                if (!usingImbued) return imbuedWithList;
                if (this.imbue.one.using){
                    imbuedWithList.push(this.imbue.one.used.name.split(' ')[1].toLowerCase());
                }
                if (this.imbue.two.using){
                    imbuedWithList.push(this.imbue.two.used.name.split(' ')[1].toLowerCase());
                }
                return imbuedWithList;
            },
            /**
             * This method calculates the material amount total used for crafting and returns it.
             * @returns {number}
             */
            materialTotal(){
                const baseTotal = this.pickedMats.reduce((acc, mat) => acc += mat.amount, 0);
                const toolyTotal = (this.tooly.using) ? this.tooly.used.amount : 0;
                return baseTotal + toolyTotal;
            },
            /**
             * This method joins all used materials into a single array and returns it
             * @returns {BaseMaterial[]}
             */
            loadUsedMatsList(){
                // If not using tooly, pass tooly as an empty `BaseMaterial`
                const passingTooly = (this.tooly.using) 
                ? this.tooly.used
                : { rarity: 0, value: 0, amount: 0 };

                // Fill an array with all four material slots as needed for rarity gen
                const passingMatList = [...this.pickedMats, passingTooly];

                return passingMatList;
            },
            loadRarityValuePairs(){
                return this.loadUsedMatsList().map(mat => ({ r: mat.rarity, v: mat.value }));
            }
        };

        // Generated Values
        // ================
        // rarity, combatTypes(dmgTypes), combatTypeTotal(maxTypeAmount), 

        /**@type {number} */
        this.rarity;
        /**@type {string[]} */
        this.combatTypeOptions;
        /**@type {string[]} */
        this.combatTypes;
        /**@type {number} */
        this.combatTypeTotal;
        /**@type {number} */
        this.combatTypeOverflow;
        /**
         * @type { { dmg: { using: boolean, pairs: { type: string, dmg: number }[], single: number, total: number }, def: { using: boolean, pairs: { type: string, def: number }[], single: number, total: number } } }
         */
        this.combatMagnitude = {
            dmg: {
                using: false,
                pairs: [],
                single: 0,
                total: 0
            },
            def: {
                using: false,
                pairs: [],
                single: 0,
                total: 0
            }
        };
        /**@type {number} */
        this.value;
        /**@type {string} */
        this.name;
        /**@type {string} */
        this.itemCode;

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
     * This method loads the basic internals of the crafting object, based on the selected `type`.
     * It also sets the `Craftable.combatMagnitude` using types flags according to the `slot` selected.
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

        // Activate combat types based on slot, 
        // Deactivate unused types accounting for user backtracking during crafting.
        switch(this.slot){
            case "Mainhand":
                this.combatMagnitude.dmg.using = true;
                this.combatMagnitude.def.using = false;
            break;
            case "Offhand":
                this.combatMagnitude.dmg.using = true;
                this.combatMagnitude.def.using = true;
            break;
            default:
                this.combatMagnitude.dmg.using = false;
                this.combatMagnitude.def.using = true;
            break;
        }
    }

    /**
     * This method generates (crafts) an item using all internal values stored.
     */
    craftItem(){
        // First load rarity
        this.#loadRarityFromMaterials();
        // Second load combatTypes
        this.#loadCombatTypes();
        // Third load combatMagnitudes
        this.#loadCombatMagnitudes();
        // Fourth load totalValue
        this.#loadTotalValue();
    }

    /**
     * This method loads the `Craftable.rarity` using the stored data within
     * `Craftable.materials.pickedMats`
     */
    #loadRarityFromMaterials(){
        // Use `this.materials` to calculate

        // Generate rarity using the predefined formula
        this.rarity = rarityGenConstant(...this.materials.loadUsedMatsList());
    }

    /**
     * This method loads the `Craftable.combatTypes`, `Craftable.combatTypeTotal`, and `Craftable.combatTypeOverflow` fields.
     */
    #loadCombatTypes(){
        // Using code from `craftingContainer.js`

        // =====================
        //  HANDLE IMBUING HERE
        // =====================

        this.combatTypes = this.materials.extractImbued();
        
        // Loading `Options` to account for preloaded `Imbue` types ^^
        this.combatTypeOptions = itemGenDmgTypes(this);

        // concat here is used to avoid overwriting any imbued types, added above.
        this.combatTypes = this.combatTypes.concat(itemGenPickDmgTypes(this));

        // Total up the total combat types accounting for any overflow.
        this.combatTypeTotal = this.combatTypes.length + this.combatTypeOverflow;
    }

    /**
     * This method loads the `Craftable.combatMagnitude` values where `combatMagnitude[type].using === true`.
     * 
     * Loads the corrilated dmg/def fields for `single`, `total`, and `pairs`
     */
    #loadCombatMagnitudes(){
        // Using code from `craftingContainer.js`

        // Damage Loading
        if (this.combatMagnitude.dmg.using){
            this.combatMagnitude.dmg.single = itemGenDmgConstant(this.rarity, this.combatTypeTotal, this.hands, this.materials.materialTotal());
            loadCombatDmgTypePairs(this);
        }

        // Defence Loading
        if (this.combatMagnitude.def.using){
            this.combatMagnitude.def.single = itemGenDefConstant(this.rarity, this.combatTypeTotal, this.slot, this.materials.materialTotal());
            loadCombatDefTypePairs(this);
        }
    }

    /**
     * This method loads the `Craftable.value` field using all previously filled values.
     */
    #loadTotalValue(){
        // Using code from `craftingContainer.js`

        // Load final total item value
        this.value = generateItemValue(this);
    }
}

module.exports = { Craftable };