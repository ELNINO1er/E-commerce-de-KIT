import { computed, inject, Injectable, signal } from '@angular/core';
import { PageResponse } from '../../../core/api/page-response.model';
import { problemMessage } from '../../../core/api/problem-detail';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ReturnStatus } from '../../../shared/domain/enums';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ReturnRequest } from '../domain/models/return-request.model';
import { RETURN_REPOSITORY } from '../domain/ports/return-repository.port';

const PAGE_SIZE = 20;

/** Etat de la liste des demandes de retour : filtre de statut, pagination. */
@Injectable()
export class ReturnListStore {
  private readonly repository = inject(RETURN_REPOSITORY);
  private readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);

  private readonly pageSignal = signal<PageResponse<ReturnRequest> | null>(null);
  private readonly statusSignal = signal<ReturnStatus | null>(null);
  private readonly pageIndexSignal = signal(0);
  private readonly loadingSignal = signal(false);
  private readonly savingSignal = signal(false);
  private readonly errorSignal = signal<unknown>(null);

  readonly page = this.pageSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly saving = this.savingSignal.asReadonly();
  readonly requests = computed(() => this.pageSignal()?.content ?? []);
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
      .search(this.statusSignal(), {
        page: this.pageIndexSignal(),
        size: PAGE_SIZE,
        // Les demandes les plus recentes d'abord : ce sont celles a traiter.
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

  filterByStatus(status: ReturnStatus | null): void {
    this.statusSignal.set(status);
    this.pageIndexSignal.set(0);
    this.load();
  }

  goToPage(index: number): void {
    this.pageIndexSignal.set(index);
    this.load();
  }

  /**
   * Applique un statut puis recharge la page courante.
   *
   * Recharger plutot que remplacer la ligne en memoire : un filtre de statut
   * actif doit faire disparaitre la demande qui n'y correspond plus.
   */
  updateStatus(id: number, status: ReturnStatus, onDone: () => void): void {
    if (this.savingSignal()) {
      return;
    }
    this.savingSignal.set(true);

    this.repository.updateStatus(id, status).subscribe({
      next: () => {
        this.savingSignal.set(false);
        this.toast.success(this.i18n.t('returns.statusUpdated'));
        onDone();
        this.load();
      },
      error: (error: unknown) => {
        this.savingSignal.set(false);
        this.toast.apiError(error);
      },
    });
  }
}
