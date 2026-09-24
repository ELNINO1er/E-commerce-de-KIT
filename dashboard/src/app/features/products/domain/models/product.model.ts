import { Category } from '../../../categories/domain/models/category.model';
import { StockStatus } from '../../../../shared/domain/enums';

/** Une declinaison vendable : un format, son prix et son stock (`ProductVariantResponse`). */
export interface ProductVariant {
  id: number;
  /** Libelle du conditionnement : « 250 g », « 1 kg », « 250 ml »… */
  format: string;
  price: number;
  stock: number;
  /** Seuil en dessous duquel l'API bascule `stockStatus` sur `LOW_STOCK`. */
  lowStockThreshold: number;
  /** Calcule par l'API — ne jamais le recalculer cote front. */
  stockStatus: StockStatus;
}

/** Produit du catalogue (`ProductResponse`). */
export interface Product {
  id: number;
  name: string;
  /**
   * Identifiant lisible derive du nom, fige a la creation : l'API ne le
   * regenere pas lors d'une modification. C'est lui que la boutique met dans
   * ses URL produit.
   */
  slug: string;
  description: string | null;
  /** Chemin servi par le front (`/images/…`) ou URL absolue renvoyee par l'upload. */
  imageUrl: string | null;
  category: Category;
  /** Prix de la variante la moins chere ; `null` si le produit n'a aucune variante. */
  priceFrom: number | null;
  variants: ProductVariant[];
}

/** Corps d'une variante en creation ou modification (`ProductVariantRequest`). */
export interface ProductVariantRequest {
  format: string;
  price: number;
  stock: number;
  /** Defaut serveur : 10. */
  lowStockThreshold?: number;
}

/** Creation : le produit **et** ses variantes en un seul appel. */
export interface ProductCreateRequest {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  categoryId: number;
  variants: ProductVariantRequest[];
}

/** Modification : les variantes sont gerees par leurs propres endpoints. */
export interface ProductUpdateRequest {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  categoryId: number;
}

/** Filtres acceptes par `GET /api/products`. */
export interface ProductFilter {
  /** Recherche libre dans le nom et la description. */
  q?: string | null;
  categoryId?: number | null;
  /**
   * Format exact d'une variante (« 250 g »). La correspondance est **stricte** :
   * « 250g » ne trouve rien. L'API n'expose aucune liste de formats existants,
   * d'ou un champ libre plutot qu'une liste deroulante.
   */
  format?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  /** Uniquement les produits ayant au moins une variante en stock. */
  inStock?: boolean | null;
  /** Uniquement ceux ayant une variante sous le seuil d'alerte. */
  lowStock?: boolean | null;
}

export const EMPTY_FILTER: ProductFilter = {
  q: null,
  categoryId: null,
  format: null,
  minPrice: null,
  maxPrice: null,
  inStock: null,
  lowStock: null,
};

/**
 * Tris acceptes par la liste.
 *
 * `priceFrom` n'est pas une colonne — l'API le calcule a partir des variantes
 * et traduit elle-meme ce tri. Les autres champs calcules ne sont pas
 * triables : n'en ajoute pas sans l'avoir verifie cote serveur.
 */
export type ProductSort = 'id,desc' | 'priceFrom,asc' | 'priceFrom,desc';

/** Sens suivant au clic sur l'en-tete de prix : croissant → decroissant → aucun. */
export function nextPriceSort(current: ProductSort): ProductSort {
  if (current === 'priceFrom,asc') {
    return 'priceFrom,desc';
  }
  return current === 'priceFrom,desc' ? 'id,desc' : 'priceFrom,asc';
}

/** Etat de stock le plus critique parmi les variantes — sert de pastille de ligne. */
export function worstStockStatus(product: Product): StockStatus | null {
  if (!product.variants.length) {
    return null;
  }
  if (product.variants.some((variant) => variant.stockStatus === 'OUT_OF_STOCK')) {
    return 'OUT_OF_STOCK';
  }
  if (product.variants.some((variant) => variant.stockStatus === 'LOW_STOCK')) {
    return 'LOW_STOCK';
  }
  return 'IN_STOCK';
}

/** Stock cumule, toutes variantes confondues. */
export function totalStock(product: Product): number {
  return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
}
