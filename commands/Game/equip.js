const { SlashCommandBuilder } = require('discord.js');
const { errorForm, basicInfoForm } = require('../../chalkPresets.js');
const { LootStore, Loadout, UniqueCrafted, OwnedPotions, ItemStrings } = require('../../dbObjects.js');
const { checkingSlot, checkingCaste } = require('../Development/Export/itemStringCore.js');

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
            } else {
                const fullItemList = await ItemStrings.findAll({
                    where: {
                        user_id: interaction.user.id
                    }
                });

                items = fullItemList.filter(item => checkingSlot(item.item_code) === gearType);
            }

            choices = items.map(item => item.name);

            console.log(basicInfoForm(`Current Choices: ${choices} for ${gearType}s`));

            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
            await interaction.respond(
                filtered.map(choice => ({ name: choice, value: choice })),
            );
        }
	},
    async execute(interaction) {

        await interaction.deferReply();

        const slotType = interaction.options.getString('slot');
        const itemName = interaction.options.getString('gear') ?? "None";
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
            theItem = filteredItemList.filter(item => item.name === itemName)[0];
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

        switch(slotType){
            case "Mainhand":
                // Check for hands needed to hold weapon
                const handCheck = checkingCaste(theItem.caste_id);
                if (handCheck.Hands === 2){
                    // 2 handed weapon
                    let overwriteCheck = false;
                    if (userLoad.offhand !== 0 && userLoad.offhand !== userLoad.mainhand) overwriteCheck = true;
                    
                    await userLoad.update({
                        mainhand: theItem.item_id,
                        offhand: theItem.item_id
                    }).then(async u => await u.save()).then(async u => {return await u.reload()});
                    
                    const replyMsg = (overwriteCheck) ? "Mainhand equipped, offhand replaced and unavailable.": "Mainhand equipped, offhand unavailable.";

                    return await interaction.followUp(replyMsg);
                } 
                // 1 handed weapon
                let offhandEmpty = false;
                if (userLoad.offhand === 0 || userLoad.offhand === userLoad.mainhand) offhandEmpty = true;

                await userLoad.update({
                    mainhand: theItem.item_id,
                    offhand: (offhandEmpty) ? 0 : userLoad.offhand
                }).then(async u => await u.save()).then(async u => {return await u.reload()});

                const replyMsg = (offhandEmpty) ? "Mainhand equipped, offhand available.": "Mainhand equipped.";
            return await interaction.followUp(replyMsg);
            case "Offhand":
                if (userLoad.offhand === userLoad.mainhand) return await interaction.followUp('Offhand slot taking up by Mainhand weapon!');
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

        /*
        const startTime = new Date().getTime();
        await interaction.deferReply().then(async () => {
            if (interaction.options.getSubcommand() === 'something') {
                let slotType = interaction.options.getString('slot');
                const itemName = interaction.options.getString('gear') ?? 'NONE';
                if (itemName === 'NONE') return interaction.followUp('You did not select an item to equip!');

                const userID = interaction.user.id;

                let item;
                if (slotType !== 'Potion' && slotType !== 'Unique') {
                    console.log('NORMAL');
                    item = await LootStore.findOne({
                        where: [
                            { spec_id: userID },
                            { name: itemName }]
                    });
                } else if (slotType === 'Unique') {
                    console.log('UNIQUE');
                    item = await UniqueCrafted.findOne({
                        where: [
                            { spec_id: userID },
                            { name: itemName }]
                    });
                } else {
                    console.log('POTION');
                    item = await OwnedPotions.findOne({
                        where: [
                            { spec_id: userID },
                            { name: itemName }]
                    });
                }

                let userLoadout = await Loadout.findOne({ where: { spec_id: userID } });
                if (!userLoadout) {
                    userLoadout = await Loadout.create({
                        spec_id: userID
                    });
                }

                if (!item) return interaction.followUp('Looks like that didnt work! Try starting the name with a ***CAPITAL LETTER***');

                if (slotType === 'Unique') slotType = item.slot;

                if (slotType === 'Mainhand') {
                    //MAINHAND EQUIPPED
                    console.log(item);
                    if (!item.hands) return interaction.followUp('That item has an invalid hands value!!');
                    let offhandReplaced = false;
                    if (item.hands === 'Two') {
                        //TWO HANDED WEAPON EQUIPPED
                        if (userLoadout.offhand !== 0) offhandReplaced = true;
                        const tableUpdate = await Loadout.update({
                            mainhand: item.loot_id,
                            offhand: item.loot_id,
                        }, { where: { spec_id: userID } });
                        if (tableUpdate > 0 && offhandReplaced === true) return interaction.followUp('Mainhand equipped! Offhand replaced!');
                        if (tableUpdate > 0) return interaction.followUp('Mainhand equipped!');
                    } else {
                        //ONE HANDED WEAPON EQUIPPED
                        if (userLoadout.mainhand === userLoadout.offhand) offhandReplaced = true;
                        let tableUpdate;
                        if (offhandReplaced === true) {
                            tableUpdate = await Loadout.update({
                                mainhand: item.loot_id,
                                offhand: 0
                            }, { where: { spec_id: userID } });
                            if (tableUpdate > 0) return interaction.followUp('Mainhand equipped! Offhand available!');
                        } 
                        tableUpdate = await Loadout.update({
                            mainhand: item.loot_id
                        }, { where: { spec_id: userID } });
                        if (tableUpdate > 0) return interaction.followUp('Mainhand equipped!');
                    }
                } else if (slotType === 'Offhand') {
                    //OFFHAND EQUIPPED
                    console.log(item);
                    if (!item.hands) return interaction.followUp('That item has an invalid hands value!!');
                    let canEquipOff = false;
                    if (userLoadout.mainhand !== userLoadout.offhand) canEquipOff = true;
                    if (canEquipOff === false) return interaction.followUp('You cannot equip an Offhand as your weapon takes up two hands');
                    const tableUpdate = await Loadout.update({
                        offhand: item.loot_id
                    }, { where: { spec_id: userID } });
                    if (tableUpdate > 0) return interaction.followUp('Offhand Equipped!');
                } else if (slotType === 'Potion') {
                    //POTION EQUIPPED
                    console.log(item);
                    const tableUpdate = await Loadout.update({
                        potionone: item.potion_id
                    }, { where: { spec_id: userID } });
                    if (tableUpdate > 0) return interaction.followUp('Potion Equipped Successfully!');
                } else {
                    //ARMOR EQUIPPED
                    console.log(item);
                    let tableUpdate;
                    if (slotType === 'Headslot') {
                        tableUpdate = await Loadout.update({
                            headslot: item.loot_id
                        }, { where: { spec_id: userID } });
                    }
                    if (slotType === 'Chestslot') {
                        tableUpdate = await Loadout.update({
                            chestslot: item.loot_id
                        }, { where: { spec_id: userID } });
                    }
                    if (slotType === 'Legslot') {
                        tableUpdate = await Loadout.update({
                            legslot: item.loot_id
                        }, { where: { spec_id: userID } });
                    }
                    if (tableUpdate > 0) return interaction.followUp(`${slotType} Equipped!!`);
                }

                const endTime = new Date().getTime();
                console.log(`Diff between start: ${startTime}/${endTime} :End..\n   ${(startTime - endTime)}`);
            }            
        }).catch(error => {
            console.log(errorForm('Interaction error:', error));
        });
        */
	},

};
