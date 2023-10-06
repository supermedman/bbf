

//========================================
// This method displays the enemy in its current state
async function display() {
    var enemy = await ActiveEnemy.findOne({ where: [{ specid: specCode }, { constkey: constKey }] });
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
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔄'),
        );

    if (hasPng) {
        const attachment = await displayEWpic(interaction, enemy, true);

        interaction.followUp({ components: [row], files: [attachment] }).then(async message => {
            const collectorBut = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 40000 });

            collectorBut.on('collect', async i => {
                if (i.user.id === interaction.user.id) {
                    if (i.customId === 'refresh') {
                        //delete the embed here
                        await message.delete();
                        startCombat();//run the entire script over again
                    }
                    if (i.customId === 'kill') {
                        //run attack function until death is acheived
                        const item = await Equipped.findOne({ where: [{ spec_id: interaction.user.id }] });
                        var dmgDealt = await userDamage(interaction, item);
                        await message.delete();
                        dealDeath(dmgDealt, item);
                    }
                    if (i.customId === 'onehit') {
                        //run once reprompt reaction
                        const item = await Equipped.findOne({ where: [{ spec_id: interaction.user.id }] });
                        var dmgDealt = await userDamage(interaction, item);
                        await message.delete();
                        dealDamage(dmgDealt, item);
                    }
                } else {
                    i.reply({ content: `Nice try slick!`, ephemeral: true });
                }
            });
            collectorBut.on('end', async remove => { if (!message) { await message.delete(); } });
        })
    } else {
        const attachment = await displayEWOpic(interaction, enemy, true);

        interaction.followUp({ components: [row], files: [attachment] }).then(async message => {
            const collectorBut = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 40000 });

            collectorBut.on('collect', async i => {
                if (i.user.id === interaction.user.id) {
                    if (i.customId === 'refresh') {
                        //delete the embed here
                        await message.delete();
                        startCombat();//run the entire script over again
                    }
                    if (i.customId === 'kill') {
                        //run attack function until death is acheived
                        const item = await Equipped.findOne({ where: [{ spec_id: interaction.user.id }] });
                        var dmgDealt = await userDamage(interaction, item);
                        await message.delete();
                        dealDeath(dmgDealt, item);
                    }
                    if (i.customId === 'onehit') {
                        //run once reprompt reaction
                        const item = await Equipped.findOne({ where: [{ spec_id: interaction.user.id }] });
                        var dmgDealt = await userDamage(interaction, item);
                        await message.delete();
                        dealDamage(dmgDealt, item);
                    }
                } else {
                    i.reply({ content: `Nice try slick!`, ephemeral: true });
                }
            });
            collectorBut.on('end', async remove => { if (!message) { await message.delete(); } });
        })
    }
}

module.exports = { foo, bar };