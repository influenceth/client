import { createContext, useCallback, useEffect, useContext, useMemo, useState } from 'react';
import { isExpired, decodeToken } from 'react-jwt';

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
  const walletAccount = walletContext?.account;

  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    if (walletContext?.error) {
      createAlert({
        type: 'GenericAlert',
        level: 'warning',
        content: walletContext?.error || 'Please try again.',
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
  useEffect(() => {
    if (token) {
      if (!isExpired(token)) {
        if (walletAccount && walletAccount === getAccountFromToken(token)) {
          return;
        }
      }
      dispatchTokenInvalidated();
    }
  }, [ token, walletAccount, dispatchTokenInvalidated ]);

  const initiateLogin = useCallback(async (withWallet) => {
    await walletContext.attemptConnection(withWallet);
    const address = withWallet?.account?.address;

    if (address && !token) {
      try {
        const loginMessage = await api.requestLogin(address);
        const signature = await withWallet.account.signMessage(loginMessage);
        if (signature?.code === 'CANCELED') throw new Error('User abort');

        if (signature) {
          setAuthenticating(true);
          const newToken = await api.verifyLogin(address, { signature: signature.join(',') });
          dispatchAuthenticated(newToken);
        }
      } catch (e) {
        initiateLogout();
        if (e.message === 'User abort') return;
        console.error(e);
        createAlert({
          type: 'GenericAlert', level: 'warning', content: 'Signature verification failed.', duration: 10000
        });
      }
      setAuthenticating(false);
    }
  }, [ walletContext, token, dispatchAuthenticated ]); // eslint-disable-line react-hooks/exhaustive-deps

  const initiateLogout = useCallback(() => {
    walletContext.disconnect({ clearLastWallet: true });
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
