module.exports = (sequelize, DataTypes) => {
    return sequelize.define('UserHints', {
        spec_id: {
            type: DataTypes.STRING,
            unique: true,
        },

        suggest_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        stats_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        viewmat_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        combmat_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        dismmat_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        umat_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        viewloot_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        sellloot_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        buyloot_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        dismloot_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        equip_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        inspect_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        potequip_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        uequip_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        levelfive_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        levelthirty_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        quest_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        storyquest_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        lore_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        dungeon_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        viewbluey_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        potbluey_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        toolbluey_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        ubluey_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        pigmy_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        pigmygive_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        trade_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        gamble_hint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    });
};