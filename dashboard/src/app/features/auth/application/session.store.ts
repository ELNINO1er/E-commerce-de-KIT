import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { AuthUser, UpdateProfileRequest } from '../domain/models/auth-user.model';
import { Credentials, Session } from '../domain/models/session.model';
import { AUTH_REPOSITORY } from '../domain/ports/auth-repository.port';
import { RefreshTokenStorage } from '../infrastructure/refresh-token.storage';

/** Levee quand un compte valide mais non-administrateur tente d'entrer dans le back-office. */
export class NotAnAdminError extends Error {
  constructor() {
    super("Ce compte n'a pas acces au back-office : un role administrateur est requis.");
    this.name = 'NotAnAdminError';
  }
}

/**
 * Etat de session du back-office.
 *
 * Le jeton d'acces vit uniquement en memoire (signal) : un rechargement de page
 * le perd, et la session est alors reprise au demarrage via le jeton de
 * rafraichissement (voir `restore()`, branche sur `provideAppInitializer`).
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly repository = inject(AUTH_REPOSITORY);
  private readonly storage = inject(RefreshTokenStorage);

  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly userSignal = signal<AuthUser | null>(null);
  private readonly readySignal = signal(false);

  /** Rafraichissement en cours, partage pour que N appels 401 ne declenchent qu'un seul refresh. */
  private inFlightRefresh: Observable<string> | null = null;

  readonly user = this.userSignal.asReadonly();
  /** Passe a vrai une fois la tentative de reprise de session terminee. */
  readonly ready = this.readySignal.asReadonly();
  readonly isAuthenticated = computed(() => this.accessTokenSignal() !== null);
  readonly isAdmin = computed(() => this.userSignal()?.role === 'ADMIN');

  accessToken(): string | null {
    return this.accessTokenSignal();
  }

  login(credentials: Credentials): Observable<AuthUser> {
    return this.repository.login(credentials).pipe(
      map((session) => {
        if (session.user.role !== 'ADMIN') {
          // On n'ouvre pas la session : le back-office est reserve aux administrateurs.
          this.repository.logout(session.refreshToken).subscribe({ error: () => undefined });
          throw new NotAnAdminError();
        }
        this.apply(session);
        return session.user;
      }),
    );
  }

  /**
   * Reprise de session au demarrage de l'application : sans jeton de
   * rafraichissement stocke, ou s'il est expire/revoque, on repart deconnecte.
   */
  restore(): Observable<boolean> {
    const refreshToken = this.storage.read();
    if (!refreshToken) {
      this.readySignal.set(true);
      return of(false);
    }
    return this.repository.refresh(refreshToken).pipe(
      map((session) => {
        if (session.user.role !== 'ADMIN') {
          this.clear();
          return false;
        }
        this.apply(session);
        return true;
      }),
      catchError(() => {
        this.clear();
        return of(false);
      }),
      tap(() => this.readySignal.set(true)),
    );
  }

  /** Renouvelle le jeton d'acces. Utilise par l'intercepteur sur une reponse 401. */
  refresh(): Observable<string> {
    if (this.inFlightRefresh) {
      return this.inFlightRefresh;
    }
    const refreshToken = this.storage.read();
    if (!refreshToken) {
      return throwError(() => new Error('Session expiree'));
    }

    this.inFlightRefresh = this.repository.refresh(refreshToken).pipe(
      map((session) => {
        this.apply(session);
        return session.accessToken;
      }),
      catchError((error: unknown) => {
        this.clear();
        return throwError(() => error);
      }),
      tap({ finalize: () => (this.inFlightRefresh = null) }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.inFlightRefresh;
  }

  /** Revoque le jeton cote serveur puis vide l'etat local (quoi qu'il arrive). */
  logout(): Observable<void> {
    const refreshToken = this.storage.read();
    this.clear();
    if (!refreshToken) {
      return of(void 0);
    }
    return this.repository.logout(refreshToken).pipe(catchError(() => of(void 0)));
  }

  /**
   * Met a jour son propre profil.
   *
   * La reponse remplace l'utilisateur en memoire : sans cela, la barre
   * laterale continuerait d'afficher l'ancien nom jusqu'au prochain
   * rafraichissement de session.
   */
  updateProfile(request: UpdateProfileRequest): Observable<AuthUser> {
    return this.repository.updateProfile(request).pipe(tap((user) => this.userSignal.set(user)));
  }

  /** Vide la session sans appeler l'API (jeton deja invalide cote serveur). */
  clear(): void {
    this.accessTokenSignal.set(null);
    this.userSignal.set(null);
    this.inFlightRefresh = null;
    this.storage.clear();
  }

  private apply(session: Session): void {
    this.accessTokenSignal.set(session.accessToken);
    this.userSignal.set(session.user);
    // Le jeton de rafraichissement tourne a chaque emission : on ecrase l'ancien.
    this.storage.write(session.refreshToken);
  }
}
