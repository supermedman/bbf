const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

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

module.exports = {
    loadDefaultAmountButtonActionRows,
    fnSignConverter
    //handleAmountChange: fnSignConverter.grabCalledEq
};