const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { UserData, ActiveStatus, Town, CraftControllers, UserTasks } = require('../../dbObjects.js');
const { createEnemyDisplay } = require('./exported/displayEnemy.js');
const enemyList = require('../../events/Models/json_prefabs/enemyList.json');
const { errorForm } = require('../../chalkPresets.js');

const { checkHintLootBuy } = require('./exported/handleHints.js');
const { sendTimedChannelMessage, grabUser, makeCapital, createInteractiveChannelMessage } = require('../../uniHelperFunctions.js');
const { lvlScaleCheck } = require('../Development/Export/uni_userPayouts.js');
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

            choices = ['speed', 'strength', 'dexterity', 'intelligence', 'health'];

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

                //Mapping the complete list of options for discord to handle and present to the user
                const filtered = choices.filter(choice => choice.startsWith(focusedValue));
                await interaction.respond(
                    filtered.map(choice => ({ name: choice, value: choice })),
                );
            }
        } 
    },
    async execute(interaction) {
        if (!interaction) return;

        if (interaction.options.getSubcommand() === 'user') {
            if (interaction.user.id === '501177494137995264'){
                await interaction.deferReply();

                const theUser = interaction.options.getUser('player') ?? interaction.user;

                const user = await grabUser(theUser.id);
                if (!user) return await interaction.followUp(`${theUser.username} does not have a profile!`);

                const usersEmbedList = [];

                // ========
                //  EMBEDS
                // ========
                const userPageEmbed = createBasicUserPage(user);

                const userStatusOutcome = await createUserStatusPage(user);

                const userTownEmbed = await createUserTownPage(user);

                const userCraftsEmbed = await createUserCraftsPage(user);

                const userTasksEmbed = await createUserTasksPage(user);

                // TEMP CODE
                usersEmbedList.push(userPageEmbed);

                // =========
                //  BUTTONS
                // =========
                const basicPageButt = new ButtonBuilder()
                .setCustomId('basic-page')
                .setDisabled(true)
                .setStyle(ButtonStyle.Primary)
                .setLabel('Basic Stats');

                const showStatus = (userStatusOutcome === 'No Status') ? true : false;
                const statusPageButt = new ButtonBuilder()
                .setCustomId('status-page')
                .setDisabled(showStatus)
                .setStyle(ButtonStyle.Secondary)
                .setLabel('Potion Effects');

                const showTown = (userTownEmbed === 'No Town') ? true : false;
                const townPageButt = new ButtonBuilder()
                .setCustomId('town-page')
                .setDisabled(showTown)
                .setStyle(ButtonStyle.Secondary)
                .setLabel('Town Info');

                const showCrafts = (userCraftsEmbed === 'No Crafts') ? true : false;
                const craftsPageButt = new ButtonBuilder()
                .setCustomId('craft-page')
                .setDisabled(showCrafts)
                .setStyle(ButtonStyle.Secondary)
                .setLabel('Crafting Stats');

                const showTasks = (userTasksEmbed === 'No Tasks') ? true : false;
                const tasksPageButt = new ButtonBuilder()
                .setCustomId('task-page')
                .setDisabled(showTasks)
                .setStyle(ButtonStyle.Secondary)
                .setLabel('Task Stats');

                const basicButtRow = new ActionRowBuilder().addComponents(basicPageButt, statusPageButt, townPageButt, craftsPageButt, tasksPageButt);

                const replyObj = {embeds: [usersEmbedList[0]], components: [basicButtRow]};

                const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 240000, replyObj, "FollowUp");
            
                // ================
                // HANDLE COLLECTOR
                // ================
            } else {
                // OLD CODE 
                await interaction.deferReply().then(async () => {
                    const user = interaction.options.getUser('player');

                    const hasDataCheck = await UserData.findOne({ where: { userid: interaction.user.id } });
                    if (!hasDataCheck) return await interaction.followUp('You do not have a game profile yet! Please use ``/start`` to begin!!');

                    if (user) {
                        const uData = await UserData.findOne({ where: { userid: user.id } });
                        if (!uData) return await interaction.followUp('No game profile found!');

                        let userTown = 'None';
                        if (uData.townid !== '0') userTown = await Town.findOne({ where: { townid: uData.townid } });
    
                        const nxtLvl = calcNextLevel(uData);
                        const list = makeListStr(uData, nxtLvl, userTown);


                        const userDisplayEmbed = new EmbedBuilder()
                            .setTitle(`Requested Stats for:`)
                            .setColor(0o0)
                            .addFields(
                                {
                                    name: (`${uData.username}`),
                                    value: list

                                }
                            )
                        return await interaction.followUp({ embeds: [userDisplayEmbed] });
                    }

                    const uData = await UserData.findOne({ where: { userid: interaction.user.id } });
                    if (!uData) return await interaction.followUp('No user data found!');

                    const activeUserStatus = await ActiveStatus.findAll({ where: { spec_id: interaction.user.id } });

                    if (uData.coins > 100) await checkHintLootBuy(uData, interaction);

                    let userTown = 'None';
                    if (uData.townid !== '0') userTown = await Town.findOne({ where: { townid: uData.townid } });

                    const nxtLvl = calcNextLevel(uData);
                    const list = makeListStr(uData, nxtLvl, userTown);

                    let embedPages = [];

                    const userDisplayEmbed = {
                        title: `Requested Stats for: `,
                        color: 0o0,
                        fields: [{
                            name: `${uData.username}`,
                            value: list,
                        }],
                    };
                    if (activeUserStatus.length <= 0) return await interaction.followUp({ embeds: [userDisplayEmbed] });
                    embedPages.push(userDisplayEmbed);

                    let curRun = 0;
                    do {
                        let finalFields = [];
                        let breakPoint = 0;
                        for (const status of activeUserStatus) {
                            let embedFieldsName = ``;
                            let embedFieldsValue = ``;
                            let embedFieldsObj;

                            embedFieldsName = `Active effect: ${status.name}`;
                            if (status.duration <= 0) {
                                if (status.curreffect === 0) {
                                    embedFieldsValue = `Cooldown remaining: ${status.cooldown}`;
                                } else {
                                    embedFieldsValue = `Cooldown remaining: ${status.cooldown}\n${status.activec}: ${status.curreffect}`;
                                }
                            } else {
                                if (status.curreffect === 0) {
                                    embedFieldsValue = `Duration remaining: ${status.duration} \nCooldown remaining: ${status.cooldown}`;
                                } else {
                                    embedFieldsValue = `Duration remaining: ${status.duration} \nCooldown remaining: ${status.cooldown} \n${status.activec}: ${status.curreffect}`;
                                }
                            }

                            embedFieldsObj = { name: embedFieldsName.toString(), value: embedFieldsValue.toString(), };
                            finalFields.push(embedFieldsObj);

                            breakPoint++;
                            if (breakPoint === 5) break;
                        }

                        const embed = {
                            title: `Active Status Effects: Page ${(curRun + 1)}`,
                            color: 0o0,
                            fields: finalFields,
                        };

                        embedPages.push(embed);
                        curRun++;
                    } while (curRun < (activeUserStatus.length / 5))

                    const backButton = new ButtonBuilder()
                        .setLabel("Back")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('◀️')
                        .setCustomId('back-page');

                    const cancelButton = new ButtonBuilder()
                        .setLabel("Cancel")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('*️⃣')
                        .setCustomId('delete-page');

                    const forwardButton = new ButtonBuilder()
                        .setLabel("Forward")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('▶️')
                        .setCustomId('next-page');

                    const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

                    const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

                    const filter = (ID) => ID.user.id === interaction.user.id;

                    const collector = embedMsg.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        filter,
                        time: 300000,
                    });

                    let currentPage = 0;

                    collector.on('collect', async (collInteract) => {
                        if (collInteract.customId === 'next-page') {
                            await collInteract.deferUpdate();
                            if (currentPage === embedPages.length - 1) {
                                currentPage = 0;
                                await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                            } else {
                                currentPage += 1;
                                await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                            }
                        }
                        if (collInteract.customId === 'back-page') {
                            await collInteract.deferUpdate();
                            if (currentPage === 0) {
                                currentPage = embedPages.length - 1;
                                await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                            } else {
                                currentPage -= 1;
                                await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
                            }
                        }
                        if (collInteract.customId === 'delete-page') {
                            await collInteract.deferUpdate();
                            await collector.stop();
                        }
                    });

                    collector.on('end', () => {
                        if (embedMsg) {
                            embedMsg.delete();
                        }
                    });
                        
                }).catch(error => {
                    console.log(errorForm(error));
                });
            }
        }

        if (interaction.options.getSubcommand() === 'enemy') {
            //handle enemies here
            await interaction.deferReply();
            const nameStr = interaction.options.getString('name');

            const theEnemy = enemyList.filter(enemy => enemy.Name === nameStr);
            if (theEnemy.length <= 0) return await interaction.followUp(`${nameStr} could not be found! Please try again with the first letter capitilized and selecting one of the provided options!`);
            const enemyRef = theEnemy[0];

            return await createEnemyDisplay(enemyRef, interaction);
        }

        if (interaction.options.getSubcommand() === 'info') {
            await interaction.deferReply();
            const skill = interaction.options.getString('stat') ?? "None";
            if (skill === "None") return interaction.followUp('Invalid option, please choose from the options provided!');

            const user = await grabUser(interaction.user.id);

            const healthModC = ["Mage", "Thief", "Warrior", "Paladin"];
            const healthModM = [1.1, 1.2, 1.5, 2];

            let list;
            switch(skill){
                case "speed":
                    list = '**2**% Increased chance per skillpoint to land 2 hits before enemy attacks.\n+**2**% Chance to succeed when hiding or stealing from an enemy.';
                    list += `\n\nYour current Double Hit Chance: **${(user.speed * 0.02) * 100}**%`;
                break;
                case "strength":
                    list = 'Increases base Health by **5** & base Damage by **3**';
                    list += `\n\nYour Health increase from strength: +**${user.strength * 5}** HP`;
                    list += `\nYour Damage increase from strength: +**${user.strength * 3}** DMG`;
                break;
                case "dexterity":
                    list = '**2**% Increased chance per skillpoint to land a critical hit.\n+**2**% Chance to succeed when hiding or stealing from an enemy.';
                    list += `\n\nYour current Critical Hit Chance: **${(user.dexterity * 0.02) * 100}**%`;
                break;
                case "intelligence":
                    list = 'Increases base attack by **10**';
                    list += `\n\nYour Damage increase from intelligence: +**${user.intelligence * 10}** DMG`;
                break;
                case "health":
                    list = `Base health starts at **100** increasing by **2 every level**.\nYour base health: ${100 + (user.level * 2)} HP`;
                    list += `\nBase Health after Strength: **${100 + (user.level * 2) + (user.strength * 5)}** HP`;
                    list += '\n\nThis total is modified based on your Class: \nMage x1.1, Thief x1.2, Warrior x1.5, Paladin x2.0';
                    list += `\n\nYour current Max Health: **${Math.round((100 + (user.level * 2) + (user.strength * 5)) * healthModM[healthModC.indexOf(user.pclass)])}** HP`;
                break;
            }

            const skillDisplayEmbed = new EmbedBuilder()
            .setTitle(`Specific stat info`)
            .setColor(0o0)
            .addFields({
                name: (`=== ${skill} ===`),
                value: list
            });
            const replyObj = {embeds: [skillDisplayEmbed]};
            await sendTimedChannelMessage(interaction, 40000, replyObj, "FollowUp");
        }

        /**
         * This function handles calculating the given users max possible health.
         * @param {object} user UserData Instance Object
         * @returns {number} Max Health for given user
         */
        function handleHealthMod(user){
            const healthModC = ["Mage", "Thief", "Warrior", "Paladin"];
            const healthModM = [1.1, 1.2, 1.5, 2];
            const baseHealth = 100;

            const maxUserHP = (baseHealth + (user.level * 2) + (user.strength * 5)) * healthModM[healthModC.indexOf(user.pclass)];
            
            return Math.round(maxUserHP);
        }

        /**
         * This function generates the basic user stats embed page
         * @param {object} user UserData Instance Object
         * @returns {EmbedBuilder}
         */
        function createBasicUserPage(user){
            const embed = new EmbedBuilder()
            .setTitle(`== ${makeCapital(user.username)}'s Stats ==`);

            // Basic Stats
            // ===========
            // Class, Spd, Str, Int, Dex, Cur-HP, Max-HP
            const basicField = {
                name: '== Basic Stats ==', 
                value: `Class: **${user.pclass}**\nSpeed: **${user.speed}**\nStrength: **${user.strength}**\nIntelligence: **${user.intelligence}**\nDexterity: **${user.dexterity}**\nCurrent Health: **${user.health}** HP\nMax Health: **${handleHealthMod(user)}** HP`
            };

            // Progress Stats
            // ===========
            // Level, Cur-XP/Need-XP, Perk Points, Coins
            const levelField = {
                name: '== Progress Stats ==',
                value: `Level: **${user.level}**\nProgress to next level: **${user.xp}**/${lvlScaleCheck(user.level)}\nPerk Points: **${user.points}**\nCoins: **${user.coins}**c`
            };

            // Quest Stats
            // ===========
            // Hours Quested, QTS, Locations?, Story Progress?
            const questField = {
                name: '== Quest Stats ==',
                value: `Aprox. Hours Spent Questing: **${user.qt - Math.floor(user.qt/4)}**\nQuest Tokens: **${user.qt}** QT\n`
            };


            // Combat Stats
            // ============
            // Tot-Kills, One-Life-Max, Last-Death, Kills-Since
            const combatField = {
                name: '== Combat Stats ==',
                value: `Total Kills: **${user.totalkills}**\nMost Kills in One Life: **${user.highestkills}**\nLast Defeated by: **${user.lastdeath}**\nKills Since Last Death: **${user.killsthislife}**`
            };

            embed.addFields([basicField, levelField, questField, combatField]);

            return embed;
        }

        /**
         * This function handles any active or on cooldown status effects applied from potion use
         * for the given user. If no statuses returns ``"No Status"``
         * @param {object} user UserData Instance Object
         * @returns {Promise <{active: {useButtons: boolean, embeds: EmbedBuilder[]}, cooling: {useButtons: boolean, embeds: EmbedBuilder[]}}> | string}
         */
        async function createUserStatusPage(user){
            const activeStatuses = await ActiveStatus.findAll({where: {spec_id: user.userid}});
            if (activeStatuses.length === 0) return "No Status";

            // Active Effects
            // ==============
            const activeEffObj = {
                useButtons: false,
                embeds: []
            };
            const stillActiveList = activeStatuses.filter(eff => eff.duration > 0);
            if (stillActiveList.length > 0){
                // Effects found
                const usePagination = (stillActiveList.length > 4) ? true : false;
                let curRun = 0, maxRun = 4, lastMaxRun = 4, pageRun;
                pageRun = Math.ceil(stillActiveList.length/4);
                if (stillActiveList.length % 4 !== 0){
                    lastMaxRun = stillActiveList.length % 4;
                }

                for (let i = 0; i < pageRun; i++){
                    const finalFields = [];
                    const curEffSection = stillActiveList.slice(curRun, (i + 1 === pageRun) ? curRun + lastMaxRun : curRun + maxRun);
                
                    for (const eff of curEffSection){
                        finalFields.push({
                            name: `= **${eff.name}** =`,
                            value: handleEffectStatusFields(eff)
                        });
                        curRun++;
                    }

                    const embedPage = new EmbedBuilder()
                    .setTitle('== Active Effects ==')
                    .setDescription(`Page ${i + 1}/${pageRun}`)
                    .addFields(finalFields);

                    activeEffObj.embeds.push(embedPage);
                }

                if (usePagination) activeEffObj.useButtons = true;
            }

            // Cooldown Active
            // ===============
            const onCooldownObj = {
                useButtons: false,
                embeds: []
            };
            const onCooldownList = activeStatuses.filter(eff => eff.duration === 0 && eff.cooldown > 0);
            if (onCooldownList.length > 0){
                // Cooldowns found
                const usePagination = (onCooldownList.length > 4) ? true : false;
                let curRun = 0, maxRun = 4, lastMaxRun = 4, pageRun;
                pageRun = Math.ceil(onCooldownList.length/4);
                if (onCooldownList.length % 4 !== 0){
                    lastMaxRun = onCooldownList.length % 4;
                }

                for (let i = 0; i < pageRun; i++){
                    const finalFields = [];
                    const curEffSection = onCooldownList.slice(curRun, (i + 1 === pageRun) ? curRun + lastMaxRun : curRun + maxRun);
                
                    for (const eff of curEffSection){
                        finalFields.push({
                            name: `= **${eff.name}** =`,
                            value: handleEffectStatusFields(eff, true)
                        });
                        curRun++;
                    }

                    const embedPage = new EmbedBuilder()
                    .setTitle('== Effects on Cooldown ==')
                    .setDescription(`Page ${i + 1}/${pageRun}`)
                    .addFields(finalFields);

                    onCooldownObj.embeds.push(embedPage);
                }

                if (usePagination) onCooldownObj.useButtons = true;
            }

            return {active: activeEffObj, cooling: onCooldownObj};
        }

        /**
         * This function constructs an embed field value property which it returns
         * @param {object} effectObj ActiveStatus Instance Object   
         * @param {boolean} cooling default false, true if duration = 0
         * @returns {string}
         */
        function handleEffectStatusFields(effectObj, cooling=false){
            if (!cooling){
                switch(effectObj.activec){
                    case "Reinforce":
                    return `Defence Increased by: ${effectObj.curreffect}\nDuration Remaining: ${effectObj.duration}\nCooldown: ${effectObj.cooldown}`;
                    case "EXP":
                    return `EXP Gain Increased by: x${effectObj.curreffect}\nDuration Remaining: ${effectObj.duration}\nCooldown: ${effectObj.cooldown}`;
                    case "Tons":
                    return `Stats Increased by: +${effectObj.curreffect}\nDuration Remaining: ${effectObj.duration}\nCooldown: ${effectObj.cooldown}`;
                    default:
                    return `${effectObj.activec}`;
                }
            }
            
            switch(effectObj.activec){
                case "Reinforce":
                return `Defence Increased by: ${effectObj.curreffect}\nCooldown: ${effectObj.cooldown}`;
                case "EXP":
                return `EXP Gain Increased by: x${effectObj.curreffect}\nCooldown: ${effectObj.cooldown}`;
                case "Tons":
                return `Stats Increased by: +${effectObj.curreffect}\nCooldown: ${effectObj.cooldown}`;
                default:
                return `${effectObj.activec}`;
            }
        }

        /**
         * This function handles generating the users town info embed.
         * If no user town is found, returns ``"No Town"``
         * @param {object} user 
         * @returns {Promise <(EmbedBuilder)> | string}
         */
        async function createUserTownPage(user){
            const town = (user.townid === '0') ? 'None': await Town.findOne({where: {townid: user.townid}});
            if (town === 'None') return "No Town";
        }

        async function createUserCraftsPage(user){
            const controller = await CraftControllers.findOne({where: {user_id: user.userid}});
            if (!controller) return "No Crafts";
        }

        async function createUserTasksPage(user){
            const userTasks = await UserTasks.findAll({where: {userid: user.userid}});
            if (userTasks.length === 0) return "No Tasks";
        }

        function makeListStr(uData, nxtLvl, userTown) {
             const list = `Class: ${uData.pclass}\n
Speed: ${uData.speed}
Strength: ${uData.strength}
Dexterity: ${uData.dexterity}
Intelligence: ${uData.intelligence}
Current Health: ${uData.health}\n
Perk Points: ${uData.points}
\nLevel: ${uData.level}
\nXP to next level: ${uData.xp}/${nxtLvl}
\nCoins: ${uData.coins}\n
Quest Tokens (Qts): ${uData.qt}\n
Current Location: ${uData.current_location}
Current Town: ${userTown.name ?? userTown}\n
\nTotal Enemies Killed: ${uData.totalkills}
Most Kills In One Life: ${uData.highestkills}
\nLast Death: ${uData.lastdeath}
Enemies Killed Since: ${uData.killsthislife}`;
            return list;
        }

        function calcNextLevel(uData) {
            let nxtLvl = 50 * (Math.pow(uData.level, 2) - 1);
            //Adding temp xp needed change at level 20 to slow proggress for now
            if (uData.level === 20) {
                //Adding level scale to further restrict leveling		
                nxtLvl = 75 * (Math.pow(uData.level, 2) - 1);
            } else if (uData.level >= 100) {
                //Adding level scale to further restrict leveling
                const lvlScale = 10 * (Math.floor(uData.level / 3));
                nxtLvl = (75 + lvlScale) * (Math.pow(uData.level, 2) - 1);
            } else if (uData.level > 20) {
                //Adding level scale to further restrict leveling
                const lvlScale = 1.5 * (Math.floor(uData.level / 5));
                nxtLvl = (75 + lvlScale) * (Math.pow(uData.level, 2) - 1);
            } else {/*DO NOTHING*/ }

            return nxtLvl;
        }
	},

};
