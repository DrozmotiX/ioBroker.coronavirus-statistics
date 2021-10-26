const allSpaces = /\s/g;
const allPointAndCommas = /[.,]/g;
const modifyFloatRegex = /(?<=\()(.*?)(?=\))/g;
const americaRegex = /North_America|South_America/;
const aeRegex = /ä/;
const oeRegex = /ö/;
const ueRegex = /ü/;

module.exports = {allSpaces, allPointAndCommas, modifyFloatRegex, americaRegex, aeRegex, oeRegex, ueRegex};
