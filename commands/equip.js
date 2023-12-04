const { SlashCommandBuilder } = require('discord.js');
const { errorForm, basicInfoForm } = require('../chalkPresets.js');
const { LootStore, Loadout, UniqueCrafted, OwnedPotions } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('equip')
        .setDescription('What will you arm yourself with?')
        .addSubcommand(subcommand => 
            subcommand
                .setName('something')
                .setDescription('Equip a gear piece, includes all slots!')
                .addStringOption(option =>
                    option.setName('slot')
                        .setDescription('Item Slot to equip')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Weapon', value: 'Mainhand' },
                            { name: 'Helm', value: 'Headslot' },
                            { name: 'Chestpiece', value: 'Chestslot' },
                            { name: 'Legwear', value: 'Legslot' },
                            { name: 'Offhand', value: 'Offhand' },
                            { name: 'Potion', value: 'Potion' },
                            { name: 'Unique', value: 'Unique' },
                    ))
                .addStringOption(option =>
                    option.setName('gear')
                        .setDescription('Gear to equip')
                        .setAutocomplete(true)
                        .setRequired(true))),
	async autocomplete(interaction) {
		//Focused option is assigned to what the user is inputting as the paramaters for what option to select from
		const focusedOption = interaction.options.getFocused(true);
		//FIGURE OUT HOW TO MAP CURRENT INVENTORY ITEMS AS THE OPTIONS FOR SELECTING

        let choices = [];

        if (focusedOption.name === 'gear') {
            const focusedValue = interaction.options.getFocused(false);
            let gearType = interaction.options.getString('slot') ?? 'NONE';

            let items;

            if (gearType === 'Mainhand') {
                items = await LootStore.findAll({
                    where: [
                        { spec_id: interaction.user.id },
                        { slot: 'Mainhand' }]
                });
            }
            if (gearType === 'Offhand') {
                items = await LootStore.findAll({
                    where: [
                        { spec_id: interaction.user.id },
                        { slot: 'Offhand' }]
                });
            }
            if (gearType === 'Headslot') {
                items = await LootStore.findAll({
                    where: [
                        { spec_id: interaction.user.id },
                        { slot: 'Headslot' }]
                });
            }
            if (gearType === 'Chestslot') {
                items = await LootStore.findAll({
                    where: [
                        { spec_id: interaction.user.id },
                        { slot: 'Chestslot' }]
                });
            }
            if (gearType === 'Legslot') {
                items = await LootStore.findAll({
                    where: [
                        { spec_id: interaction.user.id },
                        { slot: 'Legslot' }]
                });
            }
            if (gearType === 'Potion') {
                items = await OwnedPotions.findAll({
                    where: { spec_id: interaction.user.id }
                });
            }
            if (gearType === 'Unique') {
                items = await UniqueCrafted.findAll({
                    where: { spec_id: interaction.user.id }
                });
            }

            choices = items.map(item => item.name);

            console.log(basicInfoForm(`Current Choices: ${choices} for ${gearType}s`));

            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
            await interaction.respond(
                filtered.map(choice => ({ name: choice, value: choice })),
            );
        }
	},
    async execute(interaction) {
        const startTime = new Date().getTime();
        await interaction.deferReply().then(async () => {
            if (interaction.options.getSubcommand() === 'something') {
                let slotType = interaction.options.getString('slot');
                const itemName = interaction.options.getString('gear') ?? 'NONE';
                if (itemName === 'NONE') return interaction.followUp('You did not select an item to equip!');

                const userID = interaction.user.id;

                let item;
                if (slotType !== 'Potion' && slotType !== 'Unique') {
                    console.log('NORMAL');
                    item = await LootStore.findOne({
                        where: [
                            { spec_id: userID },
                            { name: itemName }]
                    });
                } else if (slotType === 'Unique') {
                    console.log('UNIQUE');
                    item = await UniqueCrafted.findOne({
                        where: [
                            { spec_id: userID },
                            { name: itemName }]
                    });
                } else {
                    console.log('POTION');
                    item = await OwnedPotions.findOne({
                        where: [
                            { spec_id: userID },
                            { name: itemName }]
                    });
                }

                let userLoadout = await Loadout.findOne({ where: { spec_id: userID } });
                if (!userLoadout) {
                    userLoadout = await Loadout.create({
                        spec_id: userID
                    });
                }

                if (!item) return interaction.followUp('Looks like that didnt work! Try starting the name with a ***CAPITAL LETTER***');

                if (slotType === 'Unique') slotType = item.slot;

                if (slotType === 'Mainhand') {
                    //MAINHAND EQUIPPED
                    console.log(item);
                    if (!item.hands) return interaction.followUp('That item has an invalid hands value!!');
                    let offhandReplaced = false;
                    if (item.hands === 'Two') {
                        //TWO HANDED WEAPON EQUIPPED
                        if (userLoadout.offhand !== 0) offhandReplaced = true;
                        const tableUpdate = await Loadout.update({
                            mainhand: item.loot_id,
                            offhand: item.loot_id,
                        }, { where: { spec_id: userID } });
                        if (tableUpdate > 0 && offhandReplaced === true) return interaction.followUp('Mainhand equipped! Offhand replaced!');
                        if (tableUpdate > 0) return interaction.followUp('Mainhand equipped!');
                    } else {
                        //ONE HANDED WEAPON EQUIPPED
                        if (userLoadout.mainhand === userLoadout.offhand) offhandReplaced = true;
                        let tableUpdate;
                        if (offhandReplaced === true) {
                            tableUpdate = await Loadout.update({
                                mainhand: item.loot_id,
                                offhand: 0
                            }, { where: { spec_id: userID } });
                            if (tableUpdate > 0) return interaction.followUp('Mainhand equipped! Offhand available!');
                        } 
                        tableUpdate = await Loadout.update({
                            mainhand: item.loot_id
                        }, { where: { spec_id: userID } });
                        if (tableUpdate > 0) return interaction.followUp('Mainhand equipped!');
                    }
                } else if (slotType === 'Offhand') {
                    //OFFHAND EQUIPPED
                    console.log(item);
                    if (!item.hands) return interaction.followUp('That item has an invalid hands value!!');
                    let canEquipOff = false;
                    if (userLoadout.mainhand !== userLoadout.offhand) canEquipOff = true;
                    if (canEquipOff === false) return interaction.followUp('You cannot equip an Offhand as your weapon takes up two hands');
                    const tableUpdate = await Loadout.update({
                        offhand: item.loot_id
                    }, { where: { spec_id: userID } });
                    if (tableUpdate > 0) return interaction.followUp('Offhand Equipped!');
                } else if (slotType === 'Potion') {
                    //POTION EQUIPPED
                    console.log(item);
                    const tableUpdate = await Loadout.update({
                        potionone: item.potion_id
                    }, { where: { spec_id: userID } });
                    if (tableUpdate > 0) return interaction.followUp('Potion Equipped Successfully!');
                } else {
                    //ARMOR EQUIPPED
                    console.log(item);
                    let tableUpdate;
                    if (slotType === 'Headslot') {
                        tableUpdate = await Loadout.update({
                            headslot: item.loot_id
                        }, { where: { spec_id: userID } });
                    }
                    if (slotType === 'Chestslot') {
                        tableUpdate = await Loadout.update({
                            chestslot: item.loot_id
                        }, { where: { spec_id: userID } });
                    }
                    if (slotType === 'Legslot') {
                        tableUpdate = await Loadout.update({
                            legslot: item.loot_id
                        }, { where: { spec_id: userID } });
                    }
                    if (tableUpdate > 0) return interaction.followUp(`${slotType} Equipped!!`);
                }

                const endTime = new Date().getTime();
                console.log(`Diff between start: ${startTime}/${endTime} :End..\n   ${(startTime - endTime)}`);
            }            
        }).catch(error => {
            console.log(errorForm('Interaction error:', error));
        });
	},

};
