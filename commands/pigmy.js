const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
//const wait = require('node:timers/promises').setTimeout;
const { Pighouse, Pigmy } = require('../dbObjects.js');
const { isLvlUp, isPigLvlUp } = require('./exported/levelup.js');
const Canvas = require('@napi-rs/canvas');

const pigmyList = require('../events/Models/json_prefabs/pigmyList.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pigmy')
		.setDescription('All your pigmies needs in one place!')
		.addSubcommand(subcommand =>
			subcommand
				.setName('equip')
				.setDescription('Equip or switch your active pigmy!')
				.addStringOption(option =>
					option.setName('choice')
						.setDescription('The pigmy')
						.setAutocomplete(true)
						.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('claim')
				.setDescription('Claims collected rewards from active pigmy!'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('inspect')
				.setDescription('Info about active pigmy.'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('play')
				.setDescription('Play with your pigmy to increase happiness!'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('rename')
				.setDescription('Change the name of your active pigmy!')
				.addStringOption(option =>
					option.setName('new-name')
						.setDescription('New name for your pigmy')
						.setRequired(true))),
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();

		const pigs = await Pighouse.findAll({ where: [{ spec_id: interaction.user.id }] });

		let choices = [];

		for (var n = 0; n < pigs.length; n++) {
			var picked = pigs[n].name;//assign picked to item name at postion n in the items list found
			//prevent any type errors			
			choices.push(picked.toString());//push each name one by one into the choices array
		}
		console.log(choices);
		console.log(focusedValue);

		//Mapping the complete list of options for discord to handle and present to the user
		const filtered = choices.filter(choice => choice.startsWith(focusedValue));
		await interaction.respond(
			filtered.map(choice => ({ name: choice, value: choice })),
		);
    },
	async execute(interaction) {
		await interaction.deferReply();
		if (interaction.options.getSubcommand() === 'equip') {
			const pigname = interaction.options.getString('choice');
			console.log(pigname);

			const pig = await Pighouse.findOne({ where: [{ spec_id: interaction.user.id }, { name: pigname }] });
			if (pig.spec_id !== interaction.user.id) {
				//something is wrong!
				pig.spec_id = interaction.user.id;
				if (pig) {
					const eqpig = await Pigmy.findOne({ where: [{ spec_id: interaction.user.id }] });
					if (eqpig) {
						if (pig.name === eqpig.name) return interaction.followUp(`${pig.name} is already equiped!`);
						//pigmy already equipped therefore overwrite and update
						const lastclaim = new Date(eqpig.updatedAt).getTime()
						console.log(lastclaim);

						var newpig = await Pigmy.update(
							{
								name: pig.name,
								type: pig.type,
								level: pig.level,
								exp: pig.exp,
								mood: pig.mood,
								happiness: pig.happiness,
								lcm: lastclaim,
								refid: pig.refid,
							}, { where: [{ spec_id: interaction.user.id }] });

						console.log('PIGMY UPDATED: ', newpig);
						newpig = await Pigmy.findOne({ where: [{ spec_id: interaction.user.id }] });
						await setTomorrow(newpig);
						interaction.followUp('Pigmy equipped successfully!');
					}
					else {
						//no items equipped therefore make new one
						await Pigmy.create(
							{
								name: pig.name,
								type: pig.type,
								level: pig.level,
								exp: pig.exp,
								mood: pig.mood,
								happiness: pig.happiness,
								lcm: pig.updatedAt,
								refid: pig.refid,
								spec_id: interaction.user.id,
							});

						const editpig = await Pigmy.findOne({ where: [{ spec_id: interaction.user.id }] });
						const lastclaim = new Date(editpig.updatedAt).getTime()
						console.log(lastclaim);

						var newpig = await Pigmy.update({	lcm: lastclaim }, { where: [{ spec_id: interaction.user.id }] });
						console.log('PIGMY ADDED: ', newpig);

						newpig = await Pigmy.findOne({ where: [{ spec_id: interaction.user.id }] });
						await setTomorrow(newpig);
						interaction.followUp('Pigmy equipped successfully!');
					}
				} else if (!pig) {
					return interaction.followUp('That pigmy could not be found try the command "/pigmyshop" to see claimable pigmies!');
				}
			} else {
				if (pig) {
					const eqpig = await Pigmy.findOne({ where: [{ spec_id: interaction.user.id }] });
					if (eqpig) {
						//item already equipped therefore overwrite and update
						const lastclaim = new Date(eqpig.updatedAt).getTime()
						console.log(lastclaim);
						const newpig = await Pigmy.update(
							{
								name: pig.name,
								type: pig.type,
								level: pig.level,
								exp: pig.exp,
								mood: pig.mood,
								happiness: pig.happiness,
								lcm: lastclaim,
								refid: pig.refid,
							}, { where: [{ spec_id: interaction.user.id }] });

						console.log('PIGMY UPDATED: ', newpig);
						interaction.followUp('Pigmy equipped successfully!');
					}
					else {
						//no items equipped therefore make new one

						await Pigmy.create(
							{
								name: pig.name,
								type: pig.type,
								level: pig.level,
								exp: pig.exp,
								mood: pig.mood,
								happiness: pig.happiness,
								refid: pig.refid,
								spec_id: interaction.user.id,
							});

						const editpig = await Pigmy.findOne({ where: [{ spec_id: interaction.user.id }] });
						const lastclaim = new Date(editpig.updatedAt).getTime()
						console.log(lastclaim);

						const newpig = await Pigmy.update(
							{
								lcm: lastclaim,
							}, { where: [{ spec_id: interaction.user.id }] });

						console.log('PIGMY ADDED: ', newpig);
						interaction.followUp('Pigmy equipped successfully!');
					}
				} else if (!pig) {
					return interaction.followUp('That pigmy could not be found try the command "/pigmyshop" to see claimable pigmies!');
				}
            }
		}
		else if (interaction.options.getSubcommand() === 'claim') {
			//everything contained here needs to base off of the lcm value
			const pig = await Pigmy.findOne({ where: [{ spec_id: interaction.user.id }] });
			if (!pig) {
				return interaction.followUp('You have no active pigmy! Use command "/pigmy equip" to equip one.');
			}
			if (pig.mood === 'Corrupted!') return interaction.followUp(`${pig.name} has been corrupted due to your negligence and refuses to help!`);

			const then = pig.lcm;
			const now = new Date().getTime();

			//7200000 minimum length of time before a pigmy claim can be made
			const diffTime = Math.abs(now - then);
			const timeLeft = Math.floor(7200000 - diffTime);
			console.log('TIME LEFT: ', timeLeft);

			if (timeLeft <= 0) {
				const hrs = await Math.round(Math.abs(timeLeft / (1000 * 60 * 60)));
				console.log(hrs);

				//Items gained at a constant rate per hour increased by pigmy type and level
				//var iGained = [];
				//var totItem = 0;

				var totXP = 0;
				var totCoin = 0;

				//Xp gained min and max is based on length of time since last claim
				//And active pigmies level
				const XpMax = ((pig.level * 1.5) + (100 * hrs));
				const XpMin = (((pig.level * 1.5) + (100 * hrs)) - 75);			

				//calculate xp gained and add to overall total
				var xpGained = Math.floor(Math.random() * (XpMax - XpMin + 1) + XpMin);
				xpGained = xpGained * 1 + ((-1) * (2 * hrs) ** 0.4 + 3.7);
				totXP += xpGained;

				var cGained = (((xpGained - 5) * 1.2) + 1);
				totCoin += cGained;

				totXP = Math.round(totXP);
				totCoin = Math.round(totCoin);
				console.log('Total player xp: ', totXP);
				console.log('Total player coins: ', totCoin);

				//calculate pigmy xp gained
				var pigXp = Math.round(Math.floor(totXP * 0.2));
				console.log('Total pigmy xp: ', pigXp);				

				//==============================
				//	Alter final results based on happiness of the pigmy
				if (pig.happiness < 90) {
					//Pigmy is not at maximum happiness = decrease rewards
					const diffHappy = (100 - pig.happiness);
					totXP -= (-(diffHappy / 100) * totXP);
					totCoin -= (-(diffHappy / 100) * totCoin);
					pigXp -= (-(diffHappy / 100) * pigXp);
					var newHappiness = (pig.happiness - 10);
					if (newHappiness < 0) {
						newHappiness = 0;
                    }
					await updateHappiness(pig, newHappiness);
				} else {
					var newHappiness = (pig.happiness - 10);
					if (newHappiness < 0) {
						newHappiness = 0;
					}
					await updateHappiness(pig, newHappiness);
				}

				totXP = Math.round(totXP);
				totCoin = Math.round(totCoin);
				pigXp = Math.round(pigXp);
				
				//==============================
				//Basic levelup check for user, ending with updating xp and coins in database
				await isLvlUp(totXP, totCoin, interaction);

				//==============================
				//Next check if pigmy passes levelup
				await isPigLvlUp(pigXp, pig, interaction);

				//==============================
				//Generate the rewards embed and prep for user
				const rewards = `${pig.name} has collected: \n**For you** \n${totCoin}c \n${totXP}xp \n**For ${pig.name}** \n${pigXp}xp`;
				const dynDes = `After searching tirelessly for hours ${pig.name} had success!`;

				const pigClaimEmbed = new EmbedBuilder()
					.setTitle('==**YOU CLAIMED REWARDS**==')
					.setDescription(dynDes)
					.setColor(0000)
					.addFields(
						{
							name: `Rewards after ${hrs}hours`,
							value: rewards
						}
					);
				interaction.followUp({ embeds: [pigClaimEmbed] }).then(async pigClaimEmbed => setTimeout(() => {
					pigClaimEmbed.delete();
				}, 100000));

			} else {
				var timeCon = timeLeft;

				var hrs = await Math.floor(timeCon / (1000 * 60 * 60));
				timeCon -= (hrs * 60 * 60 * 1000);
				console.log('Time left after removing hours', timeCon);

				var min = await Math.floor(timeCon / (1000 * 60));
				timeCon -= (min * 60 * 1000);
				console.log('Time left after removing minutes', timeCon);

				var sec = await Math.round(timeCon / (1000));

				console.log(`Time left = ${hrs}:${min}:${sec}`);

				interaction.followUp(`Your pigmy has not had enough time to bring back any rewards!\nTry again in: ${hrs}hrs ${min}min ${sec}s`);
            }
		}
		else if (interaction.options.getSubcommand() === 'inspect') {
			const pig = await Pigmy.findOne({ where: [{ spec_id: interaction.user.id }] });
			if (!pig) {
				return interaction.followUp('You have no active pigmy! Use command "/pigmy equip" to equip one.');
			}
			if (pig.mood === 'Corrupted!') return interaction.followUp(`${pig.name} has been corrupted, and will remain in the darkness!`);
			/**
			 * TO DO
			 * 
			 * ALTER TEXT TO FIT CONSITANTLY WITH CHANGING VALUES 
			 * 
			 * MAYBE TRY SETTING DIFFERENT STATS TO DIFFERENT LOCATIONS
			 * 
			 * */
			const canvas = Canvas.createCanvas(700, 250);
			const context = canvas.getContext('2d');

			// Pass the entire Canvas object because you'll need access to its width and context
			const applyText = (canvas, text) => {
				const context = canvas.getContext('2d');

				// Declare a base size of the font
				let fontSize = 70;

				do {
					// Assign the font to the context and decrement it so it can be measured again
					context.font = `${fontSize -= 10}px sans-serif`;
					// Compare pixel width of the text to the canvas minus the approximate avatar size
				} while (context.measureText(text).width > canvas.width - 300);

				// Return the result to use in the actual canvas
				return context.font;
			};
			// This uses the canvas dimensions to stretch the image onto the entire canvas
			const background = await Canvas.loadImage(pigmyList[pig.refid].BackRef);		
			context.drawImage(background, 0, 0, canvas.width, canvas.height);

			//assign values to be used on the canvas
			const pigStuff = `Level: ${pig.level} \nXP: ${pig.exp} \nType: ${pig.type} \nMood: ${pig.mood} \n`;

			// Slightly smaller text placed below and to the left of the pigmy's display name
			context.font = applyText(canvas, pigStuff);
			context.fillStyle = '#ffffff';
			context.fillText(pigStuff, canvas.width / 4.1, canvas.height / 1.2);

			// Assign the decided font to the canvas
			context.font = applyText(canvas, `${pig.name}`);
			context.fillStyle = '#ffffff';
			context.fillText(`${pig.name}`, canvas.width / 2.5, canvas.height / 1.8);

			//grab reference to the pigmy in question and load it onto the canvas
			const pigmyImage = await Canvas.loadImage(pigmyList[pig.refid].PngRef);
			context.drawImage(pigmyImage, 25, 25, 200, 200);

			const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'pigmy-image.png' });

			interaction.followUp({ files: [attachment] }).then(async pigCanvas => setTimeout(() => {
				pigCanvas.delete();
			}, 60000));		
		}			
		else if (interaction.options.getSubcommand() === 'play') {
			/**
					How does happiness effect gameplay?
						- Increase/Decrease rewards where pigmies are used
						- Increases/Decreases time it takes to be able to claim from pigmy
						- Gives the user a sense of purpose and duty to their pigmy

					How does "Playing" effect the pigmy?
						- Increases happiness
						- Gives a small amount of xp to the pigmy
						- Possible chance for pigmy to drop a weapon

					What restrictions/Limits will be in place?
						- Set limit of play chances per day?
						- If pigmy is max happiness play is prevented
						- Very low chance of item drop
					
					How can the user play?
						- Prompt user with a mini game 
						- Mini game chosen by the pigmy
						- Start with 2 mini games once code base is working
			 */

			//First set a limit to play chances
			//Second handle the interaction
			//Third update the database
			//Fourth display to user the outcome 

			var pigmy = await Pigmy.findOne({ where: [{ spec_id: interaction.user.id }] });		

			if (!pigmy) return interaction.followUp('You do not have any pigmy equiped! Use ``/pigmy equip`` to change that!');

			if (!pigmy.tomorrow) {
				await setTomorrow(pigmy);
			}
			const playCheck = await checkTomorrow(pigmy);
			
			if (playCheck === 5) return interaction.followUp(`${pigmy.name} has refused to play anymore today!!`);
			if (pigmy.happiness === 100) return interaction.followUp(`${pigmy.name} is already the happiest pigmy around!`);

			var newHappiness = (pigmy.happiness + 15);
			if (newHappiness > 100) {
				newHappiness = 100;
			}
			const curMood = await updateHappiness(pigmy, newHappiness);
			const currentplay = (playCheck + 1);
			await updatePlayCount(pigmy, currentplay);

			const playEmbed = new EmbedBuilder()
				.setTitle(`You played with ${pigmy.name}`)
				.setColor(0000)
				.setFields(
					{
						name: `Current mood: `, value: `${curMood}`,
					}
				)
			interaction.followUp({ embeds: [playEmbed] }).then(async playEmbed => setTimeout(() => {
				playEmbed.delete();
			}, 20000));


		}
		else if (interaction.options.getSubcommand() === 'rename') {
			const newpigname = interaction.options.getString('new-name');
			console.log(newpigname);

			var pig = await Pigmy.findOne({ where: [{ spec_id: interaction.user.id }] });
			if (!pig) {
				return interaction.followUp('You have no active pigmy! Use command "/pigmy equip" to equip one.');
			}
			if (pig.mood === 'Corrupted!') return interaction.followUp(`${pig.name} has been corrupted, they will accept no name from you!`);
			if (newpigname.length > 20) {
				return interaction.followUp('That name is too long, please keep it under 20 letters');
			} else {
				await editPigName(pig, newpigname);

				pig = await Pigmy.findOne({ where: [{ spec_id: interaction.user.id }] });

				const pigStuff = `Level: ${pig.level} \nXP: ${pig.exp} \nType: ${pig.type} \nMood: ${pig.mood} \n`;

				const pigEmbed = new EmbedBuilder()
					.setColor(0000)
					.setTitle(`${interaction.user.username}'s Pigmy`)
					.setImage(pigmyList[pig.refid].Image)
					.addFields(
						{
							name: `${pig.name}`,
							value: pigStuff,
						}
					);
				await interaction.followUp({ embeds: [pigEmbed], files: [pigmyList[pig.refid].PngRef] }).then(async pigEmbed => setTimeout(() => {
					pigEmbed.delete();
				}, 60000));
            }
		}

		//========================================
		//This method updates the name of both the active pigmy and its pighouse counterpart 
		async function editPigName(pig, newpigname) {
			const activePig = await Pigmy.update({ name: newpigname }, { where: { spec_id: interaction.user.id } });
			const housePig = await Pighouse.update({ name: newpigname }, { where: { spec_id: interaction.user.id, refid: pig.refid } });

			if (activePig && housePig) {
				return console.log('Both checks passed, name updated successfully!');
            }
		}

		//========================================
		// This method sets the date of tomorrow with the refrence of today
		async function setTomorrow(pigmy) {
			//	Give refrence to what day is today 
			// Set what day is tomorrow in the pigmy database
			// Use that date to know when to reset play chances
			const today = new Date();
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);
			tomorrow.setHours(0, 0, 0, 0);

			const newDay = tomorrow.getTime();
			console.log(newDay);

			const activePig = await Pigmy.update({ tomorrow: newDay }, { where: { spec_id: interaction.user.id } });
			const housePig = await Pighouse.update({ tomorrow: newDay }, { where: { spec_id: interaction.user.id, refid: pigmy.refid } });

			if (activePig > 0) {
				if (housePig > 0) {

					return console.log('Both checks passed, the day that is next has been set/updated!');
				}
			}
		}

		//========================================
		// This method sets the date of tomorrow with the refrence of today
		async function checkTomorrow(pigmy) {
			const today = new Date();
			console.log(today.getTime());
			console.log(pigmy.tomorrow);

			if (pigmy.tomorrow <= today.getTime()) {
				// Its been a day time to reset play count!
				console.log('IS TOMORROW!');
				await setTomorrow(pigmy);
				await updatePlayCount(pigmy, 0);
				return 0;
			} else {
				// Not tomorrow current playcount is valid
				console.log('IS STILL TODAY!');
				return pigmy.playcount;
            }
		}

		//========================================
		// This method increments play count of both the active pigmy and its pighouse counterpart
		async function updatePlayCount(pigmy, currentplay) {
			const activePig = await Pigmy.update({ playcount: currentplay }, { where: { spec_id: interaction.user.id } });
			const housePig = await Pighouse.update({ playcount: currentplay }, { where: { spec_id: interaction.user.id, refid: pigmy.refid } });
			if (activePig > 0) {
				if (housePig > 0) {

					return console.log('Both checks passed, Play count has been updated!');
				}
			}
		}

		//========================================
		//This method updates the happiness of both the active pigmy and its pighouse counterpart
		async function updateHappiness(pigmy, newHappiness) {
			var newMood;
			if (newHappiness === 100) {
				//Pigmy is fantasitc!
				newMood = 'Fantastic!';
			} else if (newHappiness < 10) {
				//Pigmy is Corrupted!
				newMood = 'Corrupted!';
			} else if (newHappiness <= 25) {
				//Pigmy is Dejected
				newMood = 'Dejected';
			} else if (newHappiness <= 40) {
				//Pigmy is Unhappy
				newMood = 'Unhappy';
			} else if (newHappiness <= 50) {
				//Pigmy is Uneasy
				newMood = 'Uneasy';
			} else if (newHappiness <= 75) {
				//Pigmy is Content
				newMood = 'Content';
			} else if (newHappiness <= 90) {
				//Pigmy is Happy!
				newMood = 'Happy!';
			} else if (newHappiness < 100) {
				//Pigmy is Happy!
				newMood = 'Happy!';
			} 

			const activePig = await Pigmy.update({ happiness: newHappiness, mood: newMood }, { where: { spec_id: interaction.user.id } });
			const housePig = await Pighouse.update({ happiness: newHappiness, mood: newMood }, { where: { spec_id: interaction.user.id, refid: pigmy.refid } });

			if (activePig > 0) {
				if (housePig > 0) {
					console.log('Both checks passed, Happiness and Mood updated!');
					return newMood;
				}				
			}
        }
	},	
};