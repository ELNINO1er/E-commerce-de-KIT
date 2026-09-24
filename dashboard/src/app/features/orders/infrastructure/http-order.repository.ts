import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../../../core/api/api.endpoints';
import { ApiService } from '../../../core/api/api.service';
import { PageQuery, PageResponse } from '../../../core/api/page-response.model';
import { OrderStatus } from '../../../shared/domain/order-status';
import { Order } from '../domain/models/order.model';
import { OrderRepository } from '../domain/ports/order-repository.port';

@Injectable()
export class HttpOrderRepository implements OrderRepository {
  private readonly api = inject(ApiService);

  search(
    status: OrderStatus | null,
    term: string | null,
    page: PageQuery,
  ): Observable<PageResponse<Order>> {
    // `ApiService` retire les parametres vides : un filtre non renseigne ne
    // part donc jamais sous la forme `?q=`.
    return this.api.getPage<Order>(API.admin.orders.list, { status, q: term, ...page });
  }

  findByNumber(orderNumber: string): Observable<Order> {
    return this.api.get<Order>(API.admin.orders.byNumber(orderNumber));
  }

  updateStatus(orderNumber: string, status: OrderStatus): Observable<Order> {
    return this.api.put<Order>(API.admin.orders.status(orderNumber), { status });
  }

  updateTracking(orderNumber: string, trackingNote: string): Observable<Order> {
    return this.api.put<Order>(API.admin.orders.tracking(orderNumber), { trackingNote });
  }

  downloadInvoice(orderNumber: string): Observable<void> {
    // Le vrai nom vient de `Content-Disposition`, que le backend expose.
    return this.api.downloadAndSave(
      API.admin.orders.invoice(orderNumber),
      `facture-${orderNumber}.pdf`,
    );
  }

  exportCsv(): Observable<void> {
    return this.api.downloadAndSave(API.admin.orders.export, 'commandes.csv');
  }
}
