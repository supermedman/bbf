const { ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder } = require("discord.js");
const { convertRarToID, retrieveRarKeyStorage } = require("./commands/Development/Export/itemStringCore");

/**
 * This function loads the standard amount selection button rows.
 * 
 * Returns array of: 
 * 
 * at least 2 `ActionRowBuilder` objects
 * 
 * at most 4 `ActionRowBuilder` objects
 * @param {number} [showRows=3] If given ***MUST BE 1 | 2 | 3*** 
 * @returns {ActionRowBuilder<ButtonBuilder[]>[]}
 */
function loadDefaultAmountButtonActionRows(showRows=3){
    // ID CONSTRUCTION
    const buttPrefixOrder = ['minus', 'minus', 'mult', 'plus', 'plus'];
    const rowIDTable = [
        ['10', '1', '10', '1', '10'],
        ['100', '25', '100', '25', '100'],
        ['10k', '1k', '1k', '1k', '10k']
    ];
    // const rowOneNums = ['10', '1', '10', '1', '10'];
    // const rowTwoNums = ['100', '25', '100', '25', '100'];
    // const rowThreeNums = ['10k', '1k', '1k', '1k', '10k'];
    // const kConversion = '000'; Used for math construction at runtime.
    // ID CONSTRUCTION

    // STYLE CONSTRUCTION
    const buttStyleOrder = [
        ButtonStyle.Primary, 
        ButtonStyle.Primary, 
        ButtonStyle.Secondary, // mult
        ButtonStyle.Primary, 
        ButtonStyle.Primary
    ];
    // STYLE CONSTRUCTION

    // LABEL CONSTRUCTION
    /**
     * @param {string} id Constructed `Button.custom_id`
     * @returns {string} Text Label to use for display: `Button.label`
     */
    const buttLabelConverter = id => {
        const idParts = id.split('-');
        const signMap = new Map([
            ["minus", '-'],
            ["mult", 'x'],
            ["plus", '+']
        ]);
        return `${signMap.get(idParts[0])}${idParts[1]}`;
    };
    // LABEL CONSTRUCTION
    
    // ==================
    // Amount Button Rows
    const finalRows = [];
    for (let r = 0; r < showRows; r++){
        const curRowIds = rowIDTable[r];
        const curButtList = [];
        for (let rid = 0; rid < curRowIds.length; rid++){
            const curIDStr = [buttPrefixOrder[rid], curRowIds[rid]].join('-');
            const butt = new ButtonBuilder()
            .setCustomId(curIDStr)
            .setStyle(buttStyleOrder[rid])
            .setLabel(buttLabelConverter(curIDStr));
            curButtList.push(butt);
        }
        const curRow = new ActionRowBuilder().addComponents(curButtList);
        finalRows.push(curRow);
    }
    // ==================

    // ==================
    // Menu Control Row
    const backButt = new ButtonBuilder()
    .setCustomId('back-amount')
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Go Back');
    const confirmButt = new ButtonBuilder()
    .setCustomId('confirm-amount')
    .setStyle(ButtonStyle.Success)
    .setLabel('Confirm Amount!');
    const resetButt = new ButtonBuilder()
    .setCustomId('reset-amount')
    .setStyle(ButtonStyle.Danger)
    .setLabel('Reset Amount to 0');
    const controlRow = new ActionRowBuilder().addComponents(backButt, confirmButt, resetButt);
    
    finalRows.push(controlRow);
    // ==================

    return finalRows;
}

/**
 * This Object handles converting `button.data.custom_id` values into mathimatical components
 * `loadDefaultAmountButtonActionRows()` loads all related buttons to be used with this object.
 * Use case example:
 * 
 * ```js
 *  const {fnSignConverter} = require('...');
 *  
 *  let trackedAmount = 0;
 *  collecter.on('collect', c => {
 *      if (c.customId === 'num-button'){
 *          trackedAmount = fnSignConverter.grabCalledEq(c.customId, trackedAmount);
 *      }
 *  });
 * ```
 */
const fnSignConverter = {
    signs: {
        /**
         * This method subtracts `n` from `a`
         * @param {number} a Current Total Amount given
         * @param {number} n Amount to subtract
         * @returns {number}
         */
        minus: (a, n) => a - n,
        /**
         * This method multiplies `a` by `n`
         * @param {number} a Current Total Amount given
         * @param {number} n Amount to multiply by
         * @returns {number}
         */
        mult: (a, n) => a * n,
        /**
         * This method adds `n` to `a`
         * @param {number} a Current Total Amount given
         * @param {number} n Amount to add
         * @returns {number}
         */
        plus: (a, n) => a + n
    },
    /**
     * This method checks for "k" in the given `id` string,
     * if found returns the given `id` with "k" replaced with "000".
     * @param {string} id ButtonID string number
     * @returns {string}
     */
    checkConvertK(id){
        return (id.includes('k')) ? id.slice(0, id.indexOf('k')) + '000': id;
    },
    /**
     * This method returns the urnary `+` operation 
     * on the outcome of `this.checkConvertK` 
     * @param {string} id ButtonID string number
     * @returns {number}
     */
    grabIDValue(id){
        return +this.checkConvertK(id);
    },
    /**
     * This method splits the given `buttID` into two components:
     * 
     * `part[0]` = one of "minus", "mult", "plus"
     * 
     * `part[1]` = number parsable string, checked using `this.grabIDValue`
     * 
     * returns `this.signs[part[0]](curAmount, part[1])`
     * @param {string} buttID Full `Button.custom_id`
     * @param {number} curAmount Current Tracked Amount 
     * @returns {number}
     */
    grabCalledEq(buttID, curAmount){
        const idParts = buttID.split('-');
        const numIDPart = this.grabIDValue(idParts[1]);
        return this.signs[idParts[0]](curAmount, numIDPart);
    }
};

/**
 * This function will load the standard Pagination button row, including any additional buttons passed with `additionalActionButtons`
 * 
 * Button Display Order:
 * `BackButt, CancelButt?, ...AdditionalButtons?, NextButt`
 * @param {boolean} includeCancel If true, includes a cancel button with id `delete-page`
 * @param {ButtonBuilder[]} additionalActionButtons Array of `ButtonBuilders`, max length 3 
 * @returns {ActionRowBuilder<ButtonBuilder> | string} Returns `"Paging Row Length Exceeds 5"` on length exception
 */
function loadDefaultPagingButtonActionRow(includeCancel=false, additionalActionButtons=[]){
    const backPageButt = new ButtonBuilder()
    .setLabel("Backward")
    .setStyle(ButtonStyle.Primary)
    .setEmoji('◀️')
    .setCustomId('back-page');
    const nextPageButt = new ButtonBuilder()
    .setLabel("Forward")
    .setStyle(ButtonStyle.Primary)
    .setEmoji('▶️')
    .setCustomId('next-page');
    const cancelButton = new ButtonBuilder()
    .setLabel("Cancel")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('*️⃣')
    .setCustomId('delete-page');

    const pagingButtons = [backPageButt];

    if (includeCancel) pagingButtons.push(cancelButton);
    if (additionalActionButtons.length > 0) pagingButtons.push(...additionalActionButtons);
    pagingButtons.push(nextPageButt);

    if (pagingButtons.length < 5){
        const pagingButtonRow = new ActionRowBuilder().addComponents(pagingButtons);
        return pagingButtonRow;
    } else return "Paging Row Length Exceeds 5";   
}

class rarityLimiter {
    constructor(){
        this.max = 1;
        this.min = 0;
    }
    /**
     * This method sets both the `this.max` and the `this.min` values according to 
     * `rMax` and `rMin` respectively.
     * @param {number | string} rMax Maximum Rarity Id Value
     * @param {number | string} rMin Minimum Rarity Id Value
     */
    loadRarLimit(rMax, rMin){
        this.max = convertRarToID(rMax);
        this.min = convertRarToID(rMin);
    }
    loadMatchingRarNames(){
        const rarNames = Object.entries(retrieveRarKeyStorage())
        .filter(([k]) => this.isWithin(+k))
        .reduce((acc, [k, v]) => {
            acc[k] = v;
            return acc;
        }, {});
        return rarNames;
    }
    /**
     * This method checks the given `r` against the stored `max` & `min` values
     * @param {number} r Valid RarID number equivalent
     * @returns {boolean}
     */
    isWithin(r){
        return r <= this.max && r >= this.min;
    }
};

/**
 * This function loads a string select menu with rarity name options based on the given `max/min` rarities.
 * 
 * Example:
 * ```js
 *  const matType = "slimy";
 * 
 *  const rarNameSelectRow = loadDefaultRarityNameSelectionRow(
 *      "Mystic", 0, `${matType} material`
 *  );
 * ```
 * @param {number | string} maxRar Maximum rarity to include
 * @param {number | string} minRar Minimum rarity to include
 * @param {string} optionDescription Used with `.setDescription(${rarName} ${optionDescription})`
 * @returns {ActionRowBuilder<StringSelectMenuBuilder>}
 */
function loadDefaultRarityNameSelectionRow(maxRar, minRar, optionDescription){
    const rarity = new rarityLimiter();
    rarity.loadRarLimit(maxRar, minRar);

    const stringOptionList = Object.entries(retrieveRarKeyStorage())
    .filter(([k]) => rarity.isWithin(+k))
    .reduce((acc, [k, v]) => {
        const option = new StringSelectMenuOptionBuilder()
        .setValue(v)
        .setDescription(`${v} ${optionDescription}`)
        .setLabel(v);

        acc.push(option);
        return acc;
    }, []);

    const rarNameSelectMenu = new StringSelectMenuBuilder()
    .setCustomId(`rar-name`)
    .setPlaceholder('Select a rarity!')
    .addOptions(stringOptionList);

    const rarNameRow = new ActionRowBuilder().addComponents(rarNameSelectMenu);

    return rarNameRow;
}

module.exports = {
    loadDefaultAmountButtonActionRows,
    loadDefaultPagingButtonActionRow,
    loadDefaultRarityNameSelectionRow,
    rarityLimiter,
    fnSignConverter
};