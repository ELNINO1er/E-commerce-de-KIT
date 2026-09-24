import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { SearchGroup } from '../models/search-result.model';

/**
 * Recherche globale.
 *
 * L'API n'expose aucun endpoint transverse : la recherche interroge les trois
 * listes qui acceptent `?q=` — produits, commandes, clients — et rassemble
 * leurs reponses. Une famille en echec ne doit pas emporter les autres.
 */
export interface SearchRepository {
  search(term: string, limit: number): Observable<SearchGroup[]>;
}

export const SEARCH_REPOSITORY = new InjectionToken<SearchRepository>('SearchRepository');
