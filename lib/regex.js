const allSpaces = /\s/g;
const allPointAndCommas = /[.,]/g;
const modifyFloatRegex = /(?<=\()(.*?)(?=\))/g;
const americaRegex = /North_America|South_America/;
const aeRegex = /ae/g;
const oeRegex = /oe/g;
const ueRegex = /ue/g;

module.exports = {allSpaces, allPointAndCommas, modifyFloatRegex, americaRegex, aeRegex, oeRegex, ueRegex};
