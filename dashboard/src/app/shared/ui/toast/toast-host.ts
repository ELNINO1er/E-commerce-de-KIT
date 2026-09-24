import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/t.pipe';
import { Icon, IconName } from '../icon/icon';
import { ToastKind, ToastService } from './toast.service';

const ICONS: Record<ToastKind, IconName> = {
  success: 'check',
  error: 'alert',
  info: 'alert',
};

/**
 * Pile de notifications. A poser **une seule fois**, a la racine de
 * l'application, pour qu'elle couvre aussi la page de connexion.
 */
@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, TranslatePipe],
  template: `
    <div class="stack" aria-live="polite" aria-atomic="false">
      @for (toast of toasts(); track toast.id) {
        <div
          class="toast"
          [class]="'toast--' + toast.kind"
          [attr.role]="toast.kind === 'error' ? 'alert' : 'status'"
        >
          <app-icon [name]="icon(toast.kind)" [size]="18" />
          <p>{{ toast.message }}</p>
          <button
            type="button"
            [attr.aria-label]="'common.cancel' | t"
            (click)="dismiss(toast.id)"
          >
            <app-icon name="plus" [size]="15" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .stack {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 80;
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: min(92vw, 400px);
      /* Le conteneur ne doit pas intercepter les clics quand il est vide. */
      pointer-events: none;
    }

    /* Fond plein a la couleur du type, texte blanc : une notification doit se
       lire d'un coup d'oeil depuis n'importe quel endroit de la page. */
    .toast {
      display: flex;
      /* Centre verticalement : combine a la hauteur minimale ci-dessous, c'est
         ce qui donne de la hauteur aux messages courts sans elargir la pile. */
      align-items: center;
      gap: 13px;
      min-height: 78px;
      padding: 18px;
      border-radius: var(--scmc-radius-card);
      color: #fff;
      box-shadow: 0 18px 44px rgba(50, 24, 15, 0.26);
      pointer-events: auto;
      animation: toast-in 0.25s ease;
    }

    .toast p {
      flex: 1;
      margin: 0;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }

    .toast > app-icon {
      flex: none;
      color: #fff;
    }

    .toast button {
      display: grid;
      place-items: center;
      flex: none;
      width: 26px;
      height: 26px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      color: rgba(255, 255, 255, 0.85);
      background: transparent;
      cursor: pointer;
    }

    /* Le « + » pivote d'un huitieme de tour : une croix, sans icone dediee. */
    .toast button app-icon {
      transform: rotate(45deg);
    }

    .toast button:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.18);
    }

    .toast--success {
      background: var(--scmc-success);
    }

    .toast--error {
      background: var(--scmc-error);
    }

    /* Cocoa plutot que caramel : le caramel ne porte pas assez le blanc pour du
       texte de cette taille. */
    .toast--info {
      background: var(--scmc-cocoa);
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        /* Negatif : la notification descend depuis le haut de l'ecran, d'ou
           elle vient. Un glissement vers le haut la ferait paraitre sortir du
           contenu. */
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  `,
})
export class ToastHost {
  private readonly service = inject(ToastService);

  protected readonly toasts = this.service.toasts;

  protected icon(kind: ToastKind): IconName {
    return ICONS[kind];
  }

  protected dismiss(id: number): void {
    this.service.dismiss(id);
  }
}
