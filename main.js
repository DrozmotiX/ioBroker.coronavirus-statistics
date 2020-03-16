'use strict';

/*
 * Created with @iobroker/create-adapter v1.22.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const request = require('request-promise-native');
const adapterName = require('./package.json').name.split('.').pop();
const stateAttr = require('./lib/stateAttr.js');
const { wait } = require('./lib/tools');

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
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {

		const loadAll = async () => {
			// Try to call API and get global information
			try {
				const result = await request('https://corona.lmao.ninja/all');
				this.log.debug('Data from COVID-19 API received : ' + result);
				const values = JSON.parse(result);
				for (const i of Object.keys(values)) {
					await this.create_State('global_totals.' + i, i, values[i]);
				}
			} catch (error) {
				this.log.warn('Error getting API response, will retry at next shedule');
			}
		};

		const loadCountries = async () => {
			try {
				const result = await request('https://corona.lmao.ninja/countries');
				this.log.debug('Data from COVID-19 API received : ' + result);
				const values = JSON.parse(result);
				for (const i in values) {
					let country = values[i]['country'];
					country = country.replace(/\s/g, '_');
					country = country.replace(/\./g, '');
					this.log.debug(country);
					for (const y in values[i]) {
						if (y !== 'country') {
							await this.create_State(country + '.' + y, y, values[i][y]);
						}
					}
				}
			} catch (error) {
				this.log.warn('Error getting API response, will retry at next shedule');
			}

		};


		// Random number generator to avoid all ioBroker instances calling the API at the same time
		const timer_1 = (Math.random() * (10 - 1) + 1) * 1000;
		await wait(timer_1);
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

	async create_State(state, name, value) {
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

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			callback();
		} catch (e) {
			callback();
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
