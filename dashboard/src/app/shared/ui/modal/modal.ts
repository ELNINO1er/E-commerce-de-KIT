import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/t.pipe';
import { Icon } from '../icon/icon';

/**
 * Coquille de fenetre modale : voile, panneau centre, titre et bouton de
 * fermeture. Le contenu est projete.
 *
 * Le composant ne porte aucun etat d'ouverture — c'est le parent qui decide de
 * l'afficher (`@if`) et qui reagit a `closed`.
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, TranslatePipe],
  template: `
    <div class="overlay" (click)="closed.emit()"></div>

    <div
      class="panel"
      [attr.role]="role()"
      aria-modal="true"
      [attr.aria-label]="title()"
      [style.--modal-width]="width()"
      (keydown.escape)="closed.emit()"
    >
      <header>
        <h2>{{ title() }}</h2>
        <button
          type="button"
          class="close"
          [attr.aria-label]="'common.cancel' | t"
          (click)="closed.emit()"
        >
          <app-icon name="plus" [size]="18" />
        </button>
      </header>

      <ng-content />
    </div>
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 60;
      background: rgba(31, 14, 9, 0.42);
      backdrop-filter: blur(2px);
    }

    .panel {
      position: fixed;
      top: 50%;
      left: 50%;
      z-index: 61;
      width: min(94vw, var(--modal-width, 520px));
      max-height: 88vh;
      overflow-y: auto;
      padding: 24px 26px 26px;
      border-radius: var(--scmc-radius);
      background: #fff;
      box-shadow: 0 30px 70px rgba(50, 24, 15, 0.28);
      transform: translate(-50%, -50%);
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }

    h2 {
      margin: 0;
      font-size: 22px;
    }

    /* Le « + » pivote d'un huitieme de tour : une croix, sans icone dediee. */
    .close {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      color: var(--scmc-muted);
      background: transparent;
      cursor: pointer;
      transition:
        color 0.25s ease,
        background 0.25s ease;

      app-icon {
        transform: rotate(45deg);
      }

      &:hover {
        color: var(--scmc-nav-active);
        background: var(--scmc-nav-active-bg);
      }
    }
  `,
})
export class Modal {
  readonly title = input.required<string>();
  /** `alertdialog` pour une confirmation destructive, `dialog` sinon. */
  readonly role = input<'dialog' | 'alertdialog'>('dialog');
  /** Largeur du panneau — les formulaires ont besoin de plus que les alertes. */
  readonly width = input('520px');
  readonly closed = output<void>();
}
