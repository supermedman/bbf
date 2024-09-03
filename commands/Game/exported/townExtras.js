const { ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder, Collection, ActionRowBuilder } = require("discord.js");
const { CoreBuilding, TownPlots, PlayerBuilding, TownMaterial } = require("../../../dbObjects");
const { makeCapital, grabUser, endTimer, randArrPos } = require("../../../uniHelperFunctions");
const { loadBuilding } = require("./displayBuilding");
const { baseCheckRarName } = require("../../Development/Export/itemStringCore");
const { checkInboundTownMat, checkOutboundMat, checkInboundMat, checkOutboundTownMat } = require("../../Development/Export/itemMoveContainer");
const { updateUserCoins, spendUserCoins } = require("../../Development/Export/uni_userPayouts");
const {theClergymansQuest} = require('./theClergyman');
const coreBuildCostList = require('../../Development/Export/Json/coreBuildCostList.json');
const coreSettingsList = require('../../Development/Export/Json/coreSettingTemplate.json');

// ===================
//   BUTTON CREATION
// ===================

// DEPOSIT/WITHDRAW BUTTS
/**
 * This function loads the deposit/withdraw type select buttons
 * @param {string} subCom Current Subcommand Name
 * @returns {ButtonBuilder[]}
 */
function loadTownStoreButts(subCom){
    const matSelectButt = new ButtonBuilder()
    .setCustomId('mat')
    .setStyle(ButtonStyle.Primary)
    .setLabel(`${subCom} Material`);
    const coinSelectButt = new ButtonBuilder()
    .setCustomId('coin')
    .setStyle(ButtonStyle.Primary)
    .setLabel(`${subCom} Coins`);

    return [matSelectButt, coinSelectButt];
}

// CLAIM PLOTS BUTTS
/**
 * This function loads the claim town plot buttons
 * @param {object} permList Users Town Permission Object 
 * @returns {ButtonBuilder[]}
 */
function loadClaimPlotButts(permList){
    const openedPlotsButt = new ButtonBuilder()
    .setCustomId('open-plot')
    .setStyle(ButtonStyle.Primary)
    .setLabel(`Claim Open Plot`);
    const closedPlotsButt = new ButtonBuilder()
    .setCustomId('closed-plot')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(!permList.canEdit)
    .setLabel(`Claim Closed Plot`);

    return [openedPlotsButt, closedPlotsButt];
}

// OWNED PLOTS BUTTS
/**
 * This function loads the owned plots selection buttons
 * @param {object} permList Users Town Permission Object 
 * @returns {ButtonBuilder[]}
 */
function loadOwnedPlotSelectButts(permList){
    const opOneButt = new ButtonBuilder()
    .setCustomId('plot-one')
    .setStyle(ButtonStyle.Primary)
    .setLabel('Plot One');
    const opTwoButt = new ButtonBuilder()
    .setCustomId('plot-two')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(!permList.canEdit)
    .setLabel('Plot Two');
    const opThreeButt = new ButtonBuilder()
    .setCustomId('plot-three')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(!permList.canEdit)
    .setLabel('Plot Three');

    return [opOneButt, opTwoButt, opThreeButt];
}

// CORE BUTT LIST
/**
 * This function loads the button list related to the given towns core buildings
 * 
 * Buttons are disabled if the ``Core Building`` **is** ``Built``
 * IDS: ``build-${coretype}``
 * @param {object} town Town DB Object
 * @returns {Promise <{noChoices: boolean, buttons: ButtonBuilder[]}>}
 */
async function loadCoreBuildTypeButtons(town){
    const townCores = await grabTownCoreBuildings(town);

    let totalChoices = 5;
    const coreIsBuilt = (checkType) => townCores.some(core => core.build_type === checkType);

    const coreTypes = ['grandhall', 'bank', 'market', 'tavern', 'clergy'];
    const buttList = [];
    for (const type of coreTypes){
        const isBuilt = coreIsBuilt(type);
        if (isBuilt) totalChoices--;
        const button = new ButtonBuilder()
        .setCustomId(`build-${type}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(isBuilt)
        .setLabel(`Build ${makeCapital(type)}`);
        buttList.push(button);
    }

    return {noChoices: totalChoices === 0, buttons: buttList};
}

/**
 * This function loads the button list related to the given towns core buildings
 * 
 * Buttons are disabled if the ``Core Building`` **is not** ``Built``
 * IDS: ``upgrade-${coretype}``
 * @param {object} town Town DB Object
 * @returns {Promise <{noChoices: boolean, buttons: ButtonBuilder[]}>}
 */
async function loadCoreUpgradeTypeButtons(town){
    const townCores = await grabTownCoreBuildings(town);

    let totalChoices = 5;
    const coreIsBuilt = (checkType) => townCores.some(core => core.build_type === checkType);

    const coreTypes = ['grandhall', 'bank', 'market', 'tavern', 'clergy'];
    const buttList = [];
    for (const type of coreTypes){
        const isBuilt = coreIsBuilt(type);
        if (!isBuilt) totalChoices--;
        const button = new ButtonBuilder()
        .setCustomId(`upgrade-${type}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!isBuilt)
        .setLabel(`Upgrade ${makeCapital(type)}`);
        buttList.push(button);
    }

    return {noChoices: totalChoices === 0, buttons: buttList};
}

/**
 * This function loads the button list related to the given towns core buildings
 * 
 * Buttons are disabled if the ``Core Building`` **is not** ``Built``
 * IDS: ``select-${coretype}``
 * @param {object} town Town DB Object
 * @returns {Promise <{noChoices: boolean, buttons: ButtonBuilder[]}>}
 */
async function loadBuiltCoreTypeButtons(town){
    const townCores = await grabTownCoreBuildings(town);

    let totalChoices = 5;
    const coreIsBuilt = (checkType) => townCores.some(core => core.build_type === checkType);

    const coreTypes = ['grandhall', 'bank', 'market', 'tavern', 'clergy'];
    const buttList = [];
    for (const type of coreTypes){
        const isBuilt = coreIsBuilt(type);
        if (!isBuilt) totalChoices--;
        const button = new ButtonBuilder()
        .setCustomId(`select-${type}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!isBuilt)
        .setLabel(`${makeCapital(type)}`);
        buttList.push(button);
    }

    return {noChoices: totalChoices === 0, buttons: buttList};
}

/**
 * This function loads all plot building option buttons
 * 
 * houseButt: ``build-house``
 * @returns {ActionRowBuilder}
 */
function createBuildTypeButtonRow(){
    const houseButt = new ButtonBuilder()
    .setCustomId('build-house')
    .setStyle(ButtonStyle.Primary)
    .setLabel('Build House!');

    const buttonRow = new ActionRowBuilder().addComponents(houseButt);

    return buttonRow;
}

// ====================
//   DISPLAY CREATION
// ====================

/**
 * This function generates the embed values for the ``town`` requested.
 * @param {object} town Town DB Object
 * @param {object} mayor UserData DB Object
 * @returns {Promise <{title: string, color: string, fields: {name: string, value: string}[]}>}
 */
async function generateTownDisplayEmbed(town, mayor){
    const finalObj = {
        title: `== Town of ${makeCapital(town.name)} ==`,
        color: "",
        fields: []
    };

    // finalObj.description = `Current Mayor: ${mayor.username}\nTown Level: ${town.level}\nTreasury Contains: ${town.coins}c\n========\nHuman Population: ${town.population}\nNPC Population: ${town.npc_population}\n========\nMax Buildings: ${town.buildlimit}\nOpen Plots: ${town.openplots}\nClosed Plots: ${town.closedplots}\nOwned Plots: ${town.ownedplots}\nBuildings: ${town.buildcount}\n========\nMain Biome: ${biomeList[0]}\nAllignment: ${biomeList[1]}\n========\n`;

    // Basic Info
    // ==========
    // Level, Coins, Location, Population
    const locationSwitch = town.local_biome.split("-");
    const basicField = {
        name: '== Basic Info ==',
        value: `Town Level: **${town.level}**\nTown Coins: **${town.coins}**c\nTown Biome: **${locationSwitch[1]} ${locationSwitch[0]}**\nPlayer Population: **${town.population}**\nNPC Population: **${town.npc_population}**`
    };

    // Mayor Info
    // ==========
    // Cur-User?
    // const theMayor = await grabUser(town.mayorid);
    const mayorField = {
        name: '== The Mayor ==',
        value: `**${makeCapital(mayor.username)}**`
    };

    // Build Info
    // ==========
    // Tot-Plots, Open, Closed, Built
    const buildFields = {
        name: '== Plot Info ==',
        value: `Total Plots: **${town.buildlimit}**\nOpen Plots: **${town.openplots}**\nClosed Plots: **${town.closedplots}**\nOwned Plots: **${town.ownedplots}**\nDeveloped Plots: **${town.buildcount}**`
    };

    // Core Info
    // =========
    // Grandhall, Bank, Market, Tavern, Clergy
    /**
     * This method loads the appropete display text given the status of a core building.
     * @param {string} status Corebuilding build status
     * @returns {string}
     */
    const loadCoreTextFromStatus = (status) => {
        return (status === 'None') ? "Not Built" : `Progress: ${status.split(': ')[0]} @ ${status.split(': ')[1]}`;
    };
    // 0 Grandhall, 1 Bank, 2 Market, 3 Tavern, 4 Clergy
    const coreTextList = [
        loadCoreTextFromStatus(town.grandhall_status), 
        loadCoreTextFromStatus(town.bank_status), 
        loadCoreTextFromStatus(town.market_status), 
        loadCoreTextFromStatus(town.tavern_status), 
        loadCoreTextFromStatus(town.clergy_status)
    ];
    const coreFields = {
        name: '== Core-Building Info ==',
        value: `Grandhall Status: **${coreTextList[0]}**\nBank Status: **${coreTextList[1]}**\nMarket Status: **${coreTextList[2]}**\nTavern Status: **${coreTextList[3]}**\nClergy Status: **${coreTextList[4]}**`
    };

    // Embed Fields
    finalObj.fields = [mayorField, basicField, buildFields, coreFields];

    const biomeColours = {
        Forest: 'DarkGreen',
        Mountain: 'LightGrey',
        Desert: 'DarkGold',
        Plains: 'Gold',
        Swamp: 'DarkAqua',
        Grassland: 'Green'
    };

    // Embed Colour
    finalObj.color = biomeColours[`${locationSwitch[0]}`];

    return finalObj;
}

/**
 * This function loads the display object for all local town material bonuses available.
 * @param {object[]} towns List of all local towns
 * @returns {{title: string, color: string, fields: {name: string, value: string}[]}}
 */
function generateLocalTownBonuses(towns){
    const finalObj = {
        title: `== Local Town Bonuses ==`,
        color: "",
        fields: []
    };

    const allignMatBonus = {
        Normal: [10, 5, 3, 3],
        Evil: [5, 3, 1, 1],
        Phase: [10, 8, 5, 5],
    };

    const finalFields = [];
    for (const town of towns){
        const matTypes = town.mat_bonus.split(',');
        const bonusList = allignMatBonus[`${town.local_biome.split('-')[1]}`];

        let bonusIdx = 0, finalValue = "";
        for (const type of matTypes){
            finalValue += `+${bonusList[bonusIdx]} ${makeCapital(type)}\n`;
            bonusIdx++;
        }

        finalFields.push({name: `The Town of ${makeCapital(town.name)} gives: `, value: finalValue});
    }

    finalObj.fields = finalFields;
    finalObj.color = 'DarkGold';

    return finalObj;
}

/**
 * This function loads all player made buildings located within the given town.
 * @param {object} town Town DB Object
 * @returns {Promise <{embeds: EmbedBuilder[], files: AttachmentBuilder[], details: EmbedBuilder[]}>}
 */
async function loadTownBuildingDisplayList(town){
    const returnObj = {embeds: [], files: [], details: []};

    const builtPlots = await grabTownPlotList(town, "Built");

    for (const plot of builtPlots){
        const building = await PlayerBuilding.findOne({where: {plotid: plot.plotid}});

        const mainEmbed = new EmbedBuilder()
        .setTitle(`== ${makeCapital(building.build_type)} ==`)
        .setColor('DarkGold');
        returnObj.embeds.push(mainEmbed);

        const mainFile = await loadBuilding(building);
        returnObj.files.push(mainFile);

        const detailEmbed = new EmbedBuilder()
        .setTitle('== Building Details ==')
        .setColor('DarkNavy')
        .setDescription(`Town: ${makeCapital(town.name)}\nOwner: ${makeCapital((await grabUser(building.ownerid)).username)}\nBand: No Linked Band`);
        returnObj.details.push(detailEmbed);
    }

    return returnObj;
}

/**
 * This function loads all built core buildings for the given town, ready to be displayed
 * @param {object} town Town DB Object
 * @returns {Promise <{embeds: EmbedBuilder[], files: AttachmentBuilder[], details: EmbedBuilder[], clergyQuest: {active: boolean, posIndex: number, callFunction: theClergymansQuest}}>}
 */
async function loadTownCoreBuildingDisplayList(town){
    const returnObj = {embeds: [], files: [], details: [], clergyQuest: {active: false, posIndex: 0, callFunction: theClergymansQuest}};
    const townCores = await grabTownCoreBuildings(town);

    for (const core of townCores){
        const mainEmbed = new EmbedBuilder()
        .setTitle(`== ${makeCapital(core.build_type)} ==`)
        .setColor('DarkGold');
        returnObj.embeds.push(mainEmbed);

        const mainFile = await loadBuilding(core);
        returnObj.files.push(mainFile);

        const detailEmbed = new EmbedBuilder()
        .setTitle('== Core Building Details ==')
        .setColor('DarkNavy')
        .setDescription(`Town: ${makeCapital(town.name)}\n${makeCapital(core.build_type)} Level: ${core.level}`);
        returnObj.details.push(detailEmbed);

        if (core.build_type === 'clergy'){
            returnObj.clergyQuest.active = true;
            returnObj.clergyQuest.posIndex = returnObj.details.length - 1;
        }
    }

    return returnObj;
}

/**
 * This function handles loading the given towns owned material list display.
 * @param {object} town Town DB Object
 * @param {Collection} materialFiles Material File Collection Object
 * @returns {Promise <EmbedBuilder[]>}
 */
async function handleTownMaterialStorageDisplay(town, materialFiles){
    const fullTownMaterialList = await TownMaterial.findAll({where: {townid: town.townid}})
    const materialPages = [];
    for (const [key, value] of materialFiles){
        const matType = key;
        const matEmbed = new EmbedBuilder()
        .setTitle(`== ${makeCapital(matType)} Type Materials ==`);

        const matList = require(value);
        matList.sort((a,b) => a.Rar_id - b.Rar_id);

        const refListLength = matList.length;
        let missingAll = false;

        const matchingOwnedMats = (key === "unique") 
        ? fullTownMaterialList.filter(mat => mat.rar_id === 12)
        : fullTownMaterialList.filter(mat => mat.mattype === key);
        if (matchingOwnedMats.length === 0) missingAll = true;

        const orderedUMats = new Array(refListLength);
        if (!missingAll){
            let counter = 0;
            for (const matRef of matList){
                orderedUMats[counter] = (key === "unique") 
                ? matchingOwnedMats.filter(mat => mat.mattype === matRef.UniqueMatch)[0] ?? matRef.Rar_id
                : matchingOwnedMats.filter(mat => mat.rar_id === matRef.Rar_id)[0] ?? matRef.Rar_id;
                counter++;
            }
        }

        const matFields = handleMaterialDisplay(orderedUMats, matList, missingAll);
        matEmbed.addFields(matFields);
        
        materialPages.push(matEmbed);
    }

    return materialPages;
}

/**
 * This function constructs the field array to be used for displaying mats,
 * by way of EmbedBuilder.addFields(finalFields)
 * @param {(object|string)[]} matchMatList Array of owned materials
 * @param {object[]} matRefList Material list array
 * @param {boolean} emptyMatch true if no matching mats found
 * @returns {{name: string, value: string}[]} Object array 
 */
function handleMaterialDisplay(matchMatList, matRefList, emptyMatch){
    const finalFields = [];
    
    for (let i = 0; i < matRefList.length; i++){
        let fieldName = '', fieldValue = '';
        if (typeof matchMatList[i] === 'number' || emptyMatch){
            // Missing Material
            fieldName = `Unknown material of **${matRefList[i].Rarity}** rarity:`;
            fieldValue = 'Amount Owned: 0';
        } else {
            // Matching Material
            fieldName = `~= ${matRefList[i].Rarity} Material =~`;
            fieldValue = `Name: **__${matchMatList[i].name}__**\nAmount Owned: **${matchMatList[i].amount}**`;
        }

        finalFields.push({name: fieldName, value: fieldValue});
    }

    return finalFields;
}

/**
 * This function handles building the display for the upgrade costs given the construction type picked
 * @param {object} town Town DB Object
 * @param {object} navMenu Nav menu object holding all user selected values needed
 * @param {string} constructType One of ``build`` | ``upgrade``
 * @param {Collection} materialFiles Material File Collection Object
 * @returns {Promise<{canConfirm: boolean, embed: EmbedBuilder, costObj: {matCosts: {name: string, matType: string, amount: number, rar_id: number}[], matsOwned: {name: string, matType: string, amount: number, rar_id: number}[]}}>}
 */
async function handleCoreCostDisplay(town, navMenu, constructType, materialFiles){
    // Town is needed for checking owned material amounts

    let coreBuildCostObj;
    switch(constructType){
        case "build":
            coreBuildCostObj = await handleCoreCostCalc(town, 0, navMenu.typePicked, materialFiles);
        break;
        case "upgrade":
            const coreRef = (await grabTownCoreBuildings(town)).find(core => core.build_type === navMenu.typePicked);
            coreBuildCostObj = await handleCoreCostCalc(town, coreRef.level, coreRef.build_type, materialFiles);
        break;
    }

    const costEmbed = new EmbedBuilder()
    .setTitle(`== ${makeCapital(constructType)} Cost ==`)
    .setDescription(`Material Requirements to begin core building construction:`);

    const finalFields = [];
    let idxMatch = 0, canConfirm = true;
    for (const matNeeded of coreBuildCostObj.matCosts){
        const matOwned = coreBuildCostObj.matsOwned[idxMatch];
        if (canConfirm && matOwned.amount < matNeeded.amount) canConfirm = false;
        finalFields.push({name: `== ${matNeeded.name} ==`, value: `Rarity: ${baseCheckRarName(matNeeded.rar_id)}\n(Owned/Needed) Amount: ${matOwned.amount}/${matNeeded.amount}`});
        idxMatch++;
    }

    costEmbed.addFields(finalFields);

    return {canConfirm: canConfirm, embed: costEmbed, costObj: coreBuildCostObj};
}

// ====================
//   HELPER FUNCTIONS
// ====================

/**
 * This function handles calculating the cost to build/upgrade the given ``coreType`` building.
 * @param {object} town Town DB Object
 * @param {number} level Current Level of the given core building
 * @param {string} coreType Core Building ``build_type``
 * @param {Collection} materialFiles Material File Collection Object
 * @returns {Promise <{matCosts: {name: string, matType: string, amount: number, rar_id: number}[], matsOwned: {name: string, matType: string, amount: number, rar_id: number}[]}>}
 */
async function handleCoreCostCalc(town, level, coreType, materialFiles){
    const matTypeConverter = new Map([
        ['rocky', 'Stone'],
        ['woody', 'Wood'],
        ['metalic', 'Metal'],
        ['skinny', 'Hide'],
        ['slimy', 'Slime']
    ]);

    const coreCostRef = coreBuildCostList.find(core => core.Name === coreType);

    const handleCoreMaterialScale = (lvl, costObj) => {
        return costObj.Amount * (1 + (lvl - (costObj.Level)));
    };

    const handleCoreMaterialRarity = (lvl, costObj) => {
        return costObj.Rarity + Math.floor(lvl / 2);
    };

    const nextLevel = level + 1;
    const materialCostList = [], materialOwnedList = [];
    for (const [matType, convType] of matTypeConverter){
        // Check if next level !requires convType
        if (coreCostRef[convType].Level > nextLevel) continue;
        const curMatCostRef = coreCostRef[convType];

        const matNumNeeded = handleCoreMaterialScale(nextLevel, curMatCostRef);
        const matRarNeeded = handleCoreMaterialRarity(nextLevel, curMatCostRef);
        
        const matRef = grabMaterialByRarID(matRarNeeded, matType, materialFiles);

        materialCostList.push({name: matRef.Name, matType: matType, amount: matNumNeeded, rar_id: matRarNeeded});
    
        const townOwnsMat = await TownMaterial.findOne({where: {townid: town.townid, name: matRef.Name}});
        materialOwnedList.push({name: matRef.Name, matType: matType, amount: townOwnsMat?.amount ?? 0, rar_id: matRarNeeded});
    }

    return {matCosts: materialCostList, matsOwned: materialOwnedList};
}

/**
 * This function retrieves a material ref object based on the given ``rar`` & ``matType``
 * @param {number} rar RarID to search for
 * @param {string} matType Material Type to search for
 * @param {Collection} materialFiles Discord Collection object
 * @returns {object}
 */
function grabMaterialByRarID(rar, matType, materialFiles){
    const matFile = require(materialFiles.get(matType));

    const matRef = matFile.find(mat => mat.Rar_id === rar);

    return matRef;
}

// ====================
//   DATABASE QUERIES
// ====================

/**
 * This function loads all existing core buildings matching the given towns id.
 * @param {object} town Town DB Object
 * @param {boolean} [returnLength=false] Set to ``true`` to return the ``.length`` for "built" core buildings
 * @returns {Promise <object[]>}
 */
async function grabTownCoreBuildings(town, returnLength=false){
    const coreTypes = ['grandhall', 'bank', 'market', 'tavern', 'clergy'];

    const townCoreList = [];
    for (const type of coreTypes){
        const core = await CoreBuilding.findOne({where: {townid: town.townid, build_type: type}});
        if (!core) continue;
        townCoreList.push(core);
    }

    return (returnLength) ? townCoreList.length : townCoreList;
}

/**
 * This function handles locating all plots belonging to the given town.
 * 
 * It then filters them based on the provided ``plotStatus``.
 * @param {object} town Town DB Object
 * @param {string} plotStatus One of: ``Owned``, ``Closed``, ``Open``, ``Built``, ``Empty``
 * @param {boolean} returnLength Default: ``false``, set to ``true`` to return found plots list length
 * @returns {Promise <object[] | number>}
 */
async function grabTownPlotList(town, plotStatus, returnLength=false){
    const townPlots = await TownPlots.findAll({where: {townid: town.townid}});

    const hasOwner = (plot) => plot.ownerid !== '0';
    const hasBuild = (plot) => !plot.empty;
    const isClosed = (plot) => plot.private;

    let filteredPlotList = [];
    switch(plotStatus){
        case "Owned":
            filteredPlotList = townPlots.filter(plot => hasOwner(plot));
        break;
        case "Closed":
            filteredPlotList = townPlots.filter(plot => isClosed(plot) && !hasOwner(plot));
        break;
        case "Open":
            filteredPlotList = townPlots.filter(plot => !isClosed(plot) && !hasOwner(plot));
        break;
        case "Built":
            filteredPlotList = townPlots.filter(plot => hasBuild(plot));
        break;
        case "Empty":
            filteredPlotList = townPlots.filter(plot => !hasBuild(plot) && hasOwner(plot));
        break;
        default:
            filteredPlotList = townPlots;
        break;
    }

    return (returnLength) ? filteredPlotList.length : filteredPlotList;
}

/**
 * This function checks if the given town has at least one stored material
 * @param {object} town Town DB Object
 * @returns {Promise <boolean>}
 */
async function checkTownHasMaterials(town){
    const hasMat = await TownMaterial.findOne({where: {townid: town.townid}});
    return !!hasMat;
}


// ====================
//   DATABASE UPDATES
// ====================

/**
 * This function handles updating both the ``town`` and ``user`` objects given.
 * 
 * ``town.population++``
 * 
 * ``user.townid`` = ``town.townid``
 * @param {object} town Town DB Object
 * @param {object} user UserData DB Object
 * @returns {Promise <{embeds: EmbedBuilder, status: string}>}
 */
async function handleJoinTown(town, user){
    await town.increment('population').then(async t => await t.save()).then(async t => {return await t.reload()});
    await handleTownPopLeveling(town);
    await user.update({townid: town.townid}).then(async u => await u.save()).then(async u => {return await u.reload()});

    const finalEmbed = new EmbedBuilder()
    .setTitle('== Town Joined ==')
    .setDescription(`Congratulations!! You are now a member of ${makeCapital(town.name)}!`);

    return {embeds: finalEmbed, status: 'Complete'};
}

/**
 * This function handles checking if the given ``town`` meets the level up requirements.
 * @param {object} town Town DB Object
 * @returns {Promise <void>}
 */
async function handleTownPopLeveling(town){
    const townLevelCheckStart = new Date().getTime();
    let timerEndsText = 'Town Level Checking';

    const staticTownPopLevelReq = (town) => {
        const totPop = town.population + town.npc_population;
        const levelUPReq = town.level * 5;
        return totPop >= levelUPReq;
    };

    if (staticTownPopLevelReq(town)) {
        await town.increment('level').then(async t => await t.save()).then(async t => {return await t.reload()});
        // CHANGE THIS VALUE BASED ON LEVEL/OTHER FACTORS!!
        const plotsNeeded = 5;
        await handleNewTownPlotCreation(town, plotsNeeded);
        timerEndsText += ' (LEVEL UP)';
    }

    endTimer(townLevelCheckStart, timerEndsText);
    return;
}

/**
 * This function generates ``plotAmount`` new plots linked by ``town.townid``.
 * @param {object} town Town DB Object
 * @param {number} plotAmount Number of new plots to create
 * @returns {Promise <void>}
 */
async function handleNewTownPlotCreation(town, plotAmount){
    const makeNewPlotsStart = new Date().getTime();
    for (let i = 0; i < plotAmount; i++){
        await TownPlots.create({
            townid: town.townid
        }).then(async tp => await tp.save()).then(async tp => {return await tp.reload()});
    }

    await handleUpdateTownPlotTypeAmounts(town);

    endTimer(makeNewPlotsStart, 'Create New Town Plots');
    console.log(`Current Total Plots for ${makeCapital(town.name)}: %d`, await TownPlots.findAll({where: {townid: town.townid}}).length);
}

/**
 * This function checks and updates any plots !matching amount values found.
 * @param {object} town Town DB Object
 */
async function handleUpdateTownPlotTypeAmounts(town){
    const openPlots = await grabTownPlotList(town, "Open", true);
    if (town.openplots !== openPlots) await town.update({openplots: openPlots}).then(async t => await t.save()).then(async t => {return await t.reload()});
    const closedPlots = await grabTownPlotList(town, "Closed", true);
    if (town.closedplots !== closedPlots) await town.update({closedplots: closedPlots}).then(async t => await t.save()).then(async t => {return await t.reload()});
    const ownedPlots = await grabTownPlotList(town, "Owned", true);
    if (town.ownedplots !== ownedPlots) await town.update({ownedplots: ownedPlots}).then(async t => await t.save()).then(async t => {return await t.reload()});
    const builtPlots = await grabTownPlotList(town, "Built", true);
    if (town.buildcount !== builtPlots) await town.update({buildcount: builtPlots}).then(async t => await t.save()).then(async t => {return await t.reload()});

}

/**
 * This function handles appointing/demoting a selected user from a given town.
 * @param {object} town Town DB Object
 * @param {object} user UserData DB Object
 * @param {string} changeType One of: ``appoint`` | ``demote``
 * @returns {Promise <{embeds: EmbedBuilder, status: string}>}
 */
async function updateTownCanEditList(town, user, changeType){
    const curEditList = town.can_edit.split('-');

    const returnEmbed = new EmbedBuilder();
    let newEditList;
    switch(changeType){
        case "appoint":
            newEditList = curEditList.push(user.userid);
            returnEmbed
            .setTitle('== User Appointed ==')
            .setDescription(`${makeCapital(user.username)} has been appointed to your town!`);
        break;
        case "demote":
            newEditList = curEditList.filter(id => id !== user.userid);
            returnEmbed
            .setTitle('== User Demoted ==')
            .setDescription(`${makeCapital(user.username)} has been demoted from your town!`);
        break;
    }

    await town.update({can_edit: newEditList.toString()}).then(async t => await t.save()).then(async t => {return await t.reload()});

    return {embeds: [returnEmbed], status: 'Complete'};
}

/**
 * This function handles transfering ownership of the given town, to the given user.
 * @param {object} town Town DB Object
 * @param {object} user UserData DB Object
 * @returns {Promise <{embeds: EmbedBuilder, status: string}>}
 */
async function updateTownMayor(town, user){
    await town.update({mayorid: user.userid}).then(async t => await t.save()).then(async t => {return await t.reload()});

    const returnEmbed = new EmbedBuilder()
    .setTitle('== Transfer Complete ==')
    .setDescription(`${makeCapital(user.username)} has been made the new mayor!`);

    return {embeds: [returnEmbed], status: 'Complete'};
}

/**
 * This function handles deposit logic and updating inventories with applicable amounts and items
 * @param {object} town Town DB Object, town recieving goods
 * @param {object} user UserData DB Object, user giving goods
 * @param {object} navMenu Nav menu object holding all user selected values needed
 * @returns {Promise <EmbedBuilder>}
 */
async function handleDepositIntoTown(town, user, navMenu){
    switch(navMenu.typePicked){
        case "mat":
            // Give to Town
            await checkInboundTownMat(town.townid, navMenu.typeExtras.ref, navMenu.typeExtras.matType, navMenu.moveAmount);
            // Take from user
            await checkOutboundMat(user.userid, navMenu.typeExtras.ref, navMenu.typeExtras.matType, navMenu.moveAmount);
        break;
        case "coin":
            // Give to town
            await updateUserCoins(navMenu.moveAmount, town);
            // take from user
            await spendUserCoins(navMenu.moveAmount, user);
        break;
    }

    const finalEmbed = new EmbedBuilder()
    .setTitle('== Deposit Successful ==');

    return finalEmbed;
}

/**
 * This function handles withdraw logic and updating inventories with applicable amounts and items
 * @param {object} town Town DB Object, town giving goods
 * @param {object} user UserData DB Object, user recieving goods
 * @param {object} navMenu Nav menu object holding all user selected values needed
 * @returns {Promise <EmbedBuilder>}
 */
async function handleWithdrawFromTown(town, user, navMenu){
    switch(navMenu.typePicked){
        case "mat":
            // Give to User
            await checkInboundMat(user.userid, navMenu.typeExtras.ref, navMenu.typeExtras.matType, navMenu.moveAmount);
            // Take from Town
            await checkOutboundTownMat(town.townid, navMenu.typeExtras.ref, navMenu.typeExtras.matType, navMenu.moveAmount);
        break;
        case "coin":
            // Give to User
            await updateUserCoins(navMenu.moveAmount, user);
            // Take from Town
            await spendUserCoins(navMenu.moveAmount, town);
        break;
    }

    const finalEmbed = new EmbedBuilder()
    .setTitle('== Withdraw Successful ==');

    return finalEmbed;
}

/**
 * This function handles updating ``TownPlot.private`` for the given towns plots of ``currentPlotStatus``. 
 * @param {object} town Town DB Object
 * @param {object} navMenu Nav menu object holding all user selected values needed
 */
async function handleTownPlotStatusUpdates(town, navMenu){
    const grabType = (navMenu.typePicked === "Open") ? "Closed" : "Open";
    const townPlots = await grabTownPlotList(town, grabType);

    console.log('Total Plots: %d', townPlots.length);

    for (let i = 0; i < navMenu.moveAmount; i++){
        await townPlots[i].update({private: navMenu.typePicked !== 'Open'})
        .then(async tp => await tp.save())
        .then(async tp => {return await tp.reload()});
    }

    await handleUpdateTownPlotTypeAmounts(town);
}

/**
 * This function handles claiming a random unowned plot, assigning the plot to the given user,
 * then updates the plot counts of the given town.
 * @param {object} town Town DB Object
 * @param {object} user UserData DB Object, user claiming plot
 * @param {object} navMenu Nav menu object holding all user selected values needed
 */
async function handleTownPlotClaim(town, user, navMenu){
    const townPlots = await grabTownPlotList(town, navMenu.navType);

    const thePlot = randArrPos(townPlots);

    await thePlot.update({ownerid: user.userid, private: true})
    .then(async tp => await tp.save())
    .then(async tp => {return await tp.reload()});

    await handleUpdateTownPlotTypeAmounts(town);
}

// Biome Background Texture Array:
// Used for Building canvas creation.
const biomeBTexList = ["None", "Forest", "Mountain", "Desert", "Plains", "Swamp", "Grassland"];

/**
 * This function handles building the selected build type on on of the users owned && empty plots.
 * 
 * Constructs the building display image for the newly created building and returns it.
 * @param {object} town Town DB Object
 * @param {object} user UserData DB Object, user building
 * @param {object} navMenu Nav menu object holding all user selected values needed
 * @returns {Promise<{embeds: EmbedBuilder[]; files: (string | AttachmentBuilder)[];}>}
 */
async function handleBuildingOnTownPlot(town, user, navMenu){
    const townOwnedPlots = await grabTownPlotList(town, "Empty");
    const ownedPlotPicked = townOwnedPlots.find(plot => plot.ownerid === user.userid);  // .filter(plot => plot.ownerid === user.userid)[0];

    await ownedPlotPicked.update({empty: false})
    .then(async tp => await tp.save())
    .then(async tp => {return await tp.reload()});

    await handleUpdateTownPlotTypeAmounts(town);

    const building = await PlayerBuilding.create({
        townid: town.townid,
        ownerid: user.userid,
        plotid: ownedPlotPicked.plotid,
        can_edit: user.userid,
        build_type: navMenu.typePicked,
        background_tex: biomeBTexList.indexOf(town.local_biome.split('-')[0])
    }).then(async b => await b.save()).then(async b => {return await b.reload()});

    const buildingPngFile = await loadBuilding(building);

    let dynBuildDesc = `New ${makeCapital(navMenu.typePicked)} created!`;
    if (navMenu.typePicked === 'house') dynBuildDesc += `\nWelcome home! <3`;
    const buildingCreateEmbed = new EmbedBuilder()
    .setTitle('== Building Created ==')
    .setColor('DarkGold')
    .setDescription(dynBuildDesc);

    return {embeds: [buildingCreateEmbed], files: [buildingPngFile]};
}

/**
 * This function handles both newly built core buildings and upgrading existing ones.
 * 
 * Is responsable for returning the core building display upon completion.
 * @param {object} town Town DB Object
 * @param {object} navMenu Nav menu object holding all user selected values needed
 * @returns {Promise <{embeds: EmbedBuilder[], files: AttachmentBuilder[]}>}
 */
async function handleCoreBuildingConstruction(town, navMenu){
    const coreTypeDefaultSettings = (coreSettingsList.find(cs => cs.Type === navMenu.typePicked)).Data;

    let coreBuilding = await CoreBuilding.findOrCreate({
        where: {
            townid: town.townid,
            build_type: navMenu.typePicked
        },
        defaults: {
            level: 1,
            core_settings: JSON.stringify(coreTypeDefaultSettings),
            build_status: "Level 1",
            background_tex: biomeBTexList.indexOf(town.local_biome.split('-')[0])
        }
    });

    // Was created
    let wasUpgraded = true;
    if (coreBuilding[1]){
        wasUpgraded = false;
        await coreBuilding[0].save().then(async cb => {return await cb.reload()});
    } else {
        await coreBuilding[0].update({level: coreBuilding[0].level + 1, build_status: `Level ${coreBuilding[0].level + 1}`})
        .then(async cb => await cb.save())
        .then(async cb => {return await cb.reload()});
    }

    coreBuilding = coreBuilding[0];

    await town.update({[`${navMenu.typePicked}_status`]: `Built: Level ${coreBuilding.level}`})
    .then(async t => await t.save())
    .then(async t => {return await t.reload()});

    const coreBuildingPngFile = await loadBuilding(coreBuilding);

    const dynBuildDesc = (wasUpgraded) ? `${makeCapital(navMenu.typePicked)} upgraded to level **${coreBuilding.level}**!`: `${makeCapital(navMenu.typePicked)} built at level 1!`;
    const constructType = (wasUpgraded) ? 'Upgraded': 'Built';
    const coreBuildingCreateEmbed = new EmbedBuilder()
    .setTitle(`== Core Building ${constructType} ==`)
    .setColor('DarkGold')
    .setDescription(dynBuildDesc);

    return {embeds: [coreBuildingCreateEmbed], files: [coreBuildingPngFile]};
}

module.exports = {
    loadTownStoreButts,
    loadClaimPlotButts,
    loadOwnedPlotSelectButts,
    loadCoreBuildTypeButtons,
    loadCoreUpgradeTypeButtons,
    loadBuiltCoreTypeButtons,
    createBuildTypeButtonRow,

    generateTownDisplayEmbed,
    generateLocalTownBonuses,
    loadTownBuildingDisplayList,
    loadTownCoreBuildingDisplayList,
    handleTownMaterialStorageDisplay,
    handleCoreCostDisplay,

    grabTownCoreBuildings,
    grabTownPlotList,
    checkTownHasMaterials,
    
    handleJoinTown,
    updateTownCanEditList,
    updateTownMayor,
    handleDepositIntoTown,
    handleWithdrawFromTown,
    handleTownPlotStatusUpdates,
    handleTownPlotClaim,
    handleBuildingOnTownPlot,
    handleCoreBuildingConstruction
}

// ===================
//    OLD TOWN CODE
// ===================


// // Join Town
// if (interaction.options.getSubcommand() === 'join') {

//     const townName = interaction.options.getString('thetown') ?? 'NONE';
//     if (townName === 'NONE' || townName === 'None') return await interaction.reply('That was not a vaild town, or it does not exist!');

//     const user = await grabU();
//     if (!user) return await noUser();
    
//     const theTown = await Town.findOne({ where: { name: townName } });
//     if (!theTown) return await interaction.reply('Something went wrong while locating that town!');

//     if (theTown.mayorid === user.userid) return await interaction.reply('You are already the mayor of this town!');
//     if (user.townid !== '0') return await interaction.reply('You already belong to a town, you must first leave it before joining a new one!');

//     await interaction.deferReply();

//     // Confirm button embed here!!
//     const confirmButton = new ButtonBuilder()
//         .setLabel('Confirm!')
//         .setStyle(ButtonStyle.Primary)
//         .setCustomId('confirm');

//     const cancelButton = new ButtonBuilder()
//         .setLabel('Cancel!')
//         .setStyle(ButtonStyle.Danger)
//         .setCustomId('cancel');

//     const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

//     const embed = new EmbedBuilder()
//         .setTitle('JOINING TOWN')
//         .setColor(0o0)
//         .addFields({ name: 'Join this town?', value: 'Select a button below.' });

//     const embedMsg = await interaction.followUp({ embeds: [embed], components: [buttonRow] });

//     const filter = (i) => i.user.id === interaction.user.id;

//     const collector = embedMsg.createMessageComponentCollector({
//         ComponentType: ComponentType.Button,
//         filter,
//         time: 10000,
//     });

//     collector.on('collect', async (COI) => {
//         if (COI.customId === 'confirm') {
//             const townInc = await theTown.increment('population');
//             if (townInc) await theTown.save();

//             let popInc;
//             if ((theTown.population + theTown.npc_population) >= theTown.level * 5) popInc = await theTown.increment('level');
//             if (popInc) {
//                 await theTown.save();

//                 let plotsNeeded = 5;
//                 for (let i = 0; i < plotsNeeded; i++) {
//                     let newPlot = await TownPlots.create({
//                         townid: theTown.townid,
//                     });
//                     if (newPlot) await newPlot.save();
//                 }
//             } 

//             collector.stop();

//             const userUpdate = await user.update({ townid: theTown.townid });
//             if (userUpdate) return await interaction.followUp(`Congratulations!! You are now apart of ${theTown.name}`);
//         }
//         if (COI.customId === 'cancel') {
//             collector.stop();
//         }
//     });

//     collector.on('end', () => {
//         embedMsg.delete().catch(error => {
//             if (error.code !== 10008) {
//                 console.error('Failed to delete the message:', error);
//             }
//         });
//     });
// }

// // Same as Town Inspect
// if (interaction.options.getSubcommand() === 'belong') {
//     const targetUser = interaction.options.getUser('target') ?? 'NONE';
//     let user;
//     if (targetUser !== 'NONE') {
//         user = await UserData.findOne({ where: { userid: targetUser.id } });
//     } else user = await grabU();

//     if (!user) return await noUser();
//     if (user.townid === '0' && targetUser === 'NONE') return await interaction.reply('You do not belong to a town yet! Use ``/town join`` to join a town!');
//     if (user.townid === '0' && targetUser !== 'NONE') return await interaction.reply('That user does not belong to a town yet!');

//     const townRef = await Town.findOne({ where: { townid: user.townid } });
//     if (!townRef) return await interaction.reply('Something went wrong while locating your town!');

//     const mayor = await UserData.findOne({ where: { userid: townRef.mayorid } });

//     const biomeColours = {
//         "Forest": 'DarkGreen',
//         "Mountain": 'LightGrey',
//         "Desert": 'DarkGold',
//         "Plains": 'Gold',
//         "Swamp": 'DarkAqua',
//         "Grassland": 'Green'
//     };

//     const biomeList = townRef.local_biome.split('-');
//     const townColour = biomeColours[`${biomeList[0]}`];

//     const townDesc = `Current Mayor: ${mayor.username}\nTown Level: ${townRef.level}\nTreasury Contains: ${townRef.coins}c\n========\nHuman Population: ${townRef.population}\nNPC Population: ${townRef.npc_population}\n========\nMax Buildings: ${townRef.buildlimit}\nOpen Plots: ${townRef.openplots}\nClosed Plots: ${townRef.closedplots}\nOwned Plots: ${townRef.ownedplots}\nBuildings: ${townRef.buildcount}\n========\nMain Biome: ${biomeList[0]}\nAllignment: ${biomeList[1]}\n========\n`;

//     let fieldName = '';
//     let fieldValue = '';
//     let fieldObj = {};
//     let finalFields = [];

//     // BAND ONE
//     if (townRef.band_one !== '0') {
//         fieldName = '';
//         fieldValue = '';


//         fieldObj = { name: fieldName, value: fieldValue, };
//         finalFields.push(fieldObj);
//     } else finalFields.push({ name: 'Band One', value: 'Vacant!' });
//     // BAND TWO
//     if (townRef.band_two !== '0') {
//         fieldName = '';
//         fieldValue = '';


//         fieldObj = { name: fieldName, value: fieldValue, };
//         finalFields.push(fieldObj);
//     } else finalFields.push({ name: 'Band Two', value: 'Vacant!' });

//     // GRAND HALL
//     if (townRef.grandhall_status !== 'None') {
//         fieldName = '';
//         fieldValue = '';

//         fieldName = 'GRAND HALL';

//         const grandHall = await CoreBuilding.findOne({ where: [{ townid: townRef.townid }, {build_type: 'grandhall'}] });
//         fieldValue = `Level: ${grandHall.level}\nConstruction Status: ${grandHall.build_status}\nTown Status: ${townRef.grandhall_status}`;

//         fieldObj = { name: fieldName, value: fieldValue, };
//         finalFields.push(fieldObj);
//     } else finalFields.push({ name: 'GRAND HALL', value: 'Not Built!' });
//     // BANK
//     if (townRef.bank_status !== 'None') {
//         fieldName = '';
//         fieldValue = '';

//         fieldName = 'BANK';

//         const bank = await CoreBuilding.findOne({ where: [{ townid: townRef.townid }, { build_type: 'bank' }] });
//         fieldValue = `Level: ${bank.level}\nConstruction Status: ${bank.build_status}\nTown Status: ${townRef.bank_status}`;

//         fieldObj = { name: fieldName, value: fieldValue, };
//         finalFields.push(fieldObj);
//     } else finalFields.push({ name: 'BANK', value: 'Not Built!' });
//     // MARKET
//     if (townRef.market_status !== 'None') {
//         fieldName = '';
//         fieldValue = '';

//         fieldName = 'MARKET';

//         const market = await CoreBuilding.findOne({ where: [{ townid: townRef.townid }, { build_type: 'market' }] });
//         fieldValue = `Level: ${market.level}\nConstruction Status: ${market.build_status}\nTown Status: ${townRef.market_status}`;

//         fieldObj = { name: fieldName, value: fieldValue, };
//         finalFields.push(fieldObj);
//     } else finalFields.push({ name: 'MARKET', value: 'Not Built!' });
//     // TAVERN
//     if (townRef.tavern_status !== 'None') {
//         fieldName = '';
//         fieldValue = '';

//         fieldName = 'TAVERN';

//         const tavern = await CoreBuilding.findOne({ where: [{ townid: townRef.townid }, { build_type: 'tavern' }] });
//         fieldValue = `Level: ${tavern.level}\nConstruction Status: ${tavern.build_status}\nTown Status: ${townRef.tavern_status}`;

//         fieldObj = { name: fieldName, value: fieldValue, };
//         finalFields.push(fieldObj);
//     } else finalFields.push({ name: 'TAVERN', value: 'Not Built!' });
//     // CLERGY
//     if (townRef.clergy_status !== 'None') {
//         fieldName = '';
//         fieldValue = '';

//         fieldName = 'CLERGY';

//         const clergy = await CoreBuilding.findOne({ where: [{ townid: townRef.townid }, { build_type: 'clergy' }] });
//         fieldValue = `Level: ${clergy.level}\nConstruction Status: ${clergy.build_status}\nTown Status: ${townRef.clergy_status}`;

//         fieldObj = { name: fieldName, value: fieldValue, };
//         finalFields.push(fieldObj);
//     } else finalFields.push({ name: 'CLERGY', value: 'Not Built!' });

//     const townEmbed = new EmbedBuilder()
//         .setTitle(townRef.name)
//         .setDescription(townDesc)
//         .setColor(townColour)
//         .addFields(finalFields);

//     return await interaction.reply({ embeds: [townEmbed] }).then(embedMsg => setTimeout(() => {
//         embedMsg.delete();
//     }, 120000)).catch(error => console.error(error));
// }

// // This pulls all local towns mat bonuses and displays
// if (interaction.options.getSubcommand() === 'bonus') {
//     const towns = await Town.findAll({ where: { guildid: interaction.guild.id } });
//     if (towns.length <= 0) return await interaction.reply('There are no towns here!');

//     const allignBonus = {
//         Normal: [10, 5, 3],
//         Evil: [5, 3, 1],
//         Phase: [10, 8, 5],
//     };

//     let possibleBonus = [];
//     let curPos = 0;
//     for (const theTown of towns) {
//         const matTypes = theTown.mat_bonus.split(',');

//         const allignmentSlices = theTown.local_biome.split('-');
//         const allignment = allignmentSlices[1];

//         const matchBonus = allignBonus[`${allignment}`];

//         possibleBonus[curPos] = matTypes.join(', ') + ':\n +' + matchBonus.join(', +') + ', +' + matchBonus[0];
//         curPos++;
//     }

//     let finalFields = [];
//     if (curPos === 1) finalFields.push({ name: towns[0].name, value: possibleBonus[0].toString() });
//     if (curPos === 2) finalFields.push({ name: towns[0].name, value: possibleBonus[0].toString() }, { name: towns[1].name, value: possibleBonus[1].toString() });

//     const bonusEmbed = new EmbedBuilder()
//         .setTitle('Material Bonuses')
//         .addFields(finalFields);

//     return await interaction.reply({ embeds: [bonusEmbed] });
// }

// // Appoint user to edit permissions
// if (interaction.options.getSubcommand() === 'appoint') {
//     const user = await grabU();
//     if (!user) return await noUser();

//     const theTown = await Town.findOne({ where: { mayorid: interaction.user.id } });
//     if (!theTown) return await interaction.reply('You are not the mayor of any existing towns!');

//     const targetUser = interaction.options.getUser('target');
//     const targetCheck = await UserData.findOne({ where: [{ userid: targetUser.id }, { townid: theTown.townid }] });
//     if (!targetCheck) return await interaction.reply('That user doesnt have a game profile or belongs to another town!!');

//     const currentEditList = theTown.can_edit.split(',');
//     let exists = false;
//     for (const id of currentEditList) {
//         if (targetUser.id === id) {
//             exists = true;
//             break;
//         }
//     }
//     if (exists) return await interaction.reply('That user has already been appointed for this town!!');

//     // Confirm Embed HERE!!!
//     const confirmButton = new ButtonBuilder()
//         .setLabel('Confirm!')
//         .setStyle(ButtonStyle.Primary)
//         .setCustomId('confirm');

//     const cancelButton = new ButtonBuilder()
//         .setLabel('Cancel!')
//         .setStyle(ButtonStyle.Danger)
//         .setCustomId('cancel');

//     const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

//     const embed = new EmbedBuilder()
//         .setTitle('APPOINTING USER')
//         .setColor(0o0)
//         .addFields({ name: `Appoint ${targetUser.username}?`, value: 'Select a button below.' });

//     const embedMsg = await interaction.reply({ embeds: [embed], components: [buttonRow] });

//     const filter = (i) => i.user.id === interaction.user.id;

//     const collector = embedMsg.createMessageComponentCollector({
//         ComponentType: ComponentType.Button,
//         filter,
//         time: 10000,
//     });

//     collector.on('collect', async (COI) => {
//         if (COI.customId === 'confirm') {
//             currentEditList.push(targetUser.id);

//             const canEditStr = currentEditList.toString();
//             collector.stop();
//             const townUpdate = await theTown.update({ can_edit: canEditStr });
//             if (townUpdate) await theTown.save();
//             return await interaction.followUp(`${targetUser.username} has been appointed!`);
//         }
//         if (COI.customId === 'cancel') {
//             collector.stop();
//         }
//     });

//     collector.on('end', () => {
//         embedMsg.delete().catch(error => {
//             if (error.code !== 10008) {
//                 console.error('Failed to delete the message:', error);
//             }
//         });
//     });
// }

// // Demote user from edit permissions
// if (interaction.options.getSubcommand() === 'demote') {
//     const user = await grabU();
//     if (!user) return await noUser();

//     const theTown = await Town.findOne({ where: { mayorid: interaction.user.id } });
//     if (!theTown) return await interaction.reply('You are not the mayor of any existing towns!');

//     const targetUser = interaction.options.getUser('target');
//     const targetCheck = await UserData.findOne({ where: [{ userid: targetUser.id }, { townid: theTown.townid }] });
//     if (!targetCheck) return await interaction.reply('That user doesnt have a game profile or belongs to another town!!');

//     const currentEditList = theTown.can_edit.split(',');
//     let exists = false;
//     for (const id of currentEditList) {
//         if (targetUser.id === id) {
//             exists = true;
//             break;
//         }
//     }
//     if (!exists) return await interaction.reply('That user has not been appointed for this town!!');

//     // Confirm Embed HERE!!!
//     const confirmButton = new ButtonBuilder()
//         .setLabel('Confirm!')
//         .setStyle(ButtonStyle.Primary)
//         .setCustomId('confirm');

//     const cancelButton = new ButtonBuilder()
//         .setLabel('Cancel!')
//         .setStyle(ButtonStyle.Danger)
//         .setCustomId('cancel');

//     const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

//     const embed = new EmbedBuilder()
//         .setTitle('DEMOTING USER')
//         .setColor(0o0)
//         .addFields({ name: `Demote ${targetUser.username}?`, value: 'Select a button below.' });

//     const embedMsg = await interaction.reply({ embeds: [embed], components: [buttonRow] });

//     const filter = (i) => i.user.id === interaction.user.id;

//     const collector = embedMsg.createMessageComponentCollector({
//         ComponentType: ComponentType.Button,
//         filter,
//         time: 10000,
//     });

//     collector.on('collect', async (COI) => {
//         if (COI.customId === 'confirm') {
//             const newEditList = currentEditList.filter(id => id !== targetUser.id);
//             const canEditStr = newEditList.toString();
//             collector.stop();
//             const townUpdate = await theTown.update({ can_edit: canEditStr });
//             if (townUpdate) await theTown.save();
//             return await interaction.followUp(`${targetUser.username} has been demoted.`);
//         }
//         if (COI.customId === 'cancel') {
//             collector.stop();
//         }
//     });

//     collector.on('end', () => {
//         embedMsg.delete().catch(error => {
//             if (error.code !== 10008) {
//                 console.error('Failed to delete the message:', error);
//             }
//         });
//     });
// }

// // Transfer town ownership
// if (interaction.options.getSubcommand() === 'transfer') {
//     const user = await grabU();
//     if (!user) return await noUser();

//     const theTown = await Town.findOne({ where: { mayorid: interaction.user.id } });
//     if (!theTown) return await interaction.reply('You are not the mayor of any existing towns!');

//     const targetUser = interaction.options.getUser('target');
//     const targetCheck = await UserData.findOne({ where: [{ userid: targetUser.id }, { townid: theTown.townid }] });
//     if (!targetCheck) return await interaction.reply('That user doesnt have a game profile or belongs to another town!!');

//     // Confirm Embed HERE!!!
//     const confirmButton = new ButtonBuilder()
//         .setLabel('Confirm!')
//         .setStyle(ButtonStyle.Danger)
//         .setCustomId('confirm');

//     const cancelButton = new ButtonBuilder()
//         .setLabel('Cancel!')
//         .setStyle(ButtonStyle.Primary)
//         .setCustomId('cancel');

//     const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

//     const embed = new EmbedBuilder()
//         .setTitle('TRANSFER OWNERSHIP')
//         .setColor(0o0)
//         .setDescription('This process **CANNOT BE UNDONE!!!**')
//         .addFields({ name: 'Are you sure you want to transfer ownership?', value: `${targetUser.username} will become the new mayor!` });

//     const embedMsg = await interaction.reply({ embeds: [embed], components: [buttonRow] });

//     const filter = (i) => i.user.id === interaction.user.id;

//     const collector = embedMsg.createMessageComponentCollector({
//         ComponentType: ComponentType.Button,
//         filter,
//         time: 10000,
//     });

//     collector.on('collect', async (COI) => {
//         if (COI.customId === 'confirm') {
//             collector.stop();
//             const townUpdate = await theTown.update({ mayorid: targetUser.id });
//             if (townUpdate) await theTown.save();
//             return await interaction.followUp(`${targetUser.username} is the new mayor!!`);
//         }
//         if (COI.customId === 'cancel') {
//             collector.stop();
//         }
//     });

//     collector.on('end', () => {
//         embedMsg.delete().catch(error => {
//             if (error.code !== 10008) {
//                 console.error('Failed to delete the message:', error);
//             }
//         });
//     });
// }

// // Deposit coins or materials to guild storage
// if (interaction.options.getSubcommand() === 'deposit') {
//     const transType = interaction.options.getString('type');
//     const theItem = interaction.options.getString('item') ?? 'NONE';
//     const amount = interaction.options.getInteger('amount') ?? 1;

//     if (transType === 'mat' && theItem === 'NONE') return await interaction.reply('That was not a valid material option!!');

//     const user = await grabU();
//     if (!user) return await noUser();

//     const theTown = await Town.findOne({ where: { townid: user.townid } });
//     if (!theTown) return await interaction.reply('You do not belong to any towns!');

//     const currentEditList = theTown.can_edit.split(',');
//     let exists = false;
//     for (const id of currentEditList) {
//         if (user.userid === id) {
//             exists = true;
//             break;
//         }
//     }
//     if (!exists) return await interaction.reply('You do not have permission to use this command for this town!');

//     let item;
//     if (transType === 'mat') {
//         item = await MaterialStore.findOne({ where: [{spec_id: user.userid}, { name: theItem }] });
//         if (!item || item.amount < amount) return await interaction.reply(`You do not have that many ${theItem}!`);
//     } else {
//         if (user.coins < amount) return await interaction.reply('You do not have that many coins!!');
//     }

//     let result = '';
//     if (transType === 'mat') result = await depositMaterial(theTown, user, item, amount);
//     if (transType === 'coin') result = await depositCoins(theTown, user, amount);

//     if (result === 'Success') return await interaction.reply('Deposit Successful!!');
// }

// // Withdraw coins or materials from guild storage
// if (interaction.options.getSubcommand() === 'withdraw') {
//     const transType = interaction.options.getString('type');
//     const theItem = interaction.options.getString('item') ?? 'NONE';
//     const amount = interaction.options.getInteger('amount') ?? 1;

//     if (transType === 'mat' && theItem === 'NONE') return await interaction.reply('That was not a valid material option!!');

//     const user = await grabU();
//     if (!user) return await noUser();

//     const theTown = await Town.findOne({ where: { townid: user.townid } });
//     if (!theTown) return await interaction.reply('You do not belong to any towns!');

//     const currentEditList = theTown.can_edit.split(',');
//     let exists = false;
//     for (const id of currentEditList) {
//         if (user.userid === id) {
//             exists = true;
//             break;
//         }
//     }
//     if (!exists) return await interaction.reply('You do not have permission to use this command for this town!');

//     let item;
//     if (transType === 'mat') {
//         item = await TownMaterial.findOne({ where: { name: theItem } });
//         if (item.amount < amount || !item) return await interaction.reply(`The town does not have that many ${theItem}!`);
//     } else {
//         if (theTown.coins < amount) return await interaction.reply('The town does not have that many coins!!');
//     }

//     let result = '';
//     if (transType === 'mat') result = await withdrawMaterial(theTown, user, item, amount);
//     if (transType === 'coin') result = await withdrawCoins(theTown, user, amount);

//     if (result === 'Success') return await interaction.reply('Withdraw Successful!!');
// }

// // Open unowned, closed, town plots
// if (interaction.options.getSubcommand() === 'openplot') {
//     const amount = interaction.options.getInteger('amount') ?? 1;

//     const user = await grabU();
//     if (!user) return await noUser();

//     const theTown = await Town.findOne({ where: { townid: user.townid } });
//     if (!theTown) return await interaction.reply('You do not belong to any towns!');

//     const currentEditList = theTown.can_edit.split(',');
//     let exists = false;
//     for (const id of currentEditList) {
//         if (user.userid === id) {
//             exists = true;
//             break;
//         }
//     }
//     if (!exists) return await interaction.reply('You do not have permission to use this command for this town!');

//     const totalPlots = theTown.openplots + theTown.closedplots;
//     const emptyPlots = theTown.buildlimit - theTown.ownedplots;
//     if (amount > totalPlots || amount > emptyPlots) return await interaction.reply('This town does not have that many plots of land available!');

//     const closedPlots = theTown.closedplots;
//     if (amount > closedPlots) return await interaction.reply('This town does not have that many closed plots!');

//     const townPlotList = await TownPlots.findAll({ where: { townid: theTown.townid } });
//     //if (!townPlotList || townPlotList.length < totalPlots) {
//     //	let plotsNeeded = totalPlots - (townPlotList.length ?? 0);
//     //	for (let i = 0; i < plotsNeeded; i++) {
//     //		let newPlot = await TownPlots.create({
//     //			townid: theTown.townid,
//     //		});
//     //		townPlotList.push(newPlot);
//     //	}
//     //}

//     const publicPlots = townPlotList.filter(plot => !plot.private && plot.ownerid === '0');
//     const privatePlots = townPlotList.filter(plot => plot.private && plot.ownerid === '0');

//     if (privatePlots.length === closedPlots) {
//         const plotsToChange = privatePlots.slice(0, amount);
//         for (const plot of plotsToChange) {
//             let updatedPlot = await plot.update({ private: false });
//             await plot.save();
//             publicPlots.push(updatedPlot);
//         }
//     }

//     const inc = await theTown.increment('openplots', { by: amount });
//     const dec = await theTown.decrement('closedplots', { by: amount });
//     if (!inc || !dec) return await interaction.reply('Something went wrong while updating town plots');

//     await theTown.save();

//     return await interaction.reply('Town Plots Updated!!');
// }

// // Close unowned, opened, town plots
// if (interaction.options.getSubcommand() === 'closeplot') {
//     const amount = interaction.options.getInteger('amount') ?? 1;

//     const user = await grabU();
//     if (!user) return await noUser();

//     const theTown = await Town.findOne({ where: { townid: user.townid } });
//     if (!theTown) return await interaction.reply('You do not belong to any towns!');

//     const currentEditList = theTown.can_edit.split(',');
//     let exists = false;
//     for (const id of currentEditList) {
//         if (user.userid === id) {
//             exists = true;
//             break;
//         }
//     }
//     if (!exists) return await interaction.reply('You do not have permission to use this command for this town!');

//     const totalPlots = theTown.openplots + theTown.closedplots;
//     const emptyPlots = theTown.buildlimit - theTown.ownedplots;
//     if (amount > totalPlots || amount > emptyPlots) return await interaction.reply('This town does not have that many plots of land available!');

//     const openPlots = theTown.openplots;
//     if (amount > openPlots) return await interaction.reply('This town does not have that many open plots!');

//     const townPlotList = await TownPlots.findAll({ where: { townid: theTown.townid } });
//     //if (!townPlotList || townPlotList.length < totalPlots) {
//     //	let plotsNeeded = totalPlots - (townPlotList.length ?? 0);
//     //	for (let i = 0; i < plotsNeeded; i++) {
//     //		let newPlot = await TownPlots.create({
//     //			townid: theTown.townid,
//     //		});
//     //		townPlotList.push(newPlot);
//     //	}
//     //}

//     const publicPlots = townPlotList.filter(plot => !plot.private && plot.ownerid === '0');
//     const privatePlots = townPlotList.filter(plot => plot.private && plot.ownerid === '0');

//     if (publicPlots.length === openPlots) {
//         const plotsToChange = publicPlots.slice(0, amount);
//         for (const plot of plotsToChange) {
//             let updatedPlot = await plot.update({ private: true });
//             await plot.save();
//             privatePlots.push(updatedPlot);
//         }
//     }

//     const inc = await theTown.increment('closedplots', { by: amount });
//     const dec = await theTown.decrement('openplots', { by: amount });
//     if (!inc || !dec) return await interaction.reply('Something went wrong while updating town plots');
//     await theTown.save();

//     return await interaction.reply('Town Plots Updated!!');
// }

// // Claim open/closed town plot
// if (interaction.options.getSubcommand() === 'claimplot') {
//     const user = await grabU();
//     if (!user) return await noUser();

//     const theTown = await Town.findOne({ where: { townid: user.townid } });
//     if (!theTown) return await interaction.reply('You do not belong to any towns!');

//     const currentEditList = theTown.can_edit.split(',');
//     let exists = false;
//     for (const id of currentEditList) {
//         if (user.userid === id) {
//             exists = true;
//             break;
//         }
//     }

//     const playerPlots = await TownPlots.findAll({ where: { ownerid: user.userid } });
//     if (theTown.mayorid !== user.userid) {
//         if (playerPlots.length > 1 && !exists) return await interaction.reply('You already own the maximum amount of plots!');
//         if (playerPlots.length > 3 && exists) return await interaction.reply('You already own the maximum amount of plots!');
//     }

//     const emptyPlots = theTown.buildlimit - theTown.buildcount;

//     if (emptyPlots === 0) return await interaction.reply('There are no empty plots available!!');

//     let useOpenPlots = false;

//     const openPlots = theTown.openplots;
//     if (!exists && openPlots === 0) return await interaction.reply('There are no open plots available!');
//     if (!exists) useOpenPlots = true;

//     const closedPlots = theTown.closedplots;
//     if (exists && closedPlots === 0) useOpenPlots = true;

//     let thePlot;
//     if (useOpenPlots) thePlot = await TownPlots.findOne({ where: [{ townid: theTown.townid }, { ownerid: '0' }, { empty: true }, { private: false }] });
//     if (!useOpenPlots) thePlot = await TownPlots.findOne({ where: [{ townid: theTown.townid }, { ownerid: '0' }, { empty: true }, { private: true }] });

//     if (!thePlot) return await interaction.reply('Something went wrong while location a Town Plot!');

//     const plotUpdate = await thePlot.update({ ownerid: user.userid, private: true });
//     if (plotUpdate) await thePlot.save();

//     let dec;
//     if (useOpenPlots) dec = await theTown.decrement('openplots');
//     if (!useOpenPlots) dec = await theTown.decrement('closedplots');

//     const inc = await theTown.increment('ownedplots');
//     if (!dec || !inc) console.error('Something went wrong while updating theTown');

//     await theTown.save();

//     return await interaction.reply('You are now the owner of a Town Plot!!');
// }

// // Build on owned town plot
// if (interaction.options.getSubcommand() === 'buildplot') {
//     const buildingType = interaction.options.getString('buildtype');
//     const plotStr = interaction.options.getString('theplot') ?? 'NONE';
//     if (plotStr === 'None' || plotStr === 'NONE') return await interaction.reply('The plot you are looking for does not exist, or you selected an invalid option! Double check if you own a town plot first!');

//     const plotIndex = createIndexFromStr(plotStr);

//     const user = await grabU();
//     if (!user) return await noUser();

//     const playerPlots = await TownPlots.findAll({ where: [{ townid: user.townid }, { ownerid: user.userid }, { empty: true }] });
//     if (playerPlots.length <= 0) return await interaction.reply('No owned plots found!');

//     const thePlot = playerPlots[plotIndex];

//     const biomeBackgrounds = {
//         "Forest": 1,
//         "Mountain": 2,
//         "Desert": 3,
//         "Plains": 4,
//         "Swamp": 5,
//         "Grassland": 6
//     };

//     const townRef = await Town.findOne({ where: { townid: user.townid } });
//     if (!townRef) return await interaction.reply('Something went wrong while locating your town!');

//     const biomeList = townRef.local_biome.split('-');
//     const buildBackground = biomeBackgrounds[`${biomeList[0]}`];

//     let newBuild = await PlayerBuilding.create({
//         townid: user.townid,
//         ownerid: user.userid,
//         plotid: thePlot.plotid,
//         can_edit: user.userid,
//         build_type: buildingType,
//         background_tex: buildBackground
//     });

//     if (!newBuild) return await interaction.reply('Something went wrong while creating that building!!');

//     const inc = await townRef.increment('buildcount');
//     if (inc) await townRef.save();

//     const updatePlot = await thePlot.update({ empty: false });
//     if (updatePlot) await thePlot.save();

//     // CREATE BUILDING ATTATCHMENT HERE!!
//     await interaction.deferReply();
//     const attachment = await loadBuilding(newBuild);

//     let messageStr = 'Building Created!';
//     if (buildingType === 'house') messageStr += ' Welcome Home! :)';

//     return await interaction.followUp({ content: messageStr, files: [attachment]});
// }

// // View built on town plots
// if (interaction.options.getSubcommand() === 'viewplot') {
//     const townName = interaction.options.getString('thetown') ?? 'NONE';
//     if (townName === 'None' || townName === 'NONE') return await interaction.reply('The requested town could not be found, please select from the provided options!');
//     const plotStr = interaction.options.getString('townplots') ?? 'NONE';
//     if (plotStr === 'None' || plotStr === 'NONE') return await interaction.reply('The plot you are looking for does not exist, or you selected an invalid option!');

//     const plotIndex = createIndexFromStr(plotStr);

//     const user = await grabU();
//     if (!user) return await noUser();

//     const townRef = await Town.findOne({ where: { name: townName } });
//     if (!townRef) return await interaction.reply('Something went wrong while locating that town!');

//     const townPlots = await TownPlots.findAll({ where: [{ townid: townRef.townid }, { empty: false }] });
//     if (townPlots <= 0) return await interaction.reply('No built on town plots found!');

//     const thePlot = townPlots[plotIndex];
//     const theBuilding = await PlayerBuilding.findOne({ where: { plotid: thePlot.plotid } });
//     if (!theBuilding) return await interaction.reply('Something went wrong while locating that building!');

//     const ownerRef = await UserData.findOne({ where: { userid: theBuilding.ownerid } });

//     const notFound = 'Not Found';

//     const embedTitle = `Owned By: ${ownerRef.username ?? notFound}`;
//     const embedDesc = `Building Type: ${theBuilding.build_type}`;

//     let fieldName = '';
//     let fieldValue = '';
//     let fieldObj = {};
//     let finalFields = [];

//     if (theBuilding.band_owned) {
//         fieldName = '';
//         fieldValue = '';


//         fieldObj = { name: fieldName, value: fieldValue };
//         finalFields.push(fieldObj);
//     } else finalFields.push({ name: 'Band:', value: 'No Band Linked' });

//     // ADD INFO EMBED FOR CONTEXT TO SHOWN BUILDING!
//     const embed = new EmbedBuilder()
//         .setTitle(embedTitle)
//         .setDescription(embedDesc)
//         .setColor(0o0)
//         .addFields(finalFields);

//     await interaction.deferReply();
//     const attachment = await loadBuilding(theBuilding);

//     return await interaction.followUp({embeds: [embed], files: [attachment] });
// }

// // Begin core building construction
// if (interaction.options.getSubcommand() === 'buildcore') {
//     const coreType = extractCoreType(interaction.options.getString('coretype'));
//     if (coreType === 'None') return await interaction.reply('That was not a valid core town building!!');

//     const user = await grabU();
//     if (!user) return await noUser();

//     const theTown = await Town.findOne({ where: { townid: user.townid } });
//     if (!theTown) return await interaction.reply('Something went wrong while locating your town!');

//     const currentEditList = theTown.can_edit.split(',');
//     let exists = false;
//     for (const id of currentEditList) {
//         if (user.userid === id) {
//             exists = true;
//             break;
//         }
//     }
//     if (!exists) return await interaction.reply('You do not have permission to use this command for this town!');

//     const biomeBackgrounds = {
//         "Forest": 1,
//         "Mountain": 2,
//         "Desert": 3,
//         "Plains": 4,
//         "Swamp": 5,
//         "Grassland": 6
//     };

//     const biomeList = theTown.local_biome.split('-');
//     const buildBackground = biomeBackgrounds[`${biomeList[0]}`];

//     const coreLevel = 1;
//     const filteredCore = coreReq.filter(core => core.Name === coreType);
//     const coreRef = filteredCore[0];

//     const reqListing = ['Stone', 'Wood', 'Metal', 'Hide', 'Slime'];
//     const matEqui = ['rocky', 'woody', 'metalic', 'skinny', 'slimy'];

//     const baseMatReq = {
//         "Stone": coreRef.Stone,
//         "Stone_Level": coreRef.Stone_Level,
//         "Stone_Rar": coreRef.Stone_Rar,
//         "Wood": coreRef.Wood,
//         "Wood_Level": coreRef.Wood_Level,
//         "Wood_Rar": coreRef.Wood_Rar,
//         "Metal": coreRef.Metal,
//         "Metal_Level": coreRef.Metal_Level,
//         "Metal_Rar": coreRef.Metal_Rar,
//         "Hide": coreRef.Hide,
//         "Hide_Level": coreRef.Hide_Level,
//         "Hide_Rar": coreRef.Hide_Rar,
//         "Slime": coreRef.Slime,
//         "Slime_Level": coreRef.Slime_Level,
//         "Slime_Rar": coreRef.Slime_Rar,
//     };

//     for (let i = 0; i < reqListing.length; i++) {
//         let levelStr = `${reqListing[i]}_Level`;
//         baseMatReq[`${reqListing[i]}`] = checkLevel(baseMatReq[`${reqListing[i]}`], coreLevel, baseMatReq[`${levelStr}`]);
//     }
    
//     function checkLevel(amount, curLevel, levelNeeded) {
//         if (curLevel >= levelNeeded) return amount;
//         return 0;
//     }
//     // Handle town material storage checking here
//     let matObjList = [];
//     for (let i = 0; i < reqListing.length; i++) {
//         let checkingFor = matEqui[i];
//         let matFile = materialFiles.get(checkingFor);
//         let matList = require(matFile);

//         let amountNeeded = baseMatReq[`${reqListing[i]}`];
//         let rarID = baseMatReq[`${reqListing[i]}_Rar`];

//         let foundMat = await checkMatStorage(amountNeeded, theTown, checkingFor, matList, rarID);
//         matObjList.push(...foundMat);
//     }

//     let canBuild = true;
//     let matRemovalList = [];
//     let embedTitle = '';
//     let finalFields = [];
//     for (const material of matObjList) {
//         let fieldName = '';
//         let fieldValue = '';
//         let fieldObj = {};

//         if (material.amountNeeded === 0) { } else {
//             if (material.buildStatus === false) canBuild = false;
//             if (material.isRef) {
//                 fieldName = `Material: ${material.Name}\nRarity: ${material.Rarity}`;
//                 fieldValue = `Amount Stored: ${material.amount}\nAmount Needed: ${material.amountNeeded}`;
//             } else {
//                 fieldName = `Material: ${material.name}\nRarity: ${material.rarity}`;
//                 fieldValue = `Amount Stored: ${material.amount}\nAmount Needed: ${material.amountNeeded}`;
//                 matRemovalList.push(material);
//             }
//             fieldObj = { name: fieldName, value: fieldValue };
//             finalFields.push(fieldObj);
//         }
//     }

//     if (canBuild) embedTitle = `BEGIN ${interaction.options.getString('coretype')} CONSTRUCTION?`;
//     if (!canBuild) embedTitle = `Resources insufficient to build ${interaction.options.getString('coretype')}`;
//     // Handle confirm embed here
//     const embed = {
//         title: embedTitle,
//         color: 0o0,
//         fields: finalFields,
//     };

//     if (!canBuild) return await interaction.reply({embeds: [embed]});

    
//     const confirmButton = new ButtonBuilder()
//         .setLabel('Confirm!')
//         .setStyle(ButtonStyle.Danger)
//         .setCustomId('confirm');

//     const cancelButton = new ButtonBuilder()
//         .setLabel('Cancel!')
//         .setStyle(ButtonStyle.Primary)
//         .setCustomId('cancel');

//     const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

//     const embedMsg = await interaction.reply({ embeds: [embed], components: [buttonRow] });

//     const filter = (i) => i.user.id === interaction.user.id;

//     const collector = embedMsg.createMessageComponentCollector({
//         ComponentType: ComponentType.Button,
//         filter,
//         time: 10000,
//     });

//     // Handle building creation/display here
//     collector.on('collect', async (COI) => {
//         if (COI.customId === 'confirm') {
//             await COI.deferUpdate().then(async () => {
//                 collector.stop();
//                 for (const material of matRemovalList) {
//                     let result = await removeMaterial(theTown, material, material.amountNeeded, 'town');
//                     if (result !== 'Removed') break;
//                 }
//                 const attachment = await handleCoreBuilding(theTown, coreType, buildBackground, 1);
//                 return await interaction.followUp({ files: [attachment] });
//             }).catch(e => console.error(e));
//         }
//         if (COI.customId === 'cancel') {
//             collector.stop();
//         }
//     });

//     collector.on('end', () => {
//         embedMsg.delete().catch(error => {
//             if (error.code !== 10008) {
//                 console.error('Failed to delete the message:', error);
//             }
//         });
//     });
// }

// // Begin core building upgrade
// if (interaction.options.getSubcommand() === 'upgradecore') {
//     const coreType = extractCoreType(interaction.options.getString('coretype'));
//     if (coreType === 'None') return await interaction.reply('That was not a valid core town building!!');

//     const user = await grabU();
//     if (!user) return await noUser();

//     const theTown = await Town.findOne({ where: { townid: user.townid } });
//     if (!theTown) return await interaction.reply('Something went wrong while locating your town!');

//     const currentEditList = theTown.can_edit.split(',');
//     let exists = false;
//     for (const id of currentEditList) {
//         if (user.userid === id) {
//             exists = true;
//             break;
//         }
//     }
//     if (!exists) return await interaction.reply('You do not have permission to use this command for this town!');

//     // Handle aquiring core building db reference here
//     const theCore = await CoreBuilding.findOne({ where: [{ townid: theTown.townid }, { build_type: coreType }] });
//     if (!theCore) return await interaction.reply('Something went wrong while locating that core building!');


//     const coreLevel = theCore.level + 1;
//     if (coreLevel > theTown.level) return await interaction.reply('This building cannot be upgraded to a level higher than the town it is apart of!!');

//     const filteredCore = coreReq.filter(core => core.Name === coreType);
//     const coreRef = filteredCore[0];

//     const reqListing = ['Stone', 'Wood', 'Metal', 'Hide', 'Slime'];
//     const matEqui = ['rocky', 'woody', 'metalic', 'skinny', 'slimy'];

//     const baseMatReq = {
//         "Stone": coreRef.Stone,
//         "Stone_Level": coreRef.Stone_Level,
//         "Stone_Rar": coreRef.Stone_Rar,
//         "Wood": coreRef.Wood,
//         "Wood_Level": coreRef.Wood_Level,
//         "Wood_Rar": coreRef.Wood_Rar,
//         "Metal": coreRef.Metal,
//         "Metal_Level": coreRef.Metal_Level,
//         "Metal_Rar": coreRef.Metal_Rar,
//         "Hide": coreRef.Hide,
//         "Hide_Level": coreRef.Hide_Level,
//         "Hide_Rar": coreRef.Hide_Rar,
//         "Slime": coreRef.Slime,
//         "Slime_Level": coreRef.Slime_Level,
//         "Slime_Rar": coreRef.Slime_Rar,
//     };

//     for (let i = 0; i < reqListing.length; i++) {
//         let levelStr = `${reqListing[i]}_Level`;
//         let rarStr = `${reqListing[i]}_Rar`;
//         baseMatReq[`${reqListing[i]}`] = checkLevel(baseMatReq[`${reqListing[i]}`], coreLevel, baseMatReq[`${levelStr}`]);

//         baseMatReq[`${reqListing[i]}`] = checkMultiply(baseMatReq[`${reqListing[i]}`], coreLevel, baseMatReq[`${levelStr}`]);

//         baseMatReq[`${rarStr}`] = checkRarUp(baseMatReq[`${reqListing[i]}`], coreLevel, baseMatReq[`${rarStr}`]);
//     }

//     // Check if material is needed for buildings next level
//     function checkLevel(amount, curLevel, levelNeeded) {
//         if (curLevel >= levelNeeded) return amount;
//         return 0;
//     }

//     // Handle scaling material requirements here

//     // Check how much more material is needed based on level
//     function checkMultiply(amount, level, matLevel) {
//         return amount * (level - (matLevel - 1));
//     }

//     // Check if material rarity increases based on buildings next level
//     function checkRarUp(amount, curLevel, baseRar) {
//         if (amount === 0) return baseRar;
//         if (((curLevel / 2) % 1) === 0) return baseRar++;
//         return baseRar;
//     }

//     // Handle town material storage checking here
//     let matObjList = [];
//     for (let i = 0; i < reqListing.length; i++) {
//         let checkingFor = matEqui[i];
//         let matFile = materialFiles.get(checkingFor);
//         let matList = require(matFile);

//         let amountNeeded = baseMatReq[`${reqListing[i]}`];
//         let rarID = baseMatReq[`${reqListing[i]}_Rar`];

//         let foundMat = await checkMatStorage(amountNeeded, theTown, checkingFor, matList, rarID);
//         matObjList.push(...foundMat);
//     }

//     let canBuild = true;
//     let matRemovalList = [];
//     let embedTitle = '';
//     let finalFields = [];
//     for (const material of matObjList) {
//         let fieldName = '';
//         let fieldValue = '';
//         let fieldObj = {};

//         if (material.amountNeeded === 0) { } else {
//             if (material.buildStatus === false) canBuild = false;
//             if (material.isRef) {
//                 fieldName = `Material: ${material.Name}\nRarity: ${material.Rarity}`;
//                 fieldValue = `Amount Stored: ${material.amount}\nAmount Needed: ${material.amountNeeded}`;
//             } else {
//                 fieldName = `Material: ${material.name}\nRarity: ${material.rarity}`;
//                 fieldValue = `Amount Stored: ${material.amount}\nAmount Needed: ${material.amountNeeded}`;
//                 matRemovalList.push(material);
//             }
//             fieldObj = { name: fieldName, value: fieldValue };
//             finalFields.push(fieldObj);
//         }
//     }

//     if (canBuild) embedTitle = `BEGIN ${interaction.options.getString('coretype')} CONSTRUCTION?`;
//     if (!canBuild) embedTitle = `Resources insufficient to build ${interaction.options.getString('coretype')}`;

//     // Handle confirm embed here
//     const embed = {
//         title: embedTitle,
//         color: 0o0,
//         fields: finalFields,
//     };

//     if (!canBuild) return await interaction.reply({ embeds: [embed] });

//     const confirmButton = new ButtonBuilder()
//         .setLabel('Confirm!')
//         .setStyle(ButtonStyle.Danger)
//         .setCustomId('confirm');

//     const cancelButton = new ButtonBuilder()
//         .setLabel('Cancel!')
//         .setStyle(ButtonStyle.Primary)
//         .setCustomId('cancel');

//     const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

//     const embedMsg = await interaction.reply({ embeds: [embed], components: [buttonRow] });

//     const filter = (i) => i.user.id === interaction.user.id;

//     const collector = embedMsg.createMessageComponentCollector({
//         ComponentType: ComponentType.Button,
//         filter,
//         time: 10000,
//     });

//     // Handle building creation/display here
//     collector.on('collect', async (COI) => {
//         if (COI.customId === 'confirm') {
//             await COI.deferUpdate().then(async () => {
//                 collector.stop();
//                 for (const material of matRemovalList) {
//                     let result = await removeMaterial(theTown, material, material.amountNeeded, 'town');
//                     if (result !== 'Removed') break;
//                 }
//                 const attachment = await handleCoreBuilding(theTown, coreType, buildBackground, newLevel);
//                 return await interaction.followUp({ files: [attachment] });
//             }).catch(e => console.error(e));
//         }
//         if (COI.customId === 'cancel') {
//             collector.stop();
//         }
//     });

//     collector.on('end', () => {
//         embedMsg.delete().catch(error => {
//             if (error.code !== 10008) {
//                 console.error('Failed to delete the message:', error);
//             }
//         });
//     });

//     // Handle building upgrading/display here
// }

// // View existing core buildings
// if (interaction.options.getSubcommand() === 'viewcore') {
//     const townName = interaction.options.getString('thetown') ?? 'NONE';
//     if (townName === 'None' || townName === 'NONE') return await interaction.reply('The requested town could not be found, please select from the provided options!');

//     const coreType = extractCoreType(interaction.options.getString('coretype'));
//     if (coreType === 'None') return await interaction.reply('That was not a valid core town building!!');

//     const user = await grabU();
//     if (!user) return await noUser();

//     const townRef = await Town.findOne({ where: { name: townName } });
//     if (!townRef) return await interaction.reply('Something went wrong while locating that town!');

//     // Handle aquiring core building db reference here
//     const coreRef = await CoreBuilding.findOne({ where: [{ townid: townRef.townid }, { build_type: coreType }] });
//     if (!coreRef) return await interaction.reply('Something went wrong while locating that core buildings!');

//     // Handle building display here
//     const attachment = await loadBuilding(coreRef);
//     await interaction.reply({ files: [attachment] });

//     if (coreRef.build_type === 'clergy') return await handleClergyMystQuest(user);
//     return;
// }

// // View entire listing of town owned materials
// if (interaction.options.getSubcommand() === 'storage') {
//     const user = await grabU();
//     if (!user) return await noUser();

//     const theTown = await Town.findOne({ where: { townid: user.townid } });
//     if (!theTown) return await interaction.reply('You do not belong to any towns!');

//     await interaction.deferReply();

//     let embedTitle = '';
//     let finalFields = [];

//     let embedPages = [];
//     for (const [key, value] of materialFiles) {
//         let passType = key;
//         embedTitle = `== ${passType} Type Materials ==`;
//         finalFields = [];
//         let matList = require(value);
//         for (let i = 0; i < matList.length; i++) {
//             let fieldObj = await buildMatEmbedField(theTown, passType, matList, i);
//             finalFields.push(fieldObj);
//         }

//         let embed = {
//             title: embedTitle,
//             color: 0o0,
//             fields: finalFields
//         };
//         embedPages.push(embed);
//     }

//     const backButton = new ButtonBuilder()
//         .setLabel("Back")
//         .setStyle(ButtonStyle.Secondary)
//         .setEmoji('◀️')
//         .setCustomId('back-page');

//     const cancelButton = new ButtonBuilder()
//         .setLabel("Cancel")
//         .setStyle(ButtonStyle.Secondary)
//         .setEmoji('*️⃣')
//         .setCustomId('cancel');

//     const forwardButton = new ButtonBuilder()
//         .setLabel("Forward")
//         .setStyle(ButtonStyle.Secondary)
//         .setEmoji('▶️')
//         .setCustomId('next-page');

//     const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

//     const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

//     const filter = (i) => i.user.id === interaction.user.id;

//     const collector = embedMsg.createMessageComponentCollector({
//         componentType: ComponentType.Button,
//         filter,
//         time: 120000,
//     });

//     let currentPage = 0;

//     collector.on('collect', async (COI) => {
//         if (COI.customId === 'next-page') {
//             await COI.deferUpdate().then(async () => {
//                 if (currentPage === embedPages.length - 1) {
//                     currentPage = 0;
//                 } else currentPage += 1;
//                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
//             }).catch(error => {
//                 console.error(error);
//             });
//         }

//         if (COI.customId === 'back-page') {
//             await COI.deferUpdate().then(async () => {
//                 if (currentPage === 0) {
//                     currentPage = embedPages.length - 1;
//                 } else currentPage -= 1;
//                 await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
//             }).catch(error => {
//                 console.error(error);
//             });
//         }

//         if (COI.customId === 'cancel') {
//             collector.stop();
//         }
//     });

//     collector.on('end', () => {
//         if (embedMsg) {
//             embedMsg.delete().catch(error => {
//                 if (error.code !== 10008) {
//                     console.error('Failed to delete the message:', error);
//                 }
//             });
//         }
//     });
// }


// /**
//  * 
//  * @param {any} town
//  * @param {any} coreType
//  * @param {any} background
//  * @param {number} level 
//  */
// async function handleCoreBuilding(town, coreType, background, level) {
//     let newCore;
//     if (level === 1) {
//         newCore = await CoreBuilding.create({
//             townid: town.townid,
//             build_type: coreType,
//             build_status: `Level ${level}`,
//             background_tex: background,
//         });
//     } else {
//         newCore = await CoreBuilding.findOne({ where: [{ townid: town.townid }, { build_type: coreType }] });

//         const inc = await newCore.increment('level');
//         if (inc) await newCore.save();
//     }
    

//     if (newCore) {
//         const buildStatStr = `Built: Level ${level}`;
//         let townUpdate; 
//         if (coreType === 'grandhall') townUpdate = await town.update({ grandhall_status: buildStatStr });
//         if (coreType === 'bank') townUpdate = await town.update({ bank_status: buildStatStr });
//         if (coreType === 'market') townUpdate = await town.update({ market_status: buildStatStr });
//         if (coreType === 'tavern') townUpdate = await town.update({ tavern_status: buildStatStr });
//         if (coreType === 'clergy') townUpdate = await town.update({ clergy_status: buildStatStr });
//         if (townUpdate) await town.save();
//     }

//     let attachment;
//     if (newCore) attachment = await loadBuilding(newCore);
//     if (attachment) return attachment;
// }

// /**
//  * 
//  * @param {any} town
//  * @param {any} matType
//  * @param {any} matFile
//  * @param {any} rarID
//  */
// async function buildMatEmbedField(town, matType, matFile, rarID) {
//     let fieldName = '';
//     let fieldValue = '';
//     let fieldObj = {};

//     let uniID;
//     if (matType === 'unique') uniID = 0 + rarID, rarID = 12;

//     const filteredMat = matFile.filter(mat => mat.Rar_id === rarID);
//     if (uniID) {
//         const matRef = filteredMat[uniID];
        
//         let theMat = await TownMaterial.findOne({
//             where: [{ townid: town.townid },
//             { mat_id: matRef.Mat_id },
//             { rarity: 'Unique' }]
//         });

//         if (!theMat) {
//             fieldName = `Unknown material of ${matRef.Rarity} Rarity:`;
//             fieldValue = '0';
//         } else {
//             fieldName = `${theMat.name}:`;
//             fieldValue = `${theMat.amount}`;
//         }

//         fieldObj = { name: fieldName, value: fieldValue };
//         return fieldObj;
//     }

//     const matRef = filteredMat[0];

//     const theMat = await TownMaterial.findOne({
//         where:
//             [{ townid: town.townid },
//             { mat_id: matRef.Mat_id },
//             { rar_id: matRef.Rar_id },
//             { mattype: matType }]
//     });

//     if (!theMat) {
//         fieldName = `Unknown material of ${matRef.Rarity} Rarity:`;
//         fieldValue = '0';
//     } else {
//         fieldName = `${theMat.name}:`;
//         fieldValue = `${theMat.amount}`;
//     }

//     fieldObj = { name: fieldName, value: fieldValue };
//     return fieldObj;
// }

// /**
//  * 
//  * @param {number} amountNeeded Int
//  * @param {object} town DB instance
//  * @param {string} matType Material Type
//  * @param {string} matList required file
//  * @param {number} rarID Rar_id Ref
//  */
// async function checkMatStorage(amountNeeded, town, matType, matList, rarID) {
//     const filteredMat = matList.filter(mat => mat.Rar_id === rarID);
//     const matRef = filteredMat[0];

//     let theMat = await TownMaterial.findOne({
//         where:
//             [{ townid: town.townid },
//             { mat_id: matRef.Mat_id },
//             { rar_id: matRef.Rar_id },
//             { mattype: matType }]
//     });

//     let canBuild = true;
//     let matfound = true;
//     if (!theMat && amountNeeded > 0) matfound = false, canBuild = false;
//     if (!theMat) { matfound = false; } else {
//         if (theMat.amount < amountNeeded) canBuild = false;
//     }
    

//     let toMap = [];
//     if (matfound) {
//         toMap.push(theMat.dataValues);
//         theMat = toMap.map(mat => ({ ...mat, amountNeeded: amountNeeded, buildStatus: canBuild }),);
//     } else {
//         toMap.push(matRef);
//         theMat = toMap.map(mat => ({ ...mat, amount: 0, amountNeeded: amountNeeded, buildStatus: canBuild, isRef: true }),);
//     }
    
//     return theMat;
// }

// function extractCoreType(coreType) {
//     let type;
//     if (coreType === 'Grand Hall') type = 'grandhall';
//     if (coreType === 'Bank') type = 'bank';
//     if (coreType === 'Market') type = 'market';
//     if (coreType === 'Tavern') type = 'tavern';
//     if (coreType === 'Clergy') type = 'clergy';
//     if (!type) return 'None';
//     return type;
// }

// function createIndexFromStr(str) {
//     const pieces = str.split(': ');
//     let indexVal = pieces[1] - 1;
//     return indexVal;
// }

// /**
//  * 
//  * @param {object} town DB instance object
//  * @param {object} user DB instance object
//  * @param {object} item DB instance object
//  * @param {number} amount int
//  */
// async function depositMaterial(town, user, item, amount) {
//     let addSuccess = await addMaterial(town, item, amount, 'town');
//     if (addSuccess !== 'Added') return 'Failure 1';

//     let removeSuccess = await removeMaterial(user, item, amount, 'user');
//     if (removeSuccess !== 'Removed') return 'Failure 2';

//     return 'Success';
// }

// /**
//  * 
//  * @param {object} town DB instance object
//  * @param {object} user DB instance object
//  * @param {object} item DB instance object
//  * @param {number} amount int
//  */
// async function withdrawMaterial(town, user, item, amount) {
//     let addSuccess = await addMaterial(user, item, amount, 'user');
//     if (addSuccess !== 'Added') return 'Failure 1';

//     let removeSuccess = await removeMaterial(town, item, amount, 'town');
//     if (removeSuccess !== 'Removed') return 'Failure 2';

//     return 'Success';
// }

// /**
//  * 
//  * @param {object} target DB instance object
//  * @param {object} item DB instance object
//  * @param {number} amount int
//  * @param {string} type town || user
//  */
// async function addMaterial(target, item, amount, type) {
//     let matStore;
//     if (type === 'town') {
//         matStore = await TownMaterial.findOne({
//             where: [{ townid: target.townid }, { mat_id: item.mat_id }, { mattype: item.mattype }]
//         });
//     }
//     if (type === 'user') {
//         matStore = await MaterialStore.findOne({
//             where: [{ spec_id: target.userid }, { mat_id: item.mat_id }, { mattype: item.mattype }]
//         });
//     }

//     if (matStore) {
//         const inc = await matStore.increment('amount', { by: amount });
//         if (inc) await matStore.save();
//         return 'Added';
//     }

//     let newMat;
//     try {
//         if (type === 'town') newMat = await TownMaterial.create({ townid: target.townid, amount: amount });
//         if (type === 'user') newMat = await MaterialStore.create({ spec_id: target.userid, amount: amount });

//         if (newMat) {
//             await newMat.update({
//                 name: item.name,
//                 value: item.value,
//                 mattype: item.mattype,
//                 mat_id: item.mat_id,
//                 rarity: item.rarity,
//                 rar_id: item.rar_id,
//             });

//             await newMat.save();
//             return 'Added';
//         }
//     } catch (error) {
//         console.error(error);
//     }
// }

// /**
//  * 
//  * @param {object} target DB instance object
//  * @param {object} item DB instance object
//  * @param {number} amount int
//  * @param {string} type town || user
//  */
// async function removeMaterial(target, item, amount, type) {
//     let destroy = false;
//     if ((item.amount - amount) === 0) destroy = true;

//     let matStore;
//     if (type === 'town') {
//         matStore = await TownMaterial.findOne({
//             where: [{ townid: target.townid }, { mat_id: item.mat_id }, { mattype: item.mattype }]
//         });
//     }
//     if (type === 'user') {
//         matStore = await MaterialStore.findOne({
//             where: [{ spec_id: target.userid }, { mat_id: item.mat_id }, { mattype: item.mattype }]
//         });
//     }

//     if (destroy) {
//         const destroyed = await matStore.destroy();
//         if (destroyed) return 'Removed';
//     }
//     const dec = await matStore.decrement('amount', { by: amount });
//     if (dec) await matStore.save();
//     return 'Removed';
// }

// /**
//  * 
//  * @param {object} town DB instance object
//  * @param {object} user DB instance object
//  * @param {number} amount int
//  */
// async function depositCoins(town, user, amount) {
//     const inc = await town.increment('coins', { by: amount });
//     const dec = await user.decrement('coins', { by: amount });
//     if (!inc || !dec) return 'Failure 1';
//     return 'Success';
// }

// /**
//  * 
//  * @param {object} town  DB instance object
//  * @param {object} user  DB instance object
//  * @param {number} amount int
//  */
// async function withdrawCoins(town, user, amount) {
//     const inc = await user.increment('coins', { by: amount });
//     const dec = await town.decrement('coins', { by: amount });
//     if (!inc || !dec) return 'Failure 1';
//     return 'Success';
// }

// async function grabU() {
//     const user = await UserData.findOne({ where: { userid: interaction.user.id } });
//     if (!user) return;
//     return user;
// }

// async function noUser() {
//     await interaction.reply('No player found, Please use ``/start`` to begin your adventure!');
// }