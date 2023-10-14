const { SlashCommandBuilder } = require('discord.js');
const { LootStore, Equipped, Loadout } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('equip')
        .setDescription('What will you arm yourself with?')
        .addSubcommand(subcommand =>
            subcommand
                .setName('weapon')
                .setDescription('Weapon to be equipped')
                .addStringOption(option =>
                    option.setName('mainhand')
                        .setDescription('Item to equip')
                        .setAutocomplete(true)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('helm')
                .setDescription('Helm to be equipped')
                .addStringOption(option =>
                    option.setName('headslot')
                        .setDescription('Item to equip')
                        .setAutocomplete(true)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('chest')
                .setDescription('Chestpiece to be equipped')
                .addStringOption(option =>
                    option.setName('chestslot')
                        .setDescription('Item to equip')
                        .setAutocomplete(true)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leg')
                .setDescription('Legwear to be equipped')
                .addStringOption(option =>
                    option.setName('legslot')
                        .setDescription('Item to equip')
                        .setAutocomplete(true)
                        .setRequired(true))),
		
	async autocomplete(interaction) {
		//Focused option is assigned to what the user is inputting as the paramaters for what option to select from
		const focusedOption = interaction.options.getFocused(true);
		//FIGURE OUT HOW TO MAP CURRENT INVENTORY ITEMS AS THE OPTIONS FOR SELECTING

        let choices = [];

        if (focusedOption.name === 'mainhand') {
            const focusedValue = interaction.options.getFocused(false);
            //Look for mainhand items only
            const items = await LootStore.findAll({ where: [{ spec_id: interaction.user.id }, {slot: 'Mainhand'}] });

            if (focusedValue) {
                let first = focusedValue.charAt();
                console.log(first);
                for (var n = 0; n < items.length; n++) {
                    if (items[n].name.charAt() === first) {//Check for item starting with the letter provided
                        var picked = items[n].name;//assign picked to item name at postion n in the items list found
                        //prevent any type errors			
                        choices.push(picked.toString());//push each name one by one into the choices array
                    } else {
                        //Item name does not match keep looking
                    }

                }
                console.log(choices);
                console.log(focusedValue);

                //Mapping the complete list of options for discord to handle and present to the user
                const filtered = choices.filter(choice => choice.startsWith(focusedValue));
                await interaction.respond(
                    filtered.map(choice => ({ name: choice, value: choice })),
                );
            }
        }
        if (focusedOption.name === 'headslot') {
            const focusedValue = interaction.options.getFocused(false);
            
            const items = await LootStore.findAll({ where: [{ spec_id: interaction.user.id }, { slot: 'Headslot' }] });
            if (focusedValue) {
                let first = focusedValue.charAt();
                console.log(first);
                for (var n = 0; n < items.length; n++) {
                    if (items[n].name.charAt() === first) {//Check for item starting with the letter provided
                        var picked = items[n].name;//assign picked to item name at postion n in the items list found
                        //prevent any type errors			
                        choices.push(picked.toString());//push each name one by one into the choices array
                    } else {
                        //Item name does not match keep looking
                    }

                }
                console.log(choices);
                console.log(focusedValue);

                //Mapping the complete list of options for discord to handle and present to the user
                const filtered = choices.filter(choice => choice.startsWith(focusedValue));
                await interaction.respond(
                    filtered.map(choice => ({ name: choice, value: choice })),
                );
            }
        }
        if (focusedOption.name === 'chestslot') {
            const focusedValue = interaction.options.getFocused(false);
          
            const items = await LootStore.findAll({ where: [{ spec_id: interaction.user.id }, { slot: 'Chestslot' }] });
            if (focusedValue) {
                let first = focusedValue.charAt();
                console.log(first);
                for (var n = 0; n < items.length; n++) {
                    if (items[n].name.charAt() === first) {//Check for item starting with the letter provided
                        var picked = items[n].name;//assign picked to item name at postion n in the items list found
                        //prevent any type errors			
                        choices.push(picked.toString());//push each name one by one into the choices array
                    } else {
                        //Item name does not match keep looking
                    }

                }
                console.log(choices);
                console.log(focusedValue);

                //Mapping the complete list of options for discord to handle and present to the user
                const filtered = choices.filter(choice => choice.startsWith(focusedValue));
                await interaction.respond(
                    filtered.map(choice => ({ name: choice, value: choice })),
                );
            }
        }
        if (focusedOption.name === 'legslot') {
            const focusedValue = interaction.options.getFocused(false);
            
            const items = await LootStore.findAll({ where: [{ spec_id: interaction.user.id }, { slot: 'Legslot' }] });
            if (focusedValue) {
                let first = focusedValue.charAt();
                console.log(first);
                for (var n = 0; n < items.length; n++) {
                    if (items[n].name.charAt() === first) {//Check for item starting with the letter provided
                        var picked = items[n].name;//assign picked to item name at postion n in the items list found
                        //prevent any type errors			
                        choices.push(picked.toString());//push each name one by one into the choices array
                    } else {
                        //Item name does not match keep looking
                    }

                }
                console.log(choices);
                console.log(focusedValue);

                //Mapping the complete list of options for discord to handle and present to the user
                const filtered = choices.filter(choice => choice.startsWith(focusedValue));
                await interaction.respond(
                    filtered.map(choice => ({ name: choice, value: choice })),
                );
            }
        }   
	},
    async execute(interaction) {
        await interaction.deferReply();
        if (interaction.options.getSubcommand() === 'weapon') {
            const itemname = interaction.options.getString('mainhand');
            console.log(itemname);

            const item = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { name: itemname }] });
            console.log(item.loot_id);

            //CHECK LOADOUT HERE AS WELL
            
            if (item.spec_id !== interaction.user.id) {
                //something is wrong!
                console.log(interaction.user.id);
                item.spec_id = interaction.user.id;
                console.log(item.spec_id);
                if (item) {
                    //item found!
                    const eqitem = await Equipped.findOne({ where: [{ spec_id: interaction.user.id }] });
                    const equipInLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });

                    console.log(eqitem);
                    if (eqitem && equipInLoadout) {
                        //item already equipped therefore overwrite and update

                        const newitem = await Equipped.update(
                            {
                                name: item.name,
                                value: item.value,
                                attack: item.attack,
                                type: item.type,
                                rarity: item.rarity,
                                rar_id: item.rar_id,
                                loot_id: item.loot_id,
                            }, { where: [{ spec_id: interaction.user.id }] });

                        console.log('ITEM UPDATED IN EQUIPPED: ', newitem);
                        interaction.followUp('Item equipped successfully!');

                        const newLoad = await Loadout.update({ mainhand: item.loot_id }, { where: { spec_id: interaction.user.id } });
                        if (newLoad > 0) {
                            //item  updated
                        }
                    } else if (eqitem) {
                        const newitem = await Equipped.update(
                            {
                                name: item.name,
                                value: item.value,
                                attack: item.attack,
                                type: item.type,
                                rarity: item.rarity,
                                rar_id: item.rar_id,
                                loot_id: item.loot_id,
                            }, { where: [{ spec_id: interaction.user.id }] });

                        console.log('ITEM UPDATED IN EQUIPPED: ', newitem);
                        interaction.followUp('Item equipped successfully!');
                    } else if (!eqitem) {
                        //no items equipped therefore make new one
                        const newitem = await Equipped.create(
                            {
                                name: item.name,
                                value: item.value,
                                attack: item.attack,
                                type: item.type,
                                rarity: item.rarity,
                                rar_id: item.rar_id,
                                spec_id: interaction.user.id,
                                loot_id: item.loot_id,
                            });

                        console.log('ITEM ADDED TO EQUIPPED: ', newitem);
                        interaction.followUp('Item equipped successfully!');
                    }
                    if (!equipInLoadout) {
                        const newLoad = await Loadout.create({
                            mainhand: item.loot_id,
                            spec_id: interaction.user.id,
                        });
                        if (newLoad > 0) {
                            //item  updated
                            interaction.followUp('Item equipped successfully!');
                        }
                    }
                }
                else if (!item) {
                    //item not found!
                    return interaction.followUp('That item could not be found.. please use ``/myloot`` for a list of items you have!');
                }

            } else {
                if (item) {
                    //item found!
                    const eqitem = await Equipped.findOne({ where: [{ spec_id: interaction.user.id }] });
                    const equipInLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });

                    console.log(eqitem);
                    if (eqitem && equipInLoadout) {
                        //item already equipped therefore overwrite and update

                        const newitem = await Equipped.update(
                            {
                                name: item.name,
                                value: item.value,
                                attack: item.attack,
                                type: item.type,
                                rarity: item.rarity,
                                rar_id: item.rar_id,
                                loot_id: item.loot_id,
                            }, { where: [{ spec_id: interaction.user.id }] });

                        console.log('ITEM UPDATED IN EQUIPPED: ', newitem);
                        interaction.followUp('Item equipped successfully!');
                        const newLoad = await Loadout.update({ mainhand: item.loot_id }, { where: { spec_id: interaction.user.id } });
                        if (newLoad > 0) {
                            //item  updated
                        }
                    } else if (eqitem) {
                        const newitem = await Equipped.update(
                            {
                                name: item.name,
                                value: item.value,
                                attack: item.attack,
                                type: item.type,
                                rarity: item.rarity,
                                rar_id: item.rar_id,
                                loot_id: item.loot_id,
                            }, { where: [{ spec_id: interaction.user.id }] });

                        console.log('ITEM UPDATED IN EQUIPPED: ', newitem);
                        interaction.followUp('Item equipped successfully!');
                    } else if (!eqitem) {
                        //no items equipped therefore make new one
                        const newitem = await Equipped.create(
                            {
                                name: item.name,
                                value: item.value,
                                attack: item.attack,
                                type: item.type,
                                rarity: item.rarity,
                                rar_id: item.rar_id,
                                spec_id: interaction.user.id,
                                loot_id: item.loot_id,
                            });

                        console.log('ITEM ADDED TO EQUIPPED: ', newitem);
                        interaction.followUp('Item equipped successfully!');
                    }
                    if (!equipInLoadout) {
                        const newLoad = await Loadout.create({
                            mainhand: item.loot_id,
                            spec_id: interaction.user.id,
                        });
                        if (newLoad > 0) {
                            //item  updated
                        }
                    }
                }
                else if (!item) {
                    //item not found!
                    return interaction.reply('That item could not be found.. please use ``/myloot`` for a list of items you have!');
                }
            }
        }
        if (interaction.options.getSubcommand() === 'helm') {
            const itemname = interaction.options.getString('headslot');
            console.log(itemname);
            const item = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { name: itemname }] });
            console.log(item.loot_id);

            if (item) {
                const equipInLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });

                if (equipInLoadout) {
                    //LoadoutFound update slot
                    const newHelm = await Loadout.update({
                        headslot: item.loot_id,
                    }, { where: { spec_id: interaction.user.id } });
                    if (newHelm > 0) {
                        console.log('HEADSLOT UPDATED!');
                        return interaction.followUp('Helm equipped!');
                    }
                } else {
                    //New Loadout
                    const newHelm = await Loadout.create({
                        headslot: item.loot_id,
                        spec_id: interaction.user.id,
                    });
                    if (newHelm > 0) {
                        console.log('HEADSLOT CREATED!');
                        return interaction.followUp('Helm equipped!');
                    }
                }
            }

        }
        if (interaction.options.getSubcommand() === 'chest') {
            const itemname = interaction.options.getString('chestslot');
            console.log(itemname);
            const item = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { name: itemname }] });
            console.log(item.loot_id);

            if (item) {
                const equipInLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });

                if (equipInLoadout) {
                    //LoadoutFound update slot
                    const newChest = await Loadout.update({
                        chestslot: item.loot_id,
                    }, { where: { spec_id: interaction.user.id } });
                    if (newChest > 0) {
                        console.log('CHESTSLOT UPDATED!');
                        return interaction.followUp('Chestpiece equipped!');
                    }
                } else {
                    //New Loadout
                    const newChest = await Loadout.create({
                        chestslot: item.loot_id,
                        spec_id: interaction.user.id,
                    });
                    if (newChest > 0) {
                        console.log('CHESTSLOT CREATED!');
                        return interaction.followUp('Chestpiece equipped!');
                    }
                }
            }
        }
        if (interaction.options.getSubcommand() === 'leg') {
            const itemname = interaction.options.getString('legslot');
            console.log(itemname);
            const item = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { name: itemname }] });
            console.log(item.loot_id);

            if (item) {
                const equipInLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
                console.log(equipInLoadout);
                if (equipInLoadout) {
                    //LoadoutFound update slot
                    const newLegs = await Loadout.update({
                        legslot: item.loot_id,
                    }, { where: { spec_id: interaction.user.id } });
                    if (newLegs > 0) {
                        console.log('LEGSLOT UPDATED!');
                        return interaction.followUp('Leggings equipped!');
                    }
                } else {
                    //New Loadout
                    const newLegs = await Loadout.create({
                        legslot: item.loot_id,
                        spec_id: interaction.user.id,
                    });
                    if (newLegs > 0) {
                        console.log('LEGSLOT CREATED!');
                        return interaction.followUp('Leggings equipped!');
                    }
                }
            }
        }
	},

};
