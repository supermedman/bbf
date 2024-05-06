const { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder} = require('discord.js');

const {checkingDamage} = require('./Export/combatContainer');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('protocombat')
        .setDescription('Combat Prototypes to be tested!!'),

	async execute(interaction) { 
        if (interaction.user.id !== '501177494137995264') return interaction.reply('This command is not available yet!');
	
        const welcomeEmbed = new EmbedBuilder()
        .setTitle('Welcome to the first combat prototype!')
        .setDescription('In this prototype you will be asked to select one of three weapons, with your choosen weapon, fight a number of enemies. They cannot fight back, yet.')
        .setColor('DarkGold');

        // ========================
        // Create Weapon Codes here
        // ========================

        // INFERNO TEST
        // MAGIC, FIRE - 100 Total
        // TYP_MAma:60-FIma:40_typ-r00-DIS_SL_dis-MAslo-100001
        const wepOne = 'TYP_MAma:60-FIma:40_typ-r00-DIS_SL_dis-MAslo-100001';

        // BLAST TEST
        // FROST, FIRE - 100 Total
        // TYP_FRma:50-FIma:50_typ-r00-DIS_SL_dis-MAslo-100001
        const wepTwo = 'TYP_FRma:50-FIma:50_typ-r00-DIS_SL_dis-MAslo-100001';

        // BLEED TEST
        // MAGIC, SLASH - 100 Total
        // TYP_MAma:40-SLph:60_typ-r00-DIS_SL_dis-MAslo-100001
        const wepThree = 'TYP_MAma:40-SLph:60_typ-r00-DIS_SL_dis-MAslo-100001';

        // RANDOM GEN - CAN BE PICKED AFTER ALL THREE ARE TESTED?
        const wepFour = '';

        const weaponList = [wepOne, wepTwo, wepThree];

        let finalFields = [];
        for (const wep of weaponList){
            let fieldName = '', fieldValue = '', fieldObj = {};
            
            fieldName = wep;
            fieldValue = checkingDamage(wep).map(dmgObj => `\nType: ${dmgObj.Type}\nDamage: ${dmgObj.DMG}`).toString();
            
            fieldObj = {name: fieldName, value: fieldValue};
            finalFields.push(fieldObj);
        }

        // ========================
        // Display Weapon stats
        // ========================

        const weaponSelectEmbed = new EmbedBuilder()
        .setTitle('Select a weapon!')
        .setDescription('The weapon you pick will be used for the remainder of this current command usage. You are free to try all three separately!!')
        .addFields(finalFields);

        const filter = (i) => i.user.id === interaction.user.id;

        const acceptButton = new ButtonBuilder()
        .setCustomId('accept-protocomb')
        .setLabel('Start!')
        .setStyle(ButtonStyle.Primary);

        const buttonRow = new ActionRowBuilder().addComponents(acceptButton);

        const welcomeMessage = await interaction.reply({embeds: [welcomeEmbed], components: [buttonRow]});

        const buttCollecter = welcomeMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter,
            time: 120000
        });

        buttCollecter.on('collect', COI => {
            if (COI.customId === 'accept-protocomb'){
                buttCollecter.stop('Accept');
            }
        });
        
        buttCollecter.on('end', (c, reason) => {
            if (reason !== 'Accept') {
                welcomeMessage.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Failed to delete the message:', error);
                    }
                });
            } else {
                // Select weapon here!
            }
        });
    
    },
};