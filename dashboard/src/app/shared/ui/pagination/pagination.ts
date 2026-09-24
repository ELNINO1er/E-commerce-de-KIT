import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PageResponse } from '../../../core/api/page-response.model';
import { TranslatePipe } from '../../../core/i18n/t.pipe';
import { Icon } from '../icon/icon';

/**
 * Pagination d'une liste, branchee directement sur l'enveloppe `PageResponse`
 * de l'API. Ne s'affiche pas quand il n'y a qu'une seule page.
 */
@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, TranslatePipe],
  template: `
    @if (info(); as page) {
      @if (page.totalPages > 1) {
        <nav class="pager" [attr.aria-label]="'pagination.label' | t">
          <span class="pager__summary">
            {{
              'pagination.summary'
                | t: { from: firstItem(), to: lastItem(), total: page.totalElements }
            }}
          </span>

          <div class="pager__controls">
            <button
              type="button"
              class="icon-btn"
              [disabled]="page.first"
              [attr.aria-label]="'pagination.previous' | t"
              (click)="pageChange.emit(page.page - 1)"
            >
              <app-icon name="chevron" [size]="16" class="pager__prev" />
            </button>

            <span class="pager__position">
              {{ 'pagination.position' | t: { page: page.page + 1, total: page.totalPages } }}
            </span>

            <button
              type="button"
              class="icon-btn"
              [disabled]="page.last"
              [attr.aria-label]="'pagination.next' | t"
              (click)="pageChange.emit(page.page + 1)"
            >
              <app-icon name="chevron" [size]="16" class="pager__next" />
            </button>
          </div>
        </nav>
      }
    }
  `,
  styles: `
    .pager {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      margin-top: 16px;
    }

    .pager__summary,
    .pager__position {
      color: var(--scmc-muted);
      font-size: 13px;
    }

    .pager__position {
      min-width: 92px;
      color: var(--scmc-ink);
      font-weight: 700;
      text-align: center;
    }

    .pager__controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .icon-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Le chevron pointe vers le bas : on le fait pivoter pour chaque sens. */
    .pager__prev {
      transform: rotate(90deg);
    }

    .pager__next {
      transform: rotate(-90deg);
    }
  `,
})
export class Pagination {
  readonly info = input.required<PageResponse<unknown> | null>();
  readonly pageChange = output<number>();

  protected readonly firstItem = computed(() => {
    const page = this.info();
    return page ? page.page * page.size + 1 : 0;
  });

  protected readonly lastItem = computed(() => {
    const page = this.info();
    return page ? Math.min((page.page + 1) * page.size, page.totalElements) : 0;
  });
}
