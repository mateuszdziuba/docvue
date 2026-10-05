import { getRequestUrl } from '@tanstack/react-start/server'

/**
 * Publiczny adres aplikacji do linków w e-mailach (zaproszenia, reset hasła).
 * Ignoruje lokalny adres z dev, w razie braku konfiguracji używa origin żądania.
 */
export function resolveSiteUrl(): string {
  const configured = process.env.VITE_SITE_URL ?? import.meta.env.VITE_SITE_URL
  if (configured && !/localhost|127\.0\.0\.1/i.test(configured)) {
    return configured.replace(/\/$/, '')
  }
  try {
    return getRequestUrl().origin
  } catch {
    return (configured ?? '').replace(/\/$/, '')
  }
}
