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
            if (Enemy.DropTypes.find(matWanted)){
                buildList.push(Enemy.ConstKey);
            }
        }
    }
    return buildList;
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

module.exports = { checkSpawnBiome, checkUnlockedBiome };