import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface RenderedSlice extends DonutSlice {
  /** Part du total, en pourcentage — sert directement de longueur de trait. */
  percent: number;
  offset: number;
}

/**
 * Anneau de repartition en SVG, sans dependance.
 *
 * Le rayon vaut 15.9155 pour que la circonference fasse exactement 100 unites :
 * chaque part se dessine alors avec un `stroke-dasharray` en pourcentage.
 */
@Component({
  selector: 'app-donut-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="donut">
      <svg viewBox="0 0 42 42" role="img" [attr.aria-label]="summary()">
        <defs>
          <!-- Meme trame diagonale que les barres, pour la portion non couverte. -->
          <pattern
            id="scmc-donut-hatch"
            width="2"
            height="2"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect class="donut__hatch-bg" width="2" height="2" />
            <line class="donut__hatch-line" x1="0" y1="0" x2="0" y2="2" stroke-width="0.9" />
          </pattern>
        </defs>
        <circle class="donut__track" cx="21" cy="21" r="15.9155" />
        @for (slice of slices(); track slice.label) {
          <circle
            cx="21"
            cy="21"
            r="15.9155"
            [attr.stroke]="slice.color"
            [attr.stroke-dasharray]="slice.percent + ' ' + (100 - slice.percent)"
            [attr.stroke-dashoffset]="slice.offset"
          />
        }
        <text x="21" y="20.2" class="donut__value">{{ total() }}</text>
        <text x="21" y="24.6" class="donut__caption">{{ caption() }}</text>
      </svg>

      <ul class="donut__legend">
        @for (slice of slices(); track slice.label) {
          <li>
            <span class="donut__dot" [style.background]="slice.color"></span>
            {{ slice.label }}
            <strong>{{ slice.value }}</strong>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    .donut {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 22px;
      flex-wrap: wrap;
    }

    svg {
      flex: 0 0 148px;
      width: 148px;
      height: 148px;
    }

    circle {
      fill: none;
      stroke-width: 5.6;
    }

    .donut__track {
      stroke: url(#scmc-donut-hatch);
    }

    .donut__hatch-bg {
      fill: var(--scmc-track);
    }

    .donut__hatch-line {
      stroke: var(--scmc-track-line);
    }

    text {
      text-anchor: middle;
      fill: var(--scmc-chocolate-900);
    }

    .donut__value {
      font-family: var(--scmc-font-heading);
      font-size: 7px;
      font-weight: 700;
    }

    .donut__caption {
      fill: var(--scmc-muted);
      font-size: 2.6px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .donut__legend {
      flex: 1 1 160px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .donut__legend li {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 0;
      border-bottom: 1px solid var(--scmc-track);
      font-size: 14px;
    }

    .donut__legend li:last-child {
      border-bottom: 0;
    }

    .donut__legend strong {
      margin-left: auto;
      color: var(--scmc-chocolate-900);
      font-family: var(--scmc-font-heading);
      font-size: 17px;
    }

    .donut__dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
    }
  `,
})
export class DonutChart {
  readonly data = input.required<DonutSlice[]>();
  /** Legende affichee sous le total, au centre de l'anneau. */
  readonly caption = input('commandes');

  protected readonly total = computed(() =>
    this.data().reduce((sum, slice) => sum + slice.value, 0),
  );

  protected readonly slices = computed<RenderedSlice[]>(() => {
    const total = this.total();
    if (total === 0) {
      return [];
    }
    // `25` place le depart de l'anneau a midi ; chaque part decale la suivante.
    let consumed = 0;
    return this.data()
      .filter((slice) => slice.value > 0)
      .map((slice) => {
        const percent = (slice.value / total) * 100;
        const offset = 25 - consumed;
        consumed += percent;
        return { ...slice, percent, offset };
      });
  });

  protected readonly summary = computed(() =>
    this.data()
      .map((slice) => `${slice.label} : ${slice.value}`)
      .join(', '),
  );
}
