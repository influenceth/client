import { useEffect, useState } from 'react';
import { isExpired, decodeToken } from 'react-jwt';
import { useQuery, useQueryClient } from 'react-query';
import { useWeb3React } from '@web3-react/core';
import { utils } from 'ethers';

import api from '~/lib/api';
import useStore from '~/hooks/useStore';

const useAuth = (startOnMount = true) => {
  const queryClient = useQueryClient();
  const token = useStore(s => s.auth.token);
  const dispatchTokenInvalidated = useStore(s => s.dispatchTokenInvalidated);
  const dispatchAuthenticated = useStore(s => s.dispatchAuthenticated);
  const { library, account } = useWeb3React();
  const [ activated, setActivated ] = useState(startOnMount);

  // Listen for props change to immediately start generating token
  useEffect(() => {
    setActivated(startOnMount);
  }, [ startOnMount ]);

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

  const restartLogin = () => loginQuery.refetch();
  const message = loginQuery?.data || null;

  const signQuery = useQuery([ 'sign', account, message ], async () => {
    console.log(message);
    const signature = await library.getSigner(account).signMessage(message);
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

  return { restartLogin, token };
};

export default useAuth;
