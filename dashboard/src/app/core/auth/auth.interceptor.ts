import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { SessionStore } from '../../features/auth/application/session.store';
import { environment } from '../../../environments/environment';

/** Les routes d'authentification ne portent pas de Bearer et ne doivent pas boucler sur un 401. */
function isAuthEndpoint(request: HttpRequest<unknown>): boolean {
  return /\/auth\/(login|register|refresh|logout)(?:\?|$)/.test(request.url);
}

function withToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Ajoute le jeton d'acces a chaque appel API et, sur un 401, tente un
 * rafraichissement unique avant de rejouer la requete. Si le rafraichissement
 * echoue, la session est fermee et l'utilisateur renvoye vers la page de login.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(`${environment.apiUrl}/`)) return next(request);
  const session = inject(SessionStore);
  const router = inject(Router);

  if (isAuthEndpoint(request)) {
    return next(request);
  }

  const token = session.accessToken();
  const authorized = token ? withToken(request, token) : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return session.refresh().pipe(
        switchMap((fresh) => next(withToken(request, fresh))),
        catchError((refreshError: unknown) => {
          session.clear();
          void router.navigate(['/login'], { queryParams: { redirect: router.url } });
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
