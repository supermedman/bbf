const { EmbedBuilder } = require('discord.js');

const {
    warnedForm,
    errorForm,
    successResult,
    failureResult,
    basicInfoForm,
    specialInfoForm
} = require('../../chalkPresets.js');

const { grabRar, grabColour } = require('./grabRar.js');
const { MaterialStore } = require('../../dbObjects.js');

const { checkHintMaterialView, checkHintMaterialUnique } = require('./handleHints.js');

const enemyList = require('../../events/Models/json_prefabs/enemyList.json');

/**
 * 
 * @param {any} enemy Reference to enemy object
 * @param {any} user Reference to user object
 * @param {any} interaction Reference to interaction object
 */
async function grabMat(enemy, user, interaction) {
    var hasUniqueType;
    let matTypes;
    for (var i = 0; i < enemyList.length; i++) {
        //if enemy with player level or lower can be found continue
        if (enemyList[i].ConstKey === enemy.constkey) {
            //Match found pull data
            matTypes = enemyList[i].DropTypes;
            if (enemyList[i].UniqueType) {
                console.log(specialInfoForm('Enemy found has unique mat type of: ', enemyList[i].UniqueType));
                hasUniqueType = enemyList[i].UniqueType;
            } else {/**DO NOTHING NO UNIQUE TYPE*/}
        } else {/**enemy not found keep looking*/ }
    }

    if (!matTypes || (matTypes.length <= 0)) {
        console.log(warnedForm('matTypes NOT FOUND!'));
        return 0;
    } 
    console.log(`matTypes found: ${matTypes}`);

    var passType;
    let listStr;
    if (matTypes.length > 1) {
        //Enemy has more than one drop type...
        const randDropType = Math.round(Math.random() * (matTypes.length));
        listStr = `${matTypes[randDropType]}List.json`;
        passType = `${matTypes[randDropType]}`;
    } else {
        //Enemy has one drop type...
        listStr = `${matTypes[0]}List.json`;
        passType = `${matTypes[0]}`;
    }

    //========================================
    //UNIQUE LIST CHECK AND HANDLE 
    if (hasUniqueType) {
        //Enemy has unique type, recall enemy prefab and locate which unique mat to drop
        console.log(specialInfoForm('Enemy has unique mat type!', hasUniqueType));

        const uniqueListStr = `uniqueList.json`;
        const foundUniqueList = require(`../../events/Models/json_prefabs/materialLists/${uniqueListStr}`);
        if (!foundUniqueList) {
            console.log(errorForm('UniqueList NOT FOUND!'));
            //return 0;
        }

        let uniqueMatDrop;
        for (var y = 0; y < foundUniqueList.length; y++) {
            if (foundUniqueList[y].UniqueMatch === hasUniqueType) {
                //Material found successfully, create and display drop embed separtely 
                uniqueMatDrop = foundUniqueList[y];
            } else {/**DO NOTHING KEEP LOOKING*/ }
        }

        if (!uniqueMatDrop) console.log(errorForm('UniqueMaterial NOT FOUND!'));
        console.log(successResult(`UniqueMaterial Dropped: ${uniqueMatDrop}`));

        var theUnique = await handleMaterialAdding(uniqueMatDrop, 1, user, hasUniqueType);

        await checkHintMaterialUnique(user, interaction);

        const updatedMat = await MaterialStore.findOne({ where: [{ name: theUnique.name }, { spec_id: interaction.user.id }] });

        if (updatedMat) theUnique = updatedMat;

        var uniqueMatListedDisplay = `Value: ${theUnique.value}\nRarity: ${theUnique.rarity}\nAmount: ${1}`;

        const uniqueMatColour = await grabColour(12);

        const theUniqueEmbed = new EmbedBuilder()
            .setTitle('~Unique Material~')
            .setColor(uniqueMatColour)
            .addFields({
                name: `${theUnique.name}\n`,
                value: uniqueMatListedDisplay
            });

        await interaction.channel.send({ embeds: [theUniqueEmbed] }).then(async theUniEmbed => setTimeout(() => {
            theUniEmbed.delete();
        }, 20000)).catch(console.error);
    } else if (!hasUniqueType) console.log(basicInfoForm('No unique materials found!'));
    //========================================

    const foundMaterialList = require(`../../events/Models/json_prefabs/materialLists/${listStr}`);
    if (!foundMaterialList) {
        console.log(errorForm('MaterialList NOT FOUND!'));
        return 0;
    } 

    var foundRar = await grabRar(enemy.level);
    //Use foundRar to drop an item from the list found!
    let matDropPool = [];
    for (var x = 0; x < foundMaterialList.length; x++) {
        if (foundMaterialList[x].Rar_id === foundRar) {
            //Rarity match add to list
            matDropPool.push(foundMaterialList[x]);
        } else {/**KEEP LOOKING*/}
    }

    if (matDropPool.length === 0) {
        matDropPool.push(foundMaterialList[foundMaterialList.length - 1]);
    }

    if (matDropPool.length > 0) {
        console.log(successResult(`matDropPool Contents: ${matDropPool}`));

        const randMatPos = Math.floor(Math.random() * (matDropPool.length));

        const finalMaterial = matDropPool[randMatPos];
        console.log(successResult(`Material Dropped: ${finalMaterial.Name}`));

        let droppedNum = 1;
        droppedNum += Math.floor(100 * ((enemy.level * 0.01) - ((foundRar * 0.02) + 0.02)));

        if (droppedNum <= 0) {
            droppedNum = 1;
        } else {
            Math.floor(droppedNum);
        }

        console.log(basicInfoForm('MaterialAmountDropped: ', droppedNum));

        const result = await handleMaterialAdding(finalMaterial, droppedNum, user, passType);

        await checkHintMaterialView(user, interaction);

        var matListedDisplay = `Value: ${finalMaterial.Value}\nMaterial Type: **${passType}**\nRarity: ${finalMaterial.Rarity}\nAmount: ${droppedNum}`;

        const matColour = await grabColour(foundRar);

        const theMaterialEmbed = new EmbedBuilder()
            .setTitle('~Material Dropped~')
            .setColor(matColour)
            .addFields({
                name: `${finalMaterial.Name}\n`,
                value: matListedDisplay
            });

        await interaction.channel.send({ embeds: [theMaterialEmbed] }).then(async theMatEmbed => setTimeout(() => {
            theMatEmbed.delete();
        }, 20000)).catch(console.error);

        //await interaction.channel.send(`${droppedNum} ${finalMaterial.Name} have dropped!`);

        return result;
    } else {
        console.log(failureResult(`matDropPool Empty!!`));
        return 0;
    } 
}

//This method creates a new material entry || increments an existing one
async function handleMaterialAdding(material, droppedAmount, user, matType) {
    const matStore = await MaterialStore.findOne({
        where: [{ spec_id: user.userid }, { mat_id: material.Mat_id }, { mattype: matType }]
    });

    console.log(basicInfoForm('UserMaterial: ', matStore));

    if (matStore) {
        droppedAmount += matStore.amount;
        const inc = await MaterialStore.update({ amount: droppedAmount },
            { where: [{ spec_id: user.userid }, { mat_id: material.Mat_id }, { mattype: matType }] });

        if (inc) console.log(successResult('AMOUNT WAS UPDATED!', droppedAmount));

        return matStore;
    }

    const newMat = await MaterialStore.create({
        name: material.Name,
        value: material.Value,
        mattype: matType,
        mat_id: material.Mat_id,
        rarity: material.Rarity,
        rar_id: material.Rar_id,
        amount: droppedAmount,
        spec_id: user.userid
    });

    if (newMat) {
        const materialEntry = await MaterialStore.findOne({
            where: [{ spec_id: user.userid }, { mat_id: material.Mat_id }, { mattype: matType }]
        });

        console.log(successResult(`Material Entry: ${materialEntry}`));

        return materialEntry;
    }
}

module.exports = { grabMat };
