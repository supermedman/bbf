const { errorForm } = require('../../../chalkPresets.js');
const { UserHints, UserData } = require('../../../dbObjects.js');

async function createNewHints(user) {
    try {
        await UserHints.create({
            spec_id: user.userid
        });
        const newHintProf = await UserHints.findOne({ where: { spec_id: user.userid } });
        return newHintProf;
    } catch (error) {
        console.log(errorForm('Error during hint profile creation:', error));
    }
}

async function checkUser(userid){
    const theUser = await UserData.findOne({where: {userid: userid}});
    return theUser;
}

//DONE
async function checkHintMaterialView(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.viewmat_hint === true) return;

    await interaction.channel.send('Looks like you got your very first material!! \nIf youd like to view it you can use ``/myloot materials``');
    await UserHints.update({ viewmat_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintMaterialCombine(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.combmat_hint === true) return;

    await interaction.channel.send('Using ``/material combine`` is a good way to get higher rarity materials, heres an example: \n``/material combine <slimy> <uncommon>`` \nThis will try to create 1 uncommon slimy material, it will try to combine 5 common slimy material.\nHere is another example:\n``/material combine <slimy> <rare>``\n This will try to create 1 rare slimy material, it will first check for 5 uncommon slimy material, lets say you only have 4.. it will then check common slimy to make up the difference, which in this case is 5 (1 rare = 5 uncommon = 25 common)');
    await UserHints.update({ combmat_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintMaterialDismantle(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.dismmat_hint === true) return;

    await interaction.channel.send('Combine too many materials?? ``/material dismantle`` is here to save the day!!\nYou can use it like this:\n``/material dismantle <slimy> <rare>`` \nThis will dismantle 1 rare slimy material, it will produce 5 uncommon slimy material, easy peasy right!?');
    await UserHints.update({ dismmat_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintMaterialUnique(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.umat_hint === true) return;

    await interaction.channel.send('Oh woah, that enemy had a unique material! Those materials are much harder to come by, they also ***cannot*** be ``combined`` or ``dismantled``\nIf you want to find them fast, use\n``/material view <unique> <true>`` This will show you all unique materials you own, Sweet!!');
    await UserHints.update({ umat_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintLootView(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.viewloot_hint === true) return;

    await interaction.channel.send('Woah, score! You got some new gear, to see all owned gear use:\n``/myloot gear``');
    await UserHints.update({ viewloot_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintLootEquip(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.equip_hint === true) return;

    await interaction.channel.send('Want to put some new gear on? First check which slot it goes in, then use ``/equip [Gear-Slot] <Gear-Name>`` If no options show up for ``<Gear-Name>`` remember this => **Dont forget to use captial letters when trying to equip!!**');
    await UserHints.update({ equip_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintInspect(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.inspect_hint === true) return;

    await interaction.channel.send('Boom!! Lets see that newly equipped gear on you? Use ``/inspect``!');
    await UserHints.update({ inspect_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintLootSell(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.sellloot_hint === true) return;

    await interaction.channel.send('Your back must be hurting by now... Why not lighten the load in **exchange for some coin** or material! This can be done by:\nUsing ``/sell some`` or ``/sell all``\nFor example: \n``/sell some <Rock>`` This will provide you some extra options after use.\n``/sell all <common>`` This will sell all common gear you own!');
    await UserHints.update({ sellloot_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintLootBuy(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.buyloot_hint === true) return;

    await interaction.channel.send('You have got a nice pile of coin! Why not check out ``/shop`` for some new gear? Keep in mind refreshing the shop by the reroll button, or by reusing the command will cost some coin and increase your daily refresh total, this will reset every 24 hours from when you first use the shop!!');
    await UserHints.update({ buyloot_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintLootDismantle(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.dismloot_hint === true) return;

    await interaction.channel.send('Your back must be hurting by now... Why not lighten the load in **exchange for some materials** or coin! This can be done by:\nUsing ``/dismantle some`` or ``/dismantle all``\nFor example: \n``/dismantle some <Rock>`` This will work similar to selling except you get materials!!\n``/dismantle all <common>`` This will dismantle all common gear owned. If youd like a more complex explanation, click this => ||Every item has; dismantle type(s), Value, Rarity. These factors are used when calculating output materials. Heres how:\n Value/Number of Types = Available Value \nMaterial Rarity to Drop = Rarity \nDropped Material Amount = Available Value/Material Value @ Rarity.||');
    await UserHints.update({ dismloot_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintStats(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.stats_hint === true) return;

    await interaction.channel.send('Looks like youve been busy, take a look at how busy by using ``/stats user``');
    await UserHints.update({ stats_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintLevelFive(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.levelfive_hint === true) return;

    await interaction.channel.send('Level 5 already?!? Wow!! You are doing great, time for a quest! Try out ``/quest start`` then select one from the provided list!');
    await UserHints.update({ levelfive_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintLevelThirty(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.levelthirty_hint === true) return;

    await interaction.channel.send('Look at you go!! Level 30 is no small feat, you should be proud! Try taking another look at those quests...\n||Or maybe even try out ``/dungeon``||');
    await UserHints.update({ levelthirty_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintLevelOneHundred(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.levelonehundred_hint === true) return;

    await interaction.channel.send('Hello again... \nPlease, take a break.\n\nNo really, you have earned it!\nLook at you having gotten this far, I truely appreciate the hard work and dedication.\n\nBut seriously watch out for ||# NULL||');
    await UserHints.update({ levelonehundred_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintQuest(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.quest_hint === true) return;

    await interaction.channel.send('Hey there, looks like youve finished a quest! To claim it use ``/quest claim``\nIt will give you xp, coins, and loot, you can see what you got with the "Page" buttons at the bottom. \n\nTry out this command too: ``/pigmyshop``');
    await UserHints.update({ quest_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintPigmy(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.pigmy_hint === true) return;

    await interaction.channel.send('Hey you! Try out ``/pigmyshop`` you can afford a pigmy!! Once you aquire a new pigmy, you can equip it like this:\n``/pigmy equip <Pigmy>``\nClaim from it like this:\n``/pigmy claim``\nPlay with it like this:\n``/pigmy play``\nRename it like this:\n``/pigmy rename``\nInspect it like this:\n``/pigmy inspect``\n\nEnjoy your new pigmy, and its damage bonus too!!');
    await UserHints.update({ pigmy_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintStoryQuest(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.storyquest_hint === true) return;

    await interaction.channel.send('You should try going on the quest ``Krelya\'s Cultist Hideaway``, after that check the last page of quests for the next story quest :)');
    await UserHints.update({ storyquest_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintLore(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.lore_hint === true) return;

    await interaction.channel.send('Completed a story quest? Not sure where to find that big wall of text again? Give ||``/lore <Souls>``|| a try ;)');
    await UserHints.update({ lore_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintDungeon(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.dungeon_hint === true) return;

    await interaction.channel.send('Well, well, well.. Lookie here, we have ourselves an avid adventurer! You have just unlocked the first dungeon!!! Give it a try by doing ||``/dungeon <God-name-here>``||, if that doesnt work try this ||``/lore <Souls>``|| and see what the last page says about rulers..');
    await UserHints.update({ dungeon_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintViewBluey(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.viewbluey_hint === true) return;

    await interaction.channel.send('WOAH WHAT WAS THAT!?!? A blueprint??? So cooool! Wanna see it? Use ``/blueprint view``!!\nBlueprints you can craft will have a craft button, blueprints you cannot craft will have a cancel button, materials required will be shown when viewing blueprints, as well as how many you have');
    await UserHints.update({ viewbluey_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintPotionBluey(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.potbluey_hint === true) return;

    await interaction.channel.send('Oh cool, you got a potion blueprint! Check it out using ``/blueprint view`` Once youve made one you can view it using ``/myloot potions``');
    await UserHints.update({ potbluey_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintPotionEquip(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.potequip_hint === true) return;

    await interaction.channel.send('Theres your potion!! Equip it using ``/equip potion <Minor Healing>``\nYou will see the potion button next time you enter combat or you can use ``/inspect`` to view it right away!');
    await UserHints.update({ potequip_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintToolBluey(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.toolbluey_hint === true) return;

    await interaction.channel.send('Oh sweet, that was a tool blueprint, you can see it using ``/blueprint view`` Once you craft it view it using ``/myloot tools`` which will show you all the tools you own. I wonder what else you can do with it...');
    await UserHints.update({ toolbluey_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintPigmyGive(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.pigmygive_hint === true) return;

    await interaction.channel.send('Nice, looks like you have something for a pigmy! You can give tools to pigmies by using ``/pigmy give <Tool-Type> <Tool-Name>``, If you need to check what type the tool is use ``/myloot tools``.');
    await UserHints.update({ pigmygive_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
//await checkHintUniqueBluey(user, interaction);
async function checkHintUniqueBluey(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.ubluey_hint === true) return;

    await interaction.channel.send('CONGRATULATIONS!!! That was a tough fight huh? Well done, youve got yourself a unique blueprint for your troubles! Take a look at it using ``/blueprint view`` This is unique so you can only ever craft ***ONE***, it will get stronger the more you kill with it!\nTo view crafted uniques use ``/myloot unique``');
    await UserHints.update({ ubluey_hint: true }, { where: { spec_id: user.userid } });
    return;
}

//DONE
async function checkHintUniqueEquip(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.uequip_hint === true) return;

    await interaction.channel.send('To equip unique gear use ``/equip unique <Name-here>``\nUnique gear will only level up while you are wearing it!!');
    await UserHints.update({ uequip_hint: true }, { where: { spec_id: user.userid } });
    return;
}

async function checkHintTempCopy(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.HINTNAME_hint === true) return;

    await interaction.channel.send('...');
    await UserHints.update({ HINTNAME_hint: true }, { where: { spec_id: user.userid } });
    return;
}

module.exports = {
    checkUser,
    checkHintMaterialView,
    checkHintMaterialCombine,
    checkHintMaterialDismantle,
    checkHintMaterialUnique,
    checkHintLootView,
    checkHintLootEquip,
    checkHintInspect,
    checkHintLootSell,
    checkHintLootBuy,
    checkHintLootDismantle,
    checkHintStats,
    checkHintLevelFive,
    checkHintLevelThirty,
    checkHintLevelOneHundred,
    checkHintQuest,
    checkHintStoryQuest,
    checkHintLore,
    checkHintDungeon,
    checkHintViewBluey,
    checkHintPotionBluey,
    checkHintPotionEquip,
    checkHintToolBluey,
    checkHintPigmyGive,
    checkHintPigmy,
    checkHintUniqueBluey,
    checkHintUniqueEquip
};
