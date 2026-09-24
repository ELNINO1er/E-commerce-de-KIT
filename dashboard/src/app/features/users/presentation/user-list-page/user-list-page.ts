import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { Role, ROLE_KEYS, ROLES } from '../../../../shared/domain/enums';
import { DataTable } from '../../../../shared/ui/data-table/data-table';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SearchField } from '../../../../shared/ui/search-field/search-field';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { SessionStore } from '../../../auth/application/session.store';
import { Account, accountInitials, accountName } from '../../domain/models/account.model';
import { UserListStore } from '../../application/user-list.store';

@Component({
  selector: 'app-user-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, DataTable, Select, SearchField, Icon],
  templateUrl: './user-list-page.html',
  styleUrl: './user-list-page.scss',
})
export class UserListPage {
  /**
   * Terme passe dans l'URL (`/clients?q=…`), lie par
   * `withComponentInputBinding()`. C'est ainsi que la recherche globale de
   * l'entete ouvre l'ecran deja filtre sur un compte precis.
   */
  readonly q = input('');

  private readonly store = inject(UserListStore);
  private readonly session = inject(SessionStore);
  private readonly i18n = inject(TranslationService);

  protected readonly accounts = this.store.accounts;
  protected readonly page = this.store.page;
  protected readonly loading = this.store.loading;
  protected readonly saving = this.store.saving;
  protected readonly errorMessage = this.store.error;
  protected readonly role = this.store.role;
  protected readonly search = this.store.term;

  protected readonly roleControl = new FormControl<Role | null>(null);

  protected readonly roleOptions = computed<SelectOption[]>(() => [
    { value: null, label: this.i18n.t('users.filters.allRoles') },
    ...ROLES.map((value) => ({ value, label: this.i18n.t(ROLE_KEYS[value]) })),
  ]);

  constructor() {
    this.roleControl.valueChanges
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((role) => this.store.filterByRole(role ?? null));
  }

  ngOnInit(): void {
    // Les entrees liees a la route ne sont posees qu'apres la construction :
    // le premier chargement doit donc attendre ici pour connaitre `q`.
    const term = this.q();
    if (term) {
      this.store.searchBy(term);
    } else {
      this.store.load();
    }
  }

  /**
   * Son propre compte : l'API refuse aussi bien d'y retirer le role
   * administrateur que de le desactiver. On neutralise les deux boutons
   * plutot que de laisser declencher un refus previsible.
   *
   * Le dernier administrateur, lui, ne se devine pas depuis une page : ce
   * refus-la ne peut venir que du serveur.
   */
  protected isSelf(account: Account): boolean {
    return this.session.user()?.email.toLowerCase() === account.email.toLowerCase();
  }

  protected toggleRole(account: Account): void {
    this.store.changeRole(account.id, account.role === 'ADMIN' ? 'USER' : 'ADMIN');
  }

  protected toggleStatus(account: Account): void {
    this.store.changeStatus(account.id, !account.enabled);
  }

  protected roleActionLabel(account: Account): string {
    return this.i18n.t(account.role === 'ADMIN' ? 'users.demote' : 'users.promote');
  }

  protected statusActionLabel(account: Account): string {
    return this.i18n.t(account.enabled ? 'users.disable' : 'users.enable');
  }

  protected onSearch(term: string): void {
    this.store.searchBy(term);
  }

  protected name(account: Account): string {
    return accountName(account);
  }

  protected initials(account: Account): string {
    return accountInitials(account);
  }

  protected roleLabel(account: Account): string {
    return this.i18n.t(ROLE_KEYS[account.role]);
  }

  protected goToPage(index: number): void {
    this.store.goToPage(index);
  }
}
