import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../../../core/api/api.endpoints';
import { ApiService } from '../../../core/api/api.service';
import { Category, CategoryRequest } from '../domain/models/category.model';
import { CategoryRepository } from '../domain/ports/category-repository.port';

@Injectable()
export class HttpCategoryRepository implements CategoryRepository {
  private readonly api = inject(ApiService);

  findAll(): Observable<Category[]> {
    return this.api.get<Category[]>(API.categories.list);
  }

  findById(id: number): Observable<Category> {
    return this.api.get<Category>(API.categories.byId(id));
  }

  create(request: CategoryRequest): Observable<Category> {
    return this.api.post<Category>(API.categories.create, request);
  }

  update(id: number, request: CategoryRequest): Observable<Category> {
    return this.api.put<Category>(API.categories.byId(id), request);
  }

  delete(id: number): Observable<void> {
    return this.api.delete(API.categories.byId(id));
  }
}
