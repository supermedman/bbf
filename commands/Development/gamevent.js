const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { GameEvents } = require('../../dbObjects');
const { objectEntries, createInteractiveChannelMessage, sendTimedChannelMessage } = require('../../uniHelperFunctions');

/**
 * This method creates basic page buttons returning an array in the order of
 * 
 * [Back-Button, Cancel-Button, Forward-Button]
 * @returns {ButtonBuilder[]}
 */
const loadPageButts = () => {
    const nxtPage = new ButtonBuilder()
    .setLabel("Forward")
    .setStyle(ButtonStyle.Primary)
    .setEmoji('▶️')
    .setCustomId('next-page');

    const bckPage = new ButtonBuilder()
    .setLabel("Back")
    .setStyle(ButtonStyle.Primary)
    .setEmoji('◀️')
    .setCustomId('back-page');

    const closePage = new ButtonBuilder()
    .setLabel("Cancel")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('*️⃣')
    .setCustomId('delete-page');

    return [bckPage, closePage, nxtPage];
};

module.exports = {
	data: new SlashCommandBuilder()
	.setName('gamevent')
    .setDescription('Manage an in-game event!')
    .addSubcommand(subcommand => 
        subcommand
        .setName('add')
        .setDescription('Add a new in-game event.')
        .addStringOption(option => 
            option
            .setName('name')
            .setDescription('The name for the new in-game event.')
            .setRequired(true)
        )
        .addStringOption(option => 
            option
            .setName('type')
            .setDescription('What type of event will this be?')
            .addChoices(
                {name: "Seasonal", value: "Season"},
                {name: "Sponsorship", value: "Sponsor"},
                {name: "Promotional", value: "Promote"},
                {name: "Just For Fun", value: "FUN"}
            )
            .setRequired(true)
        )
        .addIntegerOption(option => 
            option
            .setName('effect-amount')
            .setDescription('How many effects will this event have?')
            .setMaxValue(6)
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName('activate')
        .setDescription('Activate an existing inactive in-game event.')
        .addStringOption(option => 
            option
            .setName('name')
            .setDescription('The name of the event to be activated.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName('deactivate')
        .setDescription('Deactivate an existing active in-game event.')
        .addStringOption(option => 
            option
            .setName('name')
            .setDescription('The name of the event to be deactivated.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName('remove')
        .setDescription('Remove an existing in-game event.')
        .addStringOption(option => 
            option
            .setName('name')
            .setDescription('The name of the event to be removed.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName('list')
        .setDescription('List all existing in-game event.')
        .addStringOption(option => 
            option
            .setName('type')
            .setDescription('Filter events by this value.')
            .addChoices(
                {name: "Seasonal", value: "Season"},
                {name: "Sponsorship", value: "Sponsor"},
                {name: "Promotional", value: "Promote"},
            )
        )
        .addStringOption(option => 
            option
            .setName('status')
            .setDescription('Filter events by this value.')
            .addChoices(
                {name: "Active", value: "ON"},
                {name: "Inactive", value: "OFF"}
            )
        )
    ),
    async autocomplete(interaction){
        const focusedOption = interaction.options.getFocused(true);

        let choices = [], focusedValue = interaction.options.getFocused(false);

        const allEvents = await GameEvents.findAll(); 

        if (allEvents.length > 0){
            switch(focusedOption.name){
                case "activate":
                    choices = allEvents.filter(event => !event.active);
                break;
                case "deactivate":
                    choices = allEvents.filter(event => event.active);
                break;
                case "remove":
                    choices = allEvents;
                break;
            }
    
            choices = choices.map(event => event.name);
        } else choices = ["NO EXISTING EVENTS"];

        if (choices.length <= 0) choices = ["NO EXISTING EVENTS"];

        const filtered = choices.filter(choice => choice.startsWith(focusedValue));
        await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice })),
        );
    },
	async execute(interaction) { 
        if (interaction.options.getSubcommand() !== "list" && interaction.user.id !== '501177494137995264') return await interaction.reply('This command is for developers only!!');

        await interaction.deferReply();

        const subCom = interaction.options.getSubcommand();
        const theName = interaction.options.getString('name') ?? "NO EXISTING EVENTS";

        // Handle differently for adding a new event.
        if (subCom === "add"){
            const dupeCheck = await GameEvents.findOne({where: {name: theName}});
            if (dupeCheck) return await interaction.followUp(`An event with the name ${theName} already exists!`);

            /**
             *  === EVENT EFFECT LIST ===
             *  
             * - EXP
             *  - Increase to XP gained
             *  - Range: 
             *      0.25 - 2.00 (Inc by 0.25, Max 8 options)
             * 
             * - COIN
             *  - Increase to Coins gained
             *  - Range: 
             *      0.25 - 2.00 (Inc by 0.25, Max 8 options)
             * 
             * - MAT || MAT_UNIQUE
             *  - Increased dropped material amount
             *  - Range: 
             *      0.25 - 1.00 (Inc by 0.25, Max 4 options)
             * 
             * - ITEM
             *  - Increased Item drop rate
             *  - Range: 
             *      0.05 - 0.25 (Inc by 0.05, Max 5 options)
             * 
             * - LUCK
             *  - Increased chance of higher rar items/materials
             *  - Range: 
             *      0.10 - 0.50 (Inc by 0.10, Max 5 options)
             * 
             * - ENEMY_STR?
             *  - Inc/Dec Enemy Strength
             *  - Range: 
             *      TBD
             * 
             * - ENEMY_HP?
             *  - Inc/Dec Enemy HP amount
             *  - Range: 
             *      TBD
             * 
             * - ENEMY_LVL? 
             *  - Inc/Dec Enemy Spawn Lvl
             *  - Range: 
             *      TBD
             */
            const eventEffectOptionList = {
                EXP: [0.25, 0.50, 0.75, 1, 1.25, 1.5, 1.75, 2],
                COIN: [0.25, 0.50, 0.75, 1, 1.25, 1.5, 1.75, 2],
                MAT: [0.25, 0.50, 0.75, 1],
                MAT_UNIQUE: [0.25, 0.50, 0.75, 1],
                ITEM: [0.05, 0.1, 0.15, 0.20, 0.25],
                LUCK: [0.1, 0.2, 0.3, 0.4, 0.5],
            };
            const typeOptions = ["EXP", "COIN", "MAT", "MAT_UNIQUE", "ITEM", "LUCK"];
            const typeDesc = ["Increase to XP gained", "Increase to Coins gained", "Increased dropped material amount", "Increased dropped unique material amount", "Increased Item drop rate", "Increased chance of higher rar items/materials"];
            const effCount = interaction.options.getInteger('effect-amount');

            const strTypeOptions = [];
            for (let i = 0; i < typeOptions.length; i++){
                const strOption = new StringSelectMenuOptionBuilder()
                .setLabel(typeOptions[i])
                .setDescription(typeDesc[i])
                .setValue(typeOptions[i]);

                strTypeOptions.push(strOption);
            }

            // Handle stringSelectMenu Option build for amount of choices given
            const typeSelectMenu = new StringSelectMenuBuilder()
            .setCustomId('type-select')
            .setPlaceholder(`Select ${effCount} event types!`)
            .setMaxValues(effCount)
            .setMinValues(effCount)
            .addOptions(strTypeOptions);

            const strTypeRow = new ActionRowBuilder().addComponents(typeSelectMenu);

            const typeSelectEmbed = new EmbedBuilder()
            .setTitle('Select Event Effect Types')
            .setDescription(`Select ${effCount} different types!`)
            .setColor('DarkGold');

            const replyObj = {embeds: [typeSelectEmbed], components: [strTypeRow]};
            const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, "FollowUp", "String");

            let collTypes = [];
            collector.on('collect', async c => {
                await c.deferUpdate().then(async () => {
                    collTypes = collTypes.concat(c.values);
                    return await collector.stop('Picked Types');
                }).catch(e => console.error(e));
            });

            collector.on('end', (c, r) => {
                if (!r || r !== "Picked Types"){
                    return anchorMsg.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }

                anchorMsg.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Failed to delete the message:', error);
                    }
                });

                // Handle next string menu creation and collection.
                if (r === "Picked Types"){
                    handlePickedTypes(collTypes);
                }
            });

            async function handlePickedTypes(typeList){
                const valueList = [];
                for (const type of typeList){
                    valueList.push({Type: type, values: eventEffectOptionList[`${type}`]});
                }

                const selectMenuActionRows = [];
                const pickValueEmbeds = [];
                for (const eObj of valueList){
                    const stringSelectOptionList = [];
                    for (const val of eObj.values){
                        const option = new StringSelectMenuOptionBuilder()
                        .setLabel(val.toString())
                        .setValue(val.toString());
                        stringSelectOptionList.push(option);
                    }
                    const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`type-${eObj.Type}`)
                    .setPlaceholder('Select a value!')
                    .addOptions(stringSelectOptionList);

                    const selectRow = new ActionRowBuilder().addComponents(selectMenu);
                    selectMenuActionRows.push(selectRow);

                    const embed = new EmbedBuilder()
                    .setTitle('Select an option')
                    .setColor('Grey')
                    .setDescription(`Select the value for ${eObj.Type}`);
                    pickValueEmbeds.push(embed);
                }

                const valReplyObj = {embeds: [pickValueEmbeds[0]], components: [selectMenuActionRows[0]]};

                const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, valReplyObj, "FollowUp", "String");

                const finalValsPicked = [];
                let valStep = 0;
                collector.on('collect', async c => {
                    await c.deferUpdate().then(async () => {
                        valStep++;
                        finalValsPicked.push({Type: valueList[valStep - 1].Type, value: c.values[0]});

                        if (valStep === effCount) return collector.stop('Vals Picked');

                        await anchorMsg.edit({components: [selectMenuActionRows[valStep]], embeds: [pickValueEmbeds[valStep]]});
                    }).catch(e => console.error(e));
                });

                collector.on('end', async (c, r) => {
                    if (!r || r !== "Vals Picked"){
                        return anchorMsg.delete().catch(error => {
                            if (error.code !== 10008) {
                                console.error('Failed to delete the message:', error);
                            }
                        });
                    }

                    anchorMsg.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });

                    if (r === "Vals Picked"){
                        const eventEffectData = JSON.stringify({Effect: typeList, Value: finalValsPicked.map(obj => obj.value)});

                        const theEvent = await GameEvents.create({
                            name: theName,
                            event_type: interaction.options.getString('type'),
                            event_details: eventEffectData
                        });

                        const theEmbed = loadEventDetailsEmbed(theEvent);

                        theEmbed.setTitle(`== NEW ${theEvent.event_type} CREATED ==`);
                        
                        const newEReply = {embeds: [theEmbed]};
                        return await sendTimedChannelMessage(interaction, 60000, newEReply);
                    }
                });
            }

        } else {
            // Handle working with existing in-game events

            // No events found
            if (subCom !== "list" && theName === "NO EXISTING EVENTS") return await interaction.followUp("No Events Found!!");

            const finalEmbed = new EmbedBuilder(), buttRow = new ActionRowBuilder();
            
            const acceptButt = new ButtonBuilder()
            .setCustomId('accept')
            .setStyle(ButtonStyle.Danger);

            const cancelButt = new ButtonBuilder()
            .setCustomId('cancel')
            .setStyle(ButtonStyle.Secondary);

            const theEvent = await GameEvents.findOne({where: {name: theName}});

            let usePagination = false;
            const finalPages = [];
            switch(subCom){
                case "activate":
                    // Update and reload event
                    acceptButt.setLabel('Activate Event!').setStyle(ButtonStyle.Primary);
                    cancelButt.setLabel('Cancel Activation!');

                    finalEmbed
                    .setTitle("== ACTIVATE EVENT ==")
                    .setDescription(`Confirm the activation of ${theEvent.name}?`)
                    .setColor('Orange');

                    buttRow.addComponents(acceptButt, cancelButt);

                    finalPages.push(finalEmbed);
                break;
                case "deactivate":
                    // Update and reload event
                    acceptButt.setLabel('Deactivate Event!').setStyle(ButtonStyle.Primary);
                    cancelButt.setLabel('Cancel Deactivation!');

                    finalEmbed
                    .setTitle("== DEACTIVATE EVENT ==")
                    .setDescription(`Confirm the deactivation of ${theEvent.name}?`)
                    .setColor('Orange');

                    buttRow.addComponents(acceptButt, cancelButt);

                    finalPages.push(finalEmbed);
                break;
                case "remove":
                    // Remove event, give confirm message.
                    acceptButt.setLabel('Remove Event!');
                    cancelButt.setLabel('Cancel Removal!');

                    finalEmbed
                    .setTitle("== EVENT REMOVAL ==")
                    .setDescription(`Confirm the removal of ${theEvent.name}?`)
                    .setColor('Orange');

                    buttRow.addComponents(acceptButt, cancelButt);

                    finalPages.push(finalEmbed);
                break;
                case "list":
                    const typeFilter = interaction.options.getString('type') ?? 'None';
                    const statusFilter = interaction.options.getString('status') ?? 'None';

                    let eventList = await GameEvents.findAll();
                    if (eventList.length > 1){
                        // Filter by type
                        eventList = (typeFilter !== "None") ? eventList.filter(event => event.event_type === typeFilter) : eventList;
                        // Filter by status, and by state of status === "ON" || "OFF"
                        eventList = (statusFilter !== "None") 
                        ? (statusFilter === "ON") 
                        ? eventList.filter(event => event.active) : eventList.filter(event => !event.active)
                        : eventList;
                        if (eventList.length > 1) usePagination = true;
                    }

                    if (eventList.length === 0) return await interaction.followUp(`No events matched filters:\nType: ${typeFilter}\nStatus: ${statusFilter}`);

                    for (const event of eventList){
                        const theEmbed = loadEventDetailsEmbed(event);
                        finalPages.push(theEmbed);
                    }
                break;
            }

            if (usePagination) buttRow.addComponents(loadPageButts());
            const finalReply = {embeds: [finalPages[0]]};
            if (buttRow.components?.length === 0){
                return await sendTimedChannelMessage(interaction, 60000, finalReply, "FollowUp");
            }

            finalReply.components = [buttRow];

            const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, finalReply, "FollowUp");

            let curPage = 0;
            collector.on('collect', async c => {
                await c.deferUpdate().then(async () => {
                    switch(c.customId){
                        case "accept":
                            const accReplyEmbed = new EmbedBuilder();
                            // Handle accepted logic here
                            switch(subCom){
                                case "activate":
                                    // Activate event
                                    accReplyEmbed
                                    .setTitle('== EVENT ACTIVATED ==')
                                    .setDescription(`${theEvent.name} has been activated!!`)
                                    .setColor('Green');

                                    await theEvent.update({active: true}).then(async e => await e.save()).then(async e => {return await e.reload()});
                                break;
                                case "deactivate":
                                    // Deactivate event
                                    accReplyEmbed
                                    .setTitle('== EVENT DEACTIVATED ==')
                                    .setDescription(`${theEvent.name} has been deactivated!!`)
                                    .setColor('Grey');

                                    await theEvent.update({active: false}).then(async e => await e.save()).then(async e => {return await e.reload()});
                                break;
                                case "remove":
                                    // Remove event
                                    accReplyEmbed
                                    .setTitle('== EVENT REMOVED ==')
                                    .setDescription(`${theEvent.name} has been removed!!`)
                                    .setColor('DarkRed');

                                    await theEvent.destroy();
                                break;
                            }
                            const accReply = {embeds: [accReplyEmbed]};
                            await collector.stop(subCom);
                        return await sendTimedChannelMessage(interaction, 45000, accReply);
                        case "next-page":
                            curPage = (curPage === finalPages.length - 1) ? 0 : curPage + 1;
                        break;
                        case "back-page":
                            curPage = (curPage === 0) ? curPage = finalPages.length - 1 : curPage - 1;
                        break;
                        case "delete-page":
                        return collector.stop('Canceled');
                        case "cancel":
                        return collector.stop('Canceled');
                    }
                    await anchorMsg.edit({ components: [buttRow], embeds: [finalPages[curPage]]});
                }).catch(e => console.error(e));
            });

            collector.on('end', (c, r) => {
                anchorMsg.delete().catch(e => {
                    if (e.code !== 10008) {
                        console.error('Failed to delete the message:', e);
                    }
                });
            });
        }

        /**
         * This function constructs an embed object from the given game event entry
         * using deconstructed event details for field values.
         * @param {object} event GameEvents Instance Object
         * @returns {EmbedBuilder}
         */
        function loadEventDetailsEmbed(event){
            const embedColour = (event.active) ? 'DarkGreen': 'DarkRed';

            const eventObj = JSON.parse(event.event_details);
            const eventPairs = [];
            let effTypes = [], effVals = [];
            for (let [key, value] of objectEntries(eventObj)){
                if (key === "Effect"){
                    // Handle Effect array Values
                    // Modify Values into "Key" names for final display
                    eventPairs.push(key);
                    effTypes = effTypes.concat(value);
                } else if (key === "Value"){
                    // Handle Value array
                    // Each elem in Value array links by index to Effect array
                    eventPairs.push(key + "s:");
                    effVals = effVals.concat(value);
                }
            }

            // Adding bold MD effect to imposed title section.
            let eventStr = "**" + eventPairs.join(' ') + "**";
            // Set pair length and loop through, joining each pair to the 
            // final eventStr prepared for displaying
            const pairLen = effTypes.length;
            for (let i = 0; i < pairLen; i++){
                eventStr += `\n${effTypes[i]}: **${effVals[i]}**`;
            }

            const eventEmbed = new EmbedBuilder()
            .setTitle(`== ${event.name} ==`)
            .setColor(embedColour)
            .addFields(
                {name: `${event.event_type} Event: `, value: eventStr}
            );

            return eventEmbed;
        }
	},
};