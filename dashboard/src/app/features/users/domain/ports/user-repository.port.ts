import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { PageQuery, PageResponse } from '../../../../core/api/page-response.model';
import { Role } from '../../../../shared/domain/enums';
import { Account } from '../models/account.model';

export interface UserRepository {
  /** `term` porte le `?q=` de l'API : e-mail, nom ou prenom. */
  search(role: Role | null, term: string | null, page: PageQuery): Observable<PageResponse<Account>>;

  /**
   * Changement de role et activation/desactivation.
   *
   * L'API pose quatre garde-fous et les refuse en **409** : retirer son propre
   * role administrateur, desactiver son propre compte, retrograder ou
   * desactiver le dernier administrateur actif. Son message dit lequel
   * s'applique — il doit remonter tel quel a l'ecran.
   *
   * Il n'existe ni creation ni suppression de compte : un client s'inscrit
   * lui-meme, et un compte se desactive plutot qu'il ne s'efface, pour ne pas
   * detacher ses commandes.
   */
  changeRole(id: number, role: Role): Observable<Account>;
  changeStatus(id: number, enabled: boolean): Observable<Account>;
}

export const USER_REPOSITORY = new InjectionToken<UserRepository>('UserRepository');
