const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

const { GuildData } = require('../../dbObjects.js');
const { getTypeof } = require('../../uniHelperFunctions.js');


let introEmbedDesc = '*Hello and welcome!*\nThis is Black Blade, an expansive game app. Contained within are a plethora of features and commands focused around entertainment! A few of those core features are: ``Interactive Combat``, ``Quests``, ``Progressive Storyline``, ``NPC Tasks``, ``Pets (Pigmies)``, ``In Game Trading``, ``Unique Loot``, ``Boss Battles``, ``Travel``, and ``Designable Towns``.';
introEmbedDesc += '\nUpon entering the world of Black Blade, you will be required to prove yourself before major features are fully unlocked... Acquiring Level 5 by way of combat is the first step to greatness! Quests are an excellent way to passively progress your level, fill your coin purse, and acquire new gear, during busy days and nights out. Completing quests will earn you favor with a group of creatures called Pigmies.. Pigmies love to gather, play, dress up, and show off too!! Not only are they cute companions, they also provide benefits to those they like!';
introEmbedDesc += '\nBlack Blade currently has **3** major stages:';

const introFinalFields = [];

introFinalFields.push({name: '== **Stage 1** == ||Early Game||', value: '    - Quests, Combat, Pigmies, Tasks, and Lots of LOOT\n    - Approximate Level range 1-25'});
introFinalFields.push({name: '== **Stage 2** == ||Mid Game||', value: '    - Progressive Storyline, Trading, Boss Battles, Crafting (Potions, Items, Gear), and BETTER LOOT\n    - Approximate Level Range 31-75'});
introFinalFields.push({name: '== **Stage 3** == ||Late Game||', value: '    - Deep Lore, Large Scale Trading, Difficult Tasks, Tough Bosses, Intro to Towns, Travel, and Teamwork\n    - Approximate Level Range 75-100'});
introFinalFields.push({name: '== **End Game** == ', value: '    - Town Focus, Major Trade Deals, New NPC Mechanics, and MORE\n    - Approximate Level Range 100+'});


const introEmbed = new EmbedBuilder()
.setTitle("~=** Welcome to Black Blade! **=~")
.setDescription(introEmbedDesc)
.setColor('DarkGold')
.addFields(introFinalFields);

let setupEmbedDesc = '**This message section is primarily for Admin, Owners, and/or other users with applicable permissions.**  ';
setupEmbedDesc += '\nThank you for adding this app!!\n';
setupEmbedDesc += 'It is suggested that you create at least one specific text channel with which you can dedicate to the Black Blade App. In order for the app to function at all, it needs to be able to send messages to at least one channel, while also retaining all of the initial permissions outlined in its scope. These permissions only need to be active on ***at least*** one channel for the bare minimum of features to work.';
setupEmbedDesc += '\nIt is also recommended that you give Black Blade ``Read Message Permissions`` on your most active channels for the following reason: ';
setupEmbedDesc += '\n**Reason** - Spawning Enemies\nQ: Why?!\nA: Black Blade has an internal counter that generates "XP" for a server whenever a message is sent, once it crosses the defined threshold, an enemy will spawn.\nQ: What else does it do with that?\nA: It **does not** read/store the **message content**. It **does not** read/store **who sent** the message. It **does** read **where the message was sent** ***ONLY*** if that message causes an enemy to spawn ***AND*** if a ``spawn channel`` **has not** been configured already!';
setupEmbedDesc += '\nThe next section covers some helpful utility commands to quickly setup Black Blade (*Assuming you have created at least one text channel for Black Blade*):';

const setupFinalFields = [];

setupFinalFields.push({name: '== ``/setup`` ==', value: '\u200b'});
setupFinalFields.push({name: '``fastneasy``', value: '- This will set the current channel as both the announcement/spawn channel\n- It will then post the introduction and starter commands embed messages, then try to pin them.'});
setupFinalFields.push({name: '``oopsie``', value: '- This will attempt to completely undo/remove and revert any and all changes made by using the above command\n- This should leave the setup process as a clean slate as if the App is brand new.\n*It will only undo what has been done*\n - Remove its own "*intro/starter*" embeds\n- Set announcement/spawn channels to ``None``'});
setupFinalFields.push({name: '``info``', value: '- This will display assigned channels or ``None`` if not assigned\n- It will also display if it can find the "*intro/starter*" embeds'});
setupFinalFields.push({name: '``help``', value: '- This will display the current embed'});
setupFinalFields.push({name: '== ``/channel`` ==', value: '\u200b'});
setupFinalFields.push({name: '``assign`` ``<Spawn> | <Announce>``', value: '- This will prompt a channel selection, the channel selected will be used for the associated type chosen'});
setupFinalFields.push({name: '``remove`` ``<Spawn> | <Announce>``', value: '- This will allow you to reset the chosen channel type back to ``None``'});

const setupEmbed = new EmbedBuilder()
.setTitle("~=** Black Blade Setup! **=~")
.setDescription(setupEmbedDesc)
.setColor('White')
.addFields(setupFinalFields);


module.exports = {
	data: new SlashCommandBuilder()
		.setName('setup')
        .setDescription('This is the main setup command!')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addSubcommand(subcommand => 
            subcommand
                .setName('fastneasy')
                .setDescription('This command will setup all basic aspects for the App.'))
        .addSubcommand(subcommand => 
            subcommand
                .setName('oopsie')
                .setDescription('This command will undo and reset all basic aspects for the App.'))
        .addSubcommand(subcommand => 
            subcommand
                .setName('info')
                .setDescription('This will display all current setup related data.'))
        .addSubcommand(subcommand => 
            subcommand
                .setName('help')
                .setDescription('This will display the setup embed.')),

	async execute(interaction) { 
        // Find guild object
        const theGuild = await GuildData.findOne({where: {guildid: interaction.guild.id}});
        if (!theGuild) return interaction.reply("This guild has no database entry! Please visit the offical support server for help! <https://discord.gg/XHdyQf7hd7>");
        
        const theChannel = interaction.channel;
        if (!theChannel) return interaction.reply("This channel is not valid!!");
        if (theChannel.type !== ChannelType.GuildText) return interaction.reply("This is not a vaild channel!");

        let tableUpdate, returnEmbed;
        switch(interaction.options.getSubcommand()){
            case "fastneasy":
                tableUpdate = await theGuild.update({announcechannel: theChannel.id, spawnchannel: theChannel.id});
            break;
            case "oopsie":
                tableUpdate = await theGuild.update({announcechannel: '0', spawnchannel: '0'});
            break;
            case "info":
                const theAnnounceChannel = (theGuild.announcechannel !== '0') ? await interaction.guild.channels.fetch(theGuild.announcechannel).then(channel => {return channel.name}) : 'None';
                const theSpawnChannel = (theGuild.spawnchannel !== '0') ? await interaction.guild.channels.fetch(theGuild.spawnchannel).then(channel => {return channel.name}) : 'None';
                returnEmbed = new EmbedBuilder()
                .setTitle("== **Current Server Info** ==")
                .setColor('DarkGold')
                .addFields([
                    {name: 'Announcement Channel:', value: `${theAnnounceChannel}`},
                    {name: 'Spawn Channel:', value: `${theSpawnChannel}`},
                    {name: 'Current XP:', value: `${theGuild.guildxp}`},
                    {name: 'Total Spawns:', value: `${theGuild.total_spawns}`},
                ]);
            break;
            case "help":
                returnEmbed = [setupEmbed, introEmbed];
            break;
        }

        if (tableUpdate){
            await theGuild.save();
            return await interaction.reply("Data updated! Use ``/setup info`` for more details.");
        }

        if (getTypeof(returnEmbed) === 'Array'){
            return await interaction.reply({embeds: [...returnEmbed]});
        } else if (getTypeof(returnEmbed) === 'EmbedBuilder'){
            return await interaction.reply({embeds: [returnEmbed]});
        } else return interaction.reply("Something went wrong while creating/sending a message!!");

        // if (typeof returnEmbed === 'object'){
        //     return await interaction.reply({embeds: [returnEmbed]});
        // } else return interaction.reply("Something went wrong while creating/sending a message!!");
	},
};