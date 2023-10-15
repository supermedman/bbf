//const { UserData } = require('../../dbObjects.js');

const lootList = require('../../events/Models/json_prefabs/lootList.json');
const uniqueLootList = require('../../events/Models/json_prefabs/uniqueLootList.json');

/**
 * 
 * @param {any} headSlotID ID reference 
 */
//This method returns a prefab reference if an item is found, if not returns 'NONE'
async function findHelmSlot(headSlotID) {
    var headSlotItem;
    if (headSlotID === 0) {
        //Nothing equipped
        return 'NONE';
    } else {
        console.log(headSlotID);

        for (var i = 0; i < lootList.length; i++) {
            if (lootList[i].Loot_id === headSlotID) {
                //Helmet found
                headSlotItem = lootList[i];
                console.log(headSlotItem);
            } else {/**Do nothing not found*/ }
        }
        if (!headSlotItem) {
            for (var i = 0; i < uniqueLootList.length; i++) {
                if (uniqueLootList[i].Loot_id === headSlotID) {
                    //Helmet found
                    headSlotItem = lootList[i];
                    console.log(headSlotItem);
                } else {/**Do nothing not found*/ }
            }
        }
        if (headSlotItem) {
            //Item found, return entire object!
            return headSlotItem;
        }
    }
}

/**
 * 
 * @param {any} chestSlotID ID reference
 */
//This method returns a prefab reference if an item is found, if not returns 'NONE'
async function findChestSlot(chestSlotID) {
    var chestSlotItem;
    if (chestSlotID === 0) {
        //Nothing equipped
        return 'NONE';
    } else {
        console.log(chestSlotID);

        for (var i = 0; i < lootList.length; i++) {
            if (lootList[i].Loot_id === chestSlotID) {
                //Chest found
                chestSlotItem = lootList[i];
                console.log(chestSlotItem);
            } else {/**Do nothing not found*/ }
        }
        if (!chestSlotItem) {
            for (var i = 0; i < uniqueLootList.length; i++) {
                if (uniqueLootList[i].Loot_id === chestSlotID) {
                    //Chest found
                    chestSlotItem = lootList[i];
                    console.log(chestSlotItem);
                } else {/**Do nothing not found*/ }
            }
        }
        if (chestSlotItem) {
            //Item found, return entire object!
            return chestSlotItem;
        }
    }
}

/**
 * 
 * @param {any} legSlotID ID reference
 */
//This method returns a prefab reference if an item is found, if not returns 'NONE'
async function findLegSlot(legSlotID) {
    var legSlotItem;
    if (legSlotID === 0) {
        //Nothing equipped
        return 'NONE';
    } else {
        console.log(legSlotID);


        for (var i = 0; i < lootList.length; i++) {
            if (lootList[i].Loot_id === legSlotID) {
                //Legs found
                legSlotItem = lootList[i];
                console.log(legSlotItem);
            } else {/**Do nothing not found*/ }
        }
        if (!legSlotItem) {
            for (var i = 0; i < uniqueLootList.length; i++) {
                if (uniqueLootList[i].Loot_id === legSlotID) {
                    //Legs found
                    legSlotItem = lootList[i];
                    console.log(legSlotItem);
                } else {/**Do nothing not found*/ }
            }
        }
        if (legSlotItem) {
            //Item found, return entire object!
            return legSlotItem;
        }
    }
}

/**
 * 
 * @param {any} mainHandID ID reference
 */
//This method returns a prefab reference if an item is found, if not returns 'NONE'
async function findMainHand(mainHandID) {
    var mainHandItem;
    if (mainHandID === 0) {
        //Nothing equipped
        return 'NONE';
    } else {
        console.log(mainHandID);


        for (var i = 0; i < lootList.length; i++) {
            if (lootList[i].Loot_id === mainHandID) {
                //Weapon found
                mainHandItem = lootList[i];
                console.log(mainHandItem);
            } else {/**Do nothing not found*/ }
        }
        if (!mainHandItem) {
            for (var i = 0; i < uniqueLootList.length; i++) {
                if (uniqueLootList[i].Loot_id === mainHandID) {
                    //Weapon found
                    mainHandItem = lootList[i];
                    console.log(mainHandItem);
                } else {/**Do nothing not found*/ }
            }
        }
        if (mainHandItem) {
            //Item found, return entire object!
            return mainHandItem;
        }
    }
}

/**
 * 
 * @param {any} offHandID ID reference
 */
async function findOffHand(offHandID) {
    var offHandItem;
    if (offHandID === 0) {
        //Nothing equipped
        return 'NONE';
    } else { }
}

module.exports = { findHelmSlot, findChestSlot, findLegSlot, findMainHand, findOffHand };