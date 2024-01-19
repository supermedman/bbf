const { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { errorForm, specialInfoForm, basicInfoForm, specialInfoForm2, successResult } = require('../chalkPresets.js');

const { Loadout, UserData, LootStore, MaterialStore, TownMaterial, Town, LocalMarkets } = require('../dbObjects.js');

const { checkOwned } = require('./exported/createGear.js');

const lootList = require('../events/Models/json_prefabs/lootList.json');

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
				.setDescription('Trade locally, within a single server.')
				.addStringOption(option =>
					option.setName('saletype')
						.setDescription('Would you like to Buy or Sell?')
						.setRequired(true)
						.addChoices(
							{ name: 'Buy', value: 'buy' },
							{ name: 'Sell', value: 'sell' }))
				.addStringOption(option =>
					option.setName('trade-as')
						.setDescription('What inventory would you like to use during this trade?')
						.setRequired(true)
						.addChoices(
							{ name: 'Personal Inventory', value: 'user' },
							{ name: 'Town Inventory', value: 'town' }))
				.addStringOption(option =>
					option.setName('local-type')
						.setDescription('Which category would you like to trade from?')
						.setRequired(true)
						.setAutocomplete(true))
				.addStringOption(option =>
					option.setName('item')
						.setDescription('Which item would you like to trade?')
						.setRequired(true)
						.setAutocomplete(true))
				.addIntegerOption(option =>
					option.setName('amount')
						.setDescription('The amount of items to trade'))	)
		.addSubcommand(subcommand =>
			subcommand
				.setName('global')
				.setDescription('Trade globally, across the entire bb tradehub!')),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);

		let choices = [];

		if (focusedOption.name === 'local-type') {
			const focusedValue = interaction.options.getFocused(false);
			let tradeAs = interaction.options.getString('trade-as') ?? 'NONE';

			if (tradeAs === 'user') {
				choices = ['Weapon', 'Offhand', 'Armor', 'Material'];
			} else if (tradeAs === 'town') {
				choices = ['Material'];
			} else choices = ['NONE'];

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
        }

		if (focusedOption.name === 'item') {
			const focusedValue = interaction.options.getFocused(false);
			let tradeType, tradeFrom = 'NONE', theTown = 'NONE';
			if (interaction.options.getSubcommand() === 'with') tradeType = interaction.options.getString('type') ?? 'NONE';

			let exists = false;
			if (interaction.options.getSubcommand() === 'local') {
				tradeType = interaction.options.getString('local-type') ?? 'NONE';
				tradeFrom = interaction.options.getString('trade-as') ?? 'NONE';

				const user = await UserData.findOne({ where: { userid: interaction.user.id } });
				if (user && tradeFrom === 'town') theTown = await Town.findOne({ where: { townid: user.townid } });
				if (theTown !== 'NONE') {
					const currentEditList = theTown.can_edit.split(',');
					for (const id of currentEditList) {
						if (user.userid === id) {
							exists = true;
							break;
						}
					}
                }
			} 

			let items;
			if (tradeType === 'Mainhand' || tradeType === 'Weapon') {
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
				if (tradeFrom === 'NONE' || tradeFrom === 'user') {
					items = await MaterialStore.findAll({
						where: [
							{ spec_id: interaction.user.id }]
					});
				} else if (tradeFrom === 'town' && exists === true) {
					items = await TownMaterial.findAll({
						where: [
							{ townid: theTown.townid }]
					});
                }
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
		const { betaTester, materialFiles } = interaction.client;

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
					let id1 = userLoadout.headslot,
					id2 = userLoadout.chestslot,
					id3 = userLoadout.legslot,
					id4 = userLoadout.mainhand,
					id5 = userLoadout.offhand;
					if (itemRef === id1 || itemRef === id2 || itemRef === id3 || itemRef === id4 || itemRef === id5) {
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
									console.error(errorForm(error));
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
										console.error(errorForm(error));
									});
								}).catch(error => {
									console.error(errorForm(error));
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
					if (item.Slot === 'Mainhand') {
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
					} else if (item.Slot === 'Offhand') {
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

					console.log('User getting paid: ', user.dataValues);

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

					console.log('User paying: ', user.dataValues);

					const tableUpdate = await UserData.update({ coins: newTotal }, { where: { userid: user.userid } });
					if (tableUpdate > 0) return 'Paid';
				}

				
			}).catch(error => {
				console.error(errorForm('Interaction error @ Trade with:', error));
			});
		}

		if (interaction.options.getSubcommand() === 'local') {
			if (!betaTester.has(interaction.user.id)) return await interaction.reply('This command is under construction, please check back later!');

			const startTime = new Date().getTime();
			await interaction.deferReply().then(async () => {
				const tradeType = interaction.options.getString('local-type') ?? 'NONE'; // Weapon, Offhand, Armor, Material
				const tradeAs = interaction.options.getString('trade-as') ?? 'NONE'; // town, user
				const saleType = interaction.options.getString('saletype') ?? 'NONE'; // buy, sell
				const amount = interaction.options.getInteger('amount') ?? 1;

				const itemName = interaction.options.getString('item') ?? 'NONE';

				if (itemName === 'NONE') return await interaction.followUp('No item provided!');

				const user = await UserData.findOne({ where: { userid: interaction.user.id } });
				if (!user) return await interaction.followUp('No user found!');

				let theTown = 'None';
				let exists = false;
				if (tradeAs === 'town' && user.townid !== '0') theTown = await Town.findOne({ where: { townid: user.townid } });
				if (theTown !== 'None') {
					const currentEditList = theTown.can_edit.split(',');
					for (const id of currentEditList) {
						if (user.userid === id) {
							exists = true;
							break;
						}
					}
				}
				if (tradeAs === 'town') {
					if (theTown === 'None') return await interaction.followUp('Your town was not located!!');
					if (exists === false) return await interaction.followUp('You do not have permission to access your towns items!');
                }

				let item = '';
				if (tradeType === 'Material') {
					if (tradeAs === 'user') {
						item = await MaterialStore.findOne({ where: [{ spec_id: user.userid }, { name: itemName }] });
					} else if (tradeAs === 'town') {
						item = await TownMaterial.findOne({ where: [{ townid: user.townid }, { name: itemName }] });
                    }
				} else {
					if (tradeAs === 'town') return await interaction.followUp('Trade Type was invalid, current valid options are ``Material`` for ``local-type``');
					item = await LootStore.findOne({ where: [{ spec_id: user.userid }, { name: itemName }] });
					const userLoadout = await Loadout.findOne({ where: { spec_id: user.userid } });
					if (userLoadout && item !== '' && saleType === 'sell') {
						let id1 = userLoadout.headslot,
						id2 = userLoadout.chestslot,
						id3 = userLoadout.legslot,
						id4 = userLoadout.mainhand,
						id5 = userLoadout.offhand;
						if (item.loot_id === id1 || item.loot_id === id2 || item.loot_id === id3 || item.loot_id === id4 || item.loot_id === id5) {
							//Item trading is equipped
							if (item.amount === amount) return interaction.followUp(`You cannot sell that many ${item.name}, you currently have it equipped!`);
						}
                    }
                }

				if (item === '') return await interaction.followUp('Item not found!');
				if (saleType === 'sell' && item.amount < amount) return interaction.followUp(`You cannot sell that many ${item.name}, you only have ${item.amount}!`);


				console.log(` tradeType: ${tradeType}\n tradeAs: ${tradeAs}\n saleType: ${saleType}\n amount: ${amount}\n itemName: ${itemName}\n\n Item Found:`);
				console.log(item.dataValues);

				const actualValue = item.value;
				let listedValue = actualValue;

				const above25 = actualValue + Math.floor(actualValue * 0.25);
				const above10 = actualValue + Math.floor(actualValue * 0.10);

				const below10 = actualValue - Math.floor(actualValue * 0.10);
				const below25 = actualValue - Math.floor(actualValue * 0.25);

				let embedColour = 'DarkButNotQuiteBlack';
				if (saleType === 'buy') embedColour = 'Green';
				if (saleType === 'sell') embedColour = 'DarkRed';

				let dynDesc = '';
				dynDesc = 'The following select menu provides pricing options for the item in question. All values shown represent the cost per item, and not the combined total. ';
				dynDesc += `Currently trading as ${tradeAs}. `;

				if (saleType === 'buy') dynDesc += 'Upon a requested item being bought, items will automatically be transfered to your inventory. ';
				if (saleType === 'sell') dynDesc += 'Upon an item being sold, the appropriate amount of coins will be transfered to your inventory. ';

				dynDesc += 'Should the order timeout, all items/coins will be returned to the appropriate inventories, and the order will be removed.';

				dynDesc += 'If the item you are making a sale for already has an order locally, and the price matches yours, then a transaction will automatically be completed.';

				let fieldName = '';
				let fieldValue = '';
				let fieldObj = {};
				let finalFields = [];

				fieldName = `Item to be listed: ${item.name}`;

				// THIS NEEDS REVISION, CATCH CASE NO TOWNS BUT NOT TOWN TYPE TRADEAS
				//============================================
				/*if (theTown === 'None') theTown = await Town.findOne({ where: { townid: user.townid } });*/
				const localTowns = await Town.findAll({ where: { guildid: interaction.guild.id } });
				let twoTowns = false;
				if (localTowns.length === 2) twoTowns = true;

				if (twoTowns) {
					fieldValue = `Local Towns: **${localTowns[0].name}**, **${localTowns[1].name}**`;
				} else fieldValue = `Local Towns: **${localTowns[0].name}**`
				//============================================

				fieldObj = { name: fieldName, value: fieldValue };
				finalFields.push(fieldObj);

				const priceSelectEmbed = new EmbedBuilder()
					.setTitle(`Creating ${saleType} Order`)
					.setColor(embedColour)
					.setDescription(dynDesc)
					.addFields(finalFields);

				const askPriceSelect = new StringSelectMenuBuilder()
					.setCustomId('pricemark-perunit')
					.setPlaceholder('Choose an option! Value shown is price of one!')
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
					embeds: [priceSelectEmbed],
					components: [selectRow],
				});

				const filter = (i) => i.user.id === interaction.user.id;

				const selectCollector = selectMenu.createMessageComponentCollector({
					componentType: ComponentType.StringSelect,
					filter,
					time: 120000
				});

				let sentFollowUp = 'No reply yet.';
				selectCollector.on('collect', async iCS => {
					listedValue = iCS.values[0];
					sentFollowUp = 'Value found!';
					await iCS.deferUpdate();
					await selectCollector.stop();
				});

				selectCollector.once('end', async () => {
					if (sentFollowUp === 'No reply yet.') {
						return selectMenu.delete().catch(error => {
							if (error.code !== 10008) {
								console.error('Failed to delete the message:', error);
							}
						});
					}

					selectMenu.delete().catch(error => {
						if (error.code !== 10008) {
							console.error('Failed to delete the message:', error);
						}
					});

					let target, targetID;
					if (tradeAs === 'town') target = theTown, targetID = theTown.townid;
					if (tradeAs === 'user') target = user, targetID = user.userid;

					// Check total coin balance to see if buy order can be completed!
					if (saleType === 'buy') {
						const totalCoins = target.coins;
						const totalCost = listedValue * amount;
						if (totalCoins < totalCost) return await interaction.followUp(`You do not have enough coin to create that buy order!\nTotal Cost: ${totalCost}\nYour Coins: ${totalCoins}`);
                    }

					let tradeCheck, itemID;
					if (tradeType !== 'Material') tradeCheck = 'Gear', itemID = item.loot_id;
					if (tradeType === 'Material') tradeCheck = item.mattype, itemID = item.mat_id;

					/** Condensed Object containing all needed variables to create new sale order */
					const infoObject = {
						value: listedValue,
						sale: saleType,
						targetType: tradeAs,
						targetID,
						target,
						itemType: tradeCheck,
						itemID,
						item,
						amount,
					};
					const theOrder = await createNewOrder(infoObject);
					if (theOrder instanceof String) return await interaction.followUp('Something went wrong while creating that order!');
					if (!theOrder) return await interaction.followUp('Something went wrong while locating your order!');

					let setupResult = '';
					if (saleType === 'buy') setupResult = await handleBuyOrder(infoObject);
					if (saleType === 'sell') setupResult = await handleSellOrder(infoObject);
					if (setupResult === '') return await interaction.followUp('Something went wrong while setting up that order!');


					const orderMatchObj = {
						itemsMoved: 0,
						coinINC: 0,
					};

					let orderMatchCheck = '';
					if (saleType === 'buy') orderMatchCheck = await handleBuyReadyCheck(infoObject, theOrder, orderMatchObj);
					if (saleType === 'sell') orderMatchCheck = await handleSellReadyCheck(infoObject, theOrder, orderMatchObj);
					if (orderMatchCheck === 'None') console.log('No order matches found!');
					if (orderMatchCheck !== 'None') console.log(orderMatchCheck);


					const now = new Date().getTime();

					const diffTime = Math.abs(now - theOrder.expires_at);
					const timeLeft = Math.round(now + diffTime);
					let shownTime = Math.round(timeLeft / 1000);

					const endTime = new Date().getTime();
					console.log(`Diff between start: ${startTime}/${endTime} :End..\n   ${(startTime - endTime)}`);

					if (orderMatchCheck === 'Exact' || orderMatchCheck === 'Filled') {
						// Destroy Order, and display item/coin transfers
						let embedDesc = ``;
						if (saleType === 'buy') embedDesc = `Items Transfered: ${orderMatchObj.itemsMoved}\n`;
						if (saleType === 'sell') embedDesc = `Items Transfered: ${orderMatchObj.itemsMoved}\nCoins Gained: ${orderMatchObj.coinINC}c`;

						if (orderMatchObj.coinINC > 0 && saleType === 'buy') embedDesc += `Coins Refunded: ${orderMatchObj.coinINC}c`;

						const destOrder = await handleOrderRemoval(theOrder);
						if (destOrder !== 1) return await interaction.followUp('Something went wrong while removing a completed order!');

						const filledEmbed = new EmbedBuilder()
							.setTitle(`${saleType} Order Filled!`)
							.setColor('DarkGreen')
							.setDescription(embedDesc);

						return await interaction.followUp({ embeds: [filledEmbed] });
					} else if (orderMatchCheck === 'Partial') {
						let embedDesc = ``;
						if (saleType === 'buy') embedDesc = `Items Transfered: ${orderMatchObj.itemsMoved}\nItems Remaining: ${theOrder.amount_left - orderMatchObj.itemsMoved}`;
						if (saleType === 'sell') embedDesc = `Items Transfered: ${orderMatchObj.itemsMoved}\nItems Remaining: ${theOrder.amount_left - orderMatchObj.itemsMoved}\nCoins Gained: ${orderMatchObj.coinINC}c`;


						const filledEmbed = new EmbedBuilder()
							.setTitle(`${saleType} Order Partially Filled!`)
							.setColor('DarkGreen')
							.setDescription(embedDesc);

						return await interaction.followUp({ embeds: [filledEmbed] });

					} else return await interaction.followUp(`${saleType} order created! This order will expire <t:${shownTime}:R>`);
				});



				/** This function creates and then updates a sale order,
				 *		returns resolved or rejected outcomes to be used for user feedback
				 * 
				 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
				 */
				async function createNewOrder(infoObject) {
					const newOrder = await LocalMarkets.create({
						guildid: interaction.guild.id,
						target_type: infoObject.targetType,
						target_id: infoObject.targetID,
						sale_type: infoObject.sale,
						item_type: infoObject.itemType,
						item_id: infoObject.itemID,
						listed_value: infoObject.value,
						amount_left: infoObject.amount,
					});

					if (newOrder) {
						const expireChangeResult = await updateExpireTime(newOrder);
						if (expireChangeResult === 'Date Update') {
							await newOrder.save();
							return newOrder;
						} else return expireChangeResult;
					} else return 'Failure: 0.1';
                }


				/** This function gets and sets the date of expiration for the sale order created.
				 * 
				 * @param {any} saleOrder DB Instance Object
				 */
				async function updateExpireTime(saleOrder) {
					const createDate = new Date(saleOrder.createdAt);
					const expireDate = createDate.setDate(createDate.getDate() + 25);
					const tableUpdate = await saleOrder.update({ expires_at: expireDate });
					if (tableUpdate) return 'Date Update';
					return 'Failure: 0.2';
                }


				/** This function handles the removal of coins from the appropriate inventory
				 * 
				 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
				 */
				async function handleBuyOrder(infoObject) {
					const totalCost = infoObject.value * infoObject.amount;
					const theTarget = infoObject.target;
					const dec = await theTarget.decrement('coins', { by: totalCost });
					if (dec) await theTarget.save();
					return 'Complete';
				}


				/** This function handles the removal of items * amount from the appropriate inventory
				 * 
				 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
				 */
				async function handleSellOrder(infoObject) {
					console.log('Item Amount Before: ', infoObject.item.amount);
					const dec = await infoObject.item.decrement('amount', {by: infoObject.amount});
					if (dec) await infoObject.item.save();
					console.log('Item Amount After: ', infoObject.item.amount);
					return 'Complete';
				}


				/** This function handles checking against existing sell orders to try to complete the newly created order
				 * 
				 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
				 * @param {any} theOrder DB Instance Object
				 * @param {any} orderMatchObj Callback Object to use for display
				 */
				async function handleBuyReadyCheck(infoObject, theOrder, orderMatchObj) {
					const activeOrders = await LocalMarkets.findAll({ where: [{ guildid: interaction.guild.id }, { sale_type: 'sell' }] });
					if (activeOrders.length <= 0) return 'None';

					let filteredOrders = activeOrders.filter(order => order.target_id !== infoObject.targetID)
						.filter(order => order.item_type === infoObject.itemType)
						.filter(order => order.item_id === infoObject.itemID);
					if (filteredOrders.length <= 0) return 'None';

					let orderFilled = false, filledExact = false;
					filteredOrders = filteredOrders.filter(order => order.listed_value <= infoObject.value);
					if (filteredOrders.length <= 0) return 'None';

					filteredOrders.sort((lowest, order) => {
						if (lowest.listed_value > order.listed_value) return 1;
						if (lowest.listed_value < order.listed_value) return -1;
						return 0;
					});

					const totalItemCount = filteredOrders.reduce((acc, order) => acc + order.amount_left, 0);
					if (totalItemCount > infoObject.amount) orderFilled = true;
					if (totalItemCount === infoObject.amount) filledExact = true;

					let fillOutcome = '';
					if (filledExact) {
						fillOutcome = await handleExactFillBuy(infoObject, theOrder, filteredOrders, orderMatchObj);
					} else if (orderFilled) {
						fillOutcome = await handleFilledBuy(infoObject, theOrder, filteredOrders, orderMatchObj);
					} else {
						fillOutcome = await handlePartialFillBuy(infoObject, theOrder, filteredOrders, orderMatchObj);
					}
					if (fillOutcome !== '') return fillOutcome;
				}



				async function handleSellReadyCheck(infoObject, theOrder, orderMatchObj) {
					const activeOrders = await LocalMarkets.findAll({ where: [{ guildid: interaction.guild.id }, { sale_type: 'buy' }] });
					if (activeOrders.length <= 0) return 'None';
				}


				/** This function handles all sell and buy order conditions and payouts according to:
				 *	 Prices given
				 *	 Total Items
				 *	 Type of Item
				 *	 Type of Trade Target
				 * 
				 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
				 * @param {any} theOrder DB Instance Object
				 * @param {any[]} filteredOrders DB Instance Object Array
				 * @param {any} orderMatchObj Callback Object to use for display
				 */
				async function handleExactFillBuy(infoObject, theOrder, filteredOrders, orderMatchObj) {
					const totalOrderValue = theOrder.listed_value * theOrder.amount_left;
					const totalExpectedFilled = filteredOrders.length;

					let itemRef = '';
					if (infoObject.itemType === 'Gear') itemRef = grabGearRef(infoObject.itemID);
					if (infoObject.itemType !== 'Gear') itemRef = grabMatRef(infoObject.itemType, infoObject.itemID);
					if (itemRef === '') return 'Failure: 1.1';

					// Payout coins to each order filled
					let totalSpent = 0;
					let ordersHandled = 0;
					for (const order of filteredOrders) {
						// Handle Payout
						totalSpent += await sellAllOrderPayout(order);
						// Handle amount removal
						ordersHandled += await handleOrderRemoval(order);
					}
					console.log(`Total Coins Spent: ${totalSpent}\nTotal Coins in Order: ${totalOrderValue}`);
					console.log(`Total Orders Filled: ${ordersHandled}\nTotal Orders Expected: ${totalExpectedFilled}`);

					let coinRefund = 0;
					if (totalSpent < totalOrderValue) coinRefund = totalOrderValue - totalSpent;
					if (coinRefund > 0) {
						orderMatchObj.coinINC = coinRefund;
						await handleRefund(theOrder, coinRefund);
					} 

					// Payout items to order filled
					const orderComplete = await buyAllOrderPayout(theOrder, itemRef, infoObject);
					if (orderComplete !== 'Complete') return 'Failure: 1.1.1';

					orderMatchObj.itemsMoved = theOrder.amount_left;
					return 'Exact';
				}


				/** This function handles payouts to sell orders until filling the created buy order.
				 * 
				 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
				 * @param {any} theOrder DB Instance Object
				 * @param {any[]} filteredOrders DB Instance Object Array
				 * @param {any} orderMatchObj Callback Object to use for display
				 */
				async function handleFilledBuy(infoObject, theOrder, filteredOrders, orderMatchObj) {
					const totalOrderValue = theOrder.listed_value * theOrder.amount_left;
					const totalOrderItems = theOrder.amount_left;

					let itemRef = '';
					if (infoObject.itemType === 'Gear') itemRef = grabGearRef(infoObject.itemID);
					if (infoObject.itemType !== 'Gear') itemRef = grabMatRef(infoObject.itemType, infoObject.itemID);
					if (itemRef === '') return 'Failure: 1.1';

					// Payout coins to each order filled
					const orderHandler = {
						totalSpent: 0,
						totalRemaining: totalOrderItems,
						totalBought: 0,
						ordersHandled: 0,
					};

					let result = '';
					for (const order of filteredOrders) {
						// Handle Payout
						result = '';
						result = await sellPartialOrderPayout(order, orderHandler);
						if (result === 'Finished') orderHandler.ordersHandled++;
					}
					console.log(`Total Coins Spent: ${orderHandler.totalSpent}\nTotal Coins in Order: ${totalOrderValue}`);
					console.log(`Total Items Bought: ${orderHandler.totalBought}\nTotal Items Remaining: ${orderHandler.totalRemaining}`);


					let coinRefund = 0;
					if (orderHandler.totalSpent < totalOrderValue) coinRefund = totalOrderValue - orderHandler.totalSpent;
					if (coinRefund > 0) {
						orderMatchObj.coinINC = coinRefund;
						await handleRefund(theOrder, coinRefund);
					}

					// Payout items to order filled
					const orderComplete = await buyAllOrderPayout(theOrder, itemRef, infoObject);
					if (orderComplete !== 'Complete') return 'Failure: 1.1.1';


					orderMatchObj.itemsMoved = orderHandler.totalBought;

					return 'Filled';
				}


				/** This function handles payouts to sell orders for all that exist.
				 *
				 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
				 * @param {any} theOrder DB Instance Object
				 * @param {any[]} filteredOrders DB Instance Object Array
				 * @param {any} orderMatchObj Callback Object to use for display
				 */
				async function handlePartialFillBuy(infoObject, theOrder, filteredOrders, orderMatchObj) {
					console.log(infoObject);
					console.log(...filteredOrders);

					const totalOrderValue = theOrder.listed_value * theOrder.amount_left;
					const totalOrderItems = theOrder.amount_left;

					let itemRef = '';
					if (infoObject.itemType === 'Gear') itemRef = grabGearRef(infoObject.itemID);
					if (infoObject.itemType !== 'Gear') itemRef = grabMatRef(infoObject.itemType, infoObject.itemID);
					if (itemRef === '') return 'Failure: 1.1';

					// Payout coins to each order filled
					const orderHandler = {
						totalSpent: 0,
						totalRemaining: totalOrderItems,
						totalBought: 0,
						ordersHandled: 0,
					};

					let result = '';
					for (const order of filteredOrders) {
						// Handle Payout
						result = '';
						result = await sellPartialOrderPayout(order, orderHandler);
						if (result === 'Finished') orderHandler.ordersHandled++;
					}
					console.log(`Total Coins Spent: ${orderHandler.totalSpent}\nTotal Coins in Order: ${totalOrderValue}`);
					console.log(`Total Items Bought: ${orderHandler.totalBought}\nTotal Items Remaining: ${orderHandler.totalRemaining}`);

					let coinRefund = 0;
					if (orderHandler.totalSpent < totalOrderValue) coinRefund = totalOrderValue - orderHandler.totalSpent;
					if (coinRefund > 0) {
						orderMatchObj.coinINC = coinRefund;
						await handleRefund(theOrder, coinRefund);
					}

					// Payout items to order filled
					const orderComplete = await buyPartialOrderPayout(theOrder, itemRef, infoObject, orderHandler);
					if (orderComplete !== 'Complete') return 'Failure: 1.1.1';

					const orderUpdated = await handleOrderUpdate(theOrder, orderHandler.totalBought);
					if (orderUpdated === 1) await theOrder.save();

					orderMatchObj.itemsMoved = orderHandler.totalBought;

					return 'Partial';
				}


				/** This function locates the proper materialList.json and returns the specific material from that list
				* 
				* @param {string} matType "passtype" === file name/path
				* @param {number} matID Mat_id
				*/
				function grabMatRef(matType, matID) {
					let matList;
					for (const [key, value] of materialFiles) {
						if (key === matType) {
							matList = require(value);
							break;
						}
					}

					let matRef = matList.filter(mat => mat.Mat_id === matID);
					matRef = matRef[0];
					return matRef;
				}


				/** This function returns an item ref using the provided loot_id.
				* 
				* @param {number} lootID Loot_id
				*/
				function grabGearRef(lootID) {
					let gearRef = lootList.filter(item => item.Loot_id === lootID);
					gearRef = gearRef[0];
					return gearRef;
				}


				/** This function adds any coins refunded to the order's creator
				 * 
				 * @param {any} theOrder DB Instance Object
				 * @param {number} coinRefund Amount of coins to refund
				 */
				async function handleRefund(theOrder, coinRefund) {
					let target = 'None', type = theOrder.target_type;
					if (type === 'town') target = await Town.findOne({ where: { townid: theOrder.target_id } });
					if (type === 'user') target = await UserData.findOne({ where: { userid: theOrder.target_id } });
					if (target === 'None') return 'Failure: 2.1';

					const inc = await target.increment('coins', { by: coinRefund });
					if (inc) return await target.save();
                }


				/** This function calculates the total value of items being sold,
				 *	 then updates the correct users coins with that value.
				 * 
				 * @param {any} theOrder DB Instance Object
				 */
				async function sellAllOrderPayout(theOrder) {
					let totalValue = theOrder.listed_value * theOrder.amount_left;
					let target = 'None';
					if (theOrder.target_type === 'town') target = await Town.findOne({ where: { townid: theOrder.target_id } });
					if (theOrder.target_type === 'user') target = await UserData.findOne({ where: { userid: theOrder.target_id } });
					if (target === 'None') return 'Failure: 1.2';

					const inc = await target.increment('coins', { by: totalValue });
					if (inc) await target.save();

					return totalValue;
				}


				/** This function handles the function path needed for the given target and item type,
				 *   then awaits the success results to be returned
				 * 
				 * @param {any} theOrder DB Instance Object
				 * @param {any} itemRef Json Item Reference Object
				 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
				 */
				async function buyAllOrderPayout(theOrder, itemRef, infoObject) {
					let target = 'None', type = theOrder.target_type;
					if (type === 'town') target = await Town.findOne({ where: { townid: theOrder.target_id } });
					if (type === 'user') target = await UserData.findOne({ where: { userid: theOrder.target_id } });
					if (target === 'None') return 'Failure: 1.3';

					let itemAdded = '';
					if (theOrder.item_type === 'Gear') itemAdded = await handleGearAdd(target, itemRef, theOrder.amount_left);
					if (theOrder.item_type !== 'Gear') itemAdded = await handleMatAdd(target, itemRef, theOrder.amount_left, type, infoObject.itemType);
					if (itemAdded !== 'Added') return 'Failure: 1.4';

					return 'Complete';
				}


				/** This function handles the function path needed for the given target, item type, and amount,
				 *   then awaits the success results to be returned
				 * 
				 * @param {any} theOrder DB Instance Object
				 * @param {any} itemRef Json Item Reference Object
				 * @param {any} infoObject Object containing variables needed for proccessing, used to keep function params clean
				 */
				async function buyPartialOrderPayout(theOrder, itemRef, infoObject, orderHandler) {
					let target = 'None', type = theOrder.target_type;
					if (type === 'town') target = await Town.findOne({ where: { townid: theOrder.target_id } });
					if (type === 'user') target = await UserData.findOne({ where: { userid: theOrder.target_id } });
					if (target === 'None') return 'Failure: 1.3';

					let itemAdded = '';
					if (theOrder.item_type === 'Gear') itemAdded = await handleGearAdd(target, itemRef, orderHandler.totalBought);
					if (theOrder.item_type !== 'Gear') itemAdded = await handleMatAdd(target, itemRef, orderHandler.totalBought, type, infoObject.itemType);
					if (itemAdded !== 'Added') return 'Failure: 1.4';

					return 'Complete';
				}


				/** This function is handled through the checkOwned() script for consistant item creation
				 * 
				 * @param {any} target DB Instance Object: User
				 * @param {any} itemRef Json Item Reference Object
				 * @param {number} amount Amount needed
				 */
				async function handleGearAdd(target, itemRef, amount) {
					const addResult = await checkOwned(target, itemRef, amount);
					if (addResult !== 'Finished') return 'Failure';
					return 'Added';
                }


				/** This function handles Updating/Creating a material entry in the appropeate DB
				 * 
				 * @param {any} target DB Instance Object: User || Town
				 * @param {any} itemRef Json Item Reference Object
				 * @param {number} amount Amount needed
				 * @param {string} type 'town' || 'user' 
				 * @param {string} matType mattype Reference 
				 */
				async function handleMatAdd(target, itemRef, amount, type, matType) {
					let matStore;
					if (type === 'town') {
						matStore = await TownMaterial.findOne({
							where: [{ townid: target.townid }, { mat_id: itemRef.Mat_id }, { mattype: matType }]
						});
					}
					if (type === 'user') {
						matStore = await MaterialStore.findOne({
							where: [{ spec_id: target.userid }, { mat_id: itemRef.Mat_id }, { mattype: matType }]
						});
					}

					if (matStore) {
						const inc = await matStore.increment('amount', { by: amount });
						if (inc) await matStore.save();
						return 'Added';
					}

					let newMat;
					try {
						if (type === 'town') newMat = await TownMaterial.create({ townid: target.townid, amount: amount });
						if (type === 'user') newMat = await MaterialStore.create({ spec_id: target.userid, amount: amount });

						if (newMat) {
							await newMat.update({
								name: itemRef.Name,
								value: itemRef.Value,
								mattype: matType,
								mat_id: itemRef.Mat_id,
								rarity: itemRef.Rarity,
								rar_id: itemRef.Rar_id,
							});

							await newMat.save();
							return 'Added';
						}
					} catch (error) {
						console.error(error);
					}
				}


				/** This function removes Completed Orders
				 * 
				 * @param {any} theOrder DB Instance Object
				 */
				async function handleOrderRemoval(theOrder) {
					const destroyed = await theOrder.destroy();
					if (destroyed) return 1;
					return 0;
                }


				/** This function handles decreasing remaining items while increasing items moved from appropreate orders.
				 * 
				 * @param {any} theOrder DB Instance Object
				 * @param {number} amountRemoved Amount to change by
				 */
				async function handleOrderUpdate(theOrder, amountRemoved) {
					const dec = await theOrder.decrement('amount_left', { by: amountRemoved });
					const inc = await theOrder.increment('amount_moved', { by: amountRemoved });
					if (inc && dec) {
						await theOrder.save();
						return 1;
					} else return 0;
                }


				/** This function handles order updates according to remaining items being bought.
				 * 
				 * @param {any} theOrder DB Instance Object
				 * @param {any} orderHandler Object used as callback 
				 */
				async function sellPartialOrderPayout(theOrder, orderHandler) {
					const itemsToMove = orderHandler.totalRemaining;
					const itemsInOrder = theOrder.amount_left;

					let itemDiff = itemsInOrder - itemsToMove, destOrder = false;
					console.log('itemDiff Before: ', itemDiff);

					if (itemDiff <= 0) {
						itemDiff = itemsInOrder, destOrder = true;
					} else if (itemDiff > 0) itemDiff = itemsToMove;
					console.log('itemDiff After: ', itemDiff);

					let totalValue = theOrder.listed_value * itemDiff;
					console.log('Total Value: ', totalValue);
					let target = 'None';
					if (theOrder.target_type === 'town') target = await Town.findOne({ where: { townid: theOrder.target_id } });
					if (theOrder.target_type === 'user') target = await UserData.findOne({ where: { userid: theOrder.target_id } });
					if (target === 'None') return 'Failure: 1.2';

					const inc = await target.increment('coins', { by: totalValue });
					if (inc) await target.save();

					let orderDone;
					if (destOrder) {
						orderDone = await handleOrderRemoval(theOrder);
					} else orderDone = await handleOrderUpdate(theOrder, itemDiff);

					orderHandler.totalSpent += totalValue;
					orderHandler.totalRemaining -= itemDiff;
					orderHandler.totalBought += itemDiff;

					if (orderDone === 1) return 'Finished';
					return 'Failure: 1.3';
				}

			}).catch(error => {
				console.error(errorForm('Interaction error @ Trade local:', error));
			});
		}

		if (interaction.options.getSubcommand() === 'global') {
			if (interaction.user.id !== '501177494137995264') return interaction.reply('This command is under construction, please check back later!');
			const startTime = new Date().getTime();
			await interaction.deferReply().then(async () => {

				const endTime = new Date().getTime();
				console.log(`Diff between start: ${startTime}/${endTime} :End..\n   ${(startTime - endTime)}`);
			}).catch(error => {
				console.error(errorForm('Interaction error @ Trade global:', error));
			});
		}

	},
};
