import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { CategoryStore } from '../../../categories/application/category.store';
import { STOCK_STATUS_KEYS, STOCK_STATUS_VARIANT } from '../../../../shared/domain/enums';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { DataTable } from '../../../../shared/ui/data-table/data-table';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SearchField } from '../../../../shared/ui/search-field/search-field';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import {
  Product,
  ProductFilter,
  totalStock,
  worstStockStatus,
} from '../../domain/models/product.model';
import { ProductListStore } from '../../application/product-list.store';

@Component({
  selector: 'app-product-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    Icon,
    DataTable,
    SearchField,
    Select,
    ConfirmDialog,
  ],
  templateUrl: './product-list-page.html',
  styleUrl: './product-list-page.scss',
})
export class ProductListPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly store = inject(ProductListStore);
  private readonly categoryStore = inject(CategoryStore);
  private readonly i18n = inject(TranslationService);

  protected readonly products = this.store.products;
  protected readonly page = this.store.page;
  protected readonly loading = this.store.loading;
  protected readonly errorMessage = this.store.error;
  protected readonly hasActiveFilter = this.store.hasActiveFilter;
  /** « Toutes » en tete, puis les categories chargees. */
  protected readonly categoryOptions = computed<SelectOption[]>(() => [
    { value: null, label: this.i18n.t('products.filters.allCategories') },
    ...this.categoryStore.categories().map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ]);

  /** Produit en attente de confirmation de suppression. */
  protected readonly pendingDeletion = signal<Product | null>(null);

  protected readonly deleteMessage = computed(() => {
    const product = this.pendingDeletion();
    return product ? this.i18n.t('products.delete.message', { name: product.name }) : '';
  });

  /**
   * Le terme de recherche vit hors du groupe de filtres : `app-search-field`
   * porte deja son propre anti-rebond, le faire transiter par le formulaire
   * empilerait deux delais.
   */
  protected readonly search = signal('');

  protected readonly filters = this.formBuilder.group({
    categoryId: [null as number | null],
    format: [null as string | null],
    minPrice: [null as number | null],
    maxPrice: [null as number | null],
    inStock: [false],
    lowStock: [false],
  });

  constructor() {
    this.categoryStore.load();

    /*
     * Filtrage automatique, sans bouton de validation.
     *
     * `debounceTime` evite une requete par frappe dans les champs texte et
     * nombre ; `distinctUntilChanged` sur le filtre serialise ecarte les
     * emissions qui ne changent rien (espaces en fin de saisie, champ retouche
     * puis remis a sa valeur).
     */
    this.filters.valueChanges
      .pipe(
        debounceTime(300),
        map(() => JSON.stringify(this.buildFilter())),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.store.applyFilter(this.buildFilter()));

    this.store.load();
  }

  /** Recherche cote **serveur** (`?q=`) : le resultat couvre tout le catalogue. */
  protected onSearch(term: string): void {
    this.search.set(term);
    this.store.applyFilter(this.buildFilter());
  }

  private buildFilter(): ProductFilter {
    const value = this.filters.getRawValue();
    return {
      q: this.search() || null,
      categoryId: value.categoryId ?? null,
      format: value.format?.trim() || null,
      minPrice: value.minPrice ?? null,
      maxPrice: value.maxPrice ?? null,
      // Les cases non cochees ne doivent pas etre envoyees comme `false` : le
      // backend traiterait `inStock=false` comme un filtre actif.
      inStock: value.inStock ? true : null,
      lowStock: value.lowStock ? true : null,
    };
  }

  protected resetFilters(): void {
    // `emitEvent: false` court-circuite l'anti-rebond : la remise a zero est une
    // action explicite, elle doit repondre immediatement.
    this.filters.reset(
      {
        categoryId: null,
        format: null,
        minPrice: null,
        maxPrice: null,
        inStock: false,
        lowStock: false,
      },
      { emitEvent: false },
    );
    this.search.set('');
    this.store.resetFilter();
  }

  /** Tri par prix, calcule cote serveur sur l'ensemble du catalogue. */
  protected readonly sort = this.store.sort;

  protected togglePriceSort(): void {
    this.store.togglePriceSort();
  }

  protected priceSortLabel(): string {
    const current = this.sort();
    if (current === 'priceFrom,asc') {
      return this.i18n.t('products.sort.asc');
    }
    return current === 'priceFrom,desc'
      ? this.i18n.t('products.sort.desc')
      : this.i18n.t('products.sort.none');
  }

  protected goToPage(index: number): void {
    this.store.goToPage(index);
  }

  protected confirmDeletion(): void {
    const product = this.pendingDeletion();
    if (product) {
      this.store.delete(product);
      this.pendingDeletion.set(null);
    }
  }

  protected stockLabel(product: Product): string {
    const status = worstStockStatus(product);
    return status ? this.i18n.t(STOCK_STATUS_KEYS[status]) : this.i18n.t('products.noVariant');
  }

  protected stockVariant(product: Product): string {
    const status = worstStockStatus(product);
    return status ? STOCK_STATUS_VARIANT[status] : 'status--neutral';
  }

  protected stockTotal(product: Product): string {
    return this.i18n.t('products.stockTotal', { count: totalStock(product) });
  }

  protected variantCount(product: Product): string {
    return this.i18n.t('products.variantCount', { count: product.variants.length });
  }

  protected price(product: Product): string {
    return product.priceFrom === null ? '—' : this.i18n.money(product.priceFrom);
  }
}
