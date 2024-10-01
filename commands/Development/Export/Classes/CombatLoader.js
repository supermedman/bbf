const { Loadout, ItemStrings, UserData, OwnedPotions, Pigmy, ActiveStatus, UserTasks, ItemLootPool } = require('../../../../dbObjects');

const {PigmyInstance} = require('./PigCaste');

const potCatEffects = require('../../../../events/Models/json_prefabs/activeCategoryEffects.json');
const bpList = require('../../../../events/Models/json_prefabs/blueprintList.json');
const { grabRar } = require('../../../Game/exported/grabRar');
const { checkHintStats } = require('../../../Game/exported/handleHints');
const {rollChance, dropChance, makeCapital, sendTimedChannelMessage} = require('../../../../uniHelperFunctions');
const { EmbedBuilder } = require('discord.js');

/**@typedef {{name: string, d: number, cd: number, e: number, cat: string, expired: boolean}} BasePot */
/**
 * @typedef {{potions: BasePot[], upStat: {int: number, dex: number, str: number, spd: number}, upDmg: number, modDmg: number, pigUpMult: number, upDef: number, modDef: number, upExp: number, upCoin: number}} InternalEffects 
 * */
 // Loading Effects Object
 const effectLoader = {
    statPotType: ["Tons", "Strength", "Speed", "Dexterity", "Intelligence"],
    physPotType: ["Reinforce", "Attack", "Pigmy"],
    gainPotType: ["EXP", "COIN"],
    effectStateType: {
        /**
         * This method `Applies` the status effect to the `CombatInstance`
         * @param {InternalEffects} obj Specific Property contained within `CombatInstance(this).InternalEffects`
         * @param {number} eff Magnitude of the effect being applied
         * @returns {number} Updated value
         */
        apply: (obj, eff) => obj += eff,
        /**
         * This method `Removes` the status effect from the `CombatInstance`
         * @param {InternalEffects} obj Specific Property contained within `CombatInstance(this).InternalEffects`
         * @param {number} eff Magnitude of the effect being applied
         * @returns {number} Updated value
         */
        remove: (obj, eff) => obj -= eff
    },
    /**
     * This method applies the given values to the given internalEffects which is by default the higher scoped `this`
     * @param {string} potType Potion ActiveCategory
     * @param {string} stateType One of `apply` || `remove`
     * @param {InternalEffects} internalEffects CombatInstance.internalEffects Data
     * @param {number} effect Magnitude of the effect to manage
     * @returns {void}
     */
    matchType(potType, stateType, internalEffects, effect){
        const appliedState = this.effectStateType[`${stateType}`];

        console.log('Contents of appliedState(): ', appliedState);

        if (this.statPotType.includes(potType)){
            switch(potType){
                case "Tons":
                    internalEffects.upStat.str = appliedState(internalEffects.upStat.str, effect);
                    internalEffects.upStat.spd = appliedState(internalEffects.upStat.spd, effect);
                    internalEffects.upStat.dex = appliedState(internalEffects.upStat.dex, effect);
                    internalEffects.upStat.int = appliedState(internalEffects.upStat.int, effect);
                return;
                case "Strength":
                    internalEffects.upStat.str = appliedState(internalEffects.upStat.str, effect);
                return;
                case "Speed":
                    internalEffects.upStat.spd = appliedState(internalEffects.upStat.spd, effect);
                return;
                case "Dexterity":
                    internalEffects.upStat.dex = appliedState(internalEffects.upStat.dex, effect);
                return;
                case "Intelligence":
                    internalEffects.upStat.int = appliedState(internalEffects.upStat.int, effect);
                return;
            }
        }

        if (this.physPotType.includes(potType)){
            switch(potType){
                case "Reinforce":
                    internalEffects.upDef = appliedState(internalEffects.upDef, effect);
                return;
                case "Attack":
                    internalEffects.upDmg = appliedState(internalEffects.upDmg, effect);
                return;
                case "Pigmy":
                    internalEffects.pigUpMult = appliedState(internalEffects.pigUpMult, effect);
                return;
            }
        }   

        if (this.gainPotType.includes(potType)){
            switch(potType){
                case "EXP":
                    internalEffects.upExp = appliedState(internalEffects.upExp, effect);
                return;
                case "COIN":
                    internalEffects.upCoin = appliedState(internalEffects.upCoin, effect);
                return;
            }
        }
    },
    handleLoad(activeEffect, player, interaction){
        // Potion Blueprint effect Collection
        /**@type {{Name: string, Duration: number, Cooldown: number, Strength: number}} */
        const effectRef = interaction.client.masterBPEffects.get(activeEffect.name);

        /**@type {BasePot} */
        const loadedPot = {
            name: activeEffect.name,
            d: activeEffect.duration,
            cd: activeEffect.cooldown,
            e: effectRef.Strength,
            cat: activeEffect.activec,
            expired: activeEffect.duration <= 0
        };

        if (!loadedPot.expired) {
            console.log('Loaded Potion Effect: ', loadedPot);
            player.internalEffects.potions.push(loadedPot);
            this.matchType(loadedPot.cat, "apply", player.internalEffects, loadedPot.e);
        }
    },
    handleUse(potion, player, interaction, isHealing=false){
        // Potion Blueprint effect Collection
        /**@type {{Name: string, Duration: number, Cooldown: number, Strength: number}} */
        const effectRef = interaction.client.masterBPEffects.get(potion.name);

        /**@type {BasePot} */
        const loadedPot = {
            name: potion.name,
            d: effectRef.Duration,
            cd: effectRef.Cooldown,
            e: effectRef.Strength,
            cat: potion.activeCat,
            expired: false
        };

        player.internalEffects.potions.push(loadedPot);

        if (!isHealing) {
            this.matchType(loadedPot.cat, "apply", player.internalEffects, loadedPot.e);
            return loadedPot;
        }
    }
};

class CombatInstance {
    constructor(user){
        this.userId = user;
        this.level = 1;
        this.health = 100;
        this.totalStats;
        this.staticStats;
        /** 
         * Modifiers from potions, and any other external influences.
         * @type {InternalEffects} 
         * */
        this.internalEffects = {
            potions: [], // Currently tracked effects from potions
            upStat: {
                int: 0,
                dex: 0,
                str: 0,
                spd: 0
            }, // Stats modded from active potions
            upDmg: 0, // Damage addition from effects
            modDmg: 1, // Damage Multiply from effects
            pigUpMult: 1, // Pigmy Damage multiplied from effects
            upDef: 0, // Defence addition from effects
            modDef: 1, // Defence Multiply from effects
            upExp: 1, // EXP modifier, base 1x
            upCoin: 1 // Coin modifier, base 1x
        };
        
        this.staticCondition;
        this.staticDamageBoost;
        this.loadout = {
            ids: [],
            mainhand: "",
            offhand: "",
            headslot: "",
            chestslot: "",
            legslot: ""
        };
        this.potion = {
            id: 0,
            name: "",
            activeCat: "",
            amount: 0,
            effectApplied: 0,
            duration: 0,
            cd: 0,
            isCooling: false,
            cCount: 0
        };
        this.pigmy;
        
        this.buttonState = {
            steal: {
                txt: "Steal",
                disable: false
            },
            hide: {
                txt: "Try to hide",
                disable: false
            }
        };

        this.staticDamage = [];
        this.staticDefence = [];

        this.startTime = new Date().getTime();
        this.deleteAfter = 900000;
        
        this.active = true;
        this.removePending = false;
    }

    
    /**
     * This method should only be called upon a CombatInstance being newly created, it should also only be called once!
     * @param {object} interaction Base Discord Interaction Object
     * @returns {Promise<void>}
     */
    async preloadEffects(interaction){
        const userActiveEffects = await ActiveStatus.findAll({where: {spec_id: this.userId}});
        if (!userActiveEffects.length) return; // No active effects

        if (this.potion.id !== '0'){
            const activeEffectNames = userActiveEffects.map(ae => ae.name);
            if (activeEffectNames.includes(this.potion.name)){
                this.potion.isCooling = true;
                this.potion.cCount = (userActiveEffects.find(ae => ae.name === this.potion.name)).cooldown;
            }
        }

        console.log('LOADING STATUS EFFECTS!!');

        for (const effect of userActiveEffects){
            effectLoader.handleLoad(effect, this, interaction);
        }
        return;
    }

    /**
     * This method is called internally whenever a `ActiveStatus` expires when updating potion counters
     * @ param {object} interaction Base Discord Interaction Object
     * @returns {Promise<void>}
     */
    async updateEffects(){
        const expiredPotions = this.internalEffects.potions.filter(p => p.expired);
        if (expiredPotions.length === 0) return;

        for (const pot of expiredPotions){
            // const storedEffect = await ActiveStatus.findOne({where: {spec_id: this.userId, name: pot.name}});
            // if (!storedEffect) continue;
            // await storedEffect.destroy();
            effectLoader.matchType(pot.cat, 'remove', this.internalEffects, pot.e);
        }

        this.internalEffects.potions = this.internalEffects.potions.filter(p => !p.expired);
    }

    /**
     * This method should be called anytime potion counters are to be updated, afterwards internal stats should be reloaded
     * @param {object} interaction Base Discord Interaction Object
     * @param {string} status To be used with condintional updates?!
     * @returns {Promise<void>}
     */
    async updatePotionCounters(interaction, status){
        if (status) console.log('Given Status: ', status);

        if (this.potion.isCooling){
            this.potion.cCount--;
            if (this.potion.cCount <= 0) this.potion.isCooling = false;
        }

        const allStoredActiveEffects = await ActiveStatus.findAll({where: {spec_id: this.userId}});
        const storedEffectsToCount = allStoredActiveEffects.filter(e => !["EXP", "COIN"].includes(e.activec));
        if (!storedEffectsToCount.length) return;

        const fadedEffectsList = [], cooledEffectsList = [], expiredEffectsList = [];
        let runUpdateCycle = false;
        for (const effect of storedEffectsToCount){
            const entryUpdateObj = {cooldown: effect.cooldown, duration: effect.duration};
            const matchingInternalPot = this.internalEffects.potions.find(p => p.name === effect.name);
            if (entryUpdateObj.cooldown > 0) {
                --entryUpdateObj.cooldown;
                if (matchingInternalPot) --matchingInternalPot.cd;
                if (entryUpdateObj.cooldown <= 0) cooledEffectsList.push(effect);
            }
            if (entryUpdateObj.duration > 0) {
                --entryUpdateObj.duration;
                if (matchingInternalPot) --matchingInternalPot.d;
                if (entryUpdateObj.duration <= 0) {
                    fadedEffectsList.push(effect);
                    if (matchingInternalPot) matchingInternalPot.expired = true;
                    runUpdateCycle = true;
                }
            }
            if (entryUpdateObj.cooldown <= 0 && entryUpdateObj.duration <= 0){
                // To be removed
                expiredEffectsList.push(effect);
                continue;
            } else {
                await effect.update(entryUpdateObj).then(async ae => await ae.save()).then(async ae => {return await ae.reload()});
            }
        }

        if (fadedEffectsList.length > 0){
            const potExpiredEmbed = new EmbedBuilder()
            .setTitle('Effects wore off..')
            .setColor('DarkOrange')
            .setDescription(fadedEffectsList.map(p => `\`${makeCapital(p.name)}\``).join('\n'));

            if (interaction) await sendTimedChannelMessage(interaction, 35000, potExpiredEmbed);
        } else if (cooledEffectsList.length > 0){
            const potCooledEmbed = new EmbedBuilder()
            .setTitle('Potions can be used again!')
            .setColor('DarkAqua')
            .setDescription(cooledEffectsList.map(p => `\`${makeCapital(p.name)}\``).join('\n'));

            if (interaction) await sendTimedChannelMessage(interaction, 35000, potCooledEmbed);
        }

        if (expiredEffectsList.length > 0){
            for (const expiredEff of expiredEffectsList){
                await expiredEff.destroy();
            }
        } 
        
        if (runUpdateCycle) await this.updateEffects();
    }

    /**
     * This method handles the effect of using the currently equipped potion
     * @param {object} interaction Base Discord Slash Command Interaction Object
     * @returns {Promise <{title: string, desc: string, type: string}>}
     */
    async potionUsed(interaction){
        const potionDisplay = {title: "Potion Not Used", desc: "Full Health", type: "Heal"};

        if (this.potion.activeCat === "Healing"){
            // Handle slightly differently
            if (this.health === this.maxHealth) return potionDisplay;
            if (this.health + this.potion.effectApplied > this.maxHealth){
                this.health = this.maxHealth;
            } else this.health += this.potion.effectApplied;
            potionDisplay.title = "Potion Used";
            potionDisplay.desc = `Healed for ${this.potion.effectApplied}`;
            effectLoader.handleUse(this.potion, this, interaction, true);
            await this.drinkPotion();
            return potionDisplay;
        }

        // Load potion equipped as new internal effect entry and retrieve potObj
        const potObj = effectLoader.handleUse(this.potion, this, interaction);
        // Set Display to standard values
        potionDisplay.title = "Potion Used";
        potionDisplay.type = potObj.cat;

        const statDisplayList = ["Tons", "Strength", "Speed", "Dexterity", "Intelligence"];
        const physDisplayList = ["Reinforce", "Attack", "Pigmy"];
        const gainDisplayList = ["EXP", "COIN"];
        if (statDisplayList.indexOf(potObj.cat) !== -1){
            // Effects Stats
            switch(potObj.cat){
                case "Tons":
                    potionDisplay.desc = `All Stats: +**${potObj.e}**`;
                break;
                case "Strength":
                    potionDisplay.desc = `Strength: +**${potObj.e}**`;
                break;
                case "Speed":
                    potionDisplay.desc = `Speed: +**${potObj.e}**`;
                break;
                case "Dexterity":
                    potionDisplay.desc = `Dexterity: +**${potObj.e}**`;
                break;
                case "Intelligence":
                    potionDisplay.desc = `Intelligence: +**${potObj.e}**`;
                break;
            }
        } else if (physDisplayList.indexOf(potObj.cat) !== -1){
            // Effects damage or defence
            switch(potObj.cat){
                case "Reinforce":
                    potionDisplay.desc = `Base Defence: +**${potObj.e}** DEF`;
                break;
                case "Attack":
                    potionDisplay.desc = `Base Damage: +**${potObj.e}** DMG`;
                break;
                case "Pigmy":
                    potionDisplay.desc = `Pigmy Damage Multiplier: x**${potObj.e}**`;
                break;
            }
        } else if (gainDisplayList.indexOf(potObj.cat) !== -1){
            // Effects xp or coins
            switch(potObj.cat){
                case "EXP":
                    potionDisplay.desc = `XP Gained: x**${1 + potObj.e}**`;
                break;
                case "COIN":
                    potionDisplay.desc = `Coins Gained: x**${1 + potObj.e}**`;
                break;
            }
        }

        // Add !
        potionDisplay.desc += '!';
        
        // Reload Basic stats accounting for potion used
        await this.#loadBasicStats();
        // Consume potion handling cooldown applied, creating status entry, and updating all needed values
        await this.drinkPotion();
        // Return display for User Feedback
        return potionDisplay;

        // Create new potion effect entry internally.
        // if (this.potion.activeCat === "Healing"){
        //     if (this.health === this.maxHealth) return {title: "Potion Not Used", desc: "Full Health", type: "Heal"};
        //     if ((this.health + this.potion.effectApplied) > this.maxHealth){
        //         this.health = this.maxHealth;
        //     } else this.health += this.potion.effectApplied;
        //     this.potion.amount -= 1;
        //     this.drinkPotion();
        //     this.onCooldown();
        //     return {title: "Potion Used", desc: `Healed for ${this.potion.effectApplied}`, type: "Heal"};
        // }

        // /**
        //  *      == Potion Types ==
        //  * 
        //  *      - All stat up
        //  *      - Single stat up
        //  * 
        //  *      - Defence up
        //  *      - Attack up
        //  * 
        //  *      - Xp up
        //  *      - Coin up
        //  * 
        //  *      - other??
        //  * 
        //  * @prop {number} d Potion duration
        //  * @prop {number} e Effect Strength
        //  * @prop {string} cat Effect category/target for modifying
        //  */
        // // const potObj = {name: this.potion.name, d: this.potion.duration, e: this.potion.effectApplied, cat: this.potion.activeCat, expired: false};
        // let effectDisplay;
        // // Create type filter
        // const statModList = ["Tons", "Strength", "Speed", "Dexterity", "Intelligence"];
        // const physModList = ["Reinforce", "Attack", "Pigmy"];
        // const gainModList = ["EXP", "COIN"];
        // if (statModList.indexOf(potObj.cat) !== -1){
        //     // Effects Stats
        //     switch(potObj.cat){
        //         case "Tons":
        //             this.internalEffects.upStat.str += potObj.e;
        //             this.internalEffects.upStat.spd += potObj.e;
        //             this.internalEffects.upStat.dex += potObj.e;
        //             this.internalEffects.upStat.int += potObj.e;
        //             effectDisplay = `All Stats: +**${potObj.e}**`;
        //         break;
        //         case "Strength":
        //             this.internalEffects.upStat.str += potObj.e;
        //             effectDisplay = `Strength: +**${potObj.e}**`;
        //         break;
        //         case "Speed":
        //             this.internalEffects.upStat.spd += potObj.e;
        //             effectDisplay = `Speed: +**${potObj.e}**`;
        //         break;
        //         case "Dexterity":
        //             this.internalEffects.upStat.dex += potObj.e;
        //             effectDisplay = `Dexterity: +**${potObj.e}**`;
        //         break;
        //         case "Intelligence":
        //             this.internalEffects.upStat.int += potObj.e;
        //             effectDisplay = `Intelligence: +**${potObj.e}**`;
        //         break;
        //     }
        // }
        // if (physModList.indexOf(potObj.cat) !== -1){
        //     // Effects damage or defence
        //     switch(potObj.cat){
        //         case "Reinforce":
        //             this.internalEffects.upDef += potObj.e;
        //             effectDisplay = `Base Defence: +**${potObj.e}** DEF`;
        //         break;
        //         case "Attack":
        //             this.internalEffects.upDmg += potObj.e;
        //             effectDisplay = `Base Damage: +**${potObj.e}** DMG`;
        //         break;
        //         case "Pigmy":
        //             this.internalEffects.pigUpMult += potObj.e;
        //             effectDisplay = `Pigmy Damage Multiplier: x**${potObj.e}**`;
        //         break;
        //     }
        // }
        // if (gainModList.indexOf(potObj.cat) !== -1){
        //     // Effects xp or coins
        //     switch(potObj.cat){
        //         case "EXP":
        //             this.internalEffects.upExp += potObj.e;
        //             effectDisplay = `XP Gained: x**${1 + potObj.e}**`;
        //         break;
        //         case "COIN":
        //             this.internalEffects.upCoin += potObj.e;
        //             effectDisplay = `Coins Gained: x**${1 + potObj.e}**`;
        //         break;
        //     }
        // }
        // this.internalEffects.potions.push(potObj);
        // Update needed values.
        // Recalculate basic stat outcomes
        // await this.#loadBasicStats();
        // // this.potion.amount -= 1;
        // this.drinkPotion();
        // // this.onCooldown();
        // return {title: "Potion Used", desc: `${effectDisplay}!`, type: potObj.cat};
    }

    async potionExpired(){
        const expiredPots = this.internalEffects.potions.filter(pot => pot.expired);
        if (expiredPots.length === 0) return;
        const remainingPots = this.internalEffects.potions.filter(pot => !pot.expired);

        const statModList = ["Tons", "Strength", "Speed", "Dexterity", "Intelligence"];
        const physModList = ["Reinforce", "Attack", "Pigmy"];
        const gainModList = ["EXP", "COIN"];

        for (const pot of expiredPots){
            if (statModList.indexOf(pot.cat) !== -1){
                // Effects Stats
                switch(pot.cat){
                    case "Tons":
                        this.internalEffects.upStat.str -= pot.e;
                        this.internalEffects.upStat.spd -= pot.e;
                        this.internalEffects.upStat.dex -= pot.e;
                        this.internalEffects.upStat.int -= pot.e;
                    break;
                    case "Strength":
                        this.internalEffects.upStat.str -= pot.e;
                    break;
                    case "Speed":
                        this.internalEffects.upStat.spd -= pot.e;
                    break;
                    case "Dexterity":
                        this.internalEffects.upStat.dex -= pot.e;
                    break;
                    case "Intelligence":
                        this.internalEffects.upStat.int -= pot.e;
                    break;
                }
            }
            if (physModList.indexOf(pot.cat) !== -1){
                // Effects damage or defence
                switch(pot.cat){
                    case "Reinforce":
                        this.internalEffects.upDef -= pot.e;
                    break;
                    case "Attack":
                        this.internalEffects.upDmg -= pot.e;
                    break;
                    case "Pigmy":
                        this.internalEffects.pigUpMult -= pot.e;
                    break;
                }
            }
            if (gainModList.indexOf(pot.cat) !== -1){
                // Effects xp or coins
                switch(pot.cat){
                    case "EXP":
                        this.internalEffects.upExp -= pot.e;
                    break;
                    case "COIN":
                        this.internalEffects.upCoin -= pot.e;
                    break;
                }
            }
        }

        await this.#clearExpiredPotions(expiredPots);

        this.internalEffects.potions = remainingPots;
        return;
    }

    async #clearExpiredPotions(potList){
        for (const pot of potList){
            const potRef = await ActiveStatus.findOne({where: {name: pot.name, spec_id: this.userId}});
            await potRef.destroy(); //.then(async pr => {return await pr.reload()});
        }
    }

    onCooldown(){
        // Set current potion on cooldown
        this.potion.isCooling = true;
        this.potion.cCount = this.potion.cd;
    }

    async checkPotionUse(){
        if (this.potion.id === 0) return;
        const potMatch = await OwnedPotions.findOne({where: {spec_id: this.userId, potion_id: this.potion.id}});
        if (!potMatch) return;
        if (this.potion.amount !== potMatch.amount){
            if (this.potion.amount === 0){
                //Destroy potion entry
                //const potRem = await potMatch.destroy();
                //if (potRem > 0) return;
                await potMatch.destroy();
            } else {
                const potDiff = Math.abs(this.potion.amount - potMatch.amount);
                const dec = await potMatch.decrement('amount', { by: potDiff });
                if (dec) await potMatch.save();
            }
        }
    }

    async drinkPotion(){
        this.potion.amount -= 1;
        this.onCooldown();

        const p = await OwnedPotions.findOne({
            where: {
                spec_id: this.userId, 
                potion_id: this.potion.id
            }
        });

        // Handle creating status effect.
        let theStatus = await ActiveStatus.findOrCreate({
            where: {
                potionid: this.potion.id,
                spec_id: this.userId
            },
            defaults: {
                name: p.name,
                curreffect: this.potion.effectApplied,
                activec: p.activecategory,
                duration: p.duration,
                cooldown: p.cooldown,
            }
        });

        if (theStatus[1]){
            theStatus[0].update({
                name: p.name,
                curreffect: this.potion.effectApplied,
                activec: p.activecategory,
                duration: p.duration,
                cooldown: p.cooldown,
            }).then(async s => await s.save()).then(async s => {return await s.reload()});
        }

        theStatus = theStatus[0];

        await p.decrement('amount', {by: 1}).then(async pot => {return await pot.reload();});
        
        if (p.amount <= 0) await p.destroy();

        return;
    }

    async handlePotionCounters(){
        // For each active effect dec by 1 on duration and cooldown
        if (this.internalEffects.potions.length > 0){
            for (const eff of this.internalEffects.potions){
                if (eff.d - 1 <= 0){
                    eff.expired = true;
                } else eff.d--;
            }
            await this.potionExpired();
        }
        if (this.potion.isCooling) {
            if (this.potion.cCount - 1 <= 0) {
                this.potion.isCooling = false;
                this.potion.cCount = 0;
            } else this.potion.cCount--;
        }
        return;
    }

    async handleCombatWin(enemy, interaction){
        const u = await UserData.findOne({where: {userid: this.userId}}); 
        const activeFilterCT = await UserTasks.findAll({
            where: {
                userid: this.userId,
                task_type: "Combat",
                complete: false,
                failed: false
            }
        }).then(aCT => {
            return aCT.filter(task => task.condition <= enemy.level);
        });

        if (activeFilterCT.length > 0){
            for (const task of activeFilterCT){
                await task.increment('amount').then(async t => {return await t.reload()});
            }
        }

        await u.increment(['totalkills', 'killsthislife'], {by: 1}).then(async nU => {return await nU.reload()});
        
        if (u.totalkills > 10){
            await checkHintStats(u, interaction);
        }

        this.buttonState.steal.txt = 'Steal';
        this.buttonState.steal.disable = false;

        this.buttonState.hide.txt = 'Try to hide';
        this.buttonState.hide.disable = false;

        return;
    }

    #applyClassDMGBuff(){
        const dmgModC = ["Mage", "Thief", "Warrior", "Paladin"];
        const dmgModM = [0.15, 0, 0.05, -0.05];
        const modBy = 1 + dmgModM[dmgModC.indexOf(this.staticStats.pClass)];
        this.internalEffects.modDmg = modBy;
        return;
    }

    #applyClassDEFBuff(){
        const defModC = ["Mage", "Thief", "Warrior", "Paladin"];
        const defModM = [-0.05, 0, 0.05, 0.15];
        const modBy = 1 + defModM[defModC.indexOf(this.staticStats.pClass)];
        this.internalEffects.modDef = modBy;
        return;
    }

    async #loadBasicStats(){
        await this.#handleCombStats();
        
        let thiefBuff = (this.pClass === 'Thief') ? 0.1 : 0;
        this.staticExtras = (this.totalStats.spd * 0.02) + (this.totalStats.dex * 0.02);
        this.staticCondition = {
            DH: (this.totalStats.spd * 0.02) + thiefBuff,
            Crit: (this.totalStats.dex * 0.02) + thiefBuff
        };
        this.staticDamageBoost = (this.totalStats.str * 3) + (this.totalStats.int * 10) + this.internalEffects.upDmg;
        return;
    }

    async #handleCombStats(){
        const pigCheck = await Pigmy.findOne({where: {spec_id: this.userId}});
        if (pigCheck){
            if (!this.pigmy){
                this.#handlePigmyStats(pigCheck);
            } else if (this.pigmy.level === pigCheck.level && this.pigmy.refID === pigCheck.refid){
                // Do Nothing, nothing changed
            } else {
                this.#handlePigmyStats(pigCheck);
            }
        }

        this.#applyClassDMGBuff();
        this.#applyClassDEFBuff();

        let intUP = (this.pigmy?.int ?? 0) + this.internalEffects.upStat.int,
        strUP = (this.pigmy?.str ?? 0) + this.internalEffects.upStat.str,
        spdUP = (this.pigmy?.spd ?? 0) + this.internalEffects.upStat.spd, 
        dexUP = (this.pigmy?.dex ?? 0) + this.internalEffects.upStat.dex;

        this.internalEffects.upDmg = this.pigmy?.dmg ?? 0;

        this.totalStats = {
            int: this.staticStats.int + intUP,
            str: this.staticStats.str + strUP,
            spd: this.staticStats.spd + spdUP,
            dex: this.staticStats.dex + dexUP
        };

        return;
    }

    #handlePigmyStats(pigmy){
        this.pigmy = new PigmyInstance(pigmy);
        this.pigmy.loadInternals();
        this.pigmy.dmg *= this.internalEffects.pigUpMult;
        return;
    }

    async retrieveBasicStats(dungeonLoad=false){
        const uData = await UserData.findOne({where: {userid: this.userId}});

        this.level = uData.level;
        this.staticStats = {
            pClass: uData.pclass,
            int: uData.intelligence,
            dex: uData.dexterity,
            spd: uData.speed,
            str: uData.strength
        };

        this.dropChance = this.#setDropChance();
        this.upChance = this.#setUpgradeChance();

        await this.#loadBasicStats();

        this.health = this.#setFullHealth();
        if (!dungeonLoad){
            if (this.health > uData.health) this.health = uData.health;
        }
        return;
    }

    #setFullHealth(){
        const healthModC = ["Mage", "Thief", "Warrior", "Paladin"];
        const healthModM = [1.1, 1.2, 1.5, 2];
        const healthBase = 100;

        let finalHealth = healthBase + (this.level * 2) + (this.totalStats.str * 5);
        finalHealth *= healthModM[healthModC.indexOf(this.staticStats.pClass)];
        return finalHealth;
    }

    get maxHealth(){
        return this.#setFullHealth();
    }

    async checkHealth(){
        const u = await UserData.findOne({where: {userid: this.userId}});
        if (u.health !== this.health){
            // Update Health
            u.health = this.health;
            await u.save();
        }
        return;
    }

    takeDamage(dmg){
        this.health -= dmg;
        let dmgCondition = "RELOAD"
        if (this.health <= 0) dmgCondition = "PDEAD";
        this.health = Math.ceil(this.health);
        return {health: this.health, outcome: dmgCondition};
    }

    async revive(enemy){
        const u = await UserData.findOne({where: {userid: this.userId}});
        let newHighest = u.highestkills;
        if (u.highestkills < u.killsthislife){
            newHighest = u.killsthislife;
        }
        
        await u.update({
            health: this.maxHealth, 
            highestkills: newHighest, 
            killsthislife: 0,
            lastdeath: enemy.name
        })
        .then(async nU => {return await nU.reload()})
        .then(nU => this.health = nU.health);
        
        return;
    }

    #setDropChance(){
        let chanceToBeat = 0.850;
        chanceToBeat -= (this.staticStats.pClass === 'Thief') ? 0.1 : 0;
        if (this.level >= 31){
            if ((Math.floor(this.level / 4) * 0.01) > 0.25) {
                chanceToBeat -= 0.25;
            } else chanceToBeat -= (Math.floor(this.level / 4) * 0.01);
        }

        // Pigmy Check here
        if (this.pigmy){
            if ((Math.floor(this.pigmy.level / 3) * 0.02) > 0.25) {
                chanceToBeat -= 0.25;
            } else chanceToBeat -= (Math.floor(this.pigmy.level / 3) * 0.02);
        }

        return chanceToBeat;
    }

    #setUpgradeChance(){
        let chanceToBeat = 1;
        chanceToBeat -= (this.staticStats.pClass === 'Thief') ? 0.05 : 0;
        if (this.level >= 31) {
            if ((Math.floor(this.level / 5) * 0.01) > 0.10) {
                chanceToBeat -= 0.10;
            } else chanceToBeat -= (Math.floor(this.level / 5) * 0.01);
        }

        // Pigmy Check here
        if (this.pigmy){
            if ((Math.floor(this.pigmy.level / 5) * 0.01) > 0.05){
                chanceToBeat -= 0.05;
            } else chanceToBeat -= Math.floor(this.pigmy.level / 5) * 0.01;
        }

        return chanceToBeat;
    }

    async reloadInternals(dungeonLoad=false){
        const leveled = await UserData.findOne({where: {userid: this.userId}});
        if (leveled.level !== this.level) await this.retrieveBasicStats(dungeonLoad);

        const needUpdated = await this.#checkLoadoutChanges();
        if (needUpdated !== "No Update"){
            this.#updateLoadoutIds(needUpdated);
            await this.retrieveLoadout();
        }
        return;
    }

    async retrieveLoadout(){
        let loadoutMatch = await Loadout.findOrCreate({
            where: {
                spec_id: this.userId
            }
        });

        if (loadoutMatch[1]){
            await loadoutMatch[0].save().then(async l => {return await l.reload()});
        }

        loadoutMatch = loadoutMatch[0];

        // const loadoutMatch = userLoadoutTestObj; // TEMPORARY
        if (this.loadout.ids.length === 0 && !loadoutMatch) {
            this.loadout.ids = [0, 0, 0, 0, 0];
        } else if (this.loadout.ids.length === 0 && loadoutMatch){
            this.loadout.ids.push(loadoutMatch.mainhand, loadoutMatch.offhand, loadoutMatch.headslot, loadoutMatch.chestslot, loadoutMatch.legslot);
        }
        await this.#loadItemStrings();
        if (loadoutMatch && loadoutMatch.potionone !== 0){
            await this.#loadCurrentPotion(loadoutMatch.potionone);
        }
        return;
    }

    async #loadCurrentPotion(potID){
        if (this.potion.id !== 0){
            if (this.potion.id === potID){
                const potCheck = await OwnedPotions.findOne({where: {spec_id: this.userId, potion_id: potID}});
                if (!potCheck) {
                    this.potion.amount = 0;
                    return;
                }
                if (this.potion.amount !== potCheck.amount) this.potion.amount = potCheck.amount;
                return;
            }
        }

        this.potion.id = potID;
        const potMatch = await OwnedPotions.findOne({where: {spec_id: this.userId, potion_id: potID}});
        if (potMatch){
            this.potion.name = potMatch.name;
            this.potion.activeCat = potMatch.activecategory;
            this.potion.amount = potMatch.amount;
            this.potion.cd = potMatch.cooldown;
            this.potion.duration = potMatch.duration;
            const potEffect = potCatEffects.filter(effect => effect.Name === potMatch.activecategory)[0][`${potMatch.name}`];
            this.potion.effectApplied = potEffect;
            return;
        }

        const potRef = bpList.filter(bp => bp.PotionID && bp.PotionID === potID)[0];
        if (potRef){
            this.potion.name = potRef.Name;
            this.potion.activeCat = potRef.ActiveCategory;
            this.potion.amount = 0;
            this.potion.cd = potRef.CoolDown;
            this.potion.duration = potRef.Duration;
            const potEffect = potCatEffects.filter(effect => effect.Name === potRef.ActiveCategory)[0][`${potRef.Name}`];
            this.potion.effectApplied = potEffect;
            return;
        }
        
    }

    async #loadItemStrings(){
        const slotMatch = ["mainhand", "offhand", "headslot", "chestslot", "legslot"];
        let curSlotIdx = 0;
        for (const id of this.loadout.ids){
            let itemMatch = await ItemStrings.findOne({where: {user_id: this.userId, item_id: id}});
            // let itemMatch = userOwnedItemsObjList.filter(item => item.user_id === this.userId && item.item_id === id)[0]; // TEMPORARY
            if (id === '0' && !itemMatch) {
                console.log(`No ${slotMatch[curSlotIdx]} Equipped!!`); 
                itemMatch = {item_code: "NONE"};
            }
            if (!itemMatch) {
                console.log(`${slotMatch[curSlotIdx]} Not Found!!`);
                console.log('Attempting to load from Static loot pool!!');
                const backUpMatch = await ItemLootPool.findOne({where: {creation_offset_id: id}});
                if (backUpMatch) {
                    console.log('Backup FOUND!');
                    itemMatch = {item_code: backUpMatch.item_code};
                } else {
                    console.log('Backup NOT FOUND!');
                    itemMatch = {item_code: "NONE"};
                }
            }
            this.loadout[`${slotMatch[curSlotIdx]}`] = itemMatch.item_code;
            curSlotIdx++;
        }
        return;
    }

    async #checkLoadoutChanges(){
        const slotMatch = ["mainhand", "offhand", "headslot", "chestslot", "legslot"];
        let curSlotIdx = 0;
        const loadoutMatch = await Loadout.findOne({where: {spec_id: this.userId}});
        await this.#loadCurrentPotion(loadoutMatch.potionone);

        let updateList = [];
        for (const id of this.loadout.ids){
            if (id !== loadoutMatch[`${slotMatch[curSlotIdx]}`]){
                updateList.push({slot: slotMatch[curSlotIdx], id: loadoutMatch[`${slotMatch[curSlotIdx]}`]});
            }
            curSlotIdx++;
        }

        if (updateList.length === 0) return "No Update";
        return updateList;
    }

    #updateLoadoutIds(updateList){
        const slotMatch = ["mainhand", "offhand", "headslot", "chestslot", "legslot"];
        for (const upObj of updateList){
            this.loadout.ids[slotMatch.indexOf(upObj.slot)] = upObj.id;
        }
        return;
    }

    rollDH(){
        return rollChance(this.staticCondition.DH);
    }

    rollCrit(){
        return rollChance(this.staticCondition.Crit);
    }

    async rollItemRar(enemy){
        let baseRar = await grabRar(enemy.level);
        if (baseRar < 10 && dropChance(this.upChance)) baseRar++;
        return baseRar;
    }

    hiding(enemy){
        return rollChance(this.staticExtras - (enemy.level * 0.01));
    }

    sweepCheck(now = new Date().getTime()){
        if (this.startTime - now >= this.deleteAfter && !this.active) this.removePending = true;
        return 'Finished';
    }

    setActive(){
        this.active = true;
    }

    setInactive(){
        this.active = false;
    }
}

module.exports = { CombatInstance };