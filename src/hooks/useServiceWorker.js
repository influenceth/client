import { useCallback, useEffect, useState } from 'react';

import useInterval from '~/hooks/useInterval';

const useServiceWorker = () => {
  const [updateNeeded, setUpdateNeeded] = useState(false);
  //const refreshing = useRef(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      console.log('in nav');
      navigator.serviceWorker.getRegistration().then((registration) => {
        console.log('registrration', registration);

        function awaitInstallingWorker() {
          if (registration.installing) {
            registration.installing.addEventListener('statechange', function() {
              console.log('onstatechange', registration.installing.state);
                if (registration.installing.state === 'installed') {
                  console.log('installed');
                  if (navigator.serviceWorker.controller) {
                    console.log('ready to reload');
                    setUpdateNeeded(true);
                  }
                }
            });
          }
        }

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

            registration.update();
          }
        }
      });
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // check for app updates regularly
  useInterval(() => {
    console.log('interval');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          console.log('update');
          registration.update();
        }
      });
    }
  }, updateNeeded ? null : 30000);

  return {
    updateNeeded,
    onUpdateVersion: useCallback(() => {
      console.log('onUpdateVersion');
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration) {
            console.log('reg', registration);
            console.log('waiting', registration.waiting);
            console.log('installing', registration.installing);
            console.log('installed', registration.installed);
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      }
      /*
      console.log('onUpdateVersion');
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) {
            console.log('skipWaiting');
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          } else {
            console.log('reload 1');
            window.location.reload();
          }
        });
      } else {
        console.log('reload 2');
        window.location.reload();
      }
      */
    }, [])
  }
};

export default useServiceWorker;