const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const Canvas = require('@napi-rs/canvas');
const { request } = require('undici');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Get info about a user or a server!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Info about a user')
                .addUserOption(option => option.setName('target').setDescription('The user')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('Info about the server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('canvas')
                .setDescription('Testing for canvas')),
    async execute(interaction) {
        await interaction.deferReply();
        //  interaction.followUp
        //  interaction.reply
        //  interaction.channel.send

        // interaction.guild is the object representing the Guild in which the command was run
        //await interaction.reply(`This server is ${interaction.guild.name} and has ${interaction.guild.memberCount} members.`);
        // interaction.user is the object representing the User who ran the command
        // interaction.member is the GuildMember object, which represents the user in the specific guild
        //await interaction.reply(`This command was run by ${interaction.user.username}, who joined on ${interaction.member.joinedAt}.`);
        if (interaction.options.getSubcommand() === 'user') {
            const user = interaction.options.getUser('target');

            if (user) {
                await interaction.followUp(`Username: ${user.username}\nID: ${user.id}`);
            } else {
                await interaction.followUp(`Your username: ${interaction.user.username}\nYour ID: ${interaction.user.id}`);
            }
        } else if (interaction.options.getSubcommand() === 'server') {
            await interaction.followUp(`Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`);
        } else if (interaction.options.getSubcommand() === 'canvas') {
            //testing canvas abilites
            const canvas = Canvas.createCanvas(700, 250);
            const context = canvas.getContext('2d');

            // Pass the entire Canvas object because you'll need access to its width and context
            const applyText = (canvas, text) => {
                const context = canvas.getContext('2d');

                // Declare a base size of the font
                let fontSize = 70;

                do {
                    // Assign the font to the context and decrement it so it can be measured again
                    context.font = `${fontSize -= 10}px sans-serif`;
                    // Compare pixel width of the text to the canvas minus the approximate avatar size
                } while (context.measureText(text).width > canvas.width - 300);

                // Return the result to use in the actual canvas
                return context.font;
            };

            const background = await Canvas.loadImage('./events/Models/json_prefabs/weapon_png/Background.jpg');

            // This uses the canvas dimensions to stretch the image onto the entire canvas
            context.drawImage(background, 0, 0, canvas.width, canvas.height);

            // Set the color of the stroke
            context.strokeStyle = '#0099ff';

            // Draw a rectangle with the dimensions of the entire canvas
            context.strokeRect(0, 0, canvas.width, canvas.height);

            // Slightly smaller text placed above the member's display name
            context.font = '28px sans-serif';
            context.fillStyle = '#ffffff';
            context.fillText('Profile', canvas.width / 2.5, canvas.height / 3.5);

            // Assign the decided font to the canvas
            // Add an exclamation point here and below
            context.font = applyText(canvas, `${interaction.member.displayName}!`);
            context.fillStyle = '#ffffff';
            context.fillText(`${interaction.member.displayName}!`, canvas.width / 2.5, canvas.height / 1.8);

            // Pick up the pen
            context.beginPath();

            // Start the arc to form a circle
            context.arc(125, 125, 100, 0, Math.PI * 2, true);

            // Put the pen down
            context.closePath();

            // Clip off the region you drew on
            context.clip();

            // Using undici to make HTTP requests for better performance
            const { body } = await request(interaction.user.displayAvatarURL({ extension: 'jpg' }));
            const avatar = await Canvas.loadImage(await body.arrayBuffer());

            // If you don't care about the performance of HTTP requests, you can instead load the avatar using
            // const avatar = await Canvas.loadImage(interaction.user.displayAvatarURL({ extension: 'jpg' }));

            // Draw a shape onto the main canvas
            //context.drawImage(avatar, 25, 0, 200, canvas.height);

            // Move the image downwards vertically and constrain its height to 200, so that it's square
            context.drawImage(avatar, 25, 25, 200, 200);

            // Use the helpful Attachment class structure to process the file for you
            const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'profile-image.png' });


            interaction.followUp({ files: [attachment] });
        }

    },
            
};