// ============================================================
// fetch helpers — guarantee fresh data, bypass all caches
// ============================================================

/**
 * fetchFresh — fetch dengan cache: 'no-store' + cache-busting param
 *
 * Pakai ini untuk API yang SENSITIF terhadap data terbaru (groups, attendance,
 * activities, dll). Tidak pakai untuk static assets.
 *
 * Bug lama: default fetch() bisa pakai HTTP cache atau SW cache.
 * Akibatnya user lihat data stale walaupun server sudah return data baru.
 */
export async function fetchFresh(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Tambah cache-busting param untuk bypass HTTP cache & CDN
  const separator = url.includes('?') ? '&' : '?';
  const cacheBustUrl = `${url}${separator}_t=${Date.now()}`;

  return fetch(cacheBustUrl, {
    ...options,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      ...options.headers,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  });
}
