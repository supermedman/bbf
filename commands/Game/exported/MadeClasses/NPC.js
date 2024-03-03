const npcNameCaste = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcNameCaste.json');
const npcStatCaste = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcStatCaste.json');
const npcNames = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcNames.json');
const npcTaskList = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcTaskList.json');
const npcTaskCastes = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcTaskCastes.json');
const npcDialogCaste = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcDialogCaste.json');

const lootList = require('../../../../events/Models/json_prefabs/lootList.json');

const {NPCcheckMaterialFav} = require('../locationFilters.js');

const randArrPos = (arr) => {
    return arr[(arr.length > 1) ? Math.floor(Math.random() * arr.length) : 0];
};

class NPC {
    constructor(npcRef) {
        let refCheck = false;
        if (npcRef) refCheck = true;

        this.level;
        this.name;
        this.curBiome;
        this.npcid;

        // From town plot, tavern, other town related encounters
        this.fromTown = false;
        if (refCheck) this.fromTown = true;

        // From random encounter, during regular actions and combat
        this.fromWilds = true;
        if (refCheck) this.fromWilds = false;

        // All task related data and choices.
        this.taskType; // Type of task
        this.taskTags; // Ex. Easy, Gather
        this.taskList; // Task Object itself
        this.taskContents = {}; // Details of task after being generated
        this.taskRequest = {
            Name: "TMP",
            Rarity: "NONE",
            Rar_id: 0,
            Amount: 0,
        };

        // Time before npc self deletes from active/goes to sleep.
        this.sleepAfter;

        // If npc canMove or has already moved into a towns house then the npc can be recruited!
        this.canMove;
        this.hasMoved;
        if (this.canMove || this.hasMoved){
            this.happiness; // Must be @ set amount before moveing
            this.moveConditions; // External needs
            this.requests; // Special move requests. Ex. "I need this type of roof on my house!"
            this.townid; // For use upon moving in to save to db
            this.plotid; // For use upon moving in to save to db
        }

        // Only if this npc came from a town can it be recruited
        if (this.fromTown){
            this.canRecruit; // Allows for additional actions 
            
            this.combatSkill; // Overall combat capabilities
            this.gatherSkill; // Overall resource Acquisition capabilities
            this.craftSkill; // Overall crafting capabilities
            //this.duelSkill; // Unsure atm, may be used for PvP content
        }
    }

    genRandNpc(localBiome) {
        const biomes = ['Forest', 'Mountain', 'Desert', 'Plains', 'Swamp', 'Grassland'];
        const genFromBiome = localBiome ?? randArrPos(biomes);

        this.curBiome = genFromBiome;

        let statCaste = npcStatCaste.filter(caste => caste.Biome === this.curBiome);
        statCaste = statCaste[0];

        this.level = Math.floor(Math.random() * (statCaste.LevelMax - statCaste.LevelMin + 1) + statCaste.LevelMin);
        console.log('Spawned @ Level %d', this.level);

        this.genName();

        this.genNewTask();

        this.genDialogOptions();
        /**		
         *          === Name Refs ===
         * 
         *      Skill Refs:
         *      - coS === combatSkill
         *      - gaS === gatherSkill
         *      - crS === craftSkill
         * 
         *      Task Refs:
         *      - taskP === Preference
         *      - taskD === Difficulty
         *      - taskA === Available
         *      - taskL === List
         * 
         *      If Can Move-In:
         *      - moveHap === Happiness Increases
         *      - moveCon === Moving Conditions
         *      - moveReq === Moving Requests
         * 
         * 
         * 
         *      BIOME OUTCOMES:
         *      
         *      - Forest
         *          - coS + 3
         *          - gaS + 3
         *          - crS + 3
         *          
         *          - taskP = Balanced
         *          - taskD = Easy
         *          - taskA = All Basic
         *          - taskL = Forest
         * 
         *          - moveHap = Wood House Styles/Forest Biome
         *          - moveCon = moveHap 50+, Min 1 Task Complete
         *          - moveReq = 0 - 1 
         *      
         *      - Mountain
         *          - coS + 2
         *          - gaS + 2
         *          - crS + 5
         * 
         *          - taskP = Craft Type
         *          - taskD = Hard
         *          - taskA = All Basic - Hardest Craft
         *          - taskL = Mountain
         * 
         *          - moveHap = "Rare" Stone House Styles/Mountain Biome
         *          - moveCon = moveHap 85+, Min 5 Tasks Complete
         *          - moveReq = 3 - 5
         * 
         *      - Desert
         *          - coS + 5
         *          - gaS + 2
         *          - crS + 2     
         * 
         *          - taskP = Combat Type
         *          - taskD = Hard
         *          - taskA = All Basic - Hardest Combat
         *          - taskL = Desert
         * 
         *          - moveHap = "Rare" House Styles/Desert Biome
         *          - moveCon = moveHap 85+, Min 5 Tasks Complete
         *          - moveReq = 3 - 5
         * 
         *      - Plains
         *          - coS + 4
         *          - gaS + 2
         *          - crS + 3
         * 
         *          - taskP = Combat Type
         *          - taskD = Medium
         *          - taskA = All Basic - Medium Combat
         *          - taskL = Plains/Grassland
         * 
         *          - moveHap = "Rare" House Styles/Plains Biome +100% || Grassland +50%
         *          - moveCon = moveHap 65+, Min 3 Tasks Complete
         *          - moveReq = 1 - 3 
         * 
         *      - Swamp
         *          - coS + 2
         *          - gaS + 4
         *          - crS + 3
         * 
         *          - taskP = Gather Type
         *          - taskD = Medium
         *          - taskA = All Basic - Medium Gather
         *          - taskL = Swamp/Forest
         * 
         *          - moveHap = "Rare" Wood House Styles/Swamp Biome +100% || Forest +50%
         *          - moveCon = moveHap 65+, Min 3 Tasks Complete
         *          - moveReq = 1 - 3
         * 
         *      - Grassland
         *          - coS + 3
         *          - gaS + 3
         *          - crS + 3	
         * 
         *          - taskP = Balanced
         *          - taskD = Easy
         *          - taskA = All Basic
         *          - taskL	= Grassland
         * 
         *          - moveHap = Stone || "Uncommon" Wood House Styles/Grassland Biome
         *          - moveCon = moveHap 50+, Min 1 Task Complete
         *          - moveReq = 0 - 1
        * */

    }

    genName(){
        // Generate NPC name off of level and location
        let nameCaste = npcNameCaste.filter(caste => caste.Biome === this.curBiome);
        nameCaste = nameCaste[0];
        const finalCaste = this.#extraNameGens(nameCaste);

        let nameTypeList;
        if (this.fromTown === true) nameTypeList = finalCaste[0].Tame;
        if (this.fromWilds === true) nameTypeList = finalCaste[0].Wild;

        //console.log(`Current Name List: ${nameTypeList}`);
        this.name = randArrPos(nameTypeList);
    }

    #extraNameGens(nameCaste){
        // Array of Name Rarities Available to Biome
        const rarChoices = nameCaste.CanHave;

        // Filtering All Possible Rarity Castes
        let rarCatChoices = [];
        for (const choice of rarChoices){
            rarCatChoices.push(npcNames.filter(cat => cat.Rarity === choice));
        }

        // Filtering all castes available for level range
        let finalCasteChoices = [];
        for (const cat of rarCatChoices){
            if (this.level > cat.LevelMax) continue;
            finalCasteChoices.push(cat);
        }

        //console.log(`Current Available Castes: ${finalCasteChoices.length}`);

        let finalCaste;
        // Picking from one of available castes
        if (finalCasteChoices.length > 1){
            let commonWeight = (100 - finalCasteChoices.length * 10) + 10;
            //console.log(`Current Common Weight: ${commonWeight}/100`);

            const rngRolled = Math.floor((Math.random()) * 100);
            //console.log(`Rolled Num: ${rngRolled}`);
            if (rngRolled <= commonWeight) return finalCaste = finalCasteChoices[0];
            
            let tmpBypassCommon = randArrPos(finalCasteChoices);
            while (tmpBypassCommon === finalCasteChoices[0]){
                tmpBypassCommon = randArrPos(finalCasteChoices);
            }
            return finalCaste = tmpBypassCommon;
        }
    }

    genNewTask(){
        // Generate NPC's current task/new task off of level, location, and prereq.
        let taskCaste = npcTaskCastes.filter(caste => caste.Biome === this.curBiome);
        taskCaste = taskCaste[0];

        //console.log("Difficulties: ", ...taskCaste.MaxDiff);
        //console.log("Types: ", ...taskCaste.Types);

        // Task Type "Basic" = All Tasks at taskCaste.MaxDiff[0]
        let filterCats = [];
        for (const task of npcTaskList){
            // Temp Exclude "Craft" taskType
            if (task.Category === "Craft") continue;
            filterCats.push(task.Category);
        }

        const taskTypePicked = randArrPos(filterCats);
        let taskPicked = npcTaskList.filter(task => task.Category === taskTypePicked);
        taskPicked = taskPicked[0];

        this.taskType = taskTypePicked;
        /**
         *      Level Ranges:
         * 
         *      Baby:   1-5
         * 
         *      Easy:   1-8
         * 
         *      Medium: 8-12
         * 
         *      Hard:   12-25
         * 
         *      GodGiven:   70-100
         * 
         */
        const levelMaps = new Map();
        levelMaps.set("Baby", 5);
        levelMaps.set("Easy", 8);
        levelMaps.set("Medium", 12);
        levelMaps.set("Hard", 25);
        levelMaps.set("GodGiven", 100);
        
        let highest = "";
        for (const [key, value] of levelMaps){
            if (typeof taskCaste.Types[1] === "string" && taskCaste.Types[1] === taskTypePicked) {
                highest = taskCaste.MaxDiff[1]; 
                break;
            } else if (typeof taskCaste.Types[1] === "string"){
                highest = taskCaste.MaxDiff[0];
                break;
            } else {
                if (this.level >= value) highest = key;
                if (this.level < value) {highest = key; break;}
            }
        }

        const availableChoices = [];
        for (const [key] of levelMaps){
            if (highest === key) {availableChoices.push(key); break;}
            availableChoices.push(key);
        }

        const diffPicked = randArrPos(availableChoices);
        const finalTaskCat = taskPicked[`${diffPicked}`];

        let finalTask = randArrPos(finalTaskCat);

        this.taskTags = [this.taskType, diffPicked]; //`${this.taskType}, ${diffPicked}`
        this.taskList = finalTask;
        this.taskContents = this.taskList.Conditions;

        this.genTaskDetails();
    }

    genTaskDetails(){
        console.log(`Details from genTaskDetails(): \n${this.taskType}\n${this.taskTags}`);
        console.log(this.taskList);

        switch(this.taskType){
            case "Fetch":
                this.#genFetchTask();
                break;
            case "Combat":
                this.#genCombatTask();
                break;
            case "Gather":
                this.#genGatherTask();
                break;
            case "Craft":
                this.#genCraftTask();
                break;
        }
    }

    grabTaskDisplayFields(){
        let fieldName = " ";
        let fieldValue = " ";

        switch(this.taskType){
            case "Fetch":
                fieldName = (this.taskContents.Material === true) ? "Material Requested: " : "Item Requested: ";
                fieldValue = `Name: ${this.taskRequest.Name}\nRarity: ${this.taskRequest.Rarity}\nAmount: ${this.taskRequest.Amount}`;
                break;
            case "Combat":
                fieldName = "Enemies To Kill: ";
                fieldValue = `Level: ${this.taskRequest.MinLevel}+\nAmount: ${this.taskRequest.Amount}`;
                break;
            case "Gather":
                fieldName = "Material Requested: ";
                fieldValue = `Name: ${this.taskRequest.Name}\nRarity: ${this.taskRequest.Rarity}\nAmount: ${this.taskRequest.Amount}`;
                break;
            case "Craft":
                
                break;
        }



        const fieldObj = {name: fieldName, value: fieldValue};
        const finalFields = [fieldObj];
        return finalFields;
    }

    #genFetchTask(){
        console.log("Fetch Task!");
        const fetchType = (this.taskContents.Material === true) ? "Material" : "Item";
        let returnObj = {
            Name: "",
            Rarity: "",
            Rar_id: 0,
            Amount: 0,
        };

        const rarityList = ["Common", "Uncommon", "Rare", "Very Rare", "Epic", "Mystic", "?", "??", "???", "????"];

        const lowestRarIndex = rarityList.indexOf(this.taskContents.RarityMin);
        const highestRarIndex = 1 + rarityList.indexOf(this.taskContents.RarityMax);
        
        //console.log(`Lowest: ${lowestRarIndex}\nHighest: ${highestRarIndex}`);

        const rarOptions = rarityList.slice(lowestRarIndex, highestRarIndex);

        const rarResult = randArrPos(rarOptions);
        const rarIdResult = rarityList.indexOf(rarResult);

        returnObj.Rarity = rarResult;
        returnObj.Rar_id = rarIdResult;
        //console.log(`Rarity: ${rarResult}\nRar_id: ${rarIdResult}`);

        const amountWanted = Math.floor(Math.random() * (this.taskContents.MaxNeed - this.taskContents.MinNeed + 1) + this.taskContents.MinNeed);
        returnObj.Amount = amountWanted;

        if (fetchType === "Material"){
            // Generate Material Request
            let matPath = NPCcheckMaterialFav(this.curBiome);
            matPath += "List.json";
            const matFile = `../../../../events/Models/json_prefabs/materialLists/${matPath}`;
            
            const materialList = require(matFile);
            let matPicked = materialList.filter(mat => mat.Rar_id === rarIdResult);
            matPicked = matPicked[0];

            returnObj.Name = matPicked.Name;
        } else if (fetchType === "Item"){
            // Generate Item Request
            const itemsFiltered = lootList.filter(item => item.Rar_id === rarIdResult);
            const itemPicked = randArrPos(itemsFiltered);

            returnObj.Name = itemPicked.Name;
        }

        this.taskRequest = returnObj;
    }

    #genCombatTask(){
        console.log("Combat Task!");
        let returnObj = {
            MinLevel: 0,
            Amount: 0,
        };

        const minimumLevel = Math.floor(Math.random() * (this.taskContents.LevelMax - this.taskContents.LevelMin + 1) + this.taskContents.LevelMin);
        returnObj.MinLevel = minimumLevel;
        const amountWanted = Math.floor(Math.random() * (this.taskContents.MaxNeed - this.taskContents.MinNeed + 1) + this.taskContents.MinNeed);
        returnObj.Amount = amountWanted;

        this.taskRequest = returnObj;
    }

    #genGatherTask(){
        console.log("Gather Task!");
        let returnObj = {
            Name: "",
            Rarity: "",
            Rar_id: 0,
            Amount: 0,
        };

        const rarityList = ["Common", "Uncommon", "Rare", "Very Rare", "Epic", "Mystic", "?", "??", "???", "????"];

        const lowestRarIndex = rarityList.indexOf(this.taskContents.RarityMin);
        const highestRarIndex = 1 + rarityList.indexOf(this.taskContents.RarityMax);
        
        //console.log(`Lowest: ${lowestRarIndex}\nHighest: ${highestRarIndex}`);

        const rarOptions = rarityList.slice(lowestRarIndex, highestRarIndex);

        const rarResult = randArrPos(rarOptions);
        const rarIdResult = rarityList.indexOf(rarResult);

        returnObj.Rarity = rarResult;
        returnObj.Rar_id = rarIdResult;
        //console.log(`Rarity: ${rarResult}\nRar_id: ${rarIdResult}`);

        const amountWanted = Math.floor(Math.random() * (this.taskContents.MaxNeed - this.taskContents.MinNeed + 1) + this.taskContents.MinNeed);
        returnObj.Amount = amountWanted;

        // Generate Material Request
        let matPath = NPCcheckMaterialFav(this.curBiome);
        matPath += "List.json";
        const matFile = `../../../../events/Models/json_prefabs/materialLists/${matPath}`;
        
        const materialList = require(matFile);
        let matPicked = materialList.filter(mat => mat.Rar_id === rarIdResult);
        matPicked = matPicked[0];

        returnObj.Name = matPicked.Name;

        this.taskRequest = returnObj;
    }

    #genCraftTask(){
        console.log("Craft Task!");
    }

    genDialogOptions(){
        const embedContentList = [];
        const replyOptionsList = [];

        // Compile all dialog castes together for the current preset tasktype/difficulty/biome
        let locFilter = npcDialogCaste[0].Locations.filter(caste => caste.Biome === this.curBiome);
        locFilter = locFilter[0].Castes;
        let taskFilter = npcDialogCaste[0].TaskTypes.filter(caste => caste.Type === this.taskType);
        taskFilter = taskFilter[0].Castes;
        let diffFilter = npcDialogCaste[0].Difficulties.filter(caste => caste.Rated === this.taskTags[1]);
        diffFilter = diffFilter[0].Castes;

        const locPicked = randArrPos(locFilter);
        const taskPicked = randArrPos(taskFilter);
        const diffPicked = randArrPos(diffFilter);

        embedContentList[0] = locPicked.Dialog;
        embedContentList[1] = taskPicked.Dialog;
        embedContentList[2] = diffPicked.Dialog;

        replyOptionsList[0] = randArrPos(locPicked.Options);
        replyOptionsList[1] = randArrPos(taskPicked.Options);
        replyOptionsList[2] = randArrPos(diffPicked.Options);

        this.dialogList = embedContentList;
        this.replyOptions = replyOptionsList;
        
        console.log(`Location Result: ${locPicked.Name}\nTask Result: ${taskPicked.Name}\nDifficulty Result: ${diffPicked.Name}`);
        console.log(...embedContentList);
        console.log(...replyOptionsList);
    }

    combatSkillCheck(){
        // Combat related buffs and abilities
    }

    gatherSkillCheck(){
        // Resource related buffs and abilities
    }

    craftSkillCheck(){
        // Crafting related buffs and abilities
    }
}


module.exports = { NPC };