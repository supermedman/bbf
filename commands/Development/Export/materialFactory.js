const {AttachmentBuilder, EmbedBuilder, Collection} = require('discord.js');

const {checkInboundMat} = require('./itemMoveContainer');
const { grabRar, grabColour } = require('../../Game/exported/grabRar');
const {checkUser, checkHintMaterialView, checkHintMaterialUnique} = require('../../Game/exported/handleHints');
const newEList = require('./Json/newEnemyList.json');
const { Town } = require('../../../dbObjects');
const { EnemyFab } = require('./Classes/EnemyFab');

const {randArrPos, grabUser, makePrettyNum} = require('../../../uniHelperFunctions');
 
// Materials from enemy kills
/**
 * This function handles dropping materials from the enemy given, accounting for
 * town bonuses, unique types, and auto deposit town settings where needed.
 * Returns Discord Interaction Reply Object
 * @param {EnemyFab} enemy EnemyFab Instance Object
 * @param {string} userid Users userid
 * @param {Map} matFiles Discord.js Collection Object
 * @param {object} interaction Command Interaction Object
 * @returns {Promise<({embeds: EmbedBuilder[], files: AttachmentBuilder[]})>} Reply Object: {embeds: [], files: []}
 */
async function handleEnemyMat(enemy, userid, matFiles, interaction){
    const enemyRef = newEList.find(e => e.ConstKey === enemy.imageCheck.checkKey);
    const matEmbedList = [];
    
    const user = await grabUser(userid);

    /**@typedef {{ Name: string, Value: number, Rarity: string, Rar_id: number, Mat_id: number, UniqueMatch?: string }} BaseMatFab */
    /**@type {Collection<string, BaseMatFab[]>} */
    const materials = interaction.client.materials;


    //const uRef = await checkUser(userid);
    if (enemyRef.UniqueType !== 'None'){
        // Enemy has unique mat type
        const uniqueMaterialMatch = materials.get('unique').find(mat => mat.UniqueMatch === enemyRef.UniqueType);
        await checkHintMaterialUnique(user, interaction);

        const usersUniqueMat = await checkInboundMat(userid, uniqueMaterialMatch, enemyRef.UniqueType, 1);
        const uniFieldValue = `Value **${makePrettyNum(usersUniqueMat.value)}c**\nType: **${enemyRef.UniqueType}**\nRarity: **${usersUniqueMat.rarity}**\nAmount Dropped: **1**`;
        const uniDisplayColour = grabColour(12);
        
        const uniqueMatEmbed = new EmbedBuilder()
        .setTitle('~Unique Material Dropped~')
        .setColor(uniDisplayColour)
        .addFields({
            name: `${usersUniqueMat.name}`,
            value: uniFieldValue
        });

        matEmbedList.push(uniqueMatEmbed);
    }
    
    const pickedMatType = randArrPos(enemyRef.DropTypes);
    const pickedRarity = grabRar(enemy.level);
    const pickedMaterial = materials.get(pickedMatType).find(mat => mat.Rar_id === pickedRarity);



    // const matChoices = enemyRef.DropTypes;
    // const matListName = randArrPos(matChoices);

    // const matFile = require(matFiles.get(matListName));

    // let matRef, rar = grabRar(enemy.level);
    // do {
    //     matRef = matFile.filter(mat => mat.Rar_id === rar);
    //     rar--;
    //     if (rar === -1) break;
    // } while (!matRef || matRef.length === 0)
    // rar++;
    // matRef = matRef[0];

    let droppedMats = 1 + Math.floor(100 * ((enemy.level * 0.01) - ((pickedRarity * 0.02) + 0.02)));
    if (droppedMats <= 0) droppedMats = 1;
    // Check for town mat bonus here
    const localTowns = await Town.findAll({ where: {guildid: interaction.guild.id }});
    let theTown = 'None', matBonus = 0;
    if (localTowns.length > 0){
        theTown = randArrPos(localTowns);
        matBonus = checkMatBonus(theTown, pickedMatType);
        if (matBonus > 0) console.log(`The Town of ${theTown.name} gives +${matBonus} to ${pickedMatType} Materials!`);
        droppedMats += matBonus;
    }
    // Check for material auto deposit into town
    // REQUIRES COREBUILD SETTINGS SETUP!!!

    // Check for material hint
    await checkHintMaterialView(user, interaction);

    // Deposit material here
    const theMat = await checkInboundMat(userid, pickedMaterial, pickedMatType, droppedMats);

    let embedTitle = '~Material Dropped~';

    let matFieldVal = `Value **${makePrettyNum(theMat.value)}c**\nType: **${pickedMatType}**\nRarity: **${theMat.rarity}**\nAmount Dropped: **${droppedMats}**`;
    if (theTown !== 'None' && matBonus > 0) matFieldVal += `\n\nThe Town of **${theTown.name}** gives **+${matBonus}** **${theMat.name}**`;
    const embedColour = grabColour(pickedRarity);

    const matTypeFile = new AttachmentBuilder(`./events/Models/json_prefabs/materialLists/mat-png/${pickedMatType}.png`);
    const matTypePng = `attachment://${pickedMatType}.png`;

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