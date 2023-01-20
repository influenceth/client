import { createContext, useCallback, useEffect, useContext } from 'react';
import { isExpired, decodeToken } from 'react-jwt';

import WalletContext from '~/contexts/WalletContext';
import api from '~/lib/api';
import useStore from '~/hooks/useStore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const token = useStore(s => s.auth.token);
  const dispatchTokenInvalidated = useStore(s => s.dispatchTokenInvalidated);
  const dispatchAuthenticated = useStore(s => s.dispatchAuthenticated);
  const dispatchLogout = useStore(s => s.dispatchLoggedOut);
  const walletContext = useContext(WalletContext);
  const account = walletContext?.account;

  // Invalidate token if the token has expired
  useEffect(() => {
    if (!!token && isExpired(token)) {
      dispatchTokenInvalidated();
    }
  }, [ token, dispatchTokenInvalidated ]);

  // Invalidate the token if the token doesn't match the current account
  useEffect(() => {
    const account = walletContext?.account;
    const decoded = decodeToken(token);

    if (!account) {
      dispatchTokenInvalidated();
    }
    else if (decoded?.sub && account !== decoded?.sub) {
      dispatchTokenInvalidated();
    }
  }, [ token, walletContext, dispatchTokenInvalidated ]);

  const initiateLogin = useCallback(async (wallet) => {
    await walletContext.attemptConnection(wallet);
    const address = wallet?.account?.address;

    if (address && !token) {
      try {
        const loginMessage = await api.requestLogin(address);
        const signature = await wallet.account.signMessage(loginMessage);
        const newToken = await api.verifyLogin(address, { signature: signature.join(',') });
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
    dispatchTokenInvalidated();
    dispatchLogout();
  }, [ walletContext.disconnect, dispatchTokenInvalidated, dispatchLogout ]);

  return (
    <AuthContext.Provider value={{
      login: initiateLogin,
      logout: initiateLogout,
      token,
      account: token && account,
      provider: token && account,
      walletContext
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
