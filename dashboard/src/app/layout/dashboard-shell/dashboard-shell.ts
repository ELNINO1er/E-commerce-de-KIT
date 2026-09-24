import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Event as RouterEvent,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { filter, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TranslatePipe } from '../../core/i18n/t.pipe';
import {
  Language,
  LANGUAGE_LABELS,
  TranslationService,
} from '../../core/i18n/translation.service';
import { TranslationKey } from '../../core/i18n/translations.fr';
import {
  fullName as toFullName,
  initials as toInitials,
} from '../../features/auth/domain/models/auth-user.model';
import { SessionStore } from '../../features/auth/application/session.store';
import { DashboardStore } from '../../features/dashboard/application/dashboard.store';
import { GlobalSearch } from '../../features/search/presentation/global-search/global-search';
import { Icon, IconName } from '../../shared/ui/icon/icon';
import { Modal } from '../../shared/ui/modal/modal';
import { AutoHideScroll } from '../../shared/ui/scroll/auto-hide-scroll.directive';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { ToastService } from '../../shared/ui/toast/toast.service';

/**
 * Compteur reel affiche au bout d'une entree de menu.
 *
 * Reserve aux alertes — « il y a N choses a traiter ici », jamais un decompte
 * d'elements. La pastille porte les couleurs du statut correspondant dans les
 * tableaux (`.count-badge` reprend celles de « En attente » / « Stock faible »),
 * ce qui la distingue d'un simple total et renvoie visuellement aux lignes
 * concernees.
 */
type BadgeKey = 'lowStock' | 'pendingOrders';

interface NavItem {
  label: TranslationKey;
  path: string;
  icon: IconName;
  /** Les entrees des lots non encore livres restent visibles mais inactives. */
  available: boolean;
  /** Route active uniquement sur correspondance exacte (cas de l'accueil `/`). */
  exact?: boolean;
  badge?: BadgeKey;
}

interface NavGroup {
  label: TranslationKey;
  items: readonly NavItem[];
}

const NAV: readonly NavGroup[] = [
  {
    label: 'nav.group.menu',
    items: [
      { label: 'nav.dashboard', path: '/', icon: 'dashboard', available: true, exact: true },
      {
        label: 'nav.products',
        path: '/produits',
        icon: 'products',
        available: true,
        badge: 'lowStock',
      },
      { label: 'nav.categories', path: '/categories', icon: 'categories', available: true },
      {
        label: 'nav.orders',
        path: '/commandes',
        icon: 'orders',
        available: true,
        badge: 'pendingOrders',
      },
      { label: 'nav.returns', path: '/retours', icon: 'box', available: true },
    ],
  },
  {
    label: 'nav.group.commerce',
    items: [
      { label: 'nav.promos', path: '/promotions', icon: 'promo', available: true },
      { label: 'nav.delivery', path: '/livraison', icon: 'delivery', available: true },
    ],
  },
  {
    label: 'nav.group.general',
    items: [
      { label: 'nav.customers', path: '/clients', icon: 'customers', available: true },
      { label: 'nav.audit', path: '/audit', icon: 'audit', available: true },
    ],
  },
];

/**
 * Coquille du back-office : l'application entiere tient dans un conteneur blanc
 * arrondi pose sur le fond de page, avec la barre laterale a gauche et, a droite,
 * l'entete (recherche + identite) au-dessus du `router-outlet`.
 */
@Component({
  selector: 'app-dashboard-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ReactiveFormsModule,
    Icon,
    TranslatePipe,
    Skeleton,
    AutoHideScroll,
    Modal,
    GlobalSearch,
  ],
  templateUrl: './dashboard-shell.html',
  styleUrl: './dashboard-shell.scss',
})
export class DashboardShell {
  private readonly session = inject(SessionStore);
  private readonly dashboard = inject(DashboardStore);
  private readonly router = inject(Router);
  private readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);

  protected readonly nav = NAV;
  /** Lignes fantomes du menu et tuiles fantomes du contenu, pendant l'attente. */
  protected readonly navPlaceholders = Array.from({ length: 8 }, (_, index) => index);
  protected readonly tilePlaceholders = Array.from({ length: 5 }, (_, index) => index);
  protected readonly languages = this.i18n.languages;
  protected readonly language = this.i18n.language;
  protected readonly languageLabels = LANGUAGE_LABELS;
  /** Menu deroulant du profil : langue + deconnexion. */
  protected readonly menuOpen = signal(false);

  /**
   * Premier chargement de la coquille : les pastilles du menu et l'identite
   * dependent de donnees encore en vol. Retombe des que la premiere requete
   * aboutit — ou echoue.
   */
  protected readonly booting = computed(() => !this.dashboard.initialized());

  /**
   * Navigation en cours : c'est ce qui declenche le skeleton **du contenu seul**
   * quand on clique une autre entree du menu. Le `router-outlet` reste monte
   * pendant ce temps (masque en CSS) — le retirer du DOM empecherait le routeur
   * d'activer le composant a l'arrivee.
   */
  protected readonly navigating = toSignal(
    this.router.events.pipe(
      filter(
        (event: RouterEvent) =>
          event instanceof NavigationStart ||
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError,
      ),
      map((event) => event instanceof NavigationStart),
    ),
    { initialValue: false },
  );
  protected readonly user = this.session.user;
  protected readonly initials = computed(() => {
    const user = this.user();
    return user ? toInitials(user) : '';
  });
  protected readonly displayName = computed(() => {
    const user = this.user();
    return user ? toFullName(user) : '';
  });

  /** Swagger est servi par l'API, a la racine de l'hote qui porte `/api`. */
  protected readonly swaggerUrl = `${environment.apiUrl.replace(/\/api\/?$/, '')}/swagger-ui.html`;

  constructor() {
    // Alimente les pastilles du menu ; la page d'accueil lit le meme etat.
    this.dashboard.load();
  }

  protected badgeCount(item: NavItem): number {
    switch (item.badge) {
      case 'lowStock':
        return this.dashboard.lowStockCount();
      case 'pendingOrders':
        return this.dashboard.pendingOrdersCount();
      default:
        return 0;
    }
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected switchLanguage(language: Language): void {
    this.i18n.setLanguage(language);
    this.closeMenu();
  }

  /* --- Profil de l'administrateur connecte -------------------------------
   *
   * `PATCH /auth/me` ne touche ni a l'e-mail — changer l'identifiant de
   * connexion demanderait son propre parcours de verification — ni au role.
   * Cote serveur, un champ absent ou vide **n'est pas applique** : le
   * formulaire part donc toujours complet, et le prenom comme le nom sont
   * obligatoires ici pour eviter qu'un champ vide ne donne l'illusion d'un
   * effacement.
   */
  protected readonly editingProfile = signal(false);
  protected readonly savingProfile = signal(false);

  protected readonly profileForm = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    phone: new FormControl('', { nonNullable: true }),
  });

  protected openProfileEditor(): void {
    const user = this.user();
    if (!user) {
      return;
    }
    this.profileForm.reset({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
    });
    this.closeMenu();
    this.editingProfile.set(true);
  }

  protected closeProfileEditor(): void {
    this.editingProfile.set(false);
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);

    this.session.updateProfile(this.profileForm.getRawValue()).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.closeProfileEditor();
        this.toast.successKey('profile.saved');
      },
      error: (error: unknown) => {
        this.savingProfile.set(false);
        this.toast.apiError(error);
      },
    });
  }

  protected logout(): void {
    this.closeMenu();
    this.session.logout().subscribe({
      complete: () => void this.router.navigate(['/login']),
    });
  }
}
