const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
//const wait = require('node:timers/promises').setTimeout;
const { Questing, LootStore, UserData, Milestones, ActiveStatus } = require('../dbObjects.js');
const { isLvlUp } = require('./exported/levelup.js');
const { grabRar, grabColour } = require('./exported/grabRar.js');

const enemyList = require('../events/Models/json_prefabs/enemyList.json');
const lootList = require('../events/Models/json_prefabs/lootList.json');
const questList = require('../events/Models/json_prefabs/questList.json');
const activeCategoryEffects = require('../events/Models/json_prefabs/activeCategoryEffects.json');

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

                if (userMilestone.nextstoryquest === 5) {
                    //User has not started first quest in storyline
                    //Show only quests locked by ID-0
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
                } else if (userMilestone.laststoryquest === 10) {
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
                } else {
                    //User has completed at least one story quest
                    //Retrieve which one
                    const lastSQuest = userMilestone.laststoryquest;
                    if (lastSQuest === 5) {
                        //First story quest completed
                        for (var i = 0; i < questList.length; i++) {
                            //Filter out locked quests
                            if (questList[i].IsLockedBy === 0 || questList[i].IsLockedBy === 5) {
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
                            if (questList[i].IsLockedBy === 0 || questList[i].IsLockedBy === 8) {
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
                        console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);

                        //if statment to check if currently on the last page
                        if (currentPage === embedPages.length - 1) {
                            currentPage = 0;
                            await collInteract.deferUpdate();
                            await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                        } else {
                            currentPage += 1;
                            await collInteract.deferUpdate();
                            await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                        }
                    }
                    if (collInteract.customId === 'back-page') {
                        console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);

                        if (currentPage === 0) {
                            currentPage = embedPages.length - 1;
                            await collInteract.deferUpdate();
                            await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                        } else {
                            currentPage -= 1;
                            await collInteract.deferUpdate();
                            await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                        }
                    }
                    if (collInteract.customId === 'select-quest') {
                        console.log('Quest Selected!');
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
                        embedMsg.delete();
                    }
                });
            } else {
                //user found quest already active/not claimed
                //prompt user to deal with ongoing quest
                console.log('Quest found in progress or complete!');
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
                    const maxE = ((8 * hrs) + (Math.round(Math.random() * (4 - 1) + 1) * qFound.qlevel));

                    var ePool = [];             
                    var totXP = 0;
                    var totCoin = 0;
                    const totQT = (1 * hrs) + 1;
                    

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
                    console.log('Length of ePool: ', ePool.length);

                    var count = 0;                  
                    var iGained = [];
                    var totItem = 0;
                    var totPages = 1;
                    //this while loop runs once for each enemy limited by maxE
                    //it calculates coins, xp, and adds to the total item count
                    while (count < maxE) {
                        var rEP = Math.round(Math.random() * (ePool.length - 1));//rng for picking position from ePool

                        var eFab = ePool[rEP];//enemy is grabbed from ePool and assigned
                        console.log(`ENEMY GRABBED ${eFab.Name} @ COUNT #${count}`);

                        var lChance = Math.random();//rng which will decide whether loot is dropped
                        var HI = false;//set hasitem to false

                        const multChance = 0.850 - (0.020 * qFound.qlevel);//Loot drop rate = 15% +2% per Quest level
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
                                    console.log('DUPLICATE ITEM FOUND: ', iGained);
                                    item.Amount += 1;
                                    console.log('FILTERED RESULT', item.Name, '\n');
                                    break;
                                }
                            }

                            //Item is new: create new entry and attach amount value, push to array and continue
                            if (itemNew) {
                                console.log('BEFORE MAPPED NEW ITEM: ', tmpCopy[0].Name);

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

                            console.log('UserItem: ', lootStore);

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
                                    const newItem = await LootStore.create({
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

                                    const itemAdded = await LootStore.findOne({
                                        where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
                                    });

                                    console.log(itemAdded);
                                } else if (theItem.Slot === 'Offhand') {
                                    //Item is an offhand
                                    const newItem = await LootStore.create({
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

                                    const itemAdded = await LootStore.findOne({
                                        where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
                                    });

                                    console.log(itemAdded);
                                } else {
                                    //Item is armor
                                    const newItem = await LootStore.create({
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

                                    const itemAdded = await LootStore.findOne({
                                        where: { spec_id: interaction.user.id, loot_id: newItem.loot_id },
                                    });

                                    console.log(itemAdded);
                                }
                            }                     
                        }

                        //calculate xp gained and add to overall total
                        var xpGained = Math.floor(Math.random() * (eFab.XpMax - eFab.XpMin + 1) + eFab.XpMin);
                        //console.log(`Before calc:`, xpGained);
                        xpGained = xpGained * 1 + ((-1) * (1.5 * hrs) ** 0.4 + 3.7);// ** is the same as Math.pow()
                        //console.log(`After calc:`, xpGained);
                        totXP += xpGained;

                        //calculate coins gained and add to overall total
                        var cGained = ((xpGained - 5) + 1);
                        totCoin += cGained;

                        count++;//increase count and run through again
                    }
                    
                    totXP = Math.round(totXP);
                    totCoin = Math.round(totCoin);

                    const extraEXP = await ActiveStatus.findOne({ where: [{ spec_id: interaction.user.id }, { activec: 'EXP' }] });
                    if (extraEXP) {
                        if (extraEXP.duration > 0) {
                            totXP *= extraEXP.curreffect;
                        }
                    }

                    //display current results in console log                                                                    
                    console.log(`Listing of totals after all calculations have been done: \n${totCoin}c \n${totXP}xp \n${totQT}qt \n${totItem}items \n${maxE}killed`);

                    await isLvlUp(totXP, totCoin, interaction);

                    const uData = await grabU();

                    var totalQT = uData.qt + totQT;
                    console.log('Current totalQT: ', totalQT);

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
                    //First check for all mainhand items dropped adding each one to the embed list 
                    var mainHand = iGained.filter(item => item.Slot === 'Mainhand');
                    for (var x = 0; x < mainHand.length;) {
                        //Mainhand weapons found list them out
                        list = (mainHand.slice((pos - 1), pos).map(item => `Name: ** ${item.Name} **\nValue: ** ${item.Value}c **\nRarity: ** ${item.Rarity} **\nAttack: ** ${item.Attack} **\nType: ** ${item.Type}**\nSlot: **${item.Slot}**\nHands: **${item.Hands}**\nAmount: ** ${item.Amount} ** `)
                            .join('\n\n'));
                        x++;
                        i++;

                        const embed = new EmbedBuilder()
                            .setTitle("~LOOT GAINED~")
                            .setDescription(`Page ${i + 1}/${totPages}`)
                            .setColor(0000)
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
                        list = (offHand.slice((pos - 1), pos).map(off => `Name: **${off.Name}** \nValue: **${off.Value}c** \nRarity: **${off.Rarity}** \nAttack: **${off.Attack}** \nType: **${off.Type}**\nSlot: **${off.Slot}**\nAmount: ** ${off.Amount} ** `)
                            .join('\n\n'));
                        y++;
                        i++;

                        const embed = new EmbedBuilder()
                            .setTitle("~LOOT GAINED~")
                            .setDescription(`Page ${i + 1}/${totPages}`)
                            .setColor(0000)
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
                        z++;
                        i++;

                        const embed = new EmbedBuilder()
                            .setTitle("~LOOT GAINED~")
                            .setDescription(`Page ${i + 1}/${totPages}`)
                            .setColor(0000)
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

                    if (qFound.qid === 5 || qFound.qid === 8 || qFound.qid === 10) {
                        //Quest is part of story line!
                        await Milestones.update({ laststoryquest: qFound.qid }, { where: { userid: interaction.user.id } });

                        if (qFound.qid === 5) {                           
                            await Milestones.update({ nextstoryquest: 8 }, { where: { userid: interaction.user.id } });

                            // ========== STORY ==========
                            // While clearing out the cultists you manage to extort information, finding references to an unknown location.
                            // Depicted throughout their lair are muirals and alters giving thanks and ritual to their god.
                            // Your dilligent searching comes with reward providing you a map marked with a location!

                            // New Quest unlocked! if (userMilestone.laststoryquest === 5)

                            var QSDescription = 'NEW Quest Unlocked!';
                        
                            const theAdventure = `While clearing out the cultists you manage to extort information, finding references to an unknown location.\nDepicted throughout their lair are muirals and alters giving thanks and ritual to their god.\nYour dilligent searching comes with reward providing you a map marked with a location!`;

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

                            // ========== STORY ==========
                            // Upon arriving at the marked location you are met with a large run-down castle town scattered are pillars and engravings of souls.
                            // This must be the dungeon of souls!!
                            // Crawling with monsters and creatures in numbers untold, you make for a tactical retreat!
                            // This will be a mission all on its own, but no doubt it will be worth it!

                            // NEW Quest unlocked! if (userMilestone.laststoryquest === 8)

                            var QSDescription = 'NEW Quest Unlocked!';

                            const theAdventure = `Upon arriving at the marked location you are met with a large run-down castle town, scattered are pillars and engravings of souls.\nThis must be the dungeon of souls!!\nCrawling with monsters and creatures in numbers untold, you make for a tactical retreat!\nThis will be a mission all on its own, but no doubt it will be worth it!`;

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

                            // ========== STORY ==========
                            // After hours of gruling battles and slaying you secure the surroundings. 
                            // You are now ready to enter the dungeon of souls, ruled by ``Wadon``!

                            var QSDescription = 'NEW DUNGEON Unlocked!';
                          
                            const theAdventure = 'After hours of gruling battles and slaying you secure the surroundings.\nYou are now ready to enter the dungeon of souls, ruled by ``Wadon``!';

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
                            console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);

                            //if statment to check if currently on the last page
                            if (currentPage === embedPages.length - 1) {
                                currentPage = 0;
                                await collInteract.deferUpdate();
                                await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                            } else {
                                currentPage += 1;
                                await collInteract.deferUpdate();
                                await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                            }
                        }
                        if (collInteract.customId === 'back-page') {
                            console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);

                            if (currentPage === 0) {
                                currentPage = embedPages.length - 1;
                                await collInteract.deferUpdate();
                                await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                            } else {
                                currentPage -= 1;
                                await collInteract.deferUpdate();
                                await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                            }
                        }
                        if (collInteract.customId === 'delete-page') {
                            await collInteract.deferUpdate();
                            await collector.stop();
                        }
                    });

                    collector.on('end', () => {
                        if (embedMsg) {
                            embedMsg.delete();
                        }
                    });                  
                } else {
                    //quest not complete return how long till completion
                    var timeCon = timeLeft;

                    var hrs = await Math.floor(timeCon / (1000 * 60 * 60));
                    timeCon -= (hrs * 60 * 60 * 1000);
                    console.log('Time left after removing hours', timeCon);

                    var min = await Math.floor(timeCon / (1000 * 60));
                    timeCon -= (min * 60 * 1000);
                    console.log('Time left after removing minutes', timeCon);

                    var sec = await Math.round(timeCon / (1000));

                    console.log(`Time left = ${hrs}:${min}:${sec}`);

                    interaction.followUp(`Your quest is still in progress!\nTime left: ${hrs}hrs ${min}min ${sec}s`);
                }


            } else {
                //no quest found!
                //prompt user to start new quest
                console.log('No active quests found!');
                return interaction.followUp('You have no quests in progress.. Use ``/quest start`` to start one now!');
            }
        }

        //========================================
        //this method is used to remove completed quests
        async function destroyQuest() {
            await Questing.destroy({ where: { user_id: interaction.user.id } });
            console.log('Quest removed!');
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
        //this method is used to update the users xp based on the xp calculated in the display function
        async function editPData(uData, totalQT) {
            const addQT = await UserData.update({ qt: totalQT }, { where: { username: uData.username } });
            if (addQT > 0) {
                return;
            }
        }
	},

};
