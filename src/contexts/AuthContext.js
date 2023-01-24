import { createContext, useCallback, useEffect, useContext, useRef } from 'react';
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
  const account = walletContext?.account;

  const authenticatedAccount = useRef(getAccountFromToken(token));

  const invalidateTokenImmediately = useCallback(() => {
    authenticatedAccount.current = null;
    dispatchTokenInvalidated();
  }, []);

  useEffect(() => {
    if (walletContext?.error) {
      createAlert({
        type: 'GenericAlert',
        level: 'warning',
        content: walletContext?.error || 'Please try again.',
        duration: 10000
      });
    }
  }, [walletContext?.error])

  // Invalidate token if...
  //  - the token has expired
  //  - the token doesn't match the current account
  useEffect(() => {
    const account = walletContext?.account;
    if (token && !isExpired(token)) {
      if (account && account === getAccountFromToken(token)) {
        return;
      }
    }
    invalidateTokenImmediately();
  }, [ token, walletContext, invalidateTokenImmediately ]);

  const initiateLogin = useCallback(async (wallet) => {
    await walletContext.attemptConnection(wallet);
    const address = wallet?.account?.address;

    if (address && !token) {
      try {
        const loginMessage = await api.requestLogin(address);
        const signature = await wallet.account.signMessage(loginMessage);
        const newToken = await api.verifyLogin(address, { signature: signature.join(',') });
        authenticatedAccount.current = walletContext?.account;
        dispatchAuthenticated(newToken);
        return true;
      } catch (e) {
        initiateLogout();
        console.error(e);
        createAlert({
          type: 'GenericAlert',
          level: 'warning',
          content: 'Signature verification failed.',
          duration: 10000
        });
      }
    }
  }, [ walletContext, token, dispatchAuthenticated ]); // eslint-disable-line react-hooks/exhaustive-deps

  const initiateLogout = useCallback(() => {
    walletContext.disconnect({ clearLastWallet: true });
    invalidateTokenImmediately();
  }, [ walletContext.disconnect, invalidateTokenImmediately ]);

  // NOTE: in the rendering loop, if the account changes, we will fire dispatch
  //  to clear the app-level state's token value, but that will not be here until
  //  the NEXT render (at which point all children could potentially have been
  //  rendered with a new account value BUT the token on the api requests tied
  //  to the PREVIOUSLY AUTHED account -- not good)... this fixes that:
  const authenticationIsValid = account === authenticatedAccount.current;
  return (
    <AuthContext.Provider value={{
      login: initiateLogin,
      logout: initiateLogout,
      token: authenticationIsValid && token,
      account: authenticationIsValid && token && account,
      provider: authenticationIsValid && token && account,  // TODO: this is probably deprecated
      walletContext
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
