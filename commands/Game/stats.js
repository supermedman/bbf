const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { UserData, ActiveStatus, Town, CraftControllers, UserTasks } = require('../../dbObjects.js');
const { createEnemyDisplay } = require('./exported/displayEnemy.js');
const enemyList = require('../../events/Models/json_prefabs/enemyList.json');
const { errorForm } = require('../../chalkPresets.js');

const { checkHintLootBuy } = require('./exported/handleHints.js');
const { sendTimedChannelMessage, grabUser, makeCapital, createInteractiveChannelMessage, handleCatchDelete, objectEntries } = require('../../uniHelperFunctions.js');
const { lvlScaleCheck } = require('../Development/Export/uni_userPayouts.js');
const { baseCheckRarName } = require('../Development/Export/itemStringCore.js');
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
                usersEmbedList.push(userPageEmbed);

                const userStatusOutcome = await createUserStatusPage(user);
                if (userStatusOutcome === "No Status") {
                    usersEmbedList.push("No Embed");
                } else usersEmbedList.push(new EmbedBuilder().setTitle("Placeholder Status Embed"));

                const userTownEmbed = await createUserTownPage(user);
                if (userTownEmbed === "No Town") {
                    usersEmbedList.push("No Embed");
                } else usersEmbedList.push(userTownEmbed);

                const userCraftsEmbed = await createUserCraftsPage(user);
                if (userCraftsEmbed === "No Crafts") {
                    usersEmbedList.push("No Embed");
                } else usersEmbedList.push(userCraftsEmbed);

                const userTasksEmbed = await createUserTasksPage(user);
                if (userTasksEmbed === "No Tasks") {
                    usersEmbedList.push("No Embed");
                } else usersEmbedList.push(userTasksEmbed);

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

                const disableTracker = {
                    lastShown: 'basic',
                    basic: {
                        perm: false,
                        shown: true
                    },
                    status: {
                        perm: showStatus,
                        shown: false
                    },
                    town: {
                        perm: showTown,
                        shown: false
                    },
                    craft: {
                        perm: showCrafts,
                        shown: false
                    },
                    task: {
                        perm: showTasks,
                        shown: false
                    }
                };

                collector.on('collect', async c => {
                    await c.deferUpdate().then(async () => {
                        disableTracker[`${disableTracker.lastShown}`].shown = false;
                        let editWith;
                        switch(c.customId){
                            case "basic-page":
                                disableTracker.basic.shown = true;
                                disableTracker.lastShown = 'basic';
                                editWith = {embeds: [usersEmbedList[0]], components: [basicButtRow]};
                            break;
                            case "status-page":
                                disableTracker.status.shown = true;
                                disableTracker.lastShown = 'status';
                                editWith = {embeds: [usersEmbedList[1]], components: [basicButtRow]};
                            break;
                            case "town-page":
                                disableTracker.town.shown = true;
                                disableTracker.lastShown = 'town';
                                editWith = {embeds: [usersEmbedList[2]], components: [basicButtRow]};
                            break;
                            case "craft-page":
                                disableTracker.craft.shown = true;
                                disableTracker.lastShown = 'craft';
                                editWith = {embeds: [usersEmbedList[3]], components: [basicButtRow]};
                            break;
                            case "task-page":
                                disableTracker.task.shown = true;
                                disableTracker.lastShown = 'task';
                                editWith = {embeds: [usersEmbedList[4]], components: [basicButtRow]};
                            break;
                        }

                        basicPageButt.setDisabled(
                            (disableTracker.basic.perm) 
                            ? true : (disableTracker.basic.shown) 
                            ? true : false
                        );

                        statusPageButt.setDisabled(
                            (disableTracker.status.perm) 
                            ? true : (disableTracker.status.shown) 
                            ? true : false
                        );

                        townPageButt.setDisabled(
                            (disableTracker.town.perm) 
                            ? true : (disableTracker.town.shown) 
                            ? true : false
                        );

                        craftsPageButt.setDisabled(
                            (disableTracker.craft.perm) 
                            ? true : (disableTracker.craft.shown) 
                            ? true : false
                        );

                        tasksPageButt.setDisabled(
                            (disableTracker.task.perm) 
                            ? true : (disableTracker.task.shown) 
                            ? true : false
                        );

                        await anchorMsg.edit(editWith);
                    }).catch(e => console.error(e));
                });

                collector.on('end', async (c, r) => {
                    if (!r || r === 'Time'){
                        await handleCatchDelete(anchorMsg);
                    }

                    await handleCatchDelete(anchorMsg);
                });

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
         * @param {object} user UserData Instance Object
         * @returns {Promise <EmbedBuilder> | string}
         */
        async function createUserTownPage(user){
            const town = (user.townid === '0') ? 'None': await Town.findOne({where: {townid: user.townid}});
            if (town === 'None') return "No Town";
            
            const townEmbed = new EmbedBuilder()
            .setTitle(`== Town of ${makeCapital(town.name)} ==`);

            // Basic Info
            // ==========
            // Level, Coins, Location, Population
            const locationSwitch = town.local_biome.split("-");
            const basicField = {
                name: '== Basic Info ==',
                value: `Town Level: **${town.level}**\nTown Coins: **${town.coins}**c\nTown Biome: **${locationSwitch[1]} ${locationSwitch[0]}**\nPlayer Population: **${town.population - town.npc_population}**\nNPC Population: **${town.npc_population}**`
            };

            // Mayor Info
            // ==========
            // Cur-User?
            const theMayor = await grabUser(town.mayorid);
            const mayorField = {
                name: '== The Mayor ==',
                value: `**${makeCapital(theMayor.username)}**`
            };

            // Build Info
            // ==========
            // Tot-Plots, Open, Closed, Built
            const buildFields = {
                name: '== Plot Info ==',
                value: `Total Plots: **${town.buildlimit}**\nOpen Plots: **${town.openplots}**\nClosed Plots: **${town.closedplots}**\nOwned Plots: **${town.ownedplots}**\nDeveloped Plots: **${town.buildcount}**`
            };

            // Core Info
            // =========
            // Grandhall, Bank, Market, Tavern, Clergy
            const coreFields = {
                name: '== Core-Building Info ==',
                value: `Grandhall Status: **${(town.grandhall_status === "None") ? "Not Built" : town.grandhall_status}**\nBank Status: **${(town.bank_status === "None") ? "Not Built" : town.bank_status}**\nMarket Status: **${(town.market_status === "None") ? "Not Built" : town.market_status}**\nTavern Status: **${(town.tavern_status === "None") ? "Not Built" : town.tavern_status}**\nClergy Status: **${(town.clergy_status === "None") ? "Not Built" : town.clergy_status}**`
            };

            // Band Info?
            // ==========
            // Band 1, Band 2
            // TBD

            townEmbed.addFields([basicField, mayorField, buildFields, coreFields]);

            return townEmbed;
        }

        /**
         * This function handles generating the users crafting info embed.
         * If no ``CraftController`` is found, returns ``"No Crafts"``
         * @param {object} user UserData Instance Object
         * @returns {Promise <EmbedBuilder> | string}
         */
        async function createUserCraftsPage(user){
            const controller = await CraftControllers.findOne({where: {user_id: user.userid}});
            if (!controller) return "No Crafts";

            const craftEmbed = new EmbedBuilder()
            .setTitle(`== ${makeCapital(user.username)}'s Crafting Ledger ==`);

            // Progress Info
            // =============
            // max_rar, drop_rar, use_tooly, rar_tooly, max_tooly, imbue1, imbue2
            const unlockField = {
                name: '== Crafting Ability ==',
                value: `Strongest Material Useable: **${baseCheckRarName(controller.max_rar)}**\nHighest Droppable Material: **${baseCheckRarName(controller.drop_rar)}**`
            };
            unlockField.value += (controller.use_tooly) ? `\nCraft Using Tooly: **Available**\nStrongest Tooly Useable: **${baseCheckRarName(controller.rar_tooly)}**\nMax Amount of Tooly: **${controller.max_tooly}**` : "\nCraft Using Tooly: **Unavailable**";
            unlockField.value += (controller.imbue_one) ? "\nImbue While Crafting: **Available**": "\nImbue While Crafting: **Unavailable**";
            unlockField.value += (controller.imbue_two) ? "\nSecond Imbue Slot: **Available**": "\nSecond Imbue Slot: **Unavailable**";
            
            // Crafted Stats
            // =============
            // tot_crafted, value_crafted, times_imbued, highest_rarity, highest_value, benchmark_crafts
            const basicField = {
                name: '== Basic Crafting Stats ==',
                value: `Total Items Crafted: **${controller.tot_crafted}**\nTotal Value Crafted: **${controller.value_crafted}**c\nItems Imbued: **${controller.times_imbued}**\nHighest Rarity Crafted: **${baseCheckRarName(controller.highest_rarity)}**\nHighest Value Craft: **${controller.highest_value}**c\nItems Added to Loot Pool: **${controller.benchmark_crafts}**`
            };
            
            // Extra Stats
            // ===========
            // crafts above rar 10
            const highCraftData = JSON.parse(controller.rarity_tracker);
            const kvPairs = objectEntries(highCraftData);
            const pairObjList = [];
            for (const [key, value] of kvPairs){
                pairObjList.push({key: key, value: value});
            }
            const totalHighCrafts = pairObjList.reduce((acc, obj) => {
                return (acc > 0) ? acc + obj.value : obj.value;
            }, 0);
            const extraField = {
                name: `== ${baseCheckRarName(13)} and Stronger Crafts ==`,
                value: ''
            };
            extraField.value += (totalHighCrafts > 0) ? `${pairObjList.map(obj => `${baseCheckRarName(obj.key)}: **${obj.value}**\n`)}`: "No Items Crafted!";

            // Strongest Item Pages
            // ====================
            // Page 1: Weapon
            // Page 2: Armor
            // Page 3: Offhand
            // Page 4: Highest Value Item

            craftEmbed.addFields([unlockField, basicField, extraField]);
            
            return craftEmbed;
        }

        async function createUserTasksPage(user){
            const userTasks = await UserTasks.findAll({where: {userid: user.userid}});
            if (userTasks.length === 0) return "No Tasks";

            const taskEmbed = new EmbedBuilder()
            .setTitle(`== ${makeCapital(user.username)}'s Task Overview ==`);

            const cTaskList = userTasks.filter(task => task.complete);
            const fTaskList = userTasks.filter(task => task.failed);
            const aTaskList = userTasks.filter(task => !task.complete && !task.failed);

            // Basic Info
            // ==========
            // Completed, Failed, Active
            const basicField = {
                name: '== Task History ==',
                value: `Completed Tasks: **${cTaskList.length}**\nFailed Tasks: **${fTaskList.length}**\nActive Tasks: **${aTaskList.length}**`
            };

            // Extra Info
            // ==========
            // Completed Amount @ Difficulty For:
            // Fetch, Combat, Gather, Craft?
            const tList = ["Fetch", "Gather", "Combat"]; // "Craft"
            const diffOrderList = ["Baby", "Easy", "Medium", "Hard", "GodGiven"];

            const taskTypeObjTotalList = [];
            for (const type of tList){
                const pushObj = {
                    tType: type,
                    hardest: "Baby",
                    easiest: "GodGiven",
                    total: {
                        complete: 0,
                        failed: 0,
                        active: 0
                    }
                };
                const typeMatchList = userTasks.filter(task => task.task_type === type);
                if (typeMatchList.length === 0) {
                    pushObj.hardest = "None";
                    pushObj.easiest = "None";
                    taskTypeObjTotalList.push(pushObj);
                    continue;
                }

                const cMatchList = typeMatchList.filter(task => task.complete);
                if (cMatchList.length > 0){
                    for (const t of cMatchList){
                        // Check if new Highest Difficulty
                        if (diffOrderList.indexOf(t.task_difficulty) > diffOrderList.indexOf(pushObj.hardest))
                            pushObj.hardest = t.task_difficulty;

                        // Check if new Lowest Difficulty
                        if (diffOrderList.indexOf(t.task_difficulty) < diffOrderList.indexOf(pushObj.easiest))
                            pushObj.easiest = t.task_difficulty;

                        // Inc total.complete
                        pushObj.total.complete++;
                    }
                } else {
                    pushObj.hardest = "None";
                    pushObj.easiest = "None";
                }

                const fMatchList = typeMatchList.filter(task => task.failed);
                pushObj.total.failed = fMatchList.length;

                const aMatchList = typeMatchList.filter(task => !task.complete && !task.failed);
                pushObj.total.active = aMatchList.length;

                taskTypeObjTotalList.push(pushObj);
            }

            /**
             * const pushObj = {
                    tType: type,
                    hardest: "Baby",
                    easiest: "GodGiven",
                    total: {
                        complete: 0,
                        failed: 0,
                        active: 0
                    }
                };
             */
            const taskDetailField = {
                name: '== Task Details ==',
                value: `${taskTypeObjTotalList.map(obj => `== **${obj.tType}** ==\nHardest Completed: **${obj.hardest}**\nEasiest Completed: **${obj.easiest}**\nTotal Completed: **${obj.total.complete}**\nTotal Failed: **${obj.total.failed}**\nTotal Active: **${obj.total.active}**`)}`
            };
            
            return taskEmbed;
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
