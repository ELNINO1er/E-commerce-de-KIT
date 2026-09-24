import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { PageQuery, PageResponse } from '../../../../core/api/page-response.model';
import { AuditFilter } from '../models/audit-filter.model';
import { AuditLog } from '../models/audit-log.model';

/**
 * Journal en lecture seule : rien ne s'y cree ni ne s'y supprime, par
 * construction. Il se filtre en revanche par acteur, methode et periode.
 */
export interface AuditLogRepository {
  search(filter: AuditFilter, page: PageQuery): Observable<PageResponse<AuditLog>>;
}

export const AUDIT_LOG_REPOSITORY = new InjectionToken<AuditLogRepository>('AuditLogRepository');
