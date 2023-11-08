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
						.setDescription('The desired new Material rarity')
						.setAutocomplete(true)
						.setRequired(true))
				.addIntegerOption(option =>
					option.setName('amount')
						.setDescription('The amount of new material wanted')))
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
			//if (interaction.user.id !== '501177494137995264') return interaction.followUp('This command is under construction! Sorry!');
			//Material type
			const matType = interaction.options.getString('type');
			//Desired rarity after combine
			const rarType = interaction.options.getString('rarity');
			//Amount of material at desired rarity 
			let inputAmount = interaction.options.getInteger('amount');
			if (!inputAmount) inputAmount = 1; //Default to 1 if none 

			//Convert rarity to int
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
			//ChosenRarID is the wanted material 
			//Check and combine all materials below to calculate the amount recieved if any at all

			//Full list of all owned materials of the given type
			const fullMatTypeList = await MaterialStore.findAll({ where: [{ spec_id: interaction.user.id }, { mattype: matType }] });
			if (fullMatTypeList.length <= 0) return interaction.followUp('You have no materials of that type!');

			//Filtered list of all owned below the desired rarity
			const filterLower = fullMatTypeList.filter(mat => mat.rar_id < chosenRarID);
			if (filterLower.length <= 0) return interaction.followUp('You have no lower rarity materials of that type to combine!');

			//Check if the requested material @ rarity exists in the prefab list
			let listStr;
			listStr = `${matType}List.json`;

			const foundMaterialList = require(`../events/Models/json_prefabs/materialLists/${listStr}`);
			const matRarIsReal = foundMaterialList.filter(mat => mat.Rar_id === chosenRarID);
			if (matRarIsReal.length <= 0) return interaction.followUp(`${matType} cannot be combined to ${rarType}!`);

			/**
			 *		We have:
			 *		- reference to prefab list
			 *		- Users materials
			 *		- Requested material type, rarity, amount
			 *		
			 *		We need:
			 *		- To create a checked list of materials for later reference
			 *		- To check if one rarity lower exists
			 *		- &&
			 *		- To check if the requested rarity amount can be made from one rarity lower
			 *		- IF NOT:
			 *			- Add chosenRarID - 1 material to checked list
			 *			- Check how many are missing
			 *			- Multiply that amount by 5
			 *			- Then check next lowest material rarity --
			 *			- IF NONE:
			 *				- Add Material to checked list
			 *				- Multiply missing amount by 5 again
			 *				- Then check next lowest material rarity --
			 *			- IF SOME:
			 *				- Compare Difference by adding total amount of material to amount missing 
			 *				- IF +1 OR 0:
			 *					- Difference has been made up
			 *					- Subtract missing amount from total amount
			 *					- IF REMAINING:
			 *						- Add to remaining list
			 *						- BREAK;
			 *					- IF NONE:
			 *						- Add to destroyed list
			 *						- BREAK:
			 *				- IF -1:
			 *					- Add Material to checked list
			 *					- Difference remains
			 *					- Add total amount to missing amount
			 *					- Multiply by 5
			 *					- Check next lowest rarity --
			 *			- IF CURRENT RARITY BEING CHECKED IS 0:
			 *				- Compare Difference by adding total amount of material to amount missing 
			 *				- IF +1 OR 0:
			 *					- Difference has been made up
			 *					- Subtract missing amount from total amount
			 *					- IF REMAINING:
			 *						- Add to remaining list
			 *						- BREAK;
			 *					- IF NONE:
			 *						- Add to destroyed list
			 *						- BREAK:
			 *				- IF -1:
			 *					- COMBINE FAILED
			 *					- Add total amount to missing amount
			 *					- Multiply missing by -1
			 *					- neededRarMats = this
			 *					- Announce remaining materials needed to combine
			 *					- BREAK;
			 *		- IF CAN:
			 *			- Find total material amount for one rarity lower
			 *			- Multiply requested amount by 5
			 *			- Subtract that from total material amount
			 *			- IF REMAINING:
			 *				- Add to remaining list
			 *			- IF NONE:
			 *				- Add to destroyed list
			 * */

			let wasCheckedList = [];
			let checkListPOS = 0;

			let remainingMatsList = [];
			let destroyMatsList = [];
			let addedRarMats = 0;

			const firstBackCheck = filterLower.filter(mat => mat.rar_id === (chosenRarID - 1));

			let fbcMatStaticSlice;
			let fbcTempMatCopy = [];

			let materialDifferenceStaticValue = 0;
			//This checks if user has material entry for one rarity lower than requested!
			if (firstBackCheck.length > 0) {
				console.log(successResult('firstBackCheck is FULL!'));

				fbcMatStaticSlice = foundMaterialList.filter(mat => mat.Rar_id === (chosenRarID - 1));
				console.log(specialInfoForm('fbcMatStaticSlice.Name: ', fbcMatStaticSlice[0].Name));
				fbcTempMatCopy.push(fbcMatStaticSlice[0]);

				var fbcTotalMats = firstBackCheck.reduce((totalAmount, mat) => totalAmount + mat.amount, 0);

				const totRemainRarMat = (fbcTotalMats - (5 * inputAmount)); //Remaing old rarity materials
				if (totRemainRarMat > 0) {
					//Prepare remaining entry
					const mappedMat = await fbcTempMatCopy.map(mat => ({ ...mat, NewAmount: totRemainRarMat }),);

					fbcTempMatCopy = [];

					console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
					console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

					wasCheckedList.push(...mappedMat);
					checkListPOS++;
					addedRarMats = inputAmount;
				} else if (totRemainRarMat === 0) {
					//Prepare destroy entry
					const mappedMat = await fbcTempMatCopy.map(mat => ({ ...mat, NewAmount: 0 }),);

					fbcTempMatCopy = [];

					console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
					console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

					wasCheckedList.push(...mappedMat);
					checkListPOS++;
					addedRarMats = inputAmount;
				} else if (totRemainRarMat < 0) {
					const fbcMappedVal = fbcTempMatCopy.map(mat => ({ ...mat, NewAmount: fbcTotalMats}),);
					//destroyMatsList.push(...fbcMappedVal);
					wasCheckedList.push(...fbcMappedVal);
					checkListPOS++;
					materialDifferenceStaticValue = totRemainRarMat; //This is the amount needed to complete combine
					console.log(specialInfoForm('materialDifferenceStaticValue WITH FOUND MATERIALS: ', materialDifferenceStaticValue));
				}
			} else {
				console.log(failureResult('firstBackCheck is EMPTY!'));

				fbcMatStaticSlice = foundMaterialList.filter(mat => mat.Rar_id === (chosenRarID - 1));
				const mappedMat = await fbcMatStaticSlice.map(mat => ({ ...mat, NewAmount: 0 }),);
				wasCheckedList.push(...mappedMat);
				checkListPOS++;

				materialDifferenceStaticValue = ((-1) * (5 * inputAmount)); //This is the amount needed to complete combine
				console.log(specialInfoForm('materialDifferenceStaticValue WITH NO MATERIALS: ', materialDifferenceStaticValue));
			}

			console.log(basicInfoForm(''));
			console.log(specialInfoForm(''));
			console.log(warnedForm(''));
			console.log(errorForm(''));
			console.log(successResult(''));
			console.log(failureResult(''));

			let highestPossibleCombine = {};
			
			//DIFFERENCE REMAINING CHECK
			if (materialDifferenceStaticValue < 0) {
				//DIFFERENCE REMAINS
				console.log(failureResult('INITIAL DIFF CHECK IS NEGATIVE'));

				let isOwnedCheck;
				let matPrefabSlice;

				let tmpCopy = [];

				let compDiffCheck = materialDifferenceStaticValue;
				let curRun = chosenRarID - 2;
				let maxRun = -1;
				do {
					if (curRun === 0) {
						console.log(warnedForm('CURRENTLY CHECKING COMMON RARITY!'));
						isOwnedCheck = filterLower.filter(mat => mat.rar_id === curRun);

						if (isOwnedCheck.length <= 0) {
							console.log(errorForm('NO COMMON MATERIALS, COMBINE FAILED!'));
							matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
							const mappedMat = await matPrefabSlice.map(mat => ({ ...mat, NewAmount: 0 }),);
							wasCheckedList.unshift(...mappedMat);
							//checkListPOS++;
							addedRarMats = 0; //THIS IS TEMPORARY!
							break;
						} else {
							console.log(successResult(`COMMON MATERIAL FOUND!`));

							const totalStaticMats = isOwnedCheck[0].amount;
							console.log(basicInfoForm(`Total material amount: ${totalStaticMats}`));

							const checkingDiff = compDiffCheck + totalStaticMats;
							if (checkingDiff >= 0) {
								console.log(successResult(`DIFFERENCE MADE UP!`));
								const remainingMats = totalStaticMats - checkingDiff;
								//const totalMatsSpent = totalStaticMats - remainingMats;
								if (remainingMats > 0) {
									//Prepare remaining entry
									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
									tmpCopy.push(matPrefabSlice[0]);

									const mappedMat = await tmpCopy.map(mat => ({ ...mat, NewAmount: remainingMats }),);

									tmpCopy = [];

									console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
									console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

									//wasCheckedList.push(...mappedMat);
									remainingMatsList.push(...mappedMat);
									addedRarMats = inputAmount;
									break;
								} else if (remainingMats === 0) {
									//Prepare destroy entry
									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
									tmpCopy.push(matPrefabSlice[0]);

									const mappedMat = await tmpCopy.map(mat => ({ ...mat, NewAmount: 0 }),);

									tmpCopy = [];

									console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
									console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

									//wasCheckedList.push(...mappedMat);
									destroyMatsList.push(...mappedMat);
									addedRarMats = inputAmount;
									break;
								}
							} else {
								console.log(failureResult('DIFFERENCE STILL REMAINS: ', checkingDiff));
								if (totalStaticMats > 5) {
									const totalNewIFCombine = Math.floor(totalStaticMats / 5);
									const remainderIFStillCombine = totalStaticMats - (totalNewIFCombine * 5);

									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
									tmpCopy.push(matPrefabSlice[0]);

									const oneHigherMatPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === (curRun + 1));
									let oneHigherTmpCopy = [];
									oneHigherTmpCopy.push(oneHigherMatPrefabSlice[0]);

									if (!highestPossibleCombine.CurrentAmount) {
										//if ()
										console.log(specialInfoForm('ATTEMPTING TO CREATE NEW HIGHEST COMBINE ENTRY!'));
										highestPossibleCombine = {
											Name: oneHigherTmpCopy[0].Name,
											Value: oneHigherTmpCopy[0].Value,
											MatType: oneHigherTmpCopy[0].MatType,
											Mat_id: oneHigherTmpCopy[0].Mat_id,
											Rarity: oneHigherTmpCopy[0].Rarity,
											Rar_id: oneHigherTmpCopy[0].Rar_id,
											CurrentAmount: totalNewIFCombine,
										};
										console.log(specialInfoForm('Highest combine after entry creation: ', highestPossibleCombine));
									} else {
										console.log(specialInfoForm('ATTEMPTING TO ADD TO HIGHEST COMBINE ENTRY!'));
										const staticMatCostForHIFC = Math.floor((5 ** (highestPossibleCombine.Rar_id - curRun)));

										let totalHighestNewIFCombine;
										if (totalStaticMats > staticMatCostForHIFC) {
											totalHighestNewIFCombine = Math.floor(totalStaticMats / staticMatCostForHIFC);
										} else {
											totalHighestNewIFCombine = 0;
										}

										if (totalHighestNewIFCombine > 0) {
											const newTotal = totalHighestNewIFCombine + highestPossibleCombine.CurrentAmount;
											highestPossibleCombine.CurrentAmount = newTotal;
										}
										console.log(specialInfoForm(`highestCombine: ${highestPossibleCombine.CurrentAmount}`));
									}

									const mappedMat = tmpCopy.map(mat => ({ ...mat, NewAmount: remainderIFStillCombine }),);

									tmpCopy = [];

									//if (remainderIFStillCombine > 0) {
									//	remainingMatsList.push(...mappedMat);
									//} else if (remainderIFStillCombine === 0) {
									//	destroyMatsList.push(...mappedMat);
         //                           }
									
									if (totalNewIFCombine > 0) {
										const checkEditOneUp = wasCheckedList[0];
										checkEditOneUp.NewAmount += totalNewIFCombine;
									}

									wasCheckedList.unshift(...mappedMat);
									checkListPOS++;
								} else if (totalStaticMats > 0) {
									const remainderIFStillCombine = totalStaticMats;

									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
									tmpCopy.push(matPrefabSlice[0]);

									const mappedMat = tmpCopy.map(mat => ({ ...mat, NewAmount: remainderIFStillCombine }),);

									tmpCopy = [];

									wasCheckedList.push(...mappedMat);
									//remainingMatsList.push(...mappedMat);

									checkListPOS++;
								} else {
									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
									tmpCopy.push(matPrefabSlice[0]);
									const mappedMat = tmpCopy.map(mat => ({ ...mat, NewAmount: 0 }),);
									tmpCopy = [];
									wasCheckedList.unshift(...mappedMat);
									//destroyMatsList.push(...mappedMat);
									checkListPOS++;
								}
								compDiffCheck = checkingDiff;
								addedRarMats = 0; //THIS IS TEMPORARY!
								break;
                            }
                        }
					} else {
						isOwnedCheck = filterLower.filter(mat => mat.rar_id === curRun);

						if (isOwnedCheck.length <= 0) {
							//Material is NOT owned
							console.log(warnedForm(`Material with rar_id ${curRun} NOT found! Adding to checked list..`));

							matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
							console.log(basicInfoForm(`Material ${matPrefabSlice[0].Name} added to checked list!`));

							const mappedMat = await matPrefabSlice.map(mat => ({ ...mat, NewAmount: 0 }),);
							wasCheckedList.push(...mappedMat);
							checkListPOS++;
							compDiffCheck *= 5;
							curRun--;
						} else {
							console.log(successResult(`Material with rar_id ${curRun} FOUND! Name: ${isOwnedCheck[0].name}`));

							const totalStaticMats = isOwnedCheck[0].amount;
							console.log(basicInfoForm(`Total material amount: ${totalStaticMats}`));

							const checkingDiff = compDiffCheck + totalStaticMats;
							if (checkingDiff >= 0) {
								const remainingMats = totalStaticMats - checkingDiff;
								//const totalMatsSpent = totalStaticMats - remainingMats;
								if (remainingMats > 0) {
									//Prepare remaining entry
									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
									tmpCopy.push(matPrefabSlice[0]);

									//wasCheckedList.push(matPrefabSlice[0]);

									const mappedMat = await tmpCopy.map(mat => ({ ...mat, NewAmount: remainingMats }),);

									tmpCopy = [];

									console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
									console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

									remainingMatsList.push(...mappedMat);
									addedRarMats = inputAmount;
									break;
								} else if (remainingMats === 0) {
									//Prepare destroy entry
									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
									tmpCopy.push(matPrefabSlice[0]);

									//wasCheckedList.push(matPrefabSlice[0]);

									const mappedMat = await tmpCopy.map(mat => ({ ...mat, NewAmount: 0 }),);

									tmpCopy = [];

									console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
									console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

									destroyMatsList.push(...mappedMat);
									addedRarMats = inputAmount;
									break;
								}
							} else if (checkingDiff < 0) {
								console.log(failureResult('DIFFERENCE STILL REMAINS: ', checkingDiff));
								if (totalStaticMats > 5) {
									const totalNewIFCombine = Math.floor(totalStaticMats / 5);
									const remainderIFStillCombine = totalStaticMats - (totalNewIFCombine * 5);

									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
									tmpCopy.push(matPrefabSlice[0]);

									const oneHigherMatPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === (curRun + 1));
									let oneHigherTmpCopy = [];
									oneHigherTmpCopy.push(oneHigherMatPrefabSlice[0]);

									if (!highestPossibleCombine.CurrentAmount) {
										console.log(specialInfoForm('ATTEMPTING TO CREATE NEW HIGHEST COMBINE ENTRY!'));
										highestPossibleCombine = {
											Name: oneHigherTmpCopy[0].Name,
											Value: oneHigherTmpCopy[0].Value,
											MatType: oneHigherTmpCopy[0].MatType,
											Mat_id: oneHigherTmpCopy[0].Mat_id,
											Rarity: oneHigherTmpCopy[0].Rarity,
											Rar_id: oneHigherTmpCopy[0].Rar_id,
											CurrentAmount: totalNewIFCombine,
										};
										console.log(specialInfoForm(`Highest combine ${highestPossibleCombine.Name} after entry creation amount: ${highestPossibleCombine.CurrentAmount}`));
									} else {
										console.log(specialInfoForm('ATTEMPTING TO ADD TO HIGHEST COMBINE ENTRY!'));
										const staticMatCostForHIFC = Math.floor((5 ** (highestPossibleCombine.Rar_id - curRun)));

										let totalHighestNewIFCombine;

										if (totalStaticMats > staticMatCostForHIFC) {
											totalHighestNewIFCombine = Math.floor(totalStaticMats / staticMatCostForHIFC);
										} else {
											totalHighestNewIFCombine = 0;
										}

										if (totalHighestNewIFCombine > 0) {
											const newTotal = totalHighestNewIFCombine + highestPossibleCombine.CurrentAmount;
											highestPossibleCombine.CurrentAmount = newTotal;
										}
										console.log(specialInfoForm(`OUTCOME AMOUNT: ${highestPossibleCombine.CurrentAmount}`));
                                    }
									
									const mappedMat = tmpCopy.map(mat => ({ ...mat, NewAmount: remainderIFStillCombine }),);

									tmpCopy = [];

									//if (remainderIFStillCombine > 0) {
									//	remainingMatsList.push(...mappedMat);
									//} else if (remainderIFStillCombine === 0) {
									//	destroyMatsList.push(...mappedMat);
									//}

									if (totalNewIFCombine > 0) {
										const checkEditOneUp = wasCheckedList[0];
										checkEditOneUp.NewAmount += totalNewIFCombine;
									}

									wasCheckedList.unshift(...mappedMat);
									checkListPOS++;
								} else if (totalStaticMats > 0) {
									const remainderIFStillCombine = totalStaticMats;

									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
									tmpCopy.push(matPrefabSlice[0]);

									const mappedMat = tmpCopy.map(mat => ({ ...mat, NewAmount: remainderIFStillCombine }),);

									tmpCopy = [];

									wasCheckedList.unshift(...mappedMat);
									//remainingMatsList.push(...mappedMat);

									checkListPOS++;
								} else {
									matPrefabSlice = foundMaterialList.filter(mat => mat.Rar_id === curRun);
									tmpCopy.push(matPrefabSlice[0]);
									const mappedMat = tmpCopy.map(mat => ({ ...mat, NewAmount: 0 }),);
									tmpCopy = [];
									wasCheckedList.unshift(...mappedMat);
									//destroyMatsList.push(...mappedMat);
									checkListPOS++;
                                }
								compDiffCheck = checkingDiff;
								compDiffCheck *= 5;
								curRun--;
							}
						}
                    }
                } while (curRun > maxRun)

			} else if (materialDifferenceStaticValue >= 0) {
				//DIFFERENCE IS 0 OR GREATER
				console.log(successResult('INITIAL DIFF CHECK IS POSITIVE'));
			}

			if (highestPossibleCombine && highestPossibleCombine.CurrentAmount > 0) {
				//BACK TRACK VALUES TO MAKE HIGHEST POSSIBLE COMBINE WITH VALUES PROVIDED!
				console.log(warnedForm('INCOMPLETE COMBINE RECONSTRUCTION IN PROGRESS!'));
				let carryUpVal = 0;
				let breakPoint = checkListPOS;
				console.log(specialInfoForm(`breakPoint = checkListPOS: ${breakPoint}, Length of wasCheckedList: ${wasCheckedList.length}`));
				for (const material of wasCheckedList) {
					console.log(specialInfoForm(`OLD VALUES!! Name: ${material.Name} \nNewAmount: ${material.NewAmount}`));

					const matModFive = Math.floor((material.NewAmount + carryUpVal) % 5);
					console.log(basicInfoForm(`carryUpVal 1st @ ${breakPoint}: ${carryUpVal}`));

					//carryUpVal = 0;
					if (matModFive > 0) {
						carryUpVal = Math.floor((material.NewAmount + carryUpVal) / 5);
						material.NewAmount = matModFive;
						remainingMatsList.push(material);
					} else {
						carryUpVal = Math.floor((material.NewAmount + carryUpVal) / 5);
						material.NewAmount = 0;
						destroyMatsList.push(material);
					}

					if (carryUpVal <= 0) carryUpVal = 0;
					console.log(basicInfoForm(`carryUpVal 2nd @ ${breakPoint}: ${carryUpVal}`));

					console.log(specialInfoForm(`NEW VALUES!! Name: ${material.Name} \nNewAmount: ${material.NewAmount}`));
					breakPoint--;
					if (breakPoint === 0) break;
				}
				if (carryUpVal > 0) {
					const theWantedMaterial = foundMaterialList.filter(mat => mat.Rar_id === chosenRarID);
					highestPossibleCombine = {
						Name: theWantedMaterial[0].Name,
						Value: theWantedMaterial[0].Value,
						MatType: theWantedMaterial[0].MatType,
						Mat_id: theWantedMaterial[0].Mat_id,
						Rarity: theWantedMaterial[0].Rarity,
						Rar_id: theWantedMaterial[0].Rar_id,
						CurrentAmount: carryUpVal,
					};
                }
            }

			// How to handle amount specification...

			// inputAmount = final result wanted
			// chosenRarID = * 5

			// For each rarity below * 5 until common

			// EXAMPLE:

			// First check item with rar_id: (chosenRarID - 1);
			// Compare and check if material has enough to complete requested combine

			// const firstBackCheck = filterLower.filter(mat => mat.rar_id === (chosenRarID - 1));

			// matListStaticSlice = foundMaterialList.filter(mat => mat.Rar_id === (chosenRarID - 1));
			// tempMatCopy.push(matListStaticSlice[0]);

			// const fbcTotalMats = firstBackCheck.reduce((totalAmount, mat) => totalAmount + mat.amount, 0);

			//	if (fbcTotalMats < (5 * inputAmount)) { 
					// Try to combine lower as normal
					// chosenRarID = 2 (Rare)
					// inputAmount = 1

					// Uncommon needed = 5
					// Common needed = 25

					// Formula for common = (5 ** chosenRarID) * inputAmount;
					// Formula for uncommon = (5 ** (chosenRarID - 1)) * inputAmount;
					// Formula for rare = (5 ** (chosenRarID - 2)) * inputAmount;
					// Formula for very rare = (5 ** (chosenRarID - 3)) * inputAmount;
					// Formula for epic = (5 ** (chosenRarID - 4)) * inputAmount;

					// Formula to implement 

					// totNewRarMat = (((5 ** (chosenRarID - rarRun)) * inputAmount) / 5);
					// addedRarMats = totNewRarMat;


					// totRemainingRarMat = totRarMat - ((5 ** (chosenRarID - rarRun)) * inputAmount);

			//	} else { 
					// Leave all lower values alone and finish using only these values

			//	} 

			// ChosenRarID can be used to iterate
			//let curRarRunList;

			//let matListStaticSlice;
			//let tempMatCopy = [];

			
			//let rarRun = 0;
			//if (firstBackCheck.length <= 0) {
			//	//Try to combine lower as normal
			//	do {
			//		curRarRunList = filterLower.filter(mat => mat.rar_id === rarRun);
					
			//		if (curRarRunList.length <= 0) {
			//			//No materials of this rarity found, ignore for now and continue to next rarity
			//			addedRarMats /= 5;
			//			addedRarMats = Math.floor(addedRarMats);
			//			if (addedRarMats <= 0) addedRarMats = 0;
			//			rarRun++;
			//		} else {
			//			console.log(specialInfoForm(`Current material being checked: ${curRarRunList[0].name}`));

			//			matListStaticSlice = foundMaterialList.filter(mat => mat.Rar_id === rarRun);
			//			tempMatCopy.push(matListStaticSlice[0]);

			//			const totRarMat = await curRarRunList.reduce((totalAmount, mat) => totalAmount + mat.amount, addedRarMats);
			//			if (totRarMat < ((5 ** (chosenRarID - rarRun)) * inputAmount)) {
			//				//Not enough to combine, ignore for now and continue to next rarity
			//				rarRun++;
			//			} else {
			//				let totNewRarMat;
			//				if (rarRun === chosenRarID) {
			//					totNewRarMat = inputAmount;
			//				} else {
			//					totNewRarMat = Math.floor((((5 ** (chosenRarID - rarRun)) * inputAmount) / 5)); //New Rarity materials created
			//				}

			//				if (totNewRarMat > 0) {
			//					addedRarMats = totNewRarMat; //This will assign the final outcome value passed further!
			//				} else {
			//					addedRarMats = 0;
			//				} 

			//				let totRemainRarMat;
			//				if (rarRun === chosenRarID) {
			//					totRemainRarMat = inputAmount;
			//				} else {
			//					totRemainRarMat = (totRarMat - ((5 ** (chosenRarID - rarRun)) * inputAmount)); //Remaing old rarity materials
   //                         }

							
			//				if (totRemainRarMat > 0) {
			//					//Prepare remaining entry
			//					const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: totRemainRarMat }),);

			//					tempMatCopy = [];

			//					console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
			//					console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

			//					remainingMatsList.push(...mappedMat);
			//				} else {
			//					//Prepare destroy entry
			//					const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: 0 }),);

			//					tempMatCopy = [];

			//					console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
			//					console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

			//					destroyMatsList.push(...mappedMat);
			//				}
			//				rarRun++;
			//			}
			//		}
			//	} while (rarRun < (chosenRarID + 1)) 
			//} else if (fbcTotalMats < (5 * inputAmount)) {
			//	const fbcMatDiffStatic = (fbcTotalMats - (5 * inputAmount)); //THIS WILL BE A NEGATIVE VALUE!!
			//	let fbcMatDiffValue = fbcMatDiffStatic * 5;
			//	addedRarMats = 0;
			//	rarRun = chosenRarID - 2; //This one less than last rar checked allowing access to this logic
			//	do {
			//		curRarRunList = filterLower.filter(mat => mat.rar_id === rarRun);
					
			//		if (curRarRunList.length <= 0) {
			//			//No materials of this rarity found, ignore for now and continue to next rarity
			//			//addedRarMats = 0;
			//			fbcMatDiffValue *= 5;
			//			rarRun--;
			//		} else {
			//			tempMatCopy = [];
			//			console.log(specialInfoForm(`Current material being checked: ${curRarRunList[0].name}`));
			//			matListStaticSlice = foundMaterialList.filter(mat => mat.Rar_id === rarRun);
			//			tempMatCopy.push(matListStaticSlice[0]);

			//			console.log(specialInfoForm(`Current material being checked: ${matListStaticSlice[0].Name}`));

			//			const totRarMat = await curRarRunList.reduce((totalAmount, mat) => totalAmount + mat.amount, addedRarMats);

			//			if (totRarMat < (5 * inputAmount)) {
			//				//Not enough to combine, ignore for now and continue to next rarity
			//				console.log(specialInfoForm('NOT ENOUGH TO COMBINE, CHECKING NEXT RARITY'));
			//				fbcMatDiffValue *= 5;
			//				rarRun--;
			//			} else {
			//				// if final rarity is epic, chosenRarID = 4
			//				// at this point very rare has been checked and failed

			//				// if rarity being checked is rare, rarRun = 2
			//				// if rarity being checked is uncommon, rarRun = 1
			//				// if rarity being checked is common, rarRun = 0

			//				const totNewRarMat = Math.floor((((5 ** (chosenRarID - rarRun)) * inputAmount) / 5));

			//				const checkDiffOne = fbcMatDiffValue + totNewRarMat;
			//				if (Math.sign(checkDiffOne) === 1) {
			//					console.log(specialInfoForm('DIFFERENCE HAS BEEN MADE UP'));
			//					//Difference has been made up, stop search and start upwards proccess

			//					//This value is the remaining after subtracting the needed materials
			//					const totRemainingRarMats = (totRarMat - ((-1 * fbcMatDiffValue) * inputAmount));
			//					console.log(specialInfoForm(`totRemainingRarMats: ${totRemainingRarMats}`));
			//					//This gives the number of base materials needed to set fbcMatDiffValue to 0
			//					const totNeededForCombine = totRarMat - totRemainingRarMats;
			//					console.log(specialInfoForm(`totNeededForCombine: ${totNeededForCombine}`));

			//					addedRarMats = totNeededForCombine;

			//					//This checks which list to put the material into for later handling
			//					if (totRemainingRarMats > 0) {
			//						//Prepare remaining entry
			//						const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: totRemainingRarMats }),);

			//						tempMatCopy = [];

			//						console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
			//						console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

			//						remainingMatsList.push(...mappedMat);
			//					} else {
			//						//Prepare destroy entry
			//						const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: 0 }),);

			//						tempMatCopy = [];

			//						console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
			//						console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

			//						destroyMatsList.push(...mappedMat);
			//					}

			//					if (rarRun === (chosenRarID - 2)) {
			//						console.log(specialInfoForm('RARRUN IS @ STARTING POSITION HANDLE EXITING'));
			//						//Currently at second top most level || Rarity first evaluated
			//						//Recheck firstBackCheck with further backchecked values then try to combineCheck
			//						matListStaticSlice = foundMaterialList.filter(mat => mat.Rar_id === (chosenRarID - 1));
			//						tempMatCopy.push(matListStaticSlice[0]);

			//						fbcTotalMats = firstBackCheck.reduce((totalAmount, mat) => totalAmount + mat.amount, addedRarMats);

			//						//Success!!
			//						const fbcRemainingMats = fbcTotalMats - (5 * inputAmount);
			//						if (fbcRemainingMats > 0) {
			//							//Prepare remaining entry
			//							const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: fbcRemainingMats }),);

			//							tempMatCopy = [];

			//							console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
			//							console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

			//							remainingMatsList.push(...mappedMat);
			//						} else {
			//							//Prepare destroy entry
			//							const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: 0 }),);

			//							tempMatCopy = [];

			//							console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
			//							console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

			//							destroyMatsList.push(...mappedMat);
			//						}

			//						addedRarMats = inputAmount;
			//						fbcMatDiffValue = 0;
			//						break;
			//					} else {
			//						fbcMatDiffValue /= 5;
			//						rarRun++;
			//					}
			//				} else if (Math.sign(checkDiffOne) === -1) {
			//					//Difference has not yet been made up, continue search
			//					console.log(specialInfoForm('DIFFERENCE REMAINING CHECKING NEXT RAR DOWN'));
			//					fbcMatDiffValue += totNewRarMat;
			//					fbcMatDiffValue *= 5;
			//					rarRun--;
			//				} else if (Math.sign(checkDiffOne) === 0) {
			//					console.log(specialInfoForm('DIFFERENCE IS EXACTLY 0'));
			//					//This means an exact match was made and the outcome is 0
			//					//This value is the remaining after subtracting the needed materials
			//					const totRemainingRarMats = (totRarMat - ((-1 * fbcMatDiffValue) * 5));
			//					//This gives the number of base materials needed to set fbcMatDiffValue to 0
			//					const totNeededForCombine = totRarMat - totRemainingRarMats;

			//					addedRarMats = totNeededForCombine;

			//					//This checks which list to put the material into for later handling
			//					if (totRemainingRarMats > 0) {
			//						//Prepare remaining entry
			//						const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: totRemainingRarMats }),);

			//						tempMatCopy = [];

			//						console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
			//						console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

			//						remainingMatsList.push(...mappedMat);
			//					} else {
			//						//Prepare destroy entry
			//						const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: 0 }),);

			//						tempMatCopy = [];

			//						console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
			//						console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

			//						destroyMatsList.push(...mappedMat);
			//					}

			//					if (rarRun === (chosenRarID - 2)) {
			//						//Currently at second top most level || Rarity first evaluated
			//						//Recheck firstBackCheck with further backchecked values then try to combineCheck
			//						matListStaticSlice = foundMaterialList.filter(mat => mat.Rar_id === (chosenRarID - 1));
			//						tempMatCopy.push(matListStaticSlice[0]);

			//						fbcTotalMats = firstBackCheck.reduce((totalAmount, mat) => totalAmount + mat.amount, addedRarMats);

			//						//Success!!
			//						const fbcRemainingMats = fbcTotalMats - (5 * inputAmount);
			//						if (fbcRemainingMats > 0) {
			//							//Prepare remaining entry
			//							const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: fbcRemainingMats }),);

			//							tempMatCopy = [];

			//							console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
			//							console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

			//							remainingMatsList.push(...mappedMat);
			//						} else {
			//							//Prepare destroy entry
			//							const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: 0 }),);

			//							tempMatCopy = [];

			//							console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
			//							console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

			//							destroyMatsList.push(...mappedMat);
			//						}

			//						addedRarMats = inputAmount;
			//						fbcMatDiffValue = 0;
			//					} else {
			//						fbcMatDiffValue /= 5;
			//						rarRun++;
			//					}
			//				}
			//			}
			//		}
			//		rarRun--;
			//		if (rarRun === -1) break;
			//		if (rarRun === chosenRarID) break;
			//	} while (fbcMatDiffValue !== 0)

			//	if (rarRun === -1) console.log(warnedForm('Combine check unsucsessful, providing options for continuing anyway..'));
			//} else {
			//	//Leave all lower values alone and finish using only these values
			//	//fbcTotalMats
			//	const totNewRarMat = inputAmount;
			//	if (totNewRarMat > 0) {
			//		addedRarMats = totNewRarMat; //This will assign the final outcome value passed further!
			//	} else addedRarMats = 0;

			//	const totRemainRarMat = (fbcTotalMats - (5 * inputAmount)); //Remaing old rarity materials
			//	if (totRemainRarMat > 0) {
			//		//Prepare remaining entry
			//		const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: totRemainRarMat }),);

			//		tempMatCopy = [];

			//		console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
			//		console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

			//		remainingMatsList.push(...mappedMat);
			//	} else {
			//		//Prepare destroy entry
			//		const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: 0 }),);

			//		tempMatCopy = [];

			//		console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
			//		console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

			//		destroyMatsList.push(...mappedMat);
			//	}
			//}

			//if (rarRun === -1) {
			//	//Attempting to preform incomplete combine!!
			//	addedRarMats = 0;
			//	let newRarRun = 0;
			//	do {
			//		curRarRunList = filterLower.filter(mat => mat.rar_id === newRarRun);
			//		console.log(specialInfoForm(`Current material being checked: ${curRarRunList[0].name}`));

			//		if (curRarRunList.length <= 0) {
			//			//Material not found skip for now
			//			addedRarMats = 0;
			//			newRarRun++;
			//		} else {
			//			matListStaticSlice = foundMaterialList.filter(mat => mat.Rar_id === newRarRun);
			//			tempMatCopy.push(matListStaticSlice[0]);

			//			const totRarMat = await curRarRunList.reduce((totalAmount, mat) => totalAmount + mat.amount, addedRarMats);
			//			if (totRarMat < 5) {
			//				//Not enough to combine, ignore for now and continue to next rarity
			//				addedRarMats = 0;
			//				newRarRun++;
			//			} else {
			//				const totNewRarMat = Math.floor(totRarMat / 5); //New Rarity materials created
			//				if (totNewRarMat > 0) {
			//					addedRarMats = totNewRarMat; //This will assign the final outcome value passed further!
			//				} else addedRarMats = 0;

			//				const totRemainRarMat = (totRarMat % 5); //Remaing old rarity materials
			//				if (totRemainRarMat > 0) {
			//					//Prepare remaining entry
			//					const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: totRemainRarMat }),);

			//					tempMatCopy = [];

			//					console.log(specialInfoForm(`remainder mappedMat: ${mappedMat[0]}`));
			//					console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

			//					remainingMatsList.push(...mappedMat);
			//				} else {
			//					//Prepare destroy entry
			//					const mappedMat = await tempMatCopy.map(mat => ({ ...mat, NewAmount: 0 }),);

			//					tempMatCopy = [];

			//					console.log(specialInfoForm(`destroy mappedMat: ${mappedMat[0]}`));
			//					console.log(specialInfoForm(`mappedMat.Name: ${mappedMat[0].Name}`));

			//					destroyMatsList.push(...mappedMat);
			//				}
			//				newRarRun++;
   //                     }
   //                 }

			//	} while (newRarRun < (chosenRarID - 1))

			//	addedRarMats = 0;
   //         }

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

			//if (wasCheckedList.length > 0) {
			//	let checkListRun = 0;
			//	do {
			//		for (const theMat of wasCheckedList) {
			//			if (theMat.NewAmount > 0) {
			//				remainingMatsList.push(theMat);
			//				checkListRun++;
			//				break;
			//			} else if (theMat.NewAmount <= 0) {
			//				destroyMatsList.push(theMat);
			//				checkListRun++;
			//				break;
			//			}
			//		}
			//	} while (checkListRun < wasCheckedList.length)
			//}

			let remainingMaterialsEmbed;
			if (remainingMatsList.length > 0) {
				let embedMatSlice;

				let fieldValName;
				let fieldValValue;
				let fieldObject;

				let remainingMatsFields = [];

				//Handle fields values for each with remaining
				let embedRun = 0;
				do {
					embedMatSlice = remainingMatsList[embedRun];

					fieldValName = `${embedMatSlice.Name}`;
					fieldValValue = `Rarity: **${embedMatSlice.Rarity}**\nAmount remaining: ${embedMatSlice.NewAmount}`;

					fieldObject = { name: fieldValName.toString(), value: fieldValValue.toString(), };

					remainingMatsFields.push(fieldObject);

					embedRun++;
				} while (embedRun < remainingMatsList.length)

				//Create embed
				remainingMaterialsEmbed = {
					title: `~REMAINING MATERIALS~`,
					color: 0000,
					description: `Remaining materials after combining!`,
					fields: remainingMatsFields,
				};
			} else {
				//Create embed
				remainingMaterialsEmbed = {
					title: `~NO REMAINING MATERIALS~`,
					color: 0000,
					description: `Nothing remains after this combine!`,
				};
			}

			

			let destroyedMaterialsEmbed;
			if (destroyMatsList.length > 0) {
				let embedMatSlice;

				let fieldValName;
				let fieldValValue;
				let fieldObject;

				let destroyedMatsFields = [];

				//Handle fields values for each with remaining
				let embedRun = 0;
				do {
					embedMatSlice = destroyMatsList[embedRun];

					fieldValName = `${embedMatSlice.Name}`;
					fieldValValue = `Rarity: **${embedMatSlice.Rarity}**\nAmount remaining: ${embedMatSlice.NewAmount}`;

					fieldObject = { name: fieldValName.toString(), value: fieldValValue.toString(), };

					destroyedMatsFields.push(fieldObject);

					embedRun++;
				} while (embedRun < destroyMatsList.length)

				//Create embed
				destroyedMaterialsEmbed = {
					title: `~DESTROYED MATERIALS~`,
					color: 0000,
					description: `Removed materials after combining!`,
					fields: destroyedMatsFields,
				};
			} else {
				//Create embed
				destroyedMaterialsEmbed = {
					title: `~NO DESTROYED MATERIALS~`,
					color: 0000,
					description: `Nothing is destroyed after this combine!`,
				};
			}

			let materialOutcomeEmbed
			if (addedRarMats <= 0) {
				//REQUESTED MATERIALS NOT CREATED
				//Have access to addedRarMats, needed for display of requested materials 
				if (highestPossibleCombine) {
					if (highestPossibleCombine.CurrentAmount > 0) {
						materialOutcomeEmbed = {
							title: `~COMBINE INCOMPLETE~`,
							color: 0000,
							description: `Combining will not yield any requested materials! It will instead yield ${highestPossibleCombine.CurrentAmount} ${highestPossibleCombine.Name}. Continue?`,
						}
					} else {
						materialOutcomeEmbed = {
							title: `~COMBINE INCOMPLETE~`,
							color: 0000,
							description: `Combining will not yield any requested materials! Continue?`,
						}
                    }
				} else {
					materialOutcomeEmbed = {
						title: `~COMBINE INCOMPLETE~`,
						color: 0000,
						description: `Combining will not yield any requested materials! Continue?`,
					}
                }
			} else {
				//MATERIALS CREATED
				materialOutcomeEmbed = {
					title: `~COMBINE COMPLETE~`,
					color: 0000,
					description: `Combining will yield ${addedRarMats} of the requested material! Continue?`,
				}
            }

			const embedMsg = await interaction.followUp({ components: [interactiveButtons], embeds: [remainingMaterialsEmbed, destroyedMaterialsEmbed, materialOutcomeEmbed] });

			const filter = (i) => i.user.id === interaction.user.id;

			const collector = embedMsg.createMessageComponentCollector({
				ComponentType: ComponentType.Button,
				filter,
				time: 120000,
			});

			collector.on('collect', async (collInteract) => {
				if (collInteract.customId === 'accept') {
					await collInteract.deferUpdate();
					await handleMultiCombine(remainingMatsList, destroyMatsList, matType, chosenRarID, addedRarMats, highestPossibleCombine);
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

				const rarityTypes = ["Common", "Uncommon", "Rare", "Very Rare", "Epic", "Mystic", "?", "??", "???", "????"];
				let fullRarList;
				let rarCheckNum = 0;

				let embedColour = 0000;
				let list = ``;

				let curRun = 0;
				if (matType !== 'unique') {
					do {
						fullRarList = fullMatMatchList.filter(mat => mat.rarity === rarityTypes[rarCheckNum]);
						
						if (fullRarList.length <= 0) {
							rarCheckNum++;
						} else {	
							embedColour = await grabColour(rarCheckNum);
							
							for (const matCheck of fullRarList) {
								list = `Type: ${matCheck.mattype}\nValue: ${matCheck.value}\nRarity: ${matCheck.rarity}\nAmount: ${matCheck.amount}`;

								const displayEmbed = new EmbedBuilder()
									.setTitle('~MATERIAL~')
									.setColor(embedColour)
									.addFields({
										name: `${matCheck.name}`, value: list,
									});
								embedPages.push(displayEmbed);
								break;
							}
							rarCheckNum++;
						}
						curRun++;
					} while (curRun < fullMatMatchList.length)
				} else {
					do {
						fullRarList = fullMatMatchList.filter(mat => mat.rarity === 'Unique');
						
						if (fullRarList.length <= 0) {
							//rarCheckNum++;
						} else {
							embedColour = await grabColour(12);
							let breakPoint = 0;
							for (const matCheck of fullRarList) {
								list = `Type: ${matCheck.mattype}\nValue: ${matCheck.value}\nRarity: ${matCheck.rarity}\nAmount: ${matCheck.amount}`;

								const displayEmbed = new EmbedBuilder()
									.setTitle('~MATERIAL~')
									.setColor(embedColour)
									.addFields({
										name: `${matCheck.name}`, value: list,
									});
								embedPages.push(displayEmbed);
								breakPoint++;
								if (breakPoint === fullRarList.length) break;
							}
						}
						curRun++;
						//rarCheckNum++;
					} while (curRun < fullMatMatchList.length)
                }

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

		// This method handles dismantling materials into their counterparts
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

		// This method cycles through the given material lists in order to update, create, or destroy the related data
		async function handleMultiCombine(remainingMatList, destroyMatList, matType, chosenRarID, droppedNum, altMaterial) {
			var passType;
			let listStr;
			listStr = `${matType}List.json`;
			passType = `${matType}`;

			const foundMaterialList = require(`../events/Models/json_prefabs/materialLists/${listStr}`);
			if (!foundMaterialList) {
				console.log(errorForm('MaterialList NOT FOUND!'));
				return 0;
			}

			if (remainingMatList.length <= 0) {
				//No remaining materials to handle
			} else {
				//Remaining materials to handle
				let remainBreakConst = 0;
				for (const theMaterial of remainingMatList) {
					const firstCheck = await MaterialStore.findOne({ where: [{ spec_id: interaction.user.id }, { rar_id: theMaterial.Rar_id }, { matType: passType }] });
					if (!firstCheck) {
						//Material does not exist yet
						await MaterialStore.create({
							name: theMaterial.Name,
							value: theMaterial.Value,
							mattype: matType,
							mat_id: theMaterial.Mat_id,
							rarity: theMaterial.Rarity,
							rar_id: theMaterial.Rar_id,
							amount: theMaterial.NewAmount,
							spec_id: interaction.user.id
						});

						const secondCheck = await MaterialStore.findOne({ where: [{ spec_id: interaction.user.id }, { rar_id: theMaterial.Rar_id }, { matType: passType }] });
						if (secondCheck) {
							//Material entry created!
							console.log(successResult('Material created successful!'));
							remainBreakConst++;
						} else console.log(warnedForm('Something went wrong while creating new material'));
					} else {
						const matUpdated = await MaterialStore.update({ amount: theMaterial.NewAmount }, { where: [{ spec_id: interaction.user.id }, { rar_id: theMaterial.Rar_id }, { mattype: passType }] });
						if (matUpdated > 0) {
							//Material updated successfully
							console.log(successResult('Material update successful!'));
							remainBreakConst++;
						} else console.log(warnedForm('Something went wrong when updating material'));
					}

					if (remainBreakConst === remainingMatList.length) break;
                }
            }

			if (destroyMatList.length <= 0) {
				//No materials to destroy!
			} else {
				//Materials to destroy!
				let destroyBreakConst = 0;
				for (const theMaterial of destroyMatList) {
					const firstCheck = await MaterialStore.findOne({ where: [{ spec_id: interaction.user.id }, { rar_id: theMaterial.Rar_id }, { matType: passType }] });
					if (!firstCheck) {
						//Do nothing, entry already doesnt exist 
						destroyBreakConst++;
					} else {
						const matDestroyed = await MaterialStore.destroy({ where: [{ spec_id: interaction.user.id }, { rar_id: theMaterial.Rar_id }, { mattype: passType }] });
						if (matDestroyed) {
							//Material updated successfully
							console.log(successResult('Material destroyed successful!'));
							destroyBreakConst++;
						} else console.log(warnedForm('Something went wrong while destroying material'));
                    }

					if (destroyBreakConst === destroyMatList.length) break;
                }
            }

			if (droppedNum > 0) {
				var foundRar = chosenRarID;

				let matDropPool = [];
				for (var x = 0; x < foundMaterialList.length; x++) {
					if (foundMaterialList[x].Rar_id === foundRar) {
						//Rarity match add to list
						matDropPool.push(foundMaterialList[x]);
					} else {/**KEEP LOOKING*/ }
				}

				if (matDropPool.length > 0) {
					const finalMaterial = matDropPool[0];
					console.log(successResult(`Material Dropped: ${finalMaterial.Name}`));

					await handleMaterialAdding(finalMaterial, droppedNum, interaction.user.id, passType);
					await interaction.followUp(`${droppedNum} ${finalMaterial.Name} Dropped!`);
				}
			} else {
				if (altMaterial.CurrentAmount > 0) {
					var foundRar = altMaterial.Rar_id;

					let matDropPool = [];
					for (var x = 0; x < foundMaterialList.length; x++) {
						if (foundMaterialList[x].Rar_id === foundRar) {
							//Rarity match add to list
							matDropPool.push(foundMaterialList[x]);
						} else {/**KEEP LOOKING*/ }
					}

					if (matDropPool.length > 0) {
						const finalMaterial = matDropPool[0];
						console.log(successResult(`Material Dropped: ${finalMaterial.Name}`));

						await handleMaterialAdding(finalMaterial, altMaterial.CurrentAmount, interaction.user.id, passType);
						await interaction.followUp(`${altMaterial.CurrentAmount} ${finalMaterial.Name} Dropped!`);
					}
				}
            }
        }

		// This method is outdated and no longer used!
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
