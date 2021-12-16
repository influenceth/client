import { useCallback, useEffect, useState } from 'react';

const useServiceWorker = () => {
  const [updateNeeded, setUpdateNeeded] = useState(false);
  //const refreshing = useRef(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      console.log('in nav');
      navigator.serviceWorker.getRegistration().then((registration) => {
        console.log('registrration', registration);
        registration.addEventListener('onupdatefound', () => {
          console.log('onupdatefound');
          const installingWorker = registration.installing;
          if (installingWorker) {
            console.log('installingWorker', installingWorker);
            installingWorker.onstatechange = () => {
              console.log('onstatechange', installingWorker.state);
              if (installingWorker.state === 'installed') {
                console.log('installed');
                if (navigator.serviceWorker.controller) {
                  console.log('ready to reload');
                  setUpdateNeeded(true);
                }
              }
            };
          }
        });
      });

      /*
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('controllerchange');
        if (refreshing.current) return;
        refreshing.current = true;
        window.location.reload();
      });
  
      navigator.serviceWorker.getRegistration().then((reg) => {
        function waitForInstall() {
          console.log('wait for install')
          reg.installing.addEventListener('statechange', function() {
            console.log('statechange', this.state);
            if (this.state === 'installed') {
              setUpdateNeeded(true);
            }
          });
        }

        console.log('reg', reg);

        // if no reg, nothing to do
        if (!reg) return;

        // if new version is already waiting, prompt now
        if (reg.waiting) return setUpdateNeeded(true);

        // if new version is still installing, wait for install
        if (reg.installing) return waitForInstall();

        // if nothing new yet, listen for updatefound, then wait for install
        reg.addEventListener('updatefound', waitForInstall);
      });
      */
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    updateNeeded,
    onUpdateVersion: useCallback(() => {
      console.log('onUpdateVersion');
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((registration) => {
          console.log('reg', registration);
          console.log('waiting', registration.waiting);
          console.log('installing', registration.installing);
          console.log('installed', registration.installed);
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
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