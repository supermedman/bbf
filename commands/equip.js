const { SlashCommandBuilder } = require('discord.js');
const { LootStore, Equipped } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('equip')
		.setDescription('What are you going to swing around?')
		.addStringOption(option => 
			option.setName('item')
				.setDescription('Item to equip')
				.setAutocomplete(true)
				.setRequired(true)),
	async autocomplete(interaction) {
		//Focused option is assigned to what the user is inputting as the paramaters for what option to select from
		const focusedValue = interaction.options.getFocused();
		//FIGURE OUT HOW TO MAP CURRENT INVENTORY ITEMS AS THE OPTIONS FOR SELECTING
		const items = await LootStore.findAll({ where: [{ spec_id: interaction.user.id }] });

		let choices = [];

        if (focusedValue) {
            let first = focusedValue.charAt();

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

	},
	async execute(interaction) {
		const itemname = interaction.options.getString('item');
		console.log(itemname);

        const item = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { name: itemname }] });
        console.log(item.spec_id);

        if (item.spec_id !== interaction.user.id) {
            //something is wrong!
            console.log(interaction.user.id);
            item.spec_id = interaction.user.id;
            console.log(item.spec_id);
            if (item) {
                //item found!
                const eqitem = await Equipped.findOne({ where: [{ spec_id: interaction.user.id }] });
                console.log(eqitem);
                if (eqitem) {
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
                    interaction.reply('Item equipped successfully!');
                }
                else {
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
                    interaction.reply('Item equipped successfully!');
                }
            }
            else if (!item) {
                //item not found!
                return interaction.reply('That item could not be found.. please use ``myloot`` for a list of items you have!');
            }

        } else {
            if (item) {
                //item found!
                const eqitem = await Equipped.findOne({ where: [{ spec_id: interaction.user.id }] });
                console.log(eqitem);
                if (eqitem) {
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
                    interaction.reply('Item equipped successfully!');
                }
                else {
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
                    interaction.reply('Item equipped successfully!');
                }
            }
            else if (!item) {
                //item not found!
                return interaction.reply('That item could not be found.. please use ``myloot`` for a list of items you have!');
            }
        }
	},

};