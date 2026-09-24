import { computed, inject, Injectable, signal } from '@angular/core';
import { PageResponse } from '../../../core/api/page-response.model';
import { problemMessage } from '../../../core/api/problem-detail';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { OrderStatus } from '../../../shared/domain/order-status';
import { Order } from '../domain/models/order.model';
import { ORDER_REPOSITORY } from '../domain/ports/order-repository.port';

const PAGE_SIZE = 20;

/** Etat de la liste des commandes : filtre de statut, pagination, export. */
@Injectable()
export class OrderListStore {
  private readonly repository = inject(ORDER_REPOSITORY);
  private readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);

  private readonly pageSignal = signal<PageResponse<Order> | null>(null);
  private readonly statusSignal = signal<OrderStatus | null>(null);
  private readonly termSignal = signal('');
  private readonly pageIndexSignal = signal(0);
  private readonly loadingSignal = signal(false);
  private readonly exportingSignal = signal(false);
  private readonly errorSignal = signal<unknown>(null);

  readonly page = this.pageSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly term = this.termSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly exporting = this.exportingSignal.asReadonly();
  readonly orders = computed(() => this.pageSignal()?.content ?? []);
  readonly error = computed(() => {
    const raw = this.errorSignal();
    return raw
      ? problemMessage(raw, {
          network: this.i18n.t('error.network'),
          unexpected: this.i18n.t('error.unexpected'),
        })
      : null;
  });

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.repository
      .search(this.statusSignal(), this.termSignal() || null, {
        page: this.pageIndexSignal(),
        size: PAGE_SIZE,
        // Les commandes les plus recentes d'abord : c'est sur elles qu'on agit.
        sort: 'id,desc',
      })
      .subscribe({
        next: (page) => {
          this.pageSignal.set(page);
          this.loadingSignal.set(false);
        },
        error: (error: unknown) => {
          this.errorSignal.set(error);
          this.loadingSignal.set(false);
        },
      });
  }

  filterByStatus(status: OrderStatus | null): void {
    this.statusSignal.set(status);
    this.pageIndexSignal.set(0);
    this.load();
  }

  /**
   * Recherche **serveur** (`?q=`) : elle porte sur toutes les commandes, pas
   * seulement sur la page affichee. Le retour a la premiere page est
   * indispensable — rester page 3 sur un resultat qui en compte une donnerait
   * une liste vide.
   */
  searchBy(term: string): void {
    this.termSignal.set(term);
    this.pageIndexSignal.set(0);
    this.load();
  }

  goToPage(index: number): void {
    this.pageIndexSignal.set(index);
    this.load();
  }

  /** Export CSV de **toutes** les commandes — le filtre courant ne s'y applique pas. */
  exportCsv(): void {
    if (this.exportingSignal()) {
      return;
    }
    this.exportingSignal.set(true);

    this.repository.exportCsv().subscribe({
      next: () => this.exportingSignal.set(false),
      error: (error: unknown) => {
        this.toast.apiError(error);
        this.exportingSignal.set(false);
      },
    });
  }
}
