const { EmbedBuilder } = require('discord.js');

const {
	warnedForm,
	errorForm,
	successResult,
	failureResult,
	basicInfoForm,
	specialInfoForm
} = require('../../../chalkPresets.js');

const { checkUnlockedBluey } = require('./createBlueprint.js');
const { UserData, Pighouse, Pigmy, UniqueCrafted, Loadout } = require('../../../dbObjects.js');

const { checkHintLevelFive, checkHintLevelThirty, checkHintLevelOneHundred } = require('./handleHints.js');

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
	if (!user) {
		//console.log(user);
		uData = await grabU(interaction);
	} else {	
		uData = await UserData.findOne({ where: { userid: user.userid } });
    }
	
	var totalXp = uData.xp + totXP;
	console.log('Current totalXp: ', totalXp);

	totalXp = Math.round(totalXp);

	const curlvl = uData.level;
	console.log('Current level before xp added: ', curlvl);

	totCoin = Math.round(totCoin);

	var nxtLvl = 50 * (Math.pow(uData.level, 2) - 1);

	//Adding temp xp needed change at level 20 to slow proggress for now
	if (uData.level === 20) {
		//Adding level scale to further restrict leveling		
		nxtLvl = 75 * (Math.pow(uData.level, 2) - 1);
	} else if (uData.level >= 100) {
		//Adding level scale to further restrict leveling
		const lvlScale = 10 * (Math.floor(uData.level / 3));
		nxtLvl = (75 + lvlScale) * (Math.pow(uData.level, 2) - 1);
	} else if (uData.level > 20) {
		//Adding level scale to further restrict leveling
		const lvlScale = 1.5 * (Math.floor(uData.level / 5));
		nxtLvl = (75 + lvlScale) * (Math.pow(uData.level, 2) - 1);
	} else { nxtLvl = 50 * (Math.pow(uData.level, 2) - 1);}

	nxtLvl = Math.floor(nxtLvl);

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

			if (newlvl >= 100) {
				await checkHintLevelOneHundred(uData, interaction);		
			} else if (newlvl >= 30) {
				await checkHintLevelThirty(uData, interaction);
			} else if (newlvl >= 5) {
				await checkHintLevelFive(uData, interaction);
            }
			
			

			if (newlvl === 20) {
				//Adding level scale to further restrict leveling		
				nxtLvl = 75 * (Math.pow(newlvl, 2) - 1);
			} else if (newlvl > 20) {
				//Adding level scale to further restrict leveling
				const lvlScale = 1.5 * (Math.floor(newlvl / 5));
				nxtLvl = (75 + lvlScale) * (Math.pow(newlvl, 2) - 1);
			} else { nxtLvl = 50 * (Math.pow((curlvl + i), 2) - 1); }
			
			console.log('Current xp needed to level: ', nxtLvl);

			await checkUnlockedBluey(newlvl, uData.userid, interaction);

			const lvlUpEmbed = new EmbedBuilder()
				.setTitle("LEVEL UP!")
				.setColor(0000)
				.setDescription("You have advanced to the next level, make sure to spend newly earned points!")
				.addFields(
					{ name: "New Level: ", value: ' ' + newlvl + ' ', inline: true },
				);

			interaction.channel.send({ ephemeral: true, embeds: [lvlUpEmbed] }).then(async lvlEmbed => setTimeout(() => {
				lvlEmbed.delete();
			}, 10000)).catch(console.error);

			i++;
        } while (nxtLvl <= totalXp)
	}
	return await editPData(totalXp, newlvl, totCoin, uData);
}

/**
 * 
 * @param {any} interaction
 * @param {any} userRef
 */
async function isUniqueLevelUp(interaction, userRef) {
	let user;
	if (!userRef) {
		user = await grabU(interaction);
	} else {
		user = userRef;
	}

	console.log(basicInfoForm('CHECKING GEAR FOR UNIQUES'));

	const allOwnedCrafted = await UniqueCrafted.findAll({ where: { spec_id: interaction.user.id } });
	if (allOwnedCrafted.length <= 0) return console.log(failureResult('User has no crafted gear'));
	const userLoadout = await Loadout.findOne({ where: { spec_id: user.userid } });
	if (!userLoadout) return console.log(failureResult('User has no loadout'));

	let curGearCheckID;
	let curGearCheckSlot;
	let curRun = 0;
	
		do {
			curGearCheckID = allOwnedCrafted[curRun].loot_id;
			curGearCheckSlot = allOwnedCrafted[curRun].slot.toLowerCase();

			if (userLoadout[`${curGearCheckSlot}`] >= 30000) {
				//Equipped gear is unique Increment kills!
				const grabbedUnique = await UniqueCrafted.findOne({ where: [{ spec_id: user.userid }, { loot_id: curGearCheckID }] });
				if (!grabbedUnique) return console.log(errorForm('Unique item not found after loot id check'));

				var plusOneTotalKills = (grabbedUnique.totalkills + 1);
				await grabbedUnique.update({ totalkills: plusOneTotalKills });

				console.log(basicInfoForm('CHECKING FOR LEVEL UP'));

				let curLvl = grabbedUnique.currentlevel;
				const nxtLvl = 3 * (Math.pow(curLvl, 2));

				var plusOneCurrentKills = (grabbedUnique.killsthislevel + 1);

				if (plusOneCurrentKills >= nxtLvl) {
					//LevelUP!
					console.log(specialInfoForm('IS LEVEL UP!'));
					if (grabbedUnique.Attack > 0) {
						//Is weapon
						const newAttack = (grabbedUnique.Attack + 10);
						plusOneCurrentKills = 0;
						curLvl++;

						await grabbedUnique.update({ killsthislevel: plusOneCurrentKills });
						await grabbedUnique.update({ currentlevel: curLvl });
						await grabbedUnique.update({ Attack: newAttack });

						console.log(successResult('ALL WEAPON VALUES UPDATED!'));
						await interaction.channel.send(`Weapon levelup! ${grabbedUnique.name} is now level ${curLvl}`);
					}
					if (grabbedUnique.Defence > 0) {
						//Is armor
						const newDefence = (grabbedUnique.Defence + 3);
						plusOneCurrentKills = 0;
						curLvl++;

						await grabbedUnique.update({ killsthislevel: plusOneCurrentKills });
						await grabbedUnique.update({ currentlevel: curLvl });
						await grabbedUnique.update({ Defence: newDefence });

						console.log(successResult('ALL ARMOR VALUES UPDATED!'));
						await interaction.channel.send(`Armor levelup! ${grabbedUnique.name} is now level ${curLvl}`);
					}
				} else {
					//Not level up
					console.log(specialInfoForm('IS NOT LEVEL UP!'));
					const updateCheck = await grabbedUnique.update({ killsthislevel: plusOneCurrentKills });
					if (updateCheck > 0) console.log(successResult('No level up, Kills increased'));
				}
			}
			curRun++;
		} while (curRun < allOwnedCrafted.length)	
}

//========================================
//this method is used to update the users points based on whether they have leveled up or not
async function addPoints(uData) {
	await UserData.increment('points', { where: { userid: uData.userid } });
	return;
}

//========================================
//this method is used to update the users xp based on the xp calculated in the display function
async function editPData(totalXp, newlvl, cGained, uData) {
	let totalC = cGained + uData.coins;
	totalC = Math.round(totalC);
	const editC = await UserData.update({ coins: totalC }, { where: { userid: uData.userid } });
	const editLvl = await UserData.update({ level: newlvl }, { where: { userid: uData.userid } });
	const addXp = await UserData.update({ xp: totalXp }, { where: { userid: uData.userid } });

	if (editLvl > 0 && addXp > 0 && editC > 0) {
		return console.log('ALL CHECKS PASSED!');
	} else return console.log('CHECK FAILED, DATA MISSING!');
}

//========================================
//Method for checking if pigmy has leveled up, then handles the outcome accordingly
async function isPigLvlUp(pigXp, pig, interaction, isClaim) {
	var totalXp = pig.exp + pigXp;
	console.log('Current totalXp: ', totalXp);

	const curlvl = pig.level;
	console.log('Current level before xp added: ', curlvl);

	var nxtPigLvl = 50 * (Math.pow(pig.level, 2) - 1);
	console.log('Current Xp Pigmy needs to level: ', nxtPigLvl);

	console.log('xp to next level: ', (nxtPigLvl - totalXp));

	let newlvl = curlvl;
	if (nxtPigLvl <= totalXp) {
		//pigmy has leveled up :)
		var i = 1;
		do {
			totalXp = totalXp - nxtPigLvl;
			newlvl = curlvl + i;

			nxtPigLvl = 50 * (Math.pow((curlvl + i), 2) - 1);
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
			}, 10000)).catch(console.error);
			i++;
		} while (nxtPigLvl <= totalXp)
		
	}
	await editPigOut(pig, newlvl, totalXp, interaction, isClaim);//edit active pigmy values, reset lcm to the time after values have been edited
}

//========================================
//This method updates both the active pigmy and its pighouse counterpart
async function editPigOut(pig, newlvl, totalXp, interaction, isClaim) {
	//await updatePigHouse();//update active pigmies pighouse reference to avoid missing values and lost info
	//Step 1: Edit active pigmy values
	//Step 2: Check that values were changed
	//Step 3: Grab new reference to active pigmy to avoid errors
	//Step 4: Update lcm to new updatedAt value
	//Step 5: Update all needed values in pighouse
	const updateLevel = await Pigmy.update({ level: newlvl }, { where: [{ spec_id: interaction.user.id }, { refid: pig.refid }] });
	const updateXP = await Pigmy.update({ exp: totalXp }, { where: [{ spec_id: interaction.user.id }, { refid: pig.refid }] });

	if (updateLevel > 0 && updateXP > 0) {
		//Level & xp updated
		if (isClaim === true) {
			const updatedPigmy = await Pigmy.findOne({ where: [{ spec_id: interaction.user.id }, { refid: pig.refid }] });
			const lastClaim = new Date(updatedPigmy.updatedAt).getTime();
			const updateClaim = await Pigmy.update({ lcm: lastClaim }, { where: [{ spec_id: interaction.user.id }, { refid: pig.refid }] });

			if (updateClaim > 0) {
				const pigHouseRef = await Pighouse.findOne({ where: [{ spec_id: interaction.user.id }, { refid: pig.refid }] });
				if (!pigHouseRef) return console.log(errorForm('AN ERROR OCCURED: Pighouse Ref NOT FOUND'));
				const updateRefLevel = await Pighouse.update({ level: newlvl }, { where: [{ spec_id: interaction.user.id }, { refid: pig.refid }] });
				const updateRefXP = await Pighouse.update({ exp: totalXp }, { where: [{ spec_id: interaction.user.id }, { refid: pig.refid }] });

				if (updateRefLevel > 0 && updateRefXP > 0) return console.log(successResult('All pigmy values updated SUCCESSFULLY!'));
			}
		} else if (isClaim === false) {
			const pigHouseRef = await Pighouse.findOne({ where: [{ spec_id: interaction.user.id }, { refid: pig.refid }] });
			if (!pigHouseRef) return console.log(errorForm('AN ERROR OCCURED: Pighouse Ref NOT FOUND'));
			const updateRefLevel = await Pighouse.update({ level: newlvl }, { where: [{ spec_id: interaction.user.id }, { refid: pig.refid }] });
			const updateRefXP = await Pighouse.update({ exp: totalXp }, { where: [{ spec_id: interaction.user.id }, { refid: pig.refid }] });

			if (updateRefLevel > 0 && updateRefXP > 0) return console.log(successResult('All pigmy values updated SUCCESSFULLY!'));
		} else {
			const pigHouseRef = await Pighouse.findOne({ where: [{ spec_id: interaction.user.id }, { refid: pig.refid }] });
			if (!pigHouseRef) return console.log(errorForm('AN ERROR OCCURED: Pighouse Ref NOT FOUND'));
			const updateRefLevel = await Pighouse.update({ level: newlvl }, { where: [{ spec_id: interaction.user.id }, { refid: pig.refid }] });
			const updateRefXP = await Pighouse.update({ exp: totalXp }, { where: [{ spec_id: interaction.user.id }, { refid: pig.refid }] });

			if (updateRefLevel > 0 && updateRefXP > 0) return console.log(successResult('All pigmy values updated SUCCESSFULLY!'));
		}
	} else return console.log(errorForm('AN ERROR OCCURED: Pigmy LEVEL OR XP NOT UPDATED!'));
}

module.exports = { isLvlUp, isPigLvlUp, isUniqueLevelUp };
