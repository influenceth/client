import { useCallback, useEffect, useMemo, useRef, useState, createContext } from 'react';
import {
  connect,
  disconnect,
  getInstalledWallets
} from 'get-starknet';

import { Address } from 'influence-utils';

import starknetLogo from '~/assets/images/starknet-icon.png';

const getErrorMessage = (error) => {
  console.error(error);
  if (typeof error === 'string') return error;
  else if (typeof error === 'object' && error?.message) return error.message;
  return 'An unknown error occurred, please check the console for details.';
};

const WalletContext = createContext();

export function WalletProvider({ children }) {
  // NOTE: getStarknet does not get updated consistently with window.starknet
  // TODO (enhancement): would probably be good to memoize starknet as possible
  let starknet = window.starknet;// getStarknet();

  const onConnectCallback = useRef();

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState();
  const [installedWallets, setInstalledWallets] = useState([]);
  const [starknetReady, setStarknetReady] = useState(false);

  const active = useMemo(() => {
    return starknet?.isConnected && starknet?.account?.address
      && starknet?.account?.baseUrl === `${process.env.REACT_APP_STARKNET_NETWORK}`;
  }, [starknet?.isConnected, starknet?.account?.address, starknet?.account?.baseUrl]);

  const account = useMemo(() => {
    return active && Address.toStandard(starknet.account.address);
  }, [active, starknet?.account?.address]);

  const onConnectionResult = useCallback((address) => {
    setConnecting(false);
    if (onConnectCallback.current) {
      onConnectCallback.current(address ? Address.toStandard(address) : false);
      onConnectCallback.current = null;
    }
  }, []);

  const attemptConnection = useCallback(async (wallet) => {
    if (!wallet) {
      setError('No wallet found. Please refresh the page and try again.');
      onConnectionResult(null);
      return;
    }

    setError();
    try {
      setConnecting(true);
      await wallet.enable();
      if (!wallet.isConnected) {
        connect({ showList: false });
      }
      if (wallet.isConnected && wallet.account?.address) {
        if (wallet.account?.baseUrl === `${process.env.REACT_APP_STARKNET_NETWORK}`) {
          onConnectionResult(wallet.account?.address);
        } else {
          onConnectionResult(null);
          // eslint-disable-next-line no-throw-literal
          throw `Network unsupported, please connect to a network with baseUrl matching "${process.env.REACT_APP_STARKNET_NETWORK}".`;
        }
      } else {
        onConnectionResult(null);
      }
    } catch(e) {
      setError(e);
      onConnectionResult(null);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps
  
  const onConnectionChange = useCallback(() => {
    disconnect();
    if (starknet) {
      // console.log('attemptConnection', 1);
      attemptConnection(starknet);
    }
  }, [attemptConnection]); // eslint-disable-line react-hooks/exhaustive-deps

  // while connecting or connected, listen for network changes from extension
  // (since there is no disconnect in argentx, we just always listen)
  useEffect(() => {
    if (!!starknet) {
      const startListening = () => {
        starknet.on('accountsChanged', onConnectionChange);
        starknet.on('networkChanged', onConnectionChange);
      }
      const stopListening = () => {
        starknet.off('accountsChanged', onConnectionChange);
        starknet.off('networkChanged', onConnectionChange);
      };
      if (starknet?.account) {
        startListening();
      } else {
        stopListening();
      }
      return stopListening;
    }
  }, [!!starknet, starknet?.account, onConnectionChange]); // eslint-disable-line react-hooks/exhaustive-deps

  const restorePreviousConnection = useCallback((callback, useWallet) => {
    const wallet = useWallet || starknet;
    if (!wallet) return;

    setConnecting(true);
    onConnectCallback.current = callback;
    if (wallet?.isPreauthorized) {
      wallet.isPreauthorized().then((isAuthed) => {
        if (isAuthed) {
          // console.log('attemptConnection', 2);
          attemptConnection(wallet);
        } else {
          onConnectionResult(null);
        }
      }).catch((e) => {
        onConnectionResult(null);
      });
    } else {
      onConnectionResult(null);
    }
  }, [attemptConnection]); // eslint-disable-line react-hooks/exhaustive-deps

  const connectionOptions = useMemo(() => {
    if (installedWallets?.length) {
      return installedWallets
        .sort((a, b) => a.name < b.name ? -1 : 1)
        .map((wallet) => ({
          label: wallet.name,
          logo: wallet.icon ? <img src={wallet.icon} alt={`${wallet.name} icon`} width={18} height={18} /> : <span />,
          dataTip: wallet.name,
          copyFromLabel: wallet.name,
          onClick: () => {
            restorePreviousConnection((success) => {
              // console.log('attemptConnection', 3);
              if (!success) attemptConnection(starknet);
            }, wallet);
          }
        }));
    }
    return [{
      label: 'Install...',
      logo: <img src={starknetLogo} width={18} height={18} alt="Starknet Logo" />,
      dataTip: 'Select a Starknet Wallet to Install',
      copyFromLabel: 'browser extension',
      showCaret: true,
      onClick: () => {
        connect({ showList: true, order: ['argentX', 'braavos'], modalOptions: { theme: 'dark' } });
      }
    }];
  }, [installedWallets?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getInstalledWallets()
      .then((wallets) => {
        setInstalledWallets(wallets);
        if (wallets.length === 1) {
          restorePreviousConnection(() => {
            setStarknetReady(true);
          }, wallets[0]);
        } else {
          setStarknetReady(true);
        }
      })
      .catch((e) => {
        console.error(e);
        setStarknetReady(true);
      });
  }, [restorePreviousConnection]);

  return (
    <WalletContext.Provider value={{
      account: starknet?.isConnected && account,
      connectionOptions,
      disconnect, // NOTE: this doesn't really seem to be supported by argentx yet
      error: useMemo(() => error && getErrorMessage(error), [error]),
      isConnecting: connecting,
      walletName: starknet?.name,
      starknet,
    }}>
      {starknetReady && children}
    </WalletContext.Provider>
  );
};

export default WalletContext;
