/**
 * Recommended crystal names to add for fuller registration / purchase / recipe options.
 * Not observed inventory hits — approval appendix candidates.
 *
 * Format: AmharicScript|RomanizedAmharic|EnglishMeaning
 */

/** @typedef {{ am: string, rom: string, en: string }} CrystalTriple */

/**
 * @typedef {{
 *   category: string,
 *   purpose: string,
 *   triple: CrystalTriple,
 *   cores?: string[],
 * }} RecommendedCrystal
 */

/** @type {RecommendedCrystal[]} */
export const RECOMMENDED_CRYSTAL_ADDITIONS = [
  // High priority — kitchen / recipe
  {
    category: "Kitchen / recipe",
    purpose: "Dairy & cooking fat",
    triple: { am: "እርጎ", rom: "Ergo", en: "Yogurt" },
    cores: ["ergo", "yogurt", "yoghurt"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Dairy & cooking fat",
    triple: { am: "ንጥር ቅቤ", rom: "Niter Kibe", en: "Spiced clarified butter" },
    cores: ["niterkibe", "niterkibbeh", "niterqibe"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Staple flour",
    triple: { am: "የጤፍ ዱቄት", rom: "Ye Teff Duket", en: "Teff flour" },
    cores: ["yeteffduket", "teffflour", "teffduket"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Legume",
    triple: { am: "ሽምብራ", rom: "Shimbra", en: "Chickpeas" },
    cores: ["shimbra", "chickpea", "chickpeas"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Spice",
    triple: { am: "ጥቁር ቅመም", rom: "Tikur Kimem", en: "Black pepper" },
    cores: ["tikurkimem", "blackpepper"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Spice",
    triple: { am: "ነጭ ቅመም", rom: "Nech Kimem", en: "White pepper" },
    cores: ["nechkimem", "whitepepper"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Spice",
    triple: { am: "ፓፕሪካ", rom: "Paprika", en: "Paprika" },
    cores: ["paprika"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Herb / spice",
    triple: { am: "ደረቅ ቅጠል", rom: "Derek Qitel", en: "Bay leaf" },
    cores: ["derekqitel", "bayleaf", "bayleaves"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Herb",
    triple: { am: "ባሲል", rom: "Basil", en: "Basil" },
    cores: ["basil"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Herb",
    triple: { am: "ኦሬጋኖ", rom: "Oregano", en: "Oregano" },
    cores: ["oregano"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Herb",
    triple: { am: "ታይም", rom: "Thyme", en: "Thyme" },
    cores: ["thyme"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Plant / fiber",
    triple: { am: "ቀጤማ", rom: "Qetema", en: "Sedge grass / rush" },
    cores: ["qetema", "qetemma", "sedgegrass"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Spice",
    triple: { am: "ነትሜግ", rom: "Nutmeg", en: "Nutmeg" },
    cores: ["nutmeg"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Vegetable",
    triple: { am: "ስፒናች", rom: "Spinach", en: "Spinach" },
    cores: ["spinach"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Vegetable",
    triple: { am: "ዱባ", rom: "Duba", en: "Pumpkin" },
    cores: ["duba", "pumpkin", "squash"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Vegetable",
    triple: { am: "ባድሪጃን", rom: "Badirijan", en: "Eggplant" },
    cores: ["badirijan", "eggplant", "aubergine", "qumit"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Vegetable",
    triple: { am: "ባሚያ", rom: "Bamiya", en: "Okra" },
    cores: ["bamiya", "okra"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Vegetable",
    triple: { am: "ቁከምበር", rom: "Cucumber", en: "Cucumber" },
    cores: ["cucumber", "kukember", "kiyar"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Fruit",
    triple: { am: "ሎሚ አረንጓዴ", rom: "Lime", en: "Lime" },
    cores: ["lime", "lomiarengwade"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Fruit",
    triple: { am: "ብርቱካን", rom: "Birtukan", en: "Orange" },
    cores: ["birtukan", "orange"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Fruit",
    triple: { am: "አናናስ", rom: "Ananas", en: "Pineapple" },
    cores: ["ananas", "pineapple"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Fruit",
    triple: { am: "ሐብሐብ", rom: "Habhab", en: "Watermelon" },
    cores: ["habhab", "watermelon"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Fruit",
    triple: { am: "ፖም", rom: "Pom", en: "Apple" },
    cores: ["pom", "apple"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Protein",
    triple: { am: "የበግ ስጋ", rom: "Ye Beg Sega", en: "Lamb / mutton" },
    cores: ["yebegsega", "lamb", "mutton"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Protein",
    triple: { am: "ሽሪምፕ", rom: "Shrimp", en: "Shrimp" },
    cores: ["shrimp", "prawn", "prawns"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Protein",
    triple: { am: "ቱርኪ", rom: "Turkey", en: "Turkey" },
    cores: ["turkey"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Base / stock",
    triple: { am: "የአጥንት መረቅ", rom: "Ye Atint Mereq", en: "Stock / broth" },
    cores: ["yeatintmereq", "stock", "broth", "bonesoup"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Baking / thickener",
    triple: { am: "የበቆሎ ስታርች", rom: "Ye Bekolo Starch", en: "Cornstarch" },
    cores: ["yebekolostarch", "cornstarch", "cornflourstarch"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Baking",
    triple: { am: "ቤኪንግ ሶዳ", rom: "Baking Soda", en: "Baking soda" },
    cores: ["bakingsoda", "bicarbonate"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Sweetener",
    triple: { am: "ቡና ስኳር", rom: "Buna Sukar", en: "Brown sugar" },
    cores: ["bunasukar", "brownsugar"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Sweetener",
    triple: { am: "የዱቄት ስኳር", rom: "Ye Duket Sukar", en: "Icing sugar" },
    cores: ["yeduketsukar", "icingsugar", "powderedsugar"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Setting agent",
    triple: { am: "ጀላቲን", rom: "Gelatin", en: "Gelatin" },
    cores: ["gelatin", "gelatine"],
  },
  {
    category: "Kitchen / recipe",
    purpose: "Setting agent",
    triple: { am: "አጋር", rom: "Agar", en: "Agar" },
    cores: ["agar", "agaragar"],
  },

  // Cafe / pastry / beverage
  {
    category: "Cafe / pastry / beverage",
    purpose: "Dairy",
    triple: { am: "ፍሬሽ ክሬም", rom: "Fresh Cream", en: "Fresh cream" },
    cores: ["freshcream"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Dairy",
    triple: { am: "ዊፒንግ ክሬም", rom: "Whipping Cream", en: "Whipping cream" },
    cores: ["whippingcream", "whippedcream"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Dessert",
    triple: { am: "አይስ ክሬም", rom: "Ice Cream", en: "Ice cream" },
    cores: ["icecream"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Drink base",
    triple: { am: "በረዶ", rom: "Beredo", en: "Ice" },
    cores: ["beredo", "ice"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Coffee",
    triple: { am: "ኤስፕሬሶ", rom: "Espresso", en: "Espresso" },
    cores: ["espresso"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Drink",
    triple: { am: "ማትቻ", rom: "Matcha", en: "Matcha" },
    cores: ["matcha"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Drink",
    triple: { am: "ቻይ", rom: "Chai", en: "Chai" },
    cores: ["chai"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Milk alternative",
    triple: { am: "የኦት ወተት", rom: "Ye Oat Wetet", en: "Oat milk" },
    cores: ["yeoatwetet", "oatmilk"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Milk alternative",
    triple: { am: "የሶያ ወተት", rom: "Ye Soya Wetet", en: "Soy milk" },
    cores: ["yesoyawetet", "soymilk"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Milk alternative",
    triple: { am: "የለውዝ ወተት", rom: "Ye Lewuz Wetet", en: "Almond milk" },
    cores: ["yelewuzwetet", "almondmilk"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Milk alternative",
    triple: {
      am: "ከላክቶስ ነፃ ወተት",
      rom: "Ke Lactose Netsa Wetet",
      en: "Lactose-free milk",
    },
    cores: ["kelactosenetsawetet", "lactosefreemilk"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Pastry garnish",
    triple: { am: "ዋፈር", rom: "Wafer", en: "Wafer" },
    cores: ["wafer"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Pastry / snack",
    triple: { am: "ቢስኩት", rom: "Biscuit", en: "Biscuit / cookie" },
    cores: ["biscuit", "cookie", "cookies"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Baking mix",
    triple: { am: "ኬክ ሚክስ", rom: "Cake Mix", en: "Cake mix" },
    cores: ["cakemix"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Pastry filling",
    triple: { am: "ፓስትሪ ክሬም", rom: "Pastry Cream", en: "Pastry cream" },
    cores: ["pastrycream"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Pastry dough",
    triple: { am: "ፓፍ ፓስትሪ", rom: "Puff Pastry", en: "Puff pastry" },
    cores: ["puffpastry"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Pastry dough",
    triple: { am: "ፊሎ", rom: "Phyllo", en: "Phyllo pastry" },
    cores: ["phyllo", "filo"],
  },
  {
    category: "Cafe / pastry / beverage",
    purpose: "Wrapper",
    triple: { am: "ስፕሪንግ ሮል", rom: "Spring Roll", en: "Spring-roll wrappers" },
    cores: ["springroll", "springrollwrappers"],
  },

  // Store / ops
  {
    category: "Store / ops",
    purpose: "Stock base",
    triple: { am: "ቡሎን", rom: "Bouillon", en: "Bouillon / stock cube" },
    cores: ["bouillon", "stockcube"],
  },
  {
    category: "Store / ops",
    purpose: "Service ware",
    triple: { am: "የወረቀት ኩባያ", rom: "Ye Wereket Kubaya", en: "Paper cup" },
    cores: ["yewereketkubaya", "papercup"],
  },
  {
    category: "Store / ops",
    purpose: "Service ware",
    triple: { am: "የፕላስቲክ ኩባያ", rom: "Ye Plastic Kubaya", en: "Plastic cup" },
    cores: ["yeplastickubaya", "plasticcup"],
  },
  {
    category: "Store / ops",
    purpose: "Service ware",
    triple: { am: "የኩባያ ክዳን", rom: "Ye Kubaya Kidan", en: "Cup lid" },
    cores: ["yekubayakidan", "cuplid"],
  },
  {
    category: "Store / ops",
    purpose: "Service ware",
    triple: {
      am: "የኩባያ ማጓጓዣ",
      rom: "Ye Kubaya Magwagwaza",
      en: "Cup carrier",
    },
    cores: ["yekubayamagwagwaza", "cupcarrier"],
  },
  {
    category: "Store / ops",
    purpose: "Cold storage",
    triple: { am: "የበረዶ ከረጢት", rom: "Ye Beredo Keretit", en: "Ice bag" },
    cores: ["yeberedokeretit", "icebag"],
  },
  {
    category: "Store / ops",
    purpose: "Cold storage",
    triple: {
      am: "የፍሪዘር ከረጢት",
      rom: "Ye Freezer Keretit",
      en: "Freezer bag",
    },
    cores: ["yefreezerkeretit", "freezerbag"],
  },
  {
    category: "Store / ops",
    purpose: "Utensil",
    triple: { am: "ማንኪያ", rom: "Mankiya", en: "Serving spoon" },
    cores: ["mankiya", "servingspoon"],
  },
  {
    category: "Store / ops",
    purpose: "Utensil",
    triple: { am: "መቀጫ", rom: "Meqecha", en: "Ladle" },
    cores: ["meqecha", "ladle"],
  },
  {
    category: "Store / ops",
    purpose: "Utensil",
    triple: { am: "ማንጠልጠያ", rom: "Mantelteya", en: "Tongs" },
    cores: ["mantelteya", "tongs"],
  },
];

/** Flatten recommended triples into letterCore aliases for proposeCrystal. */
export function recommendedCoresToByCore() {
  /** @type {Record<string, CrystalTriple>} */
  const map = {};
  for (const row of RECOMMENDED_CRYSTAL_ADDITIONS) {
    const cores = row.cores?.length
      ? row.cores
      : [row.triple.rom.replace(/\s+/g, "").toLowerCase()];
    for (const core of cores) {
      if (core) map[core] = row.triple;
    }
  }
  return map;
}

export function formatRecommendedCrystal(row) {
  return `${row.triple.am}|${row.triple.rom}|${row.triple.en}`;
}
