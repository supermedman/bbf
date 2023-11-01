const { UniqueCrafted } = require('../../dbObjects.js');

const lootList = require('../../events/Models/json_prefabs/lootList.json');
const uniqueLootList = require('../../events/Models/json_prefabs/uniqueLootList.json');



/**
 * 
 * @param {any} headSlotID ID reference 
 */
//This method returns a prefab reference if an item is found, if not returns 'NONE'
async function findHelmSlot(headSlotID, userID) {
    var headSlotItem;
    if (headSlotID === 0) {
        //Nothing equipped
        return 'NONE';
    } else {
        console.log(headSlotID);

        //Normal ID
        if (headSlotID < 1000) {
            for (var i = 0; i < lootList.length; i++) {
                if (lootList[i].Loot_id === headSlotID) {
                    //Helmet found
                    headSlotItem = lootList[i];
                    console.log(headSlotItem);
                } else {/**Do nothing not found*/ }
            }
        } else if (headSlotID >= 30000) {
            //Unique Crafted
            headSlotItem = await UniqueCrafted.findOne({ where: [{ spec_id: userID }, { loot_id: headSlotID }] });
        } else if (headSlotID >= 20000) {
            //Unique Cheated
            for (var i = 0; i < lootList.length; i++) {
                if (lootList[i].Loot_id === headSlotID) {
                    //Helmet found
                    headSlotItem = lootList[i];
                    console.log(headSlotItem);
                } else {/**Do nothing not found*/ }
            }
        } else if (headSlotID > 1000) {
            //Unique Normal
            for (var x = 0; x < uniqueLootList.length; x++) {
                if (uniqueLootList[x].Loot_id === headSlotID) {
                    //Helmet found
                    headSlotItem = uniqueLootList[x];
                    console.log(headSlotItem);
                } else {/**Do nothing not found*/ }
            }
        }

        if (headSlotID === 1000) {
            //Temp ITEM
        }

        
        if (!headSlotItem) {
            
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
async function findChestSlot(chestSlotID, userID) {
    var chestSlotItem;
    if (chestSlotID === 0) {
        //Nothing equipped
        return 'NONE';
    } else {
        console.log(chestSlotID);

        //Normal ID
        if (chestSlotID < 1000) {
            for (var i = 0; i < lootList.length; i++) {
                if (lootList[i].Loot_id === chestSlotID) {
                    //Chest found
                    chestSlotItem = lootList[i];
                    console.log(chestSlotItem);
                } else {/**Do nothing not found*/ }
            }
        } else if (chestSlotID >= 30000) {
            //Unique Crafted
            chestSlotItem = await UniqueCrafted.findOne({ where: [{ spec_id: userID }, { loot_id: chestSlotID }] });
        } else if (chestSlotID >= 20000) {
            //Unique Cheated
            for (var i = 0; i < lootList.length; i++) {
                if (lootList[i].Loot_id === chestSlotID) {
                    //Chest found
                    chestSlotItem = lootList[i];
                    console.log(chestSlotItem);
                } else {/**Do nothing not found*/ }
            }
        } else if (chestSlotID > 1000) {
            //Unique Normal
            for (var x = 0; x < uniqueLootList.length; x++) {
                if (uniqueLootList[x].Loot_id === chestSlotID) {
                    //Chest found
                    chestSlotItem = uniqueLootList[x];
                    console.log(chestSlotItem);
                } else {/**Do nothing not found*/ }
            }
        }

        if (chestSlotID === 1000) {
            //Temp ITEM
        }

        
        if (!chestSlotItem) {
            
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
async function findLegSlot(legSlotID, userID) {
    var legSlotItem;
    if (legSlotID === 0) {
        //Nothing equipped
        return 'NONE';
    } else {
        console.log(legSlotID);

        //Normal ID
        if (legSlotID < 1000) {
            for (var i = 0; i < lootList.length; i++) {
                if (lootList[i].Loot_id === legSlotID) {
                    //Legs found
                    legSlotItem = lootList[i];
                    console.log(legSlotItem);
                } else {/**Do nothing not found*/ }
            }
        } else if (legSlotID >= 30000) {
            //Unique Crafted
            legSlotItem = await UniqueCrafted.findOne({ where: [{ spec_id: userID }, { loot_id: legSlotID }] });
        } else if (legSlotID >= 20000) {
            //Unique Cheated
            for (var i = 0; i < lootList.length; i++) {
                if (lootList[i].Loot_id === legSlotID) {
                    //Legs found
                    legSlotItem = lootList[i];
                    console.log(legSlotItem);
                } else {/**Do nothing not found*/ }
            }
        } else if (legSlotID > 1000) {
            //Unique Normal
            for (var x = 0; x < uniqueLootList.length; x++) {
                if (uniqueLootList[x].Loot_id === legSlotID) {
                    //Legs found
                    legSlotItem = uniqueLootList[x];
                    console.log(legSlotItem);
                } else {/**Do nothing not found*/ }
            }
        }

        if (legSlotID === 1000) {
            //Temp ITEM
        }

        
        if (!legSlotItem) {
            
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
async function findMainHand(mainHandID, userID) {
    let mainHandItem;
    if (mainHandID === 0) {
        //Nothing equipped
        return 'NONE';
    } else {
        console.log(mainHandID);

        //Regular loot id
        if (mainHandID < 1000) {
            for (var i = 0; i < lootList.length; i++) {
                if (lootList[i].Loot_id === mainHandID) {
                    //Weapon found
                    mainHandItem = lootList[i];
                    console.log(mainHandItem);
                } else {/**Do nothing not found*/ }
            }
        } else if (mainHandID >= 30000) {
            //Unique Crafted
            mainHandItem = await UniqueCrafted.findOne({ where: [{ spec_id: userID }, { loot_id: mainHandID }] });
        } else if (mainHandID >= 20000) {
            //Unique Cheated
            for (var i = 0; i < lootList.length; i++) {
                if (lootList[i].Loot_id === mainHandID) {
                    //Weapon found
                    mainHandItem = lootList[i];
                    console.log(mainHandItem);
                } else {/**Do nothing not found*/ }
            }
        } else if (mainHandID > 1000) {
            //Special loot id
            for (var x = 0; x < uniqueLootList.length; x++) {
                if (uniqueLootList[x].Loot_id === mainHandID) {
                    //Weapon found
                    mainHandItem = uniqueLootList[x];
                    console.log(mainHandItem);
                } else {/**Do nothing not found*/ }
            }
        }

        if (mainHandID === 10000) {
            //Temp loot id
        }
        
        if (!mainHandItem) {
            
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
async function findOffHand(offHandID, userID) {
    var offHandItem;
    if (offHandID === 0) {
        //Nothing equipped
        return 'NONE';
    } else { }
}

module.exports = { findHelmSlot, findChestSlot, findLegSlot, findMainHand, findOffHand };
