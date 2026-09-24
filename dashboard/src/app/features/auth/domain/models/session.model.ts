import { AuthUser } from './auth-user.model';

/** Reponse d'authentification de l'API (`AuthResponse`). */
export interface Session {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  /** Duree de vie du jeton d'acces, en secondes. */
  expiresIn: number;
  user: AuthUser;
}

export interface Credentials {
  email: string;
  password: string;
}
