import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import useCrewContext from './useCrewContext';

const useAsteroidCrewSamples = (asteroidId, resourceId) => {
  const { crew } = useCrewContext();

  const controllerId = crew?.id;
  return useQuery(
    [ 'entities', Entity.IDS.DEPOSIT, { asteroidId, resourceId, controllerId } ],
    () => api.getCrewSamplesOnAsteroid(asteroidId, controllerId, resourceId),
    { enabled: !!(asteroidId && controllerId && resourceId) }
  );
};

export default useAsteroidCrewSamples;
