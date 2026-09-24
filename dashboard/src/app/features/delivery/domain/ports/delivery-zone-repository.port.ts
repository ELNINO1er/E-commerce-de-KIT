import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { DeliveryZone, DeliveryZoneRequest } from '../models/delivery-zone.model';

export interface DeliveryZoneRepository {
  /**
   * Toutes les zones, actives **et** inactives — c'est ce que renvoie la route
   * admin, la route publique ne montrant que les actives. Non paginee.
   */
  findAll(): Observable<DeliveryZone[]>;
  create(request: DeliveryZoneRequest): Observable<DeliveryZone>;
  update(id: number, request: DeliveryZoneRequest): Observable<DeliveryZone>;
  delete(id: number): Observable<void>;
}

export const DELIVERY_ZONE_REPOSITORY = new InjectionToken<DeliveryZoneRepository>(
  'DeliveryZoneRepository',
);
