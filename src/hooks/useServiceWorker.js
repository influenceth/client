import { useCallback, useEffect, useRef, useState } from 'react';

const useServiceWorker = () => {
  const [updateNeeded, setUpdateNeeded] = useState(true);
  const refreshing = useRef(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      console.log('in nav');

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
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    updateNeeded,
    onUpdateVersion: useCallback(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) {
            reg.waiting.postMessage('skipWaiting');
          } else {
            window.location.reload();
          }
        });
      } else {
        window.location.reload();
      }
    }, [])
  }
};

export default useServiceWorker;