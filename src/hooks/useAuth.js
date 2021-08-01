import { useEffect, useState } from 'react';
import { isExpired, decodeToken } from 'react-jwt';
import { useQuery } from 'react-query';
import axios from 'axios';
import { useWeb3React } from '@web3-react/core';
import { utils } from 'ethers';

import useStore from '~/hooks/useStore';

const useAuth = () => {
  const token = useStore(state => state.auth.token);
  const dispatchTokenInvalidated = useStore(state => state.dispatchTokenInvalidated);
  const dispatchAuthenticated = useStore(state => state.dispatchAuthenticated);
  const { library, account } = useWeb3React();

  // Invalidate token if the token has expired
  useEffect(() => {
    if (!!token && isExpired(token)) dispatchTokenInvalidated();
  }, [ token ]);

  // Invalidate token if an account isn't connected
  useEffect(() => {
    if (!account) dispatchTokenInvalidated();
  }, [ account]);

  // Invalidate the token if the token doesn't match the current account
  useEffect(() => {
    const decoded = decodeToken(token);

    if (!!account && decoded?.sub) {
      if (utils.getAddress(decoded.sub) !== utils.getAddress(account)) dispatchTokenInvalidated();
    }
  }, [ token, account ]);

  const loginQuery = useQuery([ 'login', account ], async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/v1/auth/login/${account}`);
    return response.data.message;
  }, { enabled: !token && !!account });

  const signQuery = useQuery([ 'sign', account ], async () => {
    const signature = await library.getSigner(account).signMessage(loginQuery.data);
    return signature;
  }, {
    enabled: loginQuery.isSuccess && !token && !!account,
    refetchOnWindowFocus: false
  });

  const verifyQuery = useQuery([ 'verify', account ], async () => {
    const response = await axios.post(
      `${process.env.REACT_APP_API_URL}/v1/auth/login/${account}`,
      { sig: signQuery.data }
    );

    return response.data.token;
  }, { enabled: signQuery.isSuccess && !token && !!account });

  useEffect(() => {
    if (verifyQuery.isSuccess) dispatchAuthenticated(verifyQuery.data);
  }, [ verifyQuery ]);

  return { token };
};

export default useAuth;
