import { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import LoadingAnimation from 'react-spinners/PropagateLoader';
import styled from 'styled-components';

import ErrorBoundary from './ErrorBoundary';
import Game from './Game';
import './index.css';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
      staleTime: 60000 * 5
    }
  }
});

const Loader = styled.div`
  align-items: center;
  background-color: black;
  display: flex;
  height: 100%;
  justify-content: center;
  position: absolute;
  width: 100%;
  z-index: 10000;
`;

createRoot(document.getElementById('root')).render(
  <Suspense fallback={<Loader><LoadingAnimation color="white" loading /></Loader>}>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient} contextSharing>
        <Game />
      </QueryClientProvider>
    </ErrorBoundary>
  </Suspense>
);

// listen for installprompt (should keep this before serviceworker registration)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.installPrompt = e;
});

// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
