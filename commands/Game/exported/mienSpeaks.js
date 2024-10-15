const { ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder } = require("discord.js");
const { createInteractiveChannelMessage } = require("../../../uniHelperFunctions");

const { NavMenu } = require('../../Development/Export/Classes/NavMenu');
const { InstalledBuild, OwnedTools, MaterialStore } = require("../../../dbObjects");

// DIALOG FOR MIENS BOSS FIGHT 

async function mienSpeaks(interaction, user, mienThumbnail){
    const dialogBuildList = [
        ['That remains to be seen..', 'You have made a wise choice!'],
        ['Very well..', 'Now now, don\'t paint me as the "bad guy" already! We\'ve only just *properly* met.'],
        ['I have.', 'I see you\'ve been taught the ways of the *Forge*?']
    ];

    // ['Butt-Label', 'Mien Dialog'],
    // ['Butt-Label', 'Mien Dialog'],
    // ['Butt-Label', 'Mien Dialog'],
    // ['Butt-Label', 'Mien Dialog'],
    // ['Butt-Label', 'Mien Dialog'],
    // ['Butt-Label', 'Mien Dialog'],

    const hasForge = async (user) => {
        const isCrafted = await OwnedTools.findOne({where: {spec_id: user.userid, name: 'Machine Schematics'}});
        return !!isCrafted;
    };
    const builtForge = async (user) => {
        const isInstalled = await InstalledBuild.findOne({where: {userid: user.userid, slot: 'Forge'}});
        return !!isInstalled;
    };
    const hasPhasereader = async (user) => { 
        // const uMatEntry = await UserMaterials.findOne({where: {userid: user.userid, mattype: 'unique'}});
        // const uniqueTypeObj = JSON.parse(uMatEntry.matdata);
        // return uniqueTypeObj.Phasereader > 0;

        const pr = await MaterialStore.findOne({where: {spec_id: user.userid, name: 'Phasereader'}});
        return !!pr;
    };
    
    if ((await hasForge(user)) || (await builtForge(user))){
        // Dialog for if the forge has been crafted or installed
        if (await builtForge(user)){
            // Forge is installed
            dialogBuildList.push(
                ['Yes of course!', 'So you must be familar with methods of *imbueing*!'],
                ['I like how that sounds.', 'Fantastic!! You continue to impress me. I happen to carry the knowledge needed to further strengthen your imbueing abilities!'],
                ['Take designs', 'Here, the designs for an upgrade to your forge..']
            );
        } else {
            // Forge is crafted but not installed
            dialogBuildList.push(
                ['I have heard, but not done', 'So you must be familar with methods of *imbueing*!'],
                ['Good to know.', 'You have a forge, no? You must `install` it to make use of *imbueing*!'],
                ['Take forge upgrade designs', 'Here, use this after you `install` that forge of yours!']
            );
        }
    } else if (await hasPhasereader(user)){
        // Dialog for if the user has the phasereader
        dialogBuildList.push(
            ['I may have heard of it..', 'So you must be familar with methods of *imbueing*!'],
            ['After that?', 'Well, now is time to do it! First you\'ll need a forge! Take that `machine schematic` blueprint you\'ve got and craft it!'],
            ['That\'s it?', 'You\'ll need to `install` it. That will give you access to *imbue*!'],
            ['Take forge upgrade designs', 'One more thing, take this and use it after you finish `installing` the forge..']
        );
    } else {
        // Dialog for no forge, for no phasereader
        // User has not spoken with a clergyman
        dialogBuildList.push(
            ['What?', 'So you must be familar with methods of *imbueing*!'],
            ['Yes, what about it?', 'Oh dear.. No one told you?! Ahh no matter, see these `Machine Schematics`?'],
            ['...', 'Head to the nearest `town` and `view the core buildings` `inspect` the `Clergy`. I\'m sure one of the *clergymen* will be able to help you!'],
        );
    }

    dialogBuildList.push(
        ['What if I can\'t remember all of that?', 'Any questions?'],
        ['Alright then..', 'I don\'t plan on running away, come `/speak with` *me* again if you need help.'],
        ['Very well, goodbye', 'Off you pop, there is much work to be done!']
    );

    const dialogDisplayPages = [];
    const pagingExtras = {
        embeds: [],
        files: [],
        components: []
    };
    for (const [l, d] of dialogBuildList){
        const nextButt = new ButtonBuilder()
        .setCustomId('next-page')
        .setStyle(ButtonStyle.Primary)
        .setLabel(l);
        const buttRow = new ActionRowBuilder().addComponents(nextButt);

        const dialogEmbed = new EmbedBuilder()
        .setTitle('Mien')
        .setColor('DarkGreen')
        .setThumbnail('attachment://Mien-goddess-of-mystery-closeup.png')
        .setDescription(d);

        pageDisplay.embeds.push(dialogEmbed);
        pageDisplay.files.push(mienThumbnail);
        pageDisplay.components.push(buttRow);

        const pageDisplay = {embeds: [dialogEmbed], components: [buttRow], files: [mienThumbnail]};

        dialogDisplayPages.push(pageDisplay);
    }

    const {anchorMsg, collector} = await createInteractiveChannelMessage(interaction, 120000, dialogDisplayPages[0]);

    const mienMenu = new NavMenu(user, dialogDisplayPages[0]);

    mienMenu.loadPagingMenu(pagingExtras);

    // =====================
    // BUTTON COLLECTOR (COLLECT)
    let totalPageCollecter = 0;
    collector.on('collect', async c => {
        await c.deferUpdate().then(async () => {
            switch(mienMenu.whatDoYouHear(c.customId)){
                case "PAGE":
                    totalPageCollecter++;
                    if (totalPageCollecter >= pageDisplay.embeds.length) return collector.stop('Complete');
                    mienMenu.handlePaging(c.customId);
                    await anchorMsg.edit(mienMenu.loadNextPage());
                break;
                default:
                    console.log('I HEARD: ', mienMenu.whatDoYouHear(c.customId));
                break;
            }
        }).catch(e => console.error(e));
    });
    // =====================

    // =====================
    // BUTTON COLLECTOR (END)
    collector.on('end', async (c, r) => {
        if (!r || r === 'time') return await handleCatchDelete(anchorMsg);

        if (r === 'Complete') console.log('Dialog complete!');
    });
    // =====================
}

module.exports = { mienSpeaks }