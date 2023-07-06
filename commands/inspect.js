const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Equipped } = require('../dbObjects.js');
const { userDamage } = require('./exported/dealDamage.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inspect')
        .setDescription('What exactly are you swinging around?'),

    async execute(interaction) {
        await interaction.deferReply();
        const item = await Equipped.findOne({ where: [{ spec_id: interaction.user.id }] });

        if (item) {
            //user has item equipped
            var list = (`\nValue: **${item.value}c** \nRarity: **${item.rarity}** \nAttack: **${item.attack}** \nType: **${item.type}**`);

            const itemEmbed = new EmbedBuilder()
                .setTitle('CURRENTLY EQUIPPED')
                .setColor(0000)
                .addFields(
                    {
                        name: (`**${item.name}**`),
                        value: list

                    }
            )
            const weapondmgmod = await userDamage(interaction, item);
            console.log(weapondmgmod);

            list = (`Total damage dealt before defence calculations: \n${weapondmgmod}`);
            const damageEmbed = new EmbedBuilder()
                .setTitle(`**${item.name}**`)
                .setColor(0000)
                .addFields(
                    {
                        name: (`*${item.rarity}*`),
                        value: list

                    }
            )

            interaction.followUp({ embeds: [itemEmbed, damageEmbed] });
        } else {
            //no item equipped!
            return interaction.followUp('You have no weapon equipped! Use the command ``/equip < Item-Name >`` to equip an item.');
        }
	},

};