import { computed, inject, Injectable, signal } from '@angular/core';
import { PageResponse } from '../../../core/api/page-response.model';
import { problemMessage } from '../../../core/api/problem-detail';
import { TranslationService } from '../../../core/i18n/translation.service';
import { AuditFilter, EMPTY_AUDIT_FILTER } from '../domain/models/audit-filter.model';
import { AuditLog } from '../domain/models/audit-log.model';
import { AUDIT_LOG_REPOSITORY } from '../domain/ports/audit-log-repository.port';

const PAGE_SIZE = 25;

@Injectable()
export class AuditLogStore {
  private readonly repository = inject(AUDIT_LOG_REPOSITORY);
  private readonly i18n = inject(TranslationService);

  private readonly pageSignal = signal<PageResponse<AuditLog> | null>(null);
  private readonly filterSignal = signal<AuditFilter>(EMPTY_AUDIT_FILTER);
  private readonly pageIndexSignal = signal(0);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<unknown>(null);

  readonly page = this.pageSignal.asReadonly();
  readonly filter = this.filterSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  /** Un filtre est actif : distingue « rien ne correspond » de « journal vide ». */
  readonly filtered = computed(() => Object.values(this.filterSignal()).some(Boolean));
  readonly logs = computed(() => this.pageSignal()?.content ?? []);
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

    // Le tri est deja decroissant cote serveur ; on le redit pour ne pas
    // dependre d'un defaut qui pourrait changer.
    this.repository
      .search(this.filterSignal(), {
        page: this.pageIndexSignal(),
        size: PAGE_SIZE,
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

  /**
   * Applique un filtre et revient a la premiere page — rester page 4 sur un
   * resultat qui en compte une donnerait une liste vide.
   */
  applyFilter(filter: AuditFilter): void {
    this.filterSignal.set(filter);
    this.pageIndexSignal.set(0);
    this.load();
  }

  goToPage(index: number): void {
    this.pageIndexSignal.set(index);
    this.load();
  }
}
