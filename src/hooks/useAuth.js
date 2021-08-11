import { useEffect, useState } from 'react';
import { isExpired, decodeToken } from 'react-jwt';
import { useQuery } from 'react-query';
import { useWeb3React } from '@web3-react/core';
import { utils } from 'ethers';

import api from '~/lib/api';
import useStore from '~/hooks/useStore';

const useAuth = (startOnMount = true) => {
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
    { enabled: !token && !!account && activated }
  );

  const signQuery = useQuery([ 'sign', account ], async () => {
    const signature = await library.getSigner(account).signMessage(loginQuery.data);
    return signature;
  }, {
    enabled: loginQuery.isSuccess && !token && !!account,
    refetchOnWindowFocus: false
  });

  const verifyQuery = useQuery(
    [ 'verify', account ],
    () => api.verifyLogin(account, signQuery.data),
    { enabled: signQuery.isSuccess && !token && !!account }
  );

  useEffect(() => {
    if (verifyQuery.isSuccess) dispatchAuthenticated(verifyQuery.data);
  }, [ verifyQuery, dispatchAuthenticated ]);

  return { token };
};

export default useAuth;
