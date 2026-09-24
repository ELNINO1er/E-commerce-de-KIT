import { inject, Injectable, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { Category, CategoryRequest } from '../domain/models/category.model';
import { CATEGORY_REPOSITORY } from '../domain/ports/category-repository.port';

/**
 * Liste des categories, mutualisee.
 *
 * Elle alimente le filtre et le formulaire des produits, et plus tard l'ecran
 * des categories lui-meme. Le chargement est fait une fois : la liste est courte
 * et change rarement, la recharger a chaque ouverture de formulaire serait du
 * gaspillage. Toute ecriture doit appeler `reload()`.
 */
@Injectable({ providedIn: 'root' })
export class CategoryStore {
  private readonly repository = inject(CATEGORY_REPOSITORY);

  private readonly categoriesSignal = signal<Category[]>([]);
  private readonly loadingSignal = signal(false);
  private requested = false;

  readonly categories = this.categoriesSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  load(): void {
    if (this.requested || this.loadingSignal()) {
      return;
    }
    this.requested = true;
    this.fetch().subscribe({ error: () => (this.requested = false) });
  }

  /** Recharge apres une creation, une modification ou une suppression. */
  reload(): Observable<Category[]> {
    return this.fetch();
  }

  /**
   * Ecritures. Chacune rafraichit la liste avant de completer, pour que tous les
   * ecrans qui la consomment (filtre produits, formulaire produit, ecran des
   * categories) restent alignes sans se coordonner entre eux.
   */
  create(request: CategoryRequest): Observable<Category[]> {
    return this.repository.create(request).pipe(switchMap(() => this.fetch()));
  }

  update(id: number, request: CategoryRequest): Observable<Category[]> {
    return this.repository.update(id, request).pipe(switchMap(() => this.fetch()));
  }

  /** L'API renvoie 409 `CONFLICT` si la categorie est encore utilisee. */
  remove(id: number): Observable<Category[]> {
    return this.repository.delete(id).pipe(switchMap(() => this.fetch()));
  }

  /** Nom affichable d'une categorie, pour une ligne de tableau. */
  nameOf(id: number | null | undefined): string | null {
    if (id === null || id === undefined) {
      return null;
    }
    return this.categoriesSignal().find((category) => category.id === id)?.name ?? null;
  }

  private fetch(): Observable<Category[]> {
    this.loadingSignal.set(true);
    return this.repository.findAll().pipe(
      tap({
        next: (categories) => {
          this.categoriesSignal.set(categories);
          this.loadingSignal.set(false);
        },
        error: () => this.loadingSignal.set(false),
      }),
    );
  }
}
