import * as topojson from "topojson-client";
import { geoCentroid } from "d3-geo";
import { Province } from "./types";

// ISO 3166-1 numeric code mapping for all countries in world-50m.json
const COUNTRY_NAMES: Record<string, string> = {
  "004": "Afghanistan",
  "008": "Albania",
  "012": "Algeria",
  "016": "American Samoa",
  "020": "Andorra",
  "024": "Angola",
  "028": "Antigua and Barbuda",
  "031": "Azerbaijan",
  "032": "Argentina",
  "036": "Australia",
  "040": "Austria",
  "044": "Bahamas",
  "048": "Bahrain",
  "050": "Bangladesh",
  "051": "Armenia",
  "052": "Barbados",
  "056": "Belgium",
  "060": "Bermuda",
  "064": "Bhutan",
  "068": "Bolivia",
  "070": "Bosnia and Herz.",
  "072": "Botswana",
  "076": "Brazil",
  "084": "Belize",
  "086": "British Indian Ocean Terr.",
  "090": "Solomon Islands",
  "092": "British Virgin Islands",
  "096": "Brunei",
  "100": "Bulgaria",
  "104": "Myanmar",
  "108": "Burundi",
  "112": "Belarus",
  "116": "Cambodia",
  "120": "Cameroon",
  "124": "Canada",
  "132": "Cape Verde",
  "136": "Cayman Islands",
  "140": "Central African Rep.",
  "144": "Sri Lanka",
  "148": "Chad",
  "152": "Chile",
  "156": "China",
  "158": "Taiwan",
  "170": "Colombia",
  "174": "Comoros",
  "178": "Congo",
  "180": "Dem. Rep. Congo",
  "184": "Cook Islands",
  "188": "Costa Rica",
  "191": "Croatia",
  "192": "Cuba",
  "196": "Cyprus",
  "203": "Czechia",
  "204": "Benin",
  "208": "Denmark",
  "212": "Dominica",
  "214": "Dominican Rep.",
  "218": "Ecuador",
  "222": "El Salvador",
  "226": "Equatorial Guinea",
  "231": "Ethiopia",
  "232": "Eritrea",
  "233": "Estonia",
  "234": "Faroe Islands",
  "238": "Falkland Islands",
  "239": "S. Georgia and S. Sandwich Is.",
  "242": "Fiji",
  "246": "Finland",
  "248": "Aland Islands",
  "250": "France",
  "258": "French Polynesia",
  "260": "French Southern Terr.",
  "262": "Djibouti",
  "266": "Gabon",
  "268": "Georgia",
  "270": "Gambia",
  "275": "Palestine",
  "276": "Germany",
  "288": "Ghana",
  "296": "Kiribati",
  "300": "Greece",
  "304": "Greenland",
  "308": "Grenada",
  "316": "Guam",
  "320": "Guatemala",
  "324": "Guinea",
  "328": "Guyana",
  "332": "Haiti",
  "334": "Heard I. and McDonald Is.",
  "336": "Vatican",
  "340": "Honduras",
  "344": "Hong Kong",
  "348": "Hungary",
  "352": "Iceland",
  "356": "India",
  "360": "Indonesia",
  "364": "Iran",
  "368": "Iraq",
  "372": "Ireland",
  "376": "Israel",
  "380": "Italy",
  "384": "Cote d'Ivoire",
  "388": "Jamaica",
  "392": "Japan",
  "398": "Kazakhstan",
  "400": "Jordan",
  "404": "Kenya",
  "408": "North Korea",
  "410": "South Korea",
  "414": "Kuwait",
  "417": "Kyrgyzstan",
  "418": "Laos",
  "422": "Lebanon",
  "426": "Lesotho",
  "428": "Latvia",
  "430": "Liberia",
  "434": "Libya",
  "438": "Liechtenstein",
  "440": "Lithuania",
  "442": "Luxembourg",
  "446": "Macau",
  "450": "Madagascar",
  "454": "Malawi",
  "458": "Malaysia",
  "462": "Maldives",
  "466": "Mali",
  "470": "Malta",
  "478": "Mauritania",
  "480": "Mauritius",
  "484": "Mexico",
  "492": "Monaco",
  "496": "Mongolia",
  "498": "Moldova",
  "499": "Montenegro",
  "500": "Montserrat",
  "504": "Morocco",
  "508": "Mozambique",
  "512": "Oman",
  "516": "Namibia",
  "520": "Nauru",
  "524": "Nepal",
  "528": "Netherlands",
  "531": "Curacao",
  "533": "Aruba",
  "534": "Sint Maarten",
  "540": "New Caledonia",
  "548": "Vanuatu",
  "554": "New Zealand",
  "558": "Nicaragua",
  "562": "Niger",
  "566": "Nigeria",
  "570": "Niue",
  "574": "Norfolk Island",
  "578": "Norway",
  "580": "N. Mariana Islands",
  "583": "Micronesia",
  "584": "Marshall Islands",
  "585": "Palau",
  "586": "Pakistan",
  "591": "Panama",
  "598": "Papua New Guinea",
  "600": "Paraguay",
  "604": "Peru",
  "608": "Philippines",
  "612": "Pitcairn Islands",
  "616": "Poland",
  "620": "Portugal",
  "624": "Guinea-Bissau",
  "626": "Timor-Leste",
  "630": "Puerto Rico",
  "634": "Qatar",
  "642": "Romania",
  "643": "Russia",
  "646": "Rwanda",
  "652": "Saint Barthelemy",
  "654": "Saint Helena",
  "659": "Saint Kitts and Nevis",
  "660": "Anguilla",
  "662": "Saint Lucia",
  "663": "Saint Martin",
  "666": "Saint Pierre and Miquelon",
  "670": "Saint Vincent and the Grenadines",
  "674": "San Marino",
  "678": "Sao Tome and Principe",
  "682": "Saudi Arabia",
  "686": "Senegal",
  "688": "Serbia",
  "690": "Seychelles",
  "694": "Sierra Leone",
  "702": "Singapore",
  "703": "Slovakia",
  "704": "Vietnam",
  "705": "Slovenia",
  "706": "Somalia",
  "710": "South Africa",
  "716": "Zimbabwe",
  "724": "Spain",
  "728": "South Sudan",
  "729": "Sudan",
  "732": "Western Sahara",
  "740": "Suriname",
  "748": "Eswatini",
  "752": "Sweden",
  "756": "Switzerland",
  "760": "Syria",
  "762": "Tajikistan",
  "764": "Thailand",
  "768": "Togo",
  "776": "Tonga",
  "780": "Trinidad and Tobago",
  "784": "United Arab Emirates",
  "788": "Tunisia",
  "792": "Turkey",
  "795": "Turkmenistan",
  "796": "Turks and Caicos Islands",
  "800": "Uganda",
  "804": "Ukraine",
  "807": "North Macedonia",
  "818": "Egypt",
  "826": "United Kingdom",
  "831": "Guernsey",
  "832": "Jersey",
  "833": "Isle of Man",
  "834": "Tanzania",
  "840": "USA",
  "850": "U.S. Virgin Islands",
  "854": "Burkina Faso",
  "858": "Uruguay",
  "860": "Uzbekistan",
  "862": "Venezuela",
  "876": "Wallis and Futuna",
  "882": "Samoa",
  "887": "Yemen",
  "894": "Zambia",
};

// Real approximate country data: population (millions), defense (1-10), economy (GDP $B approx), technology (1-10)
const COUNTRY_DATA: Record<string, { population: number; defense: number; economy: number; technology: number }> = {
  // North America
  "840": { population: 330, defense: 10, economy: 25000, technology: 10 },   // USA
  "124": { population: 39, defense: 6, economy: 2100, technology: 9 },       // Canada
  "484": { population: 130, defense: 5, economy: 1300, technology: 7 },      // Mexico
  "192": { population: 11, defense: 5, economy: 100, technology: 5 },        // Cuba
  "332": { population: 11, defense: 1, economy: 20, technology: 2 },         // Haiti
  "214": { population: 11, defense: 3, economy: 90, technology: 5 },         // Dominican Rep.
  "388": { population: 3, defense: 2, economy: 15, technology: 5 },          // Jamaica
  "780": { population: 1, defense: 2, economy: 25, technology: 5 },          // Trinidad and Tobago
  "044": { population: 0.4, defense: 1, economy: 12, technology: 5 },        // Bahamas
  "052": { population: 0.3, defense: 1, economy: 5, technology: 5 },         // Barbados
  "084": { population: 0.4, defense: 1, economy: 2, technology: 3 },         // Belize
  "188": { population: 5, defense: 2, economy: 65, technology: 6 },          // Costa Rica
  "222": { population: 6, defense: 3, economy: 30, technology: 4 },          // El Salvador
  "320": { population: 17, defense: 3, economy: 85, technology: 4 },         // Guatemala
  "340": { population: 10, defense: 2, economy: 30, technology: 4 },         // Honduras
  "558": { population: 7, defense: 2, economy: 14, technology: 3 },          // Nicaragua
  "591": { population: 4, defense: 3, economy: 70, technology: 6 },          // Panama
  "028": { population: 0.1, defense: 1, economy: 2, technology: 4 },         // Antigua and Barbuda
  "212": { population: 0.07, defense: 1, economy: 0.6, technology: 4 },      // Dominica
  "308": { population: 0.1, defense: 1, economy: 1, technology: 4 },         // Grenada
  "659": { population: 0.05, defense: 1, economy: 1, technology: 4 },        // Saint Kitts and Nevis
  "662": { population: 0.2, defense: 1, economy: 2, technology: 4 },         // Saint Lucia
  "670": { population: 0.1, defense: 1, economy: 0.8, technology: 4 },       // Saint Vincent and the Grenadines
  "630": { population: 3, defense: 2, economy: 105, technology: 6 },         // Puerto Rico
  "060": { population: 0.06, defense: 1, economy: 7, technology: 7 },        // Bermuda
  "136": { population: 0.07, defense: 1, economy: 6, technology: 7 },        // Cayman Islands
  "016": { population: 0.05, defense: 1, economy: 0.6, technology: 3 },      // American Samoa
  "092": { population: 0.03, defense: 1, economy: 1, technology: 5 },        // British Virgin Islands
  "316": { population: 0.17, defense: 1, economy: 6, technology: 5 },        // Guam
  "500": { population: 0.005, defense: 1, economy: 0.06, technology: 4 },    // Montserrat
  "796": { population: 0.04, defense: 1, economy: 1, technology: 5 },        // Turks and Caicos Islands
  "850": { population: 0.1, defense: 1, economy: 4, technology: 5 },         // U.S. Virgin Islands
  "660": { population: 0.015, defense: 1, economy: 0.3, technology: 4 },     // Anguilla
  "580": { population: 0.05, defense: 1, economy: 1, technology: 4 },        // N. Mariana Islands

  // South America
  "076": { population: 215, defense: 5, economy: 1900, technology: 6 },      // Brazil
  "032": { population: 46, defense: 4, economy: 630, technology: 6 },        // Argentina
  "170": { population: 51, defense: 4, economy: 340, technology: 6 },        // Colombia
  "604": { population: 33, defense: 4, economy: 240, technology: 5 },        // Peru
  "862": { population: 28, defense: 4, economy: 100, technology: 4 },        // Venezuela
  "152": { population: 19, defense: 4, economy: 300, technology: 7 },        // Chile
  "218": { population: 18, defense: 3, economy: 110, technology: 5 },        // Ecuador
  "068": { population: 12, defense: 3, economy: 40, technology: 4 },         // Bolivia
  "600": { population: 7, defense: 2, economy: 40, technology: 4 },          // Paraguay
  "858": { population: 3, defense: 3, economy: 60, technology: 6 },          // Uruguay
  "328": { population: 0.8, defense: 2, economy: 7, technology: 3 },         // Guyana
  "740": { population: 0.6, defense: 1, economy: 4, technology: 3 },         // Suriname
  "238": { population: 0.003, defense: 1, economy: 0.2, technology: 4 },     // Falkland Islands

  // Europe - Western
  "826": { population: 67, defense: 8, economy: 3100, technology: 9 },       // United Kingdom
  "276": { population: 83, defense: 7, economy: 4200, technology: 10 },      // Germany
  "250": { population: 67, defense: 8, economy: 2900, technology: 9 },       // France
  "380": { population: 59, defense: 6, economy: 2200, technology: 8 },       // Italy
  "724": { population: 47, defense: 6, economy: 1400, technology: 8 },       // Spain
  "528": { population: 17, defense: 5, economy: 1000, technology: 9 },       // Netherlands
  "056": { population: 12, defense: 4, economy: 580, technology: 8 },        // Belgium
  "040": { population: 9, defense: 4, economy: 470, technology: 9 },         // Austria
  "756": { population: 9, defense: 4, economy: 800, technology: 10 },        // Switzerland
  "620": { population: 10, defense: 4, economy: 250, technology: 7 },        // Portugal
  "372": { population: 5, defense: 3, economy: 500, technology: 9 },         // Ireland
  "442": { population: 0.65, defense: 2, economy: 80, technology: 9 },       // Luxembourg
  "352": { population: 0.37, defense: 2, economy: 25, technology: 9 },       // Iceland
  "492": { population: 0.04, defense: 1, economy: 7, technology: 8 },        // Monaco
  "438": { population: 0.04, defense: 1, economy: 7, technology: 8 },        // Liechtenstein
  "020": { population: 0.08, defense: 1, economy: 3, technology: 7 },        // Andorra
  "674": { population: 0.03, defense: 1, economy: 2, technology: 7 },        // San Marino
  "336": { population: 0.001, defense: 1, economy: 0.02, technology: 5 },    // Vatican
  "470": { population: 0.5, defense: 2, economy: 17, technology: 7 },        // Malta

  // Europe - Nordic
  "752": { population: 10, defense: 5, economy: 580, technology: 10 },       // Sweden
  "578": { population: 5, defense: 5, economy: 480, technology: 9 },         // Norway
  "208": { population: 6, defense: 5, economy: 400, technology: 9 },         // Denmark
  "246": { population: 6, defense: 5, economy: 300, technology: 9 },         // Finland
  "234": { population: 0.05, defense: 1, economy: 3, technology: 7 },        // Faroe Islands
  "248": { population: 0.03, defense: 1, economy: 2, technology: 7 },        // Aland Islands
  "304": { population: 0.06, defense: 2, economy: 3, technology: 6 },        // Greenland

  // Europe - Eastern
  "616": { population: 38, defense: 6, economy: 680, technology: 7 },        // Poland
  "642": { population: 19, defense: 4, economy: 300, technology: 6 },        // Romania
  "203": { population: 11, defense: 4, economy: 280, technology: 8 },        // Czechia
  "348": { population: 10, defense: 4, economy: 180, technology: 7 },        // Hungary
  "703": { population: 5, defense: 3, economy: 115, technology: 7 },         // Slovakia
  "100": { population: 7, defense: 3, economy: 80, technology: 6 },          // Bulgaria
  "191": { population: 4, defense: 3, economy: 65, technology: 6 },          // Croatia
  "705": { population: 2, defense: 2, economy: 60, technology: 7 },          // Slovenia
  "233": { population: 1, defense: 3, economy: 35, technology: 8 },          // Estonia
  "428": { population: 2, defense: 3, economy: 40, technology: 7 },          // Latvia
  "440": { population: 3, defense: 3, economy: 65, technology: 7 },          // Lithuania
  "112": { population: 9, defense: 4, economy: 60, technology: 5 },          // Belarus
  "804": { population: 44, defense: 6, economy: 160, technology: 6 },        // Ukraine
  "498": { population: 3, defense: 2, economy: 14, technology: 4 },          // Moldova

  // Europe - Balkans
  "688": { population: 7, defense: 3, economy: 60, technology: 6 },          // Serbia
  "070": { population: 3, defense: 2, economy: 22, technology: 5 },          // Bosnia and Herz.
  "807": { population: 2, defense: 2, economy: 13, technology: 5 },          // North Macedonia
  "499": { population: 0.6, defense: 2, economy: 6, technology: 5 },         // Montenegro
  "008": { population: 3, defense: 2, economy: 18, technology: 5 },          // Albania

  // Europe - Other
  "300": { population: 11, defense: 5, economy: 220, technology: 7 },        // Greece
  "196": { population: 1, defense: 2, economy: 28, technology: 7 },          // Cyprus
  "831": { population: 0.06, defense: 1, economy: 3, technology: 7 },        // Guernsey
  "832": { population: 0.1, defense: 1, economy: 6, technology: 7 },         // Jersey
  "833": { population: 0.08, defense: 1, economy: 7, technology: 7 },        // Isle of Man

  // Russia and Central Asia
  "643": { population: 144, defense: 9, economy: 2000, technology: 8 },      // Russia
  "398": { population: 19, defense: 4, economy: 190, technology: 5 },        // Kazakhstan
  "860": { population: 34, defense: 4, economy: 70, technology: 4 },         // Uzbekistan
  "795": { population: 6, defense: 3, economy: 45, technology: 4 },          // Turkmenistan
  "762": { population: 10, defense: 3, economy: 9, technology: 3 },          // Tajikistan
  "417": { population: 7, defense: 3, economy: 9, technology: 3 },           // Kyrgyzstan

  // Middle East
  "792": { population: 85, defense: 7, economy: 900, technology: 7 },        // Turkey
  "682": { population: 36, defense: 7, economy: 800, technology: 6 },        // Saudi Arabia
  "784": { population: 10, defense: 6, economy: 420, technology: 8 },        // United Arab Emirates
  "376": { population: 9, defense: 8, economy: 520, technology: 10 },        // Israel
  "364": { population: 86, defense: 7, economy: 400, technology: 6 },        // Iran
  "368": { population: 42, defense: 4, economy: 210, technology: 4 },        // Iraq
  "760": { population: 22, defense: 3, economy: 20, technology: 3 },         // Syria
  "400": { population: 11, defense: 4, economy: 45, technology: 5 },         // Jordan
  "422": { population: 5, defense: 3, economy: 20, technology: 5 },          // Lebanon
  "414": { population: 4, defense: 5, economy: 140, technology: 7 },         // Kuwait
  "512": { population: 5, defense: 4, economy: 80, technology: 6 },          // Oman
  "634": { population: 3, defense: 4, economy: 180, technology: 7 },         // Qatar
  "048": { population: 1, defense: 3, economy: 40, technology: 6 },          // Bahrain
  "887": { population: 33, defense: 3, economy: 25, technology: 2 },         // Yemen
  "275": { population: 5, defense: 2, economy: 18, technology: 4 },          // Palestine

  // South Asia
  "356": { population: 1400, defense: 7, economy: 3500, technology: 7 },     // India
  "586": { population: 230, defense: 6, economy: 350, technology: 5 },       // Pakistan
  "050": { population: 170, defense: 3, economy: 420, technology: 4 },       // Bangladesh
  "144": { population: 22, defense: 3, economy: 85, technology: 5 },         // Sri Lanka
  "524": { population: 30, defense: 2, economy: 36, technology: 3 },         // Nepal
  "064": { population: 0.8, defense: 1, economy: 3, technology: 3 },         // Bhutan
  "462": { population: 0.5, defense: 1, economy: 5, technology: 5 },         // Maldives
  "004": { population: 40, defense: 3, economy: 15, technology: 2 },         // Afghanistan

  // East Asia
  "156": { population: 1400, defense: 9, economy: 18000, technology: 9 },    // China
  "392": { population: 125, defense: 7, economy: 4200, technology: 10 },     // Japan
  "410": { population: 52, defense: 7, economy: 1700, technology: 9 },       // South Korea
  "408": { population: 26, defense: 7, economy: 30, technology: 4 },         // North Korea
  "158": { population: 24, defense: 6, economy: 790, technology: 9 },        // Taiwan
  "496": { population: 3, defense: 2, economy: 15, technology: 4 },          // Mongolia
  "344": { population: 7, defense: 3, economy: 370, technology: 9 },         // Hong Kong
  "446": { population: 0.7, defense: 1, economy: 30, technology: 7 },        // Macau

  // Southeast Asia
  "360": { population: 275, defense: 5, economy: 1300, technology: 5 },      // Indonesia
  "608": { population: 114, defense: 4, economy: 400, technology: 5 },       // Philippines
  "704": { population: 100, defense: 5, economy: 410, technology: 5 },       // Vietnam
  "764": { population: 72, defense: 5, economy: 500, technology: 6 },        // Thailand
  "104": { population: 55, defense: 4, economy: 60, technology: 3 },         // Myanmar
  "458": { population: 33, defense: 4, economy: 400, technology: 7 },        // Malaysia
  "702": { population: 6, defense: 5, economy: 400, technology: 10 },        // Singapore
  "116": { population: 17, defense: 2, economy: 30, technology: 3 },         // Cambodia
  "418": { population: 7, defense: 2, economy: 19, technology: 3 },          // Laos
  "096": { population: 0.4, defense: 2, economy: 14, technology: 5 },        // Brunei
  "626": { population: 1, defense: 1, economy: 2, technology: 3 },           // Timor-Leste

  // Oceania
  "036": { population: 26, defense: 6, economy: 1700, technology: 9 },       // Australia
  "554": { population: 5, defense: 4, economy: 250, technology: 9 },         // New Zealand
  "598": { population: 10, defense: 2, economy: 30, technology: 3 },         // Papua New Guinea
  "242": { population: 0.9, defense: 1, economy: 5, technology: 3 },         // Fiji
  "090": { population: 0.7, defense: 1, economy: 1.5, technology: 2 },       // Solomon Islands
  "548": { population: 0.3, defense: 1, economy: 0.9, technology: 2 },       // Vanuatu
  "882": { population: 0.2, defense: 1, economy: 0.8, technology: 3 },       // Samoa
  "776": { population: 0.1, defense: 1, economy: 0.5, technology: 3 },       // Tonga
  "583": { population: 0.1, defense: 1, economy: 0.4, technology: 3 },       // Micronesia
  "584": { population: 0.06, defense: 1, economy: 0.3, technology: 3 },      // Marshall Islands
  "585": { population: 0.02, defense: 1, economy: 0.3, technology: 3 },      // Palau
  "296": { population: 0.12, defense: 1, economy: 0.2, technology: 2 },      // Kiribati
  "520": { population: 0.01, defense: 1, economy: 0.1, technology: 2 },      // Nauru
  "570": { population: 0.002, defense: 1, economy: 0.01, technology: 3 },    // Niue
  "184": { population: 0.02, defense: 1, economy: 0.3, technology: 4 },      // Cook Islands
  "540": { population: 0.3, defense: 1, economy: 10, technology: 5 },        // New Caledonia
  "258": { population: 0.3, defense: 1, economy: 6, technology: 5 },         // French Polynesia
  "574": { population: 0.002, defense: 1, economy: 0.01, technology: 3 },    // Norfolk Island
  "876": { population: 0.01, defense: 1, economy: 0.2, technology: 3 },      // Wallis and Futuna
  "612": { population: 0.05, defense: 1, economy: 0.01, technology: 2 },     // Pitcairn Islands

  // North Africa
  "818": { population: 104, defense: 6, economy: 400, technology: 5 },       // Egypt
  "012": { population: 45, defense: 5, economy: 190, technology: 4 },        // Algeria
  "504": { population: 37, defense: 5, economy: 130, technology: 5 },        // Morocco
  "788": { population: 12, defense: 3, economy: 45, technology: 5 },         // Tunisia
  "434": { population: 7, defense: 3, economy: 45, technology: 3 },          // Libya
  "729": { population: 46, defense: 3, economy: 30, technology: 2 },         // Sudan
  "728": { population: 11, defense: 2, economy: 12, technology: 1 },         // South Sudan
  "732": { population: 0.6, defense: 2, economy: 1, technology: 2 },         // Western Sahara

  // West Africa
  "566": { population: 220, defense: 4, economy: 440, technology: 4 },       // Nigeria
  "288": { population: 33, defense: 3, economy: 70, technology: 4 },         // Ghana
  "384": { population: 28, defense: 3, economy: 70, technology: 3 },         // Cote d'Ivoire
  "686": { population: 17, defense: 2, economy: 28, technology: 3 },         // Senegal
  "466": { population: 22, defense: 2, economy: 18, technology: 2 },         // Mali
  "854": { population: 22, defense: 2, economy: 18, technology: 2 },         // Burkina Faso
  "562": { population: 25, defense: 2, economy: 14, technology: 2 },         // Niger
  "324": { population: 13, defense: 2, economy: 16, technology: 2 },         // Guinea
  "204": { population: 13, defense: 2, economy: 17, technology: 3 },         // Benin
  "768": { population: 8, defense: 2, economy: 8, technology: 2 },           // Togo
  "694": { population: 8, defense: 2, economy: 4, technology: 2 },           // Sierra Leone
  "430": { population: 5, defense: 1, economy: 4, technology: 2 },           // Liberia
  "478": { population: 5, defense: 2, economy: 8, technology: 2 },           // Mauritania
  "270": { population: 2, defense: 1, economy: 2, technology: 2 },           // Gambia
  "624": { population: 2, defense: 1, economy: 1.5, technology: 2 },         // Guinea-Bissau
  "132": { population: 0.6, defense: 1, economy: 2, technology: 4 },         // Cape Verde

  // Central Africa
  "180": { population: 100, defense: 3, economy: 55, technology: 2 },        // Dem. Rep. Congo
  "120": { population: 28, defense: 3, economy: 45, technology: 3 },         // Cameroon
  "148": { population: 17, defense: 2, economy: 12, technology: 1 },         // Chad
  "140": { population: 5, defense: 1, economy: 2, technology: 1 },           // Central African Rep.
  "178": { population: 6, defense: 2, economy: 12, technology: 2 },          // Congo
  "266": { population: 2, defense: 2, economy: 20, technology: 3 },          // Gabon
  "226": { population: 1, defense: 2, economy: 12, technology: 3 },          // Equatorial Guinea

  // East Africa
  "231": { population: 120, defense: 4, economy: 110, technology: 3 },       // Ethiopia
  "404": { population: 55, defense: 4, economy: 110, technology: 4 },        // Kenya
  "834": { population: 63, defense: 3, economy: 75, technology: 3 },         // Tanzania
  "800": { population: 48, defense: 3, economy: 45, technology: 3 },         // Uganda
  "646": { population: 13, defense: 3, economy: 12, technology: 3 },         // Rwanda
  "108": { population: 13, defense: 2, economy: 3, technology: 2 },          // Burundi
  "706": { population: 17, defense: 2, economy: 7, technology: 1 },          // Somalia
  "232": { population: 4, defense: 3, economy: 2, technology: 2 },           // Eritrea
  "262": { population: 1, defense: 2, economy: 3, technology: 3 },           // Djibouti
  "174": { population: 0.9, defense: 1, economy: 1, technology: 2 },         // Comoros
  "690": { population: 0.1, defense: 1, economy: 2, technology: 4 },         // Seychelles

  // Southern Africa
  "710": { population: 60, defense: 5, economy: 400, technology: 6 },        // South Africa
  "508": { population: 33, defense: 2, economy: 16, technology: 2 },         // Mozambique
  "450": { population: 29, defense: 2, economy: 14, technology: 2 },         // Madagascar
  "894": { population: 20, defense: 2, economy: 22, technology: 2 },         // Zambia
  "716": { population: 16, defense: 3, economy: 20, technology: 3 },         // Zimbabwe
  "454": { population: 20, defense: 2, economy: 12, technology: 2 },         // Malawi
  "024": { population: 35, defense: 3, economy: 70, technology: 3 },         // Angola
  "516": { population: 3, defense: 2, economy: 12, technology: 3 },          // Namibia
  "072": { population: 2, defense: 3, economy: 18, technology: 4 },          // Botswana
  "426": { population: 2, defense: 1, economy: 2, technology: 2 },           // Lesotho
  "748": { population: 1, defense: 1, economy: 4, technology: 3 },           // Eswatini
  "480": { population: 1, defense: 2, economy: 12, technology: 5 },          // Mauritius
  "678": { population: 0.2, defense: 1, economy: 0.5, technology: 2 },       // Sao Tome and Principe

  // Caucasus
  "268": { population: 4, defense: 3, economy: 18, technology: 5 },          // Georgia
  "051": { population: 3, defense: 3, economy: 14, technology: 5 },          // Armenia
  "031": { population: 10, defense: 5, economy: 55, technology: 5 },         // Azerbaijan

  // Caribbean / Territories
  "531": { population: 0.15, defense: 1, economy: 3, technology: 5 },        // Curacao
  "533": { population: 0.1, defense: 1, economy: 3, technology: 5 },         // Aruba
  "534": { population: 0.04, defense: 1, economy: 1, technology: 5 },        // Sint Maarten
  "652": { population: 0.01, defense: 1, economy: 0.4, technology: 5 },      // Saint Barthelemy
  "654": { population: 0.006, defense: 1, economy: 0.04, technology: 3 },    // Saint Helena
  "663": { population: 0.04, defense: 1, economy: 0.6, technology: 5 },      // Saint Martin
  "666": { population: 0.006, defense: 1, economy: 0.3, technology: 4 },     // Saint Pierre and Miquelon

  // Other territories
  "086": { population: 0.003, defense: 2, economy: 0.01, technology: 3 },    // British Indian Ocean Terr.
  "239": { population: 0.03, defense: 1, economy: 0.01, technology: 2 },     // S. Georgia and S. Sandwich Is.
  "260": { population: 0.001, defense: 1, economy: 0.01, technology: 2 },    // French Southern Terr.
  "334": { population: 0.001, defense: 1, economy: 0.01, technology: 1 },    // Heard I. and McDonald Is.
};

// Default stats for any country not explicitly listed above
const DEFAULT_STATS = { population: 2, defense: 2, economy: 10, technology: 3 };

/**
 * Grand-strategy-style nation colors (inspired by EU4/HOI4/Victoria).
 * Keyed by ISO 3166-1 numeric code.
 */
const NATION_COLORS: Record<string, string> = {
  // ── Major Powers (very distinctive, EU4-style) ──
  "840": "#36619e", // USA – navy blue
  "826": "#b83230", // UK – imperial red
  "250": "#2a7fbf", // France – royal blue
  "276": "#6b6d6e", // Germany – iron gray
  "643": "#208b3a", // Russia – deep green
  "156": "#c6a834", // China – Ming gold
  "392": "#7b3f9e", // Japan – imperial purple
  "356": "#d48425", // India – saffron
  "076": "#1c7a3b", // Brazil – verde
  "380": "#3da577", // Italy – jade green
  // ── Europe ──
  "724": "#d4a017", // Spain – Castile gold
  "620": "#2d6a4f", // Portugal – maritime green
  "528": "#d97706", // Netherlands – House of Orange
  "056": "#6d5c4f", // Belgium – dark taupe
  "756": "#d63031", // Switzerland – red cross
  "040": "#d5d5d5", // Austria – Habsburg white
  "616": "#c92a2a", // Poland – crimson
  "804": "#3b82c4", // Ukraine – cerulean
  "752": "#3c7bb3", // Sweden – Swedish blue
  "578": "#1e4b7a", // Norway – fjord blue
  "208": "#b83230", // Denmark – Scandinavian red
  "246": "#c8cfd6", // Finland – snow white
  "300": "#408abf", // Greece – Hellenic blue
  "642": "#d4a017", // Romania – gold
  "348": "#4c9e2d", // Hungary – lime green
  "203": "#4682b4", // Czechia – steel blue
  "705": "#5ba3c9", // Slovenia – alpine blue
  "191": "#cf3535", // Croatia – checkerboard red
  "688": "#8b5e3c", // Serbia – umber brown
  "100": "#5aad4b", // Bulgaria – forest green
  "008": "#b22222", // Albania – blood red
  "233": "#60a5c8", // Estonia – Baltic blue
  "428": "#7a2e2e", // Latvia – dark maroon
  "440": "#c8a62c", // Lithuania – amber gold
  "372": "#2ea04e", // Ireland – emerald
  "352": "#5b8db8", // Iceland – glacier blue
  "807": "#a83232", // N. Macedonia – red
  "499": "#5c6870", // Montenegro – slate
  "070": "#3f7fba", // Bosnia – blue
  "703": "#5074a0", // Slovakia – blue
  "112": "#a03030", // Belarus – red
  "498": "#507090", // Moldova – dusty blue
  // ── Middle East ──
  "792": "#5b8c5a", // Turkey – Ottoman olive
  "682": "#2d8a4e", // Saudi Arabia – green
  "364": "#4d7a9e", // Iran – Persian blue
  "368": "#8a5e3c", // Iraq – Mesopotamian brown
  "376": "#3a73ba", // Israel – blue
  "818": "#c8a82c", // Egypt – pharaoh gold
  "760": "#7a3e3e", // Syria – dark red
  "400": "#a85e32", // Jordan – Hashemite orange
  "422": "#b84040", // Lebanon – cedar red
  "784": "#3c4a5c", // UAE – dark teal
  "634": "#6a2e4a", // Qatar – tyrian purple
  "414": "#3e8a5a", // Kuwait – green
  "512": "#a84040", // Oman – red
  "887": "#8a5050", // Yemen – earthy red
  // ── East & SE Asia ──
  "410": "#4a8cc0", // South Korea – blue
  "408": "#c03030", // North Korea – red
  "158": "#3aa06a", // Taiwan – jade green
  "764": "#c04050", // Thailand – Siamese red
  "704": "#b03030", // Vietnam – red
  "360": "#a83030", // Indonesia – red
  "608": "#4878b0", // Philippines – blue
  "458": "#c49a20", // Malaysia – gold
  "702": "#c04040", // Singapore – red
  "104": "#c08820", // Myanmar – golden
  "116": "#5070a0", // Cambodia – blue
  "496": "#5890c0", // Mongolia – eternal blue sky
  "418": "#b04040", // Laos – red
  // ── Central & South Asia ──
  "586": "#2d7a4a", // Pakistan – green
  "050": "#2a6a3a", // Bangladesh – deep green
  "144": "#7a3838", // Sri Lanka – lion maroon
  "524": "#b83838", // Nepal – crimson
  "398": "#4a90c8", // Kazakhstan – blue
  "860": "#488ab0", // Uzbekistan – blue
  "762": "#a05050", // Tajikistan – red
  "795": "#3a7a58", // Turkmenistan – green
  "417": "#c04848", // Kyrgyzstan – red
  "004": "#5a7844", // Afghanistan – mujahedeen green
  // ── Africa ──
  "566": "#2a7a3e", // Nigeria – green
  "710": "#c88030", // South Africa – Springbok gold
  "404": "#5a3828", // Kenya – earth brown
  "231": "#2a8a40", // Ethiopia – green
  "012": "#2a7a40", // Algeria – green
  "504": "#b04040", // Morocco – red
  "834": "#4888b0", // Tanzania – blue
  "180": "#4878a0", // DR Congo – blue
  "800": "#c8a020", // Uganda – gold
  "288": "#c89820", // Ghana – gold
  "120": "#2a7a3a", // Cameroon – green
  "384": "#d08020", // Côte d'Ivoire – orange
  "686": "#308040", // Senegal – green
  "434": "#4a5a6a", // Libya – dark slate
  "729": "#a04040", // Sudan – red
  "728": "#607848", // South Sudan – olive
  "024": "#a03838", // Angola – red
  "508": "#c89830", // Mozambique – gold
  "450": "#8a6840", // Madagascar – sienna
  "466": "#c09030", // Mali – savanna gold
  "562": "#c0a040", // Niger – saharan gold
  "148": "#a88840", // Chad – desert gold
  "854": "#508848", // Burkina Faso – green
  "894": "#48784a", // Zambia – green
  "716": "#4a7840", // Zimbabwe – green
  "454": "#c04848", // Malawi – red
  "072": "#4890b0", // Botswana – blue
  // ── Americas ──
  "124": "#c03838", // Canada – maple red
  "484": "#3a7a48", // Mexico – green
  "032": "#6aaed6", // Argentina – sky blue
  "152": "#b04040", // Chile – red
  "170": "#c8a020", // Colombia – gold
  "604": "#b04040", // Peru – red
  "862": "#c8a828", // Venezuela – gold
  "192": "#a03838", // Cuba – red
  "218": "#c8a830", // Ecuador – gold
  "068": "#c88848", // Bolivia – earthy gold
  "600": "#b04848", // Paraguay – red
  "858": "#4a80b8", // Uruguay – blue
  "328": "#389048", // Guyana – green
  "214": "#4a68a8", // Dominican Rep. – blue
  "332": "#4a5890", // Haiti – blue
  "591": "#4880a0", // Panama – blue
  // ── Oceania ──
  "036": "#c89030", // Australia – ochre gold
  "554": "#3a5060", // New Zealand – dark teal
  "598": "#6a4030", // Papua New Guinea – earth brown
};

function countryColor(isoCode: string): string {
  if (NATION_COLORS[isoCode]) return NATION_COLORS[isoCode];
  // Fallback: golden angle for unlisted countries
  const num = parseInt(isoCode, 10) || 0;
  const hue = (num * 137.508) % 360;
  return `hsl(${Math.round(hue)}, 35%, 28%)`;
}

export async function loadWorldData(): Promise<Province[]> {
  try {
    const response = await fetch("/world-50m.json");
    if (!response.ok) throw new Error("Failed to load map data");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topology: any = await response.json();

    const countriesObject = topology.objects.countries;

    // Compute neighbor adjacency from the topology
    const neighborIndices = topojson.neighbors(countriesObject.geometries);

    // Convert topology to GeoJSON FeatureCollection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geojson = topojson.feature(topology, countriesObject) as any;

    // Build a mapping from geometry index to normalized ISO id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geometryIdByIndex: string[] = countriesObject.geometries.map((g: any, _i: number) => {
      return g.id ? String(g.id).padStart(3, "0") : "";
    });

    // Filter out Antarctica (010) and features without a valid id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validFeatures: { feature: any; geomIndex: number }[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geojson.features.forEach((feature: any, index: number) => {
      const rawId = feature.id != null ? String(feature.id).padStart(3, "0") : "";
      if (!rawId || rawId === "010") return; // skip Antarctica and null-id features
      validFeatures.push({ feature, geomIndex: index });
    });

    // Deduplicate features by id (world-50m has duplicate "036" for Australia)
    const seenIds = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dedupedFeatures: { feature: any; geomIndex: number }[] = [];
    for (const entry of validFeatures) {
      const id = String(entry.feature.id).padStart(3, "0");
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      dedupedFeatures.push(entry);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provinces: Province[] = dedupedFeatures.map(({ feature, geomIndex }: { feature: any; geomIndex: number }) => {
      const id = String(feature.id).padStart(3, "0");
      const name = COUNTRY_NAMES[id] || `Region ${id}`;
      const color = countryColor(id);

      // Compute centroid using d3-geo
      let center: [number, number] = [0, 0];
      try {
        const centroid = geoCentroid(feature);
        if (centroid && isFinite(centroid[0]) && isFinite(centroid[1])) {
          center = centroid as [number, number];
        }
      } catch {
        // Some degenerate geometries may fail; keep [0,0]
      }

      // Resolve neighbor ids from the precomputed neighbor indices
      const neighborIds: string[] = [];
      const rawNeighborIndices = neighborIndices[geomIndex] || [];
      for (const ni of rawNeighborIndices) {
        const nId = geometryIdByIndex[ni];
        if (nId && nId !== "010" && seenIds.has(nId)) {
          neighborIds.push(nId);
        }
      }
      // Deduplicate neighbor ids
      const uniqueNeighborIds = [...new Set(neighborIds)];

      // Look up real stats or fall back to defaults
      const stats = COUNTRY_DATA[id] || DEFAULT_STATS;

      return {
        id,
        name,
        ownerId: null,
        color,
        feature,
        center,
        neighbors: uniqueNeighborIds,
        resources: {
          population: stats.population,
          defense: stats.defense,
          economy: stats.economy,
          technology: stats.technology,
        },
      };
    });

    return provinces;
  } catch (error) {
    console.error("Map loading error:", error);
    return [];
  }
}
