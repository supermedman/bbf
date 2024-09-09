const { SlashCommandBuilder } = require('discord.js');

const {chlkPreset} = require('../../chalkPresets.js');
const chalk = require('chalk');
const { handleLimitOnOptions, endTimer, randArrPos, inclusiveRandNum, makeCapital } = require('../../uniHelperFunctions.js');
const { checkingRarID, loadFullRarNameList, loadFullDismantleList } = require('./Export/itemStringCore.js');
const { UserMaterials, MaterialStore } = require('../../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
    .setName('datatest')
    .setDescription('Testing new code ideas during development!')
    .addSubcommandGroup(subcommandgroup =>
        subcommandgroup
        .setName('combat')
        .setDescription('Combat catagory testing')
        .addSubcommand(subcommand =>
            subcommand
            .setName('simulation')
            .setDescription('Simulate combat trials.')
            .addIntegerOption(option => 
                option
                .setName('amount')
                .setDescription('Amount of trials to run.')
            )
        )
        .addSubcommand(subcommand =>
            subcommand
            .setName('full')
            .setDescription('Simulate combat & status')
            .addIntegerOption(option => 
                option
                .setName('amount')
                .setDescription('Amount of trials to run.')
            )
        )
    )
    .addSubcommandGroup(subcommandgroup =>
        subcommandgroup
        .setName('status')
        .setDescription('Status Effects catagory testing')
        .addSubcommand(subcommand =>
            subcommand
            .setName('simulation')
            .setDescription('Simulate combat trials.')
            .addIntegerOption(option => 
                option
                .setName('amount')
                .setDescription('Amount of trials to run.')
            )
        )
    )
    .addSubcommandGroup(subcommandgroup =>
        subcommandgroup
        .setName('crafting')
        .setDescription('Crafting catagory testing')
        .addSubcommand(subcommand =>
            subcommand
            .setName('create')
            .setDescription('Simulate crafting.')
        )
    )
    .addSubcommandGroup(subcommandgroup =>
        subcommandgroup
        .setName('other')
        .setDescription('Other type of test')
        .addSubcommand(subcommand =>
            subcommand
            .setName('simulate')
            .setDescription('Simulate a test.')
            .addStringOption(option => 
                option
                .setName('sim-type')
                .setDescription('Simulation Type')
                .setAutocomplete(true)
                .setRequired(true)
            )
            .addIntegerOption(option => 
                option
                .setName('amount')
                .setDescription('Amount of trials to run.')
            )
        )
    ),
    async autocomplete(interaction){
        const focusedOption = interaction.options.getFocused(true);

        let choices = [];

        if (focusedOption.name === 'sim-type'){
            const focusedValue = interaction.options.getFocused(false);

            // Load Choices
            choices = ['MAT-load-store', 'MAT-clear-store', 'MAT-update-store', 'MAT-rand-load-static', 'MAT-rand-load-store'];

            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
            await interaction.respond(
                handleLimitOnOptions(filtered).map(choice => ({ name: choice, value: choice })),
            );
        }
    },
	async execute(interaction) { 
        if (interaction.user.id !== '501177494137995264') return await interaction.reply('This command is not for you!');

        const subComGroup = interaction.options.getSubcommandGroup();
        const subCom = interaction.options.getSubcommand();

        const startTime = new Date().getTime();

        // TO DO
        // ===========================
        // Implement blocking mechanics with new item codes and damage methods
        // ===========================
        // Create new ways to handle potion use and abilities
        // =========================== 

        const trialRuns = interaction.options.getInteger('amount') ?? 1;

        // Material Related Functions
        // ==========================
        /**
         * This function handles checking if the given `r` value needs to be converted
         * to a number, 
         * 
         * EX: 
         * ```js
         * r === "Common"; 
         * checkingRarID(r) => rarKeys<"0", "Common">;
         * return +"0";
         * ```
         * @param {string | number} r 
         * @returns {number}
         */
        const convertRarToID = r => {
            if (isNaN(r) && typeof r === 'string'){
                // Extract Rar_id from r
                return checkingRarID(r);
            } else return +r;
        };

        const isUnique = r => convertRarToID(r) === 12;
        const isUniqueRefMatch = (mat, u) => mat.UniqueMatch === u;
        const isMatRefMatch = (mat, r) => mat.Rar_id === convertRarToID(r);

        /**
         * This function checks if the given params require checking for a `unique` material,
         * otherwise checks as a non `unique` material.
         * 
         * IF UNIQUE Returns condition:
         * ```js
         * return mat.UniqueMatch === u;
         * ```
         * OTHERWISE Returns condition:
         * ```js
         * return mat.Rar_id === convertRarToID(r);
         * ```
         * @param {string | number} r Rarity Pointer, EX: `"Common" || 0 || "0"`
         * @param {object} mat Cached Material Object 
         * @param {string | undefined} u If defined, contains `mat.UniqueMatch` type to check for
         * @returns {boolean}
         */
        const isRefMatch = (r, mat, u) => {
            if (u && isUnique(r)){
                return isUniqueRefMatch(mat, u);
            } else return isMatRefMatch(mat, r);
        };

        /** 
         * @type {{type: string, options: (number | string)[]}[]}
         */
        const rarLoadTypes = [
            {
                type: "Name",
                options: [...loadFullRarNameList()]
            },
            {
                type: "ID",
                options: Array.from(new Array(11).fill(0), (v, t) => t + v)
            },
            {
                type: "sID",
                options: Array.from(new Array(11).fill(0), (v, t) => `${t + v}`)
            }
        ];
        // ==========================
        // npcOptionsContainer: (Alias) npcOC
        const npcOC = {
            creature: {
                species: [
                    {
                        name: "Human", 
                        data: {
                            stats: {
                                statRange: {max: 4, min: 2}, 
                                skillRange: {max: 4, min: 2},
                                perLevel: 1
                            },
                            lands: {
                                a: ['Normal', 'Evil', 'Phase'],
                                b: ['All'],
                                w: {
                                    m: [],
                                    c: 0
                                }
                            },
                            status: {
                                title: ['Duke', 'Earl', 'Barron', 'Count', 'Viscount', 'Lord', 'Knight', 'Peasant'],
                                econ: l => (l.a * l.b) + (l.w.m * l.w.c),
                                funds: (t, e) => t * e
                            }
                        }
                    }, 
                    {
                        name: "Dwarf", 
                        data: {
                            stats: {
                                statRange: {max: 5, min: 2}, 
                                skillRange: {max: 5, min: 2},
                                perLevel: 1.5
                            },
                            lands: {
                                a: ['Normal', 'Evil'],
                                b: ['Mountain', 'Forest'],
                                w: {
                                    m: [],
                                    c: 0
                                }
                            },
                            status: {
                                title: ['Duke', 'Earl', 'Barron', 'Count', 'Viscount', 'Lord', 'Knight', 'Peasant'],
                                econ: l => (l.a * l.b) + (l.w.m * l.w.c),
                                funds: (t, e) => t * e
                            }
                        }
                    }, 
                    {
                        name: "Elven", 
                        data: {
                            stats: {
                                statRange: {max: 5, min: 2}, 
                                skillRange: {max: 5, min: 2},
                                perLevel: 1.5
                            },
                            lands: {
                                a: ['Normal', 'Phase'],
                                b: ['Forest', 'Plains', 'Grassland'],
                                w: {
                                    m: [],
                                    c: 0
                                }
                            },
                            status: {
                                title: ['Duke', 'Earl', 'Barron', 'Count', 'Viscount', 'Lord', 'Knight', 'Peasant'],
                                econ: l => (l.a * l.b) + (l.w.m * l.w.c),
                                funds: (t, e) => t * e
                            }
                        }
                    }, 
                    {
                        name: "Yutlid", 
                        data: {
                            stats: {
                                statRange: {max: 8, min: 4}, 
                                skillRange: {max: 6, min: 3},
                                perLevel: 2
                            },
                            lands: {
                                a: ['Phase', 'Evil'],
                                b: ['All'],
                                w: {
                                    m: [],
                                    c: 0
                                }
                            },
                            status: {
                                title: ['Duke', 'Earl', 'Barron', 'Count', 'Viscount', 'Lord', 'Knight', 'Peasant'],
                                econ: l => (l.a * l.b) + (l.w.m * l.w.c),
                                funds: (t, e) => t * e
                            }
                        }
                    }, 
                    {
                        name: "Yesselise", 
                        data: {
                            stats: {
                                statRange: {max: 10, min: 6}, 
                                skillRange: {max: 7, min: 4},
                                perLevel: 3
                            },
                            lands: {
                                a: ['Phase', 'Evil'],
                                b: ['All'],
                                w: {
                                    m: [],
                                    c: 0
                                }
                            },
                            status: {
                                title: ['Duke', 'Earl', 'Barron', 'Count', 'Viscount', 'Lord', 'Knight', 'Peasant'],
                                econ: l => (l.a * l.b) + (l.w.m * l.w.c),
                                funds: (t, e) => t * e
                            }
                        }
                    }
                ]
            }
        };

        const biomeList = ['Forest', 'Grassland', 'Swamp', 'Plains', 'Desert', 'Mountain'];

        const biomeBonus = new Map([
            ["Forest", ["woody", "fleshy", "skinny"]],
            ["Grassland", ["herby", "rocky", "metalic"]],
            ["Swamp", ["slimy", "herby", "woody"]],
            ["Plains", ["skinny", "herby", "fleshy"]],
            ["Desert", ["gemy", "rocky", "skinny"]],
            ["Mountain", ["metalic", "rocky", "gemy"]]
        ]);

        const allignBonus = new Map([
            ["Normal", {mat: "magical", inc: [10, 5, 3, 3]}],
            ["Evil", {mat: "unique", inc: [5, 3, 1, 1]}],
            ["Phase", {mat: "tooly", inc: [10, 8, 5, 5]}]
        ]);

        const landEconBonus = new Map([
            ["Forest", 10000],
            ["Grassland", 10000],
            ["Swamp", 6000],
            ["Plains", 100000],
            ["Desert", 6000],
            ["Mountain", 100000]
        ]);

        const matEconBonus = new Map([
            ["fleshy", 1],
            ["skinny", 3],
            ["woody", 3],
            ["herby", 5],
            ["rocky", 2],
            ["metalic", 4],
            ["magical", 2],
            ["tooly", 10],
            ["gemy", 4],
            ["silky", 3],
            ["slimy", 4],
            ["unique", 25],
        ]);

        const allignEconBonus = new Map([
            ["Normal", 1.5],
            ["Evil", 1.8],
            ["Phase", 2]
        ]);

        const titleEconBonus = new Map([
            ["Duke", 15000],
            ["Earl", 12500],
            ["Barron", 10000],
            ["Count", 8000],
            ["Viscount", 7500],
            ["Lord", 4000],
            ["Knight", 1000],
            ["Peasant", 100]
        ]);

        const abcd = 'abcdefghijklmnopqrstuvwxyz';

        const loadRandomName = (nameLength) => {
            const newName = Array.from(new Array(nameLength).fill(0), () => abcd[inclusiveRandNum(26, 0)]).join("");
            return makeCapital(newName);
        };

        class CombatNPC {
            constructor(){
                this.level = inclusiveRandNum(200, 1);
                this.name = loadRandomName(inclusiveRandNum(8, 4));

                this.fullCaste = randArrPos(npcOC.creature.species)

                this.creatureCaste = {
                    species: this.fullCaste.name
                };

                this.homelandCaste = {
                    allignment: randArrPos(this.fullCaste.data.lands.a),
                    biome: (this.fullCaste.data.lands.b[0] !== 'All') ? randArrPos(this.fullCaste.data.lands.b) : randArrPos(biomeList),
                    wealth: {m: 0, c: 0}
                };
                const materialGroup = [...[biomeBonus.get(this.homelandCaste.biome)], (allignBonus.get(this.homelandCaste.allignment)).mat];

                this.homelandCaste.wealth.m = materialGroup.reduce((acc, ele) => {
                    return (acc > 0) ? acc + matEconBonus.get(ele) : matEconBonus.get(ele);
                }, 0);
                this.homelandCaste.wealth.c = this.homelandCaste.wealth.m * (landEconBonus.get(this.homelandCaste.biome) * allignEconBonus.get(this.homelandCaste.allignment));

                this.individualCaste = {
                    title: randArrPos(this.fullCaste.data.status.title),
                    buyingPower: 0
                };
                this.individualCaste.buyingPower = this.homelandCaste.wealth.c * titleEconBonus.get(this.individualCaste.title);


                this.abilitiesCaste = {
                    physical: {

                    },
                    magical: {

                    },
                    special: {

                    }
                };

                // stats: {
                //     statRange: {max: 4, min: 2}, 
                //     skillRange: {max: 4, min: 2},
                //     perLevel: 1
                // },

                const {min, max} = this.fullCaste.data.stats.statRange;
                const levelDistrabution = this.level * this.fullCaste.data.stats.perLevel;

                this.baseStatsCaste = {
                    str: inclusiveRandNum(max, min) + (levelDistrabution / 4),
                    spd: inclusiveRandNum(max, min) + (levelDistrabution / 4),
                    int: inclusiveRandNum(max, min) + (levelDistrabution / 4),
                    dex: inclusiveRandNum(max, min) + (levelDistrabution / 4)
                };
            }

            buyLoadout(){
                const {title, buyingPower} = this.individualCaste;
            }
        }


        // Combat order of operations
        /**
         *      Deal Shield Damage:
         *      - No status applied while shield HP is active
         *      X Turn Ends
         *      If armor not broken, deal damage to armor:
         *      - Check for relavent Status effects 
         *      - Check if Flesh effects can activate
         *      - Apply all applicable effects
         *      X Turn Ends
         *      If armor broken, armor set to 0, recalculate damage values:
         *      - Check if Flesh effects can activate
         *      - Apply status effects
         *      X Turn Ends
         */
        switch(subComGroup){
            case "combat":
                switch(subCom){
                    case "simulation":
                        // NPC testing
                        const combatNPC = new CombatNPC();
                        console.log(combatNPC);
                    break;
                    case "full":
                        
                    break;
                }
            break;
            case "status":
                switch(subCom){
                    case "simulation":

                    break;
                }
            break;
            case "crafting":
                switch(subCom){
                    case "create":
                        // NPC testing
                    break;
                }
            break;
            case "other":
                switch(subCom){
                    case "simulate":
                        const simType = interaction.options.getString('sim-type');
                        const simCAT = simType.split('-')[0];
                        if (simCAT === 'MAT'){
                            // Material based tests
                            // ['MAT-load-store', 'MAT-clear-store', 'MAT-update-store', 'MAT-rand-load-static', 'MAT-rand-load-store']
                            if (simType === 'MAT-load-store'){
                                await generateMaterialStores(interaction);
                            }

                            if (simType === 'MAT-clear-store'){

                            }

                            if (simType === 'MAT-update-store'){
                                await updateMatchingMaterialStore(interaction);
                            }

                            if (simType === 'MAT-rand-load-static'){
                                retrieveStaticMatRef(interaction);
                            }

                            if (simType === 'MAT-rand-load-store'){
                                await retrieveStoredMatData(interaction);
                            }
                        }
                    break;
                }
            break;
        }           
        endTimer(startTime, `Data Test ${subComGroup} ${subCom}`); 

        const endTime = new Date().getTime();
        return await interaction.reply(`Command took ${endTime - startTime}ms to complete!`);

        // Material Related Functions
        /**
         * This function attempts to retireve the contents of `interaction.client.materials.get(mType)[mUType ?? mRar]` where
         * `mType`, `mUType`, and `mRar` are chosen at random.
         * @param {object} interaction 
         */
        function retrieveStaticMatRef(interaction){
            const {materials} = interaction.client;
        
            // Any method of obtaining mattype as string
            const mType = randArrPos(loadFullDismantleList([])); // 'slimy'; 
        
            // randArrPos([{type: "string"}, {type: "number"}, {type: "string number id"}])
            
            // Any method of obtaining rarity/rar_id either string or number
            const mRar = (mType !== 'unique') ? randArrPos((randArrPos(rarLoadTypes)).options) : randArrPos(['unique', 12, "12"]);
        
            // If material is unique type string, otherwise undefined
            const mUType = (mType !== 'unique') ? undefined : randArrPos((materials.get(mType)).map(mat => mat.UniqueMatch)); // 'Dark' || undefined
        
            // Grab cached material type list
            const matDataList = materials.get(mType);
        
            // Final Material Ref Match.
            const matMatch = matDataList.find(mat => isRefMatch(mRar, mat, mUType));
        
            console.log(`Random Details:\nMatType: ${mType}\nMatRarity: ${mRar}\nMat Match Found: `, matMatch);
        }
        
        /**
         * This function attempts to retireve the contents of `UserMaterials[type].matdata[uT | mR]` where 
         * `type`, `uT`, and `mR` are randomly chosen.
         * @param {object} interaction Base Interaction Object
         */
        async function retrieveStoredMatData(interaction){
            const {materials} = interaction.client;
            // Retrieve ALL Single User Stored materials
            // const userMats = await UserMaterials.findAll({where: {userid: user.userid}});
        
            // Defined by some interaction
            // Any method of obtaining mattype as string
            const mType = randArrPos(loadFullDismantleList([])); 
            // Any method of obtaining rarity/rar_id either string or number
            const mRar = (mType !== 'unique') ? randArrPos((randArrPos(rarLoadTypes)).options) : randArrPos(['unique', 12, "12"]);

            // If material is unique type string, otherwise undefined
            const mUType = (mType !== 'unique') ? undefined : randArrPos((materials.get(mType)).map(mat => mat.UniqueMatch));
        
            // Retrieve ONE Single User Stored Material Type
            const userMatMatch = await UserMaterials.findOne({where: {userid: interaction.user.id, mattype: mType}});
        
            // Parsed JSON Object
            const mdObj = JSON.parse(userMatMatch.matdata);
        
            // typeof `storedMatData` === 'number' && `storedMatData` === Material Amount Owned 
            const matPropVal = (!mUType) ? (convertRarToID(mRar)).toString() : mUType;
            const storedMatData = mdObj[`${matPropVal}`];
        
            console.log(`Contents of UserMaterials where:\nMatType: ${mUType ?? mType}\nMatRarity: ${mRar}\nContents: `, storedMatData);
        }

        /**
         * This function attempts to updated every `UserMaterials` entry associated with the given user.
         * For each table entry found, compares stored user materials, updating any matching all values checked for.
         * Saves and reloads all updated tables before returning.
         * @param {object} interaction Base Interaction Object
         */
        async function updateMatchingMaterialStore(interaction){
            const {materials} = interaction.client;

            /**
             * This function provides faster script writing
             * @param {string} t MatType 
             * @returns {Promise <object>}
             */
            const grabMatTypeEntry = async t => await UserMaterials.findOne({where: {userid: interaction.user.id, mattype: t}});

            /**
             * This function updates the `UserMaterials` Table entry matching the using user and the given `t`
             * @template U
             * @param {string} t MatType
             * @param {U} upObj Updated Value Object constructed based on the owned materials/amounts of the user
             */
            const updateMatTypeEntry = async (t, upObj) => {
                const UMTE = await grabMatTypeEntry(t);
                await UMTE.update({matdata: JSON.stringify(upObj)})
                .then(async umte => await umte.save())
                .then(async umte => {return await umte.reload()});
                return UMTE;
            };

            /**
             * This function handles loading both the `searchFor` and `mats` arrays depending on the `t` given
             * 
             * Returns `found: false` if no mats pass first DB Query
             * @param {string} t MatType being checked
             * @returns {Promise <{found: boolean, mats: object[], searchFor: (number | string)[]}>}
             */
            const grabStoredMaterials = async t => {
                const returnObj = {found: false, mats: [], searchFor: []};
                if (t === 'unique'){
                    returnObj.mats = await MaterialStore.findAll({where: {spec_id: interaction.user.id, rar_id: 12}});
                    if (!returnObj.mats.length) return returnObj;
                    returnObj.searchFor = returnObj.mats.map(m => m.mattype);
                    returnObj.found = true;
                    return returnObj;
                }

                returnObj.mats = await MaterialStore.findAll({where: {spec_id: interaction.user.id, mattype: t}});
                if (!returnObj.mats.length) return returnObj;
                returnObj.searchFor = returnObj.mats.map(m => m.rar_id.toString());
                returnObj.found = true;
                return returnObj;
            };

            const isUniqueEntryMatch = (mat, u) => mat.mattype === u;
            const isMatEntryMatch = (mat, r) => mat.rar_id === convertRarToID(r);
            
            const updatedEntryList = [];
            for (const key of materials.keys()){
                const matStoreObj = await grabStoredMaterials(key);
                if (!matStoreObj.found) continue;

                const matDataObj = JSON.parse((await grabMatTypeEntry(key)).matdata);

                /**
                 * This function handles first checking if the given `r` is parsable to num
                 * 
                 * IF NOT: uses `isUniqueEntryMatch` as the `.find()` predicate
                 * 
                 * IF IS: uses `isMatEntryMatch` as the `.find()` predicate
                 * 
                 * Both are used to `.find()` a match from the `matStoreObj.mats[]` array.
                 * @param {string} r Either rar_id string, or `UniqueMatch` string
                 * @returns {number} Owned amount of material match found
                 */
                const grabStoredAmount = r => {
                    const matchesTypeCheck = (isNaN(r)) ? isUniqueEntryMatch : isMatEntryMatch;
                    const matchingMat = matStoreObj.mats.find(mat => matchesTypeCheck(mat, r));
                    return matchingMat.amount;
                }

                /**
                 * @type {{ [r:string]: number }}
                 */
                const updatedMatDataObj = Object.entries(matDataObj)
                .reduce((acc, [k, v]) => {
                    // Is Match Found?
                    if (!matStoreObj.searchFor.includes(k)){
                        acc[k] = v; // NO
                    } else acc[k] = grabStoredAmount(k); // YES
                    return acc;
                }, {});

                const updatedMatEntry = await updateMatTypeEntry(key, updatedMatDataObj);
                updatedEntryList.push(updatedMatEntry);
            }

            const showDetails = (ele, i) => {
                console.log(`UserMaterials Table #${i}:\n`, ele.dataValues);
            };

            updatedEntryList.forEach(showDetails);
        }
        
        /**
         * This function attempts to create a table for each material type stored within `client.materials.keys()`.
         * If a table for the given user and `key` is found do nothing, otherwise create a JSON object from the stored
         * material refs returned with `materials.get(key)`. 
         * @param {object} interaction Base Interaction Object
         */
        async function generateMaterialStores(interaction){
            const {materials} = interaction.client;
        
            const entryExists = async t => await UserMaterials.findOne({where: {userid: interaction.user.id, mattype: t}});
        
            const createdEntryList = [];
            // Initial Table Entries created all at once 
            for (const key of materials.keys()){
                if ((await entryExists(key))) continue;
                const mDataObj = materials.get(key).reduce((acc, mat) => {
                    if (key === 'unique'){
                        acc[`${mat.UniqueMatch}`] = 0;
                    } else acc[`${mat.Rar_id.toString()}`] = 0;
                    return acc;
                }, {});
            
                const newMatStore = await UserMaterials.create({
                    userid: interaction.user.id,
                    mattype: key,
                    matdata: JSON.stringify(mDataObj)
                });
                createdEntryList.push(newMatStore);
            }
        
            const saveTableData = async (entry) => {
                await entry.save();
            };
        
            createdEntryList.forEach(saveTableData);
        
            const userMatEntries = await UserMaterials.findAll({where: {userid: interaction.user.id}});
        
            const showDetails = (ele, i) => {
                console.log(`UserMaterials Table #${i}:\n`, ele.dataValues);
            };
        
            userMatEntries.forEach(showDetails);
        }
	},
};