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

client.activeCombats = new Collection();

//client.gcooldowns = new Collection();

const commandsPath = path.join(__dirname, 'commands');//access commands folder as directory
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
