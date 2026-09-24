import { HttpErrorResponse } from '@angular/common/http';
import { ErrorCode, NOT_FOUND_CODES } from './error-code';

/** Une erreur de validation champ par champ (`com.example.scmc.common.ValidationError`). */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Format d'erreur unique de l'API : RFC 9457 ProblemDetail enrichi par
 * `GlobalExceptionHandler` avec `timestamp`, `code` et, en validation, `errors[]`.
 */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  timestamp?: string;
  /** Code machine stable — c'est lui qu'il faut tester, pas `detail`. */
  code?: ErrorCode;
  errors?: ValidationError[];
}

/**
 * Libelles a afficher quand l'erreur ne porte pas de message exploitable.
 *
 * Ils sont injectes par l'appelant plutot que figes ici : `problem-detail.ts`
 * est un module pur, sans acces au service de traduction. Les composants passent
 * `t('error.network')` / `t('error.unexpected')`.
 */
export interface ProblemFallbacks {
  network: string;
  unexpected: string;
}

const DEFAULT_FALLBACKS: ProblemFallbacks = {
  network: "Le serveur est injoignable. Vérifiez que l'API KIC est démarrée.",
  unexpected: 'Une erreur inattendue est survenue.',
};

function isProblemDetail(body: unknown): body is ProblemDetail {
  return typeof body === 'object' && body !== null && 'status' in body;
}

/** Le ProblemDetail porte par une reponse d'erreur, s'il y en a un. */
export function toProblemDetail(error: unknown): ProblemDetail | null {
  if (error instanceof HttpErrorResponse && isProblemDetail(error.error)) {
    return error.error;
  }
  return null;
}

/**
 * Message affichable a l'utilisateur.
 *
 * Quand l'API fournit un `detail`, il est repris tel quel : ces messages sont
 * produits en francais par le backend et ne sont pas traduisibles cote client.
 * Seuls les cas sans message exploitable passent par `fallbacks`.
 */
export function problemMessage(error: unknown, fallbacks = DEFAULT_FALLBACKS): string {
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return fallbacks.network;
  }

  const problem = toProblemDetail(error);
  if (!problem) {
    return error instanceof HttpErrorResponse
      ? (error.message ?? fallbacks.unexpected)
      : fallbacks.unexpected;
  }

  if (problem.errors?.length) {
    return problem.errors.map((e) => e.message).join(' · ');
  }
  return problem.detail ?? problem.title ?? fallbacks.unexpected;
}

/** Code machine porte par l'erreur, s'il y en a un. */
export function errorCode(error: unknown): ErrorCode | null {
  return toProblemDetail(error)?.code ?? null;
}

/** L'erreur signale-t-elle une ressource disparue ? (la vue doit revenir a la liste) */
export function isNotFound(error: unknown): boolean {
  const code = errorCode(error);
  return code !== null && NOT_FOUND_CODES.includes(code);
}

/** Erreurs de validation indexees par nom de champ, pour les afficher sous chaque input. */
export function fieldErrors(error: unknown): Record<string, string> {
  const problem = toProblemDetail(error);
  const result: Record<string, string> = {};
  for (const item of problem?.errors ?? []) {
    result[item.field] = item.message;
  }
  return result;
}
