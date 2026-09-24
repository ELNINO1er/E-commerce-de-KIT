import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { DOCUMENT, inject, Injectable } from '@angular/core';
import { map, Observable, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageQuery, PageResponse } from './page-response.model';

/** Valeurs acceptees dans une query string ; `null`/`undefined`/`''` sont ignores. */
export type QueryValue = string | number | boolean | readonly string[] | null | undefined;
export type QueryParams = Record<string, QueryValue>;

/** Fichier binaire renvoye par l'API (facture PDF, export CSV). */
export interface DownloadedFile {
  blob: Blob;
  filename: string;
}

const FILENAME_PATTERN = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i;

/**
 * Service HTTP commun a tous les adaptateurs `infrastructure/`.
 *
 * Il porte trois choses qu'on ne veut pas voir dupliquees :
 *   - le prefixe `environment.apiUrl`, applique aux chemins de `api.endpoints.ts` ;
 *   - la construction des query params (les valeurs vides sont retirees, ce qui
 *     evite d'envoyer `?q=&categoryId=` quand un filtre n'est pas renseigne) ;
 *   - le telechargement de binaires avec lecture du nom de fichier.
 *
 * L'authentification n'est **pas** ici : `authInterceptor` pose le `Bearer` et
 * gere le rafraichissement sur 401, pour toutes les requetes sans exception.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  /** URL absolue d'un chemin d'`API` — utile pour un lien direct ou un test. */
  url(path: string): string {
    return `${environment.apiUrl}${path}`;
  }

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http.get<T>(this.url(path), { params: toHttpParams(params) });
  }

  /** Liste paginee : meme chose que `get`, avec `page`/`size`/`sort` en plus. */
  getPage<T>(path: string, params?: QueryParams & PageQuery): Observable<PageResponse<T>> {
    return this.get<PageResponse<T>>(path, params as QueryParams);
  }

  post<T>(path: string, body?: unknown, params?: QueryParams): Observable<T> {
    return this.http.post<T>(this.url(path), body ?? null, { params: toHttpParams(params), withCredentials: true }).pipe(timeout(15000));
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.http.put<T>(this.url(path), body ?? null);
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http.patch<T>(this.url(path), body ?? null);
  }

  delete<T = void>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }

  /**
   * Telecharge un binaire (facture PDF, export CSV).
   *
   * Le nom de fichier est lu dans `Content-Disposition`. Le backend expose cet
   * en-tete au navigateur (`setExposedHeaders`), il est donc lisible malgre les
   * deux origines distinctes en dev ; `fallbackName` ne sert que si l'en-tete
   * venait a manquer.
   */
  download(path: string, fallbackName: string, params?: QueryParams): Observable<DownloadedFile> {
    return this.http
      .get(this.url(path), {
        params: toHttpParams(params),
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(
        map((response) => ({
          blob: response.body ?? new Blob(),
          filename: filenameFrom(response.headers) ?? fallbackName,
        })),
      );
  }

  /** Declenche l'enregistrement d'un fichier recupere par `download()`. */
  save(file: DownloadedFile): void {
    const view = this.document.defaultView;
    if (!view) {
      return; // Rendu serveur : aucun telechargement possible.
    }
    const href = view.URL.createObjectURL(file.blob);
    const link = this.document.createElement('a');
    link.href = href;
    link.download = file.filename;
    link.click();
    view.URL.revokeObjectURL(href);
  }

  /** Raccourci `download` + `save`, le cas d'usage courant depuis un bouton. */
  downloadAndSave(path: string, fallbackName: string, params?: QueryParams): Observable<void> {
    return this.download(path, fallbackName, params).pipe(map((file) => this.save(file)));
  }
}

function toHttpParams(params?: QueryParams): HttpParams {
  let httpParams = new HttpParams();
  if (!params) {
    return httpParams;
  }
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        httpParams = httpParams.append(key, item);
      }
    } else {
      httpParams = httpParams.set(key, String(value));
    }
  }
  return httpParams;
}

function filenameFrom(headers: HttpHeaders): string | null {
  const disposition = headers.get('Content-Disposition');
  const matched = disposition ? FILENAME_PATTERN.exec(disposition) : null;
  return matched ? decodeURIComponent(matched[1]) : null;
}
