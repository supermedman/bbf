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
            var headSlotItem = await findHelmSlot(currentLoadout.headslot, interaction.user.id);
            var chestSlotItem = await findChestSlot(currentLoadout.chestslot, interaction.user.id);
            var legSlotItem = await findLegSlot(currentLoadout.legslot, interaction.user.id);
            var mainHandItem = await findMainHand(currentLoadout.mainhand, interaction.user.id);

            let headUnique = true;
            if (headSlotItem.Value) {
                //Item is crafted Unique
                headUnique = false;
            }
            let chestUnique = true;
            if (chestSlotItem.Value) {
                //Item is crafted Unique
                chestUnique = false;
            }
            let legsUnique = true;
            if (legSlotItem.Value) {
                //Item is crafted Unique
                legsUnique = false;
            }
            let mainHandUnique = true;
            if (mainHandItem.Value) {
                //Item is crafted Unique
                mainHandUnique = false;
            }

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
                let list;
                let headName;
                if (headUnique === true) {
                    list = (`\nValue: **${headSlotItem.value}** \nRarity: **${headSlotItem.rarity}** \nDefence: **${headSlotItem.Defence}** \nType: **${headSlotItem.Type}** \nSlot: **${headSlotItem.slot}**`);
                    headSlotColour = await grabColour(headSlotItem.rar_id);
                    headName = `**${headSlotItem.name}**`;
                } else {
                    list = (`\nValue: **${headSlotItem.Value}** \nRarity: **${headSlotItem.Rarity}** \nDefence: **${headSlotItem.Defence}** \nType: **${headSlotItem.Type}** \nSlot: **${headSlotItem.Slot}**`);
                    headSlotColour = await grabColour(headSlotItem.Rar_id);
                    headName = `**${headSlotItem.Name}**`;
                }
                
                headSlotEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setColor(headSlotColour)
                    .addFields(
                        {
                            name: (`${headName}`),
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
                let list;
                let chestName;
                if (chestUnique === true) {
                    list = (`\nValue: **${chestSlotItem.value}** \nRarity: **${chestSlotItem.rarity}** \nDefence: **${chestSlotItem.Defence}** \nType: **${chestSlotItem.Type}** \nSlot: **${chestSlotItem.slot}**`);
                    chestSlotColour = await grabColour(chestSlotItem.rar_id);
                    chestName = `**${chestSlotItem.name}**`;
                } else {
                    list = (`\nValue: **${chestSlotItem.Value}** \nRarity: **${chestSlotItem.Rarity}** \nDefence: **${chestSlotItem.Defence}** \nType: **${chestSlotItem.Type}** \nSlot: **${chestSlotItem.Slot}**`);
                    chestSlotColour = await grabColour(chestSlotItem.Rar_id);
                    chestName = `**${chestSlotItem.Name}**`;
                }
                

                chestSlotEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setColor(chestSlotColour)
                    .addFields(
                        {
                            name: (`${chestName}`),
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
                let list;
                let legsName;
                if (legsUnique === true) {
                    list = (`\nValue: **${legSlotItem.value}** \nRarity: **${legSlotItem.rarity}** \nDefence: **${legSlotItem.Defence}** \nType: **${legSlotItem.Type}** \nSlot: **${legSlotItem.slot}**`);
                    legSlotColour = await grabColour(legSlotItem.rar_id);
                    legsName = `**${legSlotItem.name}**`;
                } else {
                    list = (`\nValue: **${legSlotItem.Value}** \nRarity: **${legSlotItem.Rarity}** \nDefence: **${legSlotItem.Defence}** \nType: **${legSlotItem.Type}** \nSlot: **${legSlotItem.Slot}**`);
                    legSlotColour = await grabColour(legSlotItem.Rar_id);
                    legsName = `**${legSlotItem.Name}**`;
                }

                

                legSlotEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setColor(legSlotColour)
                    .addFields(
                        {
                            name: (`${legsName}`),
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
                let list;
                let mainHandName;
                let mainHandRarity;
                if (mainHandUnique === true) {
                    list = (`\nValue: **${mainHandItem.value}c** \nRarity: **${mainHandItem.rarity}** \nAttack: **${mainHandItem.Attack}** \nType: **${mainHandItem.Type}** \nSlot: **${mainHandItem.slot}** \nHands: **${mainHandItem.hands}**`);
                    mainHandColour = await grabColour(mainHandItem.rar_id);
                    mainHandName = `**${mainHandItem.name}**`;
                    mainHandRarity = `*${mainHandItem.rarity}*`;
                } else {
                    list = (`\nValue: **${mainHandItem.Value}c** \nRarity: **${mainHandItem.Rarity}** \nAttack: **${mainHandItem.Attack}** \nType: **${mainHandItem.Type}** \nSlot: **${mainHandItem.Slot}** \nHands: **${mainHandItem.Hands}**`);
                    mainHandColour = await grabColour(mainHandItem.Rar_id);
                    mainHandName = `**${mainHandItem.Name}**`;
                    mainHandRarity = `*${mainHandItem.Rarity}*`;
                }

                

                mainHandEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setColor(mainHandColour)
                    .addFields(
                        {
                            name: (`${mainHandName}`),
                            value: list,

                        });

                const uData = await UserData.findOne({ where: { userid: interaction.user.id } });

                const weapondmgmod = await userDamageLoadout(uData, mainHandItem);
                console.log(weapondmgmod);

                list = (`Total damage dealt before defence calculations: \n${weapondmgmod}`);
                damageEmbed = new EmbedBuilder()
                    .setTitle(`${mainHandName}`)
                    .setColor(mainHandColour)
                    .addFields(
                        {
                            name: (`${mainHandRarity}`),
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
