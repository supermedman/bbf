const { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { errorForm, specialInfoForm, basicInfoForm, specialInfoForm2, successResult } = require('../chalkPresets.js');

const { Loadout, UserData, LootStore, MaterialStore } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('trade')
		.setDescription('Trade weapons, armor, or materials with another player!')
		.addSubcommand(subcommand =>
			subcommand
				.setName('with')
				.setDescription('Trade with a player.')
				.addUserOption(option => option.setName('player').setDescription('The user').setRequired(true))
				.addStringOption(option =>
					option.setName('type')
						.setDescription('Which category would you like to trade from?')
						.setRequired(true)
						.addChoices(
							{ name: 'Weapon', value: 'Mainhand' },
							{ name: 'Offhand', value: 'Offhand' },
							{ name: 'Armor', value: 'Armor' },
							{ name: 'Material', value: 'Material' },
						))
				.addStringOption(option =>
					option.setName('item')
						.setDescription('Which item would you like to trade?')
						.setRequired(true)
						.setAutocomplete(true))
				.addIntegerOption(option =>
					option.setName('amount')
						.setDescription('The amount of items to trade')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('local')
				.setDescription('Trade locally, within a single server.'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('global')
				.setDescription('Trade globally, across the entire bb tradehub!')),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);

		let choices = [];

		if (focusedOption.name === 'item') {
			const focusedValue = interaction.options.getFocused(false);
			let tradeType = interaction.options.getString('type') ?? 'NONE';


			let items;

			if (tradeType === 'Mainhand') {
				items = await LootStore.findAll({
					where: [
						{ spec_id: interaction.user.id },
						{ slot: 'Mainhand' }]
				});
			}
			if (tradeType === 'Offhand') {
				items = await LootStore.findAll({
					where: [
						{ spec_id: interaction.user.id },
						{ slot: 'Offhand' }]
				});
			}
			if (tradeType === 'Armor') {
				items = await LootStore.findAll({
					where: [
						{ spec_id: interaction.user.id },
						{ attack: 0 }]
				});
			}
			if (tradeType === 'Material') {
				items = await MaterialStore.findAll({
					where: [
						{ spec_id: interaction.user.id }]
				});
			}

			choices = items.map(item => item.name);

			console.log(basicInfoForm(`Current Choices: ${choices} for ${tradeType}s`));

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}

    },
	async execute(interaction) { 
		
		if (interaction.options.getSubcommand() === 'with') {
			//if (interaction.user.id !== '501177494137995264') return interaction.reply('This command is under construction, please check back later!');
			const startTime = new Date().getTime();
			await interaction.deferReply().then(async () => {
				const tradeType = interaction.options.getString('type');
				const theItemName = interaction.options.getString('item') ?? 'NONE';

				//=============================
				const amount = interaction.options.getInteger('amount') ?? 1;				
				//=============================

				if (theItemName === 'NONE') return interaction.followUp('That was not a valid item: ', theItemName);

				const tradeToUser = interaction.options.getUser('player');
				const tradeFromUser = interaction.user;

				console.log(specialInfoForm(`TradeType: ${tradeType}\ntheItemsName: ${theItemName}`));
				console.log(specialInfoForm2(`User trading:${tradeFromUser}\nTrading to:${tradeToUser}`));

				const dataCheckTradeTo = await UserData.findOne({ where: { userid: tradeToUser.id } });
				if (!dataCheckTradeTo) return interaction.followUp('That user could not be found, check their ``/stats user``');
				const dataCheckTradeFrom = await UserData.findOne({ where: { userid: tradeFromUser.id } });
				if (!dataCheckTradeFrom) return interaction.followUp('No data found, please use ``/start`` to create a profile!');

				let itemRef = '';

				if (tradeType === 'Material') {
					itemRef = await MaterialStore.findOne({ where: [{ spec_id: tradeFromUser.id }, { name: theItemName }] });
				} else {
					itemRef = await LootStore.findOne({ where: [{ spec_id: tradeFromUser.id }, { name: theItemName }] });
					const userLoadout = await Loadout.findOne({ where: { spec_id: tradeFromUser.id } });
					id1 = userLoadout.headslot;
					id2 = userLoadout.chestslot;
					id3 = userLoadout.legslot;
					id4 = userLoadout.mainhand;
					id5 = userLoadout.offhand;
					if (itemRef === (id1 || id2 || id3 || id4 || id5)) {
						//Item trading is equipped
						if (itemRef.amount === amount) return interaction.followUp(`You cannot trade that many ${itemRef.name}, you currently have it equipped!`);
                    }
				}

				if (itemRef.amount < amount) return interaction.followUp(`You cannot trade that many ${itemRef.name}, you only have ${itemRef.amount}!`);

				console.log(basicInfoForm(`Match for item: ${itemRef}\nValue of 1: ${itemRef.value}`));

				if (itemRef === '') return interaction.followUp(`Item not found!!`);

				const actualValue = itemRef.value * amount;
				let listedValue = actualValue;

				const above25 = actualValue + Math.floor(actualValue * 0.25);
				const above10 = actualValue + Math.floor(actualValue * 0.10);
				
				const below10 = actualValue - Math.floor(actualValue * 0.10);
				const below25 = actualValue - Math.floor(actualValue * 0.25);

				const askPriceSelect = new StringSelectMenuBuilder()
					.setCustomId('starter')
					.setPlaceholder('Make a selection!')
					.addOptions(
						new StringSelectMenuOptionBuilder()
							.setLabel('25% Above')
							.setDescription(`Listed Value: ${above25}`)
							.setValue(`${above25}`),
						new StringSelectMenuOptionBuilder()
							.setLabel('10% Above')
							.setDescription(`Listed Value: ${above10}`)
							.setValue(`${above10}`),
						new StringSelectMenuOptionBuilder()
							.setLabel('Item Value')
							.setDescription(`Listed Value: ${actualValue}`)
							.setValue(`${actualValue}`),
						new StringSelectMenuOptionBuilder()
							.setLabel('10% Below')
							.setDescription(`Listed Value: ${below10}`)
							.setValue(`${below10}`),
						new StringSelectMenuOptionBuilder()
							.setLabel('25% Below')
							.setDescription(`Listed Value: ${below25}`)
							.setValue(`${below25}`),
					);

				const selectRow = new ActionRowBuilder()
					.addComponents(askPriceSelect);

				const selectMenu = await interaction.followUp({
					content: 'Choose a value range',
					components: [selectRow],
				});

				const filterFrom = (i) => i.user.id === tradeFromUser.id;

				const selectCollector = selectMenu.createMessageComponentCollector({
					componentType: ComponentType.StringSelect,
					filterFrom,
					time: 120000
				});

				let sentFollowUp = 'No reply yet.';
				selectCollector.on('collect', async iCS => {
					listedValue = iCS.values[0];
					sentFollowUp = 'Value found!';
					await selectCollector.stop();
				});

				selectCollector.once('end', async () => {
					if (sentFollowUp === 'No reply yet.') {
						selectMenu.delete().catch(error => {
							if (error.code !== 10008) {
								console.error('Failed to delete the message:', error);
							}
						});
					} else {
						const staticAcceptFrom = `accept-${tradeFromUser.id}`;
						const staticCancelFrom = `cancel-${tradeFromUser.id}`;

						const staticAcceptTo = `accept-${tradeToUser.id}`;
						const staticCancelTo = `cancel-${tradeToUser.id}`;

						const acceptButtonFrom = new ButtonBuilder()
							.setLabel("Yes")
							.setStyle(ButtonStyle.Success)
							.setEmoji('✅')
							.setCustomId(staticAcceptFrom);

						const cancelButtonFrom = new ButtonBuilder()
							.setLabel("No")
							.setStyle(ButtonStyle.Danger)
							.setEmoji('❌')
							.setCustomId(staticCancelFrom);

						const interactiveButtonsFrom = new ActionRowBuilder().addComponents(acceptButtonFrom, cancelButtonFrom);

						const acceptButtonTo = new ButtonBuilder()
							.setLabel("Yes Trade")
							.setStyle(ButtonStyle.Success)
							.setEmoji('✅')
							.setCustomId(staticAcceptTo);

						const cancelButtonTo = new ButtonBuilder()
							.setLabel("No Dont")
							.setStyle(ButtonStyle.Danger)
							.setEmoji('❌')
							.setCustomId(staticCancelTo);

						const interactiveButtonsTo = new ActionRowBuilder().addComponents(acceptButtonTo, cancelButtonTo);


						const confirmEmbedFrom = new EmbedBuilder()
							.setColor('Blurple')
							.setTitle('==**Trading**==')
							.addFields(
								{
									name: `Your Offer: ${itemRef.name} for ${listedValue}c`,
									value: `Confirm to send offer to ${tradeToUser.username}`,

								});

						const confirmEmbedTo = new EmbedBuilder()
							.setColor('Blurple')
							.setTitle('==**Trading**==')
							.addFields(
								{
									name: `You are being offered: ${itemRef.name}`,
									value: `${tradeFromUser.username} is asking for ${listedValue}c in exchange, would you like to procced?`,

								});

						selectMenu.delete().catch(error => {
							if (error.code !== 10008) {
								console.error('Failed to delete the message:', error);
							}
						});

						const embedMsgFrom = await interaction.followUp({ components: [interactiveButtonsFrom], embeds: [confirmEmbedFrom] });

						const embedMsgToEmbed = { content: `<@${tradeToUser.id}> has been offered a trade deal!`, embeds: [confirmEmbedTo] };
						const embedMsgToComponents = { components: [interactiveButtonsTo] };


						const filterTo = (i) => i.user.id === tradeToUser.id;

						const collectorFrom = embedMsgFrom.createMessageComponentCollector({
							ComponentType: ComponentType.Button,
							filterFrom,
							time: 120000,
						});

						const collectorTo = embedMsgFrom.createMessageComponentCollector({
							ComponentType: ComponentType.Button,
							filterTo,
							time: 240000,
						});

						collectorFrom.on('collect', async (cI) => {
							//First accept!
							console.log(specialInfoForm(`Collected From: ${cI.customId}`));
							const compCheckAcceptFrom = `accept-${cI.user.id}`;
							const compCheckCancelFrom = `cancel-${cI.user.id}`;

							if (cI.customId === staticAcceptFrom && compCheckAcceptFrom === staticAcceptFrom) {
								await cI.deferUpdate().then(async () => {
									await embedMsgFrom.edit(embedMsgToEmbed);
									await cI.editReply(embedMsgToComponents);
								}).catch(error => {
									console.log(errorForm(error));
								});
							}
							//Cancel
							if (cI.customId === staticCancelFrom && compCheckCancelFrom === staticCancelFrom) {
								await collectorFrom.stop();
							}
						});

						collectorTo.on('collect', async (cI) => {
							//Second accept!
							console.log(specialInfoForm2(`Collected To: ${cI.customId}`));
							const compCheckAcceptTo = `accept-${cI.user.id}`;
							const compCheckCancelTo = `cancel-${cI.user.id}`;

							if (cI.customId === staticAcceptTo && compCheckAcceptTo === staticAcceptTo) {
								await cI.deferUpdate().then(async () => {
									await handleTransfer(tradeType, itemRef, tradeFromUser, tradeToUser, amount, listedValue).then(async (result) => {
										if (result === 'Success') {
											collectorTo.stop();
											const endTime = new Date().getTime();
											console.log(`Diff between start: ${startTime}/${endTime} :End..\n   ${(startTime - endTime)}`);
											return interaction.followUp('Transaction complete!!');
										} 
										return interaction.followUp('Something went wrong!!', result);
									}).catch(error => {
										console.log(errorForm(error));
									});
								}).catch(error => {
									console.log(errorForm(error));
								});
							}
							//Cancel
							if (cI.customId === staticCancelTo && compCheckCancelTo === staticCancelTo) {
								await collectorFrom.stop();
							}
						});

						collectorFrom.once('end', () => {
							if (embedMsgFrom) {
								embedMsgFrom.delete().catch(error => {
									if (error.code !== 10008) {
										console.error('Failed to delete the message:', error);
									}
								});
							}
						});

						collectorTo.once('end', () => {
							if (embedMsgFrom) {
								embedMsgFrom.delete().catch(error => {
									if (error.code !== 10008) {
										console.error('Failed to delete the message:', error);
									}
								});
							}
						});

						/**
						 * 
						 * @param {any} type
						 * @param {any} item
						 * @param {any} fromUser
						 * @param {any} toUser
						 */
						async function handleTransfer(type, item, fromUser, toUser, amount, listedValue) {
							let updateSuccess = '';
							if (type === 'Material') {
								updateSuccess = await addMaterial(item, toUser, amount);
							} else updateSuccess = await addGear(item, toUser, amount);

							if (updateSuccess !== 'Added') return 'Failure 1';

							let removeSuccess = '';
							if (type === 'Material') {
								removeSuccess = await removeMaterial(item, fromUser, amount);
							} else removeSuccess = await removeGear(item, fromUser, amount);

							if (removeSuccess !== 'Removed') return 'Failure 2';

							let paymentSuccess = '';
							const payFrom = await payOut(listedValue, fromUser);
							const takeTo = await payUp(listedValue, toUser);
							if ((payFrom && takeTo) === 'Paid') paymentSuccess = 'Success';

							if (paymentSuccess !== 'Success') return 'Failure 3';
							return paymentSuccess;
						}
                    }
				});

				/**
				 * 
				 * @param {any} item
				 * @param {any} toUser
				 * @param {any} amount
				 */
				async function addMaterial(item, toUser, amount) {
					const user = await UserData.findOne({ where: { userid: toUser.id } });

					const matStore = await MaterialStore.findOne({
						where: [{ spec_id: user.userid }, { mat_id: item.mat_id }, { mattype: item.mattype }]
					});

					console.log(basicInfoForm('UserMaterial: ', matStore));

					if (matStore) {
						amount += matStore.amount;
						const inc = await MaterialStore.update({ amount: amount },
							{ where: [{ spec_id: user.userid }, { mat_id: item.mat_id }, { mattype: item.mattype }] });

						if (inc) console.log(successResult('AMOUNT WAS UPDATED!', amount));

						return 'Added';
					}

					const newMat = await MaterialStore.create({
						name: item.name,
						value: item.value,
						mattype: item.mattype,
						mat_id: item.mat_id,
						rarity: item.rarity,
						rar_id: item.rar_id,
						amount: amount,
						spec_id: user.userid
					});

					if (newMat) {
						const materialEntry = await MaterialStore.findOne({
							where: [{ spec_id: user.userid }, { mat_id: item.mat_id }, { mattype: item.mattype }]
						});

						console.log(successResult(`Material Entry: ${materialEntry}`));

						return 'Added';
					}
				}

				/**
				 * 
				 * @param {any} item
				 * @param {any} toUser
				 * @param {any} amount
				 */
				async function addGear(item, toUser, amount) {
					const user = await UserData.findOne({ where: { userid: toUser.id } });

					const lootStore = await LootStore.findOne({
						where: { spec_id: user.userid, loot_id: item.loot_id },
					});

					if (lootStore) {
						amount += lootStore.amount;
						const inc = await LootStore.update({ amount: amount },
							{ where: [{ spec_id: user.userid }, { loot_id: item.loot_id}] });

						if (inc) console.log('AMOUNT WAS UPDATED!');

						await lootStore.save();

						return 'Added';
					}

					user.totitem += 1;
					await user.save();

					let addedItem;
					if (theItem.Slot === 'Mainhand') {
						addedItem = await LootStore.create({
							name: item.name,
							value: item.value,
							loot_id: item.loot_id,
							spec_id: user.userid,
							rarity: item.rarity,
							rar_id: item.rar_id,
							attack: item.attack,
							defence: 0,
							type: item.type,
							slot: item.slot,
							hands: item.hands,
							amount: amount
						});
					} else if (theItem.Slot === 'Offhand') {
						addedItem = await LootStore.create({
							name: item.name,
							value: item.value,
							loot_id: item.loot_id,
							spec_id: user.userid,
							rarity: item.rarity,
							rar_id: item.rar_id,
							attack: item.attack,
							defence: item.defence,
							type: item.type,
							slot: item.slot,
							hands: 'One',
							amount: amount
						});
					} else {
						//IS ARMOR
						addedItem = await LootStore.create({
							name: item.name,
							value: item.value,
							loot_id: item.loot_id,
							spec_id: user.userid,
							rarity: item.rarity,
							rar_id: item.rar_id,
							attack: 0,
							defence: item.defence,
							type: item.type,
							slot: item.slot,
							hands: 'NONE',
							amount: amount
						});
					}


					if (addedItem) {
						//const itemAdded = await LootStore.findOne({
						//	where: { spec_id: user.userid, loot_id: item.loot_id },
						//});

						return 'Added';
					}
				}


				/**
				 * 
				 * @param {any} item
				 * @param {any} fromUser
				 * @param {any} amount
				 */
				async function removeMaterial(item, fromUser, amount) {
					const user = await UserData.findOne({ where: { userid: fromUser.id } });

					const remainingAmount = item.amount - amount;

					if (remainingAmount === 0) {
						const matDestroyed = await MaterialStore.destroy({ where: [{ spec_id: user.userid }, { mat_id: item.mat_id }, { mattype: item.mattype }] });
						if (matDestroyed > 0) {
							console.log(successResult('Material destroyed!'));
							return 'Removed';
						}
					} else {
						const matUpdated = await MaterialStore.update({ amount: remainingAmount }, { where: [{ spec_id: user.userid }, { mat_id: item.mat_id }, { mattype: item.mattype }] });
						if (matUpdated > 0) {
							console.log(successResult('Material updated!'));
							return 'Removed';
						}
                    }
				}

				/**
				 * 
				 * @param {any} item
				 * @param {any} fromUser
				 * @param {any} amount
				 */
				async function removeGear(item, fromUser, amount) {
					const user = await UserData.findOne({ where: { userid: fromUser.id } });

					const remainingAmount = item.amount - amount;

					if (remainingAmount === 0) {
						//Destroy entry
						const newItemTotal = user.totitem - 1;
						const updateUserTotal = await UserData.update({ totitem: newItemTotal }, { where: { userid: user.userid } });
						if (updateUserTotal > 0) console.log(successResult('Item total reduced successfully!'));

						const destroyItem = await LootStore.destroy({ where: [{ spec_id: user.userid }, { loot_id: item.loot_id }] });
						if (destroyItem > 0) {
							console.log(successResult('Item entry destroyed successfully!'));
							return 'Removed';
                        }
					} else {
						const updateItemTotal = await LootStore.update({ amount: remainingAmount }, { where: [{ spec_id: user.userid }, { loot_id: item.loot_id }] });
						if (updateItemTotal > 0) {
							console.log(successResult('LootStore Item amount reduced!'));
							return 'Removed';
                        }
					}
				}

				/**
				 * 
				 * @param {any} listedValue
				 * @param {any} fromUser
				 */
				async function payOut(listedValue, fromUser) {
					const user = await UserData.findOne({ where: { userid: fromUser.id } });

					const newTotal = user.coins + listedValue;

					const tableUpdate = await UserData.update({ coins: newTotal }, { where: { userid: user.userid } });
					if (tableUpdate > 0) return 'Paid';
				}

				/**
				 * 
				 * @param {any} listedValue
				 * @param {any} toUser
				 */
				async function payUp(listedValue, toUser) {
					const user = await UserData.findOne({ where: { userid: toUser.id } });

					const newTotal = user.coins - listedValue;

					const tableUpdate = await UserData.update({ coins: newTotal }, { where: { userid: user.userid } });
					if (tableUpdate > 0) return 'Paid';
				}

				
			}).catch(error => {
				console.log(errorForm('Interaction error @ Trade with:', error));
			});
		}

		if (interaction.options.getSubcommand() === 'local') {
			if (interaction.user.id !== '501177494137995264') return interaction.reply('This command is under construction, please check back later!');
			const startTime = new Date().getTime();
			await interaction.deferReply().then(async () => {

				//const stringSelect = new StringSelectMenuBuilder()
				//	.setCustomId('starter')
				//	.setPlaceholder('Make a selection!')
				//	.addOptions(
				//		new StringSelectMenuOptionBuilder()
				//			.setLabel('Bulbasaur')
				//			.setDescription('The dual-type Grass/Poison Seed Pokémon.')
				//			.setValue('bulbasaur'),
				//		new StringSelectMenuOptionBuilder()
				//			.setLabel('Charmander')
				//			.setDescription('The Fire-type Lizard Pokémon.')
				//			.setValue('charmander'),
				//		new StringSelectMenuOptionBuilder()
				//			.setLabel('Squirtle')
				//			.setDescription('The Water-type Tiny Turtle Pokémon.')
				//			.setValue('squirtle'),
				//	);

				//const row = new ActionRowBuilder()
				//	.addComponents(stringSelect);

				//await interaction.followUp({
				//	content: 'Choose your starter!',
				//	components: [row],
				//});


				const endTime = new Date().getTime();
				console.log(`Diff between start: ${startTime}/${endTime} :End..\n   ${(startTime - endTime)}`);
			}).catch(error => {
				console.log(errorForm('Interaction error @ Trade local:', error));
			});
		}

		if (interaction.options.getSubcommand() === 'global') {
			if (interaction.user.id !== '501177494137995264') return interaction.reply('This command is under construction, please check back later!');
			const startTime = new Date().getTime();
			await interaction.deferReply().then(async () => {

				const endTime = new Date().getTime();
				console.log(`Diff between start: ${startTime}/${endTime} :End..\n   ${(startTime - endTime)}`);
			}).catch(error => {
				console.log(errorForm('Interaction error @ Trade global:', error));
			});
		}

	},
};