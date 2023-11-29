const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Loadout, UserData } = require('../dbObjects.js');
const { userDamageLoadout } = require('./exported/dealDamage.js');
const { grabColour } = require('./exported/grabRar.js');
const { findHelmSlot, findChestSlot, findLegSlot, findMainHand, findOffHand, findPotion } = require('./exported/findLoadout.js');

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
            var offHandItem = await findOffHand(currentLoadout.offhand, interaction.user.id);
            var equippedPotion = await findPotion(currentLoadout.potionone, interaction.user.id);

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
            let offHandUnique = true;
            if (offHandItem.Value) {
                offHandUnique = false;
            }

            var headSlotEmbed;
            var headSlotColour;

            var chestSlotEmbed;
            var chestSlotColour;

            var legSlotEmbed;
            var legSlotColour;

            var mainHandEmbed;
            var mainHandColour;

            var offHandEmbed;
            var offHandColour;

            var potionEmbed;

            let totalDefence = 0;
            var defenceEmbed;

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
                let killList;
                let headName;
                if (headUnique === true) {
                    killList = `Total Kills: **${headSlotItem.totalkills}** \nKills this level: **${headSlotItem.killsthislevel}**`;
                    list = (`\nValue: **${headSlotItem.value}**c \nRarity: **${headSlotItem.rarity}** \nDefence: **${headSlotItem.Defence}** \nType: **${headSlotItem.Type}** \nSlot: **${headSlotItem.slot}** \nLevel: **${headSlotItem.currentlevel}** \n${killList}`);
                    headSlotColour = await grabColour(headSlotItem.rar_id);
                    headName = `**${headSlotItem.name}**`;
                } else {
                    list = (`\nValue: **${headSlotItem.Value}**c \nRarity: **${headSlotItem.Rarity}** \nDefence: **${headSlotItem.Defence}** \nType: **${headSlotItem.Type}** \nSlot: **${headSlotItem.Slot}**`);
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
                totalDefence += headSlotItem.Defence;
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
                let killList;
                let chestName;
                if (chestUnique === true) {
                    killList = `Total Kills: **${chestSlotItem.totalkills}** \nKills this level: **${chestSlotItem.killsthislevel}**`;
                    list = (`\nValue: **${chestSlotItem.value}**c \nRarity: **${chestSlotItem.rarity}** \nDefence: **${chestSlotItem.Defence}** \nType: **${chestSlotItem.Type}** \nSlot: **${chestSlotItem.slot}** \nLevel: **${chestSlotItem.currentlevel}** \n${killList}`);
                    chestSlotColour = await grabColour(chestSlotItem.rar_id);
                    chestName = `**${chestSlotItem.name}**`;
                } else {
                    list = (`\nValue: **${chestSlotItem.Value}**c \nRarity: **${chestSlotItem.Rarity}** \nDefence: **${chestSlotItem.Defence}** \nType: **${chestSlotItem.Type}** \nSlot: **${chestSlotItem.Slot}**`);
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
                totalDefence += chestSlotItem.Defence;
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
                let killList;
                let legsName;
                if (legsUnique === true) {
                    killList = `Total Kills: **${legSlotItem.totalkills}** \nKills this level: **${legSlotItem.killsthislevel}**`;
                    list = (`\nValue: **${legSlotItem.value}**c \nRarity: **${legSlotItem.rarity}** \nDefence: **${legSlotItem.Defence}** \nType: **${legSlotItem.Type}** \nSlot: **${legSlotItem.slot}** \nLevel: **${legSlotItem.currentlevel}** \n${killList}`);
                    legSlotColour = await grabColour(legSlotItem.rar_id);
                    legsName = `**${legSlotItem.name}**`;
                } else {
                    list = (`\nValue: **${legSlotItem.Value}**c \nRarity: **${legSlotItem.Rarity}** \nDefence: **${legSlotItem.Defence}** \nType: **${legSlotItem.Type}** \nSlot: **${legSlotItem.Slot}**`);
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
                totalDefence += legSlotItem.Defence;
            }

            if (offHandItem === 'NONE') {
                var list = 'Nothing to see here';
                offHandEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: 'No offhand equipped', value: list, });
            } else {
                if (currentLoadout.mainhand === currentLoadout.offhand) {
                    //TWO HANDED WEAPON EQUIPPED!
                    var list;
                    if (mainHandUnique === true) {
                        list = `${mainHandItem.name} is taking this spot!`;
                    } else {
                        list = `${mainHandItem.Name} is taking this spot!`;
                    }
                    offHandEmbed = new EmbedBuilder()
                        .setTitle('MAINHAND TAKES TWO HANDS')
                        .addFields({ name: 'Offhand full', value: list, });
                } else {
                    let list;
                    let killList;
                    let offHandName;
                    if (offHandUnique === true) {
                        killList = `Total Kills: **${offHandItem.totalkills}** \nKills this level: **${offHandItem.killsthislevel}**`;
                        list = (`\nValue: **${offHandItem.value}c** \nRarity: **${offHandItem.rarity}** \nAttack: **${offHandItem.Attack}** \nDefence: **${offHandItem.Defence}** \nType: **${offHandItem.Type}** \nSlot: **${offHandItem.slot}** \nLevel: **${offHandItem.currentlevel}** \n${killList}`);
                        offHandColour = await grabColour(offHandItem.rar_id, false);
                        offHandName = `**${offHandItem.name}**`;                       
                    } else {
                        list = (`\nValue: **${offHandItem.Value}c** \nRarity: **${offHandItem.Rarity}** \nAttack: **${offHandItem.Attack}**\nDefence: **${offHandItem.Defence}** \nType: **${offHandItem.Type}** \nSlot: **${offHandItem.Slot}**`);
                        offHandColour = await grabColour(offHandItem.Rar_id, false);
                        offHandName = `**${offHandItem.Name}**`;             
                    }

                    offHandEmbed = new EmbedBuilder()
                        .setTitle('CURRENTLY EQUIPPED')
                        .setColor(offHandColour)
                        .addFields(
                            {
                                name: (`${offHandName}`),
                                value: list,

                            });
                    totalDefence += offHandItem.Defence;
                }
            }

            if (totalDefence === 0) {
                var list = `No armor, no defence`;
                defenceEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: 'Nothing equipped', value: list, });
            } else {
                var list = `${totalDefence}`;
                defenceEmbed = new EmbedBuilder()
                    .setTitle('ARMOR EQUIPPED')
                    .addFields({ name: 'Total Defence from Armor:', value: list, });
            }

            if (equippedPotion === 'NONE' || 'HASNONE') {
                var list;
                var name;
                if (equippedPotion === 'NONE') {
                    list = `Nothing to see here`;
                    name = 'No potion equipped';
                } else {
                    list = `Nothing to see here`;
                    name = 'No potions remaining';
                }
                potionEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: name, value: list, });
            } else {
                var list = `Value: ${equippedPotion.value}\nType: ${equippedPotion.activecategory}\nDuration: ${equippedPotion.duration}\nCooldown: ${equippedPotion.cooldown}\nCurrent Amount: ${equippedPotion.amount}`;
                var potName = `Name: ${equippedPotion.name}`;

                potionEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setColor(0000)
                    .addFields(
                        {
                            name: (`${potName}`),
                            value: list,

                        });
            }

            await interaction.followUp({ embeds: [headSlotEmbed, chestSlotEmbed, legSlotEmbed, offHandEmbed, potionEmbed] });

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
                let killList;
                let mainHandName;
                let mainHandRarity;
                if (mainHandUnique === true) {
                    killList = `Total Kills: **${mainHandItem.totalkills}** \nKills this level: **${mainHandItem.killsthislevel}**`;
                    list = (`\nValue: **${mainHandItem.value}c** \nRarity: **${mainHandItem.rarity}** \nAttack: **${mainHandItem.Attack}** \nType: **${mainHandItem.Type}** \nSlot: **${mainHandItem.slot}** \nHands: **${mainHandItem.hands}** \nLevel: **${mainHandItem.currentlevel}** \n${killList}`);
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

            await interaction.followUp({ embeds: [mainHandEmbed, damageEmbed] });

        } else {
            //No items equipped
            return interaction.followUp('You have not equipped anything yet! Use ``/equip < Loadout-Slot > < Item-Name >`` to equip something, dont forget to start the word with a CAPITAL LETTER!');
        }       
	},

};
