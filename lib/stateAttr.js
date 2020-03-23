const state_attrb = {
	'active' : {
		name: 'Amount of current infected people',
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
};

module.exports = state_attrb;
