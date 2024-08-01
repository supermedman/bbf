const { EmbedBuilder } = require('discord.js');
const { ItemLootPool } = require('../../../dbObjects');
const { randArrPos, inclusiveRandNum, rollChance } = require('../../../uniHelperFunctions');
const { grabRar } = require('../../Game/exported/grabRar');
const {xpPayoutScale} = require('./Classes/EnemyFab');
const { checkInboundItem } = require('./itemMoveContainer');

const newEList = require('./Json/newEnemyList.json');
const { uni_displayItem } = require('./itemStringCore');

function loadEnemyList(){
    const enemies = new Map();

    for (const enemy of newEList){
        enemies.set(enemy.ConstKey, enemy.Level);
    }

    return enemies;
}

async function handleEnemyKills(minLvl, maxLvl, totE, lootChance, gearDrops, userid, totQT){
    const enemies = loadEnemyList();

    const choices = [];
    for (const [value] of enemies){
        if (value <= maxLvl && value >= minLvl) choices.push(value);
    }

    let totalXP = 0, totalCoins = 0, itemCount = 0;
    for (let i = 0; i < totE; i++){
        const eLvl = randArrPos(choices);
        if (rollChance(lootChance)) itemCount++;
        const payoutRange = xpPayoutScale(eLvl);
        totalXP += inclusiveRandNum(payoutRange.max, payoutRange.min);
    }

    totalCoins = totalXP * 2;

    let itemEmbeds = [];
    if (itemCount > 0){
        const midLevel = Math.round((maxLvl + minLvl) / 5);
        itemEmbeds = await handleLootDrops(midLevel, itemCount, gearDrops, userid);
    }

    const rewardEmbed = new EmbedBuilder()
    .setTitle("~QUEST COMPLETE~")
    .setDescription(`Page 1/${itemEmbeds.length + 1}`)
    .setColor(0o0)
    .addFields({
        name: "<< Quest Rewards >>",
        value: `Coins: **${totalCoins}**c\nXP: **${totalXP}**\nQuest Tokens (QTS): **${totQT}**\nItems Gained: **${itemCount}**\nEnemies Killed: **${totE}**`
    });

    itemEmbeds.unshift(rewardEmbed);

    const finalEmbeds = itemEmbeds;

    return finalEmbeds;
}


async function handleLootDrops(midLevel, itemCount, gearDrops, userid){
    let dupeCheck = [], tmpArr = [];
    for (let i = 0; i < itemCount; i++){
        const rar = await grabRar(midLevel);
        if (tmpArr.indexOf(rar) !== -1 && dupeCheck.indexOf(rar) === -1){
            dupeCheck.push(rar);
            continue;
        }
        tmpArr.push(rar);
    }

    let addedValues = [];
    if (dupeCheck.length > 0){
        for (const rarMatch of dupeCheck){
            const rarType = tmpArr.filter(rar => rar === rarMatch);
            const totNum = rarType.length;
            addedValues.push({rarity: rarType, amount: totNum});
        }
    } else {
        addedValues = addedValues.concat(tmpArr.map(rar => ({rarity: rar, amount: 1})));
    }

    addedValues.sort((a,b) => b.rarity - a.rarity);

    let itemKeyList = [];
    for (const rarObj of addedValues){
        let choices = [];
        for (const [key, value] of gearDrops){
            if (value === rarObj.rarity) choices.push(key);
        }

        for (let i = 0; i < rarObj.amount; i++){
            const pickedKey = randArrPos(choices);
            const itemFilter = ele => ele.key === pickedKey;

            if (itemKeyList.length < 1 || itemKeyList.findIndex(itemFilter) === -1){
                // New Item
                itemKeyList.push({key: pickedKey, amount: 1});
            } else itemKeyList[itemKeyList.findIndex(itemFilter)].amount++;
        }
    }

    let pageTracker = 1;

    const itemList = [];
    for (const itemPicked of itemKeyList){
        const theItem = await checkInboundItem(userid, itemPicked.key, itemPicked.amount);
        const itemEmbed = new EmbedBuilder()
        .setTitle('~LOOT GAINED~')
        .setDescription(`Page ${pageTracker}/${itemKeyList.length + 1}`);

        const grabbedValues = uni_displayItem(theItem, "Single");
        itemEmbed
        .setColor(grabbedValues.color)
        .addFields(grabbedValues.fields);

        pageTracker++;
        itemList.push(itemEmbed);
    }

    return itemList;
}


module.exports = {
    handleEnemyKills
}