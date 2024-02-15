import { useCallback, useEffect, useMemo, useRef, useState, createContext } from 'react';
import { connect as starknetConnect, disconnect as starknetDisconnect } from 'starknetkit';
import { Address } from '@influenceth/sdk';

import api from '~/lib/api';

const getErrorMessage = (error) => {
  console.error(error);
  if (typeof error === 'string') return error;
  else if (typeof error === 'object' && error?.message) return error.message;
  return 'An unknown error occurred, please check the console for details.';
};

const isAllowedChain = (chainId) => {
  return `${chainId}` === `${process.env.REACT_APP_CHAIN_ID}`;
}

const getAllowedChainLabel = (wallet) => {
  if (process.env.REACT_APP_STARKNET_NETWORK.includes('mainnet')) {
    return wallet === 'Braavos' ? 'SN Mainnet' : 'Mainnet';
  } else if (process.env.REACT_APP_STARKNET_NETWORK.includes('localhost')) {
    return wallet === 'Braavos' ? 'Developer' : 'Localhost';
  }
  return wallet === 'Braavos' ? 'Starknet Goerli' : 'Testnet';
}

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const onConnectCallback = useRef();

  const [blockNumber, setBlockNumber] = useState(0);
  const [blockTime, setBlockTime] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState();
  const [starknet, setStarknet] = useState(false);
  const [starknetReady, setStarknetReady] = useState(false);
  const [starknetUpdated, setStarknetUpdated] = useState(0);

  const lastEvent = useRef({
    account: starknet?.account?.address,
    network: undefined
  });

  const active = useMemo(() => {
    return starknet?.isConnected && starknet?.account?.address && isAllowedChain(starknet?.account?.provider?.chainId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [starknet?.isConnected, starknet?.account, starknet?.account?.provider?.chainId, starknetUpdated]);

  const account = useMemo(() => {
    return active && Address.toStandard(starknet.account.address);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, starknet?.account?.address, starknetUpdated]);

  const onConnectionResult = useCallback((wallet) => {
    setConnecting(false);
    setStarknet(wallet);

    if (wallet?.account?.address) lastEvent.current.account = wallet.account.address;

    if (onConnectCallback.current) {
      onConnectCallback.current(wallet?.account?.address && Address.toStandard(wallet?.account?.address));
      onConnectCallback.current = null;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = useCallback(async (auto = false) => {
    try {
      // TODO: starknetkit currently does not return from `starknetConnect` when user closes the 
      // web or mobile wallet windows, so it will not exit the `connecting` state, and it can end
      // up blocking the UI... should uncomment the below line if they ever fix it
      // setConnecting(true);
      setError();

      const wallet = await starknetConnect({
        dappName: 'Influence',
        modalMode: auto ? 'neverAsk' : 'alwaysAsk',
        modalTheme: 'dark',
        projectId: 'influence',
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
    console.log('disconnect INNER');
    setStarknet(null);
    if (window.starknet?.provider) starknetDisconnect({ clearLastWallet: true });
  }, []);

  const onConnectionChange = useCallback(() => {
    // react has trouble detecting changes deep to starknet object without essentially
    // using this update counter to force a dependency change where appropriate
    // TODO: would this update make more sense in `onConnectionResult`?
    setStarknetUpdated((v) => v + 1);

    // disconnect, then attempt reconnection
    if (starknet) {
      connect(true);
    } else {
      console.log('onconnectionchange disconnect');
      disconnect();
    }
  }, [connect, disconnect, starknet]);

  // while connecting or connected, listen for network changes from extension
  // NOTE: braavos fires lots of false positives, so that is what we are trying to trap
  //  with the ref checks here
  useEffect(() => {
    const onAccountsChanged = (e) => {
      const eventAccount = Array.isArray(e) ? e[0] : e;
      if (!lastEvent.current.account || (lastEvent.current.account !== eventAccount)) {
        // console.log('onAccountsChanged (YES)', eventAccount);
        lastEvent.current.account = eventAccount;
        onConnectionChange();
      // } else {
      //   console.log('onAccountsChanged (NO)', eventAccount);
      }
    };
    const onNetworkChanged = (e) => {
      const eventNetwork = Array.isArray(e) ? e[0] : e;
      if (!lastEvent.current.network || (lastEvent.current.network !== eventNetwork)) {
        const resetConn = !!lastEvent.current.network;
        lastEvent.current.network = eventNetwork;
        if (resetConn) {
          // console.log('onNetworkChanged (YES)', eventNetwork);
          onConnectionChange();
        }
      // } else {
      //   console.log('onNetworkChanged (NO)', eventNetwork);
      }
    };

    const startListening = () => {
      starknet.on('accountsChanged', onAccountsChanged);
      starknet.on('networkChanged', onNetworkChanged);
    }

    const stopListening = () => {
      if (!starknet) return;
      starknet.off('accountsChanged', onAccountsChanged);
      starknet.off('networkChanged', onNetworkChanged);
    };

    if (starknet) startListening();
    return stopListening;
  }, [starknet?.name, starknet?.account?.address, onConnectionChange]); // eslint-disable-line react-hooks/exhaustive-deps

  // autoconnect as possible
  useEffect(() => {
    connect(true).finally(() => setStarknetReady(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // if using devnet, put "create block" on a timer since otherwise, blocks will not be advancing in the background
  useEffect(() => {
    if (process.env.REACT_APP_IS_DEVNET) {
      let blockInterval = setInterval(() => { api.createDevnetBlock(); }, 15e3);
      return () => {
        if (blockInterval) clearInterval(blockInterval);
      }
    }
  }, []);

  const getBlockTime = useCallback(async (num) => {
    if (starknet?.provider) {
      try {
        const block = await starknet.provider.getBlock(num > 0 ? num : undefined);
        if (!(num > 0) && blockNumber === 0) {

          console.log('init block', block); setBlockNumber(block?.number);
        }
        return block?.timestamp;
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  }, [!!starknet.provider, blockNumber]);

  // init block number
  useEffect(() => {
    if (starknet?.provider?.getBlockNumber) {
      starknet.provider.getBlockNumber().then(setBlockNumber);
    }
  }, [!!starknet.provider]);

  // get pending block time on every new block
  useEffect(() => {
    if (blockNumber > 0) {
      getBlockTime().then((t) => setBlockTime(t));
      // TODO: if no crew, then we won't receive websockets, and this will not get updated
      //  (i.e. for logged out users) -- does that matter?
    }
  }, [blockNumber]);

  return (
    <WalletContext.Provider value={{
      account,
      connect,
      disconnect,
      error: useMemo(() => error && getErrorMessage(error), [error]),
      isConnecting: connecting,
      walletIcon: starknet?.icon && starknet?.name !== 'Argent Web Wallet' && <img src={starknet.icon} alt={`${starknet.name}`} />,
      walletName: starknet?.name,
      starknet,

      // NOTE:
      // blockNumber is updated from websocket change or initial pull of activities from server
      // blockTime is updated from blockNumber change
      getBlockTime,
      setBlockNumber,
      setBlockTime,
      blockNumber,
      blockTime
    }}>
      {starknetReady && children}
    </WalletContext.Provider>
  );
};

export default WalletContext;
