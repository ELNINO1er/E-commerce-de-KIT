import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../../../core/api/api.endpoints';
import { ApiService } from '../../../core/api/api.service';
import { AuthUser, UpdateProfileRequest } from '../domain/models/auth-user.model';
import { Credentials, Session } from '../domain/models/session.model';
import { AuthRepository } from '../domain/ports/auth-repository.port';

@Injectable()
export class HttpAuthRepository implements AuthRepository {
  private readonly api = inject(ApiService);

  login(credentials: Credentials): Observable<Session> {
    return this.api.post<Session>(API.auth.login, credentials);
  }

  refresh(refreshToken: string): Observable<Session> {
    return this.api.post<Session>(API.auth.refresh, { refreshToken });
  }

  logout(refreshToken: string): Observable<void> {
    return this.api.post<void>(API.auth.logout, { refreshToken });
  }

  me(): Observable<AuthUser> {
    return this.api.get<AuthUser>(API.auth.me);
  }

  updateProfile(request: UpdateProfileRequest): Observable<AuthUser> {
    return this.api.patch<AuthUser>(API.auth.me, request);
  }
}
