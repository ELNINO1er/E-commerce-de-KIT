import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { TranslatePipe } from '../../../core/i18n/t.pipe';
import { Icon } from '../icon/icon';

/**
 * Champ de recherche, avec anti-rebond et bouton d'effacement.
 *
 * Il n'emet que des termes stabilises : sans cela, chaque frappe declencherait
 * un filtrage ou une requete.
 */
@Component({
  selector: 'app-search-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Icon, TranslatePipe],
  template: `
    <div class="field">
      <app-icon name="search" [size]="17" />
      <input
        type="search"
        [formControl]="control"
        [placeholder]="placeholder()"
        [attr.aria-label]="ariaLabel() || placeholder()"
      />
      @if (control.value) {
        <button type="button" [attr.aria-label]="'common.cancel' | t" (click)="clear()">
          <app-icon name="plus" [size]="14" />
        </button>
      }
    </div>
  `,
  styles: `
    .field {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 0 12px;
      border: 1px solid var(--scmc-border-input);
      border-radius: var(--scmc-radius-sm);
      color: var(--scmc-muted);
      background: #fff;
      transition:
        border-color 0.25s ease,
        box-shadow 0.25s ease;
    }

    .field:focus-within {
      border-color: var(--scmc-caramel);
      box-shadow: 0 0 0 4px rgba(184, 111, 66, 0.12);
    }

    input {
      min-height: 42px;
      padding: 0;
      border: 0;
      background: transparent;
      font-size: 14px;
    }

    /* C'est le conteneur qui porte l'etat focus (voir .field:focus-within).
       Sans cette neutralisation, l'input ajoute par-dessus l'outline globale de
       :focus-visible, decalee et tracee sur le rayon herite : deux anneaux
       imbriques et desalignes. */
    input:focus,
    input:focus-visible {
      outline: none;
      box-shadow: none;
    }

    /* La croix native du champ de recherche doublonnerait avec notre bouton. */
    input::-webkit-search-cancel-button {
      display: none;
    }

    button {
      display: grid;
      place-items: center;
      flex: none;
      width: 22px;
      height: 22px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      color: var(--scmc-muted);
      background: transparent;
      cursor: pointer;
    }

    /* Le « + » pivote d'un huitieme de tour : une croix, sans icone dediee. */
    button app-icon {
      transform: rotate(45deg);
    }

    button:hover {
      color: var(--scmc-ink);
      background: var(--scmc-page);
    }
  `,
})
export class SearchField {
  readonly placeholder = input('');
  readonly ariaLabel = input('');
  /** Delai d'inactivite avant emission, en millisecondes. */
  readonly debounce = input(250);
  /**
   * Terme initial — pour un ecran ouvert avec une recherche deja appliquee
   * (`/clients?q=…`). Le champ doit alors montrer ce qui filtre la liste,
   * sinon le resultat parait arbitraire. Ne reemet rien : la liste est deja
   * chargee avec ce terme.
   */
  readonly initialValue = input('');

  readonly search = output<string>();

  protected readonly control = new FormControl('', { nonNullable: true });

  constructor() {
    effect(() => {
      const initial = this.initialValue();
      if (initial && !this.control.value) {
        this.control.setValue(initial, { emitEvent: false });
      }
    });

    this.control.valueChanges
      .pipe(
        debounceTime(this.debounce()),
        map((value) => value.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((term) => this.search.emit(term));
  }

  protected clear(): void {
    // Emission immediate : effacer est une action explicite, pas une frappe.
    this.control.setValue('', { emitEvent: false });
    this.search.emit('');
  }
}
