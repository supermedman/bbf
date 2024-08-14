const { SlashCommandBuilder, EmbedBuilder, ButtonStyle, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { grabUser, endTimer, createInteractiveChannelMessage, handleCatchDelete } = require('../../uniHelperFunctions');
const { CraftControllers, Milestones, ActiveDungeon } = require('../../dbObjects');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('craft')
        .setDescription('Enter the forge, bring fury from the flames!'),

	async execute(interaction) { 
        const allowedUsers = ['501177494137995264', '951980834469060629'];
        if (!allowedUsers.includes(interaction.user.id)) return await interaction.reply('This command is under construction! Check back later!');
        
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
        const classCasteList = [
            {Class: "Mage", Hands: [0, 1], Type: {Weapon: ["Magic"], Armor: ["Magic"]}},
            {Class: "Thief", Hands: [0, 1], Type: {Weapon: ["Melee"], Armor: ["Melee"]}},
            {Class: "Warrior", Hands: [1, 2], Type: {Weapon: ["Melee"], Armor: ["None"]}},
            {Class: "Paladin", Hands: [0, 2], Type: {Weapon: ["Magic", "Melee"], Armor: ["Melee"]}},
        ];
        const classObjMatch = classCasteList.filter(obj => obj.Class === user.pclass)[0];
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

        console.log('Final Caste Options for user: ');
        console.log(finalCasteTypes);

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

        const optionTracker = {
            slot: "",
            group: "",
            type: ""
        };

        collector.on('collect', async c => {
            await c.deferUpdate().then(async () =>{
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
                            editWith = {embeds: [new EmbedBuilder().setTitle('Place Holder').setDescription(`Final Picked Caste Options:\nSlot: ${optionTracker.slot}\nGroup: ${optionTracker.group}\nType: ${optionTracker.type}`)]};
                            casteFinished = true;
                        }
                    break;
                }
                await anchorMsg.edit(editWith);
                if (casteFinished) collector.stop('Caste Picked');
            }).catch(e => console.error(e));
        });

        collector.on('end', async (c, r) => {
            if (!r || r !== "Caste Picked"){
                await handleCatchDelete(anchorMsg);
            }
        });

        //   =======================
        // MOVE CODE TO craftingExtras.js
        //   =======================

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
                maxBoss = 1 - curLine;

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

            // const curMID = controller.milestone_id;
            // if (curMID === 12) return "Max Progress";

            // let newMileID = 0, maxRar = 1, dropRar = 10, useTooly = false, maxTooly = 0,
            // rarTooly = 0, ib1 = false, ib2 = false, casteOptions = 'Class Type';
            // if (curMID < 3){
            //     if (user.level >= 31 && curMID < 3){
            //         newMileID = 3;
            //         maxRar = 4;
            //     } else if (user.level >= 25 && curMID < 2){
            //         newMileID = 2;
            //         maxRar = 3;
            //     } else if (user.level >= 15 && curMID < 1){
            //         newMileID = 1;
            //         maxRar = 2;
            //     } else {
            //         // No level change check needed!
            //     } return "No New Progress";
            // }

            
            // if (!questData) return "No Quest Data";

            
            // const activeLine = qLineList.indexOf(questData.currentquestline);
            // if (activeLine === 1 && newMileID === 2){
            //     newMileID = 4;
            // } else {
            //     newMileID = activeLine + (newMileID > curMID) ? newMileID : curMID;
            // }

            // console.log({newID: newMileID, curID: curMID, questID: activeLine});

            // switch(newMileID.toString()){
            //     case "4":
            //         maxRar = 5;
            //         dropRar = 13;
            //     break;
            //     case "5":
            //         maxRar = 6;
            //         dropRar = 14;
            //     break;
            //     case "6":
            //         maxRar = 8;
            //         casteOptions = "Normal Weapon";
            //     break;
            //     case "7":
            //         maxRar = 10;
            //         dropRar = 15;
            //         useTooly = true;
            //         maxTooly = 10;
            //         rarTooly = 5;
            //     break;
            //     case "8":
            //         dropRar = 16;
            //         rarTooly = 10;
            //         maxTooly = 20;
            //         casteOptions = "Normal Armor";
            //     break;
            //     case "9":
            //         dropRar = 17;
            //         // Check for forge, ib1 = true;
            //     break;
            //     case "10":
            //         dropRar = 18;
            //         // Check for upgrade forge, ib2 = true;
            //     break;
            //     case "11":
            //         maxRar = 15;
            //         rarTooly = 15;
            //         dropRar = 19;
            //         casteOptions = "All Special";
            //     break;
            //     case "12":
            //         maxRar = 20;
            //         rarTooly = 20;
            //         dropRar = 20;
            //     break;
            // }
        }
	},
};