import { useCallback, useEffect, useMemo, useRef, useState, createContext } from 'react';
import { RpcProvider } from 'starknet';
import { connect as starknetConnect, disconnect as starknetDisconnect } from 'starknetkit';
import { ArgentMobileConnector } from 'starknetkit/argentMobile';
import { InjectedConnector } from 'starknetkit/injected';
import { WebWalletConnector } from 'starknetkit/webwallet';
import { Address } from '@influenceth/sdk';

import api from '~/lib/api';
import { expectedBlockSeconds, getBlockTime } from '~/lib/utils';

const resolveChainId = (chainId) => {
  if (chainId === '0x534e5f4d41494e' || chainId === 'SN_MAIN') return 'SN_MAIN';
  if (chainId === '0x534e5f474f45524c49' || chainId === 'SN_GOERLI') return 'SN_GOERLI';
  if (chainId === '0x534e5f5345504f4c4941' || chainId === 'SN_SEPOLIA') return 'SN_SEPOLIA';
  return 'SN_DEV';
};

const getErrorMessage = (error) => {
  console.error(error);
  if (typeof error === 'string') return error;
  else if (typeof error === 'object' && error?.message) return error.message;
  return 'An unknown error occurred, please check the console for details.';
};

const isAllowedChain = (chain) => {
  return resolveChainId(chain) === resolveChainId(process.env.REACT_APP_CHAIN_ID);
}

const getAllowedChainLabel = (wallet) => {
  let current = resolveChainId(process.env.REACT_APP_CHAIN_ID);
  if (current === 'SN_MAIN') return 'Mainnet';
  if (current === 'SN_GOERLI') return 'Goerli';
  if (current === 'SN_SEPOLIA') return 'Sepolia';
  return wallet === 'Braavos' ? 'Developer' : 'Devnet';
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
    return starknet?.isConnected && starknet?.account?.address && isAllowedChain(starknet?.chainId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [starknet?.isConnected, starknet?.account, starknetUpdated]);

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
      const customProvider = new RpcProvider({ nodeUrl: process.env.REACT_APP_STARKNET_PROVIDER });

      if (!!process.env.REACT_APP_ARGENT_WEB_WALLET_URL) {
        connectors.push(new WebWalletConnector({ url: process.env.REACT_APP_ARGENT_WEB_WALLET_URL }));
      }

      connectors.push(new InjectedConnector({ options: { id: 'argentX', provider: customProvider }}));
      connectors.push(new InjectedConnector({ options: { id: 'braavos', provider: customProvider }}));
      connectors.push(new ArgentMobileConnector());

      const connectionOptions = {
        dappName: 'Influence Asset Manager',
        modalMode: auto ? 'neverAsk' : 'alwaysAsk',
        modalTheme: 'dark',
        projectId: 'influence',
        connectors,
        provider: customProvider
      };

      const { wallet } = await starknetConnect(connectionOptions);

      if (wallet && wallet.isConnected && wallet.account?.address) {
        if (!wallet.chainId) { // default to provider chainId if not set (starknetkit doesn't set for braavos)
          wallet.chainId = wallet?.account?.provider?.chainId || wallet?.provider?.chainId;
        }

        if (isAllowedChain(wallet.chainId)) {
          onConnectionResult(wallet);
        } else {
          onConnectionResult(null);
          // eslint-disable-next-line no-throw-literal
          throw `Chain unsupported, please connect your wallet to "${getAllowedChainLabel(wallet.name)}".`;
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
    if (window.starknet?.account) starknetDisconnect({ clearLastWallet: true });
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
  const canCheckBlock = useMemo(() => {
    return starknetReady && !!starknet?.provider?.getBlock;
  }, [starknet?.provider?.getBlock, starknetReady]);

  // init block number and block time
  const lastBlockNumberTime = useRef(0);
  const initializeBlockData = useCallback(async () => {
    if (!canCheckBlock) return;
    try {
      const block = await starknet.provider.getBlock('pending');
      if (block?.timestamp) {
        setBlockTime(block?.timestamp);

        // does not (currently) return a block number with pending block...
        if (block.block_number > 0) {
          lastBlockNumberTime.current = block.block_number;
          setBlockNumber(block.block_number);

        // ... so we get the block number from the parent (which matches what ws reports)
        } else if (block.parent_hash) {
          const parent = await starknet.provider.getBlock(block.parent_hash);
          if (parent?.block_number > 0) {
            lastBlockNumberTime.current = parent.block_number;
            setBlockNumber(parent.block_number);
          } else {
            console.error('could not initialize block number!', block, parent);
          }
        }
      } else {
        console.warn('block log refresh failed!', block);
      }
    } catch (e) {
      console.error('failed to init block data', e)
    }
  }, [canCheckBlock, starknet?.provider]);

  useEffect(initializeBlockData, [initializeBlockData]);

  const reattempts = useRef();
  const capturePendingBlockTimestampUpdate = useCallback(async () => {
    reattempts.current++;
    console.log(`blocktime update attempt #${reattempts.current}`);
    getBlockTime(starknet).then((timestamp) => {
      if (timestamp > blockTime) {
        lastBlockNumberTime.current = blockNumber;
        setBlockTime(timestamp);
      // TODO: relate the 12 * 5000 to TOO_LONG_FOR_BLOCK
      // i.e. (TOO_LONG_FOR_BLOCK-expectedBlockTime) / 5000 === 12, so should perhaps abstract into the constants
      // (only concern would be if blocktime gets too short, then we may need to re-approach this strategy generally)
      } else if (reattempts.current < 12) {
        setTimeout(capturePendingBlockTimestampUpdate, 5000);
      } else {
        console.warn('gave up on pending blocktime update!');
      }
    });
  }, [blockNumber, blockTime, starknet]);

  // get pending block time on every new block
  // TODO: if no crew, then we won't receive websockets, and blockNumber will not get updated
  //  (i.e. for logged out users) -- does that matter?
  useEffect(() => {
    if (blockNumber > lastBlockNumberTime.current) {
      reattempts.current = 0;
      capturePendingBlockTimestampUpdate();
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
