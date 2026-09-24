import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { DataTable } from '../../../../shared/ui/data-table/data-table';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SearchField } from '../../../../shared/ui/search-field/search-field';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { AUDIT_METHODS } from '../../domain/models/audit-filter.model';
import {
  AuditLog,
  methodVariant,
  moduleKey,
  statusKey,
  statusVariant,
} from '../../domain/models/audit-log.model';
import { AuditLogStore } from '../../application/audit-log.store';

@Component({
  selector: 'app-audit-log-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, DataTable, SearchField, Select, Icon],
  templateUrl: './audit-log-page.html',
  styleUrl: './audit-log-page.scss',
})
export class AuditLogPage {
  private readonly store = inject(AuditLogStore);
  private readonly i18n = inject(TranslationService);

  protected readonly logs = this.store.logs;
  protected readonly page = this.store.page;
  protected readonly loading = this.store.loading;
  protected readonly errorMessage = this.store.error;
  protected readonly filtered = this.store.filtered;

  /**
   * Le champ texte porte sur **l'acteur**, seul champ texte filtrable cote
   * serveur. Ni le chemin ni le module ne le sont : d'ou un intitule qui dit
   * « e-mail » plutot qu'un « rechercher » qui promettrait davantage.
   */
  protected readonly actor = signal('');

  protected readonly form = new FormGroup({
    method: new FormControl<string | null>(null),
    from: new FormControl<string | null>(null),
    to: new FormControl<string | null>(null),
  });

  protected readonly methodOptions = computed<SelectOption[]>(() => [
    { value: null, label: this.i18n.t('audit.filters.allMethods') },
    ...AUDIT_METHODS.map((value) => ({ value, label: value })),
  ]);

  constructor() {
    // Une date se saisit caractere par caractere : sans temporisation, taper
    // une annee declencherait quatre requetes.
    this.form.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.apply());
    this.store.load();
  }

  protected onActorSearch(term: string): void {
    this.actor.set(term);
    this.apply();
  }

  protected resetFilters(): void {
    this.actor.set('');
    // `reset()` emet sur `valueChanges`, qui rappelle `apply()`.
    this.form.reset();
  }

  private apply(): void {
    const { method, from, to } = this.form.getRawValue();
    this.store.applyFilter({
      actor: this.actor() || null,
      method: method || null,
      from: from || null,
      to: to || null,
    });
  }

  protected when(log: AuditLog): string {
    return this.i18n.dateTime(log.timestamp);
  }

  protected methodVariant(log: AuditLog): string {
    return methodVariant(log.method);
  }

  protected statusVariant(log: AuditLog): string {
    return statusVariant(log.status);
  }

  protected statusLabel(log: AuditLog): string {
    return this.i18n.t(statusKey(log.status));
  }

  protected moduleLabel(log: AuditLog): string {
    return this.i18n.t(moduleKey(log.path));
  }

  protected goToPage(index: number): void {
    this.store.goToPage(index);
  }

  protected reload(): void {
    this.store.load();
  }
}
