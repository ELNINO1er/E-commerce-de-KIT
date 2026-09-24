import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import {
  RETURN_STATUS_KEYS,
  RETURN_STATUS_VARIANT,
  RETURN_STATUSES,
  RETURN_TYPE_KEYS,
  ReturnStatus,
} from '../../../../shared/domain/enums';
import { DataTable } from '../../../../shared/ui/data-table/data-table';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Modal } from '../../../../shared/ui/modal/modal';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { ReturnRequest } from '../../domain/models/return-request.model';
import { ReturnListStore } from '../../application/return-list.store';

@Component({
  selector: 'app-return-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, Icon, DataTable, Select, Modal],
  templateUrl: './return-list-page.html',
  styleUrl: './return-list-page.scss',
})
export class ReturnListPage {
  private readonly store = inject(ReturnListStore);
  private readonly i18n = inject(TranslationService);

  protected readonly requests = this.store.requests;
  protected readonly page = this.store.page;
  protected readonly loading = this.store.loading;
  protected readonly saving = this.store.saving;
  protected readonly errorMessage = this.store.error;
  protected readonly status = this.store.status;

  /** Demande en cours de traitement — porte aussi l'ouverture de la fenetre. */
  protected readonly editing = signal<ReturnRequest | null>(null);

  protected readonly filterControl = new FormControl<ReturnStatus | null>(null);
  protected readonly statusControl = new FormControl<ReturnStatus | null>(null);

  protected readonly filterOptions = computed<SelectOption[]>(() => [
    { value: null, label: this.i18n.t('returns.filters.allStatuses') },
    ...RETURN_STATUSES.map((value) => ({ value, label: this.i18n.t(RETURN_STATUS_KEYS[value]) })),
  ]);
  protected readonly statusOptions = computed<SelectOption[]>(() =>
    RETURN_STATUSES.map((value) => ({ value, label: this.i18n.t(RETURN_STATUS_KEYS[value]) })),
  );

  constructor() {
    this.filterControl.valueChanges
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((status) => this.store.filterByStatus(status ?? null));
    this.store.load();
  }

  protected open(request: ReturnRequest): void {
    this.editing.set(request);
    this.statusControl.setValue(request.status);
  }

  protected close(): void {
    this.editing.set(null);
  }

  protected apply(): void {
    const request = this.editing();
    const status = this.statusControl.value;
    if (!request || !status || status === request.status) {
      return;
    }
    this.store.updateStatus(request.id, status, () => this.close());
  }

  protected goToPage(index: number): void {
    this.store.goToPage(index);
  }

  protected typeLabel(request: ReturnRequest): string {
    return this.i18n.t(RETURN_TYPE_KEYS[request.type]);
  }

  protected statusLabel(request: ReturnRequest): string {
    return this.i18n.t(RETURN_STATUS_KEYS[request.status]);
  }

  protected statusVariant(request: ReturnRequest): string {
    return RETURN_STATUS_VARIANT[request.status];
  }

  protected date(request: ReturnRequest): string {
    return this.i18n.dateTime(request.createdAt);
  }
}
