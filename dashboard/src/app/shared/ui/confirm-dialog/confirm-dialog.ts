import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/t.pipe';
import { Modal } from '../modal/modal';

/**
 * Confirmation d'une action irreversible (suppression).
 *
 * Batie sur `app-modal` : voile, panneau et fermeture sont mutualises, seul le
 * contenu — message et couple de boutons — est propre a la confirmation.
 *
 * C'est au parent de decider de l'afficher (`@if`) : le composant ne porte aucun
 * etat d'ouverture, il emet `confirmed` ou `cancelled`.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, TranslatePipe],
  template: `
    <app-modal [title]="title()" role="alertdialog" width="430px" (closed)="cancelled.emit()">
      @if (message()) {
        <p>{{ message() }}</p>
      }

      <div class="actions">
        <button type="button" class="btn btn--ghost" (click)="cancelled.emit()">
          {{ 'common.cancel' | t }}
        </button>
        <button
          type="button"
          class="btn"
          [class.btn--danger-solid]="danger()"
          [class.btn--primary]="!danger()"
          (click)="confirmed.emit()"
          autofocus
        >
          {{ confirmLabel() || ('common.confirm' | t) }}
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    p {
      margin: 0;
      color: var(--scmc-muted);
      font-size: 14px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 24px;
    }
  `,
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly confirmLabel = input('');
  /** Colore le bouton de confirmation en rouge plein. */
  readonly danger = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
