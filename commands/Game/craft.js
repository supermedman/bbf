const { SlashCommandBuilder } = require('discord.js');
const { grabUser } = require('../../uniHelperFunctions');
const { CraftControllers, Milestones } = require('../../dbObjects');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('craft')
        .setDescription('Enter the forge, bring fury from the flames!'),

	async execute(interaction) { 

        if (interaction.user.id !== '501177494137995264') return await interaction.reply('This command is under construction! Check back later!');
        
        const user = await grabUser(interaction.user.id);
        if (user.level > 10) return await interaction.reply('You must be at least level 10 before you can be allowed to use the forge!');
        
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
        

        async function handleControllerUpdateCheck(controller, user){
            // Change all current logic to handle a looping check against the current value of
            // curMID, increase "newMileID" by 1 each loop while checking against all updating
            // value markers.
            const curMID = controller.milestone_id;
            if (curMID === 12) return "Max Progress";

            let newMileID = 0, maxRar = 1, dropRar = 10, useTooly = false, maxTooly = 0,
            rarTooly = 0, ib1 = false, ib2 = false, casteOptions = 'Class Type';
            if (curMID < 3){
                if (user.level >= 31 && curMID < 3){
                    newMileID = 3;
                    maxRar = 4;
                } else if (user.level >= 25 && curMID < 2){
                    newMileID = 2;
                    maxRar = 3;
                } else if (user.level >= 15 && curMID < 1){
                    newMileID = 1;
                    maxRar = 2;
                } else {
                    // No level change check needed!
                } return "No New Progress";
            }

            const questData = await Milestones.findOne({where: {userid: user.userid}});
            if (!questData) return "No Quest Data";

            const qLineList = ["None", "Souls", "Dark", "Torture", "Chaos", "Law", "Hate", "Myst", "Secret", "Dream"];
            const activeLine = qLineList.indexOf(questData.currentquestline);
            if (activeLine === 1 && newMileID === 2){
                newMileID = 4;
            } else {
                newMileID = activeLine + (newMileID > curMID) ? newMileID : curMID;
            }

            console.log({newID: newMileID, curID: curMID, questID: activeLine});

            switch(newMileID.toString()){
                case "4":
                    maxRar = 5;
                    dropRar = 13;
                break;
                case "5":
                    maxRar = 6;
                    dropRar = 14;
                break;
                case "6":
                    maxRar = 8;
                    casteOptions = "Normal Weapon";
                break;
                case "7":
                    maxRar = 10;
                    dropRar = 15;
                    useTooly = true;
                    maxTooly = 10;
                    rarTooly = 5;
                break;
                case "8":
                    dropRar = 16;
                    rarTooly = 10;
                    maxTooly = 20;
                    casteOptions = "Normal Armor";
                break;
                case "9":
                    dropRar = 17;
                    // Check for forge, ib1 = true;
                break;
                case "10":
                    dropRar = 18;
                    // Check for upgrade forge, ib2 = true;
                break;
                case "11":
                    maxRar = 15;
                    rarTooly = 15;
                    dropRar = 19;
                    casteOptions = "All Special";
                break;
                case "12":
                    maxRar = 20;
                    rarTooly = 20;
                    dropRar = 20;
                break;
            }


        }
	},
};