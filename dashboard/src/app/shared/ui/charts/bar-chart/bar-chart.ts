import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarItem {
  label: string;
  /** Valeur numerique qui determine la longueur de la barre. */
  value: number;
  /** Valeur affichee a droite (deja formatee : quantite, montant en FCFA…). */
  valueLabel: string;
}

interface RenderedBar extends BarItem {
  y: number;
  width: number;
}

const CHART_WIDTH = 640;
const ROW_HEIGHT = 54;
const BAR_HEIGHT = 16;

/** Barres horizontales en SVG, sans dependance — utilise pour les meilleures ventes. */
@Component({
  selector: 'app-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + width + ' ' + height()"
      preserveAspectRatio="xMinYMin meet"
      role="img"
      [attr.aria-label]="summary()"
    >
      <defs>
        <!-- Hachures diagonales : la portion non atteinte de chaque barre. -->
        <pattern
          id="scmc-bar-hatch"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line class="bar__hatch-line" x1="0" y1="0" x2="0" y2="8" stroke-width="3.5" />
        </pattern>
      </defs>
      @for (bar of bars(); track bar.label) {
        <g>
          <text [attr.x]="0" [attr.y]="bar.y + 13" class="bar__label">{{ bar.label }}</text>
          <text [attr.x]="width" [attr.y]="bar.y + 13" class="bar__value">
            {{ bar.valueLabel }}
          </text>
          <rect
            [attr.x]="0"
            [attr.y]="bar.y + 22"
            [attr.width]="width"
            [attr.height]="barHeight"
            [attr.rx]="barHeight / 2"
            class="bar__track"
          />
          <rect
            [attr.x]="0"
            [attr.y]="bar.y + 22"
            [attr.width]="width"
            [attr.height]="barHeight"
            [attr.rx]="barHeight / 2"
            class="bar__hatch"
          />
          <rect
            [attr.x]="0"
            [attr.y]="bar.y + 22"
            [attr.width]="bar.width"
            [attr.height]="barHeight"
            [attr.rx]="barHeight / 2"
            class="bar__fill"
          />
        </g>
      }
    </svg>
  `,
  styles: `
    svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }

    .bar__label {
      fill: var(--scmc-ink);
      font-family: var(--scmc-font-body);
      font-size: 15px;
      font-weight: 600;
    }

    .bar__value {
      fill: var(--scmc-cocoa);
      font-family: var(--scmc-font-heading);
      font-size: 17px;
      font-weight: 700;
      text-anchor: end;
    }

    .bar__track {
      fill: var(--scmc-track);
    }

    .bar__hatch-line {
      stroke: var(--scmc-track-line);
    }

    .bar__hatch {
      fill: url(#scmc-bar-hatch);
      opacity: 0.7;
    }

    .bar__fill {
      fill: var(--scmc-cocoa);
    }
  `,
})
export class BarChart {
  readonly data = input.required<BarItem[]>();

  protected readonly width = CHART_WIDTH;
  protected readonly barHeight = BAR_HEIGHT;

  protected readonly height = computed(() => Math.max(this.data().length * ROW_HEIGHT, ROW_HEIGHT));

  protected readonly bars = computed<RenderedBar[]>(() => {
    const items = this.data();
    const max = Math.max(...items.map((item) => item.value), 1);
    return items.map((item, index) => ({
      ...item,
      y: index * ROW_HEIGHT,
      width: Math.max((item.value / max) * CHART_WIDTH, BAR_HEIGHT),
    }));
  });

  protected readonly summary = computed(() =>
    this.data()
      .map((item) => `${item.label} : ${item.valueLabel}`)
      .join(', '),
  );
}
