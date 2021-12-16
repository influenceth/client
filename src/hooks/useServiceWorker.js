import { useEffect, useRef } from 'react';
import useStore from '~/hooks/useStore';

const alertParams = {
  type: 'App_Updated',
  level: 'warning',
  onClick: () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg.waiting.postMessage('skipWaiting');
      });
    }
  }
};

const useServiceWorker = () => {
  const refreshing = useRef(false);
  const createAlert = useStore(s => s.dispatchAlertLogged);

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
              createAlert(alertParams);
            }
          });
        }

        console.log('reg', reg);

        // if no reg, nothing to do
        if (!reg) return;

        // if new version is already waiting, prompt now
        if (reg.waiting) return createAlert(alertParams);

        // if new version is still installing, wait for install
        if (reg.installing) return waitForInstall();

        // if nothing new yet, listen for updatefound, then wait for install
        reg.addEventListener('updatefound', waitForInstall);
      });
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useServiceWorker;