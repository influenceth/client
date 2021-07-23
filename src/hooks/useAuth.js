import { useEffect, useState } from 'react';
import { isExpired, decodeToken } from 'react-jwt';
import { useWeb3React } from '@web3-react/core';
import { utils } from 'ethers';

import useStore from '~/hooks/useStore';

const useAuth = () => {
  const token = useStore(state => state.token);
  const getToken = useStore(state => state.getToken);
  const { library, account } = useWeb3React();
  const [ authed, setAuthed ] = useState(false);

  useEffect(() => {
    const decoded = decodeToken(token);

    // If jwt is empty or expired but account is connected
    if (isExpired(token) && account) getToken(library, account);

    // If token is valid and matches account set authed to true
    if (!isExpired(token) && decoded.sub && account) {
      if (utils.getAddress(decoded.sub) === utils.getAddress(account)) {
        setAuthed(true);
      }
    }
  }, [ token, account, getToken, library ]);

  return { token, authed };
};

export default useAuth;
