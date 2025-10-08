// src/data/products.js

/**
 * Product schema (per item in PRODUCTS):
 * {
 *   name: "Halfvolle melk",
 *   cat: "dairy",
 *   units: ["stuk"],                 // toegestane bestel-eenheden (zie UNITS)
 *   packs: ["1L","1.5L","2L"],       // veelvoorkomende inhoud/gewicht (weergeefopties)
 *   tags: ["zuivel","melk","koemelk"] // optioneel, voor betere zoekresultaten
 * }
 *
 * Richtlijnen:
 * - cat moet voorkomen in CATEGORIES[].id
 * - units gebruikt termen uit UNITS.allowed (zie hieronder)
 * - packs zijn vrij tekstueel ("500 g", "1L", "6 st"), gebruik waar zinvol
 */

export const CATEGORIES = [
  { id: "produce", label: "Groente & Fruit", icon: "🥦" },
  { id: "dairy", label: "Zuivel & Eieren", icon: "🥛" },
  { id: "bakery", label: "Brood & Ontbijt", icon: "🍞" },
  { id: "meat_fish_veg", label: "Vlees, Vis & Vega", icon: "🍗🐟" },
  { id: "drinks", label: "Dranken", icon: "🥤" },
  { id: "alcohol", label: "Alcohol", icon: "🍺🍷🍸" },
  { id: "pantry", label: "Kruiden & Houdbaar", icon: "🧂" },
  { id: "frozen", label: "Diepvries", icon: "🧊" },
  { id: "snacks", label: "Snacks & Snoep", icon: "🍫" },
  { id: "baby", label: "Baby & Peuters", icon: "🍼" },
  { id: "pets", label: "Dieren", icon: "🐾" },
  { id: "household", label: "Huishoudelijk", icon: "🧻" },
  { id: "care", label: "Verzorging", icon: "🧴" },
  { id: "other", label: "Overig", icon: "➕" },
];

/**
 * Alle ondersteunde supermarkt-eenheden en semantiek voor UI/validatie.
 * Gebruik deze labels exact in products.units.
 */
export const UNITS = {
  // tel-eenheden
  count: [
    "stuk",
    "stuks",
    "pak",
    "doos",
    "tray",
    "net",
    "bos",
    "bundel",
    "krop",
  ],
  // gewicht
  weight: ["g", "kg"],
  // volume
  volume: ["ml", "L"],
  // overig/vers
  loose: ["per kg", "per 100 g", "per 100 ml"],
  // promotie/bundel
  multi: [
    "2-pack",
    "3-pack",
    "4-pack",
    "6-pack",
    "8-pack",
    "10-pack",
    "12-pack",
    "24-pack",
  ],
};

// Helper (optioneel te gebruiken in je app)
export function allAllowedUnits() {
  return Array.from(new Set(Object.values(UNITS).flat()));
}

/* ====== Producten (basiscollectie, uitgebreid & netjes gecategoriseerd) ======
   ⚠️ Dit is een startset (±200) van veel-voorkomende items in AH(AH XL) assortiment.
   Voeg hier eigen favorieten/merken aan toe of laad later dynamisch bij.
*/

// Groente & Fruit
const PRODUCE = [
  {
    name: "Appel Elstar",
    cat: "produce",
    units: ["stuk", "per kg"],
    packs: ["1 kg", "6 st"],
    tags: ["fruit", "appel"],
  },
  {
    name: "Appels",
    cat: "produce",
    units: ["stuk", "per kg"],
    packs: ["1 kg", "6 st"],
  },
  {
    name: "Banaan",
    cat: "produce",
    units: ["stuk", "per kg"],
    packs: ["1 kg", "6 st"],
  },
  {
    name: "Sinaasappel",
    cat: "produce",
    units: ["stuk", "per kg"],
    packs: ["1 kg", "net 2 kg"],
  },
  {
    name: "Mandarijnen",
    cat: "produce",
    units: ["stuk", "per kg"],
    packs: ["net 1 kg", "net 2 kg"],
  },
  { name: "Citroen", cat: "produce", units: ["stuk"], packs: ["2 st", "4 st"] },
  { name: "Limoen", cat: "produce", units: ["stuk"], packs: ["2 st", "4 st"] },
  {
    name: "Druiven wit pitloos",
    cat: "produce",
    units: ["pak"],
    packs: ["500 g"],
  },
  {
    name: "Druiven blauw pitloos",
    cat: "produce",
    units: ["pak"],
    packs: ["500 g"],
  },
  {
    name: "Aardbeien",
    cat: "produce",
    units: ["doos"],
    packs: ["250 g", "400 g"],
  },
  {
    name: "Blauwe bessen",
    cat: "produce",
    units: ["doos"],
    packs: ["125 g", "300 g"],
  },
  { name: "Frambozen", cat: "produce", units: ["doos"], packs: ["125 g"] },
  { name: "Mango ready-to-eat", cat: "produce", units: ["stuk"] },
  {
    name: "Avocado ready-to-eat",
    cat: "produce",
    units: ["stuk", "2-pack", "3-pack"],
  },
  { name: "Ananas", cat: "produce", units: ["stuk"] },
  {
    name: "Watermeloen",
    cat: "produce",
    units: ["stuk", "stuk"],
    packs: ["heel", "part"],
  },
  {
    name: "Tomaat trostomaten",
    cat: "produce",
    units: ["pak", "per kg"],
    packs: ["500 g"],
  },
  {
    name: "Tomaat cherry",
    cat: "produce",
    units: ["doos"],
    packs: ["250 g", "500 g"],
  },
  { name: "Komkommer", cat: "produce", units: ["stuk"] },
  { name: "Paprika rood", cat: "produce", units: ["stuk", "3-pack"] },
  { name: "Paprika geel", cat: "produce", units: ["stuk"] },
  { name: "Paprika groen", cat: "produce", units: ["stuk"] },
  { name: "Paprika mix", cat: "produce", units: ["3-pack"] },
  { name: "Broccoli", cat: "produce", units: ["stuk", "per kg"] },
  { name: "Bloemkool", cat: "produce", units: ["stuk"] },
  {
    name: "Wortelen",
    cat: "produce",
    units: ["zak"],
    packs: ["1 kg", "500 g"],
  },
  { name: "Winterpeen", cat: "produce", units: ["zak"], packs: ["1 kg"] },
  { name: "Prei", cat: "produce", units: ["stuk", "bundel"], packs: ["2 st"] },
  {
    name: "Ui geel",
    cat: "produce",
    units: ["zak", "per kg"],
    packs: ["1 kg", "2 kg"],
  },
  { name: "Ui rood", cat: "produce", units: ["zak"], packs: ["1 kg"] },
  { name: "Knoflook", cat: "produce", units: ["bol", "3-pack"] },
  { name: "Courgette", cat: "produce", units: ["stuk"] },
  { name: "Aubergine", cat: "produce", units: ["stuk"] },
  {
    name: "Spinazie vers",
    cat: "produce",
    units: ["zak"],
    packs: ["300 g", "450 g"],
  },
  { name: "Sla ijsbergsla", cat: "produce", units: ["krop"] },
  { name: "Rucola", cat: "produce", units: ["zak"], packs: ["75 g", "100 g"] },
  {
    name: "Champignons wit",
    cat: "produce",
    units: ["bak"],
    packs: ["250 g", "400 g", "500 g"],
  },
  {
    name: "Champignons kastanje",
    cat: "produce",
    units: ["bak"],
    packs: ["250 g", "400 g"],
  },
  { name: "Gember vers", cat: "produce", units: ["per kg"], packs: ["100 g"] },
  { name: "Koriander vers", cat: "produce", units: ["bos"] },
  { name: "Peterselie vers", cat: "produce", units: ["bos"] },
  { name: "Basilicum vers", cat: "produce", units: ["potje", "bos"] },

  // extra produce
  {
    name: "Aardappel vastkokend",
    cat: "produce",
    units: ["zak", "per kg"],
    packs: ["2.5 kg", "5 kg"],
  },
  {
    name: "Aardappel kruimig",
    cat: "produce",
    units: ["zak", "per kg"],
    packs: ["2.5 kg", "5 kg"],
  },
  {
    name: "Zoete aardappel",
    cat: "produce",
    units: ["stuk", "zak"],
    packs: ["1 kg"],
  },
  { name: "Pastinaak", cat: "produce", units: ["stuk", "per kg"] },
  { name: "Knolselderij", cat: "produce", units: ["stuk", "per kg"] },
  { name: "Bleekselderij", cat: "produce", units: ["stronk", "bundel"] },
  {
    name: "Witlof",
    cat: "produce",
    units: ["stronk", "pak"],
    packs: ["3 st", "6 st"],
  },
  { name: "Rode kool", cat: "produce", units: ["stuk"] },
  { name: "Witte kool", cat: "produce", units: ["stuk"] },
  { name: "Spitskool", cat: "produce", units: ["stuk"] },
  { name: "Savooiekool", cat: "produce", units: ["stuk"] },
  { name: "Rode biet", cat: "produce", units: ["stuk", "bos", "per kg"] },
  { name: "Wortelpeterselie", cat: "produce", units: ["stuk", "bos"] },
  { name: "Knolraap", cat: "produce", units: ["stuk"] },
  { name: "Paksoi", cat: "produce", units: ["stronk"] },
  { name: "Chicorei", cat: "produce", units: ["stronk"] },
  {
    name: "Rucola mini",
    cat: "produce",
    units: ["zak"],
    packs: ["50 g", "100 g"],
  },
  {
    name: "Babysla mix",
    cat: "produce",
    units: ["zak"],
    packs: ["100 g", "150 g"],
  },
  { name: "Koolrabi", cat: "produce", units: ["stuk"] },
  { name: "Courgette geel", cat: "produce", units: ["stuk"] },
  { name: "Pastasaus tomaat & basilicum", cat: "produce", units: ["stuk"] },
  { name: "Meloen galia", cat: "produce", units: ["stuk"] },
  { name: "Meloen cantaloupe", cat: "produce", units: ["stuk"] },
  { name: "Mango ataulfo", cat: "produce", units: ["stuk"] },
  { name: "Papaya", cat: "produce", units: ["stuk"] },
  { name: "Kaki", cat: "produce", units: ["stuk"] },
  { name: "Lychee", cat: "produce", units: ["zak"], packs: ["250 g"] },
  { name: "Physalis", cat: "produce", units: ["doos"], packs: ["125 g"] },
  { name: "Sterfruit", cat: "produce", units: ["stuk"] },
  { name: "Granaatappel", cat: "produce", units: ["stuk"] },
  { name: "Kiwibes", cat: "produce", units: ["doos"], packs: ["125 g"] },
  { name: "Guave", cat: "produce", units: ["stuk"] },
  { name: "Passievrucht", cat: "produce", units: ["stuk"] },
  { name: "Rabarber", cat: "produce", units: ["stengel", "per kg"] },
  { name: "Grapefruit", cat: "produce", units: ["stuk", "per kg"] },
  {
    name: "Clementine",
    cat: "produce",
    units: ["net"],
    packs: ["1 kg", "2 kg"],
  },
  {
    name: "Snoeptomaat",
    cat: "produce",
    units: ["bak"],
    packs: ["250 g", "500 g"],
  },
];

const DAIRY = [
  {
    name: "Halfvolle melk",
    cat: "dairy",
    units: ["stuk", "pak"],
    packs: ["1L", "1.5L", "6-pack 1L"],
  },
  { name: "Volle melk", cat: "dairy", units: ["stuk", "pak"], packs: ["1L"] },
  { name: "Magere melk", cat: "dairy", units: ["stuk", "pak"], packs: ["1L"] },
  {
    name: "Lactosevrije melk",
    cat: "dairy",
    units: ["stuk", "pak"],
    packs: ["1L"],
  },
  {
    name: "Chocolademelk",
    cat: "dairy",
    units: ["pak"],
    packs: ["1L", "500 ml"],
  },
  {
    name: "Yoghurt naturel",
    cat: "dairy",
    units: ["pak", "emmer"],
    packs: ["1L", "1 kg"],
  },
  {
    name: "Griekse yoghurt 10%",
    cat: "dairy",
    units: ["emmer"],
    packs: ["1 kg", "500 g"],
  },
  {
    name: "Kwark naturel",
    cat: "dairy",
    units: ["emmer"],
    packs: ["500 g", "1 kg"],
  },
  {
    name: "Plantaardige yoghurt",
    cat: "dairy",
    units: ["pak", "beker"],
    packs: ["500 g", "750 g"],
  },
  { name: "Roomboter", cat: "dairy", units: ["pak"], packs: ["250 g"] },
  { name: "Halvarine kuip", cat: "dairy", units: ["stuk"], packs: ["500 g"] },
  {
    name: "Kaas jong belegen",
    cat: "dairy",
    units: ["stuk", "per kg"],
    packs: ["ca. 500 g", "plak 200 g"],
  },
  {
    name: "Plakken kaas 48+",
    cat: "dairy",
    units: ["pak"],
    packs: ["200 g", "400 g"],
  },
  {
    name: "Geraspte kaas",
    cat: "dairy",
    units: ["zak"],
    packs: ["150 g", "300 g", "500 g"],
  },
  {
    name: "Mozzarella vers",
    cat: "dairy",
    units: ["bol", "pak"],
    packs: ["125 g", "2-pack"],
  },
  { name: "Feta", cat: "dairy", units: ["stuk"], packs: ["200 g"] },
  {
    name: "Roomkaas naturel",
    cat: "dairy",
    units: ["kuip"],
    packs: ["200 g", "300 g"],
  },
  {
    name: "Eieren vrije uitloop",
    cat: "dairy",
    units: ["doos"],
    packs: ["6 st", "10 st"],
  },
  {
    name: "Eieren biologisch",
    cat: "dairy",
    units: ["doos"],
    packs: ["6 st", "10 st"],
  },

  // extra dairy
  { name: "Karnemelk", cat: "dairy", units: ["pak"], packs: ["1L"] },
  {
    name: "Yoghurt vruchten",
    cat: "dairy",
    units: ["beker"],
    packs: ["500 g"],
  },
  { name: "Yoghurt perzik", cat: "dairy", units: ["pak"], packs: ["1L"] },
  { name: "Yoghurt aardbei", cat: "dairy", units: ["pak"], packs: ["1L"] },
  { name: "Yoghurt bosvruchten", cat: "dairy", units: ["pak"], packs: ["1L"] },
  { name: "Yoghurt drink", cat: "dairy", units: ["fles"], packs: ["500 ml"] },
  { name: "Skyr naturel", cat: "dairy", units: ["beker"], packs: ["450 g"] },
  {
    name: "Skyr bosvruchten",
    cat: "dairy",
    units: ["beker"],
    packs: ["450 g"],
  },
  {
    name: "Plantaardige melk sojadrink",
    cat: "dairy",
    units: ["pak"],
    packs: ["1L"],
  },
  {
    name: "Plantaardige melk rijstd",
    cat: "dairy",
    units: ["pak"],
    packs: ["1L"],
  },
  {
    name: "Plantaardige melk kokosdrink",
    cat: "dairy",
    units: ["pak"],
    packs: ["1L"],
  },
  {
    name: "Plantaardige melk haver-amandel",
    cat: "dairy",
    units: ["pak"],
    packs: ["1L"],
  },
  {
    name: "Crème fraîche",
    cat: "dairy",
    units: ["bak"],
    packs: ["200 g", "300 g"],
  },
  { name: "Sour cream", cat: "dairy", units: ["bak"], packs: ["200 g"] },
  { name: "Mascarpone", cat: "dairy", units: ["bak"], packs: ["250 g"] },
  { name: "Zure room", cat: "dairy", units: ["bak"], packs: ["200 g"] },
  { name: "Kokosyoghurt", cat: "dairy", units: ["beker"], packs: ["400 g"] },
  { name: "Amandelyoghurt", cat: "dairy", units: ["beker"], packs: ["400 g"] },
  {
    name: "Eieren scharrelei",
    cat: "dairy",
    units: ["doos"],
    packs: ["6 st", "10 st"],
  },
  {
    name: "Eieren biologisch groot",
    cat: "dairy",
    units: ["doos"],
    packs: ["6 st", "10 st"],
  },
];

const BAKERY = [
  {
    name: "Volkoren brood",
    cat: "bakery",
    units: ["stuk"],
    packs: ["heel", "half"],
  },
  {
    name: "Bruin brood",
    cat: "bakery",
    units: ["stuk"],
    packs: ["heel", "half"],
  },
  {
    name: "Wit brood",
    cat: "bakery",
    units: ["stuk"],
    packs: ["heel", "half"],
  },
  { name: "Desembrood", cat: "bakery", units: ["stuk"] },
  { name: "Pistolets wit", cat: "bakery", units: ["zak"], packs: ["6 st"] },
  { name: "Croissant", cat: "bakery", units: ["stuk", "6-pack"] },
  {
    name: "Havermout",
    cat: "bakery",
    units: ["pak"],
    packs: ["500 g", "1 kg"],
  },
  { name: "Muesli", cat: "bakery", units: ["pak"], packs: ["500 g", "750 g"] },
  { name: "Cruesli", cat: "bakery", units: ["pak"], packs: ["450 g", "600 g"] },
  {
    name: "Cornflakes",
    cat: "bakery",
    units: ["doos"],
    packs: ["375 g", "500 g"],
  },
  {
    name: "Pindakaas",
    cat: "bakery",
    units: ["pot"],
    packs: ["350 g", "600 g", "1 kg"],
  },
  { name: "Hagelslag puur", cat: "bakery", units: ["pak"], packs: ["400 g"] },
  { name: "Jam aardbei", cat: "bakery", units: ["pot"], packs: ["370 g"] },
  {
    name: "Chocopasta",
    cat: "bakery",
    units: ["pot"],
    packs: ["400 g", "600 g"],
  },
  { name: "Beschuit", cat: "bakery", units: ["rol"], packs: ["13 st"] },

  // extra bakery
  {
    name: "Speltbrood",
    cat: "bakery",
    units: ["stuk"],
    packs: ["heel", "half"],
  },
  { name: "Roggebrood", cat: "bakery", units: ["pak", "stuk"] },
  { name: "Maisbrood", cat: "bakery", units: ["stuk"] },
  { name: "Ciabatta", cat: "bakery", units: ["stuk", "pak"] },
  { name: "Focaccia", cat: "bakery", units: ["stuk"] },
  { name: "Turks brood", cat: "bakery", units: ["stuk"] },
  { name: "Bagel", cat: "bakery", units: ["stuk", "6-pack"] },
  { name: "Wrap volkoren", cat: "bakery", units: ["pak"], packs: ["6 st"] },
  { name: "Pancakes mix", cat: "bakery", units: ["pak"] },
  { name: "Kokosrasp", cat: "bakery", units: ["zak"], packs: ["200 g"] },
  { name: "Chiazaad", cat: "bakery", units: ["zak"], packs: ["300 g"] },
  {
    name: "Lijnzaad",
    cat: "bakery",
    units: ["zak"],
    packs: ["250 g", "500 g"],
  },
  { name: "Havermeel", cat: "bakery", units: ["zak"], packs: ["1 kg"] },
  { name: "Quinoa", cat: "bakery", units: ["zak"], packs: ["500 g", "1 kg"] },
  { name: "Gierst", cat: "bakery", units: ["zak"], packs: ["500 g"] },
  { name: "Huttentut boterbroodjes", cat: "bakery", units: ["pak"] },
  { name: "Stokbrood", cat: "bakery", units: ["stuk"] },
  { name: "Ciabatta tomaat", cat: "bakery", units: ["stuk"] },
];

const MEAT_FISH_VEG = [
  {
    name: "Kipfilet",
    cat: "meat_fish_veg",
    units: ["pak"],
    packs: ["300 g", "500 g", "1 kg"],
  },
  {
    name: "Kipdijfilet",
    cat: "meat_fish_veg",
    units: ["pak"],
    packs: ["300 g", "600 g"],
  },
  {
    name: "Rundergehakt",
    cat: "meat_fish_veg",
    units: ["pak"],
    packs: ["300 g", "500 g", "1 kg"],
  },
  { name: "Riblappen", cat: "meat_fish_veg", units: ["pak"], packs: ["500 g"] },
  {
    name: "Speklappen",
    cat: "meat_fish_veg",
    units: ["pak"],
    packs: ["400 g"],
  },
  {
    name: "Zalmfilet",
    cat: "meat_fish_veg",
    units: ["pak"],
    packs: ["2 st", "4 st", "ca. 300 g"],
  },
  {
    name: "Kabeljauwfilet",
    cat: "meat_fish_veg",
    units: ["pak"],
    packs: ["2 st"],
  },
  {
    name: "Tonijn in blik",
    cat: "meat_fish_veg",
    units: ["doos", "blik"],
    packs: ["3x80 g", "160 g"],
  },
  {
    name: "Vegaburger",
    cat: "meat_fish_veg",
    units: ["pak"],
    packs: ["2 st", "4 st"],
  },
  {
    name: "Falafel",
    cat: "meat_fish_veg",
    units: ["pak"],
    packs: ["200 g", "400 g"],
  },
  {
    name: "Tofu naturel",
    cat: "meat_fish_veg",
    units: ["pak"],
    packs: ["375 g"],
  },
  { name: "Tempeh", cat: "meat_fish_veg", units: ["pak"], packs: ["250 g"] },
  { name: "Ei-salade", cat: "meat_fish_veg", units: ["bak"], packs: ["175 g"] },

  // extra meat / fish / vega
  {
    name: "Kip drumsticks",
    cat: "meat_fish_veg",
    units: ["pak"],
    packs: ["600 g"],
  },
  {
    name: "Kip vleugels",
    cat: "meat_fish_veg",
    units: ["pak"],
    packs: ["500 g"],
  },
  { name: "Kipgehakt", cat: "meat_fish_veg", units: ["pak"], packs: ["400 g"] },
  {
    name: "Kalkoenfilet",
    cat: "meat_fish_veg",
    units: ["pak"],
    packs: ["300 g"],
  },
  {
    name: "Kalkoengehakt",
    cat: "meat_fish_veg",
    units: ["pak"],
    packs: ["400 g"],
  },
  { name: "Rundersteak", cat: "meat_fish_veg", units: ["stuk", "pak"] },
  { name: "Biefstuk", cat: "meat_fish_veg", units: ["stuk"] },
  { name: "Rosbief", cat: "meat_fish_veg", units: ["pak"] },
  { name: "Spekreepjes", cat: "meat_fish_veg", units: ["pak"] },
  { name: "Gehakt gemengd", cat: "meat_fish_veg", units: ["pak"] },
  { name: "Hamburger rund", cat: "meat_fish_veg", units: ["pak"] },
  { name: "Hamburger kip", cat: "meat_fish_veg", units: ["pak"] },
  { name: "Spareribs", cat: "meat_fish_veg", units: ["pak"] },
  { name: "Varkensfilet", cat: "meat_fish_veg", units: ["stuk", "pak"] },
  { name: "Varkenshaas", cat: "meat_fish_veg", units: ["stuk"] },
  { name: "Kalfsschnitzel", cat: "meat_fish_veg", units: ["stuk"] },
  { name: "Gamba’s gepeld", cat: "meat_fish_veg", units: ["zak"] },
  { name: "Mosselen vers", cat: "meat_fish_veg", units: ["bak"] },
  { name: "Zeevruchtenmix diepvries", cat: "meat_fish_veg", units: ["zak"] },
  { name: "Forel filets", cat: "meat_fish_veg", units: ["pak"] },
  { name: "Sardines in blik", cat: "meat_fish_veg", units: ["blik"] },
  { name: "Makreel gerookt", cat: "meat_fish_veg", units: ["stuk", "pak"] },
  { name: "Tofu gerookt", cat: "meat_fish_veg", units: ["pak"] },
  { name: "Tempeh gemarineerd", cat: "meat_fish_veg", units: ["pak"] },
  { name: "Seitan", cat: "meat_fish_veg", units: ["pak"] },
  { name: "Vega worst", cat: "meat_fish_veg", units: ["pak"] },
  { name: "Vega kipstukjes", cat: "meat_fish_veg", units: ["pak"] },
];

const DRINKS = [
  {
    name: "Mineraalwater plat",
    cat: "drinks",
    units: ["stuk", "6-pack", "12-pack"],
    packs: ["500 ml", "1.5L"],
  },
  {
    name: "Mineraalwater bruis",
    cat: "drinks",
    units: ["stuk", "6-pack"],
    packs: ["500 ml", "1L"],
  },
  {
    name: "Cola regular",
    cat: "drinks",
    units: ["stuk", "6-pack", "24-pack"],
    packs: ["330 ml", "1.5L", "2L"],
  },
  {
    name: "Cola zero",
    cat: "drinks",
    units: ["stuk", "6-pack", "24-pack"],
    packs: ["330 ml", "1.5L", "2L"],
  },
  {
    name: "Sinas",
    cat: "drinks",
    units: ["stuk", "6-pack"],
    packs: ["330 ml", "1.5L"],
  },
  {
    name: "Iced tea",
    cat: "drinks",
    units: ["stuk", "6-pack"],
    packs: ["500 ml", "1.5L"],
  },
  { name: "Appelsap", cat: "drinks", units: ["pak"], packs: ["1L"] },
  {
    name: "Sinaasappelsap koelvers",
    cat: "drinks",
    units: ["fles"],
    packs: ["1L"],
  },
  {
    name: "Koffiebonen",
    cat: "drinks",
    units: ["zak"],
    packs: ["500 g", "1 kg"],
  },
  {
    name: "Gemalen koffie",
    cat: "drinks",
    units: ["pak"],
    packs: ["250 g", "500 g"],
  },
  {
    name: "Nespresso cups",
    cat: "drinks",
    units: ["doos"],
    packs: ["10 st", "30 st"],
  },
  {
    name: "Thee zwarte thee",
    cat: "drinks",
    units: ["doos"],
    packs: ["20 st", "40 st"],
  },
  {
    name: "Thee groene thee",
    cat: "drinks",
    units: ["doos"],
    packs: ["20 st"],
  },
  { name: "Haverdrink", cat: "drinks", units: ["pak"], packs: ["1L"] },
  { name: "Amandeldrink", cat: "drinks", units: ["pak"], packs: ["1L"] },

  // extra drinks
  {
    name: "Cola light",
    cat: "drinks",
    units: ["stuk", "6-pack"],
    packs: ["330 ml", "1.5L"],
  },
  {
    name: "Cola zero sugar",
    cat: "drinks",
    units: ["stuk", "6-pack"],
    packs: ["330 ml"],
  },
  { name: "Ice tea green", cat: "drinks", units: ["stuk"], packs: ["500 ml"] },
  { name: "Ice tea peach", cat: "drinks", units: ["stuk"], packs: ["500 ml"] },
  {
    name: "Sprite",
    cat: "drinks",
    units: ["stuk", "6-pack"],
    packs: ["330 ml", "1.5L"],
  },
  {
    name: "Fanta",
    cat: "drinks",
    units: ["stuk", "6-pack"],
    packs: ["330 ml", "1.5L"],
  },
  {
    name: "Spa blauw",
    cat: "drinks",
    units: ["stuk", "6-pack"],
    packs: ["500 ml", "1.5L"],
  },
  {
    name: "Spa rood",
    cat: "drinks",
    units: ["stuk", "6-pack"],
    packs: ["500 ml", "1.5L"],
  },
  { name: "Fristi", cat: "drinks", units: ["fles"], packs: ["500 ml"] },
  { name: "Chocomel", cat: "drinks", units: ["pak"], packs: ["1L"] },
  {
    name: "Frisdrank perzik",
    cat: "drinks",
    units: ["stuk"],
    packs: ["330 ml"],
  },
  { name: "Sinas zero", cat: "drinks", units: ["stuk"], packs: ["330 ml"] },
  { name: "Energiedrank", cat: "drinks", units: ["blik"], packs: ["250 ml"] },
  {
    name: "Energiedrank sugarfree",
    cat: "drinks",
    units: ["blik"],
    packs: ["250 ml"],
  },
  {
    name: "Smoothie fruit mix",
    cat: "drinks",
    units: ["fles"],
    packs: ["250 ml", "500 ml"],
  },
  {
    name: "Smoothie groente",
    cat: "drinks",
    units: ["fles"],
    packs: ["250 ml"],
  },
];

const ALCOHOL = [
  {
    name: "Pils 6-pack blik",
    cat: "alcohol",
    units: ["6-pack", "24-pack"],
    packs: ["6x330 ml", "24x330 ml"],
  },
  {
    name: "Speciaalbier blond",
    cat: "alcohol",
    units: ["stuk", "4-pack"],
    packs: ["330 ml"],
  },
  {
    name: "Witte wijn droog",
    cat: "alcohol",
    units: ["fles", "6-pack"],
    packs: ["750 ml"],
  },
  {
    name: "Rode wijn vol",
    cat: "alcohol",
    units: ["fles", "6-pack"],
    packs: ["750 ml"],
  },
  { name: "Rosé wijn", cat: "alcohol", units: ["fles"], packs: ["750 ml"] },
  { name: "Prosecco", cat: "alcohol", units: ["fles"], packs: ["750 ml"] },
  {
    name: "Whisky blended",
    cat: "alcohol",
    units: ["fles"],
    packs: ["700 ml", "1L"],
  },
  { name: "Vodka", cat: "alcohol", units: ["fles"], packs: ["700 ml", "1L"] },
  { name: "Rum", cat: "alcohol", units: ["fles"], packs: ["700 ml", "1L"] },

  // extra alcohol
  { name: "Lager pils", cat: "alcohol", units: ["krat"], packs: ["24x330 ml"] },
  { name: "IPA", cat: "alcohol", units: ["stuk", "4-pack"], packs: ["330 ml"] },
  {
    name: "Witbier",
    cat: "alcohol",
    units: ["stuk", "4-pack"],
    packs: ["330 ml"],
  },
  { name: "Tripel", cat: "alcohol", units: ["stuk"], packs: ["330 ml"] },
  { name: "Stout", cat: "alcohol", units: ["stuk"], packs: ["330 ml"] },
  {
    name: "Rosé mousserend",
    cat: "alcohol",
    units: ["fles"],
    packs: ["750 ml"],
  },
  { name: "Cava", cat: "alcohol", units: ["fles"], packs: ["750 ml"] },
  {
    name: "Champagne brut",
    cat: "alcohol",
    units: ["fles"],
    packs: ["750 ml"],
  },
  { name: "Port", cat: "alcohol", units: ["fles"], packs: ["750 ml"] },
];

const PANTRY = [
  {
    name: "Rijst basmati",
    cat: "pantry",
    units: ["zak"],
    packs: ["1 kg", "5 kg"],
  },
  {
    name: "Rijst pandan",
    cat: "pantry",
    units: ["zak"],
    packs: ["1 kg", "5 kg"],
  },
  {
    name: "Pasta spaghetti",
    cat: "pantry",
    units: ["pak"],
    packs: ["500 g", "1 kg"],
  },
  {
    name: "Pasta penne",
    cat: "pantry",
    units: ["pak"],
    packs: ["500 g", "1 kg"],
  },
  { name: "Passata", cat: "pantry", units: ["fles"], packs: ["680 g"] },
  {
    name: "Tomatenblokjes",
    cat: "pantry",
    units: ["blik"],
    packs: ["400 g", "3-pack"],
  },
  {
    name: "Tomatenpuree",
    cat: "pantry",
    units: ["blik", "tube"],
    packs: ["70 g", "140 g"],
  },
  {
    name: "Olijfolie extra vergine",
    cat: "pantry",
    units: ["fles"],
    packs: ["500 ml", "1L", "3L"],
  },
  { name: "Zonnebloemolie", cat: "pantry", units: ["fles"], packs: ["1L"] },
  {
    name: "Azijn natuurazijn",
    cat: "pantry",
    units: ["fles"],
    packs: ["750 ml", "1L"],
  },
  {
    name: "Sojasaus",
    cat: "pantry",
    units: ["fles"],
    packs: ["150 ml", "500 ml"],
  },
  {
    name: "Ketjap manis",
    cat: "pantry",
    units: ["fles"],
    packs: ["250 ml", "500 ml"],
  },
  { name: "Kokosmelk", cat: "pantry", units: ["blik"], packs: ["400 ml"] },
  {
    name: "Bonen kidneybonen",
    cat: "pantry",
    units: ["blik", "pot"],
    packs: ["400 g", "720 ml"],
  },
  {
    name: "Kikkererwten",
    cat: "pantry",
    units: ["blik", "pot"],
    packs: ["400 g", "720 ml"],
  },
  {
    name: "Mais in blik",
    cat: "pantry",
    units: ["blik"],
    packs: ["300 g", "3-pack"],
  },
  {
    name: "Tonijn in olie blik",
    cat: "pantry",
    units: ["blik", "3-pack"],
    packs: ["160 g", "3x80 g"],
  },
  {
    name: "Pindas ongezouten",
    cat: "pantry",
    units: ["zak"],
    packs: ["200 g", "500 g", "1 kg"],
  },
  {
    name: "Amandelen",
    cat: "pantry",
    units: ["zak"],
    packs: ["150 g", "500 g"],
  },
  {
    name: "Rozijnen",
    cat: "pantry",
    units: ["zak"],
    packs: ["250 g", "500 g"],
  },
  { name: "Bloem tarwebloem", cat: "pantry", units: ["pak"], packs: ["1 kg"] },
  {
    name: "Zelfrijzend bakmeel",
    cat: "pantry",
    units: ["pak"],
    packs: ["1 kg"],
  },
  { name: "Kristalsuiker", cat: "pantry", units: ["pak"], packs: ["1 kg"] },
  { name: "Zout", cat: "pantry", units: ["pak"], packs: ["600 g", "1 kg"] },
  {
    name: "Peper zwart gemalen",
    cat: "pantry",
    units: ["potje"],
    packs: ["45 g"],
  },
  { name: "Paprikapoeder", cat: "pantry", units: ["potje"], packs: ["45 g"] },
  { name: "Kerriepoeder", cat: "pantry", units: ["potje"], packs: ["45 g"] },
  { name: "Curry saus", cat: "pantry", units: ["fles"], packs: ["500 ml"] },
  {
    name: "Mayonaise",
    cat: "pantry",
    units: ["pot", "knijpfles"],
    packs: ["650 ml", "750 ml"],
  },
  { name: "Ketchup", cat: "pantry", units: ["fles"], packs: ["500 ml", "1L"] },
  { name: "Mosterd", cat: "pantry", units: ["pot", "tube"], packs: ["400 g"] },
  {
    name: "Bouillonblokjes groente",
    cat: "pantry",
    units: ["doos"],
    packs: ["12 st"],
  },
  {
    name: "Bouillonblokjes kip",
    cat: "pantry",
    units: ["doos"],
    packs: ["12 st"],
  },
  {
    name: "Wraps tarwe",
    cat: "pantry",
    units: ["pak"],
    packs: ["6 st", "8 st"],
  },
  { name: "Naanbrood", cat: "pantry", units: ["pak"], packs: ["2 st", "4 st"] },
  {
    name: "Tortilla chips",
    cat: "pantry",
    units: ["zak"],
    packs: ["185 g", "300 g"],
  },

  // extra pantry
  { name: "Pasta fusilli", cat: "pantry", units: ["pak"], packs: ["500 g"] },
  {
    name: "Pasta tagliatelle",
    cat: "pantry",
    units: ["pak"],
    packs: ["250 g", "500 g"],
  },
  { name: "Mie noedels", cat: "pantry", units: ["zak"], packs: ["250 g"] },
  { name: "Ramen noodles", cat: "pantry", units: ["pak"], packs: ["4x85 g"] },
  {
    name: "Spaghettisaus tomaat",
    cat: "pantry",
    units: ["pot"],
    packs: ["400 g"],
  },
  {
    name: "Pastasaus arrabiata",
    cat: "pantry",
    units: ["pot"],
    packs: ["400 g"],
  },
  { name: "Pastasaus pesto", cat: "pantry", units: ["pot"], packs: ["190 g"] },
  {
    name: "Tomatensaus basilicum",
    cat: "pantry",
    units: ["fles"],
    packs: ["500 ml"],
  },
  {
    name: "Tomatensaus spicy",
    cat: "pantry",
    units: ["fles"],
    packs: ["500 ml"],
  },
  { name: "Gerst", cat: "pantry", units: ["zak"], packs: ["500 g"] },
  { name: "Couscous", cat: "pantry", units: ["zak"], packs: ["500 g"] },
  { name: "Bulghur", cat: "pantry", units: ["zak"], packs: ["500 g"] },
  { name: "Linzensoep mix", cat: "pantry", units: ["pak"] },
  { name: "Erwtensoep mix", cat: "pantry", units: ["pak"] },
  { name: "Soep tomaat", cat: "pantry", units: ["blik"], packs: ["400 g"] },
  { name: "Soep groente", cat: "pantry", units: ["blik"], packs: ["400 g"] },
  { name: "Soep kip", cat: "pantry", units: ["blik"], packs: ["400 g"] },
  {
    name: "Conserven spinazie",
    cat: "pantry",
    units: ["blik"],
    packs: ["400 g"],
  },
  {
    name: "Tomatenpuree dubbel geconcentreerd",
    cat: "pantry",
    units: ["blik"],
    packs: ["140 g"],
  },
  {
    name: "Rode linzen gedroogd",
    cat: "pantry",
    units: ["zak"],
    packs: ["500 g"],
  },
  {
    name: "Groene linzen gedroogd",
    cat: "pantry",
    units: ["zak"],
    packs: ["500 g"],
  },
  {
    name: "Kikkererwten gedroogd",
    cat: "pantry",
    units: ["zak"],
    packs: ["500 g"],
  },
  {
    name: "Zwarte bonen gedroogd",
    cat: "pantry",
    units: ["zak"],
    packs: ["500 g"],
  },
  {
    name: "Kidneybonen gedroogd",
    cat: "pantry",
    units: ["zak"],
    packs: ["500 g"],
  },
  {
    name: "Rijst zilvervlies",
    cat: "pantry",
    units: ["zak"],
    packs: ["1 kg", "5 kg"],
  },
  { name: "Wilde rijst", cat: "pantry", units: ["zak"], packs: ["500 g"] },
  { name: "Parboiled rijst", cat: "pantry", units: ["zak"], packs: ["1 kg"] },
  { name: "Panko broodkruim", cat: "pantry", units: ["zak"], packs: ["200 g"] },
  { name: "Paneermeel", cat: "pantry", units: ["zak"], packs: ["200 g"] },
];

const FROZEN = [
  {
    name: "Diepvries spinazie blokjes",
    cat: "frozen",
    units: ["doos"],
    packs: ["450 g", "750 g"],
  },
  {
    name: "Doperwten diepvries",
    cat: "frozen",
    units: ["zak"],
    packs: ["450 g", "750 g", "1 kg"],
  },
  {
    name: "Friet diepvries",
    cat: "frozen",
    units: ["zak"],
    packs: ["750 g", "1 kg", "2.5 kg"],
  },
  {
    name: "Pizza margherita diepvries",
    cat: "frozen",
    units: ["stuk", "2-pack"],
  },
  { name: "Pizza salami diepvries", cat: "frozen", units: ["stuk", "2-pack"] },
  {
    name: "IJs roomijs vanille",
    cat: "frozen",
    units: ["bak"],
    packs: ["1L", "2L"],
  },
  {
    name: "IJsje multipack",
    cat: "frozen",
    units: ["6-pack", "8-pack"],
    packs: ["6 st", "8 st"],
  },
  {
    name: "Zalmfilet diepvries",
    cat: "frozen",
    units: ["doos"],
    packs: ["4 st"],
  },
  {
    name: "Runderburgers diepvries",
    cat: "frozen",
    units: ["doos"],
    packs: ["4 st", "8 st"],
  },

  // extra frozen
  {
    name: "Groentemix wokdiepvries",
    cat: "frozen",
    units: ["zak"],
    packs: ["750 g"],
  },
  {
    name: "Bessenmix diepvries",
    cat: "frozen",
    units: ["zak"],
    packs: ["300 g"],
  },
  {
    name: "Frambozen diepvries",
    cat: "frozen",
    units: ["zak"],
    packs: ["300 g"],
  },
  {
    name: "Aardbeien diepvries",
    cat: "frozen",
    units: ["zak"],
    packs: ["400 g"],
  },
  {
    name: "Spinazie blad diepvries",
    cat: "frozen",
    units: ["zak"],
    packs: ["450 g"],
  },
  {
    name: "Groene asperges diepvries",
    cat: "frozen",
    units: ["zak"],
    packs: ["500 g"],
  },
  {
    name: "Prei stukken diepvries",
    cat: "frozen",
    units: ["zak"],
    packs: ["400 g"],
  },
  {
    name: "Courgetteschijfjes diepvries",
    cat: "frozen",
    units: ["zak"],
    packs: ["400 g"],
  },
  {
    name: "Vissticks diepvries",
    cat: "frozen",
    units: ["doos"],
    packs: ["10 st"],
  },
  {
    name: "Kipnuggets diepvries",
    cat: "frozen",
    units: ["doos"],
    packs: ["12 st"],
  },
  {
    name: "Gehaktballen diepvries",
    cat: "frozen",
    units: ["doos"],
    packs: ["8 st"],
  },
  { name: "Ravioli diepvries", cat: "frozen", units: ["doos"] },
  { name: "Lasagne diepvries", cat: "frozen", units: ["stuk"] },
];

const SNACKS = [
  {
    name: "Chips paprika",
    cat: "snacks",
    units: ["zak"],
    packs: ["200 g", "275 g"],
  },
  {
    name: "Chips naturel",
    cat: "snacks",
    units: ["zak"],
    packs: ["200 g", "275 g"],
  },
  {
    name: "Chocolade melk",
    cat: "snacks",
    units: ["reep", "tabletten"],
    packs: ["100 g", "200 g"],
  },
  {
    name: "Chocolade puur",
    cat: "snacks",
    units: ["reep"],
    packs: ["100 g", "200 g"],
  },
  {
    name: "Koekjes chocolate chip",
    cat: "snacks",
    units: ["pak"],
    packs: ["200 g", "300 g"],
  },
  { name: "Liga milkbreak", cat: "snacks", units: ["doos"], packs: ["5x2 st"] },
  {
    name: "Pepernoten (seizoen)",
    cat: "snacks",
    units: ["zak"],
    packs: ["250 g", "500 g"],
  },
  {
    name: "Notenmix gebrand",
    cat: "snacks",
    units: ["zak"],
    packs: ["200 g", "400 g"],
  },

  // extra snacks
  { name: "Nacho chips", cat: "snacks", units: ["zak"], packs: ["200 g"] },
  {
    name: "Tortilla chips nacho",
    cat: "snacks",
    units: ["zak"],
    packs: ["185 g", "300 g"],
  },
  { name: "Pretzels zout", cat: "snacks", units: ["zak"], packs: ["150 g"] },
  { name: "Popcorn zoet", cat: "snacks", units: ["zak"], packs: ["100 g"] },
  { name: "Popcorn zout", cat: "snacks", units: ["zak"], packs: ["100 g"] },
  {
    name: "Chocolade hazelnoot",
    cat: "snacks",
    units: ["reep"],
    packs: ["100 g"],
  },
  { name: "Truffel chips", cat: "snacks", units: ["zak"], packs: ["175 g"] },
  { name: "Stroopwafels", cat: "snacks", units: ["pak"], packs: ["8 st"] },
  {
    name: "Koekjes bitterkoekjes",
    cat: "snacks",
    units: ["pak"],
    packs: ["150 g"],
  },
  { name: "Snoepjes drop", cat: "snacks", units: ["zak"], packs: ["200 g"] },
  { name: "Snoepjes gemengd", cat: "snacks", units: ["zak"], packs: ["200 g"] },
  { name: "M&M's melk", cat: "snacks", units: ["zak"], packs: ["200 g"] },
  { name: "Chips paprika hot", cat: "snacks", units: ["zak"] },
];

const BABY = [
  {
    name: "Luiers maat 3",
    cat: "baby",
    units: ["pak"],
    packs: ["58 st", "74 st"],
  },
  {
    name: "Luiers maat 4",
    cat: "baby",
    units: ["pak"],
    packs: ["52 st", "66 st"],
  },
  {
    name: "Billendoekjes",
    cat: "baby",
    units: ["pak", "4-pack", "12-pack"],
    packs: ["54 st"],
  },
  { name: "Flesvoeding 1", cat: "baby", units: ["blik"], packs: ["800 g"] },
  {
    name: "Babyhapje fruit",
    cat: "baby",
    units: ["potje", "6-pack"],
    packs: ["90 g"],
  },
  {
    name: "Babyhapje maaltijd",
    cat: "baby",
    units: ["potje"],
    packs: ["200 g"],
  },

  // extra baby
  {
    name: "Luiers maat 5",
    cat: "baby",
    units: ["pak"],
    packs: ["48 st", "58 st"],
  },
  {
    name: "Luiers maat 6",
    cat: "baby",
    units: ["pak"],
    packs: ["44 st", "54 st"],
  },
  {
    name: "Babydoekjes sensitive",
    cat: "baby",
    units: ["pak"],
    packs: ["56 st"],
  },
  {
    name: "Babydoekjes extra soft",
    cat: "baby",
    units: ["pak"],
    packs: ["64 st"],
  },
  { name: "Flesvoeding 2", cat: "baby", units: ["blik"], packs: ["800 g"] },
  { name: "Flesvoeding 3", cat: "baby", units: ["blik"], packs: ["800 g"] },
  { name: "Babydrank fruit", cat: "baby", units: ["fles"], packs: ["200 ml"] },
  {
    name: "Babydrank groente",
    cat: "baby",
    units: ["fles"],
    packs: ["200 ml"],
  },
  { name: "Pap fles voeding", cat: "baby", units: ["pak"], packs: ["500 g"] },
];

const PETS = [
  {
    name: "Hondenbrokken",
    cat: "pets",
    units: ["zak"],
    packs: ["3 kg", "10 kg"],
  },
  {
    name: "Hondenblikvoer",
    cat: "pets",
    units: ["blik", "6-pack", "12-pack"],
    packs: ["400 g"],
  },
  {
    name: "Kattenbrokjes",
    cat: "pets",
    units: ["zak"],
    packs: ["2 kg", "4 kg"],
  },
  {
    name: "Kattennatvoer",
    cat: "pets",
    units: ["zak", "12-pack", "24-pack"],
    packs: ["85 g"],
  },
  { name: "Kattengrind", cat: "pets", units: ["zak"], packs: ["10 L", "15 L"] },

  // extra pets
  { name: "Hondenworstjes", cat: "pets", units: ["pak"], packs: ["4 st"] },
  { name: "Hondensnacks kip", cat: "pets", units: ["zak"], packs: ["200 g"] },
  { name: "Katten snoepjes", cat: "pets", units: ["zak"], packs: ["50 g"] },
  { name: "Kattenmilky", cat: "pets", units: ["pak"], packs: ["4 x 50 g"] },
  { name: "Vogelpindakaas", cat: "pets", units: ["pot"], packs: ["200 g"] },
  { name: "Knaagdier hooi", cat: "pets", units: ["zak"], packs: ["1 kg"] },
];

const HOUSEHOLD = [
  {
    name: "WC-papier",
    cat: "household",
    units: ["4-pack", "8-pack", "16-pack", "24-pack"],
  },
  {
    name: "Keukenpapier",
    cat: "household",
    units: ["2-pack", "4-pack", "8-pack"],
  },
  {
    name: "Afwasmiddel",
    cat: "household",
    units: ["fles"],
    packs: ["450 ml", "750 ml"],
  },
  {
    name: "Vaatwastabletten",
    cat: "household",
    units: ["doos"],
    packs: ["30 st", "60 st", "90 st"],
  },
  {
    name: "Wasmiddel vloeibaar",
    cat: "household",
    units: ["fles"],
    packs: ["1.3L", "2L"],
  },
  {
    name: "Wasmiddel pods",
    cat: "household",
    units: ["doos"],
    packs: ["20 st", "30 st", "50 st"],
  },
  {
    name: "Wasmiddel poeder",
    cat: "household",
    units: ["doos"],
    packs: ["2.6 kg", "5 kg"],
  },
  {
    name: "Wasmiddel wasverzachter",
    cat: "household",
    units: ["fles"],
    packs: ["1L", "1.5L"],
  },
  { name: "Allesreiniger", cat: "household", units: ["fles"], packs: ["1L"] },
  {
    name: "Glasreiniger",
    cat: "household",
    units: ["fles"],
    packs: ["750 ml"],
  },
  {
    name: "Afvalzakken 30L",
    cat: "household",
    units: ["rol"],
    packs: ["20 st"],
  },
  {
    name: "Afvalzakken 60L",
    cat: "household",
    units: ["rol"],
    packs: ["10 st"],
  },

  // extra household
  {
    name: "Vuilniszakken 100L",
    cat: "household",
    units: ["rol"],
    packs: ["10 st"],
  },
  {
    name: "Vuilniszakken 120L",
    cat: "household",
    units: ["rol"],
    packs: ["10 st"],
  },
  { name: "Dweil", cat: "household", units: ["stuk"] },
  {
    name: "Spons schuurspons",
    cat: "household",
    units: ["pak"],
    packs: ["5 st"],
  },
  {
    name: "Microvezeldoeken",
    cat: "household",
    units: ["pak"],
    packs: ["3 st"],
  },
  { name: "Afwasborstel", cat: "household", units: ["stuk"] },
  { name: "Schuurspons", cat: "household", units: ["stuk"] },
  { name: "Plafondreiniger", cat: "household", units: ["fles"] },
];

const CARE = [
  {
    name: "Shampoo",
    cat: "care",
    units: ["fles"],
    packs: ["300 ml", "500 ml"],
  },
  {
    name: "Conditioner",
    cat: "care",
    units: ["fles"],
    packs: ["300 ml", "500 ml"],
  },
  {
    name: "Douchegel",
    cat: "care",
    units: ["fles"],
    packs: ["250 ml", "500 ml"],
  },
  {
    name: "Handzeep",
    cat: "care",
    units: ["pompflacon", "navulling"],
    packs: ["250 ml", "500 ml", "1L"],
  },
  {
    name: "Tandpasta",
    cat: "care",
    units: ["tube", "2-pack"],
    packs: ["75 ml"],
  },
  { name: "Tandenborstel", cat: "care", units: ["stuk", "2-pack", "4-pack"] },
  {
    name: "Scheermesjes",
    cat: "care",
    units: ["doos"],
    packs: ["4 st", "8 st", "12 st"],
  },
  {
    name: "Deodorant",
    cat: "care",
    units: ["spray", "roller"],
    packs: ["150 ml", "50 ml"],
  },
  {
    name: "Bodylotion",
    cat: "care",
    units: ["fles"],
    packs: ["250 ml", "400 ml"],
  },
  {
    name: "Zonnebrand SPF 30",
    cat: "care",
    units: ["tube", "spray"],
    packs: ["200 ml"],
  },

  // extra care
  {
    name: "Shampoo droog haar",
    cat: "care",
    units: ["fles"],
    packs: ["300 ml"],
  },
  { name: "Shampoo vet haar", cat: "care", units: ["fles"], packs: ["300 ml"] },
  {
    name: "Conditioner droog haar",
    cat: "care",
    units: ["fles"],
    packs: ["300 ml"],
  },
  { name: "Masker haar", cat: "care", units: ["pot"], packs: ["200 g"] },
  {
    name: "Lichaamsolie",
    cat: "care",
    units: ["fles"],
    packs: ["100 ml", "200 ml"],
  },
  {
    name: "Gezichtsreiniger",
    cat: "care",
    units: ["tube", "fles"],
    packs: ["150 ml"],
  },
  { name: "Gezichtstoner", cat: "care", units: ["fles"], packs: ["200 ml"] },
  { name: "Dagcrème SPF", cat: "care", units: ["potje"], packs: ["50 ml"] },
  { name: "Nachtcrème", cat: "care", units: ["potje"], packs: ["50 ml"] },
  { name: "Handcrème", cat: "care", units: ["tube"], packs: ["50 ml"] },
  { name: "Scheerschuim", cat: "care", units: ["bus"], packs: ["200 ml"] },
];


// Verzamel alles
export const PRODUCTS = [
  ...PRODUCE,
  ...DAIRY,
  ...BAKERY,
  ...MEAT_FISH_VEG,
  ...DRINKS,
  ...ALCOHOL,
  ...PANTRY,
  ...FROZEN,
  ...SNACKS,
  ...BABY,
  ...PETS,
  ...HOUSEHOLD,
  ...CARE,
];

// Snelle lookup: productnaam -> categorie (lowercase key)
export const NAME_TO_CAT = Object.fromEntries(
  PRODUCTS.map((p) => [p.name.toLowerCase(), p.cat])
);
