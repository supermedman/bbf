const { AttachmentBuilder } = require('discord.js');

const Canvas = require('@napi-rs/canvas');

const enemyList = require('../../../events/Models/json_prefabs/enemyList.json');
const bossList = require('../../../events/Models/json_prefabs/bossList.json');

//const newEList = require('../../Development/Export/Json/newEnemyList.json');
const { EnemyFab } = require('../../Development/Export/Classes/EnemyFab');

//const HBimg = require('../../../events/Models/json_prefabs/image_extras/healthbar.png');

/**
 * Display any enemy with either an attached png/jpg or without
 * 
 * First grab enemy data either from prefab or from database 
 * 
 * if image is required, grab refrence to prefab from database if not already provided
 * 
 * if display is combat related passes combat as true grabbing values from database over prefabs
 * 
 *                 ===== Exports {displayEWpic, displayEWOpic} =====
 * */

function pngCheck(enemy) {
    if (enemy.PngRef) return true;
    return false;
}

/** This method returns an enemy reference from the corisponding constkey in the enemy list
 * 
 * @param {any} enemy
 */
function getRef(enemy) {
    let enemyRef;
    if (!enemy.constkey) {
        enemyRef = enemy;
    } else {
        enemyRef = enemyList.filter(eFab => eFab.ConstKey === enemy.constkey);
        enemyRef = enemyRef[0];
    }
    return enemyRef;
}


function crossRefPngCheck(enemy){
    const filterFor = enemy.imageCheck.checkKey;
    const fabMatch = enemyList.filter(eFab => eFab.ConstKey === filterFor)[0];
    if (fabMatch.PngRef){
        enemy.imageCheck.hasPng = true;
        enemy.imageCheck.pngRef = fabMatch.PngRef;
        return true;
    } else return false;
}

// function loadEnemyFab(enemy){
//     const checkKey = enemy.ConstKey ?? undefined;
//     if (!checkKey) {
//         const eMatch = newEList.filter(eFab => eFab.ConstKey === checkKey)[0];
//         return eMatch;
//     }
//     return enemy;
// }

async function createEnemyDisplay(enemy, interaction) {
    const canvas = Canvas.createCanvas(700, 300);
    const ctx = canvas.getContext('2d');

    const enemyRef = getRef(enemy);
    const hasImage = pngCheck(enemyRef);

    const background = await Canvas.loadImage('./events/Models/json_prefabs/weapon_png/Background.jpg');
    let enemyPng;
    if (hasImage) enemyPng = await Canvas.loadImage(enemyRef.PngRef);

    // DRAW
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    if (hasImage) ctx.drawImage(enemyPng, 410, 75, 190, 190);

    ctx.fillStyle = 'white';

    // NAME
    ctx.font = '25px sans-serif';
    ctx.fillText(`Name: ${enemyRef.Name}`, 25, 95);

    // LEVEL
    ctx.fillText(`Level ${enemyRef.Level}`, 460, 70);

    // HP
    if (!interaction) ctx.fillText(`HP ${enemy.health}`, 460, 285);
    if (interaction) ctx.fillText(`HP ${enemyRef.Health}`, 460, 285);

    // DEFENCE
    ctx.font = '20px sans-serif';
    if (!interaction) ctx.fillText(`Defence: ${enemy.defence}`, 25, 250);
    if (interaction) ctx.fillText(`Defence: ${enemyRef.Defence}`, 25, 250);

    // WEAKTO
    if (!interaction) ctx.fillText(`Weak To: ${enemy.weakTo}`, 25, 275);
    if (interaction) ctx.fillText(`Weak To: ${enemyRef.WeakTo}`, 25, 275);

    // DESC
    ctx.fillText(`Description: `, 25, 120);

    /** This method splits given text into words, then reconstructs the words into sentences making sure to
     *  fix them against the given conditions, returning a full array of separte lines.
     * 
     * @param {any} text
     */
    const getLines = (text) => {
        let words = text.split(" ");
        let lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            let word = words[i];
            let width = ctx.measureText(currentLine + " " + word).width;
            if (width < (canvas.width - 275)) { currentLine += " " + word; } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    };

    /** This method finds the longest line given, and using its pixel width updates the global font size to 
     *  be applied to the resulting description
     * 
     * @param {any} lines
     */
    const applyText = (lines) => {
        const longestLine = lines.reduce((longest, line) => {
            return (ctx.measureText(longest).width || 0) > ctx.measureText(line).width ? longest : line;
        }, '');

        let fontSize = 30;

        do {
            ctx.font = `${fontSize -= 10}px sans-serif`;
        } while (ctx.measureText(longestLine).width > canvas.width - 275)

        return ctx.font;
    };

    const lines = getLines(enemyRef.Description);
    ctx.font = applyText(lines);
    for (let i = 0; i < lines.length; i++) {
        let j = 150 + (i * 25);
        ctx.fillText(lines[i], 25, j);
    }

    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'enemy-display.png' });
    if (!interaction) return attachment;

    return await interaction.followUp({ files: [attachment] }).then(enemyCanvas => setTimeout(() => {
        enemyCanvas.delete();
    }, 60000));

}


const statusColourMatch = new Map([
    ["Little Bleed", {rank: 1, colour: '#EA9999'}],
    ["Bleed", {rank: 1, colour: '#E06666'}],
    ["Big Bleed", {rank: 1, colour: '#C91B1B'}],
    ["Smolder", {rank: 1, colour: '#D94720'}],
    ["Burn", {rank: 1, colour: '#CC2B00'}],
    ["Inferno", {rank: 1, colour: '#1AA199'}],
    ["Concussion", {rank: 2, colour: '#8E7CC3'}],
    ["Confusion", {rank: 2, colour: '#D5A6BD'}],
    ["Slow", {rank: 3, colour: '#9FC5E8'}],
    ["Blind", {rank: 4, colour: '#434343'}],
    ["Flash", {rank: 4, colour: '#FFFFFF'}],
    ["MagiWeak", {rank: 5, colour: '#F1C232'}]
]);

const healthBarPng = './events/Models/json_prefabs/image_extras/healthbar.png';

/**
 * This function creates a health bar representing the given enemies HP types/amounts
 * @param {EnemyFab} enemy EnemyFab Instance Object
 * @returns {object}
 */
function createHealthBar(enemy) {
    /**
     *      === Health Bar Style ===
     * 
     * start|| <flesh-hp-remaining> | <armor-hp-remaining> | <shield-hp-remaining> ||end
     * 
     * <flesh-hp> : redish brown
     * <armor-hp> : grey
     * <shield-hp> : light blue
     * 
     *  (100% width)
     *  totalHealth = maxFleshHP + maxArmorHP + maxShieldHP
     *  totFleshWidth = maxFleshHP / totalHealth
     *  totArmorWidth = maxArmorHP / totalHealth
     *  totShieldWidth = maxShieldHP / totalHealth
     * 
     *  shown width = curFleshHP + curArmorHP + curShieldHP
     *  
     * 
     *  == Body ==
     *  Flesh - muddy red #B56B57
     *  Magical Flesh - blueish red #8C6E7E
     *  Specter - light blue + red #47598B
     * 
     *  == Armor ==
     *  Armor - lighter dark grey #7E7C7C
     *  Bark - light brown #8C5F41
     *  Fossil - TBD
     *  Demon - light orange #C7584E
     * 
     *  == Shield ==
     *  Phase Demon - darker orange #A14B3A
     *  Phase Aura - Cyan #4C57B5
     * 
     * 
     */
    // 383, 275, 213, 14

    const fleshTypes = ["Flesh", "Magical Flesh", "Specter", "Boss"];
    const fleshColours = ["#B56B57", "#8C6E7E", "#47598B", "black"];
    const fleshColour = fleshColours[fleshTypes.indexOf(enemy.flesh.Type)];

    const armorTypes = ["Armor", "Bark", "Fossil", "Demon"];
    const armorColours = ["#7E7C7C", "#8C5F41", "grey", "#C7584E"];
    const armorColour = armorColours[armorTypes.indexOf(enemy.armor.Type) ?? 0];

    const shieldTypes = ["Phase Demon", "Phase Aura", /*"Plot Armor"*/];
    const shieldColours = ["#A14B3A", "#4C57B5"];
    const shieldColour = shieldColours[shieldTypes.indexOf(enemy.shield.Type) ?? 0];

    // Width 212
    const barWidth = 212;
    
    const totalMaxHealth = enemy.maxFleshHP + enemy.maxArmorHP + enemy.maxShieldHP;
    //console.log('total max health %d', totalMaxHealth);

    // Initial healthbar type widths
    let fleshWidth = barWidth * (enemy.maxFleshHP / totalMaxHealth);
    let armorWidth = barWidth * (enemy.maxArmorHP / totalMaxHealth);
    let shieldWidth = barWidth * (enemy.maxShieldHP / totalMaxHealth);

    // Modify for missing health
    if (enemy.flesh.HP < enemy.maxFleshHP){
        fleshWidth -= barWidth * ((enemy.maxFleshHP - enemy.flesh.HP) / totalMaxHealth);
    }
    if (enemy.armor.HP < enemy.maxArmorHP){
        armorWidth -= barWidth * ((enemy.maxArmorHP - enemy.armor.HP) / totalMaxHealth);
    }
    if (enemy.shield.HP < enemy.maxShieldHP){
        shieldWidth -= barWidth * ((enemy.maxShieldHP - enemy.shield.HP) / totalMaxHealth);
    }

    // Set start position to align with widths
    const fleshStart = 383;
    const armorStart = fleshStart + fleshWidth;
    const shieldStart = armorStart + armorWidth;

    // Create health bar object for easy access
    const fullBar = {
        flesh: {
            start: fleshStart,
            width: fleshWidth,
            colour: fleshColour
        },
        armor: {
            start: armorStart,
            width: armorWidth,
            colour: armorColour
        },
        shield: {
            start: shieldStart,
            width: shieldWidth,
            colour: shieldColour
        }
    };

    return fullBar;
}

/**
 * This function creates a canvas and generates the provided enemy onto it.
 * @param {EnemyFab} enemy 
 * @returns {AttachmentBuilder}
 */
async function createNewEnemyImage(enemy){
    const canvas = Canvas.createCanvas(700, 300);
    const ctx = canvas.getContext('2d');

    // const enemyRef = loadEnemyFab(enemy); // TEMP Change Variable names
    // const hasImage = (interaction) ? pngCheck(enemy) : crossRefPngCheck(enemy);
    // TIME LOG
    //const totStart = new Date().getTime();

    const hasImage = crossRefPngCheck(enemy);
    
    // TIME LOG
    //const bLoadStart = new Date().getTime();

    const background = await Canvas.loadImage('./events/Models/json_prefabs/weapon_png/Background.jpg');
    let enemyPng;
    if (hasImage) enemyPng = await Canvas.loadImage(enemy.imageCheck.pngRef);

    // DRAW
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    if (hasImage) ctx.drawImage(enemyPng, 410, 65, 190, 190);

    // TIME LOG
    //const bLoadEnd = new Date().getTime();
    //console.log(`Background/Enemy Load + Draw Time: ${bLoadEnd - bLoadStart}ms`);

    ctx.fillStyle = 'white';

    // NAME
    ctx.font = '25px sans-serif';
    ctx.fillText(`${enemy.name}`, 25, 75);

    // LEVEL
    ctx.fillText(`Level ${enemy.level}`, 460, 60);

    /** This method splits given text into words, then reconstructs the words into sentences making sure to
     *  fix them against the given conditions, returning a full array of separte lines.
     * 
     * @param {string} text
     * @returns {string[]}
     */
    const getLines = (text) => {
        let words = text.split(" ");
        let lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            let word = words[i];
            let width = ctx.measureText(currentLine + " " + word).width;
            if (width < (canvas.width - 275)) { currentLine += " " + word; } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    };

    /** This method finds the longest line given, and using its pixel width updates the global font size to 
     *  be applied to the resulting description
     * 
     * @param {string[]} lines
     * @returns {number}
     */
    const applyText = (lines) => {
        const longestLine = lines.reduce((longest, line) => {
            return (ctx.measureText(longest).width || 0) > ctx.measureText(line).width ? longest : line;
        }, '');

        let fontSize = 30;

        do {
            ctx.font = `${fontSize -= 10}px sans-serif`;
        } while (ctx.measureText(longestLine).width > canvas.width - 275)

        return ctx.font;
    };

    // DESCRIPTION
    let descBottom;
    const lines = getLines(enemy.description);
    ctx.font = applyText(lines);
    for (let i = 0; i < lines.length; i++) {
        let j = 110 + (i * 25);
        ctx.fillText(lines[i], 25, j);
        descBottom = j;
    }

    descBottom += 25;
    ctx.font = '20px sans-serif';

    // STATUS EFFECTS
    /**
     *      == Arange in a grid ==
     * 
     *      Status Effects:
     *      J____________________
     *      |_Type_|_Type_|_Type_|
     *      |_Type_|_Type_|_Type_|
     *      |_Type_|_Type_|_Type_|
     *                           => I
     *      Colour type text 
     */
    const loadEffectText = (effects) => {
        ctx.fillText('Active Effects: ', 25, descBottom);

        const maxRows = Math.ceil(effects.length / 3);

        let lines = new Array(maxRows);

        let effectPos = 0;
        for (let i = 0; i < maxRows; i++){
            let curLineWidth = 25, curLine = "";
            lines[i] = new Array((effects.length - effectPos > 3) ? 3 : effects.length - effectPos);
            for (let j = 0; j < 3; j++){
                // Measure current row length
                curLine = (lines[i]?.length > 0) ? lines[i].join(" | ") : "";
                curLineWidth += (curLine === "") ? 0 : ctx.measureText(curLine + " | ").width;

                const colourObj = statusColourMatch.get(effects[effectPos].Type);
                ctx.fillStyle = colourObj.colour;
                ctx.fillText(effects[effectPos].Type, curLineWidth, (descBottom + 25) + (i * 25));

                lines[i][j] = effects[effectPos].Type;
                effectPos++;
                if (effectPos === effects.length) break;
            }
        }
    };

    const statusTxt = (enemy.activeEffects.length > 0) 
    ? loadEffectText(enemy.activeEffects) : "No Status Effects!";

    ctx.font = '20px sans-serif';
    ctx.fillStyle = 'white';
    if (statusTxt === "No Status Effects!") ctx.fillText(statusTxt, 25, descBottom);

    // HEALTH
    ctx.drawImage(await Canvas.loadImage(healthBarPng), 375, 200, 225, 160);
    const hpBar = createHealthBar(enemy);

    ctx.fillStyle = hpBar.flesh.colour;
    ctx.fillRect(hpBar.flesh.start, 275, hpBar.flesh.width, 14);

    ctx.fillStyle = hpBar.armor.colour;
    ctx.fillRect(hpBar.armor.start, 275, hpBar.armor.width, 14);

    ctx.fillStyle = hpBar.shield.colour;
    ctx.fillRect(hpBar.shield.start, 275, hpBar.shield.width, 14);

    // TIME LOG
    //const encodeStart = new Date().getTime();

    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'enemy-display.png' });
    
    // TIME LOG
    //const encodeEnd = new Date().getTime();
    //console.log(`Canvas Encoding Time: ${encodeEnd - encodeStart}ms`);

    // TIME LOG
    //const totEnd = new Date().getTime();
    //console.log(`Total Load + Draw Time: ${totEnd - totStart}ms`);
    return attachment;
}

//async function displayEWpic(interaction, enemy, combat) {
//    const canvas = Canvas.createCanvas(700, 300);
//    const context = canvas.getContext('2d');

//    const background = await Canvas.loadImage('./events/Models/json_prefabs/weapon_png/Background.jpg');

//    const getLines = async (canvas, text) => {
//        const context = canvas.getContext('2d');

//        var words = text.split(" ");
//        var lines = [];
//        var currentLine = words[0];

//        for (var i = 1; i < words.length; i++) {
//            var word = words[i];
//            var width = context.measureText(currentLine + " " + word).width;
//            if (width < (canvas.width - 275)) {
//                currentLine += " " + word;
//            } else {
//                lines.push(currentLine);
//                currentLine = word;
//            }
//        }
//        lines.push(currentLine);
//        console.log('Text Finished and acquired');
//        return lines;
//    }

//    // Pass the entire Canvas object because you'll need access to its width and context
//    const applyText = async(canvas, text) => {
//        const context = canvas.getContext('2d');

//        // Declare a base size of the font
//        let fontSize = 30;

//        do {
//            // Assign the font to the context and decrement it so it can be measured again
//            context.font = `${fontSize -= 10}px sans-serif`;
//            // Compare pixel width of the text to the canvas minus the approximate avatar size
//        } while (context.measureText(text).width > canvas.width - 275);

//        // Return the result to use in the actual canvas
//        console.log('Text Formating Completed!');
//        return context.font;
//    };

//    // This uses the canvas dimensions to stretch the image onto the entire canvas
//    context.drawImage(background, 0, 0, canvas.width, canvas.height);
//    console.log('Background Added!');

//    let picked;
//    let constkey;
//    if (enemy.constKey) constkey = enemy.constKey;
//    if (enemy.constkey) constkey = enemy.constkey;
//    for (var i = 0; i < enemyList.length; i++) {
//        if (enemyList[i].ConstKey === constkey) {
//            //enemy found!
//            picked = enemyList[i];
//        } else {/** not found keep looking*/ }
//    }
//    const enemyPic = await Canvas.loadImage(picked.PngRef);

//    if (combat === true) {
        

//        // Displays Enemy name
//        context.font = '25px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Name: ${picked.Name}`, 25, 95);

//        // Displays Description text, actual description gets formatted and displayed below this
//        context.font = '20px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Description: `, 25, 120);

//        // Displays Description value
//        const lines = await getLines(canvas, picked.Description);
//        console.log(lines);
//        if (lines.length > 4) {
//            //console.log('More than 4 lines\n');
//            for (var L = 0; L < lines.length; L++) {
//                var y = (150 + (L * 25));
//                context.font = await applyText(canvas, lines[L]);
//                context.fillStyle = 'white';
//                context.fillText(lines[L], 25, y);
//            }
//            console.log('text added');//announce text success
//        } else if (lines.length > 1) {
//            //console.log('Less than 4 more than 1 line\n');
//            context.font = '20px sans-serif';
//            context.fillStyle = 'white';
//            for (var l = 0; l < lines.length; l++) {
//                var y = (150 + (l * 25));
//                context.fillText(lines[l], 25, y);
//            }
//            console.log('text added');//announce text success
//        } else {
//            context.font = await applyText(canvas, picked.Description);
//            context.fillStyle = 'white';
//            context.fillText(picked.Description, 25, 150);
//            console.log('text added');//announce text success
//        }

//        // Displays Enemy Defence
//        context.font = '20px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Defence: ${enemy.defence}`, 25, 250);

//        // Displays Enemy Weakness
//        context.font = '20px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Weak To: ${picked.WeakTo}`, 25, 275);

//        // Displays Enemy Level
//        context.font = '25px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Level ${enemy.level}`, 460, 70);

//        // Displays Enemy Health
//        context.font = '25px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`HP ${enemy.health}`, 460, 285);

//        // Move the image downwards vertically and constrain its height to 200, so that it's square
//        context.drawImage(enemyPic, 410, 75, 190, 190);

//        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'enemy-display.png' });

//        return attachment;
//    } else {
//        //const enemyPic = await Canvas.loadImage(enemy.PngRef);

//        // Displays Enemy name
//        context.font = '25px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Name: ${enemy.Name}`, 25, 95);

//        // Displays Description text, actual description gets formatted and displayed below this
//        context.font = '20px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Description: `, 25, 120);

//        // Displays Description value
//        const lines = await getLines(canvas, enemy.Description);
//        console.log(lines);
//        if (lines.length > 4) {
//            //console.log('More than 4 lines\n');
//            for (var L = 0; L < lines.length; L++) {
//                var y = (150 + (L * 25));
//                context.font = await applyText(canvas, lines[L]);
//                context.fillStyle = 'white';
//                context.fillText(lines[L], 25, y);
//            }
//            console.log('text added');//announce text success
//        } else if (lines.length > 1) {
//            //console.log('Less than 4 more than 1 line\n');
//            context.font = '20px sans-serif';
//            context.fillStyle = 'white';
//            for (var l = 0; l < lines.length; l++) {
//                var y = (150 + (l * 25));
//                context.fillText(lines[l], 25, y);
//            }
//            console.log('text added');//announce text success
//        } else {
//            context.font = await applyText(canvas, enemy.Description);
//            context.fillStyle = 'white';
//            context.fillText(enemy.Description, 25, 150);
//            console.log('text added');//announce text success
//        }

//        // Displays Enemy Defence
//        context.font = '20px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Defence: ${enemy.Defence}`, 25, 250);

//        // Displays Enemy Weakness
//        context.font = '20px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Weak To: ${enemy.WeakTo}`, 25, 275);

//        // Displays Enemy Level
//        context.font = '25px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Level ${enemy.Level}`, 460, 70);

//        // Displays Enemy Health
//        context.font = '25px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`HP ${enemy.Health}`, 460, 285);

//        // Move the image downwards vertically and constrain its height to 200, so that it's square
//        context.drawImage(enemyPic, 410, 75, 190, 190);

//        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'enemy-display.png' });

//        interaction.followUp({ files: [attachment] }).then(async enemyCanvas => setTimeout(() => {
//            enemyCanvas.delete();
//        }, 60000));
//    }
//}

//async function displayEWOpic(interaction, enemy, combat) {
//    const canvas = Canvas.createCanvas(700, 300);
//    const context = canvas.getContext('2d');

//    const background = await Canvas.loadImage('./events/Models/json_prefabs/weapon_png/Background.jpg');

//    const getLines = async (canvas, text) => {
//        const context = canvas.getContext('2d');

//        var words = text.split(" ");
//        var lines = [];
//        var currentLine = words[0];

//        for (var i = 1; i < words.length; i++) {
//            var word = words[i];
//            var width = context.measureText(currentLine + " " + word).width;
//            if (width < (canvas.width - 250)) {
//                currentLine += " " + word;
//            } else {
//                lines.push(currentLine);
//                currentLine = word;
//            }
//        }
//        lines.push(currentLine);
//        console.log('Text Finished and acquired');
//        return lines;
//    }

//    // Pass the entire Canvas object because you'll need access to its width and context
//    const applyText = async (canvas, text) => {
//        const context = canvas.getContext('2d');

//        // Declare a base size of the font
//        let fontSize = 30;

//        do {
//            // Assign the font to the context and decrement it so it can be measured again
//            context.font = `${fontSize -= 10}px sans-serif`;
//            // Compare pixel width of the text to the canvas minus the approximate avatar size
//        } while (context.measureText(text).width > canvas.width - 250);

//        // Return the result to use in the actual canvas
//        console.log('Text Formating Completed!');
//        return context.font;
//    };

//    // This uses the canvas dimensions to stretch the image onto the entire canvas
//    context.drawImage(background, 0, 0, canvas.width, canvas.height);
//    console.log('Background Added!');


//    if (combat === true) {
//        let picked;
//        let constkey;
//        if (enemy.constKey) constkey = enemy.constKey;
//        if (enemy.constkey) constkey = enemy.constkey;
//        if (enemy.constkey === 0) constkey = 0;
//        for (var i = 0; i < enemyList.length; i++) {
//            if (enemyList[i].ConstKey === constkey) {
//                //enemy found!
//                picked = enemyList[i];
//            } else {/** not found keep looking*/ }
//        }
//        // Displays Enemy name
//        context.font = '25px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Name: ${picked.Name}`, 25, 95);

//        // Displays Description text, actual description gets formatted and displayed below this
//        context.font = '20px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Description: `, 25, 120);

//        // Displays Description value
//        const lines = await getLines(canvas, picked.Description);
//        console.log(lines);
//        if (lines.length > 4) {
//            //console.log('More than 4 lines\n');
//            for (var L = 0; L < lines.length; L++) {
//                var y = (150 + (L * 25));
//                context.font = await applyText(canvas, lines[L]);
//                context.fillStyle = 'white';
//                context.fillText(lines[L], 25, y);
//            }
//            console.log('text added');//announce text success
//        } else if (lines.length > 1) {
//           // console.log('Less than 4 more than 1 line\n');
//            context.font = '20px sans-serif';
//            context.fillStyle = 'white';
//            for (var l = 0; l < lines.length; l++) {
//                var y = (150 + (l * 25));
//                context.fillText(lines[l], 25, y);
//            }
//            console.log('text added');//announce text success
//        } else {
//            context.font = await applyText(canvas, picked.Description);
//            context.fillStyle = 'white';
//            context.fillText(picked.Description, 25, 150);
//            console.log('text added');//announce text success
//        }

//        // Displays Enemy Defence
//        context.font = '20px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Defence: ${enemy.defence}`, 25, 250);

//        // Displays Enemy Weakness
//        context.font = '20px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Weak To: ${picked.WeakTo}`, 25, 275);

//        // Displays Enemy Level
//        context.font = '25px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Level ${enemy.level}`, 460, 70);

//        // Displays Enemy Health
//        context.font = '25px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`HP ${enemy.health}`, 460, 285);

//        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'enemy-display.png' });

//        return attachment;
//    } else {
//        // Displays Enemy name
//        context.font = '25px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Name: ${enemy.Name}`, 25, 95);

//        // Displays Description text, actual description gets formatted and displayed below this
//        context.font = '20px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Description: `, 25, 120);

//        // Displays Description value
//        const lines = await getLines(canvas, enemy.Description);
//        console.log(lines);
//        if (lines.length > 4) {
//            //console.log('More than 4 lines\n');
//            for (var L = 0; L < lines.length; L++) {
//                var y = (150 + (L * 25));
//                context.font = await applyText(canvas, lines[L]);
//                context.fillStyle = 'white';
//                context.fillText(lines[L], 25, y);
//            }
//            console.log('text added');//announce text success
//        } else if (lines.length > 1) {
//           // console.log('Less than 4 more than 1 line\n');
//            context.font = '20px sans-serif';
//            context.fillStyle = 'white';
//            for (var l = 0; l < lines.length; l++) {
//                var y = (150 + (l * 25));
//                context.fillText(lines[l], 25, y);
//            }
//            console.log('text added');//announce text success
//        } else {
//            context.font = await applyText(canvas, enemy.Description);
//            context.fillStyle = 'white';
//            context.fillText(enemy.Description, 25, 150);
//            console.log('text added');//announce text success
//        }

//        // Displays Enemy Defence
//        context.font = '20px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Defence: ${enemy.Defence}`, 25, 250);

//        // Displays Enemy Weakness
//        context.font = '20px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Weak To: ${enemy.WeakTo}`, 25, 275);

//        // Displays Enemy Level
//        context.font = '25px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`Level ${enemy.Level}`, 460, 70);

//        // Displays Enemy Health
//        context.font = '25px sans-serif';
//        context.fillStyle = 'white';
//        context.fillText(`HP ${enemy.Health}`, 460, 285);

//        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'enemy-display.png' });

//        interaction.followUp({ files: [attachment] }).then(async enemyCanvas => setTimeout(() => {
//            enemyCanvas.delete();
//        }, 60000));
//    }
//}

async function displayBossPic(enemy) {
    const canvas = Canvas.createCanvas(700, 300);
    const context = canvas.getContext('2d');

    const background = await Canvas.loadImage('./events/Models/json_prefabs/weapon_png/Dungeon-background.jpg');

    // This uses the canvas dimensions to stretch the image onto the entire canvas
    context.drawImage(background, 0, 0, canvas.width, canvas.height);
    console.log('Background Added!');

    const foundBoss = bossList.filter(boss => boss.ConstKey === enemy.constkey);
    const bossRef = foundBoss[0];

    const enemyPic = await Canvas.loadImage(bossRef.PngRef);

    // Displays Enemy name
    context.font = '25px sans-serif';
    context.fillStyle = 'white';
    context.fillText(`Name: ${bossRef.Name}`, 25, 75);

    // Displays Enemy Defence
    context.font = '20px sans-serif';
    context.fillStyle = 'white';
    context.fillText(`Defence: ${enemy.defence}`, 25, 250);

    // Displays Enemy Weakness
    context.font = '20px sans-serif';
    context.fillStyle = 'white';
    context.fillText(`Weak To: ${bossRef.WeakTo}`, 25, 275);

    // Displays Enemy Level
    context.font = '25px sans-serif';
    context.fillStyle = 'white';
    context.fillText(`Level ${enemy.level}`, 460, 70);

    // Displays Enemy Health
    context.font = '25px sans-serif';
    context.fillStyle = 'white';
    context.fillText(`HP ${enemy.health}`, 460, 295);

    // Move the image downwards vertically and constrain its height to 200, so that it's square
    context.drawImage(enemyPic, 410, 75, 215, 200);

    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'enemy-display.png' });

    return attachment;
    
}

module.exports = {  displayBossPic, createEnemyDisplay, createNewEnemyImage };
