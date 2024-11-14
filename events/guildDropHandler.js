const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { GuildData, UserData } = require('../dbObjects.js');
const { loadEnemy } = require('../commands/Game/exported/loadEnemy.js');
const { grabUser } = require('../uniHelperFunctions.js');
const wait = require('node:timers/promises').setTimeout;
const {handleExterCombat} = require('../commands/Game/exported/combatDisplay.js');

//Refrence from messageCreate event Allowing smooth handling of enemies!

/**
 *  Main handler for guild specific enemy spawning
 *
 *  Checks for active enemies, spawns new if not found
 *
 *  Returns any enemy grabbed for further combat used
 *
 *                  ===== Exports { enemyGrabbed, handleSpawn } =====
 * */

/**    Guild cache handler storage and managment script
 *    - First store each guild the bot is active in
 *    - Use those ids as the primary keys
 *    - Store a default spawn channel, default to any until done
 *    - Store an 'xp' value, allowing aysnc thread handling for spawns 
 *    - Can now use guildID in place of userID when storing enemies by specID
 *    - If all else fails default specID to guildID. It just works - Tod Howard
 *    - 10-25xp per nonbot Message per 1 minute
 *    - MaxXP = 
 *    if (guild.users.cache => 1000){500}
 *    if (guild.users.cache < 1000){250} 
 *    
 *    - @ maxXP enemy spawns in:
 *    if (defaultChannel) {spawnE(channelID)}
 *    if (defaultChannel!) {spawnE("channel with last message sent")}
 *    
 *    Prompt user with "Fight" button option
 *    - Upon being clicked by a user, grab userID for all further ID checks as normal
 *    - If user falls in combat or escapes from combat alter specID to guildID put into the grab pool
 *    - When spawning an enemy first check for any active enemies with the current guilds ID
 *    - If found check for multiple, if multiple pick rand, if only one spawn it
 *    
 *    
 * */

/**
 * 
 * @param {any} collectedUser ID STRING
 * @param {any} interaction STATIC Interaction OBJECT
 */
//This method grabs user data when no default spawn channel is active
async function grabUM(collectedUser, interaction) {
	let uData = await UserData.findOne({ where: { userid: collectedUser } });
	if (!uData) return interaction.channel.send(`No User Data.. Please use the \`/start\` command to select a class and begin your adventure!!`);
	return uData;
}

/**
 * 
 * @param {any} collectedUser ID STRING
 * @param {any} channel STATIC CHANNEL OBJECT
 */
//This method grabs user data when default spawn channel is active
async function grabUC(collectedUser, channel) {
	let uData = await UserData.findOne({ where: { userid: collectedUser } });
	if (!uData) return channel.send(`No User Data.. Please use the \`/start\` command to select a class and begin your adventure!!`);
	return uData;
}

/**
 * 
 * @param {any} interaction STATIC INTERACTION OBJECT
 * @param {any} user OBJECT: User data reference 
 */
//This method passes the interaction object and the invokers user data object into the enemy loading command
async function enemyGrabbed(interaction, user) {
	await loadEnemy(interaction, user);
}


async function handleXPSpawn(message, spawnChannelID){
	let spawnLocation;
	try {
		spawnLocation = (spawnChannelID === '0') ? message.channel : await message.guild.channels.fetch(spawnChannelID);
	} catch(e) {
		if (e.code !== 10003) console.error('Channel Not found!', e);
		return;
	}

	const fightButton = new ButtonBuilder()
	.setLabel("Fight!")
	.setStyle(ButtonStyle.Success)
	.setEmoji('⚔')
	.setCustomId('accept');

	const buttRow = new ActionRowBuilder().addComponents(fightButton);

	const spawnEmbed = new EmbedBuilder()
	.setColor('DarkButNotBlack')
	.setTitle('An enemy appears!')
	.addFields({
		name: `Who dares?`,
		value: `Select fight to test your might!`,
	});

	const anchorMsg = await spawnLocation.send({embeds: [spawnEmbed], components: [buttRow]});

	const collector = anchorMsg.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: 120000,
	});


	collector.on('collect', async c => {
		await c.deferUpdate().then(async () => {
			if (c.customId === 'accept'){
				const userID = c.user.id;
				const interaction = c;

				const user = await grabUser(userID);
				if (!user) return await c.followUp({content: 'No user found! Please use ``/start`` to create a profile!', ephemeral: true});
				buttRow.components[0].setDisabled(true);
				await anchorMsg.edit({components: [buttRow]});

				await handleExterCombat(interaction); // combatDisplay.js

				await collector.stop('Fight');
			}
		}).catch(e => console.error(e));	
	});

	collector.on('end', (c, r) => {
		anchorMsg.delete().catch(error => {
			if (error.code !== 10008) {
				console.error('Failed to delete the message:', error);
			}
		});
	});

}


/**
 * 
 * @param {any} message STATIC MESSAGE OBJECT
 */
//This method handles guild channel spawning as well as user data acquisition
async function handleSpawn(message) {
	//Use User ID to check for active enemies!

	const fightButton = new ButtonBuilder()
		.setLabel("Fight!")
		.setStyle(ButtonStyle.Success)
		.setEmoji('⚔')
		.setCustomId('accept');

	const interactiveButtons = new ActionRowBuilder().addComponents(fightButton);

	const enemySpawnEmbed = new EmbedBuilder()
		.setColor('DarkButNotBlack')
		.setTitle('An enemy appears!')
		.addFields(
			{
				name: `Who dares?`,
				value: `Select fight to test your might!`,

			});

	//Send Enemy spawn to correct default channel, otherwise default to channel where message was last sent!
	const theGuild = await GuildData.findOne({ where: { guildid: message.guild.id } });
	
	console.log(theGuild.guildid);
	
	try {
		if (theGuild) {
			//guild exists!
			if (theGuild.spawnchannel === '0') {
				//no spawn channel found, procceed as normal

				const embedMsg = await message.channel.send({ components: [interactiveButtons], embeds: [enemySpawnEmbed] });

				const collector = embedMsg.createMessageComponentCollector({
					componentType: ComponentType.Button,
					time: 120000,
				});

				collector.on('collect', async (collInteract) => {
					const collectedUser = collInteract.user.id;
					const interaction = collInteract;
					if (collInteract.customId === 'accept') {
						const user = await grabUM(collectedUser, interaction);

						await collInteract.deferUpdate();

						if (user) {
							console.log('Trying to spawn enemy, no spawn channel found!');
							await enemyGrabbed(interaction, user);
						}

						interactiveButtons.components[0].setDisabled(true);

						await collInteract.editReply({ components: [interactiveButtons] });
						wait(2000).then(async () => {
							await collector.stop();
						});
					}
				});

				collector.on('end', () => {
					if (embedMsg) {
						embedMsg.delete().catch(error => {
							if (error.code !== 10008) {
								console.error('Failed to delete the message:', error);
							}
						});
					}
				});			
			} else {
				//spawn channel found, check if it exists
				let channel = await message.guild.channels.fetch(`${theGuild.spawnchannel}`);

				const embedMsg = await channel.send({ components: [interactiveButtons], embeds: [enemySpawnEmbed] });

				const collector = embedMsg.createMessageComponentCollector({
					componentType: ComponentType.Button,
					time: 120000,
				});

				collector.on('collect', async (collInteract) => {
					const collectedUser = collInteract.user.id;
					const interaction = collInteract;
					if (collInteract.customId === 'accept') {
						//user has chosen to fight!					
						await collInteract.deferUpdate();

						const user = await grabUC(collectedUser, channel);
						if (user) {
							console.log('Trying to spawn enemy, spawn channel found!');
							await enemyGrabbed(interaction, user);
						}
						
						interactiveButtons.components[0].setDisabled(true);

						await collInteract.editReply({ components: [interactiveButtons] });
						wait(2000).then(async () => {
							await collector.stop();
						});
					}
				});

				collector.on('end', () => {
					if (embedMsg) {
						embedMsg.delete().catch(error => {
							if (error.code !== 10008) {
								console.error('Failed to delete the message:', error);
							}
						});
					}
				});				
			}
		}
	} catch (err) {
		console.error('An error has occured', err);
	}
}

module.exports = { enemyGrabbed, handleSpawn, handleXPSpawn };
