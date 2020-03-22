// Translator if country names are not iso conform
const countryTranslator = {
	// https://github.com/i-rocky/country-list-js/blob/master/data/names.json
	'Vatican_City': 'Vatican',
	'USA': 'United States',
	'UK': 'United Kingdom',
	'UAE': 'United Arab Emirates',
	'US_Virgin_Islands': 'U.S. Virgin Islands',
	'St_Vincent_Grenadines': 'Saint Vincent and the Grenadines',
	'St_Barth': 'Saint Barthelemy',
	'S_Korea': 'South Korea',
	'Palestine': 'Palestinian Territory',
	'North_Macedonia': 'Macedonia',
	'Faeroe_Islands': 'Faroe Islands',
	'Eswatini': 'Swaziland',
	'Czechia': 'Czech Republic',
	'Congo': 'Republic of the Congo',
	'CAR': 'Central African Republic',
	'DRC': 'Democratic Republic of the Congo',
	'Channel_Islands': 'France',                             // gehört zu Europa, deshalb Frankreich einfach vergeben
	'Cabo_Verde': 'Cape Verde',
	'Timor-Leste': 'East Timor'
};

module.exports = countryTranslator;
