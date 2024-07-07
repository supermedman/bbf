const { SlashCommandBuilder } = require('discord.js');

const { ItemLootPool, ItemStrings, LootStore } = require('../../dbObjects');
const { createSingleUniItem } = require('./Export/itemStringCore');
const newItemList = require('./Export/Json/uniItemStore.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('datamove')
        .setDescription('Move Data Around!')
        .addSubcommand(subcommand =>
			subcommand
				.setName('static-db')
				.setDescription('Loadup the static item loot pool table.'))
        .addSubcommand(subcommand =>
			subcommand
				.setName('inventory-db')
				.setDescription('Loadup the user item storage table.')),
	async execute(interaction) { 
        if (interaction.user.id !== "501177494137995264") return interaction.reply("Not gonna happen! :)");
        
        const startTime = new Date().getTime();
        let endTime;

        const subCom = interaction.options.getSubcommand();

        await interaction.deferReply();

        switch(subCom){
            case "static-db":
                console.log('Loading ItemLootPool Table!');

                // let curRun = 0, breakAt = 1;
                for (const itemFab of newItemList){
                    try {
                        await enterStaticItemEntry(itemFab);
                        // curRun++;
                    } catch(e) {
                        console.error(e);
                        continue;
                    }
                    // if (curRun >= breakAt) break;
                }

                endTime = new Date().getTime();
            break;
            case "inventory-db":
                console.log('Loading ItemStrings Table!');

                const fullDBLootList = await LootStore.findAll();

                let curRun = 0, breakAt = 1;
                for (const dbItem of fullDBLootList){
                    try {
                        await enterItemEntry(dbItem);
                        //curRun++;
                    } catch(e) {
                        if (dbItem.loot_id < 1000){
                            console.log('Item With ID: %d', dbItem.loot_id);
                            console.log('UserID: %d', dbItem.spec_id);
                            console.error(e);
                        } else if (dbItem.loot_id >= 20000) {
                            console.log('Special Item!!');
                        } else {
                            console.log('Unique Item!!');
                        }
                        continue;
                    }
                    if (curRun >= breakAt) break;
                }

                endTime = new Date().getTime();
            break;
        }

        /**
         * This function loads a single entry into the ItemLootPool table if it does not already
         * exist, otherwise it finds and returns.
         * @param {object} itemFab Json Static Item Prefab
         * @returns void
         */
        async function enterStaticItemEntry(itemFab){

            const newEntry = await ItemLootPool.findOrCreate({
                where: { 
                    creation_offset_id: itemFab.crafted_id 
                },
                defaults: {
                    name: itemFab.name,
                    value: itemFab.value,
                    item_code: itemFab.itemStringCode,
                    caste_id: itemFab.casteID,
                    user_created: false
                }
            });

            if (newEntry[1]) await newEntry[0].save();
            return;
        }

        /**
         * This function formats a given dbItem into a UNI item obj, it then tries to find a match
         * in the database, if not found it creates an entry using the given dbItem values as well
         * as the needed formatted item values.
         * @param {object} dbItem Db Entry Instance
         * @returns void
         */
        async function enterItemEntry(dbItem){
            const formattedItem = createSingleUniItem(dbItem);

            const newEntry = await ItemStrings.findOrCreate({
                where: { 
                    user_id: dbItem.spec_id,
                    item_id: `${dbItem.loot_id}` 
                },
                defaults: {
                    name: dbItem.name,
                    value: dbItem.value,
                    amount: dbItem.amount,
                    item_code: formattedItem.itemStringCode,
                    caste_id: formattedItem.casteID,
                    creation_id: formattedItem.crafted_id
                }
            });

            // console.log(newEntry[0]);

            if (newEntry[1]) await newEntry[0].save();
            return;
        }

        console.log(`Final Command Time: ${endTime - startTime}ms`);
        return interaction.followUp(`Final Command Time: ${endTime - startTime}ms`);
    },
};