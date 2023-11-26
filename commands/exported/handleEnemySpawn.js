const {
    warnedForm,
    errorForm,
    successResult,
    failureResult,
    basicInfoForm,
    specialInfoForm
} = require('../../chalkPresets.js');

const { ActiveEnemy, Pigmy } = require('../../dbObjects.js');

async function handleNewSpawn(cEnemy, user) {
    const specCode = user.userid + cEnemy.ConstKey;
    try {
        var copyCheck = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: cEnemy.ConstKey }] });
        if (copyCheck) return copyCheck; // Enemy exists, return for combat

        let hasUI = false;
        if (cEnemy.HasUnique) hasUI = true;

        let lootChance = Math.random();
        let chanceToBeat = 0.850;
        let HI = false;

        if (user.pclass === 'Thief') chanceToBeat -= 0.10;

        if (user.level >= 31) {
            //User above level 31 increase drop chance
            if ((Math.floor(user.level / 4) * 0.01) > 0.25) {
                chanceToBeat -= 0.25;
            } else chanceToBeat -= (Math.floor(user.level / 4) * 0.01);
        }

        const pigmy = await Pigmy.findOne({ where: { spec_id: user.userid } });
        if (pigmy) {
            if ((Math.floor(pigmy.level / 3) * 0.02) > 0.25) {
                chanceToBeat -= 0.25;
            } else chanceToBeat -= (Math.floor(pigmy.level / 3) * 0.02); //Pigmy level increases drop rate by 2% per level
        }

        console.log(specialInfoForm('Rolled Loot Chance: \n' + lootChance + '\nChance to beat: \n', chanceToBeat));

        if (lootChance >= chanceToBeat) HI = true;

        const lvl = user.level;
        let nxtLvl;
        if (lvl < 20) {
            nxtLvl = 50 * (Math.pow(lvl, 2) - 1);
        } else if (lvl === 20) {
            nxtLvl = 75 * (Math.pow(lvl, 2) - 1);
        } else if (lvl > 20) {
            const lvlScale = 1.5 * (Math.floor(lvl / 5));
            nxtLvl = (75 + lvlScale) * (Math.pow(lvl, 2) - 1);
        }

        let XpMax = Math.floor((nxtLvl / 15) + (0.2 * (100 - lvl)));
        let XpMin = XpMax - Math.floor(XpMax / 5.2);

        const avgDmgRef = cEnemy.AvgDmg;
        let DmgMax = Math.floor(avgDmgRef * 3.5);
        let DmgMin = DmgMax - Math.floor(DmgMax / 4.8);

        const calcValueObj = {
            maxDmg: DmgMax,
            minDmg: DmgMin,
            maxXp: XpMax,
            minXp: XpMin,
        };

        const createEEntry = async (eFab, calcObj, HI, hasUI, isDead, specCode) => {
            let newE;
            await ActiveEnemy.create({
                name: eFab.Name,
                description: eFab.Description,
                level: eFab.Level,
                health: eFab.Health,
                defence: eFab.Defence,
                weakto: eFab.WeakTo,

                constkey: eFab.ConstKey,
                specid: specCode,

                mindmg: calcObj.minDmg,
                maxdmg: calcObj.maxDmg,

                xpmin: calcObj.minXp,
                xpmax: calcObj.maxXp,

                hasitem: HI,
                hasunique: hasUI,

                dead: isDead,
            }).then(async () => {
                newE = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: eFab.ConstKey }] });
                if (newE) return newE;
            });
        }

        let isDead = false;

        const enemy = await createEEntry(cEnemy, calcValueObj, HI, hasUI, isDead, specCode);

        return enemy;
    } catch (error) {
        console.error('Error in handleNewSpawn:', error);
    }
}

module.exports = { handleNewSpawn };