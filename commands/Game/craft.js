const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder } = require('discord.js');
const { grabUser, endTimer, createInteractiveChannelMessage, handleCatchDelete, makeCapital, sendTimedChannelMessage, editTimedChannelMessage } = require('../../uniHelperFunctions');
const { CraftControllers, MaterialStore, ItemLootPool } = require('../../dbObjects');
const { 
    itemCasteFilter, 
    itemGenDmgTypes, 
    itemGenPickDmgTypes, 
    rarityGenConstant, 
    itemGenDmgConstant, 
    itemGenDefConstant, 
    dmgTypeAmountGen, 
    defTypeAmountGen, 
    itemValueGenConstant, 
    extractName, 
    benchmarkQualification 
} = require('../Development/Export/craftingContainer');
const {
    handleControllerUpdateCheck,
    handleControllerCrafting,
    loadSlotButtons,
    loadGroupButtons,
    loadTypeButtons,
    loadCasteTypeFilterObject
} = require('./exported/craftingExtras');
const { uni_CreateCompleteItemCode, checkingSlot, checkingRar, checkingCasteID, checkingRarID } = require('../Development/Export/itemStringCore');
const { grabColour } = require('./exported/grabRar');
const { checkInboundItem, handleNewStaticItem, checkOutboundMat } = require('../Development/Export/itemMoveContainer');

module.exports = {
    helptypes: ['Gear', 'Crafting', 'Story'],
	data: new SlashCommandBuilder()
    .setName('craft')
    .setDescription('Enter the forge, bring fury from the flames!'),
	async execute(interaction) { 
        // const allowedUsers = ['501177494137995264', '951980834469060629', '544114963346620417'];
        // if (!allowedUsers.includes(interaction.user.id)) return await interaction.reply('This command is under construction! Check back later!');
        
        const user = await grabUser(interaction.user.id);
        if (user.level < 10) return await interaction.reply('You must be at least level 10 before you can be allowed to use the forge!');
        
        const loadingReplyEmbed = new EmbedBuilder()
        .setTitle('Preparing the forges..')
        .setDescription('Please hold while the forge heats up!');

        const loadingMsgAnchor = await interaction.reply({embeds: [loadingReplyEmbed]});

        /**
         *     === CASTE OPTIONS ===
         * 
         *     == Class Type
         *      - Mage
         *       - Type: Magic
         *       - Hands: 1 || 0
         * 
         *      - Thief
         *       - Type: Melee
         *       - Hands: 1 || 0
         * 
         *      - Warrior
         *       - Type: Melee
         *       - Hands: 1 || 2
         * 
         *      - Paladin
         *       - Type: Melee (Armor/Weapon) || Magic (Weapon)
         *       - Hands: 2 || 0
         * 
         *     == Normal Type
         *      - Type: Magic || Melee
         *      - Hands: 1 | 2 | 0
         * 
         *     == Phase/Special Type
         *      - Type: Special
         *      - Hands: 1 | 2 | 0
         * 
         * 
         *     === CRAFTING MILESTONES ===
         *  
         *     == Unlocks Crafting
         *      - Level: 10
         *      - Max Rar: 1
         *      - Use Tooly: No
         *      - Imbue 1 & 2: No
         *      - Caste Options: Class Type Only
         * 
         *     == #1
         *      - Level: 15
         *      - Max Rar: 2
         *      
         *     == #2
         *      - Level: 25
         *      - Max Rar: 3
         * 
         *     == #3
         *      - Level: 31
         *      - Max Rar: 4
         * 
         *     == #4
         *      - Defeat Wadon
         *      - Max Rar: 5
         *      - New Rar: 13
         * 
         *     == #5
         *      - Defeat Dyvulla
         *      - Max Rar: 6
         *      - New Rar: 14
         * 
         *     == #6
         *      - Defeat Ados
         *      - Max Rar: 8
         *      - Caste Options: All Normal Weapons
         * 
         *     == #7
         *      - Defeat Zimmir
         *      - Max Rar: 10
         *      - New Rar: 15
         *      - Use Tooly: Yes
         *      - Tooly Rar: 5
         *      - Max Tooly: 10
         * 
         *     == #8
         *      - Defeat Phamnera
         *      - New Rar: 16
         *      - Tooly Rar: 10
         *      - Max Tooly: 20
         *      - Caste Options: All Normal Armor
         * 
         *     == #9
         *      - Defeat Xogdia
         *      - New Rar: 17
         *      - Phasereader: Unlocks Forge
         *      - Forge: Unlocks Imbue 1
         * 
         *     == #10
         *      - Befriend Mien
         *      - New Rar: 18
         *      - Unlocks: Forge Upgrade
         *      - Imbue 1: Yes
         *      - Upgrade Forge: Unlocks Imbue 2
         * 
         *     == #11
         *      - Defeat Nizdea
         *      - Max Rar: 15
         *      - New Rar: 19
         *      - Caste Options: All Phase Types
         * 
         *     == #12
         *      - Complete The Dream
         *      - Max Rar: 20
         *      - New Rar: 20
         */
        let controller = await CraftControllers.findOrCreate({
            where: {
                user_id: user.userid
            }
        });

        if (controller[1]){
            await controller[0].save().then(async c => {return await c.reload()});
        }

        controller = controller[0];

        await handleControllerUpdateCheck(controller, user);

        // Construct crafting menus with updated controller values.
        // VALUES TO TRACK
        // - max_rar
        // - use_tooly
        //   - max_tooly (Only if use_tooly=true)
        //   - rar_tooly (Only if use_tooly=true)
        // - imbue_one (Not Checked Yet!!)
        // - imbue_two (Not Checked Yet!!)
        // - caste_options

        // ORDER OF CHECKING
        // - caste_options
        // - max_rar
        // - use_tooly
        //   - max_tooly (use_tooly=true)
        //   - rar_tooly (use_tooly=true)
        // - imbue_one (WIP)
        // - imbue_two (WIP)

        // CASTE CHOICE FILTERING
        // const classCasteList = [
        //     {Class: "Mage", Hands: [0, 1], Type: {Weapon: ["Magic"], Armor: ["Magic"]}},
        //     {Class: "Thief", Hands: [0, 1], Type: {Weapon: ["Melee"], Armor: ["Melee"]}},
        //     {Class: "Warrior", Hands: [1, 2], Type: {Weapon: ["Melee"], Armor: ["None"]}},
        //     {Class: "Paladin", Hands: [0, 2], Type: {Weapon: ["Magic", "Melee"], Armor: ["Melee"]}},
        // ];
        // const classObjMatch = classCasteList.filter(obj => obj.Class === user.pclass)[0];
        // // Options available for caste_options: Class Type
        // const classCasteFilter = {
        //     Class: classObjMatch.Class,
        //     Hands: classObjMatch.Hands,
        //     Type: classObjMatch.Type
        // };

        // // Obtain option list, split to array 
        // const contCasteOptions = controller.caste_options;
        // const casteOptionList = contCasteOptions.split(', ');

        // let finalCasteTypes = classCasteFilter;
        // // Check last position for total options
        // switch(casteOptionList[casteOptionList.length - 1]){
        //     case "Class Type":
        //         // Only Class Types, Do nothing
        //     break;
        //     case "Norm Weapon":
        //         // All Norm Wep
        //         loadWepCasteChanges(finalCasteTypes.Class, finalCasteTypes);
        //     break;
        //     case "Norm Armor":
        //         // All Norm Wep/Armor
        //         loadWepCasteChanges(finalCasteTypes.Class, finalCasteTypes);
        //         loadArmCasteChanges(finalCasteTypes.Class, finalCasteTypes);
        //     break;
        //     case "All Phase":
        //         // All Castes Available
        //         loadAllCasteOptions(finalCasteTypes);
        //     break;
        // }

        const finalCasteTypes = loadCasteTypeFilterObject(user, controller);

        // console.log('Final Caste Options for user: ');
        // console.log(finalCasteTypes);

        /**     === PAGE MENUS ===
         * 
         *    - PAGE #1 == Caste Slot Select Page ==
         * Button - Caste Option Buttons Based on ``finalCasteTypes`` data
         * 
         *    - PAGE #2 == Item Group Select Page ==
         * Back Button - Return to Page #1
         * Button - Item Group Buttons Based on Caste Slot Picked, Filtered by ``finalCasteTypes`` data
         * 
         *    - PAGE #3 == Item Type Select Page ==
         * Back Button - Return to Page #2
         * Button - Item Type Buttons Based on Item Group Picked
         */
        const casteEmbedList = [];

        const casteSlotEmbed = new EmbedBuilder()
        .setTitle('== Select A Slot ==')
        .setDescription('Choose one of the provided slots below to continue!');

        const itemGroupEmbed = new EmbedBuilder()
        .setTitle('== Select A Group ==')
        .setDescription('Choose one of the provided groups below to continue!\nPress back to return to the slot menu.');

        const itemTypeEmbed = new EmbedBuilder()
        .setTitle('== Select A Type ==')
        .setDescription('Choose one of the provided types below to continue!\nPress back to return to the item group menu.');

        casteEmbedList.push(casteSlotEmbed, itemGroupEmbed, itemTypeEmbed);

        const initialReply = {embeds: [casteEmbedList[0]], components: [loadSlotButtons(finalCasteTypes)]};

        // Delete loading mesage upon initial menu being loaded.
        await handleCatchDelete(loadingMsgAnchor);

        const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 600000, initialReply, "FollowUp");

        const slotCheckList = ["mainhand", "offhand", "headslot", "chestslot", "legslot"];
        const groupCheckList = ["ma1h-gp", "ma2h-gp", "me1h-gp", "me2h-gp", "mas-gp", "mes-gp", "mah-gp", "meh-gp", "mac-gp", "mec-gp", "mal-gp", "mel-gp"];
        const typeCheckList = ["wand-type", "tome-type", "staff-type", "focus-type", "light-blade-type", "mace-type", "polearm-type", "heavy-blade-type", "light-buckler-type", "heavy-shield-type", "light-cap-type", "heavy-helm-type", "light-robe-type", "heavy-chest-type", "light-legs-type", "heavy-legs-type"];
        const typeMatchList = ["Wand", "Tome", "Staff", "Focus", "Light Blade", "Mace", "Polearm", "Heavy Blade", "Light Buckler", "Heavy Shield", "Light Cap", "Heavy Helm", "Light Robe", "Heavy Chestplate", "Light Leggings", "Heavy Greaves"];

        const optionTracker = {
            slot: "",
            group: "",
            type: ""
        };

        collector.on('collect', async c => {
            await c.deferUpdate().then(async () =>{
                //console.log(c);
                // Handling progressive menu here
                let editWith, casteFinished = false;
                switch(c.customId){
                    case "back-group":
                        // Show Slot Embed
                        optionTracker.slot = "";
                        editWith = {embeds: [casteEmbedList[0]], components: [loadSlotButtons(finalCasteTypes)]};
                    break;
                    case "back-type":
                        // Show Group Embed
                        optionTracker.group = "";
                        editWith = {embeds: [casteEmbedList[1]], components: [loadGroupButtons(finalCasteTypes, optionTracker.slot)]};
                    break;
                    default:
                        if (slotCheckList.includes(c.customId)){
                            // First check: slot picked
                            optionTracker.slot = c.customId;
                            editWith = {embeds: [casteEmbedList[1]], components: [loadGroupButtons(finalCasteTypes, optionTracker.slot)]};
                        } else if (groupCheckList.includes(c.customId)){
                            // Second check: group picked
                            optionTracker.group = c.customId;
                            editWith = {embeds: [casteEmbedList[2]], components: [loadTypeButtons(optionTracker.group)]};
                        } else if (typeCheckList.includes(c.customId)){
                            // Third check: type picked
                            optionTracker.type = c.customId;
                            //editWith = {embeds: [new EmbedBuilder().setTitle('Place Holder').setDescription(`Final Picked Caste Options:\nSlot: ${makeCapital(optionTracker.slot)}\nGroup: ${optionTracker.group}\nType: ${optionTracker.type}\nType Matched: ${typeMatchList[typeCheckList.indexOf(optionTracker.type)]}`)]};
                            casteFinished = true;
                        }
                    break;
                }
                if (casteFinished) return collector.stop('Caste Picked');
                if (editWith.embeds) await anchorMsg.edit(editWith);
            }).catch(e => console.error(e));
        });

        collector.on('end', async (c, r) => {
            if (!r || r !== "Caste Picked"){
                await handleCatchDelete(anchorMsg);
            }

            if (r === "Caste Picked"){
                optionTracker.slot = makeCapital(optionTracker.slot);
                optionTracker.type = typeMatchList[typeCheckList.indexOf(optionTracker.type)];

                await handleCatchDelete(anchorMsg);

                handleCraftInterface(optionTracker);
            }
        });

        /**
         * This function handles all specific crafting interface options for the 
         * selected Item Caste.  
         * @param {object} pickedObj User selected options: ``{slot: string, group: string, type: string}``
         * @returns {Promise<void>}
         */
        async function handleCraftInterface(pickedObj){
            // Handle Imbue options here
            // =========================
            const startMatOptionTime = new Date().getTime();

            const casteObj = itemCasteFilter(pickedObj.type, pickedObj.slot);

            if (!controller.use_tooly) casteObj.mats.splice(3,1);

            const {materialFiles} = interaction.client;
            const matRefList = [];
            for (const matRef of casteObj.mats){
                for (const [key, value] of materialFiles){
                    if (key === matRef.toLowerCase()){
                        matRefList.push({matKey: matRef, file: value});
                        break;
                    }
                }
            }

            // Check materials needed and filter out mats with amounts below required.
            // Filter mats above controller.max_rar
            const matFabRefList = new Array(matRefList.length);
            let idxCount = 0;
            for (const matCheck of matRefList){
                const matFile = require(matCheck.file);
                const canUseMatList = [];
                for (const mat of matFile){
                    if (mat.Rar_id <= controller.max_rar){
                        // Rar can be used
                        canUseMatList.push(mat);
                        continue;
                    }
                }
                // Fill array section with all matching rar mats
                matFabRefList[idxCount] = new Array().concat(canUseMatList);
                idxCount++;
            }

            // List of materials to be checked, Array[][]
            // console.log(...matFabRefList);
            // Add additional number menu for tooly amounts if unlocked
            const orderedAmounts = [15, 10, 5, controller.max_tooly];
            const ownedMatRefList = [];
            idxCount = 0;
            let breakOnMat = false;
            for (const matArr of matFabRefList){
                let innerCount = 0, singleTypeMatList = [];
                for (const mat of matArr){
                    const uMat = await MaterialStore.findOne({
                        where: {
                            spec_id: user.userid, 
                            mattype: casteObj.mats[idxCount].toLowerCase(),
                            mat_id: mat.Mat_id
                        }
                    });

                    // if (uMat) console.log(uMat.dataValues);

                    // Material not owned || Material amount too low
                    if (!uMat || uMat.amount < orderedAmounts[idxCount]){
                        matFabRefList[idxCount].splice(innerCount, 1);
                        // innerCount++;
                        continue;
                    }

                    singleTypeMatList.push(uMat);
                    innerCount++;
                }

                // Material list exhausted!!
                if (matArr.length === 0) {
                    breakOnMat = true;
                    break;
                }

                ownedMatRefList.push(singleTypeMatList);
                idxCount++;
            }

            // Final remaining materials after being checked
            // console.log(...matFabRefList);
            // console.log(...ownedMatRefList);

            if (breakOnMat){
                const noMatEmbed = new EmbedBuilder()
                .setTitle(`No Valid ${casteObj.mats[idxCount]} Materials`)
                .setColor('DarkRed')
                .setDescription(`To craft this item type you need at least ${orderedAmounts[idxCount]} ${casteObj.mats[idxCount]} materials of a single rarity!`);

                endTimer(startMatOptionTime, "Mat Load (INCOMPLETE)");

                return await sendTimedChannelMessage(interaction, 45000, noMatEmbed);
            }

            // Add more material info here, ex: 1st mat amount 15, 2nd mat amount 10, ect...
            const matSelectEmbed = new EmbedBuilder()
            .setTitle('Material Selection Menu')
            .setColor('Blue')
            .setDescription('Please select materials in each catagory to craft an item with them!');

            // Preload Checked materials
            const selectMenuActionRows = [];
            for (let i = 0; i < ownedMatRefList.length; i++){
                const stringSelectOptionList = [];
                ownedMatRefList[i].sort((a,b) => a.rar_id - b.rar_id);
                for (const mat of ownedMatRefList[i]){
                    const option = new StringSelectMenuOptionBuilder()
                    .setLabel(mat.name)
                    .setDescription(`Rarity: ${mat.rarity}, Owned/Need: ${mat.amount}/${orderedAmounts[i]}`)
                    .setValue(mat.name);
                    stringSelectOptionList.push(option);
                }
                const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`material-${i}`)
                .setPlaceholder('Select a material!')
                .addOptions(stringSelectOptionList);

                const selectRow = new ActionRowBuilder().addComponents(selectMenu);
                selectMenuActionRows.push(selectRow);
            }

            endTimer(startMatOptionTime, "Mat Load (COMPLETE)");

            const replyObj = {embeds: [matSelectEmbed], components: [selectMenuActionRows[0]]};

            const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 240000, replyObj, "FollowUp", "String");

            const materialChoices = [];
            let materialStep = 0;
            collector.on('collect', async c => {
                await c.deferUpdate().then(async () => {
                    materialStep++;
                    materialChoices.push(c.values[0]);

                    if (materialStep === selectMenuActionRows.length) return collector.stop('Done');

                    await anchorMsg.edit({components: [selectMenuActionRows[materialStep]]});
                }).catch(e => console.error(e));
            });

            collector.on('end', async (c, r) => {
                if (!r || r !== 'Done'){
                    return await handleCatchDelete(anchorMsg);
                }

                await handleCatchDelete(anchorMsg);

                const startCraftTime = new Date().getTime();

                const waitCraftEmbed = new EmbedBuilder()
                .setTitle('Crafting IN PROGRESS')
                .setColor('DarkGreen')
                .setDescription('Please hold while the item is crafted!!');

                const followUpCrafting = await interaction.followUp({embeds: [waitCraftEmbed]});

                const materialList = [], payupMatList = [];
                const toolNumPicked = 0; // UPDATE TO NUMBER PICKED BY USER
                const matAmounts = [15, 10, 5, toolNumPicked];
                let listPos = 0, matTotal = 0, rarValPairs = [];
                for (const matName of materialChoices){
                    const theMat = ownedMatRefList[listPos].filter(mat => mat.name === matName)[0];

                    rarValPairs.push({rar: theMat.rar_id, val: theMat.value});
                    matTotal += matAmounts[listPos];

                    const matObj = {
                        name: matName,
                        rarity: theMat.rar_id,
                        amount: matAmounts[listPos]
                    };
                    materialList.push(matObj);

                    const payMatObj = {
                        Mat_id: theMat.mat_id,
                        matType: theMat.mattype,
                        amount: matAmounts[listPos]
                    };
                    payupMatList.push(payMatObj);
                    listPos++;
                }

                if (materialList.length === 3) {
                    materialList.push({name: "", rarity: 0, amount: 0});
                    rarValPairs.push({rar: 0, val: 0});
                }
                
                const rarPicked = rarityGenConstant(materialList[0], materialList[1], materialList[2], materialList[3]);
                casteObj.rarity = rarPicked;
                casteObj.totalMatsUsed = matTotal;
                casteObj.rarValPairs = rarValPairs;

                casteObj.dmgOptions = itemGenDmgTypes(casteObj);

                casteObj.domMat = materialList[0];

                casteObj.imbuedTypes = [];
                // casteObj.dmgTypes = pickedImbuedTypes;
                casteObj.dmgTypes = [];

                casteObj.dmgTypes = casteObj.dmgTypes.concat(itemGenPickDmgTypes(casteObj));

                casteObj.totalTypes = casteObj.dmgTypes.length + casteObj.typeOverflow;
                delete casteObj.dmgOptions;
                
                const dmgTotField = [], defTotField = [], dmgValFields = [], defValFields = [];
                const wepMatch = ["Mainhand", "Offhand"], armMatch = ["Offhand", "Headslot", "Chestslot", "Legslot"];
                if (wepMatch.includes(pickedObj.slot)){
                    // Handle all damage related calculations
                    const itemMaxTypeDamage = itemGenDmgConstant(rarPicked, casteObj.totalTypes, casteObj.hands, matTotal);
                    casteObj.maxSingleTypeDamage = itemMaxTypeDamage;

                    const totalDamage = dmgTypeAmountGen(casteObj);
                    dmgTotField.push({name: 'Total Item Damage:', value: `**${totalDamage}**`});

                    dmgValFields.push({name: '**Damage Types:**', value: ` `});
                    for (const dmgObj of casteObj.dmgTypePairs){
                        dmgValFields.push({name: `${dmgObj.type}`, value: `${dmgObj.dmg}`, inline: true});
                    }
                }

                if (armMatch.includes(pickedObj.slot)){
                    // Handle all defence related calculations
                    const itemMaxTypeDefence = itemGenDefConstant(rarPicked, casteObj.totalTypes, casteObj.slot, matTotal);
                    casteObj.maxSingleTypeDefence = itemMaxTypeDefence;

                    const totalDefence = defTypeAmountGen(casteObj);
                    defTotField.push({name: 'Total Item Defence:', value: `**${totalDefence}**`});
                    
                    defValFields.push({name: '**Defence Types:**', value: ` `});
                    for (const defObj of casteObj.defTypePairs){
                        defValFields.push({name: `${defObj.type}`, value: `${defObj.def}`, inline: true});
                    }
                }

                const totalValue = itemValueGenConstant(casteObj);

                const finalItemCode = uni_CreateCompleteItemCode(casteObj);

                // =============================
                //  HANDLE ITEM BENCHMARKS HERE
                // =============================
                const benchmarkStart = new Date().getTime();
                const benchOutcomeObj = benchmarkQualification(casteObj);
                const benchPass = benchOutcomeObj.passCheck;
                endTimer(benchmarkStart, "Benchmarking");

                extractName(casteObj, benchOutcomeObj);

                // ============================
                //   HANDLE ITEM STORAGE HERE
                // ============================
                const finalItemObject = {
                    name: casteObj.name,
                    value: casteObj.value,
                    item_code: finalItemCode,
                    caste_id: checkingCasteID(casteObj.casteType)
                };

                // console.log(finalItemObject);
                await checkInboundItem(user.userid, "", 1, finalItemObject);

                // =============================
                //  HANDLE STATIC LOOT ADD HERE
                // =============================
                const nStatItemEmbed = new EmbedBuilder();
                if (benchPass){
                    let passedChecking = true;

                    // Check name for dupes
                    const dupeNameCheck = await ItemLootPool.findOne({
                        where: {
                            name: casteObj.name
                        }
                    });
                    if (dupeNameCheck) passedChecking = false;

                    // Check for other dupes?
                    if (passedChecking){
                        // TBD
                    }

                    if (passedChecking){
                        // Grab full loot pool list
                        const fullLootList = await ItemLootPool.findAll();
                        
                        // Find current highest id
                        const highestID = fullLootList.sort((a, b) => ~~b.creation_offset_id - ~~a.creation_offset_id);
                        // console.log(highestID[0].creation_offset_id);

                        // Increase id by 1 and add crafted item with id
                        const nextID = highestID[0].creation_offset_id + 1;

                        finalItemObject.item_id = nextID;

                        const nStatItem = await handleNewStaticItem(finalItemObject, user.userid);
                    
                        if (nStatItem){
                            const {gearDrops} = interaction.client;
                            // Adding to cached loot pool
                            if (!gearDrops.get(nStatItem.creation_offset_id)) {
                                const rarSet = checkingRarID(checkingRar(nStatItem.item_code));
                                gearDrops.set(nStatItem.creation_offset_id, rarSet);
                            }

                            finalItemObject.passedBenching = true;

                            nStatItemEmbed
                            .setTitle('== ITEM ADDED TO DROP POOL ==')
                            .setColor('Aqua')
                            .setDescription('Congratulations!! This item has been added into the game as a permanent droppable item!!');
                        }
                    }
                }

                // ============================
                // HANDLE MATERIAL REMOVAL HERE
                // ============================
                for (const matObj of payupMatList){
                    await checkOutboundMat(user.userid, matObj, matObj.matType, matObj.amount);
                }

                //  ============================
                // HANDLE CONTROLLER UPDATES HERE
                //  ============================
                await handleControllerCrafting(controller, casteObj, finalItemObject);


                // ===========================
                //  HANDLE FINAL DISPLAY HERE
                // ===========================
                let finalFields = [];
                finalFields.push({name: 'Name:', value: `**${casteObj.name}**`}); // Name
                finalFields.push({name: 'Slot:', value: `**${checkingSlot(finalItemCode)}**`}); // Slot
                finalFields.push({name: 'Rarity:', value: `**${checkingRar(finalItemCode)}**`}); // Rarity
                if (casteObj.hands > 0){
                    finalFields.push({name: 'Hands Needed:', value: `**${casteObj.hands}**`}); // Hands
                }
                if (dmgTotField.length === 1){
                    finalFields = finalFields.concat(dmgTotField); // Tot DMG
                }
                if (defTotField.length === 1){
                    finalFields = finalFields.concat(defTotField); // Tot DEF
                }
                finalFields.push({name: 'Total Item Value:', value: `**${totalValue}**c`}); // Tot Value
                if (dmgValFields.length > 0){
                    finalFields = finalFields.concat(dmgValFields);
                }
                if (defValFields.length > 0){
                    finalFields = finalFields.concat(defValFields);
                }

                const embedColour = grabColour(casteObj.rarity);

                const itemCraftedEmbed = new EmbedBuilder()
                .setTitle('== **Item Crafted** ==')
                .setColor(embedColour)
                .setDescription(`You crafted a **${pickedObj.type}** successfully!`)
                .addFields(finalFields);

                console.log(casteObj);
                endTimer(startCraftTime, "FULL Crafting Proccess");

                if (nStatItemEmbed.data.title === "== ITEM ADDED TO DROP POOL =="){
                    await editTimedChannelMessage(followUpCrafting, 120000, itemCraftedEmbed);
                    return await sendTimedChannelMessage(interaction, 120000, nStatItemEmbed);
                } else return await editTimedChannelMessage(followUpCrafting, 120000, itemCraftedEmbed);
            });
        }
	},
};