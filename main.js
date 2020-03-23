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
				this.log.warn('Error getting API response, will retry at next shedule');
			}
		};

		const loadCountries = async () => {
			try {
				const continentsStats = {};
				continentsStats['America'] = {};
				continentsStats['World_Sum'] = {};

				const result = await request('https://corona.lmao.ninja/countries');
				this.log.debug('Data from COVID-19 API received : ' + result);

				// add user defined country translation to countryTranslator
				await this.addUserCountriesTranslator();

				const values = JSON.parse(result);

				for (const i in values) {
					if (values.hasOwnProperty(i) && values[i] && values[i].country) {
						let country = values[i].country;
						allCountrys.push(country);
						country = country.replace(/\s/g, '_');
						country = country.replace(/\./g, '');

						const continent = await this.getContinent(country);
						this.log.debug(`${country} (${continent})`);

						for (const y in values[i]) {
							if (values[i].hasOwnProperty(y) && y !== 'country') {
								if (!this.config.countries.length || this.config.countries.includes(values[i].country)) {
									await this.localCreateState(country + '.' + y, y, values[i][y]);
								} else {
									await this.localDeleteState(country + '.' + y);
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

				if (continentsStats) {
					for (const c in continentsStats) {
						this.log.debug(c + ': ' + JSON.stringify(continentsStats[c]));

						for (const val in continentsStats[c]) {
							if (continentsStats[c].hasOwnProperty(val)) {
								await this.localCreateState('global_continents.' + c + '.' + val, val, continentsStats[c][val]);
							}
						}
					}
				}

				// todo delete disabled countries
				this.log.debug(JSON.stringify(allCountrys));

				await this.extendObjectAsync('countryTranslator', {
					native: {
						allCountrys
					},
				});

			} catch (error) {
				this.log.warn('Error getting API response, will retry at next shedule');
			}
		};

		// Random number generator to avoid all ioBroker instances calling the API at the same time
		const timer1 = (Math.random() * (10 - 1) + 1) * 1000;
		await wait(timer1);
		this.setState('info.connection', true, true);

		try {
			await loadAll();
			await loadCountries();
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
			if (this.config.deleteUnused === true){
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

	async addUserCountriesTranslator(){
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
