const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const { LootStore, UserData, Loadout } = require('../../dbObjects.js');
const { findHelmSlot, findChestSlot, findLegSlot, findMainHand, findOffHand } = require('./exported/findLoadout.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('sell')
        .setDescription('Sell some old gear!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('some')
                .setDescription('Sell by individual item!')
		        .addStringOption(option =>
			        option.setName('item')
				        .setDescription('Item to sell')
				        .setAutocomplete(true)
				        .setRequired(true))
		        .addIntegerOption(option =>
			        option.setName('amount')
                        .setDescription('Amount to sell')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                .setDescription('Sell all of the chosen item types!')
                .addStringOption(option =>
                    option.setName('rarity')
                        .setDescription('The rarity to be sold')
                        .setAutocomplete(true)
                        .setRequired(true))),
	async autocomplete(interaction) {
		//Focused option is assigned to what the user is inputting as the paramaters for what option to select from
		const focusedOption = interaction.options.getFocused(true);
		//FIGURE OUT HOW TO MAP CURRENT INVENTORY ITEMS AS THE OPTIONS FOR SELECTING
		

        let choices = [];

        if (focusedOption.name === 'item') {
            const focusedValue = interaction.options.getFocused(false);

            const items = await LootStore.findAll({ where: [{ spec_id: interaction.user.id }] });

            if (focusedValue) {
                let first = focusedValue.charAt();

                for (var n = 0; n < items.length; n++) {
                    if (items[n].name.charAt() === first) {//Check for item starting with the letter provided
                        var picked = items[n].name;//assign picked to item name at postion n in the items list found
                        //prevent any type errors			
                        choices.push(picked.toString());//push each name one by one into the choices array
                    } else {
                        //Item name does not match keep looking
                    }

                }
                console.log(choices);
                console.log(focusedValue);

                //Mapping the complete list of options for discord to handle and present to the user
                const filtered = choices.filter(choice => choice.startsWith(focusedValue));
                await interaction.respond(
                    filtered.map(choice => ({ name: choice, value: choice })),
                );
            }
        }
        

        if (focusedOption.name === 'rarity') {
            const focusedValue = interaction.options.getFocused(false);

            choices = ["common", "uncommon", "rare", "very rare", "epic", "mystic", "?", "??", "???", "????"];

            if (focusedValue) {
                console.log(choices);
                console.log(focusedValue);

                //Mapping the complete list of options for discord to handle and present to the user
                const filtered = choices.filter(choice => choice.startsWith(focusedValue));
                await interaction.respond(
                    filtered.map(choice => ({ name: choice, value: choice })),
                );
            }
        }
	},
    async execute(interaction) {
        await interaction.deferReply();

        if (interaction.options.getSubcommand() === 'some') {
            const itemname = interaction.options.getString('item');
            const amountsell = interaction.options.getInteger('amount');
            console.log(itemname);

            const item = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { name: itemname }] });
            if (item) {
                if (!amountsell) {

                    var disableSellOne = false;
                    var disableSellAll = false;

                    const currentLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });

                    //const loadOutFilter = [{ slot: [currentLoadout.headslot, currentLoadout.chestslot, currentLoadout.legslot, currentLoadout.mainhand, currentLoadout.offhand], userid: [interaction.user.id] }];

                    if (!currentLoadout) {
                        //Nothing is equipped yet
                    } else {
                        //Something is equipped
                        if (item.loot_id === currentLoadout.headslot) {
                            //Item is equipped restrict selling all!
                            disableSellAll = true;
                            if (item.amount === 1) {
                                disableSellOne = true;
                            }
                        }
                        if (item.loot_id === currentLoadout.chestslot) {
                            //Item is equipped restrict selling all!
                            disableSellAll = true;
                            if (item.amount === 1) {
                                disableSellOne = true;
                            }
                        }
                        if (item.loot_id === currentLoadout.legslot) {
                            //Item is equipped restrict selling all!
                            disableSellAll = true;
                            if (item.amount === 1) {
                                disableSellOne = true;
                            }
                        }
                        if (item.loot_id === currentLoadout.mainhand) {
                            //Item is equipped restrict selling all!
                            disableSellAll = true;
                            if (item.amount === 1) {
                                disableSellOne = true;
                            }
                        }
                        if (item.loot_id === currentLoadout.offhand) {
                            //Item is equipped restrict selling all!
                            disableSellAll = true;
                            if (item.amount === 1) {
                                disableSellOne = true;
                            }
                        }
                        //let checkPass = currentLoadout;
                        //checkPass = checkPass.filter(item.loot_id === loadOutFilter.slot && item.spec_id === loadOutFilter.userid);
                        //if (checkPass.length > 0) {
                        //    //Item is equipped restrict selling all!
                        //    disableSellAll = true;
                        //    if (item.amount === 1) {
                        //        disableSellOne = true;
                        //    }
                        //}
                    }

                    const cancelButton = new ButtonBuilder()
                        .setLabel("Cancel")
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                        .setCustomId('cancel');

                    const sellOneButton = new ButtonBuilder()
                        .setLabel("SELL ONE")
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅')
                        .setDisabled(disableSellOne)
                        .setCustomId('confirm');

                    const leaveOneButton = new ButtonBuilder()
                        .setLabel("LEAVE ONE")
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('💲')
                        .setCustomId('leave-one');

                    const sellAllButton = new ButtonBuilder()
                        .setLabel("SELL ALL")
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('💲')
                        .setDisabled(disableSellAll)
                        .setCustomId('sell-all');

                    const sellButtons = new ActionRowBuilder().addComponents(cancelButton, sellOneButton, leaveOneButton, sellAllButton);

                    //create embed
                    const sellEmbed = new EmbedBuilder()
                        .setTitle("~Selling Options~")
                        .setColor(0x39acf3)
                        .addFields(
                            {
                                name: (`Inventory`),
                                value: `You have ${item.amount} ${item.name}(s) currently`
                            }
                        );

                    const embedMsg = await interaction.followUp({ embeds: [sellEmbed], components: [sellButtons] });

                    const filter = (i) => i.user.id === interaction.user.id;

                    const collector = embedMsg.createMessageComponentCollector({
                        ComponentType: ComponentType.Button,
                        filter,
                        time: 60000,
                    });

                    collector.on('collect', async (collInteract) => {
                        await collInteract.deferUpdate();
                        if (collInteract.customId === 'confirm') {
                            console.log('ITEM FOUND!', item.name);
                            var uData = await grabU();
                            console.log('Item', item.amount);

                            //sell item here
                            await collector.stop();
                            await sold(item, uData);
                        } else if (collInteract.customId === 'sell-all') {
                            console.log('ITEM FOUND!', item.name);
                            var uData = await grabU();
                            console.log('Item', item.amount);

                            //sell item here
                            await collector.stop();
                            await sellAll(item, uData);
                        } else if (collInteract.customId === 'leave-one') {
                            console.log('ITEM FOUND!', item.name);
                            var uData = await grabU();
                            console.log('Item', item.amount);

                            //sell item here
                            await collector.stop();
                            await leaveOne(item, uData);
                        } else if (collInteract.customId === 'cancel') {
                            await wait(1000);
                            await collector.stop();
                        }
                    });

                    collector.on('end', () => {
                        if (embedMsg) {
                            embedMsg.delete();
                        }
                    });
                } else if (amountsell) {
                    //handle user input sell amount
                    const currentLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
                    if (!currentLoadout) {
                        //Nothing is equipped yet
                        if (amountsell > item.amount) {
                            return interaction.followUp(`You do not have that many ${item.name}`);
                        } else if (amountsell === item.amount) {
                            var uData = await grabU();
                            await sellAll(item, uData);
                        } else {
                            var uData = await grabU();
                            await sell(item, amountsell, uData);
                        }
                    } else {
                        var isEquipped = false;
                        //Something is equipped|| currentLoadout.chestslot || currentLoadout.legslot || currentLoadout.mainhand || currentLoadout.offhand
                        if (item.loot_id === currentLoadout.headslot) {
                            //Item is equipped restrict selling all!
                            isEquipped = true;
                        }
                        if (item.loot_id === currentLoadout.chestslot) {
                            //Item is equipped restrict selling all!
                            isEquipped = true;
                        }
                        if (item.loot_id === currentLoadout.legslot) {
                            //Item is equipped restrict selling all!
                            isEquipped = true;
                        }
                        if (item.loot_id === currentLoadout.mainhand) {
                            //Item is equipped restrict selling all!
                            isEquipped = true;
                        }
                        if (item.loot_id === currentLoadout.offhand) {
                            //Item is equipped restrict selling all!
                            isEquipped = true;
                        }
                        if (isEquipped === true) {
                            //Restrict selling
                            if (amountsell > item.amount) {
                                return interaction.followUp(`You do not have that many ${item.name}`);
                            }
                            if (amountsell > (item.amount - 1)) {
                                //Amount -1 is counting the one currently equipped
                                return interaction.followUp(`You cannot sell all of ${item.name}, it is currently equipped!`);
                            } else if (amountsell === (item.amount - 1)) {
                                //Leaving one item due to being equipped selling the rest
                                var uData = await grabU();
                                await leaveOne(item, uData);
                            } else {
                                var uData = await grabU();
                                await sell(item, amountsell, uData);
                            }
                        } else {
                            if (amountsell > item.amount) {
                                return interaction.followUp(`You do not have that many ${item.name}`);
                            } else if (amountsell === item.amount) {
                                var uData = await grabU();
                                await sellAll(item, uData);
                            } else {
                                var uData = await grabU();
                                await sell(item, amountsell, uData);
                            }
                        }
                    }
                }
            } else {
                console.log('ITEM NOT FOUND!');
                return interaction.followUp('You dont have that item in your inventory.. to see your loot use the command ``/myloot``');
            }
        }

        if (interaction.options.getSubcommand() === 'all') {
            const rarityUsed = interaction.options.getString('rarity');

            var chosenRarID;

            //TEMPORARY SORTING BELOW, NEEDS UPDATING ONCE I UNDERSTAND HOW TO USE FILTERS
            //============================
            if (rarityUsed === 'common') {
                chosenRarID = 0;
            } else if (rarityUsed === 'uncommon') {
                chosenRarID = 1;
            } else if (rarityUsed === 'rare') {
                chosenRarID = 2;
            } else if (rarityUsed === 'very rare') {
                chosenRarID = 3;
            } else if (rarityUsed === 'epic') {
                chosenRarID = 4;
            } else if (rarityUsed === 'mystic') {
                chosenRarID = 5;
            } else if (rarityUsed === '?') {
                chosenRarID = 6;
            } else if (rarityUsed === '??') {
                chosenRarID = 7;
            } else if (rarityUsed === '???') {
                chosenRarID = 8;
            } else if (rarityUsed === '????') {
                chosenRarID = 9;
            } else if (rarityUsed === 'forgotten') {
                //Dont allow selling of these like this >:)
                return interaction.followUp('Mmmm nope, no easy way out for selling these ones! Try ``/sell some`` Instead');
            } else {
                return interaction.followUp('That was not a valid rarity, valid options are: **common**, **uncommon**, **rare**, **very rare**, **epic**, **mystic**, **?**, **??**, **???**, **????**');
            }
            //============================
            if (chosenRarID > 9 || chosenRarID < 0) {
                //This shouldnt be possible
            } else {
                //Valid rarity was found, time to sell it

                /**
                        How to handle this?
                            - Loop each item checking for rarId match
                            - Once items are filtered check for matches against currently equipped
                            - If match (Sell all but one)
                            - If not (SELL ALL)
                            - Can use prebuilt sell functions for super clean and speedy code too!!

                        UI/UX Tings!
                            - Confirmation button (extra super duper sure you wanna sell all 150 rocks??)
                            - Give total listings of:
                                - Total item amount to be sold
                                - Total coins gained from selling
                                - Any items limited due to being equipped
                                - Which rarity was selected in the first place LMAOOOO               
                 */

                //FIRST STEP: FILTER/GATHER ALL ITEMS WITH SELECTED RAR_ID

                const fullItemMatchList = await LootStore.findAll({ where: [{ spec_id: interaction.user.id }, { rar_id: chosenRarID }] });
                console.log(`ITEMS FOUND COMPARING TO EQUIPPED NOW...`);

                const currentLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });

                //SEARCH HANDLED CHECK IF EXISTS
                if (!currentLoadout) {
                    //No loadout found prepare to purge

                    //CAN USE .reduce() IN ORDER TO OBTAIN TOTALS FOR ITEM AMOUNT AND COIN VALUE
                    var totalItemsSold = await fullItemMatchList.reduce((totalAmount, item) => totalAmount + item.amount, 0);
                    var totalSoldValue = await fullItemMatchList.reduce((totalValue, item) => totalValue + (item.value * item.amount), 0);

                    console.log(`Total item AMOUNT to be sold: ${totalItemsSold}\nTotal VALUE of items sold: ${totalSoldValue}`);

                    const acceptButton = new ButtonBuilder()
                        .setLabel("Yes")
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅')
                        .setCustomId('accept');

                    const cancelButton = new ButtonBuilder()
                        .setLabel("No")
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                        .setCustomId('cancel');

                    const interactiveButtons = new ActionRowBuilder().addComponents(acceptButton, cancelButton);

                    const list = `Total item AMOUNT to be sold: ${totalItemsSold}\nTotal VALUE of items sold: ${totalSoldValue}`;

                    const confirmEmbed = new EmbedBuilder()
                        .setColor('Blurple')
                        .setTitle('Confirm Sell-All')
                        .addFields(
                            {
                                name: `Would you really like to Sell-All: ${rarityUsed} items owned?`,
                                value: list,

                            });

                    const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [confirmEmbed] });

                    const filter = (i) => i.user.id === interaction.user.id;

                    const collector = embedMsg.createMessageComponentCollector({
                        ComponentType: ComponentType.Button,
                        filter,
                        time: 120000,
                    });

                    collector.on('collect', async (collInteract) => {                       
                        if (collInteract.customId === 'accept') {
                            //Proceed with selling all 
                            await collInteract.deferUpdate();
                            acceptButton.setDisabled(true);
                            cancelButton.setDisabled(true);

                            await embedMsg.edit({
                                components: [interactiveButtons],
                            });

                            const sellComplete = await handleSellAllClean(fullItemMatchList);
                            if (sellComplete === 'FAILED') {
                                //Something went wrong :/
                            } else if (sellComplete === 'SUCCESS') {
                                //All items sold successfully!!
                                await collector.stop();
                            }
                        }

                        if (collInteract.customId === 'cancel') {
                            //Sell all canceled!
                            await collInteract.deferUpdate();
                            acceptButton.setDisabled(true);
                            cancelButton.setDisabled(true);

                            await embedMsg.edit({
                                components: [interactiveButtons],
                            });

                            await collector.stop();
                        }
                    });

                    collector.on('end', () => {
                        if (embedMsg) {
                            embedMsg.delete();
                        }
                    });

                } else {
                    var equippedList = [];
                    const userID = interaction.user.id;
                    //Loadout was found, compare values here
                    const headSlotItem = await findHelmSlot(currentLoadout.headslot, userID);
                    if (headSlotItem === 'NONE') {
                        //NO ITEM FOUND
                    } else if (headSlotItem.Rar_id !== chosenRarID){
                        //Equipped Item Rarity missmatch disregard and continue
                    } else {
                        //Search for match
                        //USE .filter() TO FIND A MATCH
                        const headSlotMatch = await fullItemMatchList.filter(item => item.loot_id === headSlotItem.Loot_id);
                        if (headSlotMatch.length === 0) {
                            //Item not found 
                            console.log(`No headslot match`);
                        } else {
                            //Item found push to equippedList
                            equippedList.push(headSlotMatch[0].Loot_id);
                        }
                    }

                    const chestSlotItem = await findChestSlot(currentLoadout.chestslot, userID);
                    if (chestSlotItem === 'NONE') {
                        //NO ITEM FOUND
                    } else if (chestSlotItem.Rar_id !== chosenRarID) {
                        //Equipped Item Rarity missmatch disregard and continue
                    } else {
                        //Search for match
                        //USE .filter() TO FIND A MATCH
                        const chestSlotMatch = await fullItemMatchList.filter(item => item.loot_id === chestSlotItem.Loot_id);
                        if (chestSlotMatch.length === 0) {
                            //Item not found
                            console.log(`No chestslot match`);
                        } else {
                            //Item found push to equippedList
                            equippedList.push(chestSlotMatch[0].Loot_id);
                        }
                    }

                    const legSlotItem = await findLegSlot(currentLoadout.legslot, userID);
                    if (legSlotItem === 'NONE') {
                        //NO ITEM FOUND
                    } else if (legSlotItem.Rar_id !== chosenRarID) {
                        //Equipped Item Rarity missmatch disregard and continue
                    } else {
                        //Search for match
                        //USE .filter() TO FIND A MATCH
                        const legSlotMatch = await fullItemMatchList.filter(item => item.loot_id === legSlotItem.Loot_id);
                        if (legSlotMatch.length === 0) {
                            //Item not found 
                            console.log(`No legslot match`);
                        } else {
                            //Item found push to equippedList
                            equippedList.push(legSlotMatch[0].Loot_id);
                        }
                    }

                    const mainHandItem = await findMainHand(currentLoadout.mainhand, userID);
                    if (mainHandItem === 'NONE') {
                        //NO ITEM FOUND
                    } else if (mainHandItem.Rar_id !== chosenRarID) {
                        //Equipped Item Rarity missmatch disregard and continue
                    } else {
                        //Search for match
                        //USE .filter() TO FIND A MATCH
                        const mainHandMatch = await fullItemMatchList.filter(item => item.loot_id === mainHandItem.Loot_id);
                        if (mainHandMatch.length === 0) {
                            //Item not found 
                            console.log(`No mainHand match`);
                        } else {
                            //Item found push to equippedList
                            equippedList.push(mainHandMatch[0].Loot_id);
                        }
                    }

                    //const offHandItem; TO BE ADDED

                    console.log(`equippedList contents after comparing all values: ${equippedList}`);
                    //EQUIPPED HAS BEEN HANDLED: DISPLAY FURTHER


                    //========================================
                    var totalItemsSold = await fullItemMatchList.reduce((totalAmount, item) => totalAmount + item.amount, 0);
                    var totalSoldValue = await fullItemMatchList.reduce((totalValue, item) => totalValue + (item.value * item.amount), 0);

                    console.log(`Total item AMOUNT to be sold: ${totalItemsSold}\nTotal VALUE of items sold: ${totalSoldValue}`);

                    const acceptButton = new ButtonBuilder()
                        .setLabel("Yes")
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅')
                        .setCustomId('accept');

                    const cancelButton = new ButtonBuilder()
                        .setLabel("No")
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                        .setCustomId('cancel');

                    const interactiveButtons = new ActionRowBuilder().addComponents(acceptButton, cancelButton);

                    const list = `Total item AMOUNT to be sold: ${totalItemsSold}\nTotal VALUE of items sold: ${totalSoldValue}`;

                    const confirmEmbed = new EmbedBuilder()
                        .setColor('Blurple')
                        .setTitle('Confirm Sell-All')
                        .addFields(
                            {
                                name: `Would you really like to Sell-All: ${rarityUsed} items owned?`,
                                value: list,

                            });

                    const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [confirmEmbed] });

                    const filter = (i) => i.user.id === interaction.user.id;

                    const collector = embedMsg.createMessageComponentCollector({
                        ComponentType: ComponentType.Button,
                        filter,
                        time: 120000,
                    });

                    collector.on('collect', async (collInteract) => {
                        if (collInteract.customId === 'accept') {
                            //Proceed with selling all 
                            await collInteract.deferUpdate();
                            acceptButton.setDisabled(true);
                            cancelButton.setDisabled(true);

                            await embedMsg.edit({
                                components: [interactiveButtons],
                            });


                            //const sellComplete = await fullItemMatchListClean.forEach(handleSellAll(equippedList));


                            if (equippedList.length !== 0) {
                                const sellComplete = await handleSellAll(fullItemMatchList, equippedList);
                                if (sellComplete === 'FAILED') {
                                    //Something went wrong :/
                                } else if (sellComplete === 'SUCCESS') {
                                    //All items sold successfully!!
                                    await collector.stop();
                                }
                            } else if (equippedList.length === 0) {                              
                                const sellComplete = await handleSellAllClean(fullItemMatchList);
                                if (sellComplete === 'FAILED') {
                                    //Something went wrong :/
                                } else if (sellComplete === 'SUCCESS') {
                                    //All items sold successfully!!
                                    await collector.stop();
                                }
                            }                          
                        }

                        if (collInteract.customId === 'cancel') {
                            //Sell all canceled!
                            await collInteract.deferUpdate();
                            acceptButton.setDisabled(true);
                            cancelButton.setDisabled(true);

                            await embedMsg.edit({
                                components: [interactiveButtons],
                            });
                            await collector.stop();
                        }
                    });

                    collector.on('end', () => {
                        if (embedMsg) {
                            embedMsg.delete();
                        } 
                    });
                }
            }
        }

        /**
         * 
         * @param {any} fullItemMatchList OBJECT ARRAY: Contains full list of items filtered by rarity chosen
         */
        //This method handles selling all of rarity if no items are equipped
        async function handleSellAllClean(fullItemMatchList) {
            //Go one item at a time calling sellAll for each reload uData on each item for proper values
            var uData;

            try {
                for (var n = 0; n < fullItemMatchList.length;) {
                    //First grab uData
                    uData = await grabU();
                    //Second call sellAll at n position
                    await sellAll(fullItemMatchList[n], uData);
                    console.log(`${fullItemMatchList[n].amount} ${fullItemMatchList[n].name} Sold for ${fullItemMatchList[n].value}c each!`);
                    n++;
                }
                return 'SUCCESS';
            } catch (err) {
                console.error(err);
                return 'FAILED';
            }          
        }

        /**
         * 
         * @param {Array} fullItemMatchList OBJECT ARRAY: Contains full list of items filtered by rarity chosen
         * @param {Array} equippedList INT ID ARRAY: Contains currently equipped items listed by ids
         */
        //This method handles selling all of rarity if no items are equipped
        async function handleSellAll(fullItemMatchList, equippedList) {
            //Go one item at a time calling sellAll for each reload uData on each item for proper values
            var uData;

            try {
                for (var n = 0; n < fullItemMatchList.length;) {
                    //First grab uData
                    uData = await grabU();
                    //Second check for equipped id match at n position
                    for (var e = 0; e < equippedList.length; e++) {
                        //Third: If match leave one, If not sell all
                        if (fullItemMatchList[n].loot_id === equippedList[e].Loot_id) {
                            //Item matches equipped item, leave one!
                            await leaveOne(fullItemMatchList[n], uData);
                            console.log(`${fullItemMatchList[n].amount} ${fullItemMatchList[n].name} Sold for ${fullItemMatchList[n].value}c each!`);
                            n++;
                        } else if (fullItemMatchList[n].loot_id !== equippedList[e].Loot_id) {
                            //Item does not match sell all
                            await sellAll(fullItemMatchList[n], uData);
                            console.log(`${fullItemMatchList[n].amount} ${fullItemMatchList[n].name} Sold for ${fullItemMatchList[n].value}c each!`);
                            n++;
                        }
                    }                                    
                }
                return 'SUCCESS';
            } catch (err) {
                console.error(err);
                return 'FAILED';
            }
        }


        //this method sells the user defined amount of items
        async function sell(item, amountsell, uData) {
            var soldFor = (item.value * amountsell);
            var newtotal = uData.coins + soldFor;

            var newA = item.amount - amountsell;

            const removed = await LootStore.update({ amount: newA }, { where: [{ name: item.name }, { spec_id: interaction.user.id }] });
            if (removed) {
                //item was updated
                console.log('ITEM COUNT UPDATED');
                const editC = await UserData.update({ coins: newtotal }, { where: [{ userid: interaction.user.id }] });
                if (editC) {
                    console.log('COINS UPDATED!');
                    console.log('Item sold! You gained: ', soldFor);

                    const soldEmbed = {
                        title: 'Item Sold!',
                        color: 0000,
                        fields: [{
                            name: 'You gained: ', value: `${soldFor}c`,
                        }],
                    };

                    await interaction.followUp({ embeds: [soldEmbed] }).then(async embedMsg => setTimeout(() => {
                        embedMsg.delete();
                    }, 1000));

                    //await interaction.followUp(`Item sold! You gained: ${soldFor}c`);
                    if (newA <= 0) {
                        //no more items remove from table
                        const newtot = uData.totitem - 1;
                        const totalItem = UserData.update({ totitem: newtot }, { where: [{ userid: interaction.user.id }] });
                        if (totalItem) console.log('TOTAL ITEM COUNT REDUCED!');

                        const isGone = await LootStore.destroy({ where: [{ name: item.name }, { spec_id: interaction.user.id }] });
                        if (isGone) console.log('ITEM REMOVED FROM TABLE');
                    } else { }
                    return;
                }
            } else { }//something went wrong  
        }

        //This method sells all but one of the item selected and does nothing if only one item is already present
        async function leaveOne(item, uData) {

            if (item.amount === 1) {
                await interaction.followUp(`You only have one of this item, no items have been sold!`);
                return;
            }
            console.log('Current users coins', uData.coins);
            var soldFor = (item.value * item.amount) - item.value;
            var newtotal = uData.coins + (item.value * item.amount);

            console.log('Total coins after adding users coins', newtotal);
            newtotal = newtotal - item.value;

            var newA = 1;

            const removed = await LootStore.update({ amount: newA }, { where: [{ name: item.name }, { spec_id: interaction.user.id }] });

            if (removed) {
                //item was updated
                console.log('ITEM COUNT UPDATED');
                const editC = await UserData.update({ coins: newtotal }, { where: [{ userid: interaction.user.id }] });
                if (editC) {
                    console.log('COINS UPDATED!');
                    console.log('Item sold! You gained: ', soldFor);

                    const soldEmbed = {
                        title: 'Item Sold!',
                        color: 0000,
                        fields: [{
                            name: 'You gained: ', value: `${soldFor}c`,
                        }],
                    };

                    await interaction.followUp({ embeds: [soldEmbed] }).then(async embedMsg => setTimeout(() => {
                        embedMsg.delete();
                    }, 1000));
                    return;
                }
            } else { }//something went wrong                  
        }

        //This method sells all of the item selected
        async function sellAll(item, uData) {

            console.log('Current users coins', uData.coins);
            var newtotal = uData.coins + (item.value * item.amount);
            var soldFor = (item.value * item.amount);

            var newA = 0;

            const removed = await LootStore.update({ amount: newA }, { where: [{ name: item.name }, { spec_id: interaction.user.id }] });

            if (removed) {
                //item was updated
                console.log('ITEM COUNT UPDATED');
                const editC = await UserData.update({ coins: newtotal }, { where: [{ userid: interaction.user.id }] });
                if (editC) {
                    console.log('COINS UPDATED!');
                    console.log('Item sold! You gained: ', soldFor);

                    const soldEmbed = {
                        title: 'Item Sold!',
                        color: 0000,
                        fields: [{
                            name: 'You gained: ', value: `${soldFor}c`,
                        }],
                    };

                    await interaction.followUp({ embeds: [soldEmbed] }).then(async embedMsg => setTimeout(() => {
                        embedMsg.delete();
                    }, 1000));
                    if (newA <= 0) {
                        //no more items remove from table
                        const newtot = uData.totitem - 1;
                        const totalItem = UserData.update({ totitem: newtot }, { where: [{ userid: interaction.user.id }] });
                        if (totalItem) console.log('TOTAL ITEM COUNT REDUCED!');

                        const isGone = await LootStore.destroy({ where: [{ name: item.name }, { spec_id: interaction.user.id }] });
                        if (isGone) console.log('ITEM REMOVED FROM TABLE');
                    } else { }
                    return;
                }
            } else { }//something went wrong                  
        }

        //This method sells only one of the item selected
        async function sold(item, uData) {

            var newA = item.amount - 1;

            const removed = await LootStore.update({ amount: newA }, { where: [{ name: item.name }, { spec_id: interaction.user.id }] });

            if (removed) {
                //item was updated
                console.log('ITEM COUNT UPDATED');

                var newtotal = uData.coins + item.value;

                const editC = await UserData.update({ coins: newtotal }, { where: [{ userid: interaction.user.id }] });
                if (editC) {
                    console.log('COINS UPDATED!');
                    console.log('Item sold! You gained: ', item.value);

                    const soldEmbed = {
                        title: 'Item Sold!',
                        color: 0000,
                        fields: [{
                            name: 'You gained: ', value: `${item.value}c`,
                        }],
                    };

                    await interaction.followUp({ embeds: [soldEmbed] }).then(async embedMsg => setTimeout(() => {
                        embedMsg.delete();
                    }, 1000));

                    if (newA <= 0) {
                        //no more items remove from table
                        const newtot = uData.totitem - 1;
                        const totalItem = UserData.update({ totitem: newtot }, { where: [{ userid: interaction.user.id }] });
                        if (totalItem) console.log('TOTAL ITEM COUNT REDUCED!');

                        const isGone = await LootStore.destroy({ where: [{ name: item.name }, { spec_id: interaction.user.id }] });
                        if (isGone) console.log('ITEM REMOVED FROM TABLE');
                    } else { }//do nothing
                    return;
                }

            } else { }//something went wrong

        }

        async function grabU() {
            uData = await UserData.findOne({ where: { userid: interaction.user.id } });
            //console.log(uData);
            return uData;
        }
	},

};
