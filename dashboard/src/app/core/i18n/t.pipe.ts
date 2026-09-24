import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from './translation.service';
import { TranslationKey } from './translations.fr';

/**
 * Traduit une cle dans un template : `{{ 'nav.products' | t }}`, ou avec des
 * parametres : `{{ 'dashboard.bestSellers.sold' | t: { count: 3 } }}`.
 *
 * Le pipe est volontairement **impur**. Un pipe pur memorise son resultat tant
 * que son entree ne change pas : la cle restant identique, il renverrait la
 * traduction de l'ancienne langue apres un changement. Impur, il se reevalue a
 * chaque passe de detection — donc relit le signal de langue et reste juste.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(TranslationService);

  transform(key: TranslationKey, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
