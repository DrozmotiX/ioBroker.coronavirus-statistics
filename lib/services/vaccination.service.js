const {default: axios} = require('axios');

class VaccinationService {

	/**
	 * calls our world in data api to get the vaccination data
	 *
	 * @returns whole vaccination data object
	 */
	static refreshVaccinationData() {
		return axios.get('https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/vaccinations/vaccinations.json')
			.then(response => response.data)
			// reduce data to latest day of all countries
			.then(jsonData => {
				if (!jsonData || jsonData.length === 0) throw new Error();
				for (const country of jsonData) {
					country.data = country.data[country.data.length - 1];
				}
				return jsonData;
			})
			.catch(error => {
				throw new Error(`Cannot get vaccination data from our world in data ${error}`);
			});
	}

	/**
	 * @param data$				vaccination data promise
	 * @param isoCode			"USA"
	 * @returns {Promise<*>} 	latest day of vaccination data for germany
	 */
	static getVaccinationDataByIsoCode(data$, isoCode) {
		return data$
			// filter german only
			.then(data => data.filter(item => item.iso_code.toLocaleLowerCase().includes(isoCode.toLowerCase()))[0])
			.then(data => {
				if (!data || data.length === 0) throw new Error();
				return data;
			})
			// just the data
			.then(countryData => {
				if (!countryData || countryData.length === 0) throw new Error();
				return countryData.data;
			})
			.catch(error => {
				throw new Error(`Cannot get vaccination data for ${isoCode} from our world in data ${error}`);
			});
	}
}

module.exports = VaccinationService;
