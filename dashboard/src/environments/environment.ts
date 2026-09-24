/**
 * API de **production** — la seule cible du dashboard.
 *
 * `environment.development.ts` porte volontairement la meme URL : meme lance
 * en `ng serve`, le back-office interroge l'API de production. Il n'existe
 * donc plus de cible locale.
 */
export const environment = {
  production: true,
  apiUrl: 'https://kic-fr.com/api',
};
