const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('protocraft')
        .setDescription('Prototype crafting interface and command usage.')
        .addStringOption(option =>
            option
            .setName('item-group')
            .setDescription('Select one of the following item groups to continue.')
            .setRequired(true)
            .addChoices(
                {name: 'Magic 1 Handed', value: 'magic1h'},
                {name: 'Magic 2 Handed', value: 'magic2h'},
                {name: 'Melee 1 Handed', value: 'melee1h'},
                {name: 'Melee 2 Handed', value: 'melee2h'},
            )
        )
        .addStringOption(option =>
            option
            .setName('item-type')
            .setDescription('Select one of the following item types to continue.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
            option
            .setName('imbued-mat-1')
            .setDescription('1st Optional PURE material to imbue item with')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
            option
            .setName('imbued-mat-2')
            .setDescription('2nd Optional PURE material to imbue item with')
            .setAutocomplete(true)
        ),
    async autocomplete(interaction){
        const focusedOption = interaction.options.getFocused(true);
        let focusedValue = "";

        let pureMatNames = [];
        if (focusedOption.name === 'imbued-mat-1' || focusedOption.name === 'imbued-mat-2'){
            const pureRegEx = /Pure /;
            const uniqueMatList = require('../../events/Models/json_prefabs/materialLists/uniqueList.json');
            const pureListing = uniqueMatList.filter(mat => mat.Name.search(pureRegEx) !== -1);        
            
            for (const mat of pureListing){
                pureMatNames.push(mat.Name);
            }

            const imbuedMat1 = interaction.options.getString('imbued-mat-1') ?? 'None';
            const imbuedMat2 = interaction.options.getString('imbued-mat-2') ?? 'None';
            if (imbuedMat1 !== 'None' || imbuedMat2 !== 'None'){
                if (imbuedMat1 !== 'None'){
                    pureMatNames.splice(pureMatNames.indexOf(imbuedMat1), 1);
                }
                if (imbuedMat2 !== 'None'){
                    pureMatNames.splice(pureMatNames.indexOf(imbuedMat2), 1);
                }
            }
        }
        

        let choices = [];
        switch(focusedOption.name){
            case "item-type":
                focusedValue = interaction.options.getFocused(false);
                const itemGroup = interaction.options.getString('item-group') ?? 'None';

                switch(itemGroup){
                    case "magic1h":
                        choices = ['Wand', 'Tome'];
                    break;
                    case "magic2h":
                        choices = ['Staff', 'Focus'];
                    break;
                    case "melee1h":
                        choices = ['Light Blade', 'Mace'];
                    break;
                    case "melee2h":
                        choices = ['Polearm', 'Heavy Blade'];
                    break;
                    default:
                        choices = ['None'];
                    break;
                }
            break;
            case "imbued-mat-1":
                focusedValue = interaction.options.getFocused(false);
                choices = pureMatNames;
            break;
            case "imbued-mat-2":
                focusedValue = interaction.options.getFocused(false);
                choices = pureMatNames;
            break;
            default:

            break;
        }

        const filtered = choices.filter(choice => choice.startsWith(focusedValue));
        await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice })),
        );
    },
	async execute(interaction) { 
        if (interaction.user.id !== '501177494137995264') return await interaction.reply({content: 'This command is not for you!', ephemeral: true});
        const startTime = new Date().getTime();
        let endTime;

        const userInputChoices = {
            castePicked: interaction.options.getString('item-type'),
            matsUsed: [],
            imbuedWith: [interaction.options.getString('imbued-mat-1')??'', interaction.options.getString('imbued-mat-2')??'']
        };

        console.log(userInputChoices);

        endTime = new Date().getTime();
        return await interaction.reply(`Command took ${endTime - startTime}ms to complete!`);
	},
};