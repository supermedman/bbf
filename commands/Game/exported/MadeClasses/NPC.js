class NPC {
    constructor() {
        this.level;
        this.name;
        this.npcid;

        // From town plot, tavern, other town related encounters
        this.fromTown;
        // From random encounter, during regular actions and combat
        this.fromWilds;
        
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
}


module.exports = { NPC };