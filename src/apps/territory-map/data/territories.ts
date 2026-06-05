import type { Territory, TerritoryMapId } from '@/apps/territory-map/types'

export type TerritoryOption = Pick<Territory, 'id' | 'name' | 'isoCode'>

export const mapViewBoxes: Record<TerritoryMapId, string> = {
  world: '0 0 960 520',
  germany: '0 0 520 447',
}

export const territoryOptionsByMap: Record<TerritoryMapId, TerritoryOption[]> = {
  "world": [
    {
      "id": "eg",
      "name": "Ägypten",
      "isoCode": "EG"
    },
    {
      "id": "gq",
      "name": "Äquatorialguinea",
      "isoCode": "GQ"
    },
    {
      "id": "et",
      "name": "Äthiopien",
      "isoCode": "ET"
    },
    {
      "id": "af",
      "name": "Afghanistan",
      "isoCode": "AF"
    },
    {
      "id": "al",
      "name": "Albanien",
      "isoCode": "AL"
    },
    {
      "id": "dz",
      "name": "Algerien",
      "isoCode": "DZ"
    },
    {
      "id": "as",
      "name": "Amerikanisch-Samoa",
      "isoCode": "AS"
    },
    {
      "id": "vi",
      "name": "Amerikanische Jungferninseln",
      "isoCode": "VI"
    },
    {
      "id": "ad",
      "name": "Andorra",
      "isoCode": "AD"
    },
    {
      "id": "ao",
      "name": "Angola",
      "isoCode": "AO"
    },
    {
      "id": "ai",
      "name": "Anguilla",
      "isoCode": "AI"
    },
    {
      "id": "ag",
      "name": "Antigua und Barbuda",
      "isoCode": "AG"
    },
    {
      "id": "ar",
      "name": "Argentinien",
      "isoCode": "AR"
    },
    {
      "id": "am",
      "name": "Armenien",
      "isoCode": "AM"
    },
    {
      "id": "aw",
      "name": "Aruba",
      "isoCode": "AW"
    },
    {
      "id": "az",
      "name": "Aserbaidschan",
      "isoCode": "AZ"
    },
    {
      "id": "atc",
      "name": "Ashmore- und Cartierinseln",
      "isoCode": "ATC"
    },
    {
      "id": "au",
      "name": "Australien",
      "isoCode": "AU"
    },
    {
      "id": "ioa",
      "name": "Australische Territorien im Indischen Ozean",
      "isoCode": "IOA"
    },
    {
      "id": "bs",
      "name": "Bahamas",
      "isoCode": "BS"
    },
    {
      "id": "bh",
      "name": "Bahrain",
      "isoCode": "BH"
    },
    {
      "id": "bd",
      "name": "Bangladesch",
      "isoCode": "BD"
    },
    {
      "id": "bb",
      "name": "Barbados",
      "isoCode": "BB"
    },
    {
      "id": "by",
      "name": "Belarus",
      "isoCode": "BY"
    },
    {
      "id": "be",
      "name": "Belgien",
      "isoCode": "BE"
    },
    {
      "id": "bz",
      "name": "Belize",
      "isoCode": "BZ"
    },
    {
      "id": "bj",
      "name": "Benin",
      "isoCode": "BJ"
    },
    {
      "id": "bm",
      "name": "Bermuda",
      "isoCode": "BM"
    },
    {
      "id": "bt",
      "name": "Bhutan",
      "isoCode": "BT"
    },
    {
      "id": "bo",
      "name": "Bolivien",
      "isoCode": "BO"
    },
    {
      "id": "ba",
      "name": "Bosnien und Herzegowina",
      "isoCode": "BA"
    },
    {
      "id": "bw",
      "name": "Botswana",
      "isoCode": "BW"
    },
    {
      "id": "br",
      "name": "Brasilien",
      "isoCode": "BR"
    },
    {
      "id": "vg",
      "name": "Britische Jungferninseln",
      "isoCode": "VG"
    },
    {
      "id": "io",
      "name": "Britisches Territorium im Indischen Ozean",
      "isoCode": "IO"
    },
    {
      "id": "bn",
      "name": "Brunei",
      "isoCode": "BN"
    },
    {
      "id": "bg",
      "name": "Bulgarien",
      "isoCode": "BG"
    },
    {
      "id": "bf",
      "name": "Burkina Faso",
      "isoCode": "BF"
    },
    {
      "id": "bi",
      "name": "Burundi",
      "isoCode": "BI"
    },
    {
      "id": "ky",
      "name": "Cayman Islands",
      "isoCode": "KY"
    },
    {
      "id": "cl",
      "name": "Chile",
      "isoCode": "CL"
    },
    {
      "id": "ck",
      "name": "Cookinseln",
      "isoCode": "CK"
    },
    {
      "id": "cr",
      "name": "Costa Rica",
      "isoCode": "CR"
    },
    {
      "id": "cw",
      "name": "Curaçao",
      "isoCode": "CW"
    },
    {
      "id": "dk",
      "name": "Dänemark",
      "isoCode": "DK"
    },
    {
      "id": "cd",
      "name": "Demokratische Republik Kongo",
      "isoCode": "CD"
    },
    {
      "id": "de",
      "name": "Deutschland",
      "isoCode": "DE"
    },
    {
      "id": "dm",
      "name": "Dominica",
      "isoCode": "DM"
    },
    {
      "id": "do",
      "name": "Dominikanische Republik",
      "isoCode": "DO"
    },
    {
      "id": "dj",
      "name": "Dschibuti",
      "isoCode": "DJ"
    },
    {
      "id": "ec",
      "name": "Ecuador",
      "isoCode": "EC"
    },
    {
      "id": "sv",
      "name": "El Salvador",
      "isoCode": "SV"
    },
    {
      "id": "ci",
      "name": "Elfenbeinküste",
      "isoCode": "CI"
    },
    {
      "id": "er",
      "name": "Eritrea",
      "isoCode": "ER"
    },
    {
      "id": "ee",
      "name": "Estland",
      "isoCode": "EE"
    },
    {
      "id": "sz",
      "name": "Eswatini",
      "isoCode": "SZ"
    },
    {
      "id": "fo",
      "name": "Färöer",
      "isoCode": "FO"
    },
    {
      "id": "fk",
      "name": "Falklandinseln",
      "isoCode": "FK"
    },
    {
      "id": "fj",
      "name": "Fidschi",
      "isoCode": "FJ"
    },
    {
      "id": "fi",
      "name": "Finnland",
      "isoCode": "FI"
    },
    {
      "id": "fm",
      "name": "Föderierte Staaten von Mikronesien",
      "isoCode": "FM"
    },
    {
      "id": "fra",
      "name": "Frankreich",
      "isoCode": "FRA"
    },
    {
      "id": "pf",
      "name": "Französisch-Polynesien",
      "isoCode": "PF"
    },
    {
      "id": "tf",
      "name": "Französische Süd- und Antarktisgebiete",
      "isoCode": "TF"
    },
    {
      "id": "ga",
      "name": "Gabun",
      "isoCode": "GA"
    },
    {
      "id": "gm",
      "name": "Gambia",
      "isoCode": "GM"
    },
    {
      "id": "ge",
      "name": "Georgien",
      "isoCode": "GE"
    },
    {
      "id": "gh",
      "name": "Ghana",
      "isoCode": "GH"
    },
    {
      "id": "gd",
      "name": "Grenada",
      "isoCode": "GD"
    },
    {
      "id": "gr",
      "name": "Griechenland",
      "isoCode": "GR"
    },
    {
      "id": "gl",
      "name": "Grönland",
      "isoCode": "GL"
    },
    {
      "id": "gu",
      "name": "Guam",
      "isoCode": "GU"
    },
    {
      "id": "gt",
      "name": "Guatemala",
      "isoCode": "GT"
    },
    {
      "id": "gg",
      "name": "Guernsey",
      "isoCode": "GG"
    },
    {
      "id": "gn",
      "name": "Guinea",
      "isoCode": "GN"
    },
    {
      "id": "gw",
      "name": "Guinea-Bissau",
      "isoCode": "GW"
    },
    {
      "id": "gy",
      "name": "Guyana",
      "isoCode": "GY"
    },
    {
      "id": "ht",
      "name": "Haiti",
      "isoCode": "HT"
    },
    {
      "id": "hm",
      "name": "Heard und McDonaldinseln",
      "isoCode": "HM"
    },
    {
      "id": "hn",
      "name": "Honduras",
      "isoCode": "HN"
    },
    {
      "id": "hk",
      "name": "Hongkong",
      "isoCode": "HK"
    },
    {
      "id": "in",
      "name": "Indien",
      "isoCode": "IN"
    },
    {
      "id": "id",
      "name": "Indonesien",
      "isoCode": "ID"
    },
    {
      "id": "iq",
      "name": "Irak",
      "isoCode": "IQ"
    },
    {
      "id": "ir",
      "name": "Iran",
      "isoCode": "IR"
    },
    {
      "id": "ie",
      "name": "Irland",
      "isoCode": "IE"
    },
    {
      "id": "is",
      "name": "Island",
      "isoCode": "IS"
    },
    {
      "id": "im",
      "name": "Isle of Man",
      "isoCode": "IM"
    },
    {
      "id": "il",
      "name": "Israel",
      "isoCode": "IL"
    },
    {
      "id": "it",
      "name": "Italien",
      "isoCode": "IT"
    },
    {
      "id": "jm",
      "name": "Jamaika",
      "isoCode": "JM"
    },
    {
      "id": "jp",
      "name": "Japan",
      "isoCode": "JP"
    },
    {
      "id": "ye",
      "name": "Jemen",
      "isoCode": "YE"
    },
    {
      "id": "je",
      "name": "Jersey",
      "isoCode": "JE"
    },
    {
      "id": "jo",
      "name": "Jordanien",
      "isoCode": "JO"
    },
    {
      "id": "kh",
      "name": "Kambodscha",
      "isoCode": "KH"
    },
    {
      "id": "cm",
      "name": "Kamerun",
      "isoCode": "CM"
    },
    {
      "id": "ca",
      "name": "Kanada",
      "isoCode": "CA"
    },
    {
      "id": "cv",
      "name": "Kap Verde",
      "isoCode": "CV"
    },
    {
      "id": "kz",
      "name": "Kasachstan",
      "isoCode": "KZ"
    },
    {
      "id": "qa",
      "name": "Katar",
      "isoCode": "QA"
    },
    {
      "id": "ke",
      "name": "Kenia",
      "isoCode": "KE"
    },
    {
      "id": "kg",
      "name": "Kirgisistan",
      "isoCode": "KG"
    },
    {
      "id": "ki",
      "name": "Kiribati",
      "isoCode": "KI"
    },
    {
      "id": "co",
      "name": "Kolumbien",
      "isoCode": "CO"
    },
    {
      "id": "km",
      "name": "Komoren",
      "isoCode": "KM"
    },
    {
      "id": "kos",
      "name": "Kosovo",
      "isoCode": "KOS"
    },
    {
      "id": "hr",
      "name": "Kroatien",
      "isoCode": "HR"
    },
    {
      "id": "cu",
      "name": "Kuba",
      "isoCode": "CU"
    },
    {
      "id": "kw",
      "name": "Kuwait",
      "isoCode": "KW"
    },
    {
      "id": "ax",
      "name": "Åland",
      "isoCode": "AX"
    },
    {
      "id": "la",
      "name": "Laos",
      "isoCode": "LA"
    },
    {
      "id": "ls",
      "name": "Lesotho",
      "isoCode": "LS"
    },
    {
      "id": "lv",
      "name": "Lettland",
      "isoCode": "LV"
    },
    {
      "id": "lb",
      "name": "Libanon",
      "isoCode": "LB"
    },
    {
      "id": "lr",
      "name": "Liberia",
      "isoCode": "LR"
    },
    {
      "id": "ly",
      "name": "Libyen",
      "isoCode": "LY"
    },
    {
      "id": "li",
      "name": "Liechtenstein",
      "isoCode": "LI"
    },
    {
      "id": "lt",
      "name": "Litauen",
      "isoCode": "LT"
    },
    {
      "id": "lu",
      "name": "Luxemburg",
      "isoCode": "LU"
    },
    {
      "id": "mo",
      "name": "Macau",
      "isoCode": "MO"
    },
    {
      "id": "mg",
      "name": "Madagaskar",
      "isoCode": "MG"
    },
    {
      "id": "mw",
      "name": "Malawi",
      "isoCode": "MW"
    },
    {
      "id": "my",
      "name": "Malaysia",
      "isoCode": "MY"
    },
    {
      "id": "mv",
      "name": "Malediven",
      "isoCode": "MV"
    },
    {
      "id": "ml",
      "name": "Mali",
      "isoCode": "ML"
    },
    {
      "id": "mt",
      "name": "Malta",
      "isoCode": "MT"
    },
    {
      "id": "ma",
      "name": "Marokko",
      "isoCode": "MA"
    },
    {
      "id": "mh",
      "name": "Marshallinseln",
      "isoCode": "MH"
    },
    {
      "id": "mr",
      "name": "Mauretanien",
      "isoCode": "MR"
    },
    {
      "id": "mu",
      "name": "Mauritius",
      "isoCode": "MU"
    },
    {
      "id": "mx",
      "name": "Mexiko",
      "isoCode": "MX"
    },
    {
      "id": "mc",
      "name": "Monaco",
      "isoCode": "MC"
    },
    {
      "id": "mn",
      "name": "Mongolei",
      "isoCode": "MN"
    },
    {
      "id": "me",
      "name": "Montenegro",
      "isoCode": "ME"
    },
    {
      "id": "ms",
      "name": "Montserrat",
      "isoCode": "MS"
    },
    {
      "id": "mz",
      "name": "Mosambik",
      "isoCode": "MZ"
    },
    {
      "id": "mm",
      "name": "Myanmar",
      "isoCode": "MM"
    },
    {
      "id": "na",
      "name": "Namibia",
      "isoCode": "NA"
    },
    {
      "id": "nr",
      "name": "Nauru",
      "isoCode": "NR"
    },
    {
      "id": "np",
      "name": "Nepal",
      "isoCode": "NP"
    },
    {
      "id": "nc",
      "name": "Neukaledonien",
      "isoCode": "NC"
    },
    {
      "id": "nz",
      "name": "Neuseeland",
      "isoCode": "NZ"
    },
    {
      "id": "ni",
      "name": "Nicaragua",
      "isoCode": "NI"
    },
    {
      "id": "nl",
      "name": "Niederlande",
      "isoCode": "NL"
    },
    {
      "id": "ne",
      "name": "Niger",
      "isoCode": "NE"
    },
    {
      "id": "ng",
      "name": "Nigeria",
      "isoCode": "NG"
    },
    {
      "id": "nu",
      "name": "Niue",
      "isoCode": "NU"
    },
    {
      "id": "mp",
      "name": "Nördliche Marianen",
      "isoCode": "MP"
    },
    {
      "id": "kp",
      "name": "Nordkorea",
      "isoCode": "KP"
    },
    {
      "id": "mk",
      "name": "Nordmazedonien",
      "isoCode": "MK"
    },
    {
      "id": "nf",
      "name": "Norfolkinsel",
      "isoCode": "NF"
    },
    {
      "id": "nor",
      "name": "Norwegen",
      "isoCode": "NOR"
    },
    {
      "id": "at",
      "name": "Österreich",
      "isoCode": "AT"
    },
    {
      "id": "om",
      "name": "Oman",
      "isoCode": "OM"
    },
    {
      "id": "tl",
      "name": "Osttimor",
      "isoCode": "TL"
    },
    {
      "id": "pk",
      "name": "Pakistan",
      "isoCode": "PK"
    },
    {
      "id": "ps",
      "name": "Palästina",
      "isoCode": "PS"
    },
    {
      "id": "pw",
      "name": "Palau",
      "isoCode": "PW"
    },
    {
      "id": "pa",
      "name": "Panama",
      "isoCode": "PA"
    },
    {
      "id": "pg",
      "name": "Papua-Neuguinea",
      "isoCode": "PG"
    },
    {
      "id": "py",
      "name": "Paraguay",
      "isoCode": "PY"
    },
    {
      "id": "pe",
      "name": "Peru",
      "isoCode": "PE"
    },
    {
      "id": "ph",
      "name": "Philippinen",
      "isoCode": "PH"
    },
    {
      "id": "pn",
      "name": "Pitcairninseln",
      "isoCode": "PN"
    },
    {
      "id": "pl",
      "name": "Polen",
      "isoCode": "PL"
    },
    {
      "id": "pt",
      "name": "Portugal",
      "isoCode": "PT"
    },
    {
      "id": "pr",
      "name": "Puerto Rico",
      "isoCode": "PR"
    },
    {
      "id": "cn-tw",
      "name": "Republik China",
      "isoCode": "CN-TW"
    },
    {
      "id": "cg",
      "name": "Republik Kongo",
      "isoCode": "CG"
    },
    {
      "id": "md",
      "name": "Republik Moldau",
      "isoCode": "MD"
    },
    {
      "id": "cy",
      "name": "Republik Zypern",
      "isoCode": "CY"
    },
    {
      "id": "rw",
      "name": "Ruanda",
      "isoCode": "RW"
    },
    {
      "id": "ro",
      "name": "Rumänien",
      "isoCode": "RO"
    },
    {
      "id": "ru",
      "name": "Russland",
      "isoCode": "RU"
    },
    {
      "id": "bl",
      "name": "Saint-Barthélemy",
      "isoCode": "BL"
    },
    {
      "id": "mf",
      "name": "Saint-Martin",
      "isoCode": "MF"
    },
    {
      "id": "pm",
      "name": "Saint-Pierre und Miquelon",
      "isoCode": "PM"
    },
    {
      "id": "sb",
      "name": "Salomonen",
      "isoCode": "SB"
    },
    {
      "id": "zm",
      "name": "Sambia",
      "isoCode": "ZM"
    },
    {
      "id": "ws",
      "name": "Samoa",
      "isoCode": "WS"
    },
    {
      "id": "sm",
      "name": "San Marino",
      "isoCode": "SM"
    },
    {
      "id": "st",
      "name": "São Tomé und Príncipe",
      "isoCode": "ST"
    },
    {
      "id": "sa",
      "name": "Saudi-Arabien",
      "isoCode": "SA"
    },
    {
      "id": "se",
      "name": "Schweden",
      "isoCode": "SE"
    },
    {
      "id": "ch",
      "name": "Schweiz",
      "isoCode": "CH"
    },
    {
      "id": "sn",
      "name": "Senegal",
      "isoCode": "SN"
    },
    {
      "id": "rs",
      "name": "Serbien",
      "isoCode": "RS"
    },
    {
      "id": "sc",
      "name": "Seychellen",
      "isoCode": "SC"
    },
    {
      "id": "kas",
      "name": "Siachen-Gletscher",
      "isoCode": "KAS"
    },
    {
      "id": "sl",
      "name": "Sierra Leone",
      "isoCode": "SL"
    },
    {
      "id": "zw",
      "name": "Simbabwe",
      "isoCode": "ZW"
    },
    {
      "id": "sg",
      "name": "Singapur",
      "isoCode": "SG"
    },
    {
      "id": "sx",
      "name": "Sint Maarten",
      "isoCode": "SX"
    },
    {
      "id": "sk",
      "name": "Slowakei",
      "isoCode": "SK"
    },
    {
      "id": "si",
      "name": "Slowenien",
      "isoCode": "SI"
    },
    {
      "id": "so",
      "name": "Somalia",
      "isoCode": "SO"
    },
    {
      "id": "sol",
      "name": "Somaliland",
      "isoCode": "SOL"
    },
    {
      "id": "es",
      "name": "Spanien",
      "isoCode": "ES"
    },
    {
      "id": "lk",
      "name": "Sri Lanka",
      "isoCode": "LK"
    },
    {
      "id": "sh",
      "name": "St. Helena",
      "isoCode": "SH"
    },
    {
      "id": "kn",
      "name": "St. Kitts und Nevis",
      "isoCode": "KN"
    },
    {
      "id": "lc",
      "name": "St. Lucia",
      "isoCode": "LC"
    },
    {
      "id": "vc",
      "name": "St. Vincent und die Grenadinen",
      "isoCode": "VC"
    },
    {
      "id": "sd",
      "name": "Sudan",
      "isoCode": "SD"
    },
    {
      "id": "za",
      "name": "Südafrika",
      "isoCode": "ZA"
    },
    {
      "id": "gs",
      "name": "Südgeorgien und die Südlichen Sandwichinseln",
      "isoCode": "GS"
    },
    {
      "id": "kr",
      "name": "Südkorea",
      "isoCode": "KR"
    },
    {
      "id": "ss",
      "name": "Südsudan",
      "isoCode": "SS"
    },
    {
      "id": "sr",
      "name": "Suriname",
      "isoCode": "SR"
    },
    {
      "id": "sy",
      "name": "Syrien",
      "isoCode": "SY"
    },
    {
      "id": "tj",
      "name": "Tadschikistan",
      "isoCode": "TJ"
    },
    {
      "id": "tz",
      "name": "Tansania",
      "isoCode": "TZ"
    },
    {
      "id": "th",
      "name": "Thailand",
      "isoCode": "TH"
    },
    {
      "id": "tg",
      "name": "Togo",
      "isoCode": "TG"
    },
    {
      "id": "to",
      "name": "Tonga",
      "isoCode": "TO"
    },
    {
      "id": "tt",
      "name": "Trinidad und Tobago",
      "isoCode": "TT"
    },
    {
      "id": "td",
      "name": "Tschad",
      "isoCode": "TD"
    },
    {
      "id": "cz",
      "name": "Tschechien",
      "isoCode": "CZ"
    },
    {
      "id": "tr",
      "name": "Türkei",
      "isoCode": "TR"
    },
    {
      "id": "cyn",
      "name": "Türkische Republik Nordzypern",
      "isoCode": "CYN"
    },
    {
      "id": "tn",
      "name": "Tunesien",
      "isoCode": "TN"
    },
    {
      "id": "tm",
      "name": "Turkmenistan",
      "isoCode": "TM"
    },
    {
      "id": "tc",
      "name": "Turks- und Caicosinseln",
      "isoCode": "TC"
    },
    {
      "id": "tv",
      "name": "Tuvalu",
      "isoCode": "TV"
    },
    {
      "id": "ug",
      "name": "Uganda",
      "isoCode": "UG"
    },
    {
      "id": "ua",
      "name": "Ukraine",
      "isoCode": "UA"
    },
    {
      "id": "hu",
      "name": "Ungarn",
      "isoCode": "HU"
    },
    {
      "id": "uy",
      "name": "Uruguay",
      "isoCode": "UY"
    },
    {
      "id": "uz",
      "name": "Usbekistan",
      "isoCode": "UZ"
    },
    {
      "id": "vu",
      "name": "Vanuatu",
      "isoCode": "VU"
    },
    {
      "id": "va",
      "name": "Vatikanstadt",
      "isoCode": "VA"
    },
    {
      "id": "ve",
      "name": "Venezuela",
      "isoCode": "VE"
    },
    {
      "id": "ae",
      "name": "Vereinigte Arabische Emirate",
      "isoCode": "AE"
    },
    {
      "id": "us",
      "name": "Vereinigte Staaten",
      "isoCode": "US"
    },
    {
      "id": "gb",
      "name": "Vereinigtes Königreich",
      "isoCode": "GB"
    },
    {
      "id": "vn",
      "name": "Vietnam",
      "isoCode": "VN"
    },
    {
      "id": "cn",
      "name": "Volksrepublik China",
      "isoCode": "CN"
    },
    {
      "id": "wf",
      "name": "Wallis und Futuna",
      "isoCode": "WF"
    },
    {
      "id": "eh",
      "name": "Westsahara",
      "isoCode": "EH"
    },
    {
      "id": "cf",
      "name": "Zentralafrikanische Republik",
      "isoCode": "CF"
    }
  ],
  "germany": [
    {
      "id": "DE-BW",
      "name": "Baden-Württemberg"
    },
    {
      "id": "DE-BY",
      "name": "Bayern"
    },
    {
      "id": "DE-BE",
      "name": "Berlin"
    },
    {
      "id": "DE-BB",
      "name": "Brandenburg"
    },
    {
      "id": "DE-HB",
      "name": "Bremen"
    },
    {
      "id": "DE-HH",
      "name": "Hamburg"
    },
    {
      "id": "DE-HE",
      "name": "Hessen"
    },
    {
      "id": "DE-MV",
      "name": "Mecklenburg-Vorpommern"
    },
    {
      "id": "DE-NI",
      "name": "Niedersachsen"
    },
    {
      "id": "DE-NW",
      "name": "Nordrhein-Westfalen"
    },
    {
      "id": "DE-RP",
      "name": "Rheinland-Pfalz"
    },
    {
      "id": "DE-SL",
      "name": "Saarland"
    },
    {
      "id": "DE-SN",
      "name": "Sachsen"
    },
    {
      "id": "DE-ST",
      "name": "Sachsen-Anhalt"
    },
    {
      "id": "DE-SH",
      "name": "Schleswig-Holstein"
    },
    {
      "id": "DE-TH",
      "name": "Thüringen"
    }
  ]
}

const territoryLoaders: Record<TerritoryMapId, () => Promise<Territory[]>> = {
  world: () =>
    import('@/apps/territory-map/data/worldTerritories').then(
      ({ worldTerritories }) => worldTerritories,
    ),
  germany: () =>
    import('@/apps/territory-map/data/germanyTerritories').then(
      ({ germanyTerritories }) => germanyTerritories,
    ),
}

export function loadTerritories(mapId: TerritoryMapId) {
  return territoryLoaders[mapId]()
}
