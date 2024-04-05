const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

const { UserData, UniqueCrafted, Loadout, Pigmy } = require('../../dbObjects.js');

const {findChestSlot, findHelmSlot, findLegSlot, findMainHand, findOffHand, findPotion} = require('../Game/exported/findLoadout.js');
const {userDamageLoadout} = require('../Game/exported/dealDamage.js');

const Canvas = require('@napi-rs/canvas');

const { grabColour } = require('../Game/exported/grabRar.js');
const { pigmyTypeStats } = require('../Game/exported/handlePigmyDamage.js');

const lootList = require('../../events/Models/json_prefabs/lootList.json');
const uniqueLootList = require('../../events/Models/json_prefabs/uniqueLootList.json');

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
		.setName('inspect')
        .setDescription('What exactly are you swinging around?')
        .addStringOption(option =>
            option.setName('style')
                .setDescription('Old or New Inspect?')
                .setRequired(true)
                .setChoices(
                    {name: "Old", value: "oldView"},
                    {name: "New", value: "newView"}))
        .addUserOption(option => option.setName('player').setDescription('The user')),

    async execute(interaction) {
        //Turn this into an image
        // Show loadout as character with plugnplay equipment

        if (interaction.options.getString('style') === 'newView'){
            const theUser = interaction.options.getUser('player') ?? interaction.user;

            const canvas = Canvas.createCanvas(1000, 1000);
            const ctx = canvas.getContext('2d');

            const uiMenu = await preLoadImages(UI);

            const userLoadout = await Loadout.findOne({where: {spec_id: theUser.id}});
            let equippedGear = [userLoadout.headslot, userLoadout.chestslot, userLoadout.legslot, userLoadout.offhand, userLoadout.mainhand];
            equippedGear = await loadLoadout(theUser.id, equippedGear);

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

            const user = await UserData.findOne({where: {userid: theUser.id}});
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
        } else if (interaction.options.getString('style') === 'oldView'){
            await interaction.deferReply();

            const currentLoadout = await Loadout.findOne({ where: { spec_id: interaction.user.id } });
            if (!currentLoadout) return interaction.followUp('You have not equipped anything yet! Use ``/equip < Loadout-Slot > < Item-Name >`` to equip something, dont forget to start the word with a CAPITAL LETTER!');

            //User has items equipped
            var headSlotItem = await findHelmSlot(currentLoadout.headslot, interaction.user.id);
            var chestSlotItem = await findChestSlot(currentLoadout.chestslot, interaction.user.id);
            var legSlotItem = await findLegSlot(currentLoadout.legslot, interaction.user.id);
            var mainHandItem = await findMainHand(currentLoadout.mainhand, interaction.user.id);
            var offHandItem = await findOffHand(currentLoadout.offhand, interaction.user.id);
            var equippedPotion = await findPotion(currentLoadout.potionone, interaction.user.id);

            let headUnique = true;
            if (headSlotItem.Value) headUnique = false;

            let chestUnique = true;
            if (chestSlotItem.Value) chestUnique = false;

            let legsUnique = true;
            if (legSlotItem.Value) legsUnique = false;

            let mainHandUnique = true;
            if (mainHandItem.Value) mainHandUnique = false;

            let offHandUnique = true;
            if (offHandItem.Value) offHandUnique = false;

            var headSlotEmbed;
            var headSlotColour;

            var chestSlotEmbed;
            var chestSlotColour;

            var legSlotEmbed;
            var legSlotColour;

            var mainHandEmbed;
            var mainHandColour;

            var offHandEmbed;
            var offHandColour;

            var potionEmbed;

            let totalDefence = 0;
            var defenceEmbed;

            var damageEmbed;

            let filesNeeded = [];
            let mainhandFile = [];

            if (headSlotItem === 'NONE') {
                //No item equipped
                var list = `Nothing to see here`;
                headSlotEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: 'No Helm equipped', value: list, });
            } else {
                //Item found add defence
                let list;
                let killList;
                let headName;
                if (headUnique === true) {
                    killList = `Total Kills: **${headSlotItem.totalkills}** \nKills this level: **${headSlotItem.killsthislevel}**`;
                    list = (`\nValue: **${headSlotItem.value}**c \nRarity: **${headSlotItem.rarity}** \nDefence: **${headSlotItem.Defence}** \nType: **${headSlotItem.Type}** \nSlot: **${headSlotItem.slot}** \nLevel: **${headSlotItem.currentlevel}** \n${killList}`);
                    headSlotColour = await grabColour(headSlotItem.rar_id);
                    headName = `**${headSlotItem.name}**`;
                } else {
                    list = (`\nValue: **${headSlotItem.Value}**c \nRarity: **${headSlotItem.Rarity}** \nDefence: **${headSlotItem.Defence}** \nType: **${headSlotItem.Type}** \nSlot: **${headSlotItem.Slot}**`);
                    headSlotColour = await grabColour(headSlotItem.Rar_id);
                    headName = `**${headSlotItem.Name}**`;
                }

                const helmFile = new AttachmentBuilder(`./events/Models/json_prefabs/weapon_png/Temp-Weapon-Types/Helm-Placeholder.png`);
                const helmPng = `attachment://Helm-Placeholder.png`;
                filesNeeded.push(helmFile);
                    
                headSlotEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setThumbnail(helmPng)
                    .setColor(headSlotColour)
                    .addFields(
                        {
                            name: (`${headName}`),
                            value: list,

                        });
                totalDefence += headSlotItem.Defence;
            }

            if (chestSlotItem === 'NONE') {
                //No item equipped
                var list = `Nothing to see here`;
                chestSlotEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: 'No Chestplate equipped', value: list, });
            } else {
                //Item found add it
                let list;
                let killList;
                let chestName;
                if (chestUnique === true) {
                    killList = `Total Kills: **${chestSlotItem.totalkills}** \nKills this level: **${chestSlotItem.killsthislevel}**`;
                    list = (`\nValue: **${chestSlotItem.value}**c \nRarity: **${chestSlotItem.rarity}** \nDefence: **${chestSlotItem.Defence}** \nType: **${chestSlotItem.Type}** \nSlot: **${chestSlotItem.slot}** \nLevel: **${chestSlotItem.currentlevel}** \n${killList}`);
                    chestSlotColour = await grabColour(chestSlotItem.rar_id);
                    chestName = `**${chestSlotItem.name}**`;
                } else {
                    list = (`\nValue: **${chestSlotItem.Value}**c \nRarity: **${chestSlotItem.Rarity}** \nDefence: **${chestSlotItem.Defence}** \nType: **${chestSlotItem.Type}** \nSlot: **${chestSlotItem.Slot}**`);
                    chestSlotColour = await grabColour(chestSlotItem.Rar_id);
                    chestName = `**${chestSlotItem.Name}**`;
                }

                const chestFile = new AttachmentBuilder(`./events/Models/json_prefabs/weapon_png/Temp-Weapon-Types/Chest-Placeholder.png`);
                const chestPng = `attachment://Chest-Placeholder.png`;
                filesNeeded.push(chestFile);

                chestSlotEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setThumbnail(chestPng)
                    .setColor(chestSlotColour)
                    .addFields(
                        {
                            name: (`${chestName}`),
                            value: list,

                        });
                totalDefence += chestSlotItem.Defence;
            }

            if (legSlotItem === 'NONE') {
                //No item equipped
                var list = `Nothing to see here`;
                legSlotEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: 'No Leggings equipped', value: list, });
            } else {
                //Item found add it
                let list;
                let killList;
                let legsName;
                if (legsUnique === true) {
                    killList = `Total Kills: **${legSlotItem.totalkills}** \nKills this level: **${legSlotItem.killsthislevel}**`;
                    list = (`\nValue: **${legSlotItem.value}**c \nRarity: **${legSlotItem.rarity}** \nDefence: **${legSlotItem.Defence}** \nType: **${legSlotItem.Type}** \nSlot: **${legSlotItem.slot}** \nLevel: **${legSlotItem.currentlevel}** \n${killList}`);
                    legSlotColour = await grabColour(legSlotItem.rar_id);
                    legsName = `**${legSlotItem.name}**`;
                } else {
                    list = (`\nValue: **${legSlotItem.Value}**c \nRarity: **${legSlotItem.Rarity}** \nDefence: **${legSlotItem.Defence}** \nType: **${legSlotItem.Type}** \nSlot: **${legSlotItem.Slot}**`);
                    legSlotColour = await grabColour(legSlotItem.Rar_id);
                    legsName = `**${legSlotItem.Name}**`;
                }

                const legsFile = new AttachmentBuilder(`./events/Models/json_prefabs/weapon_png/Temp-Weapon-Types/Legs-Placeholder.png`);
                const legsPng = `attachment://Legs-Placeholder.png`;
                filesNeeded.push(legsFile);

                legSlotEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setThumbnail(legsPng)
                    .setColor(legSlotColour)
                    .addFields(
                        {
                            name: (`${legsName}`),
                            value: list,

                        });
                totalDefence += legSlotItem.Defence;
            }

            if (offHandItem === 'NONE') {
                var list = 'Nothing to see here';
                offHandEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: 'No offhand equipped', value: list, });
            } else {
                if (currentLoadout.mainhand === currentLoadout.offhand) {
                    //TWO HANDED WEAPON EQUIPPED!
                    var list;
                    if (mainHandUnique === true) {
                        list = `${mainHandItem.name} is taking this spot!`;
                    } else {
                        list = `${mainHandItem.Name} is taking this spot!`;
                    }
                    offHandEmbed = new EmbedBuilder()
                        .setTitle('MAINHAND TAKES TWO HANDS')
                        .addFields({ name: 'Offhand full', value: list, });
                } else {
                    let list;
                    let killList;
                    let offHandName;
                    if (offHandUnique === true) {
                        killList = `Total Kills: **${offHandItem.totalkills}** \nKills this level: **${offHandItem.killsthislevel}**`;
                        list = (`\nValue: **${offHandItem.value}c** \nRarity: **${offHandItem.rarity}** \nAttack: **${offHandItem.Attack}** \nDefence: **${offHandItem.Defence}** \nType: **${offHandItem.Type}** \nSlot: **${offHandItem.slot}** \nLevel: **${offHandItem.currentlevel}** \n${killList}`);
                        offHandColour = await grabColour(offHandItem.rar_id, false);
                        offHandName = `**${offHandItem.name}**`;                       
                    } else {
                        list = (`\nValue: **${offHandItem.Value}c** \nRarity: **${offHandItem.Rarity}** \nAttack: **${offHandItem.Attack}**\nDefence: **${offHandItem.Defence}** \nType: **${offHandItem.Type}** \nSlot: **${offHandItem.Slot}**`);
                        offHandColour = await grabColour(offHandItem.Rar_id, false);
                        offHandName = `**${offHandItem.Name}**`;             
                    }

                    const offHandFile = new AttachmentBuilder(`./events/Models/json_prefabs/weapon_png/Temp-Weapon-Types/Offhand-Placeholder.png`);
                    const offHandPng = `attachment://Offhand-Placeholder.png`;
                    filesNeeded.push(offHandFile);

                    offHandEmbed = new EmbedBuilder()
                        .setTitle('CURRENTLY EQUIPPED')
                        .setThumbnail(offHandPng)
                        .setColor(offHandColour)
                        .addFields(
                            {
                                name: (`${offHandName}`),
                                value: list,

                            });
                    totalDefence += offHandItem.Defence;
                }
            }

            if (totalDefence === 0) {
                var list = `No armor, no defence`;
                defenceEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: 'Nothing equipped', value: list, });
            } else {
                var list = `${totalDefence}`;
                defenceEmbed = new EmbedBuilder()
                    .setTitle('ARMOR EQUIPPED')
                    .addFields({ name: 'Total Defence from Armor:', value: list, });
            }

            if (equippedPotion === 'NONE' || equippedPotion === 'HASNONE') {
                var list = `Nothing to see here`;
                var name;
                if (equippedPotion === 'NONE') name = 'No potion equipped';
                if (equippedPotion === 'HASNONE') name = 'No potions remaining';
                potionEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: name, value: list, });
            } else {
                var list = `Value: ${equippedPotion.value}\nType: ${equippedPotion.activecategory}\nDuration: ${equippedPotion.duration}\nCooldown: ${equippedPotion.cooldown}\nCurrent Amount: ${equippedPotion.amount}`;
                var potName = `Name: ${equippedPotion.name}`;

                potionEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setColor(0o0)
                    .addFields(
                        {
                            name: (`${potName}`),
                            value: list,

                        });
            }

            await interaction.followUp({ embeds: [headSlotEmbed, chestSlotEmbed, legSlotEmbed, offHandEmbed, defenceEmbed, potionEmbed], files: filesNeeded });

            if (mainHandItem === 'NONE') {
                //No item equipped
                var list = `Nothing to see here`;
                mainHandEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: 'No mainhand equipped', value: list, });

                damageEmbed = new EmbedBuilder()
                    .setTitle('NOTHING EQUIPPED')
                    .addFields({ name: 'No mainhand equipped', value: list, });

            } else {
                //Item found add it
                let list;
                let killList;
                let mainHandName;
                let mainHandRarity;
                if (mainHandUnique === true) {
                    killList = `Total Kills: **${mainHandItem.totalkills}** \nKills this level: **${mainHandItem.killsthislevel}**`;
                    list = (`\nValue: **${mainHandItem.value}c** \nRarity: **${mainHandItem.rarity}** \nAttack: **${mainHandItem.Attack}** \nType: **${mainHandItem.Type}** \nSlot: **${mainHandItem.slot}** \nHands: **${mainHandItem.hands}** \nLevel: **${mainHandItem.currentlevel}** \n${killList}`);
                    mainHandColour = await grabColour(mainHandItem.rar_id);
                    mainHandName = `**${mainHandItem.name}**`;
                    mainHandRarity = `*${mainHandItem.rarity}*`;
                } else {
                    list = (`\nValue: **${mainHandItem.Value}c** \nRarity: **${mainHandItem.Rarity}** \nAttack: **${mainHandItem.Attack}** \nType: **${mainHandItem.Type}** \nSlot: **${mainHandItem.Slot}** \nHands: **${mainHandItem.Hands}**`);
                    mainHandColour = await grabColour(mainHandItem.Rar_id);
                    mainHandName = `**${mainHandItem.Name}**`;
                    mainHandRarity = `*${mainHandItem.Rarity}*`;
                }

                const mainHandFile = new AttachmentBuilder(`./events/Models/json_prefabs/weapon_png/Temp-Weapon-Types/Mainhand-Placeholder.png`);
                const mainHandPng = `attachment://Mainhand-Placeholder.png`;
                mainhandFile.push(mainHandFile);

                mainHandEmbed = new EmbedBuilder()
                    .setTitle('CURRENTLY EQUIPPED')
                    .setThumbnail(mainHandPng)
                    .setColor(mainHandColour)
                    .addFields(
                        {
                            name: (`${mainHandName}`),
                            value: list,

                        });

                const uData = await UserData.findOne({ where: { userid: interaction.user.id } });

                let offHandComp;
                if (offHandItem !== 'NONE') offHandComp = offHandItem;
                const weapondmgmod = await userDamageLoadout(uData, mainHandItem, offHandComp);
                console.log(weapondmgmod);

                list = (`Total damage dealt before defence calculations: \n${weapondmgmod}`);
                damageEmbed = new EmbedBuilder()
                    .setTitle(`${mainHandName}`)
                    .setColor(mainHandColour)
                    .addFields(
                        {
                            name: (`${mainHandRarity}`),
                            value: list

                        });
            }

            return await interaction.followUp({ embeds: [mainHandEmbed, damageEmbed], files: mainhandFile });
        }
	},

};
