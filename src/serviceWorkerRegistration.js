// This optional code is used to register a service worker.
// register() is not called by default.

// This lets the app load faster on subsequent visits in production, and gives
// it offline capabilities. However, it also means that developers (and users)
// will only see deployed updates on subsequent visits to a page, after all the
// existing tabs open on the page have been closed, since previously cached
// resources are updated in the background.

// To learn more about the benefits of this model and instructions on how to
// opt-in, read https://cra.link/PWA

console.log('SW deploy 3');

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 are considered localhost for IPv4.
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);
console.log('SW isLocalhost', isLocalhost);

export function register(config) {
  console.log('SW register', config);
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    console.log('SW register in');
    // The URL constructor is available in all browsers that support SW.
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    console.log('SW publicUrl', publicUrl, window.location.origin, publicUrl.origin !== window.location.origin);
    if (publicUrl.origin !== window.location.origin) {
      // Our service worker won't work if PUBLIC_URL is on a different origin
      // from what our page is served on. This might happen if a CDN is used to
      // serve assets; see https://github.com/facebook/create-react-app/issues/2374
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;
      console.log('SW onload', swUrl);
      
      if (isLocalhost) {
        // This is running on localhost. Let's check if a service worker still exists or not.
        checkValidServiceWorker(swUrl, config);

        // Add some additional logging to localhost, pointing developers to the
        // service worker/PWA documentation.
        navigator.serviceWorker.ready.then(() => {
          console.info(
            'This web app is being served cache-first by a service ' +
              'worker. To learn more, visit https://cra.link/PWA'
          );
        });
      } else {
        console.log('SW should registerValidSW');

        // Is not localhost. Just register service worker
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  console.log('SW registerValidSW', swUrl, config);
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('SW registration', registration);
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        console.log('SW isInstalling', installingWorker);
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          console.log('SW installingWorker onstatechange', installingWorker.state);
          if (installingWorker.state === 'installed') {
            console.log('SW installingWorker installed', navigator.serviceWorker.controller);
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              console.info(
                'New content is available and will be used when all ' +
                  'tabs for this page are closed. See https://cra.link/PWA.'
              );

              // Execute callback
              if (config && config.onUpdate) {
                console.log('SW installingWorker installed onUpdate');
                config.onUpdate(registration);
              }
            } else {
              console.log('SW installingWorker not installed');
              // At this point, everything has been precached.
              // It's the perfect time to display a
              // "Content is cached for offline use." message.
              console.info('Content is cached for offline use.');

              // Execute callback
              if (config && config.onSuccess) {
                console.log('SW installingWorker installed onSuccess');
                config.onSuccess(registration);
              }
            }
          }
        };
      };

      // poll for new version of app every 5m
      setInterval(() => {
        console.log('SW poll');
        registration.update();
      }, 300e3);
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  console.log('SW checkValidServiceWorker', swUrl, config);
  // Check if the service worker can be found. If it can't, reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      console.log('SW checkValidServiceWorker response', response);
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        console.log('SW checkValidServiceWorker no service worker found');
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then((registration) => {
          console.log('SW should unregister');
          registration.unregister().then(() => {
            console.log('SW reload');
            window.location.reload();
          });
        });
      } else {
        console.log('SW found');
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.info('No internet connection found. App is running in offline mode.');
    });
}

export function unregister() {
  console.log('SW unregister');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        console.log('SW unregistering');
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}