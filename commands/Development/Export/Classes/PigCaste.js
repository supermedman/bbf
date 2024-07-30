class PigmyInstance {
    constructor(pigmy){
        this.level = pigmy.level;
        this.refID = pigmy.refid;

        this.dmg = pigmy.level * 0.02;
        this.typeObj = {Type: "True", DMG: this.dmg};

        this.int = 0;
        this.dex = 0;
        this.str = 0;
        this.spd = 0;

        this.type = pigmy.type;
        this.isMoody = (pigmy.happiness >= 50) ? false : true;
    }

    loadInternals(){
        let hapDmgBuff = 0;
        switch(this.type){
            case "NONE":
                hapDmgBuff = this.level * 1;
            break;
            case "Fire":
                this.str = 5;
                this.typeObj.Type = "Fire";
                hapDmgBuff = this.level * 1.5;
            break;
            case "Frost":
                this.int = 5;
                this.typeObj.Type = "Frost";
                hapDmgBuff = this.level * 2;
            break;
            case "Light":
                this.spd = 10;
                this.dex = 10;
                this.typeObj.Type = "Light";
                hapDmgBuff = this.level * 3;
            break;
            case "Dark":
                this.int = 10;
                this.str = 10;
                this.typeObj.Type = "Dark";
                hapDmgBuff = this.level * 3;
            break;
            case "Magic":
                this.int = 20;
                this.typeObj.Type = "Magic";
                hapDmgBuff = this.level * 5;
            break;
            case "Elder":
                this.int = 10;
                this.str = 10;
                this.spd = 10;
                this.dex = 10;
                this.typeObj.Type = "Rad";
                hapDmgBuff = this.level * 10;
            break;
            case "NULL":
                this.int = 20;
                this.str = 20;
                this.spd = 20;
                this.dex = 20;
                this.typeObj.Type = "Null";
                hapDmgBuff = this.level * 20;
            break;
        }
        this.dmg += (this.isMoody) ? 0 : hapDmgBuff;
        this.typeObj.DMG = this.dmg;
        return;
    }
}


module.exports = { PigmyInstance };