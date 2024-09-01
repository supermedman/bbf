const {EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType} = require('discord.js');

const {NPC} = require('./MadeClasses/NPC');
const {initialDialog} = require('./handleNPC.js');
const { createInteractiveChannelMessage, handleCatchDelete } = require('../../../uniHelperFunctions.js');

async function spawnNpc(user, interaction) {
    // Static fromWilds atm
    const theNpc = new NPC();

    await theNpc.genRandNpc(user.current_location, user.userid);

    const startDialogButton = new ButtonBuilder()
    .setCustomId('start-dialog')
    .setLabel(`Speak to ${theNpc.name}`)
    .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(startDialogButton);

    const displayEmbed = new EmbedBuilder()
    .setTitle(`${theNpc.name} appears!`)
    .setColor('DarkPurple')
    .setDescription("It seems they wish to speak with you!");

    const replyObj = {embeds: [displayEmbed], components: [buttonRow]};

    const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj);

    // =====================
    // BUTTON COLLECTOR
    collector.on('collect', async c => {
        await c.deferUpdate().then(async () => {
            return collector.stop('Start Dialog');
        }).catch(e => console.error(e));
    });
    // =====================

    // =====================
    // BUTTON COLLECTOR
    collector.on('end', async (c, r) => {
        if (!r || r === 'time') await handleCatchDelete(anchorMsg);

        if (r === 'Start Dialog') {
            await handleCatchDelete(anchorMsg);
            initialDialog(theNpc, interaction, user);
        }
    });
    // =====================
}

module.exports = { spawnNpc };