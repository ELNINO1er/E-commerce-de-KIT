import { TranslationKey } from '../../../../core/i18n/translations.fr';

/** Une entree du journal des actions admin (`AuditLogResponse`). */
export interface AuditLog {
  id: number;
  /** E-mail du compte a l'origine de l'appel. */
  actor: string;
  /** Verbe HTTP : `POST`, `PUT`, `DELETE`… */
  method: string;
  /** Chemin appele, tel qu'enregistre par l'intercepteur serveur. */
  path: string;
  /** Code de reponse HTTP. */
  status: number;
  timestamp: string;
}

/**
 * Code HTTP → cle de libelle lisible.
 *
 * Un journal destine a un gestionnaire de boutique ne doit pas exiger de savoir
 * ce que vaut un 204 ou un 409. Le code brut reste consultable au survol.
 */
export function statusKey(status: number): TranslationKey {
  switch (status) {
    case 200:
      return 'audit.status.ok';
    case 201:
      return 'audit.status.created';
    case 204:
      return 'audit.status.done';
    case 400:
    case 422:
      return 'audit.status.invalid';
    case 401:
      return 'audit.status.unauthorized';
    case 403:
      return 'audit.status.forbidden';
    case 404:
      return 'audit.status.notFound';
    case 409:
      return 'audit.status.conflict';
    case 413:
      return 'audit.status.tooLarge';
    case 429:
      return 'audit.status.tooMany';
    default:
      return status >= 500 ? 'audit.status.serverError' : 'audit.status.other';
  }
}

/**
 * Chemin d'API → module fonctionnel.
 *
 * « Produits » parle a l'administrateur, `/api/products/3` non. L'ordre des
 * tests compte : les routes `/admin/…` sont examinees avant leurs equivalents
 * publics, sans quoi `/admin/discount-codes` tomberait dans un cas trop large.
 */
export function moduleKey(path: string): TranslationKey {
  const rules: [RegExp, TranslationKey][] = [
    [/\/(products|variants)\b/, 'audit.module.products'],
    [/\/categories\b/, 'audit.module.categories'],
    [/\/orders\b/, 'audit.module.orders'],
    [/\/discount-codes\b/, 'audit.module.discounts'],
    [/\/delivery-zones\b/, 'audit.module.delivery'],
    [/\/uploads\b/, 'audit.module.uploads'],
    [/\/stats\b/, 'audit.module.stats'],
    [/\/payments\b/, 'audit.module.payments'],
    [/\/audit-logs\b/, 'audit.module.audit'],
    [/\/users\b/, 'audit.module.users'],
    [/\/auth\b/, 'audit.module.auth'],
    [/\/addresses\b/, 'audit.module.addresses'],
    [/\/cart\b/, 'audit.module.cart'],
  ];
  return rules.find(([pattern]) => pattern.test(path))?.[1] ?? 'audit.module.other';
}

/** Variante de pastille `.status--*` selon la famille du code HTTP. */
export function statusVariant(status: number): string {
  if (status >= 500) {
    return 'status--danger';
  }
  if (status >= 400) {
    return '';
  }
  return 'status--success';
}

/**
 * Variante selon le verbe. `DELETE` est signale en rouge : c'est la seule
 * action irreversible du journal, elle doit sauter aux yeux lors d'une revue.
 */
export function methodVariant(method: string): string {
  switch (method) {
    case 'DELETE':
      return 'status--danger';
    case 'POST':
    case 'PUT':
    case 'PATCH':
      return 'status--info';
    default:
      return 'status--neutral';
  }
}
