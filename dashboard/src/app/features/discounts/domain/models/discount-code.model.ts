import { DiscountType } from '../../../../shared/domain/enums';

/** Code de reduction (`DiscountCodeResponse`). */
export interface DiscountCode {
  id: number;
  code: string;
  type: DiscountType;
  /** Pourcentage (10 = −10 %) ou montant fixe en FCFA, selon `type`. */
  value: number;
  active: boolean;
  /** Instants ISO ; `null` = pas de borne de ce cote. */
  validFrom: string | null;
  validUntil: string | null;
  /** Sous-total minimum exige pour que le code s'applique. */
  minOrderAmount: number | null;
  /** Quota d'utilisations ; `null` = illimite. */
  maxUses: number | null;
  usedCount: number;
}

export interface DiscountCodeRequest {
  code: string;
  type: DiscountType;
  value: number;
  active?: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  minOrderAmount?: number | null;
  maxUses?: number | null;
}

/**
 * Etat reel d'un code, deduit de ses bornes.
 *
 * L'API ne renvoie que `active`, qui est un interrupteur manuel : un code peut
 * etre « actif » et pourtant inutilisable parce qu'il est expire ou epuise.
 * C'est cette nuance que l'ecran doit montrer.
 */
export type DiscountState = 'INACTIVE' | 'EXHAUSTED' | 'EXPIRED' | 'SCHEDULED' | 'ACTIVE';

export function discountState(code: DiscountCode, now = new Date()): DiscountState {
  if (!code.active) {
    return 'INACTIVE';
  }
  if (code.maxUses !== null && code.usedCount >= code.maxUses) {
    return 'EXHAUSTED';
  }
  if (code.validUntil && new Date(code.validUntil) < now) {
    return 'EXPIRED';
  }
  if (code.validFrom && new Date(code.validFrom) > now) {
    return 'SCHEDULED';
  }
  return 'ACTIVE';
}

/** Instant ISO → valeur d'un `<input type="date">` (`AAAA-MM-JJ`). */
export function toDateInput(instant: string | null): string {
  if (!instant) {
    return '';
  }
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

/**
 * Valeur d'un `<input type="date">` → instant ISO.
 *
 * La borne de fin est portee a la fin de journee : saisir le 31 doit inclure le
 * 31 entier, pas s'arreter a son premier instant.
 */
export function fromDateInput(value: string, endOfDay = false): string | null {
  if (!value) {
    return null;
  }
  return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`).toISOString();
}
