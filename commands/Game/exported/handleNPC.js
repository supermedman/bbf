const {EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType, ActionRowBuilder} = require('discord.js');

async function initialDialog(npc, interaction, user) {
    
    const npcDialogEmbed = new EmbedBuilder()
    .setTitle(npc.name)
    .setDescription(npc.dialogList[0])
    .setColor('DarkAqua');

    const stringSelectOptionList = [];

    for (const optionObj of npc.replyOptions){
        let pushObj = new StringSelectMenuOptionBuilder()
        .setLabel(optionObj.Label)
        .setDescription(optionObj.Description)
        .setValue(optionObj.Value);

        stringSelectOptionList.push(pushObj);
    }


    const userReplyOptionMenu = new StringSelectMenuBuilder()
    .setCustomId('reply-option')
    .setPlaceholder('Select a reply!')
    .addOptions(stringSelectOptionList[0]);

    const selectRow = new ActionRowBuilder().addComponents(userReplyOptionMenu);

    const dialogMenu = await interaction.followUp({
        embeds: [npcDialogEmbed], 
        components: [selectRow],
    });

    const filter = (i) => i.user.id === interaction.user.id;

    const dialogCollector = dialogMenu.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        filter,
        time: 120000
    });

    const valuesPickedList = [];
    let currentStep = 0;
    dialogCollector.on('collect', async iCS => {
        valuesPickedList[currentStep] = iCS.values[0];
        console.log(`Reply Selected! ${valuesPickedList[currentStep]}`);
        console.log(`Dialog Count: ${currentStep}\nDialog Length: ${npc.dialogList.length}`);

        await iCS.deferUpdate().then(async () => {
            if ((currentStep + 1) === npc.dialogList.length){
                //Last Dialog Piece
                await dialogCollector.stop();
            } else {
                // Still In Dialog
                currentStep++;
                userReplyOptionMenu.setOptions(stringSelectOptionList[currentStep]);
                npcDialogEmbed.setDescription(npc.dialogList[currentStep]);
                await dialogMenu.edit({
                    embeds: [npcDialogEmbed],
                    components: [selectRow],
                });
            }
        }).catch(e=>console.error(e));
    });

    dialogCollector.on('end', () => {
        console.log('Select Menu Expired!');

        dialogMenu.delete().catch(error => {
            if (error.code !== 10008) {
                console.error('Failed to delete the message:', error);
            }
        });
    });
}

module.exports = { initialDialog };