const { grabRar } = require('../grabRar.js');

class Enemy {
    constructor(enemy) {
        this.level = enemy.level;
        this.health = enemy.health;
        this.defence = enemy.defence;
        this.weakTo = enemy.weakto;
        this.minDmg = enemy.mindmg;
        this.maxDmg = enemy.maxdmg;
        this.constkey = enemy.constkey;
        this.hasItem = enemy.hasitem ?? false;
        this.hasUnique = enemy.hasunique ?? false;
        this.dead = false;
    }

    curHealth(dmg) {
        dmg -= this.defence;
        if (dmg < 0) dmg = 0;
        this.health -= dmg;
        if (this.health <= 0) this.dead = true;
        this.health = Number.parseFloat(this.health).toFixed(1);
        if (this.stagehealth && this.stagehealth > this.health) this.dead = true;
    }

    randDamage() {
        const dmgDealt = Math.floor(Math.random() * (this.maxDmg - this.minDmg + 1) + this.minDmg);
        return dmgDealt;
    }

    stageHealth(bossRef) {
        this.stagehealth = bossRef.StageHealth;
    }

    async stealing(player) {
        if (this.hasUnique) {
            this.hasUnique = false;
            return 'UNIQUE';
        }
        if (!this.hasItem) return 'NO ITEM';
        let totalChance;
        const baseChance = (((player.spd * 0.02) + player.spdUP) + ((player.dex * 0.02) + player.dexUP));
        const itemRar = await grabRar(this.level);
        if (itemRar !== 0) {
            const difficultyChange = itemRar * 0.02;
            if ((baseChance - difficultyChange) <= 0) return 'FAILURE';
            totalChance = baseChance - difficultyChange;
        } else totalChance = baseChance;

        const rolledChance = Math.random();
        if (rolledChance < totalChance) {
            this.hasItem = false;
            return itemRar;
        }
        return 'FAILURE';
    }
}

module.exports = { Enemy };