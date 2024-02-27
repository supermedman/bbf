const npcNameCaste = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcNameCaste.json');
const npcStatCaste = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcStatCaste.json');
const npcNames = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcNames.json');
const npcTaskList = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcTaskList.json');
const npcDialogCaste = require('../../../../events/Models/json_prefabs/NPC_Prefabs/npcDialogCaste.json');



const randArrPos = (arr) => {
    let returnIndex = 0;
    if (arr.length > 1) returnIndex = Math.floor(Math.random() * arr.length);
    return arr[returnIndex];
};

class NPC {
    constructor(npcRef) {
        let refCheck = false;
        if (npcRef) refCheck = true;

        this.level;
        this.name;
        this.npcid;

        // From town plot, tavern, other town related encounters
        this.fromTown = false;
        if (refCheck) this.fromTown = true;

        // From random encounter, during regular actions and combat
        this.fromWilds = true;
        if (refCheck) this.fromWilds = false;

        // All task related data and choices.
        this.taskType;
        this.taskList;

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

        let statCaste = npcStatCaste.filter(caste => caste.Biome === genFromBiome);
        statCaste = statCaste[0];

        this.level = Math.floor(Math.random() * (statCaste.LevelMax - statCaste.LevelMin + 1) + statCaste.LevelMin);
        console.log('Spawned @ Level %d', this.level);

        this.genName(genFromBiome);


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

    genName(localBiome){
        // Generate NPC name off of level and location
        let nameCaste = npcNameCaste.filter(caste => caste.Biome === localBiome);
        nameCaste = nameCaste[0];
        const finalCaste = this.#extraNameGens(nameCaste);
        
        let nameTypeList;
        if (this.fromTown) nameTypeList = finalCaste.Tame;
        if (this.fromWilds) nameTypeList = finalCaste.Wild;

        console.log(`Current Name List: ${nameTypeList}`);
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

        console.log(`Current Available Castes: ${finalCasteChoices.length}`);

        let finalCaste;
        // Picking from one of available castes
        if (finalCasteChoices.length > 1){
            let commonWeight = (100 - finalCasteChoices.length * 25) + 10;
            console.log(`Current Common Weight: ${commonWeight}/100`);

            const rngRolled = Math.floor((Math.random()) * 100);
            console.log(`Rolled Num: ${rngRolled}`);
            if (rngRolled <= commonWeight) return finalCaste = finalCasteChoices[0];
            
            let tmpBypassCommon = randArrPos(finalCasteChoices);
            while (tmpBypassCommon === finalCasteChoices[0]){
                tmpBypassCommon = randArrPos(finalCasteChoices);
            }
            return finalCaste = tmpBypassCommon;
        }
    }

    genNewTask(){
        // Generate NPC's current task/new task off of level and location and prereq.
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