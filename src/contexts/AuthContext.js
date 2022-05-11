import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { isExpired, decodeToken } from 'react-jwt';
import { useQuery, useQueryClient } from 'react-query';
import { useWeb3React } from '@web3-react/core';
import { WalletConnectConnector } from '@web3-react/walletconnect-connector';
import { utils } from 'ethers';

import api from '~/lib/api';
import useStore from '~/hooks/useStore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const token = useStore(s => s.auth.token);
  const dispatchTokenInvalidated = useStore(s => s.dispatchTokenInvalidated);
  const dispatchAuthenticated = useStore(s => s.dispatchAuthenticated);
  const { connector, library, account, ...web3Props } = useWeb3React();
  const [ activated, setActivated ] = useState(true);

  // Listen for props change to immediately start generating token
  useEffect(() => {
    setActivated(true);
  }, []);

  // Invalidate token if the token has expired
  useEffect(() => {
    if (!!token && isExpired(token)) dispatchTokenInvalidated();
  }, [ token, dispatchTokenInvalidated ]);

  // Invalidate the token if the token doesn't match the current account
  useEffect(() => {
    const decoded = decodeToken(token);

    if (!!account && decoded?.sub) {
      if (utils.getAddress(decoded.sub) !== utils.getAddress(account)) dispatchTokenInvalidated();
    }
  }, [ token, account, dispatchTokenInvalidated ]);

  const loginQuery = useQuery(
    [ 'login', account ],
    () => api.requestLogin(account),
    {
      enabled: !token && !!account && activated,
      refetchOnWindowFocus: false,
      retry: false
    }
  );

  const restartLogin = useCallback(() => loginQuery.refetch(), [loginQuery]);
  const message = useMemo(() => loginQuery?.data || null, [loginQuery]);

  const signQuery = useQuery([ 'sign', account, message ], async () => {
    let signature;

    if (connector instanceof WalletConnectConnector) {
      signature = await library.send(
        'personal_sign',
        [ utils.hexlify(utils.toUtf8Bytes(message)), account.toLowerCase() ]
      );
    } else {
      signature = await library.getSigner(account).signMessage(message);
    }

    return signature;
  }, {
    enabled: !!message && !token && !!account && !!library,
    refetchOnWindowFocus: false,
    retry: false,
    onSuccess: () => queryClient.invalidateQueries('verify')
  });

  const verifyQuery = useQuery(
    [ 'verify', account ],
    () => api.verifyLogin(account, signQuery.data),
    {
      enabled: signQuery.isSuccess && !token && !!account,
      refetchOnWindowFocus: false,
      retry: false
    }
  );

  useEffect(() => {
    if (verifyQuery.isSuccess) dispatchAuthenticated(verifyQuery.data);
  }, [ verifyQuery, dispatchAuthenticated ]);

  const provider = useMemo(() => {
    if (account && library) {
      return library.getSigner(account);
    }
    return null;
  }, [account, library]);

  return (
    <AuthContext.Provider value={{
      restartLogin,
      token,
      web3: {
        account,
        connector,
        library,
        provider,
        ...web3Props
      }
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
