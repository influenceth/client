import { useCallback, useEffect, useMemo, useRef, useState, createContext } from 'react';
import getStarknet from 'get-starknet-core';
import { injectController } from '@cartridge/controller';
import { Address } from '@influenceth/sdk';

// Add Cartridge wallet to get-starknet set
const dispatcherMethods = [
  'Asteroid_startScan',
  'Asteroid_finishScan',
  'Asteroid_setName',
  'Construction_finish',
  'Construction_start',
  'Construction_deconstruct',
  'Construction_plan',
  'Construction_unplan',
  'CoreSample_startSampling',
  'CoreSample_finishSampling',
  'Crewmate_setName',
  'Crew_setComposition',
  'Extraction_finish',
  'Extraction_start',
  'Inventory_transferStart',
  'Inventory_transferFinish',
  'Lot_occupy'
];

const sessionWhitelist = dispatcherMethods.map(method => {
  return { target: process.env.REACT_APP_STARKNET_DISPATCHER, method };
});

injectController(sessionWhitelist, { url: "https://keychain-git-removenextrouting.preview.cartridge.gg/" });

const { disconnect, enable, getAvailableWallets, getLastConnectedWallet } = getStarknet;

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

  const active = useMemo(() => {
    return starknet?.isConnected && starknet?.account?.address && isAllowedChain(starknet?.account?.chainId);
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

  const attemptConnection = useCallback(async (wallet) => {
    if (!wallet) {
      setError('No wallet found. Please refresh the page and try again.');
      onConnectionResult(null);
      return;
    }

    setError();

    try {
      setConnecting(true);
      await enable(wallet);

      // TODO (enhancement): if get here, could technically set starknet so start listening to changes
      //  (i.e. so that if change network or change to a connected account on the same wallet, updates
      //  the connection without them having to push the button again)

      if (wallet.isConnected && wallet.account?.address) {
        if (isAllowedChain(wallet.account?.chainId)) {
          onConnectionResult(wallet);
        } else {
          onConnectionResult(null);
          // eslint-disable-next-line no-throw-literal
          throw `Chain unsupported, please connect your wallet to "${getAllowedChainLabel(wallet?.name)}".`;
        }
      } else {
        onConnectionResult(null);
      }
    } catch(e) {
      setError(e);
      onConnectionResult(null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // while connecting or connected, listen for network changes from extension
  useEffect(() => {
    const onConnectionChange = (e) => {
      disconnect({ clearLastWallet: true }); // disconnect first in case does not complete connection
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
    async function attemptAutoconnect() {
      try {
        const autoconnectWallet = await getLastConnectedWallet();

        if (autoconnectWallet) {
          restorePreviousConnection(
            autoconnectWallet,
            () => setStarknetReady(true)
          );
        } else {
          setStarknetReady(true);
        }
      } catch (e) {
        console.error(e);
        setStarknetReady(true);
      }
    }

    attemptAutoconnect();
  }, [restorePreviousConnection]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WalletContext.Provider value={{
      account: starknet?.isConnected && account,
      attemptConnection,
      getAvailableWallets,
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
