import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../../../core/api/api.endpoints';
import { ApiService } from '../../../core/api/api.service';
import { DiscountCode, DiscountCodeRequest } from '../domain/models/discount-code.model';
import { DiscountCodeRepository } from '../domain/ports/discount-code-repository.port';

@Injectable()
export class HttpDiscountCodeRepository implements DiscountCodeRepository {
  private readonly api = inject(ApiService);

  findAll(): Observable<DiscountCode[]> {
    return this.api.get<DiscountCode[]>(API.admin.discountCodes.list);
  }

  create(request: DiscountCodeRequest): Observable<DiscountCode> {
    return this.api.post<DiscountCode>(API.admin.discountCodes.create, request);
  }

  update(id: number, request: DiscountCodeRequest): Observable<DiscountCode> {
    return this.api.put<DiscountCode>(API.admin.discountCodes.byId(id), request);
  }

  delete(id: number): Observable<void> {
    return this.api.delete(API.admin.discountCodes.byId(id));
  }
}
