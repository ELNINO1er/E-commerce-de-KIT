import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { PageQuery, PageResponse } from '../../../../core/api/page-response.model';
import {
  Product,
  ProductCreateRequest,
  ProductFilter,
  ProductUpdateRequest,
  ProductVariant,
  ProductVariantRequest,
} from '../models/product.model';

export interface ProductRepository {
  search(filter: ProductFilter, page: PageQuery): Observable<PageResponse<Product>>;
  findById(id: number): Observable<Product>;
  /** Cree le produit **et** ses variantes en un appel. */
  create(request: ProductCreateRequest): Observable<Product>;
  /** Ne touche pas aux variantes : elles ont leurs propres operations. */
  update(id: number, request: ProductUpdateRequest): Observable<Product>;
  delete(id: number): Observable<void>;

  addVariant(productId: number, request: ProductVariantRequest): Observable<ProductVariant>;
  updateVariant(variantId: number, request: ProductVariantRequest): Observable<ProductVariant>;
  /** L'API refuse la suppression de la derniere variante d'un produit (409). */
  deleteVariant(variantId: number): Observable<void>;
}

export const PRODUCT_REPOSITORY = new InjectionToken<ProductRepository>('ProductRepository');
