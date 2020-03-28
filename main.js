'use strict';

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const request = require('request-promise-native');
const adapterName = require('./package.json').name.split('.').pop();
const stateAttr = require('./lib/stateAttr.js');
const { wait } = require('./lib/tools');
const countryJs = require('country-list-js');
const allCountrys = [], allGermanCountyDetails = []; // Array for all countrys to store in object
let allGermanFederalStates = [], allGermanCounty = []; // For Germany, arrays to store federal states and countys to store in object

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
		try {
			this.config.countries = this.config.countries || [];
			this.config.allGermanCounty = this.config.allGermanCounty || [];
			this.config.allGermanFederalStates = this.config.allGermanFederalStates || [];
			this.log.debug(`Configuration object before config load : ${JSON.stringify(this.config)}`);

			const loadAll = async () => {
				// Try to call API and get global information
				try {
					const result = await request('https://corona.lmao.ninja/all');
					this.log.debug(`Data from COVID-19 API received : ${result}`);
					const values = JSON.parse(result);
					for (const i of Object.keys(values)) {
						await this.localCreateState(`global_totals.${i}`, i, values[i]);
					}
				} catch (error) {
					this.log.error(`[loadAll] error: ${error.message}, stack: ${error.stack}`);
				}
			};

			const loadCountries = async () => {
				try {
					const continentsStats = {};
					continentsStats['America'] = {};
					continentsStats['World_Sum'] = {};

					const result = await request('https://corona.lmao.ninja/countries');
					this.log.debug(`Data from COVID-19 API received : ${result}`);
					this.log.debug(`load all country's : ${this.config.loadAllCountrys} as ${typeof this.config.loadAllCountrys}`);
					const values = JSON.parse(result);

					// add user defined country translation to countryTranslator
					await this.addUserCountriesTranslator();

					// Write all country states depending on filter
					for (const dataset of values) {
						if (dataset.country) {
							let rawCountry = dataset.country;
							let continent = undefined;

							let isoCountry = await this.getIsoCountry(dataset.country, dataset['countryInfo']);

							if (isoCountry) {
								if (isoCountry.name) {
									// Iso Country Name nehmen, sofern vorhanden
									rawCountry = isoCountry.name;
								}

								if (isoCountry.continent) {
									// Continent übergeben
									continent = isoCountry.continent.replace(/\s/g, '_');
								}
							}

							allCountrys.push(rawCountry);
							let country = rawCountry.replace(/\s/g, '_').replace(/\./g, '');

							this.log.debug(`api name: ${dataset.country}, converted name: ${rawCountry}, dp name: ${country}, continent: ${continent}`);

							// Write states for all countrys in API
							for (const property of Object.keys(dataset)) {
								// Don't create a state for the country
								if (property === 'country') continue;
								if (this.config.loadAllCountrys || this.config.countries.includes(rawCountry)) {

									// this.log.info(`Country add routine : ${property} for : ${country}`);
									if (property !== 'countryInfo') {
										await this.localCreateState(`${country}.${property}`, property, dataset[property]);
									} else {
										// Only take the flag from country info
										await this.localCreateState(`${country}.flag`, 'flag', dataset[property].flag);
									}

								} else {

									this.log.debug(`Country delete routine : ${property} for : ${country}`);
									if (property !== 'countryInfo') {
										await this.localDeleteState(`${country}.${property}`);
									} else {
										// Only take the flag from country info
										await this.localDeleteState(`${country}.flag`);
										await this.localDeleteState(`${country}.${property}`); // Temporary needed for installations < 0.4.0 to cleanup states
									}
								}

								if (continent) {
									if (property !== 'countryInfo') {
										continentsStats[continent] = continentsStats[continent] || {};
										continentsStats[continent][property] = continentsStats[continent][property] || 0;

										if (!continentsStats['America'].hasOwnProperty(property) && (continent === 'North_America' || continent === 'South_America')) {
											continentsStats['America'][property] = 0;
										}

										if (!continentsStats['World_Sum'].hasOwnProperty(property)) {
											continentsStats['World_Sum'][property] = 0;
										}

										continentsStats[continent][property] = continentsStats[continent][property] + dataset[property];
										continentsStats['World_Sum'][property] = continentsStats['World_Sum'][property] + dataset[property];

										if (continent === 'North_America' || continent === 'South_America') {
											continentsStats['America'][property] = continentsStats['America'][property] + dataset[property];
										}
									} else {
										// property ist country Info -> country namen in array speichern
										continentsStats[continent] = continentsStats[continent] || {};
										continentsStats[continent]['countries'] = continentsStats[continent]['countries'] || [];

										if (!continentsStats['America'].hasOwnProperty('countries') && (continent === 'North_America' || continent === 'South_America')) {
											continentsStats['America']['countries'] = [];
										}

										continentsStats[continent]['countries'].push(rawCountry);

										if (continent === 'North_America' || continent === 'South_America') {
											continentsStats['America']['countries'].push(rawCountry);
										}
									}
								}
							}
						}
					}

					// Write Top 5
					this.log.debug(`Top 5 Countries : ${JSON.stringify(values.slice(0, 5))}`);
					for (let position = 1; position <= 5; position++) {
						const dataset = values[position - 1]; // start at 0
						let country = dataset.country;

						const channelName = `country_Top_5.${position}`;

						await this.extendObjectAsync(channelName, {
							type: 'channel',
							common: {
								name: `Rank ${position} : ${country}`,
							},
							native: {},
						});

						country = country.replace(/\s/g, '_');
						country = country.replace(/\./g, '');
						this.log.debug(`Country loop rank : ${position} ${JSON.stringify(country)}`);
						for (const property of Object.keys(dataset)) {
							if (property !== 'countryInfo') {
								await this.localCreateState(`${channelName}.${property}`, property, dataset[property]);
							} else {
								// Only take the flag from country info
								await this.localCreateState(`${channelName}.flag`, 'flag', dataset[property].flag);
							}
						}
					}

					// Write continent information

					for (const c in continentsStats) {
						this.log.debug(`${c}: ${JSON.stringify(continentsStats[c])}`);

						for (const val in continentsStats[c]) {
							if ((continentsStats[c].hasOwnProperty(val) && val !== 'countryInfo')
								&& this.config.getContinents === true) {
								if (val !== 'countries') {
									await this.localCreateState(`global_continents.${c}.${val}`, val, continentsStats[c][val]);
								} else {
									await this.localCreateState(`global_continents.${c}.${val}`, val, continentsStats[c][val].join());
								}
							} else if ((continentsStats[c].hasOwnProperty(val) && val !== 'countryInfo')
								&& this.config.getContinents === false) {
								await this.localDeleteState(`global_continents.${c}.${val}`);
							}
						}
					}

					await this.extendObjectAsync('countryTranslator', {
						native: {
							allCountrys
						},
					});

				} catch (error) {
					this.log.error(`[loadCountries] error: ${error.message}, stack: ${error.stack}`);
				}
			};

			const germanyFederalStates = async () => {
				// Try to call API and get global information
				try {
					// RKI Corona Bundesländer : https://npgeo-corona-npgeo-de.hub.arcgis.com/datasets/ef4b445a53c1406892257fe63129a8ea_0/geoservice?geometry=-23.491%2C46.270%2C39.746%2C55.886
					// DataSource too build query https://npgeo-corona-npgeo-de.hub.arcgis.com/datasets/ef4b445a53c1406892257fe63129a8ea_0?geometry=-23.491%2C46.270%2C39.746%2C55.886
					const result = await request('https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/Coronaf%C3%A4lle_in_den_Bundesl%C3%A4ndern/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&outSR=4326&f=json');
					this.log.debug(`Data from RKI Corona Bundesländer API received : ${result}`);
					const values = JSON.parse(result);

					for (const feature of values.features) {
						this.log.debug(`Getting data for Federal State : ${JSON.stringify(feature.attributes.LAN_ew_GEN)}`);
						const federalStateName = feature.attributes.LAN_ew_GEN;
						const channelName = `Germany.Federal_States.${federalStateName}`;
						allGermanFederalStates.push(federalStateName);

						if (this.config.getAllGermanFederalStates || this.config.allGermanFederalStates.includes(federalStateName)) {

							// Create Channel for each Federal State		
							await this.extendObjectAsync(channelName, {
								type: 'channel',
								common: {
									name: federalStateName,
								},
								native: {},
							});

							for (const attributeName of Object.keys(feature.attributes)) {

								switch (attributeName) {
									case 'Aktualisierung': 	//  Last refresh date
										await this.localCreateState(`${channelName}.updated`, 'updated', feature.attributes[attributeName]);
										break;

									case 'Death':		// Current reportet deaths
										await this.localCreateState(`${channelName}.deaths`, 'deaths', feature.attributes[attributeName]);
										break;

									case 'Fallzahl':		// Current reportet cases
										await this.localCreateState(`${channelName}.cases`, 'cases', feature.attributes[attributeName]);
										break;

									default:
										this.log.debug(`Data \\"${attributeName}\\" from API ignored having values : ${feature.attributes[attributeName]}`);
								}
							}

						} else {

							for (const attributeName of Object.keys(feature.attributes)) {

								switch (attributeName) {
									case 'Aktualisierung': 	//  Last refresh date
										await this.localDeleteState(`${channelName}.updated`);
										break;

									case 'Death':		// Current reportet deaths
										await this.localDeleteState(`${channelName}.deaths`);
										break;

									case 'Fallzahl':		// Current reportet cases
										await this.localDeleteState(`${channelName}.cases`);
										break;

									default:
										this.log.debug(`Data \\"${attributeName}\\" from API ignored having values : ${feature.attributes[attributeName]}`);
										await this.localDeleteState(`${channelName}.${attributeName}`);
								}
							}
						}
					}

					allGermanFederalStates = allGermanFederalStates.sort();
					this.log.debug(`allGermanFederalStates : ${JSON.stringify(allGermanFederalStates)}`);

					await this.extendObjectAsync('countryTranslator', {
						native: {
							allGermanFederalStates
						},
					});

				} catch (error) {
					this.log.error(`[germanyFederalStates] error: ${error.message}, stack: ${error.stack}`);
				}
			};

			const germanyCounties = async () => {
				// Try to call API and get global information
				try {
					// RKI Corona Landkreise : https://npgeo-corona-npgeo-de.hub.arcgis.com/datasets/917fc37a709542548cc3be077a786c17_0/geoservice?selectedAttribute=BSG
					const result = await request('https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/RKI_Landkreisdaten/FeatureServer/0/query?where=1%3D1&outFields=OBJECTID,GEN,BEZ,death_rate,cases,deaths,cases_per_100k,cases_per_population,BL,county&returnGeometry=false&outSR=4326&f=json');
					this.log.debug(`Data from RKI Corona Landkreise API received : ${result}`);
					const values = JSON.parse(result);

					for (const feature of values.features) {
						if (!feature) continue;

						this.log.debug(`Getting data for Landkreise : ${JSON.stringify(feature.attributes.county)}`);

						// let countyName = feature.attributes.county;
						let countyName = feature.attributes.GEN;
						allGermanCountyDetails.push({ [countyName]: { GEN: feature.attributes.GEN, county: feature.attributes.county, BEZ: feature.attributes.BEZ } });
						countyName = countyName.replace(/\s/g, '_');
						countyName = countyName.replace(/\./g, '');
						allGermanCounty.push(countyName);

						for (const attributeName of Object.keys(feature.attributes)) {

							if (attributeName !== 'county' && attributeName !== 'GEN' && attributeName !== 'BEZ' && attributeName !== 'OBJECTID') {

								if (this.config.getAllGermanCountyStates || this.config.allGermanCounty.includes(countyName)) {

									this.log.debug(`Create Landkreis State : ${values}`);

									// Create State for each Landkreis	
									await this.localCreateState(`Germany.county.${countyName}.${attributeName}`, attributeName, feature.attributes[attributeName]);

								} else {
									this.log.debug(`Delete Landkreis State : Germany.county.${countyName}.${attributeName}`);
									await this.localDeleteState(`Germany.county.${countyName}.${attributeName}`);
								}
							}
						}
					}

					this.log.debug(`allGermanCountyDetails : ${JSON.stringify(allGermanCountyDetails.sort())}`);
					allGermanCounty = allGermanCounty.sort();
					this.log.debug(`allGermanCounty : ${JSON.stringify(allGermanCounty)}`);

					await this.extendObjectAsync('countryTranslator', {
						native: {
							allGermanCounty
						},
					});

				} catch (error) {
					this.log.error(`[germanyCounties] error: ${error.message}, stack: ${error.stack}`);
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
				this.log.error(`Unable to reach COVID-19 API : ${e}`);
			}

			// Always terminate at the end
			this.terminate ? this.terminate() : process.exit();

		} catch (error) {
			this.log.error(`[onReady] error: ${error.message}, stack: ${error.stack}`);
		}
	}

	async localCreateState(state, name, value) {
		this.log.debug(`Create_state called for : ${state} with value : ${value}`);

		try {
			// Try to get details from state lib, if not use defaults. throw warning if states is not known in attribute list
			if (stateAttr[name] === undefined) {
				this.log.warn(`State attribute definition missing for + ${name}`);
			}
			const writable = stateAttr[name] !== undefined ? stateAttr[name].write || false : false;
			const state_name = stateAttr[name] !== undefined ? stateAttr[name].name || name : name;
			const role = stateAttr[name] !== undefined ? stateAttr[name].role || 'state' : 'state';
			const type = stateAttr[name] !== undefined ? stateAttr[name].type || 'mixed' : 'mixed';
			const unit = stateAttr[name] !== undefined ? stateAttr[name].unit || '' : '';
			this.log.debug(`Write value : ${writable}`);

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
			this.log.error(`[localCreateState] error: ${error.message}, stack: ${error.stack}`);
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
 * @param {Object} countryInfo
 */
	async getIsoCountry(country, countryInfo) {
		try {
			let countryObj = undefined;
			if (countryInfo.iso2 && countryInfo.iso2 !== null) {
				// Country Objekt über iso2 suchen
				return countryJs.findByIso2(countryInfo.iso2);

			} else if (countryInfo.iso3 && countryInfo.iso3 !== null) {
				// Country Objekt über iso3 suchen
				return countryJs.findByIso3(countryInfo.iso3);

			} else {
				// kein iso info vorhanden, über Name suchen
				countryObj = countryJs.findByName(country.replace(/_/g, ' ').replace(/é/g, 'e').replace(/ç/g, 'c'));

				if (countryObj) {
					if (countryObj.continent) {
						return countryObj;
					}
				} else {
					countryObj = countryJs.findByName(countryTranslator[country]);
					if (countryObj) {
						return countryObj;
					} else {
						if (country !== 'Diamond Princess' && country !== 'MS Zaandam') {
							this.log.warn(`${country} (iso2: ${countryInfo.iso2}, iso3: ${countryInfo.iso3}) not found in lib! Must be added to the country name translator.`);
						}
					}
				}
			}
		} catch (error) {
			this.log.error(`[getIsoCountry] error: ${error.message}, stack: ${error.stack}`);
		}

		return undefined;
	}

	async addUserCountriesTranslator() {
		try {
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
		} catch (error) {
			this.log.error(`[addUserCountriesTranslator] error: ${error.message}, stack: ${error.stack}`);
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
