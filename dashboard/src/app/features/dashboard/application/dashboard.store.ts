import { computed, inject, Injectable, signal } from '@angular/core';
import { problemMessage } from '../../../core/api/problem-detail';
import { TranslationService } from '../../../core/i18n/translation.service';
import { BestSeller, DashboardStats } from '../domain/models/dashboard-stats.model';
import { LoadDashboardUseCase } from './load-dashboard.usecase';

/**
 * Etat partage des indicateurs du tableau de bord.
 *
 * Il vit a la racine parce que deux vues le consomment : la page d'accueil, et
 * la barre laterale qui affiche les pastilles « stock faible » et « commandes en
 * attente ». Le chargement est mutualise — le premier appelant declenche la
 * requete, les suivants lisent le meme etat.
 */
@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly loadDashboard = inject(LoadDashboardUseCase);
  private readonly i18n = inject(TranslationService);

  private readonly statsSignal = signal<DashboardStats | null>(null);
  private readonly bestSellersSignal = signal<BestSeller[]>([]);
  private readonly loadingSignal = signal(false);
  /** Passe a vrai des que la premiere tentative de chargement est retombee. */
  private readonly initializedSignal = signal(false);
  /** L'erreur brute est conservee : le message en est derive dans la langue active. */
  private readonly errorSignal = signal<unknown>(null);
  private requested = false;

  readonly stats = this.statsSignal.asReadonly();
  readonly bestSellers = this.bestSellersSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly initialized = this.initializedSignal.asReadonly();
  readonly error = computed(() => {
    const raw = this.errorSignal();
    return raw
      ? problemMessage(raw, {
          network: this.i18n.t('error.network'),
          unexpected: this.i18n.t('error.unexpected'),
        })
      : null;
  });

  /** Formats sous le seuil d'alerte — pastille de l'entree « Produits ». */
  readonly lowStockCount = computed(() => this.statsSignal()?.lowStockVariants ?? 0);
  /** Commandes a traiter — pastille de l'entree « Commandes ». */
  readonly pendingOrdersCount = computed(() => this.statsSignal()?.ordersByStatus.PENDING ?? 0);

  /** Charge une fois ; passer `force` pour un rechargement explicite. */
  load(force = false): void {
    if (this.loadingSignal() || (this.requested && !force)) {
      return;
    }
    this.requested = true;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.loadDashboard.execute().subscribe({
      next: (overview) => {
        this.statsSignal.set(overview.stats);
        this.bestSellersSignal.set(overview.bestSellers);
        this.loadingSignal.set(false);
        this.initializedSignal.set(true);
      },
      error: (error: unknown) => {
        this.errorSignal.set(error);
        this.loadingSignal.set(false);
        // Meme en echec, l'attente initiale est terminee : on sort du skeleton
        // pour laisser place au message d'erreur.
        this.initializedSignal.set(true);
      },
    });
  }
}
