const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const Canvas = require('@napi-rs/canvas');

const {UserData, UniqueCrafted, Loadout, Pigmy} = require('../../dbObjects.js');

const {NPC} = require('../Game/exported/MadeClasses/NPC');
const {initialDialog} = require('../Game/exported/handleNPC.js');
const {createBigTile} = require('../Game/exported/createTile.js');

//const HBimg = require('../../events/Models/json_prefabs/image_extras/healthbar.png');
const enemyList = require('../../events/Models/json_prefabs/enemyList.json');
const lootList = require('../../events/Models/json_prefabs/lootList.json');
const uniqueLootList = require('../../events/Models/json_prefabs/uniqueLootList.json');
const { grabColour } = require('../Game/exported/grabRar.js');
const { pigmyTypeStats } = require('../Game/exported/handlePigmyDamage.js');
const { handleCatchDelete, createInteractiveChannelMessage } = require('../../uniHelperFunctions.js');

const UI = [
	'./events/Models/json_prefabs/image_extras/user-inspect/gold-frame-menu.png',
	'./events/Models/json_prefabs/image_extras/user-inspect/silver-frame-menu.png'
];

const preLoadImages = async (loadingGroup) => {
    let returnArr = [];
    for (const item of loadingGroup) {
        const loadedImg = await Canvas.loadImage(item);
        returnArr.push(loadedImg);
    }
    return returnArr;
};

/**
 * This method locates gear refs using given loot ids, to be used for displays
 * @param {string} userID Users id for locating crafted gear
 * @param {any[]} gear Array of loot ids to be used for searching
 */
const loadLoadout = async (userID, gear) => {
	const returnArr = [];
	for (const id of gear){
		let itemRef;
		if (id === 0) {itemRef = "None";} else if (id >= 30000){
			//Crafted
			itemRef = await UniqueCrafted.findOne({where: {spec_id: userID, loot_id: id}});
		} else if (id < 1000 || id >= 20000){
			//Normal or special
			itemRef = lootList.filter(item => item.Loot_id === id);
			itemRef = itemRef[0];
		} else if (id > 1000){
			//Unique
			itemRef = uniqueLootList.filter(item => item.Loot_id === id);
			itemRef = itemRef[0];
		}
		returnArr.push(itemRef);
	}
	return returnArr;
};

module.exports = {
	data: new SlashCommandBuilder()
	.setName('devcreate')
	.setDescription('Dev Based Creative Enviroment!')
	.addSubcommand(subcommand =>
		subcommand
		.setName('enemy-style')
		.setDescription('Canvas Testing for enemy based display')
		.addStringOption(option =>
			option
			.setName('enemy')
			.setDescription('Which enemy would you like displayed?')
			.setRequired(true)
			.setAutocomplete(true)
		)
	)
	.addSubcommand(subcommand =>
		subcommand
		.setName('npc-spawn')
		.setDescription('Initial Spawn Tests For NPCs')
		.addStringOption(option =>
			option
			.setName('from')
			.setDescription('Where is this npc from?')
			.setRequired(true)
			.setChoices(
				{name: "Town", value: "fromTown"},
				{name: "Wild", value: "fromWilds"}
			)
		)
		.addStringOption(option =>
			option
			.setName('local-biome')
			.setDescription('Would you like choose a biome?')
			.setAutocomplete(true)
		)
	)
	.addSubcommand(subcommand =>
		subcommand
		.setName('player-inspect')
		.setDescription('Canvas Testing for inspect based display')
	)
	.addSubcommand(subcommand =>
		subcommand
		.setName('menu-test')
		.setDescription('Embed menu display testing')
	),
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

		const subCom = interaction.options.getSubcommand();

		// Enemy Display Testing
		if (subCom === 'enemy-style'){
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

		// NPC Spawn Testing
		if (subCom === 'npc-spawn'){
			const spawnType = interaction.options.getString('from');
			let localBiome = interaction.options.getString('local-biome');

			const user = await UserData.findOne({where: {userid: interaction.user.id}});

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
					initialDialog(theNpc, interaction, user);
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

		// Player Inspect Testing
		if (subCom === 'player-inspect'){
			const canvas = Canvas.createCanvas(1000, 1000);
			const ctx = canvas.getContext('2d');

			const uiMenu = await preLoadImages(UI);

			const userLoadout = await Loadout.findOne({where: {spec_id: interaction.user.id}});
			let equippedGear = [userLoadout.headslot, userLoadout.chestslot, userLoadout.legslot, userLoadout.offhand, userLoadout.mainhand];
			equippedGear = await loadLoadout(interaction.user.id, equippedGear);

			const background = await Canvas.loadImage('./events/Models/json_prefabs/image_extras/user-inspect/static-background.jpg');
			ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

			ctx.drawImage(uiMenu[0], 500, 0, 500, 500);
			ctx.drawImage(uiMenu[1], 500, 500, 500, 500);

			ctx.fillStyle = 'White';
			ctx.font = '30px sans-serif';

			ctx.fillText('Equipped', 690, 35);
			ctx.fillText('Damage Stats', 658, 535);

			ctx.font = '25px sans-serif';

			const itemTextList = ['Helm: ', 'Chest: ', 'Legs: ', 'Offhand: ', 'Mainhand: '];

			let pxCollector = 90;
			for (let i = 0; i < 5; i++) {
				ctx.fillStyle = (equippedGear[i] === "None") ? 'Grey' : await grabColour(equippedGear[i].Rar_id ?? equippedGear[i].rar_id, true);
				const textToDisplay = (equippedGear[i] === "None") ? itemTextList + "None" : itemTextList[i] + equippedGear[i].Name ?? equippedGear[i].name;
				ctx.fillText(textToDisplay, 565, pxCollector);
				pxCollector += 25;
				const typeToDisplay = (equippedGear[i] === "None") ? "Type: None" : "Type: " + equippedGear[i].Type ?? equippedGear[i].type;
				ctx.fillText(typeToDisplay, 565, pxCollector);
				pxCollector += 40;
			}

			let totalDamage = 0, totalDefence = 0, loadoutTypes = [];

			for (const item of equippedGear){
				if (item.Attack || item.attack) totalDamage += item.Attack ?? item.attack;
				if (item.Defence || item.defence) totalDefence += item.Defence ?? item.defence;
				if (item !== "None") loadoutTypes.push(item.Type ?? item.type);
			}

			const user = await UserData.findOne({where: {userid: interaction.user.id}});
			const playerDamage = (user.intelligence * 8) + (user.strength * 2);

			const pigmy = await Pigmy.findOne({where: {spec_id: user.userid}});
			const pigmyBuffs = (pigmy) ? pigmyTypeStats(pigmy) : "None";
			const pigmyBaseDamage = (pigmyBuffs !== "None") ? pigmyBuffs.pigmyDmg : 0;
			const pigmyAddDamage = (pigmyBuffs !== "None") ? ((pigmyBuffs.int * 8) + (pigmyBuffs.str * 2)) : 0;

			let strongList = [], baseMod = 0, baseModDamage = 0;
			switch(user.pclass){
				case "Mage":
					strongList = ['magic', 'fire', 'frost', 'light', 'dark'];
					baseMod = 0.15;
				break;
				case "Thief":
					strongList = ['slash', 'dark'];
				break;
				case "Warrior":
					strongList = ['slash', 'blunt', 'fire'];
					baseMod = 0.05;
				break;
				case "Paladin":
					strongList = ['null', 'blunt', 'rad'];
					baseMod = -0.05;
				break;
			}
			strongList.push('spirit', 'pain', 'chaos');
			baseModDamage = playerDamage;
			baseModDamage = baseModDamage + playerDamage * baseMod;

			const proxTimes = loadoutTypes.filter(type => {
				if (strongList.some(strong => type.toLowerCase() === strong)) {
					return true;
				} else return false;
			});

			let procDamage = totalDamage;
			if (proxTimes.length > 0) {
				for (let i = 0; i < proxTimes.length; i++) {
					procDamage += procDamage * 0.65;
				}
			}

			const finalProcDamage = procDamage - totalDamage;

			const lineSpacing = 30;
			let currentPosition = 615;

			ctx.fillStyle = 'White';
			// Base Player Damage
			ctx.fillText('Base Player Damage: ' + `${playerDamage}`, 565, currentPosition);
			currentPosition += lineSpacing;

			// Damage modified by Player Class
			ctx.fillText('Player Class Modifier: ' + `${baseModDamage}`, 565, currentPosition);
			currentPosition += lineSpacing;

			// Base Pigmy Damage
			ctx.fillText('Base Pigmy Damage: ' + `${pigmyBaseDamage}`, 565, currentPosition);
			currentPosition += lineSpacing;

			// Additive Pigmy Stat Damage
			ctx.fillText('Additional Pigmy Buff Damage: ' + `${pigmyAddDamage}`, 565, currentPosition);
			currentPosition += lineSpacing;

			// Total Item Damage
			ctx.fillText('Total Item Damage: ' + `${totalDamage}`, 565, currentPosition);
			currentPosition += lineSpacing;

			// Damage modified by Strong Using
			ctx.fillText('Strong Type Increase: ' + `${finalProcDamage}`, 565, currentPosition); //ctx.fillText('Strong Using These Types: ' + strongList.toString(), 565, currentPosition);
			currentPosition += lineSpacing;
			currentPosition += lineSpacing;
			
			// Final Total Damage Dealt 
			const finalDamageDisplay = baseModDamage + totalDamage + pigmyBaseDamage + pigmyAddDamage + finalProcDamage;
			ctx.fillText('Final Total Damage: ' + `${finalDamageDisplay}`, 565, currentPosition);
			currentPosition += lineSpacing;

			// Total Item Defence
			ctx.fillText('Total Item Defence: ' + `${totalDefence}`, 565, currentPosition);

			const attachment = new AttachmentBuilder(await canvas.encode('png'), {name: 'user-display.png'});
			return await interaction.reply({files: [attachment]});
		}

		// NavMenu Testing
		if (subCom === 'menu-test'){
			
			const replyObj = {embeds: [], components: []};

			const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, replyObj, "Reply");

			// =====================
			// BUTTON COLLECTOR
			collector.on('collect', async c => {
				await c.deferUpdate().then(async () => {

				}).catch(e => console.error(e));
			});
			// =====================

			// =====================
			// BUTTON COLLECTOR
			collector.on('end', async (c, r) => {
				if (!r || r === 'time') await handleCatchDelete(anchorMsg);
			});
			// =====================
		} 
	},
};