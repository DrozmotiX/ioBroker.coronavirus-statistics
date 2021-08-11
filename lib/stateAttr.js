const stateAttrb = {
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
		type: 'string',
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
	'cases7_per_100k' : {
		name: 'Fälle der letzten 7 Tage pro 100k Einwohner',
		type: 'number',
		role: 'value',
	},
	'death_rate' : {
		name: 'Todesrate',
		type: 'number',
		role: 'value',
	},
	'countries' : {
		name: 'Countries of continent',
		type: 'string',
		role: 'value',
	},
	'last_update' : {
		name: 'Timestamp of last data refresh (provided by API)',
		type: 'string',
		role: 'value',
	},
	'tests' : {
		name: 'Total number of covid-19 tests taken globally',
		type: 'number',
		role: 'value',
	},
	'testsPerOneMillion' : {
		name: 'Total number of covid-19 tests taken globally by one  Million',
		type: 'number',
		role: 'value',
	},
	'population' : {
		name: 'Population',
		type: 'number',
		role: 'value',
	},
	'activePerOneMillion' : {
		name: 'Infizierte pro Einer Million',
		type: 'number',
		role: 'value',
	},
	'recoveredPerOneMillion' : {
		name: 'Genesene pro einer Million',
		type: 'number',
		role: 'value',
	},
	'criticalPerOneMillion' : {
		name: 'Kritische pro einer Million',
		type: 'number',
		role: 'value',
	},
	'todayRecovered' : {
		name: 'Today recovered',
		type: 'number',
		role: 'value',
	},
	'oneTestPerPeople' : {
		name: 'one Test Per People',
		type: 'number',
		role: 'value',
	},
	'oneDeathPerPeople' : {
		name: 'one Death Per People',
		type: 'number',
		role: 'value',
	},
	'oneCasePerPeople' : {
		name: 'one Case Per People',
		type: 'number',
		role: 'value',
	},
	'Impfungen Kumulativ' : {
		name: 'Impfungen Kumulativ',
		type: 'number',
		role: 'value',
	},
	'Differenz zum Vortag' : {
		name: 'Differenz zum Vortag',
		type: 'number',
		role: 'value',
	},
	'Gesamtzahl bisher verabreichter Impfungen' : {
		name: 'Gesamtzahl bisher verabreichter Impfungen',
		type: 'number',
		role: 'value',
	},
	'Erstimpfungen Kumulativ' : {
		name: 'Gesamtzahl bisher mindestens einmal geimpft ',
		type: 'number',
		role: 'value',
	},
	'Erstimpfungen Impfquote' : {
		name: 'Impf-quote',
		type: 'number',
		role: 'value',
		unit: '%',
	},
	'Zweitimpfungen Impfquote' : {
		name: 'Zweitimpfungen Impfquote',
		type: 'number',
		role: 'value',
		unit: '%',
	},
	'Zweitimpfungen Kumulativ' : {
		name: 'Gesamtzahl vollständig geimpft',
		type: 'number',
		role: 'value',
	},
	'Zweitimpfungen Differenz zum Vortag' : {
		name: 'Zweit Impfungen Differenz zum Vortag',
		type: 'number',
		role: 'value',
	},
	'Erstimpfungen Differenz zum Vortag' : {
		name: 'Zweit Impfungen Differenz zum Vortag',
		type: 'number',
		role: 'value',
	},
	'undefined' : {
		name: 'Undocumented value from API',
		type: 'number',
		role: 'value',
	},

	'daily_vaccinations_per_million' : {
		name: 'Amount of vaccinations provided daily per million',
		role: 'value',
	},
	'people_fully_vaccinated_per_hundred' : {
		name: '% of fully vaccinated people',
		unit: '%',
		role: 'value',
	},
	'people_vaccinated_per_hundred' : {
		name: '% of first vaccinated people',
		unit: '%',
		role: 'value',
	},
	'total_vaccinations_per_hundred' : {
		name: '% of total vaccinations',
		unit: '%',
		role: 'value',
	},
	'daily_vaccinations' : {
		name: 'Amount of vaccinations provided daily',
		role: 'value',
	},
	'daily_vaccinations_raw' : {
		name: 'Amount of vaccinations provided daily raw value',
		role: 'value',
	},
	'people_fully_vaccinated' : {
		name: 'Amount of people fully vaccinated',
		role: 'value',
	},
	'people_vaccinated' : {
		name: 'Amount of people vaccinated',
		role: 'value',
	},
	'total_vaccinations' : {
		name: 'Total amount of provided vaccinations',
		role: 'value',
	},
	'date' : {
		name: 'Date of latest data refresh',
		role: 'value',
	},

};

module.exports = stateAttrb;
