import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PageResponse } from '../../../core/api/page-response.model';
import { Pagination } from '../pagination/pagination';
import { Skeleton } from '../skeleton/skeleton';

/**
 * Echafaudage commun des tableaux du back-office : enveloppe defilante, lignes
 * fantomes pendant le premier chargement, etat vide et pagination.
 *
 * Les colonnes ne sont **pas** decrites par configuration : les cellules sont
 * trop variees (vignette + nom, pastille de statut, boutons d'action) pour un
 * langage de colonnes qui finirait plus lourd que le HTML qu'il remplace. Les
 * en-tetes et les lignes sont donc projetes tels quels.
 *
 * ```html
 * <app-data-table [loading]="loading()" [isEmpty]="!rows().length" …>
 *   <ng-container tableHeader><th>Nom</th></ng-container>
 *   <ng-container tableBody>
 *     &commat;for (row of rows(); track row.id) { <tr><td>…</td></tr> }
 *   </ng-container>
 * </app-data-table>
 * ```
 *
 * Le contenu projete conserve la portee de styles du parent : les classes de
 * cellule (`.data__actions`…) restent definies dans la page.
 */
@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pagination, Skeleton],
  template: `
    @if (loading() && isEmpty()) {
      <div class="sk" [attr.aria-busy]="true">
        @for (row of skeletonRows(); track row) {
          <div class="sk__row">
            @for (width of skeletonWidths(); track $index) {
              <app-skeleton [width]="width" height="13px" />
            }
          </div>
        }
      </div>
    } @else if (isEmpty()) {
      <p class="empty">{{ emptyMessage() }}</p>
    } @else {
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <ng-content select="[tableHeader]" />
            </tr>
          </thead>
          <tbody>
            <ng-content select="[tableBody]" />
          </tbody>
        </table>
      </div>

      @if (page()) {
        <app-pagination [info]="page()" (pageChange)="pageChange.emit($event)" />
      }
    }
  `,
  styles: `
    .empty {
      margin: 0;
      padding: 34px 0;
      color: var(--scmc-muted);
      text-align: center;
    }

    .sk__row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 13px 0;
      border-bottom: 1px solid var(--scmc-track);
    }

    .sk__row:last-child {
      border-bottom: 0;
    }
  `,
})
export class DataTable {
  readonly loading = input(false);
  readonly isEmpty = input(false);
  readonly emptyMessage = input('');
  /** Omettre pour une liste non paginee (les categories, par exemple). */
  readonly page = input<PageResponse<unknown> | null>(null);
  /** Largeurs des blocs fantomes — une par colonne a evoquer. */
  readonly skeletonWidths = input<string[]>(['24%', '18%', '20%', '14%']);
  readonly skeletonRowCount = input(6);

  readonly pageChange = output<number>();

  protected readonly skeletonRows = computed(() =>
    Array.from({ length: this.skeletonRowCount() }, (_, index) => index),
  );
}
