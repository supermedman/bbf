const enemyList = require('../../../events/Models/json_prefabs/enemyList.json');

const biomeList = ['Wilds', 'Forest', 'Grassland', 'Swamp', 'Plains', 'Desert', 'Mountain'];
const huntingGrounds = ['None', 'woody', 'herby', 'slimy', 'skinny', 'gemy', 'metalic'];

/**
 * 
 * @param {Object} user DB Instance: UserData
 * @returns List of enemy ConstKeys with matching drop Types || Empty Array = All Enemies
 */
function checkSpawnBiome(user) {
    const huntingFor = huntingGrounds[biomeList.indexOf(user.current_location ?? 'Wilds')];
    let returnList = [];
    if (huntingFor !== 'None') returnList = filterHunting(huntingFor, user.level);
    
    console.log(returnList.length);
    
    return returnList;
}

function filterHunting(matWanted, maxLevel){
    let buildList = [];
    for (const Enemy of enemyList){
        if (Enemy.Level <= maxLevel){
            if (Enemy.DropTypes.includes(matWanted)){
                buildList.push(Enemy.ConstKey);
            }
        }
    }
    return buildList;
}

/**
 * 
 * @param {string} localBiome NPCs Current Biome
 * @returns Useable "mat"List.json String
 */
function NPCcheckMaterialFav(localBiome) {
    const favMat = huntingGrounds[(biomeList.indexOf(localBiome) === 0) ? 1 : biomeList.indexOf(localBiome)];
    return favMat;
}

/**
 * 
 * @param {Object} locData DB Instance: LocationData
 * @returns List of location Strings, ready to be used as command options or for further comps.
 */
function checkUnlockedBiome(locData){
    const locationIDs = locData.unlocked_locations.split(',');
    
    let locationBuilder = [];
    for (const Location of locationIDs){
        locationBuilder.push(biomeList[Location]);
    }

    return locationBuilder;
}

/**
 * 
 * @param {String} biomeName Given when user attempts to travel to a new location
 * @returns Int
 */
function checkSelectedBiome(biomeName){
    const returnIndex = biomeList.indexOf(biomeName);
    return returnIndex;
}

module.exports = { checkSpawnBiome, checkUnlockedBiome, checkSelectedBiome, NPCcheckMaterialFav };