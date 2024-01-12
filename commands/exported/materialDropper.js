const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

const {
    warnedForm,
    errorForm,
    successResult,
    failureResult,
    basicInfoForm,
    specialInfoForm
} = require('../../chalkPresets.js');

const { grabRar, grabColour } = require('./grabRar.js');
const { MaterialStore, CoreBuilding, TownMaterial, Town } = require('../../dbObjects.js');

const { checkHintMaterialView, checkHintMaterialUnique } = require('./handleHints.js');

const enemyList = require('../../events/Models/json_prefabs/enemyList.json');

/**
 * 
 * @param {any} enemy Reference to enemy object
 * @param {any} user Reference to user object
 * @param {any} interaction Reference to interaction object
 */
async function grabMat(enemy, user, interaction) {
    let hasUniqueType;
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

    let passType;
    let listStr;
    if (matTypes.length > 1) {
        //Enemy has more than one drop type...
        const randDropType = Math.round(Math.random() * (matTypes.length - 1));
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

    let foundRar = await grabRar(enemy.level);
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

        const localTowns = await Town.findAll({ where: [{ guildid: interaction.guild.id }] });
        let theTown = 'None';
        if (localTowns.length > 0) theTown = localTowns[Math.floor(Math.random() * localTowns.length)];

        if (theTown !== 'None') {
            const matBonus = checkMatBonus(theTown, passType);
            droppedNum += matBonus;
        }
        // TOWN AUTO DEPOSTE SETUP AND HANDLE HERE =======
        const type = await checkTarget(user, foundRar);

        let target;
        if (type === 'town') target = await Town.findOne({ where: { townid: user.townid } });
        if (type === 'user') target = user;

        const result = await addMaterial(target, finalMaterial, droppedNum, type, passType);
        // ===============================================

        //const result = await handleMaterialAdding(finalMaterial, droppedNum, user, passType);

        await checkHintMaterialView(user, interaction);

        let embedTitle = '~Material Dropped~';
        if (type === 'town') embedTitle = '~Material Deposited To Town~';

        let matListedDisplay = `Value: ${finalMaterial.Value}\nMaterial Type: **${passType}**\nRarity: ${finalMaterial.Rarity}\nAmount: ${droppedNum}`;


        const matColour = await grabColour(foundRar);

        const matTypeFile = new AttachmentBuilder(`./events/Models/json_prefabs/materialLists/mat-png/${passType}.png`);
        const matTypePng = `attachment://${passType}.png`;

        const theMaterialEmbed = new EmbedBuilder()
            .setTitle(embedTitle)
            .setThumbnail(matTypePng)
            .setColor(matColour)
            .addFields({
                name: `${finalMaterial.Name}\n`,
                value: matListedDisplay
            });

        await interaction.channel.send({ embeds: [theMaterialEmbed], files: [matTypeFile] }).then(async theMatEmbed => setTimeout(() => {
            theMatEmbed.delete();
        }, 20000)).catch(error => {
            console.error(error);
        });

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

/**
 * 
 * @param {any} user
 * @param {any} rarity
 */
async function checkTarget(user, rarity) {
    const theTown = await Town.findOne({ where: { townid: user.townid } });
    if (!theTown) return 'user';

    const currentEditList = theTown.can_edit.split(',');
    let exists = false;
    for (const id of currentEditList) {
        if (user.userid === id) {
            exists = true;
            break;
        }
    }
    if (!exists) return 'user';

    const theCore = await CoreBuilding.findOne({ where: [{ townid: user.townid }, { build_type: 'bank' }] });
    if (!theCore) return 'user';

    const currentSettings = theCore.settings.toString().split(',');
    if (currentSettings.length <= 0) return 'user';
    if (currentSettings[0] !== 'true') return 'user';
    if (~~currentSettings[1] < rarity) return 'user';

    return 'town';
}

function checkMatBonus(theTown, matType) {
    const matTypes = theTown.mat_bonus.split(',');

    const allignmentSlices = theTown.local_biome.split('-');
    const allignment = allignmentSlices[1];

    const allignBonus = {
        Normal: [10, 5, 3],
        Evil: [5, 3, 1],
        Phase: [10, 8, 5],
    };

    const matchBonus = allignBonus[`${allignment}`];

    let found = false;
    let count = 0;
    for (const type of matTypes) {
        if (type === matType) {
            found = true;
            break;
        }
        count++;
    }

    if (count === 3) count = 0;
    if (!found) return 0;
    return matchBonus[count];
}

/**
         * 
         * @param {object} target DB instance object
         * @param {object} item DB instance object
         * @param {number} amount int
         * @param {string} type town || user
         */
async function addMaterial(target, item, amount, type, matType) {
    let matStore;
    if (type === 'town') {
        matStore = await TownMaterial.findOne({
            where: [{ townid: target.townid }, { mat_id: item.Mat_id }, { mattype: matType }]
        });
    }
    if (type === 'user') {
        matStore = await MaterialStore.findOne({
            where: [{ spec_id: target.userid }, { mat_id: item.Mat_id }, { mattype: matType }]
        });
    }

    if (matStore) {
        const inc = await matStore.increment('amount', { by: amount });
        if (inc) await matStore.save();
        return 'Added';
    }

    let newMat;
    try {
        if (type === 'town') newMat = await TownMaterial.create({ townid: target.townid, amount: amount });
        if (type === 'user') newMat = await MaterialStore.create({ spec_id: target.userid, amount: amount });

        if (newMat) {
            await newMat.update({
                name: item.Name,
                value: item.Value,
                mattype: matType,
                mat_id: item.Mat_id,
                rarity: item.Rarity,
                rar_id: item.Rar_id,
            });

            await newMat.save();
            return newMat;
        }
    } catch (error) {
        console.error(error);
    }
}

module.exports = { grabMat, handleMaterialAdding };
