const {EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType} = require('discord.js');

const {NPC} = require('./MadeClasses/NPC');
const {initialDialog} = require('./handleNPC.js');

async function spawnNpc(user, interaction) {
    // Static fromWilds atm
    const theNpc = new NPC().genRandNpc(user.current_location);

    const startDialogButton = new ButtonBuilder()
    .setCustomId('start-dialog')
    .setLabel(`Speak to ${theNpc.name}`)
    .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(startDialogButton);

    const displayEmbed = new EmbedBuilder()
    .setTitle(`${theNpc.name} appears!`)
    .setColor('DarkPurple')
    .setDescription("It seems they wish to speak with you!");

    const filter = (i) => i.user.id === user.userid;

    const dialogStartMessage = await interaction.channel.send({
        embeds: [displayEmbed],
        components: [buttonRow],
    });

    const collector = dialogStartMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter,
        time: 120000,
    });

    collector.on('collect', async (COI) =>{
        if (COI.customId === 'start-dialog'){
            initialDialog(theNpc, interaction, user);
            collector.stop();
        }
    });

    collector.once('end', () =>{
        dialogStartMessage.delete().catch(error => {
            if (error.code !== 10008) {
                console.error('Failed to delete the message:', error);
            }
        });
    });
}

module.exports = { spawnNpc };