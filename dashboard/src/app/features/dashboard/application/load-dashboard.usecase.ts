import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { BestSeller, DashboardStats } from '../domain/models/dashboard-stats.model';
import { STATS_REPOSITORY } from '../domain/ports/stats-repository.port';

export interface DashboardOverview {
  stats: DashboardStats;
  bestSellers: BestSeller[];
}

const BEST_SELLERS_LIMIT = 5;

/** Charge en un seul passage les indicateurs et le classement des meilleures ventes. */
@Injectable({ providedIn: 'root' })
export class LoadDashboardUseCase {
  private readonly repository = inject(STATS_REPOSITORY);

  execute(): Observable<DashboardOverview> {
    return forkJoin({
      stats: this.repository.dashboard(),
      bestSellers: this.repository.bestSellers(BEST_SELLERS_LIMIT),
    }).pipe(map(({ stats, bestSellers }) => ({ stats, bestSellers })));
  }
}
