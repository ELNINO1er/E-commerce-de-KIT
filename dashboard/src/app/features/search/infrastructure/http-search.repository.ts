import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { API } from '../../../core/api/api.endpoints';
import { ApiService } from '../../../core/api/api.service';
import { EMPTY_PAGE } from '../../../core/api/page-response.model';
import { Account } from '../../users/domain/models/account.model';
import { Order } from '../../orders/domain/models/order.model';
import { Product } from '../../products/domain/models/product.model';
import { SearchGroup } from '../domain/models/search-result.model';
import { SearchRepository } from '../domain/ports/search-repository.port';

@Injectable()
export class HttpSearchRepository implements SearchRepository {
  private readonly api = inject(ApiService);

  search(term: string, limit: number): Observable<SearchGroup[]> {
    const page = { page: 0, size: limit };

    /*
     * Trois appels en parallele, chacun protege.
     *
     * Un `forkJoin` echoue des qu'une source echoue : sans ces `catchError`,
     * une seule liste en erreur viderait tout le panneau. Une famille
     * indisponible doit juste disparaitre du resultat.
     */
    return forkJoin({
      products: this.api
        .getPage<Product>(API.products.list, { q: term, ...page })
        .pipe(catchError(() => of(EMPTY_PAGE))),
      orders: this.api
        .getPage<Order>(API.admin.orders.list, { q: term, ...page })
        .pipe(catchError(() => of(EMPTY_PAGE))),
      customers: this.api
        .getPage<Account>(API.users.list, { q: term, ...page })
        .pipe(catchError(() => of(EMPTY_PAGE))),
    }).pipe(
      map(({ products, orders, customers }) => [
        {
          kind: 'product' as const,
          total: products.totalElements,
          results: products.content.map((product) => ({
            kind: 'product' as const,
            key: `product-${product.id}`,
            title: product.name,
            subtitle: product.category?.name ?? '',
            link: ['/produits', product.id],
          })),
        },
        {
          kind: 'order' as const,
          total: orders.totalElements,
          results: orders.content.map((order) => ({
            kind: 'order' as const,
            key: `order-${order.orderNumber}`,
            title: order.orderNumber,
            subtitle: order.recipientName,
            link: ['/commandes', order.orderNumber],
          })),
        },
        {
          kind: 'customer' as const,
          total: customers.totalElements,
          results: customers.content.map((account) => ({
            kind: 'customer' as const,
            key: `customer-${account.id}`,
            title: [account.firstName, account.lastName].filter(Boolean).join(' ') || account.email,
            subtitle: account.email,
            // Aucune fiche client n'existe : on ouvre la liste avec la
            // recherche deja appliquee, ce qui isole le compte visé.
            link: ['/clients'],
            queryParams: { q: account.email },
          })),
        },
      ]),
    );
  }
}
