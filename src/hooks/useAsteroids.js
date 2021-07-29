import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { useWeb3React } from '@web3-react/core';

import useAsteroidsStore from '~/hooks/useAsteroidsStore';

const useAsteroids = () => {
  const { account, library } = useWeb3React();
  const includeOwnedAsteroids = useAsteroidsStore(state => state.includeOwned);
  const [ query, setQuery ] = useState({});

  useEffect(() => {
    if (account && includeOwnedAsteroids) {
      setQuery({ ...query, includeOwned: '0x08Fd646854FDF202fE79A108a4Fe66f11C94e7a3' });
    } else {
      const { includeOwned, ...newQuery } = query;
      setQuery(newQuery);
    }
  }, [ account, includeOwnedAsteroids ]);

  return useQuery([ 'asteroids', query ], async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/v1/asteroids`, { params: query });
    return response.data;
  });
};

export default useAsteroids;
