import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { fieldErrors, problemMessage } from '../../../../core/api/problem-detail';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { DataTable } from '../../../../shared/ui/data-table/data-table';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Modal } from '../../../../shared/ui/modal/modal';
import { matchesSearch } from '../../../../shared/domain/search';
import { SearchField } from '../../../../shared/ui/search-field/search-field';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { DeliveryZone } from '../../domain/models/delivery-zone.model';
import { DeliveryZoneStore } from '../../application/delivery-zone.store';

/**
 * Le backend valide chaque delai isolement (`@Positive`) mais jamais leur ordre.
 * Une zone « 3 a 1 jours » passerait donc, et s'afficherait telle quelle au
 * client. On barre ici ce qui n'a pas de sens.
 */
function daysRangeValidator(group: AbstractControl): ValidationErrors | null {
  const min = group.get('estimatedDaysMin')?.value as number | null;
  const max = group.get('estimatedDaysMax')?.value as number | null;
  if (min === null || max === null) {
    return null;
  }
  return max < min ? { daysRange: true } : null;
}

@Component({
  selector: 'app-delivery-zone-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    Icon,
    Modal,
    DataTable,
    SearchField,
    ConfirmDialog,
  ],
  templateUrl: './delivery-zone-list-page.html',
  styleUrl: './delivery-zone-list-page.scss',
})
export class DeliveryZoneListPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly store = inject(DeliveryZoneStore);
  private readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);

  protected readonly loading = this.store.loading;

  /** Liste complete cote API : le filtrage en memoire est exhaustif. */
  protected readonly search = signal('');
  protected readonly zones = computed(() =>
    this.store.zones().filter((zone) => matchesSearch(this.search(), zone.name, zone.city)),
  );
  protected readonly errorMessage = this.store.error;

  protected readonly editing = signal<DeliveryZone | 'new' | null>(null);
  protected readonly pendingDeletion = signal<DeliveryZone | null>(null);
  protected readonly saving = signal(false);

  private readonly formError = signal<unknown>(null);
  protected readonly formErrorMessage = computed(() => {
    const raw = this.formError();
    return raw
      ? problemMessage(raw, {
          network: this.i18n.t('error.network'),
          unexpected: this.i18n.t('error.unexpected'),
        })
      : null;
  });
  protected readonly serverFieldErrors = computed(() => fieldErrors(this.formError()));

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      name: ['', [Validators.required]],
      city: ['', [Validators.required]],
      fee: this.formBuilder.control<number | null>(null, [
        Validators.required,
        Validators.min(0),
      ]),
      estimatedDaysMin: this.formBuilder.control<number | null>(1, [
        Validators.required,
        Validators.min(1),
      ]),
      estimatedDaysMax: this.formBuilder.control<number | null>(2, [
        Validators.required,
        Validators.min(1),
      ]),
      active: [true],
    },
    { validators: daysRangeValidator },
  );

  protected readonly dialogTitle = computed(() =>
    this.i18n.t(this.editing() === 'new' ? 'delivery.form.new' : 'delivery.form.edit'),
  );

  protected readonly deleteMessage = computed(() => {
    const zone = this.pendingDeletion();
    return zone ? this.i18n.t('delivery.delete.message', { name: zone.name }) : '';
  });

  constructor() {
    this.store.load();
  }

  /** `0` s'annonce « Livraison offerte », pas « 0 FCFA ». */
  protected feeLabel(zone: DeliveryZone): string {
    return zone.fee === 0 ? this.i18n.t('delivery.free') : this.i18n.money(zone.fee);
  }

  protected stateLabel(zone: DeliveryZone): string {
    return this.i18n.t(zone.active ? 'delivery.state.active' : 'delivery.state.inactive');
  }

  protected openCreate(): void {
    this.formError.set(null);
    this.form.reset({
      name: '',
      city: '',
      fee: null,
      estimatedDaysMin: 1,
      estimatedDaysMax: 2,
      active: true,
    });
    this.editing.set('new');
  }

  protected openEdit(zone: DeliveryZone): void {
    this.formError.set(null);
    this.form.reset({
      name: zone.name,
      city: zone.city,
      fee: zone.fee,
      estimatedDaysMin: zone.estimatedDaysMin,
      estimatedDaysMax: zone.estimatedDaysMax,
      active: zone.active,
    });
    this.editing.set(zone);
  }

  protected close(): void {
    this.editing.set(null);
    this.saving.set(false);
  }

  protected submit(): void {
    const current = this.editing();
    if (this.form.invalid || this.saving() || current === null) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request = {
      name: value.name.trim(),
      city: value.city.trim(),
      fee: value.fee ?? 0,
      estimatedDaysMin: value.estimatedDaysMin ?? 1,
      estimatedDaysMax: value.estimatedDaysMax ?? 1,
      active: value.active,
    };

    this.saving.set(true);
    this.formError.set(null);

    const call =
      current === 'new' ? this.store.create(request) : this.store.update(current.id, request);

    call.subscribe({
      next: () => {
        this.close();
        this.toast.successKey('common.saved');
      },
      error: (error: unknown) => {
        this.formError.set(error);
        this.saving.set(false);
      },
    });
  }

  protected confirmDeletion(): void {
    const zone = this.pendingDeletion();
    this.pendingDeletion.set(null);
    if (zone) {
      this.store.remove(zone.id).subscribe({
        next: () => this.toast.successKey('common.deleted'),
        error: (error: unknown) => this.toast.apiError(error),
      });
    }
  }
}
