import { Routes } from '@angular/router';
import { USER_REPOSITORY } from './domain/ports/user-repository.port';
import { HttpUserRepository } from './infrastructure/http-user.repository';
import { UserListStore } from './application/user-list.store';

export const USER_ROUTES: Routes = [
  {
    path: '',
    title: 'title.users',
    providers: [{ provide: USER_REPOSITORY, useClass: HttpUserRepository }, UserListStore],
    loadComponent: () =>
      import('./presentation/user-list-page/user-list-page').then((m) => m.UserListPage),
  },
];
