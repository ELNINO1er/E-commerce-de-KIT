import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Category, CategoryRequest } from '../models/category.model';

export interface CategoryRepository {
  /** L'API renvoie la liste complete, sans pagination. */
  findAll(): Observable<Category[]>;
  findById(id: number): Observable<Category>;
  create(request: CategoryRequest): Observable<Category>;
  update(id: number, request: CategoryRequest): Observable<Category>;
  /** 409 `CONFLICT` si la categorie est encore referencee par un produit. */
  delete(id: number): Observable<void>;
}

export const CATEGORY_REPOSITORY = new InjectionToken<CategoryRepository>('CategoryRepository');
