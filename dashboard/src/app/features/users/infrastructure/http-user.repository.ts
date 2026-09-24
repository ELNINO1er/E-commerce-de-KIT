import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../../../core/api/api.endpoints';
import { ApiService } from '../../../core/api/api.service';
import { PageQuery, PageResponse } from '../../../core/api/page-response.model';
import { Role } from '../../../shared/domain/enums';
import { Account } from '../domain/models/account.model';
import { UserRepository } from '../domain/ports/user-repository.port';

@Injectable()
export class HttpUserRepository implements UserRepository {
  private readonly api = inject(ApiService);

  search(
    role: Role | null,
    term: string | null,
    page: PageQuery,
  ): Observable<PageResponse<Account>> {
    // `ApiService` retire les parametres vides : un filtre non renseigne ne
    // part donc jamais sous la forme `?q=`.
    return this.api.getPage<Account>(API.users.list, { role, q: term, ...page });
  }

  changeRole(id: number, role: Role): Observable<Account> {
    return this.api.put<Account>(API.admin.users.role(id), { role });
  }

  changeStatus(id: number, enabled: boolean): Observable<Account> {
    return this.api.put<Account>(API.admin.users.status(id), { enabled });
  }
}
