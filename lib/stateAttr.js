const state_attrb = {
	'active' : {
		name: 'Amount of current infected people',
		type: 'number',
		role: 'value',
	},
	'affectedCountries' : {
		name: 'Quantity affected countries',
		type: 'number',
		role: 'value',
	},
	'cases' : {
		name: 'Amount of totally known cases',
		type: 'number',
		role: 'value',
	},
	'casesPerOneMillion' : {
		name: 'Amount of totally known cases per million citizen',
		type: 'number',
		role: 'value',
	},
	'country' : {
		name: 'Country name',
		type: 'string',
		role: 'value',
	},
	'continent' : {
		name: 'Continent name',
		type: 'string',
		role: 'value',
	},
	'critical' : {
		name: 'Amount of critical situation (Hospitalized)',
		type: 'number',
		role: 'value',
	},
	'deaths' : {
		name: 'Amount of current registered deaths',
		type: 'number',
		role: 'value',
	},
	'deathsPerOneMillion' : {
		name: 'Amount of current registered deaths per million citizen',
		type: 'number',
		role: 'value',
	},
	'flag' : {
		name: 'Flag of country in png',
		type: 'string',
	},
	'Last Update' : {
		name: 'Timestamp of last successful data refresh',
		type: 'string',
		role: 'date',
	},
	'recovered' : {
		name: 'Amount of totally known recovered cases',
		type: 'number',
		role: 'value',
	},
	'todayCases' : {
		name: 'New Cases by Today',
		type: 'number',
		role: 'value',
	}, 
	'todayDeaths' : {
		name: 'Amount of totally known people died today',
		type: 'number',
		role: 'value',
	},
	'updated' : {
		name: 'Timestamp of last successful data refresh',
		type: 'number',
		role: 'value.time',
	},
	'BL' : {
		name: 'Bundesland',
		type: 'number',
		role: 'value',
	},
	'cases_per_population' : {
		name: 'Fälle pro Bevölkerung',
		type: 'number',
		role: 'value',
	},
	'cases_per_100k' : {
		name: 'Fälle pro 100k Einwohner',
		type: 'number',
		role: 'value',
	},
	'death_rate' : {
		name: 'Todesrate',
		type: 'number',
		role: 'value',
	},
	'countries' : {
		name: 'Countries of contient',
		type: 'string',
	},
	'tests' : {
		name: 'Total number of covid-19 tests taken globally',
		type: 'string',
	},
	'testsPerOneMillion' : {
		name: 'Total number of covid-19 tests taken globally by one  Million',
		type: 'string',
	},
	
};

module.exports = state_attrb;
