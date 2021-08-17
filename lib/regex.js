const allSpaces = /\s/g;
const allPointAndCommas = /[.,]/g;
const modifyFloatRegex = /(?<=\()(.*?)(?=\))/g;

module.exports = {allSpaces, allPointAndCommas, modifyFloatRegex};
