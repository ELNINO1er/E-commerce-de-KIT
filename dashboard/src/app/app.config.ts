import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { TranslatedTitleStrategy } from './core/i18n/translated-title.strategy';
import { SessionStore } from './features/auth/application/session.store';
import { AUTH_REPOSITORY } from './features/auth/domain/ports/auth-repository.port';
import { HttpAuthRepository } from './features/auth/infrastructure/http-auth.repository';
import { STATS_REPOSITORY } from './features/dashboard/domain/ports/stats-repository.port';
import { HttpStatsRepository } from './features/dashboard/infrastructure/http-stats.repository';
import { CATEGORY_REPOSITORY } from './features/categories/domain/ports/category-repository.port';
import { HttpCategoryRepository } from './features/categories/infrastructure/http-category.repository';
import { PRODUCT_REPOSITORY } from './features/products/domain/ports/product-repository.port';
import { HttpProductRepository } from './features/products/infrastructure/http-product.repository';
import { MEDIA_REPOSITORY } from './features/products/domain/ports/media-repository.port';
import { HttpMediaRepository } from './features/products/infrastructure/http-media.repository';
import { SEARCH_REPOSITORY } from './features/search/domain/ports/search-repository.port';
import { HttpSearchRepository } from './features/search/infrastructure/http-search.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // `withComponentInputBinding` alimente les entrees des composants a partir
    // des parametres de route (`:orderNumber` → `input.required<string>()`).
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),

    // Les routes portent une cle de traduction dans `title` ; la strategie la
    // resout et reapplique le titre au changement de langue.
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },

    // Branchement des ports sur leurs adaptateurs HTTP (un seul endroit dans l'app).
    { provide: AUTH_REPOSITORY, useClass: HttpAuthRepository },
    { provide: STATS_REPOSITORY, useClass: HttpStatsRepository },
    { provide: CATEGORY_REPOSITORY, useClass: HttpCategoryRepository },
    { provide: PRODUCT_REPOSITORY, useClass: HttpProductRepository },
    { provide: MEDIA_REPOSITORY, useClass: HttpMediaRepository },
    // Recherche globale : portee par l'entete, donc hors de toute route.
    { provide: SEARCH_REPOSITORY, useClass: HttpSearchRepository },

    // Reprise de session avant la premiere navigation : le jeton d'acces ne
    // survit pas au rechargement, on le regenere depuis le refresh token stocke.
    provideAppInitializer(() => inject(SessionStore).restore()),
  ],
};
