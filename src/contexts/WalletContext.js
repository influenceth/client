import { useCallback, useEffect, useMemo, useRef, useState, createContext } from 'react';
import { connect as getStarknetConnect, disconnect as getStarknetDisconnect } from '@argent/get-starknet';
import { Address } from '@influenceth/sdk';

import api from '~/lib/api';

const getErrorMessage = (error) => {
  console.error(error);
  if (typeof error === 'string') return error;
  else if (typeof error === 'object' && error?.message) return error.message;
  return 'An unknown error occurred, please check the console for details.';
};

const isAllowedChain = (chainId) => {
  return chainId === process.env.REACT_APP_CHAIN_ID;
}

const getAllowedChainLabel = (wallet) => {
  if (process.env.REACT_APP_STARKNET_NETWORK.includes('mainnet')) {
    return wallet === 'Braavos' ? 'Mainnet-Alpha' : 'Mainnet';
  } else if (process.env.REACT_APP_STARKNET_NETWORK.includes('localhost')) {
    return wallet === 'Braavos' ? 'Devnet' : 'Localhost';
  }

  return wallet === 'Braavos' ? 'Goerli-Alpha' : 'Testnet';
}

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const onConnectCallback = useRef();

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState();
  const [starknet, setStarknet] = useState(false);
  const [starknetReady, setStarknetReady] = useState(false);

  // if using devnet, put "create block" on a timer since otherwise, blocks will not be advancing in the background
  useEffect(() => {
    if (process.env.REACT_APP_IS_DEVNET) {
      let blockInterval = setInterval(() => {
        api.createDevnetBlock();
      }, 15e3);
      return () => {
        if (blockInterval) clearInterval(blockInterval);
      }
    }
  }, []);

  const active = useMemo(() => {
    return starknet?.isConnected && starknet?.account?.address && isAllowedChain(starknet?.account?.provider?.chainId);
  }, [starknet?.isConnected, starknet?.account ]);

  const account = useMemo(() => {
    return active && Address.toStandard(starknet.account.address);
  }, [active, starknet?.account?.address]);

  const onConnectionResult = useCallback((wallet) => {
    setConnecting(false);
    setStarknet(wallet);

    if (onConnectCallback.current) {
      onConnectCallback.current(wallet?.account?.address && Address.toStandard(wallet?.account?.address));
      onConnectCallback.current = null;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = useCallback(async ({ auto = false } = {}) => {
    try {
      setConnecting(true);
      setError();

      const mode = auto ? 'neverAsk' : 'alwaysAsk';
      const wallet = await getStarknetConnect({
        dappName: 'Influence',
        modalMode: mode,
        webWalletUrl: process.env.REACT_APP_ARGENT_WEB_WALLET_URL
      });

      if (wallet && wallet.isConnected && wallet.account?.address) {
        if (isAllowedChain(wallet.account?.provider?.chainId)) {
          onConnectionResult(wallet);
        } else {
          onConnectionResult(null);
          // eslint-disable-next-line no-throw-literal
          throw `Chain unsupported, please connect your wallet to "${getAllowedChainLabel(wallet?.name)}".`;
        }
      } else {
        onConnectionResult(null);
      }

      return wallet;
    } catch(e) {
      setError(e);
      onConnectionResult(null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const disconnect = useCallback(async () => {
    setStarknet(null);
    getStarknetDisconnect({ clearLastWallet: true });
  }, [getStarknetDisconnect]);

  // while connecting or connected, listen for network changes from extension
  useEffect(() => {
    const onConnectionChange = (e) => {
      disconnect({ clearLastWallet: true }); // disconnect first in case does not complete connection
      if (starknet) connect({ auto: true });
    };

    const startListening = () => {
      starknet.on('accountsChanged', onConnectionChange);
      starknet.on('networkChanged', onConnectionChange);
    }

    const stopListening = () => {
      if (!starknet) return;
      starknet.off('accountsChanged', onConnectionChange);
      starknet.off('networkChanged', onConnectionChange);
    };

    if (starknet) startListening();

    return stopListening;
  }, [starknet?.name, connect, disconnect]); // eslint-disable-line react-hooks/exhaustive-deps

  // autoconnect as possible
  useEffect(() => {
    async function autoConnect() {
      await connect({ auto: true });
      setStarknetReady(true);
    }

    autoConnect();
  }, []);

  return (
    <WalletContext.Provider value={{
      account: starknet?.isConnected && account,
      connect,
      disconnect,
      error: useMemo(() => error && getErrorMessage(error), [error]),
      isConnecting: connecting,
      walletIcon: starknet?.icon && <img src={starknet.icon} alt={`${starknet.name}`} />,
      walletName: starknet?.name,
      starknet
    }}>
      {starknetReady && children}
    </WalletContext.Provider>
  );
};

export default WalletContext;
