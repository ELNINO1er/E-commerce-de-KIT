import { DestroyRef, Directive, inject, input, signal } from '@angular/core';

/**
 * Ascenseur qui s'efface apres un temps d'inactivite, facon barre superposee.
 *
 * Le CSS seul ne sait pas faire : il n'existe aucun etat « en train de defiler »
 * ni « inactif depuis N ms ». La directive pose donc la classe `is-scrolling` a
 * chaque evenement de defilement et la retire apres `hideDelay` millisecondes
 * sans nouvel evenement ; `styles.scss` s'occupe du fondu.
 *
 * La gouttiere garde sa largeur en permanence : faire apparaitre et disparaitre
 * le pouce ne provoque donc aucun deplacement du contenu.
 *
 * ```html
 * <main class="content" appAutoHideScroll>…</main>
 * ```
 */
@Directive({
  selector: '[appAutoHideScroll]',
  host: {
    class: 'scroll-auto-hide',
    '[class.is-scrolling]': 'visible()',
    '(scroll)': 'reveal()',
  },
})
export class AutoHideScroll {
  /** Duree d'inactivite avant effacement, en millisecondes. */
  readonly hideDelay = input(1000);

  protected readonly visible = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  protected reveal(): void {
    this.visible.set(true);
    this.clearTimer();
    this.timer = setTimeout(() => this.visible.set(false), this.hideDelay());
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
