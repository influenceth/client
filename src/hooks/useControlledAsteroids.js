import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import useCrewContext from '~/hooks/useCrewContext';
import { entitiesCacheKey } from '~/lib/cacheKey';

const useControlledAsteroids = () => {
  const { crew } = useCrewContext();

  return useQuery(
    entitiesCacheKey(Entity.IDS.ASTEROID, { controllerId: crew?.id }),
    () => api.getEntities({ match: { 'Control.controller.uuid': crew?.uuid }, label: Entity.IDS.ASTEROID }),
    { enabled: !!crew?.id }
  );
};

export default useControlledAsteroids;
