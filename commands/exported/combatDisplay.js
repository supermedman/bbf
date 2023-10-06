const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { ActiveEnemy, Equipped } = require('../../dbObjects.js');
const { displayEWpic, displayEWOpic } = require('./displayEnemy.js');
const { hitOnce } = require('./hitOnce.js');

const enemyList = require('../../events/Models/json_prefabs/enemyList.json');

//========================================
// This method displays the enemy in its current state
async function display(uData, specCode, interaction, Enemy) {
    const enemy = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: Enemy.ConstKey }] });
    const hasPng = await pngCheck(enemy);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('kill')
                .setLabel('Defeat')
                .setDisabled(true)
                .setStyle(ButtonStyle.Primary),
        )
        .addComponents(
            new ButtonBuilder()
                .setCustomId('onehit')
                .setLabel('Strike')
                .setStyle(ButtonStyle.Primary),
        )
        .addComponents(
            new ButtonBuilder()
                .setCustomId('refresh')
                .setLabel('New Enemy')
                .setDisabled(true)
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔄'),
        );

    if (hasPng) {
        const attachment = await displayEWpic(interaction, enemy, true);

        interaction.channel.send({ components: [row], files: [attachment] }).then(async message => {
            const collectorBut = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 40000 });

            collectorBut.on('collect', async i => {
                if (i.user.id === uData.userid) {
                    if (i.customId === 'refresh') {
                        //delete the embed here
                        //await message.delete();
                        //startCombat();//run the entire script over again
                    }
                    if (i.customId === 'kill') {
                        //run attack function until death is acheived
                        //const item = await Equipped.findOne({ where: [{ spec_id: interaction.user.id }] });
                        //var dmgDealt = await userDamage(interaction, item);
                        //await message.delete();
                        //dealDeath(dmgDealt, item);
                    }
                    if (i.customId === 'onehit') {
                        //run once reprompt reaction
                        const item = await Equipped.findOne({ where: [{ spec_id: uData.userid }] });
                        var dmgDealt = await userDamage(uData, item);
                        await message.delete();
                        await hitOnce(dmgDealt, item, uData, enemy, interaction, specCode);
                    }
                } else {
                    i.reply({ content: `Nice try slick!`, ephemeral: true });
                }
            });
            collectorBut.on('end', async remove => { if (!message) { await message.delete(); } });
        })
    } else {
        const attachment = await displayEWOpic(interaction, enemy, true);

        interaction.channel.send({ components: [row], files: [attachment] }).then(async message => {
            const collectorBut = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 40000 });

            collectorBut.on('collect', async i => {
                if (i.user.id === uData.userid) {
                    if (i.customId === 'refresh') {
                        //delete the embed here
                        //await message.delete();
                        //startCombat();//run the entire script over again
                    }
                    if (i.customId === 'kill') {
                        //run attack function until death is acheived
                        //const item = await Equipped.findOne({ where: [{ spec_id: interaction.user.id }] });
                        //var dmgDealt = await userDamage(interaction, item);
                        //await message.delete();
                        //dealDeath(dmgDealt, item);
                    }
                    if (i.customId === 'onehit') {
                        //run once reprompt reaction
                        const item = await Equipped.findOne({ where: [{ spec_id: uData.userid }] });
                        var dmgDealt = await userDamage(uData, item);
                        await message.delete();
                        await hitOnce(dmgDealt, item, uData, enemy, interaction, specCode);
                    }
                } else {
                    i.reply({ content: `Nice try slick!`, ephemeral: true });
                }
            });
            collectorBut.on('end', async remove => { if (!message) { await message.delete(); } });
        })
    }
}

//========================================
//This method checks for enemy png
function pngCheck(enemy) {
    for (var i = 0; i < enemyList.length; i++) {
        //if enemy with player level or lower can be found continue
        if (enemyList[i].ConstKey === enemy.constkey) {
            //check if this enemy has a png to display
            var tmpCheck = enemyList[i];
            if (tmpCheck.PngRef) {
                //enemy has png
                return true;
            } else return false;
        } else {/**enemy not found keep looking*/ }
    }
}


//========================================
// This method calculates damage dealt by the user and returns that value
async function userDamage(uData, item) {

    /**
     *  CHANGES TO HOW STATS EFFECT COMBAT 
     *  
     *   Speed: Increases % chance to land 2 hits before enemy attacks
     *   
     *   Strength: Increases base health by 10 & base damage by 2
     *   
     *   Dexterity: Increases % chance to land a crit
     *   
     *   Intelligence: Increases base attack by 8
     *   
     *  CHANGES TO HOW CLASSES EFFECT COMBAT
     *   
     *   Warrior: Allrounder
     *      - 5% reduction on damage taken
     *      - 5% increase on damage dealt
     *   
     *   Mage: GlassCannon
     *      - 5% increase on damage taken
     *      - 15% increase on damage dealt
     *      
     *   Thief: Striker
     *      - 10% base chance of double hit
     *      - 10% base chance of crit
     *      
     *   Paladin: Unshakeable
     *      - 15% reduction on damage taken
     *      - 5% reduction on damage dealt
     * */

    /**
     *      Double hits & Critical hits
     *          - Speed stat
     *          - Dexterity stat
     *          
     *      How do they change the % chance?
     *          - +2% per point
     *          - +2% per point
     *          
     *      What is the base % chance?
     *          - Thief 10% both
     *          - 2% for all others
     *      
     * */

    const user = uData;//grabs the user data file for all following assignments

    //=========================
    //const spd = user.speed;
    const str = user.strength;
    //const dex = user.dexterity;
    const int = user.intelligence;
    const pclass = user.pclass;

    var dmgMod = 0;
    //=========================

    dmgMod = ((int * 8) + (str * 2));

    if (pclass === 'Warrior') {
        dmgMod += (dmgMod * 0.05);
    } else if (pclass === 'Paladin') {
        dmgMod -= (dmgMod * 0.05);
    } else if (pclass === 'Mage') {
        dmgMod += (dmgMod * 0.15);
    }

    console.log(`Damage Mod: ${dmgMod}`);

    //-------------------------------------------------------------------------------
    //here the damage modifier is applied to the damage dealt and the final value is returned
    var dmgDealt = dmgMod;

    console.log('ITEM EQUIPPED: ', item);

    if (item) {
        console.log('ITEM DAMAGE: ', item.attack);
        dmgDealt += item.attack;
    }

    console.log('Damage Dealt to Enemy ' + dmgDealt);
    return dmgDealt;
}

module.exports = { display };
