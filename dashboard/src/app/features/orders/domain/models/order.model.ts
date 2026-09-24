import { DeliveryMethod } from '../../../../shared/domain/enums';
import { OrderStatus } from '../../../../shared/domain/order-status';

/** Une ligne de commande (`OrderItemResponse`). */
export interface OrderItem {
  variantId: number;
  productName: string;
  format: string;
  /** Prix unitaire **au moment de la commande** — il ne suit pas le catalogue. */
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

/** Commande (`OrderResponse`). */
export interface Order {
  /** Reference metier, de la forme `KIC-000013` — c'est elle qui sert d'identifiant. */
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];

  subtotal: number;
  deliveryFee: number;
  discountCode: string | null;
  discountAmount: number;
  total: number;
  currency: string;

  contactEmail: string;
  contactPhone: string;
  recipientName: string;

  city: string;
  commune: string | null;
  addressLine: string;
  country: string;

  deliveryMethod: DeliveryMethod;
  deliveryZoneName: string | null;
  /** Deja mis en forme par l'API (« 1-2 jours », « Retrait sur place »). */
  estimatedDelivery: string | null;
  trackingNote: string | null;

  createdAt: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface UpdateTrackingRequest {
  trackingNote: string;
}

/** Adresse de livraison sur une ligne, en sautant les champs absents. */
export function formatAddress(order: Order): string {
  return [order.addressLine, order.commune, order.city, order.country]
    .filter((part): part is string => !!part)
    .join(', ');
}
