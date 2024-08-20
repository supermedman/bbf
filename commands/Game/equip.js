const { SlashCommandBuilder } = require('discord.js');
const { errorForm, basicInfoForm } = require('../../chalkPresets.js');
const { LootStore, Loadout, UniqueCrafted, OwnedPotions, ItemStrings } = require('../../dbObjects.js');
const { checkingSlot, checkingCaste, checkingDamage, checkingDefence } = require('../Development/Export/itemStringCore.js');
const { checkHintInspect } = require('./exported/handleHints.js');
const { grabUser } = require('../../uniHelperFunctions.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('equip')
        .setDescription('What will you arm yourself with?')
        .addSubcommand(subcommand => 
            subcommand
                .setName('something')
                .setDescription('Equip a gear piece, includes all slots!')
                .addStringOption(option =>
                    option.setName('slot')
                        .setDescription('Item Slot to equip')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Weapon', value: 'Mainhand' },
                            { name: 'Helm', value: 'Headslot' },
                            { name: 'Chestpiece', value: 'Chestslot' },
                            { name: 'Legwear', value: 'Legslot' },
                            { name: 'Offhand', value: 'Offhand' },
                            { name: 'Potion', value: 'Potion' },
                            { name: 'Unique', value: 'Unique' },
                    ))
                .addStringOption(option =>
                    option.setName('gear')
                        .setDescription('Gear to equip')
                        .setAutocomplete(true)
                        .setRequired(true))),
	async autocomplete(interaction) {
		//Focused option is assigned to what the user is inputting as the paramaters for what option to select from
		const focusedOption = interaction.options.getFocused(true);
		//FIGURE OUT HOW TO MAP CURRENT INVENTORY ITEMS AS THE OPTIONS FOR SELECTING

        let choices = [];

        if (focusedOption.name === 'gear') {
            const focusedValue = interaction.options.getFocused(false);
            let gearType = interaction.options.getString('slot') ?? 'NONE';

            let items;

            if (gearType === "Potion" || gearType === "Unique"){
                if (gearType === "Unique"){
                    // Not Working yet!
                    items = await UniqueCrafted.findAll({
                        where: { spec_id: interaction.user.id }
                    });
                } else {
                    items = await OwnedPotions.findAll({
                        where: { spec_id: interaction.user.id }
                    });
                }                

                choices = items.map(item => item.name);
            } else {
                const fullItemList = await ItemStrings.findAll({
                    where: {
                        user_id: interaction.user.id
                    }
                });

                // Filter Items for picked slot type
                items = fullItemList.filter(item => checkingSlot(item.item_code) === gearType);
                
                // ====================
                // HANDLE CRAFTED ITEMS
                // ====================
                // Check for dupe names
                const checkStrongest = [];
                for (const i of items){
                    if (!checkStrongest.includes(i.name)) checkStrongest.push(i.name);
                }

                const strongestRef = [], singlesRef = [];
                if (checkStrongest.length !== items.length){
                    // DUPE ITEMS FOUND
                    for (const name of checkStrongest){
                        const singleNameCheck = items.filter(item => item.name === name);
                        // If name contains only one entry
                        if (singleNameCheck.length === 1){
                            // Shorten display for .splice() position
                            const updatedOffset = checkStrongest.indexOf(singleNameCheck[0].name);
                            // Remove from "Dupe" checking array, Add to singles list
                            checkStrongest.splice(updatedOffset, 1, "");
                            singlesRef.push(singleNameCheck[0]);
                            // console.log(singlesRef);
                            continue;
                        }
                        
                        let theStrongest;
                        // Loop through dupes
                        let curStrongDMG = 0, curStrongDEF = 0, curStrongTot = 0;
                        for (const dupe of singleNameCheck){
                            let checkStrongDMG = 0, checkStrongDEF = 0, checkStrongTot = 0;
                            //if (!theStrongest) {theStrongest = dupe; continue;}
                            switch(gearType){
                                case "Mainhand":
                                    if (!theStrongest){
                                        theStrongest = dupe;
                                        curStrongDMG = checkingDamage(dupe.item_code).reduce((acc, obj) => {
                                            return (acc > 0) ? acc + obj.DMG : obj.DMG;
                                        }, 0);
                                    } else {
                                        checkStrongDMG = checkingDamage(dupe.item_code).reduce((acc, obj) => {
                                            return (acc > 0) ? acc + obj.DMG : obj.DMG;
                                        }, 0);
                                        if (checkStrongDMG > curStrongDMG) theStrongest = dupe;
                                    }
                                break;
                                case "Offhand":
                                    if (!theStrongest){
                                        theStrongest = dupe;
                                        curStrongDMG = checkingDamage(dupe.item_code).reduce((acc, obj) => {
                                            return (acc > 0) ? acc + obj.DMG : obj.DMG;
                                        }, 0);
                                        curStrongDEF = checkingDefence(dupe.item_code).reduce((acc, obj) => {
                                            return (acc > 0) ? acc + obj.DEF : obj.DEF;
                                        }, 0);
                                        curStrongTot = curStrongDMG + curStrongDEF;
                                    } else {
                                        checkStrongDMG = checkingDamage(dupe.item_code).reduce((acc, obj) => {
                                            return (acc > 0) ? acc + obj.DMG : obj.DMG;
                                        }, 0);
                                        checkStrongDEF = checkingDefence(dupe.item_code).reduce((acc, obj) => {
                                            return (acc > 0) ? acc + obj.DEF : obj.DEF;
                                        }, 0);
                                        checkStrongTot = checkStrongDMG + checkStrongDEF;
                                        if (checkStrongTot > curStrongTot) theStrongest = dupe;
                                    }
                                break;
                                default:
                                    if (!theStrongest){
                                        theStrongest = dupe;
                                        curStrongDEF = checkingDefence(dupe.item_code).reduce((acc, obj) => {
                                            return (acc > 0) ? acc + obj.DEF : obj.DEF;
                                        }, 0);
                                    } else {
                                        checkStrongDEF = checkingDefence(dupe.item_code).reduce((acc, obj) => {
                                            return (acc > 0) ? acc + obj.DEF : obj.DEF;
                                        }, 0);
                                        if (checkStrongDEF > curStrongDEF) theStrongest = dupe;
                                    }
                                break;
                            }
                        }

                        // Push item ref and Value used to determine strength
                        strongestRef.push({
                            item: theStrongest.dataValues,
                            showStrong: true,
                            totValue: (curStrongTot !== 0) ? `${curStrongTot} DMG/DEF` 
                            : (curStrongDMG !== 0) 
                            ? `${curStrongDMG} DMG` : `${curStrongDEF} DEF`
                        });
                    }
                } else choices = items.map(item => item.name);

                // If no choices exist yet, create them
                if (choices.length === 0){
                    // Set default choices to non-dupe name items
                    let finalItemsList = singlesRef.map(i => ({item: i.dataValues, showStrong: false, dupeValue: false}));
                    finalItemsList.sort((a, b) => a.item.name - b.item.name);
                    // Sorted alphabetically
                    checkStrongest.sort((a, b) => a - b);
                    // Filter out empty names
                    const finalStrongest = checkStrongest.filter(n => n !== '');

                    // console.log(finalStrongest);
                    // console.log(strongestRef);

                    for (const name of finalStrongest){
                        const strongForName = strongestRef.filter(refObj => refObj.item.name === name)[0];
                        const nameMatches = items.filter(item => item.name === name);
                        let curNameList = [];
                        for (const i of nameMatches){
                            if (i.item_id === strongForName.item.item_id){
                                // Strongest Matched, Append to start of array
                                curNameList.unshift({item: i, showStrong: true, dupeValue: true, totValue: strongForName.totValue});
                            } else curNameList.push({item: i, showStrong: false, dupeValue: true,});
                        }
                        finalItemsList = finalItemsList.concat(curNameList);
                    }

                    const displayStrongItems = (ele) => {
                        if (ele.showStrong) {
                            // name used for user indicating strongest, and DMG/DEF tot value
                            // nValue used for passing into ``execute()``
                            choices.push({name: ele.item.name, nValue: ele.item.name, passValue: `{"name": "${ele.item.name}", "id": "${ele.item.item_id}"}`, strongest: ele.showStrong, strength: ele.totValue});
                            // console.log(ele);
                        }
                        if (!ele.showStrong && ele.dupeValue) {
                            // name used for user indicating strongest, and DMG/DEF tot value
                            // nValue used for passing into ``execute()``
                            choices.push({name: ele.item.name, nValue: ele.item.name, passValue: `{"name": "${ele.item.name}", "id": "${ele.item.item_id}"}`, strongest: ele.showStrong});
                            // console.log('Standard Display: ', ele.item.name);
                        }
                        if (!ele.showStrong && !ele.dupeValue) {
                            choices.push({name: ele.item.name, nValue: ele.item.name, passValue: ele.item.name, strongest: ele.showStrong});
                        }
                    };

                    finalItemsList.forEach(displayStrongItems);
                }                
            }

            // Check if choice list has been modded
            if (!choices[0].name){
                // Standard choice list, display normally
                // console.log(basicInfoForm(`Current Choices: ${choices} for ${gearType}s`));
                console.log('Standard Choice List');

                const filtered = choices.filter(choice => choice.startsWith(focusedValue));
                await interaction.respond(
                    filtered.map(choice => ({ name: choice, value: choice })),
                );
            } else {
                // Modded choice list, handle special display
                // console.log(basicInfoForm(`Current Choices: \n${choices.map(obj => `Name: ${obj.name}, Value: ${obj.nValue}, Strongest?: ${obj.strongest} ${(obj.strength) ? `Strength: ${obj.strength}\n`: "\n"}`).join("")}`));
                console.log('Modded Choice List');

                const filtered = choices.filter(choice => choice.nValue.startsWith(focusedValue));
                await interaction.respond(
                    filtered.map(choice => (
                        {
                            name: (choice.strongest) ? `${choice.name} == STRONGEST == ${choice.strength}`: `${choice.name}`,
                            value: choice.passValue
                        }
                    )),
                );
            }
        }
	},
    async execute(interaction) {

        await interaction.deferReply();

        const slotType = interaction.options.getString('slot');
        //const itemName = interaction.options.getString('gear') ?? "None";
        let itemCheck = interaction.options.getString('gear');
        // Try catch to handle invalid JSON when passed value is correct string
        try {
            itemCheck = JSON.parse(itemCheck);
        } catch (e){}

        let itemName, checkForID = false;
        if (typeof itemCheck !== 'string'){
            itemName = itemCheck.name;
            checkForID = itemCheck.id;
        } else itemName = itemCheck;
        if (itemName === 'None') return interaction.followUp('You did not select an item to equip!');
        
        let userLoad = await Loadout.findOrCreate({
            where: {
                spec_id: interaction.user.id
            }
        });

        if (userLoad[1]){
            await userLoad[0].save().then(async u => {return await u.reload()});
        }

        userLoad = userLoad[0];

        let theItem;
        if (slotType !== "Potion" && slotType !== "Unique"){
            // Normal Gear picked!
            const fullItemList = await ItemStrings.findAll({
                where: {
                    user_id: interaction.user.id
                }
            });

            const filteredItemList = fullItemList.filter(item => checkingSlot(item.item_code) === slotType);
            theItem = (checkForID) 
            ? filteredItemList.filter(item => item.name === itemName && item.item_id === checkForID)[0] : filteredItemList.filter(item => item.name === itemName)[0];
        } else {
            if (slotType === 'Unique') return interaction.followUp('This is not yet possible! Please check back later!');
            theItem = await OwnedPotions.findOne({where: {
                spec_id: interaction.user.id,
                name: itemName
            }});

            await userLoad.update({
                potionone: theItem.potion_id
            }).then(async u => await u.save()).then(async u => {return await u.reload()});

            return await interaction.followUp(`Potion Updated! ${theItem.name} equipped!`);
        }

        if (!theItem) return await interaction.followUp('Looks like that didnt work! Try starting the items name with a *Capital Letter*, then select from the options provided!!');

        await checkHintInspect(await grabUser(interaction.user.id), interaction);

        switch(slotType){
            case "Mainhand":
                // Check for hands needed to hold weapon
                const handCheck = checkingCaste(theItem.caste_id);
                if (handCheck.Hands === 2){
                    // 2 handed weapon
                    let overwriteCheck = false;
                    if (userLoad.offhand !== '0' && userLoad.offhand !== userLoad.mainhand) overwriteCheck = true;
                    
                    await userLoad.update({
                        mainhand: theItem.item_id,
                        offhand: theItem.item_id
                    }).then(async u => await u.save()).then(async u => {return await u.reload()});
                    
                    const replyMsg = (overwriteCheck) ? "Mainhand equipped, offhand replaced and unavailable.": "Mainhand equipped, offhand unavailable.";

                    return await interaction.followUp(replyMsg);
                } 
                // 1 handed weapon
                let offhandEmpty = false;
                if (userLoad.offhand === '0' || userLoad.offhand === userLoad.mainhand) offhandEmpty = true;

                await userLoad.update({
                    mainhand: theItem.item_id,
                    offhand: (offhandEmpty) ? 0 : userLoad.offhand
                }).then(async u => await u.save()).then(async u => {return await u.reload()});

                const replyMsg = (offhandEmpty) ? "Mainhand equipped, offhand available.": "Mainhand equipped.";
            return await interaction.followUp(replyMsg);
            case "Offhand":
                if (userLoad.offhand === userLoad.mainhand && userLoad.mainhand !== 0) return await interaction.followUp('Offhand slot taken up by Mainhand weapon!');
                await userLoad.update({
                    offhand: theItem.item_id
                }).then(async u => await u.save()).then(async u => {return await u.reload()});
            return await interaction.followUp("Offhand equipped.");
            default:
                await userLoad.update({
                    [`${slotType.toLowerCase()}`]: theItem.item_id
                }).then(async u => await u.save()).then(async u => {return await u.reload()});
            return await interaction.followUp(`${slotType} equipped.`);
        }
	},

};
