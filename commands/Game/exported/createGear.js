const { LootStore } = require('../../../dbObjects.js');


async function checkOwned(user, item, amount) {
    let newAmount = amount ?? 1;
    const lootStore = await LootStore.findOne({
        where: { spec_id: user.userid, loot_id: item.Loot_id ?? item.loot_id },
    });

    let tableUpdated = '';
    if (lootStore) {
        tableUpdated = await increaseItem(lootStore, newAmount);
    } else tableUpdated = await makeItem(user, item, newAmount);

    if (tableUpdated !== 'Success') return `Error: ${tableUpdated}`;
    return 'Finished';
}

async function increaseItem(tableRef, amount) {
    const inc = await tableRef.increment('amount', {by: amount});

    if (inc) {
        await tableRef.save();
        return 'Success';
    } else return 'Item Count Increase Failure: CODE 1';
}

async function makeItem(user, item, amount) {
    // Increase total item count by 1 and save
    user.totitem += 1;
    await user.save();

    // Check item slot for assignments
    let slotCheck = item.Slot ?? item.slot;

    // Dynamic value placeholders
    let dynHands = 'NONE';
    let dynAtk = 0;
    let dynDef = 0;
    if (slotCheck === 'Mainhand') {
        // If item is mainhand only hands and attack are needed
        dynHands = item.Hands ?? item.hands;
        dynAtk = item.Attack ?? item.attack;
    } else if (slotCheck === 'Offhand') {
        // If item is offhand hands is One, both attack and defence are needed
        dynHands = 'One';
        dynAtk = item.Attack ?? item.attack;
        dynDef = item.Defence ?? item.defence;
    } else {
        // Else item is armor and only defence is needed
        dynDef = item.Defence ?? item.defence;
    }

    // Add new item with values filtered through 
    const isDone = await LootStore.create({
        name: item.Name ?? item.name,
        value: item.Value ?? item.value,
        loot_id: item.Loot_id ?? item.loot_id,
        spec_id: user.userid,
        rarity: item.Rarity ?? item.rarity,
        rar_id: item.Rar_id ?? item.rar_id,
        attack: dynAtk,
        defence: dynDef,
        type: item.Type ?? item.type,
        slot: item.Slot ?? item.slot,
        hands: dynHands,
        amount: amount
    });

    if (isDone) {
        return 'Success';
    } else return 'Item Create Failure: CODE 2';
}

module.exports = { checkOwned, increaseItem, makeItem };
