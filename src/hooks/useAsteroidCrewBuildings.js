import { useMemo } from '~/lib/react-debug';
import { Entity } from '@influenceth/sdk';

import useCrewBuildings from '~/hooks/useCrewBuildings';

const useAsteroidCrewBuildings = (asteroidId) => {
  const { data, isLoading } = useCrewBuildings();

  return useMemo(import.meta.url, () => {
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

export default useAsteroidCrewBuildings;
