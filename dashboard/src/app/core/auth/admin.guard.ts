import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../../features/auth/application/session.store';

/**
 * Protege tout le back-office : session ouverte ET role ADMIN.
 *
 * La reprise de session a deja eu lieu au demarrage (`provideAppInitializer`),
 * donc l'etat consulte ici est fiable des la premiere navigation.
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);

  if (session.isAuthenticated() && session.isAdmin()) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};

/** Empeche d'afficher la page de login quand une session admin est deja ouverte. */
export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);

  return session.isAuthenticated() && session.isAdmin() ? router.createUrlTree(['/']) : true;
};
