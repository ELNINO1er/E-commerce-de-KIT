import { computed, inject, Injectable, signal } from '@angular/core';
import { problemMessage } from '../../../core/api/problem-detail';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { OrderStatus } from '../../../shared/domain/order-status';
import { Order } from '../domain/models/order.model';
import { ORDER_REPOSITORY } from '../domain/ports/order-repository.port';

/** Etat du detail d'une commande : chargement, changement de statut, suivi, facture. */
@Injectable()
export class OrderDetailStore {
  private readonly repository = inject(ORDER_REPOSITORY);
  private readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);

  private readonly orderSignal = signal<Order | null>(null);
  private readonly loadingSignal = signal(true);
  private readonly savingSignal = signal(false);
  private readonly downloadingSignal = signal(false);
  /**
   * Reservee a l'echec du **chargement** : dans ce cas la page est vide, un
   * message en place vaut mieux qu'une notification fugace. Les erreurs
   * d'action, elles, passent par le toast.
   */
  private readonly errorSignal = signal<unknown>(null);

  readonly order = this.orderSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly saving = this.savingSignal.asReadonly();
  readonly downloading = this.downloadingSignal.asReadonly();
  readonly error = computed(() => {
    const raw = this.errorSignal();
    return raw
      ? problemMessage(raw, {
          network: this.i18n.t('error.network'),
          unexpected: this.i18n.t('error.unexpected'),
        })
      : null;
  });

  load(orderNumber: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.repository.findByNumber(orderNumber).subscribe({
      next: (order) => {
        this.orderSignal.set(order);
        this.loadingSignal.set(false);
      },
      error: (error: unknown) => {
        this.errorSignal.set(error);
        this.loadingSignal.set(false);
      },
    });
  }

  /**
   * L'API renvoie la commande a jour : on remplace l'etat local par sa reponse
   * plutot que de deviner le resultat, car un changement de statut peut avoir
   * des effets de bord (remise en stock sur `CANCELLED`).
   */
  changeStatus(status: OrderStatus): void {
    const order = this.orderSignal();
    if (!order || this.savingSignal()) {
      return;
    }
    this.savingSignal.set(true);

    this.repository.updateStatus(order.orderNumber, status).subscribe({
      next: (updated) => {
        this.orderSignal.set(updated);
        this.savingSignal.set(false);
        this.toast.successKey('orders.statusUpdated');
      },
      error: (error: unknown) => {
        // Le backend explique pourquoi la transition est refusee : c'est ce
        // message-la qu'il faut montrer, pas un libelle generique.
        this.toast.apiError(error);
        this.savingSignal.set(false);
      },
    });
  }

  saveTracking(trackingNote: string): void {
    const order = this.orderSignal();
    if (!order || this.savingSignal()) {
      return;
    }
    this.savingSignal.set(true);

    this.repository.updateTracking(order.orderNumber, trackingNote).subscribe({
      next: (updated) => {
        this.orderSignal.set(updated);
        this.savingSignal.set(false);
        this.toast.successKey('orders.trackingUpdated');
      },
      error: (error: unknown) => {
        this.toast.apiError(error);
        this.savingSignal.set(false);
      },
    });
  }

  downloadInvoice(): void {
    const order = this.orderSignal();
    if (!order || this.downloadingSignal()) {
      return;
    }
    this.downloadingSignal.set(true);

    this.repository.downloadInvoice(order.orderNumber).subscribe({
      next: () => this.downloadingSignal.set(false),
      error: (error: unknown) => {
        this.toast.apiError(error);
        this.downloadingSignal.set(false);
      },
    });
  }
}
