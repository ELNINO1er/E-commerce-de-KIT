import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../../../core/api/api.endpoints';
import { ApiService } from '../../../core/api/api.service';
import { PageQuery, PageResponse } from '../../../core/api/page-response.model';
import { ReturnStatus } from '../../../shared/domain/enums';
import { ReturnRequest } from '../domain/models/return-request.model';
import { ReturnRepository } from '../domain/ports/return-repository.port';

@Injectable()
export class HttpReturnRepository implements ReturnRepository {
  private readonly api = inject(ApiService);

  search(
    status: ReturnStatus | null,
    page: PageQuery,
  ): Observable<PageResponse<ReturnRequest>> {
    return this.api.getPage<ReturnRequest>(API.admin.returns.list, { status, ...page });
  }

  updateStatus(id: number, status: ReturnStatus): Observable<ReturnRequest> {
    return this.api.put<ReturnRequest>(API.admin.returns.status(id), { status });
  }
}
