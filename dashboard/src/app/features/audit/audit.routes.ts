import { Routes } from '@angular/router';
import { AUDIT_LOG_REPOSITORY } from './domain/ports/audit-log-repository.port';
import { HttpAuditLogRepository } from './infrastructure/http-audit-log.repository';
import { AuditLogStore } from './application/audit-log.store';

export const AUDIT_ROUTES: Routes = [
  {
    path: '',
    title: 'title.audit',
    providers: [{ provide: AUDIT_LOG_REPOSITORY, useClass: HttpAuditLogRepository }, AuditLogStore],
    loadComponent: () =>
      import('./presentation/audit-log-page/audit-log-page').then((m) => m.AuditLogPage),
  },
];
