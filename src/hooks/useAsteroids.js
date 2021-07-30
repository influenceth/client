import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { useWeb3React } from '@web3-react/core';

import useStore from '~/hooks/useStore';

const useAsteroids = () => {
  const { account } = useWeb3React();
  const includeOwnedAsteroids = useStore(state => state.includeOwned);
  const [ query, setQuery ] = useState({});

  useEffect(() => {
    if (account && includeOwnedAsteroids) {
      // TODO: use the actual account!
      setQuery({ ...query, includeOwned: '0x08Fd646854FDF202fE79A108a4Fe66f11C94e7a3' });
    } else {
      const { includeOwned, ...newQuery } = query;
      setQuery(newQuery);
    }
  }, [ query, account, includeOwnedAsteroids ]);

  return useQuery([ 'asteroids', query ], async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/v1/asteroids`, { params: query });
    return response.data;
  });
};

export default useAsteroids;
