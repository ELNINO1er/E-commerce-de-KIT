import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/** Reponse de `POST /api/admin/uploads/image`. */
export interface UploadedImage {
  /** URL **absolue**, a placer telle quelle dans `imageUrl` du produit. */
  url: string;
  filename: string;
  contentType: string;
  /** Taille en octets. */
  size: number;
}

/**
 * Televersement d'images produit.
 *
 * Le parcours est en deux temps, impose par l'API : on televerse d'abord le
 * fichier pour obtenir une URL, puis on enregistre cette URL dans le produit.
 * Un fichier televerse mais jamais rattache reste donc orphelin sur le disque —
 * c'est assume cote backend.
 */
export interface MediaRepository {
  /** JPEG / PNG / WEBP, 5 Mo maximum (413 `FILE_TOO_LARGE` au-dela). */
  uploadImage(file: File): Observable<UploadedImage>;
}

export const MEDIA_REPOSITORY = new InjectionToken<MediaRepository>('MediaRepository');
