// Service Worker para Push Notifications + PWA Installability
// Maneja eventos push y muestra notificaciones nativas del navegador

const ICON_DEFAULT = '/Flugzz.svg'
const BADGE_ICON = '/badge-96.png'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})

self.addEventListener('push', function(event) {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Flugzz CRM', body: event.data.text() }
  }

  const title = data.title || 'Flugzz CRM'
  const options = {
    body: data.body || '',
    icon: ICON_DEFAULT,
    badge: BADGE_ICON,
    tag: data.tag || 'fluggs-notification',
    renotify: true,
    data: {
      url: data.url || '/dashboard',
      notificationId: data.notificationId || null,
    },
    actions: data.actions || [
      { action: 'view', title: 'Ver', icon: ICON_DEFAULT },
      { action: 'dismiss', title: 'Cerrar' },
    ],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  if (event.action === 'dismiss') return

  const urlToOpen = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Si ya hay una ventana abierta, navegar ahi
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus()
        }
      }
      // Si no, abrir nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

self.addEventListener('pushsubscriptionchange', function(event) {
  // La subscription expiro o cambio - el cliente se re-registra automaticamente
  console.log('[SW] Push subscription changed')
})
