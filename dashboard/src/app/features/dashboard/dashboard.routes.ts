import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    // Cle de traduction, resolue par `TranslatedTitleStrategy`.
    title: 'title.dashboard',
    loadComponent: () =>
      import('./presentation/dashboard-page/dashboard-page').then((m) => m.DashboardPage),
  },
];
