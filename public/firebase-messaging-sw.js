// ═══════════════════════════════════════════════════════
//  PaperWorking FCM Service Worker
// ═══════════════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker using the public config
firebase.initializeApp({
  apiKey: "AIzaSyDlmH8L2s9_IXXKUx9DIhhWP4nMYDzUlvg",
  authDomain: "paperworking-97055.firebaseapp.com",
  projectId: "paperworking-97055",
  storageBucket: "paperworking-97055.firebasestorage.app",
  messagingSenderId: "779101817926",
  appId: "1:779101817926:web:0dfce37fddc70718e70e47"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);
  
  // Extract notification attributes
  const title = payload.data?.title || payload.notification?.title || 'PaperWorking Alert';
  const body = payload.data?.body || payload.notification?.body || 'New critical update available';
  const deepLinkUrl = payload.data?.deepLinkUrl || '/dashboard/inbox';

  const notificationOptions = {
    body: body,
    icon: '/next.svg',
    badge: '/favicon.ico',
    data: {
      deepLinkUrl: deepLinkUrl
    },
    tag: payload.data?.tag || 'paperworking-critical-alert',
    requireInteraction: true // critical alert, require interaction to dismiss
  };

  self.registration.showNotification(title, notificationOptions);
});

// Handle notification click events (deep-linking)
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked: ', event.notification);
  event.notification.close();

  const targetUrl = event.notification.data?.deepLinkUrl || '/dashboard/inbox';

  // Resolve absolute URL
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open with this domain
      for (const client of windowClients) {
        if (client.url === absoluteUrl && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If we have a client that is open but on a different URL, navigate it
      if (windowClients.length > 0) {
        const client = windowClients[0];
        if ('navigate' in client && 'focus' in client) {
          client.navigate(absoluteUrl);
          return client.focus();
        }
      }

      // If no windows are open, open a new tab
      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl);
      }
    })
  );
});
