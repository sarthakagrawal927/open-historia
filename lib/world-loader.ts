import * as topojson from "topojson-client";
import { Province } from "./types";

// ISO 3166-1 numeric code mapping for all countries
const COUNTRY_NAMES: Record<string, string> = {
  "004": "Afghanistan", "008": "Albania", "012": "Algeria", "024": "Angola",
  "031": "Azerbaijan", "032": "Argentina", "036": "Australia", "040": "Austria",
  "044": "Bahamas", "048": "Bahrain", "050": "Bangladesh", "051": "Armenia",
  "052": "Barbados", "056": "Belgium", "060": "Bermuda", "064": "Bhutan",
  "068": "Bolivia", "070": "Bosnia and Herz.", "072": "Botswana", "076": "Brazil",
  "084": "Belize", "090": "Solomon Islands", "096": "Brunei", "100": "Bulgaria",
  "104": "Myanmar", "108": "Burundi", "112": "Belarus", "116": "Cambodia",
  "120": "Cameroon", "124": "Canada", "132": "Cape Verde", "140": "Central African Rep.",
  "144": "Sri Lanka", "148": "Chad", "152": "Chile", "156": "China",
  "170": "Colombia", "174": "Comoros", "178": "Congo", "180": "Dem. Rep. Congo",
  "188": "Costa Rica", "191": "Croatia", "192": "Cuba", "196": "Cyprus",
  "203": "Czechia", "204": "Benin", "208": "Denmark", "212": "Dominica",
  "214": "Dominican Rep.", "218": "Ecuador", "222": "El Salvador", "226": "Equatorial Guinea",
  "231": "Ethiopia", "232": "Eritrea", "233": "Estonia", "242": "Fiji",
  "246": "Finland", "250": "France", "262": "Djibouti", "266": "Gabon",
  "268": "Georgia", "270": "Gambia", "276": "Germany", "288": "Ghana",
  "300": "Greece", "320": "Guatemala", "324": "Guinea", "328": "Guyana",
  "332": "Haiti", "340": "Honduras", "348": "Hungary", "352": "Iceland",
  "356": "India", "360": "Indonesia", "364": "Iran", "368": "Iraq",
  "372": "Ireland", "376": "Israel", "380": "Italy", "384": "Côte d'Ivoire",
  "388": "Jamaica", "392": "Japan", "398": "Kazakhstan", "400": "Jordan",
  "404": "Kenya", "408": "North Korea", "410": "South Korea", "414": "Kuwait",
  "417": "Kyrgyzstan", "418": "Laos", "422": "Lebanon", "426": "Lesotho",
  "428": "Latvia", "430": "Liberia", "434": "Libya", "440": "Lithuania",
  "442": "Luxembourg", "450": "Madagascar", "454": "Malawi", "458": "Malaysia",
  "462": "Maldives", "466": "Mali", "470": "Malta", "478": "Mauritania",
  "480": "Mauritius", "484": "Mexico", "496": "Mongolia", "498": "Moldova",
  "499": "Montenegro", "504": "Morocco", "508": "Mozambique", "512": "Oman",
  "516": "Namibia", "524": "Nepal", "528": "Netherlands", "548": "Vanuatu",
  "554": "New Zealand", "558": "Nicaragua", "562": "Niger", "566": "Nigeria",
  "578": "Norway", "586": "Pakistan", "591": "Panama", "598": "Papua New Guinea",
  "600": "Paraguay", "604": "Peru", "608": "Philippines", "616": "Poland",
  "620": "Portugal", "624": "Guinea-Bissau", "626": "Timor-Leste", "634": "Qatar",
  "642": "Romania", "643": "Russia", "646": "Rwanda", "682": "Saudi Arabia",
  "686": "Senegal", "688": "Serbia", "694": "Sierra Leone", "702": "Singapore",
  "703": "Slovakia", "704": "Vietnam", "705": "Slovenia", "706": "Somalia",
  "710": "South Africa", "716": "Zimbabwe", "724": "Spain", "728": "South Sudan",
  "729": "Sudan", "740": "Suriname", "748": "Eswatini", "752": "Sweden",
  "756": "Switzerland", "760": "Syria", "762": "Tajikistan", "764": "Thailand",
  "768": "Togo", "780": "Trinidad and Tobago", "784": "United Arab Emirates", "788": "Tunisia",
  "792": "Turkey", "795": "Turkmenistan", "800": "Uganda", "804": "Ukraine",
  "807": "North Macedonia", "818": "Egypt", "826": "United Kingdom", "834": "Tanzania",
  "840": "USA", "854": "Burkina Faso", "858": "Uruguay", "860": "Uzbekistan",
  "862": "Venezuela", "882": "Samoa", "887": "Yemen", "894": "Zambia"
};

export async function loadWorldData(): Promise<Province[]> {
  try {
    const response = await fetch("/world-110m.json");
    if (!response.ok) throw new Error("Failed to load map data");
    
    const topology = await response.json();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geojson = topojson.feature(topology, topology.objects.countries) as any;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provinces: Province[] = geojson.features
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((feature: any) => feature.id !== "010" && feature.id !== 10) 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((feature: any, index: number) => {
       const id = feature.id ? String(feature.id).padStart(3, '0') : String(index);
       const name = COUNTRY_NAMES[id] || `Region ${id}`;
       
       const hue = Math.floor(Math.random() * 360);
       const color = `hsl(${hue}, 60%, 50%)`; 
       
       return {
         id,
         name,
         ownerId: null, 
         color,
         feature, 
         center: [0, 0], 
         neighbors: [], 
         resources: {
           population: Math.floor(Math.random() * 100) + 10,
           defense: Math.floor(Math.random() * 10) + 1,
           economy: Math.floor(Math.random() * 100) + 10,
           technology: Math.floor(Math.random() * 10) + 1,
         }
       };
    });

    return provinces;
  } catch (error) {
    console.error("Map loading error:", error);
    return [];
  }
}