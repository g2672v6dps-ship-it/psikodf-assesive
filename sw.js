// 🤖 Fully Automated Service Worker for YKS Takip Push Notifications
const CACHE_NAME = 'yks-takip-v3';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/pwa_api.html'
];

// Otomatik bildirim gönderme sistemi
const AUTO_NOTIFICATION_ENABLED = true;

// Install event
self.addEventListener('install', function(event) {
  console.log('Service Worker v2 installed');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
  // Yeni SW'yi hemen aktif et
  self.skipWaiting();
});

// Activate event - eski cache'leri temizle
self.addEventListener('activate', function(event) {
  console.log('Service Worker activated');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tüm client'ları kontrol et
  return self.clients.claim();
});

// 🤖 Enhanced Push event with Auto-Send Capabilities
self.addEventListener('push', function(event) {
  console.log('🤖 Enhanced Push message received with auto-capabilities');
  
  let data = {};
  
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('Push data parse error:', e);
    data = { title: 'YKS Takip', body: 'Yeni bildiriminiz var!' };
  }
  
  const title = data.title || 'YKS Takip Sistemi';
  const body = data.body || 'Yeni bildiriminiz var!';
  const tag = data.tag || 'default';
  const type = data.type || 'info';
  
  // Otomatik bildirim kontrolü
  const isAutoNotification = data.auto === true || tag.includes('auto') || tag.includes('welcome');
  const showToast = data.toast === true || isAutoNotification;
  
  const options = {
    body: body,
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%233B82F6"/><text x="50" y="60" font-size="40" text-anchor="middle" fill="white">🎯</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%233B82F6"/><text x="50" y="60" font-size="40" text-anchor="middle" fill="white">🎯</text></svg>',
    tag: tag,
    requireInteraction: !isAutoNotification, // Auto bildirimler için requireInteraction kapat
    renotify: true,
    silent: isAutoNotification, // Auto bildirimler için sessiz
    data: {
      ...data,
      timestamp: Date.now(),
      url: data.url || '/',
      isAuto: isAutoNotification
    },
    actions: [
      {
        action: 'open',
        title: '📱 Aç',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📱</text></svg>'
      },
      {
        action: 'dismiss',
        title: '❌ Kapat'
      }
    ]
  };

  console.log('🤖 Showing notification with auto-features:', { title, body, tag, isAutoNotification });
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );

  // Client'lara bildirim bilgisini gönder
  self.clients.matchAll().then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({
        type: 'push_notification',
        title: title,
        body: body,
        tag: tag,
        type: type,
        data: data,
        isAuto: isAutoNotification
      });
    });
  });

  // Otomatik bildirim sonrası işlemler
  if (isAutoNotification && AUTO_NOTIFICATION_ENABLED) {
    setTimeout(() => {
      console.log('🤖 Auto notification cleanup');
      // Auto bildirim sonrası temizleme işlemleri
    }, 5000);
  }
});

// Otomatik hoşgeldin bildirimi gönder
function sendAutoWelcomeNotification() {
  if (!AUTO_NOTIFICATION_ENABLED) return;
  
  console.log('🤖 Sending auto welcome notification...');
  
  const welcomeData = {
    title: '🎉 Hoşgeldin!',
    body: 'YKS Takip uygulaması kurulumu tamamlandı. Bildirimlerinizi almaya hazırım!',
    tag: 'auto_welcome',
    type: 'welcome',
    auto: true,
    toast: true
  };

  // Self messaging to trigger push event
  self.registration.showNotification(welcomeData.title, {
    body: welcomeData.body,
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%233B82F6"/><text x="50" y="60" font-size="40" text-anchor="middle" fill="white">🎯</text></svg>',
    tag: welcomeData.tag,
    requireInteraction: false,
    silent: true,
    data: welcomeData
  });
}

// Enhanced Notification click event
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event.notification.tag, 'Action:', event.action);
  event.notification.close();

  // Action'a göre davran
  if (event.action === 'dismiss') {
    return; // Sadece kapat
  }

  // Default action veya 'open' action
  const urlToOpen = event.notification.data && event.notification.data.url 
    ? event.notification.data.url 
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Eğer zaten açık bir pencere varsa, ona odaklan
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Yeni pencere aç
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync event (gelecekte kullanım için)
self.addEventListener('sync', function(event) {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'background-notification') {
    event.waitUntil(doBackgroundWork());
  }
});

// Fetch event - enhanced caching
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Network request
        return fetch(event.request).then(function(response) {
          // Response'ı cache'e ekle (GET istekleri için)
          if (event.request.method === 'GET' && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
      .catch(function(error) {
        console.log('Fetch failed, returning offline page:', error);
        // Offline durumunda basit bir mesaj döndür
        if (event.request.destination === 'document') {
          return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>YKS Takip - Offline</title>
                <meta charset="UTF-8">
            </head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>📱 YKS Takip</h1>
                <p>🌐 İnternet bağlantınız yok.</p>
                <p>🔄 Lütfen bağlantınızı kontrol edin.</p>
            </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      })
  );
});

// Background işlev (gelecekte genişletilebilir)
function doBackgroundWork() {
  return new Promise(function(resolve) {
    console.log('Doing background work...');
    // Burada veritabanı senkronizasyonu, cache temizleme vs. yapılabilir
    resolve();
  });
}

// Message event - client'lardan gelen mesajları dinle
self.addEventListener('message', function(event) {
  console.log('SW Message received:', event.data);
  
  if (event.data && event.data.type === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'getVersion') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Push subscription management (gelecekte genişletilebilir)
function managePushSubscription() {
  return self.registration.pushManager.getSubscription()
    .then(function(subscription) {
      if (subscription) {
        console.log('Push subscription exists:', subscription);
        return subscription;
      } else {
        console.log('No push subscription, would need VAPID keys for real implementation');
        return null;
      }
    });
}