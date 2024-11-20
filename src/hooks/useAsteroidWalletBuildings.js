import { useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import useWalletBuildings from '~/hooks/useWalletBuildings';

const useAsteroidWalletBuildings = (asteroidId) => {
  const { data, isLoading } = useWalletBuildings();

  return useMemo(() => {
    return {
      data: asteroidId && !isLoading && data
        ? (data || []).filter((a) => (
            (a.Location?.locations || []).find((l) => l.label === Entity.IDS.ASTEROID && l.id === asteroidId)
          ))
        : undefined,
      isLoading
    };
  }, [data, isLoading]);
};

export default useAsteroidWalletBuildings;
