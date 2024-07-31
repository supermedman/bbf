// This script handles all item transfers between inventories. 
// This includes, Item creation, Item trade, and Item selling/dismantling

const { ItemStrings, ItemLootPool, UserData, MaterialStore } = require("../../../dbObjects");

/**
 * This function checks for an item in the given users ItemStrings storage,
 * it creates a new entry if not found, and then updates the users total items.
 * If found it updates the amount stored by the amount given.
 * @param {string} userid Users ID
 * @param {(number|string)} itemid Items ID
 * @param {number} amount Amount of items, default to 1
 * @param {(object|undefined)} craftedI Crafted item reference if given
 * @returns {object} Reference to the item instance found
 */
async function checkInboundItem(userid, itemid, amount=1, craftedI){
    const theUser = await UserData.findOne({
        where: {userid: userid}
    });
    // If item was crafted and is given, do not look for an item match.
    const itemMatch = craftedI ?? await ItemLootPool.findOne({
        where: {creation_offset_id: itemid}
    });

    const theItem = await ItemStrings.findOrCreate({
        where: {
            user_id: userid,
            item_id: itemid
        },
        defaults: {
            name: itemMatch.name,
            value: itemMatch.value,
            amount: amount,
            item_code: itemMatch.item_code,
            caste_id: itemMatch.caste_id,
            creation_id: itemMatch.creation_offset_id
        }
    });

    // If item was created and not found
    if (theItem[1]) {
        await theUser.increment('totitem').then(async user => {return await user.reload();});
        await theItem[0].save().then(async item => {return await item.reload();});
    } else {
        await theItem[0].increment('amount', {by: amount}).then(async item => {return await item.reload();});
    }

    return theItem[0];
}

/**
 * This function handles creating/updating materials that are inbound for a users,
 * inventory, it then returns the updated material.
 * @param {string} userid User ID string
 * @param {object} matRef Material Prefab Object
 * @param {string} matType Material type string
 * @param {number} amount Material amount, defaults 1
 * @returns {object} Material Instance of MaterialStore 
 */
async function checkInboundMat(userid, matRef, matType, amount=1){
    const theMat = await MaterialStore.findOrCreate({
        where: {
            spec_id: userid,
            mat_id: matRef.Mat_id,
            mattype: matType
        },
        defaults: {
            name: matRef.Name,
            value: matRef.Value,
            rarity: matRef.Rarity,
            rar_id: matRef.Rar_id,
            amount: amount
        }
    });

    if (theMat[1]){
        await theMat[0].save().then(async mat => {return await mat.reload();});
    } else {
        await theMat[0].increment('amount', {by: amount}).then(async mat => {return await mat.reload();});
    }

    return theMat[0];
}

/**
 * This function checks for a given item in the given users ItemStrings storage,
 * it then attempts to remove from it the amount give, if this amount reduces total 
 * amount to or below zero, it removes the item entry and decreases the users total
 * items. Returns "Item Not Found" upon failed item location.
 * @param {string} userid Users ID
 * @param {(number|string)} itemid Items ID
 * @param {number} amount Amount of items, defaults to 1
 * @returns {promise <string>} 'Item Not Found' || 'Item Updated'
 */
async function checkOutboundItem(userid, itemid, amount=1){
    const theUser = await UserData.findOne({
        where: {userid: userid}
    });

    const theItem = await ItemStrings.findOne({
        where: {user_id: userid, item_id: itemid}
    });

    if (!theItem) return 'Item Not Found';
    await theItem.decrement('amount', {by: amount}).then(async item => {
        await item.reload();
        if (item.amount <= 0) await trashItem(item, theUser);
    });
    return 'Item Updated';
}

/**
 * This function attempts to remove the given amount from the given material,
 * if this takes it to 0 the material entry is removed.
 * @param {string} userid Users ID
 * @param {object} matRef Material Prefab object
 * @param {string} matType Material type string
 * @param {number} amount Amount to remove, default 1
 * @returns {promise <string>} 'Material Not Found' || 'Material Updated'
 */
async function checkOutboundMat(userid, matRef, matType, amount=1){
    const theMat = await MaterialStore.findOne({
        where: {spec_id: userid, mat_id: matRef.Mat_id, mattype: matType}
    });
    if (!theMat) return 'Material Not Found';
    await theMat.decrement('amount', {by: amount}).then(async mat => {
        await mat.reload();
        if (mat.amount <= 0) await trashMaterial(mat);
    });
    return 'Material Updated';
}

/**
 * This function handles the transfer of an item between two users. It is handled
 * through checkInboundItem() and checkOutboundItem() respectively.
 * @param {string} userGive User giving ID
 * @param {string} userTake User taking ID
 * @param {(number|string)} itemid Items ID
 * @param {number} amount Amount of items, defaults to 1
 * @param {(object|undefined)} craftedI Crafted item reference if given
 * @returns {promise<(object|string)>} object on resolve, string on reject
 */
async function moveItem(userGive, userTake, itemid, amount=1, craftedI){
    const outboundCheck = await checkOutboundItem(userGive, itemid, amount);
    if (outboundCheck === 'Item Not Found') return 'Item Error';
    const theItem = await checkInboundItem(userTake, itemid, amount, craftedI);

    return theItem;
}

/**
 * This function handles the transfer of a material between two users. It is handled
 * through checkInboundMat() and checkOutboundMat() respectively.
 * @param {string} userGive User giving ID
 * @param {string} userTake User taking ID
 * @param {object} matRef Material Prefab reference object
 * @param {string} matType Material type string
 * @param {number} amount amount to be moved, default 1
 * @returns {promise<object|string>} MaterialStore db entry object on resolve, string on reject
 */
async function moveMaterial(userGive, userTake, matRef, matType, amount=1){
    const outboundCheck = await checkOutboundMat(userGive, matRef, matType, amount);
    if (outboundCheck === 'Material Not Found') return 'Material Error';
    const theMat = await checkInboundMat(userTake, matRef, matType, amount);

    return theMat;
}

/**
 * This function trashes a given item and updates a given users total items.
 * @param {object} itemRef ItemStrings DB Reference
 * @param {object} theUser UserData DB Reference
 * @returns {promise<void>} 
 */
async function trashItem(itemRef, theUser){
    await itemRef.destroy();
    await theUser.increment('totitem').then(async user => {return await user.reload();});
    return;
}

/**
 * This function destroys the given material instance from the database.
 * @param {object} mat MaterialStore Instance
 * @returns {promise <void>}
 */
async function trashMaterial(mat){
    await mat.destroy();
    return;
}


module.exports = {
    moveItem, 
    moveMaterial,
    checkInboundItem,
    checkInboundMat,
    checkOutboundItem,
    checkOutboundMat,
    trashItem
};