const { AttachmentBuilder } = require('discord.js');

const Canvas = require('@napi-rs/canvas');

/** 0-3 */
const roofTiles =
    [
        './events/Models/json_prefabs/Building-Textures/roof-tile-one.png',
        './events/Models/json_prefabs/Building-Textures/roof-tile-two.png',
        './events/Models/json_prefabs/Building-Textures/roof-tile-three.png',
        './events/Models/json_prefabs/Building-Textures/roof-tile-four.png'
    ];

/** 0-3 */
const wallWoodTiles =
    [
        './events/Models/json_prefabs/Building-Textures/wood-wall-one.png',
        './events/Models/json_prefabs/Building-Textures/wood-wall-two.png',
        './events/Models/json_prefabs/Building-Textures/wood-wall-three.png',
        './events/Models/json_prefabs/Building-Textures/wood-wall-four.png'
    ];

/** 4-6 */
const wallStoneTiles =
    [
        './events/Models/json_prefabs/Building-Textures/stone-wall-one.png',
        './events/Models/json_prefabs/Building-Textures/stone-wall-two.png',
        './events/Models/json_prefabs/Building-Textures/stone-wall-three.png'
    ];

/** 0-6 */
const allWallTiles = wallWoodTiles.concat(wallStoneTiles);

/** 0-11 */
const doorStyles =
    [
        './events/Models/json_prefabs/Building-Textures/door-style-one.png',
        './events/Models/json_prefabs/Building-Textures/door-style-two.png',
        './events/Models/json_prefabs/Building-Textures/door-style-three.png',
        './events/Models/json_prefabs/Building-Textures/door-style-four.png',
        './events/Models/json_prefabs/Building-Textures/door-style-five.png',
        './events/Models/json_prefabs/Building-Textures/door-style-six.png',
        './events/Models/json_prefabs/Building-Textures/door-style-seven.png',
        './events/Models/json_prefabs/Building-Textures/door-style-eight.png',
        './events/Models/json_prefabs/Building-Textures/door-style-nine.png',
        './events/Models/json_prefabs/Building-Textures/door-style-ten.png',
        './events/Models/json_prefabs/Building-Textures/door-style-eleven.png',
        './events/Models/json_prefabs/Building-Textures/door-style-twelve.png'
    ];

/** 0-3 */
const windowStyles =
    [
        './events/Models/json_prefabs/Building-Textures/fancy-window-one.png',
        './events/Models/json_prefabs/Building-Textures/fancy-window-two.png',
        './events/Models/json_prefabs/Building-Textures/fancy-window-three.png',
        './events/Models/json_prefabs/Building-Textures/fancy-window-four.png'
    ];

/** 0-4 */
const backgroundStyles =
    [
        './events/Models/json_prefabs/Building-Textures/background-evil-one.png',
        './events/Models/json_prefabs/Building-Textures/background-evil-two.png',
        './events/Models/json_prefabs/Building-Textures/background-dusty.png',
        './events/Models/json_prefabs/Building-Textures/background-forest-one.png',
        './events/Models/json_prefabs/Building-Textures/background-hilly-one.png',
        './events/Models/json_prefabs/Building-Textures/background-forest-one.png',
        './events/Models/json_prefabs/Building-Textures/background-hilly-one.png'
    ];

/** 0-5 */
const foregroundStyles =
    [
        './events/Models/json_prefabs/Building-Textures/ground-green-grass.png',
        './events/Models/json_prefabs/Building-Textures/ground-black-stone.png',
        './events/Models/json_prefabs/Building-Textures/ground-blue-stone.png',
        './events/Models/json_prefabs/Building-Textures/ground-brown-stone.png',
        './events/Models/json_prefabs/Building-Textures/ground-green-grass-two.png',
        './events/Models/json_prefabs/Building-Textures/ground-icy.png'
    ];

/** 0-3 */
const woodStructures =
    [
        './events/Models/json_prefabs/Building-Textures/wood-struct-square-closed.png',
        './events/Models/json_prefabs/Building-Textures/wood-struct-square-open.png',
        './events/Models/json_prefabs/Building-Textures/wood-struct-tbeam.png',
        './events/Models/json_prefabs/Building-Textures/wood-struct-ladder.png'
    ];

/** 0-1 */
const largeWoodStructures =
    [
        './events/Models/json_prefabs/Building-Textures/wood-struct-large-foundation.png',
        './events/Models/json_prefabs/Building-Textures/wood-struct-large-xlatice.png'
    ];

/** 0-4 */
const bushObjects =
    [
        './events/Models/json_prefabs/Building-Textures/foliage-bush-large-one.png',
        './events/Models/json_prefabs/Building-Textures/foliage-bush-large-two.png',
        './events/Models/json_prefabs/Building-Textures/foliage-bush-large-three.png',
        './events/Models/json_prefabs/Building-Textures/foliage-bush-small-one.png',
        './events/Models/json_prefabs/Building-Textures/foliage-bush-small-two.png'
    ];

const preLoadArray = (loadingGroup) => {
    let returnArr = [];
    for (const item of loadingGroup) {
        returnArr.push(item);
    }
    return returnArr;
};

const preLoadImages = async (loadingGroup) => {
    let returnArr = [];
    for (const item of loadingGroup) {
        const loadedImg = await Canvas.loadImage(item);
        returnArr.push(loadedImg);
    }
    return returnArr;
};

async function loadBuilding(buildingRef) {

    /**     buildingRef CONTAINS:
     *          - build_type
     *          - build_style
     *          - background_tex
     *          - foreground_tex
     *          - roof_tex
     *          - wall_tex
     *          - window_tex
     *          - door_tex
     * 
     * */
    const buildType = buildingRef.build_type;

    let returnPng;
    if (buildType === 'house') returnPng = await createPlayerHouse(buildingRef);
    if (buildType === 'grandhall') returnPng = await drawGrandhall(buildingRef);
    if (buildType === 'clergy') returnPng = await drawClergy(buildingRef);


    if (!returnPng) return 'Failure';
    return returnPng;
}

async function createPlayerHouse(buildingRef) {
    const buildStyle = buildingRef.build_style;

    let buildPng;
    if (buildStyle === 1) buildPng = await drawHouseStyleOne(buildingRef);
    if (buildStyle === 2) buildPng = await drawHouseStyleTwo(buildingRef);
    if (buildStyle === 3) buildPng = await drawHouseStyleThree(buildingRef);

    if (!buildPng) return;
    return buildPng;
}

async function drawHouseStyleOne(buildingRef) {
    const canvas = Canvas.createCanvas(800, 700);
    const ctx = canvas.getContext('2d');

    const wallTex = await Canvas.loadImage(allWallTiles[buildingRef.wall_tex - 1]);
    const roofTex = await Canvas.loadImage(roofTiles[buildingRef.roof_tex - 1]);
    const doorStyle = await Canvas.loadImage(doorStyles[buildingRef.door_tex - 1]);
    const windowStyle = await Canvas.loadImage(windowStyles[buildingRef.window_tex - 1]);

    const backgroundTex = await Canvas.loadImage(backgroundStyles[buildingRef.background_tex - 1]);
    const foregroundTex = await Canvas.loadImage(foregroundStyles[buildingRef.foreground_tex - 1]);

    const woodStructTex = await preLoadImages(woodStructures);
    const largeWoodStructTex = await preLoadImages(largeWoodStructures);
    const bushTex = await preLoadImages(bushObjects);

    ctx.drawImage(backgroundTex, 0, 0, 800, 700);
    ctx.drawImage(foregroundTex, 0, 0, 800, 700);

    //type 1
    ctx.fillStyle = 'red';
    ctx.fillRect(65, 150, 670, 500);

    //=====================================
    //ctx.fillStyle = 'red';
    //ctx.fillRect(0, 525, 120, 124);
    ctx.drawImage(bushTex[2], 0, 530, 200, 120);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(0, 525, 120, 124);
    ctx.drawImage(bushTex[1], 600, 530, 250, 120);
    //=====================================

    const tileWall = (tex, maxW, maxH) => {
        for (let i = 1; i < 6; i++) {
            for (let j = 1; j < 15; j++) {
                ctx.drawImage(tex, j * 65, i * 150, 65, 150);
            }
        }
    };

    ctx.beginPath();
    ctx.moveTo(35, 150);
    ctx.lineTo(65, 150);
    ctx.lineTo(65, 650);
    ctx.lineTo(735, 650);
    ctx.lineTo(735, 150);
    ctx.lineTo(765, 150);
    ctx.lineTo(385, 25);
    ctx.clip();
    //ctx.drawImage(wallTex, 65, 150, 670, 500);
    tileWall(wallTex, 670, 500);

    // Canvas size = 800,700 (x, y) || (w, h)

    // x1 = 65
    // y1 = 150

    // x2 = 735
    // y2 = 650

    //=====================================
    //ctx.fillStyle = 'red';
    //ctx.fillRect(150, 365, 120, 124);
    ctx.drawImage(woodStructTex[2], 150, 365, 120, 124);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(150, 365, 120, 124);
    ctx.drawImage(woodStructTex[2], 110, 365, 120, 124);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(150, 365, 120, 124);
    ctx.drawImage(woodStructTex[2], 190, 365, 120, 124);
    //=====================================

    //=====================================
    //ctx.fillStyle = 'red';
    //ctx.fillRect(canvas.width - 260, 365, 120, 124);
    ctx.drawImage(woodStructTex[2], canvas.width - 260, 365, 120, 124);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(canvas.width - 260, 365, 120, 124);
    ctx.drawImage(woodStructTex[2], canvas.width - 220, 365, 120, 124);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(canvas.width - 260, 365, 120, 124);
    ctx.drawImage(woodStructTex[2], canvas.width - 300, 365, 120, 124);
    //=====================================

    //=====================================
    //ctx.fillStyle = 'red';
    //ctx.fillRect(255, 250, 300, 115);
    ctx.drawImage(largeWoodStructTex[1], 0, 250, 175, 120);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(255, 250, 300, 115);
    ctx.drawImage(largeWoodStructTex[1], 254, 250, 302, 120);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(255, 250, 300, 115);
    ctx.drawImage(largeWoodStructTex[1], 635, 250, 175, 120);
    //=====================================

    //=====================================
    //ctx.fillStyle = 'red';
    //ctx.fillRect(65, 485, 275, 165);
    ctx.drawImage(largeWoodStructTex[0], 65, 485, 275, 165);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(471, 485, 275, 165);
    ctx.drawImage(largeWoodStructTex[0], 471, 485, 275, 165);
    //=====================================

    //=====================================
    //ctx.fillStyle = 'red';
    //ctx.fillRect(0, 525, 120, 124);
    ctx.drawImage(bushTex[2], 0, 530, 200, 120);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(0, 525, 120, 124);
    ctx.drawImage(bushTex[1], 600, 530, 250, 120);
    //=====================================

    //ctx.fillStyle = 'red';
    //ctx.fillRect(360, 485, 125, 165);
    ctx.drawImage(doorStyle, 335, 465, 135, 185);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(150, 195, 120, 175);
    ctx.drawImage(windowStyle, 150, 195, 120, 175);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(canvas.width - 260, 195, 120, 175);
    ctx.drawImage(windowStyle, canvas.width - 260, 195, 120, 175);

    ctx.beginPath();
    ctx.moveTo(35, 150);
    ctx.lineTo(765, 150);
    ctx.lineTo(385, 25);
    ctx.clip();
    ctx.drawImage(roofTex, 35, 0, 730, 150);

    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'phouse.png' });
    return attachment;
}

async function drawHouseStyleTwo(buildingRef) {
    const canvas = Canvas.createCanvas(800, 700);
    const ctx = canvas.getContext('2d');

    const wallTex = await Canvas.loadImage(allWallTiles[buildingRef.wall_tex - 1]);
    const roofTex = await Canvas.loadImage(roofTiles[buildingRef.roof_tex - 1]);
    const doorStyle = await Canvas.loadImage(doorStyles[buildingRef.door_tex - 1]);
    const windowStyle = await Canvas.loadImage(windowStyles[buildingRef.window_tex - 1]);

    const backgroundTex = await Canvas.loadImage(backgroundStyles[buildingRef.background_tex - 1]);
    const foregroundTex = await Canvas.loadImage(foregroundStyles[buildingRef.foreground_tex - 1]);

    //const woodStructTex = await preLoadImages(woodStructures);
    const largeWoodStructTex = await preLoadImages(largeWoodStructures);
    const bushTex = await preLoadImages(bushObjects);

    ctx.drawImage(backgroundTex, 0, 0, 800, 700);
    ctx.drawImage(foregroundTex, 0, 0, 800, 700);

    //type 2
    ctx.fillStyle = 'red';
    ctx.fillRect(65, 150, 670, 500);

    //=====================================
    //ctx.fillStyle = 'red';
    //ctx.fillRect(0, 525, 120, 124);
    ctx.drawImage(bushTex[0], 0, 530, 200, 120);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(0, 525, 120, 124);
    ctx.drawImage(bushTex[2], 600, 530, 250, 120);
    //=====================================

    const tileWall = (tex, maxW, maxH) => {
        for (let i = 1; i < 6; i++) {
            for (let j = 1; j < 15; j++) {
                ctx.drawImage(tex, j * 65, i * 150, 65, 150);
            }
        }
    };

    ctx.beginPath();
    ctx.moveTo(35, 150);
    ctx.lineTo(65, 150);
    ctx.lineTo(65, 650);
    ctx.lineTo(735, 650);
    ctx.lineTo(735, 150);
    ctx.lineTo(765, 150);
    ctx.lineTo(385, 25);
    ctx.clip();
    //ctx.drawImage(wallTex, 65, 150, 670, 500);
    tileWall(wallTex, 670, 500);

    // Canvas size = 800,700 (x, y) || (w, h)

    // x1 = 65
    // y1 = 150

    // x2 = 735
    // y2 = 650

    //=====================================
    //ctx.fillStyle = 'red';
    //ctx.fillRect(255, 250, 300, 115);
    ctx.drawImage(largeWoodStructTex[1], 12, 400, 302, 110);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(255, 250, 300, 115);
    ctx.drawImage(largeWoodStructTex[1], 254, 400, 302, 110);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(255, 250, 300, 115);
    ctx.drawImage(largeWoodStructTex[1], 552, 400, 302, 110);
    //=====================================

    //=====================================
    //ctx.fillStyle = 'red';
    //ctx.fillRect(65, 485, 275, 165);
    ctx.drawImage(largeWoodStructTex[0], 255, 485, 250, 165);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(471, 485, 275, 165);
    ctx.drawImage(largeWoodStructTex[0], 471, 485, 275, 165);
    //=====================================

    //=====================================
    //ctx.fillStyle = 'red';
    //ctx.fillRect(0, 525, 120, 124);
    ctx.drawImage(bushTex[0], 0, 530, 200, 120);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(0, 525, 120, 124);
    ctx.drawImage(bushTex[2], 600, 530, 250, 120);
    //=====================================

    //ctx.fillStyle = 'red';
    //ctx.fillRect(125, 485, 125, 165);
    ctx.drawImage(doorStyle, 125, 485, 125, 165);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(125, 240, 100, 165);
    ctx.drawImage(windowStyle, 125, 240, 100, 165);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(canvas.width - 225, 240, 100, 165);
    ctx.drawImage(windowStyle, canvas.width - 225, 240, 100, 165);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(canvas.width / 2.3, 240, 100, 165);
    ctx.drawImage(windowStyle, canvas.width / 2.3, 240, 100, 165);

    ctx.beginPath();
    ctx.moveTo(35, 150);
    ctx.lineTo(765, 150);
    ctx.lineTo(385, 25);
    ctx.clip();
    ctx.drawImage(roofTex, 35, 0, 730, 150);

    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'phouse.png' });
    return attachment;
}

async function drawHouseStyleThree(buildingRef) {
    const canvas = Canvas.createCanvas(800, 700);
    const ctx = canvas.getContext('2d');

    const wallTex = await Canvas.loadImage(allWallTiles[buildingRef.wall_tex - 1]);
    const roofTex = await Canvas.loadImage(roofTiles[buildingRef.roof_tex - 1]);
    const doorStyle = await Canvas.loadImage(doorStyles[buildingRef.door_tex - 1]);
    const windowStyle = await Canvas.loadImage(windowStyles[buildingRef.window_tex - 1]);

    const backgroundTex = await Canvas.loadImage(backgroundStyles[buildingRef.background_tex - 1]);
    const foregroundTex = await Canvas.loadImage(foregroundStyles[buildingRef.foreground_tex - 1]);

    //const woodStructTex = await preLoadImages(woodStructures);
    const largeWoodStructTex = await preLoadImages(largeWoodStructures);
    const bushTex = await preLoadImages(bushObjects);

    ctx.drawImage(backgroundTex, 0, 0, 800, 700);
    ctx.drawImage(foregroundTex, 0, 0, 800, 700);

    //type 3
    //ctx.fillStyle = 'red';
    //ctx.fillRect(65, 150, 670, 500);

    //=====================================
    //ctx.fillStyle = 'red';
    //ctx.fillRect(0, 525, 120, 124);
    ctx.drawImage(bushTex[4], 0, 530, 100, 120);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(0, 525, 120, 124);
    ctx.drawImage(bushTex[1], 635, 530, 250, 120);
    //=====================================

    const tileWall = (tex, maxW, maxH) => {
        for (let i = 1; i < 6; i++) {
            for (let j = 1; j < 15; j++) {
                ctx.drawImage(tex, j * 65, i * 150, 65, 150);
            }
        }
    };

    //fillRect(x, y, w, h);

    ctx.beginPath();
    ctx.moveTo(25, 150);
    ctx.lineTo(55, 150);
    ctx.lineTo(55, 650);
    ctx.lineTo(765, 650);
    ctx.lineTo(765, 350);
    ctx.lineTo(620, 150);
    ctx.lineTo(325, 25);
    ctx.clip();

    tileWall(wallTex, 670, 500);

    // Canvas size = 800,700 (x, y) || (w, h)

    // x1 = 65
    // y1 = 150

    // x2 = 735
    // y2 = 650

    //=====================================
    //ctx.fillStyle = 'red';
    //ctx.fillRect(255, 250, 300, 115);
    ctx.drawImage(largeWoodStructTex[1], 65, 390, 302, 110);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(255, 250, 300, 115);
    ctx.drawImage(largeWoodStructTex[1], 254, 390, 302, 110);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(255, 250, 300, 115);
    ctx.drawImage(largeWoodStructTex[1], 552, 390, 302, 110);
    //=====================================

    //=====================================
    //ctx.fillStyle = 'red';
    //ctx.fillRect(65, 485, 275, 165);
    //ctx.drawImage(largeWoodStructTex[0], 255, 485, 250, 165);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(471, 485, 275, 165);
    ctx.drawImage(largeWoodStructTex[0], 600, 485, 275, 165);
    //=====================================

    //=====================================
    //ctx.fillStyle = 'red';
    //ctx.fillRect(0, 525, 120, 124);
    ctx.drawImage(bushTex[4], 0, 530, 100, 120);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(0, 525, 120, 124);
    ctx.drawImage(bushTex[1], 635, 530, 250, 120);
    //=====================================

    //ctx.fillStyle = 'red';
    //ctx.fillRect(540, 485, 125, 165);
    ctx.drawImage(doorStyle, 540, 485, 125, 165);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(125, 175, 100, 165);
    ctx.drawImage(windowStyle, 125, 175, 100, 165);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(125, 175, 100, 165);
    ctx.drawImage(windowStyle, canvas.width - 430, 175, 100, 165);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(125, 175, 100, 165);
    ctx.drawImage(windowStyle, 125, 450, 100, 165);

    //ctx.fillStyle = 'red';
    //ctx.fillRect(125, 175, 100, 165);
    ctx.drawImage(windowStyle, canvas.width - 430, 450, 100, 165);

    ctx.beginPath();
    ctx.moveTo(35, 150);
    ctx.lineTo(620, 150);
    ctx.lineTo(620, 350);
    ctx.lineTo(765, 350);
    ctx.lineTo(620, 150);
    ctx.lineTo(385, 25);
    ctx.clip();
    ctx.drawImage(roofTex, 35, 65, 730, 400);

    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'phouse.png' });
    return attachment;
}

async function drawGrandhall(buildingRef) {
    const canvas = Canvas.createCanvas(1000, 800);
    const ctx = canvas.getContext('2d');

    const wallTex = await Canvas.loadImage(allWallTiles[buildingRef.wall_tex - 1]);
    const roofTex = await Canvas.loadImage(roofTiles[buildingRef.roof_tex - 1]);
    const doorStyle = await Canvas.loadImage(doorStyles[buildingRef.door_tex - 1]);
    const windowStyle = await Canvas.loadImage(windowStyles[buildingRef.window_tex - 1]);

    const backgroundTex = await Canvas.loadImage(backgroundStyles[buildingRef.background_tex - 1]);
    const foregroundTex = await Canvas.loadImage(foregroundStyles[buildingRef.foreground_tex - 1]);

    //const woodStructTex = await preLoadImages(woodStructures);
    const largeWoodStructTex = await preLoadImages(largeWoodStructures);
    //const bushTex = await preLoadImages(bushObjects);

    ctx.drawImage(backgroundTex, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(foregroundTex, 0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'red';
    ctx.fillRect(75, 495, canvas.width - 150, 250);

    ctx.fillStyle = 'red';
    ctx.fillRect(165, 245, canvas.width - 330, 250);

    const tileWall = (tex) => {
        for (let i = 1; i < 6; i++) {
            for (let j = 1; j < 15; j++) {
                ctx.drawImage(tex, j * 65, i * 150, 65, 150);
            }
        }
    };
    // WALLS
    ctx.beginPath();
    ctx.moveTo(75, 745);
    ctx.lineTo(canvas.width - 75, 745);
    ctx.lineTo(canvas.width - 75, 495);
    ctx.lineTo(canvas.width - 165, 245);
    ctx.lineTo(canvas.width / 2, 150);
    ctx.lineTo(165, 245);
    ctx.lineTo(75, 495);
    ctx.clip();

    tileWall(wallTex);
    // WALLS\

    // STRUCTURES
    //ctx.fillRect(75, 600, 300, 150);
    ctx.drawImage(largeWoodStructTex[1], 70, 490, 278, 140);
    ctx.drawImage(largeWoodStructTex[0], 70, 600, 300, 150);

    ctx.drawImage(largeWoodStructTex[1], 645, 490, 302, 140);
    ctx.drawImage(largeWoodStructTex[0], 620, 600, 300, 150);


    ctx.drawImage(largeWoodStructTex[1], 75, 415, 302, 85);
    ctx.drawImage(largeWoodStructTex[1], 370, 415, 302, 85);
    ctx.drawImage(largeWoodStructTex[1], 655, 415, 302, 85);

    // STRUCTURES\ 

    // DOOR
    //ctx.fillRect((canvas.width / 2) - 75, 600, 150, 150);
    ctx.drawImage(doorStyle, (canvas.width / 2) - 75, 600, 150, 150);
    // DOOR\

    // WINDOWS
    for (let i = 1; i < 5; i++) {
        //ctx.fillRect(i * 180, 265, 100, 150);
        ctx.drawImage(windowStyle, i * 180, 265, 100, 150);
    }

    let startPos = 150;
    for (let i = 1; i < 3; i++) {
        for (let j = 1; j < 3; j++) {
            if (j === 1) ctx.drawImage(windowStyle, startPos, 585, 100, 150);
            if (j === 2) ctx.drawImage(windowStyle, startPos + 150, 585, 100, 150);
        }
        startPos = 600;
    }
    // WINDOWS\

    // ROOF
    ctx.beginPath();
    ctx.moveTo(75, 495);
    ctx.lineTo(165, 495);
    ctx.lineTo(165, 245);
    ctx.lineTo(canvas.width - 165, 245);
    ctx.lineTo(canvas.width - 165, 495);
    ctx.lineTo(canvas.width - 75, 495);
    ctx.lineTo(canvas.width - 165, 245);
    ctx.lineTo(canvas.width / 2, 150);
    ctx.lineTo(165, 245);
    ctx.moveTo(75, 495);
    ctx.clip();

    ctx.drawImage(roofTex, 0, 0, 950, 600);
    // ROOF\


    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'grandhall.png' });
    return attachment;
}

async function drawClergy(buildingRef) {
    const canvas = Canvas.createCanvas(1000, 800);
    const ctx = canvas.getContext('2d');

    const wallTex = await Canvas.loadImage(allWallTiles[buildingRef.wall_tex - 1]);
    const roofTex = await Canvas.loadImage(roofTiles[buildingRef.roof_tex - 1]);
    const doorStyle = await Canvas.loadImage(doorStyles[buildingRef.door_tex - 1]);
    const windowStyle = await Canvas.loadImage(windowStyles[buildingRef.window_tex - 1]);

    const backgroundTex = await Canvas.loadImage(backgroundStyles[buildingRef.background_tex - 1]);
    const foregroundTex = await Canvas.loadImage(foregroundStyles[buildingRef.foreground_tex - 1]);

    const woodStructTex = await preLoadImages(woodStructures);
    //const largeWoodStructTex = await preLoadImages(largeWoodStructures);
    //const bushTex = await preLoadImages(bushObjects);

    ctx.drawImage(backgroundTex, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(foregroundTex, 0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'red';
    ctx.fillRect(90, 495, canvas.width - 180, 250);

    //ctx.fillStyle = 'red';
    //ctx.fillRect((canvas.width / 2) - 75, 100, 150, 500);

    const tileWall = (tex) => {
        for (let i = 1; i < 6; i++) {
            for (let j = 1; j < 15; j++) {
                ctx.drawImage(tex, j * 65, i * 150, 65, 150);
            }
        }
    };

    const towerLeft = (canvas.width / 2) - 75;

    // WALLS
    ctx.beginPath();
    ctx.moveTo(90, 495);
    ctx.lineTo(90, 745);
    ctx.lineTo(canvas.width - 90, 745);
    ctx.lineTo(canvas.width - 90, 495);
    ctx.lineTo(towerLeft + 150, 325);
    ctx.lineTo(towerLeft + 150, 100);
    ctx.lineTo(towerLeft, 100);
    ctx.lineTo(towerLeft, 250);
    ctx.lineTo(90, 495);
    ctx.clip();

    tileWall(wallTex);
    // WALLS\

    // DOOR
    ctx.drawImage(doorStyle, towerLeft, 600, 150, 150);
    // DOOR\

    // WINDOWS
    ctx.drawImage(windowStyle, 150, 545, 100, 150);

    ctx.drawImage(windowStyle, canvas.width - 235, 545, 100, 150);
    // WINDOWS\

    // STRUCTURES
    ctx.drawImage(woodStructTex[0], 265, 600, 150, 150);

    ctx.drawImage(woodStructTex[0], 585, 600, 150, 150);
    // STRUCTURES\


    // ROOF
    ctx.beginPath();
    ctx.moveTo(90, 495);
    ctx.lineTo(towerLeft, 495);
    ctx.lineTo(towerLeft, 250);

    ctx.moveTo(canvas.width - 90, 495);
    ctx.lineTo(towerLeft, 495);
    ctx.lineTo(towerLeft, 250);

    ctx.moveTo(towerLeft, 150);
    ctx.lineTo(towerLeft + 75, 100);
    ctx.lineTo(towerLeft + 150, 150);
    ctx.clip();

    ctx.drawImage(roofTex, 0, 0, 950, 600);
    // ROOF\

    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'clergy.png' });
    return attachment;
}

module.exports = { loadBuilding };
