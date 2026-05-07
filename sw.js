const CACHE_NAME = 'islands-guide-v2';
const urlsToCache = [
  '/',
  'index.html',
  'manifest.json',
  'sw.js',
  'icons/icon-192.jpg',   // ← 追加
  'icons/icon-512.jpg'    // ← 追加
];

// インストール時に必須リソースをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Cache addAll failed', err))
  );
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// フェッチインターセプト (キャッシュ優先 + ネットワークバックアップ)
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  if (event.request.method === 'GET') {
    // 同オリジンのリクエストはキャッシュ優先
    if (requestUrl.origin === location.origin) {
      event.respondWith(
        caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            return fetch(event.request).then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseClone);
                });
              }
              return networkResponse;
            }).catch(() => {
              return new Response('オフラインです。インターネット接続を確認してください。', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
              });
            });
          })
      );
    } else {
      // 外部画像などはネットワーク優先、失敗時はキャッシュ参照
      event.respondWith(
        fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => caches.match(event.request))
      );
    }
  }
});