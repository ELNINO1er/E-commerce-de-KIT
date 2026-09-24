import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { PageQuery, PageResponse } from '../../../../core/api/page-response.model';
import { OrderStatus } from '../../../../shared/domain/order-status';
import { Order } from '../models/order.model';

export interface OrderRepository {
  /** `term` porte le `?q=` de l'API : numero de commande, nom ou e-mail du destinataire. */
  search(
    status: OrderStatus | null,
    term: string | null,
    page: PageQuery,
  ): Observable<PageResponse<Order>>;
  findByNumber(orderNumber: string): Observable<Order>;
  /** `CANCELLED` remet le stock ; l'API refuse le changement sur une commande finalisee. */
  updateStatus(orderNumber: string, status: OrderStatus): Observable<Order>;
  updateTracking(orderNumber: string, trackingNote: string): Observable<Order>;

  /**
   * Telechargements. Le declenchement de l'enregistrement est fait par
   * l'adaptateur : c'est une affaire de navigateur, elle n'a pas sa place dans
   * l'application ni dans le domaine.
   */
  downloadInvoice(orderNumber: string): Observable<void>;
  exportCsv(): Observable<void>;
}

export const ORDER_REPOSITORY = new InjectionToken<OrderRepository>('OrderRepository');
