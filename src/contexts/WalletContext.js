import { useCallback, useEffect, useMemo, useRef, useState, createContext } from 'react';
import { RpcProvider } from 'starknet';
import { connect as starknetConnect, disconnect as starknetDisconnect } from 'starknetkit';
import { ArgentMobileConnector } from 'starknetkit/argentMobile';
import { InjectedConnector } from 'starknetkit/injected';
import { WebWalletConnector } from 'starknetkit/webwallet';
import { Address } from '@influenceth/sdk';

import api from '~/lib/api';
import { getBlockTime } from '~/lib/utils';

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
    return 'Mainnet';
  } else if (process.env.REACT_APP_STARKNET_NETWORK.includes('localhost')) {
    return wallet === 'Braavos' ? 'Developer' : 'Devnet';
  } else if (process.env.REACT_APP_STARKNET_NETWORK.includes('sepolia')) {
    return 'Sepolia';
  }

  return 'Goerli';
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

      const connectors = [];
      if (!!process.env.REACT_APP_ARGENT_WEB_WALLET_URL) connectors.push(new WebWalletConnector());
      connectors.push(new InjectedConnector({ options: { id: 'argentX' }}));
      connectors.push(new InjectedConnector({ options: { id: 'braavos' }}));
      connectors.push(new ArgentMobileConnector());

      const connectionOptions = {
        dappName: 'Influence Asset Manager',
        modalMode: auto ? 'neverAsk' : 'alwaysAsk',
        modalTheme: 'dark',
        projectId: 'influence',
        connectors
      };

      if (!!process.env.REACT_APP_ARGENT_WEB_WALLET_URL) {
        connectionOptions.webWalletUrl = process.env.REACT_APP_ARGENT_WEB_WALLET_URL;
      }

      if (process.env.REACT_APP_STARKNET_PROVIDER) {
        connectionOptions.provider =  new RpcProvider({ nodeUrl: process.env.REACT_APP_STARKNET_PROVIDER });
      }

      const wallet = await starknetConnect(connectionOptions);

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
        lastEvent.current.account = eventAccount;
        onConnectionChange();
      }
    };
    const onNetworkChanged = (e) => {
      const eventNetwork = Array.isArray(e) ? e[0] : e;
      if (!lastEvent.current.network || (lastEvent.current.network !== eventNetwork)) {
        const resetConn = !!lastEvent.current.network;
        lastEvent.current.network = eventNetwork;
        if (resetConn) {
          onConnectionChange();
        }
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

  // argent is slow to put together it's final "starknet" object, so we check explicitly for getBlock method
  const canCheckBlock = starknetReady && !!starknet?.provider?.getBlock;

  // init block number and block time
  const lastBlockNumberTime = useRef(0);
  useEffect(() => {
    if (canCheckBlock) {
      starknet.provider.getBlock()
        .then((block) => {
          setBlockTime(block?.timestamp);

          // does not (currently) return a block number with pending block...
          if (block?.block_number > 0) {
            lastBlockNumberTime.current = block?.block_number;
            setBlockNumber(block?.block_number);

          // ... so we get the block number from the parent (which matches what ws reports)
          } else if (block?.parent_hash) {
            starknet.provider.getBlock(block.parent_hash).then((parent) => {
              if (parent?.block_number > 0) {
                lastBlockNumberTime.current = parent?.block_number;
                setBlockNumber(parent?.block_number);
              } else {
                console.error('could not initialize block number!', block, parent);
              }
            })
          }
        })
        .catch((e) => console.error('failed to init block data', e));
    }
  }, [canCheckBlock]);

  // get pending block time on every new block
  // TODO: if no crew, then we won't receive websockets, and blockNumber will not get updated
  //  (i.e. for logged out users) -- does that matter?
  useEffect(() => {
    console.log('block change', blockNumber, lastBlockNumberTime.current);
    if (blockNumber > lastBlockNumberTime.current) {
      lastBlockNumberTime.current = blockNumber;
      getBlockTime(starknet).then((t) => {
        console.log('new block time', t);
        setBlockTime(t);
      });
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
      // NOTE: blockNumber is last committed block, blockTime is the *pending* block time
      setBlockNumber,
      blockNumber,
      blockTime
    }}>
      {starknetReady && children}
    </WalletContext.Provider>
  );
};

export default WalletContext;
