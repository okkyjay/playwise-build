self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const isAvatar = event.request.method === 'GET' && /\/avatars\/avatar-\d{2}\.webp$/.test(url.pathname)
  if (!isAvatar) return

  event.respondWith((async () => {
    const cache = await caches.open('lectofix-avatars-v1')
    const cached = await cache.match(event.request)
    if (cached) return cached

    const response = await fetch(event.request)
    if (response.ok || response.type === 'opaque') await cache.put(event.request, response.clone())
    return response
  })())
})

self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {}
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const visible = clients.find((client) => client.visibilityState === 'visible')
    if (visible) { visible.postMessage({ type: 'WEB_PUSH_RECEIVED', payload }); return }
    await self.registration.showNotification(payload.title || 'Lectofix update', { body: payload.body || 'You have a new update.', icon: '/favicon.svg', badge: '/favicon.svg', tag: payload.tag || `lectofix-${payload.notification_id || 'update'}`, renotify: false, data: { notification_id: payload.notification_id, action_url: payload.action_url || '/notifications' } })
  })())
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const raw = event.notification.data?.action_url || '/notifications'
    const target = raw.startsWith('/') && !raw.startsWith('//') ? new URL(raw, self.location.origin).href : new URL('/notifications', self.location.origin).href
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin)
    if (existing) { await existing.focus(); existing.postMessage({ type: 'WEB_PUSH_OPEN', action_url: new URL(target).pathname, notification_id: event.notification.data?.notification_id }); return }
    await self.clients.openWindow(target)
  })())
})
