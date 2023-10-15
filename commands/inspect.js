const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Equipped, Loadout } = require('../dbObjects.js');
const { userDamage } = require('./exported/dealDamage.js');
const { findHelmSlot, findChestSlot, findLegSlot, findMainHand, findOffHand } = require('./exported/findLoadout.js');

const lootList = require('../events/Models/json_prefabs/lootList.json');
const uniqueLootList = require('../events/Models/json_prefabs/uniqueLootList.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inspect')
        .setDescription('What exactly are you swinging around?'),

    async execute(interaction) {
        await interaction.deferReply();

        const currentLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });

        if (currentLoadout) {
            //User has items equipped
            var headSlotItem = await findHelmSlot(currentLoadout.headslot);
            var chestSlotItem = await findChestSlot(currentLoadout.chestslot);
            var legSlotItem = await findLegSlot(currentLoadout.legslot);
            var mainHandItem = await findMainHand(currentLoadout.mainhand);

            var headSlotEmbed;
            var chestSlotEmbed;
            var legSlotEmbed;
            var mainHandEmbed;

            if (headSlotItem === 'NONE') {
                //No item equipped
                var list = `Nothing to see here`;
                headSlotEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: 'No Helm equipped', value: list, });
            } else {
                //Item found add defence
                var list = (`\nValue: **${headSlotItem.Value}** \nRarity: **${headSlotItem.Rarity}** \nDefence: **${headSlotItem.Defence}** \nType: **${headSlotItem.Type}** \nSlot: **${headSlotItem.Slot}**`);
                headSlotEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setColor(0000)
                    .addFields(
                        {
                            name: (`**${headSlotItem.Name}**`),
                            value: list,

                        });
            }

            if (chestSlotItem === 'NONE') {
                //No item equipped
                var list = `Nothing to see here`;
                chestSlotEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: 'No Chestplate equipped', value: list, });
            } else {
                //Item found add it
                var list = (`\nValue: **${chestSlotItem.Value}** \nRarity: **${chestSlotItem.Rarity}** \nDefence: **${chestSlotItem.Defence}** \nType: **${chestSlotItem.Type}** \nSlot: **${chestSlotItem.Slot}**`);

                chestSlotEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setColor(0000)
                    .addFields(
                        {
                            name: (`**${chestSlotItem.Name}**`),
                            value: list,

                        });
            }

            if (legSlotItem === 'NONE') {
                //No item equipped
                var list = `Nothing to see here`;
                legSlotEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: 'No Leggings equipped', value: list, });
            } else {
                //Item found add it
                var list = (`\nValue: **${legSlotItem.Value}** \nRarity: **${legSlotItem.Rarity}** \nDefence: **${legSlotItem.Defence}** \nType: **${legSlotItem.Type}** \nSlot: **${legSlotItem.Slot}**`);

                legSlotEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setColor(0000)
                    .addFields(
                        {
                            name: (`**${legSlotItem.Name}**`),
                            value: list,

                        });
            }

            if (mainHandItem === 'NONE') {
                //No item equipped
                var list = `Nothing to see here`;
                mainHandEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: 'No mainhand equipped', value: list, });
            } else {
                //Item found add it
                var list = (`\nValue: **${mainHandItem.Value}c** \nRarity: **${mainHandItem.Rarity}** \nAttack: **${mainHandItem.Attack}** \nType: **${mainHandItem.Type}** \nSlot: **${mainHandItem.Slot}** \nHands: **${mainHandItem.Hands}**`);

                mainHandEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setColor(0000)
                    .addFields(
                        {
                            name: (`**${mainHandItem.Name}**`),
                            value: list,

                        });
            }

            interaction.followUp({ embeds: [headSlotEmbed, chestSlotEmbed, legSlotEmbed, mainHandEmbed] });

        } else {
            //No items equipped
            return interaction.followUp('You have not equipped anything yet! Use ``/equip < Loadout-Slot > < Item-Name >`` to equip something, dont forget to start the word with a CAPITAL LETTER!');
        }

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
