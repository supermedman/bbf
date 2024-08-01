const {chalk, chlkPreset} = require('./chalkPresets');
const {ComponentType} = require('discord.js');

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
    endTimer,
    sendTimedChannelMessage,
    createInteractiveChannelMessage
}