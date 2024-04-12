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
                                HP: 10,
                            }
                        ];

                        const ITEM_CODE = "TYP_PAsp:25-SLph:10_typ-r00-DIS_SL-SI-WO_dis-HEslo-100001";

                        const slot = checkingSlot(ITEM_CODE);
                        const rarity = checkingRar(ITEM_CODE);
                        const disTypes = checkingDismantle(ITEM_CODE);
                        const dmgTypes = checkingDamage(ITEM_CODE);

                        console.log(`Slot: ${slot}\nRarity: ${rarity}\nDismantle Into: ${disTypes.toString()}\nDamage Values: ${dmgTypes.map(item => `\nType: ${item.Type}\nDamage: ${item.DMG}`)}`);
                        console.log('Number of trial runs requested: %d', trialRuns);

                        const result = runCombatInstance(dmgTypes, enemyHPTypes);

                        console.log(result);
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
         * @param {Object[]} dmgBase Object array of Damage {Type: String, Dmg: Integer}
         * @param {Object[]} hpBase Object array of HP {Type: String, HP: Integer}
         * @returns Array of table matches useable for damage value modifications
         */
        function runCombatInstance(dmgBase, hpBase){
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