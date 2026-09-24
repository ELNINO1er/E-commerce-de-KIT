import { Routes } from '@angular/router';
import { guestGuard } from '../../core/auth/admin.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    canActivate: [guestGuard],
    // Cle de traduction, resolue par `TranslatedTitleStrategy`.
    title: 'title.login',
    loadComponent: () => import('./presentation/login-page/login-page').then((m) => m.LoginPage),
  },
];
