# ioBroker.covid-19

[![NPM version](http://img.shields.io/npm/v/iobroker.covid-19.svg)](https://www.npmjs.com/package/iobroker.covid-19)
[![Downloads](https://img.shields.io/npm/dm/iobroker.covid-19.svg)](https://www.npmjs.com/package/iobroker.covid-19)
![Number of Installations (latest)](http://iobroker.live/badges/covid-19-installed.svg)
![Number of Installations (stable)](http://iobroker.live/badges/covid-19-stable.svg)
[![Dependency Status](https://img.shields.io/david/iobroker-community-adapters/iobroker.covid-19.svg)](https://david-dm.org/iobroker-community-adapters/iobroker.covid-19)
[![Known Vulnerabilities](https://snyk.io/test/github/iobroker-community-adapters/ioBroker.covid-19/badge.svg)](https://snyk.io/test/github/iobroker-community-adapters/ioBroker.covid-19)

[![NPM](https://nodei.co/npm/iobroker.covid-19.png?downloads=true)](https://nodei.co/npm/iobroker.covid-19/)

**Tests:**: [![Travis-CI](http://img.shields.io/travis/iobroker-community-adapters/ioBroker.covid-19/master.svg)](https://travis-ci.org/iobroker-community-adapters/ioBroker.covid-19)

## covid-19 adapter for ioBroker

Adapter to show Global Corona Virus information and current reports

There is no configuration required, after installation it will : 

- Receive global information world-wide and write it to "global_totals"
- Create a folder for each country with all relevant information regarding COVID-19
- Update the information every 15 minutes

The following information is available : 

| Datapoint | Details |
|--|--|
| active | Amount of current infected people |
| cases | Amount of totally known cases |
| critical | Amount of critical situation (Hospitalized) |
| deaths | Amount of current registered deaths |
| recovered | Amount of totally known recovered cases |
| todayCases | New Cases by Today |
| todayDeaths | Amount of totally known people died today |


Please be aware this adapter uses as much as possible up-to-date information but there can be an delay of several hours depending on the country's report.

## Changelog

### 0.1.0
* (DutchmanNL) initial release

## License
MIT License

Copyright (c) 2020 DutchmanNL <rdrozda86@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.