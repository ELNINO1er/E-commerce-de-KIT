import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../../../core/api/api.endpoints';
import { ApiService } from '../../../core/api/api.service';
import { PageQuery, PageResponse } from '../../../core/api/page-response.model';
import {
  Product,
  ProductCreateRequest,
  ProductFilter,
  ProductUpdateRequest,
  ProductVariant,
  ProductVariantRequest,
} from '../domain/models/product.model';
import { ProductRepository } from '../domain/ports/product-repository.port';

@Injectable()
export class HttpProductRepository implements ProductRepository {
  private readonly api = inject(ApiService);

  search(filter: ProductFilter, page: PageQuery): Observable<PageResponse<Product>> {
    // `ApiService` retire les valeurs nulles ou vides : un filtre non renseigne
    // n'apparait donc pas du tout dans la query string.
    return this.api.getPage<Product>(API.products.list, {
      q: filter.q,
      categoryId: filter.categoryId,
      format: filter.format,
      minPrice: filter.minPrice,
      maxPrice: filter.maxPrice,
      inStock: filter.inStock,
      lowStock: filter.lowStock,
      ...page,
    });
  }

  findById(id: number): Observable<Product> {
    return this.api.get<Product>(API.products.byId(id));
  }

  create(request: ProductCreateRequest): Observable<Product> {
    return this.api.post<Product>(API.products.create, request);
  }

  update(id: number, request: ProductUpdateRequest): Observable<Product> {
    return this.api.put<Product>(API.products.byId(id), request);
  }

  delete(id: number): Observable<void> {
    return this.api.delete(API.products.byId(id));
  }

  addVariant(productId: number, request: ProductVariantRequest): Observable<ProductVariant> {
    return this.api.post<ProductVariant>(API.products.variants(productId), request);
  }

  updateVariant(variantId: number, request: ProductVariantRequest): Observable<ProductVariant> {
    return this.api.put<ProductVariant>(API.variants.byId(variantId), request);
  }

  deleteVariant(variantId: number): Observable<void> {
    return this.api.delete(API.variants.byId(variantId));
  }
}
