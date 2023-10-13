const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { UserData } = require('../dbObjects.js');
const { displayEWOpic, displayEWpic } = require('./exported/displayEnemy.js');
const enemyList = require('../events/Models/json_prefabs/enemyList.json');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('stats')
        .setDescription('Inspect a player or an enemies stats')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Info about a user')
                .addUserOption(option => option.setName('player').setDescription('The user')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Info about how a stat work')
                .addStringOption(option =>
                    option.setName('stat')
                        .setDescription('The stat')
                        .setAutocomplete(true)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('enemy')
                .setDescription('Case sensitive! Try the first letter followed by a space')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('The enemy')
                        .setAutocomplete(true)
                        .setRequired(true))),
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        let choices = [];

        if (focusedOption.name === 'stat') {
            const focusedValue = interaction.options.getFocused(false);

            choices = ['speed', 'strength', 'dexterity', 'intelligence'];

            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
            await interaction.respond(
                filtered.map(choice => ({ name: choice, value: choice })),
            );
        }

        if (focusedOption.name === 'name') {
            const focusedValue = interaction.options.getFocused(false);

            if (focusedValue) {
                let first = focusedValue.charAt();
                console.log(first);
                for (var n = 0; n < enemyList.length; n++) {
                    if (enemyList[n].Name.charAt() === first) {//Check for enemy starting with the letter provided
                        var picked = enemyList[n].Name;//assign picked to item name at postion n in the items list found
                        //prevent any type errors			
                        choices.push(picked.toString());//push each name one by one into the choices array
                    } else {
                        //Enemy name does not match keep looking
                    }
                }
                console.log(choices);
                console.log(focusedValue);

                //Mapping the complete list of options for discord to handle and present to the user
                const filtered = choices.filter(choice => choice.startsWith(focusedValue));
                await interaction.respond(
                    filtered.map(choice => ({ name: choice, value: choice })),
                );
            }
        } 
    },
    async execute(interaction) {
        await interaction.deferReply();
        if (interaction.options.getSubcommand() === 'user') {
            const user = interaction.options.getUser('player');

            if (user) {
                const uData = await UserData.findOne({ where: { username: user.username } });
                if (uData) {
                    var nxtLvl = 50 * (Math.pow(uData.level, 2) - 1);
                    //Adding temp xp needed change at level 20 to slow proggress for now
                    if (uData.level === 20) {
                        //Adding level scale to further restrict leveling		
                        nxtLvl = 75 * (Math.pow(uData.level, 2) - 1);
                    } else if (uData.level > 20) {
                        //Adding level scale to further restrict leveling
                        const lvlScale = 1.5 * (Math.floor(uData.level / 5));
                        nxtLvl = (75 + lvlScale) * (Math.pow(uData.level, 2) - 1);
                    } else {/*DO NOTHING*/ }

                    const list = (
                        `Class: ${uData.pclass}\n
Speed: ${uData.speed}
Strength: ${uData.strength}
Dexterity: ${uData.dexterity}
Intelligence: ${uData.intelligence}\n
Perk Points: ${uData.points}
\nLevel: ${uData.level}
\nXP to next level: ${uData.xp}/${nxtLvl}
\nCoins: ${uData.coins}
\nTotal Enemies Killed: ${uData.totalkills}
Most Kills In One Life: ${uData.highestkills}
\nLast Death: ${uData.lastdeath}
Enemies Killed Since: ${uData.killsthislife}
                         `);

                    const userDisplayEmbed = new EmbedBuilder()
                        .setTitle(`Requested Stats for:`)
                        .setColor(0000)
                        .addFields(
                            {
                                name: (`${uData.username}`),
                                value: list

                            }
                        )
                    interaction.followUp({ embeds: [userDisplayEmbed] });
                }
            } else {
                const uData = await UserData.findOne({ where: { userid: interaction.user.id } });
                if (uData) {
                    var nxtLvl = 50 * (Math.pow(uData.level, 2) - 1);
                    //Adding temp xp needed change at level 20 to slow proggress for now
                    if (uData.level === 20) {
                        //Adding level scale to further restrict leveling		
                        nxtLvl = 75 * (Math.pow(uData.level, 2) - 1);
                    } else if (uData.level > 20) {
                        //Adding level scale to further restrict leveling
                        const lvlScale = 1.5 * (Math.floor(uData.level / 5));
                        nxtLvl = (75 + lvlScale) * (Math.pow(uData.level, 2) - 1);
                    } else {/*DO NOTHING*/ }

                    const list = (
                        `Class: ${uData.pclass}\n
Speed: ${uData.speed}
Strength: ${uData.strength}
Dexterity: ${uData.dexterity}
Intelligence: ${uData.intelligence}\n
Perk Points: ${uData.points}
\nLevel: ${uData.level}
\nXP to next level: ${uData.xp}/${nxtLvl}
\nCoins: ${uData.coins}
\nTotal Enemies Killed: ${uData.totalkills}
Most Kills In One Life: ${uData.highestkills}
\nLast Death: ${uData.lastdeath}
Enemies Killed Since: ${uData.killsthislife}
                         `);

                    const userDisplayEmbed = new EmbedBuilder()
                        .setTitle(`Requested Stats for:`)
                        .setColor(0000)
                        .addFields(
                            {
                                name: (`${uData.username}`),
                                value: list

                            }
                        )
                    interaction.followUp({ embeds: [userDisplayEmbed] });
                }
            }
        }
        else if (interaction.options.getSubcommand() === 'enemy') {
            //handle enemies here
            const eTmp = interaction.options.getString('name');
            var enemy;

            for (var i = 0; i < enemyList.length; i++) {
                if (enemyList[i].Name === eTmp) {
                    //enemy found!
                    enemy = enemyList[i];
                } else {/** not found keep looking*/ }
            }

            if (!enemy) {
                interaction.followUp('Enemy not found, please try searching again using the options provided. \nIf no options were provided please start the name with a capital letter!');
            } else {
                if (enemy.PngRef) {
                    await displayEWpic(interaction, enemy, false);
                } else {
                    await displayEWOpic(interaction, enemy, false);
                }
            }
        }
        else if (interaction.options.getSubcommand() === 'info') {
            const skill = interaction.options.getString('stat');
            //'speed', 'strength', 'dexterity', 'intelligence'
            if (skill) {
                let list;

                if (skill === 'speed') {
                    list = ('2% Increased chance per skillpoint to land 2 hits before enemy attacks');
                } else if (skill === 'strength') {
                    list = ('Increases base health by 10 & base attack by 2');
                } else if (skill === 'dexterity') {
                    list = ('2% Increased chance per skillpoint to land a critical hit');
                } else if (skill === 'intelligence') {
                    list = ('Increases base attack by 8');
                }
                const skillDisplayEmbed = new EmbedBuilder()
                    .setTitle(`Specific stat info`)
                    .setColor(0000)
                    .addFields(
                        {
                            name: (`=== ${skill} ===`),
                            value: list

                        }
                    )
                interaction.followUp({ embeds: [skillDisplayEmbed] }).then(async skillEmbed => setTimeout(() => {
                    skillEmbed.delete();
                }, 40000)).catch(console.error);

            } else {
                interaction.followUp('You have not selected a valid option, please try again using one of the options provided.');
            }
        }
	},

};
