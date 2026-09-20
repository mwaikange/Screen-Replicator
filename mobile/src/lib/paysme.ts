export const PAYSME_NAMIBIAN_TOWNS = [
  'Aminuis', 'Arandis', 'Aranos', 'Aroab', 'Aus', 'Berseba', 'Bethanie',
  'Bukalo', 'Divundu', 'Dordabis', 'Eenhana', 'Engela', 'Epupa', 'Gibeon',
  'Gobabis', 'Gochas', 'Groot Aub', 'Grootfontein', 'Grünau', 'Helao Nafidi',
  'Henties Bay', 'Kalkfeld', 'Kalkrand', 'Kamanjab', 'Karasburg', 'Karibib',
  'Katima Mulilo', 'Keetmanshoop', 'Khorixas', 'Koës', 'Kongola', 'Leonardville',
  'Linyanti', 'Lüderitz', 'Maltahöhe', 'Mariental', 'Nkurenkuru', 'Noordoewer',
  'Ohangwena', 'Okahandja', 'Okahao', 'Okakarara', 'Okalongo', 'Okongo',
  'Omaruru', 'Omuthiya', 'Onayena', 'Ondangwa', 'Ongwediva', 'Oniipa', 'Opuwo',
  'Oranjemund', 'Oshakati', 'Oshikango', 'Oshikuku', 'Otavi', 'Otjinene',
  'Otjiwarongo', 'Outapi', 'Outjo', 'Rehoboth', 'Ruacana', 'Rundu', 'Sesfontein',
  'Stampriet', 'Swakopmund', 'Tsandi', 'Tses', 'Tsumeb', 'Tsumkwe', 'Uis',
  'Usakos', 'Walvis Bay', 'Warmbad', 'Windhoek', 'Witvlei',
] as const;

export function normalizePaySmeMobile(mobile: string) {
  return mobile.replace(/[\s-]/g, '');
}

export function isValidPaySmeMobile(mobile: string) {
  return /^(?:0(?:81|83|85)\d{7}|\+264(?:81|83|85)\d{7})$/.test(normalizePaySmeMobile(mobile));
}

export function isPaySmeTown(town: string) {
  return PAYSME_NAMIBIAN_TOWNS.some((item) => item === town);
}
