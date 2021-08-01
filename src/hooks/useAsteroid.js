import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useWeb3React } from '@web3-react/core';

import api from '~/lib/api';

const useAsteroid = (i) => {
  return useQuery([ 'asteroids', i ], () => api.getAsteroid(i), { enabled: !!i });
};

export default useAsteroid;
