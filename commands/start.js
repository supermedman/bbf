const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { UserData } = require('../dbObjects.js');

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

		collector.on('collect', async (collInteract) => {
			if (collInteract.customId === 'slot1') {
				const classP = 'Warrior';
				//INPUT DATABASE TABLE FOR USERDATA HERE AND RUN THE CODE WHEN DONE
				console.log('username: ', collInteract.user.username);
				console.log('userid: ', collInteract.user.id);
				try {
					console.log('TRY WAS CALLED');
					const userData = await UserData.create({
						userid: collInteract.user.id,
						username: collInteract.user.username,
						health: 110,
						speed: 1,
						strength: 2,
						dexterity: 1,
						intelligence: 1,
						level: 1,
						xp: 1,
						points: 3,
						pclass: classP,
						lastdeath: 'None',
					});
					console.log('DATA WAS ADDED');

					var uData = await UserData.findAll({ attributes: ['username'] });
					const dataString = uData.map(t => t.username).join(', ') || 'No tags set.';

					console.log(`List of users: ${dataString}`);

					uData = await UserData.findOne({ where: { userid: collInteract.user.id } });
					if (uData) {
						return channel.send(`Logging ${uData.username}'s data sheet.. \nSpeed: ${uData.speed} \nStrength: ${uData.strength} \nDexterity: ${uData.dexterity} \nIntelligence: ${uData.intelligence} \nLevel: ${uData.level} \nXP: ${uData.xp} \nPerk Points: ${uData.points} \nClass: ${uData.pclass}`);
					}
					return channel.send(`Data for ${userData.username} added.`);
				}
				catch (error) {
					if (error.name === 'SequelizeUniqueConstraintError') {
						return channel.send('That Data already exists.');
					}
					console.log(`DB CONTENTS ${UserData.length}`);
					console.error('Error occured', error);
					return channel.send('Something went wrong with adding the data.');
				}
			}
			if (collInteract.customId === 'slot2') {
				const classP = 'Mage';
				//INPUT DATABASE TABLE FOR USERDATA HERE AND RUN THE CODE WHEN DONE
				console.log('username: ', collInteract.user.username);
				console.log('userid: ', collInteract.user.id);
				try {
					console.log('TRY WAS CALLED');
					const userData = await UserData.create({
						userid: collInteract.user.id,
						username: collInteract.user.username,
						speed: 1,
						strength: 1,
						dexterity: 1,
						intelligence: 4,
						level: 1,
						xp: 1,
						points: 1,
						pclass: classP,
						lastdeath: 'None',
					});
					console.log('DATA WAS ADDED');

					var uData = await UserData.findAll({ attributes: ['username'] });
					const dataString = uData.map(t => t.username).join(', ') || 'No tags set.';

					console.log(`List of users: ${dataString}`);

					uData = await UserData.findOne({ where: { userid: collInteract.user.id } });
					if (uData) {
						return channel.send(`Logging ${uData.username}'s data sheet.. \nSpeed: ${uData.speed} \nStrength: ${uData.strength} \nDexterity: ${uData.dexterity} \nIntelligence: ${uData.intelligence} \nLevel: ${uData.level} \nXP: ${uData.xp} \nPerk Points: ${uData.points} \nClass: ${uData.pclass}`);
					}
					return channel.send(`Data for ${userData.username} added.`);
				}
				catch (error) {
					if (error.name === 'SequelizeUniqueConstraintError') {
						return channel.send('That Data already exists.');
					}
					console.log(`DB CONTENTS ${UserData.length}`);
					console.error('Error occured', error);
					return channel.send('Something went wrong with adding the data.');
				}
			}
			if (collInteract.customId === 'slot3') {
				const classP = 'Thief';
				//msg.channel.send(`Your adventure begins now!\nGENERATING ${msg.author.username}'s PROFILE`);
				//INPUT DATABASE TABLE FOR USERDATA HERE AND RUN THE CODE WHEN DONE
				console.log('username: ', collInteract.user.username);
				console.log('userid: ', collInteract.user.id);
				try {
					console.log('TRY WAS CALLED');
					// equivalent to: INSERT INTO tags (name, description, username) values (?, ?, ?);
					const userData = await UserData.create({
						userid: collInteract.user.id,
						username: collInteract.user.username,
						speed: 2,
						strength: 1,
						dexterity: 2,
						intelligence: 2,
						level: 1,
						xp: 1,
						points: 1,
						pclass: classP,
						lastdeath: 'None',
					});
					console.log('DATA WAS ADDED');

					var uData = await UserData.findAll({ attributes: ['username'] });
					const dataString = uData.map(t => t.username).join(', ') || 'No tags set.';

					console.log(`List of users: ${dataString}`);

					uData = await UserData.findOne({ where: { userid: collInteract.user.id } });
					if (uData) {
						return channel.send(`Logging ${uData.username}'s data sheet.. \nSpeed: ${uData.speed} \nStrength: ${uData.strength} \nDexterity: ${uData.dexterity} \nIntelligence: ${uData.intelligence} \nLevel: ${uData.level} \nXP: ${uData.xp} \nPerk Points: ${uData.points} \nClass: ${uData.pclass}`);
					}
					return channel.send(`Data for ${userData.username} added.`);
				}
				catch (error) {
					if (error.name === 'SequelizeUniqueConstraintError') {
						return channel.send('That Data already exists.');
					}
					console.log(`DB CONTENTS ${UserData.length}`);
					console.error('Error occured', error);
					return channel.send('Something went wrong with adding the data.');
				}
			}
			if (collInteract.customId === 'slot4') {
				const classP = 'Paladin';
				//msg.channel.send(`Your adventure begins now!\nGENERATING ${msg.author.username}'s PROFILE`);
				//INPUT DATABASE TABLE FOR USERDATA HERE AND RUN THE CODE WHEN DONE
				console.log('username: ', collInteract.user.username);
				console.log('userid: ', collInteract.user.id);
				try {
					console.log('TRY WAS CALLED');
					// equivalent to: INSERT INTO tags (name, description, username) values (?, ?, ?);
					const userData = await UserData.create({
						userid: collInteract.user.id,
						username: collInteract.user.username,
						health: 140,
						speed: 1,
						strength: 4,
						dexterity: 1,
						intelligence: 1,
						level: 1,
						xp: 1,
						points: 1,
						pclass: classP,
						lastdeath: 'None',
					});
					console.log('DATA WAS ADDED');

					var uData = await UserData.findAll({ attributes: ['username'] });
					const dataString = uData.map(t => t.username).join(', ') || 'No tags set.';

					console.log(`List of users: ${dataString}`);

					uData = await UserData.findOne({ where: { userid: collInteract.user.id } });
					if (uData) {
						return channel.send(`Logging ${uData.username}'s data sheet.. \nSpeed: ${uData.speed} \nStrength: ${uData.strength} \nDexterity: ${uData.dexterity} \nIntelligence: ${uData.intelligence} \nLevel: ${uData.level} \nXP: ${uData.xp} \nPerk Points: ${uData.points} \nClass: ${uData.pclass}`);
					}
					return channel.send(`Data for ${userData.username} added.`);
				}
				catch (error) {
					if (error.name === 'SequelizeUniqueConstraintError') {
						return channel.send('That Data already exists.');
					}
					console.log(`DB CONTENTS ${UserData.length}`);
					console.error('Error occured', error);
					return channel.send('Something went wrong with adding the data.');
				}
			}
		});
	},

};
