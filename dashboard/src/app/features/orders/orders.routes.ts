import { Routes } from '@angular/router';
import { ORDER_REPOSITORY } from './domain/ports/order-repository.port';
import { HttpOrderRepository } from './infrastructure/http-order.repository';
import { OrderListStore } from './application/order-list.store';
import { OrderDetailStore } from './application/order-detail.store';

export const ORDER_ROUTES: Routes = [
  {
    path: '',
    // Le port est fourni au niveau de la feature : il n'a aucune raison de vivre
    // dans l'injecteur racine tant qu'aucun autre ecran ne consomme les commandes.
    providers: [{ provide: ORDER_REPOSITORY, useClass: HttpOrderRepository }],
    children: [
      {
        path: '',
        title: 'title.orders',
        providers: [OrderListStore],
        loadComponent: () =>
          import('./presentation/order-list-page/order-list-page').then((m) => m.OrderListPage),
      },
      {
        path: ':orderNumber',
        title: 'title.orderDetail',
        providers: [OrderDetailStore],
        loadComponent: () =>
          import('./presentation/order-detail-page/order-detail-page').then(
            (m) => m.OrderDetailPage,
          ),
      },
    ],
  },
];
