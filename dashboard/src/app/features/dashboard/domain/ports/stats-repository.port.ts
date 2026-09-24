import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { BestSeller, DashboardStats } from '../models/dashboard-stats.model';

export interface StatsRepository {
  dashboard(): Observable<DashboardStats>;
  bestSellers(limit: number): Observable<BestSeller[]>;
}

export const STATS_REPOSITORY = new InjectionToken<StatsRepository>('StatsRepository');
