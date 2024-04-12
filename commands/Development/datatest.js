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
        const dmgKeys = new Map();
        dmgKeys.set("BLph", "Blunt");
        dmgKeys.set("SLph", "Slash");
        dmgKeys.set("MAma", "Magic");
        dmgKeys.set("RAma", "Rad");
        dmgKeys.set("FRma", "Frost");
        dmgKeys.set("FIma", "Fire");
        dmgKeys.set("DAma", "Dark");
        dmgKeys.set("LIma", "Light");
        dmgKeys.set("NUsp", "Null");
        dmgKeys.set("PAsp", "Pain");
        dmgKeys.set("SPsp", "Spirit");
        dmgKeys.set("CHsp", "Chaos");


        const rarKeys = new Map();
        rarKeys.set("r00", "Common");
        rarKeys.set("r01", "Uncommon");
        rarKeys.set("r02", "Rare");
        rarKeys.set("r03", "Very Rare");
        rarKeys.set("r04", "Epic");
        rarKeys.set("r05", "Mystic");
        rarKeys.set("r06", "?");
        rarKeys.set("r07", "??");
        rarKeys.set("r08", "???");
        rarKeys.set("r09", "????");
        rarKeys.set("r10", "Forgotten");
        rarKeys.set("r12", "Unique");


        const disKeys = new Map();
        disKeys.set("SL", "Slimy");
        disKeys.set("HE", "Herby");
        disKeys.set("WO", "Woody");
        disKeys.set("SK", "Skinny");
        disKeys.set("FL", "Fleshy");
        disKeys.set("SI", "Silky");
        disKeys.set("MA", "Magical");
        disKeys.set("ME", "Metalic");
        disKeys.set("RO", "Rocky");
        disKeys.set("GE", "Gemy");
        disKeys.set("TO", "Tooly");
        disKeys.set("UN", "Unique");


        const slotKeys = new Map();
        slotKeys.set("HEslo", "Headslot");
        slotKeys.set("CHslo", "Chestslot");
        slotKeys.set("LEslo", "Legslot");
        slotKeys.set("MAslo", "Mainhand");
        slotKeys.set("OFslo", "Offhand");
        
        const subcomGroup = interaction.options.getSubcommandGroup();
        const subcom = interaction.options.getSubcommand();

        const startTime = new Date().getTime();
        
        switch(subcomGroup){
            case "combat":
                switch(subcom){
                    case "simulation":
                        const trialRuns = interaction.options.getInteger('amount') ?? 1;

                        const ITEM_CODE = "TYP_PAsp:25-SLph:10_typ-r00-DIS_SL-SI-WO_dis-HEslo-100001";
                        const slot = checkingSlot(ITEM_CODE);
                        const rarity = checkingRar(ITEM_CODE);
                        const disTypes = checkingDismantle(ITEM_CODE);
                        const dmgTypes = checkingDamage(ITEM_CODE);

                        console.log(`Slot: ${slot}\nRarity: ${rarity}\nDismantle Into: ${disTypes.toString()}\nDamage Values: ${dmgTypes.map(item => `\nType: ${item.type}\nDamage: ${item.dmg}`)}`);

                        console.log('Number of trial runs requested: %d', trialRuns);
                    break;
                }
            break;
            case "status":

            break;
            case "crafting":

            break;
        }

        const endTime = new Date().getTime();
        return await interaction.reply(`Command took ${endTime - startTime}ms to complete!`);

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
                type: dmgKeys.get(cutStr[0]),
                dmg: cutStr[1]
              };
          
              finalTypes.push(pushObj);
            }
            return finalTypes;
        }
	},
};