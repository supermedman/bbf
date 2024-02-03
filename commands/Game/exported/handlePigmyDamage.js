function pigmyTypeStats(pigmy) {
    const objReturn = {
        pigmyDmg: 0,
        int: 0,
        dex: 0,
        str: 0,
        spd: 0
    };

    //pigmy found check for happiness and type
    let totDamageBuff = pigmy.level * 0.02;
    let happyCheck = false;
    if (pigmy.happiness >= 50) happyCheck = true;

    if (pigmy.type === 'NONE') {
        if (happyCheck === true) totDamageBuff += (pigmy.level * 1);
    }
    if (pigmy.type === 'Fire') {
        objReturn.str = 5;
        if (happyCheck === true) totDamageBuff += (pigmy.level * 1.5);
    }
    if (pigmy.type === 'Frost') {
        objReturn.int = 5;
        if (happyCheck === true) totDamageBuff += (pigmy.level * 2);
    }
    if (pigmy.type === 'Light') {
        objReturn.spd = 10;
        objReturn.dex = 10;
        if (happyCheck === true) totDamageBuff += (pigmy.level * 3);
    }
    if (pigmy.type === 'Dark') {
        objReturn.int = 10;
        objReturn.str = 10;
        if (happyCheck === true) totDamageBuff += (pigmy.level * 3);
    }
    if (pigmy.type === 'Magic') {
        objReturn.int = 20;
        if (happyCheck === true) totDamageBuff += (pigmy.level * 5);
    }
    if (pigmy.type === 'Elder') {
        objReturn.spd = 10;
        objReturn.dex = 10;
        objReturn.int = 10;
        objReturn.str = 10;
        if (happyCheck === true) totDamageBuff += (pigmy.level * 10);
    }
    if (pigmy.type === 'NULL') {
        objReturn.spd = 20;
        objReturn.dex = 20;
        objReturn.int = 20;
        objReturn.str = 20;
        if (happyCheck === true) totDamageBuff += (pigmy.level * 20);
    }

    objReturn.pigmyDmg = totDamageBuff;

    return objReturn;
}

module.exports = { pigmyTypeStats };