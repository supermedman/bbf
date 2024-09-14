const { ActionRowBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { UserData } = require('../../dbObjects.js');
const { handleExterCombat } = require('./exported/combatDisplay.js');
const { grabUser, createConfirmCancelButtonRow, createInteractiveChannelMessage, handleCatchDelete, makeCapital } = require('../../uniHelperFunctions.js');

module.exports = {
	helptypes: ['Combat', 'Info', 'Stats'],
	data: new SlashCommandBuilder()
		.setName('start')
        .setDescription('Start your grand adventure!'),
	async execute(interaction) {
		const userExists = await grabUser(interaction.user.id);
		if (userExists) return await interaction.reply({content: 'Profile already exists! Please use `/startcombat` to play!', ephemeral: true});

		const wButt = new ButtonBuilder()
		.setCustomId('slot-warrior')
		.setLabel('Warrior')
		.setStyle(ButtonStyle.Primary), 
		mButt = new ButtonBuilder()
		.setCustomId('slot-mage')
		.setLabel('Mage')
		.setStyle(ButtonStyle.Primary), 
		tButt = new ButtonBuilder()
		.setCustomId('slot-thief')
		.setLabel('Thief')
		.setStyle(ButtonStyle.Primary), 
		pButt = new ButtonBuilder()
		.setCustomId('slot-paladin')
		.setLabel('Paladin')
		.setStyle(ButtonStyle.Primary);
		const pClassButts = [wButt, mButt, tButt, pButt];

		// Class choice embed/intro
		const introEmbed = new EmbedBuilder()
		.setTitle("~= Welcome to Black Blade =~")
		.setColor(0x39acf3)
		.setDescription("This is the start of the journey.. Select one of the options to continue! The choice you make will be unchangable, make this choice wisely.")
		.addFields(
			{ name: '🪓 Warrior 🪓', value: '~Ability~ \n**Allrounder**: \n- **5%** reduction on damage taken \n- **5%** increase on damage dealt\n- **x1.5 HP** increase', inline: true },
			{ name: '🪄 Mage 🪄', value: '~Ability~ \n**GlassCannon**: \n- **5%** increase on damage taken \n- **15%** increase on damage dealt\n- **x1.1 HP** increase', inline: true },
			{ name: '🗡️ Thief 🗡️', value: '~Ability~ \n**Striker**: \n- **10%** base chance of double hit \n- **10%** base chance of crit\n- **x1.2 HP** increase', inline: true },
			{ name: '🛡️ Paladin 🛡️', value: '~Ability~ \n**Unshakeable**: \n- **15%** reduction on damage taken \n- **5%** reduction on damage dealt\n- **x2.0 HP** increase', inline: true },
		);

		const classChoiceRow = new ActionRowBuilder().addComponents(pClassButts);

		// Final confirmation
		const confirmChoiceEmbed = new EmbedBuilder()
		.setTitle('== ARE YOU SURE ABOUT THAT ==')
		.setColor('Red')
		.setDescription('***The choice you make will be unchangable, make this choice wisely.***');

		const comChoiceRow = createConfirmCancelButtonRow('class', ButtonStyle.Danger, ButtonStyle.Secondary, 'Class Choice!', 'Choice, GO BACK!!');
		
		// Confirm choice display
		const confirmReply = {embeds: [confirmChoiceEmbed], components: [comChoiceRow]};

		// Make this ephemeral!
		const agreementEmbed = new EmbedBuilder()
		.setTitle('== **Notice** ==')
		.setColor('White')
		.setDescription("By selecting a class you are agreeing to the terms of both Black Blades [Privacy Policy](<https://docs.google.com/document/d/1M-Ymfu2TZGdQ9tUFX0h7wivS2bIdewlsdnum7lOuI8o/edit?usp=sharing>) & [Terms of Service](<https://#>)");

		await interaction.reply({embeds: [agreementEmbed], ephemeral: true});
		
		// Class choice display
		const choiceReply = {embeds: [introEmbed], components: [classChoiceRow]};

		const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 300000, choiceReply);

		// =====================
		let cPicked = "";
		// BUTTON COLLECTOR (COLLECT)
		collector.on('collect', async c => {
			await c.deferUpdate().then(async () => {
				const idSplits = c.customId.split('-');
				let editWith;
				switch(idSplits[0]){
					case "slot":
						cPicked = makeCapital(idSplits[1]);
						editWith = confirmReply;
					break;
					case "confirm":
						// Create new user
					return collector.stop(cPicked);
					case "cancel":
						// Go back to class options
						cPicked = "";
						editWith = choiceReply;
					break;
				}

				if (editWith.embeds) await anchorMsg.edit(editWith);
			}).catch(e => console.error(e));
		});
		// =====================

		// =====================
		// BUTTON COLLECTOR (END)
		collector.on('end', async (c, r) => {
			if (!r || r === 'time') return await handleCatchDelete(anchorMsg);

			if (r !== '') {
				await createNewUserEntry(r);
				await handleCatchDelete(anchorMsg);
				return handleExterCombat(interaction, 1);
			}
		});
		// =====================

		async function createNewUserEntry(classPicked){
			const healthModC = ["Mage", "Thief", "Warrior", "Paladin"];
            const healthModM = [1.1, 1.2, 1.5, 2];
			const statDefault = [
				{spd: 1, str: 1, int: 4, dex: 1, hp: 107, p: 1},
				{spd: 2, str: 1, int: 1, dex: 2, hp: 107, p: 2},
				{spd: 1, str: 2, int: 1, dex: 1, hp: 112, p: 3},
				{spd: 1, str: 4, int: 1, dex: 1, hp: 122, p: 1}
			];

			const cIdx = healthModC.indexOf(classPicked);
			const statObj = statDefault[cIdx];
			statObj.hp *= healthModM[cIdx];

			const newUser = await UserData.create({
				userid: interaction.user.id,
				username: interaction.user.username,
				level: 1,
				xp: 0,
				pclass: classPicked,
				totitem: 0,
				refreshcount: 0,
				lastdeath: 'None',
				health: statObj.hp,
				speed: statObj.spd,
				strength: statObj.str,
				intelligence: statObj.int,
				dexterity: statObj.dex,
				points: statObj.p
			});

			await newUser.save().then(async nu => {return await nu.reload()});
		}
	},

};
