/**
 * Formatage partage : montants en centimes d'euro et dates.
 *
 * La locale est passee en argument plutot que figee, pour suivre la langue
 * choisie dans le back-office (voir `TranslationService.money()`/`.date()`,
 * qui sont les points d'entree a utiliser depuis les composants).
 *
 * Le FCFA reste ecrit « FCFA » dans les deux langues : c'est le nom d'usage de
 * la devise en Cote d'Ivoire, la que l'API renvoie son code ISO `XOF`. Seule la
 * separation des milliers change avec la locale.
 */

const DATE = new Map<string, Intl.DateTimeFormat>();
const DATE_TIME = new Map<string, Intl.DateTimeFormat>();

const EMPTY = '—';

function dateFormatter(locale: string, withTime: boolean): Intl.DateTimeFormat {
  const cache = withTime ? DATE_TIME : DATE;
  let formatter = cache.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      ...(withTime ? { timeStyle: 'short' as const } : {}),
    });
    cache.set(locale, formatter);
  }
  return formatter;
}

/** `12500` centimes → `125,00 €`. */
export function formatMoney(
  amount: number | string | null | undefined,
  locale = 'fr-FR',
): string {
  if (amount === null || amount === undefined || amount === '') {
    return EMPTY;
  }
  const value = typeof amount === 'string' ? Number(amount) : amount;
  return Number.isFinite(value)
    ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(value / 100)
    : EMPTY;
}

/** Instant ISO renvoye par l'API → date courte. */
export function formatDate(instant: string | null | undefined, locale = 'fr-FR'): string {
  if (!instant) {
    return EMPTY;
  }
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? EMPTY : dateFormatter(locale, false).format(date);
}

/** Instant ISO renvoye par l'API → date + heure. */
export function formatDateTime(instant: string | null | undefined, locale = 'fr-FR'): string {
  if (!instant) {
    return EMPTY;
  }
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? EMPTY : dateFormatter(locale, true).format(date);
}
