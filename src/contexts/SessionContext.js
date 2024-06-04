import { createContext, useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { isExpired } from 'react-jwt';

import { RpcProvider, WalletAccount } from 'starknet';
import { connect as starknetConnect, disconnect as starknetDisconnect } from 'starknetkit';
import { ArgentMobileConnector } from 'starknetkit/argentMobile';
import { InjectedConnector } from 'starknetkit/injected';
import { WebWalletConnector } from 'starknetkit/webwallet';
import { createSessionRequest, openSession } from '@argent/x-sessions';
import { getStarkKey, utils } from 'micro-starknet';
import { Address } from '@influenceth/sdk';

import Reconnecting from '~/components/Reconnecting';
import api from '~/lib/api';
import { getBlockTime } from '~/lib/utils';
import useStore from '~/hooks/useStore';

const resolveChainId = (chainId) => {
  if (['0x534e5f4d41494e', 'SN_MAIN'].includes(chainId)) return 'SN_MAIN';
  if (['0x534e5f474f45524c49', 'SN_GOERLI'].includes(chainId)) return 'SN_GOERLI';
  if (['0x534e5f5345504f4c4941', 'SN_SEPOLIA', 'sepolia-alpha'].includes(chainId)) return 'SN_SEPOLIA';
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

const buildSessionMessage = async ({ session, account, gasFees }) => {
  const { sessionKey, expirationTime, allowedMethods } = session;
  const chainId = await account.getChainId();

  return {
    domain: { name: 'ArgentSession', chainId, version: '1' },
    types: {
      Session: [
        { name: 'accountAddress', type: 'felt' },
        { name: 'sessionKey', type: 'felt' },
        { name: 'expirationTime', type: 'felt' },
        { name: 'gasFees', type: 'TokenSpending' },
        { name: 'allowedMethods', type: 'AllowedMethod*' }
      ],
      TokenSpending: [
        { name: 'tokenAddress', type: 'felt' },
        { name: 'maximumAmount', type: 'u256' }
      ],
      AllowedMethod: [
        { name: 'contractAddress', type: 'felt' },
        { name: 'method', type: 'felt' }
      ],
      u256: [
        { name: 'low', type: 'felt' },
        { name: 'high', type: 'felt'},
      ],
      StarkNetDomain: [
        { name: 'name', type: 'felt' },
        { name: 'chainId', type: 'felt' },
        { name: 'version', type: 'felt' },
      ],
      Message: [{ name: 'message', type: 'felt' }]
    },
    primaryType: 'Session',
    message: {
      accountAddress: account.address,
      sessionKey,
      expirationTime,
      gasFees,
      allowedMethods
    },
  };
};

const STATUSES = {
  DISCONNECTED: 0,
  CONNECTING: 1,
  CONNECTED: 2,
  AUTHENTICATING: 3,
  AUTHENTICATED: 4
};

const SessionContext = createContext();

export function SessionProvider({ children }) {
  const queryClient = useQueryClient();
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const currentSession = useStore(s => s.currentSession);
  const sessions = useStore(s => s.sessions);
  const dispatchSessionStarted = useStore(s => s.dispatchSessionStarted);
  const dispatchSessionSuspended = useStore(s => s.dispatchSessionSuspended);
  const dispatchSessionResumed = useStore(s => s.dispatchSessionResumed);
  const dispatchSessionEnded = useStore(s => s.dispatchSessionEnded);

  const [readyForChildren, setReadyForChildren] = useState(false);

  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState(STATUSES.DISCONNECTED);
  const [starknet, setStarknet] = useState(false);
  const [starknetSession, setStarknetSession] = useState();

  const [connectedAccount, setConnectedAccount] = useState();
  const [connectedChainId, setConnectedChainId] = useState();
  const [connectedWalletId, setConnectedWalletId] = useState();
  const [walletAccount, setWalletAccount] = useState();

  const [blockNumber, setBlockNumber] = useState(0);
  const [blockTime, setBlockTime] = useState(0);
  const [error, setError] = useState();

  const authenticated = useMemo(() => status === STATUSES.AUTHENTICATED, [status]);
  const provider = useMemo(() => {
    let nodeUrl = process.env.REACT_APP_STARKNET_PROVIDER;

    if (process.env.REACT_APP_STARKNET_PROVIDER_BACKUP && Math.random() > 0.5) {
      nodeUrl = process.env.REACT_APP_STARKNET_PROVIDER_BACKUP;
    }

    return new RpcProvider({ nodeUrl });
  }, []);

  // Login entry point, starts by connecting to wallet provider
  const connect = useCallback(async (auto = false) => {
    if (currentSession?.walletId) {
      localStorage.setItem('starknetLastConnectedWallet', currentSession.walletId);
      auto = true;
    }

    try {
      const connectors = [];

      if (!!process.env.REACT_APP_ARGENT_WEB_WALLET_URL) {
        connectors.push(new WebWalletConnector({ url: process.env.REACT_APP_ARGENT_WEB_WALLET_URL, provider }));
      }

      connectors.push(new InjectedConnector({ options: { id: 'argentX', provider }}));
      connectors.push(new InjectedConnector({ options: { id: 'braavos', provider }}));
      connectors.push(new ArgentMobileConnector());

      const connectionOptions = {
        dappName: 'Influence',
        modalMode: auto ? 'neverAsk' : 'alwaysAsk',
        modalTheme: 'dark',
        projectId: 'influence',
        connectors,
        provider
      };

      setError();
      setConnecting(true);
      const { connectorData, wallet } = await starknetConnect(connectionOptions);

      if (wallet && connectorData) {
        const chainId = resolveChainId(connectorData.chainId);
        setConnectedAccount(Address.toStandard(connectorData.account));
        setConnectedChainId(chainId);
        setConnectedWalletId(wallet.id);
        setWalletAccount(new WalletAccount(provider, wallet, '1'));

        // Default to provider chainId if not set (starknetkit doesn't set for braavos)
          if (!isAllowedChain(chainId)) {
          await wallet.request({
            type: 'wallet_switchStarknetChain',
            params: { chainId: process.env.REACT_APP_CHAIN_ID }
          });

          localStorage.setItem('starknetLastConnectedWallet', wallet.id);
          await connect(true);
          setConnecting(false);
          return;
        }

        setStarknet(wallet);
        localStorage.setItem('starknetLastConnectedWallet', wallet.id);
        setStatus(STATUSES.CONNECTED);
      } else {
        console.error('No connected wallet or missing address');
      }
    } catch(e) {
      if (e.message === 'Not implemented') {
        setError(`Incorrect chain, please switch to ${resolveChainId(process.env.REACT_APP_CHAIN_ID)}`);
      }

      if (e.message !== 'User rejected request') {
        setError(e);
      }
    }

    setConnecting(false);
  }, [currentSession, sessions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Disconnect from the wallet provider and suspend session (don't fully logout)
  const disconnect = useCallback(() => {
    dispatchSessionSuspended();
    setStatus(STATUSES.DISCONNECTED);
  }, [dispatchSessionSuspended]);

  // End / delete session, disconnect wallet and forget last wallet provider (full reset)
  const logout = useCallback(() => {
    dispatchSessionEnded();
    setStatus(STATUSES.DISCONNECTED);
    if (window.starknet) starknetDisconnect({ clearLastWallet: true });
  }, [ dispatchSessionEnded ]);

  // While connecting or connected, listen for network changes from extension
  useEffect(() => {
    const onAccountsChanged = (e) => {
      const eventAccount = Address.toStandard(Array.isArray(e) ? e[0] : e);

      if (currentSession?.accountAddress === eventAccount && status === STATUSES.AUTHENTICATED) {
        // Handle extra events that can occasionally be fired (i.e. we're already authed)
        return;
      } else if (sessions[eventAccount]) {
        // If the account we just switched to has a suspended session, use it
        dispatchSessionResumed(sessions[eventAccount]); // flow manager should fire connect()
      } else {
        // Otherwise we disconnect and wait for the user to explicitly login / reconnect
        disconnect();
      }
    };

    const onNetworkChanged = (e) => {
      const eventNetwork = Array.isArray(e) ? e[0] : e;
      const correctChain = isAllowedChain(eventNetwork);
      if (!correctChain) disconnect();
    };

    const startListening = () => {
      walletAccount.walletProvider.on('accountsChanged', onAccountsChanged);
      walletAccount.walletProvider.on('networkChanged', onNetworkChanged);
    }

    const stopListening = () => {
      if (!walletAccount) return;
      walletAccount.walletProvider.off('accountsChanged', onAccountsChanged);
      walletAccount.walletProvider.off('networkChanged', onNetworkChanged);
    };

    if (walletAccount) startListening();
    return stopListening;
  }, [currentSession, sessions, status, walletAccount ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Authenticate with a signed message against the API
  const authenticate = useCallback(async () => {
    // If somehow we've lost wallet connection, disconnect
    if (!connectedAccount || !walletAccount) {
      disconnect();
      return false;
    }

    // Check for pre-existing session and use it if it's still valid
    const existingSession = Object.assign({}, sessions[connectedAccount]);

    if (existingSession && !isExpired(existingSession.token) && existingSession.isDeployed) {
      existingSession.startTime = Date.now();
      dispatchSessionStarted(existingSession);
      setStatus(STATUSES.AUTHENTICATED);
      return true;
    }

    // Check if the account contract has been deployed yet
    let isDeployed = false;

    try {
      await provider.getClassAt(connectedAccount); // if this throws, the contract is not deployed
      isDeployed = true;
    } catch (e) {
      if (!e.message.includes('Contract not found')) console.error(e);
    }

    const newSession = { isDeployed };

    // Start authenticating by requesting a login message from API
    setStatus(STATUSES.AUTHENTICATING);
    const loginMessage = await api.requestLogin(connectedAccount);
    let newToken = null;

    try {
      if (!isDeployed) {
        // If the wallet is not yet deployed, create an insecure session
        newToken = await api.verifyLogin(connectedAccount, { signature: 'insecure' });
        Object.assign(newSession, { walletId: connectedWalletId, accountAddress: connectedAccount, token: newToken });
      } else if (connectedWalletId === 'argentWebWallet') {
        // Connect via Argent Web Wallet and automatically create a session
        const privateKey = utils.randomPrivateKey();
        const dappKey = {
          privateKey,
          publicKey: getStarkKey(privateKey),
        };

        const low = resolveChainId(process.env.REACT_APP_CHAIN_ID) === 'SN_MAIN' ? '0x2386f26fc10000' : '0x16345785d8a0000'
        const gasFees = { tokenAddress: process.env.REACT_APP_ERC20_TOKEN_ADDRESS, maxAmount: { low, high: '0x0' }};
        const allowedMethods = [{ 'Contract Address': process.env.REACT_APP_STARKNET_DISPATCHER, selector: 'run_system' }];
        const expiry = Math.floor(Date.now() / 1000) + 86400 * 7;
        const sessionParams = {
          allowedMethods,
          expiry,
          metaData: {
            projectID: 'influence',
            txFees: [ gasFees ],
          },
          publicDappKey: dappKey.publicKey,
        };

        const requestSession = createSessionRequest(allowedMethods, expiry, false, dappKey.publicKey);
        const sessionSignature = await openSession({
          chainId: '0x534e5f5345504f4c4941', wallet: walletAccount?.walletProvider, sessionParams
        });

        console.log(sessionSignature);

        // if (sessionSignature) {
        //   const message = await buildSessionMessage({ session: requestSession, account, gasFees });
        //   newToken = await api.verifyLogin(connectedAddress, { message, signature: sessionSignature.join(',') });
        //   Object.assign(newSession, {
        //     walletId: id, accountAddress: connectedAddress, token: newToken, sessionSigner, sessionSignature
        //   });
        // }
      } else {
        // Connect via a traditional browser extension wallet
        const signature = await walletAccount.signMessage(loginMessage);
        if (signature?.code === 'CANCELED') throw new Error('User abort');
        newToken = await api.verifyLogin(connectedAccount, { signature: signature.join(',') });
        const walletId = walletAccount?.walletProvider?.id;
        Object.assign(newSession, { walletId, accountAddress: connectedAccount, token: newToken });
      }

      dispatchSessionStarted(newSession);
      setStatus(STATUSES.AUTHENTICATED);
      return true;
    } catch (e) {
      logout();
      if (['User abort', 'User rejected'].includes(e.message)) return;
      console.error(e);
      createAlert({
        type: 'GenericAlert',
        level: 'warning',
        data: { content: 'Signature verification failed.' },
        duration: 10000
      });
    }

    disconnect();
    return false;
  }, [
    connectedAccount,
    connectedChainId,
    connectedWalletId,
    createAlert,
    dispatchSessionStarted,
    sessions,
    walletAccount,
    disconnect,
    logout
  ]);

  // Start a session with the Argent Web Wallet
  useEffect(() => {
    // if (authenticated && starknet?.id === 'argentWebWallet') {
    //   const offchainSessionAccount = new OffchainSessionAccount(
    //     starknet.provider, // provider, in this example RpcProvider
    //     currentSession.accountAddress, // current account address
    //     currentSession.sessionSigner, // session signer pkey
    //     currentSession.sessionSignature, // signature for session
    //     starknet.account // the actual account
    //   );

    //   setStarknetSession(offchainSessionAccount);
    // }
  }, [authenticated, currentSession, starknet]);

  // End session and disconnect wallet if session expires
  useEffect(() => {
    if (currentSession.token && isExpired(currentSession.token)) logout();
  }, [currentSession, logout]);

  // Connect / auth flow manager
  useEffect(() => {
    // console.log(Object.keys(STATUSES).find(key => STATUSES[key] === status));
    if (status === STATUSES.DISCONNECTED) {
      if (currentSession?.walletId) {
        connect(true).finally(() => setReadyForChildren(true));
      } else {
        setReadyForChildren(true);
      }

      setStarknetSession(null); // clear session key if it exists
    } else if (status === STATUSES.CONNECTED) {
      authenticate();
      setReadyForChildren(true);
    }
  }, [currentSession, status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Catch errors and display in an alert
  useEffect(() => {
    if (error) {
      createAlert({
        type: 'GenericAlert',
        level: 'warning',
        data: { content: getErrorMessage(error) || 'Please try again.' },
        duration: 10000
      });

      setError(null);
      logout(); // Disconnect and reset to prevent further issues
    }
  }, [error, createAlert, logout]);

  // Block management -------------------------------------------------------------------------------------------------

  // If using devnet, put "create block" on a timer since otherwise, blocks will not be advancing in the background
  useEffect(() => {
    if (process.env.REACT_APP_IS_DEVNET) {
      let blockInterval = setInterval(() => { api.createDevnetBlock(); }, 15e3);
      return () => {
        if (blockInterval) clearInterval(blockInterval);
      }
    }
  }, []);

  // Argent is slow to put together it's final "starknet" object, so we check explicitly for getBlock method
  const canCheckBlock = useMemo(() => {
    return status >= STATUSES.CONNECTED && !!provider?.getBlock;
  }, [provider?.getBlock, status]);

  // Initialize block number and block time
  const lastBlockNumberTime = useRef(0);
  const initializeBlockData = useCallback(async () => {
    if (!canCheckBlock) return;
    try {
      const block = await provider.getBlock('pending');
      if (block?.timestamp) {
        setBlockTime(block?.timestamp);

        // does not (currently) return a block number with pending block...
        if (block.block_number > 0) {
          lastBlockNumberTime.current = block.block_number;
          setBlockNumber(block.block_number);

        // ... so we get the block number from the parent (which matches what ws reports)
        } else if (block.parent_hash) {
          const parent = await provider.getBlock(block.parent_hash);
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
  }, [canCheckBlock, provider]);
  useEffect(() => { initializeBlockData(); }, [initializeBlockData]);

  const reattempts = useRef();
  const capturePendingBlockTimestampUpdate = useCallback(async () => {
    if (!provider) return;

    reattempts.current++;
    console.log(`blocktime update attempt #${reattempts.current}`);
    getBlockTime(provider).then((timestamp) => {
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
  }, [blockNumber, blockTime, provider]);

  // get pending block time on every new block
  // TODO: if no crew, then we won't receive websockets, and blockNumber will not get updated
  //  (i.e. for logged out users) -- does that matter?
  useEffect(() => {
    if (blockNumber > lastBlockNumberTime.current) {
      reattempts.current = 0;
      capturePendingBlockTimestampUpdate();
    }
  }, [blockNumber, capturePendingBlockTimestampUpdate]);

  // reset any cached, but time-dependent queries
  useEffect(() => {
    [
      [ 'orderList' ],
      [ 'inventoryOrders' ],
      [ 'exchangeOrderSummary' ],
      [ 'productOrderSummary' ],
    ].forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
    });
  }, [blockTime]);

  return (
    <SessionContext.Provider value={{
      login: async () => await connect(),
      logout,
      accountAddress: authenticated ? currentSession?.accountAddress : null,
      authenticating: [STATUSES.AUTHENTICATING, STATUSES.CONNECTING].includes(status),
      authenticated,
      chainId: authenticated ? connectedChainId : null,
      isDeployed: authenticated ? currentSession?.isDeployed : null,
      provider,
      token: authenticated ? currentSession?.token : null,
      walletId: authenticated ? currentSession?.walletId : null,
      status,
      starknetSession,
      walletAccount,

      // NOTE:
      // - blockNumber is updated from websocket change or initial pull of activities from server
      // - blockTime is updated from blockNumber change
      // - blockNumber is last committed block, blockTime is the *pending* block time
      setBlockNumber,
      blockNumber,
      blockTime
    }}>
      {readyForChildren
        ? children
        : (
          connecting
            ? <Reconnecting walletName={window[`starknet_${currentSession?.walletId}`]?.name} onLogout={logout} />
            : null
        )
      }
    </SessionContext.Provider>
  );
};

export default SessionContext;
