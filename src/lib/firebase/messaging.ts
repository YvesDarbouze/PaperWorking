'use client';

import { getApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

// Initialize messaging lazily on client-side only
let messagingInstance: Messaging | null = null;

export function getClientMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null;
  
  if (!messagingInstance) {
    try {
      // Check if service worker is supported in the browser
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const app = getApps().length > 0 ? getApp() : null;
        if (app) {
          messagingInstance = getMessaging(app);
        }
      }
    } catch (err) {
      console.warn('[FCM Client] Failed to initialize getMessaging:', err);
    }
  }
  return messagingInstance;
}

/**
 * Requests push permission and returns the FCM device token if granted.
 */
export async function requestPushPermissionAndGetToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[FCM Client] Service worker or Push notifications not supported in this browser.');
      return null;
    }

    // 2. Request Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[FCM Client] Notification permission was denied/ignored:', permission);
      return null;
    }

    // 3. Register the service worker explicitly
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    console.log('[FCM Client] Service Worker registered with scope:', registration.scope);

    // Wait for the service worker registration to transition to 'activated' state if it isn't already
    await new Promise<void>((resolve) => {
      if (registration.active && registration.active.state === 'activated') {
        resolve();
        return;
      }

      const isActivated = () => registration.active && registration.active.state === 'activated';

      let resolved = false;
      let checkInterval: any = null;
      let timeoutId: any = null;

      const finish = () => {
        if (resolved) return;
        resolved = true;

        if (checkInterval) clearInterval(checkInterval);
        if (timeoutId) clearTimeout(timeoutId);

        registration.removeEventListener('updatefound', onUpdateFound);
        if (registration.installing) {
          registration.installing.removeEventListener('statechange', onStateChange);
        }
        if (registration.waiting) {
          registration.waiting.removeEventListener('statechange', onStateChange);
        }
        if (registration.active) {
          registration.active.removeEventListener('statechange', onStateChange);
        }

        resolve();
      };

      const onStateChange = () => {
        if (isActivated()) {
          finish();
        }
      };

      const onUpdateFound = () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', onStateChange);
        }
        if (isActivated()) {
          finish();
        }
      };

      registration.addEventListener('updatefound', onUpdateFound);

      if (registration.installing) {
        registration.installing.addEventListener('statechange', onStateChange);
      }
      if (registration.waiting) {
        registration.waiting.addEventListener('statechange', onStateChange);
      }
      if (registration.active) {
        registration.active.addEventListener('statechange', onStateChange);
      }

      // Polling fallback to ensure we catch the activation status in all scenarios
      checkInterval = setInterval(() => {
        if (registration.installing) {
          registration.installing.addEventListener('statechange', onStateChange);
        }
        if (registration.waiting) {
          registration.waiting.addEventListener('statechange', onStateChange);
        }
        if (registration.active) {
          registration.active.addEventListener('statechange', onStateChange);
        }

        if (isActivated()) {
          finish();
        }
      }, 50);

      // Bounded safety timeout (10 seconds) to prevent hanging the promise indefinitely
      timeoutId = setTimeout(finish, 10000);
    });

    // 4. Retrieve token from FCM
    const messagingClient = getClientMessaging();
    if (!messagingClient) return null;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('[FCM Client] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not defined in environment variables.');
      return null;
    }

    const token = await getToken(messagingClient, {
      vapidKey,
      serviceWorkerRegistration: registration
    });

    return token;
  } catch (error) {
    console.error('[FCM Client] Error getting token:', error);
    return null;
  }
}

/**
 * Registers a callback for receiving foreground notifications.
 */
export function onForegroundMessage(callback: (payload: any) => void) {
  const messagingClient = getClientMessaging();
  if (!messagingClient) return () => {};

  return onMessage(messagingClient, (payload) => {
    console.log('[FCM Client] Foreground message received: ', payload);
    callback(payload);
  });
}
