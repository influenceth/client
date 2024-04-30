import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import useCrewContext from './useCrewContext';
import { entitiesCacheKey } from '~/lib/cacheKey';

const useOwnedShips = (otherCrew = null) => {
  const { crew } = useCrewContext();

  const { id: controllerId, uuid } = useMemo(() => otherCrew || crew || {}, [otherCrew, crew]);
  return useQuery(
    entitiesCacheKey(Entity.IDS.SHIP, { controllerId }),
    () => api.getEntities({ match: { 'Control.controller.uuid': uuid }, label: Entity.IDS.SHIP }),
    { enabled: !!controllerId }
  );
};

export default useOwnedShips;
