/** Zone de livraison (`DeliveryZoneResponse`). */
export interface DeliveryZone {
  id: number;
  /** Libelle de la zone : « France métropolitaine », « Union européenne »… */
  name: string;
  scope: string;
  city: string;
  /** Tarif en centimes d’euro ; `0` = livraison offerte sur cette zone. */
  fee: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  /** Delai deja mis en forme par l'API : « 1 jour », « 1-2 jours ». */
  estimatedDelivery: string;
  /** Une zone inactive reste en base mais disparait du checkout client. */
  active: boolean;
}

export interface DeliveryZoneRequest {
  name: string;
  scope: string;
  city: string;
  fee: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  active?: boolean;
}
