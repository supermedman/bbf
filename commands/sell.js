const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const { LootStore, UserData } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('sell')
		.setDescription('Sell some old gear!')
		.addStringOption(option =>
			option.setName('item')
				.setDescription('Item to sell')
				.setAutocomplete(true)
				.setRequired(true))
		.addIntegerOption(option =>
			option.setName('amount')
				.setDescription('Amount to sell')),
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
        await interaction.deferReply();
        const itemname = interaction.options.getString('item');
        const amountsell = interaction.options.getInteger('amount');
		console.log(itemname);

		const item = await LootStore.findOne({ where: [{ spec_id: interaction.user.id }, { name: itemname }] });
        if (item) {
            if (!amountsell) {
                const sellButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Cancel")
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('❌')
                            .setCustomId('cancel'),
                    )
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("SELL ONE")
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('✅')
                            .setCustomId('confirm'),
                    )
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("LEAVE ONE")
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('💲')
                            .setCustomId('leave-one'),
                    )
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("SELL ALL")
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('💲')
                            .setCustomId('sell-all'),
                    );


                //create embed
                const sellEmbed = new EmbedBuilder()
                    .setTitle("~Selling Options~")
                    .setColor(0x39acf3)
                    .addFields(
                        {
                            name: (`Inventory`),
                            value: `You have ${item.amount} ${item.name}(s) currently`
                        }
                    )

                interaction.followUp({ embeds: [sellEmbed], components: [sellButtons] }).then(async embedMsg => {
                    const collectorBut = embedMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 40000 });

                    collectorBut.on('collect', async i => {
                        if (i.user.id === interaction.user.id) {

                            if (i.customId === 'confirm') {
                                await i.deferUpdate();
                                await wait(1000);
                                console.log('ITEM FOUND!', item.name);
                                var uData = await grabU();
                                console.log('Item', item.amount);

                                //sell item here
                                await embedMsg.delete();
                                await sold(item, uData);
                            }
                            else if (i.customId === 'sell-all') {
                                await i.deferUpdate();
                                await wait(1000);
                                console.log('ITEM FOUND!', item.name);
                                var uData = await grabU();
                                console.log('Item', item.amount);

                                //sell item here
                                await embedMsg.delete();
                                await sellAll(item, uData);
                            }
                            else if (i.customId === 'leave-one') {
                                await i.deferUpdate();
                                await wait(1000);
                                console.log('ITEM FOUND!', item.name);
                                var uData = await grabU();
                                console.log('Item', item.amount);

                                //sell item here
                                await embedMsg.delete();
                                await leaveOne(item, uData);
                            }
                            else if (i.customId === 'cancel') {
                                await i.deferUpdate();
                                await wait(1000);
                                await embedMsg.delete();
                            }
                        } else {
                            i.reply({ content: `Nice try slick!`, ephemeral: true });
                        }
                    });
                });
            } else if (amountsell) {
                //handle user input sell amount
                if (amountsell > item.amount) {
                    return interaction.followUp(`You do not have that many ${item.name}`);
                } else if (amountsell === item.amount) {
                    var uData = await grabU();
                    await sellAll(item, uData);
                } else {
                    var uData = await grabU();
                    await sell(item, amountsell, uData);
                }
            }
		} else {
			console.log('ITEM NOT FOUND!');
			return interaction.followUp('You dont have that item in your inventory.. to see your loot use the command ``myloot``');
        }

        //this method sells the user defined amount of items
        async function sell(item, amountsell, uData) {
            var soldFor = (item.value * amountsell);
            var newtotal = uData.coins + soldFor;

            var newA = item.amount - amountsell;

            const removed = await LootStore.update({ amount: newA }, { where: [{ name: item.name }, { spec_id: interaction.user.id }] });
            if (removed) {
                //item was updated
                console.log('ITEM COUNT UPDATED');
                const editC = await UserData.update({ coins: newtotal }, { where: [{ userid: interaction.user.id }] });
                if (editC) {
                    console.log('COINS UPDATED!');
                    console.log('Item sold! You gained: ', soldFor);

                    await interaction.followUp(`Item sold! You gained: ${soldFor}c`);
                    if (newA <= 0) {
                        //no more items remove from table
                        const newtot = uData.totitem - 1;
                        const totalItem = UserData.update({ totitem: newtot }, { where: [{ userid: interaction.user.id }] });
                        if (totalItem) console.log('TOTAL ITEM COUNT REDUCED!');

                        const isGone = await LootStore.destroy({ where: [{ name: item.name }, { spec_id: interaction.user.id }] });
                        if (isGone) console.log('ITEM REMOVED FROM TABLE');
                    } else { }
                    return;
                }
            } else { }//something went wrong  
        }

        //This method sells all but one of the item selected and does nothing if only one item is already present
        async function leaveOne(item, uData) {

            if (item.amount == 1) {
                await interaction.followUp(`You only have one of this item, no items have been sold!`);
                return;
            }
            console.log('Current users coins', uData.coins);
            var soldFor = (item.value * item.amount) - item.value;
            var newtotal = uData.coins + (item.value * item.amount);

            console.log('Total coins after adding users coins', newtotal);
            newtotal = newtotal - item.value;

            var newA = 1;

            const removed = await LootStore.update({ amount: newA }, { where: [{ name: item.name }, { spec_id: interaction.user.id }] });

            if (removed) {
                //item was updated
                console.log('ITEM COUNT UPDATED');
                const editC = await UserData.update({ coins: newtotal }, { where: [{ userid: interaction.user.id }] });
                if (editC) {
                    console.log('COINS UPDATED!');
                    console.log('Item sold! You gained: ', soldFor);

                    await interaction.followUp(`Item sold! You gained: ${soldFor}c`);
                    return;
                }
            } else { }//something went wrong                  
        }

        //This method sells all of the item selected
        async function sellAll(item, uData) {

            console.log('Current users coins', uData.coins);
            var newtotal = uData.coins + (item.value * item.amount);
            var soldFor = (item.value * item.amount);

            var newA = 0;

            const removed = await LootStore.update({ amount: newA }, { where: [{ name: item.name }, { spec_id: interaction.user.id }] });

            if (removed) {
                //item was updated
                console.log('ITEM COUNT UPDATED');
                const editC = await UserData.update({ coins: newtotal }, { where: [{ userid: interaction.user.id }] });
                if (editC) {
                    console.log('COINS UPDATED!');
                    console.log('Item sold! You gained: ', soldFor);

                    await interaction.followUp(`Item sold! You gained: ${soldFor}c`);
                    if (newA <= 0) {
                        //no more items remove from table
                        const newtot = uData.totitem - 1;
                        const totalItem = UserData.update({ totitem: newtot }, { where: [{ userid: interaction.user.id }] });
                        if (totalItem) console.log('TOTAL ITEM COUNT REDUCED!');

                        const isGone = await LootStore.destroy({ where: [{ name: item.name }, { spec_id: interaction.user.id }] });
                        if (isGone) console.log('ITEM REMOVED FROM TABLE');
                    } else { }
                    return;
                }
            } else { }//something went wrong                  
        }

        //This method sells only one of the item selected
        async function sold(item, uData) {

            var newA = item.amount - 1;

            const removed = await LootStore.update({ amount: newA }, { where: [{ name: item.name }, { spec_id: interaction.user.id }] });

            if (removed) {
                //item was updated
                console.log('ITEM COUNT UPDATED');

                var newtotal = uData.coins + item.value;

                const editC = await UserData.update({ coins: newtotal }, { where: [{ userid: interaction.user.id }] });
                if (editC) {
                    console.log('COINS UPDATED!');
                    console.log('Item sold! You gained: ', item.value);

                    await interaction.followUp(`Item sold! You gained: ${item.value}c`);

                    if (newA <= 0) {
                        //no more items remove from table
                        const newtot = uData.totitem - 1;
                        const totalItem = UserData.update({ totitem: newtot }, { where: [{ userid: interaction.user.id }] });
                        if (totalItem) console.log('TOTAL ITEM COUNT REDUCED!');

                        const isGone = await LootStore.destroy({ where: [{ name: item.name }, { spec_id: interaction.user.id }] });
                        if (isGone) console.log('ITEM REMOVED FROM TABLE');
                    } else { }//do nothing
                    return;
                }

            } else { }//something went wrong

        }

        async function grabU() {
            uData = await UserData.findOne({ where: { userid: interaction.user.id } });
            //console.log(uData);
            return uData;
        }
	},

};
