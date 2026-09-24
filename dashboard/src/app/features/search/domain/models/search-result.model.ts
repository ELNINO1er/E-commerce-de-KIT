/**
 * Resultat de la recherche globale, quelle que soit sa nature.
 *
 * Les trois familles n'ont ni la meme forme ni le meme identifiant — un
 * produit se designe par un nombre, une commande par son numero, un client par
 * son e-mail. On les ramene donc a une ligne affichable et a une destination,
 * plutot que de faire porter cette disparite a l'ecran.
 */
export type SearchResultKind = 'product' | 'order' | 'customer';

export interface SearchResult {
  kind: SearchResultKind;
  /** Cle de rendu ; unique **au sein de sa famille**, pas au-dela. */
  key: string;
  title: string;
  subtitle: string;
  /** Cible du clic, au format `routerLink`. */
  link: unknown[];
  /** Parametres de requete a poser sur la cible (recherche pre-remplie). */
  queryParams?: Record<string, string>;
}

/** Un groupe de resultats, tel qu'affiche dans le panneau. */
export interface SearchGroup {
  kind: SearchResultKind;
  results: SearchResult[];
  /** Nombre total cote serveur : le panneau n'en montre que les premiers. */
  total: number;
}
