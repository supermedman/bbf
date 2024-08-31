const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { Milestones, ActiveDungeon, OwnedTools, MaterialStore } = require('../../../dbObjects.js');
const { grabColour } = require('./grabRar.js');

//const { handleMaterialAdding } = require('./materialDropper.js');
//const { Op } = require('sequelize');
const { createInteractiveChannelMessage, handleCatchDelete, editTimedChannelMessage } = require('../../../uniHelperFunctions.js');
const { checkInboundMat } = require('../../Development/Export/itemMoveContainer.js');

//const uniqueMatList = require('../events/Models/json_prefabs/materialLists/uniqueList.json');

/** 
 * This function handles checking if a user is eligable for recieving a phasereader needed to craft a personal forge,
 *	this will only work once. The contained dialog is to aid in UX for the user, and will better direct the user
 *	towards the needed locations and commands to finish the blueprint. Upon completetion Miens storyline will become
 *	much clearer and straightforward!
 * 
 * @param {object} user db instance
 * 
 */
async function theClergymansQuest(interaction, user) {
    const uniMatList = interaction.client.materialFiles.get('unique');
    const phasereader = uniMatList.find(mat => mat.Name === 'Phasereader'); // filter(mat => mat.Name === 'Phasereader');
    // const phasereader = pr[0];

    const milestoneReached = async (user) => {
        const m = await Milestones.findOne({where: {userid: user.userid}});
        return ['Myst', 'Secret', 'Dream'].includes(m?.currentquestline);
    };

    const dungeonPassed = async (user) => {
        const d = await ActiveDungeon.findOne({where: {dungeonspecid: user.userid, dungeonid: 6}});
        return d?.completed;
    };

    const hasBlueprint = async (user) => {
        const bp = await OwnedTools.findOne({where: {spec_id: user.userid, name: 'Machine Schematics'}});
        return !!bp;
    };

    const hasReader = async (user) => {
        const pr = await MaterialStore.findOne({where: {spec_id: user.userid, name: 'Phasereader'}});
        return !!pr;
    };

    const checkRequirements = async (user) => {
        return await milestoneReached(user) && await dungeonPassed(user) && !(await hasBlueprint(user)) && !(await hasReader(user));
    };

    const checksPassed = await checkRequirements(user);
    if (!checksPassed) return;

    const embedDescList = [
        'Hello there, what brings you here today?',
        'It has been some time since last we saw you! Whats that in your hand?',
        'Yes! Give it here!',
        'Oh my! What a truly fascinating contraption! Where did you get this?!',
        'Hmmm so be it.. I cannot read it without the proper tools, I do believe a *Phasereader* is required!',
        'Allow me to check our inventory, we may very well still have one!',
        '...',
        '...',
        'You are in luck! We do have one. Here, its all yours free of charge. Now go build that machine!!'
    ];
    const buttonLabelList = [
        'Hello',
        'What, this old thing?',
        'Give Machine Schematics to clergyman',
        'I-I found it. What does it say?',
        'Where might one find one of those?',
        'Wait for Clergyman',
        'Wait for Clergyman',
        'Wait for Clergyman',
        'Thank you kindly!'
    ];

    const nextButton = new ButtonBuilder()
    .setCustomId('next-dialog')
    .setLabel(buttonLabelList[0])
    .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(nextButton);

    const clergyDialogEmbed = new EmbedBuilder()
    .setTitle('Clergyman')
    .setDescription(embedDescList[0])
    .setColor('DarkAqua');

    const replyObj = {embeds: [clergyDialogEmbed], components: [buttonRow]};

    const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 360000, replyObj);

    // =====================
    // BUTTON COLLECTOR
    let curPage = 0;
    collector.on('collect', async c => {
        await c.deferUpdate().then(async () => {
            curPage++;
            if (curPage === embedDescList.length) return collector.stop('Finished');

            nextButton.setLabel(buttonLabelList[curPage]);
            clergyDialogEmbed.setDescription(embedDescList[curPage]);

            const editWith = {embeds: [clergyDialogEmbed], components: [buttonRow]};

            await anchorMsg.edit(editWith);
        }).catch(e => console.error(e));
    });
    // =====================

    // =====================
    // BUTTON COLLECTOR
    collector.on('end', async (c, r) => {
        if (!r || r === 'time') await handleCatchDelete(anchorMsg);

        if (r === 'Finished'){
            const eColor = grabColour(12);

            const finalDisplayEmbed = new EmbedBuilder()
            .setTitle(`== Material Received ==`)
            .setColor(eColor)
            .addFields({
                name: `>>__**${phasereader.Name}**__<<`,
                value: `Value: **${phasereader.Value}**c\nRarity: **${phasereader.Rarity}**\nType: **Unique**\nAmount: **1**`
            });

            await checkInboundMat(user.userid, phasereader, "Phasereader", 1);

            return await editTimedChannelMessage(anchorMsg, 120000, {embeds: [finalDisplayEmbed], components: []});
        }
    });
    // =====================
}

module.exports = {theClergymansQuest};