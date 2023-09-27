import { useCallback, useEffect, useMemo, useRef, useState, createContext } from 'react';
import { connect as getStarknetConnect, disconnect as getStarknetDisconnect } from '@argent/get-starknet';
import { Address } from '@influenceth/sdk';

import api from '~/lib/api';
import useStore from '~/hooks/useStore';

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
              providerBaseUrl: starknet.account.provider.baseUrl,
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
    if (session.account) session.stopSession();
    setStarknet(null);
    getStarknetDisconnect({ clearLastWallet: true });
  }, [getStarknetDisconnect, session]);

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
