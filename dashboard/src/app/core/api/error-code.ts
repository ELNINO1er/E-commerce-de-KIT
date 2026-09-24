/**
 * Codes machine renvoyes dans le champ `code` du ProblemDetail (API_GUIDE §3).
 *
 * Ils sont stables, contrairement au `detail` qui est un message francais destine
 * a l'affichage. C'est donc sur eux qu'on branche un comportement : reessayer,
 * rediriger, surligner un champ, proposer une action de rattrapage.
 */
export type ErrorCode =
  // Requete
  | 'VALIDATION_ERROR'
  | 'INVALID_REQUEST'
  // Ressources introuvables
  | 'RESOURCE_NOT_FOUND'
  | 'PRODUCT_NOT_FOUND'
  | 'CATEGORY_NOT_FOUND'
  | 'VARIANT_NOT_FOUND'
  | 'ORDER_NOT_FOUND'
  | 'PAYMENT_NOT_FOUND'
  | 'ZONE_NOT_FOUND'
  | 'DISCOUNT_CODE_NOT_FOUND'
  | 'RETURN_NOT_FOUND'
  // Conflits metier
  | 'CONFLICT'
  | 'INSUFFICIENT_STOCK'
  | 'CART_EMPTY'
  | 'INVALID_ORDER_STATE'
  | 'INVALID_DISCOUNT_CODE'
  | 'EMAIL_ALREADY_USED'
  // Authentification
  | 'INVALID_CREDENTIALS'
  | 'INVALID_REFRESH_TOKEN'
  | 'TOO_MANY_ATTEMPTS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  // Divers
  | 'FILE_TOO_LARGE'
  | 'INTERNAL_ERROR';

/** Codes signalant qu'une ressource n'existe plus : la vue doit revenir a la liste. */
export const NOT_FOUND_CODES: readonly ErrorCode[] = [
  'RESOURCE_NOT_FOUND',
  'PRODUCT_NOT_FOUND',
  'CATEGORY_NOT_FOUND',
  'VARIANT_NOT_FOUND',
  'ORDER_NOT_FOUND',
  'PAYMENT_NOT_FOUND',
  'ZONE_NOT_FOUND',
  'DISCOUNT_CODE_NOT_FOUND',
  'RETURN_NOT_FOUND',
];
