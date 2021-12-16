import { useCallback, useEffect, useRef, useState } from 'react';

const useServiceWorker = () => {
  const [updateNeeded, setUpdateNeeded] = useState(false);
  const refreshing = useRef(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      console.log('in nav');

      // if there is a controller change (i.e. if new serviceworker becomes active),
      // reload the page so that newly cached assets are actually the ones in use
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing.current) return;
        refreshing.current = true;
        window.location.reload();
      });

      // evaluate serviceworker state, prompt user to reload if a new version is ready
      navigator.serviceWorker.getRegistration().then((registration) => {
        console.log('registrration', registration);

        const awaitInstallingWorker = () => {
          if (registration.installing) {
            const installingWorker = registration.installing;
            installingWorker.addEventListener('statechange', (x) => {
              console.log('registration pre check', registration, x);
              console.log('onstatechange', installingWorker.state);
                if (installingWorker.state === 'installed') {
                  console.log('installed');
                  if (navigator.serviceWorker.controller) {
                    console.log('ready to reload');
                    setUpdateNeeded(true);
                  }
                }
            });
          }
        };

        if (registration) {
          // already waiting (i.e. ready)
          if (registration.waiting) {
            console.log('already waiting');
            setUpdateNeeded(true);

          // already installing (i.e. ready once installed)
          } else if (registration.installing) {
            console.log('installingWorker', registration.installing);
            awaitInstallingWorker();

          // nothing happening yet
          } else {
            console.log('nothing yet');
            registration.addEventListener('updatefound', () => {
              console.log('update found');
              awaitInstallingWorker();
            });
          }
        }
      });
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    updateNeeded,
    onUpdateVersion: useCallback(() => {
      console.log('onUpdateVersion');
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration) {
            console.log('reg', registration);
            console.log('waiting', registration.waiting);
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      }
    }, [])
  }
};

export default useServiceWorker;