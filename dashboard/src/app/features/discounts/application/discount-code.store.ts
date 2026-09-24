import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { problemMessage } from '../../../core/api/problem-detail';
import { TranslationService } from '../../../core/i18n/translation.service';
import { DiscountCode, DiscountCodeRequest } from '../domain/models/discount-code.model';
import { DISCOUNT_CODE_REPOSITORY } from '../domain/ports/discount-code-repository.port';

@Injectable()
export class DiscountCodeStore {
  private readonly repository = inject(DISCOUNT_CODE_REPOSITORY);
  private readonly i18n = inject(TranslationService);

  private readonly codesSignal = signal<DiscountCode[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<unknown>(null);

  readonly codes = this.codesSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = computed(() => {
    const raw = this.errorSignal();
    return raw
      ? problemMessage(raw, {
          network: this.i18n.t('error.network'),
          unexpected: this.i18n.t('error.unexpected'),
        })
      : null;
  });

  load(): void {
    this.fetch().subscribe({ error: (error: unknown) => this.errorSignal.set(error) });
  }

  create(request: DiscountCodeRequest): Observable<DiscountCode[]> {
    return this.repository.create(request).pipe(switchMap(() => this.fetch()));
  }

  update(id: number, request: DiscountCodeRequest): Observable<DiscountCode[]> {
    return this.repository.update(id, request).pipe(switchMap(() => this.fetch()));
  }

  remove(id: number): Observable<DiscountCode[]> {
    return this.repository.delete(id).pipe(switchMap(() => this.fetch()));
  }

  private fetch(): Observable<DiscountCode[]> {
    this.loadingSignal.set(true);
    return this.repository.findAll().pipe(
      tap({
        next: (codes) => {
          this.codesSignal.set(codes);
          this.loadingSignal.set(false);
        },
        error: () => this.loadingSignal.set(false),
      }),
    );
  }
}
