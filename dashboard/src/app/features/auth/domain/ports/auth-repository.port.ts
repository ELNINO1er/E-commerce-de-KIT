import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthUser, UpdateProfileRequest } from '../models/auth-user.model';
import { Credentials, Session } from '../models/session.model';

/**
 * Port d'authentification. Le domaine et l'application ne connaissent que cette
 * interface — l'adaptateur HTTP est branche une seule fois dans `app.config.ts`.
 */
export interface AuthRepository {
  login(credentials: Credentials): Observable<Session>;
  /** Le jeton de rafraichissement tourne a chaque appel : la reponse en contient un nouveau. */
  refresh(refreshToken: string): Observable<Session>;
  logout(refreshToken: string): Observable<void>;
  me(): Observable<AuthUser>;
  /** Modification de son propre profil ; l'e-mail et le role n'y sont pas modifiables. */
  updateProfile(request: UpdateProfileRequest): Observable<AuthUser>;
}

export const AUTH_REPOSITORY = new InjectionToken<AuthRepository>('AuthRepository');
