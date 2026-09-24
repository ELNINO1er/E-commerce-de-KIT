import { Routes } from '@angular/router';
import { ProductListStore } from './application/product-list.store';

export const PRODUCT_ROUTES: Routes = [
  {
    path: '',
    // Fourni ici et non en racine : quitter l'ecran remet filtres et page a zero.
    providers: [ProductListStore],
    title: 'title.products',
    loadComponent: () =>
      import('./presentation/product-list-page/product-list-page').then((m) => m.ProductListPage),
  },
  {
    // Doit rester avant `:id`, sinon « nouveau » serait pris pour un identifiant.
    path: 'nouveau',
    title: 'title.productNew',
    loadComponent: () =>
      import('./presentation/product-form-page/product-form-page').then((m) => m.ProductFormPage),
  },
  {
    // Idem : la route la plus specifique passe avant `:id`.
    path: ':id/modifier',
    title: 'title.productEdit',
    loadComponent: () =>
      import('./presentation/product-form-page/product-form-page').then((m) => m.ProductFormPage),
  },
  {
    path: ':id',
    title: 'title.productDetail',
    loadComponent: () =>
      import('./presentation/product-detail-page/product-detail-page').then(
        (m) => m.ProductDetailPage,
      ),
  },
];
