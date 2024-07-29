import { createContext, useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { isExpired } from 'react-jwt';

import { RpcProvider, WalletAccount, shortString } from 'starknet';
import { connect as starknetConnect, disconnect as starknetDisconnect } from 'starknetkit';
import { ArgentMobileConnector } from 'starknetkit/argentMobile';
import { InjectedConnector } from 'starknetkit/injected';
import { WebWalletConnector } from 'starknetkit/webwallet';
import {
  ArgentSessionService,
  buildSessionAccount,
  createSessionRequest,
  getSessionTypedData,
  openSession,
  SessionDappService
} from '@argent/x-sessions';
import * as gasless from '@avnu/gasless-sdk';
import { getStarkKey, utils } from 'micro-starknet';
import { Address } from '@influenceth/sdk';

import Reconnecting from '~/components/Reconnecting';
import api from '~/lib/api';
import { areChainsEqual, fireTrackingEvent, getBlockTime, resolveChainId } from '~/lib/utils';
import useStore from '~/hooks/useStore';

const getErrorMessage = (error) => {
  console.error(error);
  if (typeof error === 'string') return error;
  else if (typeof error === 'object' && error?.message) return error.message;
  return 'An unknown error occurred, please check the console for details.';
};

const isAllowedChain = (chain) => {
  return areChainsEqual(chain, process.env.REACT_APP_CHAIN_ID);
}

const STATUSES = {
  DISCONNECTED: 0,
  CONNECTING: 1,
  CONNECTED: 2,
  AUTHENTICATING: 3,
  AUTHENTICATED: 4
};

// Methods allowed for Starknet sessions
const allowedMethods = [
  { 'Contract Address': process.env.REACT_APP_STARKNET_DISPATCHER, selector: 'run_system' },
  { 'Contract Address': process.env.REACT_APP_STARKNET_SWAY_TOKEN, selector: 'transfer_with_confirmation' },
  { 'Contract Address': process.env.REACT_APP_STARKNET_SWAY_TOKEN, selector: 'transfer' },
  { 'Contract Address': process.env.REACT_APP_STARKNET_ESCROW, selector: 'withdraw' },
  { 'Contract Address': process.env.REACT_APP_STARKNET_ESCROW, selector: 'deposit' }
];

const SessionContext = createContext();

export function SessionProvider({ children }) {
  const queryClient = useQueryClient();
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const currentSession = useStore(s => s.currentSession);
  const gameplay = useStore(s => s.gameplay);
  const referredBy = useStore(s => s.referrer);
  const sessions = useStore(s => s.sessions);
  const dispatchSessionStarted = useStore(s => s.dispatchSessionStarted);
  const dispatchSessionSuspended = useStore(s => s.dispatchSessionSuspended);
  const dispatchSessionResumed = useStore(s => s.dispatchSessionResumed);
  const dispatchSessionEnded = useStore(s => s.dispatchSessionEnded);

  const [readyForChildren, setReadyForChildren] = useState(false);

  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState(STATUSES.DISCONNECTED);
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
      console.log('waiting 200ms...');
      await new Promise(resolve => setTimeout(resolve, 200)); // deal with timeout delay from Argent

      if (wallet && connectorData?.account) {
        const chainId = resolveChainId(connectorData.chainId);
        setConnectedAccount(Address.toStandard(connectorData.account));
        setConnectedChainId(chainId);
        setConnectedWalletId(wallet.id);
        const newAccount = new WalletAccount(provider, wallet, '1');
        setWalletAccount(newAccount);

        // Default to provider chainId if not set (starknetkit doesn't set for braavos)
        if (!isAllowedChain(chainId)) {
          try {
            await wallet.request({
              type: 'wallet_switchStarknetChain',
              params: { chainId: process.env.REACT_APP_CHAIN_ID }
            });
          } catch (e) { // (standardize error message here since different between wallets)
            throw new Error('Incorrect chain');
          }

          localStorage.setItem('starknetLastConnectedWallet', wallet.id);
          await connect(true);
          setConnecting(false);
          return;
        }

        localStorage.setItem('starknetLastConnectedWallet', wallet.id);
        setStatus(STATUSES.CONNECTED);
      } else {
        console.error('No connected wallet or missing address');
      }
    } catch(e) {
      if (e.message === 'Incorrect chain') {
        setError(`Incorrect chain, please switch to ${resolveChainId(process.env.REACT_APP_CHAIN_ID)}`);
      }

      else if (e.message !== 'User rejected request') {
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
      if (walletAccount.on) {
        walletAccount.on('accountsChanged', onAccountsChanged);
        walletAccount.on('networkChanged', onNetworkChanged);
      }
    }

    const stopListening = () => {
      if (!walletAccount) return;

      if (walletAccount.off) {
        walletAccount.off('accountsChanged', onAccountsChanged);
        walletAccount.off('networkChanged', onNetworkChanged);
      }
    };

    if (walletAccount) startListening();
    return stopListening;
  }, [ currentSession, sessions, status, walletAccount ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determines whether the wallet should use sessions based on user settings and wallet id
  const shouldUseSessionKeys = useCallback(async (skipSettingsCheck = false) => {
    const setting = skipSettingsCheck ? true : gameplay.useSessions;

    if (setting !== false && connectedWalletId === 'argentWebWallet') return true;
    if (setting === true && connectedWalletId === 'argentX') {
      try {
        const res = await provider.callContract({ contractAddress: connectedAccount, entrypoint: 'getVersion' });
        return Number(shortString.decodeShortString(res[0]).replaceAll('.', '')) >= 40;
      } catch (e) {
        console.error(e);
        return false;
      }
    }

    return false;
  }, [connectedAccount, gameplay.useSessions, provider]);

  // Checks the account contract do determine if it's deployed on-chain yet
  const checkDeployed = useCallback(async () => {
    try {
      await provider.getClassAt(connectedAccount); // if this throws, the contract is not deployed
      return true;
    } catch (e) {
      if (!e.message.includes('Contract not found')) console.error(e);
      return false;
    }
  }, [connectedAccount, provider]);

  // Authenticate with a signed message against the API and create a new session
  const authenticate = useCallback(async ({ isUpgradeInsecure = false, isUpgradeSessionKey = false } = {}) => {
    const newSession = {};

    // Check if the account contract has been deployed yet and should use sessions
    newSession.isDeployed = await checkDeployed();
    const useSessionKeys = isUpgradeSessionKey || await shouldUseSessionKeys(isUpgradeSessionKey);

    // Start authenticating by requesting a login message from API
    if (!isUpgradeInsecure) setStatus(STATUSES.AUTHENTICATING);
    const loginMessage = await api.requestLogin(connectedAccount);

    try {
      if (newSession.isDeployed && useSessionKeys) {
        // Connect via Argent Web Wallet and automatically create a session
        const privateKey = '0x' + Buffer.from(utils.randomPrivateKey()).toString('hex');
        const dappKey = {
          privateKey,
          publicKey: getStarkKey(privateKey),
        };

        const gasFees = {
          tokenAddress: process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
          maxAmount: areChainsEqual(process.env.REACT_APP_CHAIN_ID, 'SN_MAIN')
            ? '10000000000000000'
            : '100000000000000000'
        };

        const expiry = Math.floor(Date.now() / 1000) + 86400 * 7;
        const metaData = { projectID: 'influence', txFees: [ gasFees ] };
        const sessionParams = { allowedMethods, expiry, metaData, publicDappKey: dappKey.publicKey };

        const hexChainId = resolveChainId(process.env.REACT_APP_CHAIN_ID, 'hex');
        console.log('waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // deal with timeout delay from Argent
        const sessionSignature = await openSession({
          chainId: hexChainId, wallet: walletAccount?.walletProvider, sessionParams
        });

        if (sessionSignature) {
          const sessionRequest = createSessionRequest(allowedMethods, expiry, metaData, dappKey.publicKey);
          const message = getSessionTypedData(sessionRequest, hexChainId);
          const newToken = await api.verifyLogin(connectedAccount, { message, signature: sessionSignature.join(','), referredBy });
          Object.assign(newSession, {
            walletId: connectedWalletId,
            accountAddress: connectedAccount,
            token: newToken,
            sessionDappKey: dappKey,
            sessionRequest: sessionRequest,
            sessionSignature
          });
        }
      } else if (newSession.isDeployed) {
        // Connect via a traditional browser extension wallet
        let signature;

        try {
          signature = await walletAccount.signMessage(loginMessage);
        } catch (e) {
          signature = await walletAccount.walletProvider?.account.signMessage(loginMessage);
        }

        if (signature?.code === 'CANCELED') throw new Error('User abort');
        const newToken = await api.verifyLogin(connectedAccount, { signature: signature.join(','), referredBy });
        const walletId = walletAccount?.walletProvider?.id;
        Object.assign(newSession, { walletId, accountAddress: connectedAccount, token: newToken });
      } else {
        // If the wallet is not yet deployed, create an insecure session
        const newToken = await api.verifyLogin(connectedAccount, { signature: 'insecure', referredBy });
        Object.assign(newSession, { walletId: connectedWalletId, accountAddress: connectedAccount, token: newToken });
      }

      dispatchSessionStarted(newSession);
      setStatus(STATUSES.AUTHENTICATED);
      return true;
    } catch (e) {
      if (!isUpgradeInsecure) {
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
    }

    if (!isUpgradeInsecure) disconnect();
    return false;
  }, [
    checkDeployed,
    connectedAccount,
    connectedWalletId,
    createAlert,
    dispatchSessionStarted,
    gameplay.useSessions,
    referredBy,
    walletAccount,
    disconnect,
    logout
  ]);

  const upgradeInsecureSession = useCallback(() => {
    if (currentSession && !currentSession.isDeployed) return authenticate({ isUpgradeInsecure: true });
  }, [authenticate, currentSession]);

  // Resumes a current session or starts a new one
  const resumeOrAuthenticate = useCallback(async () => {
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

    await authenticate();
  }, [authenticate, connectedAccount, walletAccount, sessions, disconnect, dispatchSessionStarted]);

  // Upgrades a current session to use a session key
  const upgradeToSessionKey = useCallback(async () => {
    if (currentSession?.isDeployed && !currentSession?.sessionRequest) {
      return authenticate({ isUpgradeSessionKey: true });
    }
  }, [authenticate, currentSession, gameplay.useSessions]);

  const createSessionAccount = useCallback(async () => {
    const offchainSessionAccount = await buildSessionAccount({
      accountSessionSignature: currentSession.sessionSignature,
      sessionRequest: currentSession.sessionRequest,
      provider,
      chainId: resolveChainId(process.env.REACT_APP_CHAIN_ID, 'hex'),
      address: currentSession.accountAddress,
      dappKey: currentSession.sessionDappKey,
      argentSessionServiceBaseUrl: process.env.REACT_APP_ARGENT_API
    });

    setStarknetSession(offchainSessionAccount);
  }, [currentSession, provider]);

  // Start a session with the Argent Web Wallet
  useEffect(() => {
    if (!currentSession?.isDeployed) return;
    if (authenticated && gameplay.useSessions !== false && currentSession.sessionSignature) {
      createSessionAccount();
    }
  }, [authenticated, currentSession, gameplay.useSessions]);

  // End session and disconnect wallet if session expires
  useEffect(() => {
    if (currentSession.token && isExpired(currentSession.token)) logout();
  }, [currentSession, logout]);

  // Connect / auth flow manager
  useEffect(() => {
    console.log(Object.keys(STATUSES).find(key => STATUSES[key] === status));
    if (status === STATUSES.DISCONNECTED) {
      if (currentSession?.walletId) {
        connect(true).finally(() => setReadyForChildren(true));
      } else {
        setReadyForChildren(true);
      }

      setStarknetSession(null); // clear session key if it exists
    } else if (status === STATUSES.CONNECTED) {
      resumeOrAuthenticate().finally(() => {
        setReadyForChildren(true);
      });
    } else if (status === STATUSES.AUTHENTICATED) {
      fireTrackingEvent('login', { externalId: currentSession?.accountAddress });
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

  // Retrieves an outside execution call and signs it
  const getOutsideExecutionData = useCallback(async (calldata, gasTokenAddress, maxGasTokenAmount) => {
    let typedData = await gasless.fetchBuildTypedData(
      currentSession.accountAddress,
      calldata,
      gasTokenAddress,
      maxGasTokenAmount,
      { baseUrl: process.env.REACT_APP_AVNU_API_URL }
    );

    let signature;

    if (gameplay.useSessions && currentSession.sessionRequest) {
      const dappKey = currentSession.sessionDappKey;
      const sessionSignature = currentSession.sessionSignature;
      const beService = new ArgentSessionService(dappKey.publicKey, sessionSignature, process.env.REACT_APP_ARGENT_API);
      const chainId = shortString.encodeShortString(connectedChainId);
      const sessionDappService = new SessionDappService(beService, chainId, dappKey);
      const { Calldata: feeCalldata } = typedData.message.Calls[0];

      // Add the fee call to the calldata
      calldata.unshift({ contractAddress: gasTokenAddress, entrypoint: 'transfer', calldata: feeCalldata });
      signature = await sessionDappService.getSessionSignatureForOutsideExecutionTypedData(
        currentSession.sessionSignature,
        currentSession.sessionRequest,
        calldata,
        currentSession.accountAddress,
        typedData,
        false
      );
    } else {
      signature = await walletAccount.signMessage(typedData);
    }

    return { typedData, signature };
  }, [currentSession, gameplay.useSessions, connectedChainId, connectedWalletId, walletAccount]);

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
      allowedMethods,
      authenticated,
      authenticating: [STATUSES.AUTHENTICATING, STATUSES.CONNECTING].includes(status),
      chainId: authenticated ? connectedChainId : null,
      getOutsideExecutionData,
      isDeployed: authenticated ? currentSession?.isDeployed : null,
      provider,
      shouldUseSessionKeys,
      starknetSession,
      status,
      token: authenticated ? currentSession?.token : null,
      upgradeInsecureSession,
      upgradeToSessionKey,
      walletAccount,
      walletId: authenticated ? currentSession?.walletId : null,

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
