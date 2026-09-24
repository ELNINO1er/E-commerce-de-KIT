/**
 * Filtres du journal d'audit, tels que l'API les accepte.
 *
 * `actor` est une recherche **partielle sur l'e-mail** — c'est le seul champ
 * texte filtrable cote serveur : ni le chemin ni le module ne le sont.
 *
 * `from` / `to` sont des instants ISO-8601. La saisie se fait en jours ; la
 * conversion vit dans `toInstantRange()` ci-dessous.
 */
export interface AuditFilter {
  actor: string | null;
  method: string | null;
  from: string | null;
  to: string | null;
}

export const EMPTY_AUDIT_FILTER: AuditFilter = { actor: null, method: null, from: null, to: null };

/** Verbes reellement journalises : l'intercepteur ignore les lectures. */
export const AUDIT_METHODS: readonly string[] = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Jour saisi (`2026-07-28`) → instant ISO-8601.
 *
 * La borne haute couvre la journee entiere : sans cela, choisir le meme jour
 * des deux cotes ne renverrait rien. Le suffixe `Z` est exact ici — la Cote
 * d'Ivoire est a UTC+0 — mais c'est une hypothese, pas une generalite.
 */
export function toInstantRange(day: string | null, edge: 'start' | 'end'): string | null {
  if (!day) {
    return null;
  }
  return `${day}T${edge === 'start' ? '00:00:00' : '23:59:59'}Z`;
}
