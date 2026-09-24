import { Routes } from '@angular/router';
import { RETURN_REPOSITORY } from './domain/ports/return-repository.port';
import { HttpReturnRepository } from './infrastructure/http-return.repository';
import { ReturnListStore } from './application/return-list.store';

export const RETURN_ROUTES: Routes = [
  {
    path: '',
    title: 'title.returns',
    // Port et etat portes par la route : rien hors de cet ecran ne consomme
    // les retours, et quitter la page remet filtre et pagination a zero.
    providers: [{ provide: RETURN_REPOSITORY, useClass: HttpReturnRepository }, ReturnListStore],
    loadComponent: () =>
      import('./presentation/return-list-page/return-list-page').then((m) => m.ReturnListPage),
  },
];
