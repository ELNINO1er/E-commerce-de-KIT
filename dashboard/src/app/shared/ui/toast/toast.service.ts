import { inject, Injectable, signal } from '@angular/core';
import { problemMessage } from '../../../core/api/problem-detail';
import { TranslationService } from '../../../core/i18n/translation.service';
import { TranslationKey } from '../../../core/i18n/translations.fr';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

/** Une erreur se lit ; on laisse plus de temps qu'une confirmation. */
const DURATION: Record<ToastKind, number> = {
  success: 4000,
  info: 5000,
  error: 8000,
};

/**
 * Notifications ephemeres, partagees par toute l'application.
 *
 * `apiError()` est le point d'entree a privilegier sur un echec HTTP : il
 * affiche le champ `detail` du ProblemDetail renvoye par le backend — c'est le
 * message metier utile (« Stock insuffisant pour le format « 250 g » »), bien
 * plus parlant qu'un libelle generique. On ne retombe sur une traduction que
 * lorsque la reponse n'en contient aucun : serveur injoignable, ou erreur sans
 * corps exploitable.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly i18n = inject(TranslationService);

  private readonly toastsSignal = signal<Toast[]>([]);
  private nextId = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly toasts = this.toastsSignal.asReadonly();

  success(message: string): void {
    this.push('success', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  /** Raccourci pour les libelles du dictionnaire. */
  successKey(key: TranslationKey, params?: Record<string, string | number>): void {
    this.success(this.i18n.t(key, params));
  }

  /** Echec HTTP : affiche le `detail` du backend quand il y en a un. */
  apiError(error: unknown): void {
    this.error(
      problemMessage(error, {
        network: this.i18n.t('error.network'),
        unexpected: this.i18n.t('error.unexpected'),
      }),
    );
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toastsSignal.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private push(kind: ToastKind, message: string): void {
    const id = this.nextId++;
    this.toastsSignal.update((toasts) => [...toasts, { id, kind, message }]);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), DURATION[kind]),
    );
  }
}
