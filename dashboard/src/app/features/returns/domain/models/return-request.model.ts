import { ReturnStatus, ReturnType } from '../../../../shared/domain/enums';

/**
 * Demande de retour ou de remboursement (`ReturnResponse`).
 *
 * Elle reference la commande par son **numero**, pas par un identifiant :
 * c'est ce que le client saisit et ce que porte sa facture.
 */
export interface ReturnRequest {
  id: number;
  orderNumber: string;
  type: ReturnType;
  status: ReturnStatus;
  reason: string;
  createdAt: string;
}

export interface UpdateReturnStatusRequest {
  status: ReturnStatus;
}
