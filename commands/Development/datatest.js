const { SlashCommandBuilder } = require('discord.js');

const {chlkPreset} = require('../../chalkPresets.js');

const randArrPos = (arr) => {
    return arr[(arr.length > 1) ? Math.floor(Math.random() * arr.length) : 0];
};

const inclusiveRandNum = (max, min) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

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
                .setDescription('Status Effects catagory testing')
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

        // TO DO

        // Merge Status and damage dealing functions together
        // Once functional, create interactive combat (devcombat)
        // Improve speed and check for proper functionallity, allow outside testers access
        // Implement blocking mechanics with new item codes and damage methods
        // Create new ways to handle potion use and abilities
        // Stress test all mechanics 
        // Debug where needed
        // Allow more testing
        // Start conversion of old combat to new combat!!!

        // Combat order of operations
        /**
         *      Deal Shield Damage:
         *      - No status applied while shield HP is active
         *      X Turn Ends
         *      If armor not broken, deal damage to armor:
         *      - Check for relavent Status effects 
         *      - Check if Flesh effects can activate
         *      - Apply all applicable effects
         *      X Turn Ends
         *      If armor broken, armor set to 0, recalculate damage values:
         *      - Check if Flesh effects can activate
         *      - Apply status effects
         *      X Turn Ends
         */
        switch(subcomGroup){
            case "combat":
                switch(subcom){
                    case "simulation":
                        const trialRuns = interaction.options.getInteger('amount') ?? 1;

                        for (let i = 0; i < trialRuns; i++){
                            console.log(chlkPreset.sInfoOne(`Current run: ${i}`));
                            // Load Enemy   
                            const enemyHPTypes = genEnemy();

                            console.log(`Flesh Type: ${enemyHPTypes[0].Type}\nHP: ${enemyHPTypes[0].HP}\nArmor Type: ${enemyHPTypes[1].Type}\nHP: ${enemyHPTypes[1].HP}\nShield Type: ${enemyHPTypes[2].Type}\nHP: ${enemyHPTypes[2].HP}`);

                            const gearMade = genGearPiece();
                            console.log(gearMade);
                            console.log(chlkPreset.bInfoOne('===== GEAR GEN END ====='));


                            const ITEM_CODE = gearMade; //"TYP_PAsp:25-SLph:10_typ-r00-DIS_SL-SI-WO_dis-HEslo-100001";

                            //const slot = checkingSlot(ITEM_CODE);
                            //const rarity = checkingRar(ITEM_CODE);
                            //const disTypes = checkingDismantle(ITEM_CODE);
                            const dmgTypes = checkingDamage(ITEM_CODE);

                            //console.log(`Slot: ${slot}\nRarity: ${rarity}\nDismantle Into: ${disTypes.toString()}\nDamage Values: ${dmgTypes.map(item => `\nType: ${item.Type}\nDamage: ${item.DMG}`)}`);
                            //console.log('Number of trial runs requested: %d', trialRuns);

                            const moddedVals = typeMatchCheck(dmgTypes, enemyHPTypes);

                            const result = runCombatInstance(moddedVals, enemyHPTypes);

                            //console.log(moddedVals);
                        }
                        
                    break;
                }
            break;
            case "status":
                switch(subcom){
                    case "simulation":
                        const trialRuns = interaction.options.getInteger('amount') ?? 1;

                        // Shields are immune to all status effects

                        // Armor can be bypassed through status effects

                        // Flesh is the main target for status effects and on average should contain the largest HP pool compared to Armor and Shields

                        // Basic flesh status effects test one:
                        // Status effect pairs
                        const statusKeys = new Map([
                            ["Blunt", "Concusion"],
                            ["Slash", "TBD"],
                            ["Magic", "MagiWeak"],
                            ["Rad", "Confusion"],
                            ["Frost", "Slow"],
                            ["Fire", "TBD"],
                            ["Dark", "Blind"],
                            ["Light", "Flash"]
                        ]);
                        /**
                         *      - Concusion: Blunt
                         *      - Bleed: Slash
                         *      - Magic Weakness: Magic
                         *      - Confusion: Radiation
                         *      - Slow: Frost
                         *      - Burn: Fire
                         *      - Blind: Dark
                         *      - Flash: Light
                         */
                        const testStatus = {
                            /**
                             * This method checks if the Cuncusion status effect should be applied
                             * @param {Object} armor Armor HP obj
                             * @param {Object} flesh Flesh HP obj 
                             * @param {Number} blunt Blunt damage being dealt
                             * @param {Object} condition Attack Conditions: {Crit: boolean, DH: boolean}
                             * @param {Object[]} curEffects Object array of any and all currently applied status effects
                             * @returns Boolean
                             */
                            Concusion: (armor, flesh, blunt, condition, curEffects) => {
                                if (flesh.Type === 'Flesh' && armor.HP > 0 || flesh.Type === 'Specter' || flesh.Type === 'Magical Flesh' && curEffects.findIndex(eff => eff.Type === 'MagiWeak') === -1) return false;
                                
                                if (armor.HP > 0){
                                    switch(armor.Type){
                                        case "Armor":
                                            // Blunt > (armor.HP * 0.5) = true
                                            if (blunt > (armor.HP * 0.5)) return true;
                                        return false;
                                        case "Bark":
                                            // Immune = false
                                        return false;
                                        case "Fossil":
                                            // Immune = false
                                        return false;
                                        case "Demon":
                                            // Blunt > (armor.HP * 0.5) && MagiWeak = true
                                            if (blunt > (armor.HP * 0.5) && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) return true;
                                        return false;
                                    }
                                }
                                
                                switch(flesh.Type){
                                    case "Flesh":
                                        // Crit & 0 armor = true
                                        if (condition.Crit) return true;
                                    return false;
                                    case "Magical Flesh":
                                        // MagiWeak = true
                                        if (curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) return true;
                                    return false;
                                }
                                return false;
                            },
                            /**
                             * This method checks if the Bleed status effect should be applied
                             * @param {Object} armor Armor HP Obj
                             * @param {Object} flesh Flesh HP Obj
                             * @param {Number} slash Slash Dmg being dealt
                             * @param {Object} condition Contains {Crit: boolean, DH: boolean}
                             * @param {Object[]} curEffects Object array of any and all currently applied status effects
                             * @returns Object: { status_Strength: boolean } || false
                             */
                            Bleed: (armor, flesh, slash, condition, curEffects) => {
                                if (flesh.Type === "Flesh" && armor.HP > 0 || flesh.Type === "Magical Flesh" && curEffects.findIndex(eff => eff.Type === 'MagiWeak') === -1) return false;

                                if (armor.HP > 0){
                                    switch(armor.Type){
                                        case "Armor":
                                            // Immune to Bleed
                                        return false;
                                        case "Bark":
                                            // Slash > armor.HP * 0.5 && Burn = true
                                            if (slash > (armor.HP * 0.5) && curEffects.findIndex(eff => eff.Type === 'Burn') !== -1) {
                                                // Crit && DH = Big Bleed 
                                                // Crit || DH = Bleed
                                                // Little Bleed
                                                if (condition.Crit && condition.DH) {
                                                    return { Strength: "big_Bleed"};
                                                } else if (condition.Crit || condition.DH){
                                                    return { Strength: "bleed" };
                                                } else return { Strength: "little_Bleed"};
                                            }
                                        return false;
                                        case "Fossil":
                                            // Immune to Bleed
                                        return false;
                                        case "Demon":
                                            // Immune to Bleed
                                        return false;
                                    }
                                }
                                
                                switch(flesh.Type){
                                    case "Flesh":
                                        // Crit && DH = Big Bleed 
                                        // Crit || DH = Bleed
                                        // Little Bleed
                                        if (condition.Crit && condition.DH) {
                                            return { Strength: "big_Bleed"};
                                        } else if (condition.Crit || condition.DH){
                                            return { Strength: "bleed" };
                                        } else return { Strength: "little_Bleed"};
                                    case "Magical Flesh":
                                        // Crit && DH = Big Bleed 
                                        // Crit || DH = Bleed
                                        // Little Bleed
                                        if (condition.Crit && condition.DH) {
                                            return { Strength: "big_Bleed"};
                                        } else if (condition.Crit || condition.DH){
                                            return { Strength: "bleed" };
                                        } else return { Strength: "little_Bleed"};
                                    case "Specter":
                                        // Immune to Bleed
                                    return false;
                                }
                                return false;
                            },
                            /**
                             * This method checks if the MagiWeak status effect should be applied
                             * @param {Object} armor Armor HP Obj
                             * @param {Object} flesh Flesh HP Obj
                             * @param {Object} condition Contains {Crit: boolean, DH: boolean}
                             * @param {Object[]} curEffects Object array of any and all currently applied status effects
                             * @returns Boolean
                             */
                            Magic_Weakness: (armor, flesh, magic, condition, curEffects) => {
                                if (armor.HP === 0 && flesh.Type === 'Specter') return false;

                                if (armor.HP > 0){
                                    switch(armor.Type){
                                        case "Armor":
                                            if (curEffects.findIndex(eff => eff.Type === 'Concusion') !== -1 && condition.Crit) return true;
                                        return false;
                                        case "Bark":
                                            if (condition.Crit) return true;
                                        return false;
                                        case "Fossil":
                                            if (condition.Crit) return true;
                                        return false;
                                        case "Demon":
                                            if (condition.Crit) return true;
                                        return false;
                                    }
                                }

                                switch(flesh.Type){
                                    case "Flesh":
                                        if (condition.Crit) return true;
                                    return false;
                                    case "Magical Flesh":
                                    
                                    return true;
                                    case "Specter":
                                        // Immune 
                                    return false;
                                }
                                return false;
                            },
                            /**
                             * 
                             * @param {Object} armor Armor HP Obj
                             * @param {Object} flesh Flesh HP Obj
                             * @param {Number} rad Radiation damage
                             * @param {Object} condition Contains {Crit: boolean, DH: boolean}
                             * @param {Object[]} curEffects Object array of any and all currently applied status effects
                             * @returns Boolean
                             */
                            Confusion: (armor, flesh, rad, condition, curEffects) => {
                                if (armor.HP === 0 && flesh.Type === 'Specter') return false;

                                if (armor.HP > 0){
                                    switch(armor.Type){
                                        case "Armor":
                                            if (rad > (armor.HP * 0.5) && condition.Crit) return true;
                                        return false;
                                        case "Bark":
                                            // Immune
                                        return false;
                                        case "Fossil":
                                            // Immune
                                        return false;
                                        case "Demon":
                                            if (rad > (armor.HP * 0.5) && curEffects.findIndex(eff => eff.Type === 'Concusion') !== -1) return true;
                                        return false;
                                    }
                                }

                                switch(flesh.Type){
                                    case "Flesh":
                                        // Crit & 0 armor = true
                                    return true;
                                    case "Magical Flesh":
                                        // MagiWeak = true
                                        if (condition.Crit) return true;
                                    return false;
                                }
                                return false;
                            },
                            /**
                             * This method checks if the Slow status effect should be applied
                             * @param {Object} armor Armor HP Obj
                             * @param {Object} flesh Flesh HP Obj
                             * @param {Number} frost Frost damage being dealt
                             * @param {Object} condition Contains {Crit: boolean, DH: boolean}
                             * @param {Object[]} curEffects Object array of any and all currently applied status effects
                             * @returns Boolean
                             */
                            Slow: (armor, flesh, frost, condition, curEffects) => {

                                if (armor.HP > 0){
                                    switch(armor.Type){
                                        case "Armor":
                                            // Applied
                                        return true;
                                        case "Bark":
                                            // Applied
                                        return true;
                                        case "Fossil":
                                            if (condition.Crit && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) return true;
                                        return false;
                                        case "Demon":
                                            // Applied
                                        return true;
                                    }
                                }

                                switch(flesh.Type){
                                    case "Flesh":
                                        if (condition.Crit) return true;
                                    return false;
                                    case "Magical Flesh":
                                        if (condition.Crit && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) return true;
                                    return false;
                                    case "Specter":
                                        // Immune
                                    return false;
                                }
                                return false;
                            },
                            /**
                             * This method checks if the Burn status effect should be applied
                             * @param {Object} armor Armor HP Obj
                             * @param {Object} flesh Flesh HP Obj
                             * @param {Number} fire Fire damage being dealt
                             * @param {Object} condition Contains {Crit: boolean, DH: boolean}
                             * @param {Object[]} curEffects Object array of any and all currently applied status effects
                             * @returns Object: { status_Strength: boolean } || false
                             */
                            Burn: (armor, flesh, fire, condition, curEffects) => {

                                if (armor.HP > 0){
                                    switch(armor.Type){
                                        case "Armor":
                                            if (condition.Crit && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) {
                                                if (condition.DH) {
                                                    return { Strength: "inferno"};
                                                } else return { Strength: "burn"};
                                            }
                                        return false;
                                        case "Bark":
                                            // Applied
                                        return true;
                                        case "Fossil":
                                            // Immune
                                        return false;
                                        case "Demon":
                                            if (fire > (armor.HP * 0.5) && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1){
                                                if (condition.Crit && condition.DH) {
                                                    return { Strength: "inferno"};
                                                } else if (condition.Crit || condition.DH){
                                                    return { Strength: "burn"};
                                                } else return { Strength: "smolder"};
                                            }
                                        return false;
                                    }
                                }

                                switch(flesh.Type){
                                    case "Flesh":
                                        if (condition.Crit && condition.DH) {
                                            return { Strength: "inferno"};
                                        } else if (condition.Crit || condition.DH){
                                            return { Strength: "burn"};
                                        } else return { Strength: "smolder"};
                                    case "Magical Flesh":
                                        if (condition.Crit && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) {
                                            if (condition.DH) {
                                                return { Strength: "inferno"};
                                            } else return { Strength: "burn"};
                                        }
                                    return false;
                                    case "Specter":
                                        // Immune
                                    return false;
                                }
                                return false;
                            },
                            /**
                             * This method checks if the Blind status effect should be applied
                             * @param {Object} armor Armor HP Obj
                             * @param {Object} flesh Flesh HP Obj
                             * @param {Number} dark Dark damage being dealt
                             * @param {Object} condition Contains {Crit: boolean, DH: boolean}
                             * @param {Object[]} curEffects Object array of any and all currently applied status effects
                             * @returns Boolean
                             */
                            Blind: (armor, flesh, dark, condition, curEffects) => {

                                if (armor.HP > 0){
                                    switch(armor.Type){
                                        case "Armor":
                                            // Immune
                                        return false;
                                        case "Bark":
                                            if (condition.Crit) return true;
                                        return false;
                                        case "Fossil":
                                            // Immune
                                        return false;
                                        case "Demon":
                                            // Immune
                                        return false;
                                    }
                                }

                                switch(flesh.Type){
                                    case "Flesh":
                                        if (condition.Crit) return true;
                                    return false;
                                    case "Magical Flesh":
                                        if (condition.Crit && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) return true;
                                    return false;
                                    case "Specter":
                                        if (curEffects.findIndex(eff => eff.Type === 'Flash') !== -1) return true;
                                    return false;
                                }
                                return false;
                            },
                            /**
                             * This method checks if the Flash status effect should be applied
                             * @param {Object} armor Armor HP Obj
                             * @param {Object} flesh Flesh HP Obj
                             * @param {Number} light Light damage being dealt
                             * @param {Object} condition Contains {Crit: boolean, DH: boolean}
                             * @param {Object[]} curEffects Object array of any and all currently applied status effects
                             * @returns Boolean
                             */
                            Flash: (armor, flesh, light, condition, curEffects) => {

                                if (armor.HP > 0){
                                    switch(armor.Type){
                                        case "Armor":
                                            if (condition.Crit && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) return true;
                                        return false;
                                        case "Bark":
                                            // Immune
                                        return false;
                                        case "Fossil":
                                            if (condition.Crit && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) return true;
                                        return false;
                                        case "Demon":
                                            // Applied
                                        return true;
                                    }
                                }

                                switch(flesh.Type){
                                    case "Flesh":
                                        if (condition.Crit) return true;
                                    return false;
                                    case "Magical Flesh":
                                        if (condition.Crit && curEffects.findIndex(eff => eff.Type === 'MagiWeak') !== -1) return true;
                                    return false;
                                    case "Specter":
                                        // Applied
                                    return true;
                                }
                                return false;
                            }
                        }

                        // Combo Effects
                        /**
                         *      - Blast: Frost + Fire
                         *      - PhaseBind: Dark + Light
                         */
                        // const statusComboComp = {
                        //     Blast: Frost + Fire,
                        //     PhaseBind: Dark + Light
                        // }

                        for (let i = 0; i < trialRuns; i++){
                            console.log(chlkPreset.sInfoOne(`Current run: ${i}`));

                            const enemyHPTypes = genEnemy();
                            enemyHPTypes[2].HP === 0;

                            const enemyObj = {
                                flesh: enemyHPTypes[0],
                                armor: enemyHPTypes[1],
                                shield: enemyHPTypes[2] 
                            };

                            console.log(enemyObj);

                            const gearMade = genGearPiece();
                            console.log(gearMade);
                            console.log(chlkPreset.bInfoOne('===== GEAR GEN END ====='));
                            const dmgTypes = checkingDamage(gearMade);

                            //const fullModCheck = typeMatchCheck(dmgTypes, enemyHPTypes);
                            const cleanModCheck = cleanTypeMatchCheck(dmgTypes, enemyHPTypes);

                            const finalOutcomeList = [];
                            const curEffects = [];
                            for (const dmgObj of cleanModCheck){
                                console.log(dmgObj);
                                
                                const result = checkForStatus(dmgObj, enemyObj, testStatus, curEffects);
                                //console.log(result);

                                if (result instanceof Object) {
                                    console.log(chlkPreset.bInfoTwo('OBJECT INSTANCE FOUND!'));

                                    const effectObj = {
                                        Type: statusKeys.get(result.Type)
                                    };
                                    console.log(effectObj);

                                    curEffects.push(effectObj);
                                }

                                finalOutcomeList.push(result);
                            }
                            console.log(curEffects);
                            console.log(finalOutcomeList);
                        }
                        
                    break;
                }
            break;
            case "crafting":

            break;
        }           
        endTime = new Date().getTime();

        return await interaction.reply(`Command took ${endTime - startTime}ms to complete!`);

        /**
         * 
         * @param {Object} dmgObj Damage Object: {Type: string, DMG: number}
         * @param {Object} enemyObj Enemy HP Object: {flesh: {Type: string, HP: number}, armor: {Type: string, HP: number}, shield: {Type: string, HP: number}}
         * @param {Object()} testStatus Object with method props   
         * @param {Object[]} curEffects Array of any and all currently applied effects
         * @returns false || Object object
         */
        function checkForStatus(dmgObj, enemyObj, testStatus, curEffects){
            const fleshObj = enemyObj.flesh;
            const armorObj = enemyObj.armor;

            const condition = {
                Crit: inclusiveRandNum(1,0),
                DH: inclusiveRandNum(1,0)
            };
            
            console.log(condition);

            // testStatus.prop(armor, flesh, blunt, condition, curEffects)
            let returnOutcome = false;
            switch(dmgObj.Type){
                case "Blunt":
                    returnOutcome = testStatus.Concusion(armorObj, fleshObj, dmgObj.DMG, condition, curEffects);
                break;
                case "Slash":
                    returnOutcome = testStatus.Bleed(armorObj, fleshObj, dmgObj.DMG, condition, curEffects);
                    if (returnOutcome !== false){
                        returnOutcome = {
                            Type: dmgObj.Type,
                            Strength: returnOutcome
                        };
                    }
                break;
                case "Magic":
                    returnOutcome = testStatus.Magic_Weakness(armorObj, fleshObj, dmgObj.DMG, condition, curEffects);
                break;
                case "Rad":
                    returnOutcome = testStatus.Confusion(armorObj, fleshObj, dmgObj.DMG, condition, curEffects);
                break;
                case "Frost":
                    returnOutcome = testStatus.Slow(armorObj, fleshObj, dmgObj.DMG, condition, curEffects);
                break;
                case "Fire":
                    returnOutcome = testStatus.Burn(armorObj, fleshObj, dmgObj.DMG, condition, curEffects);
                    if (returnOutcome !== false){
                        returnOutcome = {
                            Type: dmgObj.Type,
                            Strength: returnOutcome
                        };
                    }
                break;
                case "Dark":
                    returnOutcome = testStatus.Blind(armorObj, fleshObj, dmgObj.DMG, condition, curEffects);
                break;
                case "Light":
                    returnOutcome = testStatus.Flash(armorObj, fleshObj, dmgObj.DMG, condition, curEffects);
                break;
                default:
                    // No effect applied
                    console.log('DEFAULT REACHED!');
                break;
            }

            if (returnOutcome === true) {
                returnOutcome = {
                    Type: dmgObj.Type
                };
            }

            return returnOutcome;
        }

        /**
         * This function randomly generates an item in the new built string format
         * @returns String useable as item code for all base item props
         */
        function genGearPiece(){
            console.log(chlkPreset.bInfoOne('===== GEAR GEN START ====='));
            const typePrefix = "TYP_";
            const typeSuffix = "_typ";
            const disPrefix = "DIS_";
            const disSuffix = "_dis";

            const genTypeAmount = inclusiveRandNum(4,1);
            const genDisAmount = inclusiveRandNum(5,2);

            // Gen Type:Value Pairs for dmg/def
            // =====================
            let keyMatchArr = [];
            for (const [key] of dmgKeys){
                keyMatchArr.push(key);
            }

            let typesPicked = [];
            for (let i = 0; i < genTypeAmount; i++){
                let randPicked = randArrPos(keyMatchArr);
                typesPicked.push(randPicked);
                keyMatchArr.splice(keyMatchArr.indexOf(randPicked), 1);
            }
            
            let typePairs = [];
            for (let type of typesPicked){
                const typeValue = inclusiveRandNum(100, 5);
                type += `:${typeValue}`;
                typePairs.push(type);
            }

            const finalTypePairs = typePairs.join('-');
            
            const finalTypeStr = typePrefix + finalTypePairs + typeSuffix;
            //console.log(finalTypeStr);
            // =====================

            // Gen Rarity
            // =====================
            keyMatchArr = [];
            for (const [key] of rarKeys){
                keyMatchArr.push(key);
            }
            const finalRarStr = randArrPos(keyMatchArr);
            //console.log(finalRarStr);
            // =====================

            // Gen Dis Types
            // =====================
            keyMatchArr = [];
            for (const [key] of disKeys){
                keyMatchArr.push(key);
            }

            let disPicked = [];
            for (let i = 0; i < genDisAmount; i++){
                let randPicked = randArrPos(keyMatchArr);
                disPicked.push(randPicked);
                keyMatchArr.splice(keyMatchArr.indexOf(randPicked), 1);
            }

            const finalDis = disPicked.join('-');

            const finalDisStr = disPrefix + finalDis + disSuffix;
            //console.log(finalDisStr);
            // =====================

            // Gen Slot
            // =====================
            keyMatchArr = [];
            for (const [key] of slotKeys){
                keyMatchArr.push(key);
            }
            const finalSlotStr = randArrPos(keyMatchArr);
            //console.log(finalSlotStr);
            // =====================

            const finalStrs = [finalTypeStr, finalRarStr, finalDisStr, finalSlotStr];

            const returnStr = finalStrs.join('-');

            return returnStr;
        }

        /**
         * This function generates a randomized enemy
         * @returns Array of Types and HP values in an object array
         */
        function genEnemy() {
            let scaleMult = (level, HPStrIndex) => 1 + (level * (HPStrIndex/2 + 0.02));
                        
            // Rand Gen Flesh HP
            const fleshHPRange = (level, HPType) => {
                const staticMin = 5;
                const staticMax = 25;

                const scaleBY = scaleMult(level, fleshTypes.indexOf(HPType));

                const finalFlesh = Math.floor(Math.random() * ((staticMax * scaleBY) - (staticMin * scaleBY) + 1) + (staticMin * scaleBY));
                //console.log(finalFlesh);
                return finalFlesh;
            }

            // Rand Gen Armor HP
            const armorHPRange = (level, HPType) => {
                const staticMin = 0;
                const staticMax = 10;

                const scaleBY = scaleMult(level, armorTypes.indexOf(HPType));

                const finalArmor = Math.floor(Math.random() * ((staticMax * scaleBY) - (staticMin + 1 * scaleBY)) + (staticMin * scaleBY));
                //console.log(finalArmor);
                return finalArmor;
            }

            // Rand Gen Shield HP
            const shieldHPRange = (level, HPType) => {
                const staticMin = 0;
                const staticMax = 5;

                const scaleBY = scaleMult(level, shieldTypes.indexOf(HPType));

                const finalShield = Math.floor(Math.random() * ((staticMax * scaleBY) - (staticMin + 1 * scaleBY)) + (staticMin * scaleBY));
                return finalShield;
            }

            //Math.floor(Math.random() * (this.taskContents.MaxNeed - this.taskContents.MinNeed + 1) + this.taskContents.MinNeed);
            const enemyLevel = Math.floor(Math.random() * (100 - 1 + 1) + 1);

            // Initilize Flesh
            let enemyFlesh = {
                Type: randArrPos(fleshTypes)
            };
            enemyFlesh.HP = fleshHPRange(enemyLevel, enemyFlesh.Type);

            // Initilize Armor
            let enemyArmor = {
                Type: randArrPos(armorTypes)
            };
            enemyArmor.HP = armorHPRange(enemyLevel, enemyArmor.Type);

            // Initilize Shield
            let enemyShield = {
                Type: randArrPos(shieldTypes)
            };
            enemyShield.HP = shieldHPRange(enemyLevel, enemyShield.Type);

            console.log("Enemy Spawned @ level: %d", enemyLevel);

            const enemyHPTypes = [
                enemyFlesh, 
                enemyArmor,
                enemyShield
            ];

            return enemyHPTypes;
        }

        /**
         * 
         * @param {Object[]} combatVals Object array of Damage & HP {Type: String, Dmg: Integer, Against: {Type: String, HP: Integer}}
         * @param {Object[]} hpBase Object array of HP {Type: String, HP: Integer}
         * @returns Array of table matches useable for damage value modifications
         */
        function runCombatInstance(combatVals, hpBase){

            console.log(chlkPreset.bInfoTwo('===== COMBAT START ====='));
            // Damage values modded based on type matches
            // HP takes damage: Shield > Armor > Flesh
            // Use .indexOf() foreach damage instance, if -1 skip, else add in order found in static array
            const orderedHPLevel = {
                Shield: [],
                Armor: [],
                Flesh: []
            };
            for (const HP_INST of hpBase){
                if (shieldTypes.indexOf(HP_INST.Type) !== -1 && HP_INST.HP > 0) {
                    orderedHPLevel.Shield.push(HP_INST);
                } else if (armorTypes.indexOf(HP_INST.Type) !== -1 && HP_INST.HP > 0) {
                    orderedHPLevel.Armor.push(HP_INST);
                } else if (fleshTypes.indexOf(HP_INST.Type) !== -1 && HP_INST.HP > 0) {
                    orderedHPLevel.Flesh.push(HP_INST);
                } 
            }

            if (orderedHPLevel.Shield.length <= 0) orderedHPLevel.Shield.push('None');
            if (orderedHPLevel.Armor.length <= 0) orderedHPLevel.Armor.push('None');
            if (orderedHPLevel.Flesh.length <= 0) orderedHPLevel.Flesh.push('None');

            // Find highest matchup against top most HP level
            const againstShield = (orderedHPLevel.Shield[0] !== 'None') ? combatVals.filter(dmg => { 
                return orderedHPLevel.Shield.some(hp => dmg.Against.Type === hp.Type); 
            }).sort((a, b) => { return b.DMG - a.DMG; }) : 'None';
            const totalShieldDMG = (againstShield !== 'None') ? againstShield.reduce((total, obj) => total + obj.DMG, 0) : 0;
            const totalShieldHP = (againstShield !== 'None') ? orderedHPLevel.Shield.reduce((total, obj) => total + obj.HP, 0) : 0;

            const againstArmor = (orderedHPLevel.Armor[0] !== 'None') ? combatVals.filter(dmg => { 
                return orderedHPLevel.Armor.some(hp => dmg.Against.Type === hp.Type); 
            }).sort((a, b) => { return b.DMG - a.DMG; }) : 'None';
            let totalArmorDMG = (againstArmor !== 'None') ? againstArmor.reduce((total, obj) => total + obj.DMG, 0) : 0;
            const totalArmorHP = (againstArmor !== 'None') ? orderedHPLevel.Armor.reduce((total, obj) => total + obj.HP, 0) : 0;

            const againstFlesh = (orderedHPLevel.Flesh[0] !== 'None') ? combatVals.filter(dmg => { 
                return orderedHPLevel.Flesh.some(hp => dmg.Against.Type === hp.Type); 
            }).sort((a, b) => { return b.DMG - a.DMG; }) : 'None';
            let totalFleshDMG = (againstFlesh !== 'None') ? againstFlesh.reduce((total, obj) => total + obj.DMG, 0) : 0;
            const totalFleshHP = (againstFlesh !== 'None') ? orderedHPLevel.Flesh.reduce((total, obj) => total + obj.HP, 0) : 0;
            
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
            // NEEDED:
            //      - Removal of expended damage entries from subsequent HP type checks/calculations
            //      - Reduction of uneeded code blocks, functions, and calculations
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
                console.log('Starting Shield HP: %d', totalShieldHP);
                console.log('Expected Damage to Shield: %d', totalShieldDMG);
            }

            if (againstShield !== 'None' && againstArmor !== 'None' && !combatEnd) {
                let shieldDMGChanged = againstShield.filter(obj => obj.used);
                shieldDMGChanged = shieldDMGChanged[0];
                
                // console.log(shieldDMGChanged);
                // console.log(combatEnd);

                const checkFor = (ele) => ele.Type === shieldDMGChanged.Type;
                if (againstArmor[againstArmor.findIndex(checkFor)].DMG < shieldDMGChanged.DMG) { } else {
                    const shieldCarryChangeCheck = singleLookup(shieldDMGChanged);
                    againstArmor[againstArmor.findIndex(checkFor)].DMG = shieldCarryChangeCheck.DMG;
                }
                totalArmorDMG = (againstArmor !== 'None') ? againstArmor.reduce((total, obj) => total + obj.DMG, 0) : 0;
            }
             
            // Armor 
            let armorBrake = (againstArmor !== 'None' && !combatEnd) ? false : true;
            if (!armorBrake && !combatEnd){
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
                console.log('Starting Armor HP: %d', totalArmorHP);
                console.log('Expected Damage to Armor: %d', totalArmorDMG);
            }
            
            if (againstArmor !== 'None' && againstFlesh !== 'None' && !combatEnd) {
                let armorDMGChanged = againstArmor.filter(obj => obj.used);
                armorDMGChanged = armorDMGChanged[0];
                
                // console.log(armorDMGChanged);
                // console.log(combatEnd);

                const checkFor = (ele) => ele.Type === armorDMGChanged.Type;
                if (againstFlesh[againstFlesh.findIndex(checkFor)].DMG < armorDMGChanged.DMG) { } else {
                    const armorCarryChangeCheck = singleLookup(armorDMGChanged);
                    againstFlesh[againstFlesh.findIndex(checkFor)].DMG = armorCarryChangeCheck.DMG;
                }
                totalFleshDMG = (againstFlesh !== 'None') ? againstFlesh.reduce((total, obj) => total + obj.DMG, 0) : 0;
            }

            // Flesh 
            let dead = false;
            if (!dead && !combatEnd){
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
                console.log('Starting Base HP: %d', totalFleshHP);
                console.log('Expected Damage to Base HP: %d', totalFleshDMG);
            }
            // const fleshDMGChanged = (againstFlesh !== 'None' && !combatEnd) ? againstFlesh.filter(obj => obj.used) : [];
            // console.log(...fleshDMGChanged);

            /**
             * 
             * @param  {...any} arr Arrays to be checked for values to display
             * @returns Single array with filtered values
             */
            const hasTypes = (...arr) => {
                let both = 0;
                for (let i = 0; i < arr.length; i++){
                    let include = (arr[i] !== 'None') ? true : false;
                    if (include && i === 0) both += 2;
                    if (include && i === 1) both += 4;
                }
                
                let returnArr = [];
                if (both === 6) {
                    returnArr = arr[0].concat(arr[1]);
                } else if (both === 2){
                    returnArr = arr[0];
                } else if (both === 4){
                    returnArr = arr[1];
                }

                return returnArr;
            }


            const allDamages = againstFlesh.concat(hasTypes(againstArmor, againstShield));
            //const allDamages = againstShield.concat(againstArmor, againstFlesh);
            for(const dmgOBJ of allDamages){
                if (dmgOBJ !== 'None') console.log(dmgOBJ);
            }
            if (dead) {
                console.log(chlkPreset.pass('Enemy Defeated in one turn!'));
            } else if (!dead && combatEnd) {
                console.log(chlkPreset.fail('Enemy Survives turn one!'));
            }
            console.log(chlkPreset.bInfoTwo('===== COMBAT END ====='));
            // console.log(...againstShield);
            // console.log(...againstArmor);
            // console.log(...againstFlesh);
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
         * @param {Object[]} dmgBase Object array of Damage {Type: String, Dmg: Integer}
         * @param {Object[]} hpBase Object array of HP {Type: String, HP: Integer}
         * @returns Array of table matches useable for damage value modifications Without moddifing object props
         */
        function cleanTypeMatchCheck(dmgBase, hpBase){
            const matchedLookups = [];
            for (const DMG_INST of dmgBase){
                for (const HP_INST of hpBase){
                    const yLookup = rowMatch.indexOf(DMG_INST.Type);
                    const xLookup = columnMatch.indexOf(HP_INST.Type);
                    
                    const modBY = damageModifier[damageKeyIndexer.indexOf(damageMatchTable[yLookup][xLookup])];

                    const moddedDMG = {
                        Type: DMG_INST.Type,
                        DMG: DMG_INST.DMG + (DMG_INST.DMG * modBY)
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