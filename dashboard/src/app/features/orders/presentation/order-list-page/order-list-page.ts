import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { DELIVERY_METHOD_KEYS } from '../../../../shared/domain/enums';
import {
  ORDER_STATUS_KEYS,
  ORDER_STATUS_VARIANT,
  ORDER_STATUSES,
  OrderStatus,
} from '../../../../shared/domain/order-status';
import { DataTable } from '../../../../shared/ui/data-table/data-table';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SearchField } from '../../../../shared/ui/search-field/search-field';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { Order } from '../../domain/models/order.model';
import { OrderListStore } from '../../application/order-list.store';

@Component({
  selector: 'app-order-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, Icon, DataTable, SearchField, Select],
  templateUrl: './order-list-page.html',
  styleUrl: './order-list-page.scss',
})
export class OrderListPage {
  private readonly store = inject(OrderListStore);
  private readonly i18n = inject(TranslationService);

  /**
   * Recherche **serveur** : `GET /admin/orders` accepte `?q=` (numero, nom ou
   * e-mail du destinataire) et interroge donc l'ensemble des commandes. Le
   * filtrage en memoire qui existait ici ne voyait que la page affichee.
   */
  protected readonly search = this.store.term;
  protected readonly orders = this.store.orders;
  protected readonly page = this.store.page;
  protected readonly loading = this.store.loading;
  protected readonly exporting = this.store.exporting;
  protected readonly errorMessage = this.store.error;
  protected readonly status = this.store.status;

  protected readonly statusOptions = computed<SelectOption[]>(() => [
    { value: null, label: this.i18n.t('orders.filters.allStatuses') },
    ...ORDER_STATUSES.map((value) => ({ value, label: this.i18n.t(ORDER_STATUS_KEYS[value]) })),
  ]);

  protected readonly statusControl = new FormControl<OrderStatus | null>(null);

  constructor() {
    this.statusControl.valueChanges
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((status) => this.store.filterByStatus(status ?? null));
    this.store.load();
  }

  protected onSearch(term: string): void {
    this.store.searchBy(term);
  }

  protected goToPage(index: number): void {
    this.store.goToPage(index);
  }

  protected exportCsv(): void {
    this.store.exportCsv();
  }

  protected statusLabel(order: Order): string {
    return this.i18n.t(ORDER_STATUS_KEYS[order.status]);
  }

  protected statusVariant(order: Order): string {
    return ORDER_STATUS_VARIANT[order.status];
  }

  protected deliveryLabel(order: Order): string {
    return this.i18n.t(DELIVERY_METHOD_KEYS[order.deliveryMethod]);
  }

  protected total(order: Order): string {
    return this.i18n.money(order.total);
  }

  protected date(order: Order): string {
    return this.i18n.dateTime(order.createdAt);
  }
}
