import { Routes } from '@angular/router';

export const CATEGORY_ROUTES: Routes = [
  {
    path: '',
    title: 'title.categories',
    loadComponent: () =>
      import('./presentation/category-list-page/category-list-page').then(
        (m) => m.CategoryListPage,
      ),
  },
];
