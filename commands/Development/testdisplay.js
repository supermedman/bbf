const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const { uni_displayItem } = require('./Export/itemStringCore');

const {ItemStrings} = require('../../dbObjects');

const randArrPos = (arr) => {
    return arr[(arr.length > 1) ? Math.floor(Math.random() * arr.length) : 0];
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('testdisplay')
        .setDescription('Test a display!')
        .addSubcommand(subcommand =>
			subcommand
				.setName('inventory')
				.setDescription('Display items, format for /myloot gear.')
                .addStringOption(option =>
                    option
                    .setName('amount-shown')
                    .setDescription('Choose how many items to show.')
                    .setRequired(true)
                    .addChoices(
                        {name: 'Single Page', value: 'one-page'},
                        {name: 'Double Page (WIP)', value: 'two-page'},
                        {name: 'Everything (WIP)', value: 'all-page'},
                    )
                )
            )
        .addSubcommand(subcommand =>
            subcommand
                .setName('loot-drop')
                .setDescription('Display dropped items, combat/quests.')
                .addStringOption(option =>
                    option
                    .setName('item-source')
                    .setDescription('Select a drop source!')
                    .setRequired(true)
                    .addChoices(
                        {name: 'Combat', value: 'combat'},
                        {name: 'Quest', value: 'quest'},
                    )
                )
            )
        .addSubcommand(subcommand =>
			subcommand
				.setName('shop')
				.setDescription('WIP, not currently active!!')
            ),
	async execute(interaction) { 
        if (interaction.user.id !== "501177494137995264") return interaction.reply("Not gonna happen! :)");
	
        const startTime = new Date().getTime();
        let endTime;

        const subCom = interaction.options.getSubcommand();

        await interaction.deferReply();

        const finalEmbed = new EmbedBuilder();

        const embedPages = [];
        let usePagination = false;

        switch(subCom){
            case "inventory":
                const pageLimit = interaction.options.getString('amount-shown');
                console.log('Display for Inventory, Page Limit: ', pageLimit);

                const fullUserItemList = await ItemStrings.findAll({where: {user_id: interaction.user.id}});
                
                let curRun = 0, maxRun = 6, hasPartialPage = false, lastMaxRun = 6, pageRun;
                switch(pageLimit){
                    case "one-page":
                        pageRun = 1;
                    break;
                    case "two-page":
                        usePagination = true;
                        pageRun = 2;
                    break;
                    case "all-page":
                        usePagination = true;
                        pageRun = Math.ceil(fullUserItemList.length/6);
                    break;
                    default:
                        pageRun = 1;
                    break;
                }

                if (pageLimit !== "all-page" && (maxRun * pageRun) % 6 !== 0) {
                    hasPartialPage = true;
                    lastMaxRun = (maxRun * pageRun) % 6;
                } else if (pageLimit === "all-page" && fullUserItemList.length % 6 !== 0) {
                    hasPartialPage = true;
                    lastMaxRun = fullUserItemList.length % 6;
                }

                console.log(fullUserItemList.length);
                console.log(pageRun);

                for (let i = 0; i < pageRun; i++){
                    const finalFields = [];
                    const curItemSection = fullUserItemList.slice(curRun, (i + 1 === pageRun) ? curRun + lastMaxRun : curRun + maxRun);

                    for (const dbItem of curItemSection){
                        finalFields.push(uni_displayItem(dbItem, "List"));
                        curRun++;
                    }

                    const embedPage = new EmbedBuilder()
                    .setTitle('~OWNED GEAR~')
                    .setDescription(`Page ${i + 1}/${pageRun}`)
                    .setColor(0o0)
                    .addFields(finalFields);

                    embedPages.push(embedPage);
                }

                endTime = new Date().getTime();
            break;
            case "loot-drop":
                const sourceType = interaction.options.getString('item-source');
                console.log('Display for Dropped Loot from Source: ', sourceType);

                const randomItem = randArrPos(await ItemStrings.findAll({where: {user_id: interaction.user.id}}));

                let returnedValues;
                switch(sourceType){
                    case "combat":
                        finalEmbed.setTitle('Loot Dropped');
                        returnedValues = uni_displayItem(randomItem, "Single");
                    break;
                    case "quest":
                        finalEmbed
                        .setTitle('~LOOT GAINED~')
                        .setDescription('Page 1/1');
                        returnedValues = uni_displayItem(randomItem, "Single");
                    break;
                }

                finalEmbed
                .setColor(returnedValues.color)
                .addFields(returnedValues.fields);
                
                embedPages.push(finalEmbed);

                endTime = new Date().getTime();
            break;
            case "shop":
                console.log('Display for Shop');

                finalEmbed
                .setTitle('~The Shop~')
                .setDescription('Nothing to see here yet!')
                .setColor(0o0);

                embedPages.push(finalEmbed);

                endTime = new Date().getTime();
            break;
        }

        console.log(`Final Command Time: ${endTime - startTime}ms`);
        if (!usePagination){
            return interaction.followUp({content: `Final Command Time: ${endTime - startTime}ms`, embeds: [embedPages[0]]});
        }
        
        // Using Pages, Create Standard Embed Page Button Handler

        // ==================
        //      BUTTONS
        // ==================

        const backPage = new ButtonBuilder()
        .setLabel("Back")
        .setStyle(ButtonStyle.Primary)
        .setEmoji('◀️')
        .setCustomId('back-page');

        const cancelButton = new ButtonBuilder()
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
        .setEmoji('*️⃣')
        .setCustomId('delete-page');

        const nextPage = new ButtonBuilder()
        .setLabel("Forward")
        .setStyle(ButtonStyle.Primary)
        .setEmoji('▶️')
        .setCustomId('next-page');

        const pageButtonRow = new ActionRowBuilder().addComponents(backPage, cancelButton, nextPage);

        const displayEmbed = await interaction.followUp({components: [pageButtonRow], embeds: [embedPages[0]]})

        const filter = (i) => i.user.id === interaction.user.id;

        const pageCollector = displayEmbed.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter,
            time: 1200000,
        });

        let currentPage = 0;

        pageCollector.on('collect', async c => {
            await c.deferUpdate().then(async () => {
                switch(c.customId){
                    case "next-page":
                        currentPage = (currentPage === embedPages.length - 1) ? 0 : currentPage + 1;
                    break;
                    case "back-page":
                        currentPage = (currentPage === 0) ? currentPage = embedPages.length - 1 : currentPage - 1;
                    break;
                    case "delete-page":
                    return pageCollector.stop('Canceled');
                }
                await displayEmbed.edit({ components: [pageButtonRow], embeds: [embedPages[currentPage]]});
            }).catch(e => {
                console.error(e);
            });
        });

        pageCollector.on('end', (c, r) => {
            displayEmbed.delete().catch(e => {
                if (e.code !== 10008) {
                    console.error('Failed to delete the message:', e);
                }
            });
        });
    },
};