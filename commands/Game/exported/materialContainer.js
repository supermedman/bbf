const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, Collection } = require("discord.js");
const { MaterialStore } = require("../../../dbObjects");
const { loadFullRarNameList, loadFullDismantleList } = require("../../Development/Export/itemStringCore");
const { makeCapital } = require("../../../uniHelperFunctions");
const { loadBasicBackButt } = require("./tradeExtras");


async function convertOldMatStore(interaction, matType){
    /**@type {Collection<string, {Name: string, Value: number, Rarity: string, Rar_id: number, Mat_id: number}[]>} */
    const materials = interaction.client.materials;

    const ownedList = await MaterialStore.findAll({where: {spec_id: interaction.user.id, mattype: matType}});

    /**
     * @template T
     * @param {T} r MatRef.Rar_id
     * @returns {{amount: number} | undefined}
     */
    const isOwned = r => ownedList.find(mat => mat.rar_id === r);

    /**@type {{[r: string]: number}} */
    const newMatStore = materials.get(matType)
    .sort((a, b) => a.Rar_id - b.Rar_id)
    .reduce((acc, matRef) => {
        acc[`${matRef.Rar_id.toString()}`] = (isOwned(matRef.Rar_id))?.amount ?? 0;
        return acc;
    }, {});

    return newMatStore;
}

module.exports = {
    convertOldMatStore
};


async function materialMenu(){
    const matMenu = {
        specs: {
            actionType: "",
            matType: "",
            rarity: {
                target: "",
                extra: ""
            },
            targetAmount: 0
        }
    };

    // Material Action?
    // ================
    // COMBINE || DISMANTLE || **ADVANCED** (Add later)
    const matActionEmbed = new EmbedBuilder()
    .setTitle('== Material Actions ==');

    const matCombButt = new ButtonBuilder()
    .setCustomId('mat-combine')
    .setStyle(ButtonStyle.Primary)
    .setLabel('Combine Material');
    const matDisButt = new ButtonBuilder()
    .setCustomId('mat-dismantle')
    .setStyle(ButtonStyle.Primary)
    .setLabel('Dismantle Material');
    const matActionRow = new ActionRowBuilder().addComponents(matCombButt, matDisButt);

    // Material Type?
    // ==============
    // LOAD FROM DIS LIST
    const matTypeEmbed = new EmbedBuilder()
    .setTitle('== Material Type ==');

    const matTypeOptions = [];
    for (const mt of loadFullDismantleList()){
        const option = new StringSelectMenuOptionBuilder()
        .setValue(mt)
        .setDescription(`${makeCapital(mt)} Type Materials`)
        .setLabel(makeCapital(mt));
        matTypeOptions.push(option);
    }
    const matTypeSelection = new StringSelectMenuBuilder()
    .setCustomId('mat-type')
    .setPlaceholder('Select a material type!')
    .addOptions(matTypeOptions);

    const matTypeRow = new ActionRowBuilder().addComponents(matTypeSelection);
    const matTypeBackRow = loadBasicBackButt('type');

    // AFTER MATTYPE HAS BEEN PICKED!!
    // IF COMB
    // Check if any rar amount > 5
    /**
     * This function checks if any materials of the selected type are able to 
     * be combined. 
     * 
     * If not combine not possible, this return should halt menu progression.
     * @param {string} t Material Type Picked `matMenu.specs.matType`
     * @returns {Promise<boolean>}
     */
    const canComb = async t => {
        const loadedMatStore = await convertOldMatStore(interaction, t);
        const moreThanFive = Object.values(loadedMatStore)
        .reduce((acc, v) => {
            if (acc) return acc;
            return acc = (v >= 5);
        }, false);
        return moreThanFive;
    };
    // IF DIS
    // Check if any amount > 0
    /**
     * This function checks if any materials of the selected type exist.
     * 
     * If not, this return should halt menu progression
     * @param {string} t Material Type Picked `matMenu.specs.matType`
     * @returns {Promise<boolean>}
     */
    const canDis = async t => {
        const loadedMatStore = await convertOldMatStore(interaction, t);
        const hasAny = Object.values(loadedMatStore)
        .reduce((acc, v) => {
            if (acc) return acc;
            return acc = (v > 0);
        }, false);
        return hasAny;
    };
    

    // Target Material Rarity?
    // =======================
    const matRarTargetEmbed = new EmbedBuilder()
    .setTitle('== Target Rarity ==');

    // LOAD FROM RAR LIST
    // IF COMB
    // NO COMMON FOR COMB
    const baseMatRarOptions = [];
    for (const rn of loadFullRarNameList(11)){
        if (matMenu.specs.actionType === 'combine' && rn === 'Common') continue;
        const option = new StringSelectMenuOptionBuilder()
        .setValue(rn)
        .setDescription(`${rn} ${makeCapital(matMenu.specs.matType)} material`)
        .setLabel(rn);
        baseMatRarOptions.push(option);
    }
    const matRarSelection = new StringSelectMenuBuilder()
    .setCustomId('mat-rar')
    .setPlaceholder('Select a material rarity!')
    .addOptions(baseMatRarOptions);

    const matRarRow = new ActionRowBuilder().addComponents(matRarSelection);
    const matRarBackRow = loadBasicBackButt('rar');
    // IF DIS
    // Second rar menu for max rar to dis from?
    

    // Amount Selection?
    // =================
    const amountSelectEmbed = new EmbedBuilder()
    .setTitle('== Amount Desired ==')
    .setDescription('Amount Currently Selected: 0');
    // Amount to combine to
    // Amount to dismantle into

    // EXAMPLE:
    /**
     *  I have {"0": 100, "1": 20, "2": 4, "3": 1};
     * 
     *  I WANT TO COMBINE:
     * 
     *  I WANT TO COMBINE slimy:
     * 
     *  I WANT TO COMBINE TO Very Rare:
     *  
     * 
     *  // STOP AMOUNT INCREASE WHEN NOT POSSIBLE
     *  I WANT 10:
     *  
     *  DISPLAY:
     *  == Combine Materials ==
     *  Target: 10 Very Rare Slimy Materials
     *  Using:
     *  = Common = `(this.amount / (targetRar - this.rar)) === upAmount += (this.rar + 1).amount` 
     *  Owned: 100
     *  Remaining: 0
     *  
     *  = Uncommon = `(this.amount / (targetRar - this.rar)) === upAmount += (this.rar + 1).amount` 
     *  Owned: 20 + `20 (this.rar - 1)`
     *  Remaining: 0
     * 
     *  = Rare = `(this.amount / (targetRar - this.rar)) === upAmount += (this.rar + 1).amount` 
     *  Owned: 4 + `8 (this.rar - 1)`
     *  Remaining: 2
     * 
     *  = TARGET Very Rare =
     *  Currently Owned: 1
     *  Combining Will Yield: 2 / `amountWanted`
     * 
     *  OUTCOME DISPLAY:
     *  == Combine Outcome ==
     *  Combining will yield 2 out of the 10 requested Very Rare Slimy Materials!
     *  
     *  Materials After Combining:
     *  ~~ Common ~~
     *  Amount: NONE
     * 
     *  ~~ Uncommon ~~
     *  Amount: NONE
     * 
     *  == Rare ==
     *  Amount: 2
     * 
     *  == Very Rare ==
     *  Amount: 1 + 2
     */
    // ==================
}