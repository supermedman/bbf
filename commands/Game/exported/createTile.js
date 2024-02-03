const { Town, BigTile, MediumTile, GuildData } = require('../../../dbObjects.js');

const randArrPos = (arr) => {
    let returnIndex = 0;
    if (arr.length > 1) returnIndex = Math.floor(Math.random() * arr.length);
    return arr[returnIndex];
};

const findAllignment = (rolledChance) => {
    const allignment = ['Normal', 'Evil', 'Phase'];
    const allignmentChance = {
        Normal: 0.9994,
        Evil: 0.0006,
        Phase: 0.0003
    };

    let picked = '';
    if (rolledChance <= allignmentChance.Phase) {
        picked += allignment[2];
    } else if (rolledChance <= allignmentChance.Evil) {
        picked += allignment[1];
    } else {
        picked += allignment[0];
    }
    return picked;
};

async function createBigTile() {
    const guildList = await GuildData.findAll();
    const fullTilesNeeded = Math.floor(guildList.length / 4);

    const biomes = ['Forest', 'Mountain', 'Desert', 'Plains', 'Swamp', 'Grassland'];

    // For each 
    //  BigTile:
    //      - 4 MediumTiles
    //      - 8 mainbiomes

    // For each
    //  MediumTile:
    //      - 1 BigTileID
    //      - 1 GuildID
    //      - 1 TileLocation (NE, NW, SE, SW)
    //      - 2 Towns
    if (fullTilesNeeded > 0) await createFullBigTile(fullTilesNeeded, guildList, biomes);
    const remainingGuilds = guildList.slice(fullTilesNeeded * 4,);
    if (guildList.length % 4 !== 0) await createPartialBigTile(remainingGuilds, biomes)
}

async function createPartialBigTile(guildList, biomes) {

    let chosenBiomes = [];
    for (let j = 0; j < 8; j++) {
        let picked = randArrPos(biomes);
        let randRoll = Math.random();
        picked += '-' + findAllignment(randRoll);
        chosenBiomes.push(picked);
    }

    let twoPairs = [];
    let twoPairLiteral = [];
    let curSet = 0;
    for (let t = 0; t < chosenBiomes.length; t += 2) {
        let twoPairStr = '';
        twoPairs.push(chosenBiomes.slice(t, t + 2));
        twoPairStr = twoPairs[curSet][0] + ', ' + twoPairs[curSet][1];
        twoPairLiteral.push(twoPairStr);
        curSet++;
    }

    let newTile = await BigTile.create({
        mainbiome_one: twoPairLiteral[0],
        mainbiome_two: twoPairLiteral[1],
        mainbiome_three: twoPairLiteral[2],
        mainbiome_four: twoPairLiteral[3],
    });

    const medTiles = await createMediumTile(newTile, twoPairs, guildList);

    if (medTiles.length === 1) {
        await newTile.update({
            medtile_one: medTiles[0].guildid
        });
    }
    if (medTiles.length === 2) {
        await newTile.update({
            medtile_one: medTiles[0].guildid,
            medtile_two: medTiles[1].guildid,
        });
    }
    if (medTiles.length === 3) {
        await newTile.update({
            medtile_one: medTiles[0].guildid,
            medtile_two: medTiles[1].guildid,
            medtile_three: medTiles[2].guildid,
        });
    }
    await newTile.save();
}

async function createFullBigTile(fullTilesNeeded, guildList, biomes) {
    let curPos = 0;
    for (let i = 0; i < fullTilesNeeded; i++) {
        let guildSlice = guildList.slice(curPos, curPos + 4);
        curPos += 4;

        let chosenBiomes = [];
        for (let j = 0; j < 8; j++) {
            let picked = randArrPos(biomes);
            let randRoll = Math.random();
            picked += '-' + findAllignment(randRoll);
            chosenBiomes.push(picked);
        }

        let twoPairs = [];
        let twoPairLiteral = [];
        let curSet = 0;
        for (let t = 0; t < chosenBiomes.length; t += 2) {
            let twoPairStr = '';
            twoPairs.push(chosenBiomes.slice(t, t + 2));
            twoPairStr = twoPairs[curSet][0] + ', ' + twoPairs[curSet][1];
            twoPairLiteral.push(twoPairStr);
            curSet++;
        }

        let newTile = await BigTile.create({
            medtile_one: guildSlice[0].guildid,
            mainbiome_one: twoPairLiteral[0],

            medtile_two: guildSlice[1].guildid,
            mainbiome_two: twoPairLiteral[1],

            medtile_three: guildSlice[2].guildid,
            mainbiome_three: twoPairLiteral[2],

            medtile_four: guildSlice[3].guildid,
            mainbiome_four: twoPairLiteral[3],
        });
        console.log(newTile.dataValues);

        await createMediumTile(newTile, twoPairs, guildSlice);
    }
}

async function createMediumTile(bigTile, twoPairs, guildSlice) {
    let returnTiles = [];
    const quads = ['NW', 'NE', 'SW', 'SE'];
    for (let i = 0; i < guildSlice.length; i++) {
        let biomes = twoPairs[i];

        let newTile = await MediumTile.create({
            tileid: bigTile.tileid,
            guildid: guildSlice[i].guildid,
            tile_location: quads[i],
            local_biome_one: biomes[0],
            local_biome_two: biomes[1],
        });
        console.log(newTile.dataValues);
        returnTiles.push(newTile);
    }
    return returnTiles;
}

async function checkBigTiles(newGuild) {
    let slot = 1;
    let bigTile = await BigTile.findOne({ where: { medtile_one: '0' } });

    if (!bigTile) {
        bigTile = await BigTile.findOne({ where: { medtile_two: '0' } });
        slot = 2;
    }
    if (!bigTile) {
        bigTile = await BigTile.findOne({ where: { medtile_three: '0' } });
        slot = 3;
    } 
    if (!bigTile) {
        bigTile = await BigTile.findOne({ where: { medtile_four: '0' } });
        slot = 4;
    }

    if (!bigTile) {
        bigTile = await createEmptyBigTile();
        slot = 1;
    }

    const tileInfoObj = {
        biome: '',
        slot: slot - 1,
        guildid: newGuild.guildid,
    };

    if (slot === 1) tileInfoObj.biome = bigTile.mainbiome_one;
    if (slot === 2) tileInfoObj.biome = bigTile.mainbiome_two;
    if (slot === 3) tileInfoObj.biome = bigTile.mainbiome_three;
    if (slot === 4) tileInfoObj.biome = bigTile.mainbiome_four;

    const medTile = await makeSingleMedTile(bigTile, tileInfoObj);
    if (!medTile) return console.error('Something went wrong while creating a new medium tile!!');

    let tileUpdate;
    if (slot === 1) tileUpdate = await bigTile.update({ medtile_one: newGuild.guildid });
    if (slot === 2) tileUpdate = await bigTile.update({ medtile_two: newGuild.guildid });
    if (slot === 3) tileUpdate = await bigTile.update({ medtile_three: newGuild.guildid });
    if (slot === 4) tileUpdate = await bigTile.update({ medtile_four: newGuild.guildid });

    if (tileUpdate) await bigTile.save();
    return 'Added';
}

async function createEmptyBigTile() {
    const biomes = ['Forest', 'Mountain', 'Desert', 'Plains', 'Swamp', 'Grassland'];

    let chosenBiomes = [];
    for (let j = 0; j < 8; j++) {
        let picked = randArrPos(biomes);
        let randRoll = Math.random();
        picked += '-' + findAllignment(randRoll);
        chosenBiomes.push(picked);
    }

    let twoPairs = [];
    let twoPairLiteral = [];
    let curSet = 0;
    for (let t = 0; t < chosenBiomes.length; t += 2) {
        let twoPairStr = '';
        twoPairs.push(chosenBiomes.slice(t, t + 2));
        twoPairStr = twoPairs[curSet][0] + ', ' + twoPairs[curSet][1];
        twoPairLiteral.push(twoPairStr);
        curSet++;
    }

    const newTile = await BigTile.create({
        mainbiome_one: twoPairLiteral[0],
        mainbiome_two: twoPairLiteral[1],
        mainbiome_three: twoPairLiteral[2],
        mainbiome_four: twoPairLiteral[3],
    });

    return newTile;
}

async function makeSingleMedTile(bigTile, infoObj) {
    const quads = ['NW', 'NE', 'SW', 'SE'];
    const biomes = infoObj.biome.split(', ');

    const newTile = await MediumTile.create({
        tileid: bigTile.tileid,
        guildid: infoObj.guildid,
        tile_location: quads[infoObj.slot],
        local_biome_one: biomes[0],
        local_biome_two: biomes[1],
    });
    return newTile;
}

module.exports = { createBigTile, createMediumTile, checkBigTiles };