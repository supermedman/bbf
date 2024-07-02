const fs = require('fs');
const {createItemList} = require('./itemStringCore');

fs.writeFile("./Json/uniItemStore.json", JSON.stringify(createItemList(), null, 4), (e) => {
    if (e) return console.error(e);
    console.log('File write success!');
});