const {default: axios} = require('axios');

class HospitalService {

	/**
	 * calls divi api to get the german hospital data
	 *
	 * @returns hospital data object
	 */
	static refreshGermanHospitalData() {
		return axios.get('https://www.intensivregister.de/api/public/reporting/laendertabelle')
			.then(response => response.data)
			.then(jsonData => {
				jsonData.federalStates = jsonData.data.map(federalState => ({
					...federalState,
					bundesland: this.formatGermanHospitalDataFederalState(federalState.bundesland),
				}));
				delete jsonData.data;
				delete jsonData.creationTimestamp;
				return jsonData;
			})
			.catch(error => {
				throw new Error(`Cannot get german hospital data from divi: ${error}`);
			});
	}

	/**
	 * @param name 			"SCHLESWIG_HOLSTEIN"
	 * @returns {string} 	"Schleswig-Holstein"
	 */
	static formatGermanHospitalDataFederalState(name) {
		return name
			.toLowerCase()
			.split('_')
			.map(subString => `${subString.charAt(0).toUpperCase()}${subString.slice(1)}`)
			.join('-')
			.replace(/ä/, 'ae')
			.replace(/ö/, 'oe')
			.replace(/ü/, 'ue');
	}

	/**
	 * @param data$		whole hospital data promise
	 * @returns {*}		hospital promise for overall germany only without federal states
	 */
	static getGermanOverallHospitalData(data$) {
		return data$
			.then(data => data.overallSum)
			.then(data => {
				delete data.bundesland;
				return data;
			})
			.catch(error => {
				throw new Error(`Cannot get German overall Hospital Data: ${error}`);
			});
	}

	/**
	 * @param data$				whole hospital data$ promise
	 * @param federalState		"Schleswig-Holstein"
	 * @returns {Promise<*>}	Object of hospital data$ for input
	 */
	static getGermanHospitalDataByFederalState(data$, federalState) {
		return data$
			.then(data => data.federalStates.filter(federalStateObject => federalStateObject.bundesland === federalState)[0])
			.then(data => {
				if (!data || data.length === 0) throw new Error();
				return data;
			})
			.catch(error => {
				throw new Error(`Cannot get hospital data for ${federalState} from divi: ${error}`);
			});
	}
}

module.exports = HospitalService;
