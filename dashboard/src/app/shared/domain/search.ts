/**
 * Comparaison de texte pour la recherche locale.
 *
 * Insensible a la casse **et aux accents** : sur un catalogue francais, taper
 * « the » doit trouver « Thé », et « cafe » trouver « Café ». Sans cette
 * normalisation, l'admin doit reproduire les accents a l'identique — ce que
 * personne ne fait dans un champ de recherche.
 */
function normalize(value: string): string {
  return value
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/** `true` si l'un des champs contient le terme recherche. */
export function matchesSearch(term: string, ...fields: (string | null | undefined)[]): boolean {
  const needle = normalize(term.trim());
  if (!needle) {
    return true;
  }
  return fields.some((field) => !!field && normalize(field).includes(needle));
}
