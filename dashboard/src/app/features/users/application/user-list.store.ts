import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResponse } from '../../../core/api/page-response.model';
import { problemMessage } from '../../../core/api/problem-detail';
import { TranslationKey } from '../../../core/i18n/translations.fr';
import { TranslationService } from '../../../core/i18n/translation.service';
import { Role } from '../../../shared/domain/enums';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { Account } from '../domain/models/account.model';
import { USER_REPOSITORY } from '../domain/ports/user-repository.port';

const PAGE_SIZE = 20;

@Injectable()
export class UserListStore {
  private readonly repository = inject(USER_REPOSITORY);
  private readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);

  private readonly pageSignal = signal<PageResponse<Account> | null>(null);
  private readonly roleSignal = signal<Role | null>(null);
  private readonly termSignal = signal('');
  private readonly pageIndexSignal = signal(0);
  private readonly loadingSignal = signal(false);
  private readonly savingSignal = signal(false);
  private readonly errorSignal = signal<unknown>(null);

  readonly page = this.pageSignal.asReadonly();
  readonly role = this.roleSignal.asReadonly();
  readonly term = this.termSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly saving = this.savingSignal.asReadonly();
  readonly accounts = computed(() => this.pageSignal()?.content ?? []);
  readonly error = computed(() => {
    const raw = this.errorSignal();
    return raw
      ? problemMessage(raw, {
          network: this.i18n.t('error.network'),
          unexpected: this.i18n.t('error.unexpected'),
        })
      : null;
  });

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.repository
      .search(this.roleSignal(), this.termSignal() || null, {
        page: this.pageIndexSignal(),
        size: PAGE_SIZE,
        sort: 'id,desc',
      })
      .subscribe({
        next: (page) => {
          this.pageSignal.set(page);
          this.loadingSignal.set(false);
        },
        error: (error: unknown) => {
          this.errorSignal.set(error);
          this.loadingSignal.set(false);
        },
      });
  }

  filterByRole(role: Role | null): void {
    this.roleSignal.set(role);
    this.pageIndexSignal.set(0);
    this.load();
  }

  /**
   * Recherche **serveur** (`?q=`) : elle porte sur tous les comptes, pas
   * seulement sur la page affichee. Le retour a la premiere page est
   * indispensable — rester page 3 sur un resultat qui en compte une donnerait
   * une liste vide.
   */
  searchBy(term: string): void {
    this.termSignal.set(term);
    this.pageIndexSignal.set(0);
    this.load();
  }

  goToPage(index: number): void {
    this.pageIndexSignal.set(index);
    this.load();
  }

  changeRole(id: number, role: Role): void {
    this.mutate(this.repository.changeRole(id, role), 'users.roleUpdated');
  }

  changeStatus(id: number, enabled: boolean): void {
    this.mutate(this.repository.changeStatus(id, enabled), 'users.statusUpdated');
  }

  /**
   * Applique une modification puis recharge la page.
   *
   * Recharger plutot que remplacer la ligne : un filtre de role actif doit
   * faire disparaitre le compte qui n'y correspond plus.
   *
   * En cas de refus, c'est le message de l'API qui s'affiche — lui seul dit
   * *lequel* des quatre garde-fous s'applique.
   */
  private mutate(request: Observable<Account>, successKey: TranslationKey): void {
    if (this.savingSignal()) {
      return;
    }
    this.savingSignal.set(true);

    request.subscribe({
      next: () => {
        this.savingSignal.set(false);
        this.toast.successKey(successKey);
        this.load();
      },
      error: (error: unknown) => {
        this.savingSignal.set(false);
        this.toast.apiError(error);
      },
    });
  }
}
