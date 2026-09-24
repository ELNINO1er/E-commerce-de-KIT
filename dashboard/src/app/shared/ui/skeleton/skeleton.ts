import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Bloc de chargement (skeleton) — primitive partagee par tout le back-office.
 *
 * Volontairement minimal : un rectangle anime, dimensionne par l'appelant.
 * Les mises en page complexes se composent en repetant le bloc plutot qu'en
 * multipliant les variantes ici.
 *
 * ```html
 * <app-skeleton width="40%" height="28px" />
 * <app-skeleton width="42px" height="42px" circle />
 * ```
 *
 * Le composant est `aria-hidden` : il n'apporte aucune information au lecteur
 * d'ecran. C'est a la region englobante de porter `aria-busy="true"`.
 */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[style.border-radius]': 'resolvedRadius()',
  },
  template: '',
  styles: `
    :host {
      display: block;
      flex: none;
      background: linear-gradient(
        90deg,
        var(--scmc-track) 25%,
        rgba(255, 255, 255, 0.7) 37%,
        var(--scmc-track) 63%
      );
      background-size: 400% 100%;
      animation: scmc-skeleton 1.4s ease infinite;
    }

    @keyframes scmc-skeleton {
      0% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0 50%;
      }
    }

    /* La regle prefers-reduced-motion de styles.scss neutralise l'animation :
       le bloc reste alors un aplat, ce qui se lit toujours comme « en attente ». */
  `,
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('14px');
  readonly radius = input('8px');
  /** Pastille ronde : avatars, icones. Impose un rayon de 50 %. */
  readonly circle = input(false, { transform: booleanAttribute });

  protected readonly resolvedRadius = computed(() => (this.circle() ? '50%' : this.radius()));
}
