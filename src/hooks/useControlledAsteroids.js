import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import useCrewContext from '~/hooks/useCrewContext';
import { entitiesCacheKey } from '~/lib/cacheKey';

const useControlledAsteroids = () => {
  const { crew } = useCrewContext();

  const { id: controllerId, uuid } = crew || {};
  return useQuery(
    entitiesCacheKey(Entity.IDS.ASTEROID, { controllerId }),
    () => api.getEntities({ match: { 'Control.controller.uuid': uuid }, label: Entity.IDS.ASTEROID }),
    { enabled: !!controllerId }
  );
};

export default useControlledAsteroids;
