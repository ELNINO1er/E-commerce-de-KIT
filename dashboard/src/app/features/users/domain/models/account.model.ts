import { Role } from '../../../../shared/domain/enums';

/**
 * Compte client ou administrateur (`UserResponse`).
 *
 * Meme forme que `AuthUser` de la feature `auth`, mais pas le meme objet
 * metier : celui-ci decrit **un compte parmi d'autres** dans une liste
 * d'administration, l'autre decrit **la session en cours**. Les garder separes
 * evite qu'un besoin de l'un ne contamine l'autre.
 */
export interface Account {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  /**
   * Compte actif. Un compte desactive ne peut plus se connecter, mais ses
   * commandes restent intactes — c'est pourquoi l'API desactive au lieu de
   * supprimer, et pourquoi la liste doit distinguer les deux etats.
   */
  enabled: boolean;
}

export function accountName(account: Account): string {
  return [account.firstName, account.lastName].filter(Boolean).join(' ') || account.email;
}

export function accountInitials(account: Account): string {
  const value = `${account.firstName?.charAt(0) ?? ''}${account.lastName?.charAt(0) ?? ''}`.trim();
  return (value || account.email.charAt(0)).toUpperCase();
}
