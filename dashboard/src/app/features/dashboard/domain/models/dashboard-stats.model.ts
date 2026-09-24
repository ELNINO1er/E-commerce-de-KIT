import { OrderStatus } from '../../../../shared/domain/order-status';

/** Indicateurs du tableau de bord (`DashboardResponse`). */
export interface DashboardStats {
  totalOrders: number;
  /** L'API serialise une `Map<OrderStatus, Long>` : les statuts sans commande sont absents. */
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  revenue: number;
  currency: string;
  totalUsers: number;
  totalProducts: number;
  /** Nombre de variantes dont le stock est passe sous le seuil d'alerte. */
  lowStockVariants: number;
}

/** Une ligne de « meilleures ventes » (`BestSellerResponse`). */
export interface BestSeller {
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}
