import { createContext, useCallback, useEffect, useContext, useMemo, useState } from 'react';
import { isExpired, decodeToken } from 'react-jwt';

import { OffchainSessionAccount, createOffchainSession } from '@argent/x-sessions';
import { getStarkKey, utils } from 'micro-starknet';

import WalletContext from '~/contexts/WalletContext';
import api from '~/lib/api';
import useStore from '~/hooks/useStore';

const AuthContext = createContext();

const getAccountFromToken = (token) => {
  const decoded = decodeToken(token);
  if (decoded) return decoded?.sub;
  return null;
};

export function AuthProvider({ children }) {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const token = useStore(s => s.auth.token);
  const dispatchTokenInvalidated = useStore(s => s.dispatchTokenInvalidated);
  const dispatchAuthenticated = useStore(s => s.dispatchAuthenticated);
  const walletContext = useContext(WalletContext);

  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    if (walletContext?.error) {
      createAlert({
        type: 'GenericAlert',
        level: 'warning',
        data: { content: walletContext?.error || 'Please try again.' },
        duration: 10000
      });
    }
  }, [walletContext?.error]);

  // clear "authenticating" state (i.e. if stuck)
  useEffect(() => {
    if (authenticating && token) setAuthenticating(false);
  }, [token, authenticating]);

  // Invalidate token if...
  //  - the token has expired
  //  - the token's account doesn't match the current walletAccount
  //  - (and not reconnecting)
  useEffect(() => {
    if (token) {
      if (!isExpired(token)) {
        if (walletContext?.account && walletContext?.account === getAccountFromToken(token)) return;
        if (!!walletContext?.isConnecting) return;
      }

      // console.log('Invalidating token...', isExpired(token), getAccountFromToken(token), walletContext?.account);
      dispatchTokenInvalidated();
    }
  }, [ token, walletContext?.account, walletContext?.isConnecting, dispatchTokenInvalidated ]);

  const initiateLogin = useCallback(async () => {
    const { id, provider, account } = (await walletContext.connect()) || {};
    let isDeployed = false;

    try {
      await provider.getClassAt(account?.address); // if this throws, the contract is not deployed
      isDeployed = true;
    } catch (e) {
      console.error(e);
    }

    if (account?.address && !token && id !== 'argentWebWallet') {
      try {
        const loginMessage = await api.requestLogin(account.address);
        const signature = isDeployed ? await account.signMessage(loginMessage) : ['insecure'];
        if (signature?.code === 'CANCELED') throw new Error('User abort');

        if (signature) {
          setAuthenticating(true);
          const newToken = await api.verifyLogin(account.address, { signature: signature.join(',') });
          dispatchAuthenticated(newToken);
          return true;
        }
      } catch (e) {
        initiateLogout();
        if (e.message === 'User abort') return;
        console.error(e);
        createAlert({
          type: 'GenericAlert',
          level: 'warning',
          data: { content: 'Signature verification failed.' },
          duration: 10000
        });
      }

      setAuthenticating(false);
      return false;
    }

    if (account?.address && !token && id === 'argentWebWallet') {
      setAuthenticating(true);
      const sessionSigner = utils.randomPrivateKey();
      const requestSession = {
        sessionKey: getStarkKey(sessionSigner),
        expirationTime: Math.floor(Date.now() / 1000) + 86400 * 7,
        allowedMethods: [
          {
            contractAddress: '0x20cd0c1f8cc0ca293d17b8184a6d51605ef4175827432ed24818ce24891bcdf',
            method: 'run_system'
          }
        ]
      };

      const gasFees = {
        tokenAddress: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        maximumAmount: { low: '0x2386f26fc10000', high: '0x0' }
      };

      const signedSession = await createOffchainSession(requestSession, walletContext.starknet.account, gasFees);
      console.log(signedSession);

      setAuthenticating(false);
      return false;
    }
  }, [ walletContext, token, dispatchAuthenticated ]); // eslint-disable-line react-hooks/exhaustive-deps

  const initiateLogout = useCallback(() => {
    walletContext.disconnect();
    dispatchTokenInvalidated();
  }, [ walletContext.disconnect, dispatchTokenInvalidated ]);

  // `account` will always correspond to current token value)
  const tokenAccount = useMemo(() => getAccountFromToken(token), [token]);
  return (
    <AuthContext.Provider value={{
      login: initiateLogin,
      logout: initiateLogout,
      authenticating,
      token,
      account: tokenAccount,
      walletContext
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
