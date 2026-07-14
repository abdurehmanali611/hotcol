/** Country / state selectors for guest address (Reception). */

export const WORLD_COUNTRIES = [
  "Ethiopia",
  "Kenya",
  "Uganda",
  "Tanzania",
  "Sudan",
  "South Sudan",
  "Somalia",
  "Djibouti",
  "Eritrea",
  "Rwanda",
  "Burundi",
  "Egypt",
  "Nigeria",
  "Ghana",
  "South Africa",
  "Morocco",
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Turkey",
  "India",
  "China",
  "United States",
  "United Kingdom",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Canada",
  "Australia",
  "Other",
] as const;

export type WorldCountry = (typeof WORLD_COUNTRIES)[number];

const ETHIOPIA_STATES = [
  "Addis Ababa",
  "Afar",
  "Amhara",
  "Benishangul-Gumuz",
  "Central Ethiopia",
  "Dire Dawa",
  "Gambela",
  "Harari",
  "Oromia",
  "Sidama",
  "Somali",
  "South Ethiopia",
  "South West Ethiopia",
  "Tigray",
];

const STATES_BY_COUNTRY: Record<string, string[]> = {
  Ethiopia: ETHIOPIA_STATES,
  Kenya: [
    "Nairobi",
    "Mombasa",
    "Kisumu",
    "Nakuru",
    "Kiambu",
    "Uasin Gishu",
    "Other",
  ],
  Uganda: ["Kampala", "Wakiso", "Mukono", "Other"],
  Tanzania: ["Dar es Salaam", "Arusha", "Dodoma", "Zanzibar", "Other"],
  Sudan: ["Khartoum", "Gezira", "Other"],
  "South Sudan": ["Juba", "Other"],
  Somalia: ["Mogadishu", "Hargeisa", "Other"],
  Djibouti: ["Djibouti", "Other"],
  Eritrea: ["Maekel", "Northern Red Sea", "Other"],
  Egypt: ["Cairo", "Alexandria", "Giza", "Other"],
  "United Arab Emirates": [
    "Abu Dhabi",
    "Dubai",
    "Sharjah",
    "Ajman",
    "Other",
  ],
  "Saudi Arabia": ["Riyadh", "Jeddah", "Makkah", "Madinah", "Other"],
  "United States": [
    "California",
    "Texas",
    "New York",
    "Florida",
    "Illinois",
    "Washington",
    "Other",
  ],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
  Germany: ["Bavaria", "Berlin", "Hamburg", "Other"],
  France: ["Île-de-France", "Provence", "Other"],
  India: ["Delhi", "Maharashtra", "Karnataka", "Other"],
  China: ["Beijing", "Shanghai", "Guangdong", "Other"],
  Canada: ["Ontario", "Quebec", "British Columbia", "Other"],
  Australia: ["New South Wales", "Victoria", "Queensland", "Other"],
};

export function statesForCountry(country: string): string[] {
  const key = String(country || "").trim();
  return STATES_BY_COUNTRY[key] ?? ["Other"];
}
