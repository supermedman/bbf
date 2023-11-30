const { errorForm } = require('../../chalkPresets.js');
const { UserHints } = require('../../dbObjects.js');

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

async function checkHintMaterialView(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.viewmat_hint === true) return;

    await interaction.channel.send('Looks like you got your very first material!! \nIf youd like to view it you can use ``/myloot materials``');
    await UserHints.update({ viewmat_hint: true }, { where: { spec_id: user.userid } });
    return;
}

async function checkHintMaterialCombine(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.combmat_hint === true) return;

    await interaction.channel.send('Using ``/material combine`` is a good way to get higher rarity materials, heres an example: \n``/material combine <slimy> <uncommon>`` \nThis will try to create 1 uncommon slimy material, it will try to combine 5 common slimy material.\nHere is another example:\n``/material combine <slimy> <rare>``\n This will try to create 1 rare slimy material, it will first check for 5 uncommon slimy material, lets say you only have 4.. it will then check common slimy to make up the difference, which in this case is 5 (1 rare = 5 uncommon = 25 common)');
    await UserHints.update({ combmat_hint: true }, { where: { spec_id: user.userid } });
    return;
}

async function checkHintMaterialDismantle(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.dismmat_hint === true) return;

    await interaction.channel.send('Combine too many materials?? ``/material dismantle`` is here to save the day!!\nYou can use it like this:\n``/material dismantle <slimy> <rare>`` \nThis will dismantle 1 rare slimy material, it will produce 5 uncommon slimy material, easy peasy right!?');
    await UserHints.update({ dismmat_hint: true }, { where: { spec_id: user.userid } });
    return;
}

async function checkHintMaterialUnique(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.umat_hint === true) return;

    await interaction.channel.send('Oh woah, that enemy had a unique material! Those materials are much harder to come by, they also ***cannot*** be ``combined`` or ``dismantled``\nIf you want to find them fast, use\n``/material view <unique> <true>`` This will show you all unique materials you own, Sweet!!');
    await UserHints.update({ umat_hint: true }, { where: { spec_id: user.userid } });
    return;
}

async function checkHintLootView(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.viewloot_hint === true) return;

    await interaction.channel.send('Woah, score! You got some new gear, to see all owned gear use:\n``/myloot gear``');
    await UserHints.update({ viewloot_hint: true }, { where: { spec_id: user.userid } });
    return;
}

async function checkHintLootSell(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.sellloot_hint === true) return;

    await interaction.channel.send('Your back must be hurting by now... Why not lighten the load in **exchange for some coin** or material! This can be done by:\nUsing ``/sell some`` or ``/sell all``\nFor example: \n``/sell some <Rock>`` This will provide you some extra options after use.\n``/sell all <common>`` This will sell all common gear you own!');
    await UserHints.update({ sellloot_hint: true }, { where: { spec_id: user.userid } });
    return;
}

async function checkHintLootBuy(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.buyloot_hint === true) return;

    await interaction.channel.send('You have got a nice pile of coin! Why not check out ``/shop`` for some new gear? Keep in mind refreshing the shop by the reroll button, or by reusing the command will cost some coin and increase your daily refresh total, this will reset every 24 hours from when you first use the shop!!');
    await UserHints.update({ buyloot_hint: true }, { where: { spec_id: user.userid } });
    return;
}

async function checkHintLootDismantle(user, interaction) {
    let userHints = await UserHints.findOne({ where: { spec_id: user.userid } });
    if (!userHints) userHints = await createNewHints(user);

    if (userHints.dismloot_hint === true) return;

    await interaction.channel.send('Your back must be hurting by now... Why not lighten the load in **exchange for some materials** or coin! This can be done by:\nUsing ``/dismantle some`` or ``/dismantle all``\nFor example: \n``/dismantle some <Rock>`` This will work similar to selling except you get materials!!\n``/dismantle all <common>`` This will dismantle all common gear owned. If youd like a more complex explination, click this => ||Every item has; dismantle type(s), Value, Rarity. These factors are used when calculating output materials. Heres how:\n Value/Number of Types = Available Value \nMaterial Rarity to Drop = Rarity \nDropped Material Amount = Available Value/Material Value @ Rarity.||');
    await UserHints.update({ dismloot_hint: true }, { where: { spec_id: user.userid } });
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
    checkHintMaterialView,
    checkHintMaterialCombine,
    checkHintMaterialDismantle,
    checkHintMaterialUnique,
    checkHintLootView,
    checkHintLootSell,
    checkHintLootBuy,
    checkHintLootDismantle
};