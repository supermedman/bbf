const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const {chlkPreset} = require('../../chalkPresets');

const {
    itemGenCaste, 
    itemGenDmgTypes, 
    itemGenPickDmgTypes, 
    rarityGenConstant, 
    itemGenDmgConstant,
    dmgTypeAmountGen,
    itemValueGenConstant,
    createNewItemCode,
    extractName,
    checkingRar,
    checkingSlot
} = require('./Export/craftingContainer');
const { grabColour } = require('../Game/exported/grabRar');

const inclusiveRandNum = (max, min) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

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
        if (interaction.user.id === '501177494137995264' || interaction.user.id === '544114963346620417') {} else{
            return await interaction.reply({content: 'This command is not for you!', ephemeral: true});
        }
        const startTime = new Date().getTime();
        let endTime;

        const makeCapital = (str) => { return str.charAt(0).toUpperCase() + str.slice(1) };

        // Obtain and format Imbued Materials selected 
        let imbuedMat1 = interaction.options.getString('imbued-mat-1') ?? 'Pure ';
        imbuedMat1 = imbuedMat1.split(' ');
        imbuedMat1 = makeCapital(imbuedMat1[1].toLowerCase());

        let imbuedMat2 = interaction.options.getString('imbued-mat-2') ?? 'Pure ';
        imbuedMat2 = imbuedMat2.split(' ');
        imbuedMat2 = makeCapital(imbuedMat2[1].toLowerCase());

        // Load array with mats containing either Type or ''
        const imbuedWith = [imbuedMat1, imbuedMat2];
        const userInputChoices = {
            castePicked: interaction.options.getString('item-type'),
            matsNeeded: [],
            imbuedWith: imbuedWith.filter(imbue => imbue.length > 0) // Filter for only non-empty strings
        };

        // Create the base item casteObj
        const casteObj = itemGenCaste(userInputChoices.castePicked);
        userInputChoices.matsNeeded = casteObj.mats;

        // Creating dmgOptions as a prop and assigning possible dmg Types as value
        casteObj.dmgOptions = itemGenDmgTypes(casteObj);

        // Creating dmgTypes as a prop, checking for "Imbued" PURE types before rolling amount of dmg types
        casteObj.dmgTypes = userInputChoices.imbuedWith;

        // Load the selected damage types from the dmgOptions contained within casteObj
        casteObj.dmgTypes = casteObj.dmgTypes.concat(itemGenPickDmgTypes(casteObj));

        // This is used later, needed for carry over damage multiplying against overflow when not enough unique damage types
        casteObj.totalTypes = casteObj.dmgTypes.length + casteObj.typeOverflow;
        delete casteObj.dmgOptions;

        // Loading material files for use in next section during display
        const {materialFiles} = interaction.client;
        const matListRefs = [];
        for (const matRef of casteObj.mats){
            for (const [key, value] of materialFiles){
                if (key === matRef.toLowerCase()){
                    matListRefs.push({matKey: matRef, file: value});
                    break;
                }
            }
        }

        // Create Display Embed
        const selectMenuEmbed = new EmbedBuilder()
        .setTitle('Material Selection Menu')
        .setColor('Blue')
        .setDescription('Please select materials in each catagory to craft an item with them!');

        // Array of actionRows containing stringSelectMenus one for each material type
        // Options loaded with materials from the preloaded materialList files
        const selectMenuActionRows = [];
        for (let i = 0; i < 4; i++){
            const stringSelectOptionList = [];
            const matFile = require(matListRefs[i].file);
            matFile.sort((a, b) => a.Rar_id - b.Rar_id);
            for (const mat of matFile){
                // Load each material, into option
                const option = new StringSelectMenuOptionBuilder()
                .setLabel(mat.Name)
                .setDescription(matListRefs[i].matKey + ' At Rarity: ' + mat.Rarity)
                .setValue(mat.Name);
                stringSelectOptionList.push(option);
            }
            const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`material-${i}`)
            .setPlaceholder('Select a material!')
            .addOptions(stringSelectOptionList);

            const selectRow = new ActionRowBuilder().addComponents(selectMenu);
            selectMenuActionRows.push(selectRow);
        }

        //console.log(userInputChoices);
        //console.log(casteObj);

        const embedMsgObj = await interaction.reply({
            embeds: [selectMenuEmbed],
            components: [selectMenuActionRows[0]]
        });

        const filter = (i) => i.user.id === interaction.user.id;

        const mSCollecter = embedMsgObj.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter,
            time: 240000
        });

        const materialChoices = [];
        let materialStep = 0;
        mSCollecter.on('collect', async iCS => {
            materialStep++; // Increase step before index use to check for OUT OF BOUNDS
            //console.log(iCS.values);
            materialChoices.push(iCS.values[0]);

            if (materialStep === 4) return mSCollecter.stop('Finished');
            // Prevent interaction failed from displaying before materials have been selected
            await iCS.deferUpdate().then(async () => {
                embedMsgObj.edit({components: [selectMenuActionRows[materialStep]]})
            });
        });

        mSCollecter.on('end', async (c, r) => {
            //console.log(r);
            if (r !== 'Finished'){
                return embedMsgObj.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Failed to delete the message:', error);
                    }
                });
            }

            await embedMsgObj.delete().catch(error => {
                if (error.code !== 10008) {
                    console.error('Failed to delete the message:', error);
                }
            });

            const waitCraftEmbed = new EmbedBuilder()
            .setTitle('Crafting IN PROGRESS')
            .setColor('DarkGreen')
            .setDescription('Please hold while the item is crafted!!');

            const followUpCrafting = await interaction.followUp({embeds: [waitCraftEmbed]});
            
            // materialChoices should be filled by this point
            const materialList = [];
            const materialAmounts = [15, 10, 5, inclusiveRandNum(20, 0)];
            let curPos = 0, matTotal = 0, rarValPairs = [];
            for (const matName of materialChoices){
                // Obtain material ref from associated file ref
                const matFile = require(matListRefs[curPos].file);
                const matRef = matFile.filter(mat => mat.Name === matName);
                
                //console.log(matRef[0]);

                // Create rarValPairs for value generation later
                rarValPairs.push({rar: matRef[0].Rar_id, val: matRef[0].Value});
                matTotal += materialAmounts[curPos]; // acc total material amount for damage generation

                // Create material Object for use with Rarity generation
                // Required props {rarity: number, amount: number}
                const matObj = {
                    name: matName,
                    rarity: matRef[0].Rar_id,
                    amount: materialAmounts[curPos]
                };
                materialList.push(matObj); // Push final object to material list
                curPos++;
            }

            const rarPicked = rarityGenConstant(materialList[0], materialList[1], materialList[2], materialList[3]);
            const itemMaxTypeDamage = itemGenDmgConstant(rarPicked, casteObj.totalTypes, casteObj.hands, matTotal);
            
            casteObj.rarity = rarPicked;
            casteObj.maxSingleTypeDamage = itemMaxTypeDamage;
            casteObj.totalMatsUsed = matTotal;
            casteObj.rarValPairs = rarValPairs;

            const totalDamage = dmgTypeAmountGen(casteObj);
            const totalValue = itemValueGenConstant(casteObj);

            //console.log('Total Item Damage: %d', totalDamage);
            //console.log('Total Item Value: %d', totalValue);

            const finalItemCode = createNewItemCode(casteObj);
            extractName(casteObj);

            console.log(casteObj);
            console.log(chlkPreset.sInfoTwo(finalItemCode));

            const finalFields = [];
            finalFields.push({name: 'Name:', value: `**${casteObj.name}**`});
            finalFields.push({name: 'Slot:', value: `**${checkingSlot(finalItemCode)}**`});
            finalFields.push({name: 'Rarity:', value: `**${checkingRar(finalItemCode)}**`});
            finalFields.push({name: 'Hands Needed:', value: `**${casteObj.hands}**`});
            finalFields.push({name: 'Total Item Damage:', value: `**${totalDamage}**`});
            finalFields.push({name: 'Total Item Value:', value: `**${totalValue}**`});
            finalFields.push({name: '**Damage Types:**', value: ` `});
            for (const dmgObj of casteObj.dmgTypePairs){
                finalFields.push({name: `${dmgObj.type}`, value: `${dmgObj.dmg}`, inline: true});
            }

            const embedColour = await grabColour(casteObj.rarity);

            // UPDATE EMBED HERE ONCE ITEM HAS BEEN CRAFTED
            const itemCraftedEmbed = new EmbedBuilder()
            .setTitle('== **Item Crafted** ==')
            .setColor(embedColour)
            .setDescription(`You crafted a **${userInputChoices.castePicked}** successfully!`)
            .addFields(finalFields);

            return await followUpCrafting.edit({embeds: [itemCraftedEmbed]}).then(() => setTimeout(() => {
                followUpCrafting.delete();
            }, 120000)).catch(e => console.error(e));
        });

        endTime = new Date().getTime();
        return console.log(chlkPreset.bInfoOne(`Command took ${endTime - startTime}ms to complete!`));
        //return await interaction.reply(`Command took ${endTime - startTime}ms to complete!`);
	},
};