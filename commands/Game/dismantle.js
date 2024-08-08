const { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const { Loadout, ItemStrings } = require('../../dbObjects.js');

const { grabColour } = require('./exported/grabRar.js');
const { createInteractiveChannelMessage, grabUser } = require('../../uniHelperFunctions.js');
const { checkingDismantle, checkingRar, checkingRarID } = require('../Development/Export/itemStringCore.js');
const { checkInboundMat, checkOutboundItem } = require('../Development/Export/itemMoveContainer.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('dismantle')
		.setDescription('Dismantle old unwanted gear into materials!!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('some')
                .setDescription('Dismantle by individual item!')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Item to dismantle')
                        .setAutocomplete(true)
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to dismantle')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                .setDescription('Dismantle all of the chosen item rarity!')
                .addStringOption(option =>
                    option.setName('rarity')
                        .setDescription('The rarity to be dismantled!')
                        .setAutocomplete(true)
                        .setRequired(true))),
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

        let choices = [];

        if (focusedOption.name === 'item') {
            const focusedValue = interaction.options.getFocused(false);

            const userItems = await ItemStrings.findAll({where: {user_id: interaction.user.id}});

            if (focusedValue) {
                choices = userItems.map(item => item.name);

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

            //Mapping the complete list of options for discord to handle and present to the user
            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
            await interaction.respond(
                filtered.map(choice => ({ name: choice, value: choice })),
            );
        }
    },
	async execute(interaction) { 
        //if (interaction.user.id !== '501177494137995264') return interaction.followUp('This command is under construction! Please try again later.');

        const {materialFiles} = interaction.client;

        await interaction.deferReply();

        const subCom = interaction.options.getSubcommand();

        const finalButts = new ActionRowBuilder();
        const finalEmbed = new EmbedBuilder();
        let someItemRef, loadCheck, allItemList;

        const cancelButt = new ButtonBuilder()
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌')
        .setCustomId('cancel');

        switch(subCom){
            case "some":
                const amount = interaction.options.getInteger('amount') ?? 1;
                const theItem = await ItemStrings.findOne({
                    where: {
                        user_id: interaction.user.id, 
                        name: interaction.options.getString('item')
                    }
                });
                if (!theItem) return interaction.followUp('That item was not found in your inventory!!');
                someItemRef = theItem;
                let disOne = false, disAll = false;
                
                loadCheck = await Loadout.findOne({
                    where: {
                        spec_id: interaction.user.id
                    }
                });

                if (loadCheck){
                    const equipped = [loadCheck.headslot, loadCheck.chestslot, loadCheck.legslot, loadCheck.offhand, loadCheck.mainhand];
                    if (equipped.includes(theItem.item_id)) disAll = true;
                    if (theItem.amount === 1) disOne = true;
                }

                const disOneButt = new ButtonBuilder()
                .setLabel("Dismantle ONE")
                .setStyle(ButtonStyle.Success)
                .setEmoji('⚒')
                .setDisabled(disOne)
                .setCustomId('dismantle-one');

                const leaveOneButt = new ButtonBuilder()
                .setLabel("Leave ONE")
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⚒')
                .setCustomId('leave-one');

                const disAllButt = new ButtonBuilder()
                .setLabel("Dismantle ALL")
                .setStyle(ButtonStyle.Danger)
                .setEmoji('⚒')
                .setDisabled(disAll)
                .setCustomId('dismantle-all');

                finalButts.addComponents(cancelButt, disOneButt, leaveOneButt, disAllButt);

                finalEmbed
                .setTitle('== Dismantle Options ==')
                .setColor(0o0)
                .addFields({
                    name: `${theItem.name}`, value: `You have ${theItem.amount}`
                });

            break;
            case "all":
                const rarPicked = interaction.options.getString('rarity') ?? 'None';
                const rarList = ["common", "uncommon", "rare", "very rare", "epic", "mystic", "?", "??", "???", "????"];
                if (rarPicked.toLowerCase() === 'forgotten') return interaction.followUp('Hmmm nope! You cannot dismantle these items that easily!! Use ``/dismantle some`` instead');
                if (!rarList.includes(rarPicked)) return interaction.followUp('That was not a valid Rarity!', rarPicked);

                const pickedRarID = rarList.indexOf(rarPicked);

                const fullItemList = await ItemStrings.findAll({
                    where: {user_id: interaction.user.id}
                });
                loadCheck = await Loadout.findOne({
                    where: {
                        spec_id: interaction.user.id
                    }
                });
                let equipped = (loadCheck) ? [`${loadCheck.headslot}`, `${loadCheck.chestslot}`, `${loadCheck.legslot}`, `${loadCheck.offhand}`, `${loadCheck.mainhand}`] : [];

                const rarItemMatchList = [];
                for (const item of fullItemList){
                    if (checkingRarID(checkingRar(item.item_code)) === pickedRarID){
                        if (equipped.length > 0 && equipped.includes(item.item_id)){
                            rarItemMatchList.push({item: item, disAmount: item.amount - 1});
                        } else rarItemMatchList.push({item: item, disAmount: item.amount});
                    }
                }

                if (rarItemMatchList.length === 0) return await interaction.followUp(`You have no ${rarPicked} items!!`);

                const totItemDis = rarItemMatchList.reduce((acc, item) => acc + item.disAmount, 0);
                const totDisValue = rarItemMatchList.reduce((acc, item) => acc + (item.item.value * item.disAmount), 0);

                if (totItemDis === 0) return await interaction.followUp(`You have no ${rarPicked} items!!`);

                const acceptButt = new ButtonBuilder()
                .setLabel("Yes")
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅')
                .setCustomId('accept');

                finalButts.addComponents(acceptButt, cancelButt);

                finalEmbed
                .setTitle(`== Dismantle **ALL** ${rarPicked} ==`)
                .setColor('Blurple')
                .addFields(
                    {name: 'Total Items to dismantle: ', value: `**${totItemDis}**`},
                    {name: 'Total Material value from dismantle: ', value: `**${totDisValue}**c`}
                );

                allItemList = rarItemMatchList;

            break;
        }

        const replyObj = {embeds: [finalEmbed], components: [finalButts]};

        const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 80000, replyObj, "FollowUp");

        collector.on('collect', async c => {
            await c.deferUpdate().then(async () => {
                let finalReply;
                switch(c.customId){
                    case "dismantle-one":
                        finalReply = await handleDismantle(someItemRef, 1, await grabUser(interaction.user.id));
                    break;
                    case "leave-one":
                        finalReply = await handleDismantle(someItemRef, someItemRef.amount - 1, await grabUser(interaction.user.id));
                    break;
                    case "dismantle-all":
                        finalReply = await handleDismantle(someItemRef, someItemRef.amount, await grabUser(interaction.user.id));
                    break;
                    case "accept":
                        finalReply = await handleDismantleAll(allItemList, await grabUser(interaction.user.id));
                    break;
                    case "cancel":
                    return await collector.stop('Cancel');
                }
                await collector.stop('Finished');
                return await handleMatPages(finalReply);
            }).catch(e => console.error(e));
        });

        collector.on('end', (c, r) => {
            anchorMsg.delete().catch(error => {
                if (error.code !== 10008) {
                    console.error('Failed to delete the message:', error);
                }
            });
        });

        /**
         * This function handles pagination for all dropped materials.
         * @param {EmbedBuilder[]} embeds Array of embed pages for display
         */
        async function handleMatPages(embeds){
            const finalPages = embeds;

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

            const pageButtonRow = new ActionRowBuilder().addComponents(backButton, finishButton, forwardButton);
            const finalReply = {embeds: [finalPages[0]], components: [pageButtonRow]};

            const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 300000, finalReply, "FollowUp");

            let curPage = 0;

            collector.on('collect', async c => {
                await c.deferUpdate().then(async () => {
                    switch(c.customId){
                        case "next-page":
                            curPage = (curPage === finalPages.length - 1) ? 0 : curPage + 1;
                        break;
                        case "back-page":
                            curPage = (curPage === 0) ? curPage = finalPages.length - 1 : curPage - 1;
                        break;
                        case "delete-page":
                        return collector.stop('Canceled');
                    }
                    await anchorMsg.edit({ components: [pageButtonRow], embeds: [finalPages[curPage]]});
                }).catch(e => {
                    console.error(e);
                });
            });

            collector.on('end', (c, r) => {
                anchorMsg.delete().catch(e => {
                    if (e.code !== 10008) {
                        console.error('Failed to delete the message:', e);
                    }
                });
            });
        }

        /**
         * This function handles dismantling a single item. It takes the number given
         * and calculates the total material value available before locating the mats
         * needed. It then drops the materials evenly based on value, stores/saves them
         * then updates the item entry. Returning the display embeds of all materials
         * dropped.
         * @param {object} item Item Object obtained from ItemStrings
         * @param {number} amount Amount to be dismantled
         * @param {object} user UserData Instance Object
         * @param {boolean} combCheck Flag set to change return value
         * @returns {Promise<EmbedBuilder[]>}
         */
        async function handleDismantle(item, amount, user, combCheck){
            const totalValue = item.value * amount;
            const matTypeList = checkingDismantle(item.item_code);
            const baseRar = checkingRarID(checkingRar(item.item_code));
            
            // Filter Needed Material files
            const fileList = [];
            for (const matType of matTypeList){
                for (const [key, value] of materialFiles){
                    if (key === matType.toLowerCase()) {
                        fileList.push(value);
                        break;
                    }
                }
            }

            // Filter for needed material types from files and then by rarity
            const matList = [];
            for (const file of fileList){
                const matFile = require(file);
                let matMatch, checkRar = baseRar;
                while (!matMatch || matMatch.length === 0 || checkRar >= 0){
                    matMatch = matFile.filter(mat => mat.Rar_id === checkRar);
                    if (matMatch.length > 0) break;
                    checkRar--;
                }
                matList.push(matMatch[0]);
            }

            // Even total value across material type amount
            const evenValue = totalValue / matList.length;

            // Drop materials according to value available
            const matDropList = [];
            let posCount = 0;
            for (const mat of matList){
                let dropAmount = Math.ceil(evenValue / mat.Value);
                if (dropAmount <= 0) dropAmount = 1;
                matDropList.push({ref: mat, type: matTypeList[posCount].toLowerCase(), amount: dropAmount});
                posCount++;
            }

            // Store material and create embed display
            let finalEmbeds = [];
            if (!combCheck){
                for (const matObj of matDropList){
                    const nMat = await checkInboundMat(user.userid, matObj.ref, matObj.type, matObj.amount);
                    const matColour = grabColour(nMat.rar_id);
    
                    const embedFields = `Material Type: **${matObj.type}**\nValue: **${nMat.value}**c\nRarity: **${nMat.rarity}**\nAmount Dropped: **${matObj.amount}**`;
    
                    const matEmbed = new EmbedBuilder()
                    .setTitle('== Material Dropped ==')
                    .setColor(matColour)
                    .addFields({
                        name: `${nMat.name}`,
                        value: embedFields
                    });
    
                    finalEmbeds.push(matEmbed);
                }
            }
            
            // Handle Item removal
            await checkOutboundItem(user.userid, item.item_id, amount);

            return (combCheck) ? matDropList : finalEmbeds;
        }

        /**
         * This function loops through all items provided and concats the 
         * returned arrays for each. It then combines all duplicate materials, totalling
         * the amounts before submitting and using the final result for display.
         * @param {object[]} itemList List of item objects: {item: object, disAmount: number}
         * @param {object} user UserData Instance Object
         * @returns {Promise<EmbedBuilder[]>}
         */
        async function handleDismantleAll(itemList, user){
            let fullMatList = [];
            for (const item of itemList){
                fullMatList = fullMatList.concat(await handleDismantle(item.item, item.disAmount, user, true));
            }
            
            // Ability to combine Duplicate materials before creating embeds!!
            const typeArr = [];
            for (const obj of fullMatList){
                if (!typeArr.includes(obj.type)) typeArr.push(obj.type);
            }

            const combArr = [];
            for (const type of typeArr){
                const totalCount = fullMatList.filter(obj => obj.type === type).reduce((acc, obj) => {
                    return (acc > 0) ? acc + obj.amount : obj.amount;
                }, 0);
                combArr.push({
                    ref: fullMatList.filter(obj => obj.type === type)[0].ref,
                    type: type,
                    amount: totalCount
                });
            }

            let finalEmbedList = [];
            for (const matObj of combArr){
                const nMat = await checkInboundMat(user.userid, matObj.ref, matObj.type, matObj.amount);
                const matColour = grabColour(nMat.rar_id);

                const embedFields = `Material Type: **${matObj.type}**\nValue: **${nMat.value}**c\nRarity: **${nMat.rarity}**\nAmount Dropped: **${matObj.amount}**`;

                const matEmbed = new EmbedBuilder()
                .setTitle('== Material Dropped ==')
                .setColor(matColour)
                .addFields({
                    name: `${nMat.name}`,
                    value: embedFields
                });

                finalEmbedList.push(matEmbed);
            }

            return finalEmbedList;
        }

        /*
        if (interaction.options.getSubcommand() === 'some') {
            await interaction.deferReply();
            const itemName = interaction.options.getString('item');
            let theAmount = interaction.options.getInteger('amount');
            if (!theAmount) theAmount = 1;

            const item = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { name: itemName }] });
            if (!item) return interaction.followUp(`You have no ${itemName} in your inventory!`);
            if (item.loot_id > 1000) return interaction.followUp(`You can not dismantle that item because it is special!!`);
            let disableDismantleOne = false;
            let disableDismantleAll = false;

            const userLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
            if (!userLoadout) {
                console.log(warnedForm('No userLoadout found!'));
            } else {
                console.log(successResult('User loadout found!'));
                if (item.loot_id === userLoadout.headslot) {
                    //Item is equipped restrict selling all!
                    disableDismantleAll = true;
                    if (item.amount === 1) {
                        disableDismantleOne = true;
                    }
                }
                if (item.loot_id === userLoadout.chestslot) {
                    //Item is equipped restrict selling all!
                    disableDismantleAll = true;
                    if (item.amount === 1) {
                        disableDismantleOne = true;
                    }
                }
                if (item.loot_id === userLoadout.legslot) {
                    //Item is equipped restrict selling all!
                    disableDismantleAll = true;
                    if (item.amount === 1) {
                        disableDismantleOne = true;
                    }
                }
                if (item.loot_id === userLoadout.mainhand) {
                    //Item is equipped restrict selling all!
                    disableDismantleAll = true;
                    if (item.amount === 1) {
                        disableDismantleOne = true;
                    }
                }
                if (item.loot_id === userLoadout.offhand) {
                    //Item is equipped restrict selling all!
                    disableDismantleAll = true;
                    if (item.amount === 1) {
                        disableDismantleOne = true;
                    }
                }
                console.log(specialInfoForm(`disableDismantleAll: ${disableDismantleAll} \ndisableDismantleOne: ${disableDismantleOne}`));
            }

            const cancelButton = new ButtonBuilder()
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
                .setCustomId('cancel');

            const leaveOneButton = new ButtonBuilder()
                .setLabel("LEAVE ONE")
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⚒')
                .setCustomId('leave-one');

            const dismantleAllButton = new ButtonBuilder()
                .setLabel("Dismantle ALL")
                .setStyle(ButtonStyle.Danger)
                .setEmoji('⚒')
                .setDisabled(disableDismantleAll)
                .setCustomId('dismantle-all');

            const dismantleOneButton = new ButtonBuilder()
                .setLabel("Dismantle ONE")
                .setStyle(ButtonStyle.Success)
                .setEmoji('⚒')
                .setDisabled(disableDismantleOne)
                .setCustomId('dismantle-one');

            const dismantleButtons = new ActionRowBuilder().addComponents(cancelButton, leaveOneButton, dismantleAllButton, dismantleOneButton);

            const dismantleEmbed = new EmbedBuilder()
                .setTitle('~Dismantle Options~')
                .setColor(0o0)
                .addFields({
                    name: `${item.name}: `, value: `You currently have ${item.amount}`
                });

            const embedMsg = await interaction.followUp({ embeds: [dismantleEmbed], components: [dismantleButtons] });

            const filter = (i) => i.user.id === interaction.user.id;

            const collector = embedMsg.createMessageComponentCollector({
                ComponentType: ComponentType.Button,
                filter,
                time: 60000,
            });

            collector.on('collect', async (collInteract) => {
                if (collInteract.customId === 'dismantle-one') {
                    await collInteract.deferUpdate();
                    await collector.stop();
                    const result = await dismantleOne(item);
                    if (result[0].title !== undefined) {
                        console.log(successResult('Embed created!!'));
                        displayMaterialGain(result);
                    } else {
                        return interaction.followUp(`Error while executing command: ${result}`);
                    }
                }
                if (collInteract.customId === 'leave-one') {
                    await collInteract.deferUpdate();
                    await collector.stop();
                    const result = await leaveOne(item);
                    if (result[0].title !== undefined) {
                        console.log(successResult('Embed created!!'));
                        displayMaterialGain(result);
                    } else {
                        return interaction.followUp(`Error while executing command: ${result}`);
                    }
                }
                if (collInteract.customId === 'dismantle-all') {
                    await collInteract.deferUpdate();
                    await collector.stop();
                    const result = await dismantleAll(item);
                    if (result[0].title !== undefined) {
                        console.log(successResult('Embed created!!'));
                        displayMaterialGain(result);
                    } else {
                        return interaction.followUp(`Error while executing command: ${result}`);
                    }
                }
                if (collInteract.customId === 'cancel') {
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
        }

        if (interaction.options.getSubcommand() === 'all') {
            await interaction.deferReply();
            const rarityUsed = interaction.options.getString('rarity');

            let chosenRarID;

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
                return interaction.followUp('Mmmm nope, no easy way out for selling these ones! Try ``/dismantle some`` Instead');
            } else {
                return interaction.followUp('That was not a valid rarity, valid options are: **common**, **uncommon**, **rare**, **very rare**, **epic**, **mystic**, **?**, **??**, **???**, **????**');
            }

            const fullItemMatchList = await LootStore.findAll({ where: [{ spec_id: interaction.user.id }, { rar_id: chosenRarID }] });
            if (fullItemMatchList.length <= 0) return interaction.followUp('You have no items of that rarity!');

            let leaveOut = [];
            let leaveOne = [];
            let dismantleOne = [];
            let dismantleAll = [];

            const userLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
            if (!userLoadout) {
                console.log(warnedForm('No userLoadout found!'));
                dismantleAll.push(fullItemMatchList);
            } else {
                console.log(successResult('User loadout found!'));
                for (const item of fullItemMatchList) {
                    if (item.loot_id === userLoadout.headslot) {
                        //Item is equipped restrict selling all!                      
                        if (item.amount === 1) {
                            //Leave out from list!
                            leaveOut.push(item);
                        } else if (item.amount === 2) {
                            dismantleOne.push(item);
                        } else {
                            leaveOne.push(item);
                        }
                    } else if (item.loot_id === userLoadout.chestslot) {
                        //Item is equipped restrict selling all!
                        if (item.amount === 1) {
                            //Leave out from list!
                            leaveOut.push(item);
                        } else if (item.amount === 2) {
                            dismantleOne.push(item);
                        } else {
                            leaveOne.push(item);
                        }
                    } else if (item.loot_id === userLoadout.legslot) {
                        //Item is equipped restrict selling all!
                        if (item.amount === 1) {
                            //Leave out from list!
                            leaveOut.push(item);
                        } else if (item.amount === 2) {
                            dismantleOne.push(item);
                        } else {
                            leaveOne.push(item);
                        }
                    } else if (item.loot_id === userLoadout.mainhand) {
                        //Item is equipped restrict selling all!
                        if (item.amount === 1) {
                            //Leave out from list!
                            leaveOut.push(item);
                        } else if (item.amount === 2) {
                            dismantleOne.push(item);
                        } else {
                            leaveOne.push(item);
                        }
                    } else if (item.loot_id === userLoadout.offhand) {
                        //Item is equipped restrict selling all!
                        if (item.amount === 1) {
                            //Leave out from list!
                            leaveOut.push(item);
                        } else if (item.amount === 2) {
                            dismantleOne.push(item);
                        } else {
                            leaveOne.push(item);
                        }
                    } else if (item.loot_id > 1000) {
                        leaveOut.push(item);
                    } else {
                        dismantleAll.push(item);
                    }
                }
                console.log(specialInfoForm(`dismantleAll: ${dismantleAll} \ndismantleOne: ${dismantleOne}`));
            }
            let totalItemsDismantled;
            totalItemsDismantled = dismantleAll.reduce((totalAmount, item) => totalAmount + item.amount, 0);
            totalItemsDismantled = leaveOne.reduce((totalAmount, item) => totalAmount + (item.amount - 1), totalItemsDismantled);
            totalItemsDismantled += dismantleOne.length;

            let totalDismantledValue;
            totalDismantledValue = dismantleAll.reduce((totalValue, item) => totalValue + (item.value * item.amount), 0);
            totalDismantledValue = leaveOne.reduce((totalValue, item) => totalValue + (item.value * (item.amount - 1)), totalDismantledValue);
            totalDismantledValue = dismantleOne.reduce((totalValue, item) => totalValue + (item.value * 1), totalDismantledValue);

            console.log(`Total item AMOUNT to be dismantled: ${totalItemsDismantled}\nTotal VALUE of items dismantled: ${totalDismantledValue}`);

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

            const list = `Total item AMOUNT to be dismantled: ${totalItemsDismantled}\nTotal VALUE of items dismantled: ${totalDismantledValue}`;

            const confirmEmbed = new EmbedBuilder()
                .setColor('Blurple')
                .setTitle('Confirm Dismantle-All')
                .addFields(
                    {
                        name: `Would you really like to Dismantle-All: ${rarityUsed} items owned?`,
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
                    await collInteract.deferUpdate();
                    const result = await handleMultiDismantle(dismantleAll, dismantleOne, leaveOne);
                    if (result[0].title !== undefined) {
                        console.log(successResult('Embed created!!'));
                        await collector.stop();
                        displayMaterialGain(result);
                    } else {
                        return interaction.followUp(`Error while executing command: ${result}`);
                    }
                }
                if (collInteract.customId === 'cancel') {
                    await collInteract.deferUpdate();
                    collector.stop();
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
        }

        async function handleMultiDismantle(dismantleAllList, dismantleOneList, leaveOneList) {
            let rawMaterialDrops = [];
            for (const item of dismantleAllList) {
                console.log(basicInfoForm('CHECKING dismantleAllList'));
                const returnedMatList = await dismantleAll(item, true);
                if (returnedMatList !== 'Failure: 0' || returnedMatList !== 'Failure: 1') {
                    rawMaterialDrops = rawMaterialDrops.concat(returnedMatList);
                    console.log(successResult('RawMaterialDrops found! Length of array during dismantleAllList: ', rawMaterialDrops.length));
                }
            }

            console.log(successResult('RawMaterialDrops found! Length of array after dismantleAllList: ', rawMaterialDrops.length));
            //This runs through the list of items with exactly 2 amount
            for (const item of dismantleOneList) {
                console.log(basicInfoForm('CHECKING dismantleOneList'));
                const returnedMatList = await dismantleOne(item, true);
                if (returnedMatList !== 'Failure: 0' || returnedMatList !== 'Failure: 1') {
                    rawMaterialDrops = rawMaterialDrops.concat(returnedMatList);
                }
            }

            console.log(successResult('RawMaterialDrops found! Length of array after dismantleOneList: ', rawMaterialDrops.length));

            for (const item of leaveOneList) {
                console.log(basicInfoForm('CHECKING leaveOneList'));
                const returnedMatList = await leaveOne(item, true);
                if (returnedMatList !== 'Failure: 0' || returnedMatList !== 'Failure: 1') {
                    rawMaterialDrops = rawMaterialDrops.concat(returnedMatList);
                }
            }

            console.log(successResult('RawMaterialDrops found! Length of array after leaveOneList: ', rawMaterialDrops.length));

            let tmpTransferCopy = [];
            let finalMaterialDrops = [];
            for (const material of rawMaterialDrops) {
                tmpTransferCopy = [];
                console.log(basicInfoForm(`Checking material: ${material.Name} with amount: ${material.NewAmount}`));
                tmpTransferCopy.push(material);

                var newMat = true;
                for (const copyCheck of finalMaterialDrops) {
                    if (copyCheck.Name === tmpTransferCopy[0].Name) {
                        newMat = false;
                        console.log(basicInfoForm('DupeMat'));
                        copyCheck.NewAmount += tmpTransferCopy[0].NewAmount;
                        break;
                    }
                }

                if (newMat === true) {
                    finalMaterialDrops.push(tmpTransferCopy[0]);

                    const user = await grabUser();

                    await findOwnedMaterial(material, user, material.MatType);
                }
            }

            let embedPages = [];

            let curRun = 0;
            for (const newMaterial of finalMaterialDrops) {
                const matListedDisplay = `Value: ${newMaterial.Value}\nMaterial Type: **${newMaterial.MatType}**\nRarity: ${newMaterial.Rarity}\nAmount: ${newMaterial.NewAmount}`;
                const matColour = await grabColour(newMaterial.Rar_id);

                const embed = {
                    title: '~Material Dropped~',
                    color: matColour,
                    fields: [{
                        name: `${newMaterial.Name}`,
                        value: matListedDisplay,
                    }],
                };
                embedPages.push(embed);
                if (embedPages.length === finalMaterialDrops.length) break;
                curRun++;
                if (curRun === finalMaterialDrops.length) break;
            }

            return embedPages;
        }

        async function dismantleOne(item, fromMulti) {
            const itemID = item.loot_id;

            const itemTypes = await findLootTypes(itemID);
            if (itemTypes === 'NONE') return 'Failure: 0';
            console.log(specialInfoForm(`Items material types: ${itemTypes}`));

            let finalMatsList = [];

            let matsToDropList = [];
            let passTypes = [];
            let breakFailSafe = 0;
            for (const materialType of itemTypes) {
                const typeToPass = `${materialType}`;
                passTypes.push(typeToPass);


                let foundMaterialList = [];
                foundMaterialList = await findMaterialList(materialType);
                if (foundMaterialList === 'NONE') break;
                console.log(specialInfoForm('Current material Prefab list first entry name: \n', foundMaterialList[0].Name));

                let checkEqualRar = [];
                checkEqualRar = foundMaterialList.filter(mat => mat.Rar_id === item.rar_id);               
                if (checkEqualRar.length <= 0) {
                    let backChecking = (item.rar_id - 1);
                    let backBreak = false;
                    do {
                        let breakPoint = 0;
                        for (const matFab of foundMaterialList) {
                            if (matFab.Rar_id > item.rar_id) {
                                //Ignore
                                breakPoint++;
                            } else if (matFab.Rar_id === backChecking) {
                                //Found
                                matsToDropList.push(matFab);
                                backBreak = true;
                                break;
                            } else {
                                //Ignore
                                breakPoint++;
                            }
                            if (breakPoint === foundMaterialList.length) break;
                        }
                        if (backBreak === true) break;
                        backChecking--;
                    } while (backChecking !== -1)
                } else {
                    console.log(specialInfoForm('Comp equal rar check list: \n', checkEqualRar[0].Name));
                    matsToDropList.push(checkEqualRar[0]);
                }

                if (matsToDropList.length === itemTypes.length) break;
                breakFailSafe++;
                if (breakFailSafe === itemTypes.length) break;
            }

            if (matsToDropList.length !== itemTypes.length) return 'Failure: 1';

            let tmpMatCopy = [];
            breakFailSafe = 0;
            let matPassRun = 0;
            for (const material of matsToDropList) {
                let droppedNum = 1;
                droppedNum += Math.floor(((item.value / matsToDropList.length) / material.Value));

                tmpMatCopy.push(material);

                if (fromMulti === true) {
                    const mappedMaterial = tmpMatCopy.map(mat => ({ ...mat, NewAmount: droppedNum, MatType: passTypes[matPassRun] }),);

                    finalMatsList.push(...mappedMaterial);

                    tmpMatCopy = [];
                    if (finalMatsList.length === matsToDropList.length) break;
                    breakFailSafe++;
                    matPassRun++;
                    if (breakFailSafe === matsToDropList.length) break;
                } else {
                    const mappedMaterial = tmpMatCopy.map(mat => ({ ...mat, NewAmount: droppedNum }),);

                    finalMatsList.push(...mappedMaterial);

                    tmpMatCopy = [];
                    if (finalMatsList.length === matsToDropList.length) break;
                    breakFailSafe++;
                    if (breakFailSafe === matsToDropList.length) break;
                }
            }

            console.log(specialInfoForm(`Final mats list length: ${finalMatsList.length}`));

            if (fromMulti === true) {
                const user = await grabUser();
                let minusOne = item.amount - 1;
                if (minusOne <= 0) {
                    //Destroy entry
                    const newItemTotal = user.totitem - 1;
                    const updateUserTotal = await UserData.update({ totitem: newItemTotal }, { where: { userid: user.userid } });
                    if (updateUserTotal > 0) console.log(successResult('Item total reduced successfully!'));

                    const destroyItem = await LootStore.destroy({ where: [{ spec_id: user.userid }, { loot_id: item.loot_id }] });
                    if (destroyItem > 0) console.log(successResult('Item entry destroyed successfully!'));
                } else {
                    const updateItemTotal = await LootStore.update({ amount: minusOne }, { where: [{ spec_id: user.userid }, { loot_id: item.loot_id }] });
                    if (updateItemTotal > 0) console.log(successResult('LootStore Item amount reduced!'));
                }
                return finalMatsList;
            } else {
                const user = await grabUser();

                let embedPages = [];

                let curRun = 0;
                for (const newMaterial of finalMatsList) {
                    const matCallback = await findOwnedMaterial(newMaterial, user, passTypes[curRun]);

                    const matListedDisplay = `Value: ${matCallback.value}\nMaterial Type: **${passTypes[curRun]}**\nRarity: ${matCallback.rarity}\nAmount: ${finalMatsList[curRun].NewAmount}`;
                    const matColour = await grabColour(matCallback.rar_id);

                    const embed = {
                        title: '~Material Dropped~',
                        color: matColour,
                        fields: [{
                            name: `${matCallback.name}`,
                            value: matListedDisplay,
                        }],
                    };
                    embedPages.push(embed);
                    if (embedPages.length === finalMatsList.length) break;
                    curRun++;
                    if (curRun === finalMatsList.length) break;
                }

                let minusOne = item.amount - 1;
                if (minusOne <= 0) {
                    //Destroy entry
                    const newItemTotal = user.totitem - 1;
                    const updateUserTotal = await UserData.update({ totitem: newItemTotal }, { where: { userid: user.userid } });
                    if (updateUserTotal > 0) console.log(successResult('Item total reduced successfully!'));

                    const destroyItem = await LootStore.destroy({ where: [{ spec_id: user.userid }, { loot_id: item.loot_id }] });
                    if (destroyItem > 0) console.log(successResult('Item entry destroyed successfully!'));
                } else {
                    const updateItemTotal = await LootStore.update({ amount: minusOne }, { where: [{ spec_id: user.userid }, { loot_id: item.loot_id }] });
                    if (updateItemTotal > 0) console.log(successResult('LootStore Item amount reduced!'));
                }

                return embedPages;
            }
        }

        async function leaveOne(item, fromMulti) {
            const itemID = item.loot_id;

            const itemTypes = await findLootTypes(itemID);
            if (itemTypes === 'NONE') return 'Failure: 0';
            console.log(specialInfoForm(`Items material types: ${itemTypes}`));

            const multVal = item.amount - 1;

            let finalMatsList = [];

            let matsToDropList = [];
            let passTypes = [];
            let breakFailSafe = 0;
            for (const materialType of itemTypes) {
                const typeToPass = `${materialType}`;
                passTypes.push(typeToPass);


                let foundMaterialList = [];
                foundMaterialList = await findMaterialList(materialType);
                if (foundMaterialList === 'NONE') break;
                console.log(specialInfoForm('Current material Prefab list first entry name: \n', foundMaterialList[0].Name));

                let checkEqualRar = [];
                checkEqualRar = foundMaterialList.filter(mat => mat.Rar_id === item.rar_id);                
                if (checkEqualRar.length <= 0) {
                    let backChecking = (item.rar_id - 1);
                    let backBreak = false;
                    do {
                        let breakPoint = 0;
                        for (const matFab of foundMaterialList) {
                            if (matFab.Rar_id > item.rar_id) {
                                //Ignore
                                breakPoint++;
                            } else if (matFab.Rar_id === backChecking) {
                                //Found
                                matsToDropList.push(matFab);
                                backBreak = true;
                                break;
                            } else {
                                //Ignore
                                breakPoint++;
                            }
                            if (breakPoint === foundMaterialList.length) break;
                        }
                        if (backBreak === true) break;
                        backChecking--;
                    } while (backChecking !== -1)
                } else {
                    console.log(specialInfoForm('Comp equal rar check list: \n', checkEqualRar[0].Name));
                    matsToDropList.push(checkEqualRar[0]);
                }

                if (matsToDropList.length === itemTypes.length) break;
                breakFailSafe++;
                if (breakFailSafe === itemTypes.length) break;
            }

            if (matsToDropList.length !== itemTypes.length) return 'Failure: 1';

            let tmpMatCopy = [];
            breakFailSafe = 0;
            let matPassRun = 0;
            for (const material of matsToDropList) {
                let droppedNum = 1;
                droppedNum += Math.floor(((item.value / matsToDropList.length) / material.Value));

                droppedNum *= multVal;

                tmpMatCopy.push(material);
                if (fromMulti === true) {
                    const mappedMaterial = tmpMatCopy.map(mat => ({ ...mat, NewAmount: droppedNum, MatType: passTypes[matPassRun] }),);

                    finalMatsList.push(...mappedMaterial);

                    tmpMatCopy = [];
                    if (finalMatsList.length === matsToDropList.length) break;
                    breakFailSafe++;
                    matPassRun++;
                    if (breakFailSafe === matsToDropList.length) break;
                } else {
                    const mappedMaterial = tmpMatCopy.map(mat => ({ ...mat, NewAmount: droppedNum }),);

                    finalMatsList.push(...mappedMaterial);

                    tmpMatCopy = [];
                    if (finalMatsList.length === matsToDropList.length) break;
                    breakFailSafe++;
                    if (breakFailSafe === matsToDropList.length) break;
                }
            }

            console.log(specialInfoForm(`Final mats list length: ${finalMatsList.length}`));

            if (fromMulti === true) {
                const user = await grabUser();
                let minusOne = 1;
                if (minusOne <= 0) {
                    //Destroy entry
                    const newItemTotal = user.totitem - 1;
                    const updateUserTotal = await UserData.update({ totitem: newItemTotal }, { where: { userid: user.userid } });
                    if (updateUserTotal > 0) console.log(successResult('Item total reduced successfully!'));

                    const destroyItem = await LootStore.destroy({ where: [{ spec_id: user.userid }, { loot_id: item.loot_id }] });
                    if (destroyItem > 0) console.log(successResult('Item entry destroyed successfully!'));
                } else {
                    const updateItemTotal = await LootStore.update({ amount: minusOne }, { where: [{ spec_id: user.userid }, { loot_id: item.loot_id }] });
                    if (updateItemTotal > 0) console.log(successResult('LootStore Item amount reduced!'));
                }
                return finalMatsList;
            } else {
                const user = await grabUser();

                let embedPages = [];

                let curRun = 0;
                for (const newMaterial of finalMatsList) {
                    const matCallback = await findOwnedMaterial(newMaterial, user, passTypes[curRun]);

                    const matListedDisplay = `Value: ${matCallback.value}\nMaterial Type: **${passTypes[curRun]}**\nRarity: ${matCallback.rarity}\nAmount: ${finalMatsList[curRun].NewAmount}`;
                    const matColour = await grabColour(matCallback.rar_id);

                    const embed = {
                        title: '~Material Dropped~',
                        color: matColour,
                        fields: [{
                            name: `${matCallback.name}`,
                            value: matListedDisplay,
                        }],
                    };
                    embedPages.push(embed);
                    if (embedPages.length === finalMatsList.length) break;
                    curRun++;
                    if (curRun === finalMatsList.length) break;
                }

                let minusOne = 1;
                if (minusOne <= 0) {
                    //Destroy entry
                    const newItemTotal = user.totitem - 1;
                    const updateUserTotal = await UserData.update({ totitem: newItemTotal }, { where: { userid: user.userid } });
                    if (updateUserTotal > 0) console.log(successResult('Item total reduced successfully!'));

                    const destroyItem = await LootStore.destroy({ where: [{ spec_id: user.userid }, { loot_id: item.loot_id }] });
                    if (destroyItem > 0) console.log(successResult('Item entry destroyed successfully!'));
                } else {
                    const updateItemTotal = await LootStore.update({ amount: minusOne }, { where: [{ spec_id: user.userid }, { loot_id: item.loot_id }] });
                    if (updateItemTotal > 0) console.log(successResult('LootStore Item amount reduced!'));
                }

                return embedPages;
            }
        }

        async function dismantleAll(item, fromMulti) {
            const itemID = item.loot_id;

            const itemTypes = await findLootTypes(itemID);
            if (itemTypes === 'NONE') return 'Failure: 0';
            console.log(specialInfoForm(`Items material types: ${itemTypes}`));

            const multVal = item.amount;

            let finalMatsList = [];

            let matsToDropList = [];
            let passTypes = [];
            let breakFailSafe = 0;
            for (const materialType of itemTypes) {
                const typeToPass = `${materialType}`;
                passTypes.push(typeToPass);


                let foundMaterialList = [];
                foundMaterialList = await findMaterialList(materialType);
                if (foundMaterialList === 'NONE') break;
                console.log(specialInfoForm('Current material Prefab list first entry name: \n', foundMaterialList[0].Name));

                let checkEqualRar = [];
                checkEqualRar = foundMaterialList.filter(mat => mat.Rar_id === item.rar_id);
                if (checkEqualRar.length <= 0) {
                    let backChecking = (item.rar_id - 1);
                    let backBreak = false;
                    do {
                        let breakPoint = 0;
                        for (const matFab of foundMaterialList) {
                            if (matFab.Rar_id > item.rar_id) {
                                //Ignore
                                breakPoint++;
                            } else if (matFab.Rar_id === backChecking) {
                                //Found
                                matsToDropList.push(matFab);
                                console.log(specialInfoForm('After Comp mat that dropped: \n', matFab.Name));
                                backBreak = true;
                                break;
                            } else {
                                //Ignore
                                breakPoint++;
                            }
                            if (breakPoint === foundMaterialList.length) break;
                        }
                        if (backBreak === true) break;
                        backChecking--;
                    } while (backChecking !== -1)
                } else {
                    console.log(basicInfoForm('Comp checkEqualRar list: \n', checkEqualRar[0].Name));
                    matsToDropList.push(checkEqualRar[0]);
                }

                if (matsToDropList.length === itemTypes.length) break;
                breakFailSafe++;
                if (breakFailSafe === itemTypes.length) break;
            }

            if (matsToDropList.length !== itemTypes.length) return 'Failure: 1';

            let tmpMatCopy = [];
            breakFailSafe = 0;
            let matPassRun = 0;
            for (const material of matsToDropList) {
                let droppedNum = 1;
                droppedNum += Math.floor(((item.value / matsToDropList.length) / material.Value));

                droppedNum *= multVal;

                tmpMatCopy.push(material);
                if (fromMulti === true) {
                    //console.log(successResult(passTypes[matPassRun]));
                    const mappedMaterial = tmpMatCopy.map(mat => ({ ...mat, NewAmount: droppedNum, MatType: passTypes[matPassRun] }),);

                    finalMatsList.push(...mappedMaterial);
                    //console.log(finalMatsList[(finalMatsList.length - 1)].MatType);
                    tmpMatCopy = [];
                    if (finalMatsList.length === matsToDropList.length) break;
                    breakFailSafe++;
                    matPassRun++;
                    if (breakFailSafe === matsToDropList.length) break;
                } else {
                    const mappedMaterial = tmpMatCopy.map(mat => ({ ...mat, NewAmount: droppedNum }),);

                    finalMatsList.push(...mappedMaterial);

                    tmpMatCopy = [];
                    if (finalMatsList.length === matsToDropList.length) break;
                    breakFailSafe++;
                    if (breakFailSafe === matsToDropList.length) break;
                }
            }

            console.log(specialInfoForm(`Final mats list length: ${finalMatsList.length}`));

            if (fromMulti === true) {
                const user = await grabUser();
                let minusOne = 0;
                if (minusOne <= 0) {
                    //Destroy entry
                    const newItemTotal = user.totitem - 1;
                    const updateUserTotal = await UserData.update({ totitem: newItemTotal }, { where: { userid: user.userid } });
                    if (updateUserTotal > 0) console.log(successResult('Item total reduced successfully!'));

                    const destroyItem = await LootStore.destroy({ where: [{ spec_id: user.userid }, { loot_id: item.loot_id }] });
                    if (destroyItem > 0) console.log(successResult('Item entry destroyed successfully!'));
                } else {
                    const updateItemTotal = await LootStore.update({ amount: minusOne }, { where: [{ spec_id: user.userid }, { loot_id: item.loot_id }] });
                    if (updateItemTotal > 0) console.log(successResult('LootStore Item amount reduced!'));
                }
                return finalMatsList;
            } else {
                const user = await grabUser();

                let embedPages = [];

                let curRun = 0;
                for (const newMaterial of finalMatsList) {
                    const matCallback = await findOwnedMaterial(newMaterial, user, passTypes[curRun]);

                    const matListedDisplay = `Value: ${matCallback.value}\nMaterial Type: **${passTypes[curRun]}**\nRarity: ${matCallback.rarity}\nAmount: ${finalMatsList[curRun].NewAmount}`;
                    const matColour = await grabColour(matCallback.rar_id);

                    const embed = {
                        title: '~Material Dropped~',
                        color: matColour,
                        fields: [{
                            name: `${matCallback.name}`,
                            value: matListedDisplay,
                        }],
                    };
                    embedPages.push(embed);
                    if (embedPages.length === finalMatsList.length) break;
                    curRun++;
                    if (curRun === finalMatsList.length) break;
                }

                let minusOne = 0;
                if (minusOne <= 0) {
                    //Destroy entry
                    const newItemTotal = user.totitem - 1;
                    const updateUserTotal = await UserData.update({ totitem: newItemTotal }, { where: { userid: user.userid } });
                    if (updateUserTotal > 0) console.log(successResult('Item total reduced successfully!'));

                    const destroyItem = await LootStore.destroy({ where: [{ spec_id: user.userid }, { loot_id: item.loot_id }] });
                    if (destroyItem > 0) console.log(successResult('Item entry destroyed successfully!'));
                } else {
                    const updateItemTotal = await LootStore.update({ amount: minusOne }, { where: [{ spec_id: user.userid }, { loot_id: item.loot_id }] });
                    if (updateItemTotal > 0) console.log(successResult('LootStore Item amount reduced!'));
                }

                return embedPages;
            }

            
        }


        async function displayMaterialGain(embedPages) {
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

            const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

            const filter = (ID) => ID.user.id === interaction.user.id;

            const collector = embedMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time: 300000,
            });

            var currentPage = 0;

            collector.on('collect', async (collInteract) => {
                if (collInteract.customId === 'next-page') {
                    await collInteract.deferUpdate();
                    if (currentPage === embedPages.length - 1) {
                        currentPage = 0;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    } else {
                        currentPage += 1;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    }
                }

                if (collInteract.customId === 'back-page') {
                    await collInteract.deferUpdate();
                    if (currentPage === 0) {
                        currentPage = embedPages.length - 1;
                        await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                    } else {
                        currentPage -= 1;
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
                    embedMsg.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }
            });
        }

        async function findLootTypes(itemID) {
            const itemRef = lootList.filter(item => item.Loot_id === itemID);
            if (itemRef.length <= 0) return 'NONE';
            let dismTypes = [];
            dismTypes = itemRef[0].DismantleTypes;
            return dismTypes;
        }

        async function findMaterialList(matType) {
            let listStr = `${matType}List.json`;
            console.log(specialInfoForm(`Currently checking ${listStr}`));
            const matListRef = require(`../../events/Models/json_prefabs/materialLists/${listStr}`);
            if (!matListRef) return 'NONE';
            return matListRef;
        }

        async function findOwnedMaterial(material, user, passType) {
            const hasMat = await MaterialStore.findOne({ where: [{ spec_id: user.userid }, { mat_id: material.Mat_id }, {mattype: passType}] });
            if (hasMat) {
                //Update material amount!
                console.log(basicInfoForm('ATTEMPTING TO UPDATE ENTRY'));
                const addAmount = hasMat.amount + material.NewAmount;
                const matUpdate = await MaterialStore.update({
                    amount: addAmount,
                }, { where: [{ spec_id: user.userid }, { mat_id: material.Mat_id }, { mattype: passType }]});
                if (matUpdate > 0) {
                    console.log(successResult('Material entry updated!'));
                    const returnMat = await MaterialStore.findOne({ where: [{ spec_id: user.userid }, { mat_id: material.Mat_id }, { mattype: passType }] });
                    return returnMat;
                }
            } else {
                //Create material @ amount!
                console.log(basicInfoForm('ATTEMPTING TO CREATE ENTRY'));
                await MaterialStore.create({
                    name: material.Name,
                    value: material.Value,
                    mattype: passType,
                    mat_id: material.Mat_id,
                    rarity: material.Rarity,
                    rar_id: material.Rar_id,
                    amount: material.NewAmount,
                    spec_id: user.userid,
                });
                const returnMat = await MaterialStore.findOne({ where: [{ spec_id: user.userid }, { mat_id: material.Mat_id }, { mattype: passType }] });
                console.log(successResult('Material entry created!'));
                return returnMat;
            }
        }

        async function grabUser() {
            const theUser = await UserData.findOne({ where: { userid: interaction.user.id } });
            if (theUser) return theUser;
        }
        */
	},
};
