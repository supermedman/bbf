//User attempts to hide from the enemy
//If successful hide button becomes ESCAPE
//If hidden attacking counts as backstab dealing bonus damage
//If hiding fails user is punished

async function hiding(enemy, user) {

    const spd = user.speed;
    const dex = user.dexterity;

    const baseChance = ((spd * 0.02) + (dex * 0.02));
    console.log(`baseChance: ${baseChance}`);
    var totalChance;

    const difficultyChange = enemy.level * 0.01;
    if ((baseChance - difficultyChange) <= 0) {
        //Chance to succed is 0 or lower 
        //Result is fail
        return 'FAILED';
    } else { totalChance = baseChance - difficultyChange; }
    console.log(`totalChance: ${totalChance}`);

    const rolledChance = Math.random();
    console.log(`rolledChance: ${rolledChance}`);
    if (rolledChance < totalChance) {
        //Hide has been successful!!
        return 'SUCCESS';
    } else {
        //Hide has failed
        return 'FAILED';
    }
}

module.exports = { hiding };