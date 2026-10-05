import { toast } from 'sonner'

let updateRequested = false
let reloading = false

function promptUpdate(worker: ServiceWorker) {
  toast('Nowa wersja docvue jest gotowa', {
    id: 'pwa-update',
    duration: Number.POSITIVE_INFINITY,
    action: {
      label: 'Odśwież',
      onClick: () => {
        updateRequested = true
        worker.postMessage({ type: 'SKIP_WAITING' })
      },
    },
  })
}

export function registerPwa() {
  if (!import.meta.env.PROD) return
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateRequested || reloading) return
    reloading = true
    window.location.reload()
  })

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          promptUpdate(registration.waiting)
        }

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing
          if (!worker) return
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              promptUpdate(worker)
            }
          })
        })
      })
      .catch(() => {})
  }

  if (document.readyState === 'complete') {
    register()
  } else {
    window.addEventListener('load', register)
  }
}
