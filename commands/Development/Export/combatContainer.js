// Used for any external methods, calls, filtering related to combat itself. 

// ===============================
//       COMBAT/ITEM KEYS
// ===============================
const dmgKeys = new Map([
    ["BLph", "Blunt"],
    ["SLph", "Slash"],
    ["MAma", "Magic"],
    ["RAma", "Rad"],
    ["FRma", "Frost"],
    ["FIma", "Fire"],
    ["DAma", "Dark"],
    ["LIma", "Light"],
    ["NUsp", "Null"],
    ["PAsp", "Pain"],
    ["SPsp", "Spirit"],
    ["CHsp", "Chaos"]
]);

// Not currently in use!
const rarKeys = new Map([
    ["r00", "Common"],
    ["r01", "Uncommon"],
    ["r02", "Rare"],
    ["r03", "Very Rare"],
    ["r04", "Epic"],
    ["r05", "Mystic"],
    ["r06", "?"],
    ["r07", "??"],
    ["r08", "???"],
    ["r09", "????"],
    ["r10", "Forgotten"],
    ["r12", "Unique"]
]);

// Not currently in use!
const disKeys = new Map([
    ["SL", "Slimy"],
    ["HE", "Herby"],
    ["WO", "Woody"],
    ["SK", "Skinny"],
    ["FL", "Fleshy"],
    ["SI", "Silky"],
    ["MA", "Magical"],
    ["ME", "Metalic"],
    ["RO", "Rocky"],
    ["GE", "Gemy"],
    ["TO", "Tooly"],
    ["UN", "Unique"]
]);

// Not currently in use!
const slotKeys = new Map([
    ["HEslo", "Headslot"],
    ["CHslo", "Chestslot"],
    ["LEslo", "Legslot"],
    ["MAslo", "Mainhand"],
    ["OFslo", "Offhand"]
]);

const statusKeys = new Map([
    ["Blunt", "Concussion"],
    ["Slash", "TBD"],
    ["Magic", "MagiWeak"],
    ["Rad", "Confusion"],
    ["Frost", "Slow"],
    ["Fire", "TBD"],
    ["Dark", "Blind"],
    ["Light", "Flash"]
]);

// ===============================
//       LOOKUP TABLES
// ===============================

const fleshTypes = ["Flesh", "Magical Flesh", "Specter", "Boss"];
const armorTypes = ["Armor", "Bark", "Fossil", "Demon"];
const shieldTypes = ["Phase Demon", "Phase Aura", /*"Plot Armor"*/];

const damageModifier = [-0.75, -0.50, -0.25, 0, 0.25, 0.50, 0.75];
const damageKeyIndexer = ["---", "--", "-", "=", "+", "++", "+++"];

const columnMatch = ["Flesh", "Armor", "Bark", "Fossil", "Magical Flesh", "Specter", "Demon", "Phase Demon", "Phase Aura", "Boss", "Plot Armor"];
const rowMatch = ["Blunt", "Slash", "Magic", "Rad", "Frost", "Fire", "Dark", "Light", "Null", "Pain", "Spirit", "Chaos", "True"];

const damageMatchTable = [
    ["+", "+++", "+", "++", "-", "---", "=", "=", "---", "-", "---",],
    ["++", "-", "+", "-", "+", "---", "=", "=", "---", "-", "---"],
    ["=","=","=","=","--","++","+","-","-","-", "---"],
    ["+++","+","=","=","++","--","+","+","++","+", "---"],
    ["+","++","++","-","-","-","++","--","-","-", "---"],
    ["++", "-", "+++", "-", "-", "-", "-", "-", "-", "-", "---"],
    ["=","=","+","=","-","--","--","+++","-","-", "---"],
    ["=","=","--","=","-","+++","+++","--","-","-", "---"],
    ["=","=","=","=","+++","=","+","++","+++","++", "---"],
    ["++","+","+","+","+","+","+","+","+","++", "---"],
    ["+","+","+","+","++","+","+","+","+","++", "---"],
    ["++","+","+","+","+","+","+","+","+","++", "---"],
];

// ===============================
//       STATUS EFFECTS
// ===============================

const {statusContainer} = require('./statusEffect');
