const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { GuildData, UserData } = require('../dbObjects.js');
const { loadEnemy } = require('../commands/exported/loadEnemy.js');
const wait = require('node:timers/promises').setTimeout;

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
 * @param {any} message STATIC MESSAGE OBJECT
 */
//This method grabs user data when no default spawn channel is active
async function grabUM(collectedUser, message) {
	uData = await UserData.findOne({ where: { userid: collectedUser } });
	if (!uData) return message.channel.send(`No User Data.. Please use the \`/start\` command to select a class and begin your adventure!!`);
	return uData;
}

/**
 * 
 * @param {any} collectedUser ID STRING
 * @param {any} channel STATIC CHANNEL OBJECT
 */
//This method grabs user data when default spawn channel is active
async function grabUC(collectedUser, channel) {
	uData = await UserData.findOne({ where: { userid: collectedUser } });
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
	console.log(theGuild);
	try {
		if (theGuild) {
			//guild exists!
			if (theGuild.spawnchannel === '0') {
				//no spawn channel found, procceed as normal

				const embedMsg = await message.channel.send({ components: [interactiveButtons], embeds: [enemySpawnEmbed] });

				const collector = embedMsg.createMessageComponentCollector({
					componentType: ComponentType.Button,
					max: 1,
					time: 120000,
				});

				collector.on('collect', async (collInteract) => {
					const collectedUser = collInteract.user.id;
					if (collInteract === 'accept') {
						const user = await grabUM(collectedUser, message);
						if (user) {
							await enemyGrabbed(message, user);
						}
						await collInteract.deferUpdate();
						interactiveButtons.components[0].setDisabled(true);

						await collInteract.editReply({ components: [interactiveButtons] });
						wait(2000).then(async () => {
							await collector.stop();
						});
					}
				});

				collector.on('end', () => {
					if (embedMsg) {
						embedMsg.delete();
					}
				});			
			} else {
				//spawn channel found, check if it exists
				let channel = await message.guild.channels.fetch(`${theGuild.spawnchannel}`);

				const embedMsg = await channel.send({ components: [interactiveButtons], embeds: [enemySpawnEmbed] });

				const collector = embedMsg.createMessageComponentCollector({
					componentType: ComponentType.Button,
					max: 1,
					time: 120000,
				});

				collector.on('collect', async (collInteract) => {
					const collectedUser = collInteract.user.id;
					const interaction = collInteract;
					if (collInteract.customId === 'accept') {
						//user has chosen to fight!					
						const user = await grabUC(collectedUser, channel);
						if (user) {
							await enemyGrabbed(interaction, user);
						}
						await collInteract.deferUpdate();
						interactiveButtons.components[0].setDisabled(true);

						await collInteract.editReply({ components: [interactiveButtons] });
						wait(2000).then(async () => {
							await collector.stop();
						});
					}
				});

				collector.on('end', () => {
					if (embedMsg) {
						embedMsg.delete();
					}
				});				
			}
		}
	} catch (err) {
		console.error('An error has occured', err);
	}
}

module.exports = { enemyGrabbed, handleSpawn };
