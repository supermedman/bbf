const { UserData, ActiveEnemy } = require('../../dbObjects.js');
const enemyList = require('../../events/Models/json_prefabs/enemyList.json');

//========================================
//basic user data refrence method
async function grabU(interaction) {
    uData = await UserData.findOne({ where: { userid: interaction.user.id } });
    return uData;
}

//========================================
//This method Generates an enemy based on the users level
async function loadEnemy() {
    const uData = await grabU();
    if (!uData) return interaction.followUp(`No User Data.. Please use the \`/start\` command to select a class and begin your adventure!!`);
    if (uData.health <= 0) return playerDead(uData, 'Fayrn');

    let ePool = [];
    //for loop to search enemy prefab list
    for (var i = 0; i < enemyList.length; i++) {
        //if enemy with player level or lower can be found continue
        if (enemyList[i].Level <= uData.level) {
            ePool.push(enemyList[i]); //enemy found add to ePool
        } else {/**enemy not found keep looking*/ }
    }

    if (ePool.length <= 0) {
        //SOMETHING WENT WRONG DEAL WITH IT HERE
        console.log(ePool);
    } else {
        //this will grab a random number to be used to grab an enemy from the array ePool
        const rEP = Math.floor(Math.random() * (ePool.length));
        console.log('RANDOM ENEMY POSITION: ', rEP);
        console.log('ENEMY GRABBED SHOWN WITH ConstKey: ', ePool[rEP].ConstKey);

        const cEnemy = ePool[rEP];
        //let hasPng = false;
        console.log(cEnemy);

        if (cEnemy.PngRef) {
            hasPng = true;
            pFile = cEnemy.Image;
            pRef = cEnemy.PngRef;
        }

        //constKey = cEnemy.ConstKey;
        const specCode = interaction.user.id + cEnemy.ConstKey;
        await addEnemy(cEnemy, specCode);
        //await display();
    }
}

//========================================
//This method Adds the selected enemy into the ActiveEnemy database 
async function addEnemy(cEnemy, specCode) {

    try {
        var copyCheck = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: constKey }] });

        console.log('Status of finding enemy: ', copyCheck);
        console.log('Values being checked for: ', '\nspecCode: ', specCode, '\nconstKey: ', constKey);

        if (copyCheck) {
            //enemy already exists return                  
            return copyCheck;
        } else if (!copyCheck) {

            console.log('Current constKey of prefab enemy: ', cEnemy.ConstKey);
            console.log('Current specId of prefab enemy: ', cEnemy.SpecId);


            //IMPLEMENT LOOT HERE
            //first calculate whether enemy will have an item
            //then assign hasitem: true or false
            //15% chance to have item to start

            /**
             *   Outside influences to item drop chance
             *      - Player stats?      
             *      - Pigmy currently equiped?
             *      - Weapon currently equiped?
             *      - Thief class?
             *      
             *   How does it change the outcome?
             *      - Max 10% extra drop chance
             *      - Max 20% extra drop chance
             *      - Max 10% extra drop chance
             *      - Base 10% extra drop chance
             *      
             *   How does it effect the rarity?
             *      - @ Max stat: 10% chance +1 to rarID
             *      - @ Max stat: 10% chance +1 to rarID
             *      - Max 5% chance +1 to rarID
             *      - Base 5% chance +1 to rarID
             * 
             * */

            var lChance = Math.random();
            var HI = false;

            if (lChance >= 0.850) {
                //hasitem:true
                HI = true;
            }
            else {
                //hasitem: false
            }

            const enemy = await ActiveEnemy.create({


                name: cEnemy.Name,
                description: cEnemy.Description,
                level: cEnemy.Level,
                mindmg: cEnemy.MinDmg,
                maxdmg: cEnemy.MaxDmg,
                health: cEnemy.Health,
                defence: cEnemy.Defence,
                weakto: cEnemy.WeakTo,
                dead: cEnemy.Dead,
                hasitem: HI,
                xpmin: cEnemy.XpMin,
                xpmax: cEnemy.XpMax,
                constkey: cEnemy.ConstKey,
                specid: specCode,

            });

            console.log(`Enemy data being added to database: \nNAME: ${enemy.name} \nLEVEL: ${enemy.level} \nHEALTH: ${enemy.health} \nDEFENCE: ${enemy.defence}`);

            var newE = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: constKey }] });
            if (newE) {
                console.log('Enemy data added successfully!');
                return newE;
            } else {
                console.log('Something went wrong while adding an enemy!');
                return;
            }

        }
    } catch (err) {
        console.error('An error has occured', err);
    }
}

module.exports = { loadEnemy };