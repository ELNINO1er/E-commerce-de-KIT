import { TranslationKey } from '../../core/i18n/translations.fr';

/**
 * Enumerations de l'API (API_GUIDE §5), partagees par plusieurs features.
 *
 * Chacune est accompagnee de sa liste ordonnee (pour alimenter un `<select>` ou
 * des filtres) et de ses cles de traduction. `OrderStatus` vit a part dans
 * `order-status.ts`, avec ses couleurs de graphique.
 */

/** Role d'un compte. */
export type Role = 'USER' | 'ADMIN';
export const ROLES: readonly Role[] = ['USER', 'ADMIN'];
export const ROLE_KEYS: Record<Role, TranslationKey> = {
  USER: 'role.USER',
  ADMIN: 'role.ADMIN',
};

/** Mode de remise de la commande. */
export type DeliveryMethod = 'PICKUP' | 'DELIVERY';
export const DELIVERY_METHODS: readonly DeliveryMethod[] = ['DELIVERY', 'PICKUP'];
export const DELIVERY_METHOD_KEYS: Record<DeliveryMethod, TranslationKey> = {
  DELIVERY: 'deliveryMethod.DELIVERY',
  PICKUP: 'deliveryMethod.PICKUP',
};

/** Moyen de paiement choisi par le client. */
export type PaymentMethod = 'MOBILE_MONEY' | 'CARD' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY';
export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  'MOBILE_MONEY',
  'CARD',
  'BANK_TRANSFER',
  'CASH_ON_DELIVERY',
];
export const PAYMENT_METHOD_KEYS: Record<PaymentMethod, TranslationKey> = {
  MOBILE_MONEY: 'paymentMethod.MOBILE_MONEY',
  CARD: 'paymentMethod.CARD',
  BANK_TRANSFER: 'paymentMethod.BANK_TRANSFER',
  CASH_ON_DELIVERY: 'paymentMethod.CASH_ON_DELIVERY',
};

/** Passerelle ayant traite le paiement. */
export type PaymentProvider = 'MOCK' | 'CINETPAY' | 'PAYDUNYA' | 'FLUTTERWAVE';

/** Etat d'un paiement. */
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'PENDING',
  'SUCCESS',
  'FAILED',
  'CANCELLED',
];
export const PAYMENT_STATUS_KEYS: Record<PaymentStatus, TranslationKey> = {
  PENDING: 'paymentStatus.PENDING',
  SUCCESS: 'paymentStatus.SUCCESS',
  FAILED: 'paymentStatus.FAILED',
  CANCELLED: 'paymentStatus.CANCELLED',
};
/** Suffixe de la classe utilitaire `.status--*`. */
export const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, string> = {
  PENDING: '',
  SUCCESS: 'status--success',
  FAILED: 'status--danger',
  CANCELLED: 'status--neutral',
};

/** Nature d'une demande : le client veut renvoyer le produit, ou etre rembourse. */
export type ReturnType = 'RETURN' | 'REFUND';
export const RETURN_TYPES: readonly ReturnType[] = ['RETURN', 'REFUND'];
export const RETURN_TYPE_KEYS: Record<ReturnType, TranslationKey> = {
  RETURN: 'returnType.RETURN',
  REFUND: 'returnType.REFUND',
};

/** Traitement d'une demande de retour. */
export type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export const RETURN_STATUSES: readonly ReturnStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
];
export const RETURN_STATUS_KEYS: Record<ReturnStatus, TranslationKey> = {
  PENDING: 'returnStatus.PENDING',
  APPROVED: 'returnStatus.APPROVED',
  REJECTED: 'returnStatus.REJECTED',
  COMPLETED: 'returnStatus.COMPLETED',
};
/** Suffixe de la classe utilitaire `.status--*`. */
export const RETURN_STATUS_VARIANT: Record<ReturnStatus, string> = {
  PENDING: '',
  APPROVED: 'status--info',
  REJECTED: 'status--danger',
  COMPLETED: 'status--success',
};

/** Nature d'un code de reduction. */
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export const DISCOUNT_TYPES: readonly DiscountType[] = ['PERCENTAGE', 'FIXED_AMOUNT'];
export const DISCOUNT_TYPE_KEYS: Record<DiscountType, TranslationKey> = {
  PERCENTAGE: 'discountType.PERCENTAGE',
  FIXED_AMOUNT: 'discountType.FIXED_AMOUNT',
};

/** Niveau de stock d'une variante, calcule par l'API a partir du seuil d'alerte. */
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export const STOCK_STATUS_KEYS: Record<StockStatus, TranslationKey> = {
  IN_STOCK: 'stockStatus.IN_STOCK',
  LOW_STOCK: 'stockStatus.LOW_STOCK',
  OUT_OF_STOCK: 'stockStatus.OUT_OF_STOCK',
};
export const STOCK_STATUS_VARIANT: Record<StockStatus, string> = {
  IN_STOCK: 'status--success',
  LOW_STOCK: '',
  OUT_OF_STOCK: 'status--danger',
};
