import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../../../core/api/api.endpoints';
import { ApiService } from '../../../core/api/api.service';
import { PageQuery, PageResponse } from '../../../core/api/page-response.model';
import { AuditFilter, toInstantRange } from '../domain/models/audit-filter.model';
import { AuditLog } from '../domain/models/audit-log.model';
import { AuditLogRepository } from '../domain/ports/audit-log-repository.port';

@Injectable()
export class HttpAuditLogRepository implements AuditLogRepository {
  private readonly api = inject(ApiService);

  search(filter: AuditFilter, page: PageQuery): Observable<PageResponse<AuditLog>> {
    // `ApiService` retire les parametres vides : un filtre non renseigne ne
    // part donc jamais sous la forme `?actor=`.
    return this.api.getPage<AuditLog>(API.auditLogs.list, {
      actor: filter.actor,
      method: filter.method,
      from: toInstantRange(filter.from, 'start'),
      to: toInstantRange(filter.to, 'end'),
      ...page,
    });
  }
}
