import { DOCUMENT, Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'scmc.admin.refresh';

/**
 * Persistance du seul jeton de rafraichissement.
 *
 * Le jeton d'acces, lui, ne quitte jamais la memoire (`SessionStore`) : il n'est
 * donc pas lisible depuis le stockage du navigateur. Le jeton de rafraichissement
 * doit en revanche survivre a un rechargement de page pour permettre la reprise
 * de session au demarrage, et l'API le renvoie dans le corps JSON (pas dans un
 * cookie httpOnly) — c'est aujourd'hui le seul endroit ou le stocker.
 *
 * A durcir cote backend : poser le refresh token en cookie `httpOnly` + `SameSite`
 * rendrait ce stockage inutile et fermerait l'exposition au XSS.
 */
@Injectable({ providedIn: 'root' })
export class RefreshTokenStorage {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  private get storage(): Storage | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      // Stockage bloque par la configuration du navigateur : on degrade en session volatile.
      return null;
    }
  }

  read(): string | null {
    return this.storage?.getItem(STORAGE_KEY) ?? null;
  }

  write(token: string): void {
    this.storage?.setItem(STORAGE_KEY, token);
  }

  clear(): void {
    this.storage?.removeItem(STORAGE_KEY);
  }
}
