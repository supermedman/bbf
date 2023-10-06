const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { GuildData, ActiveEnemy, UserData } = require('../dbObjects.js');
const { loadEnemy } = require('../commands/exported/loadEnemy.js');

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
async function grabU(collectedUser) {
	uData = await UserData.findOne({ where: { userid: collectedUser } });
	if (!uData) return message.followUp(`No User Data.. Please use the \`/start\` command to select a class and begin your adventure!!`);
	return uData;
}

async function enemyGrabbed(user) {
	await loadEnemy();
}

async function handleSpawn(message) {
	//Use User ID to check for active enemies!
	const interactiveButtons = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setLabel("Fight!")
				.setStyle(ButtonStyle.Success)
				.setEmoji('⚔')
				.setCustomId('accept'),
		);
	const enemySpawnEmbed = new EmbedBuilder()
		.setColor('DarkButNotBlack')
		.setTitle('An enemy appears!')
		.addFields(
			{
				name: `Who dares?`,
				value: `Select fight to test your might!`,

			})
	await message.guild.channel.send({ components: [interactiveButtons], embeds: [enemySpawnEmbed] }).then(async embedMsg => {
		const collectorBut = embedMsg.createMessageComponentCollector({ componentType: ComponentType.Button, ammount: 1, time: 120000 });

		collectorBut.on('collect', async i => {
			const collectedUser = i.user.id;		
				if (i.customId === 'accept') {
					//user has selected enemy to fight!
					//handle enemy spawn here
					const enemyFound = await ActiveEnemy.findOne({ where: { specid: collectedUser } });

					if (enemyFound) {
						//enemy was found, sort and select from enemies!
					} else {
						const user = await grabU(collectedUser);
						await enemyGrabbed(user);
                    }
                }	
		});
	}); 
}

module.exports = { enemyGrabbed, handleSpawn };