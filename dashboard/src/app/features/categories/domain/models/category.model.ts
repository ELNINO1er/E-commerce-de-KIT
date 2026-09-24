/** Categorie du catalogue (`CategoryResponse`). */
export interface Category {
  id: number;
  name: string;
  slug: string;
  /** Categorie parente, pour les sous-categories. */
  parentId: number | null;
}

/** Corps de creation/modification (`CategoryRequest`) — `slug` derive du nom si absent. */
export interface CategoryRequest {
  name: string;
  slug?: string;
  parentId?: number | null;
}
