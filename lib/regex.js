const allSpaces = /\s/g;
const allPointAndCommas = /[.,]/g;
const modifyFloatRegex = /(?<=\()(.*?)(?=\))/g;
const americaRegex = /North_America|South_America/;

module.exports = {allSpaces, allPointAndCommas, modifyFloatRegex, americaRegex};
