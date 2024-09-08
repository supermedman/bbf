const { SlashCommandBuilder } = require('discord.js');

const {chlkPreset} = require('../../chalkPresets.js');
const chalk = require('chalk');
const { handleLimitOnOptions } = require('../../uniHelperFunctions.js');
const { checkingRarID, loadFullRarNameList } = require('./Export/itemStringCore.js');
const { UserMaterials } = require('../../dbObjects.js');

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
            choices = ['MAT-load-store', 'MAT-clear-store', 'MAT-rand-load-static', 'MAT-rand-load-store'];

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
        let endTime;

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
        const isUniqueMatch = (mat, u) => mat.UniqueMatch === u;
        const isMatMatch = (mat, r) => mat.Rar_id === convertRarToID(r);

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
                return isUniqueMatch(mat, u);
            } else return isMatMatch(mat, r);
        };

        /** 
         * @type {{type: string, options: (number[] | string[])}[]}
         */
        const rarLoadTypes = [
            {
                type: "Name",
                options: [...loadFullRarNameList()]
            },
            {
                type: "ID",
                options: Array.from(new Array(19).fill(0), (v, t) => t + v)
            },
            {
                type: "sID",
                options: Array.from(new Array(19).fill(0), (v, t) => `${t + v}`)
            }
        ];
        // ==========================


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
                            
                            
                            // ['MAT-load-store', 'MAT-clear-store', 'MAT-rand-load-static', 'MAT-rand-load-store']
                            if (simType === 'MAT-load-store'){
                                await generateMaterialStores(interaction);
                            }

                            if (simType === 'MAT-clear-store'){

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
        endTime = new Date().getTime();

        return await interaction.reply(`Command took ${endTime - startTime}ms to complete!`);

        // Material Related Functions
        function retrieveStaticMatRef(interaction){
            const {materials} = interaction.client;
        
            // Any method of obtaining mattype as string
            const mType = randArrPos(loadFullDismantleList()); // 'slimy'; 
        
            // randArrPos([{type: "string"}, {type: "number"}, {type: "string number id"}])
            
            // Any method of obtaining rarity/rar_id either string or number
            const mRar = randArrPos((randArrPos(rarLoadTypes)).options);
        
            // If material is unique type string, otherwise undefined
            const mUType = undefined; // 'Dark' || undefined
        
            // Grab cached material type list
            const matDataList = materials.get(mType);
        
            // Final Material Ref Match.
            const matMatch = matDataList.find(mat => isRefMatch(mRar, mat, mUType));
        
            console.log(`Random Details:\nMatType: ${mType}\nMatRarity: ${mRar}\nMat Match Found: `, matMatch);
        }
        
        
        async function retrieveStoredMatData(interaction){
            // Retrieve ALL Single User Stored materials
            // const userMats = await UserMaterials.findAll({where: {userid: user.userid}});
        
            // Defined by some interaction
            // Any method of obtaining mattype as string
            const mType = randArrPos(loadFullDismantleList()); 
            // Any method of obtaining rarity/rar_id either string or number
            const mRar = randArrPos((randArrPos(rarLoadTypes)).options);
        
            // Retrieve ONE Single User Stored Material Type
            const userMatMatch = await UserMaterials.findOne({where: {userid: interaction.user.id, mattype: mType}});
        
            // Parsed JSON Object
            const mdObj = JSON.parse(userMatMatch.matdata);
        
            // typeof `storedMatData` === 'number' && `storedMatData` === Material Amount Owned 
            const storedMatData = mdObj[`${(convertRarToID(mRar)).toString()}`];
        
            console.log(`Contents of UserMaterials where:\nMatType: ${mType}\nMatRarity: ${mRar}\nContents: `, storedMatData);
        }
        
        
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