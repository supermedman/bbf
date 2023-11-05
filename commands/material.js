const { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { MaterialStore } = require('../dbObjects');

const {
	warnedForm,
	errorForm,
	successResult,
	failureResult,
	basicInfoForm,
	specialInfoForm
} = require('../chalkPresets.js');
const { grabColour } = require('./exported/grabRar');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('material')
		.setDescription('Material options!')
		.addSubcommand(subcommand =>
			subcommand
				.setName('combine')
				.setDescription('Combine to upgrade material type and rarity!')
				.addStringOption(option =>
					option.setName('type')
						.setDescription('Material type to combine')
						.setAutocomplete(true)
						.setRequired(true))
				.addStringOption(option =>
					option.setName('rarity')
						.setDescription('Material rarity to combine')
						.setAutocomplete(true)
						.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('dismantle')
				.setDescription('Dismantle into lower tier materials by type and rarity!')
				.addStringOption(option =>
					option.setName('type')
						.setDescription('Material type to dismantle')
						.setAutocomplete(true)
						.setRequired(true))
				.addStringOption(option =>
					option.setName('rarity')
						.setDescription('Material rarity to dismantle')
						.setAutocomplete(true)
						.setRequired(true))
				.addIntegerOption(option =>
					option.setName('amount')
						.setDescription('The amount to dismantle')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('view')
				.setDescription('View all of a material type or one material type and rarity!')
				.addStringOption(option =>
					option.setName('typeview')
						.setDescription('Material type to view')
						.setAutocomplete(true)
						.setRequired(true))
				.addBooleanOption(option =>
					option.setName('all')
						.setDescription('Whether or not to show all of this type')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('rarity')
						.setDescription('Material rarity to view')
						.setAutocomplete(true))),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);

		let choices = [];

		if (focusedOption.name === 'type') {
			const focusedValue = interaction.options.getFocused(false);

			choices = ["slimy", "rocky", "woody", "skinny", "herby", "gemy", "magical", "metalic", "fleshy"];

			if (focusedValue) {
				console.log(choices);
				console.log(focusedValue);

				//Mapping the complete list of options for discord to handle and present to the user
				const filtered = choices.filter(choice => choice.startsWith(focusedValue));
				await interaction.respond(
					filtered.map(choice => ({ name: choice, value: choice })),
				);
			}	
		}

		if (focusedOption.name === 'typeview') {
			const focusedValue = interaction.options.getFocused(false);

			choices = ["slimy", "rocky", "woody", "skinny", "herby", "gemy", "magical", "metalic", "fleshy", "unique"];

			if (focusedValue) {
				console.log(choices);
				console.log(focusedValue);

				//Mapping the complete list of options for discord to handle and present to the user
				const filtered = choices.filter(choice => choice.startsWith(focusedValue));
				await interaction.respond(
					filtered.map(choice => ({ name: choice, value: choice })),
				);
			}
		}

		if (focusedOption.name === 'rarity') {
			const focusedValue = interaction.options.getFocused(false);

			choices = ["common", "uncommon", "rare", "very rare", "epic", "mystic", "?", "??", "???", "????"];

			if (focusedValue) {
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

		if (interaction.options.getSubcommand() === 'combine') {
			const matType = interaction.options.getString('type');
			const rarType = interaction.options.getString('rarity');

			var chosenRarID;
			if (rarType === 'common') {
				chosenRarID = 0;
			} else if (rarType === 'uncommon') {
				chosenRarID = 1;
			} else if (rarType === 'rare') {
				chosenRarID = 2;
			} else if (rarType === 'very rare') {
				chosenRarID = 3;
			} else if (rarType === 'epic') {
				chosenRarID = 4;
			} else if (rarType === 'mystic') {
				chosenRarID = 5;
			} else if (rarType === '?') {
				chosenRarID = 6;
			} else if (rarType === '??') {
				chosenRarID = 7;
			} else if (rarType === '???') {
				chosenRarID = 8;
			} else if (rarType === '????') {
				chosenRarID = 9;
			} else {
				return interaction.followUp('That was not a valid option!');
            }

			const fullMatMatchList = await MaterialStore.findAll({ where: [{ spec_id: interaction.user.id }, { rar_id: chosenRarID }, { mattype: matType }] });

			if (fullMatMatchList.length <= 0) return interaction.followUp('You have no materials of that type or rarity!');

			const totalMaterials = await fullMatMatchList.reduce((totalAmount, item) => totalAmount + item.amount, 0);
			console.log(basicInfoForm('totalMaterials: ', totalMaterials));

			const totalNewMaterials = Math.floor((totalMaterials / 5));
			console.log(basicInfoForm('totalNewMaterials: ', totalNewMaterials));

			const totalRemainingMats = (totalMaterials % 5);
			console.log(basicInfoForm('totalRemainingMats: ', totalRemainingMats));

			const acceptButton = new ButtonBuilder()
				.setLabel("Yes")
				.setStyle(ButtonStyle.Success)
				.setEmoji('✅')
				.setCustomId('accept');

			const cancelButton = new ButtonBuilder()
				.setLabel("No")
				.setStyle(ButtonStyle.Danger)
				.setEmoji('❌')
				.setCustomId('cancel');

			const interactiveButtons = new ActionRowBuilder().addComponents(acceptButton, cancelButton);

			const list = `Total materials to be combined ${totalMaterials}, Total new materials ${totalNewMaterials}, Total remaining materials ${totalRemainingMats}`;


			const confirmEmbed = new EmbedBuilder()
				.setColor('Blurple')
				.setTitle('Confirm Combine')
				.addFields(
					{
						name: `Would you really like to combine ALL: ${rarType} ${matType} owned?`,
						value: list,

					});

			const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [confirmEmbed] });

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				ComponentType: ComponentType.Button,
				filter,
				time: 120000,
			});

			collector.on('collect', async (collInteract) => {
				if (collInteract.customId === 'accept') {
					await collInteract.deferUpdate();
					await handleMaterials(totalNewMaterials, totalRemainingMats, matType, chosenRarID);
					await collector.stop();
				}

				if (collInteract.customId === 'cancel') {
					await collInteract.deferUpdate();
					await collector.stop();
				}
			});

			collector.on('end', () => {
				if (embedMsg) {
					embedMsg.delete();
                }
			});
        }

		if (interaction.options.getSubcommand() === 'view') {
			const matType = interaction.options.getString('typeview');
			const showAll = interaction.options.getBoolean('all');
			const rarType = interaction.options.getString('rarity');

			if (showAll === true) {
				var fullMatMatchList;
				if (matType !== 'unique') {
					fullMatMatchList = await MaterialStore.findAll({ where: [{ spec_id: interaction.user.id }, { mattype: matType }] });
					console.log(specialInfoForm(`fullMatMatchList NOT UNIQUE: ${fullMatMatchList}`));

					if (fullMatMatchList.length <= 0) return interaction.followUp('You have no materials of that type!');
				} else {
					fullMatMatchList = await MaterialStore.findAll({ where: [{ spec_id: interaction.user.id }, { rarity: 'Unique' }] });
					console.log(specialInfoForm(`fullMatMatchList IS UNIQUE: ${fullMatMatchList}`));

					if (fullMatMatchList.length <= 0) return interaction.followUp('You have no materials of that type!');
                }
				
				var embedPages = [];

				let matSlice;
				let embedColour = 0000;
				let list = ``;

				let curRun = 0;
				do {
					matSlice = fullMatMatchList[curRun];
					embedColour = await grabColour(matSlice.rar_id);

					list = `Category: ${matSlice.mattype} \nRarity: ${matSlice.rarity} \nValue: ${matSlice.value} \nAmount: ${matSlice.amount}`

					if (matSlice) {
						const displayEmbed = new EmbedBuilder()
							.setTitle('~MATERIAL~')
							.setColor(embedColour)
							.addFields({
								name: `${matSlice.name}`, value: list,
							});
						embedPages.push(displayEmbed);
                    }
					curRun++;
				} while (curRun < fullMatMatchList.length)

				const backButton = new ButtonBuilder()
					.setLabel("Back")
					.setStyle(ButtonStyle.Secondary)
					.setEmoji('◀️')
					.setCustomId('back-page');

				const cancelButton = new ButtonBuilder()
					.setLabel("Cancel")
					.setStyle(ButtonStyle.Secondary)
					.setEmoji('*️⃣')
					.setCustomId('delete-page');

				const forwardButton = new ButtonBuilder()
					.setLabel("Forward")
					.setStyle(ButtonStyle.Secondary)
					.setEmoji('▶️')
					.setCustomId('next-page');

				const interactiveButtons = new ActionRowBuilder().addComponents(backButton, cancelButton, forwardButton);

				const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [embedPages[0]] });

				const filter = (ID) => ID.user.id === interaction.user.id;

				const collector = embedMsg.createMessageComponentCollector({
					componentType: ComponentType.Button,
					filter,
					time: 300000,
				});

				var currentPage = 0;

				collector.on('collect', async (collInteract) => {
					if (collInteract.customId === 'next-page') {
						await collInteract.deferUpdate();
						if (currentPage === embedPages.length - 1) {
							currentPage = 0;
							await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
						} else {
							currentPage += 1;
							await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
						}
					}

					if (collInteract.customId === 'back-page') {
						await collInteract.deferUpdate();
						if (currentPage === 0) {
							currentPage = embedPages.length - 1;
							await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
						} else {
							currentPage -= 1;
							await embedMsg.edit({ embeds: [embedPages[currentPage]], components: [interactiveButtons] });
						}
					}

					if (collInteract.customId === 'delete-page') {
						await collInteract.deferUpdate();
						await collector.stop();
					}
				});

				collector.on('end', () => {
					if (embedMsg) {
						embedMsg.delete();
					}
				});

			} else if (showAll === false) {
				if (!rarType) return interaction.followUp('Please select a rarity to display!');
				var chosenRarID;
				if (matType === 'unique') {
					return await interaction.channel.send('You cannot view one of unique material type, please use this command where <all> is <true> and leave the <rarity> option blank!');
				} else {
					if (rarType === 'common') {
						chosenRarID = 0;
					} else if (rarType === 'uncommon') {
						chosenRarID = 1;
					} else if (rarType === 'rare') {
						chosenRarID = 2;
					} else if (rarType === 'very rare') {
						chosenRarID = 3;
					} else if (rarType === 'epic') {
						chosenRarID = 4;
					} else if (rarType === 'mystic') {
						chosenRarID = 5;
					} else if (rarType === '?') {
						chosenRarID = 6;
					} else if (rarType === '??') {
						chosenRarID = 7;
					} else if (rarType === '???') {
						chosenRarID = 8;
					} else if (rarType === '????') {
						chosenRarID = 9;
					} else {
						return interaction.followUp('That was not a valid option!');
					}
                }
				const fullMatMatchList = await MaterialStore.findAll({ where: [{ spec_id: interaction.user.id }, { rar_id: chosenRarID }, { mattype: matType }] });

				if (fullMatMatchList.length <= 0) return interaction.followUp('You have no materials of that type or rarity!');

				const theMaterial = fullMatMatchList[0];

				const embedColour = await grabColour(chosenRarID);

				const list = `Category: ${theMaterial.mattype} \nRarity: ${theMaterial.rarity} \nValue: ${theMaterial.value} \nAmount: ${theMaterial.amount}`;

				const displayEmbed = new EmbedBuilder()
					.setTitle('~MATERIAL~')
					.setColor(embedColour)
					.addFields({
						name: `${theMaterial.name}`, value: list,
					});

				await interaction.followUp({ embeds: [displayEmbed] }).then(async embedMsg => setTimeout(() => {
					embedMsg.delete();
				}, 60000)).catch(console.error(errorForm('An error has occured while deleting message')));
            }
		}

		if (interaction.options.getSubcommand() === 'dismantle') {
			const matType = interaction.options.getString('type');
			const rarType = interaction.options.getString('rarity');

			var chosenRarID;
			if (rarType === 'common') {
				chosenRarID = 0;
			} else if (rarType === 'uncommon') {
				chosenRarID = 1;
			} else if (rarType === 'rare') {
				chosenRarID = 2;
			} else if (rarType === 'very rare') {
				chosenRarID = 3;
			} else if (rarType === 'epic') {
				chosenRarID = 4;
			} else if (rarType === 'mystic') {
				chosenRarID = 5;
			} else if (rarType === '?') {
				chosenRarID = 6;
			} else if (rarType === '??') {
				chosenRarID = 7;
			} else if (rarType === '???') {
				chosenRarID = 8;
			} else if (rarType === '????') {
				chosenRarID = 9;
			} else {
				return interaction.followUp('That was not a valid option!');
			}

			const fullMatMatchList = await MaterialStore.findAll({ where: [{ spec_id: interaction.user.id }, { rar_id: chosenRarID }, { mattype: matType }] });

			if (fullMatMatchList.length <= 0) return interaction.followUp('You have no materials of that type or rarity!');
			const theAmount = interaction.options.getInteger('amount');
			let totalMaterials;
			let totalNewMaterials;
			let theRemainder;
			if (!theAmount) {
				totalMaterials = await fullMatMatchList.reduce((totalAmount, item) => totalAmount + item.amount, 0);
				console.log(basicInfoForm('totalMaterials: ', totalMaterials));

				totalNewMaterials = Math.floor((totalMaterials * 5));
				console.log(basicInfoForm('totalNewMaterials: ', totalNewMaterials));
			} else {
				totalMaterials = await fullMatMatchList.reduce((totalAmount, item) => totalAmount + item.amount, 0);
				console.log(basicInfoForm('totalMaterials: ', totalMaterials));
				if (totalMaterials < theAmount) {
					return interaction.followUp('You do not have that many materials of that type or rarity!');
				} else if (totalMaterials === theAmount) {
					totalNewMaterials = Math.floor((totalMaterials * 5));
					console.log(basicInfoForm('totalNewMaterials: ', totalNewMaterials));
				} else {
					theRemainder = totalMaterials - theAmount;
					totalMaterials = theAmount;
					totalNewMaterials = Math.floor((totalMaterials * 5));
					console.log(basicInfoForm('totalNewMaterials: ', totalNewMaterials));
                }
            }
			

			const acceptButton = new ButtonBuilder()
				.setLabel("Yes")
				.setStyle(ButtonStyle.Success)
				.setEmoji('✅')
				.setCustomId('accept');

			const cancelButton = new ButtonBuilder()
				.setLabel("No")
				.setStyle(ButtonStyle.Danger)
				.setEmoji('❌')
				.setCustomId('cancel');

			const interactiveButtons = new ActionRowBuilder().addComponents(acceptButton, cancelButton);

			const list = `Total materials to be dismantled ${totalMaterials}, Total new materials ${totalNewMaterials}`;


			const confirmEmbed = new EmbedBuilder()
				.setColor('Blurple')
				.setTitle('Confirm Dismantle')
				.addFields(
					{
						name: `Would you really like to dismantle ${totalMaterials}: ${rarType} ${matType} owned?`,
						value: list,

					});

			const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [confirmEmbed] });

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				ComponentType: ComponentType.Button,
				filter,
				time: 120000,
			});

			collector.on('collect', async (collInteract) => {
				if (collInteract.customId === 'accept') {
					await collInteract.deferUpdate();
					await handleDismantleMaterials(totalNewMaterials, matType, chosenRarID, theRemainder);
					await collector.stop();
				}

				if (collInteract.customId === 'cancel') {
					await collInteract.deferUpdate();
					await collector.stop();
				}
			});

			collector.on('end', () => {
				if (embedMsg) {
					embedMsg.delete();
				}
			});
		}

		async function handleDismantleMaterials(newMatAmount, matType, chosenRarID, theRemainder) {
			let remainingMatAmount = 0;
			if (theRemainder) {
				remainingMatAmount = theRemainder;
            }
			var passType;
			let listStr;
			listStr = `${matType}List.json`;
			passType = `${matType}`;

			const foundMaterialList = require(`../events/Models/json_prefabs/materialLists/${listStr}`);
			if (!foundMaterialList) {
				console.log(errorForm('MaterialList NOT FOUND!'));
				return 0;
			}

			var foundRar = (chosenRarID - 1);

			let matDropPool = [];
			for (var x = 0; x < foundMaterialList.length; x++) {
				if (foundMaterialList[x].Rar_id === foundRar) {
					//Rarity match add to list
					matDropPool.push(foundMaterialList[x]);
				} else {/**KEEP LOOKING*/ }
			}

			if (matDropPool.length > 0) {
				console.log(successResult(`matDropPool Contents: ${matDropPool}`));

				const finalMaterial = matDropPool[0];
				console.log(successResult(`Material Dropped: ${finalMaterial.Name}`));

				let droppedNum = newMatAmount;

				const result = await handleMaterialAdding(finalMaterial, droppedNum, interaction.user.id, passType);
				await interaction.followUp(`${droppedNum} ${finalMaterial.Name} Dropped!`);
				if (result) {
					if (remainingMatAmount === 0) {
						const matDestroyed = await MaterialStore.destroy({ where: [{ spec_id: interaction.user.id }, { rar_id: chosenRarID }, { mattype: passType }] });
						if (matDestroyed > 0) {
							//Material updated successfully
							console.log(successResult('Material dismantled and destroyed!'));
						}
					} else {
						const matUpdated = await MaterialStore.update({ amount: remainingMatAmount }, { where: [{ spec_id: interaction.user.id }, { rar_id: chosenRarID }, { mattype: passType }] });
						if (matUpdated > 0) {
							//Material updated successfully
							console.log(successResult('Material dismantled!'));
						}
					}
				}
			} else return interaction.followUp('That item cannot be dismantled further!');
        }

		async function handleMaterials(newMatAmount, remainingMatAmount, matType, chosenRarID) {

			var passType;
			let listStr;
			listStr = `${matType}List.json`;
			passType = `${matType}`;

			const foundMaterialList = require(`../events/Models/json_prefabs/materialLists/${listStr}`);
			if (!foundMaterialList) {
				console.log(errorForm('MaterialList NOT FOUND!'));
				return 0;
			}

			var foundRar = (chosenRarID + 1);

			let matDropPool = [];
			for (var x = 0; x < foundMaterialList.length; x++) {
				if (foundMaterialList[x].Rar_id === foundRar) {
					//Rarity match add to list
					matDropPool.push(foundMaterialList[x]);
				} else {/**KEEP LOOKING*/ }
			}

			if (matDropPool.length > 0) {
				console.log(successResult(`matDropPool Contents: ${matDropPool}`));

				const finalMaterial = matDropPool[0];
				console.log(successResult(`Material Dropped: ${finalMaterial.Name}`));

				let droppedNum = newMatAmount;

				const result = await handleMaterialAdding(finalMaterial, droppedNum, interaction.user.id, passType);
				await interaction.followUp(`${droppedNum} ${finalMaterial.Name} Dropped!`);
				if (result) {
					if (remainingMatAmount === 0) {
						const matDestroyed = await MaterialStore.destroy({ where: [{ spec_id: interaction.user.id }, { rar_id: chosenRarID }, { mattype: passType }] });
						if (matDestroyed > 0) {
							//Material updated successfully
						}
					} else {
						const matUpdated = await MaterialStore.update({ amount: remainingMatAmount }, { where: [{ spec_id: interaction.user.id }, { rar_id: chosenRarID }, { mattype: passType }] });
						if (matUpdated > 0) {
							//Material updated successfully
						}
					}
				}
			} else return interaction.followUp('That item cannot be combined further!');
		}

		//This method creates a new material entry || increments an existing one
		async function handleMaterialAdding(material, droppedAmount, userID, matType) {
			const matStore = await MaterialStore.findOne({
				where: [{ spec_id: userID }, { mat_id: material.Mat_id }, { mattype: matType }]
			});

			console.log(basicInfoForm('UserMaterial: ', matStore));

			if (matStore) {
				droppedAmount += matStore.amount;
				const inc = await MaterialStore.update({ amount: droppedAmount },
					{ where: [{ spec_id: userID }, { mat_id: material.Mat_id }, { mattype: matType }] });

				if (inc) console.log(successResult('AMOUNT WAS UPDATED!', droppedAmount));

				return matStore;
			}

			const newMat = await MaterialStore.create({
				name: material.Name,
				value: material.Value,
				mattype: matType,
				mat_id: material.Mat_id,
				rarity: material.Rarity,
				rar_id: material.Rar_id,
				amount: droppedAmount,
				spec_id: userID
			});

			if (newMat) {
				const materialEntry = await MaterialStore.findOne({
					where: [{ spec_id: userID }, { mat_id: material.Mat_id }, { mattype: matType }]
				});

				console.log(successResult(`Material Entry: ${materialEntry}`));

				return materialEntry;
			}
		}
	},
};
