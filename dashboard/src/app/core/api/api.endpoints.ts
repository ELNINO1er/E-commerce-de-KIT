/**
 * Repertoire unique des routes de l'API KIC.
 *
 * Chemins **relatifs** a `environment.apiUrl` (`https://kic-fr.com/api`,
 * en developpement comme en production) : ils sont prefixes par `ApiService`,
 * ne les ecrivez jamais en dur ailleurs.
 *
 * Legende des annotations :
 *   [public]  accessible sans jeton
 *   [auth]    necessite un compte connecte
 *   [ADMIN]   reserve au role ADMIN — voir `SecurityConfig` cote backend
 *   [x]       consomme par le back-office ; les autres existent pour la boutique
 *
 * Toutes les listes renvoient un `PageResponse<T>` et acceptent `page`, `size`
 * et `sort` (`?sort=id,desc`).
 */
export const API = {
  /** Authentification et session. */
  auth: {
    /** POST [public] — creation de compte client (role USER impose par l'API). */
    register: '/auth/register',
    /** POST [public] [x] — renvoie `AuthResponse`. Limite en tentatives. */
    login: '/auth/login',
    /** POST [public] [x] — `{ refreshToken }` ; le jeton tourne a chaque appel. */
    refresh: '/auth/refresh',
    /** POST [public] [x] — `{ refreshToken }` ; revoque le jeton. */
    logout: '/auth/logout',
    /** POST [public] — declenche l'envoi du lien de reinitialisation. */
    forgotPassword: '/auth/forgot-password',
    /** POST [public] — `{ token, password }`. */
    resetPassword: '/auth/reset-password',
    /**
     * GET [auth] [x] — profil du compte courant (`UserResponse`).
     * PATCH [auth] [x] — `{ firstName?, lastName?, phone? }` ; l'e-mail n'y est
     * pas modifiable.
     */
    me: '/auth/me',
  },

  /** Catalogue : produits et leurs variantes (formats). */
  products: {
    /** GET [public] [x] — filtres `q`, `categoryId`, `minPrice`, `maxPrice`, `inStock`, `lowStock`. */
    list: '/products',
    /** POST [ADMIN] [x] — cree le produit **et** ses variantes (`ProductCreateRequest`). */
    create: '/products',
    /** GET [public] [x] · PUT [ADMIN] [x] (hors variantes) · DELETE [ADMIN] [x]. */
    byId: (id: number) => `/products/${id}`,
    /** POST [ADMIN] [x] — ajoute une variante a un produit existant. */
    variants: (productId: number) => `/products/${productId}/variants`,
  },

  /** Variantes prises isolement (format, prix, stock, seuil d'alerte). */
  variants: {
    /** PUT [ADMIN] [x] · DELETE [ADMIN] [x]. */
    byId: (id: number) => `/variants/${id}`,
  },

  categories: {
    /** GET [public] [x] · POST [ADMIN] [x]. */
    list: '/categories',
    create: '/categories',
    /** GET [public] [x] · PUT [ADMIN] [x] · DELETE [ADMIN] [x]. */
    byId: (id: number) => `/categories/${id}`,
  },

  /** Commandes cote client — consommees par la boutique KIC-03, pas par le back-office. */
  orders: {
    /** POST [public] — passage de commande, avec ou sans compte. */
    checkout: '/orders',
    /** GET [auth] — commandes du compte courant. */
    mine: '/orders',
    byNumber: (orderNumber: string) => `/orders/${orderNumber}`,
    cancel: (orderNumber: string) => `/orders/${orderNumber}/cancel`,
    invoice: (orderNumber: string) => `/orders/${orderNumber}/invoice`,
  },

  /**
   * Panier — porte par la boutique KIC-03, hors perimetre du back-office.
   * Identifie par le header `X-Cart-Token`, renvoye au premier ajout.
   */
  cart: {
    current: '/cart',
    items: '/cart/items',
    item: (variantId: number) => `/cart/items/${variantId}`,
  },

  /** Paiements. Le back-office ne fait que consulter par reference. */
  payments: {
    initiate: '/payments/initiate',
    /** GET [public] [x] — etat d'un paiement depuis le detail d'une commande. */
    byReference: (reference: string) => `/payments/${reference}`,
    webhook: (provider: string) => `/payments/webhook/${provider}`,
    /** POST — passerelle MOCK uniquement, pour tester un encaissement en dev. */
    simulate: (reference: string) => `/payments/${reference}/simulate`,
  },

  /** Zones de livraison en lecture publique (tarifs affiches au checkout). */
  deliveryZones: {
    list: '/delivery-zones',
    byId: (id: number) => `/delivery-zones/${id}`,
  },

  /** Verification d'un code promo avant application. */
  discountCodes: {
    /** GET [public] — `?subtotal=` ; renvoie `DiscountPreviewResponse`. */
    preview: (code: string) => `/discount-codes/${code}/preview`,
  },

  /** Comptes clients — lecture seule cote API. */
  users: {
    /** GET [ADMIN] [x] — `?role=USER|ADMIN` et `?q=` (e-mail, nom, prenom). */
    list: '/users',
    /** GET [ADMIN] [x]. */
    byId: (id: number) => `/users/${id}`,
  },

  /** Journal des actions admin, plus recent d'abord. */
  auditLogs: {
    /**
     * GET [ADMIN] [x] — `?actor=` (e-mail, recherche partielle), `?method=`,
     * `?from=` / `?to=` (instants ISO-8601). Le chemin n'est pas filtrable.
     */
    list: '/audit-logs',
    /**
     * GET [ADMIN] — non consomme : `AuditLogResponse` ne porte que les six
     * champs deja affiches sur la ligne. Une fiche de detail n'ajouterait
     * rien.
     */
    byId: (id: number) => `/audit-logs/${id}`,
  },

  /** Routes reservees au back-office. */
  admin: {
    uploads: {
      /**
       * POST [ADMIN] [x] — `multipart/form-data`, part **`file`**
       * (JPEG/PNG/WEBP, 5 Mo max). Renvoie `{ url, filename, contentType, size }`,
       * ou `url` est **absolue**. Parcours en deux temps : televerser, puis
       * envoyer l'`url` obtenue comme `imageUrl` du produit.
       * Erreurs : 400 `INVALID_REQUEST`, 413 `FILE_TOO_LARGE`.
       */
      image: '/admin/uploads/image',
    },
    stats: {
      /** GET [ADMIN] [x] — indicateurs du tableau de bord. */
      dashboard: '/admin/stats/dashboard',
      /** GET [ADMIN] [x] — `?limit=` ; base sur les commandes payees. */
      bestSellers: '/admin/stats/best-sellers',
    },
    orders: {
      /**
       * GET [ADMIN] [x] — `?status=PENDING|PAID|SHIPPED|DELIVERED|CANCELLED`
       * et `?q=` (numero de commande, nom ou e-mail du destinataire).
       */
      list: '/admin/orders',
      /** GET [ADMIN] [x]. */
      byNumber: (orderNumber: string) => `/admin/orders/${orderNumber}`,
      /** PUT [ADMIN] [x] — `{ status }` ; passer a CANCELLED remet le stock. */
      status: (orderNumber: string) => `/admin/orders/${orderNumber}/status`,
      /** PUT [ADMIN] [x] — `{ trackingNote }`. */
      tracking: (orderNumber: string) => `/admin/orders/${orderNumber}/tracking`,
      /** GET [ADMIN] [x] — facture PDF (binaire). */
      invoice: (orderNumber: string) => `/admin/orders/${orderNumber}/invoice`,
      /** GET [ADMIN] [x] — export CSV avec BOM UTF-8 (ouvrable dans Excel). */
      export: '/admin/orders/export',
    },
    discountCodes: {
      /** GET [ADMIN] [x] · POST [ADMIN] [x]. */
      list: '/admin/discount-codes',
      create: '/admin/discount-codes',
      /** GET [ADMIN] [x] · PUT [ADMIN] [x] · DELETE [ADMIN] [x]. */
      byId: (id: number) => `/admin/discount-codes/${id}`,
    },
    deliveryZones: {
      /** GET [ADMIN] [x] · POST [ADMIN] [x]. */
      list: '/admin/delivery-zones',
      create: '/admin/delivery-zones',
      /** PUT [ADMIN] [x] · DELETE [ADMIN] [x]. */
      byId: (id: number) => `/admin/delivery-zones/${id}`,
    },
    returns: {
      /** GET [ADMIN] [x] — `?status=PENDING|APPROVED|REJECTED|COMPLETED`. */
      list: '/admin/returns',
      /** PUT [ADMIN] [x] — `{ status }`. */
      status: (id: number) => `/admin/returns/${id}/status`,
    },
    users: {
      /** PUT [ADMIN] [x] — `{ role }` ; 409 sur le dernier admin ou soi-meme. */
      role: (id: number) => `/admin/users/${id}/role`,
      /** PUT [ADMIN] [x] — `{ enabled }` ; memes garde-fous. */
      status: (id: number) => `/admin/users/${id}/status`,
    },
  },

  /** Boite mail de developpement (profil dev uniquement) — pratique pour relire
   *  un lien de reinitialisation sans serveur SMTP. */
  dev: {
    emails: '/dev/emails',
  },
} as const;

/** Adresses cote client — presentes dans l'API, hors perimetre du back-office. */
export const ADDRESS_ENDPOINTS = {
  list: '/addresses',
  create: '/addresses',
  byId: (id: number) => `/addresses/${id}`,
} as const;
