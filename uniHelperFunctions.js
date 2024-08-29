const {chalk, chlkPreset} = require('./chalkPresets');
const {ComponentType} = require('discord.js');
const { UserData, Pigmy, Town } = require('./dbObjects');

/**
 * This method randomly returns an element from a given array, if the array has a
 * length of 1 that element is returned.
 * @param {any[]} arr Any type of array with any type of contents   
 * @returns {any} Contents at randomly chosen index
 */
const randArrPos = (arr) => {
    return arr[(arr.length > 1) ? Math.floor(Math.random() * arr.length) : 0];
};

/**
 * This function rolls Math.random() and checks if ``chance >= roll``
 * @param {number} chance Chance to roll against
 * @returns {boolean}
 */
const rollChance = (chance) => {
    return (Math.random() <= chance) ? true : false;
};

/**
 * This function rolls Math.random() and checks if ``chance <= roll``
 * @param {number} chance Chance to roll against
 * @returns {boolean}
 */
const dropChance = (chance) => {
    return (Math.random() >= chance) ? true : false;
};

const inclusiveRandNum = (max, min) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

const makeCapital = (str) => { return str.charAt(0).toUpperCase() + str.slice(1) };

const checkLootDrop = (pigmy, user) => {
    let chanceToBeat = 0.850;
    if (user.pClass === 'Thief') chanceToBeat -= 0.10;

    if (user.level >= 31) {
        if ((Math.floor(user.level / 4) * 0.01) > 0.25) {
            chanceToBeat -= 0.25;
        } else chanceToBeat -= (Math.floor(user.level / 4) * 0.01);
    }

    if (pigmy) {
        if ((Math.floor(pigmy.level / 3) * 0.02) > 0.25) {
            chanceToBeat -= 0.25;
        } else chanceToBeat -= (Math.floor(pigmy.level / 3) * 0.02);
    }

    return chanceToBeat;
};

const checkLootUP = (pigmy, user) => {
    let chanceToBeat = 1;
	if (user.pclass === 'Thief') chanceToBeat -= 0.05;
	if (user.level >= 31) {
		if ((Math.floor(user.level / 5) * 0.01) > 0.10) {
			chanceToBeat -= 0.10;
		} else chanceToBeat -= (Math.floor(user.level / 5) * 0.01);
	}
	if (pigmy) {
		if ((Math.floor(pigmy.level / 5) * 0.01) > 0.05) {
			chanceToBeat -= 0.05;
		} else chanceToBeat -= (Math.floor(pigmy.level / 5) * 0.01);
	}
	return chanceToBeat;
};

/**
 * This method handles styling timers based on time difference found, and then
 * handles logging the output accordingly.
 * @param {number} startTime Start Time for measurement
 * @param {string} measureName Display String, shown as ``${measureName} Duration: ``
 */
const endTimer = (startTime, measureName) => {
    const endTime = new Date().getTime();
    const timeDiff = endTime - startTime;
    let preStyle;
    if (timeDiff === 0){
        preStyle = chalk.blueBright.bgGrey;
    } else if (timeDiff >= 25000){
        preStyle = chlkPreset.err;
    } else if (timeDiff >= 10000){
        preStyle = chalk.red.bgGrey;
    } else if (timeDiff >= 5000){
        preStyle = chalk.redBright.bgGrey;
    } else if (timeDiff >= 2500){
        preStyle = chalk.yellowBright.bgGrey;
    } else if (timeDiff >= 1000){
        preStyle = chalk.yellow.bgGrey;
    } else if (timeDiff >= 500){
        preStyle = chalk.green.dim.bgGrey;
    } else if (timeDiff >= 150){
        preStyle = chalk.greenBright.bgGrey;
    } else {
        preStyle = chalk.blueBright.bgGrey;
    }
    console.log(preStyle(`${measureName} Duration: ${timeDiff}ms`));
};

/**
 * This function retrieves and returns the UserData entry for the given id.
 * @param {string} id User ID
 * @returns {promise <object>} ```(object | undefined)```
 */
async function grabUser(id){
    return await UserData.findOne({where: {userid: id}});
}

/**
 * This function retrieves and returns the Town entry for the given id.
 * @param {string} id Town ID
 * @returns {Promise <object>} ```(object | undefined)```
 */
async function grabTown(id){
    return await Town.findOne({where: {townid: id}});
}

/**
 * This function attempts to locate a town with name ``name``.
 * @param {string} name Name of town to search for
 * @returns {Promise <object | undefined>}
 */
async function grabTownByName(name){
    return await Town.findOne({where: {name: name}});
}

/**
 * This function grabs any towns that having a ``guildid`` matching the given ``guildid``.
 * @param {string} guildid The ID of the guild to check for
 * @returns {Promise <object[]>}
 */
async function grabLocalTowns(guildid){
    return await Town.findAll({where: {guildid: guildid}});
}

/**
 * This function retrieves and returns the Pigmy Entry for the give User id.
 * @param {string} id User ID
 * @returns {promise <object>} ```(object | undefined)```
 */
async function grabActivePigmy(id){
    return await Pigmy.findOne({where: {spec_id: id}});
}

/**
 * This function handles locating, and checking the users towns permissions,
 * if the given user has ``can_edit`` permissions returns ``true`` otherwise returns ``false``.
 * @param {object} user UserData DB Object
 * @returns {Promise <boolean>}
 */
async function checkUserTownPerms(user){
    if (user.townid === '0') return false;
    const userTown = await grabTown(user.townid);
    if (!userTown) return false;
    if (!userTown.can_edit.split(',').includes(user.userid)) return false;
    return true;
}

/**
 * This function checks if the given user belongs to a town, and then checks if a town with 
 * the given users id can be found, checking for each towns ``mayorid``
 * @param {object} user UserData DB Object
 * @returns {Promise <boolean>}
 */
async function checkUserAsMayor(user){
    if (user.townid === '0') return false;
    const townMayor = await Town.findOne({where: {mayorid: user.userid}});
    if (!townMayor) return false;
    return true;
}

/**
 * This function handles checking a string interaction output through JSON.parse(), 
 * if this fails returns ``itemCheck`` as ``itemName`` and ``checkForID`` as ``false``
 * if this does not fail, returns: ``itemCheck.name`` as ``itemName`` and ``itemCheck.id`` as ``checkForID``
 * @param {string} itemCheck Item Name | JSON Object String ``{"name": string, "id": string}``
 * @returns {{itemName: string, checkForID: (string | boolean)}}
 */
function handleItemObjCheck(itemCheck){
    // Try catch to handle invalid JSON when passed value is correct string
    try {
        itemCheck = JSON.parse(itemCheck);
    } catch (e){}

    let itemName, checkForID = false;
    if (typeof itemCheck !== 'string'){
        itemName = itemCheck.name;
        checkForID = itemCheck.id;
    } else itemName = itemCheck;

    return {itemName, checkForID};
}

/**
 * This function handles reducing the amount of options to below 26,
 * this avoids the display limit of over 25.
 * @param {object[]} options List of options to provide to an autocomplete interaction
 * @returns {object[]}
 */
function handleLimitOnOptions(options){
    let optionsList = [];
    if (options.length > 25){
        console.log('Too many Choices!!');
        optionsList = options.slice(0,25);
    } else optionsList = options;

    return optionsList;
}

/**
 * This function yields ``[key, value]`` pairs of a given object where:
 * 
 * {`key` Property: `value` Value}
 * @param {object} obj Object to be destructed into key: value pairs
 */
function* objectEntries(obj) {
    for (let key of Object.keys(obj)) {
        yield [key, obj[key]];
    }
}

function getTypeof(t){
    if (t === null) return "null";
    const baseType = typeof t;

    if (!["object", "function"].includes(baseType)) return baseType;
    
    const tag = t[Symbol.toStringTag];
    if (typeof tag === "string") return tag;

    if (
        baseType === "function" &&
        Function.prototype.toString.call(t).startsWith("class")
    ) return "class";

    const className = t.constructor.name;
    if (typeof className === "string" && className !== "") return className;

    return baseType;
}

function handleContentType(contents){
    let replyObj;
    switch(getTypeof(contents)){
        case "EmbedBuilder":
            replyObj = {embeds: [contents]};
        break;
        case "Array":
            console.log('Contents === Array');
            replyObj = {content: 'Array type found'};
        break;
        case "Object":
            replyObj = contents
        break;
        default:
            replyObj = {content: `Something went wrong while loading this message!`};
        break;
    }

    console.log(`Type of Contents: ${getTypeof(contents)}`);

    return replyObj;
}

/**
 * This function handles sending a message using the given values, with a self-destruct
 * timer set as per the given timeLimit.
 * @param {object} interaction Discord Interaction Object
 * @param {number} timeLimit Amount in ms to be used with setTimeout()
 * @param {any} contents One of many types, handled internally
 * @param {string} replyType One of: "FollowUp", "Reply", undefined
 * @returns {promise <void>}
 */
async function sendTimedChannelMessage(interaction, timeLimit, contents, replyType){
    const replyObject = handleContentType(contents);
    switch(replyType){
        case "FollowUp":
        return await interaction.followUp(replyObject).then(msg => setTimeout(() => {
            msg.delete();
        }, timeLimit)).catch(e => console.error(e));
        case "Reply":
        return await interaction.reply(replyObject).then(msg => setTimeout(() => {
            msg.delete();
        }, timeLimit)).catch(e => console.error(e));
        default:
        return await interaction.channel.send(replyObject).then(msg => setTimeout(() => {
            msg.delete();
        }, timeLimit)).catch(e => console.error(e));
    }
}

/**
 * This function handles updating the given ``anchorMsg`` with the provided ``editWith`` contents
 * It then wraps the resulting response in a setTimeout() self-destruct waiting ``timeLimit``ms
 * @param {object} anchorMsg Interaction Message Reference
 * @param {number} timeLimit Amount in ms to be used with setTimeout()
 * @param {object} editWith Contents to edit anchorMsg with
 * @returns {Promise<void>}
 */
async function editTimedChannelMessage(anchorMsg, timeLimit, editWith){
    const replyObject = handleContentType(editWith);
    return await anchorMsg.edit(replyObject).then(() => setTimeout(() => {
        anchorMsg.delete();
    }, timeLimit)).catch(e =>{
        if (e.code !== 10008){
            console.error(`Failed to ${e.method} a message:`, e);
        }
    });
}

/**
 * This function creates and stores a sent message as an anchor, which it then uses
 * to attach a messageComponentCollector for use with Discords interactive components.
 * Component Type is specified by ``compType`` which if left empty defaults to Button.
 * 
 * ``sCollector`` Will be undefined unless ``compType`` is ``"Both"``, 
 * ``sCollector`` can collect only ``StringSelect`` components
 * @param {object} interaction Discord Interaction Object
 * @param {number} timeLimit Amount in ms to be used with setTimeout()
 * @param {any} contents  One of many types, handled internally
 * @param {string} replyType One of: "FollowUp", "Reply", undefined
 * @param {string} compType One of: "Button", "String", "Both", undefined
 * @param {string} filterID One of: user.id, undefined
 * @returns {Promise<{anchorMsg: object, collector: object, sCollector: (object | undefined)}>}
 */
async function createInteractiveChannelMessage(interaction, timeLimit, contents, replyType, compType, filterID){
    const replyObject = handleContentType(contents);
    let anchorMsg;
    switch(replyType){
        case "FollowUp":
            anchorMsg = await interaction.followUp(replyObject);
        break;
        case "Reply":
            anchorMsg = await interaction.reply(replyObject);
        break;
        default:
            anchorMsg = await interaction.channel.send(replyObject);
        break;
    }

    let collector, sCollector;
    if (compType === 'Both'){
        const collectorPair = createComponentCollector(interaction, timeLimit, anchorMsg, compType, filterID);
        collector = collectorPair[0];
        sCollector = collectorPair[1];
    } else collector = createComponentCollector(interaction, timeLimit, anchorMsg, compType, filterID);

    return {anchorMsg, collector, sCollector};
}

/** STANDARD BUTTON/STRING COLLECTER SETTUP
 * 
 * const {anchorMsg, collector, sCollector} = await createInteractiveChannelMessage(interaction, 600000, replyObj, "FollowUp", "Both");

    // ~~~~~~~~~~~~~~~~~~~~~
    // STRING COLLECTOR
    sCollector.on('collect', async c => {
        await c.deferUpdate().then(async () => {

        }).catch(e => console.error(e));
    });
    // ~~~~~~~~~~~~~~~~~~~~~

    // =====================
    // BUTTON COLLECTOR
    collector.on('collect', async c => {
        await c.deferUpdate().then(async () => {

        }).catch(e => console.error(e));
    });
    // =====================

    // ~~~~~~~~~~~~~~~~~~~~~
    // STRING COLLECTOR
    sCollector.on('end', async (c, r) => {
        if (!r || r === 'time') await handleCatchDelete(anchorMsg);
    });
    // ~~~~~~~~~~~~~~~~~~~~~

    // =====================
    // BUTTON COLLECTOR
    collector.on('end', async (c, r) => {
        if (!r || r === 'time') await handleCatchDelete(anchorMsg);
    });
    // =====================


    ~~~ STANDARD PAGE BUTTON COLLECTER SETTUP ~~~
    // =====================
    // BUTTON COLLECTOR
    let curPage = 0;
    collector.on('collect', async c => {
        await c.deferUpdate().then(async () => {
            switch(c.customId){
                case "next-page":
                    curPage = (curPage === embedPages.length - 1) ? 0 : curPage + 1;
                break;
                case "back-page":
                    curPage = (curPage === 0) ? embedPages.length - 1 : curPage - 1;
                break;
                case "cancel":
                return collector.stop('Canceled');
            }
            await anchorMsg.edit({embeds: [embedPages[curPage]], components: [pageButtRow]});
        }).catch(e => console.error(e));
    });
    // =====================

    // =====================
    // BUTTON COLLECTOR
    collector.on('end', async (c, r) => {
        if (!r || r === 'time') await handleCatchDelete(anchorMsg);

        await handleCatchDelete(anchorMsg);
    });
    // =====================
 */

/**
 * This function attatches a component collector to the provided anchorMsg object,
 * the type of components collected is specified by compType which if not provided 
 * defaults to type ``Button``.
 * @param {object} interaction Discord Interaction Object
 * @param {number} timeLimit Amount in ms to be used with setTimeout()
 * @param {object} anchorMsg Discord message object used as an anchor
 * @param {string} compType One of: "Button", "String", "Both", undefined
 * @param {string} filterID One of: user.id, undefined
 * @returns {object}
 */
function createComponentCollector(interaction, timeLimit, anchorMsg, compType, filterID){
    const filterBY = (filterID) ? filterID : interaction.user.id;
    const filter = (i) => i.user.id === filterBY;

    let theType;
    switch(compType){
        case "Button":
            theType = ComponentType.Button;
        break;
        case "String":
            theType = ComponentType.StringSelect;
        break;
        case "Both":
            theType = [ComponentType.Button, ComponentType.StringSelect];
        break;
        default:
            theType = ComponentType.Button;
        break;
    }

    const collector = anchorMsg.createMessageComponentCollector({
        componentType: (compType !== "Both") ? theType : theType[0],
        filter,
        time: timeLimit
    });

    if (compType === "Both"){
        const sCollector = anchorMsg.createMessageComponentCollector({
            componentType: theType[1],
            filter,
            time: timeLimit
        });

        return [collector, sCollector];
    }

    return collector;
}

async function handleCatchDelete(anchorMsg){
    return await anchorMsg.delete().catch(error => {
        if (error.code !== 10008) {
            console.error('Failed to delete the message:', error);
        }
    });
}

module.exports = {
    randArrPos,
    inclusiveRandNum,
    rollChance,
    dropChance,
    makeCapital,
    checkLootDrop,
    checkLootUP,
    endTimer,
    objectEntries,
    grabUser,
    grabTown,
    grabActivePigmy,
    checkUserTownPerms,
    checkUserAsMayor,
    grabLocalTowns,
    grabTownByName,
    handleItemObjCheck,
    handleLimitOnOptions,
    getTypeof,
    sendTimedChannelMessage,
    editTimedChannelMessage,
    createInteractiveChannelMessage,
    handleCatchDelete
}