const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const { Questing, LootDrop, LootStore, UserData } = require('../dbObjects.js');
const { isLvlUp } = require('./exported/levelup.js');
const { grabRar } = require('./exported/grabRar.js');

const enemyList = require('../events/Models/json_prefabs/enemyList.json');
const lootList = require('../events/Models/json_prefabs/lootList.json');
const questList = require('../events/Models/json_prefabs/questList.json');

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
                const interactiveButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Back")
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('◀️')
                            .setCustomId('back-page'),
                    )
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Select")
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('*️⃣')
                            .setCustomId('select-quest'),
                    )
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Forward")
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('▶️')
                            .setCustomId('next-page'),
                    );
               if (user.level < 5) {
                    return interaction.followUp('Sorry! You need to be at least level 5 to start quests.. ``startcombat`` use this to gain some levels!')
                }
                const maxQLvl = Math.round(user.level / 5)

                var qPool = [];
                var embedPages = [];

                for (var i = 0; i < questList.length; i++) {
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

                await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] }).then(async embedMsg => {
                    const collectorBut = embedMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 1200000 });

                    var currentPage = 0;

                    collectorBut.on('collect', async i => {
                        if (i.user.id === interaction.user.id) {
                            //delete the embed here                             
                            //first check for what button has been pressed
                            //second find what discord embed page is currently displayed
                            //third change page accordingly
                            //fourth.. figure out why it wont be that easy



                            if (i.customId === 'next-page') {
                                //always start on first page
                                //check what page is currently active
                                //add 1 to embed array 
                                //show results and increase currentPage + 1

                                console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);

                                //if statment to check if currently on the last page
                                if (currentPage === embedPages.length - 1) {
                                    currentPage = 0;
                                    await i.deferUpdate();
                                    await wait(1000);
                                    await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                } else {
                                    currentPage += 1;
                                    await i.deferUpdate();
                                    await wait(1000);
                                    await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                }


                            } else if (i.customId === 'back-page') {
                                //check what page is currently active
                                //add 1 to embed array 
                                //show results and decrease currentPage - 1

                                console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);

                                if (currentPage === 0) {
                                    currentPage = embedPages.length - 1;
                                    await i.deferUpdate();
                                    await wait(1000);
                                    await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                } else {
                                    currentPage -= 1;
                                    await i.deferUpdate();
                                    await wait(1000);
                                    await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                }
                            } else if (i.customId === 'select-quest') {
                                console.log('Quest Selected!');
                                await i.deferUpdate();
                                await wait(1000);
                                const quest = qPool[currentPage];

                                await Questing.create(
                                    {
                                        user_id: interaction.user.id,
                                        qlength: quest.Length,
                                        qlevel: quest.Level,
                                        qname: quest.Name,
                                    }
                                );
                                await interaction.followUp(`You have started a quest in ${quest.Name}!`);
                                await embedMsg.delete();
                                console.log(`Quest ${quest.ID} started`);
                            }
                        } else {
                            i.reply({ content: `Nice try slick!`, ephemeral: true });
                        }
                    });

                }).catch(console.error);
            } else {
                //user found quest already active/not claimed
                //prompt user to deal with ongoing quest
                console.log('Quest found in progress or complete!');
                return interaction.followUp('You already have a quest in progress.. Use ``quest claim`` for more info!');
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
                    const maxE = ((10 * hrs) + (Math.round(Math.random() * (5 - 1) + 1) * qFound.qlevel));

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
                                console.log('AFTER MAPPED NEW ITEM: ', mappedItem);

                                totPages += 1;

                                await iGained.push(...mappedItem);
                            }
                            
                            
                            const edit = await LootDrop.findOne({ where: [{ spec_id: interaction.user.id }] });

                            if (edit) {
                                const maker = await LootDrop.update(
                                    {
                                        name: iPool[randItemPos].Name,
                                        value: iPool[randItemPos].Value,
                                        rarity: iPool[randItemPos].Rarity,
                                        rar_id: iPool[randItemPos].Rar_id,
                                        attack: iPool[randItemPos].Attack,
                                        type: iPool[randItemPos].Type,
                                        loot_id: iPool[randItemPos].Loot_id,
                                        spec_id: interaction.user.id,
                                    }, { where: [{ spec_id: interaction.user.id }] });

                                //await Promise(maker);
                                console.log('ITEM UPDATED!', maker);

                                var item = await LootDrop.findOne({ where: [{ spec_id: interaction.user.id }] });

                                //console.log('LOOT MATCH CHECK: ', item);

                                await addItem(item);
                            }
                            else if (!edit) {
                                const maker = await LootDrop.create(
                                    {
                                        name: iPool[randItemPos].Name,
                                        value: iPool[randItemPos].Value,
                                        rarity: iPool[randItemPos].Rarity,
                                        rar_id: iPool[randItemPos].Rar_id,
                                        attack: iPool[randItemPos].Attack,
                                        type: iPool[randItemPos].Type,
                                        loot_id: iPool[randItemPos].Loot_id,
                                        spec_id: interaction.user.id,
                                    });

                                //await Promise(maker);
                                console.log('ITEM CREATED!', maker);

                                var item = await LootDrop.findOne({ where: [{ spec_id: interaction.user.id }] });

                                //console.log('LOOT MATCH CHECK: ', item);

                                await addItem(item);
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


                    const interactiveButtons = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel("Back")
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('◀️')
                                .setCustomId('back-page'),
                        )
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel("Finish")
                                .setStyle(ButtonStyle.Success)
                                .setEmoji('*️⃣')
                                .setCustomId('delete-page')
                        )
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel("Forward")
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('▶️')
                                .setCustomId('next-page'),
                        );

                    var pos = 1;//  Start at position 2 in the array

                    for (var i = 0; i < iGained.length;) {
                                           
                        var list = (iGained.slice((pos - 1), pos).map(item =>
                            `Name: **${item.Name}**\nValue: **${item.Value}c**\nRarity: **${item.Rarity}**\nAttack: **${item.Attack}**\nType: **${item.Type}**\nAmount: **${item.Amount}** `)
                            .join('\n\n'));

                        //convert list to string to avoid any errors
                        console.log(`\nList \n${list.toString()} \n@ pos ${i}`);//log the outcome
                        i++
                        
                        //create discord embed using list mapped in previous for loop
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

                    await destroyQuest();

                    await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] }).then(async embedMsg => {
                        const collectorBut = embedMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

                        var currentPage = 0;

                        collectorBut.on('collect', async i => {
                            if (i.user.id === interaction.user.id) {
                                //delete the embed here                             
                                //first check for what button has been pressed
                                //second find what discord embed page is currently displayed
                                //third change page accordingly
                                //fourth.. figure out why it wont be that easy



                                if (i.customId === 'next-page') {
                                    //always start on first page
                                    //check what page is currently active
                                    //add 1 to embed array 
                                    //show results and increase currentPage + 1

                                    console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);

                                    //if statment to check if currently on the last page
                                    if (currentPage === embedPages.length - 1) {
                                        currentPage = 0;
                                        await i.deferUpdate();
                                        await wait(1000);
                                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                    } else {
                                        currentPage += 1;
                                        await i.deferUpdate();
                                        await wait(1000);
                                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                    }


                                } else if (i.customId === 'back-page') {
                                    //check what page is currently active
                                    //add 1 to embed array 
                                    //show results and decrease currentPage - 1

                                    console.log('CURRENT PAGE: ', currentPage, embedPages[currentPage]);

                                    if (currentPage === 0) {
                                        currentPage = embedPages.length - 1;
                                        await i.deferUpdate();
                                        await wait(1000);
                                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                    } else {
                                        currentPage -= 1;
                                        await i.deferUpdate();
                                        await wait(1000);
                                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                                    }
                                } else if (i.customId === 'delete-page') {
                                    await i.deferUpdate();
                                    await wait(1000);
                                    await embedMsg.delete();
                                }
                            } else {
                                i.reply({ content: `Nice try slick!`, ephemeral: true });
                            }
                        });

                    }).catch(console.error);
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
