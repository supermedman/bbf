const {chalk, chlkPreset} = require('./chalkPresets');
const {ComponentType} = require('discord.js');
const { UserData, Pigmy } = require('./dbObjects');

/**
 * This method randomly returns an element from a given array, if the array has a
 * length of 1 that element is returned.
 * @param {any[]} arr Any type of array with any type of contents   
 * @returns {any} Contents at randomly chosen index
 */
const randArrPos = (arr) => {
    return arr[(arr.length > 1) ? Math.floor(Math.random() * arr.length) : 0];
};

const rollChance = (chance) => {
    return (Math.random() <= chance) ? true : false;
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
 * @param {string} measureName Display String for measurement
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
 * This function retrieves and returns the Pigmy Entry for the give User id.
 * @param {string} id User ID
 * @returns {promise <object>} ```(object | undefined)```
 */
async function grabActivePigmy(id){
    return await Pigmy.findOne({where: {spec_id: id}});
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
 * This function creates and stores a sent message as an anchor, which it then uses
 * to attach a messageComponentCollector for use with Discords buttons.
 * @param {object} interaction Discord Interaction Object
 * @param {number} timeLimit Amount in ms to be used with setTimeout()
 * @param {any} contents  One of many types, handled internally
 * @param {string} replyType One of: "FollowUp", "Reply", undefined
 * @returns {Promise<{anchorMsg: object, collector: object}>}
 */
async function createInteractiveChannelMessage(interaction, timeLimit, contents, replyType){
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
    
    const collector = createButtonCollector(interaction, timeLimit, anchorMsg);

    return {anchorMsg, collector};
}

function createButtonCollector(interaction, timeLimit, anchorMsg){
    const filter = (i) => i.user.id === interaction.user.id;

    const collector = anchorMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter,
        time: timeLimit
    });

    return collector;
}

module.exports = {
    randArrPos,
    inclusiveRandNum,
    rollChance,
    makeCapital,
    checkLootDrop,
    checkLootUP,
    endTimer,
    grabUser,
    grabActivePigmy,
    sendTimedChannelMessage,
    createInteractiveChannelMessage
}