const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const Canvas = require('@napi-rs/canvas');

const {NPC} = require('../Game/exported/MadeClasses/NPC');
const {initialDialog} = require('../Game/exported/handleNPC.js');

//const HBimg = require('../../events/Models/json_prefabs/image_extras/healthbar.png');
const enemyList = require('../../events/Models/json_prefabs/enemyList.json');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('devcreate')
        .setDescription('Dev Based Creative Enviroment!')
		.addSubcommand(subcommand =>
			subcommand
				.setName('enemy-style')
				.setDescription('Canvas Testing for enemy based display')
				.addStringOption(option =>
					option.setName('enemy')
						.setDescription('Which enemy would you like displayed?')
						.setRequired(true)
						.setAutocomplete(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('npc-spawn')
				.setDescription('Initial Spawn Tests For NPCs')
				.addStringOption(option =>
					option.setName('from')
						.setDescription('Where is this npc from?')
						.setRequired(true)
						.setChoices(
							{name: "Town", value: "fromTown"},
							{name: "Wild", value: "fromWilds"}))
				.addStringOption(option =>
					option.setName('local-biome')
						.setDescription('Would you like choose a biome?')
						.setAutocomplete(true))),
	async autocomplete(interaction) { 
		const focusedOption = interaction.options.getFocused(true);

		let choices = [];

		const makeCapital = (str) => { return str.charAt(0).toUpperCase() + str.slice(1) };

		if (focusedOption.name === 'enemy') {
			const focusedValue = interaction.options.getFocused(false);
			const findName = makeCapital(interaction.options.getString('enemy'));

			let enemyMatchList = enemyList.filter(enemy => enemy.Name.startsWith(findName));
			
			for (const enemy of enemyMatchList){
				choices.push(enemy.Name);
			}

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}

		if (focusedOption.name === 'local-biome'){
			const focusedValue = interaction.options.getFocused(false);

			choices = ['Wilds', 'Forest', 'Mountain', 'Desert', 'Plains', 'Swamp', 'Grassland'];

			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}
	},
	async execute(interaction) { 
		if (interaction.user.id !== '501177494137995264') return interaction.reply({content: 'This command is not for you!', ephemeral: true});
		
		function pngCheck(enemy) {
			if (enemy.PngRef) return true;
			return false;
		}

		if (interaction.options.getSubcommand() === 'enemy-style'){
			const enemyName = interaction.options.getString('enemy');
			
			let theEnemy = enemyList.filter(enemy => enemy.Name.startsWith(enemyName));
			let enemyRef = theEnemy[0];

			console.log(enemyRef);
			console.log(...enemyRef.DropTypes);

			/**	DropType Priority List:
			 * 	Tooly   - Metalic	= Metalic,
			 * 	Slimy   - Skinny	= Skinny,
			 * 	Gemy    - Magical	= Gemy,
			 * 	Herby	- Gemy		= Tooly,
			 * 	Silky	- Silky		= Silky,
			 * 	Metalic	- Tooly		= Herby,
			 * 	Rocky	- Herby		= Woody,
			 * 	Woody	- Fleshy	= Rocky,
			 * 	Skinny 	- Woody		= Slimy,
			 * 	Magical	- Rocky		= Fleshy,
			 * 	Fleshy	- Slimy		= Magical,
			 */
			let matPriorList = ["metalic", "skinny", "gemy", "tooly", "silky", "herby", "woody", "rocky", "slimy", "fleshy", "magical"];

			let activeDrops = [];
			for (const drop of enemyRef.DropTypes){
				activeDrops.push(matPriorList.indexOf(drop));
			}
			activeDrops.sort((a,b) => {
				if (a > b) return 1;
				if (a < b) return -1;
				return 0;
			});
			console.log(...activeDrops);

			const canvas = Canvas.createCanvas(700, 300);
    		const ctx = canvas.getContext('2d');

    		const hasImage = pngCheck(enemyRef);

    		const background = await Canvas.loadImage('./events/Models/json_prefabs/weapon_png/Background.jpg');
    		let enemyPng;
    		if (hasImage) enemyPng = await Canvas.loadImage(enemyRef.PngRef);


			ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    		if (hasImage) ctx.drawImage(enemyPng, 410, 75, 190, 190);

			const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'enemy-display.png' });
    		if (!interaction) return attachment;

			return await interaction.reply({ files: [attachment] });
		}

		if (interaction.options.getSubcommand() === 'npc-spawn'){
			const spawnType = interaction.options.getString('from');
			let localBiome = interaction.options.getString('local-biome');

			let theNpc;
			if (spawnType === 'fromTown') theNpc = new NPC(spawnType);
			if (spawnType === 'fromWilds') theNpc = new NPC();

			//console.log(theNpc);

			if (localBiome) theNpc.genRandNpc(localBiome);
			if (!localBiome) theNpc.genRandNpc();

			console.log(theNpc);

			const startDialogButton = new ButtonBuilder()
			.setCustomId('start-dialog')
			.setLabel(`Speak to ${theNpc.name}`)
			.setStyle(ButtonStyle.Primary);

			const buttonRow = new ActionRowBuilder().addComponents(startDialogButton);

			let dynDesc = `Name: ${theNpc.name}\nLevel: ${theNpc.level}\nBiome: ${theNpc.curBiome}\nTask Type: ${theNpc.taskType}\nFrom Town?: ${theNpc.fromTown}\nFrom Wilds?: ${theNpc.fromWilds}`;
			let finalFields = theNpc.grabTaskDisplayFields();

			const displayEmbed = new EmbedBuilder()
			.setTitle("NPC Spawned!!")
			.setDescription(dynDesc)
			.addFields(finalFields);

			const filter = (i) => i.user.id === interaction.user.id;

			const dialogStartMessage = await interaction.reply({
				embeds: [displayEmbed],
				components: [buttonRow],
			});

			const collector = dialogStartMessage.createMessageComponentCollector({
				componentType: ComponentType.Button,
				filter,
				time: 120000,
			});

			collector.on('collect', async (COI) =>{
				if (COI.customId === 'start-dialog'){
					initialDialog(theNpc, interaction);
					collector.stop();
				}
			});

			collector.once('end', () =>{
				dialogStartMessage.delete().catch(error => {
					if (error.code !== 10008) {
						console.error('Failed to delete the message:', error);
					}
				});
			})
		}
	},
};