const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder } = require("discord.js");
const { spendUserCoins } = require("../../Development/Export/uni_userPayouts");
const { checkOutboundItem, checkOutboundTownMat, checkOutboundMat } = require("../../Development/Export/itemMoveContainer");
const { LocalMarkets, Town, ItemLootPool } = require("../../../dbObjects");
const { loadFullRarNameList, checkingRar, checkingSlot } = require("../../Development/Export/itemStringCore");
const { makeCapital } = require("../../../uniHelperFunctions");

// ==================
//   Order Handling
// ==================

/**
 * This function handles creating a new buy order, updating the entities coins as needed, 
 * and then displays the order created upon completion.
 * @param {object} buyOrderObject 
 * @returns {Promise <EmbedBuilder>}
 */
async function handleBuyOrderSetup(buyOrderObject){
    buyOrderObject.isCrafted = false;
    await generateNewOrder(buyOrderObject);

    await spendUserCoins(buyOrderObject.perUnitPrice * buyOrderObject.amount, buyOrderObject.target);

    const buyOrderEmbed = new EmbedBuilder()
    .setTitle('== Buy Order Created ==')
    .setDescription(`Your buy order for **${buyOrderObject.amount} ${buyOrderObject.item.name}** at **${buyOrderObject.perUnitPrice}**c was successfully added!`);

    return buyOrderEmbed;
}

/**
 * This function handles creating a new sell order, updating the applicable item amounts owned,
 * and then displays the order created upon completion.
 * @param {object} sellOrderObject Complete Order Detail Object
 * @returns {Promise <EmbedBuilder>}
 */
async function handleSellOrderSetup(sellOrderObject){
    // const orderObj = await generateNewOrder(sellOrderObject);
    const finalOrder = await generateNewOrder(sellOrderObject);
    console.log('Final Sell Order Value Per Unit: %d', finalOrder.dataValues.listed_value);

    // Handle item transfers
    switch(sellOrderObject.itemType){
        case "Gear":
            // OutboundItem
            await checkOutboundItem(sellOrderObject.targetID, sellOrderObject.itemID, sellOrderObject.amount);
        break;
        default:
            // OutboundMaterial
            if (sellOrderObject.targetType === 'town'){
                await checkOutboundTownMat(sellOrderObject.targetID, sellOrderObject.item, sellOrderObject.itemType, sellOrderObject.amount);
            } else await checkOutboundMat(sellOrderObject.targetID, sellOrderObject.item, sellOrderObject.itemType, sellOrderObject.amount);
        break;
    }

    // Handle matching buy orders?

    // Handle display embed
    const sellOrderEmbed = new EmbedBuilder()
    .setTitle('== Sell Order Created ==')
    .setDescription(`Your sell order for **${sellOrderObject.amount}** **${sellOrderObject.item.name}** at **${sellOrderObject.perUnitPrice}**c was successfully added!`);

    return sellOrderEmbed;
}

/**
 * This function handles creating a new sale order in the LocalMarkets table,
 * based on the data provided with ``tradeObj``
 * @param {object} tradeObj Trade Order Detail Object
 * @returns {Promise <object>} Newly created Order Object
 */
async function generateNewOrder(tradeObj){
    //console.log(`Outcomes from selling order: \n\nCrafted Object?: ${tradeObj.isCrafted}\nItem_Code: ${tradeObj.item.item_code}\n\n`);
    const newOrder = await LocalMarkets.create({
        guildid: tradeObj.interRef.guild.id,
        target_type: tradeObj.targetType,
        target_id: tradeObj.targetID,
        sale_type: tradeObj.orderType,
        item_type: tradeObj.itemType,
        item_id: tradeObj.itemID,
        item_name: tradeObj.item.name ?? tradeObj.item.Name,
        item_rar: tradeObj.rarity,
        item_caste: tradeObj.item.caste_id ?? 0,
        item_code: (tradeObj.itemType === 'Gear') ? tradeObj.item.item_code : 'None',
        listed_value: tradeObj.perUnitPrice,
        amount_left: tradeObj.amount
    }).then(async o => await o.save()).then(async o => {return await o.reload()});

    await updateOrderExpireTime(newOrder);

    return newOrder;
}

/**
 * This function handles updating the expiry date for the given order,
 * based on the most recently made update.
 * @param {object} order LocalMarkets DB Instance Object
 * @returns {Promise <void>}
 */
async function updateOrderExpireTime(order){
    const lastUpdate = new Date(order.updatedAt);
    const expires = lastUpdate.setDate(lastUpdate.getDate() + 25);
    await order.update({expires_at: expires}).then(async o => await o.save()).then(async o => {return await o.reload()});
    return;
}

// =================
//  Misc. Helper Fn
// =================

/**
 * This function handles locating, and checking the users towns permissions,
 * if the given user has permissions returns ``true`` otherwise returns ``false``.
 * @param {object} user UserData DB Object
 * @returns {Promise <boolean>}
 */
async function checkUserTownPerms(user){
    if (user.townid !== '0'){
        const town = await Town.findOne({where: {townid: user.townid}});
        if (town){
            const townPermList = town.can_edit.split(',');
            if (townPermList.includes(user.userid)) return true;
            return false;
        } else return false;
    } else return false;
}

// ==================
//   Buy Order Menu
// ==================

/**
 * This function loads the trade-as type option buttons, disabling the town option if:
 * 
 * the given user is lacking permissions, the town does not exist, or the user has no town.
 * @param {object} user UserData DB Object
 * @returns {Promise <ActionRowBuilder[ButtonBuilder]>}
 */
async function loadAsButts(user){
    const hideTown = await checkUserTownPerms(user);
    
    const townButt = new ButtonBuilder()
    .setCustomId('as-town')
    .setStyle(ButtonStyle.Primary)
    .setDisabled((hideTown) ? false : true) // Inverse of function outcome
    .setLabel('Trade As Town');

    const userButt = new ButtonBuilder()
    .setCustomId('as-user')
    .setStyle(ButtonStyle.Primary)
    .setLabel('Trade As User');

    const asButtRow = new ActionRowBuilder().addComponents(townButt, userButt);

    return asButtRow;
}

/**
 * This function creates the sale type button menus buttons.
 * @returns {ActionRowBuilder[ButtonBuilder]}
 */
function loadSaleButts(){
    const buyButt = new ButtonBuilder()
    .setCustomId('view-buy')
    .setStyle(ButtonStyle.Primary)
    .setLabel('View Buy Orders');

    const sellButt = new ButtonBuilder()
    .setCustomId('view-sell')
    .setStyle(ButtonStyle.Primary)
    .setLabel('View Sell Orders');

    const backButt = new ButtonBuilder()
    .setCustomId('back-sale')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Go Back');

    const buttRow = new ActionRowBuilder().addComponents(backButt, buyButt, sellButt);

    return buttRow;
}

/**
 * This function loads the item type options given the trading inventory type
 * @param {string} tradeAs Either "town" | "user"
 * @returns {[ActionRowBuilder[ButtonBuilder]]}
 */
function loadTypeButts(tradeAs){
    const backButt = new ButtonBuilder()
    .setCustomId('back-type')
    .setStyle(ButtonStyle.Primary)
    .setLabel('Go Back');

    const wepButt = new ButtonBuilder()
    .setCustomId('mainhand')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Mainhand');

    const shieldButt = new ButtonBuilder()
    .setCustomId('offhand')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Offhand');

    const helmButt = new ButtonBuilder()
    .setCustomId('headslot')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Helmet');

    const chestButt = new ButtonBuilder()
    .setCustomId('chestslot')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Chestpiece');

    const legButt = new ButtonBuilder()
    .setCustomId('legslot')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Leggings');

    const matButt = new ButtonBuilder()
    .setCustomId('material')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Material');

    let rowOne = [], rowTwo = [];
    if (tradeAs === 'town'){
        rowOne = [backButt, matButt];
    } else {
        rowOne = [backButt, wepButt, shieldButt, helmButt, chestButt];
        rowTwo = [legButt, matButt];
    }

    // console.log(rowOne);
    // console.log(rowTwo);

    const buttRowOne = new ActionRowBuilder().addComponents(rowOne);
    const buttRowTwo = (rowTwo.length > 0) ? new ActionRowBuilder().addComponents(rowTwo) : [];

    // console.log(buttRowOne);
    // console.log(buttRowTwo);

    const finalRows = (rowTwo.length > 0) ? [buttRowOne, buttRowTwo]: [buttRowOne];

    return finalRows;
}

/**
 * This function constructs the string option menu for selecting a rarity.
 * Includes two rows, one for rarity select, another for a back button.
 * @returns {[ActionRowBuilder[StringSelectMenuBuilder], ActionRowBuilder[ButtonBuilder]]}
 */
function loadRarStringMenu(){
    const rarList = loadFullRarNameList(10);
    
    const stringOptionList = [];

    for (const rar of rarList){
        const option = new StringSelectMenuOptionBuilder()
        .setLabel(rar)
        .setDescription(`Buy @ ${rar} Rarity`)
        .setValue(rar);
        stringOptionList.push(option);
    }

    const rarStringMenu = new StringSelectMenuBuilder()
    .setCustomId('rar-picked')
    .setPlaceholder('Select one of the rarities provided!')
    .addOptions(stringOptionList);

    const rarMenuRow = new ActionRowBuilder().addComponents(rarStringMenu);

    const backButt = new ButtonBuilder()
    .setCustomId('back-rar')
    .setStyle(ButtonStyle.Primary)
    .setLabel('Go Back');

    const backButtRow = new ActionRowBuilder().addComponents(backButt);

    const finalRows = [rarMenuRow, backButtRow];

    return finalRows;
}

/**
 * This function loads confirm/cancel buttons for the given trade.
 * ID's as follows:
 * 
 * ``direction = give``
 * confirmButt: ``confirm-give``
 * cancelButt: ``cancel-give``
 * 
 * ``direction = take``
 * confirmButt: ``confirm-take``
 * cancelButt: ``cancel-take``
 * @param {string} direction User Confirming: ``give`` || ``take``
 * @returns {ActionRowBuilder<ButtonBuilder>}
 */
function loadConfirmButts(direction){
    const confirmButt = new ButtonBuilder()
    .setCustomId(`confirm-${direction}`)
    .setStyle(ButtonStyle.Primary)
    .setLabel('Confirm Trade!')
    .setEmoji('✅');

    const cancelButt = new ButtonBuilder()
    .setCustomId(`cancel-${direction}`)
    .setStyle(ButtonStyle.Secondary)
    .setLabel("Cancel Trade!")
    .setEmoji('❌');

    // ADD "MORE INFO" Button
    // This button will send an ephemeral message, 
    // containing an embed with additional info on the item being traded

    const confirmButtRow = new ActionRowBuilder().addComponents(confirmButt, cancelButt);

    return confirmButtRow;
}

/**
 * This function generates the item name selection menu according to the rarity and type of item 
 * requested.
 * @param {object} tradeObj 
 * @returns {Promise <[ActionRowBuilder[StringSelectMenuBuilder], ActionRowBuilder[ButtonBuilder]]>}
 */
async function loadNameStringMenu(tradeObj, materialFiles){
    let fullRefMatchList;

    switch(tradeObj.itemType){
        case "material":
            fullRefMatchList = handleMatNameLoad(tradeObj, materialFiles);
        break;
        default:
            fullRefMatchList = await handleItemNameLoad(tradeObj);
        break;
    }

    const backButt = new ButtonBuilder()
    .setCustomId('back-name')
    .setStyle(ButtonStyle.Primary)
    .setLabel('Go Back');

    const nameSelectMenu = new StringSelectMenuBuilder()
    .setCustomId('item-name')
    .setPlaceholder('Select one of the following items.')

    const optionsList = [];
    if (fullRefMatchList.length !== 0){
        for (const match of fullRefMatchList){
            const optionDesc = (match.type) ? `${tradeObj.rarity} ${match.type} Material`: `${tradeObj.rarity} ${tradeObj.itemType}`;
            const option = new StringSelectMenuOptionBuilder()
            .setLabel(match.name)
            .setDescription(optionDesc)
            .setValue(`{"name": "${match.name}", "value": ${match.value}}`); // , "ref": ${match}
            optionsList.push(option);
        }

        nameSelectMenu.addOptions(optionsList);

        const nameSelectRow = new ActionRowBuilder().addComponents(nameSelectMenu);

        const backButtRow = new ActionRowBuilder().addComponents(backButt);

        const finalRows = [nameSelectRow, backButtRow];

        return finalRows;
    } else {
        backButt.setLabel('NO OPTIONS, GO BACK');

        const backButtRow = new ActionRowBuilder().addComponents(backButt);

        const finalRows = [backButtRow];

        return finalRows;
    }
}

/**
 * This function handles sorting through and returning all matching materials
 * given the rarity selected in ``tradeObj.rarity``
 * @param {object} tradeObj Trade Tracking Object
 * @returns {{type: string, name: string, matRef: object}}
 */
function handleMatNameLoad(tradeObj, materialFiles){
    // Filter each mat list grabbing matching rar_id names
    const matchList = [];
    for (const [key, value] of materialFiles){
        const matFileRef = require(value);
        let matMatch = matFileRef.filter(mat => mat.Rarity === tradeObj.rarity);
        if (matMatch.length === 0) continue;
        matMatch = matMatch[0];
        matchList.push({type: key, name: matMatch.Name, matRef: matMatch});
    }

    return matchList;
}

/**
 * This function filters through all mat lists for a matching Name with matName.
 * @param {string} matName Material Pointer Name
 * @returns {object}
 */
function handleMatNameFilter(matName, materialFiles){
    for (const [key, value] of materialFiles){
        const matFileRef = require(value);
        let matMatch = matFileRef.filter(mat => mat.Name === matName);
        if (matMatch.length === 0) continue;
        else return matMatch[0];
    }
}

/**
 * This function handles sorting through and returning all matching items,
 * given the rarity and slot selected in ``tradeObj``.
 * @param {object} tradeObj 
 * @returns {Promise <object[]>}
 */
async function handleItemNameLoad(tradeObj){
    const fullItemList = await ItemLootPool.findAll();

    const filterMatches = fullItemList.filter(item => checkingRar(item.item_code) === tradeObj.rarity && checkingSlot(item.item_code) === makeCapital(tradeObj.itemType));

    return filterMatches;
}

/**
 * This function filters for the item with name matching itemName
 * @param {string} itemName Item Point Name
 * @returns {Promise <object>}
 */
async function handleItemNameFilter(itemName){
    const itemMatch = await ItemLootPool.findOne({where: {name: itemName}});

    return itemMatch;
}

/**
 * This function loads the amount selection options to allow for specific 
 * amount choices.
 * @returns {[ActionRowBuilder[ButtonBuilder], ActionRowBuilder[ButtonBuilder]]}
 */
function loadAmountButts(){
    const backButt = new ButtonBuilder()
    .setCustomId('back-num')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Go Back');
    const confirmButt = new ButtonBuilder()
    .setCustomId('confirm-num')
    .setStyle(ButtonStyle.Success)
    .setLabel('Confirm Amount!');

    const plusFiveButt = new ButtonBuilder()
    .setCustomId('add-five')
    .setStyle(ButtonStyle.Primary)
    .setLabel('+5');
    const plusOneButt = new ButtonBuilder()
    .setCustomId('add-one')
    .setStyle(ButtonStyle.Primary)
    .setLabel('+1');

    

    const minusFiveButt = new ButtonBuilder()
    .setCustomId('minus-five')
    .setStyle(ButtonStyle.Primary)
    .setLabel('-5');
    const minusOneButt = new ButtonBuilder()
    .setCustomId('minus-one')
    .setStyle(ButtonStyle.Primary)
    .setLabel('-1');

    const outcomeRow = new ActionRowBuilder().addComponents(backButt, confirmButt);

    const amountRow = new ActionRowBuilder().addComponents(minusFiveButt, minusOneButt, plusOneButt, plusFiveButt);

    return [outcomeRow, amountRow];
}

/**
 * This function loads the advanced price option button menu list.
 * 
 * ## ``ControlIDS``
 * **Back** ``back-price``
 * **Confirm** ``confirm-price``
 * **Reset** ``reset-price``
 * 
 * ## ``PriceIDS``
 * 
 * ### ``RowOne``
 * 
 * ``add-ten-c``, ``add-one-c``, ``mult-ten-c``, ``minus-one-c``, ``minus-ten-c``
 * 
 * ### ``RowTwo``
 * 
 * ``add-100-c``, ``add-25-c``, ``mult-100-c``, ``minus-25-c``, ``minus-100-c``
 * 
 * ### ``RowThree``
 * 
 * ``add-10k-c``, ``add-1k-c``, ``mult-1k-c``, ``minus-1k-c``, ``minus-10k-c``
 * @returns {[ActionRowBuilder[ButtonBuilder], ActionRowBuilder[ButtonBuilder], ActionRowBuilder[ButtonBuilder], ActionRowBuilder[ButtonBuilder]]}
 */
function loadPriceButts(){
    // ===================
    // CONTROL ROW
    const backButt = new ButtonBuilder()
    .setCustomId('back-price')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Go Back');
    const confirmButt = new ButtonBuilder()
    .setCustomId('confirm-price')
    .setStyle(ButtonStyle.Success)
    .setLabel('Confirm Amount!');
    const resetButt = new ButtonBuilder()
    .setCustomId('reset-price')
    .setStyle(ButtonStyle.Danger)
    .setLabel('Reset Price to 0');

    const controlRow = new ActionRowBuilder().addComponents(backButt, confirmButt, resetButt);
    // ===================

    // ===================
    // ROW 1
    const plusTenButt = new ButtonBuilder()
    .setCustomId('add-ten-c')
    .setStyle(ButtonStyle.Primary)
    .setLabel('+10');
    const plusOneButt = new ButtonBuilder()
    .setCustomId('add-one-c')
    .setStyle(ButtonStyle.Primary)
    .setLabel('+1');

    const multTenButt = new ButtonBuilder()
    .setCustomId('mult-ten-c')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('x10');

    const minusTenButt = new ButtonBuilder()
    .setCustomId('minus-ten-c')
    .setStyle(ButtonStyle.Primary)
    .setLabel('-10');
    const minusOneButt = new ButtonBuilder()
    .setCustomId('minus-one-c')
    .setStyle(ButtonStyle.Primary)
    .setLabel('-1');

    const numRowOne = new ActionRowBuilder().addComponents(minusTenButt, minusOneButt, multTenButt, plusOneButt, plusTenButt);
    // ===================

    // ===================
    // ROW 2
    const plus25Butt = new ButtonBuilder()
    .setCustomId('add-25-c')
    .setStyle(ButtonStyle.Primary)
    .setLabel('+25');
    const plus100Butt = new ButtonBuilder()
    .setCustomId('add-100-c')
    .setStyle(ButtonStyle.Primary)
    .setLabel('+100');

    const mult100Butt = new ButtonBuilder()
    .setCustomId('mult-100-c')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('x100');

    const minus25Butt = new ButtonBuilder()
    .setCustomId('minus-25-c')
    .setStyle(ButtonStyle.Primary)
    .setLabel('-25');
    const minus100Butt = new ButtonBuilder()
    .setCustomId('minus-100-c')
    .setStyle(ButtonStyle.Primary)
    .setLabel('-100');

    const numRowTwo = new ActionRowBuilder().addComponents(minus100Butt, minus25Butt, mult100Butt, plus25Butt, plus100Butt);
    // ===================

    // ===================
    // ROW 3
    const plus1kButt = new ButtonBuilder()
    .setCustomId('add-1k-c')
    .setStyle(ButtonStyle.Primary)
    .setLabel('+1k');
    const plus10kButt = new ButtonBuilder()
    .setCustomId('add-10k-c')
    .setStyle(ButtonStyle.Primary)
    .setLabel('+10k');

    const mult1kButt = new ButtonBuilder()
    .setCustomId('mult-1k-c')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('x1k');

    const minus1kButt = new ButtonBuilder()
    .setCustomId('minus-1k-c')
    .setStyle(ButtonStyle.Primary)
    .setLabel('-1k');
    const minus10kButt = new ButtonBuilder()
    .setCustomId('minus-10k-c')
    .setStyle(ButtonStyle.Primary)
    .setLabel('-10k');

    const numRowThree = new ActionRowBuilder().addComponents(minus10kButt, minus1kButt, mult1kButt, plus1kButt, plus10kButt);
    // ===================

    const finalRows = [numRowOne, numRowTwo, numRowThree, controlRow];

    return finalRows;
}

/**
 * This function matches a button.customId to a useable number value and returns it.
 * @param {string} changeID ID for the price button selected
 * @returns {number}
 */
function handlePriceButtPicked(changeID){
    let numChange = 0;
    switch(changeID){
        case "add-one-c":
            numChange = 1;
        break;
        case "add-ten-c":
            numChange = 10;
        break;
        case "add-25-c":
            numChange = 25;
        break;
        case "add-100-c":
            numChange = 100;
        break;
        case "add-1k-c":
            numChange = 1000;
        break;
        case "add-10k-c":
            numChange = 10000;
        break;
        case "minus-one-c":
            numChange = -1;
        break;
        case "minus-ten-c":
            numChange = -10;
        break;
        case "minus-25-c":
            numChange = -25;
        break;
        case "minus-100-c":
            numChange = -100;
        break;
        case "minus-1k-c":
            numChange = -1000;
        break;
        case "minus-10k-c":
            numChange = -10000;
        break;
        case "mult-ten-c":
            numChange = 10;
        break;
        case "mult-100-c":
            numChange = 100;
        break;
        case "mult-1k-c":
            numChange = 1000;
        break;
    }

    return numChange;
}

/**
 * This function creates a single back button, its customId is set with backType:
 * 
 * ID: ``'back-${backType}'``
 * @param {string} backType Used to create the back buttons customId
 * @returns {ActionRowBuilder[]}
 */
function loadBasicBackButt(backType){
    const backButt = new ButtonBuilder()
    .setCustomId(`back-${backType}`)
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Go Back');

    const backButtRow = new ActionRowBuilder().addComponents(backButt);

    return backButtRow;
}

/**
 * This function returns **``ButtonBuilder[backButt, nextButt]``** and **NOT** an ``ActionRowBuilder[ButtonBuilder]``.
 * 
 * This is done to allow for row modifications to be made freely 
 * depending on the interactivity of the pages being cycled
 * @returns {ButtonBuilder[]}
 */
function createBasicPageButtons(){
    const backPageButt = new ButtonBuilder()
    .setLabel("Backward")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️')
    .setCustomId('back-page');

    const nextPageButt = new ButtonBuilder()
    .setLabel("Forward")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('▶️')
    .setCustomId('next-page');

    const pageButts = [backPageButt, nextPageButt];

    return pageButts;
}


module.exports = {
    handleBuyOrderSetup,
    handleSellOrderSetup,
    loadAsButts,
    loadSaleButts,
    loadTypeButts,
    loadRarStringMenu,
    loadConfirmButts,
    loadNameStringMenu,
    handleMatNameFilter,
    handleItemNameFilter,
    loadAmountButts,
    loadPriceButts,
    handlePriceButtPicked,
    loadBasicBackButt,
    createBasicPageButtons
}