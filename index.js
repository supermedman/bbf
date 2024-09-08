// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

// Create a new client instance
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
	]
});

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

//=============================
//TO DO:
// - KILL COUNT ON ENEMY INFO PAGE
//
// - TOTAL ENEMIES KILLED
//
// - MAKE A BEASTIARY
//
// - SHEILDS 
//
// - FULL AND FLESHED COMBAT 
//
// - PIGMY TYPE EFFECTS LOOT AND OTHER DROP RELATED CALCULATIONS
//
//=============================


client.commands = new Collection();

client.cooldowns = new Collection();

//client.activeCombats = new Collection();

//client.gcooldowns = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

console.log(commandFolders);

for (const folder of commandFolders){
	const commandsPath = path.join(foldersPath, folder);//access commands folder as directory
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));//searches for any file within this dir ending with .js (being a javascript file)

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const enemyList = require('./events/Models/json_prefabs/enemyList.json');

client.enemies = new Collection();

for (const enemy of enemyList) {
	if ('ConstKey' in enemy && 'Level' in enemy) {
		client.enemies.set(enemy.ConstKey, enemy.Level);
	} else {
		console.log(`[WARNING] Enemy ${enemy.Name} is missing required "ConstKey" or "Level" property.`);
    }
}

const lootList = require('./events/Models/json_prefabs/lootList.json');
//const uniLootList = require('./events/Models/json_prefabs/uniqueLootList.json');

//const fullList = lootList.concat(uniLootList);

client.gearDrops = new Collection();

for (const gear of lootList) {
	if ('Loot_id' in gear && 'Rar_id' in gear) {
		if (gear.Loot_id !== 10000 && gear.Rar_id !== 12 || 11) {
			client.gearDrops.set(gear.Loot_id, gear.Rar_id);
		}
	} else console.log(`[WARNING] Gear ${gear.Name} is missing required "Loot_id" or "Rar_id" property.`);
}

// Will be removed.
client.materialFiles = new Collection();

const materialPath = path.join(__dirname, 'events/Models/json_prefabs/materialLists');
const foundMatFiles = fs.readdirSync(materialPath).filter(file => file.endsWith('.json'));

for (const matFile of foundMatFiles){
	let matType = matFile.split('L');
	let matPath = `${materialPath}/${matFile}`;

	client.materialFiles.set(matType[0], matPath);
}

// Will be used in place of `client.materialFiles` in the future for all material related actions
client.materials = new Collection();

for (const matFile of foundMatFiles){
	const matPath = `${materialPath}/${matFile}`;
	const matFileType = matFile.split('List')[0];

	const matRefList = require(matPath);
	const matRefDataList = [];
	for (const matRef of matRefList){
		matRefDataList.push(matRef);
	}

	matRefDataList.sort((a,b) => a.Mat_id - b.Mat_id);
	client.materials.set(matFileType, matRefDataList);
}


// Setup Blueprint Cache data
client.masterBPCrafts = new Collection();
client.masterBPEffects = new Collection();

const fullBPList = require('./commands/Development/Export/Json/bpUpdateList.json');
(() => {
	// {"Type": "Potion", "Cat": object[]}
	const masterPotionList = fullBPList.filter(list => list.Type === "Potion")[0].Cat;
	/**
	 * a: {
	 * 		"Active": "PotionType",
	 * 		"SubCat": [
	 * 			{
	 * 				"Active": "Craft",
	 *				"List": object[ {"Name": ""}, ... ]
	 *			},
	 *			{
	 *				"Active": "Effect",
	 *				"List": object[ {"Name": ""}, ... ]
	 *			}
	 *		]
	 *	}
	 */
	for (const a of masterPotionList){
		const craftSubCat = a.SubCat[0].List;
		for (const cBP of craftSubCat){
			client.masterBPCrafts.set(cBP.Name, cBP);
		}
		const effectSubCat = a.SubCat[1].List;
		for (const eff of effectSubCat){
			const eTMod = eff;
			eTMod.Type = a.Active;
			client.masterBPEffects.set(eff.Name, eTMod);
		}
	}
	// {"Type": "Tool", "Cat": object[]}
	const masterToolList = fullBPList.filter(list => list.Type === "Tool")[0].Cat;
	/**
	 * a: {
	 * 		"Active": "ToolTarget",
	 * 		"SubCat": [
	 * 			{
	 * 				"Active": "TargetType",
	 *				"List": object[ {"Name": ""}, ... ],
	 *				"Effect": object[ {"Name": ""}, ... ]
	 *			},
	 *			// ...
	 *		]
	 *	}
	 */
	for (const a of masterToolList){
		const toolSubCat = a.SubCat;
		for (const tSubC of toolSubCat){
			const craftTSubC = tSubC.List;
			if (craftTSubC.length === 0 || !craftTSubC) continue;
			for (const cBP of craftTSubC){
				client.masterBPCrafts.set(cBP.Name, cBP);
			}

			const effTSubC = tSubC.Effect;
			if (effTSubC.length === 0 || !effTSubC) continue;
			for (const eff of effTSubC){
				const eTMod = eff;
				eTMod.Type = a.Active;
				eTMod.SubType = tSubC.Active;
				client.masterBPEffects.set(eff.Name, eTMod);
			}
		}
	}

	//console.log('BP Craft Master List Size: %d', client.masterBPCrafts.size);
	//console.log('BP Effect Master List Size: %d', client.masterBPEffects.size);
})();


client.newEnemy = new Collection();
client.betaTester = new Collection();

client.combatInstance = new Collection();
client.dungeonInstance = new Collection();

//client.on('unhandledRejection', error => {
//	console.error('Unhandled promise rejection:', error);
//});

//client.on(`${RESTJSONErrorCodes.UnknownMessage}`, error => {
//	console.error('Unknown Message Error:', error);
//});

process.on("unhandledRejection", async (err) => {
	console.error("Unhandled Promise Rejection:\n", err);
});
process.on("uncaughtException", async (err) => {
	console.error("Uncaught Promise Exception:\n", err);
});
process.on("uncaughtExceptionMonitor", async (err) => {
	console.error("Uncaught Promise Exception (Monitor):\n", err);
});
//process.on("multipleResolves", async (type, promise, reason) => {
//	console.error("Multiple Resolves:\n", type, promise, reason);
//});

// Log in to Discord with your client's token
client.login(token);
