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
  const wallet = useContext(WalletContext);

  const account = wallet?.account;

  // Invalidate token if the token has expired
  useEffect(() => {
    if (!!token && isExpired(token)) {
      dispatchTokenInvalidated();
    }
  }, [ token, dispatchTokenInvalidated ]);

  // Invalidate the token if the token doesn't match the current account
  useEffect(() => {
    const decoded = decodeToken(token);
    if (!account) {
      dispatchTokenInvalidated();
    }
    else if (decoded?.sub && account !== decoded?.sub) {
      dispatchTokenInvalidated();
    }
  }, [ token, account, dispatchTokenInvalidated ]);

  const initiateLogin = useCallback(async () => {
    if (account && !token) {
      try {
        const loginMessage = await api.requestLogin(account);
        const signature = await wallet.starknet.account.signMessage(loginMessage);
        const newToken = await api.verifyLogin(account, { signature: signature.join(',') });
        dispatchAuthenticated(newToken);
        return true;
      } catch (e) {
        console.error(e);
        createAlert({
          type: 'GenericAlert',
          level: 'warning',
          content: 'Signature verification failed.',
          duration: 10000
        });
      }
    }
  }, [account, token, dispatchAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{
      login: initiateLogin,
      token,
      account: token && wallet?.account,
      provider: token && wallet?.account,
      wallet
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
