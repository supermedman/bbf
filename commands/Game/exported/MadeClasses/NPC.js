const npcNameCaste = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcNameCaste.json');
const npcStatCaste = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcStatCaste.json');
const npcNames = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcNames.json');
const npcTaskList = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcTaskList.json');
const npcTaskCastes = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcTaskCastes.json');
const npcDialogCaste = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcDialogCaste.json');

const lootList = require('../../../../events/Models/json_prefabs/lootList.json');

const {NPCcheckMaterialFav} = require('../locationFilters.js');
const { inclusiveRandNum, grabUser, randArrPos } = require('../../../../uniHelperFunctions.js');
const { CraftControllers } = require('../../../../dbObjects.js');
const { handleControllerUpdateCheck, loadCasteTypeFilterObject } = require('../craftingExtras.js');
const { getFilteredCasteTypes, checkingCaste } = require('../../../Development/Export/itemStringCore.js');

// const randArrPos = (arr) => {
//     return arr[(arr.length > 1) ? Math.floor(Math.random() * arr.length) : 0];
// };

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

    async genRandNpc(localBiome, userid='0') {
        const biomes = ['Forest', 'Mountain', 'Desert', 'Plains', 'Swamp', 'Grassland'];
        const genFromBiome = (localBiome === 'Wilds') ? randArrPos(biomes) : localBiome;

        this.curBiome = genFromBiome;

        let statCaste = npcStatCaste.filter(caste => caste.Biome === this.curBiome);
        statCaste = statCaste[0];

        this.level = Math.floor(Math.random() * (statCaste.LevelMax - statCaste.LevelMin + 1) + statCaste.LevelMin);
        console.log('Spawned @ Level %d', this.level);

        this.genName();

        await this.genNewTask(userid);

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

    async genNewTask(userid){
        // Generate NPC's current task/new task off of level, location, and prereq.
        const taskCaste = npcTaskCastes.find(caste => caste.Biome === this.curBiome);
        // taskCaste = taskCaste[0];

        //console.log("Difficulties: ", ...taskCaste.MaxDiff);
        //console.log("Types: ", ...taskCaste.Types);

        // Grab reference to user if userid is valid
        const userRef = (userid !== '0') ? await grabUser(userid): false;

        // Task Type "Basic" = All Tasks at taskCaste.MaxDiff[0]
        const taskTypeList = [];
        for (const t of npcTaskList){ 
            if (t.Category === "Craft" && (!userRef || userRef.level < 10)) continue; // User has no crafting access yet
            taskTypeList.push(t.Category); 
        }

        // let filterCats = [];
        // for (const task of npcTaskList){
        //     // Temp Exclude "Craft" taskType
        //     if (task.Category === "Craft") continue;
        //     filterCats.push(task.Category);
        // }

        const taskTypePicked = randArrPos(taskTypeList);
        const taskPicked = npcTaskList.find(task => task.Category === taskTypePicked);
        // taskPicked = taskPicked[0];

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
        const levelMaps = new Map([
            ["Baby", {min: 1, max: 5}],
            ["Easy", {min: 1, max: 8}],
            ["Medium", {min: 9, max: 12}],
            ["Hard", {min: 13, max: 25}],
            ["GodGiven", {min: 70, max: 100}]
        ]);
        
        let highest = "";
        for (const [key, value] of levelMaps){
            // If task castes biome contains a specific extra type
            if (taskCaste.Types.length > 1){
                // If extra type matches picked type, use its difficulty, else use default difficulty
                if (taskCaste.Types[1] === taskTypePicked){
                    highest = taskCaste.MaxDiff[1];
                } else highest = taskCaste.MaxDiff[0];
                break;
            }

            if (this.level <= value.max && this.level > value.min) { // Level Range Match found!
                highest = key;
                break;
            } else if (this.level > value.max){ // Level exceeds range being checked, set key and check next range
                highest = key;
            } else if (this.level < value.min){ // Level is lower than min required for range, use last set diff, end loop
                break;
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

        await this.genTaskDetails(userRef);
    }

    async genTaskDetails(userRef){
        //console.log(`Details from genTaskDetails(): \n${this.taskType}\n${this.taskTags}`);
        console.log('NPC Task Object: ', this.taskList);

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
                await this.#genCraftTask(userRef);
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
                // Add other crafting based conditions
                fieldName = 'Crafting Conditions: ';
                fieldValue = `Item Caste Type: **${this.taskRequest.Name}**\nCrafted Rarity: **${this.taskRequest.Rarity}**\nAmount to Craft: **${this.taskRequest.Amount}**`;
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
        
        const minimumLevel = inclusiveRandNum(this.taskContents.LevelMax, this.taskContents.LevelMin);
        returnObj.MinLevel = minimumLevel;
        const amountWanted = inclusiveRandNum(this.taskContents.MaxNeed, this.taskContents.MinNeed);
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

        const amountWanted = inclusiveRandNum(this.taskContents.MaxNeed, this.taskContents.MinNeed);
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

    async #genCraftTask(userRef){
        console.log("Craft Task!");
        const theTask = {
            Name: "", // Crafted Slot Requested
            Rarity: "", // Crafted Item Rarity
            Rar_id: 0, // number for Rarity
            Amount: 0 // Amount to craft at specs
        };

        const rarityList = ["Common", "Uncommon", "Rare", "Very Rare", "Epic", "Mystic", "?", "??", "???", "????"];
        const rarOptions = rarityList.slice(this.taskContents.Rar_id_Min, this.taskContents.Rar_id_Max);
        const rarPicked = randArrPos(rarOptions);
        theTask.Rarity = rarPicked;
        theTask.Rar_id = rarityList.indexOf(rarPicked);

        const amountWanted = inclusiveRandNum(this.taskContents.MaxNeed, this.taskContents.MinNeed);
        theTask.Amount = amountWanted;

        async function loadCraftingController(userRef){
            let controller = await CraftControllers.findOrCreate({
                where: {
                    user_id: userRef.userid
                }
            });
    
            if (controller[1]){
                await controller[0].save().then(async c => {return await c.reload()});
            }
    
            controller = controller[0];
    
            await handleControllerUpdateCheck(controller, userRef);

            return controller;
        }

        const craftControl = await loadCraftingController(userRef);
        const craftOptionsObj = loadCasteTypeFilterObject(userRef, craftControl);

        console.log('CraftController Options Object: ', craftOptionsObj);
        
        const slotTypeOptions = ['Mainhand', 'Offhand', 'Headslot', 'Chestslot', 'Legslot'];
        if (!craftOptionsObj.Hands.includes(0)) slotTypeOptions.splice(2, 3);

        const slotPicked = randArrPos(slotTypeOptions);

        console.log('Available Slot Options: ', slotTypeOptions);
        console.log('Slot Picked: ', slotPicked);

        let casteOptionList;
        if (['Headslot', 'Chestslot', 'Legslot'].includes(slotPicked)){
            // Armor Caste
            casteOptionList = getFilteredCasteTypes([0], craftOptionsObj.Type.Armor);
        } else if (slotPicked === 'Mainhand'){
            // Weapon Caste
            if (craftOptionsObj.Hands[0] === 0) craftOptionsObj.Hands.splice(0, 1); // Remove Armor Checking hands 
            casteOptionList = getFilteredCasteTypes(craftOptionsObj.Hands, craftOptionsObj.Type.Weapon);
        } else if (slotPicked === 'Offhand'){
            // Offhand Caste 1 handed 
            // Special case since only 2 offhand types
            if (craftOptionsObj.Type.Weapon.includes('Magic')) casteOptionList.push("15");
            if (craftOptionsObj.Type.Weapon.includes('Melee')) casteOptionList.push("16");
            if (craftOptionsObj.Type.Weapon.includes('Special')) casteOptionList.push("24");
        }

        console.log('CASTE OPTION LIST: ', casteOptionList);

        const casteIDPicked = randArrPos(casteOptionList);
        const casteNamePicked = checkingCaste(casteIDPicked).Caste;
        theTask.Name = casteNamePicked;

        this.taskRequest = theTask;
    }

    genDialogOptions(){
        // Compile all dialog castes together for the current preset tasktype/difficulty/biome
        const dialogObj = npcDialogCaste;

        const locationFilter = dialogObj.Locations.find(caste => caste.Biome === this.curBiome).Castes;
        const taskTypeFilter = dialogObj.TaskTypes.find(caste => caste.Type === this.taskType).Castes;
        const difficultyFilter = dialogObj.Difficulties.find(caste => caste.Rated === this.taskTags[1]).Castes;
        const rewardFilter = dialogObj.Rewards.find(caste => caste.Rated === this.taskTags[1]).Castes;

        const pickedObj = {
            location: randArrPos(locationFilter),
            taskType: randArrPos(taskTypeFilter),
            diffType: randArrPos(difficultyFilter),
            reward: randArrPos(rewardFilter)
        };

        const embedContentList = [
            pickedObj.location.Dialog,
            pickedObj.taskType.Dialog,
            pickedObj.diffType.Dialog,
            pickedObj.reward.Dialog
        ];
        const replyOptionsList = [
            pickedObj.location.Options,
            pickedObj.taskType.Options,
            pickedObj.diffType.Options,
            pickedObj.reward.Options
        ];


        // let locFilter = npcDialogCaste.Locations.filter(caste => caste.Biome === this.curBiome);
        // locFilter = locFilter[0].Castes;
        // let taskFilter = npcDialogCaste.TaskTypes.filter(caste => caste.Type === this.taskType);
        // taskFilter = taskFilter[0].Castes;
        // let diffFilter = npcDialogCaste.Difficulties.filter(caste => caste.Rated === this.taskTags[1]);
        // diffFilter = diffFilter[0].Castes;
        // let reapFilter = npcDialogCaste.Rewards.filter(caste => caste.Rated === this.taskTags[1]);
        // reapFilter = reapFilter[0].Castes;

        // const locPicked = randArrPos(locFilter);
        // const taskPicked = randArrPos(taskFilter);
        // const diffPicked = randArrPos(diffFilter);
        // const reapPicked = randArrPos(reapFilter);

        // const embedContentList = [
        //     locPicked.Dialog,
        //     taskPicked.Dialog,
        //     diffPicked.Dialog,
        //     reapPicked.Dialog
        // ];
        // const replyOptionsList = [
        //     locPicked.Options,
        //     taskPicked.Options,
        //     diffPicked.Options,
        //     reapPicked.Options
        // ];

        // embedContentList.push(locPicked.Dialog, taskPicked.Dialog, )

        // embedContentList[0] = locPicked.Dialog;
        // embedContentList[1] = taskPicked.Dialog;
        // embedContentList[2] = diffPicked.Dialog;
        // embedContentList[3] = reapPicked.Dialog;

        // replyOptionsList[0] = locPicked.Options; //randArrPos(locPicked.Options);
        // replyOptionsList[1] = taskPicked.Options; //randArrPos(taskPicked.Options);
        // replyOptionsList[2] = diffPicked.Options; //randArrPos(diffPicked.Options);
        // replyOptionsList[3] = reapPicked.Options;

        this.dialogList = embedContentList;
        this.replyOptions = replyOptionsList;

        console.log(`Location Result: ${pickedObj.location.Name}\nTask Result: ${pickedObj.taskType.Name}\nDifficulty Result: ${pickedObj.diffType.Name}\nReward Result: ${pickedObj.reward.Name}`);
        console.log('Dialog Text Length: %d', embedContentList.length);
        console.log('Reply Options List Length: %d', replyOptionsList.length);
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