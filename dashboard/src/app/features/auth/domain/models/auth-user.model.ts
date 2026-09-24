/** Roles definis par l'API (`com.example.scmc.auth.Role`). */
export type Role = 'USER' | 'ADMIN';

/** Compte connecte (`UserResponse`). */
export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  /**
   * Compte actif. Toujours vrai pour une session ouverte — l'API refuse la
   * connexion d'un compte desactive — mais le champ fait partie de
   * `UserResponse` et le modele doit en rendre compte.
   */
  enabled: boolean;
}

/**
 * Modification de son propre profil (`UpdateProfileRequest`).
 *
 * Tous les champs sont facultatifs et **seuls les champs non nuls sont
 * appliques** cote serveur. L'e-mail en est volontairement absent : changer
 * l'identifiant de connexion demanderait son propre parcours de verification.
 */
export interface UpdateProfileRequest {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

/** Initiales affichees dans la pastille d'avatar de la barre laterale. */
export function initials(user: AuthUser): string {
  const first = user.firstName?.charAt(0) ?? '';
  const last = user.lastName?.charAt(0) ?? '';
  const value = `${first}${last}`.trim();
  return (value || user.email.charAt(0)).toUpperCase();
}

export function fullName(user: AuthUser): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
}
