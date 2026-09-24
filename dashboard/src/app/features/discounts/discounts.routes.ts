import { Routes } from '@angular/router';
import { DISCOUNT_CODE_REPOSITORY } from './domain/ports/discount-code-repository.port';
import { HttpDiscountCodeRepository } from './infrastructure/http-discount-code.repository';
import { DiscountCodeStore } from './application/discount-code.store';

export const DISCOUNT_ROUTES: Routes = [
  {
    path: '',
    title: 'title.discounts',
    // Port et etat fournis au niveau de la route : rien d'autre ne consomme les
    // codes promo, ils n'ont pas a vivre dans l'injecteur racine.
    providers: [
      { provide: DISCOUNT_CODE_REPOSITORY, useClass: HttpDiscountCodeRepository },
      DiscountCodeStore,
    ],
    loadComponent: () =>
      import('./presentation/discount-list-page/discount-list-page').then(
        (m) => m.DiscountListPage,
      ),
  },
];
