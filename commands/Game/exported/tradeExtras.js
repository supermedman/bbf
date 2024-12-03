const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder } = require("discord.js");
const { spendUserCoins, updateUserCoins } = require("../../Development/Export/uni_userPayouts");
const { checkOutboundItem, checkOutboundTownMat, checkOutboundMat, checkInboundTownMat, moveMaterial, checkInboundMat, moveItem, checkInboundItem } = require("../../Development/Export/itemMoveContainer");
const { LocalMarkets, Town, ItemLootPool, GlobalMarkets } = require("../../../dbObjects");
const { Op } = require('sequelize');
const { loadFullRarNameList, checkingRar, checkingSlot, uni_displayItem } = require("../../Development/Export/itemStringCore");
const { makeCapital, grabUser, grabTown, sendTimedChannelMessage } = require("../../../uniHelperFunctions");

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

    const isGlobalOrder = buyOrderObject.orderType === 'Buy-Global';

    const generateUsing = (isGlobalOrder) ? generateNewGlobalOrder : generateNewOrder;

    // Auto format back to default sell value to allow continued usage of existing code
    // * Cause lazy
    buyOrderObject.orderType = 'Buy';

    const finalOrder = await generateUsing(buyOrderObject);

    const autoOutcome = await autofillOrderController(finalOrder, buyOrderObject, isGlobalOrder);
    console.log(autoOutcome);

    await spendUserCoins(buyOrderObject.perUnitPrice * buyOrderObject.amount, buyOrderObject.target);

    const buyOrderEmbed = new EmbedBuilder();

    let dynDesc = `Your buy order for **${buyOrderObject.amount} ${buyOrderObject.item.name ?? buyOrderObject.item.Name}** at **${buyOrderObject.perUnitPrice}**c was successfully added!`;

    if (['No Local Sell Orders', 'No Local Orders Passed Filtering'].includes(autoOutcome)){
        buyOrderEmbed
        .setTitle('== Buy Order Created ==')
        .setDescription(dynDesc);
    } else if (autoOutcome === 'Order Removed') {
        dynDesc += `\nThis order has been automatically filled by existing sell orders and you have recieved all items!!`;
        buyOrderEmbed
        .setTitle('== Buy Order Created & Completed ==')
        .setDescription(dynDesc);
    } else {
        dynDesc += `\nThis order has been partially filled by existing sell orders, you have recieved **${buyOrderObject.amount - autoOutcome.amount_left}** of the requested **${buyOrderObject.amount} ${buyOrderObject.item.name ?? buyOrderObject.item.Name}**. These items have been automatically added to the proper inventory!`;
        buyOrderEmbed
        .setTitle('== Buy Order Partially Filled ==')
        .setDescription(dynDesc);
    }
    
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

    const isGlobalOrder = sellOrderObject.orderType === 'Sell-Global';

    const generateUsing = (isGlobalOrder) ? generateNewGlobalOrder : generateNewOrder;

    // Auto format back to default sell value to allow continued usage of existing code
    // * Cause lazy
    sellOrderObject.orderType = 'Sell';

    const finalOrder = await generateUsing(sellOrderObject);
    console.log('Final Sell Order Value Per Unit: %d', finalOrder.dataValues.listed_value);

    const autoOutcome = await autofillOrderController(finalOrder, sellOrderObject, isGlobalOrder);
    console.log(autoOutcome);

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

    const sellOrderEmbed = new EmbedBuilder();

    let dynDesc = `Your sell order for **${sellOrderObject.amount}** **${sellOrderObject.item.name ?? sellOrderObject.item.Name}** at **${sellOrderObject.perUnitPrice}**c was successfully added!`;

    if (['No Local Buy Orders', 'No Local Orders Passed Filtering'].includes(autoOutcome)){
        sellOrderEmbed
        .setTitle('== Sell Order Created ==')
        .setDescription(dynDesc);
    } else if (autoOutcome === 'Order Removed') {
        dynDesc += `\nThis order has been automatically filled by existing buy orders and you have recieved all coins!!`;
        sellOrderEmbed
        .setTitle('== Sell Order Created & Completed ==')
        .setDescription(dynDesc);
    } else {
        dynDesc += `\nThis order has been partially filled by existing buy orders, you have sold **${sellOrderObject.amount - autoOutcome.amount_left}** of the posted **${sellOrderObject.amount} ${sellOrderObject.item.name ?? sellOrderObject.item.Name}**. The value gained from these sales has been automatically added to your coins!`;
        sellOrderEmbed
        .setTitle('== Sell Order Partially Filled ==')
        .setDescription(dynDesc);
    }

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


async function generateNewGlobalOrder(tradeObj){
    const newOrder = await GlobalMarkets.create({
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

/**
 * This function handles all the fucking lil order transfer baby shit stuff.
 * 
 * Im over it.. it works as intended :) It didnt :(
 * @param {object} order LocalMarket DB Instance Object
 * @param {object} target Extra Details Object ``{id: string, entity: object, type: string, itemRef: object}``
 * @param {number} amount Amount of items being moved
 * @returns {Promise <EmbedBuilder>}
 */
async function handleOrderTransfer(order, target, amount){
    let orderDesc = "Outcome of your transaction:";
    if (order.sale_type === 'Buy'){
        await updateUserCoins((order.listed_value * amount), target.entity);
        if (order.item_type === 'Gear'){
            await moveItem(target.id, order.target_id, order.item_id, amount);
        } else {
            if (order.target_type === 'town'){
                await checkInboundTownMat(order.target_id, target.itemRef, order.item_type, amount);
            } else {
                if (order.target_type === 'user' && target.type === 'user'){ // WONT WORK FOR INBOUND MATS FROM TOWN STORAGE!!!
                    await moveMaterial(target.id, order.target_id, target.itemRef, order.item_type, amount);
                } else { // Catches from town to user mat transfer case!
                    await checkInboundMat(order.target_id, target.itemRef, order.item_type, amount);
                    await checkOutboundTownMat(target.id, target.itemRef, order.item_type, amount);
                }
            }
        }
        orderDesc += `\nCoins Gained: ${order.listed_value * amount}c\nSold: ${amount} ${target.itemRef.name}`;
    } else {
        await spendUserCoins((order.listed_value * amount), target.entity);
        const payoutUser = (order.target_type === 'town') ? await grabTown(order.target_id) : await grabUser(order.target_id);
        await updateUserCoins((order.listed_value * amount), payoutUser);
        if (order.item_type === 'Gear'){
            if (!target.itemRef.unique_gen_id){
                await checkInboundItem(target.id, order.item_id, amount/*, craftedItem*/);
            } else await checkInboundItem(target.id, order.item_id, amount, target.itemRef); // HANDLE EXTRACTING CRAFTED ITEM OBJECT
        } else {
            if (order.target_type === 'town'){
                await checkInboundTownMat(target.id, target.itemRef, order.item_type, amount);
            } else {
                if (target.type === 'user'){ // WONT WORK FOR INBOUND TOWN STORAGE MATS!!!
                    await checkInboundMat(target.id, target.itemRef, order.item_type, amount);
                } else { // Catches to town mat transfer case!
                    await checkInboundTownMat(target.id, target.itemRef, order.item_type, amount);
                }
            }
        }
        orderDesc += `\nCoins Spent: ${order.listed_value * amount}c\nItems Gained: ${amount} ${target.itemRef.name}`;
    }

    // Update Order Details
    await order.decrement('amount_left', {by: amount}).then(async o => await o.save()).then(async o => {return await o.reload()});

    if (order.amount <= 0){
        // Order Filled!
        console.log('ORDER FILLED AND COMPLETED!!');
        await order.destroy();
    }

    const finalEmbed = new EmbedBuilder()
    .setTitle('== Trade Completed!! ==')
    .setDescription(orderDesc);

    return finalEmbed;
}

//   ~~==================~~
//  Background Order Filling
//   ~~==================~~

/**
 *  const buyOrderObject = {
        interRef: interaction,
        perUnitPrice: trackingObj.price,
        orderType: 'Buy',
        targetType: trackingObj.tradingAs,
        targetID: (trackingObj.tradingAs === 'town') ? trackingObj.tradeEntity.townid : trackingObj.tradeEntity.userid,
        target: trackingObj.tradeEntity,
        rarity: trackingObj.rarity,
        itemType: (trackingObj.itemType === 'material') ? trackingObj.matType : "Gear",
        itemID: (trackingObj.itemType === 'material') ? trackingObj.itemRef.Mat_id : trackingObj.itemRef.item_id,
        item: trackingObj.itemRef,
        amount: trackingObj.amount
    };

    const sellOrderObject = {
        interRef: interaction,
        perUnitPrice: listedValue,
        orderType: 'Sell',
        targetType: tradeAs,
        targetID: (tradeAs === 'town') ? theTown.townid : user.userid,
        target: (tradeAs === 'town') ? theTown : user,
        rarity: (itemType === 'Material') ? theItem.rarity : checkingRar(theItem.item_code),
        itemType: (itemType === 'Material') ? theItem.mattype : "Gear",
        itemID: (itemType === 'Material') ? theItem.mat_id : theItem.item_id,
        item: theItem,
        isCrafted: craftedItemStore,
        amount: moveAmount
    };
 */

/**
 * This function handles all AutoFilling filters and calculations for the given order object, 
 * 
 * it will refund any coins as needed, as well as payout any existing orders that are filled in the process.
 * @param {object} order LocalMarkets Instance Object created using ``infoObj`` data
 * @param {object} infoObj Buy/Sell Order Object used for order creation and handles
 * @returns {Promise <void>}
 */
async function autofillOrderController(order, infoObj, isGlobal=false){
    // IF NEW ORDER IS BUY ORDER
    // Sell order Vals to check 
    // ~===~              ~===~

    // == BASIC FILTERS ==
    // !! guildid !!
    // item_type: Gear | Material
    // - Gear: Exclude Crafted Gear orders, Exclude ``target_type: town`` orders
    // - Mats: Filter by item_type
    // item_rarity, item_id

    // == ADV. FILTERS ==
    // newOrder.listed_value >= foundOrder.listed_value === MATCH
    // - Sort value lowest to highest
    // - Fill orders after sorting until:
    //   1. newOrder.amount_left === 0
    //   2. foundOrderList.length === 0


    // IF NEW ORDER IS SELL ORDER
    // Buy order Vals to check 
    // ~===~             ~===~

    // == BASIC FILTERS ==
    // !! guildid !!
    // item_type: Gear | Material
    // - Gear: Exclude Crafted Gear orders, Exclude ``target_type: town`` orders
    // - Mats: Filter by item_type
    // item_rarity, item_id

    // == ADV. FILTERS ==
    // newOrder.listed_value <= foundOrder.listed_value === MATCH
    // - Sort value highest to lowest
    // - Fill orders after sorting until:
    //   1. newOrder.amount_left === 0
    //   2. foundOrderList.length === 0


    // Shared Order Filters
    // ~===~          ~===~

    // == BASIC FILTERS ==
    // !! guildid !!
    // !! sale_type !!
    // item_type: Gear | Material
    // - Gear: Exclude Crafted Gear orders, Exclude ``target_type: town`` orders
    // - Mats: Filter by item_type
    // item_rarity, item_id

    // == ADV. FILTERS ==
    // newOrder.listed_value <= foundOrder.listed_value === MATCH
    // - Fill orders after sorting until:
    //   1. newOrder.amount_left === 0
    //   2. foundOrderList.length === 0


    // Differed Order Filters
    // ~===~            ~===~

    // == ADV. FILTERS ==
    // - Sort BUY ORDER value highest to lowest
    // - Sort SELL ORDER value lowest to highest

    const inverseSaleType = (infoObj.orderType === 'Buy') ? "Sell" : "Buy"; 
    // Could also use ``{guildid: infoObj.interRef.guild.id}`` here.
    let localOrderFilterList = await LocalMarkets.findAll({where: {guildid: order.guildid, sale_type: inverseSaleType}});
    if (isGlobal){
        localOrderFilterList = await GlobalMarkets.findAll({ where: { sale_type: inverseSaleType } });
    }
    if (localOrderFilterList.length === 0) return `No Local ${inverseSaleType} Orders`;

    const sellPriceFilter = (checkVal) => checkVal >= order.listed_value;
    const buyPriceFilter = (checkVal) => checkVal <= order.listed_value;

    const usePriceFilter = (infoObj.orderType === 'Buy') ? buyPriceFilter : sellPriceFilter;

    if (infoObj.itemType !== 'Gear'){
        // Filter for Materials
        localOrderFilterList = localOrderFilterList.filter(o => o.item_type === order.item_type && o.rarity === order.rarity && o.item_id === order.item_id && usePriceFilter(o.listed_value));
    } else {
        localOrderFilterList = localOrderFilterList.filter(o => o.item_type === 'Gear' && o.rarity === order.rarity && o.item_id === order.item_id && usePriceFilter(o.listed_value));
    }

    if (localOrderFilterList.length === 0) return `No Local Orders Passed Filtering`;

    // Sell to the highest
    const sellSortBy = (a, b) => b.listed_value - a.listed_value;
    // Buy from the lowest
    const buySortBy = (a, b) => a.listed_value - b.listed_value;

    const useSortBy = (infoObj.orderType === 'Buy') ? buySortBy : sellSortBy;

    localOrderFilterList.sort(useSortBy);

    const oFillingObj = {
        baseNumLeft: order.amount_left,
        coins: {
            gain: 0,
            loss: 0,
            net: 0
        },
        items: {
            gain: 0,
            loss: 0
        },
        lastOrder: {
            oRef: "",
            numLeft: 0,
            numMoved: 0
        },
        filledOrders: []
    };

    for (const o of localOrderFilterList){
        const afterFillRemain = oFillingObj.baseNumLeft - o.amount_left;
        const numDiff = Math.sign(afterFillRemain);

        let loopAction = "Continue";
        switch(numDiff.toString()){
            case "1":
                // Order Remains, comp order filled: CONTINUE
                oFillingObj.baseNumLeft = afterFillRemain;
                oFillingObj.filledOrders.push(o);
                loopAction = "Continue";
            break;
            case "-1":
                // Order Exhausted, comp order remains: BREAK
                oFillingObj.lastOrder.oRef = o;
                oFillingObj.lastOrder.numLeft = Math.abs(afterFillRemain);
                oFillingObj.lastOrder.numMoved = o.amount_left - Math.abs(afterFillRemain);

                oFillingObj.baseNumLeft = 0;
                loopAction = "Break";
            break;
            case "0":
                // Exact Fill, both orders completed: BREAK
                oFillingObj.lastOrder.oRef = o;
                oFillingObj.lastOrder.numLeft = Math.abs(afterFillRemain);

                oFillingObj.baseNumLeft = 0;
                loopAction = "Break";
            break;
        }
        if (loopAction === 'Break') break;
        if (loopAction === 'Continue') continue;
    }

    if (oFillingObj.baseNumLeft > 0){
        // Order not completely filled!!
    }

    // All filled order payouts
    if (oFillingObj.filledOrders.length > 0){
        // Total up items/coins current order is paid out with.
        // if ``order`` is buy order: items.gain++, coins.loss++
        // if ``order`` is sell order: items.loss++, coins.gain++
        for (const o of oFillingObj.filledOrders){
            switch(infoObj.orderType){
                case "Buy":
                    oFillingObj.coins.loss += o.listed_value * o.amount_left;
                    oFillingObj.items.gain += o.amount_left;
                break;
                case "Sell":
                    oFillingObj.coins.gain += o.listed_value * o.amount_left;
                    oFillingObj.items.loss += o.amount_left;
                break;
            }
        }
    }

    // Last order compared against payouts
    if (oFillingObj.lastOrder.oRef !== ""){
        const o = oFillingObj.lastOrder.oRef;
        const lastNumMoved = oFillingObj.lastOrder.numMoved;
        switch(infoObj.orderType){
            case "Buy":
                oFillingObj.coins.loss += o.listed_value * lastNumMoved;
                oFillingObj.items.gain += lastNumMoved;
            break;
            case "Sell":
                oFillingObj.coins.gain += o.listed_value * lastNumMoved;
                oFillingObj.items.loss += lastNumMoved;
            break;
        }
    }

    // Base Expected Coin Transfer of Order
    const staticBaseCoinRate = order.listed_value * (order.amount_left - oFillingObj.baseNumLeft);
    let actualCoinRate;
    if (infoObj.orderType === 'Sell'){
        actualCoinRate = oFillingObj.coins.gain;
    } else {
        actualCoinRate = oFillingObj.coins.loss;
    }

    const coinRateDiff = staticBaseCoinRate - actualCoinRate;
    console.log(`${infoObj.orderType} Order, Difference in Coin Rate after order fills: %d`, coinRateDiff);
    oFillingObj.coins.net = staticBaseCoinRate - coinRateDiff;
    // coins.net === ``-num: SellOrder`` Made money, ``+num: BuyOrder`` Saved money

    // Handle Order Item Payouts
    if (oFillingObj.filledOrders.length > 0){
        for (const o of oFillingObj.filledOrders){
            await handleAutoFilledOrder(o, o.amount_left, infoObj.item);
        }
    }

    // Handle Final Order checked
    if (oFillingObj.lastOrder.oRef !== "") await handleAutoFilledOrder(oFillingObj.lastOrder.oRef, oFillingObj.lastOrder.numMoved, infoObj.item);

    const baseOutcome = await handleBaseAutoFilledOrder(order, infoObj.item, oFillingObj, infoObj);

    return baseOutcome;
}

/**
 * This function handles the initial order passed through the AutoFill process, paying out the applicable items
 * as well as refunding any unspent coins from buying cheaper items.
 * @param {object} order LocalMarkets DB Entry Object
 * @param {object} itemRef Reference to item object being transfered
 * @param {object} fillObj Tracking object containing processed amounts
 * @param {object} infoObj Info Object passed for interaction acess
 * @returns {Promise <void>}
 */
async function handleBaseAutoFilledOrder(order, itemRef, fillObj, infoObj){
    const targetEntity = (order.target_type === 'user') ? await grabUser(order.target_id) : await grabTown(order.target_id);

    switch(order.sale_type){
        case "Buy":
            switch(order.item_type){
                case "Gear":
                    await checkInboundItem(order.target_id, order.item_id, fillObj.items.gain);
                break;
                default:
                    // Material
                    switch(order.target_type){
                        case "user":
                            await checkInboundMat(order.target_id, itemRef, order.item_type, fillObj.items.gain);
                        break;
                        case "town":
                            await checkInboundTownMat(order.target_id, itemRef, order.item_type, fillObj.items.gain);
                        break;
                    }
                break;
            }
            if (fillObj.coins.net < order.listed_value * fillObj.items.gain){
                // Refund Needed
                const refundAmount = (order.listed_value * fillObj.items.gain) - fillObj.coins.net;
                const refundEmbed = new EmbedBuilder()
                .setTitle('== Coins Refunded ==')
                .setDescription(`Your order was refunded **${refundAmount}**c as you bought **${fillObj.items.gain} ${order.item_name}** at a price lower than your asking price of **${order.listed_value}**c!!`);

                await sendTimedChannelMessage(infoObj.interRef, 60000, refundEmbed);

                await updateUserCoins(refundAmount, targetEntity);
            }
        break;
        case "Sell":
            await updateUserCoins(fillObj.coins.net, targetEntity);
        break;
    }

    let orderRemoved = false;
    await order.decrement('amount_left', {by: fillObj.items.gain}).then(async o => await o.save()).then(async o => {return await o.reload()});
    if (order.amount_left <= 0) {
        console.log('BASE ORDER FILLED ON CREATION!!');
        orderRemoved = true;
        await order.destroy();
    } else await updateOrderExpireTime(order);

    return (orderRemoved) ? 'Order Removed': order;
}

/**
 * This function handles ``Payouts`` for the ``order`` object given. 
 * @param {object} order LocalMarkets DB Entry Object
 * @param {number} amount Amount of items moved
 * @param {object} itemRef Reference to item object being transfered
 * @returns {Promise<void>}
 */
async function handleAutoFilledOrder(order, amount, itemRef){
    const targetEntity = (order.target_type === 'user') ? await grabUser(order.target_id) : await grabTown(order.target_id);

    switch(order.sale_type){
        case "Buy":
            switch(order.item_type){
                case "Gear":
                    await checkInboundItem(order.target_id, order.item_id, amount);
                break;
                default:
                    switch(order.target_type){
                        case "user":
                            await checkInboundMat(order.target_id, itemRef, order.item_type, amount);
                        break;
                        case "town":
                            await checkInboundTownMat(order.target_id, itemRef, order.item_type, amount);
                        break;
                    }
                break;
            }
        break;
        case "Sell":
            await updateUserCoins(order.listed_value * amount, targetEntity);
        break;
    }

    await order.decrement('amount_left', {by: amount}).then(async o => await o.save()).then(async o => {return await o.reload()});
    if (order.amount_left <= 0) {
        console.log('EXISTING ORDER FILLED DURING AUTO FILL');
        await order.destroy();
    } else await updateOrderExpireTime(order);
    return;
}


// ==================
//  Order Displaying
// ==================

/**
 * This function filters the existing local-orders given the filter options picked by the user.
 * It then creates an embed page array with each of the matching orders. 
 * @param {object} viewObj User Selected Options Object
 * @returns {Promise <{embeds: EmbedBuilder[], iDetails: EmbedBuilder[], oDetails: EmbedBuilder[], orderMatch: object[], outcome: string, usePages: boolean}>}
 */
async function loadFilteredOrders(viewObj){
    const finalObj = {embeds: [], iDetails: [], oDetails: [], orderMatch: [], outcome: "", usePages: false};

    const matFilter = (viewObj.itemType === 'material') ? 'Material' : 'Gear';

    const inverseSaleType = (viewObj.saleType === 'buy') ? "Sell" : "Buy"; 
    const noOrdersEmbed = new EmbedBuilder()
    .setTitle(`No Applicable ${viewObj.saleType} Orders`)
    .setDescription(`Your search options came up empty, there are no matching ${makeCapital(viewObj.saleType)} orders for:\n**=======**\n\nItem Rarity: ${viewObj.rarity}\nItem Type: ${viewObj.itemType}\n**=======**\n\nPlease search for something else or make a ${inverseSaleType} order instead!`);

    let localOrderList;
    switch(matFilter){
        case "Material":
            localOrderList = await LocalMarkets.findAll({where: {sale_type: makeCapital(viewObj.saleType), item_rar: viewObj.rarity, item_type: {[Op.ne]: 'Gear'}}});
        break;
        case "Gear":
            localOrderList = await LocalMarkets.findAll({where: {sale_type: makeCapital(viewObj.saleType), item_rar: viewObj.rarity, item_type: matFilter}});
            localOrderList = localOrderList.filter(order => checkingSlot(order.item_code).toLowerCase() === viewObj.itemType);
        break;
    }

    // NO MATCHING ORDERS FOUND
    if (localOrderList.length === 0) {
        finalObj.embeds.push(noOrdersEmbed);
        finalObj.outcome = "No Orders";
        return finalObj;
    } else if (localOrderList.length > 100){
        localOrderList = localOrderList.slice(0, 100);
        finalObj.outcome = "100 Order Limit";
    }

    let pageTrack = 1;
    for (const order of localOrderList){
        let orderDescTmp = ``;
        // Crafted? Timestamp/Expires?
        if (order.item_id.length === 36){
            // Item was crafted
            orderDescTmp += `This item was crafted, it is one of a kind!\n`;
        }
        orderDescTmp += `This order will expire, <t:${Math.round(order.expires_at / 1000)}:R>`;

        const embed = new EmbedBuilder()
        .setTitle(`== ${makeCapital(viewObj.saleType)} Order **# ${pageTrack}**/**${localOrderList.length}** ==`)
        .setDescription(orderDescTmp)
        .addFields({
            name: "== Item Details ==",
            value: `Name: **${order.item_name}**\nPrice: **${order.listed_value}**c\nAmount Remaining: **${order.amount_left}**`
        });
        finalObj.embeds.push(embed);

        if (matFilter !== "Material"){
            const exrInfoObj = uni_displayItem({name: order.item_name, item_code: order.item_code, caste_id: order.item_caste}, "Trade-Order");
            const exrInfoEmbed = new EmbedBuilder()
            .setTitle(exrInfoObj.title)
            .setDescription(exrInfoObj.description)
            .addFields(exrInfoObj.fields);

            finalObj.iDetails.push(exrInfoEmbed);
        }

        if (viewObj.saleType === 'buy'){
            // Buy Order Embed Inspect
            const buyInfoEmbed = new EmbedBuilder()
            .setTitle('== Sell To Order? ==');
            finalObj.oDetails.push(buyInfoEmbed);
        } else {
            // Sell Order Embed Inspect
            const sellInfoEmbed = new EmbedBuilder()
            .setTitle('== Buy From Order? ==');
            finalObj.oDetails.push(sellInfoEmbed);
        }
        finalObj.orderMatch.push(order);
        pageTrack++;
    }

    if (finalObj.embeds.length > 1) finalObj.usePages = true;


    return finalObj;
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
 * @param {string} [moveType="Buy"] Set to value for ``"${moveType} @ ${rar} Rarity"
 * @returns {[ActionRowBuilder[StringSelectMenuBuilder], ActionRowBuilder[ButtonBuilder]]}
 */
function loadRarStringMenu(moveType="Buy"){
    const rarList = [...loadFullRarNameList(10), 'Unique'];
    
    const stringOptionList = [];

    for (const rar of rarList){
        const option = new StringSelectMenuOptionBuilder()
        .setLabel(rar)
        .setDescription(`${moveType} @ ${rar} Rarity`)
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
    const isUnique = (r, f) => r === 'Unique' && f === 'unique';

    const matchList = [];
    for (const [key, value] of materialFiles){
        const matFileRef = require(value);
        if (isUnique(tradeObj.rarity, key)){
            for (const matMatch of matFileRef){
                matchList.push({type: key, name: matMatch.Name, value: matMatch.Value, matRef: matMatch});
            }
            break;
        } else {
            const matMatch = matFileRef.find(mat => mat.Rarity === tradeObj.rarity);
            if (!matMatch) continue;
            matchList.push({type: key, name: matMatch.Name, value: matMatch.Value, matRef: matMatch});
        }
    }

    return matchList;
}

/**
 * This function filters through all mat lists for a matching Name with matName.
 * @param {string} matName Material Pointer Name
 * @returns {{matRef: object, matType: string}}
 */
function handleMatNameFilter(matName, materialFiles){
    for (const [key, value] of materialFiles){
        const matFileRef = require(value);
        let matMatch = matFileRef.filter(mat => mat.Name === matName);
        if (matMatch.length === 0) continue;
        else return {matRef: matMatch[0], matType: key};
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

    return [amountRow, outcomeRow];
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
 * @param {boolean} [backDisabled=false] Set ``true`` if back-button should be disabled
 * @returns {[ActionRowBuilder[ButtonBuilder], ActionRowBuilder[ButtonBuilder], ActionRowBuilder[ButtonBuilder], ActionRowBuilder[ButtonBuilder]]}
 */
function loadPriceButts(backDisabled=false){
    // ===================
    // CONTROL ROW
    const backButt = new ButtonBuilder()
    .setCustomId('back-price')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(backDisabled)
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
 * @returns {ActionRowBuilder<ButtonBuilder>}
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
 * @param {string} [styleType="Secondary"] Set to page button style wanted: ``"Primary", "Secondary", "Danger", "Success"``
 * @returns {ButtonBuilder[]}
 */
function createBasicPageButtons(styleType="Secondary"){
    let styleToUse;
    switch(styleType){
        case "Primary":
            styleToUse = ButtonStyle.Primary;
        break;
        case "Secondary":
            styleToUse = ButtonStyle.Secondary;
        break;
        case "Danger":
            styleToUse = ButtonStyle.Danger;
        break;
        case "Success":
            styleToUse = ButtonStyle.Success;
        break;
        default:
            styleToUse = ButtonStyle.Secondary;
        break;
    }

    const backPageButt = new ButtonBuilder()
    .setLabel("Backward")
    .setStyle(styleToUse)
    .setEmoji('◀️')
    .setCustomId('back-page');

    const nextPageButt = new ButtonBuilder()
    .setLabel("Forward")
    .setStyle(styleToUse)
    .setEmoji('▶️')
    .setCustomId('next-page');

    const pageButts = [backPageButt, nextPageButt];

    return pageButts;
}

/**
 * This function handles loading the needed button components for the order page menu.
 * @param {object} orderOutcome Outcome of loading the order list pages
 * @returns {[ActionRowBuilder[ButtonBuilder]]}
 */
function handleOrderListDisplay(orderOutcome){
    const finalButtRow = [];

    const inspectButt = new ButtonBuilder()
    .setCustomId('item-inspect')
    .setStyle(ButtonStyle.Primary)
    .setLabel('Item Details');

    const orderInteractButt = new ButtonBuilder()
    .setCustomId('order-inspect')
    .setStyle(ButtonStyle.Primary)
    .setLabel('Order Details');

    let pageingButts = (orderOutcome.usePages) ? createBasicPageButtons() : [];

    // Handle adding extra buttons to page change row
    if (pageingButts.length > 0){
        const catchSliceButt = pageingButts.splice(1, 1, inspectButt, orderInteractButt);
        pageingButts.push(catchSliceButt[0]);
        const pageButtRow = new ActionRowBuilder().addComponents(pageingButts);
        finalButtRow.push(pageButtRow);
    } else finalButtRow.push(new ActionRowBuilder().addComponents(inspectButt, orderInteractButt));

    finalButtRow.push(loadBasicBackButt('nav'));


    const compsToUse = finalButtRow;
    
    return compsToUse;
}

/**
 * This function loads the applicable buy/sell menu amount move buttons.
 * @param {string} saleType buy | sell
 * @returns {[ActionRowBuilder, ActionRowBuilder]}
 */
function handleOrderInspectButts(saleType){
    const finalButtRow = [];

    // Buy Order View
    // ==============
    // Check for owned amounts
    // Other handling methods?

    // Sell Order View
    // ===============
    // Move to amount menu
    // Amount menu ==> Checkout menu 

    const primeInterButt = new ButtonBuilder();

    const secInterButt = new ButtonBuilder();

    switch(saleType){
        case "buy":
            primeInterButt
            .setCustomId('sell-menu')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Amount Menu');
            secInterButt
            .setCustomId('secondary')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
            .setLabel('Action');
        break;
        case "sell":
            primeInterButt
            .setCustomId('buy-menu')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Amount Menu');
            secInterButt
            .setCustomId('secondary')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
            .setLabel('Action');
        break;
    }

    finalButtRow.push(new ActionRowBuilder().addComponents(primeInterButt, secInterButt));

    finalButtRow.push(loadBasicBackButt('flip'));

    return finalButtRow;
}


module.exports = {
    handleBuyOrderSetup,
    handleSellOrderSetup,
    handleOrderTransfer,
    loadFilteredOrders,
    loadAsButts,
    loadSaleButts,
    loadTypeButts,
    loadRarStringMenu,
    loadConfirmButts,
    loadNameStringMenu,
    handleMatNameFilter,
    handleMatNameLoad,
    handleItemNameFilter,
    loadAmountButts,
    loadPriceButts,
    handlePriceButtPicked,
    loadBasicBackButt,
    createBasicPageButtons,
    handleOrderListDisplay,
    handleOrderInspectButts
}