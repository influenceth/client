import { useCallback, useEffect, useMemo, useRef, useState, createContext } from 'react';
import { connect, getInstalledWallets } from 'get-starknet';

import { Address } from 'influence-utils';

import starknetLogo from '~/assets/images/starknet-icon.png';
import useStore from '~/hooks/useStore';

const getErrorMessage = (error) => {
  console.error(error);
  if (typeof error === 'string') return error;
  else if (typeof error === 'object' && error?.message) return error.message;
  return 'An unknown error occurred, please check the console for details.';
};

const isAllowedNetwork = (network) => {
  return network === `${process.env.REACT_APP_STARKNET_NETWORK}`;
}

const getAllowedNetworkLabel = (wallet) => {
  if (process.env.REACT_APP_STARKNET_NETWORK.includes('mainnet')) {
    return wallet === 'Braavos' ? 'Mainnet-Alpha' : 'Ethereum Mainnet';
  } else if (process.env.REACT_APP_STARKNET_NETWORK.includes('localhost')) {
    return wallet === 'Braavos' ? 'Devnet' : 'Localhost';
  }
  return wallet === 'Braavos' ? 'Goerli-Alpha' : 'Goerli Testnet';
}

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const lastWalletConnected = useStore(s => s.auth.lastWallet);
  const dispatchWalletConnected = useStore(s => s.dispatchWalletConnected);

  const onConnectCallback = useRef();

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState();
  const [installedWallets, setInstalledWallets] = useState([]);
  const [starknet, setStarknet] = useState(false);
  const [starknetReady, setStarknetReady] = useState(false);

  const active = useMemo(() => {
    return starknet?.isConnected && starknet?.account?.address && isAllowedNetwork(starknet?.account?.baseUrl);
  }, [starknet?.isConnected, starknet?.account?.address, starknet?.account?.baseUrl]);

  const account = useMemo(() => {
    return active && Address.toStandard(starknet.account.address);
  }, [active, starknet?.account?.address]);

  const onConnectionResult = useCallback((wallet) => {
    setConnecting(false);
    setStarknet(wallet);

    // remember last extension connected so that is the one we retry automatically next time
    if (wallet?.account?.address) {
      dispatchWalletConnected(wallet.name);
    }

    if (onConnectCallback.current) {
      onConnectCallback.current(wallet?.account?.address && Address.toStandard(wallet?.account?.address));
      onConnectCallback.current = null;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

      // TODO (enhancement): if get here, could technically set starknet so start listening to changes
      //  (i.e. so that if change network or change to a connected account on the same wallet, updates
      //  the connection without them having to push the button again)

      if (!wallet.isConnected) {
        connect({ showList: false });
      }
      if (wallet.isConnected && wallet.account?.address) {
        if (isAllowedNetwork(wallet.account?.baseUrl)) {
          onConnectionResult(wallet);
        } else {
          onConnectionResult(null);
          // eslint-disable-next-line no-throw-literal
          throw `Network unsupported, please connect to "${getAllowedNetworkLabel(wallet?.name)}" in your wallet manager's network dropdown.`;
        }
      } else {
        onConnectionResult(null);
      }
    } catch(e) {
      setError(e);
      onConnectionResult(null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const disconnect = useCallback(() => {
    onConnectionResult(null);
  }, [onConnectionResult]);

  const restorePreviousConnection = useCallback((wallet, callback) => {
    if (!wallet) return;

    setConnecting(true);
    onConnectCallback.current = callback;
    if (wallet?.isPreauthorized) {
      wallet.isPreauthorized().then((isAuthed) => {
        if (isAuthed) {
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
          onClick: () => {
            restorePreviousConnection(wallet, (success) => {
              if (!success) attemptConnection(wallet);
            });
          }
        }));
    }
    return [{
      label: 'Install...',
      logo: <img src={starknetLogo} width={18} height={18} alt="Starknet Logo" />,
      dataTip: 'Select a Starknet Wallet to Install',
      showCaret: true,
      onClick: () => {
        connect({ showList: true, order: ['argentX', 'braavos'], modalOptions: { theme: 'dark' } });
      }
    }];
  }, [installedWallets?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // while connecting or connected, listen for network changes from extension
  useEffect(() => {
    const onConnectionChange = (e) => {
      disconnect(); // disconnect first in case does not complete connection
      if (starknet) {
        attemptConnection(starknet);
      }
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

    if (starknet) {
      startListening();
    }
    return stopListening;
  }, [starknet?.name, attemptConnection, disconnect]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // autoconnect as possible
  useEffect(() => {
    getInstalledWallets()
    .then((wallets) => {
      setInstalledWallets(wallets);

      const autoconnectWallet = wallets.length === 1
        ? wallets[0]
        : wallets.find((w) => w.name === lastWalletConnected);
      if (autoconnectWallet) {
        restorePreviousConnection(
          autoconnectWallet,
          () => setStarknetReady(true)
        );
      } else {
        setStarknetReady(true);
      }
    })
    .catch((e) => {
      console.error(e);
      setStarknetReady(true);
    });
  }, [restorePreviousConnection]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WalletContext.Provider value={{
      account: starknet?.isConnected && account,
      connectionOptions,
      disconnect,
      error: useMemo(() => error && getErrorMessage(error), [error]),
      isConnecting: connecting,
      walletIcon: starknet?.icon && <img src={starknet.icon} alt={`${starknet.name}`} />,
      walletName: starknet?.name,
      starknet,
    }}>
      {starknetReady && children}
    </WalletContext.Provider>
  );
};

export default WalletContext;
