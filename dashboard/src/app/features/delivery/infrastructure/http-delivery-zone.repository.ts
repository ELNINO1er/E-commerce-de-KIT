import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../../../core/api/api.endpoints';
import { ApiService } from '../../../core/api/api.service';
import { DeliveryZone, DeliveryZoneRequest } from '../domain/models/delivery-zone.model';
import { DeliveryZoneRepository } from '../domain/ports/delivery-zone-repository.port';

@Injectable()
export class HttpDeliveryZoneRepository implements DeliveryZoneRepository {
  private readonly api = inject(ApiService);

  findAll(): Observable<DeliveryZone[]> {
    return this.api.get<DeliveryZone[]>(API.admin.deliveryZones.list);
  }

  create(request: DeliveryZoneRequest): Observable<DeliveryZone> {
    return this.api.post<DeliveryZone>(API.admin.deliveryZones.create, request);
  }

  update(id: number, request: DeliveryZoneRequest): Observable<DeliveryZone> {
    return this.api.put<DeliveryZone>(API.admin.deliveryZones.byId(id), request);
  }

  delete(id: number): Observable<void> {
    return this.api.delete(API.admin.deliveryZones.byId(id));
  }
}
