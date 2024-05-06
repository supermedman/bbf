// This will handle combat instances, temp cache? store for upto 15 mins, attach create timestamp, sweep for stamp every 15 mins 

// Will need to create my own EE for combat?
// Need to check if end codes can be sent via collecter.stop();

// Need to handle all basic combat types, Dungeon, startcombat, combatDisplay.

// combCollecter.on('end-{userid}', async () => { /**This combat instance is expired, recycle however possible, flag for uncaching*/});
// <https://discord.js.org/docs/packages/discord.js/14.15.1/Collector:Class#stop>

class Combat {
    constructor(user, weapon/*, buttonComponentObject, actionRow, interactionCollector*/) {
        this.staticID = user.id;
        this.mainHand = weapon;

        this.staticDamage = [];

        this.startTime = new Date().getTime();
        this.deleteAfter = 900000;
        
        this.active = true;
        this.removePending = false;


        // this.attackButton = buttonComponentObject.attackButton;
        // this.actionRow = actionRow;
        // this.collector = interactionCollector;
    }

    sweepCheck(now){
        if (this.startTime - now >= this.deleteAfter && !this.active) this.removePending = true;
        return 'Finished';
    }

    setActive(){
        this.active = true;
    }

    setInactive(){
        this.active = false;
    }
}

module.exports = {Combat};