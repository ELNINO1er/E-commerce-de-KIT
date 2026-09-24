import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { PageQuery, PageResponse } from '../../../../core/api/page-response.model';
import { ReturnStatus } from '../../../../shared/domain/enums';
import { ReturnRequest } from '../models/return-request.model';

export interface ReturnRepository {
  /** Toutes les demandes, filtrables par statut. Aucun parametre texte cote API. */
  search(status: ReturnStatus | null, page: PageQuery): Observable<PageResponse<ReturnRequest>>;

  /**
   * Change le traitement d'une demande.
   *
   * L'API ne remet **pas** le stock lors d'une approbation : la reprise
   * physique reste une decision humaine.
   */
  updateStatus(id: number, status: ReturnStatus): Observable<ReturnRequest>;
}

export const RETURN_REPOSITORY = new InjectionToken<ReturnRepository>('ReturnRepository');
