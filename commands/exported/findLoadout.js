const { UniqueCrafted, OwnedPotions } = require('../../dbObjects.js');

const {
    warnedForm,
    errorForm,
    successResult,
    failureResult,
    basicInfoForm,
    specialInfoForm
} = require('../../chalkPresets.js');

const lootList = require('../../events/Models/json_prefabs/lootList.json');
const uniqueLootList = require('../../events/Models/json_prefabs/uniqueLootList.json');



/**
 * 
 * @param {any} headSlotID ID reference 
 * @param {any} userID ID reference
 */
//This method returns a prefab reference if an item is found, if not returns 'NONE'
async function findHelmSlot(headSlotID, userID) {
    let headSlotItem;
    if (headSlotID === 0) {
        //Nothing equipped
        return 'NONE';
    } else {
        console.log(headSlotID);

        if (headSlotID < 1000) {
            headSlotItem = lootList.filter(item => item.Loot_id === headSlotID);
            headSlotItem = headSlotItem[0];
        } else if (headSlotID >= 30000) {
            headSlotItem = await UniqueCrafted.findOne({ where: [{ spec_id: userID }, { loot_id: headSlotID }] });
        } else if (headSlotID >= 20000) {
            headSlotItem = lootList.filter(item => item.Loot_id === headSlotID);
            headSlotItem = headSlotItem[0];
        } else if (headSlotID < 1000) {
            headSlotItem = uniqueLootList.filter(item => item.Loot_id === headSlotID);
            headSlotItem = headSlotItem[0];
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
 * @param {any} userID ID reference
 */
//This method returns a prefab reference if an item is found, if not returns 'NONE'
async function findChestSlot(chestSlotID, userID) {
    let chestSlotItem;
    if (chestSlotID === 0) {
        //Nothing equipped
        return 'NONE';
    } else {
        console.log(chestSlotID);

        if (chestSlotID < 1000) {
            chestSlotItem = lootList.filter(item => item.Loot_id === chestSlotID);
            chestSlotItem = chestSlotItem[0];
        } else if (chestSlotID >= 30000) {
            chestSlotItem = await UniqueCrafted.findOne({ where: [{ spec_id: userID }, { loot_id: chestSlotID }] });
        } else if (chestSlotID >= 20000) {
            chestSlotItem = lootList.filter(item => item.Loot_id === chestSlotID);
            chestSlotItem = chestSlotItem[0];
        } else if (chestSlotID < 1000) {
            chestSlotItem = uniqueLootList.filter(item => item.Loot_id === chestSlotID);
            chestSlotItem = chestSlotItem[0];
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
 * @param {any} userID ID reference
 */
//This method returns a prefab reference if an item is found, if not returns 'NONE'
async function findLegSlot(legSlotID, userID) {
    let legSlotItem;
    if (legSlotID === 0) {
        //Nothing equipped
        return 'NONE';
    } else {
        console.log(legSlotID);

        if (legSlotID < 1000) {
            legSlotItem = lootList.filter(item => item.Loot_id === legSlotID);
            legSlotItem = legSlotItem[0];
        } else if (legSlotID >= 30000) {
            legSlotItem = await UniqueCrafted.findOne({ where: [{ spec_id: userID }, { loot_id: legSlotID }] });
        } else if (legSlotID >= 20000) {
            legSlotItem = lootList.filter(item => item.Loot_id === legSlotID);
            legSlotItem = legSlotItem[0];
        } else if (legSlotID < 1000) {
            legSlotItem = uniqueLootList.filter(item => item.Loot_id === legSlotID);
            legSlotItem = legSlotItem[0];
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
 * @param {any} userID ID reference
 */
//This method returns a prefab reference if an item is found, if not returns 'NONE'
async function findMainHand(mainHandID, userID) {
    let mainHandItem;
    if (mainHandID === 0) {
        //Nothing equipped
        return 'NONE';
    } else {
        console.log(mainHandID);

        if (mainHandID < 1000) {
            mainHandItem = lootList.filter(item => item.Loot_id === mainHandID);
            mainHandItem = mainHandItem[0];
        } else if (mainHandID >= 30000) {
            mainHandItem = await UniqueCrafted.findOne({ where: [{ spec_id: userID }, { loot_id: mainHandID }] });
        } else if (mainHandID >= 20000) {
            mainHandItem = lootList.filter(item => item.Loot_id === mainHandID);
            mainHandItem = mainHandItem[0];
        } else if (mainHandID < 1000) {
            mainHandItem = uniqueLootList.filter(item => item.Loot_id === mainHandID);
            mainHandItem = mainHandItem[0];
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
 * @param {any} userID ID reference
 */
async function findOffHand(offHandID, userID) {
    let offHandItem;
    if (offHandID === 0) {
        //Nothing equipped
        return 'NONE';
    } else {
        console.log(offHandID);

        if (offHandID < 1000) {
            offHandItem = lootList.filter(item => item.Loot_id === offHandID);
            offHandItem = offHandItem[0];
        } else if (offHandID >= 30000) {
            offHandItem = await UniqueCrafted.findOne({ where: [{ spec_id: userID }, { loot_id: offHandID }] });
        } else if (offHandID >= 20000) {
            offHandItem = lootList.filter(item => item.Loot_id === offHandID);
            offHandItem = offHandItem[0];
        } else if (offHandID < 1000) {
            offHandItem = uniqueLootList.filter(item => item.Loot_id === offHandID);
            offHandItem = offHandItem[0];
        }

        if (offHandID === 10000) {
            //Temp loot id
        }

        if (!offHandItem) {

        }
        if (offHandItem) {
            //Item found, return entire object!
            return offHandItem;
        } }
}

/**
 * 
 * @param {any} potionOneID ID reference
 * @param {any} userID ID reference
 */
async function findPotion(potionOneID, userID) {
    let potionOne;
    if (potionOneID === 0) {
        //Nothing equipped
        return 'NONE';
    } else {
        console.log(specialInfoForm('PotionOne found ID: ', potionOneID));

        potionOne = await OwnedPotions.findOne({ where: [{ spec_id: userID }, { potion_id: potionOneID }] });

        if (!potionOne) {
            console.log(warnedForm('PotionOne NOT FOUND AMOUNT LIKELY 0!'));
            return 'HASNONE';
        }

        if (potionOne.amount > 0) return potionOne;
    }
}

/**
 * 
 * @param {any} potionTwoID ID reference
 * @param {any} userID ID reference
 */ 
async function findPotionTwo(potionTwoID, userID) {
    let potionTwo;
    if (potionTwoID === 0) {
        //Nothing equipped
        return 'NONE';
    } else {
        console.log(specialInfoForm('PotionTwo found ID: ', potionTwoID));

        potionTwo = await OwnedPotions.findOne({ where: [{ spec_id: userID }, { potion_id: potionTwoID }] });

        if (potionTwo) {
            return potionTwo;
        } else {
            console.log(errorForm('PotionTwo NOT FOUND ERROR HAS OCCURED!'));
            return 'NONE';
        } 
    }
}


module.exports = { findHelmSlot, findChestSlot, findLegSlot, findMainHand, findOffHand, findPotion };
