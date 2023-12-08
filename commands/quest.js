const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
//const wait = require('node:timers/promises').setTimeout;
const { Questing, LootStore, UserData, Milestones, ActiveStatus, ActiveDungeon } = require('../dbObjects.js');
const { isLvlUp } = require('./exported/levelup.js');
const { grabRar, grabColour } = require('./exported/grabRar.js');

const enemyList = require('../events/Models/json_prefabs/enemyList.json');
const lootList = require('../events/Models/json_prefabs/lootList.json');
const questList = require('../events/Models/json_prefabs/questList.json');
const activeCategoryEffects = require('../events/Models/json_prefabs/activeCategoryEffects.json');
const loreList = require('../events/Models/json_prefabs/loreList.json');

const { checkHintQuest, checkHintStoryQuest, checkHintLore, checkHintDungeon, checkHintPigmy } = require('./exported/handleHints.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('quest')
		.setDescription('Gain loot and xp while youre away!')
		.addSubcommand(subcommand =>
			subcommand
				.setName('start')
				.setDescription('Start a quest'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('claim')
				.setDescription('Claim quest rewards')),
    async execute(interaction) {
        await interaction.deferReply();
		if (interaction.options.getSubcommand() === 'start') {
            const qFound = await Questing.findOne({ where: [{ user_id: interaction.user.id }] });

            if (!qFound) {
                const user = await grabU();
                if (!uData) return interaction.followUp(`No User Data.. Please use the \`/start\` command to select a class and begin your adventure!!`);
                //quest not found prompt new quest option

                //CREATE THREE BUTTONS FOR PAGE OPTIONS

                const backButton = new ButtonBuilder()
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('◀️')
                    .setCustomId('back-page');

                const selectButton = new ButtonBuilder()
                    .setLabel("Select")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('*️⃣')
                    .setCustomId('select-quest');

                const forwardButton = new ButtonBuilder()
                    .setLabel("Forward")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('▶️')
                    .setCustomId('next-page');

                const interactiveButtons = new ActionRowBuilder().addComponents(backButton, selectButton, forwardButton);
                

                if (user.level < 5) {
                    return interaction.followUp('Sorry! You need to be at least level 5 to start quests.. ``/startcombat`` use this to gain some levels!')
                }
                const maxQLvl = Math.round(user.level / 5);

                /**
                 *          Implementing Storyline Quests & Milstones.js logging
                 *              
                 *          How will it work?
                 *              - Check for db entry
                 *              - If none exists create one (currentquestline = 'Souls')
                 *              - If exists check questing progress
                 *              
                 *          First Storyline Quest Order 
                 *              - ID-5 Krelya's Cultist Hideaway
                 *              - ID-8 Locate Alleged Dungeon Site
                 *              - ID-10 Clear Soul Dungeon Site of Enemies
                 * 
                 * 
                 * */

                var userMilestone = await Milestones.findOne({where: {userid: interaction.user.id}});

                if (!userMilestone) {
                    //Generating new Milestones profile
                    const newMilestone = await Milestones.create({
                        userid: interaction.user.id,
                        currentquestline: 'Souls',
                        nextstoryquest: 5,
                        questlinedungeon: 1,
                    });

                    userMilestone = await Milestones.findOne({ where: { userid: newMilestone.userid } });
                } 
                //Milestones data exists handle accordingly
                //Check laststoryquest value
                var qPool = [];
                var embedPages = [];

                for (var i = 0; i < questList.length; i++) {
                    //Filter out locked quests
                    if (questList[i].IsLockedBy === 0) {
                        //Filter out by max level
                        if (questList[i].Level <= maxQLvl) {
                            qPool.push(questList[i]);
                            const questEmbed = new EmbedBuilder()
                                .setColor(0000)
                                .setTitle(`Quest: ${i}`)
                                .addFields(
                                    {
                                        name: `Name: ${questList[i].Name}`,
                                        value: `Quest Level: ${questList[i].Level}\n Length: ${questList[i].Time}\n Enemy Level: ${questList[i].ELevel}\n`,
                                    }
                                );

                            embedPages.push(questEmbed);
                        }
                    }
                }

                if (userMilestone.currentquestline === 'Souls') {
                    //User has completed at least one story quest
                    //Retrieve which one
                    const lastSQuest = userMilestone.laststoryquest;
                    if (lastSQuest === 5) {
                        //First story quest completed
                        for (var i = 0; i < questList.length; i++) {
                            //Filter out locked quests
                            if (questList[i].IsLockedBy === 5) {
                                //Filter out by max level
                                if (questList[i].Level <= maxQLvl) {
                                    qPool.push(questList[i]);
                                    const questEmbed = new EmbedBuilder()
                                        .setColor(0000)
                                        .setTitle(`Quest: ${i}`)
                                        .addFields(
                                            {
                                                name: `Name: ${questList[i].Name}`,
                                                value: `Quest Level: ${questList[i].Level}\n Length: ${questList[i].Time}\n Enemy Level: ${questList[i].ELevel}\n`,
                                            }
                                        );

                                    embedPages.push(questEmbed);
                                }
                            }
                        }
                    }
                    if (lastSQuest === 8) {
                        //Second story quest completed
                        for (var i = 0; i < questList.length; i++) {
                            //Filter out locked quests
                            if (questList[i].IsLockedBy === 8) {
                                //Filter out by max level
                                if (questList[i].Level <= maxQLvl) {
                                    qPool.push(questList[i]);
                                    const questEmbed = new EmbedBuilder()
                                        .setColor(0000)
                                        .setTitle(`Quest: ${i}`)
                                        .addFields(
                                            {
                                                name: `Name: ${questList[i].Name}`,
                                                value: `Quest Level: ${questList[i].Level}\n Length: ${questList[i].Time}\n Enemy Level: ${questList[i].ELevel}\n`,
                                            }
                                        );

                                    embedPages.push(questEmbed);
                                }
                            }
                        }
                    }                                 
                }

                if (userMilestone.currentquestline === 'Dark') {
                    const nextSQuest = userMilestone.nextstoryquest;
                    const lastSQuest = userMilestone.laststoryquest;
                    let lockedVal;
                    if (nextSQuest === 12) {
                        lockedVal = 100;
                    }
                    if (lastSQuest === 12) {
                        lockedVal = 12;
                    }
                    if (lastSQuest === 13) {
                        lockedVal = 13;
                    }
                    if (lastSQuest === 14) {
                        lockedVal = 14;
                    }
                    let i = 0;
                    for (const quest of questList) {
                        if (quest.IsLockedBy === lockedVal) {
                            if (quest.Level <= maxQLvl) {
                                qPool.push(quest);
                                const questEmbed = new EmbedBuilder()
                                    .setColor(0000)
                                    .setTitle(`Quest: ${i}`)
                                    .addFields(
                                        {
                                            name: `Name: ${quest.Name}`,
                                            value: `Quest Level: ${quest.Level}\n Length: ${quest.Time}\n Enemy Level: ${quest.ELevel}\n`,
                                        }
                                    );

                                embedPages.push(questEmbed);
                            }
                        }
                        i++;
                    }
                }

                if (userMilestone.currentquestline === 'Torture') {
                    const nextSQuest = userMilestone.nextstoryquest;
                    const lastSQuest = userMilestone.laststoryquest;
                    let lockedVal;
                    if (nextSQuest === 16) {
                        lockedVal = 101;
                    }
                    if (lastSQuest === 16) {
                        lockedVal = 16;
                    }
                    if (lastSQuest === 17) {
                        lockedVal = 17;
                    }
                    if (lastSQuest === 18) {
                        lockedVal = 18;
                    }
                    if (lastSQuest === 19) {
                        lockedVal = 19;
                    }
                    if (lastSQuest === 20) {
                        lockedVal = 20;
                    }
                    if (lastSQuest === 21) {
                        lockedVal = 21;
                    }
                    if (lastSQuest === 22) {
                        lockedVal = 22;
                    }

                    let i = 0;
                    for (const quest of questList) {
                        if (quest.IsLockedBy === lockedVal) {
                            if (quest.Level <= maxQLvl) {
                                qPool.push(quest);
                                const questEmbed = new EmbedBuilder()
                                    .setColor(0000)
                                    .setTitle(`Quest: ${i}`)
                                    .addFields(
                                        {
                                            name: `Name: ${quest.Name}`,
                                            value: `Quest Level: ${quest.Level}\n Length: ${quest.Time}\n Enemy Level: ${quest.ELevel}\n`,
                                        }
                                    );

                                embedPages.push(questEmbed);
                            }
                        }
                        i++;
                    }
                }

                if (userMilestone.currentquestline === 'Chaos') {
                    const nextSQuest = userMilestone.nextstoryquest;
                    const lastSQuest = userMilestone.laststoryquest;
                    let lockedVal;
                    if (nextSQuest === 23) {
                        lockedVal = 102;
                    }
                    if (lastSQuest === 23) {
                        lockedVal = 23;
                    }
                    if (lastSQuest === 24) {
                        lockedVal = 24;
                    }                   

                    let i = 0;
                    for (const quest of questList) {
                        if (quest.IsLockedBy === lockedVal) {
                            if (quest.Level <= maxQLvl) {
                                qPool.push(quest);
                                const questEmbed = new EmbedBuilder()
                                    .setColor(0000)
                                    .setTitle(`Quest: ${i}`)
                                    .addFields(
                                        {
                                            name: `Name: ${quest.Name}`,
                                            value: `Quest Level: ${quest.Level}\n Length: ${quest.Time}\n Enemy Level: ${quest.ELevel}\n`,
                                        }
                                    );

                                embedPages.push(questEmbed);
                            }
                        }
                        i++;
                    }
                }

                if (userMilestone.currentquestline === 'Law') {
                    const nextSQuest = userMilestone.nextstoryquest;
                    const lastSQuest = userMilestone.laststoryquest;
                    let lockedVal;
                    if (nextSQuest === 27) {
                        lockedVal = 103;
                    }
                    if (lastSQuest === 27) {
                        lockedVal = 27;
                    }
                    if (lastSQuest === 28) {
                        lockedVal = 28;
                    }
                    if (lastSQuest === 29) {
                        lockedVal = 29;
                    }
                    if (lastSQuest === 30) {
                        lockedVal = 30;
                    }
                    if (lastSQuest === 31) {
                        lockedVal = 31;
                    }

                    let i = 0;
                    for (const quest of questList) {
                        if (quest.IsLockedBy === lockedVal) {
                            if (quest.Level <= maxQLvl) {
                                qPool.push(quest);
                                const questEmbed = new EmbedBuilder()
                                    .setColor(0000)
                                    .setTitle(`Quest: ${i}`)
                                    .addFields(
                                        {
                                            name: `Name: ${quest.Name}`,
                                            value: `Quest Level: ${quest.Level}\n Length: ${quest.Time}\n Enemy Level: ${quest.ELevel}\n`,
                                        }
                                    );

                                embedPages.push(questEmbed);
                            }
                        }
                        i++;
                    }
                }

                //33 || 34 || 35 || 36 || 37 || 38 || 39
                if (userMilestone.currentquestline === 'Hate') {
                    const nextSQuest = userMilestone.nextstoryquest;
                    const lastSQuest = userMilestone.laststoryquest;
                    let lockedVal;
                    if (nextSQuest === 33) {
                        lockedVal = 104;
                    }
                    if (lastSQuest === 33) {
                        lockedVal = 33;
                    }
                    if (lastSQuest === 34) {
                        lockedVal = 34;
                    }
                    if (lastSQuest === 35) {
                        lockedVal = 35;
                    }
                    if (lastSQuest === 36) {
                        lockedVal = 36;
                    }
                    if (lastSQuest === 37) {
                        lockedVal = 37;
                    }
                    if (lastSQuest === 38) {
                        lockedVal = 38;
                    }

                    let i = 0;
                    for (const quest of questList) {
                        if (quest.IsLockedBy === lockedVal) {
                            if (quest.Level <= maxQLvl) {
                                qPool.push(quest);
                                const questEmbed = new EmbedBuilder()
                                    .setColor(0000)
                                    .setTitle(`Quest: ${i}`)
                                    .addFields(
                                        {
                                            name: `Name: ${quest.Name}`,
                                            value: `Quest Level: ${quest.Level}\n Length: ${quest.Time}\n Enemy Level: ${quest.ELevel}\n`,
                                        }
                                    );

                                embedPages.push(questEmbed);
                            }
                        }
                        i++;
                    }
                }

                if (userMilestone.currentquestline === 'Myst') {
                    const nextSQuest = userMilestone.nextstoryquest;
                    const lastSQuest = userMilestone.laststoryquest;
                    let lockedVal;
                    if (nextSQuest === 23) {
                        lockedVal = 102;
                    }
                    if (lastSQuest === 23) {
                        lockedVal = 23;
                    }
                    if (lastSQuest === 24) {
                        lockedVal = 24;
                    }

                    let i = 0;
                    for (const quest of questList) {
                        if (quest.IsLockedBy === lockedVal) {
                            if (quest.Level <= maxQLvl) {
                                qPool.push(quest);
                                const questEmbed = new EmbedBuilder()
                                    .setColor(0000)
                                    .setTitle(`Quest: ${i}`)
                                    .addFields(
                                        {
                                            name: `Name: ${quest.Name}`,
                                            value: `Quest Level: ${quest.Level}\n Length: ${quest.Time}\n Enemy Level: ${quest.ELevel}\n`,
                                        }
                                    );

                                embedPages.push(questEmbed);
                            }
                        }
                        i++;
                    }
                }

                if (userMilestone.currentquestline === 'Secret') {
                    const nextSQuest = userMilestone.nextstoryquest;
                    const lastSQuest = userMilestone.laststoryquest;
                    let lockedVal;
                    if (nextSQuest === 23) {
                        lockedVal = 102;
                    }
                    if (lastSQuest === 23) {
                        lockedVal = 23;
                    }
                    if (lastSQuest === 24) {
                        lockedVal = 24;
                    }

                    let i = 0;
                    for (const quest of questList) {
                        if (quest.IsLockedBy === lockedVal) {
                            if (quest.Level <= maxQLvl) {
                                qPool.push(quest);
                                const questEmbed = new EmbedBuilder()
                                    .setColor(0000)
                                    .setTitle(`Quest: ${i}`)
                                    .addFields(
                                        {
                                            name: `Name: ${quest.Name}`,
                                            value: `Quest Level: ${quest.Level}\n Length: ${quest.Time}\n Enemy Level: ${quest.ELevel}\n`,
                                        }
                                    );

                                embedPages.push(questEmbed);
                            }
                        }
                        i++;
                    }
                }

                if (userMilestone.currentquestline === 'Dream') {
                    const nextSQuest = userMilestone.nextstoryquest;
                    const lastSQuest = userMilestone.laststoryquest;
                    let lockedVal;
                    if (nextSQuest === 23) {
                        lockedVal = 102;
                    }
                    if (lastSQuest === 23) {
                        lockedVal = 23;
                    }
                    if (lastSQuest === 24) {
                        lockedVal = 24;
                    }

                    let i = 0;
                    for (const quest of questList) {
                        if (quest.IsLockedBy === lockedVal) {
                            if (quest.Level <= maxQLvl) {
                                qPool.push(quest);
                                const questEmbed = new EmbedBuilder()
                                    .setColor(0000)
                                    .setTitle(`Quest: ${i}`)
                                    .addFields(
                                        {
                                            name: `Name: ${quest.Name}`,
                                            value: `Quest Level: ${quest.Level}\n Length: ${quest.Time}\n Enemy Level: ${quest.ELevel}\n`,
                                        }
                                    );

                                embedPages.push(questEmbed);
                            }
                        }
                        i++;
                    }
                }
                //for (var i = 0; i < questList.length; i++) {
                //    if (questList[i].Level <= maxQLvl) {
                //        qPool.push(questList[i]);
                //        const questEmbed = new EmbedBuilder()
                //            .setColor(0000)
                //            .setTitle(`Quest: ${i}`)
                //            .addFields(
                //                {
                //                    name: `Name: ${questList[i].Name}`,
                //                    value: `Quest Level: ${questList[i].Level}\n Length: ${questList[i].Time}\n Enemy Level: ${questList[i].ELevel}\n`,
                //                }
                //            );

                //        embedPages.push(questEmbed);
                //    }
                //}

                const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

                const filter = (i) => i.user.id === interaction.user.id;

                const collector = embedMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    filter,
                    time: 120000,
                });

                var currentPage = 0;

                collector.on('collect', async (collInteract) => {
                    if (collInteract.customId === 'next-page') {
                        //console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);
                        await collInteract.deferUpdate().then(async () => {
                            //if statment to check if currently on the last page
                            if (currentPage === embedPages.length - 1) {
                                currentPage = 0;
                            } else currentPage += 1;
                            await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                        }).catch(error => {
                            console.error(error);
                        });
                    }
                    if (collInteract.customId === 'back-page') {
                        //console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);
                        await collInteract.deferUpdate().then(async () => {
                            if (currentPage === 0) {
                                currentPage = embedPages.length - 1;
                            } else currentPage -= 1;
                            await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                        }).catch(error => {
                            console.error(error);
                        });
                    }
                    if (collInteract.customId === 'select-quest') {
                        //console.log('Quest Selected!');
                       // await collInteract.deferUpdate();
                        const quest = qPool[currentPage];

                        await Questing.create(
                            {
                                user_id: interaction.user.id,
                                qlength: quest.Length,
                                qlevel: quest.Level,
                                qname: quest.Name,
                                qid: quest.ID,
                            }
                        );
                        await interaction.followUp(`You have started a quest in ${quest.Name}!`);
                        await collector.stop();
                        console.log(`Quest ${quest.ID} started`);
                    }
                });

                collector.on('end', () => {
                    if (embedMsg) {
                        embedMsg.delete().catch(error => {
                            if (error.code !== 10008) {
                                console.error('Failed to delete the message:', error);
                            }
                        });
                    }
                });
            } else {
                //user found quest already active/not claimed
                //prompt user to deal with ongoing quest
                //console.log('Quest found in progress or complete!');
                const user = await grabU();
                await checkHintQuest(user, interaction);
                return interaction.followUp('You already have a quest in progress.. Use ``/quest claim`` for more info!');
            }
		} else if (interaction.options.getSubcommand() === 'claim') {
            const qFound = await Questing.findOne({ where: [{ user_id: interaction.user.id }] });

            if (qFound) {
                //quest found for user
                //check if quest is complete or still in progress
                const then = new Date(qFound.createdAt).getTime();
                const now = new Date().getTime();

                //this is equal to the amount of time between the quest being created 
                //and the time at the moment of this command being called
                //returned in milliseconds 
                const diffTime = Math.abs(now - then);
                const timeLeft = Math.round(qFound.qlength - diffTime);

                console.log('Time left on quest: ', timeLeft);

                if (timeLeft <= 0) {
                    //quest is complete give rewards!!
                    //**ADD IN ALL LOOT, COINS, XP, AND TOKENS HERE**
                    console.log('QUEST COMPLETED LOGGING REWARDS!');
                    const hrs = await Math.floor(qFound.qlength / (1000 * 60 * 60));
                    //10 * hrs 
                    // +
                    //1-5 * quest level
                    let maxE = ((8 * hrs) + (Math.round(Math.random() * (4)) * qFound.qlevel));

                    if (qFound.qlevel > 5) {
                        if (hrs > 8) {
                            maxE -= 15;
                        }
                    }

                    var ePool = [];             
                    var totXP = 0;
                    var totCoin = 0;
                    const totQT = (1 * hrs) + (1 * Math.floor(hrs/4));
                    

                    const lvlMax = 5 * qFound.qlevel;
                    const lvlMin = lvlMax - 5;

                    for (var i = 0; i < enemyList.length; i++) {
                        if (enemyList[i].Level > lvlMax) {
                            //dont want! keep looking 
                        } else if (enemyList[i].Level === lvlMax) {
                            //want! add to list 
                            //console.log('ENEMY LEVEL & NAME @ POSITION: ', enemyList[i].Level, enemyList[i].Name, i);
                            ePool.push(enemyList[i]); //enemy found add to ePool
                        } else if (enemyList[i].Level >= lvlMin) {
                            //want! add to list
                            //console.log('ENEMY LEVEL & NAME @ POSITION: ', enemyList[i].Level, enemyList[i].Name, i);
                            ePool.push(enemyList[i]); //enemy found add to ePool
                        } else {
                            //dont want! keep looking
                        }
                    }

                    //list of enemies has been grabbed!!
                    //console.log('Length of ePool: ', ePool.length);

                    var count = 0;                  
                    var iGained = [];
                    var totItem = 0;
                    var totPages = 1;
                    //this while loop runs once for each enemy limited by maxE
                    //it calculates coins, xp, and adds to the total item count
                    while (count < maxE) {
                        var rEP = Math.round(Math.random() * (ePool.length - 1));//rng for picking position from ePool

                        var eFab = ePool[rEP];//enemy is grabbed from ePool and assigned
                        //console.log(`ENEMY GRABBED ${eFab.Name} @ COUNT #${count}`);

                        var lChance = Math.random();//rng which will decide whether loot is dropped
                        var HI = false;//set hasitem to false

                        const multChance = 0.850 - (0.050 * qFound.qlevel);//Loot drop rate = 15% +5% per Quest level
                        //console.log('LOOT DROP CHANCE: ', multChance);

                        if (lChance >= multChance) {
                            //hasitem:true
                            HI = true;
                        } else {/**hasitem: false*/ }


                        var tmpCopy = [];
                        /** Calculate item dropped below grabbing each enemy level with an item attached*/                       
                        if (HI) {
                            //has item add to list 
                            totItem += 1;
                            var iPool = [];
                            tmpCopy = [];//Clear tmp array for each item 

                            var randR = await grabRar(eFab.Level);

                            for (var n = 0; n < lootList.length; n++) {

                                if (lootList[n].Rar_id === randR) {
                                    await iPool.push(lootList[n]);
                                    //console.log('CONTENTS OF lootList AT POSITION ' + n + ': ', lootList[n].Name, lootList[n].Value, lootList[n].Loot_id, lootList[n].Type, interaction.user.id);
                                } else {
                                    //item not match keep looking
                                }
                            }

                            //  Available items added to array, rng grab one  
                            var randItemPos;
                            if (iPool.length <= 1) {
                                randItemPos = 0;
                            } else {
                                randItemPos = Math.round(Math.random() * (iPool.length - 1));
                            }

                            await tmpCopy.push(iPool[randItemPos]);//ADD ITEM SELECTED TO TEMP ARRAY FOR COMPARING
                            //Assume the item added is new until proven otherwise
                            var itemNew = true;
                            for (const item of iGained) {
                                if (item.Loot_id === tmpCopy[0].Loot_id) {
                                    itemNew = false;//Item is a dupe, change to false, bypassing new entry creation
                                    //console.log('DUPLICATE ITEM FOUND: ', iGained);
                                    item.Amount += 1;
                                    //console.log('FILTERED RESULT', item.Name, '\n');
                                    break;
                                }
                            }

                            //Item is new: create new entry and attach amount value, push to array and continue
                            if (itemNew) {
                                //console.log('BEFORE MAPPED NEW ITEM: ', tmpCopy[0].Name);

                                //const filtered = await tmpCopy.filter(item => item.Loot_id === tmpCopy[0].Loot_id);
                                //console.log('FILTERED RESULT', filtered.Name);

                                const mappedItem = await tmpCopy.map(item => ({ ...item, Amount: 1 }),);
                                //console.log('AFTER MAPPED NEW ITEM: ', mappedItem);

                                totPages += 1;

                                await iGained.push(...mappedItem);
                            }

                            var theItem = iPool[randItemPos];

                            const lootStore = await LootStore.findOne({
                                where: { spec_id: interaction.user.id, loot_id: theItem.Loot_id },
                            });

                            //console.log('UserItem: ', lootStore);

                            //check if an item was found in the previous .findOne()
                            //this checks if there is an item stored in the UserItems and adds one to the amount as defined in the dbInit script
                            //then return as a save call on the userItem data
                            if (lootStore) {
                                const inc = await lootStore.increment('amount');

                                if (inc) console.log('AMOUNT WAS UPDATED!');

                                await lootStore.save();
                            } else {
                                //increase item total
                                //grab reference to user
                                const uData = await grabU();
                                //increase item total
                                uData.totitem += 1;

                                await uData.save();

                                if (theItem.Slot === 'Mainhand') {
                                    //Item is a weapon store accordingly
                                    //const newItem = 
                                    await LootStore.create({
                                        name: theItem.Name,
                                        value: theItem.Value,
                                        loot_id: theItem.Loot_id,
                                        spec_id: interaction.user.id,
                                        rarity: theItem.Rarity,
                                        rar_id: theItem.Rar_id,
                                        attack: theItem.Attack,
                                        defence: 0,
                                        type: theItem.Type,
                                        slot: theItem.Slot,
                                        hands: theItem.Hands,
                                        amount: 1
                                    });

                                    //const itemAdded = await LootStore.findOne({
                                    //    where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
                                    //});

                                    //console.log(itemAdded);
                                } else if (theItem.Slot === 'Offhand') {
                                    //Item is an offhand
                                    //const newItem = 
                                    await LootStore.create({
                                        name: theItem.Name,
                                        value: theItem.Value,
                                        loot_id: theItem.Loot_id,
                                        spec_id: interaction.user.id,
                                        rarity: theItem.Rarity,
                                        rar_id: theItem.Rar_id,
                                        attack: theItem.Attack,
                                        defence: theItem.Defence,
                                        type: theItem.Type,
                                        slot: theItem.Slot,
                                        hands: theItem.Hands,
                                        amount: 1
                                    });

                                    //const itemAdded = await LootStore.findOne({
                                    //    where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
                                    //});

                                    //console.log(itemAdded);
                                } else {
                                    //Item is armor
                                    //const newItem = 
                                    await LootStore.create({
                                        name: theItem.Name,
                                        value: theItem.Value,
                                        loot_id: theItem.Loot_id,
                                        spec_id: interaction.user.id,
                                        rarity: theItem.Rarity,
                                        rar_id: theItem.Rar_id,
                                        attack: 0,
                                        defence: theItem.Defence,
                                        type: theItem.Type,
                                        slot: theItem.Slot,
                                        amount: 1
                                    });

                                    //const itemAdded = await LootStore.findOne({
                                    //    where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
                                    //});

                                    //console.log(itemAdded);
                                }
                            }                     
                        }

                        let xpGained = 0;
                        //calculate xp gained and add to overall total
                        if (eFab.XpMax >= 0) {
                            xpGained = Math.floor(Math.random() * (eFab.XpMax - eFab.XpMin + 1) + eFab.XpMin);
                        } else {                           
                            const lvl = eFab.Level;
                            let nxtLvl;
                            if (lvl < 20) {
                                nxtLvl = 50 * (Math.pow(lvl, 2) - 1);
                            } else if (lvl === 20) {
                                nxtLvl = 75 * (Math.pow(lvl, 2) - 1);
                            } else if (lvl > 20) {
                                const lvlScale = 1.5 * (Math.floor(lvl / 5));
                                nxtLvl = (75 + lvlScale) * (Math.pow(lvl, 2) - 1);
                            }

                            let XpMax = Math.floor((nxtLvl / 25) + (0.2 * (100 - lvl)));
                            let XpMin = XpMax - Math.floor(XpMax / 5.2);

                            xpGained = Math.floor(Math.random() * (XpMax - XpMin + 1) + XpMin);
                        } 
                        //console.log(`Before calc:`, xpGained);
                        xpGained = xpGained * 1 + ((-1) * (1.5 * hrs) ** 0.4 + 3.7);// ** is the same as Math.pow()
                        //console.log(`After calc:`, xpGained);

                        xpGained -= Math.floor(xpGained / 4);

                        totXP += xpGained;

                        //calculate coins gained and add to overall total
                        var cGained = (xpGained * 2);
                        totCoin += cGained;

                        count++;//increase count and run through again
                    }
                    
                    totXP = Math.round(totXP);
                    totCoin = Math.round(totCoin);

                    const extraEXP = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, { activec: 'EXP' }] });
                    if (extraEXP) {
                        if (extraEXP.duration > 0) {
                            totXP += totXP * extraEXP.curreffect;
                        }
                    }

                    //display current results in console log                                                                    
                    //console.log(`Listing of totals after all calculations have been done: \n${totCoin}c \n${totXP}xp \n${totQT}qt \n${totItem}items \n${maxE}killed`);

                    await isLvlUp(totXP, totCoin, interaction);

                    const uData = await grabU();

                    var totalQT = uData.qt + totQT;
                    //console.log('Current totalQT: ', totalQT);

                    await editPData(uData, totalQT);

                    var embedPages = [];

                    const gained = `Quest Summary: \n${totCoin}c \n${totQT}qts \n${totXP}xp \n${totItem}items \n${maxE}killed`;

                    const statsEmbed = new EmbedBuilder()
                        .setTitle("~QUEST COMPLETE~")
                        .setDescription(`Page 1/${totPages}`)
                        .setColor(0000)
                        .addFields(
                            {
                                name: ("<< SUMMARY >>"),
                                value: gained
                            }
                        )

                    await embedPages.push(statsEmbed);//add new embed to embed pages

                    const backButton = new ButtonBuilder()
                        .setLabel("Back")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('◀️')
                        .setCustomId('back-page');

                    const finishButton = new ButtonBuilder()
                        .setLabel("Finish")
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('*️⃣')
                        .setCustomId('delete-page');

                    const forwardButton = new ButtonBuilder()
                        .setLabel("Forward")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('▶️')
                        .setCustomId('next-page');

                    const interactiveButtons = new ActionRowBuilder().addComponents(backButton, finishButton, forwardButton);
               
                    var pos = 1;//  Start at position 2 in the array
                    var i = 0;
                    
                    //Assign list to be used in multiple handles
                    var list = [];
                    let embedColour;
                    //First check for all mainhand items dropped adding each one to the embed list 
                    var mainHand = iGained.filter(item => item.Slot === 'Mainhand');
                    for (var x = 0; x < mainHand.length;) {
                        //Mainhand weapons found list them out
                        list = (mainHand.slice((pos - 1), pos).map(item => `Name: ** ${item.Name} **\nValue: ** ${item.Value}c **\nRarity: ** ${item.Rarity} **\nAttack: ** ${item.Attack} **\nType: ** ${item.Type}**\nSlot: **${item.Slot}**\nHands: **${item.Hands}**\nAmount: ** ${item.Amount} ** `)
                            .join('\n\n'));

                        embedColour = await grabColour(mainHand[(pos - 1)].Rar_id);
                        x++;
                        i++;

                        const embed = new EmbedBuilder()
                            .setTitle("~LOOT GAINED~")
                            .setDescription(`Page ${i + 1}/${totPages}`)
                            .setColor(embedColour)
                            .addFields(
                                {
                                    name: ("<< ITEM >>"),
                                    value: list
                                }
                            )

                        await embedPages.push(embed);//add new embed to embed pages  
                        pos++;
                    }
                    pos = 1;
                    var offHand = iGained.filter(item => item.Slot === 'Offhand');
                    for (var y = 0; y < offHand.length;) {
                        list = (offHand.slice((pos - 1), pos).map(off => `Name: **${off.Name}** \nValue: **${off.Value}c** \nRarity: **${off.Rarity}** \nAttack: **${off.Attack}**\nDefence: **${off.Defence}** \nType: **${off.Type}**\nSlot: **${off.Slot}**\nAmount: ** ${off.Amount} ** `)
                            .join('\n\n'));

                        embedColour = await grabColour(offHand[(pos - 1)].Rar_id);
                        y++;
                        i++;

                        const embed = new EmbedBuilder()
                            .setTitle("~LOOT GAINED~")
                            .setDescription(`Page ${i + 1}/${totPages}`)
                            .setColor(embedColour)
                            .addFields(
                                {
                                    name: ("<< ITEM >>"),
                                    value: list
                                }
                            )

                        await embedPages.push(embed);//add new embed to embed pages  
                        pos++;
                    }
                    pos = 1;
                    //ADD FILTERED SLOT CHECK HERE WHEN WORKING
                    //============================================
                    var armorSlot = [];
                    //============================================
                    var headSlot = iGained.filter(item => item.Slot === 'Headslot');
                    var chestSlot = iGained.filter(item => item.Slot === 'Chestslot');
                    var legSlot = iGained.filter(item => item.Slot === 'Legslot');
                    armorSlot = armorSlot.concat(headSlot, chestSlot, legSlot);
                    for (var z = 0; z < armorSlot.length;) {
                        list = (armorSlot.slice((pos - 1), pos).map(gear => `Name: **${gear.Name}** \nValue: **${gear.Value}c** \nRarity: **${gear.Rarity}** \nDefence: **${gear.Defence}** \nType: **${gear.Type}**\nSlot: **${gear.Slot}**\nAmount: ** ${gear.Amount} ** `)
                            .join('\n\n'));

                        embedColour = await grabColour(armorSlot[(pos - 1)].Rar_id);
                        z++;
                        i++;

                        const embed = new EmbedBuilder()
                            .setTitle("~LOOT GAINED~")
                            .setDescription(`Page ${i + 1}/${totPages}`)
                            .setColor(embedColour)
                            .addFields(
                                {
                                    name: ("<< ITEM >>"),
                                    value: list
                                }
                            )

                        await embedPages.push(embed);//add new embed to embed pages  
                        pos++;
                    }


                        //list = (iGained.slice((pos - 1), pos).map(item =>
                        //    `Name: **${item.Name}**\nValue: **${item.Value}c**\nRarity: **${item.Rarity}**\nAttack: **${item.Attack}**\nType: **${item.Type}**\nAmount: **${item.Amount}** `)
                        //    .join('\n\n'));

                        //convert list to string to avoid any errors
                        //console.log(`\nList \n${list.toString()} \n@ pos ${i}`);//log the outcome
                        
                        
                        ////create discord embed using list mapped in previous for loop
                        //const embed = new EmbedBuilder()
                        //    .setTitle("~LOOT GAINED~")
                        //    .setDescription(`Page ${i + 1}/${totPages}`)
                        //    .setColor(0000)
                        //    .addFields(
                        //        {
                        //            name: ("<< ITEM >>"),
                        //            value: list
                        //        }
                        //    )

                        //await embedPages.push(embed);//add new embed to embed pages   
                        //pos++;

                    //==========================================================
                    //  HANDLE QUEST STORY LINE HERE
                    // quest reference qFound

                    var userMilestone = await Milestones.findOne({ where: { userid: interaction.user.id } });
                    var userDungeon = await ActiveDungeon.findOne({ where: { dungeonspecid: interaction.user.id } });

                    if (!userMilestone) {
                        //Generating new Milestones profile
                        const newMilestone = await Milestones.create({
                            userid: interaction.user.id,
                            currentquestline: 'Souls',
                            nextstoryquest: 5,
                            questlinedungeon: 1,
                        });

                        userMilestone = await Milestones.findOne({ where: { userid: newMilestone.userid } });
                    }

                    // SOULS    - lvl 35    - PARTS: 3
                    // DARK     - lvl 45    - PARTS: 4
                    // TORTURE  - lvl 50    - PARTS: 7
                    // CHAOS    - lvl 55    - PARTS: 3
                    // LAW      - lvl 65    - PARTS: 6
                    // HATE     - lvl 75    - PARTS: 6
                    // MYST     - lvl 85    - PARTS: 5
                    // SECRET   - lvl 95    - PARTS: 6
                    // DREAM    - lvl 100   - PARTS: 5

                    const user = await grabU();

                    if (userMilestone.currentquestline === 'Souls') {
                        if (!userDungeon) {
                            if (qFound.qid === 5 || qFound.qid === 8 || qFound.qid === 10) {
                                await checkHintStoryQuest(user, interaction);
                                //Quest is part of story line!
                                const fullLoreList = await loreList.filter(lore => lore.StoryLine === 1);
                                await Milestones.update({ laststoryquest: qFound.qid }, { where: { userid: interaction.user.id } });
                                let curLorePiece;
                                if (qFound.qid === 5) {
                                    await Milestones.update({ nextstoryquest: 8 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========
                                    // While clearing out the cultists you manage to extort information, finding references to an unknown location.
                                    // Depicted throughout their lair are muirals and alters giving thanks and ritual to their god.
                                    // Your dilligent searching comes with reward providing you a map marked with a location!

                                    // New Quest unlocked! if (userMilestone.laststoryquest === 5)

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[0].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);

                                } else if (qFound.qid === 8) {
                                    await Milestones.update({ nextstoryquest: 10 }, { where: { userid: interaction.user.id } });
                                    await checkHintLore(user, interaction);
                                    // ========== STORY ==========
                                    // Upon arriving at the marked location you are met with a large run-down castle town scattered are pillars and engravings of souls.
                                    // This must be the dungeon of souls!!
                                    // Crawling with monsters and creatures in numbers untold, you make for a tactical retreat!
                                    // This will be a mission all on its own, but no doubt it will be worth it!

                                    // NEW Quest unlocked! if (userMilestone.laststoryquest === 8)

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[1].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);

                                } else if (qFound.qid === 10) {
                                    //Final story quest completed, Souls Dungeon now unlocked!
                                    await checkHintDungeon(user, interaction);
                                    // ========== STORY ==========
                                    // After hours of gruling battles and slaying you secure the surroundings. 
                                    // You are now ready to enter the dungeon of souls, ruled by ``Wadon``!

                                    var QSDescription = 'NEW DUNGEON Unlocked!';

                                    curLorePiece = fullLoreList[2].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                            }
                        } else {
                            if (userDungeon.completed === true) {
                                const updateMilestone = await Milestones.update({
                                    currentquestline: 'Dark',
                                    nextstoryquest: 12,
                                    questlinedungeon: 2,
                                }, { where: { userid: interaction.user.id } });

                                if (updateMilestone > 0) userMilestone = await Milestones.findOne({ where: { userid: interaction.user.id } });                       
                            }
                        }                 
                    }

                    if (userMilestone.currentquestline === 'Dark') {
                        userDungeon = await ActiveDungeon.findOne({ where: [{ dungeonid: 2 }, { dungeonspecid: interaction.user.id }] });
                        if (!userDungeon || userDungeon.completed === false) {
                            if (qFound.qid === 12 || qFound.qid === 13 || qFound.qid === 14 || qFound.qid === 15) {
                                await Milestones.update({ laststoryquest: qFound.qid }, { where: { userid: interaction.user.id } });
                                const fullLoreList = await loreList.filter(lore => lore.StoryLine === 2);
                                let curLorePiece;
                                if (qFound.qid === 12) {
                                    await Milestones.update({ nextstoryquest: 13 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // You setout as a sell-sword, hoping to make some coin, acquire a bit of renown, maybe even learn a thing or two.
                                    // Upon arriving at the town which had put out the hire, you find it utterly empty on first inspection..
                                    // Not only empty, but completely unlit! Every sconce, brazier, and hearth sits with a lingering lightless chill...
                                    // This will certainly require a more thorough investigation!

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[0].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 13) {
                                    await Milestones.update({ nextstoryquest: 14 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // During your investigation of this lightless town you come across a roaming band of cultists, they all wear the same unfamiliar mark upon their robes.
                                    // Deciding not to engage them in combat but instead following along behind hoping to uncover their intentions and maybe even learn of what happened to the town!
                                    // You follow them for what feels days through forested trails, the warmth of the morning sun slowly growing a distant memory... 
                                    // There is a strange magic in the air around these cultists, and thankfully that uneasy feeling dissipates once you reach their camp.
                                    // You grow tired of waiting, your weapon grows weary from lack of bloodshed...

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[1].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 14) {
                                    await Milestones.update({ nextstoryquest: 15 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // Biding your time paid off greatly, the cultists are wholly unaware of your presence when you initiate your assault!
                                    // You manage to take down three before the remaining five take notice, followed by immediate counter action..
                                    // A deft lunge into a roll leaves you unscathed, and with two fewer cultists standing against you.
                                    // You stand in defiance against them, causing the smallest of the three to turn and run.. 
                                    // The broad-shouldered hulk towering over you lets forth a blast, it makes the already dim surroundings void of all remaining light temporarily blinding you!
                                    // He lurches forward swinging his massive fists.. ***CRACK***!! You take the full force, still unable to see, you swing against the pain, feeling your weapon find flesh..
                                    // Your sight returns near instantly upon your weapon striking. What luck! You managed to fully remove his arm, thus destroying the spell!
                                    // He collapses, gurgling and sobbing. You leave the pitiful sight going after the remaining cultists frozen with shock and horror...
                                    // Sometime later after your wounds have stopped throbbing, and your ears are no longer ringing. You extract information from the cultist which you bound.
                                    // She reveals the location of their goddess and her domain!!


                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[2].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 15) {
                                    //Final story quest completed, new dungeon unlocked

                                    // ========== STORY ==========

                                    // You trek through treacherous lands of blanketed forests and barren rock mountains to reach this lair of darkness..
                                    // Arriving at the outer perimiter greets your senses, dulling them and everything around you, even still you push onwards into the frey!
                                    // Hours of slaughter leaves you worn and your weapon giddy. 
                                    // You are ready for what resides within the dungeon of the dark, you are ready to face ``Dyvulla``!


                                    var QSDescription = 'NEW DUNGEON Unlocked!';

                                    curLorePiece = fullLoreList[3].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }

                            }
                        } else if (userDungeon.completed === true) {
                            const updateMilestone = await Milestones.update({
                                currentquestline: 'Torture',
                                nextstoryquest: 16,
                                questlinedungeon: 3,
                            }, { where: { userid: interaction.user.id } });

                            if (updateMilestone > 0) userMilestone = await Milestones.findOne({ where: { userid: interaction.user.id } });
                        }
                    }

                    if (userMilestone.currentquestline === 'Torture') {
                        userDungeon = await ActiveDungeon.findOne({ where: [{ dungeonid: 3 }, { dungeonspecid: interaction.user.id }] });
                        if (!userDungeon || userDungeon.completed === false) {
                            if (qFound.qid === 16 || qFound.qid === 17 || qFound.qid === 18 || qFound.qid === 19 || qFound.qid === 20 || qFound.qid === 21 || qFound.qid === 22) {
                                await Milestones.update({ laststoryquest: qFound.qid }, { where: { userid: interaction.user.id } });
                                const fullLoreList = await loreList.filter(lore => lore.StoryLine === 3);
                                let curLorePiece;
                                if (qFound.qid === 16) {
                                    await Milestones.update({ nextstoryquest: 17 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // Hard work, tough fought battles, spoils of war, surely youve earned a break!
                                    // A popular picnic spot, sounded the most pleasant, for a hardened veteran such as yourself.
                                    // You pack a lunch and setout, the sun nearing its apex, warm against your exposed skin (An uncommon feeling as of late!).
                                    // You lay out your woven blanket under the shade of a large Bloodoak, resting and enjoying the day as it is..
                                    // An hour goes by and you notice a lack of other people, none when you arrived, none since.
                                    // This of course is of no concern, no one is screaming, no smell of blood, no fits or fights for survival.
                                    // *A distant gurgling scream*
                                    // Surely today could not be a better day to picnic!
                                    // *Then there were two*
                                    // You let another half hour pass before giving in, you pack up and prepare to take a look...

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[0].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 17) {
                                    await Milestones.update({ nextstoryquest: 18 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // You begin your search throughout the mostly peaceful woods, interrupted only briefly by the sound of someone dying a horrible death..
                                    // Before returning, to the pleasant peace and quiet, of the wooded ambiance.
                                    // Your search brings you nearer to the death throws, stumbling upon an arm and the thick smell of blood..
                                    // Onwards you press your weapon now at the ready...

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[1].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 18) {
                                    await Milestones.update({ nextstoryquest: 19 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // You slowly follow the trail of limbs, mostly human in origin, some appearing animal in nature.
                                    // You steady yourself against the putrid scent filling the air, a low squelching ripples out from ahead of you
                                    // Slowly creeping up, hiding yourself behind a large tree...
                                    // There it sits, whether it sits amongst the limbs its collected or ***is*** those limbs is something you wish not to dwell on longer than needed!
                                    // You see fresh corpses, along with those now only resembling the bones with which flesh once clung.
                                    // You only sense this one creature, if memory serves you well, this is unmistakably an *Iron-Scaled Corpse Monster*!
                                    // A fearsome foe, were you as inexperienced as you once were. Now this is nothing more than an execution!
                                    // An execution it surely was, swift and decisive.
                                    // You decided to return before the current dusk turns to dark. Hoping to find clues as to where such a creature came from being so deep in safe woods.

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[2].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 19) {
                                    await Milestones.update({ nextstoryquest: 20 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // Having returned safely, you make for one of the well-known monster clergymen.
                                    // Asking the common whereabouts for such a creature, leads to a larger question you wish you hadnt walked into.
                                    // *Why so many, so suddenly, so widespread?*
                                    // He hands you a map, marked with each of the most recent abnormal gathering locations of these such creatures.
                                    // And so you head to bed, unsure if this is where you wanted that picnic to lead you...

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[3].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 20) {
                                    await Milestones.update({ nextstoryquest: 21 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // You setout geared up and ready for the task, marked on the map, in your hand.
                                    // Your course charted, provisions stocked, arriving at each location..
                                    // Strangely met with one of three outcomes each time; 
                                    // the location abandoned showing signs of slaughter, 
                                    // still living corpse monsters seemingly admiring each others handiwork,
                                    // or human effigies each placed in style of how quickly they fell pray to their wounds..
                                    // All of these outcomes are unsettling and yield no quarter against the living corpse monsters you come across.
                                    // Having now crossed off half the locations on your map you realize a pattern forming..
                                    // A radial pattern, spiraling outwards from one of the marked locations *a recently abandoned castle-town*.
                                    // You change course and decide to head there first to confirm your suspicions..
                                    // This choice pays off less for you and more for those who you find are not yet dead, you must act quick!! 

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[4].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 21) {
                                    await Milestones.update({ nextstoryquest: 22 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // Hours go by freeing bound victims, protecting and providing escape outside the city walls
                                    // Focusing less on slaughter and more on the rescue attempts, in hindsight not the best choice considering the foe.
                                    // A disturbing conclusion is drawn after freeing over 50..
                                    // These people were not meant to die in the conditions found in, rather a lack of food or water would do them in first
                                    // This is a town of prolonged ``Torture`` and no doubt the resident of one of the gods, a particularly sick and twisted one at that...
                                    // After freeing all mobile victims you prepare the trip back to safety, clearing this place will take some time..

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[5].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 22) {

                                    // ========== STORY ==========

                                    // Having returned and restocked, having given those victims refuge will keep your name long living,
                                    // Your weapon hand itches again, drawing your mind to the long battles ahead..
                                    // =====
                                    // The smell arriving still shocks your senses, less and less as you lose yourself to the slaughter
                                    // You Slaughter well, You Slaughter long, You Slaughter the fear, You Slaughter the hate, This slaughter was always your fate.
                                    // Youve cleared the entrance to the Dungeon of ``Torture`` Ruled by ``Ados``!

                                    var QSDescription = 'NEW DUNGEON Unlocked!';

                                    curLorePiece = fullLoreList[6].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                            }
                        } else if (userDungeon.completed === true) {
                            const updateMilestone = await Milestones.update({
                                currentquestline: 'Chaos',
                                nextstoryquest: 23,
                                questlinedungeon: 4,
                            }, { where: { userid: interaction.user.id } });

                            if (updateMilestone > 0) userMilestone = await Milestones.findOne({ where: { userid: interaction.user.id } });
                        }
                    }

                    if (userMilestone.currentquestline === 'Chaos') {
                        userDungeon = await ActiveDungeon.findOne({ where: [{ dungeonid: 4 }, { dungeonspecid: interaction.user.id }] });
                        if (!userDungeon || userDungeon.completed === false) {
                            if (qFound.qid === 23 || qFound.qid === 24 || qFound.qid === 25) {
                                await Milestones.update({ laststoryquest: qFound.qid }, { where: { userid: interaction.user.id } });
                                const fullLoreList = await loreList.filter(lore => lore.StoryLine === 4);
                                let curLorePiece;
                                if (qFound.qid === 23) {
                                    await Milestones.update({ nextstoryquest: 24 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // You run for what feels like days, his presence still all around you, you mind filled with noise
                                    // ***IT NEVER ENDS***
                                    // It feels like nails through your eyes and ears, you swear you can even taste his words and intentions on the air.
                                    // You scream, you run, you trip, you fall, you roll, back to your feet you run!
                                    // ***YOU MUST HIDE***
                                    // And so you shall try

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[0].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 24) {
                                    await Milestones.update({ nextstoryquest: 25 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // Tears stinging your eyes, throat raw with whitefire choking back sobs lest he find you.
                                    // ***YOU MUST SUBMIT***
                                    // You shake your head in silent refusal, your perception of the world lost to the ever changing nightmare before you.
                                    // ***YOU MUST DANCE***
                                    // That is exactly what you do, you find without a choice..

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[1].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 25) {
                                    // ========== STORY ==========

                                    // You dance, and dance..
                                    // With each spin you feel your fear grown lighter, the tears stop flowing, the burn in your throat subsides.
                                    // And then you find yourself face to face with ``Zimmir`` dancing by his command at the foot of his throne steps..
                                    // Here you pirouette, for the God of Chaos, within his Dungeon..

                                    var QSDescription = 'NEW Dungeon Unlocked!';

                                    curLorePiece = fullLoreList[2].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                            }
                        } else if (userDungeon.completed === true) {
                            const updateMilestone = await Milestones.update({
                                currentquestline: 'Law',
                                nextstoryquest: 27,
                                questlinedungeon: 5,
                            }, { where: { userid: interaction.user.id } });

                            if (updateMilestone > 0) userMilestone = await Milestones.findOne({ where: { userid: interaction.user.id } });
                        }
                    }

                    if (userMilestone.currentquestline === 'Law') {
                        userDungeon = await ActiveDungeon.findOne({ where: [{ dungeonid: 5 }, { dungeonspecid: interaction.user.id }] });
                        if (!userDungeon || userDungeon.completed === false) {
                            if (qFound.qid === 27 || 28 || 29 || 30 || 31 || 32) {
                                await Milestones.update({ laststoryquest: qFound.qid }, { where: { userid: interaction.user.id } });
                                const fullLoreList = await loreList.filter(lore => lore.StoryLine === 5);
                                let curLorePiece;
                                if (qFound.qid === 27) {
                                    await Milestones.update({ nextstoryquest: 28 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // Word of your great deeds has reached far and wide!!
                                    // It should be no surprise that the people youve saved wish to show grattitude,
                                    // and yet it does...
                                    // Puzzled and accepting you attend the parade setup for you, a three day long celebration!
                                    // You stop to rest at the second town having made your way from the first, these three towns plagued by monsters in days of late
                                    // No longer, due to you..
                                    // So ends the first day..

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[0].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 28) {
                                    await Milestones.update({ nextstoryquest: 29 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // *You dreamt of a saddened child, their face streaked with bloody tears,
                                    // you known not why they cry, nor why they bleed.*
                                    // So begins the second day, the procession leading you from the second town to the third.
                                    // Cheers and cries of joy surround you along the way, these people adore your achievements!!
                                    // A long day passes and you reach the third town.
                                    // So ends the second day..

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[1].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 29) {
                                    await Milestones.update({ nextstoryquest: 30 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // *You once again find yourself dreaming, that same child sits in a vast empty space,
                                    // the tears have dried, they leave crusted blood upon their face*
                                    // So begins the third day, continuing with the parade, bustling with positivity, a still foreign emotion..
                                    // You have been troubled by these dreams of late and find it hard to keep a fake smile while deep in thought.
                                    // You arrive at the fourth town, having completed your circuit of the lake these towns surround.
                                    // You stop and reflect on the days gone by before laying to rest..
                                    // So ends the third day.

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[2].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 30) {
                                    await Milestones.update({ nextstoryquest: 31 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // *The child sits, looking at you, quizzical and demining. Opens their mouth...*
                                    // ||***AND SCREAMS***||
                                    // You wake, violently, surrounded by the sound of your door being beaten by a fist.
                                    // You rush to the door, open it to be greeted by a man with a letter.
                                    // You take it and he leaves without a word, you think little of him given your awakening..
                                    // It is sealed with black wax, depicted is a set of scales.
                                    // The left contains a skull, the right a feather, it is unbalanced, leaning rightwards..
                                    // Opening the letter brings you a sense of dread and anticipation, on it is written;
                                    // *Dear, Slayer of Many*
                                    // *Your recent deeds and misdeeds, have not gone unnoticed. Please head this summons, and reply in person!*
                                    // *Failure to comply would not be optimal, but can be managed and forced if needed..*
                                    // *Thank you kindly, The Keeper. P.*
                                    // You feel a sense of relief, knowing the festivities have just come to an end..
                                    // So begins the fourth and final day.

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[3].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 31) {
                                    await Milestones.update({ nextstoryquest: 32 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // Youve heeded the summons, and trek to the castle.
                                    // The castle, as called by the townsfolk, is to be avoided..
                                    // The letter was lacking in location, prompting a few questions of the locals..
                                    // Having made the destination clear, you setout, traveled, and now have arrived.
                                    // Standing tall before you is a Bloodoak door reinforced with thin strips of Phasemetal,
                                    // Evident by the erie glow produced..
                                    // The door opens, the space left behind beckons you, and you cant help but listen..
                                    // And so you enter..

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[4].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }                              
                                if (qFound.qid === 32) {

                                    // ========== STORY ==========

                                    // You wander the castle grounds unsure where to go, unsure where to be.
                                    // Monster-like beings are standing around, acting guards, gatekeepers perhaps..
                                    // They offer no help in your search for your summoning, either way.
                                    // You come across a large set of stone steps leading deep into the castle,
                                    // Assuming this is the place you head upwards, and upon taking a single step..
                                    // A thunderus voice!
                                    // ***WELCOME SLAYER!!***
                                    // ***WELCOME TO THE DOMAIN OF ``Phamnera``***

                                    var QSDescription = 'NEW Dungeon Unlocked!';

                                    curLorePiece = fullLoreList[5].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                            }
                        } else if (userDungeon.completed === true) {
                            const updateMilestone = await Milestones.update({
                                currentquestline: 'Hate',
                                nextstoryquest: 33,
                                questlinedungeon: 6,
                            }, { where: { userid: interaction.user.id } });

                            if (updateMilestone > 0) userMilestone = await Milestones.findOne({ where: { userid: interaction.user.id } });
                        }
                    }

                    if (userMilestone.currentquestline === 'Hate') {
                        userDungeon = await ActiveDungeon.findOne({ where: [{ dungeonid: 6 }, { dungeonspecid: interaction.user.id }] });
                        if (!userDungeon || userDungeon.completed === false) {
                            if (qFound.qid === 33 || 34 || 35 || 36 || 37 || 38 || 39) {
                                await Milestones.update({ laststoryquest: qFound.qid }, { where: { userid: interaction.user.id } });
                                const fullLoreList = await loreList.filter(lore => lore.StoryLine === 6);
                                let curLorePiece;
                                if (qFound.qid === 33) {
                                    await Milestones.update({ nextstoryquest: 34 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // You come to your senses, the past weeks a blur of meetings and travel.
                                    // Your name has travelled further than your own two feet, the fame brings fortune..
                                    // It also brings war..
                                    // So you see, sitting with the warlords arguing over maps, you give a smile, you are a face, just another person in the room..
                                    // You wonder to yourself if this is truly where you wanted to be, gathering fame for war?
                                    // Yet, you sit, knowing the armies camped outside are to be commanded, by ***your*** beckon call!
                                    // You begin to nod off, the debates surrounding your ears give a feeling of ease as you drift..

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[0].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 34) {
                                    await Milestones.update({ nextstoryquest: 35 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // You stand at the forefront of the ranks, armored and ready.
                                    // Standing behind you in formation, nearly thirty thousand soldiers armed to the teeth, ready with their lives.
                                    // Heartbeat to heartbeat keeps you focused, you survey the surroundings, miles of flat open plains of flowing amber-grass.
                                    // Mountains enclose these fields, opposing you sits a wall spanning the length of the horizon, rows and rows of spikes spread in mass..
                                    // The war machines echo their calls, the horns sound, shouts and cries break forth..
                                    // ||***CHARRRGGGEEEEE**|| 
                                    // *The beasts of the hateful one break forth*
                                    // Amidst this midway ambush, you see her, ||and then your mind is gone...||

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[1].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 35) {
                                    await Milestones.update({ nextstoryquest: 36 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // The fury subsides, how long it takes is unknown to you, the countless corpses laying around you give tell to many hours.
                                    // The battle looks to be swinging into your favour as the enemies dwindle..
                                    // Your ears open, sound flooding in, those sounds are high ranking officers requesting guidance.
                                    // *The main gate is barred with some kind of barrier!! We cannot break through!! Our spys have located the source, they need strength!!*
                                    // A simple directional gesture from one of the officers, requiring no further information you setout alone towards the barriers source!
                                    // A long curving hallway, walls made from an impossibly smooth stone, unlike anything youve ever seen before.
                                    // You reach what must be the barriers source, a loud whirring, mixed with a strange language. The whirring turns to a hum that causes you to go ||Insane||..

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[2].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 36) {
                                    await Milestones.update({ nextstoryquest: 37 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // The first barrier source had been destroyed, naturally you go further, and further from where you entered.
                                    // Along your path you find one of the spys, slumped against the wall, you attempt to rouse him.
                                    // To your surprise he wakes, mumbling something in the same foriegn language from before..
                                    // You shake him, wishing his senses return, which they do, long enough to warn you, inform you, and promptly die..
                                    // Unfortunate, his death is strangly peaceful, you honor his passing and continue on your way.
                                    // Reaching the second barrier, the same whirring returns, surrounded by the same strange language, followed by your loss of consciousness..

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[3].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 37) {
                                    await Milestones.update({ nextstoryquest: 38 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // Your trek through the smooth grey hall continues without particular disterbance..
                                    // Approching the third and final barrier, the whirring, the voices...
                                    // You retain consciousness, mentally you are aware, physically out of control.
                                    // You see her standing amist the mages, smiling, blushing even.. 
                                    // ||* You cannot help but return a shy smile *||
                                    // ||***Blood spewing over your face staining that smile***||
                                    // She watches your slaughter, uneffected, yet, in control...
                                    // ||***FEAR***|| 
                                    // Her face contorts to a grievous smile, you go blank..

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[4].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 38) {
                                    await Milestones.update({ nextstoryquest: 39 }, { where: { userid: interaction.user.id } });

                                    // ========== STORY ==========

                                    // Having woken up, face down pressed against the cold stone floor, still within the strange smooth grey hall, you remember only that something is very very wrong..
                                    // You have no time to regain your composure before the horns are sounded, signaling a charge!!
                                    // You rush to your feet and down the hall towards the echoing blare of the horns, the barriers successfully destroyed!
                                    // The exit, the warm air, cool breeze, blood soaked, corpse strewn..
                                    // The remaining ranks of soldiers stand ready in formation again, close to the main gates, you return to them, preparing for this final assault against such a hateful palace..

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[5].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 39) {

                                    // ========== STORY ==========

                                    // **'THE CASTLE GATES HAVE BEEN FELLED, BURN THEIR FORTRESSES, DESTROY THEIR IDOLS OF HATE!!'**
                                    // You lead the charge into, through, and then beyond the main gate.
                                    // Pushing through hordes of creatures hellbent on causing death and oozing malace.
                                    // Having a well trained, armored allies, is still a foreign experience, you make note not to cause any collateral along the way..
                                    // The remaining forces push outwards surrounding the center fortress, clearing out the straglers, capturing anything capable of communication and surrender..
                                    // There before you; with a few thousand steps, dozens of enemies, sits between you and your next trophy!!
                                    // You are ready to enter The Dungeon of ``Hate``, ruled by ``Xogdia``

                                    var QSDescription = 'NEW Dungeon Unlocked!';

                                    curLorePiece = fullLoreList[6].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }                                
                            }
                        } else if (userDungeon.completed === true) {
                            const updateMilestone = await Milestones.update({
                                currentquestline: 'Myst',
                                nextstoryquest: 40,
                                questlinedungeon: 7,
                            }, { where: { userid: interaction.user.id } });

                            if (updateMilestone > 0) userMilestone = await Milestones.findOne({ where: { userid: interaction.user.id } });
                        }
                    }

                    if (userMilestone.currentquestline === 'Myst') {
                        userDungeon = await ActiveDungeon.findOne({ where: [{ dungeonid: 7 }, { dungeonspecid: interaction.user.id }] });
                        if (!userDungeon || userDungeon.completed === false) {
                            if (qFound.qid === 40 || 41 || 42 || 43 || 44 || 45) {
                                await Milestones.update({ laststoryquest: qFound.qid }, { where: { userid: interaction.user.id } });
                                const fullLoreList = await loreList.filter(lore => lore.StoryLine === 7);
                                let curLorePiece;
                                if (qFound.qid === 40) {
                                    await Milestones.update({ nextstoryquest: 41 }, { where: { userid: interaction.user.id } });

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[0].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 41) {
                                    await Milestones.update({ nextstoryquest: 42 }, { where: { userid: interaction.user.id } });

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[1].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 42) {
                                    await Milestones.update({ nextstoryquest: 43 }, { where: { userid: interaction.user.id } });

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[2].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 43) {
                                    await Milestones.update({ nextstoryquest: 44 }, { where: { userid: interaction.user.id } });

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[3].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 44) {
                                    await Milestones.update({ nextstoryquest: 45 }, { where: { userid: interaction.user.id } });

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[4].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 45) {
                                    var QSDescription = 'NEW Dungeon Unlocked!';

                                    curLorePiece = fullLoreList[5].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                            }
                        } else if (userDungeon.completed === true) {
                            const updateMilestone = await Milestones.update({
                                currentquestline: 'Secret',
                                nextstoryquest: 46,
                                questlinedungeon: 8,
                            }, { where: { userid: interaction.user.id } });

                            if (updateMilestone > 0) userMilestone = await Milestones.findOne({ where: { userid: interaction.user.id } });
                        }
                    }

                    if (userMilestone.currentquestline === 'Secret') {
                        userDungeon = await ActiveDungeon.findOne({ where: [{ dungeonid: 8 }, { dungeonspecid: interaction.user.id }] });
                        if (!userDungeon || userDungeon.completed === false) {
                            if (qFound.qid === 46 || 47 || 48 || 49 || 50 || 51 || 52) {
                                await Milestones.update({ laststoryquest: qFound.qid }, { where: { userid: interaction.user.id } });
                                const fullLoreList = await loreList.filter(lore => lore.StoryLine === 8);
                                let curLorePiece;
                                if (qFound.qid === 46) {
                                    await Milestones.update({ nextstoryquest: 47 }, { where: { userid: interaction.user.id } });

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[0].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 47) {
                                    await Milestones.update({ nextstoryquest: 48 }, { where: { userid: interaction.user.id } });

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[1].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 48) {
                                    await Milestones.update({ nextstoryquest: 49 }, { where: { userid: interaction.user.id } });

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[2].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 49) {
                                    await Milestones.update({ nextstoryquest: 50 }, { where: { userid: interaction.user.id } });

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[3].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 50) {
                                    await Milestones.update({ nextstoryquest: 51 }, { where: { userid: interaction.user.id } });

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[4].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 51) {
                                    await Milestones.update({ nextstoryquest: 52 }, { where: { userid: interaction.user.id } });

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[5].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 52) {
                                    var QSDescription = 'NEW Dungeon Unlocked!';

                                    curLorePiece = fullLoreList[6].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                            }
                        } else if (userDungeon.completed === true) {
                            const updateMilestone = await Milestones.update({
                                currentquestline: 'Dream',
                                nextstoryquest: 53,
                                questlinedungeon: 9,
                            }, { where: { userid: interaction.user.id } });

                            if (updateMilestone > 0) userMilestone = await Milestones.findOne({ where: { userid: interaction.user.id } });
                        }
                    }

                    if (userMilestone.currentquestline === 'Dream') {
                        userDungeon = await ActiveDungeon.findOne({ where: [{ dungeonid: 9 }, { dungeonspecid: interaction.user.id }] });
                        if (!userDungeon || userDungeon.completed === false) {
                            if (qFound.qid === 53 || 54 || 55 || 56 || 57) {
                                await Milestones.update({ laststoryquest: qFound.qid }, { where: { userid: interaction.user.id } });
                                const fullLoreList = await loreList.filter(lore => lore.StoryLine === 9);
                                let curLorePiece;
                                if (qFound.qid === 53) {
                                    await Milestones.update({ nextstoryquest: 54 }, { where: { userid: interaction.user.id } });

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[0].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 54) {
                                    await Milestones.update({ nextstoryquest: 55 }, { where: { userid: interaction.user.id } });

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[1].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 55) {
                                    await Milestones.update({ nextstoryquest: 56 }, { where: { userid: interaction.user.id } });

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[2].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 56) {
                                    await Milestones.update({ nextstoryquest: 57 }, { where: { userid: interaction.user.id } });

                                    var QSDescription = 'NEW Quest Unlocked!';

                                    curLorePiece = fullLoreList[3].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }
                                if (qFound.qid === 57) {
                                    var QSDescription = 'NEW Dungeon Unlocked!';

                                    curLorePiece = fullLoreList[4].Lore;

                                    const theAdventure = curLorePiece;

                                    const questStoryEmbed = new EmbedBuilder()
                                        .setTitle('Quest Progress')
                                        .setDescription(QSDescription)
                                        .setColor('DarkAqua')
                                        .addFields({
                                            name: 'Adventure', value: theAdventure
                                        });

                                    await interaction.followUp({ embeds: [questStoryEmbed] }).then(storyEmbed => setTimeout(() => {
                                        storyEmbed.delete();
                                    }, 300000)).catch(console.error);
                                }                               
                            }
                        }
                    }

                    //==========================================================

                    await destroyQuest();

                    const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

                    const filter = (i) => i.user.id === interaction.user.id;

                    const collector = embedMsg.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        filter,
                        time: 120000,
                    });

                    var currentPage = 0;

                    collector.on('collect', async (collInteract) => {
                        if (collInteract.customId === 'next-page') {
                            //console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);

                            //if statment to check if currently on the last page
                            if (currentPage === embedPages.length - 1) {
                                currentPage = 0;
                                await collInteract.deferUpdate().then(async () => {
                                    await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] })
                                }).catch(error => {
                                    console.error(error);
                                });
                            } else {
                                currentPage += 1;
                                await collInteract.deferUpdate().then(async () => {
                                    await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] })
                                }).catch(error => {
                                    console.error(error);
                                });
                            }
                        }
                        if (collInteract.customId === 'back-page') {
                            //console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);

                            if (currentPage === 0) {
                                currentPage = embedPages.length - 1;
                                await collInteract.deferUpdate().then(async () => {
                                    await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] })
                                }).catch(error => {
                                    console.error(error);
                                });
                            } else {
                                currentPage -= 1;
                                await collInteract.deferUpdate().then(async () => {
                                    await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] })
                                }).catch(error => {
                                    console.error(error);
                                });
                            }
                        }
                        if (collInteract.customId === 'delete-page') {
                            await collInteract.deferUpdate();
                            await collector.stop();
                        }
                    });

                    collector.on('end', () => {
                        if (embedMsg) {
                            embedMsg.delete().catch(error => {
                                if (error.code !== 10008) {
                                    console.error('Failed to delete the message:', error);
                                }
                            });
                        }
                    });                  
                } else {
                    //quest not complete return how long till completion
                    var timeCon = timeLeft;

                    var hrs = Math.floor(timeCon / (1000 * 60 * 60));
                    timeCon -= (hrs * 60 * 60 * 1000);
                    //console.log('Time left after removing hours', timeCon);

                    var min = Math.floor(timeCon / (1000 * 60));
                    timeCon -= (min * 60 * 1000);
                    //console.log('Time left after removing minutes', timeCon);

                    var sec = Math.round(timeCon / (1000));

                    //console.log(`Time left = ${hrs}:${min}:${sec}`);

                    return await interaction.followUp(`Your quest is still in progress!\nTime left: ${hrs}hrs ${min}min ${sec}s`);
                }
            } else {
                //no quest found!
                //prompt user to start new quest
                //console.log('No active quests found!');
                return interaction.followUp('You have no quests in progress.. Use ``/quest start`` to start one now!');
            }
        }

        //========================================
        //this method is used to remove completed quests
        async function destroyQuest() {
            await Questing.destroy({ where: { user_id: interaction.user.id } });
            //console.log('Quest removed!');
        }

        //========================================
        //This method is used to add all rewarded items into the data base
        async function addItem(item) {
            //create new search var to find any Item within the UserItem file pertaining to the User in question
            //.findOne() retrevies a single row of data
            //where : {} ensures only the row desired is grabbed
            const lootStore = await LootStore.findOne({
                where: { spec_id: interaction.user.id, loot_id: item.loot_id },
            });

            //console.log('UserItem: ', lootStore);

            //check if an item was found in the previous .findOne()
            //this checks if there is an item stored in the UserItems and adds one to the amount as defined in the dbInit script
            //then return as a save call on the userItem data
            if (lootStore) {
                const inc = await lootStore.increment('amount');

                if (inc) console.log('AMOUNT WAS UPDATED!');

                return await lootStore.save();
            }


            //increase item total
            //grab reference to user
            const uData = await grabU();
            //increase item total
            uData.totitem += 1;

            await uData.save();

            //if item is not found create a new one with the values requested
            console.log('TOTAL ITEM COUNT WAS INCREASED!');

            const newItem = await LootStore.create({
                name: item.name,
                value: item.value,
                loot_id: item.loot_id,
                spec_id: interaction.user.id,
                rarity: item.rarity,
                rar_id: item.rar_id,
                attack: item.attack,
                type: item.type,
                amount: 1
            });

            const itemAdded = await LootStore.findOne({
                where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
            });

            console.log(itemAdded);

            return newItem;
        }

        //========================================
        //basic user data refrence method
        async function grabU() {
            uData = await UserData.findOne({ where: { userid: interaction.user.id } });
            return uData;
        }

        //========================================
        //this method is used to update the users qts based on the qts calculated in the display function
        async function editPData(uData, totalQT) {
            if (totalQT >= 10) await checkHintPigmy(uData, interaction);
            const addQT = await UserData.update({ qt: totalQT }, { where: { userid: interaction.user.id } });
            if (addQT > 0) {
                return;
            }
        }
	},

};
