import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { fieldErrors, problemMessage } from '../../../../core/api/problem-detail';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { CategoryStore } from '../../../categories/application/category.store';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import {
  Product,
  ProductVariant,
  ProductVariantRequest,
} from '../../domain/models/product.model';
import { MEDIA_REPOSITORY } from '../../domain/ports/media-repository.port';
import { PRODUCT_REPOSITORY } from '../../domain/ports/product-repository.port';
import { forkJoin, Observable } from 'rxjs';

/** Une ligne de format dans le formulaire. `id` a `null` = format pas encore cree. */
type VariantGroup = FormGroup<{
  id: FormControl<number | null>;
  format: FormControl<string>;
  price: FormControl<number>;
  stock: FormControl<number>;
  lowStockThreshold: FormControl<number>;
}>;

@Component({
  selector: 'app-product-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, Icon, Select, Skeleton, ConfirmDialog],
  templateUrl: './product-form-page.html',
  styleUrl: './product-form-page.scss',
})
export class ProductFormPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly repository = inject(PRODUCT_REPOSITORY);
  private readonly media = inject(MEDIA_REPOSITORY);
  private readonly categoryStore = inject(CategoryStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);

  /** `null` en création ; l'identifiant du produit en modification. */
  protected readonly productId = signal<number | null>(null);
  protected readonly isEdit = computed(() => this.productId() !== null);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly pendingVariantRemoval = signal<{ index: number; format: string } | null>(null);

  protected readonly categoryOptions = computed<SelectOption[]>(() =>
    this.categoryStore.categories().map((category) => ({
      value: category.id,
      label: category.name,
    })),
  );

  private readonly error = signal<unknown>(null);
  protected readonly errorMessage = computed(() => {
    const raw = this.error();
    return raw
      ? problemMessage(raw, {
          network: this.i18n.t('error.network'),
          unexpected: this.i18n.t('error.unexpected'),
        })
      : null;
  });
  /** Erreurs de validation renvoyées champ par champ par l'API. */
  protected readonly serverFieldErrors = computed(() => fieldErrors(this.error()));

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    description: [''],
    imageUrl: [''],
    categoryId: this.formBuilder.control<number | null>(null, [Validators.required]),
    variants: this.formBuilder.array<VariantGroup>([]),
  });

  protected readonly variants = this.form.controls.variants;

  protected readonly variantRemovalMessage = computed(() => {
    const pending = this.pendingVariantRemoval();
    return pending
      ? this.i18n.t('products.variants.delete.message', { format: pending.format })
      : '';
  });

  constructor() {
    this.categoryStore.load();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productId.set(Number(id));
      this.fetch(Number(id));
    } else {
      // En création, une première ligne de format est offerte : l'API en exige au moins un.
      this.variants.push(this.newVariantGroup());
    }
  }

  // --- Formats -------------------------------------------------------------

  protected addVariant(): void {
    this.variants.push(this.newVariantGroup());
  }

  /**
   * En création, retirer une ligne suffit. En modification, un format déjà
   * enregistré doit être supprimé côté serveur — d'où la confirmation.
   */
  protected requestVariantRemoval(index: number): void {
    const group = this.variants.at(index);
    const variantId = group.controls.id.value;

    if (variantId === null) {
      this.variants.removeAt(index);
      return;
    }
    this.pendingVariantRemoval.set({ index, format: group.controls.format.value });
  }

  protected confirmVariantRemoval(): void {
    const pending = this.pendingVariantRemoval();
    this.pendingVariantRemoval.set(null);
    if (!pending) {
      return;
    }

    const group = this.variants.at(pending.index);
    const variantId = group.controls.id.value;
    if (variantId === null) {
      this.variants.removeAt(pending.index);
      return;
    }

    this.repository.deleteVariant(variantId).subscribe({
      next: () => this.variants.removeAt(pending.index),
      // L'API refuse la suppression du dernier format et le dit explicitement.
      error: (error: unknown) => this.toast.apiError(error),
    });
  }

  // --- Image ---------------------------------------------------------------

  protected onImagePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.uploading.set(true);
    this.media.uploadImage(file).subscribe({
      next: (uploaded) => {
        // L'API renvoie une URL absolue : elle part telle quelle dans `imageUrl`.
        this.form.controls.imageUrl.setValue(uploaded.url);
        this.form.controls.imageUrl.markAsDirty();
        this.uploading.set(false);
        input.value = '';
      },
      error: (error: unknown) => {
        // 413 quand le fichier depasse 5 Mo : le backend precise la limite.
        this.toast.apiError(error);
        this.uploading.set(false);
        input.value = '';
      },
    });
  }

  protected removeImage(): void {
    this.form.controls.imageUrl.setValue('');
    this.form.controls.imageUrl.markAsDirty();
  }

  // --- Enregistrement ------------------------------------------------------

  protected submit(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      // `markAllAsTouched` descend jusqu'aux lignes de format : c'est ce qui
      // fait apparaitre leurs messages. Le toast evite en plus qu'un clic sur
      // « Enregistrer » reste sans effet visible quand le champ fautif est
      // hors de l'ecran.
      this.form.markAllAsTouched();
      this.toast.error(this.i18n.t('products.form.invalid'));
      return;
    }

    const value = this.form.getRawValue();
    const base = {
      name: value.name.trim(),
      description: value.description.trim() || null,
      imageUrl: value.imageUrl.trim() || null,
      categoryId: value.categoryId as number,
    };

    this.saving.set(true);
    this.error.set(null);

    const id = this.productId();
    if (id === null) {
      this.repository
        .create({
          ...base,
          variants: this.variants.controls.map((group) => this.toVariantRequest(group)),
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.toast.successKey('products.form.created');
            this.closeForm();
          },
          error: (error: unknown) => {
            this.error.set(error);
            this.saving.set(false);
          },
        });
      return;
    }

    this.repository.update(id, base).subscribe({
      next: () => this.saveEditedVariants(id),
      error: (error: unknown) => {
        this.error.set(error);
        this.saving.set(false);
      },
    });
  }

  /** Le bouton principal enregistre maintenant le produit et tous ses formats. */
  private saveEditedVariants(productId: number): void {
    const calls: Observable<ProductVariant>[] = this.variants.controls
      .filter((group) => group.dirty || group.controls.id.value === null)
      .map((group) => {
        const variantId = group.controls.id.value;
        const request = this.toVariantRequest(group);
        return variantId === null
          ? this.repository.addVariant(productId, request)
          : this.repository.updateVariant(variantId, request);
      });

    if (!calls.length) {
      this.finishUpdate();
      return;
    }

    forkJoin(calls).subscribe({
      next: () => this.finishUpdate(),
      error: (error: unknown) => {
        this.error.set(error);
        this.saving.set(false);
        this.toast.apiError(error);
      },
    });
  }

  private finishUpdate(): void {
    this.saving.set(false);
    this.form.markAsPristine();
    this.toast.successKey('products.form.updated');
    this.closeForm();
  }

  /** Enregistrement reussi : on referme le formulaire sur la liste. */
  private closeForm(): void {
    void this.router.navigate(['/produits']);
  }

  // --- Interne -------------------------------------------------------------

  private fetch(id: number): void {
    this.loading.set(true);
    this.repository.findById(id).subscribe({
      next: (product) => {
        this.patch(product);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  private patch(product: Product): void {
    this.form.patchValue({
      name: product.name,
      description: product.description ?? '',
      imageUrl: product.imageUrl ?? '',
      categoryId: product.category.id,
    });
    this.variants.clear();
    for (const variant of product.variants) {
      this.variants.push(this.newVariantGroup(variant));
    }
  }

  private newVariantGroup(variant?: ProductVariant): VariantGroup {
    return this.formBuilder.nonNullable.group({
      id: this.formBuilder.control<number | null>(variant?.id ?? null),
      format: [variant?.format ?? '', [Validators.required]],
      // L'API manipule des centimes, mais l'administrateur saisit un montant en euros.
      price: [variant ? variant.price / 100 : 0, [Validators.required, Validators.min(0)]],
      stock: [variant?.stock ?? 0, [Validators.required, Validators.min(0)]],
      lowStockThreshold: [variant?.lowStockThreshold ?? 10, [Validators.min(0)]],
    }) as VariantGroup;
  }

  private toVariantRequest(group: VariantGroup): ProductVariantRequest {
    const value = group.getRawValue();
    return {
      format: value.format.trim(),
      // Convertit 4,50 € en 450 centimes et evite les erreurs binaires des decimales.
      price: Math.round(Number(value.price) * 100),
      stock: Number(value.stock),
      lowStockThreshold: Number(value.lowStockThreshold),
    };
  }

}
