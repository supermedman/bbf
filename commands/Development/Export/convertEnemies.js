const fs = require('fs');

const fullEnemyList = require('../../../events/Models/json_prefabs/enemyList.json');

const bodyCompChecks = (dropComp, armorType) => {
    const specFleshArmor = ['Bark', 'Fossil'];
    const regFleshArmor = ['Armor'];
    const magFleshQual = ['gemy', 'herby'];
    const fCombFN = (ele) => magFleshQual.some(type => type === ele);
    const idxFlesh = () => {
        let rtIdx = -1;
        rtIdx = (dropComp.indexOf('fleshy') !== -1) ? dropComp.indexOf('fleshy') : dropComp.indexOf('skinny');
        return rtIdx;
    };
    const idxMagic = () => dropComp.indexOf('magical');

    if (idxFlesh() === -1 && idxMagic() === -1){
        if (specFleshArmor.indexOf(armorType) !== -1){
            return "Magical Flesh";
        } else if (regFleshArmor.indexOf(armorType) !== -1){
            return "Flesh";
        }
        if (dropComp.findIndex(fCombFN) !== -1){
            return "Magical Flesh";
        }
        return "Specter";
    }

    if (idxFlesh() !== -1 && idxMagic() !== -1){
        if (idxFlesh() >= idxMagic() - 1) return "Magical Flesh";
        else return "Flesh";
    }

    if (idxFlesh() === -1) return "Magical Flesh";
    return "Flesh";
};



const armorCompChecks = (dropComp, weak, uDrop) => {
    const demonWeakTypes = ["Light", "Frost", "Magic", "Rad", "NULL"];
    const demonUDropTypes = ["Dark"];
    const idxMetal = () => dropComp.indexOf('metalic');
    const idxWood = () => dropComp.indexOf('woody');
    const idxRock = () => dropComp.indexOf('rocky');

    if (idxMetal() === -1 && idxWood() === -1 && idxRock() === -1){
        if (demonWeakTypes.indexOf(weak) !== -1 || demonUDropTypes.indexOf(uDrop) !== -1){
            return "Demon";
        } else return "None";
    }

    const firstPlace = [idxMetal(), idxRock(), idxWood()].sort((a, b) => b - a);
    switch(dropComp[firstPlace[0]]){
        case "metalic":
        return "Armor";
        case "woody":
        return "Bark";
        case "rocky":
        return "Fossil";
    }

    return "None";
}


function formatEnemyList(){
    const shallowEList = fullEnemyList.slice(0,);

    const moddedEList = [];
    for (const enemy of shallowEList){
        const dropComp = enemy.DropTypes;
        let weak = enemy.WeakTo ?? "None", uDrop = enemy.UniqueType ?? "None";
        const tmpEnemy = {
            Name: enemy.Name,
            Description: enemy.Description,
            Level: enemy.Level,
            Body: "None",
            Armor: "None",
            Shield: "None",
            DropTypes: enemy.DropTypes,
            ConstKey: enemy.ConstKey
        };

        if (enemy.Level > 25){
            // Shield
            if (uDrop === "Null" || dropComp.indexOf('tooly') !== -1){
                tmpEnemy.Shield = "Phase Aura";
            }   
            if (weak === "Rad") tmpEnemy.Shield = "Phase Demon";
        }
        if (enemy.Level > 10 && enemy.Defence > 5){
            // Armor
            tmpEnemy.Armor = armorCompChecks(dropComp, weak, uDrop);
        }
        // Body
        tmpEnemy.Body = bodyCompChecks(dropComp, armorCompChecks(dropComp, weak, uDrop));

        moddedEList.push(tmpEnemy);
    }

    return moddedEList;
}



fs.writeFile("./Json/newEnemyList.json", JSON.stringify(formatEnemyList(), null, 4), (e) => {
    if (e) return console.error(e);
    console.log('File write success!');
});