import { Suspense } from 'react';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Web3ReactProvider } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';

import Game from '~/views/Game';
import Interface from '~/views/Interface';
import Scene from '~/views/Scene';
import './index.css';
import reportWebVitals from './reportWebVitals';

const queryClient = new QueryClient();
const getLibrary = (provider) => {
  const library = new Web3Provider(provider);
  library.pollingInterval = 12000;
  return library;
};

ReactDOM.render(
  <Suspense fallback={<div>Loading...</div>}>
    <Web3ReactProvider getLibrary={getLibrary}>
      <QueryClientProvider client={queryClient} contextSharing={true}>
        <Game>
          <Interface />
          <Scene />
        </Game>
      </QueryClientProvider>
    </Web3ReactProvider>
  </Suspense>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
