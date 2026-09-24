import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { problemMessage } from '../../../core/api/problem-detail';
import { TranslationService } from '../../../core/i18n/translation.service';
import { DeliveryZone, DeliveryZoneRequest } from '../domain/models/delivery-zone.model';
import { DELIVERY_ZONE_REPOSITORY } from '../domain/ports/delivery-zone-repository.port';

@Injectable()
export class DeliveryZoneStore {
  private readonly repository = inject(DELIVERY_ZONE_REPOSITORY);
  private readonly i18n = inject(TranslationService);

  private readonly zonesSignal = signal<DeliveryZone[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<unknown>(null);

  readonly zones = this.zonesSignal.asReadonly();
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

  create(request: DeliveryZoneRequest): Observable<DeliveryZone[]> {
    return this.repository.create(request).pipe(switchMap(() => this.fetch()));
  }

  update(id: number, request: DeliveryZoneRequest): Observable<DeliveryZone[]> {
    return this.repository.update(id, request).pipe(switchMap(() => this.fetch()));
  }

  remove(id: number): Observable<DeliveryZone[]> {
    return this.repository.delete(id).pipe(switchMap(() => this.fetch()));
  }

  private fetch(): Observable<DeliveryZone[]> {
    this.loadingSignal.set(true);
    return this.repository.findAll().pipe(
      tap({
        next: (zones) => {
          this.zonesSignal.set(zones);
          this.loadingSignal.set(false);
        },
        error: () => this.loadingSignal.set(false),
      }),
    );
  }
}
