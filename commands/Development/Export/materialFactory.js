const {AttachmentBuilder, EmbedBuilder} = require('discord.js');

const {checkInboundMat} = require('./itemMoveContainer');
const { grabRar, grabColour } = require('../../Game/exported/grabRar');
const {checkUser, checkHintMaterialView, checkHintMaterialUnique} = require('../../Game/exported/handleHints');
const newEList = require('./Json/newEnemyList.json');
const { Town } = require('../../../dbObjects');
const { EnemyFab } = require('./Classes/EnemyFab');

const {randArrPos} = require('../../../uniHelperFunctions');
 
// Materials from enemy kills
/**
 * This function handles dropping materials from the enemy given, accounting for
 * town bonuses, unique types, and auto deposit town settings where needed.
 * Returns Discord Interaction Reply Object
 * @param {EnemyFab} enemy EnemyFab Instance Object
 * @param {string} userid Users userid
 * @param {Map} matFiles Discord.js Collection Object
 * @param {object} interaction Command Interaction Object
 * @returns {Promise<({embeds: EmbedBuilder[], files: blob[]})>} Reply Object: {embeds: [], files: []}
 */
async function handleEnemyMat(enemy, userid, matFiles, interaction){
    const enemyRef = newEList.filter(e => e.ConstKey === enemy.imageCheck.checkKey)[0];
    const matEmbedList = [];
    
    const uRef = await checkUser(userid);
    if (enemyRef.UniqueType !== 'None'){
        // Enemy has unique mat type
        const matUFile = require(matFiles.get('unique'));
        const uMatRef = matUFile.filter(mat => mat.UniqueMatch === enemyRef.UniqueType)[0];

        await checkHintMaterialUnique(uRef, interaction);

        const theUMat = await checkInboundMat(userid, uMatRef, enemyRef.UniqueType, 1);

        const matUFieldVal = `Value **${theUMat.value}c**\nType: **${enemyRef.UniqueType}**\nRarity: **${theUMat.rarity}**\nAmount Dropped: **1**`;
        const matUColour = grabColour(12);
        
        const uniqueMatEmbed = new EmbedBuilder()
        .setTitle('~Unique Material Dropped~')
        .setColor(matUColour)
        .addFields({
            name: `${theUMat.name}`,
            value: matUFieldVal
        });

        matEmbedList.push(uniqueMatEmbed);
    }
    
    const matChoices = enemyRef.DropTypes;
    const matListName = randArrPos(matChoices);

    const matFile = require(matFiles.get(matListName));

    let matRef, rar = await grabRar(enemy.level);
    do {
        matRef = matFile.filter(mat => mat.Rar_id === rar);
        rar--;
        if (rar === -1) break;
    } while (!matRef || matRef.length === 0)
    rar++;
    matRef = matRef[0];

    let droppedMats = 1 + Math.floor(100 * ((enemy.level * 0.01) - ((rar * 0.02) + 0.02)));
    if (droppedMats <= 0) droppedMats = 1;
    // Check for town mat bonus here
    const localTowns = await Town.findAll({ where: {guildid: interaction.guild.id }});
    let theTown = 'None', matBonus = 0;
    if (localTowns.length > 0){
        theTown = randArrPos(localTowns);
        matBonus = checkMatBonus(theTown, matListName);
        if (matBonus > 0) console.log(`The Town of ${theTown.name} gives +${matBonus} to ${matListName} Materials!`);
        droppedMats += matBonus;
    }
    // Check for material auto deposit into town
    // REQUIRES COREBUILD SETTINGS SETUP!!!

    // Check for material hint
    await checkHintMaterialView(uRef, interaction);

    // Deposit material here
    const theMat = await checkInboundMat(userid, matRef, matListName, droppedMats);

    let embedTitle = '~Material Dropped~';

    let matFieldVal = `Value **${theMat.value}c**\nType: **${matListName}**\nRarity: **${theMat.rarity}**\nAmount Dropped: **${droppedMats}**`;
    if (theTown !== 'None' && matBonus > 0) matFieldVal += `\n\nThe Town of **${theTown.name}** gives **+${matBonus}** **${theMat.name}**`;
    const embedColour = grabColour(rar);

    const matTypeFile = new AttachmentBuilder(`./events/Models/json_prefabs/materialLists/mat-png/${matListName}.png`);
    const matTypePng = `attachment://${matListName}.png`;

    const matEmbed = new EmbedBuilder()
    .setTitle(embedTitle)
    .setThumbnail(matTypePng)
    .setColor(embedColour)
    .addFields({
        name: `${theMat.name}`,
        value: matFieldVal
    });

    matEmbedList.push(matEmbed);

    const replyObj = {embeds: matEmbedList, files: [matTypeFile]};
    return replyObj;
}

/**
 * This function handles the given towns material bonus info and checks it against
 * the material dropped for a match, if not found returns 0. If found returns match.
 * @param {object} town Town db instance object
 * @param {string} matType Material type string
 * @returns {number} 0 || bonus_amount
 */
function checkMatBonus(town, matType){
    const matTypes = town.mat_bonus.split(',');
    const matMatch = matTypes.filter(mat => mat === matType);
    if (matMatch.length === 0) return 0;

    let matchIdx = matTypes.indexOf(matMatch[0]);
    if (matchIdx === 3) matchIdx--;

    const allignBonus = {
        Normal: [10, 5, 3],
        Evil: [5, 3, 1],
        Phase: [10, 8, 5],
    };

    const allignmentSlices = town.local_biome.split('-');
    const matBonus = allignBonus[`${allignmentSlices[1]}`][matchIdx];
    return matBonus;
}

// Materials from dismantle
function handleDisMat(){

}

// Materials from pigmy claim
function handlePigmyMat(){

}

// Materials from npcs?


module.exports = {
    handleEnemyMat
}