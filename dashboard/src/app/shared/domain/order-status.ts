import { TranslationKey } from '../../core/i18n/translations.fr';

/**
 * Statuts de commande de l'API (`com.example.scmc.order.OrderStatus`), avec leur
 * cle de traduction, la variante de pastille `.status--*` et la couleur employee
 * par les graphiques. Partage par le tableau de bord et l'ecran des commandes.
 */
export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'PENDING',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

/** Cle a passer a `TranslationService.t()` / au pipe `t`. */
export const ORDER_STATUS_KEYS: Record<OrderStatus, TranslationKey> = {
  PENDING: 'status.PENDING',
  PAID: 'status.PAID',
  SHIPPED: 'status.SHIPPED',
  DELIVERED: 'status.DELIVERED',
  CANCELLED: 'status.CANCELLED',
};

/** Suffixe de la classe utilitaire `.status--*` definie dans `styles.scss`. */
export const ORDER_STATUS_VARIANT: Record<OrderStatus, string> = {
  PENDING: '',
  PAID: 'status--info',
  SHIPPED: 'status--info',
  DELIVERED: 'status--success',
  CANCELLED: 'status--danger',
};

/** Degrade cacao : du plus clair (en attente) au plus fonce (livree). */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: '#d39b45',
  PAID: '#b86f42',
  SHIPPED: '#7b3f20',
  DELIVERED: '#32180f',
  CANCELLED: '#c0a79c',
};
