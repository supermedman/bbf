const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { UserData, ActiveEnemy } = require('../dbObjects.js');
const { initialDisplay } = require('./exported/combatDisplay.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('start')
        .setDescription('Start your grand adventure!'),
	async execute(interaction) {

		const warriorButton = new ButtonBuilder()
			.setCustomId('slot1')
			.setLabel('Warrior')
			.setStyle(ButtonStyle.Primary);

		const mageButton = new ButtonBuilder()
			.setCustomId('slot2')
			.setLabel('Mage')
			.setStyle(ButtonStyle.Primary);

		const thiefButton = new ButtonBuilder()
			.setCustomId('slot3')
			.setLabel('Thief')
			.setStyle(ButtonStyle.Primary);

		const paladinButton = new ButtonBuilder()
			.setCustomId('slot4')
			.setLabel('Paladin')
			.setStyle(ButtonStyle.Primary);

		const row = new ActionRowBuilder().addComponents(warriorButton, mageButton, thiefButton, paladinButton);

		const embed = new EmbedBuilder()
			.setTitle("~Welcome to Black Blade~")
			.setColor(0x39acf3)
			.setDescription("This is the start of the journey.. Select one of the options to continue!")
			.addFields(
				{ name: 'Warrior 🪓', value: 'Allrounder: \n5% reduction on damage taken \n5% increase on damage dealt', inline: true },
				{ name: 'Mage 🪄', value: 'GlassCannon: \n5% increase on damage taken \n15% increase on damage dealt', inline: true },
				{ name: 'Thief 🗡️', value: 'Striker: \n10% base chance of double hit \n10% base chance of crit', inline: true },
				{ name: 'Paladin 🛡️', value: 'Unshakeable: \n15% reduction on damage taken \n5% reduction on damage dealt', inline: true },
			);

		const embedMsg = await interaction.reply({ content: 'Make your choice below.', ephemeral: true, embeds: [embed], components: [row] });

		const collector = embedMsg.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 120000,
		});

		const channel = interaction.channel;

		collector.on('collect', async (COI) => {
			if (COI.customId === 'slot1') {
				const classP = 'Warrior';
				await generateNewPlayer(classP);
				const enemy = await generateNewEnemy();
				collector.stop();
				return initialDisplay(enemy.specid, interaction, enemy);
			}

			if (COI.customId === 'slot2') {
				const classP = 'Mage';
				await generateNewPlayer(classP);
				const enemy = await generateNewEnemy();
				collector.stop();
				return initialDisplay(enemy.specid, interaction, enemy);
			}

			if (COI.customId === 'slot3') {
				const classP = 'Thief';
				await generateNewPlayer(classP);
				const enemy = await generateNewEnemy();
				collector.stop();
				return initialDisplay(enemy.specid, interaction, enemy);
			}

			if (COI.customId === 'slot4') {
				const classP = 'Paladin';
				await generateNewPlayer(classP);
				const enemy = await generateNewEnemy();
				collector.stop();
				return initialDisplay(enemy.specid, interaction, enemy);
			}
		});

		collector.on('end', () => {
			embedMsg.delete().catch(e => console.error(e));
		});


		async function generateNewPlayer(pClass) {
			let newUser;
			try {
				newUser = await UserData.create({
					userid: interaction.user.id,
					username: interaction.user.username,
					health: 100,
					level: 1,
					xp: 0,
					pclass: pClass,
					lastdeath: 'None',
				});
			} catch (error) {
				if (error.name === 'SequelizeUniqueConstraintError') return channel.send('That Data already exists. Use ``/startcombat``!');
				console.error(error);
				return channel.send('Something went wrong while adding that data!');
			}

			if (!newUser) return await channel.send('Something went wrong while creating your profile!');

			const statObj = loadPlayerStats(pClass);

			const tableUpdate = await newUser.update({
				health: statObj.health,
				speed: statObj.speed,
				strength: statObj.strength,
				intelligence: statObj.intelligence,
				dexterity: statObj.dexterity,
			});

			if (tableUpdate) await newUser.save();

			return newUser;
		}

		async function generateNewEnemy() {
			const enemyList = require('../events/Models/json_prefabs/enemyList.json');
			const enemyFab = enemyList[0];

			const specCode = interaction.user.id + enemyFab.ConstKey;

			let hasUI = false;
			if (enemyFab.HasUnique) hasUI = true;

			let theEnemy;
			try {
				theEnemy = await ActiveEnemy.create({
					name: enemyFab.Name,
					description: enemyFab.Description,
					level: enemyFab.Level,
					mindmg: enemyFab.MinDmg,
					maxdmg: enemyFab.MaxDmg,
					health: enemyFab.Health,
					defence: enemyFab.Defence,
					weakto: enemyFab.WeakTo,
					dead: enemyFab.Dead,
					hasitem: false,
					xpmin: enemyFab.XpMin,
					xpmax: enemyFab.XpMax,
					constkey: enemyFab.ConstKey,
					hasunique: hasUI,
					specid: specCode,
				});
			} catch (error) {
				console.error(error);
			}

			if (theEnemy) return theEnemy;
		}

		function loadPlayerStats(pClass) {
			let statObj = {
				health: 100,
				speed: 1,
				strength: 1,
				intelligence: 1,
				dexterity: 1,
				points: 4,
			};

			if (pClass === 'Warrior') {
				statObj.health = 120;
				statObj.strength++;
				statObj.points--;
			}

			if (pClass === 'Mage') {
				statObj.health = 110;
				statObj.intelligence += 3;
				statObj.points -= 3;
			}

			if (pClass === 'Thief') {
				statObj.health = 110;
				statObj.speed++;
				statObj.dexterity++;
				statObj.points -= 2;
			}

			if (pClass === 'Paladin') {
				statObj.health = 140;
				statObj.strength += 3;
				statObj.points -= 3;
			}

			return statObj;
        }

	},

};
