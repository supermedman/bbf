const chalk = require('chalk');

const warnedForm = chalk.bold.yellowBright;
//console.log(warnedForm('Testing warning here!'));
const errorForm = chalk.bold.redBright.bgWhite;
//console.log(errorForm('Testing error here!'));
const successResult = chalk.italic.whiteBright.bgGreen;
//console.log(successResult('Testing success here!'));
const failureResult = chalk.italic.whiteBright.dim.bgRed;
//console.log(failureResult('Testing failure here!'));
const basicInfoForm = chalk.dim.whiteBright.bgBlackBright;
//console.log(basicInfoForm('Testing basic info here!'));
const basicInfoForm2 = chalk.dim.whiteBright.bgBlackBright;
//console.log(basicInfoForm('Testing basic2 info here!'));
const specialInfoForm = chalk.bold.cyan.bgBlackBright;
//console.log(specialInfoForm('Testing special info here!'));
const specialInfoForm2 = chalk.bold.cyan.bgBlackBright;
//console.log(specialInfoForm('Testing special2 info here!'));

module.exports = {
    warnedForm,
    errorForm,
    successResult,
    failureResult,
    basicInfoForm,
    basicInfoForm2,
    specialInfoForm,
    specialInfoForm2
};