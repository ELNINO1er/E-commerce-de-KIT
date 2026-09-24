import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Icon } from '../icon/icon';

export interface SelectOption {
  value: unknown;
  label: string;
}

/**
 * Liste deroulante stylee, au meme registre visuel que le menu du profil.
 *
 * Un `<select>` natif ne peut pas etre mis en forme : sa liste d'options est
 * rendue par le systeme d'exploitation, hors de portee du CSS de la page. D'ou
 * ce composant, qui reimplemente le comportement avec des elements standards.
 *
 * Il expose un `ControlValueAccessor`, donc il se branche exactement comme un
 * champ natif : `<app-select formControlName="categoryId" [options]="…" />`.
 *
 * Hauteur ajustable par la variable `--select-min-height` (50px par defaut).
 *
 * Limite connue : le panneau est positionne en absolu dans le flux. Dans un
 * conteneur a defilement, un select place tres bas peut le voir rogne. Les
 * ecrans actuels placent leurs selects en haut de page ; le jour ou ce n'est
 * plus vrai, il faudra passer le panneau en overlay.
 */
@Component({
  selector: 'app-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Select), multi: true },
  ],
  template: `
    <button
      type="button"
      class="trigger"
      role="combobox"
      [class.is-open]="open()"
      [disabled]="disabled()"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-required]="required() ? 'true' : null"
      aria-haspopup="listbox"
      (click)="toggle()"
      (keydown)="onKeydown($event)"
      (blur)="onTouched()"
    >
      <span class="trigger__label" [class.is-placeholder]="!selectedLabel()">
        {{ selectedLabel() || placeholder() }}
      </span>
      <app-icon name="chevron" [size]="16" />
    </button>

    @if (open()) {
      <!-- Voile transparent : ferme au clic exterieur, sans ecouteur global. -->
      <div class="backdrop" (click)="onBackdropClick($event)"></div>

      <ul class="menu" role="listbox">
        @for (option of options(); track $index; let i = $index) {
          <li
            role="option"
            class="item"
            [attr.aria-selected]="isSelected(option)"
            [class.is-selected]="isSelected(option)"
            [class.is-focused]="focusedIndex() === i"
            (click)="onItemClick($event, option)"
            (mouseenter)="focusedIndex.set(i)"
          >
            {{ option.label }}
            @if (isSelected(option)) {
              <app-icon name="check" [size]="16" />
            }
          </li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }

    .trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      width: 100%;
      min-height: var(--select-min-height, 50px);
      padding: 10px 14px;
      border: 1px solid var(--scmc-border-input);
      border-radius: var(--scmc-radius-sm);
      color: var(--scmc-ink);
      background: #fff;
      font-family: var(--scmc-font-body);
      font-size: 15px;
      text-align: left;
      cursor: pointer;
      transition:
        border-color 0.25s ease,
        box-shadow 0.25s ease;
    }

    .trigger:hover:not(:disabled),
    .trigger.is-open {
      border-color: var(--scmc-caramel);
    }

    .trigger.is-open {
      box-shadow: 0 0 0 4px rgba(184, 111, 66, 0.12);
    }

    .trigger:disabled {
      color: var(--scmc-muted);
      background: var(--scmc-page);
      cursor: not-allowed;
    }

    .trigger app-icon {
      flex: none;
      color: var(--scmc-muted);
      transition: transform 0.25s ease;
    }

    .trigger.is-open app-icon {
      transform: rotate(180deg);
    }

    .trigger__label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .trigger__label.is-placeholder {
      color: #a3928a;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 30;
    }

    .menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      left: 0;
      z-index: 31;
      max-height: 264px;
      margin: 0;
      padding: 8px;
      overflow-y: auto;
      list-style: none;
      border: 1px solid var(--scmc-border);
      border-radius: var(--scmc-radius-card);
      background: #fff;
      box-shadow: 0 18px 44px rgba(50, 24, 15, 0.16);
    }

    .item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 10px;
      border-radius: var(--scmc-radius-sm);
      color: var(--scmc-nav-idle);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    .item app-icon {
      margin-left: auto;
      color: var(--scmc-cocoa);
    }

    .item.is-focused {
      background: var(--scmc-nav-active-bg);
    }

    .item.is-selected {
      color: var(--scmc-nav-active);
      font-weight: 700;
    }
  `,
})
export class Select implements ControlValueAccessor {
  readonly options = input.required<SelectOption[]>();
  readonly placeholder = input('');
  /**
   * Nom accessible du champ. A renseigner : un `<label>` enveloppant ne nomme
   * pas un `<button>`, il ne s'applique qu'aux controles de formulaire natifs.
   */
  readonly ariaLabel = input('');
  /** Porte `aria-required` : c'est lui qui informe reellement, pas l'asterisque. */
  readonly required = input(false);

  protected readonly open = signal(false);
  protected readonly disabled = signal(false);
  protected readonly value = signal<unknown>(null);
  /** Option survolee ou atteinte au clavier — pas encore choisie. */
  protected readonly focusedIndex = signal(-1);

  protected readonly selectedLabel = computed(
    () => this.options().find((option) => option.value === this.value())?.label ?? '',
  );

  private onChange: (value: unknown) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  // --- ControlValueAccessor ---

  writeValue(value: unknown): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled) {
      this.open.set(false);
    }
  }

  // --- Interaction ---

  protected isSelected(option: SelectOption): boolean {
    return option.value === this.value();
  }

  protected toggle(): void {
    if (this.disabled()) {
      return;
    }
    const willOpen = !this.open();
    this.open.set(willOpen);
    if (willOpen) {
      // A l'ouverture, le curseur clavier part de l'option courante.
      this.focusedIndex.set(this.options().findIndex((option) => option.value === this.value()));
    }
  }

  protected close(): void {
    this.open.set(false);
    this.onTouched();
  }

  protected choose(option: SelectOption): void {
    this.value.set(option.value);
    this.onChange(option.value);
    this.close();
  }

  /**
   * Les clics du voile et des options ne doivent pas remonter.
   *
   * Si un `<label>` enveloppe le composant, tout clic qui l'atteint sans venir
   * du bouton lui-meme est **reemis** par le navigateur vers ce bouton : le menu
   * se refermait puis se rouvrait dans la foulee. On coupe donc la propagation
   * a la source, pour que le composant reste correct quel que soit son habillage.
   */
  protected onBackdropClick(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.close();
  }

  protected onItemClick(event: MouseEvent, option: SelectOption): void {
    event.stopPropagation();
    event.preventDefault();
    this.choose(option);
  }

  /**
   * Le focus reste sur le declencheur : c'est lui qui recoit les touches, y
   * compris menu ouvert. Cela evite d'avoir a deplacer le focus dans la liste.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const options = this.options();

    if (event.key === 'Escape') {
      if (this.open()) {
        event.stopPropagation();
        this.close();
      }
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.open()) {
        this.toggle();
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const next = this.focusedIndex() + step;
      this.focusedIndex.set(Math.min(Math.max(next, 0), options.length - 1));
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      if (!this.open()) {
        return; // Laisse le clic natif du bouton ouvrir le menu.
      }
      event.preventDefault();
      const option = options[this.focusedIndex()];
      if (option) {
        this.choose(option);
      }
    }
  }
}
