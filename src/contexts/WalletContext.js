import { useCallback, useEffect, useMemo, useRef, useState, createContext } from 'react';
import { Signer } from 'starknet';
import getStarknet from 'get-starknet-core';
import { createSession, supportsSessions, SessionAccount } from '@argent/x-sessions';
import { injectController } from '@cartridge/controller';
import { Address, starknetContracts } from '@influenceth/sdk';

import api from '~/lib/api';
import useStore from '~/hooks/useStore';

const nonsessionMethods = [
  "Asteroid_bridgeToL1",
  "AsteroidSale_purchase",
  "Crewmate_bridgeToL1",
  "Crewmate_purchaseAdalian",
  "Crewmate_purchaseAndInitializeAdalian",
  'Crew_mint'
];
const dispatcherSessionMethods = starknetContracts.Dispatcher
  .filter((c) => c.type === 'function' && c.stateMutability !== 'view' && c.name.includes('_') && !nonsessionMethods.includes(c.name))
  .map((c) => c.name);

const argentSessionWhitelist = dispatcherSessionMethods.map(selector => ({
  contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
  selector
}));

const cartridgeSessionWhitelist = dispatcherSessionMethods.map(method => ({
  target: process.env.REACT_APP_STARKNET_DISPATCHER,
  method
}));

injectController(cartridgeSessionWhitelist, { url: "https://keychain-git-removenextrouting.preview.cartridge.gg/" });

const { enable, getAvailableWallets, getLastConnectedWallet } = getStarknet;

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

const useSessionSigner = (starknet) => {
  const activeSessionWalletData = useStore(s => s.auth.sessionWalletData);
  const dispatchSessionStarted = useStore(s => s.dispatchSessionStarted);
  const dispatchSessionEnded = useStore(s => s.dispatchSessionEnded);

  const walletSupported = useMemo(
    () => starknet?.account && ['Argent X'].includes(starknet?.name),
    [starknet?.account, starknet?.name]
  );

  const [userEnabled, setUserEnabled] = useState(false);
  useEffect(() => {
    if (starknet?.account?.address) {
      supportsSessions(starknet.account.address, starknet.account)
        .then((enabled) => {
          setUserEnabled(enabled);
        })
        .catch((e) => {
          // console.warn('not enabled', e)
        });
    }
  }, [starknet?.account]);

  const activeSession = useMemo(() => {
    if (starknet?.provider && activeSessionWalletData) {
      try {
        const { address, providerBaseUrl, signerKeypair, signedSession } = activeSessionWalletData;
        if (!(address && providerBaseUrl && signerKeypair && signedSession)) throw new Error('Missing session data.');
        if (starknet.account.address && !Address.areEqual(starknet.account.address, address)) throw new Error('Session address mismatch.');
        if (JSON.stringify(signedSession.policies) !== JSON.stringify(argentSessionWhitelist)) throw new Error('Default session policies changed.');
        if (signedSession.expires < Date.now() / 1000) throw new Error('Session expired.');

        // rebuild signer
        const signer = new Signer();
        signer.keyPair._importPublic(signerKeypair.pub, signerKeypair.pubEnc);
        signer.keyPair._importPrivate(signerKeypair.priv, signerKeypair.privEnc);

        // instantiate session account
        return new SessionAccount(
          { sequencer: { baseUrl: providerBaseUrl } },
          address,
          signer,
          signedSession
        );
      } catch (e) {
        console.warn(e);
        dispatchSessionEnded();
        // TODO: prompt to restart session?
      }
    }
    return null;
  }, [activeSessionWalletData, starknet?.account?.address, starknet?.provider, dispatchSessionEnded]);
  
  // TODO: we need to end sessions automatically on relevant errors
  //  (i.e. expiration, fund depletion, etc)
  const startSession = useCallback(async () => {
    if (walletSupported) {
      if (starknet?.name === 'Argent X') {
        const signer = new Signer();
        createSession(
          {
            key: await signer.getPubKey(),
            expires: Math.round((Date.now() + 86400e3) / 1000),
            policies: argentSessionWhitelist
          },
          starknet.account
        ).then((signedSession) => {
          if (signedSession) {
            dispatchSessionStarted({
              address: starknet.account.address,
              providerBaseUrl: starknet.account.baseUrl,
              signerKeypair: {
                pub: signer.keyPair.getPublic('hex'),
                pubEnc: 'hex',
                priv: signer.keyPair.getPrivate('hex'),
                privEnc: 'hex',
              },
              signedSession
            })
          }
        });
      }
    }
  }, [starknet?.account, dispatchSessionStarted]);

  const stopSession = useCallback(() => {
    dispatchSessionEnded();
  }, [dispatchSessionEnded]);

  return {
    supported: walletSupported,
    enabled: userEnabled,
    startSession,
    stopSession,
    account: activeSession,
  }
}


const WalletContext = createContext();

export function WalletProvider({ children }) {
  const onConnectCallback = useRef();

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState();
  const [starknet, setStarknet] = useState(false);
  const [starknetReady, setStarknetReady] = useState(false);

  const session = useSessionSigner(starknet);
  useEffect(() => {
    console.log({ session });
  }, [session]);

  // if using devnet, put "create block" on a timer since otherwise, blocks will not be advancing in the background
  useEffect(() => {
    if (process.env.REACT_APP_STARKNET_NETWORK.includes('localhost')) {
      let blockInterval = setInterval(() => {
        api.createDevnetBlock();
      }, 15e3);
      return () => {
        if (blockInterval) clearInterval(blockInterval);
      }
    }
  }, []);

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

  const disconnect = useCallback((params) => {
    if (session.account) session.stopSession();
    getStarknet.disconnect(params);
  }, [session]);

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
      session,
      starknet,
    }}>
      {starknetReady && children}
    </WalletContext.Provider>
  );
};

export default WalletContext;
