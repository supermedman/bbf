const {UserMaterials} = require('../../../dbObjects');
const { randArrPos } = require('../../../uniHelperFunctions');
const { checkingRarID, loadFullDismantleList, loadFullRarNameList } = require('./itemStringCore');

function makeMatObj(){
    // Testing new material storage methods
    // GOAL: Reduce DB size of stored materials

    // Idea 1: 
    // Store one table entry per matType per user

    // Table Layout:
    //  {
    //      userid: user.userid,
    //      mattype: 'slimy',
    //      matdata: '{"0": 0, "1": 0, "2": 0, /**...*/}'
    //  }

    // matdata: JSON string object
    // key['rar_id']: value['amount']

    // Unique matdata storage: 
    // key['uniqueList.UniqueMatch']: value['amount']

    // Cache matfile details:
    // client.materials = new Collection()
    /**
     *  for (const matfile of matFolderFiles){
     *      const matRefList = require(matfile);
     *      const matFileType = matfile.split('List')[0];
     *      
     *      const matRefDataList = [];
     *      for (const matRef of matRefList){
     *          matRefDataList.push(matRef);
     *      }
     *      matRefDataList.sort((a,b) => a.Mat_id - b.Mat_id);
     *      client.materials.set(matFileType, matRefDataList);
     *  }
     */
    // =============

    // Retrieving STATIC matData:
    /**
     *  const {materials} = interaction.client;
     *  
     *  // Any method of obtaining mattype as string
     *  const mType = 'slimy'; 
     * 
     *  // Any method of obtaining rarity/rar_id either string or number
     *  const mRar = 'Common' || 0 
     * 
     *  // If material is unique type string, otherwise undefined
     *  const mUType = 'Dark' || undefined 
     * 
     * 
     *  const matDataList = materials.get(mType);
     *  
     *  const convertRarToID = r => {
     *      if (isNaN(r) && typeof r === 'string'){
     *          // Extract Rar_id from r
     *      } else return +r;
     *  };
     * 
     *  const isUnique = r => convertRarToID(r) === 12;
     * 
     *  const isUniqueMatch = (mat, u) => mat.UniqueMatch === u;
     *  
     *  const isMatMatch = (mat, r) => mat.Rar_id === convertRarToID(r);
     * 
     *  const isRefMatch = (r, mat, u) => {
     *      if (u && isUnique(r)){
     *          return isUniqueMatch(mat, u);
     *      } else return isMatMatch(mat, r);
     *  };
     *  
     *  // Final Material Ref Match.
     *  const matMatch = matDataList.find(mat => isRefMatch(mRar, mat, mUType));
     */
    // ======================

    // Retrieving STORED matData:
    /**
     *  // Retrieve ALL Single User Stored materials
     *  const userMats = await UserMaterials.findAll({where: {userid: user.userid}});
     *  
     *  // Defined by some interaction
     *  const mType = 'slimy'; 
     *  const mRar = ('Common' || 0 || '0');
     * 
     *  // Retrieve ONE Single User Stored Material Type
     *  const userMatMatch = await UserMaterials.findOne({where: {userid: user.userid, mattype: mType}});
     *  // Parsed JSON Object
     *  const mdObj = JSON.parse(userMatMatch.matdata);
     *  
     *  const convertRarToID = r => {
     *      if (isNaN(r) && typeof r === 'string'){
     *          // Extract Rar_id from r
     *      } else return +r;
     *  };
     * 
     *  // typeof `storedMatData` === 'number' && `storedMatData` === Material Amount Owned 
     *  const storedMatData = mdObj[`${convertRarToID(mRar)}`];
     */
    // ======================

    // Creating full Material Entry List:
    /**
     *  const {materials} = interaction.client;
     * 
     *  const entryExists = async t => await UserMaterials.findOne({where: {userid: user.userid, mattype: t}});
     * 
     *  // Initial Table Entries created all at once 
     *  for (const key of materials.keys()){
     *      if ((await entryExists(key))) continue;
     *      const mDataObj = materials.get(key).reduce((acc, mat) => {
     *          if (key === 'unique'){
     *              acc[`${mat.UniqueMatch}`] = 0;
     *          } else acc[`"${mat.Rar_id}"`] = 0;
     *          return acc;
     *      }, {});
     * 
     *      await UserMaterials.create({
     *          userid: user.userid,
     *          mattype: key,
     *          matdata: JSON.stringify(mDataObj)
     *      });
     *  } 
     */
    // ======================

}

/**
 * This function handles checking if the given `r` value needs to be converted
 * to a number, 
 * 
 * EX: 
 * ```js
 * r === "Common"; 
 * checkingRarID(r) => rarKeys<"0", "Common">;
 * return +"0";
 * ```
 * @param {string | number} r 
 * @returns {number}
 */
const convertRarToID = r => {
    if (isNaN(r) && typeof r === 'string'){
        // Extract Rar_id from r
        return checkingRarID(r);
    } else return +r;
};

const isUnique = r => convertRarToID(r) === 12;
const isUniqueMatch = (mat, u) => mat.UniqueMatch === u;
const isMatMatch = (mat, r) => mat.Rar_id === convertRarToID(r);

/**
 * This function checks if the given params require checking for a `unique` material,
 * otherwise checks as a non `unique` material.
 * 
 * IF UNIQUE Returns condition:
 * ```js
 * return mat.UniqueMatch === u;
 * ```
 * OTHERWISE Returns condition:
 * ```js
 * return mat.Rar_id === convertRarToID(r);
 * ```
 * @param {string | number} r Rarity Pointer, EX: `"Common" || 0 || "0"`
 * @param {object} mat Cached Material Object 
 * @param {string | undefined} u If defined, contains `mat.UniqueMatch` type to check for
 * @returns {boolean}
 */
const isRefMatch = (r, mat, u) => {
    if (u && isUnique(r)){
        return isUniqueMatch(mat, u);
    } else return isMatMatch(mat, r);
};

/** 
 * @type {{type: string, options: (number[] | string[])}[]}
 */
const rarLoadTypes = [
    {
        type: "Name",
        options: [...loadFullRarNameList()]
    },
    {
        type: "ID",
        options: Array.from(new Array(19).fill(0), (v, t) => t + v)
    },
    {
        type: "sID",
        options: Array.from(new Array(19).fill(0), (v, t) => `${t + v}`)
    }
];

function retrieveStaticMatRef(interaction){
    const {materials} = interaction.client;

    // Any method of obtaining mattype as string
    const mType = randArrPos(loadFullDismantleList()); // 'slimy'; 

    // randArrPos([{type: "string"}, {type: "number"}, {type: "string number id"}])
    
    // Any method of obtaining rarity/rar_id either string or number
    const mRar = randArrPos((randArrPos(rarLoadTypes)).options);

    // If material is unique type string, otherwise undefined
    const mUType = undefined; // 'Dark' || undefined

    // Grab cached material type list
    const matDataList = materials.get(mType);

    // Final Material Ref Match.
    const matMatch = matDataList.find(mat => isRefMatch(mRar, mat, mUType));

    console.log(`Random Details:\nMatType: ${mType}\nMatRarity: ${mRar}\nMat Match Found: `, matMatch);
}


async function retrieveStoredMatData(interaction){
    // Retrieve ALL Single User Stored materials
    // const userMats = await UserMaterials.findAll({where: {userid: user.userid}});

    // Defined by some interaction
    // Any method of obtaining mattype as string
    const mType = randArrPos(loadFullDismantleList()); 
    // Any method of obtaining rarity/rar_id either string or number
    const mRar = randArrPos((randArrPos(rarLoadTypes)).options);

    // Retrieve ONE Single User Stored Material Type
    const userMatMatch = await UserMaterials.findOne({where: {userid: interaction.user.id, mattype: mType}});

    // Parsed JSON Object
    const mdObj = JSON.parse(userMatMatch.matdata);

    // typeof `storedMatData` === 'number' && `storedMatData` === Material Amount Owned 
    const storedMatData = mdObj[`${(convertRarToID(mRar)).toString()}`];

    console.log(`Contents of UserMaterials where:\nMatType: ${mType}\nMatRarity: ${mRar}\nContents: `, storedMatData);
}


async function generateMaterialStores(interaction){
    const {materials} = interaction.client;

    const entryExists = async t => await UserMaterials.findOne({where: {userid: interaction.user.id, mattype: t}});

    const createdEntryList = [];
    // Initial Table Entries created all at once 
    for (const key of materials.keys()){
        if ((await entryExists(key))) continue;
        const mDataObj = materials.get(key).reduce((acc, mat) => {
            if (key === 'unique'){
                acc[`${mat.UniqueMatch}`] = 0;
            } else acc[`${mat.Rar_id.toString()}`] = 0;
            return acc;
        }, {});
    
        const newMatStore = await UserMaterials.create({
            userid: interaction.user.id,
            mattype: key,
            matdata: JSON.stringify(mDataObj)
        });
        createdEntryList.push(newMatStore);
    }

    const saveTableData = async (entry) => {
        await entry.save();
    };

    createdEntryList.forEach(saveTableData);

    const userMatEntries = await UserMaterials.findAll({where: {userid: interaction.user.id}});

    const showDetails = (ele, i) => {
        console.log(`UserMaterials Table #${i}:\n`, ele.dataValues);
    };

    userMatEntries.forEach(showDetails);
}