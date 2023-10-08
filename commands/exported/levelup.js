const { EmbedBuilder } = require('discord.js');
const { UserData, Pighouse, Pigmy } = require('../../dbObjects.js');

//========================================
//basic user data refrence method
async function grabU(interaction) {
	uData = await UserData.findOne({ where: { userid: interaction.user.id } });
	return uData;
}

//========================================
//Method for checking if a level up has occured for the user
async function isLvlUp(totXP, totCoin, interaction, user) {
	//console.log(interaction);
	var uData;
	if (user) {
		//console.log(user);
		uData = await UserData.findOne({ where: { userid: user.userid } });
	} else {
		uData = await grabU(interaction);
    }
	
	var totalXp = uData.xp + totXP;
	console.log('Current totalXp: ', totalXp);

	const curlvl = uData.level;
	console.log('Current level before xp added: ', curlvl);

	var nxtLvl = 50 * (Math.pow(uData.level, 2) - 1);

	//Adding temp xp needed change at level 20 to slow proggress for now
	if (uData.level = 20) {
		//Adding level scale to further restrict leveling		
		nxtLvl = 75 * (Math.pow(uData.level, 2) - 1);
	} else if (uData.level > 20) {
		//Adding level scale to further restrict leveling
		const lvlScale = 1.5 * (Math.floor(uData.level / 5));
		nxtLvl = (75 + lvlScale) * (Math.pow(uData.level, 2) - 1);
	} else {/*DO NOTHING*/}

	console.log('Current xp needed to level: ', nxtLvl);
	console.log('xp to next level: ', (nxtLvl - totalXp));

	let newlvl = curlvl;

	if (nxtLvl <= totalXp) {
		//player has leveled up
		//Check if player can level up more than once
		var i = 1;
		do {
			totalXp = totalXp - nxtLvl;
			newlvl = curlvl + i;
			addPoints(uData);
			console.log('Current level after xp added ', newlvl);

			if (uData.level = 20) {
				//Adding level scale to further restrict leveling		
				nxtLvl = 75 * (Math.pow(uData.level, 2) - 1);
			} else if (uData.level > 20) {
				//Adding level scale to further restrict leveling
				const lvlScale = 1.5 * (Math.floor(uData.level / 5));
				nxtLvl = (75 + lvlScale) * (Math.pow(uData.level, 2) - 1);
			} else { nxtLvl = 50 * (Math.pow((curlvl + i), 2) - 1); }
			
			console.log('Current xp needed to level: ', nxtLvl);

			const lvlUpEmbed = new EmbedBuilder()
				.setTitle("LEVEL UP!")
				.setColor(0000)
				.setDescription("You have advanced to the next level, make sure to spend newly earned points!")
				.addFields(
					{ name: "New Level: ", value: ' ' + newlvl + ' ', inline: true },
				);

			interaction.channel.send({ ephemeral: true, embeds: [lvlUpEmbed] }).then(async lvlEmbed => setTimeout(() => {
				lvlEmbed.delete();
			}, 10000));

			i++;
        } while (nxtLvl <= totalXp)
	}
	return await editPData(totalXp, newlvl, totCoin, uData);
}


//========================================
//this method is used to update the users points based on whether they have leveled up or not
async function addPoints(uData) {
	await UserData.increment('points', { where: { username: uData.username } });
	return;
}

//========================================
//this method is used to update the users xp based on the xp calculated in the display function
async function editPData(totalXp, newlvl, cGained, uData) {
	const editC = await UserData.increment({ coins: cGained }, { where: { username: uData.username } });
	const editLvl = await UserData.update({ level: newlvl }, { where: { username: uData.username } });
	const addXp = await UserData.update({ xp: totalXp }, { where: { username: uData.username } });

	if (editLvl > 0 && addXp > 0 && editC > 0) {
		return console.log('ALL CHECKS PASSED!');
	} else return console.log('CHECK FAILED, DATA MISSING!');
}

//========================================
//Method for checking if pigmy has leveled up, then handles the outcome accordingly
async function isPigLvlUp(pigXp, pig, interaction) {
	var totalXp = pig.exp + pigXp;
	console.log('Current totalXp: ', totalXp);

	const curlvl = pig.level;
	console.log('Current level before xp added: ', curlvl);

	var nxtPigLvl = 60 * (Math.pow(pig.level, 2) - 1);
	console.log('Current Xp Pigmy needs to level: ', nxtPigLvl);

	console.log('xp to next level: ', (nxtPigLvl - totalXp));

	var newlvl = curlvl;
	if (nxtPigLvl <= totalXp) {
		//pigmy has leveled up :)
		var i = 1;
		do {
			totalXp = totalXp - nxtPigLvl;
			newlvl = curlvl + i;

			nxtPigLvl = 60 * (Math.pow((curlvl + i), 2) - 1);
			console.log('Current Xp Pigmy needs to level: ', nxtPigLvl);

			const isDes = `${pig.name} has just leveled up!`;

			const lvlUpEmbed = new EmbedBuilder()
				.setTitle("PIGMY LEVEL UP!")
				.setColor(0000)
				.setDescription(isDes)
				.addFields(
					{ name: "New Level: ", value: ' ' + newlvl + ' ', inline: true },
				);

			interaction.channel.send({ ephemeral: true, embeds: [lvlUpEmbed] }).then(async lvlEmbed => setTimeout(() => {
				lvlEmbed.delete();
			}, 10000));
			i++;
		} while (nxtPigLvl <= totalXp)
		
	}
	return await editPigOut(pig, newlvl, totalXp, interaction);//edit active pigmy values, reset lcm to the time after values have been edited
}

//========================================
//This method updates both the active pigmy and its pighouse counterpart
async function editPigOut(pig, newlvl, totalXp, interaction) {
	//await updatePigHouse();//update active pigmies pighouse reference to avoid missing values and lost info
	//Step 1: Edit active pigmy values
	//Step 2: Check that values were changed
	//Step 3: Grab new reference to active pigmy to avoid errors
	//Step 4: Update lcm to new updatedAt value
	//Step 5: Update all needed values in pighouse
	if (pig.spec_id !== interaction.user.id) {
		const pigID = interaction.user.id;
		const editlvl = await Pigmy.update({ level: newlvl }, { where: { spec_id: pigID } });
		const editXp = await Pigmy.update({ exp: totalXp }, { where: { spec_id: pigID } });

		if (editlvl > 0 && editXp > 0) {
			console.log('editPigOut() Check #1: \nPASSED');
			const ePig = await Pigmy.findOne({ where: [{ spec_id: interaction.user.id }] });
			if (ePig) {
				console.log('editPigOut() Check #2: \nPASSED');
				const lastClaim = new Date(ePig.updatedAt).getTime();
				const claimMade = await Pigmy.update({ lcm: lastClaim }, { where: { spec_id: pigID } });
				if (claimMade > 0) {
					console.log('editPigOut() Check #3: \nPASSED');
					const pigIn = await Pighouse.findOne({ where: { spec_id: interaction.user.id, refid: ePig.refid } });
					if (pigIn) {
						console.log('editPigOut() Check #4: \nPASSED');
						const editHlvl = await Pighouse.update({ level: newlvl }, { where: { spec_id: pigID, refid: pigIn.refid } });
						const editHXp = await Pighouse.update({ exp: totalXp }, { where: { spec_id: pigID, refid: pigIn.refid } });
						if (editHlvl && editHXp) return console.log('editPigOut() Check #5: \nPASSED');
					}
					console.log('editPigOut() Check #4: \nFAILED');
				}
				console.log('editPigOut() Check #3: \nFAILED');
			}
			console.log('editPigOut() Check #2: \nFAILED');
		}
		return console.log('Something went wrong while updating pigmy values!');
	}
}

module.exports = { isLvlUp, isPigLvlUp };
