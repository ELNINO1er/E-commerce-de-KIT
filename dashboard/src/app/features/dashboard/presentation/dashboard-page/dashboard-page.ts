import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_KEYS,
  ORDER_STATUSES,
} from '../../../../shared/domain/order-status';
import { BarChart, BarItem } from '../../../../shared/ui/charts/bar-chart/bar-chart';
import { DonutChart, DonutSlice } from '../../../../shared/ui/charts/donut-chart/donut-chart';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { DashboardStore } from '../../application/dashboard.store';

@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, DonutChart, BarChart, TranslatePipe, Skeleton],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  private readonly store = inject(DashboardStore);
  private readonly i18n = inject(TranslationService);

  protected readonly stats = this.store.stats;
  protected readonly loading = this.store.loading;
  protected readonly errorMessage = this.store.error;
  protected readonly pendingOrders = this.store.pendingOrdersCount;
  protected readonly tilePlaceholders = Array.from({ length: 5 }, (_, index) => index);

  protected readonly revenue = computed(() => this.i18n.money(this.stats()?.revenue ?? 0));

  /** Une part par statut effectivement present dans la reponse de l'API. */
  protected readonly statusSlices = computed<DonutSlice[]>(() => {
    const byStatus = this.stats()?.ordersByStatus ?? {};
    return ORDER_STATUSES.filter((status) => (byStatus[status] ?? 0) > 0).map((status) => ({
      label: this.i18n.t(ORDER_STATUS_KEYS[status]),
      value: byStatus[status] ?? 0,
      color: ORDER_STATUS_COLORS[status],
    }));
  });

  protected readonly bestSellerBars = computed<BarItem[]>(() =>
    this.store.bestSellers().map((seller) => ({
      label: seller.productName,
      value: seller.totalQuantity,
      valueLabel: `${this.i18n.t('dashboard.bestSellers.sold', {
        count: seller.totalQuantity,
      })} · ${this.i18n.money(seller.totalRevenue)}`,
    })),
  );

  protected reload(): void {
    this.store.load(true);
  }
}
