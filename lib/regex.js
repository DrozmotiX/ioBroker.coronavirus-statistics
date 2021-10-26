const allSpaces = /\s/g;
const allPointAndCommas = /[.,]/g;
const modifyFloatRegex = /(?<=\()(.*?)(?=\))/g;
const americaRegex = /North_America|South_America/;
const aeRegex = /ä/g;
const oeRegex = /ö/g;
const ueRegex = /ü/g;

module.exports = {allSpaces, allPointAndCommas, modifyFloatRegex, americaRegex, aeRegex, oeRegex, ueRegex};
