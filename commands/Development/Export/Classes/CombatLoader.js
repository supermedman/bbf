const { Loadout, ItemStrings, UserData } = require('../../../../dbObjects');

const userTestObj = {
    level: 25,
    pclass: "Thief",
    health: 97,
    speed: 4,
    dexterity: 3,
    intelligence: 2,
    strength: 1
};

const userLoadoutTestObj = {
    mainhand: "24",
    offhand: "112",
    headslot: "137",
    chestslot: "144",
    legslot: "125"
};

const userOwnedItemsObjList = [
    {
        user_id: "501177494137995264",
        item_code: "TYP_SLph:28_typ-r03-DIS_ME-SK_dis-MAslo",
        item_id: "24"
    },
    {
        user_id: "501177494137995264",
        item_code: "TYP_BLph:6_typ-TYPD_BLph:6_typd-r01-DIS_ME-SK_dis-OFslo",
        item_id: "112"
    },
    {
        user_id: "501177494137995264",
        item_code: "TYPD_BLph:18_typd-r03-DIS_ME-SK_dis-HEslo",
        item_id: "137"
    },
    {
        user_id: "501177494137995264",
        item_code: "TYPD_SLph:8_typd-r00-DIS_SK_dis-CHslo",
        item_id: "144"
    },
    {
        user_id: "501177494137995264",
        item_code: "TYPD_DAma:15_typd-r03-DIS_GE-FL-MA_dis-LEslo",
        item_id: "125"
    }
];

class CombatInstance {
    constructor(user){
        this.userId = user;
        this.level = 1;
        this.health = 100;
        this.staticStats;
        this.staticCondition;
        this.staticDamageBoost;
        this.loadout = {
            ids: [],
            mainhand: "",
            offhand: "",
            headslot: "",
            chestslot: "",
            legslot: ""
        };
        
        this.staticDamage = [];
        this.staticDefence = [];

        this.startTime = new Date().getTime();
        this.deleteAfter = 900000;
        
        this.active = true;
        this.removePending = false;
    }

    async retrieveBasicStats(){
        // const uData = await UserData.findOne({where: {userid: this.userId}});
        const uData = userTestObj; // TEMPORARY
        let thiefBuff = (uData.pclass === 'Thief') ? 0.1: 0;
        this.level = uData.level;
        this.staticStats = {
            pClass: uData.pclass,
            int: uData.intelligence,
            dex: uData.dexterity,
            spd: uData.speed,
            str: uData.strength
        };
        this.staticCondition = {
            DH: (this.staticStats.spd * 0.02) + thiefBuff,
            Crit: (this.staticStats.dex * 0.02) + thiefBuff
        };
        this.staticDamageBoost = (this.staticStats.str * 3) + (this.staticStats.int * 10);
        this.health = this.#setFullHealth();
        if (this.health > uData.health) this.health = uData.health;
        return;
    }

    #setFullHealth(){
        const healthModC = ["Mage", "Thief", "Warrior", "Paladin"];
        const healthModM = [1.1, 1.2, 1.5, 2];
        const healthBase = 100;

        let finalHealth = healthBase + (this.level * 2) + (this.staticStats.str * 5);
        finalHealth *= healthModM[healthModC.indexOf(this.staticStats.pClass)];
        return finalHealth;
    }

    async retrieveLoadout(){
        //const loadoutMatch = await Loadout.findOne({where: {spec_id: this.userId}});
        const loadoutMatch = userLoadoutTestObj; // TEMPORARY
        if (this.loadout.ids.length === 0 && !loadoutMatch) {
            this.loadout.ids = [0, 0, 0, 0, 0];
        } else if (this.loadout.ids.length === 0 && loadoutMatch){
            this.loadout.ids.push(loadoutMatch.mainhand, loadoutMatch.offhand, loadoutMatch.headslot, loadoutMatch.chestslot, loadoutMatch.legslot);
        }
        await this.#loadItemStrings();
        return;
    }

    async #loadItemStrings(){
        const slotMatch = ["mainhand", "offhand", "headslot", "chestslot", "legslot"];
        let curSlotIdx = 0;
        for (const id of this.loadout.ids){
            // let itemMatch = await ItemStrings.findOne({where: {user_id: this.userId, item_id: id}});
            let itemMatch = userOwnedItemsObjList.filter(item => item.user_id === this.userId && item.item_id === id)[0]; // TEMPORARY
            if (id === '0' && !itemMatch) {
                console.log(`No ${slotMatch[curSlotIdx]} Equipped!!`); 
                itemMatch = {item_code: "NONE"};
            }
            if (!itemMatch) {
                console.log(`${slotMatch[curSlotIdx]} Not Found!!`);
                itemMatch = {item_code: "NONE"};
            }
            this.loadout[`${slotMatch[curSlotIdx]}`] = itemMatch.item_code;
            curSlotIdx++;
        }
        return;
    }

    sweepCheck(now = new Date().getTime()){
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

module.exports = { CombatInstance };