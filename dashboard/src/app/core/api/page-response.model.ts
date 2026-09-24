/**
 * Enveloppe de pagination renvoyee par toutes les listes de l'API KIC
 * (`com.example.scmc.common.PageResponse`).
 */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/**
 * Parametres de pagination/tri acceptes par Spring Data (`?page=&size=&sort=`).
 *
 * Declare en **alias de type** et non en `interface` : TypeScript n'attribue de
 * signature d'index implicite qu'aux alias. Une `interface` ne serait donc pas
 * assignable au `Record<string, QueryValue>` attendu par `ApiService.getPage`,
 * et passer un `PageQuery` directement (plutot qu'un litteral) echouerait.
 */
export type PageQuery = {
  page?: number;
  size?: number;
  /** Ex. `id,desc` — champ puis direction, comme attendu par Spring. */
  sort?: string;
};

export const EMPTY_PAGE: PageResponse<never> = {
  content: [],
  page: 0,
  size: 0,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
};
