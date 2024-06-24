import { useCallback, useEffect, useRef, useState } from 'react';

const useServiceWorker = () => {
  const [updateNeeded, setUpdateNeeded] = useState(false);
  const refreshing = useRef(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      console.log('pmk serviceWorker', navigator.serviceWorker?.status, navigator.serviceWorker);

      // if there is a controller change (i.e. if new serviceworker becomes active),
      // reload the page so that newly cached assets are actually the ones in use
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing.current) return;
        refreshing.current = true;
        window.location.reload();
      });

      // evaluate serviceworker state, prompt user to reload if a new version is ready
      navigator.serviceWorker.getRegistration().then((registration) => {
        console.log('pmk registration', registration);
        if (!registration) return;

        // if there is an installing worker, wait until it is installed, then prompt user to update
        const awaitInstallingWorker = () => {
          if (registration.installing) {
            const installingWorker = registration.installing;
            installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    setUpdateNeeded(true);
                  }
                }
            });
          }
        };

        // already waiting (i.e. ready)
        if (registration.waiting) {
          setUpdateNeeded(true);

        // already installing (i.e. ready once installed)
        } else if (registration.installing) {
          awaitInstallingWorker();

        // nothing happening yet
        } else {
          registration.addEventListener('updatefound', () => {
            awaitInstallingWorker();
          });
        }
      });
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    updateNeeded,
    onUpdateVersion: useCallback(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      }
    }, [])
  }
};

export default useServiceWorker;