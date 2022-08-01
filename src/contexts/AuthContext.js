import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isExpired, decodeToken } from 'react-jwt';
import { useQuery, useQueryClient } from 'react-query';

import api from '~/lib/api';
import useStarknet from '~/hooks/useStarknet';
import useStore from '~/hooks/useStore';

const AuthContext = createContext();

const isValidProvider = (wallet) => {
  // return true; // TODO: remove this
  return wallet?.provider?.baseUrl === process.env.REACT_APP_STARKNET_NETWORK;
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const token = useStore(s => s.auth.token);
  const dispatchTokenInvalidated = useStore(s => s.dispatchTokenInvalidated);
  const dispatchAuthenticated = useStore(s => s.dispatchAuthenticated);

  const starknet = useStarknet();
  const account = isValidProvider(starknet?.wallet) && starknet?.account;

  // Invalidate token if the token has expired
  useEffect(() => {
    if (!!token && isExpired(token)) dispatchTokenInvalidated();
  }, [ token, dispatchTokenInvalidated ]);

  // Invalidate the token if the token doesn't match the current account
  useEffect(() => {
    const decoded = decodeToken(token);
    if (!account) {
      dispatchTokenInvalidated();
    }
    else if (decoded?.sub && account !== decoded?.sub) {
      console.log('invalidating', account, decoded?.sub);
      dispatchTokenInvalidated();
    }
  }, [ token, account, dispatchTokenInvalidated ]);

  useEffect(() => {
    const connectedNetwork = starknet?.account && starknet?.wallet?.provider?.baseUrl;
    if (connectedNetwork && !isValidProvider(starknet?.wallet)) {
      // error
      createAlert({
        type: 'GenericAlert',
        level: 'warning',
        content: `You must connect to a Starknet wallet on the following network to login: ${process.env.REACT_APP_STARKNET_NETWORK}`,
        duration: 10000
      });
    }
  }, [starknet?.account, starknet?.wallet?.provider?.baseUrl])

  // TODO: when token expires, do not attempt auto-login... user should click button
  //  (notify user and allow to login with click of notification)
  // TODO: not sure it's worth using useQuery for these?
  // TODO: warn if on wrong network

  const loginQuery = useQuery(
    [ 'login', account ],
    () => api.requestLogin(account),
    {
      enabled: !token && !!account,
      refetchOnWindowFocus: false,
      retry: false
    }
  );

  const restartLogin = useCallback(() => loginQuery.refetch(), [loginQuery]);
  const messageHash = loginQuery?.data?.message?.message || null;

  const signQuery = useQuery(
    [ 'sign', account, messageHash ],
    () => {
      return starknet.wallet.account.signMessage(loginQuery.data);
    },
    {
      enabled: !!messageHash && !token && !!account,
      refetchOnWindowFocus: false,
      retry: false,
      onSuccess: () => queryClient.invalidateQueries('verify')
    }
  );

  console.log(signQuery?.data);
  const verifyQuery = useQuery(
    [ 'verify', account ],
    () => api.verifyLogin(account, { signature: signQuery.data.join(',') }),
    {
      enabled: signQuery.isSuccess && signQuery.data?.length && !token && !!account,
      refetchOnWindowFocus: false,
      retry: false
    }
  );

  useEffect(() => {
    if (verifyQuery.isSuccess) dispatchAuthenticated(verifyQuery.data);
  }, [ verifyQuery, dispatchAuthenticated ]);

  return (
    <AuthContext.Provider value={{
      restartLogin,
      token,
      account: token && starknet?.account,
      wallet: starknet
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
