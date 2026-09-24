import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { DiscountCode, DiscountCodeRequest } from '../models/discount-code.model';

export interface DiscountCodeRepository {
  /** L'API renvoie la liste complete, sans pagination. */
  findAll(): Observable<DiscountCode[]>;
  create(request: DiscountCodeRequest): Observable<DiscountCode>;
  update(id: number, request: DiscountCodeRequest): Observable<DiscountCode>;
  delete(id: number): Observable<void>;
}

export const DISCOUNT_CODE_REPOSITORY = new InjectionToken<DiscountCodeRepository>(
  'DiscountCodeRepository',
);
