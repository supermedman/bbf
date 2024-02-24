const { SlashCommandBuilder } = require('discord.js');

const {UserData} = require('../../dbObjects.js');
const lootList = require('../../events/Models/json_prefabs/lootList.json');

const { checkOwned } = require('../Game/exported/createGear.js');
const {handleMaterialAdding} = require('../Game/exported/materialDropper.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cheat')
        .setDescription('Dev Command')
        .addSubcommand(subcommand => 
            subcommand
                .setName('give-item')
                .setDescription('Used to give an item')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('Item ID')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Item Amount'))
                .addUserOption(option => option.setName('target').setDescription('The user')))
        .addSubcommand(subcommand => 
            subcommand
                .setName('give-mat')
                .setDescription('Used to give a material')
                .addStringOption(option =>
                    option.setName('mat-type')
                        .setDescription('The material type to give')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('mat-name')
                        .setDescription('The material to give')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Material Amount'))
                .addUserOption(option => option.setName('target').setDescription('The user'))),
    
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

		let choices = [];

        if (focusedOption.name === 'mat-type'){
            const focusedValue = interaction.options.getFocused(false);
            
            choices = ["slimy", "rocky", "woody", "skinny", "herby", "gemy", "magical", "metalic", "fleshy", "silky", "tooly"];
            
            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
        }

        if (focusedOption.name === 'mat-name'){
            const focusedValue = interaction.options.getFocused(false);

            const matList = require(`../../events/Models/json_prefabs/materialLists/${interaction.options.getString('mat-type')}List.json`) ?? 'None';
            
            if (matList !== 'NONE'){
                for (let Material of matList){
                    choices.push(Material.Name);
                }
            } else choices = ['NONE'];
            
            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
        }
        
    },
	async execute(interaction) { 
        if (interaction.user.id !== '501177494137995264') return await interaction.reply('Nope!');
        
        if (interaction.options.getSubcommand() === 'give-item'){
            const itemID = interaction.options.getInteger('id');
            const amount = interaction.options.getInteger('amount') ?? 1;
            
            const targetUser = interaction.options.getUser('target') ?? interaction.user;

            let filterItem = lootList.filter(item => item.Loot_id === itemID);
            
            filterItem = filterItem[0];
            
            const user = await UserData.findOne({where: {userid: targetUser.id}});
            if (!user) return await interaction.reply(`That user was not found! ${user}`);

            const outcome = await checkOwned(user, filterItem, amount);
            if (outcome === 'Finished') return await interaction.reply(`Item added! ${amount} ${filterItem.Name}`);
        }
        
        if (interaction.options.getSubcommand() === 'give-mat'){
            const matType = interaction.options.getString('mat-type');
            const matName = interaction.options.getString('mat-name');

            const amount = interaction.options.getInteger('amount');

            const targetUser = interaction.options.getUser('target') ?? interaction.user;

            const user = await UserData.findOne({where: {userid: targetUser.id}});
            if (!user) return await interaction.reply(`That user was not found! ${user}`);

            const matList = require(`../../events/Models/json_prefabs/materialLists/${matType}List.json`);
            let theMat = matList.filter(mat => mat.Name === matName);
            theMat = theMat[0];

            const addedMaterial = await handleMaterialAdding(theMat, amount, user, matType);
            if (addedMaterial.name !== theMat.Name) return await interaction.reply('Something went wrong adding that material!');
            return await interaction.reply(`${amount} ${addedMaterial.name} added!`);
        }
    },
};