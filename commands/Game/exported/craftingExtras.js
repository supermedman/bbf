const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { Milestones, ActiveDungeon } = require("../../../dbObjects");
const { endTimer, grabUserTaskList, grabUser } = require("../../../uniHelperFunctions");
const { checkingDamage, checkingDefence } = require("../../Development/Export/itemStringCore");

// ========================
//  PRE-CRAFT CHECK/UPDATE
// ========================

/**
 * This function handles all checks related to crafting progress and abilities,
 * upon finishing its cycles, it updates the controller and returns.
 * @param {object} controller CraftController DB Instance
 * @param {object} user UserData DB Instance
 * @returns {Promise<void>}
 */
async function handleControllerUpdateCheck(controller, user){
    // Change all current logic to handle a looping check against the current value of
    // curMID, increase "newMileID" by 1 each loop while checking against all updating
    // value markers.
    const contHandleStart = new Date().getTime();

    let idTracker = controller.milestone_id;
    if (idTracker === 12) return "Max Crafting";

    const mileTracker = {
        endTracking: false,
        newID: idTracker,
        maxRar: 1,
        dropRar: 10,
        useTooly: false,
        maxTooly: 0,
        rarTooly: 0,
        ib1: false,
        ib2: false,
        casteOptions: "Class Type"
    };

    const questData = await Milestones.findOne({where: {userid: user.userid}});
    const qLineList = ["None", "Souls", "Dark", "Torture", "Chaos", "Law", "Hate", "Myst", "Secret", "Dream"];

    let maxBoss;
    if (questData){
        const curLine = qLineList.indexOf(questData.currentquestline);
        maxBoss = curLine - 1;

        // Check if current storyline boss has been defeated. Will fail if dungeon has been overwritten!!
        const dungCheck = await ActiveDungeon.findOne({where: {dungeonspecid: user.userid, dungeonid: curLine, completed: true}});
        if (dungCheck) maxBoss++;
    }

    do {
        switch(idTracker.toString()){
            case "0":
                // Default Crafting
            break;
            case "1":
                if (user.level < 15) {mileTracker.endTracking = true; break;}
                mileTracker.maxRar = 2;
                mileTracker.newID = 1;
            break;
            case "2":
                if (user.level < 25) {mileTracker.endTracking = true; break;}
                mileTracker.maxRar = 3;
                mileTracker.newID = 2;
            break;
            case "3":
                if (user.level < 31) {mileTracker.endTracking = true; break;}
                mileTracker.maxRar = 4;
                mileTracker.newID = 3;
            break;
            case "4":
                if (!maxBoss || maxBoss < 1) {mileTracker.endTracking = true; break;}
                mileTracker.maxRar = 5;
                mileTracker.dropRar = 13;
                mileTracker.newID = 4;
            break;
            case "5":
                if (!maxBoss || maxBoss < 2) {mileTracker.endTracking = true; break;}
                mileTracker.maxRar = 6;
                mileTracker.dropRar = 14;
                mileTracker.newID = 5;
            break;
            case "6":
                if (!maxBoss || maxBoss < 3) {mileTracker.endTracking = true; break;}
                mileTracker.maxRar = 8;
                mileTracker.casteOptions += ", Norm Weapon";
                mileTracker.newID = 6;
            break;
            case "7":
                if (!maxBoss || maxBoss < 4) {mileTracker.endTracking = true; break;}
                mileTracker.maxRar = 10;
                mileTracker.dropRar = 15;
                mileTracker.useTooly = true;
                mileTracker.rarTooly = 5;
                mileTracker.maxTooly = 10;
                mileTracker.newID = 7;
            break;
            case "8":
                if (!maxBoss || maxBoss < 5) {mileTracker.endTracking = true; break;}
                mileTracker.dropRar = 16;
                mileTracker.rarTooly = 10;
                mileTracker.maxTooly = 20;
                mileTracker.casteOptions += ", Norm Armor";
                mileTracker.newID = 8;
            break;
            case "9":
                if (!maxBoss || maxBoss < 6) {mileTracker.endTracking = true; break;}
                mileTracker.dropRar = 17;
                // Check Forge
                mileTracker.newID = 9;
            break;
            case "10":
                if (!maxBoss || maxBoss < 7) {mileTracker.endTracking = true; break;}
                mileTracker.dropRar = 18;
                // Check Forge Upgrade
                mileTracker.newID = 10;
            break;
            case "11":
                if (!maxBoss || maxBoss < 8) {mileTracker.endTracking = true; break;}
                mileTracker.maxRar = 15;
                mileTracker.dropRar = 19;
                mileTracker.casteOptions += ", All Phase";
                mileTracker.newID = 11;
            break;
            case "12":
                if (!maxBoss || maxBoss < 9) {mileTracker.endTracking = true; break;}
                mileTracker.maxRar = 15;
                mileTracker.dropRar = 20;
                mileTracker.rarTooly = 20;
                mileTracker.newID = 12;
            break;
        }

        if (mileTracker.endTracking) break;
        idTracker++;
    } while (idTracker < 12);

    //     ===================
    // Check Forge Conditions here
    //     ===================


    // ===================
    //  Update Controller
    // ===================
    idTracker--;
    if (idTracker === controller.milestone_id){
        endTimer(contHandleStart, "Craft Controller Update Cycle");
        return;
    }

    // console.log("Tracker: ")
    // console.log(mileTracker);

    // console.log("\nController Pre-Update: ");
    // console.log(controller);

    await controller.update({
        milestone_id: mileTracker.newID,
        max_rar: mileTracker.maxRar,
        drop_rar: mileTracker.dropRar,
        use_tooly: mileTracker.useTooly,
        max_tooly: mileTracker.maxTooly,
        rar_tooly: mileTracker.rarTooly,
        imbue_one: mileTracker.ib1,
        imbue_two: mileTracker.ib2,
        caste_options: mileTracker.casteOptions
    }).then(async c => await c.save()).then(async c => {return await c.reload()});

    // console.log("\nController Post-Update: ");
    // console.log(controller);

    endTimer(contHandleStart, "Craft Controller Update Cycle");

    return;
}

// =======================
// POST-CRAFT CHECK/UPDATE
// =======================

/**
 * This function handles updating the ``CrafController`` for the user upon
 * finishing the crafting process.
 * @param {object} controller CraftController DB Object
 * @param {object} casteObj Standard crafted casteObj Item
 * @param {object} finalObj Helpful additional values
 */
async function handleControllerCrafting(controller, casteObj, finalObj){
    const craftedUpdatingStart = new Date().getTime();
    // .then(async c => await c.save()).then(async c => {return await c.reload()});

    // Increase all standard values
    // ============================
    // Total Crafts
    await controller.increment('tot_crafted').then(async c => await c.save()).then(async c => {return await c.reload()});
    
    // Total Value
    const nTotValue = controller.value_crafted + finalObj.value;
    await controller.update({value_crafted: nTotValue}).then(async c => await c.save()).then(async c => {return await c.reload()});

    // Check if imbued
    // ===============

    // Check if new strongest item
    // ============================
    let upStrongest, strongType;
    switch(casteObj.slot){
        case "Mainhand":
            strongType = 'strongest_weapon';
            if (controller.strongest_weapon === "None"){
                upStrongest = finalObj.item_code;
                break;
            } else {
                const curStrong = checkingDamage(controller.strongest_weapon).reduce((acc, obj) => {
                    return (acc > 0) ? acc + obj.DMG : obj.DMG;
                }, 0);
                const checkStrong = casteObj.dmgTypePairs.reduce((acc, obj) => {
                    return (acc > 0) ? acc + obj.DMG : obj.DMG;
                }, 0);
                if (checkStrong > curStrong) upStrongest = finalObj.item_code;
            }
        break;
        case "Offhand":
            strongType = 'strongest_offhand';
            if (controller.strongest_offhand === "None"){
                upStrongest = finalObj.item_code;
                break;
            } else {
                const curStrongDMG = checkingDamage(controller.strongest_weapon).reduce((acc, obj) => {
                    return (acc > 0) ? acc + obj.DMG : obj.DMG;
                }, 0);
                const curStrongDEF = checkingDefence(controller.strongest_armor).reduce((acc, obj) => {
                    return (acc > 0) ? acc + obj.DEF : obj.DEF;
                }, 0);
                const curTotStrong = curStrongDMG + curStrongDEF;
                
                const checkStrongDMG = casteObj.dmgTypePairs.reduce((acc, obj) => {
                    return (acc > 0) ? acc + obj.DMG : obj.DMG;
                }, 0);
                const checkStrongDEF = casteObj.defTypePairs.reduce((acc, obj) => {
                    return (acc > 0) ? acc + obj.DEF : obj.DEF;
                }, 0);
                const checkTotStrong = checkStrongDMG + checkStrongDEF;

                if (checkTotStrong > curTotStrong) upStrongest = finalObj.item_code;
            }
        break;
        default:
            strongType = 'strongest_armor';
            if (controller.strongest_armor === "None"){
                upStrongest = finalObj.item_code;
                break;
            } else {
                const curStrong = checkingDefence(controller.strongest_armor).reduce((acc, obj) => {
                    return (acc > 0) ? acc + obj.DEF : obj.DEF;
                }, 0);
                const checkStrong = casteObj.defTypePairs.reduce((acc, obj) => {
                    return (acc > 0) ? acc + obj.DEF : obj.DEF;
                }, 0);
                if (checkStrong > curStrong) upStrongest = finalObj.item_code;
            }
        break;
    }

    await controller.update({
        [`${strongType}`]: upStrongest
    }).then(async c => await c.save()).then(async c => {return await c.reload()});

    // Check if most valueble
    // ============================
    if (controller.highest_value < finalObj.value){
        await controller.update({
            highest_value: finalObj.value,
            valuble_item: finalObj.item_code
        }).then(async c => await c.save()).then(async c => {return await c.reload()});
    }

    // Check if highest rarity
    // =======================
    if (controller.highest_rarity < casteObj.rarity){
        await controller.update({
            highest_rarity: casteObj.rarity
        }).then(async c => await c.save()).then(async c => {return await c.reload()});
    }

    // Check if rar >= 13
    // ==================
    if (casteObj.rarity >= 13){
        const rarTrackingObj = JSON.parse(controller.rarity_tracker);
        rarTrackingObj[`${casteObj.rarity}`]++;
        const upRarTracker = JSON.stringify(rarTrackingObj);
        await controller.update({
            rarity_tracker: upRarTracker
        }).then(async c => await c.save()).then(async c => {return await c.reload()});
    }

    // Check if item added to drops
    // ============================
    if (finalObj.passedBenching) await controller.increment('benchmark_crafts').then(async c => await c.save()).then(async c => {return await c.reload()});

    // Check if item meets active task request
    // =======================================
    const craftTaskCheckUpdateStart = new Date().getTime();
    const userTaskList = await grabUserTaskList(await grabUser(controller.user_id), 'active', "Craft");
    if (typeof userTaskList !== 'string'){
        // Check for match 
        // casteObj.casteType === task.name
        // casteObj.rarity === task.condition
        const casteMatches = (name) => casteObj.casteType === name;
        const rarQualifies = (rar) => casteObj.rarity >= rar;

        const checkTaskReqs = (task) => {
            return casteMatches(task.name) && rarQualifies(task.condition);
        };

        // Filter for any and all tasks that pass requirement check
        const tasksMatchConditionList = [];
        for (const task of userTaskList){
            if (checkTaskReqs(task)) tasksMatchConditionList.push(task);
        }

        // Update all matching tasks, if any
        if (tasksMatchConditionList.length > 0){
            for (const task of tasksMatchConditionList){
                await task.increment('amount')
                .then(async t => await t.save())
                .then(async t => {return await t.reload()});
            }

            endTimer(craftTaskCheckUpdateStart, '(UPDATE) Craft Tasks Check List');
        } else {
            console.log('No Tasks Match Crafting Conditions');
            endTimer(craftTaskCheckUpdateStart, '(NO UPDATE) Craft Tasks Check List');
        }

        
    } else {
        console.log(`No Tasks Outcome: ${userTaskList}`);
        endTimer(craftTaskCheckUpdateStart, '(NO UPDATE) Craft Tasks Check List');
    }


    // console.log(controller.dataValues);

    endTimer(craftedUpdatingStart, "Post-Crafting: Controller Update Cycle");
}

// ========================
//   CRAFT OPTION FILTERS
// ========================

/**
 * This function loads the crafting filter reference object used with crafting button displays,
 * 
 * The filtering outcomes decide which buttons should be disabled for the given user.
 * @param {object} user UserData DB Object
 * @param {object} controller CraftingController DB Object
 * @returns {{Class: string, Hands: number[], Type: {Weapon: string[], Armor: string[]}}}
 */
function loadCasteTypeFilterObject(user, controller){
    // CASTE CHOICE FILTERING
    const classCasteList = [
        {Class: "Mage", Hands: [0, 1], Type: {Weapon: ["Magic"], Armor: ["Magic"]}},
        {Class: "Thief", Hands: [0, 1], Type: {Weapon: ["Melee"], Armor: ["Melee"]}},
        {Class: "Warrior", Hands: [1, 2], Type: {Weapon: ["Melee"], Armor: ["None"]}},
        {Class: "Paladin", Hands: [0, 2], Type: {Weapon: ["Magic", "Melee"], Armor: ["Melee"]}},
    ];

    const classObjMatch = classCasteList.find(obj => obj.Class === user.pclass);

    // Options available for caste_options: Class Type
    const classCasteFilter = {
        Class: classObjMatch.Class,
        Hands: classObjMatch.Hands,
        Type: classObjMatch.Type
    };

    // Obtain option list, split to array 
    const contCasteOptions = controller.caste_options;
    const casteOptionList = contCasteOptions.split(', ');

    let finalCasteTypes = classCasteFilter;
    // Check last position for total options
    switch(casteOptionList[casteOptionList.length - 1]){
        case "Class Type":
            // Only Class Types, Do nothing
        break;
        case "Norm Weapon":
            // All Norm Wep
            loadWepCasteChanges(finalCasteTypes.Class, finalCasteTypes);
        break;
        case "Norm Armor":
            // All Norm Wep/Armor
            loadWepCasteChanges(finalCasteTypes.Class, finalCasteTypes);
            loadArmCasteChanges(finalCasteTypes.Class, finalCasteTypes);
        break;
        case "All Phase":
            // All Castes Available
            loadAllCasteOptions(finalCasteTypes);
        break;
    }

    return finalCasteTypes;
}

/**
 * This function loads the ``casteObj`` weapon data according to the given ``cType``
 * @param {string} cType Players Class Type
 * @param {object} casteObj Casteobj prefab
 * @returns {object}
 */
function loadWepCasteChanges(cType, casteObj){
    switch(cType){
        case "Mage":
            casteObj.Hands = [0, 1, 2];
            casteObj.Type.Weapon = ["Magic", "Melee"];
        break;
        case "Thief":
            casteObj.Hands = [0, 1, 2];
            casteObj.Type.Weapon = ["Magic", "Melee"];
        break;
        case "Warrior":
            casteObj.Type.Weapon = ["Magic", "Melee"];
        break;
        case "Paladin":
            casteObj.Hands = [0, 1, 2];
        break;
    }
    return casteObj;
}

/**
 * This function loads the ``casteObj`` armor data according to the given ``cType`` 
 * @param {string} cType Players Class Type
 * @param {object} casteObj Casteobj prefab
 * @returns {object}
 */
function loadArmCasteChanges(cType, casteObj){
    switch(cType){
        case "Mage":
            casteObj.Type.Armor = ["Magic", "Melee"];
        break;
        case "Thief":
            casteObj.Type.Armor = ["Magic", "Melee"];
        break;
        case "Warrior":
            casteObj.Hands = [0, 1, 2];
            casteObj.Type.Armor = ["Magic", "Melee"];
        break;
        case "Paladin":
            casteObj.Type.Armor = ["Magic", "Melee"];
        break;
    }
    return casteObj;
}

/**
 * This function loads the ``casteObj`` data will all possible caste choices.
 * @param {object} casteObj Casteobj prefab
 * @returns {object}
 */
function loadAllCasteOptions(casteObj){
    casteObj.Hands = [0, 1, 2];
    casteObj.Type.Weapon = ["Magic", "Melee", "Special"];
    casteObj.Type.Armor = ["Magic", "Melee", "Special"];
    return casteObj;
}

// ========================
//   CRAFT OPTION BUTTONS
// ========================

/**
 * This function handles button creation and disables unavailable options.
 * @param {object} casteObj Casteobj filtering data object
 * @returns {ActionRowBuilder}
 */
function loadSlotButtons(casteObj){
    // Full Button List
    // Mainhand, Offhand, Helmet, Chestpiece, Leggings
    const buttonList = [];

    const wepButt = new ButtonBuilder()
    .setCustomId('mainhand')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Mainhand');

    const shieldButt = new ButtonBuilder()
    .setCustomId('offhand')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Offhand');

    const helmButt = new ButtonBuilder()
    .setCustomId('headslot')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Helmet');

    const chestButt = new ButtonBuilder()
    .setCustomId('chestslot')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Chestpiece');

    const legButt = new ButtonBuilder()
    .setCustomId('legslot')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Leggings');
    
    if (!casteObj.Hands.includes(0)){
        // No armor Craft
        helmButt.setDisabled(true);
        chestButt.setDisabled(true);
        legButt.setDisabled(true);
    }

    buttonList.push(wepButt, shieldButt, helmButt, chestButt, legButt);

    const slotButtRow = new ActionRowBuilder().addComponents(buttonList);

    return slotButtRow;
}

/**
 * This function handles button creation and disables unavailable options.
 * @param {object} casteObj Casteobj filtering data object
 * @param {string} slotPicked String outcome from slot picked
 * @returns {ActionRowBuilder}
 */
function loadGroupButtons(casteObj, slotPicked){
    // Full Button Lists
    const buttonList = [];
    const backButton = new ButtonBuilder()
    .setCustomId('back-group')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Go Back');

    if (slotPicked === 'mainhand'){
        // Mainhand: 4 Norm
        // Magic: 1/2 Handed
        const ma1hButt = new ButtonBuilder()
        .setCustomId('ma1h-gp')
        .setStyle(ButtonStyle.Primary)
        .setLabel('Magic 1 Handed');
        const ma2hButt = new ButtonBuilder()
        .setCustomId('ma2h-gp')
        .setStyle(ButtonStyle.Primary)
        .setLabel('Magic 2 Handed');

        // Melee: 1/2 Handed
        const me1hButt = new ButtonBuilder()
        .setCustomId('me1h-gp')
        .setStyle(ButtonStyle.Primary)
        .setLabel('Melee 1 Handed');
        const me2hButt = new ButtonBuilder()
        .setCustomId('me2h-gp')
        .setStyle(ButtonStyle.Primary)
        .setLabel('Melee 2 Handed');

        if (!casteObj.Hands.includes(1)){
            // Disable 1 handed
            ma1hButt.setDisabled(true);
            me1hButt.setDisabled(true);
        }
        if (!casteObj.Hands.includes(2)){
            // Disable 2 handed
            ma2hButt.setDisabled(true);
            me2hButt.setDisabled(true);
        }
        if (!casteObj.Type.Weapon.includes("Magic")){
            // Disable Magic
            ma1hButt.setDisabled(true);
            ma2hButt.setDisabled(true);
        }
        if (!casteObj.Type.Weapon.includes("Melee")){
            // Disable Melee
            me1hButt.setDisabled(true);
            me2hButt.setDisabled(true);
        }

        buttonList.push(backButton, ma1hButt, ma2hButt, me1hButt, me2hButt);
    }

    if (slotPicked === 'offhand'){
        // Offhand: 2 Norm
        // Magic Shield
        const masButt = new ButtonBuilder()
        .setCustomId('mas-gp')
        .setStyle(ButtonStyle.Primary)
        .setLabel('Magic Shield');
        // Melee Shield
        const mesButt = new ButtonBuilder()
        .setCustomId('mes-gp')
        .setStyle(ButtonStyle.Primary)
        .setLabel('Melee Shield');

        if (!casteObj.Type.Weapon.includes("Magic")){
            // Disable Magic
            masButt.setDisabled(true);
        }
        if (!casteObj.Type.Weapon.includes("Melee")){
            // Disable Melee
            mesButt.setDisabled(true);
        }

        buttonList.push(backButton, masButt, mesButt);
    }
    
    if (slotPicked === 'headslot'){
        // Headslot: 2 Norm
        // Magic Helm
        const mahButt = new ButtonBuilder()
        .setCustomId('mah-gp')
        .setStyle(ButtonStyle.Primary)
        .setLabel('Magic Helm');
        // Melee Helm
        const mehButt = new ButtonBuilder()
        .setCustomId('meh-gp')
        .setStyle(ButtonStyle.Primary)
        .setLabel('Melee Helm');

        if (!casteObj.Type.Armor.includes("Magic")){
            // Disable Magic
            mahButt.setDisabled(true);
        }
        if (!casteObj.Type.Armor.includes("Melee")){
            // Disable Melee
            mehButt.setDisabled(true);
        }

        buttonList.push(backButton, mahButt, mehButt);
    }
    
    if (slotPicked === 'chestslot'){
        // Chestslot: 2 Norm
        // Magic Chestpiece
        const macButt = new ButtonBuilder()
        .setCustomId('mac-gp')
        .setStyle(ButtonStyle.Primary)
        .setLabel('Magic Chestpiece');
        // Melee Chestpiece
        const mecButt = new ButtonBuilder()
        .setCustomId('mec-gp')
        .setStyle(ButtonStyle.Primary)
        .setLabel('Melee Chestpiece');

        if (!casteObj.Type.Armor.includes("Magic")){
            // Disable Magic
            macButt.setDisabled(true);
        }
        if (!casteObj.Type.Armor.includes("Melee")){
            // Disable Melee
            mecButt.setDisabled(true);
        }

        buttonList.push(backButton, macButt, mecButt);
    }
    
    if (slotPicked === 'legslot'){
        // Legslot: 2 Norm
        // Magic Leggings
        const malButt = new ButtonBuilder()
        .setCustomId('mal-gp')
        .setStyle(ButtonStyle.Primary)
        .setLabel('Magic Leggings');
        // Melee Leggings
        const melButt = new ButtonBuilder()
        .setCustomId('mel-gp')
        .setStyle(ButtonStyle.Primary)
        .setLabel('Melee Leggings');

        if (!casteObj.Type.Armor.includes("Magic")){
            // Disable Magic
            malButt.setDisabled(true);
        }
        if (!casteObj.Type.Armor.includes("Melee")){
            // Disable Melee
            melButt.setDisabled(true);
        }

        buttonList.push(backButton, malButt, melButt);
    }

    const groupButtRow = new ActionRowBuilder().addComponents(buttonList);
    
    return groupButtRow;
}

/**
 * This function handles button creation handling for given group picked.
 * @param {string} groupPicked customId of Group Option Picked
 * @returns {ActionRowBuilder}
 */
function loadTypeButtons(groupPicked){
    // Full Button Lists
    const buttonList = [];
    const backButton = new ButtonBuilder()
    .setCustomId('back-type')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Go Back');

    buttonList.push(backButton);

    switch(groupPicked){
        case "ma1h-gp":
            // Magic 1h
            const wandButt = new ButtonBuilder()
            .setCustomId('wand-type')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Wand');
            const tomeButt = new ButtonBuilder()
            .setCustomId('tome-type')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Tome');
            buttonList.push(wandButt, tomeButt);
        break;
        case "ma2h-gp":
            // Magic 2h
            const staffButt = new ButtonBuilder()
            .setCustomId('staff-type')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Staff');
            const focusButt = new ButtonBuilder()
            .setCustomId('focus-type')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Focus');
            buttonList.push(staffButt, focusButt);
        break;
        case "me1h-gp":
            // Melee 1h
            const lblButt = new ButtonBuilder()
            .setCustomId('light-blade-type')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Light Blade');
            const maceButt = new ButtonBuilder()
            .setCustomId('mace-type')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Mace');
            buttonList.push(lblButt, maceButt);
        break;
        case "me2h-gp":
            // Melee 2h
            const poleButt = new ButtonBuilder()
            .setCustomId('polearm-type')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Polearm');
            const hbButt = new ButtonBuilder()
            .setCustomId('heavy-blade-type')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Heavy Blade');
            buttonList.push(poleButt, hbButt);
        break;
        case "mas-gp":
            // Magic Shield
            const lbuButt = new ButtonBuilder()
            .setCustomId('light-buckler-type')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Light Buckler');
            buttonList.push(lbuButt);
        break;
        case "mes-gp":
            // Melee Shield
            const hsButt = new ButtonBuilder()
            .setCustomId('heavy-shield-type')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Heavy Shield');
            buttonList.push(hsButt);
        break;
        case "mah-gp":
            // Magic Helm
            const lcButt = new ButtonBuilder()
            .setCustomId('light-cap-type')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Light Cap');
            buttonList.push(lcButt);
        break;
        case "meh-gp":
            // Melee Helm
            const hhButt = new ButtonBuilder()
            .setCustomId('heavy-helm-type')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Heavy Helm');
            buttonList.push(hhButt);
        break;
        case "mac-gp":
            // Magic Chest
            const lrButt = new ButtonBuilder()
            .setCustomId('light-robe-type')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Light Robe');
            buttonList.push(lrButt);
        break;
        case "mec-gp":
            // Melee Chest
            const hcButt = new ButtonBuilder()
            .setCustomId('heavy-chest-type')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Heavy Chestpiece');
            buttonList.push(hcButt);
        break;
        case "mal-gp":
            // Magic Legs
            const llButt = new ButtonBuilder()
            .setCustomId('light-legs-type')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Light Leggings');
            buttonList.push(llButt);
        break;
        case "mel-gp":
            // Melee Legs
            const hgButt = new ButtonBuilder()
            .setCustomId('heavy-legs-type')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Heavy Greaves');
            buttonList.push(hgButt);
        break;
    }
    
    const typeButtRow = new ActionRowBuilder().addComponents(buttonList);

    return typeButtRow;
}


module.exports = {
    handleControllerUpdateCheck,
    handleControllerCrafting,
    loadCasteTypeFilterObject,
    loadSlotButtons,
    loadGroupButtons,
    loadTypeButtons
}