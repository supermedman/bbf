const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const {UserData, ItemLootPool, Questing} = require('../../dbObjects.js');
const questList = require('../../events/Models/json_prefabs/questList.json');
//const lootList = require('../../events/Models/json_prefabs/lootList.json');

//const { checkOwned } = require('../Game/exported/createGear.js');
//const {handleMaterialAdding} = require('../Game/exported/materialDropper.js');
const { loadFullRarNameList, checkingRar, checkingSlot, uni_displayItem, checkingRarID } = require('./Export/itemStringCore.js');
const { handleLimitOnOptions, grabUser, makeCapital, sendTimedChannelMessage, inclusiveRandNum } = require('../../uniHelperFunctions.js');
const { checkInboundItem, checkInboundMat } = require('./Export/itemMoveContainer.js');
const { grabColour } = require('../Game/exported/grabRar.js');
const { xpPayoutScale } = require('./Export/Classes/EnemyFab.js');
const { handleUserPayout } = require('./Export/uni_userPayouts.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cheat')
        .setDescription('Dev Command')
        .addSubcommand(subcommand => 
            subcommand
            .setName('give-item')
            .setDescription('Used to give an item')
            .addStringOption(option => 
                option
                .setName('rarity')
                .setDescription('Filter by this rarity')
                .setAutocomplete(true)
                .setRequired(true)
            )
            .addStringOption(option => 
                option
                .setName('slot')
                .setDescription('Filter by this slot')
                .setRequired(true)
                .addChoices(
                    {name: "Mainhand", value: "Mainhand"},
                    {name: "Offhand", value: "Offhand"},
                    {name: "Headslot", value: "Headslot"},
                    {name: "Chestslot", value: "Chestslot"},
                    {name: "Legslot", value: "Legslot"}
                )
            )
            .addStringOption(option => 
                option
                .setName('item-name')
                .setDescription('Name of the item to give!')
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addIntegerOption(option =>
                option
                .setName('amount')
                .setDescription('Item Amount')
            )
            .addUserOption(option => option.setName('target').setDescription('The user'))
        )
        .addSubcommand(subcommand => 
            subcommand
            .setName('give-mat')
            .setDescription('Used to give a material')
            .addStringOption(option =>
                option
                .setName('mat-type')
                .setDescription('The material type to give')
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addStringOption(option => 
                option
                .setName('rarity')
                .setDescription('Filter by this rarity')
                .setAutocomplete(true)
                .setRequired(true)
            )
            .addStringOption(option =>
                option
                .setName('mat-name')
                .setDescription('The material to give')
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addIntegerOption(option =>
                option
                .setName('amount')
                .setDescription('Material Amount')
            )
            .addUserOption(option => option.setName('target').setDescription('The user'))
        )
        .addSubcommand(subcommand => 
            subcommand
            .setName('quest-test')
            .setDescription('Creates/completes the picked quest!')
            .addIntegerOption(option =>
                option
                .setName('q-id')
                .setDescription('Quest ID')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => 
            subcommand
            .setName('kill-payout')
            .setDescription('Creates/completes the picked quest!')
            .addIntegerOption(option =>
                option
                .setName('level')
                .setDescription('Enemy Level to payout for')
                .setRequired(true)
            )
            .addUserOption(option => option.setName('target').setDescription('The user'))
        ),
    
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

		let choices = [];

        // CHEAT IN ITEM
        if (interaction.options.getSubcommand() === 'give-item'){
            const focusedValue = interaction.options.getFocused(false);

            if (focusedOption.name === 'rarity'){
                choices = loadFullRarNameList(10);
            }

            if (focusedOption.name === 'item-name'){
                const rarPicked = interaction.options.getString('rarity');
                const slotPicked = interaction.options.getString('slot');

                let items = await ItemLootPool.findAll();

                items = items.filter(item => checkingRar(item.item_code) === rarPicked && checkingSlot(item.item_code) === slotPicked);
                if (items.length > 0){
                    choices = items.map(item => item.name);
                } else choices = ['No Matches'];
            }


            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				handleLimitOnOptions(filtered).map(choice => ({ name: choice, value: choice })),
			);
        }

        // CHEAT IN MATERIAL
        if (interaction.options.getSubcommand() === 'give-mat'){
            const focusedValue = interaction.options.getFocused(false);

            const {materialFiles} = interaction.client;

            if (focusedOption.name === 'mat-type'){
                for (const [key, value] of materialFiles){
                    choices.push(key);
                }
            }

            if (focusedOption.name === 'rarity'){
                choices = loadFullRarNameList(10);
            }

            if (focusedOption.name === 'mat-name'){
                const matTypePicked = interaction.options.getString('mat-type');
                const rarPicked = interaction.options.getString('rarity');

                const matList = require(materialFiles.get(matTypePicked));
                const matMatch = matList.filter(mat => mat.Rarity === rarPicked);

                if (matMatch.length > 0){
                    choices = matMatch.map(mat => mat.Name);
                } else choices = ['No Matches'];
            }


            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				handleLimitOnOptions(filtered).map(choice => ({ name: choice, value: choice })),
			);
        }
    },
	async execute(interaction) { 
        if (interaction.user.id !== '501177494137995264') return await interaction.reply({content: 'Nope! Only Developers are allowed to use this!', ephemeral: true});

        const {materialFiles} = interaction.client;

        const targetUser = interaction.options.getUser('target') ?? interaction.user;
        const theUser = await grabUser(targetUser.id);
        if (!theUser) return await interaction.reply({content: 'This user does not have a profile yet!', ephemeral: true});

        const subCom = interaction.options.getSubcommand();
        if (subCom === 'quest-test'){
            const qID = interaction.options.getInteger('q-id');

            const questPicked = questList.filter(q => q.ID === qID)[0] ?? 'None';
            if (questPicked === 'None') return await interaction.reply({content: `Quest with ID ${qID} **NOT** found!`, ephemeral: true});

            let theQuest = await Questing.findOrCreate({
                where: {
                    user_id: theUser.userid
                },
                defaults: {
                    qlength: questPicked.Length,
                    qlevel: questPicked.Level,
                    qname: questPicked.Name,
                    qid: questPicked.ID,
                    qstory: questPicked.Story,
                }
            });

            if (theQuest[1]){
                await theQuest[0].save().then(async q => {return await q.reload()});
            } else if (theQuest[0].qid !== qID) return await interaction.reply({content: `Active quest found with ID ${theQuest[0].qid}`, ephemeral: true});

            theQuest = theQuest[0];

            const today = new Date();
            const setStarted = new Date(today);
            setStarted.setDate(setStarted.getDate() - 5);
            console.log(setStarted);
            setStarted.setHours(0, 0, 0, 0);

            await theQuest.update({createdAt: setStarted})
            .then(async q => await q.save())
            .then(async q => {return await q.reload()});

            return await interaction.reply({content: `New Quest created with ID ${theQuest.qid}`, ephemeral: true});
        } else if (subCom === 'kill-payout'){
            const levelRoll = interaction.options.getInteger('level');
            const xpObj = xpPayoutScale(levelRoll);
            const xpRolled = inclusiveRandNum(xpObj.max, xpObj.min);
            const coinRolled = xpRolled + Math.floor(xpRolled * 0.10);

            await handleUserPayout(xpRolled, coinRolled, interaction, theUser);

            return await interaction.reply({content: `User Payout Success!`, ephemeral: true});
        }

        const giveAmount = interaction.options.getInteger('amount') ?? 1;
        const namePicked = (subCom === 'give-item') ? interaction.options.getString('item-name') : interaction.options.getString('mat-name');
        const pickedMatType = interaction.options.getString('mat-type') ?? 'None';
        const rarPicked = interaction.options.getString('rarity');

        let itemMatch;
        switch(subCom){
            case "give-item":
                itemMatch = await ItemLootPool.findOne({where: {name: namePicked}});
            break;
            case "give-mat":
                const pickedMatList = require(materialFiles.get(pickedMatType));
                itemMatch = pickedMatList.filter(mat => mat.Name === namePicked)[0];
            break;
        }

        if (!itemMatch) return await interaction.reply({content: `Locating error! Could not find ${makeCapital(subCom.split('-')[1])} with name ${namePicked}!`, ephemeral: true});

        let finalItem;
        switch(subCom){
            case "give-item":
                finalItem = await checkInboundItem(theUser.userid, itemMatch.creation_offset_id, giveAmount);
            break;
            case "give-mat":
                finalItem = await checkInboundMat(theUser.userid, itemMatch, pickedMatType, giveAmount);
            break;
        }

        const finalDisplayEmbed = new EmbedBuilder()
        .setTitle(`== ${makeCapital(subCom.split('-')[1])} Given ==`);

        switch(subCom){
            case "give-item":
                const itemExtras = uni_displayItem(finalItem, "Single-Quest", giveAmount);
                finalDisplayEmbed
                .setColor(itemExtras.color)
                .addFields(itemExtras.fields);
            break;
            case "give-mat":
                const eColor = grabColour(checkingRarID(rarPicked));
                finalDisplayEmbed
                .setColor(eColor)
                .addFields({
                    name: `>>__**${finalItem.name}**__<<`,
                    value: `Value: **${finalItem.value}**c\nRarity: **${finalItem.rarity}**\nType: **${makeCapital(pickedMatType)}**\nAmount: **${giveAmount}**`
                });
            break;
        }

        return await sendTimedChannelMessage(interaction, 60000, finalDisplayEmbed, "Reply");
    },
};