const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Loadout, UserData } = require('../dbObjects.js');
const { userDamageLoadout } = require('./exported/dealDamage.js');
const { grabColour } = require('./exported/grabRar.js');
const { findHelmSlot, findChestSlot, findLegSlot, findMainHand, findOffHand } = require('./exported/findLoadout.js');

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
            var headSlotColour;

            var chestSlotEmbed;
            var chestSlotColour;

            var legSlotEmbed;
            var legSlotColour;

            var mainHandEmbed;
            var mainHandColour;

            var damageEmbed;

            if (headSlotItem === 'NONE') {
                //No item equipped
                var list = `Nothing to see here`;
                headSlotEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: 'No Helm equipped', value: list, });
            } else {
                //Item found add defence
                var list = (`\nValue: **${headSlotItem.Value}** \nRarity: **${headSlotItem.Rarity}** \nDefence: **${headSlotItem.Defence}** \nType: **${headSlotItem.Type}** \nSlot: **${headSlotItem.Slot}**`);
                headSlotColour = await grabColour(headSlotItem.Rar_id);

                headSlotEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setColor(headSlotColour)
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
                chestSlotColour = await grabColour(chestSlotItem.Rar_id);

                chestSlotEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setColor(chestSlotColour)
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
                legSlotColour = await grabColour(legSlotItem.Rar_id);

                legSlotEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setColor(legSlotColour)
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

                damageEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: 'No mainhand equipped', value: list, });

            } else {
                //Item found add it
                var list = (`\nValue: **${mainHandItem.Value}c** \nRarity: **${mainHandItem.Rarity}** \nAttack: **${mainHandItem.Attack}** \nType: **${mainHandItem.Type}** \nSlot: **${mainHandItem.Slot}** \nHands: **${mainHandItem.Hands}**`);
                mainHandColour = await grabColour(mainHandItem.Rar_id);

                mainHandEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setColor(mainHandColour)
                    .addFields(
                        {
                            name: (`**${mainHandItem.Name}**`),
                            value: list,

                        });

                const uData = await UserData.findOne({ where: { userid: interaction.user.id } });

                const weapondmgmod = await userDamageLoadout(uData, mainHandItem);
                console.log(weapondmgmod);

                list = (`Total damage dealt before defence calculations: \n${weapondmgmod}`);
                damageEmbed = new EmbedBuilder()
                    .setTitle(`**${mainHandItem.Name}**`)
                    .setColor(mainHandColour)
                    .addFields(
                        {
                            name: (`*${mainHandItem.Rarity}*`),
                            value: list

                        });
            }

            interaction.followUp({ embeds: [headSlotEmbed, chestSlotEmbed, legSlotEmbed, mainHandEmbed, damageEmbed] });

        } else {
            //No items equipped
            return interaction.followUp('You have not equipped anything yet! Use ``/equip < Loadout-Slot > < Item-Name >`` to equip something, dont forget to start the word with a CAPITAL LETTER!');
        }       
	},

};
