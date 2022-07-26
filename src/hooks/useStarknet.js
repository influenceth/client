import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getStarknet,
  connect,
  disconnect,
  defaultProvider
 } from 'get-starknet';
import { starknetContracts as configs } from 'influence-utils';
import { Contract, getChecksumAddress } from 'starknet';

// TODO (enhancement) (not currently possible): include only relevant networks (from .env like L1 does)

const getErrorMessage = (error) => {
  console.error(error);
  return 'An unknown error occurred, please check the console for details.';
};

const useStarknet = () => {
  const starknet = getStarknet();
  
  const onConnectCallback = useRef();
  const [account, setAccount] = useState(starknet?.account?.address && getChecksumAddress(starknet.account.address));
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState();

  const onConnectionResult = (connectedAccount = null) => {
    const checksumAddress = connectedAccount && getChecksumAddress(connectedAccount);
    setAccount(checksumAddress);
    setConnecting(false);
    if (onConnectCallback.current) {
      onConnectCallback.current(checksumAddress);
      onConnectCallback.current = null;
    }
  };

  const attemptConnection = useCallback(async (prompt) => {
    try {
      setConnecting(true);
      await starknet.enable();
      if (!starknet.isConnected) {
        connect({ showList: prompt, modalOptions: { theme: 'dark' } });
      }
      onConnectionResult(starknet.isConnected ? starknet?.account?.address : null);
    } catch(e) {
      setError(e);
    }
  }, []);

  // while connecting or connected, listen for network changes from extension
  // (since there is no disconnect in argentx, we just always listen)
  useEffect(() => {
    if (!starknet) {
      console.log('NOT READY');
      return;
    }

    // TODO: if disconnected, we should probably not listen?
    // TODO: if connected, should we disconnect then reconnect
    starknet.on('accountsChanged', attemptConnection);
    starknet.on('networkChanged', attemptConnection);
    return () => {
      starknet.off('accountsChanged', attemptConnection);
      starknet.off('networkChanged', attemptConnection);
    };
  }, [!starknet, attemptConnection]); // eslint-disable-line react-hooks/exhaustive-deps

  const restorePreviousConnection = useCallback((callback) => {
    setConnecting(true);
    onConnectCallback.current = callback;
    if (starknet?.isPreauthorized) {
      starknet.isPreauthorized().then((isAuthed) => {
        if (isAuthed) {
          attemptConnection();
        } else {
          onConnectionResult(null);
        }
      });
    } else {
      onConnectionResult(null);
    }
  }, [attemptConnection]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    account: starknet?.isConnected && account,
    connect: () => attemptConnection(true),
    disconnect,
    error: useMemo(() => error && getErrorMessage(error), [error]),
    isConnecting: connecting,
    reconnect: restorePreviousConnection,
    walletName: starknet?.name,
    wallet: starknet,

    // TODO: ...
    tx: {
      // ...
    }
  }
};

export default useStarknet;
