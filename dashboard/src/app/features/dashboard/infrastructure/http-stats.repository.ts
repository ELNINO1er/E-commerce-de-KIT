import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../../../core/api/api.endpoints';
import { ApiService } from '../../../core/api/api.service';
import { BestSeller, DashboardStats } from '../domain/models/dashboard-stats.model';
import { StatsRepository } from '../domain/ports/stats-repository.port';

@Injectable()
export class HttpStatsRepository implements StatsRepository {
  private readonly api = inject(ApiService);

  dashboard(): Observable<DashboardStats> {
    return this.api.get<DashboardStats>(API.admin.stats.dashboard);
  }

  bestSellers(limit: number): Observable<BestSeller[]> {
    return this.api.get<BestSeller[]>(API.admin.stats.bestSellers, { limit });
  }
}
