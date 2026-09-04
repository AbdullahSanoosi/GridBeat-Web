/**
 * The two production hostnames the marketing/dashboard split (see
 * `src/middleware.ts`) routes between. Shared so the middleware and the
 * homepage's own outbound links agree on exactly what "the marketing host"
 * means, rather than two copies of the same two strings drifting apart.
 */
export const MARKETING_HOST = "gridbeat.app";
export const DASHBOARD_HOST = "dashboard.gridbeat.app";
