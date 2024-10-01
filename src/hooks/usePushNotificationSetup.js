import { useState, useEffect } from 'react';
import api from '~/lib/api';
import useStore from './useStore';

const publicVapidKey = '<YourPublicVapidKey>'; // Replace with your actual public VAPID key

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotificationSetup = () => {
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [permission, setPermission] = useState(Notification.permission);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);

  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  useEffect(() => {
    if (isSupported) {
      navigator.serviceWorker.ready
        .then(async (registration) => {
          const existingSubscription = await registration.pushManager.getSubscription();
          if (existingSubscription) {
            setIsSubscribed(true);
            setSubscription(existingSubscription);
          } else {
            setIsSubscribed(false);
          }
        })
        .catch((error) => {
          console.error('Error checking subscription status:', error);
          setIsSubscribed(false);
        });
    }
  }, []);

  const subscribe = async () => {
    if (isSupported) {
      try {
        const registration = await navigator.serviceWorker.ready;

        const pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
        });

        // Send subscription to the server
        try {
          await api.updateUser({ pushSubscription });
          setIsSubscribed(true);
          setSubscription(pushSubscription);
          return;

        } catch (e1) {
          console.error(e1);
          createAlert({
            type: 'GenericAlert',
            level: 'warning',
            data: { content: 'User update failed.' },
            duration: 5000
          });
        }
      } catch (e2) {
        console.error(e2);
        createAlert({
          type: 'GenericAlert',
          level: 'warning',
          data: { content: 'Failed to create push notification connection.' },
          duration: 5000
        });
      }
    } else {
      console.error('Push notifications not supported');
    }
    setIsSubscribed(false);
    setSubscription();
  };

  const requestPermission = async () => {
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      return permissionResult;
    } catch (error) {
      // TODO: create alert
    }
    return 'default';
  };

  return {
    permission,
    isSubscribed,
    isSupported,
    subscription,
    subscribe,
    requestPermission,
  };
};
