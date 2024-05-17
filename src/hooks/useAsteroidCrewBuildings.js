import { useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import useCrewContext from '~/hooks/useCrewContext';
import useWalletBuildings from '~/hooks/useWalletBuildings';

const useAsteroidCrewBuildings = (asteroidId) => {
  const { crew } = useCrewContext();
  const { data, isLoading } = useWalletBuildings();

  return useMemo(() => {
    return {
      data: crew?.id && asteroidId && data
        ? (data.hits || []).filter((a) => (
            a.Control?.controller?.id === crew?.id
            && (a.Location?.locations || []).find((l) => l.label === Entity.IDS.ASTEROID && l.id === asteroidId)
          ))
        : undefined,
      isLoading
    };
  }, [crew?.id, data, isLoading]);
};

export default useAsteroidCrewBuildings;
