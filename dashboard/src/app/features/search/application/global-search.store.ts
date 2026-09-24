import { computed, inject, Injectable, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchGroup } from '../domain/models/search-result.model';
import { SEARCH_REPOSITORY } from '../domain/ports/search-repository.port';

/** Nombre de resultats montres **par famille** dans le panneau. */
const PER_KIND = 4;

/** En deca, la recherche renverrait la moitie du catalogue : on n'interroge pas. */
const MIN_LENGTH = 2;

@Injectable({ providedIn: 'root' })
export class GlobalSearchStore {
  private readonly repository = inject(SEARCH_REPOSITORY);

  private readonly termSignal = signal('');
  private readonly groupsSignal = signal<SearchGroup[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly input = new Subject<string>();

  readonly term = this.termSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  /** Familles non vides uniquement — une famille sans resultat ne s'affiche pas. */
  readonly groups = computed(() => this.groupsSignal().filter((group) => group.results.length > 0));
  readonly hasResults = computed(() => this.groups().length > 0);
  readonly searchable = computed(() => this.termSignal().trim().length >= MIN_LENGTH);

  constructor() {
    this.input
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => {
          if (term.trim().length < MIN_LENGTH) {
            this.loadingSignal.set(false);
            return of([] as SearchGroup[]);
          }
          this.loadingSignal.set(true);
          // L'adaptateur neutralise deja l'echec d'une famille ; ce filet ne
          // couvre que l'imprevu, pour ne jamais laisser le panneau bloque en
          // « chargement ».
          return this.repository
            .search(term.trim(), PER_KIND)
            .pipe(catchError(() => of([] as SearchGroup[])));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((groups) => {
        this.groupsSignal.set(groups);
        this.loadingSignal.set(false);
      });
  }

  search(term: string): void {
    this.termSignal.set(term);
    this.input.next(term);
  }

  clear(): void {
    this.termSignal.set('');
    this.groupsSignal.set([]);
    this.loadingSignal.set(false);
    // Vide la source aussi : sans cela, `distinctUntilChanged` ignorerait une
    // nouvelle saisie identique a la precedente.
    this.input.next('');
  }
}
