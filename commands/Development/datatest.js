const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('datatest')
        .setDescription('Testing new code ideas during development!')
        .addSubcommandGroup(subcommandgroup =>
			subcommandgroup
				.setName('combat')
				.setDescription('Combat catagory testing')
                    .addSubcommand(subcommand =>
                        subcommand
                            .setName('simulation')
                            .setDescription('Simulate combat trials.')
                                .addIntegerOption(option => 
                                    option
                                    .setName('amount')
                                    .setDescription('Amount of trials to run.'))))
        .addSubcommandGroup(subcommandgroup =>
            subcommandgroup
                .setName('status')
                .setDescription('Status Effects catagory testing'))
        .addSubcommandGroup(subcommandgroup =>
            subcommandgroup
                .setName('crafting')
                .setDescription('Crafting catagory testing')),

	async execute(interaction) { 
        if (interaction.user.id !== '501177494137995264') return await interaction.reply('This command is not for you!');
        
        /**
         *      Things that need testing:
         *          - Item construction/deconstruction
         *          - Multi-type damage handling
         *          - Multi-type HP handling
         *          - Status effect application
         *          - Status effect retention
         *          - Item value calculations
         *          - Item crafting prototypes
         */
        const dmgKeys = new Map([
            ["BLph", "Blunt"],
            ["SLph", "Slash"],
            ["MAma", "Magic"],
            ["RAma", "Rad"],
            ["FRma", "Frost"],
            ["FIma", "Fire"],
            ["DAma", "Dark"],
            ["LIma", "Light"],
            ["NUsp", "Null"],
            ["PAsp", "Pain"],
            ["SPsp", "Spirit"],
            ["CHsp", "Chaos"]
        ]);

        const rarKeys = new Map([
            ["r00", "Common"],
            ["r01", "Uncommon"],
            ["r02", "Rare"],
            ["r03", "Very Rare"],
            ["r04", "Epic"],
            ["r05", "Mystic"],
            ["r06", "?"],
            ["r07", "??"],
            ["r08", "???"],
            ["r09", "????"],
            ["r10", "Forgotten"],
            ["r12", "Unique"]
        ]);
        
        const disKeys = new Map([
            ["SL", "Slimy"],
            ["HE", "Herby"],
            ["WO", "Woody"],
            ["SK", "Skinny"],
            ["FL", "Fleshy"],
            ["SI", "Silky"],
            ["MA", "Magical"],
            ["ME", "Metalic"],
            ["RO", "Rocky"],
            ["GE", "Gemy"],
            ["TO", "Tooly"],
            ["UN", "Unique"]
        ]);
        
        const slotKeys = new Map([
            ["HEslo", "Headslot"],
            ["CHslo", "Chestslot"],
            ["LEslo", "Legslot"],
            ["MAslo", "Mainhand"],
            ["OFslo", "Offhand"]
        ]);

                //    0         1    2        3           4            5        6          7             8         9        10
        //          Flesh	 Armor	Bark	Fossil	Magical Flesh | Specter	| Demon	|Phase Demon	| Phase Aura | Boss	|Plot Armor
        //0 Blunt   
        //1 Slash
        //2 Magic
        //3 Rad
        //4 Frost
        //5 Fire
        //6 Dark
        //7 Light
        //8 Null
        //9 Pain
        //10 Spirit
        //11 Chaos

        /**
         *  +	 +++	 +	 ++	 -	 ---	 =	 =	 ---	 -	 ---
            ++	 -	 +	 -	 +	 ---	 =	 =	 ---	 -	 ---
            =	 =	 =	 =	 --	 ++	 +	 -	 -	 -	 ---
            +++	 +	 =	 =	 ++	 --	 +	 +	 ++	 +	 ---
            +	 ++	 ++	 -	 -	 -	 ++	 --	 -	 -	 ---
            ++	 -	 +++	 -	 -	 -	 -	 -	 -	 -	 ---
            =	 =	 +	 =	 -	 --	 --	 +++	 -	 -	 ---
            =	 =	 --	 =	 -	 +++	 +++	 --	 -	 -	 ---
            =	 =	 =	 =	 +++	 =	 +	 ++	 +++	 ++	 ---
            ++	 +	 +	 +	 +	 +	 +	 +	 +	 ++	 ---
            +	 +	 +	 +	 ++	 +	 +	 +	 +	 ++	 ---
            ++	 +	 +	 +	 +	 +	 +	 +	 +	 ++	 ---
         */
        const damageModifier = [-0.75, -0.50, -0.25, 0, 0.25, 0.50, 0.75];
        const damageKeyIndexer = ["---", "--", "-", "=", "+", "++", "+++"];

        const columnMatch = ["Flesh", "Armor", "Bark", "Fossil", "Magical Flesh", "Specter", "Demon", "Phase Demon", "Phase Aura", "Boss", "Plot Armor"];
        const rowMatch = ["Blunt", "Slash", "Magic", "Rad", "Frost", "Fire", "Dark", "Light", "Null", "Pain", "Spirit", "Chaos", "True"];

        const damageMatchTable = [
            ["+", "+++", "+", "++", "-", "---", "=", "=", "---", "-", "---",],
            ["++", "-", "+", "-", "+", "---", "=", "=", "---", "-", "---"],
            ["=","=","=","=","--","++","+","-","-","-", "---"],
            ["+++","+","=","=","++","--","+","+","++","+", "---"],
            ["+","++","++","-","-","-","++","--","-","-", "---"],
            ["++", "-", "+++", "-", "-", "-", "-", "-", "-", "-", "---"],
            ["=","=","+","=","-","--","--","+++","-","-", "---"],
            ["=","=","--","=","-","+++","+++","--","-","-", "---"],
            ["=","=","=","=","+++","=","+","++","+++","++", "---"],
            ["++","+","+","+","+","+","+","+","+","++", "---"],
            ["+","+","+","+","++","+","+","+","+","++", "---"],
            ["++","+","+","+","+","+","+","+","+","++", "---"],
        ];

        const fleshTypes = ["Flesh", "Magical Flesh", "Specter", "Boss"];
        const armorTypes = ["Armor", "Bark", "Fossil", "Demon"];
        const shieldTypes = ["Phase Demon", "Phase Aura", "Plot Armor"];

        const subcomGroup = interaction.options.getSubcommandGroup();
        const subcom = interaction.options.getSubcommand();

        const startTime = new Date().getTime();
        let endTime;

        switch(subcomGroup){
            case "combat":
                switch(subcom){
                    case "simulation":
                        const trialRuns = interaction.options.getInteger('amount') ?? 1;

                        const enemyHPTypes = [
                            {
                                Type: "Flesh",
                                HP: 100,
                            },
                            {
                                Type: "Armor",
                                HP: 25,
                            }
                        ];

                        const ITEM_CODE = "TYP_PAsp:25-SLph:10_typ-r00-DIS_SL-SI-WO_dis-HEslo-100001";

                        const slot = checkingSlot(ITEM_CODE);
                        const rarity = checkingRar(ITEM_CODE);
                        const disTypes = checkingDismantle(ITEM_CODE);
                        const dmgTypes = checkingDamage(ITEM_CODE);

                        console.log(`Slot: ${slot}\nRarity: ${rarity}\nDismantle Into: ${disTypes.toString()}\nDamage Values: ${dmgTypes.map(item => `\nType: ${item.Type}\nDamage: ${item.DMG}`)}`);
                        console.log('Number of trial runs requested: %d', trialRuns);

                        const moddedVals = typeMatchCheck(dmgTypes, enemyHPTypes);

                        const result = runCombatInstance(moddedVals, enemyHPTypes);

                        //console.log(moddedVals);
                    break;
                }
            break;
            case "status":

            break;
            case "crafting":

            break;
        }           
        endTime = new Date().getTime();

        return await interaction.reply(`Command took ${endTime - startTime}ms to complete!`);

        /**
         * 
         * @param {Object[]} combatVals Object array of Damage & HP {Type: String, Dmg: Integer, Against: {Type: String, HP: Integer}}
         * @param {Object[]} hpBase Object array of HP {Type: String, HP: Integer}
         * @returns Array of table matches useable for damage value modifications
         */
        function runCombatInstance(combatVals, hpBase){
            // Damage values modded based on type matches
            // HP takes damage: Shield > Armor > Flesh
            // Use .indexOf() foreach damage instance, if -1 skip, else add in order found in static array
            const orderedHPLevel = {
                Shield: [],
                Armor: [],
                Flesh: []
            };
            for (const HP_INST of hpBase){
                if (shieldTypes.indexOf(HP_INST.Type) !== -1) {
                    orderedHPLevel.Shield.push(HP_INST);
                } else if (armorTypes.indexOf(HP_INST.Type) !== -1) {
                    orderedHPLevel.Armor.push(HP_INST);
                } else if (fleshTypes.indexOf(HP_INST.Type) !== -1) {
                    orderedHPLevel.Flesh.push(HP_INST);
                } 
            }

            if (orderedHPLevel.Shield.length <= 0) orderedHPLevel.Shield.push('None');
            if (orderedHPLevel.Armor.length <= 0) orderedHPLevel.Armor.push('None');
            if (orderedHPLevel.Flesh.length <= 0) orderedHPLevel.Flesh.push('None');

            //console.log(orderedHPLevel);
            

            // Find highest matchup against top most HP level
            const againstShield = (orderedHPLevel.Shield[0] !== 'None') ? combatVals.filter(dmg => { 
                if (orderedHPLevel.Shield.some(hp => dmg.Against.Type === hp.Type)) {
                    return true;
                } else return false;
            }).sort((a, b) => { a.DMG - b.DMG; }) : 'None';
            const totalShieldDMG = (againstShield !== 'None') ? againstShield.reduce((total, obj) => total + obj.DMG, 0) : 0;
            const totalShieldHP = (againstShield !== 'None') ? orderedHPLevel.Shield.reduce((total, obj) => total + obj.HP, 0) : 0;
            // console.log(againstShield);
            // console.log(totalShieldDMG);
            // console.log(totalShieldHP);

            const againstArmor = (orderedHPLevel.Armor[0] !== 'None') ? combatVals.filter(dmg => { 
                if (orderedHPLevel.Armor.some(hp => dmg.Against.Type === hp.Type)) {
                    return true;
                } else return false;
            }).sort((a, b) => { a.DMG - b.DMG; }) : 'None';
            const totalArmorDMG = (againstArmor !== 'None') ? againstArmor.reduce((total, obj) => total + obj.DMG, 0) : 0;
            const totalArmorHP = (againstArmor !== 'None') ? orderedHPLevel.Armor.reduce((total, obj) => total + obj.HP, 0) : 0;
            // console.log(againstArmor);
            // console.log(totalArmorDMG);
            // console.log(totalArmorHP);

            const againstFlesh = (orderedHPLevel.Flesh[0] !== 'None') ? combatVals.filter(dmg => { 
                if (orderedHPLevel.Flesh.some(hp => dmg.Against.Type === hp.Type)) {
                    return true;
                } else return false;
            }).sort((a, b) => { a.DMG - b.DMG; }) : 'None';
            const totalFleshDMG = (againstFlesh !== 'None') ? againstFlesh.reduce((total, obj) => total + obj.DMG, 0) : 0;
            const totalFleshHP = (againstFlesh !== 'None') ? orderedHPLevel.Flesh.reduce((total, obj) => total + obj.HP, 0) : 0;
            // console.log(againstFlesh);
            // console.log(totalFleshDMG);
            // console.log(totalFleshHP);
            
            let combatEnd = false;

            // Single Combat loop dealing damage 
            // Multiple checks need to be made
                // 1. Is arr[0].dmg >= Shield HP
                //      - If === Remove Shield entry && arr[0].dmg entry
                //      - If dmg > Shield, remove shield and subtract from arr[0].dmg expended amount
                // 2. Is arr total dmg >= Shield HP
                //      - If === Remove Shield entry && all dmg, causing end of current turn
                //      - If tot dmg > Shield, remove shield and all depleated dmg vals, subtract expended amount from remaining dmg entries
                // 3. Shield HP is > total dmg dealt and remains
                //      - Subtract from shield dmg dealt, end of current turn
            //=============================
            // STILL NEEDED:
            // DAMAGE CARRY OVER CHECK FOR PREVENTING EXTRA DAMAGE TO BUILD UP ACROSS HP TYPES/DAMAGE LOST IN THE SAME WAY
            // Shields 
            let shieldBrake = (againstShield !== 'None') ? false : true;
            if (!shieldBrake) {
                let shieldsLeft = totalShieldHP;
                if (totalShieldDMG >= totalShieldHP){
                    
                    // Shield Break
                    for (const dmgObj of againstShield){
                        if (dmgObj.DMG > shieldsLeft){
                            // damage checked is greater than current shield value
                            dmgObj.DMG -= shieldsLeft;
                            dmgObj.used = true;
                            shieldsLeft = 0;
                            shieldBrake = true;
                            break;
                        } else if (dmgObj.DMG === shieldsLeft) {
                            // damage checked is equal to current shield value
                            dmgObj.spent = true;
                            shieldsLeft = 0;
                            shieldBrake = true;
                            break;
                        } else {
                            // damage checked is less than current shield value
                            dmgObj.spent = true;
                            shieldsLeft -= dmgObj.DMG;
                        }
                    }
                } else {
                    // Shield Remains
                    // Combat turn ends subtracting dmg dealt from shields
                    shieldsLeft -= totalShieldDMG;
                    combatEnd = true;
                }
                console.log('Shields Left: %d', shieldsLeft);
            }
            let shieldDMGChanged = [];
            if (againstShield !== 'None') {
                shieldDMGChanged = againstShield.filter(obj => obj.used);
                shieldDMGChanged = shieldDMGChanged[0];
            
                const shieldCarryChangeCheck = singleLookup(shieldDMGChanged);
                //console.log(shieldCarryChangeCheck);

                const checkFor = (ele) => ele.Type === shieldCarryChangeCheck.Type;
                againstArmor[againstArmor.findIndex(checkFor)].DMG = shieldCarryChangeCheck.DMG;
            }
             
            // Armor 
            let armorBrake = (againstArmor !== 'None' && !combatEnd) ? false : true;
            if (!armorBrake){
                let armorLeft = totalArmorHP;
                if (totalArmorDMG >= totalArmorHP){
                    // Armor Break
                    for (const dmgObj of againstArmor){
                        if (dmgObj.DMG > armorLeft){
                            // damage checked is greater than current armor value
                            dmgObj.DMG -= armorLeft;
                            dmgObj.used = true;
                            armorLeft = 0;
                            armorBrake = true;
                            break;
                        } else if (dmgObj.DMG === armorLeft) {
                            // damage checked is equal to current armor value
                            dmgObj.spent = true;
                            armorLeft = 0;
                            armorBrake = true;
                            break;
                        } else {
                            // damage checked is less than current armor value
                            dmgObj.spent = true;
                            armorLeft -= dmgObj.DMG;
                        }
                    }
                } else {
                    // Armor Remains
                    // Combat turn ends subtracting dmg dealt from armor
                    armorLeft -= totalArmorDMG;
                    combatEnd = true;
                }
                console.log('Armor Left: %d', armorLeft);
            }
            let armorDMGChanged = [];
            if (againstArmor !== 'None' && !combatEnd) {
                armorDMGChanged = againstArmor.filter(obj => obj.used);
                armorDMGChanged = armorDMGChanged[0];
            
                const armorCarryChangeCheck = singleLookup(armorDMGChanged);
                //console.log(armorCarryChangeCheck);

                const checkFor = (ele) => ele.Type === armorCarryChangeCheck.Type;
                againstFlesh[againstFlesh.findIndex(checkFor)].DMG = armorCarryChangeCheck.DMG;
            }

            // Flesh 
            let dead = (againstFlesh !== 'None' && !combatEnd) ? false : true;
            if (!dead){
                let hpLeft = totalFleshHP;
                if (totalFleshDMG >= totalFleshHP){
                    // HP Depleted enemy is dead
                    for (const dmgObj of againstFlesh){
                        if (dmgObj.DMG > hpLeft){
                            // damage checked is greater than current base hp value
                            dmgObj.DMG -= hpLeft;
                            dmgObj.used = true;
                            hpLeft = 0;
                            dead = true;
                            break;
                        } else if (dmgObj.DMG === hpLeft) {
                            // damage checked is equal to current base hp value
                            dmgObj.spent = true;
                            hpLeft = 0;
                            dead = true;
                            break;
                        } else {
                            // damage checked is less than current base hp value
                            dmgObj.spent = true;
                            hpLeft -= dmgObj.DMG;
                        }
                    }
                } else {
                    // HP Remains
                    // Combat turn ends subtracting dmg dealt from HP
                    hpLeft -= totalFleshDMG;
                    combatEnd = true;
                }
                console.log('Base HP Left: %d', hpLeft);
            }
            // const fleshDMGChanged = (againstFlesh !== 'None' && !combatEnd) ? againstFlesh.filter(obj => obj.used) : [];
            // console.log(...fleshDMGChanged);

            console.log(...againstShield);
            console.log(...againstArmor);
            console.log(...againstFlesh);
            //=============================
        }

        /**
         * 
         * @param {Object} dmgObj Damage Object containing HP values and dmg values
         */
        function singleLookup(dmgObj) {
            const yLookup = rowMatch.indexOf(dmgObj.Type);
            const xLookup = columnMatch.indexOf(dmgObj.Against.Type);

            const modBY = damageModifier[damageKeyIndexer.indexOf(damageMatchTable[yLookup][xLookup])];

            dmgObj.DMG = dmgObj.DMG + (dmgObj.DMG * modBY);

            return dmgObj;
        }

        /**
         * 
         * @param {Object[]} dmgBase Object array of Damage {Type: String, Dmg: Integer}
         * @param {Object[]} hpBase Object array of HP {Type: String, HP: Integer}
         * @returns Array of table matches useable for damage value modifications
         */
        function typeMatchCheck(dmgBase, hpBase){
            // First find index matchup for each dmg Instance against each HP instance 
            const matchedLookups = [];
            for (const DMG_INST of dmgBase){
                for (const HP_INST of hpBase){
                    const yLookup = rowMatch.indexOf(DMG_INST.Type);
                    const xLookup = columnMatch.indexOf(HP_INST.Type);
                    
                    const modBY = damageModifier[damageKeyIndexer.indexOf(damageMatchTable[yLookup][xLookup])];

                    const moddedDMG = {
                        Type: DMG_INST.Type,
                        DMG: DMG_INST.DMG + (DMG_INST.DMG * modBY),
                        Against: {
                            Type: HP_INST.Type,
                            HP: HP_INST.HP
                        }
                    };

                    matchedLookups.push(moddedDMG);
                }
            }
            return matchedLookups;
        }

        /**
         * 
         * @param {String} TEST_CODE ITEM_CODE used for deconstruction
         * @returns Usable item slot value
         */
        function checkingSlot(TEST_CODE){
            const SLOT = /-\D{2}slo-/;
            const slotStarts = TEST_CODE.search(SLOT);
          
            const slotCode =  TEST_CODE.slice(slotStarts + 1, slotStarts + 6);
            const foundSlot = slotKeys.get(slotCode);
          
            return foundSlot;
        }
        
        /**
         * 
         * @param {String} TEST_CODE ITEM_CODE used for deconstruction
         * @returns Useable dismantled types list
         */
        function checkingDismantle(TEST_CODE) {
            const entryDis = /DIS_/;
            const exitDis = /_dis/;
            
            let startIndex = TEST_CODE.search(entryDis);
            let endIndex = TEST_CODE.search(exitDis);
            
            const disSlice = TEST_CODE.slice(startIndex + 4, endIndex);
            const disListed = disSlice.split("-");
            
            const finalListed = [];
            for (const DIS of disListed){
                finalListed.push(disKeys.get(DIS));
            }
            
            return finalListed;
        }
        
        /**
         * 
         * @param {String} TEST_CODE ITEM_CODE used for deconstruction
         * @returns Useable rarity value
         */
        function checkingRar(TEST_CODE) {
            const RAR = /-r\d{2}-/;
            const rarStarts = TEST_CODE.search(RAR);
            
            const rarCode = TEST_CODE.slice(rarStarts + 1, rarStarts + 4);
            const foundRar = rarKeys.get(rarCode);
            
            return foundRar;
        }
        
        /**
         * 
         * @param {String} TEST_CODE ITEM_CODE used for deconstruction
         * @returns Useable damage type/value object list
         */
        function checkingDamage(TEST_CODE) {
            const entryType = /TYP_/;
            const exitType = /_typ/;
          
            let startIndex = TEST_CODE.search(entryType);
            let endIndex = TEST_CODE.search(exitType);

            const dmgSlice = TEST_CODE.slice(startIndex + 4, endIndex);
            const dmgListed = dmgSlice.split("-");
          
            const finalTypes = [];
            for (const DT of dmgListed){
              let cutStr = DT.split(":");
          
              const pushObj = {
                Type: dmgKeys.get(cutStr[0]),
                DMG: ~~cutStr[1]
              };
          
              finalTypes.push(pushObj);
            }
            return finalTypes;
        }
	},
};