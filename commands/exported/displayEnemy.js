const { AttachmentBuilder } = require('discord.js');

const Canvas = require('@napi-rs/canvas');

const enemyList = require('../../events/Models/json_prefabs/enemyList.json');
const bossList = require('../../events/Models/json_prefabs/enemyList.json');

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

async function displayEWpic(interaction, enemy, combat) {
    const canvas = Canvas.createCanvas(700, 300);
    const context = canvas.getContext('2d');

    const background = await Canvas.loadImage('./events/Models/json_prefabs/weapon_png/Background.jpg');

    const getLines = async (canvas, text) => {
        const context = canvas.getContext('2d');

        var words = text.split(" ");
        var lines = [];
        var currentLine = words[0];

        for (var i = 1; i < words.length; i++) {
            var word = words[i];
            var width = context.measureText(currentLine + " " + word).width;
            if (width < (canvas.width - 275)) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        console.log('Text Finished and acquired');
        return lines;
    }

    // Pass the entire Canvas object because you'll need access to its width and context
    const applyText = async(canvas, text) => {
        const context = canvas.getContext('2d');

        // Declare a base size of the font
        let fontSize = 30;

        do {
            // Assign the font to the context and decrement it so it can be measured again
            context.font = `${fontSize -= 10}px sans-serif`;
            // Compare pixel width of the text to the canvas minus the approximate avatar size
        } while (context.measureText(text).width > canvas.width - 275);

        // Return the result to use in the actual canvas
        console.log('Text Formating Completed!');
        return context.font;
    };

    // This uses the canvas dimensions to stretch the image onto the entire canvas
    context.drawImage(background, 0, 0, canvas.width, canvas.height);
    console.log('Background Added!');


    if (combat === true) {
        let picked;
        let constkey;
        if (enemy.constKey) constkey = enemy.constKey;
        if (enemy.constkey) constkey = enemy.constkey;
        for (var i = 0; i < enemyList.length; i++) {
            if (enemyList[i].ConstKey === constkey) {
                //enemy found!
                picked = enemyList[i];
            } else {/** not found keep looking*/ }
        }
        const enemyPic = await Canvas.loadImage(picked.PngRef);

        // Displays Enemy name
        context.font = '25px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Name: ${picked.Name}`, 25, 95);

        // Displays Description text, actual description gets formatted and displayed below this
        context.font = '20px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Description: `, 25, 120);

        // Displays Description value
        const lines = await getLines(canvas, picked.Description);
        console.log(lines);
        if (lines.length > 4) {
            //console.log('More than 4 lines\n');
            for (var L = 0; L < lines.length; L++) {
                var y = (150 + (L * 25));
                context.font = await applyText(canvas, lines[L]);
                context.fillStyle = 'white';
                context.fillText(lines[L], 25, y);
            }
            console.log('text added');//announce text success
        } else if (lines.length > 1) {
            //console.log('Less than 4 more than 1 line\n');
            context.font = '20px sans-serif';
            context.fillStyle = 'white';
            for (var l = 0; l < lines.length; l++) {
                var y = (150 + (l * 25));
                context.fillText(lines[l], 25, y);
            }
            console.log('text added');//announce text success
        } else {
            context.font = await applyText(canvas, picked.Description);
            context.fillStyle = 'white';
            context.fillText(picked.Description, 25, 150);
            console.log('text added');//announce text success
        }

        // Displays Enemy Defence
        context.font = '20px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Defence: ${enemy.defence}`, 25, 250);

        // Displays Enemy Weakness
        context.font = '20px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Weak To: ${picked.WeakTo}`, 25, 275);

        // Displays Enemy Level
        context.font = '25px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Level ${enemy.level}`, 460, 70);

        // Displays Enemy Health
        context.font = '25px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`HP ${enemy.health}`, 460, 285);

        // Move the image downwards vertically and constrain its height to 200, so that it's square
        context.drawImage(enemyPic, 410, 75, 190, 190);

        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'enemy-display.png' });

        return attachment;
    } else {
        const enemyPic = await Canvas.loadImage(enemy.PngRef);

        // Displays Enemy name
        context.font = '25px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Name: ${enemy.Name}`, 25, 95);

        // Displays Description text, actual description gets formatted and displayed below this
        context.font = '20px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Description: `, 25, 120);

        // Displays Description value
        const lines = await getLines(canvas, enemy.Description);
        console.log(lines);
        if (lines.length > 4) {
            //console.log('More than 4 lines\n');
            for (var L = 0; L < lines.length; L++) {
                var y = (150 + (L * 25));
                context.font = await applyText(canvas, lines[L]);
                context.fillStyle = 'white';
                context.fillText(lines[L], 25, y);
            }
            console.log('text added');//announce text success
        } else if (lines.length > 1) {
            //console.log('Less than 4 more than 1 line\n');
            context.font = '20px sans-serif';
            context.fillStyle = 'white';
            for (var l = 0; l < lines.length; l++) {
                var y = (150 + (l * 25));
                context.fillText(lines[l], 25, y);
            }
            console.log('text added');//announce text success
        } else {
            context.font = await applyText(canvas, enemy.Description);
            context.fillStyle = 'white';
            context.fillText(enemy.Description, 25, 150);
            console.log('text added');//announce text success
        }

        // Displays Enemy Defence
        context.font = '20px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Defence: ${enemy.Defence}`, 25, 250);

        // Displays Enemy Weakness
        context.font = '20px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Weak To: ${enemy.WeakTo}`, 25, 275);

        // Displays Enemy Level
        context.font = '25px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Level ${enemy.Level}`, 460, 70);

        // Displays Enemy Health
        context.font = '25px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`HP ${enemy.Health}`, 460, 285);

        // Move the image downwards vertically and constrain its height to 200, so that it's square
        context.drawImage(enemyPic, 410, 75, 190, 190);

        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'enemy-display.png' });

        interaction.followUp({ files: [attachment] }).then(async enemyCanvas => setTimeout(() => {
            enemyCanvas.delete();
        }, 60000));
    }
}

async function displayEWOpic(interaction, enemy, combat) {
    const canvas = Canvas.createCanvas(700, 300);
    const context = canvas.getContext('2d');

    const background = await Canvas.loadImage('./events/Models/json_prefabs/weapon_png/Background.jpg');

    const getLines = async (canvas, text) => {
        const context = canvas.getContext('2d');

        var words = text.split(" ");
        var lines = [];
        var currentLine = words[0];

        for (var i = 1; i < words.length; i++) {
            var word = words[i];
            var width = context.measureText(currentLine + " " + word).width;
            if (width < (canvas.width - 250)) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        console.log('Text Finished and acquired');
        return lines;
    }

    // Pass the entire Canvas object because you'll need access to its width and context
    const applyText = async (canvas, text) => {
        const context = canvas.getContext('2d');

        // Declare a base size of the font
        let fontSize = 30;

        do {
            // Assign the font to the context and decrement it so it can be measured again
            context.font = `${fontSize -= 10}px sans-serif`;
            // Compare pixel width of the text to the canvas minus the approximate avatar size
        } while (context.measureText(text).width > canvas.width - 250);

        // Return the result to use in the actual canvas
        console.log('Text Formating Completed!');
        return context.font;
    };

    // This uses the canvas dimensions to stretch the image onto the entire canvas
    context.drawImage(background, 0, 0, canvas.width, canvas.height);
    console.log('Background Added!');


    if (combat === true) {
        let picked;
        let constkey;
        if (enemy.constKey) constkey = enemy.constKey;
        if (enemy.constkey) constkey = enemy.constkey;
        for (var i = 0; i < enemyList.length; i++) {
            if (enemyList[i].ConstKey === constkey) {
                //enemy found!
                picked = enemyList[i];
            } else {/** not found keep looking*/ }
        }
        // Displays Enemy name
        context.font = '25px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Name: ${picked.Name}`, 25, 95);

        // Displays Description text, actual description gets formatted and displayed below this
        context.font = '20px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Description: `, 25, 120);

        // Displays Description value
        const lines = await getLines(canvas, picked.Description);
        console.log(lines);
        if (lines.length > 4) {
            //console.log('More than 4 lines\n');
            for (var L = 0; L < lines.length; L++) {
                var y = (150 + (L * 25));
                context.font = await applyText(canvas, lines[L]);
                context.fillStyle = 'white';
                context.fillText(lines[L], 25, y);
            }
            console.log('text added');//announce text success
        } else if (lines.length > 1) {
           // console.log('Less than 4 more than 1 line\n');
            context.font = '20px sans-serif';
            context.fillStyle = 'white';
            for (var l = 0; l < lines.length; l++) {
                var y = (150 + (l * 25));
                context.fillText(lines[l], 25, y);
            }
            console.log('text added');//announce text success
        } else {
            context.font = await applyText(canvas, picked.Description);
            context.fillStyle = 'white';
            context.fillText(picked.Description, 25, 150);
            console.log('text added');//announce text success
        }

        // Displays Enemy Defence
        context.font = '20px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Defence: ${enemy.defence}`, 25, 250);

        // Displays Enemy Weakness
        context.font = '20px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Weak To: ${picked.WeakTo}`, 25, 275);

        // Displays Enemy Level
        context.font = '25px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Level ${enemy.level}`, 460, 70);

        // Displays Enemy Health
        context.font = '25px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`HP ${enemy.health}`, 460, 285);

        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'enemy-display.png' });

        return attachment;
    } else {
        // Displays Enemy name
        context.font = '25px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Name: ${enemy.Name}`, 25, 95);

        // Displays Description text, actual description gets formatted and displayed below this
        context.font = '20px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Description: `, 25, 120);

        // Displays Description value
        const lines = await getLines(canvas, enemy.Description);
        console.log(lines);
        if (lines.length > 4) {
            //console.log('More than 4 lines\n');
            for (var L = 0; L < lines.length; L++) {
                var y = (150 + (L * 25));
                context.font = await applyText(canvas, lines[L]);
                context.fillStyle = 'white';
                context.fillText(lines[L], 25, y);
            }
            console.log('text added');//announce text success
        } else if (lines.length > 1) {
           // console.log('Less than 4 more than 1 line\n');
            context.font = '20px sans-serif';
            context.fillStyle = 'white';
            for (var l = 0; l < lines.length; l++) {
                var y = (150 + (l * 25));
                context.fillText(lines[l], 25, y);
            }
            console.log('text added');//announce text success
        } else {
            context.font = await applyText(canvas, enemy.Description);
            context.fillStyle = 'white';
            context.fillText(enemy.Description, 25, 150);
            console.log('text added');//announce text success
        }

        // Displays Enemy Defence
        context.font = '20px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Defence: ${enemy.Defence}`, 25, 250);

        // Displays Enemy Weakness
        context.font = '20px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Weak To: ${enemy.WeakTo}`, 25, 275);

        // Displays Enemy Level
        context.font = '25px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Level ${enemy.Level}`, 460, 70);

        // Displays Enemy Health
        context.font = '25px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`HP ${enemy.Health}`, 460, 285);

        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'enemy-display.png' });

        interaction.followUp({ files: [attachment] }).then(async enemyCanvas => setTimeout(() => {
            enemyCanvas.delete();
        }, 60000));
    }
}

async function displayBossPic(bossRef, enemy, combat) {
    const canvas = Canvas.createCanvas(700, 300);
    const context = canvas.getContext('2d');

    const background = await Canvas.loadImage('./events/Models/json_prefabs/weapon_png/Dungeon-background.jpg');

    const getLines = async (canvas, text) => {
        const context = canvas.getContext('2d');

        var words = text.split(" ");
        var lines = [];
        var currentLine = words[0];

        for (var i = 1; i < words.length; i++) {
            var word = words[i];
            var width = context.measureText(currentLine + " " + word).width;
            if (width < (canvas.width - 275)) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        console.log('Text Finished and acquired');
        return lines;
    }

    // Pass the entire Canvas object because you'll need access to its width and context
    const applyText = async (canvas, text) => {
        const context = canvas.getContext('2d');

        // Declare a base size of the font
        let fontSize = 30;

        do {
            // Assign the font to the context and decrement it so it can be measured again
            context.font = `${fontSize -= 10}px sans-serif`;
            // Compare pixel width of the text to the canvas minus the approximate avatar size
        } while (context.measureText(text).width > canvas.width - 275);

        // Return the result to use in the actual canvas
        console.log('Text Formating Completed!');
        return context.font;
    };

    // This uses the canvas dimensions to stretch the image onto the entire canvas
    context.drawImage(background, 0, 0, canvas.width, canvas.height);
    console.log('Background Added!');


    if (combat === true) {
        var picked = bossRef;
        
        const enemyPic = await Canvas.loadImage(picked.PngRef);

        // Displays Enemy name
        context.font = '25px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Name: ${enemy.name}`, 25, 75);

        // Displays Description text, actual description gets formatted and displayed below this
        //context.font = '20px sans-serif';
        //context.fillStyle = 'white';
        //context.fillText(`Description: `, 25, 120);

        // Displays Description value
        //const lines = await getLines(canvas, enemy.description);
        //console.log(lines);
        //if (lines.length > 4) {
        //    //console.log('More than 4 lines\n');
        //    for (var L = 0; L < lines.length; L++) {
        //        var y = (150 + (L * 25));
        //        context.font = await applyText(canvas, lines[L]);
        //        context.fillStyle = 'white';
        //        context.fillText(lines[L], 25, y);
        //    }
        //    console.log('text added');//announce text success
        //} else if (lines.length > 1) {
        //    //console.log('Less than 4 more than 1 line\n');
        //    context.font = '20px sans-serif';
        //    context.fillStyle = 'white';
        //    for (var l = 0; l < lines.length; l++) {
        //        var y = (150 + (l * 25));
        //        context.fillText(lines[l], 25, y);
        //    }
        //    console.log('text added');//announce text success
        //} else {
        //    context.font = await applyText(canvas, enemy.description);
        //    context.fillStyle = 'white';
        //    context.fillText(enemy.description, 25, 150);
        //    console.log('text added');//announce text success
        //}

        // Displays Enemy Defence
        context.font = '20px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Defence: ${enemy.defence}`, 25, 250);

        // Displays Enemy Weakness
        context.font = '20px sans-serif';
        context.fillStyle = 'white';
        context.fillText(`Weak To: ${enemy.weakto}`, 25, 275);

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
}

module.exports = { displayEWpic, displayEWOpic, displayBossPic };
