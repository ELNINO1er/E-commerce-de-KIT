import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { problemMessage } from '../../../../core/api/problem-detail';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { STOCK_STATUS_KEYS, STOCK_STATUS_VARIANT } from '../../../../shared/domain/enums';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Product, ProductVariant, totalStock } from '../../domain/models/product.model';
import { PRODUCT_REPOSITORY } from '../../domain/ports/product-repository.port';

/** Fiche produit en lecture seule : ce que l'admin consulte avant d'agir. */
@Component({
  selector: 'app-product-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, Icon, Skeleton, ConfirmDialog],
  templateUrl: './product-detail-page.html',
  styleUrl: './product-detail-page.scss',
})
export class ProductDetailPage {
  private readonly repository = inject(PRODUCT_REPOSITORY);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);

  protected readonly product = signal<Product | null>(null);
  protected readonly loading = signal(true);
  protected readonly confirmingDeletion = signal(false);

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

  protected readonly editLink = computed(() => {
    const product = this.product();
    return product ? ['/produits', product.id, 'modifier'] : ['/produits'];
  });

  protected readonly stockTotal = computed(() => {
    const product = this.product();
    return product ? this.i18n.t('products.stockTotal', { count: totalStock(product) }) : '';
  });

  protected readonly deleteMessage = computed(() => {
    const product = this.product();
    return product ? this.i18n.t('products.delete.message', { name: product.name }) : '';
  });

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.repository.findById(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  protected price(value: number | null): string {
    return value === null ? '—' : this.i18n.money(value);
  }

  protected stockLabel(variant: ProductVariant): string {
    return this.i18n.t(STOCK_STATUS_KEYS[variant.stockStatus]);
  }

  protected stockVariant(variant: ProductVariant): string {
    return STOCK_STATUS_VARIANT[variant.stockStatus];
  }

  protected confirmDeletion(): void {
    const product = this.product();
    this.confirmingDeletion.set(false);
    if (!product) {
      return;
    }

    this.repository.delete(product.id).subscribe({
      next: () => {
        this.toast.successKey('products.deleted');
        void this.router.navigate(['/produits']);
      },
      error: (error: unknown) => this.toast.apiError(error),
    });
  }
}
