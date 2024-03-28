import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import { useMemo } from 'react';

const useStationedCrews = (entityId, hydrateCrewmates = false) => {
  const entityUuid = useMemo(() => entityId ? Entity.packEntity(entityId) : undefined, [entityId]);
  return useQuery(
    [ 'entities', Entity.IDS.CREW, { stationUuid: entityUuid, hydrateCrewmates }],
    () => api.getStationedCrews(entityUuid, hydrateCrewmates),
    { enabled: !!entityUuid }
  );
};

export default useStationedCrews;
