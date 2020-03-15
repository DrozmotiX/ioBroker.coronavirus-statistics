'use strict';

/*
 * Created with @iobroker/create-adapter v1.22.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
// const fs = require("fs");
const state_attr = require(__dirname + '/lib/state_attr.js');

class Covid19 extends utils.Adapter {

	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'covid-19',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {

		// Reset the connection indicator during startup
		this.setState('info.connection', false, true);
		// Random number generator to avoid all ioBroker instances calling the API at the same time
		const timer_1 = (Math.random() * (10 - 1) + 1) * 1000;
		// additional 1.2 seconde delay for second call
		const timer_2 = timer_1 + 1200;
		// this.log.info(timer);


		setTimeout(() => {

			// Try to call API and get global information
			try {
				this.setState('info.connection', true, true);
				require('request')('https://corona.lmao.ninja/all', (error, response, result) => {
					this.log.debug('Data from COVID-19 API received : ' + result);
					const values = JSON.parse(result);
					for (const i in values) {

						this.create_state('global_totals.' + i, i, values[i]);

					}
					
				}).on('error', (e) => {this.log.error(e);});

			} catch (e) { 
				this.setState('info.connection', false, true);
				this.log.error('Unable to reach COIVD-19 API : ' + e); 
			}		
		}, timer_1);

		// Try to call API and get all details by country
		setTimeout(() => {
			try {
				this.setState('info.connection', true, true);
				require('request')('https://corona.lmao.ninja/countries', (error, response, result) => {
					this.log.debug('Data from COVID-19 API received : ' + result);
					const values = JSON.parse(result);
					for (const i in values) {
						let country = values[i]['country'];
						country = country.replace(/\s/g, "_");
						country = country.replace(/\./g, "");
						this.log.debug(country);
						for (const y in values[i]) {

							if (y !== 'country') {
								this.create_state(country + '.' + y, y, values[i][y]);
							}
						}

					}
					
				}).on('error', (e) => {this.log.error(e);});

			} catch (e) { 
				this.setState('info.connection', false, true);
				this.log.error('Unable to reach COIVD-19 API : ' + e); 
			}
		}, timer_2);

		// force terminate after 1min
		// don't know why it does not terminate by itself...
		setTimeout(() => {
			this.log.debug(this.name + ' force terminate');
			this.terminate ? this.terminate() : process.exit();
		}, 50000);

	}

	async create_state(state, name, value){
		this.log.debug('Create_state called for : ' + state + ' with value : ' + value);

		try {
			// Try to get details from state lib, if not use defaults. throw warning if states is not known in attribute list
			if((state_attr[name] === undefined)){this.log.warn('State attribute definition missing for + ' + name);}
			const writable = (state_attr[name] !== undefined) ?  state_attr[name].write || false : false;
			const state_name = (state_attr[name] !== undefined) ?  state_attr[name].name || name : name;
			const role = (state_attr[name] !== undefined) ?  state_attr[name].role || 'state' : 'state';
			const type = (state_attr[name] !== undefined) ?  state_attr[name].type || 'mixed' : 'mixed';
			const unit = (state_attr[name] !== undefined) ?  state_attr[name].unit || '' : '';
			this.log.debug('Write value : ' + writable);

			await this.extendObjectAsync(state, {
				type: 'state',
				common: {
					name: state_name,
					role: role,
					type: type,
					unit: unit,
					write : writable
				},
				native: {},
			});

			// Only set value if input != null
			if (value !== null) {await this.setState(state, {val: value, ack: true});}

			// Subscribe on state changes if writable
			if (writable === true) {this.subscribeStates(state);}

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
			this.log.info('cleaned everything up...');
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