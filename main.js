'use strict';

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const { default: axios } = require('axios');
const adapterName = require('./package.json').name.split('.').pop();
const stateAttr = require('./lib/stateAttr.js');
const { wait } = require('./lib/tools');
const countryJs = require('country-list-js');
const allCountrys = []; // Array for all countrys to store in object
const warnMessages = {}; 
// For Germany, arrays to store federal states, city and  counties to store in object
let allGermanyFederalStates = [], allGermanCountyDetails = [], allGermanyCounties = [], allGermanyCities = [];
let allGermanyFederalStatesLoaded = null, allGermanyCountiesLoaded = null, allGermanyCitiesLoaded = null;

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
			// Load configuration
			const selectedCountries = this.config.countries || [];
			const selectedGermanyFederalStates = this.config.selectedGermanyFederalStates || [];
			const selectedGermanyCities = this.config.selectedGermanyCities || [];
			const selectedGermanyCounties = this.config.selectedGermanyCounties || [];
			this.log.debug(`Configuration object before config load : ${JSON.stringify(this.config)}`);

			// Determine if routin must run to get data for tables
			const loadedArrays = await this.getObjectAsync(`${this.namespace}.countryTranslator`);
			if (!loadedArrays) {
				allGermanyCitiesLoaded = false;

			} else {
				allGermanyCitiesLoaded = loadedArrays.native.allGermanyCities || false;
				allGermanyCountiesLoaded = loadedArrays.native.allGermanyCounties || false;
				allGermanyFederalStatesLoaded = loadedArrays.native.allGermanyFederalStates || false;
			}

			const loadAll = async () => {
				// Try to call API and get global information
				let apiResult = null;
				try {
					// Try to reach API and receive data
					apiResult = await axios.get('https://corona.lmao.ninja/v2/all');
				} catch (error) {
					this.log.warn(`[loadAll] Unable to contact COVID-19 API : ${error}`);
					return;
				}
				this.log.debug(`Data from COVID-19 API received : ${apiResult.data}`);
				const values = apiResult.data;
				for (const i of Object.keys(values)) {
					await this.localCreateState(`global_totals.${i}`, i, values[i]);
				}
			};

			const loadCountries = async () => {
				try {
					let apiResult = null;
					const continentsStats = {};
					continentsStats['America'] = {};
					continentsStats['World_Sum'] = {};

					// Try to call API and get country information
					try {
						apiResult = await axios.get('https://corona.lmao.ninja/v2/countries?sort=cases');
						this.log.debug(`Data from COVID-19 API received : ${apiResult.data}`);
						this.log.debug(`load all country's : ${this.config.loadAllCountrys} as ${typeof this.config.loadAllCountrys}`);
					} catch (error) {
						this.log.warn(`[loadCountries] Unable to contact COVID-19 API : ${error}`);
						return;
					}

					const values = apiResult.data;

					// add user defined country translation to countryTranslator
					await this.addUserCountriesTranslator();

					// Write all country states depending on filter
					for (const dataset of values) {
						if (dataset.country) {
							let rawCountry = dataset.country;
							let continent = undefined;

							const isoCountry = await this.getIsoCountry(dataset.country, dataset['countryInfo']);

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
							const country = rawCountry.replace(/\s/g, '_').replace(/\./g, '').replace(',', '');

							this.log.debug(`api name: ${dataset.country}, converted name: ${rawCountry}, dp name: ${country}, continent: ${continent}`);

							// Write states for all countrys in API
							for (const property of Object.keys(dataset)) {
								// Don't create a state for the country
								if (property === 'country') continue;
								if (property === 'countryInfo') await this.localDeleteState(`${country}.${property}`);
								if (this.config.loadAllCountrys || selectedCountries.includes(rawCountry)) {

									this.log.debug(`Country add routine : ${property} for : ${country}`);
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
										await this.localDeleteState(`${country}.flag`);
									} else {
										// Only take the flag from country info
										await this.localDeleteState(`${country}.flag`);
										await this.localDeleteState(`${country}.${property}`); // Temporary needed for installations < 0.4.0 to cleanup states
									}
								}

								if (continent) {
									if (property !== 'countryInfo'
									) {
										continentsStats[continent] = continentsStats[continent] || {};
										continentsStats[continent][property] = continentsStats[continent][property] || 0;

										if (!continentsStats['America'].hasOwnProperty(property) && (continent === 'North_America' || continent === 'South_America')) {
											continentsStats['America'][property] = 0;
										}

										if (!continentsStats['World_Sum'].hasOwnProperty(property)) {
											continentsStats['World_Sum'][property] = 0;
										}

										if (property !== 'updated') {
											continentsStats[continent][property] = continentsStats[continent][property] + dataset[property];
											continentsStats['World_Sum'][property] = continentsStats['World_Sum'][property] + dataset[property];
										} else {
											// Zeitstempel 'updated' aktualisieren -> neusten Wert der Länder nehmen
											if (dataset[property] > continentsStats[continent][property]) {
												continentsStats[continent][property] = dataset[property];
												continentsStats['World_Sum'][property] = dataset[property];
											}
										}


										if (continent === 'North_America' || continent === 'South_America') {
											if (property !== 'updated') {
												continentsStats['America'][property] = continentsStats['America'][property] + dataset[property];
											} else {
												// Zeitstempel 'updated' aktualisieren -> neusten Wert der Länder nehmen
												if (dataset[property] > continentsStats['America'][property]) {
													continentsStats['America'][property] = dataset[property];
												}
											}
										}
									} else {
										// Liste mit Ländern & casesPerMillion berechnung über Einwohnerzahl
										continentsStats[continent] = continentsStats[continent] || {};
										continentsStats[continent]['countries'] = continentsStats[continent]['countries'] || [];				// Liste mit Ländern
										continentsStats[continent]['inhabitants'] = continentsStats[continent]['inhabitants'] || 0;				// Einwohner wird zum berechnen der casesPerMillion benötigt

										if (!continentsStats['World_Sum'].hasOwnProperty('inhabitants')) {
											continentsStats['World_Sum']['inhabitants'] = 0;
										}

										if (!continentsStats['America'].hasOwnProperty('countries') && (continent === 'North_America' || continent === 'South_America')) {
											continentsStats['America']['countries'] = [];
											continentsStats['America']['inhabitants'] = 0;
										}

										continentsStats[continent]['countries'].push(rawCountry);

										continentsStats[continent]['inhabitants'] = continentsStats[continent]['inhabitants'] + (dataset['cases'] / dataset['casesPerOneMillion']);
										continentsStats['World_Sum']['inhabitants'] = continentsStats['World_Sum']['inhabitants'] + (dataset['cases'] / dataset['casesPerOneMillion']);

										if (continent === 'North_America' || continent === 'South_America') {
											continentsStats['America']['countries'].push(rawCountry);

											continentsStats['America']['inhabitants'] = continentsStats['America']['inhabitants'] + (dataset['cases'] / dataset['casesPerOneMillion']);
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
							if (val === 'countryInfo') await this.localDeleteState(`global_continents.${c}.${val}`);
							if ((continentsStats[c].hasOwnProperty(val)
								&& val !== 'countryInfo'
								&& val !== 'inhabitants'
								&& this.config.getContinents === true)) {
								if (val !== 'countries' && val !== 'casesPerOneMillion' && val !== 'deathsPerOneMillion') {
									await this.localCreateState(`global_continents.${c}.${val}`, val, continentsStats[c][val]);
								} else if (val === 'casesPerOneMillion') {
									await this.localCreateState(`global_continents.${c}.${val}`, val, (continentsStats[c]['cases'] / continentsStats[c]['inhabitants']).toFixed(2));
								} else if (val === 'deathsPerOneMillion') {
									await this.localCreateState(`global_continents.${c}.${val}`, val, (continentsStats[c]['deaths'] / continentsStats[c]['inhabitants']).toFixed(2));
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
					this.errorHandling('loadCountries', error);
				}
			};

			const germanyBundersland = async () => {
				// Try to call API and get global information
				try {
					// RKI Corona Bundesländer : https://npgeo-corona-npgeo-de.hub.arcgis.com/datasets/ef4b445a53c1406892257fe63129a8ea_0/geoservice?geometry=-23.491%2C46.270%2C39.746%2C55.886
					// DataSource too build query https://npgeo-corona-npgeo-de.hub.arcgis.com/datasets/ef4b445a53c1406892257fe63129a8ea_0?geometry=-23.491%2C46.270%2C39.746%2C55.886
					// const result = await request('https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/Coronaf%C3%A4lle_in_den_Bundesl%C3%A4ndern/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&outSR=4326&f=json');

					// Try to call API and get germanyBundersland
					let apiResult = null;
					try {
						apiResult = await axios.get('https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/Coronaf%C3%A4lle_in_den_Bundesl%C3%A4ndern/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&outSR=4326&f=json');
						this.log.debug(`Data from RKI Corona Bundesländer API received : ${apiResult.data}`);
						this.log.debug(`load all country's : ${this.config.loadAllCountrys} as ${typeof this.config.loadAllCountrys}`);
					} catch (error) {
						this.log.warn(`[germanyBundersland] Unable to contact RKI Corona Bundesländer API : ${error}`);
						return;
					}

					const values = apiResult.data;

					for (const feature of values.features) {
						this.log.debug(`Getting data for Federal State : ${JSON.stringify(feature.attributes.LAN_ew_GEN)}`);
						const federalStateName = feature.attributes.LAN_ew_GEN;
						const channelName = `Germany.Bundesland.${federalStateName}`;
						allGermanyFederalStates.push(federalStateName);

						if (this.config.getAllGermanyFederalStates || selectedGermanyFederalStates.includes(federalStateName)) {

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
					allGermanyFederalStates = allGermanyFederalStates.sort();
					this.log.debug(`allGermanyFederalStates : ${JSON.stringify(allGermanyFederalStates)}`);

					await this.extendObjectAsync('countryTranslator', {
						native: {
							allGermanyFederalStates
						},
					});

				} catch (error) {
					this.errorHandling('germanyFederalStates', error);
				}
			};

			const germanyCounties = async () => {
				// Try to call API and get global information
				try {
					// RKI Corona Landkreise : https://npgeo-corona-npgeo-de.hub.arcgis.com/datasets/917fc37a709542548cc3be077a786c17_0/geoservice?selectedAttribute=BSG
					
					// Try to call API and get germanyBundersland
					let apiResult = null;
					try {
						apiResult = await axios.get('https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/RKI_Landkreisdaten/FeatureServer/0/query?where=1%3D1&outFields=OBJECTID,GEN,BEZ,death_rate,cases,deaths,cases_per_100k,cases_per_population,BL,county&returnGeometry=false&outSR=4326&f=json');
						this.log.debug(`Data from RKI Corona Landkreise API received : ${apiResult.data}`);
						this.log.debug(`load all country's : ${this.config.loadAllCountrys} as ${typeof this.config.loadAllCountrys}`);
					} catch (error) {
						this.log.warn(`[germanyBundersland] Unable to contact RKI Corona Bundesländer API : ${error}`);
						return;
					}

					const values = apiResult.data;

					for (const feature of values.features) {
						if (!feature) continue;

						this.log.debug(`Getting data for Landkreise : ${JSON.stringify(feature.attributes.county)} containing ${JSON.stringify(feature.attributes)}`);

						let countyName = feature.attributes.GEN;
						let countiesType = feature.attributes.BEZ;
						countyName = await this.characterReplace(countyName);
						allGermanCountyDetails.push({ [feature.attributes.county]: { GEN: feature.attributes.GEN, county: feature.attributes.county, BEZ: feature.attributes.BEZ } });

						// Distinguish between Kreisfreie Stadt & Landkreis
						if (countiesType === 'Kreisfreie Stadt') {
							allGermanyCities.push(countyName);
							countiesType = 'Stadt';
						} else if (countiesType === 'Kreis') {
							allGermanyCounties.push(countyName);
							countiesType = 'Kreis';
						} else if (countiesType === 'Landkreis') {
							allGermanyCounties.push(countyName);
							countiesType = 'Kreis';
						} else if (countiesType === 'Stadtkreis') {
							allGermanyCities.push(countyName);
							countiesType = 'Stadt';
						} else {
							this.log.error(`Unknown ${countiesType} received containing ${JSON.stringify(feature)}`);
						}

						// Run truth all states and write information
						for (const attributeName of Object.keys(feature.attributes)) {

							this.log.debug(`Statename will be : Germany.${countiesType}.${countyName} containing ${JSON.stringify(feature.attributes)}`);

							if (attributeName !== 'county' && attributeName !== 'GEN' && attributeName !== 'BEZ' && attributeName !== 'OBJECTID') {

								switch (countiesType) {

									case 'Stadt':

										if (this.config.getAllGermanyCities || selectedGermanyCities.includes(countyName)) {
											this.log.debug(`Create city : ${countyName}`);

											// Create State for each Landkreis	
											await this.localCreateState(`Germany.${countiesType}.${countyName}.${attributeName}`, attributeName, feature.attributes[attributeName]);

										} else {
											this.log.debug(`Delete city: Germany.${countiesType}.${countyName}.${attributeName}`);
											await this.localDeleteState(`Germany.${countiesType}.${countyName}.${attributeName}`);
										}

										break;

									case 'Kreis':

										if (this.config.getAllGermanyCounties || selectedGermanyCounties.includes(countyName)) {
											this.log.debug(`Create Landkreis  : ${countyName}`);

											// Create State for each Landkreis	
											await this.localCreateState(`Germany.${countiesType}.${countyName}.${attributeName}`, attributeName, feature.attributes[attributeName]);

										} else {
											this.log.debug(`Delete Landkreis State for older versions : Germany.${countiesType}.${countyName}.${attributeName}`);
											await this.localDeleteState(`Germany.${countiesType}.${countyName}.${attributeName}`);
										}

										break;

									default:

										await this.localDeleteState(`Germany.county.${countyName}.${attributeName}`);

								}
							}
						}

					}

					allGermanCountyDetails = allGermanCountyDetails.sort();
					this.log.debug(`allGermanCountyDetails : ${JSON.stringify(allGermanCountyDetails)}`);

					allGermanyCities = allGermanyCities.sort();
					this.log.debug(`allGermanyCities : ${JSON.stringify(allGermanyCities)}`);

					allGermanyCounties = allGermanyCounties.sort();
					this.log.debug(`allGermanyCounties : ${JSON.stringify(allGermanyCounties)}`);

					await this.extendObjectAsync('countryTranslator', {
						native: {
							allGermanyCounties
						},
					});

					await this.extendObjectAsync('countryTranslator', {
						native: {
							allGermanyCities
						},
					});

				} catch (error) {
					this.errorHandling('germanyCounties', error);
				}
			};

			// Random number generator to avoid all ioBroker instances calling the API at the same time
			const timer1 = (Math.random() * (10 - 1) + 1) * 1000;
			await wait(timer1);

			await loadAll();		// Global Worldwide statistics
			await loadCountries(); 	// Detailed Worldwide statistics by country
			if (this.config.getGermanyFederalStates || !allGermanyFederalStatesLoaded) {
				await germanyBundersland(); // Detailed Federal state statistics for germany
			}

			// Get data for cities and counties of Germany, ensur tables always have values to load
			if (this.config.getGermanyCities || this.config.getGermanyCounties || !allGermanyCitiesLoaded || !allGermanyCountiesLoaded) {
				await germanyCounties(); // Detailed city state statistics for germany
			}

			// Always terminate at the end
			this.terminate ? this.terminate() : process.exit();

		} catch (error) {
			this.errorHandling('onReady', error);
			
			// Ensure termination at error
			this.terminate ? this.terminate() : process.exit();
		}
	}

	async localCreateState(state, name, value) {
		this.log.debug(`Create_state called for : ${state} with value : ${value}`);

		try {
			// Try to get details from state lib, if not use defaults. throw warning if states is not known in attribute list
			if (stateAttr[name] === undefined) {
				const warnMessage = `State attribute definition missing for + ${name}`;
				if (warnMessages[name] !== warnMessage) {
					warnMessages[name] = warnMessage;
					this.log.warn(`State attribute definition missing for + ${name}`);
				}
			}
			const writable = stateAttr[name] !== undefined ? stateAttr[name].write || false : false;
			const state_name = stateAttr[name] !== undefined ? stateAttr[name].name || name : name;
			const role = stateAttr[name] !== undefined ? stateAttr[name].role || 'state' : 'state';
			const type = stateAttr[name] !== undefined ? stateAttr[name].type || 'mixed' : 'mixed';
			const unit = stateAttr[name] !== undefined ? stateAttr[name].unit || '' : '';
			this.log.debug(`Write value : ${writable}`);

			await this.setObjectNotExistsAsync(state, {
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

			// Ensure name changes are propagated
			await this.extendObjectAsync(state, {
				type: 'state',
				common: {
					name: state_name,
				},
			});

			// Only set value if input != null
			if (value !== null) {
				await this.setState(state, { val: value, ack: true });
			}

			// Subscribe on state changes if writable
			// writable && this.subscribeStates(state);
		} catch (error) {
			this.errorHandling('localCreateState', error);
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
			this.errorHandling('getIsoCountry', error);
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
			this.errorHandling('addUserCountriesTranslator', error);
		}
	}

	async characterReplace(string) {
		string = string.replace(/\s/g, '_');
		string = string.replace(/\./g, '');
		return string;
	}

	async errorHandling (codePart, error) {
		this.log.error(`[${codePart}] error: ${error.message}, stack: ${error.stack}`);
		if (this.supportsFeature && this.supportsFeature('PLUGINS')) {
			const sentryInstance = this.getPluginInstance('sentry');
			if (sentryInstance) {
				sentryInstance.getSentryObject().captureException(error);
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
