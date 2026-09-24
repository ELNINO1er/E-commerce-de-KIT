import { computed, DOCUMENT, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { formatDate, formatDateTime, formatMoney } from '../format/format';
import { FR, TranslationKey } from './translations.fr';
import { EN } from './translations.en';

export type Language = 'fr' | 'en';

export const LANGUAGES: readonly Language[] = ['fr', 'en'];

/**
 * Nom de chaque langue **dans cette langue** — volontairement non traduit :
 * un francophone perdu dans une interface en anglais doit reconnaitre
 * « Francais » sans comprendre le reste du menu.
 */
export const LANGUAGE_LABELS: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
};

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { fr: FR, en: EN };

/** Locale Intl associee a chaque langue (dates, separateurs de milliers). */
const LOCALES: Record<Language, string> = { fr: 'fr-FR', en: 'en-GB' };

const STORAGE_KEY = 'scmc.admin.lang';
const DEFAULT_LANGUAGE: Language = 'fr';

function isLanguage(value: string | null): value is Language {
  return value === 'fr' || value === 'en';
}

/**
 * Traduction a l'execution, sans dependance externe.
 *
 * La langue est un signal : tout ce qui lit `t()` (via le pipe `t` ou
 * directement) se reevalue automatiquement au changement de langue, sans
 * rechargement de page — contrairement a `@angular/localize`, qui produit un
 * build par locale.
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  private readonly languageSignal = signal<Language>(this.readStoredLanguage());

  readonly language = this.languageSignal.asReadonly();
  readonly languages = LANGUAGES;
  readonly locale = computed(() => LOCALES[this.languageSignal()]);

  private readonly dictionary = computed(() => DICTIONARIES[this.languageSignal()]);

  constructor() {
    this.applyDocumentLanguage(this.languageSignal());
  }

  /**
   * Traduit une cle dans la langue active.
   *
   * `params` remplace les jetons `{nom}` presents dans le libelle :
   * `t('dashboard.bestSellers.sold', { count: 3 })` → « 3 vendus ».
   */
  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const value = this.dictionary()[key];
    if (!params) {
      return value;
    }
    return value.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  }

  setLanguage(language: Language): void {
    if (language === this.languageSignal()) {
      return;
    }
    this.languageSignal.set(language);
    this.applyDocumentLanguage(language);
    this.storage?.setItem(STORAGE_KEY, language);
  }

  /** Montant en FCFA, formate selon la langue active. */
  money(amount: number | string | null | undefined): string {
    return formatMoney(amount, this.locale());
  }

  /** Date courte, formatee selon la langue active. */
  date(instant: string | null | undefined): string {
    return formatDate(instant, this.locale());
  }

  /** Date + heure, formatees selon la langue active. */
  dateTime(instant: string | null | undefined): string {
    return formatDateTime(instant, this.locale());
  }

  private get storage(): Storage | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }

  private readStoredLanguage(): Language {
    const stored = this.storage?.getItem(STORAGE_KEY) ?? null;
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  }

  /** Tient `<html lang>` a jour : lecteurs d'ecran et cesure en dependent. */
  private applyDocumentLanguage(language: Language): void {
    this.document.documentElement.lang = language;
  }
}
