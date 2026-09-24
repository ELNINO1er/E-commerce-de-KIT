import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { fieldErrors, problemMessage } from '../../../../core/api/problem-detail';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { TranslationKey } from '../../../../core/i18n/translations.fr';
import {
  DISCOUNT_TYPE_KEYS,
  DISCOUNT_TYPES,
  DiscountType,
} from '../../../../shared/domain/enums';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { DataTable } from '../../../../shared/ui/data-table/data-table';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Modal } from '../../../../shared/ui/modal/modal';
import { matchesSearch } from '../../../../shared/domain/search';
import { SearchField } from '../../../../shared/ui/search-field/search-field';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import {
  DiscountCode,
  DiscountState,
  discountState,
  fromDateInput,
  toDateInput,
} from '../../domain/models/discount-code.model';
import { DiscountCodeStore } from '../../application/discount-code.store';

const STATE_KEYS: Record<DiscountState, TranslationKey> = {
  ACTIVE: 'discounts.state.ACTIVE',
  SCHEDULED: 'discounts.state.SCHEDULED',
  EXPIRED: 'discounts.state.EXPIRED',
  EXHAUSTED: 'discounts.state.EXHAUSTED',
  INACTIVE: 'discounts.state.INACTIVE',
};

/** Variante de pastille `.status--*` par etat. */
const STATE_VARIANT: Record<DiscountState, string> = {
  ACTIVE: 'status--success',
  SCHEDULED: 'status--info',
  EXPIRED: 'status--neutral',
  EXHAUSTED: 'status--neutral',
  INACTIVE: 'status--danger',
};

@Component({
  selector: 'app-discount-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    Icon,
    Modal,
    Select,
    DataTable,
    SearchField,
    ConfirmDialog,
  ],
  templateUrl: './discount-list-page.html',
  styleUrl: './discount-list-page.scss',
})
export class DiscountListPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly store = inject(DiscountCodeStore);
  private readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);

  protected readonly loading = this.store.loading;

  /** Liste complete cote API : le filtrage en memoire est exhaustif. */
  protected readonly search = signal('');
  protected readonly codes = computed(() =>
    this.store.codes().filter((code) => matchesSearch(this.search(), code.code)),
  );
  protected readonly errorMessage = this.store.error;

  protected readonly editing = signal<DiscountCode | 'new' | null>(null);
  protected readonly pendingDeletion = signal<DiscountCode | null>(null);
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

  protected readonly typeOptions = computed<SelectOption[]>(() =>
    DISCOUNT_TYPES.map((value) => ({ value, label: this.i18n.t(DISCOUNT_TYPE_KEYS[value]) })),
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required]],
    type: this.formBuilder.nonNullable.control<DiscountType>('PERCENTAGE', [Validators.required]),
    value: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    active: [true],
    validFrom: [''],
    validUntil: [''],
    minOrderAmount: this.formBuilder.control<number | null>(null),
    maxUses: this.formBuilder.control<number | null>(null),
  });

  protected readonly dialogTitle = computed(() =>
    this.i18n.t(this.editing() === 'new' ? 'discounts.form.new' : 'discounts.form.edit'),
  );

  protected readonly deleteMessage = computed(() => {
    const code = this.pendingDeletion();
    return code ? this.i18n.t('discounts.delete.message', { code: code.code }) : '';
  });

  constructor() {
    this.store.load();
  }

  // --- Rendu de ligne ---

  protected stateLabel(code: DiscountCode): string {
    return this.i18n.t(STATE_KEYS[discountState(code)]);
  }

  protected stateVariant(code: DiscountCode): string {
    return STATE_VARIANT[discountState(code)];
  }

  /** « −10 % » ou « −2 000 FCFA », selon le type. */
  protected valueLabel(code: DiscountCode): string {
    return code.type === 'PERCENTAGE' ? `−${code.value} %` : `−${this.i18n.money(code.value)}`;
  }

  protected validityLabel(code: DiscountCode): string {
    if (!code.validFrom && !code.validUntil) {
      return this.i18n.t('discounts.validity.always');
    }
    const from = code.validFrom ? this.i18n.date(code.validFrom) : '…';
    const until = code.validUntil ? this.i18n.date(code.validUntil) : '…';
    return `${from} → ${until}`;
  }

  protected usageLabel(code: DiscountCode): string {
    return code.maxUses === null
      ? this.i18n.t('discounts.usage.unlimited', { used: code.usedCount })
      : `${code.usedCount} / ${code.maxUses}`;
  }

  protected minOrderLabel(code: DiscountCode): string {
    return code.minOrderAmount === null ? '—' : this.i18n.money(code.minOrderAmount);
  }

  // --- Formulaire ---

  protected openCreate(): void {
    this.formError.set(null);
    this.form.reset({
      code: '',
      type: 'PERCENTAGE',
      value: null,
      active: true,
      validFrom: '',
      validUntil: '',
      minOrderAmount: null,
      maxUses: null,
    });
    this.editing.set('new');
  }

  protected openEdit(code: DiscountCode): void {
    this.formError.set(null);
    this.form.reset({
      code: code.code,
      type: code.type,
      value: code.value,
      active: code.active,
      validFrom: toDateInput(code.validFrom),
      validUntil: toDateInput(code.validUntil),
      minOrderAmount: code.minOrderAmount,
      maxUses: code.maxUses,
    });
    this.editing.set(code);
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
      // Les codes sont saisis en majuscules par convention commerciale.
      code: value.code.trim().toUpperCase(),
      type: value.type,
      value: value.value ?? 0,
      active: value.active,
      validFrom: fromDateInput(value.validFrom),
      validUntil: fromDateInput(value.validUntil, true),
      minOrderAmount: value.minOrderAmount,
      maxUses: value.maxUses,
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
    const code = this.pendingDeletion();
    this.pendingDeletion.set(null);
    if (code) {
      this.store.remove(code.id).subscribe({
        next: () => this.toast.successKey('common.deleted'),
        error: (error: unknown) => this.toast.apiError(error),
      });
    }
  }
}
