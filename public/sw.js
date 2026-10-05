const CACHE = 'docvue-v1'

const PRECACHE = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/icon-32.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
]

const ASSET_RE = /\.(?:png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|woff2?|ttf|otf)$/

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

async function networkFirstNavigate(request) {
  try {
    const response = await fetch(request)
    if (response?.ok && new URL(request.url).pathname === '/') {
      const copy = response.clone()
      caches.open(CACHE).then((cache) => cache.put('/', copy))
    }
    return response
  } catch {
    const shell = await caches.match('/')
    if (shell) return shell
    const offline = await caches.match('/offline.html')
    if (offline) return offline
    return new Response('Offline', { status: 503, statusText: 'Offline' })
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response?.ok) {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(request, copy))
      }
      return response
    })
    .catch(() => null)

  if (cached) return cached
  const response = await network
  if (response) return response
  return new Response('', { status: 504, statusText: 'Offline' })
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigate(request))
    return
  }

  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  const isAsset = url.pathname.startsWith('/assets/') || ASSET_RE.test(url.pathname)
  if (!isAsset) return

  event.respondWith(staleWhileRevalidate(request))
})
