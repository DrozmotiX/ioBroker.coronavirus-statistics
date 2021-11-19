const {default: axios} = require('axios');
const csv = require('csvtojson');

class HospitalIndexService {

	/**
	 * calls rki github to get hospital index data
	 *
	 * @returns hospital index data array
	 */
	static refreshGermanHospitalIndexData() {

		return axios.get('https://raw.githubusercontent.com/robert-koch-institut/COVID-19-Hospitalisierungen_in_Deutschland/master/Aktuell_Deutschland_COVID-19-Hospitalisierungen.csv', {responseType: 'blob'})
			.then(response => response.data)
			.then(data => csv().fromString(data))
			.then(data => data.filter(item => item.Datum === new Date().toLocaleDateString('fr-CA')))
			.then(data => data.filter(item => item.Altersgruppe === '00+'))
			.catch(error => {
				throw new Error(`Cannot get hospital index data from rki: ${error}`);
			});
	}

	/**
	 * @param data$                	whole hospital index data$ promise
	 * @param federalState        	"Schleswig-Holstein"
	 * @returns {Promise<*>}    	Object of hospital index data$ for input
	 */
	static getGermanHospitalIndexByFederalState(data$, federalState) {
		return data$
			.then(data => data.filter(item => item.Bundesland === federalState)[0])
			.then(data => {
				if (!data || data.length === 0) throw new Error();
				return data;
			})
			.catch(error => {
				throw new Error(`Cannot get hospital index data for ${federalState} from rki: ${error}`);
			});
	}

	/**
	 * @param data$		whole hospital data index promise
	 * @returns {*}		hospital index promise for overall germany only without federal states
	 */
	static getGermanOverallHospitalIndex(data$) {
		return HospitalIndexService.getGermanHospitalIndexByFederalState(data$, 'Bundesgebiet');
	}
}

module.exports = HospitalIndexService;
