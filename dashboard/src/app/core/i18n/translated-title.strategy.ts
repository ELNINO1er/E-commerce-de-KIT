import { effect, inject, Injectable, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslationService } from './translation.service';
import { TranslationKey } from './translations.fr';

/**
 * Les routes declarent une **cle** de traduction dans leur `title`
 * (`title: 'title.dashboard'`) plutot qu'un libelle fige.
 *
 * La strategie la resout dans la langue active, et l'effet ci-dessous reapplique
 * le titre quand la langue change — sinon l'onglet garderait la langue en cours
 * au moment de la derniere navigation.
 */
@Injectable()
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(TranslationService);
  private readonly currentKey = signal<TranslationKey | null>(null);

  constructor() {
    super();
    effect(() => {
      const key = this.currentKey();
      // Lecture explicite : c'est ce qui abonne l'effet au changement de langue.
      const language = this.i18n.language();
      if (key && language) {
        this.title.setTitle(this.i18n.t(key));
      }
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot);
    this.currentKey.set(key ? (key as TranslationKey) : null);
  }
}
