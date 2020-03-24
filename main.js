'use strict';

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const request = require('request-promise-native');
const adapterName = require('./package.json').name.split('.').pop();
const stateAttr = require('./lib/stateAttr.js');
const { wait } = require('./lib/tools');
const countryJs = require('country-list-js');
const allCountrys = [];
let allGermanFederalStates = [],  allGermanCounty = [];
	
// Translator if country names are not iso conform
const countryTranslator = require('./lib/countryTranslator');

class Covid19 extends utils.Adapter {
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		// @ts-ignore
		super({
			...options,
			name: adapterName,
		});
		this.on('ready', this.onReady.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		this.config.countries = this.config.countries || [];

		const loadAll = async () => {
			// Try to call API and get global information
			try {
				const result = await request('https://corona.lmao.ninja/all');
				this.log.debug('Data from COVID-19 API received : ' + result);
				const values = JSON.parse(result);
				for (const i of Object.keys(values)) {
					if (values[i]) {
						await this.localCreateState('global_totals.' + i, i, values[i]);
					}
				}
			} catch (error) {
				this.log.warn('Error getting LoadAll  API response, will retry at next shedule');
			}
		};

		const loadCountries = async () => {
			try {
				const continentsStats = {};
				continentsStats['America'] = {};
				continentsStats['World_Sum'] = {};

				const result = await request('https://corona.lmao.ninja/countries');
				this.log.debug('Data from COVID-19 API received : ' + result);
				const values = JSON.parse(result);

				// add user defined country translation to countryTranslator
				await this.addUserCountriesTranslator();

				// Write all country states depending on filter
				for (const i in values) {
					if (values.hasOwnProperty(i) && values[i] && values[i].country) {
						let country = values[i].country;
						allCountrys.push(country);
						country = country.replace(/\s/g, '_');
						country = country.replace(/\./g, '');

						const continent = await this.getContinent(country);
						this.log.debug(`${country} (${continent})`);

						// Write states for all countrys in API
						for (const y in values[i]) {
							if (values[i].hasOwnProperty(y) && y !== 'country') {
								// if ((!this.config.countries.length || this.config.countries.includes(values[i].country)) && this.config.loadAllCountrys === false ) {
								if ((!this.config.countries.length || this.config.countries.includes(values[i].country)) && this.config.loadAllCountrys === false) {
									if (y !== 'countryInfo') {
										await this.localCreateState(country + '.' + y, y, values[i][y]);
									} else {
										// Only take the flag from country info
										await this.localCreateState(country + '.flag', 'flag', values[i][y].flag);
									}
								} else if (this.config.loadAllCountrys === true) {
									if (y !== 'countryInfo') {
										await this.localCreateState(country + '.' + y, y, values[i][y]);
									} else {
										// Only take the flag from country info
										await this.localCreateState(country + '.flag', 'flag', values[i][y].flag);
									}
								} else {
									if (y !== 'countryInfo') {
										await this.localDeleteState(country + '.' + y);
									} else {
										// Only take the flag from country info
										this.log.debug('delete routine : ' + y + ' for : ' + country);
										await this.localDeleteState(country + '.flag');
									}
								}

								if (continent) {
									continentsStats[continent] = continentsStats[continent] || {};
									continentsStats[continent][y] = continentsStats[continent][y] || 0;

									if (!continentsStats['America'].hasOwnProperty(y) && (continent === 'North_America' || continent === 'South_America')) {
										continentsStats['America'][y] = 0;
									}

									if (!continentsStats['World_Sum'].hasOwnProperty(y)) {
										continentsStats['World_Sum'][y] = 0;
									}

									continentsStats[continent][y] = continentsStats[continent][y] + values[i][y];
									continentsStats['World_Sum'][y] = continentsStats['World_Sum'][y] + values[i][y];

									if (continent === 'North_America' || continent === 'South_America') {
										continentsStats['America'][y] = continentsStats['America'][y] + values[i][y];
									}
								}
							}
						}
					}
				}

				// Write Top 5
				const top_Arrary = values.slice(0, 5);
				this.log.debug('Top 5 Countries : ' + JSON.stringify(values.slice(0, 5)));
				let count = 1;
				for (const i in top_Arrary) {
					if (count <= 5 ) {
						let country = top_Arrary[i].country;

						await this.extendObjectAsync('country_Top_5.' + count, {
							type: 'channel',
							common: {
								name: 'Rank ' + count + ' : ' + country,
							},
							native: {},
						});

						country = country.replace(/\s/g, '_');
						country = country.replace(/\./g, '');
						this.log.debug('Country loop rank : ' + count + ' ' + JSON.stringify(country));
						for (const y in values[i]) {
							if (y !== 'countryInfo') {
								await this.localCreateState('country_Top_5.' + count + '.' + y, y, values[i][y]);
							} else {
								// Only take the flag from country info
								await this.localCreateState('country_Top_5.' + count + '.flag', 'flag', values[i][y].flag);
							}
						}
					}
					count = count + 1;
				}

				// Write continent information
				if (continentsStats && this.config.getContinents === true) {
					for (const c in continentsStats) {
						this.log.debug(c + ': ' + JSON.stringify(continentsStats[c]));

						for (const val in continentsStats[c]) {
							if (continentsStats[c].hasOwnProperty(val) && val !== 'countryInfo') {
								await this.localCreateState('global_continents.' + c + '.' + val, val, continentsStats[c][val]);
							}
						}
					}
				}

				await this.extendObjectAsync('countryTranslator', {
					native: {
						allCountrys
					},
				});

			} catch (error) {
				this.log.warn('Error getting loadCountries API response, will retry at next shedule ' + error);
			}
		};

		const germanyFederalStates = async () => {
			// Try to call API and get global information
			try {
				// RKI Corona Bundesländer : https://npgeo-corona-npgeo-de.hub.arcgis.com/datasets/ef4b445a53c1406892257fe63129a8ea_0/geoservice?geometry=-23.491%2C46.270%2C39.746%2C55.886
				// DataSource too build query https://npgeo-corona-npgeo-de.hub.arcgis.com/datasets/ef4b445a53c1406892257fe63129a8ea_0?geometry=-23.491%2C46.270%2C39.746%2C55.886
				const result = await request('https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/Coronaf%C3%A4lle_in_den_Bundesl%C3%A4ndern/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&outSR=4326&f=json');
				this.log.debug('Data from RKI Corona Bundesländer API received : ' + result);
				const values = JSON.parse(result);

				for (const i of Object.keys(values.features)) {
					if (values.features[i]) {
						this.log.debug('Getting data for Federal State : ' + JSON.stringify(values.features[i].attributes.LAN_ew_GEN));
						const federalStateName = values.features[i].attributes.LAN_ew_GEN;
						allGermanFederalStates.push(federalStateName);

						// Create Channel for each Federal State		
						await this.extendObjectAsync('Germany.Federal_States.' + federalStateName, {
							type: 'channel',
							common: {
								name: federalStateName,
							},
							native: {},
						});

						for (const y in values.features[i].attributes) {

							switch (y) {
								case 'Aktualisierung': 	//  Last refresh date
									await this.localCreateState('Germany.Federal_States.' + federalStateName + '.updated', 'updated', values.features[i].attributes[y]);
									break;

								case 'Death':		// Current reportet deaths
									await this.localCreateState('Germany.Federal_States.' + federalStateName + '.deaths', 'deaths', values.features[i].attributes[y]);
									break;

								case 'Fallzahl':		// Current reportet cases
									await this.localCreateState('Germany.Federal_States.' + federalStateName + '.cases', 'cases', values.features[i].attributes[y]);
									break;

								default:
									this.log.debug('Data "' + y  + '" from API ignored having values : ' + values.features[i].attributes[y]);

							}
						}
					}
				}

				allGermanFederalStates = allGermanFederalStates.sort();
				await this.extendObjectAsync('countryTranslator', {
					native: {
						allGermanFederalStates
					},
				});

			} catch (error) {
				this.log.warn('Error getting API response, will retry at next shedule');
			}
		};

		const germanyCounties = async () => {
			// Try to call API and get global information
			try {
				// RKI Corona Landkreise : https://npgeo-corona-npgeo-de.hub.arcgis.com/datasets/917fc37a709542548cc3be077a786c17_0/geoservice?selectedAttribute=BSG
				const result = await request('https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/RKI_Landkreisdaten/FeatureServer/0/query?where=1%3D1&outFields=OBJECTID,GEN,BEZ,death_rate,cases,deaths,cases_per_100k,cases_per_population,BL,county&returnGeometry=false&outSR=4326&f=json');
				this.log.info('Data from RKI Corona Landkreise API received : ' + result);
				const values = JSON.parse(result);

				for (const i of Object.keys(values.features)) {
					if (values.features[i]) {
						this.log.debug('Getting data for Landkreise : ' + JSON.stringify(values.features[i].attributes.LAN_ew_GEN));
						const countyName = values.features[i].attributes.GEN;
						allGermanCounty.push(countyName);

						// Create Channel for each Federal State		
						await this.extendObjectAsync('Germany.county.' + countyName, {
							type: 'channel',
							common: {
								name: countyName,
							},
							native: {},
						});

						for (const y in values.features[i].attributes) {

							if (y !== 'county' && y !== 'GEN' && y !== 'BEZ' && y !== 'OBJECTID') {

								// await this.localCreateState('Germany.county.' + countyName + '.' + y , y, values.features[i].attributes[y]);
							}
						}
					}
				}

				allGermanCounty = allGermanCounty.sort();
				this.log.info('allGermanCounty : ' + JSON.stringify(allGermanCounty));

				await this.extendObjectAsync('countryTranslator', {
					native: {
						allGermanCounty
					},
				});

			} catch (error) {
				this.log.warn('Error getting Landkreise API response, will retry at next shedule');
			}
		};

		// Random number generator to avoid all ioBroker instances calling the API at the same time
		const timer1 = (Math.random() * (10 - 1) + 1) * 1000;
		await wait(timer1);
		this.setState('info.connection', true, true);

		try {
			await loadAll();	// Global Worldwide statistics
			await loadCountries(); // Detailed Worldwide statistics by country
			if (this.config.getGermanFederalStates === true) {
				await germanyFederalStates(); // Detailed Federal state statistics for germany
			}

			if (this.config.getGermanCountyStates === true) {
				await germanyCounties(); // Detailed Federal state statistics for germany
			}

		} catch (e) {
			this.log.error('Unable to reach COVID-19 API : ' + e);
		}

		// Always terminate at the end
		this.terminate ? this.terminate() : process.exit();
	}

	async localCreateState(state, name, value) {
		this.log.debug('Create_state called for : ' + state + ' with value : ' + value);

		try {
			// Try to get details from state lib, if not use defaults. throw warning if states is not known in attribute list
			if (stateAttr[name] === undefined) {
				this.log.warn('State attribute definition missing for + ' + name);
			}
			const writable   = stateAttr[name] !== undefined ? stateAttr[name].write || false : false;
			const state_name = stateAttr[name] !== undefined ? stateAttr[name].name  || name : name;
			const role       = stateAttr[name] !== undefined ? stateAttr[name].role  || 'state' : 'state';
			const type       = stateAttr[name] !== undefined ? stateAttr[name].type  || 'mixed' : 'mixed';
			const unit       = stateAttr[name] !== undefined ? stateAttr[name].unit  || '' : '';
			this.log.debug('Write value : ' + writable);

			await this.extendObjectAsync(state, {
				type: 'state',
				common: {
					name: state_name,
					role: role,
					type: type,
					unit: unit,
					write: writable
				},
				native: {},
			});

			// Only set value if input != null
			if (value !== null) {
				await this.setState(state, { val: value, ack: true });
			}

			// Subscribe on state changes if writable
			// writable && this.subscribeStates(state);
		} catch (error) {
			this.log.error('Create state error = ' + error);
		}
	}

	async localDeleteState(state) {
		try {
			if (this.config.deleteUnused === true) {
				const obj = await this.getObjectAsync(state);
				if (obj) {
					await this.delObjectAsync(state);
				}
			}
		} catch (error) {
			// do nothing
		}
	}

	/**
	 * @param {string} country
	 */
	async getContinent(country) {
		let countryObj = countryJs.findByName(country.replace(/_/g, ' ').replace('é', 'e').replace('ç', 'c'));

		if (countryObj) {
			if (countryObj.continent) {
				return countryObj.continent.replace(/\s/g, '_');
			}
		} else {
			countryObj = countryJs.findByName(countryTranslator[country]);
			if (countryObj) {
				return countryObj.continent.replace(/\s/g, '_');
			} else {
				if (country !== 'Diamond_Princess') {
					this.log.warn(`${country} not found in lib! Must be added to the country name translator.`);
				}
			}
		}

		return undefined;
	}

	async addUserCountriesTranslator() {
		const userCountryTranslator = await this.getStateAsync('countryTranslator');
		if (userCountryTranslator && userCountryTranslator.val) {
			// add user defined country translation to countryTranslator
			try {
				const userCountries = JSON.parse(userCountryTranslator.val);
				Object.keys(userCountries).forEach(countryId => {
					if (!countryTranslator.hasOwnProperty(countryId)) {
						countryTranslator[countryId] = userCountries[countryId];
						this.log.info(`user defined country translation added: ${countryId} -> ${userCountries[countryId]}`);
					}
				});
			} catch (parseError) {
				this.log.error(`Can not parse json string for user defined country translation! Check input of datapoint '.countryTranslator'. error: ${parseError.message}`);
			}
		}
	}
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Covid19(options);
} else {
	// otherwise start the instance directly
	new Covid19();
}
