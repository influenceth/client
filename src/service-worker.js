/* eslint-disable no-restricted-globals */

// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules
// for the list of available Workbox modules, or add any other
// code you'd like.
// You can also remove this file if you'd prefer not to use a
// service worker, and the Workbox build step will be skipped.

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precache, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

clientsClaim();

// Precache all of the assets generated by your build process.
// Their URLs are injected into the manifest variable below.
// This variable must be present somewhere in your service worker file,
// even if you decide not to use precaching. See https://cra.link/PWA
const modelsBase = `${process.env.REACT_APP_CLOUDFRONT_OTHER_URL}/models`;
precache([
  { url: `${modelsBase}/buildings/Bioreactor.v1.glb`, revision: null },
  { url: `${modelsBase}/buildings/EmptyLot.v2.glb`, revision: null },
  { url: `${modelsBase}/buildings/Extractor.v3.glb`, revision: null },
  { url: `${modelsBase}/buildings/Factory.v1.glb`, revision: null },
  { url: `${modelsBase}/buildings/Habitat.v1.glb`, revision: null },
  { url: `${modelsBase}/buildings/Marketplace.v1.glb`, revision: null },
  { url: `${modelsBase}/buildings/Refinery.v1.glb`, revision: null },
  { url: `${modelsBase}/buildings/Shipyard.v1.glb`, revision: null },
  { url: `${modelsBase}/buildings/Spaceport.v1.glb`, revision: null },
  { url: `${modelsBase}/buildings/Warehouse.v3.glb`, revision: null },
  { url: `${modelsBase}/ships/HeavyTransport.v1.glb`, revision: null },
  { url: `${modelsBase}/ships/LightTransport.v1.glb`, revision: null },
  { url: `${modelsBase}/ships/Shuttle.v1.glb`, revision: null }
]);

precacheAndRoute(self.__WB_MANIFEST);

// Set up App Shell-style routing, so that all navigation requests
// are fulfilled with your index.html shell. Learn more at
// https://developers.google.com/web/fundamentals/architecture/app-shell
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  // Return false to exempt requests from being fulfilled by index.html.
  ({ request, url }) => {
    // If this isn't a navigation, skip.
    if (request.mode !== 'navigate') {
      return false;
    } // If this is a URL that starts with /_, skip.

    if (url.pathname.startsWith('/_')) {
      return false;
    } // If this looks like a URL for a resource, because it contains // a file extension, skip.

    if (url.pathname.match(fileExtensionRegexp)) {
      return false;
    } // Return true to signal that we want to use the handler.

    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

// Cache images that aren't handled by the precache
registerRoute(
  ({ url }) => {
    if (url.pathname.endsWith('.png')) return true;
    if (url.pathname.endsWith('.jpg')) return true;
    if (url.pathname.endsWith('.jpeg')) return true;
    if (url.pathname.endsWith('.gif')) return true;
    if (url.pathname.endsWith('.webp')) return true;
    if (url.pathname.endsWith('.svg')) return true;
    return false;
  },
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [
      // Ensure that once this runtime cache reaches a maximum size the least-recently used images are removed
      new ExpirationPlugin({ maxEntries: 100 }),
    ],
  })
);

registerRoute(
  ({ url }) => {
    if (url.pathname.endsWith('lots/packed')) return true;
    return false;
  },
  new StaleWhileRevalidate({
    cacheName: 'lots',
    plugins: [
      // Ensure that once this runtime cache reaches a maximum size the least-recently used images are removed
      new ExpirationPlugin({ maxEntries: 5 }),
    ],
  })
);

// This allows the web app to trigger skipWaiting via
// registration.waiting.postMessage({type: 'SKIP_WAITING'})
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// See: https://redfin.engineering/how-to-fix-the-refresh-button-when-using-service-workers-a8e27af6df68
// Allows a regular refresh to actually upgrade the service worker
self.addEventListener('fetch', event => {
  event.respondWith((async () => {
    if (event.request.mode === 'navigate' && event.request.method === 'GET' && self.registration.waiting) {
      self.skipWaiting();
      return new Response('', { headers: { 'Refresh': '0' }});
    }

    return await self.caches.match(event.request) || fetch(event.request);
  })());
});

// Any other custom service worker logic can go here.