//========================================
//This method uses an rng equation to output and assign a rarity value for the item to be dropped
async function grabRar(level) {
    //this method first determines rarity to look for then uses .push() to add all items of found rar_id to iPool[]

    //rarity effects items selected from pool
    //need new system of grabbing items using rar_id instead of position in array
    //add items to new array based on combat script
    //each slot in the shop goes through the grabRar() function to determine that slots rarity

    //rar_id 0 = 0.2920
    //rar_id 1 = 0.1870
    //rar_id 2 = 0.1410
    //rar_id 3 = 0.1050

    //rar_id 4 = 0.0798
    //rar_id 5 = 0.0593
    //rar_id 6 = 0.0445
    //rar_id 7 = 0.0334

    //rar_id 8 = 0.0251
    //rar_id 9 = 0.0188
    //rar_id 10 = 0.0141

    //current total = 1

    var randR = Math.random();

    console.log('OUTCOME OF randR IN grabRar(): ', randR);

    //if level between 1 & 5 rar_id can be 3 or lower
    //if level between 6 & 10 rar_id can be 5 or lower
    //if level between 11 & 15 rar_id can be 8 or lower
    //if level between 16 & 20 rar_id can be 9 or lower
    //if level above 20 rar_id can be 10 or lower


    //if level 1-7 rar_id can be 0-3
    //if level 8-12 rar_id can be 0-4
    //if level 13-18 rar_id can be 0-6
    //if level 19-24 rar_id can be 0-8
    //if level 25-30 rar_id can be 0-9
    //if level 30+ rar_id can be 0-10

    
        if (level <= 7) {
            if (randR >= 0.2920) {
                //rar_id = 0;
                //69.39%
                return foundRar = 0;
            }
            else if (randR >= 0.1870) {
                //rar_id = 1;
                //10.5%
                return foundRar = 1;
            }
            else if (randR >= 0.1410) {
                //rar_id = 2;
                //4.6%
                return foundRar = 2;
            }
            else if (randR >= 0.1050) {
                //rar_id = 3;
                //3.6%
                return foundRar = 3;
            }
            else if (randR < 0.1050) {
                //rar_id = 0;
                //69.39%
                return foundRar = 0;
            }
        } else if (level > 30) {
            if (randR >= 0.2920) {
                //rar_id = 0;
                //69.39%
                return foundRar = 0;
            }
            else if (randR >= 0.1870) {
                //rar_id = 1;
                //10.5%
                return foundRar = 1;
            }
            else if (randR >= 0.1410) {
                //rar_id = 2;
                //4.6%
                return foundRar = 2;
            }
            else if (randR >= 0.1050) {
                //rar_id = 3;
                //3.6%
                return foundRar = 3;
            }
            else if (randR >= 0.0798) {
                //rar_id = 4;
                //2.52%
                return foundRar = 4;
            }
            else if (randR >= 0.0593) {
                //rar_id = 5;
                //2.05%
                return foundRar = 5;
            }
            else if (randR >= 0.0445) {
                //rar_id = 6;
                //1.48%
                return foundRar = 6;
            }
            else if (randR >= 0.0334) {
                //rar_id = 7;
                //1.11%
                return foundRar = 7;
            }
            else if (randR >= 0.0251) {
                //rar_id = 8;
                //0.83%
                return foundRar = 8;
            }
            else if (randR >= 0.0188) {
                //rar_id = 9;
                //0.63%
                return foundRar = 9;
            }
            else if (randR >= 0.0141) {
                //rar_id = 10;
                //0.47%
                return foundRar = 10;
            }
            else if (randR < 0.0141) {
                //rar_id = 0;
                return foundRar = 0;
            }
        } else if (level >= 25) {
            if (randR >= 0.2920) {
                //rar_id = 0;
                //69.39%
                return foundRar = 0;
            }
            else if (randR >= 0.1870) {
                //rar_id = 1;
                //10.5%
                return foundRar = 1;
            }
            else if (randR >= 0.1410) {
                //rar_id = 2;
                //4.6%
                return foundRar = 2;
            }
            else if (randR >= 0.1050) {
                //rar_id = 3;
                //3.6%
                return foundRar = 3;
            }
            else if (randR >= 0.0798) {
                //rar_id = 4;
                //2.52%
                return foundRar = 4;
            }
            else if (randR >= 0.0593) {
                //rar_id = 5;
                //2.05%
                return foundRar = 5;
            }
            else if (randR >= 0.0445) {
                //rar_id = 6;
                //1.48%
                return foundRar = 6;
            }
            else if (randR >= 0.0334) {
                //rar_id = 7;
                //1.11%
                return foundRar = 7;
            }
            else if (randR >= 0.0251) {
                //rar_id = 8;
                //0.83%
                return foundRar = 8;
            }
            else if (randR >= 0.0188) {
                //rar_id = 9;
                //0.63%
                return foundRar = 9;
            }
            else if (randR < 0.0188) {
                //rar_id = 0;
                //69.39%
                return foundRar = 0;
            }
        } else if (level >= 19) {
            if (randR >= 0.2920) {
                //rar_id = 0;
                //69.39%
                return foundRar = 0;
            }
            else if (randR >= 0.1870) {
                //rar_id = 1;
                //10.5%
                return foundRar = 1;
            }
            else if (randR >= 0.1410) {
                //rar_id = 2;
                //4.6%
                return foundRar = 2;
            }
            else if (randR >= 0.1050) {
                //rar_id = 3;
                //3.6%
                return foundRar = 3;
            }
            else if (randR >= 0.0798) {
                //rar_id = 4;
                //2.52%
                return foundRar = 4;
            }
            else if (randR >= 0.0593) {
                //rar_id = 5;
                //2.05%
                return foundRar = 5;
            }
            else if (randR >= 0.0445) {
                //rar_id = 6;
                //1.48%
                return foundRar = 6;
            }
            else if (randR >= 0.0334) {
                //rar_id = 7;
                //1.11%
                return foundRar = 7;
            }
            else if (randR >= 0.0251) {
                //rar_id = 8;
                //0.83%
                return foundRar = 8;
            }
            else if (randR < 0.0251) {
                //rar_id = 0;
                //69.39%
                return foundRar = 0;
            }
        } else if (level >= 13) {
            if (randR >= 0.2920) {
                //rar_id = 0;
                //69.39%
                return foundRar = 0;
            }
            else if (randR >= 0.1870) {
                //rar_id = 1;
                //10.5%
                return foundRar = 1;
            }
            else if (randR >= 0.1410) {
                //rar_id = 2;
                //4.6%
                return foundRar = 2;
            }
            else if (randR >= 0.1050) {
                //rar_id = 3;
                //3.6%
                return foundRar = 3;
            }
            else if (randR >= 0.0798) {
                //rar_id = 4;
                //2.52%
                return foundRar = 4;
            }
            else if (randR >= 0.0593) {
                //rar_id = 5;
                //2.05%
                return foundRar = 5;
            }
            else if (randR >= 0.0445) {
                //rar_id = 6;
                //1.48%
                return foundRar = 6;
            }
            else if (randR < 0.0445) {
                //rar_id = 0;
                //69.39%
                return foundRar = 0;
            }

        } else if (level >= 8) {
            if (randR >= 0.2920) {
                //rar_id = 0;
                //69.39%
                return foundRar = 0;
            }
            else if (randR >= 0.1870) {
                //rar_id = 1;
                //10.5%
                return foundRar = 1;
            }
            else if (randR >= 0.1410) {
                //rar_id = 2;
                //4.6%
                return foundRar = 2;
            }
            else if (randR >= 0.1050) {
                //rar_id = 3;
                //3.6%
                return foundRar = 3;
            }
            else if (randR >= 0.0798) {
                //rar_id = 4;
                //2.52%
                return foundRar = 4;
            }
            else if (randR < 0.0798) {
                //rar_id = 0;
                //69.39%
                return foundRar = 0;
            }
            
        }    
}

//This method takes a given rarid and returns a hex colour code for use with embeds
async function grabColour(rarid, needStr) {
    let catchStr = false;
    if (needStr === true) catchStr = true;
    if (rarid === 0) {
        if (catchStr === true) return '#dddddd';
        return 0xdddddd;
    }
    if (rarid === 1) {
        if (catchStr === true) return '#c4c4c4';
        return 0xc4c4c4;
    }
    if (rarid === 2) {
        if (catchStr === true) return '#ffe8a4';
        return 0xffe8a4;
    }
    if (rarid === 3) {
        if (catchStr === true) return '#f9cda0';
        return 0xf9cda0;
    }
    if (rarid === 4) {
        if (catchStr === true) return '#72a3ad';
        return 0x72a3ad;
    }
    if (rarid === 5) {
        if (catchStr === true) return '#8d7bc3';
        return 0x8d7bc3;
    }
    if (rarid === 6) {
        if (catchStr === true) return '#a64c78';
        return 0xa64c78;
    }
    if (rarid === 7) {
        if (catchStr === true) return '#81200d';
        return 0x81200d;
    }
    if (rarid === 8) {
        if (catchStr === true) return '#e69036';
        return 0xe69036;
    }
    if (rarid === 9) {
        if (catchStr === true) return '#ff0707';
        return 0xff0707;
    }
    if (rarid === 10) {
        if (catchStr === true) return '#ff06ff';
        return 0xff06ff;
    }
    if (rarid === 11) {
        if (catchStr === true) return '#0000ff';
        return 0x0000ff;
    }
    if (rarid === 12) {
        if (catchStr === true) return '#b45f06';
        return 0xb45f06;
    }
}

module.exports = { grabRar, grabColour };
