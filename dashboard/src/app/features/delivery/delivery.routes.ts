import { Routes } from '@angular/router';
import { DELIVERY_ZONE_REPOSITORY } from './domain/ports/delivery-zone-repository.port';
import { HttpDeliveryZoneRepository } from './infrastructure/http-delivery-zone.repository';
import { DeliveryZoneStore } from './application/delivery-zone.store';

export const DELIVERY_ROUTES: Routes = [
  {
    path: '',
    title: 'title.delivery',
    providers: [
      { provide: DELIVERY_ZONE_REPOSITORY, useClass: HttpDeliveryZoneRepository },
      DeliveryZoneStore,
    ],
    loadComponent: () =>
      import('./presentation/delivery-zone-list-page/delivery-zone-list-page').then(
        (m) => m.DeliveryZoneListPage,
      ),
  },
];
