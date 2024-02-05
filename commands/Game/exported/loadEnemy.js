const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const {
    warnedForm,
    errorForm,
    successResult,
    failureResult,
    basicInfoForm,
    specialInfoForm
} = require('../../../chalkPresets.js');

const { ActiveEnemy, Pigmy } = require('../../../dbObjects.js');
const { initialDisplay } = require('./combatDisplay.js');
const { handleNewSpawn } = require('./handleEnemySpawn.js');
const enemyList = require('../../../events/Models/json_prefabs/enemyList.json');

/**
 * 
 * @param {any} interaction STATIC INTERACTION OBJECT
 * @param {any} user OBJECT: User data reference
 */
//========================================
//This method Generates an enemy based on the users level
async function loadEnemy(interaction, user, altSpawnCode, altSpawner) {
    const uData = user;

    

    var ePool = [];
    if (altSpawner === true) {
        console.log('ALTSPAWN')
        for (var i = 0; i < enemyList.length; i++) {
            //if enemy with player level or lower can be found continue
            if (enemyList[i].ConstKey === altSpawnCode) {
                ePool.push(enemyList[i]); //enemy found add to ePool
            } else {/**enemy not found keep looking*/ }
        }

        const cEnemy = ePool[0];

        let specCode = uData.userid + cEnemy.ConstKey;
        let theEnemy;
        if (!cEnemy.NewSpawn || cEnemy.NewSpawn === false) {
            theEnemy = await addEnemy(cEnemy, specCode, user);
        } else {
            try {
                if (uData.userid === '501177494137995264') {
                    theEnemy = await handleNewSpawn(cEnemy, user);
                    initialDisplay(specCode, interaction, theEnemy);
                }
            } catch (error) {
                console.log(error);
            }
        }

        
        if (uData.userid === '501177494137995264') {
            await initialDisplay(specCode, interaction, theEnemy);
        } else {
            const fightButton = new ButtonBuilder()
                .setLabel("Fight!")
                .setStyle(ButtonStyle.Success)
                .setEmoji('⚔')
                .setCustomId('accept');

            const interactiveButtons = new ActionRowBuilder().addComponents(fightButton);

            const enemySpawnEmbed = new EmbedBuilder()
                .setColor('DarkButNotBlack')
                .setTitle('An enemy appears!')
                .addFields(
                    {
                        name: `Who dares?`,
                        value: `Select fight to test your might!`,

                    });

            const embedMsg = await interaction.channel.send({ components: [interactiveButtons], embeds: [enemySpawnEmbed] });

            const collector = embedMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 120000,
            });

            collector.on('collect', async (collInteract) => {
                //const collectedUser = collInteract.user.id;
                if (collInteract === 'accept') {
                    await collInteract.deferUpdate();
                    interactiveButtons.components[0].setDisabled(true);

                    await collInteract.editReply({ components: [interactiveButtons] }).then(() => {
                        initialDisplay(specCode, collInteract, theEnemy);
                    });
                    
                    wait(3000).then(async () => {
                        await collector.stop();
                    });
                }
            });

            collector.on('end', () => {
                if (embedMsg) {
                    embedMsg.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }
            });
        }
        //return theEnemy;
    } else if (!altSpawner) {
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

            if (!cEnemy.NewSpawn || cEnemy.NewSpawn === false) {
                const specCode = uData.userid + cEnemy.ConstKey;
                await addEnemy(cEnemy, specCode, user).then((theEnemy) => {
                    initialDisplay(specCode, interaction, theEnemy);
                });
            } else {
                const specCode = uData.userid + cEnemy.ConstKey;
                try {
                    await handleNewSpawn(cEnemy, user).then((theEnemy) => {
                        console.log(`theEnemy is:${theEnemy}`);
                        initialDisplay(specCode, interaction, theEnemy);
                    });
                } catch (error) {
                    console.log(error);
                }               
            }
        }
    }
    
}

//========================================
//This method Adds the selected enemy into the ActiveEnemy database 
async function addEnemy(cEnemy, specCode, user) {

    try {
        var copyCheck = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: cEnemy.ConstKey }] });

        console.log('Status of finding enemy: ', copyCheck);
        console.log('Values being checked for: ', '\nspecCode: ', specCode, '\nconstKey: ', cEnemy.ConstKey);

        if (copyCheck) {
            //enemy already exists return                  
            return copyCheck;
        } else if (!copyCheck) {

            console.log('Current constKey of prefab enemy: ', cEnemy.ConstKey);
            console.log('Current specId of prefab enemy: ', cEnemy.SpecId);

            var hasUI = false;

            if (cEnemy.HasUnique) {
                //enemy has unique item
                //Assign as true
                hasUI = true;
            }

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

            var lootChance = Math.random();
            var chanceToBeat = 0.850;
            var HI = false;

            const pigmy = await Pigmy.findOne({ where: { spec_id: user.userid } });           

            if (user.pclass === 'Thief') {
                chanceToBeat -= 0.10;
            }

            if (user.level >= 31) {
                //User above level 31 increase drop chance
                if ((Math.floor(user.level / 4) * 0.01) > 0.25) {
                    chanceToBeat -= 0.25;
                } else {
                    chanceToBeat -= (Math.floor(user.level / 4) * 0.01);
                }
            }

            if (pigmy) {
                if ((Math.floor(pigmy.level / 3) * 0.02) > 0.25) {
                    chanceToBeat -= 0.25;
                } else {
                    chanceToBeat -= (Math.floor(pigmy.level / 3) * 0.02); //Pigmy level increases drop rate by 2% per level
                }
            }

            console.log(specialInfoForm('Rolled Loot Chance: \n'+ lootChance+'\nChance to beat: \n', chanceToBeat));


            if (lootChance >= chanceToBeat) {
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
                hasunique: hasUI,
                specid: specCode,

            });

            console.log(`Enemy data being added to database: \nNAME: ${enemy.name} \nLEVEL: ${enemy.level} \nHEALTH: ${enemy.health} \nDEFENCE: ${enemy.defence}`);

            var newE = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: cEnemy.ConstKey }] });
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
