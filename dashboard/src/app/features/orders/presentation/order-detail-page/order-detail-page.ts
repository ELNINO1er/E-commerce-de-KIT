import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import {
  DELIVERY_METHOD_KEYS,
} from '../../../../shared/domain/enums';
import {
  ORDER_STATUS_KEYS,
  ORDER_STATUS_VARIANT,
  ORDER_STATUSES,
  OrderStatus,
} from '../../../../shared/domain/order-status';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { formatAddress } from '../../domain/models/order.model';
import { OrderDetailStore } from '../../application/order-detail.store';

@Component({
  selector: 'app-order-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, Icon, Select, Skeleton],
  templateUrl: './order-detail-page.html',
  styleUrl: './order-detail-page.scss',
})
export class OrderDetailPage {
  /** Alimente par `withComponentInputBinding()` depuis le parametre de route. */
  readonly orderNumber = input.required<string>();

  private readonly store = inject(OrderDetailStore);
  private readonly i18n = inject(TranslationService);

  protected readonly order = this.store.order;
  protected readonly loading = this.store.loading;
  protected readonly saving = this.store.saving;
  protected readonly downloading = this.store.downloading;
  protected readonly errorMessage = this.store.error;

  protected readonly statusControl = new FormControl<OrderStatus | null>(null);
  protected readonly trackingControl = new FormControl('', { nonNullable: true });

  protected readonly statusOptions = computed<SelectOption[]>(() =>
    ORDER_STATUSES.map((value) => ({ value, label: this.i18n.t(ORDER_STATUS_KEYS[value]) })),
  );

  protected readonly statusLabel = computed(() => {
    const order = this.order();
    return order ? this.i18n.t(ORDER_STATUS_KEYS[order.status]) : '';
  });

  protected readonly statusVariant = computed(() => {
    const order = this.order();
    return order ? ORDER_STATUS_VARIANT[order.status] : '';
  });

  protected readonly address = computed(() => {
    const order = this.order();
    return order ? formatAddress(order) : '';
  });

  protected readonly deliveryLabel = computed(() => {
    const order = this.order();
    return order ? this.i18n.t(DELIVERY_METHOD_KEYS[order.deliveryMethod]) : '';
  });

  constructor() {
    effect(() => this.store.load(this.orderNumber()));

    effect(() => {
      const order = this.order();
      if (!order) {
        return;
      }
      this.statusControl.setValue(order.status, { emitEvent: false });

      // La note de suivi n'est resynchronisee que si l'admin n'a rien tape :
      // changer le statut recharge la commande, et sans cette garde la saisie en
      // cours dans le champ voisin serait effacee sous ses doigts.
      if (this.trackingControl.pristine) {
        this.trackingControl.setValue(order.trackingNote ?? '', { emitEvent: false });
      }
    });
  }

  protected money(amount: number): string {
    return this.i18n.money(amount);
  }

  protected createdAt(): string {
    return this.i18n.dateTime(this.order()?.createdAt);
  }

  protected applyStatus(): void {
    const status = this.statusControl.value;
    if (status && status !== this.order()?.status) {
      this.store.changeStatus(status);
    }
  }

  protected saveTracking(): void {
    // Redevenu vierge, le champ se resynchronisera sur la reponse du serveur.
    this.trackingControl.markAsPristine();
    this.store.saveTracking(this.trackingControl.value.trim());
  }

  protected downloadInvoice(): void {
    this.store.downloadInvoice();
  }
}
