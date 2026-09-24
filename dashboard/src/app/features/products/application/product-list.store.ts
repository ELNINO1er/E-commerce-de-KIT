import { computed, inject, Injectable, signal } from '@angular/core';
import { problemMessage } from '../../../core/api/problem-detail';
import { PageResponse } from '../../../core/api/page-response.model';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import {
  EMPTY_FILTER,
  nextPriceSort,
  Product,
  ProductFilter,
  ProductSort,
} from '../domain/models/product.model';
import { PRODUCT_REPOSITORY } from '../domain/ports/product-repository.port';

const PAGE_SIZE = 20;

/**
 * Etat de l'ecran « Produits » : filtres, pagination et resultats.
 *
 * Fourni au niveau de la route (pas en racine) : quitter l'ecran remet a zero
 * filtres et page, ce qui est le comportement attendu d'une recherche.
 */
@Injectable()
export class ProductListStore {
  private readonly repository = inject(PRODUCT_REPOSITORY);
  private readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);

  private readonly pageSignal = signal<PageResponse<Product> | null>(null);
  private readonly filterSignal = signal<ProductFilter>(EMPTY_FILTER);
  private readonly sortSignal = signal<ProductSort>('id,desc');
  private readonly pageIndexSignal = signal(0);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<unknown>(null);

  readonly page = this.pageSignal.asReadonly();
  readonly filter = this.filterSignal.asReadonly();
  readonly sort = this.sortSignal.asReadonly();
  readonly pageIndex = this.pageIndexSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  readonly products = computed(() => this.pageSignal()?.content ?? []);
  readonly error = computed(() => {
    const raw = this.errorSignal();
    return raw
      ? problemMessage(raw, {
          network: this.i18n.t('error.network'),
          unexpected: this.i18n.t('error.unexpected'),
        })
      : null;
  });

  /** Au moins un filtre est renseigne — sert a proposer la reinitialisation. */
  readonly hasActiveFilter = computed(() =>
    Object.values(this.filterSignal()).some((value) => value !== null && value !== ''),
  );

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.repository
      .search(this.filterSignal(), {
        page: this.pageIndexSignal(),
        size: PAGE_SIZE,
        sort: this.sortSignal(),
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

  /** Tout changement de filtre ramene a la premiere page. */
  applyFilter(filter: ProductFilter): void {
    this.filterSignal.set(filter);
    this.pageIndexSignal.set(0);
    this.load();
  }

  resetFilter(): void {
    this.applyFilter(EMPTY_FILTER);
  }

  /**
   * Bascule le tri par prix. Il est **calcule par le serveur** : trier la page
   * recue n'ordonnerait que vingt produits sur l'ensemble du catalogue.
   */
  togglePriceSort(): void {
    this.sortSignal.update(nextPriceSort);
    this.pageIndexSignal.set(0);
    this.load();
  }

  goToPage(index: number): void {
    this.pageIndexSignal.set(index);
    this.load();
  }

  delete(product: Product): void {
    this.repository.delete(product.id).subscribe({
      next: () => {
        // Supprimer le dernier element d'une page laisserait une page vide :
        // on recule d'un cran avant de recharger.
        const remaining = this.products().length - 1;
        if (remaining === 0 && this.pageIndexSignal() > 0) {
          this.pageIndexSignal.update((index) => index - 1);
        }
        this.load();
        this.toast.successKey('products.deleted');
      },
      // Suppression refusee (produit reference par une commande, par exemple) :
      // le backend precise laquelle, on relaie son message.
      error: (error: unknown) => this.toast.apiError(error),
    });
  }
}
