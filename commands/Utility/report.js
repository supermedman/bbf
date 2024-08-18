const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report an issue with Black Blade!')
    .addSubcommand(subcommand => 
        subcommand
        .setName('exploit')
        .setDescription('Report an exploit found.')
        .addStringOption(option => 
            option
            .setName('title')
            .setDescription('Title of the exploit.')
            .setRequired(true)
            .setMaxLength(45)
        )
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName('bug')
        .setDescription('Report a bug found.')
        .addStringOption(option => 
            option
            .setName('title')
            .setDescription('Title of the bug.')
            .setRequired(true)
            .setMaxLength(45)
        )
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName('spelling')
        .setDescription('Report a spelling mistake.')
        .addStringOption(option => 
            option
            .setName('title')
            .setDescription('Title for the spelling error.')
            .setRequired(true)
            .setMaxLength(45)
        )
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName('other')
        .setDescription('Report an issue with Black Blade.')
        .addStringOption(option => 
            option
            .setName('title')
            .setDescription('Title of the issue.')
            .setRequired(true)
            .setMaxLength(45)
        )
    ),
	async execute(interaction) { 
        //if (interaction.user.id !== '501177494137995264') return await interaction.reply('This command is not available yet!');
        
        const subCom = interaction.options.getSubcommand();

        const modalTitle = interaction.options.getString('title');

        let pHolderVal, pHolderValTwo;
        switch(subCom){
            case "exploit":
                pHolderVal = 'Enter the command name where the exploit is found.';
                pHolderValTwo = 'Describe the steps needed to replicate the exploit, as well as the expected result';
            break;
            case "bug":
                pHolderVal = 'Enter the command name where the bug was found.';
                pHolderValTwo = 'Describe the actions taken when the bug was found, as well as the effects caused by it';
            break;
            case "spelling":
                pHolderVal = 'Enter the command name where there is a spelling mistake.';
                pHolderValTwo = 'Indicate the location of the spelling mistake, along with the corrected spelling';
            break;
            default:
                pHolderVal = 'Please type the nature of your issue here!';
                pHolderValTwo = 'Describe in detail the issue you are experiencing.';
            break;
        }

        const reportModal = new ModalBuilder()
        .setCustomId('modal-report')
        .setTitle(modalTitle);

        const modaFieldOne = new TextInputBuilder()
        .setCustomId('com-location')
        .setLabel('Command Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(pHolderVal)
        .setRequired(true);

        const modaFieldTwo = new TextInputBuilder()
        .setCustomId('issue')
        .setLabel('Describe the issue')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(pHolderValTwo)
        .setRequired(true);

        const inRowOne = new ActionRowBuilder().addComponents(modaFieldOne);
        const inRowTwo = new ActionRowBuilder().addComponents(modaFieldTwo);

        reportModal.addComponents(inRowOne, inRowTwo);

        const modalMsg = await interaction.showModal(reportModal);
    },
};