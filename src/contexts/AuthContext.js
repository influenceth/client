import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isExpired, decodeToken } from 'react-jwt';
import { useQuery, useQueryClient } from 'react-query';

import { getStarknet, connect, disconnect } from 'get-starknet';
import { Header, Payload, SIWStarkware } from '@web3auth/sign-in-with-starkware';

// import { useWeb3React } from '@web3-react/core';
// import { WalletConnectConnector } from '@web3-react/walletconnect-connector';
import { utils } from 'ethers';

// import { useStarknet, InjectedConnector } from '@starknet-react/core'

import { ec, Signer } from 'starknet';

import api from '~/lib/api';
import useStarknet from '~/hooks/useStarknet';
import useStore from '~/hooks/useStore';
import { starknetKeccak } from 'starknet/dist/utils/hash';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const token = useStore(s => s.auth.token);
  const dispatchTokenInvalidated = useStore(s => s.dispatchTokenInvalidated);
  const dispatchAuthenticated = useStore(s => s.dispatchAuthenticated);

  const starknet = useStarknet();
  const account = starknet?.account;
  console.log('wllet', starknet?.wallet);

  const networkId = useMemo(() => {
    try {
      const baseUrl = starknet?.wallet?.provider?.baseUrl;
      if (baseUrl.includes('alpha-mainnet.starknet.io')) {
        return 'mainnet-alpha';
      } else if (baseUrl.includes('alpha4.starknet.io')) {
        return 'goerli-alpha';
      } else if (baseUrl.match(/^https?:\/\/localhost.*/)) {
        return 'localhost';
      }
    } catch {}
    return null;
  }, [starknet?.wallet?.provider?.baseUrl]);

  // Invalidate token if the token has expired
  useEffect(() => {
    if (!!token && isExpired(token)) dispatchTokenInvalidated();
  }, [ token, dispatchTokenInvalidated ]);

  // Invalidate the token if the token doesn't match the current account
  useEffect(() => {
    const decoded = decodeToken(token);

    if (!!account && decoded?.sub) {
      // TODO: ... utils is from ethers
      if (utils.getAddress(decoded.sub) !== utils.getAddress(account)) dispatchTokenInvalidated();
    }
  }, [ token, account, dispatchTokenInvalidated ]);

  // TODO: not sure it's worth using useQuery for these?

  const loginQuery = useQuery(
    [ 'login', account ],
    () => api.requestLogin(account),
    {
      enabled: !token && !!account,
      refetchOnWindowFocus: false,
      retry: false
    }
  );
  console.log('loginQuery', loginQuery?.data);

  const restartLogin = useCallback(() => loginQuery.refetch(), [loginQuery]);
  const statementWithNonce = loginQuery?.data || null;

  const signQuery = useQuery([ 'sign', account, statementWithNonce ], async () => {
    
    // TODO: generate our own payload or use SIWS?
    //  - most of the params aren't used / are easily spoofable
    //  - since we aren't using the same "verify", we would need to check them explicitly,
    //    but it's unclear what increased security they provide
    //  - instead of statement with nonce, use actual nonce... respond with expiration time 
    //    as well so we can block on the front-end if expired
    // - when token expires, do not attempt auto-login... user should click button

    const payload = new Payload();
    payload.domain = window.location.host;
    payload.address = account;
    payload.uri = window.location.origin;
    payload.statement = statementWithNonce;
    payload.version = '1';
    payload.chainId = 1337; // TODO: ?
    payload.issuedAt = new Date().toISOString();
    console.log('payload', payload)

    const header = new Header();
    header.t = 'eip191';
    
    // console.log('starknet.wallet', starknet.wallet);
    // return {};
    
    let message = new SIWStarkware({ header, payload });
    const preparedMessage = message.prepareMessage();
    const encodedMessage = starknetKeccak(preparedMessage).toString('hex').substring(0, 31);
    const typedMessage = {
      domain: {
        name: 'Example DApp',
        chainId: networkId === 'mainnet-alpha' ? 'SN_MAIN' : 'SN_GOERLI',
        version: '0.0.1',
      },
      types: {
        StarkNetDomain: [
          { name: 'name', type: 'felt' },
          { name: 'chainId', type: 'felt' },
          { name: 'version', type: 'felt' },
        ],
        Message: [{ name: 'message', type: 'felt' }],
      },
      primaryType: 'Message',
      message: { message: encodedMessage },
    };


    // console.log('wallet', starknet.wallet);
    // console.log('getPubKey', await starknet.wallet.account.signer.keyPair.ec.getX());
    // TODO: pass network and encoded message

    const signature = await starknet.wallet.account.signMessage(typedMessage);
    const params = { payload, signature: { s: signature }, kp: starknet?.wallet };
    console.log('PMK', params);

    // const resp = await message.verify(params);
    // console.log('VERIFY2', resp);

    return {
      header,
      payload: message.payload,
      signature: signature.join(','),
      typedMessage
    };
  }, {
    enabled: !!statementWithNonce && !token && !!account,
    refetchOnWindowFocus: false,
    retry: false,
    onSuccess: () => queryClient.invalidateQueries('verify')
  });

  useEffect(() => {
    console.log('signQuery', signQuery);
  }, [signQuery])


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

  return (
    <AuthContext.Provider value={{
      restartLogin,
      token,
      wallet: starknet
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
