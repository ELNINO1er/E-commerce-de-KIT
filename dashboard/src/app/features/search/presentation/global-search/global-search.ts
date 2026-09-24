import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { TranslationKey } from '../../../../core/i18n/translations.fr';
import { Icon, IconName } from '../../../../shared/ui/icon/icon';
import { SearchResultKind } from '../../domain/models/search-result.model';
import { GlobalSearchStore } from '../../application/global-search.store';

const KIND_LABELS: Record<SearchResultKind, TranslationKey> = {
  product: 'search.kind.products',
  order: 'search.kind.orders',
  customer: 'search.kind.customers',
};

const KIND_ICONS: Record<SearchResultKind, IconName> = {
  product: 'products',
  order: 'orders',
  customer: 'customers',
};

/**
 * Recherche globale de l'entete.
 *
 * L'API n'a pas d'endpoint transverse : le panneau rassemble les trois listes
 * qui acceptent `?q=`. Il montre les premiers resultats de chaque famille et
 * dit combien il en reste, plutot que de laisser croire a l'exhaustivite.
 */
@Component({
  selector: 'app-global-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, Icon],
  templateUrl: './global-search.html',
  styleUrl: './global-search.scss',
})
export class GlobalSearch {
  private readonly store = inject(GlobalSearchStore);
  private readonly router = inject(Router);

  protected readonly groups = this.store.groups;
  protected readonly loading = this.store.loading;
  protected readonly term = this.store.term;
  protected readonly searchable = this.store.searchable;

  protected readonly open = signal(false);
  protected readonly showEmpty = computed(
    () => this.searchable() && !this.loading() && !this.store.hasResults(),
  );

  constructor() {
    // Naviguer ferme le panneau : le resultat choisi est atteint, le laisser
    // ouvert masquerait la page qu'on vient d'ouvrir.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.close());
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.open.set(true);
    this.store.search(value);
  }

  protected onFocus(): void {
    if (this.term()) {
      this.open.set(true);
    }
  }

  protected close(): void {
    this.open.set(false);
  }

  protected reset(): void {
    this.store.clear();
    this.close();
  }

  protected kindLabel(kind: SearchResultKind): TranslationKey {
    return KIND_LABELS[kind];
  }

  protected kindIcon(kind: SearchResultKind): IconName {
    return KIND_ICONS[kind];
  }
}
