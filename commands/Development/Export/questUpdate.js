const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { ItemLootPool, Milestones, ActiveDungeon, Questing, LocationData, ActiveStatus } = require('../../../dbObjects');
const { randArrPos, inclusiveRandNum, rollChance, sendTimedChannelMessage, checkLootUP, grabUser, grabActivePigmy, dropChance, createInteractiveChannelMessage, handleCatchDelete } = require('../../../uniHelperFunctions');
const { grabRar } = require('../../Game/exported/grabRar');
const {xpPayoutScale} = require('./Classes/EnemyFab');
const { checkInboundItem } = require('./itemMoveContainer');

const newEList = require('./Json/newEnemyList.json');
const questList = require('../../../events/Models/json_prefabs/questList.json');
const loreList = require('../../../events/Models/json_prefabs/loreList.json');
const { uni_displayItem } = require('./itemStringCore');
const { checkHintStoryQuest, checkHintDungeon, checkHintLore } = require('../../Game/exported/handleHints');
const { handleUserPayout, updateUserQTS } = require('./uni_userPayouts');
const { spawnNpc } = require('../../Game/exported/npcSpawner');

/**
 * This function returns a Map() to simulate a discord.js Collection. It contains
 * all of the enemies listed from the updated enemy list for combat V3.
 * @returns {Map}
 */
function loadEnemyList(){
    const enemies = new Map();

    for (const enemy of newEList){
        enemies.set(enemy.ConstKey, enemy.Level);
    }

    return enemies;
}

/**
 * This function handles all Enemy/Item related payout calculations and handles for
 * a quest upon completion, it returns the user display for all given payouts handled.
 * @param {object} activeQuest Questing DB Instance, used for most static number calcs
 * @param {Map} gearDrops Discord.js Collection Object
 * @param {string} userid Users ID
 * @returns {promise <EmbedBuilder[]>} Payout embeds for displaying to user
 */
async function handleEnemyKills(activeQuest, gearDrops, userid, interaction){
    const hrs = Math.floor(activeQuest.qlength / (1000 * 60 * 60));

    let maxE = (8 * hrs) + (inclusiveRandNum(4, 1) * activeQuest.qlevel);
    if (activeQuest.qlevel > 5 && hrs > 8) maxE -= 15;
    
    const maxLvl = 5 * activeQuest.qlevel;
    const minLvl = maxLvl - 5;
    
    const enemies = loadEnemyList();

    const choices = [];
    for (const [value] of enemies){
        if (value <= maxLvl && value >= minLvl) choices.push(value);
    }

    const lootChance = 0.850 - (0.050 * activeQuest.qlevel);
    const totQT = (1 * hrs) + (1 * Math.floor(hrs / 4));

    let totalXP = 0, totalCoins = 0, itemCount = 0;
    for (let i = 0; i < maxE; i++){
        const eLvl = randArrPos(choices);
        if (dropChance(lootChance)) itemCount++;
        const payoutRange = xpPayoutScale(eLvl);
        totalXP += inclusiveRandNum(payoutRange.max, payoutRange.min);
    }

    // EXP Potion check!
    const extraEXP = await ActiveStatus.findAll({where: {spec_id: userid, activec: 'EXP'}});
    if (extraEXP.length > 0){
        let totBoost = 1;
        for (const eBoost of extraEXP){
            totBoost += eBoost.curreffect;
        }
        totalXP *= totBoost;
    }
    totalXP = Math.round(totalXP);
    totalCoins = totalXP * 2;

    let itemEmbeds = [];
    if (itemCount > 0){
        const midLevel = Math.round((maxLvl + minLvl) / 5);
        itemEmbeds = await handleLootDrops(midLevel, itemCount, gearDrops, userid);
    }

    // =====================
    //  Handle User Payouts
    // =====================

    await handleUserPayout(totalXP, totalCoins, interaction, await grabUser(userid));
    await updateUserQTS(totQT, await grabUser(userid));

    const rewardEmbed = new EmbedBuilder()
    .setTitle("~QUEST COMPLETE~")
    .setDescription(`Page 1/${itemEmbeds.length + 1}`)
    .setColor(0o0)
    .addFields({
        name: "<< Quest Rewards >>",
        value: `Coins: **${totalCoins}**c\nXP: **${totalXP}**\nQuest Tokens (QTS): **${totQT}**\nItems Gained: **${itemCount}**\nEnemies Killed: **${maxE}**`
    });

    itemEmbeds.unshift(rewardEmbed);

    const finalEmbeds = itemEmbeds;

    return finalEmbeds;
}

/**
 * This function handles all item drop related code, creating, storing, and display.
 * Returns an array of embeds to be displayed to the user.
 * @param {number} midLevel The median level range of the quest 
 * @param {number} itemCount Amount of items to be generated
 * @param {Map} gearDrops Discord.js Collection Object
 * @param {string} userid Users ID
 * @param {boolean} [dungDrop=false] Set to true if calling function from dungeon
 * @returns {promise <EmbedBuilder[]>}
 */
async function handleLootDrops(midLevel, itemCount, gearDrops, userid, dungDrop=false){
    const user = await grabUser(userid);
    const pigmy = await grabActivePigmy(userid);
    const upgradeChance = checkLootUP(pigmy, user);

    let dupeCheck = [], tmpArr = [];
    for (let i = 0; i < itemCount; i++){
        let rar = await grabRar(midLevel);
        if (rar < 10 && dropChance(upgradeChance)) rar++;
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
            addedValues.push({rarity: rarType[0], amount: totNum});
        }
    } 

    if (addedValues.length > 0){
        let otherRars = tmpArr.filter(rar => !dupeCheck.includes(rar));
        addedValues = addedValues.concat(otherRars.map(rar => ({rarity: rar, amount: 1})));
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

    let pageTracker = 2;

    const itemList = [];
    for (const itemPicked of itemKeyList){
        const theItem = await checkInboundItem(userid, itemPicked.key, itemPicked.amount);
        if (!dungDrop){
            const itemEmbed = new EmbedBuilder()
            .setTitle('~LOOT GAINED~')
            .setDescription(`Page ${pageTracker}/${itemKeyList.length + 1}`);

            const grabbedValues = uni_displayItem(theItem, "Single-Quest", itemPicked.amount);
            itemEmbed
            .setColor(grabbedValues.color)
            .addFields(grabbedValues.fields);

            pageTracker++;
            itemList.push(itemEmbed);
        }
    }

    const respondWith = (dungDrop) ? "Finished" : itemList;

    return respondWith;
}

/**
 * This function handles milestone data for both quest start and quest claim.
 * It with either return ```{embeds: EmbedBuilder[], quests: object[]}``` or undefined
 * @param {object} user UserData DB Instance
 * @param {object} interaction Discord Interaction Object
 * @param {string} type "Claim" | "Start"
 * @returns {promise <object>}
 */
async function handleMilestones(user, interaction, type){
    let userMilestone = await Milestones.findOrCreate({
        where: { 
            userid: user.userid 
        },
        defaults: {
            currentquestline: 'Souls',
            nextstoryquest: 5,
            questlinedungeon: 1
        } 
    });

    if (userMilestone[1]){
        await userMilestone[0].save().then(async u => {return await u.reload()});
    }

    userMilestone = userMilestone[0];

    let returnVal;
    switch(type){
        case "Claim":
            returnVal = await handleClaimMilestone(user, interaction, userMilestone);
        break;
        case "Start":
            returnVal = await handleStartMilestone(user, userMilestone);
        break;
    }

    return returnVal;
}

/**
 * This function handles quest claim checks for both Milestone data and hunting
 * ground completions.
 * @param {object} user UserData DB instance
 * @param {object} interaction Discord Interaction Object
 * @param {Milestones} userMilestone Milestones DB Instance
 * @returns {promise <void>}
 */
async function handleClaimMilestone(user, interaction, userMilestone){
    const activeQuest = await Questing.findOne({where: {user_id: user.userid}});

    // Story quest completed
    const storyCheck = questList.filter(quest => quest.Story && quest.ID === activeQuest.qid);
    if (storyCheck.length > 0){
        
        await checkHintStoryQuest(user, interaction);
        const storyLine = userMilestone.currentquestline;
        const lineList = ["None", "Souls", "Dark", "Torture", "Chaos", "Law", "Hate", "Myst", "Secret", "Dream"];
        let chosenStory = lineList.indexOf(storyLine);

        const questLine = loreList.filter(lore => lore.StoryLine === chosenStory);
        const thisQuest = questLine.filter(lore => lore.QuestID === activeQuest.qid);
        const nextQuest = questLine.filter(lore => lore.StoryPart === thisQuest[0].StoryPart + 1);
        
        let embedDesc = 'NEW Quest Unlocked!', updateVals;
        if (nextQuest.length === 0){
            embedDesc = 'NEW Dungeon Unlocked!';
            updateVals = {laststoryquest: activeQuest.qid};
            await checkHintDungeon(user, interaction);
        } else {
            updateVals = {laststoryquest: activeQuest.qid, nextstoryquest: nextQuest[0].QuestID};
            await checkHintLore(user, interaction);
        }

        await userMilestone.update(updateVals)
        .then(async u => await u.save())
        .then(async u => {return await u.reload()});

        const theAdventure = thisQuest[0].Lore;

        if (theAdventure.length < 1050){
            const storyEmbed = new EmbedBuilder()
            .setTitle('Quest Progress')
            .setDescription(embedDesc)
            .setColor('DarkAqua')
            .addFields({
                name: 'Adventure', value: theAdventure
            });

            await sendTimedChannelMessage(interaction, 300000, {embeds: [storyEmbed]}, "FollowUp");
        } else {
            // PUT CHECK IN PLACE FOR WHEN LORE LENGTH EXCEEDS 1050 CHARACTERS

            // SET LIMIT TO 1000 PER PAGE
            // COUNT LENGTH WITH WHOLE WORDS
            // == EXTRA HANDLE FOR ``.md`` STYLED SECTIONS == LATER THO LOL
            const loreDisplayObj = handleLoreOverflow(theAdventure, embedDesc);
            const loreButtRow = new ActionRowBuilder().addComponents(loreDisplayObj.butts);

            const loreMenu = {
                shownPage: 0,
                pageList: loreDisplayObj.pageList,
                buttList: loreDisplayObj.butts,
                buttRow: loreButtRow
            };

            const disTracker = ((butts) => {
                // const pageNumStrSwitch = new Map([
                //     [1, "one"],
                //     [2, "two"],
                //     [3, "three"],
                //     [4, "four"],
                //     [5, "five"]
                // ]);
                // const idExtract = (strMatch) => {
                //     for (const [key, value] of pageNumStrSwitch){
                //         if (strMatch === value) break;
                //     }
                // }
                console.log(butts.map(butt => ({[`${butt.data.custom_id}`]: ~~butt.custom_id.split("-")[1]})));
                
                // [`${butts[0].data.custom_id}`]: {
                //     shown: true
                // },
                const finalObj = {};
                let buttCount = 1;
                for (const button of butts){
                    finalObj[`${button.data.custom_id}`] = {};
                    finalObj[`${button.data.custom_id}`].shown = (buttCount === 1) ? true : false;
                    buttCount++;
                }
                return finalObj;
            })(loreMenu.buttList);

            console.log(disTracker);

            const replyObj = {embeds: [loreMenu.pageList[0]], components: [loreMenu.buttRow]};

            const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 300000, replyObj, "FollowUp");

            const pageStrNumSwitch = new Map([
                ["one", 1],
                ["two", 2],
                ["three", 3],
                ["four", 4],
                ["five", 5],
            ]);

            const grabPageButtIDNum = (id) => pageStrNumSwitch.get(id.split('-')[1]);

            // =====================
            // BUTTON COLLECTOR
            collector.on('collect', async c => {
                await c.deferUpdate().then(async () => {
                    loreMenu.shownPage = grabPageButtIDNum(c.customId) - 1;

                    for (const butt of loreMenu.buttList){
                        butt.setDisabled(butt.data.custom_id === c.customId);
                    }

                    await anchorMsg.edit({embeds: [loreMenu.pageList[loreMenu.shownPage]], components: [loreButtRow]});
                }).catch(e => console.error(e));
            });
            // =====================

            // =====================
            // BUTTON COLLECTOR
            collector.on('end', async (c, r) => {
                if (!r || r === 'time') await handleCatchDelete(anchorMsg);
            });
            // =====================
        }
    }

    // Checking hunting quest completion
    const huntingCheck = questList.filter(quest => quest.Hunting && quest.ID === activeQuest.qid);
    if (huntingCheck.length > 0){
        let userLocation = await LocationData.findOrCreate({
            where: {
                userid: user.userid
            }
        });

        if (userLocation[1]){
            await userLocation[0].save(async u => {return await u.reload()});
        }

        userLocation = userLocation[0];

        const theQuest = huntingCheck[0];
        let locationIDs = userLocation.unlocked_locations.split(',');

        let exists = false;
        for (const id of locationIDs){
            if (theQuest.ZoneID === id) exists = true;
            if (exists) break;
        }

        if (!exists){
            locationIDs.push(theQuest.ZoneID);
            locationIDs.sort((a,b) => a - b);

            await userLocation.update({unlocked_locations: locationIDs.toString()})
            .then(async u => await u.save()).then(async u => {return await u.reload()});
        }
    }   

    // ==== SPAWNING NPC SETUP ====
    if (dropChance(0.33)) await spawnNpc(user, interaction);
    // ====					   ====

    return;
}

/**
 * This function handles lore pages when the story text exceeds ``1050 CHAR`` in length,
 * returns both the page list, and ``ButtonBuilder[]`` to be used for display.
 * @param {string} loreText Full Lore Story Text
 * @param {string} embedDesc Embed Description to use
 * @returns {{pageList: EmbedBuilder[], butts: ButtonBuilder[]}}
 */
function handleLoreOverflow(loreText, embedDesc){
    /**
     * This function separates lore text into groups with a length of ``1000 CHAR`` or less
     * 
     * **Notice**: This function is not complete, and will cause issue with standard Markdown
     * text groups. It needs the ability to detect/correct disjointed ``MD`` markers.
     * @param {string} text Full Lore Text to be shown
     * @returns {string[]}
     */
    const getPages = (text) => {
        const words = text.split(" ");
        const pages = [];
        let currentPage = words[0];

        for (let i = 1; i < words.length; i++){
            let word = words[i];
            let pageCharLength = (currentPage + " " + word).length;
            if (pageCharLength < 1000) {
                currentPage += " " + word;
            } else {
                pages.push(currentPage);
                currentPage = word;
            }
        }
        pages.push(currentPage);
        return pages;
    }
    const lorePageList = getPages(loreText);

    const loreEmbeds = [];
    let pageCount = 1, totPage = lorePageList.length;
    for (const lText of lorePageList){
        const embed = new EmbedBuilder()
        .setTitle(`Quest Progress == Page ${pageCount}/${totPage}`)
        .setDescription(embedDesc)
        .setColor('DarkAqua')
        .addFields({ name: 'Adventure', value: lText });

        loreEmbeds.push(embed);
        pageCount++;
    }

    const lorePageButts = [], 
    pageNumStrSwitch = new Map([
        [1, "one"],
        [2, "two"],
        [3, "three"],
        [4, "four"],
        [5, "five"]
    ]);
    for (let i = 1; i < loreEmbeds.length; i++){
        const disFirstButt = (i === 1) ? true : false;
        const butt = new ButtonBuilder()
        .setCustomId(`page-${pageNumStrSwitch.get(i)}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disFirstButt)
        .setLabel(`Page ${i}`);

        lorePageButts.push(butt);
    }

    //const loreButtRow = new ActionRowBuilder().addComponents(lorePageButts);

    return {pageList: loreEmbeds, butts: lorePageButts};
}

/**
 * This function handles milestones when a user goes to start a quest, it then returns
 * all available quests for the given user as embed objects
 * @param {string} user User DB Instance Object
 * @param {Milestones} userMilestone Milestone DB instance object
 * @returns {promise <object>} ```{embeds: EmbedBuilder[], quests: object[]}```
 */
async function handleStartMilestone(user, userMilestone){
    const maxQLvl = Math.floor(user.level / 5);

    const userDungeon = await ActiveDungeon.findOne({
        where: {
            dungeonspecid: user.userid, 
            dungeonid: userMilestone.questlinedungeon
        }
    });

    if (userDungeon && userDungeon.completed){
        const storyLine = userMilestone.currentquestline;

        const lineList = ["None", "Souls", "Dark", "Torture", "Chaos", "Law", "Hate", "Myst", "Secret", "Dream"];
        let chosenStory, nxtLine;

        chosenStory = lineList.indexOf(storyLine);
        nxtLine = lineList[chosenStory + 1];

        const nxtDung = chosenStory + 1;
        const nxtStory = loreList.filter(lore => lore.StoryLine === nxtDung && lore.StoryPart === 1);

        await userMilestone.update({
            currentquestline: nxtLine,
            nextstoryquest: nxtStory[0].QuestID,
            questlinedungeon: nxtDung
        }).then(async u => await u.save()).then(async u => {return await u.reload()});
    }

    const normalQuests = questList.filter(quest => !quest.Story && quest.Level <= maxQLvl);
    const storyQuests = questList.filter(quest => quest.Story && quest.Level <= maxQLvl);

    const lastQuest = userMilestone.laststoryquest;
    const nextQuest = storyQuests.filter(quest => quest.ID === userMilestone.nextstoryquest);

    let allQuests;
    if (lastQuest === userMilestone.nextstoryquest){
        allQuests = normalQuests;
    } else allQuests = nextQuest.concat(normalQuests);

    const questEmbeds = [];
    let questCount = 1;
    for (const quest of allQuests){
        const questEmbed = new EmbedBuilder()
        .setColor((questCount === 1) ? 'DarkGold': 0o0)
        .setTitle(`Quest: ${questCount}`)
        .addFields(
            {name: `Name: ${quest.Name}`, value: `Quest Level: ${quest.Level}\nLength: ${quest.Time}\nEnemy Level: ${quest.ELevel}`}
        );
        questEmbeds.push(questEmbed);
        questCount++;
    }

    return {embeds: questEmbeds, quests: allQuests};
}

module.exports = {
    handleEnemyKills,
    handleLootDrops,
    handleMilestones
}