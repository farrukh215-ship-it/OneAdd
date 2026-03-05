const cityAreas: Record<string, string[]> = {
  karachi: [
    "DHA",
    "Clifton",
    "Gulshan-e-Iqbal",
    "North Nazimabad",
    "PECHS",
    "Korangi",
    "Malir",
    "Saddar",
    "Shah Faisal Colony",
    "Gulistan-e-Jauhar"
  ],
  lahore: [
    "DHA",
    "Johar Town",
    "Bahria Town",
    "Model Town",
    "Garden Town",
    "Gulberg",
    "Wapda Town",
    "Iqbal Town",
    "Cantt",
    "Faisal Town"
  ],
  islamabad: [
    "F-6",
    "F-7",
    "F-10",
    "F-11",
    "G-8",
    "G-9",
    "G-10",
    "I-8",
    "Bahria Enclave",
    "DHA Phase 2"
  ],
  rawalpindi: [
    "Saddar",
    "Bahria Town",
    "DHA",
    "Chaklala",
    "Peshawar Road",
    "Satellite Town",
    "Westridge",
    "Adyala Road",
    "Gulraiz Housing Scheme",
    "Scheme 3"
  ],
  faisalabad: [
    "D Ground",
    "Peoples Colony",
    "Madina Town",
    "Susan Road",
    "Satiana Road",
    "Canal Road",
    "Jaranwala Road",
    "Millat Town",
    "Batala Colony",
    "Samanabad"
  ],
  multan: [
    "Cantonment",
    "Gulgasht Colony",
    "Model Town",
    "Bosan Road",
    "Mumtazabad",
    "Shah Rukn-e-Alam",
    "Wapda Town",
    "New Multan",
    "Peer Khursheed Colony",
    "Suraj Miani"
  ],
  peshawar: [
    "Hayatabad",
    "University Town",
    "Cantt",
    "Gulbahar",
    "Warsak Road",
    "Ring Road",
    "Saddar",
    "Tehkal",
    "Regi Model Town",
    "Kohat Road"
  ],
  quetta: [
    "Jinnah Town",
    "Samungli Road",
    "Sariab Road",
    "Airport Road",
    "Brewery Road",
    "Cantt",
    "Zarghoon Road",
    "Hazara Town",
    "Satellite Town",
    "Chiltan Housing Scheme"
  ],
  gujranwala: [
    "Model Town",
    "DC Colony",
    "Satellite Town",
    "Peoples Colony",
    "Civil Lines",
    "Wapda Town",
    "Canal View",
    "Rahwali",
    "Sialkot Bypass",
    "Eminabad Road"
  ],
  sialkot: [
    "Cantt",
    "Paris Road",
    "Shahabpura",
    "Kashmir Road",
    "Ugoki",
    "Model Town",
    "Daska Road",
    "Sambrial Road",
    "Defence Road",
    "Hajipura"
  ],
  hyderabad: [
    "Latifabad",
    "Qasimabad",
    "Auto Bhan Road",
    "Citizen Colony",
    "Gulistan-e-Sajjad",
    "Main Autobahn",
    "Hirabad",
    "Cantt",
    "Jamshoro Road",
    "Wadhu Wah Road"
  ],
  bahawalpur: [
    "Model Town A",
    "Model Town B",
    "Satellite Town",
    "Dubai Mahal Road",
    "Noor Mahal Road",
    "Yazman Road",
    "Hasilpur Road",
    "Shadab Colony",
    "Trust Colony",
    "Farid Gate"
  ]
};

function normalizeCityKey(city: string) {
  return city.toLowerCase().replace(/\s+/g, "").trim();
}

export function getAreasForCity(city: string) {
  const normalized = normalizeCityKey(city);
  const direct = cityAreas[city.toLowerCase().trim()];
  if (direct) {
    return direct;
  }

  const matchedKey = Object.keys(cityAreas).find(
    (key) => normalizeCityKey(key) === normalized
  );
  if (!matchedKey) {
    return [];
  }
  return cityAreas[matchedKey];
}
