import { useCallback, useEffect, useMemo, useRef, useState, createContext } from 'react';
import {
  getStarknet,
  connect,
  disconnect
 } from 'get-starknet';
import { getChecksumAddress } from 'starknet';

const getErrorMessage = (error) => {
  console.error(error);
  if (typeof error === 'string') return error;
  else if (typeof error === 'object' && error?.message) return error.message;
  return 'An unknown error occurred, please check the console for details.';
};

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const starknet = getStarknet();

  const onConnectCallback = useRef();

  const [account, setAccount] = useState(starknet?.account?.address && getChecksumAddress(starknet.account.address));
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState();
  const [starknetReady, setStarknetReady] = useState();

  const onConnectionResult = useCallback((connectedAccount = null) => {
    let checksumAddress = connectedAccount && getChecksumAddress(connectedAccount);
    if (checksumAddress && starknet?.provider?.baseUrl !== process.env.REACT_APP_STARKNET_NETWORK) {
      setError(`You must connect to a Starknet wallet on the following network to login: ${process.env.REACT_APP_STARKNET_NETWORK}`);
      checksumAddress = null;
    } else {
      setError();
    }
    setAccount(checksumAddress);
    setConnecting(false);
    if (onConnectCallback.current) {
      onConnectCallback.current(checksumAddress);
      onConnectCallback.current = null;
    }
  }, [starknet?.provider?.baseUrl]);

  const attemptConnection = useCallback(async (prompt) => {
    try {
      setConnecting(true);
      await starknet.enable({ showModal: false });
      if (!starknet.isConnected) {
        connect({ showList: prompt, modalOptions: { theme: 'dark' } });
      }
      onConnectionResult(starknet.isConnected ? starknet.account?.address : null);
    } catch(e) {
      setError(e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onConnectionResult, starknet?.isConnected, starknet?.account?.address]);

  // while connecting or connected, listen for network changes from extension
  // (since there is no disconnect in argentx, we just always listen)
  useEffect(() => {
    if (!starknetReady) return;

    // TODO: if explicitly disconnected, we should probably not listen?
    // TODO: if connected, should we disconnect then reconnect on these changes?
    //  (might happen in authcontext already)
    starknet.on('accountsChanged', attemptConnection);
    starknet.on('networkChanged', attemptConnection);
    return () => {
      starknet.off('accountsChanged', attemptConnection);
      starknet.off('networkChanged', attemptConnection);
    };
  }, [starknetReady, attemptConnection]); // eslint-disable-line react-hooks/exhaustive-deps

  // ArgentX goes through these default states when loading:
  //  > id: disconnected / provider: goerli
  //  > id: argentX / provider: goerli
  // starknet will only get set according to the currently-selected network and wallet
  // (like we want) once we try to actually connect with to it, so to avoid a
  // disconnect-on-every-refresh, we start by trying to connect to an already-connected
  // wallet on load. That way, if one exists, we don't pass the initial states (which
  // are inaccurate) through to the AuthContext before the valid state. If not, the
  // initial states are valid enough.
  useEffect(() => {
    if (!!starknet) {
      setConnecting(true);
      onConnectCallback.current = () => { setStarknetReady(true); };
      if (starknet.isPreauthorized) {
        starknet.isPreauthorized().then((isAuthed) => {
          if (isAuthed) {
            attemptConnection(false);
          } else {
            onConnectionResult(null);
          }
        });
      } else {
        onConnectionResult(null);
      }
    }
  }, [!!starknet?.isPreauthorized]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WalletContext.Provider value={{
      account: starknet?.isConnected && account,
      connect: () => attemptConnection(true),
      disconnect,
      error: useMemo(() => error && getErrorMessage(error), [error]),
      isConnecting: connecting,
      walletName: starknet?.name,
      starknet,
    }}>
      {starknetReady && children}
    </WalletContext.Provider>
  );
};

export default WalletContext;
