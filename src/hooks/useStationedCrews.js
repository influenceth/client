import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';

const useStationedCrews = (entityId, hydrateCrewmates = false) => {
  const entityUuid = useMemo(() => entityId ? Entity.packEntity(entityId) : undefined, [entityId]);
  const { data: stationedCrews, isLoading: crewsLoading } = useQuery(
    [ 'entities', Entity.IDS.CREW, { stationUuid: entityUuid } ],
    () => api.getEntities({ match: { 'Location.location.uuid': entityUuid }, label: Entity.IDS.CREW }),
    { enabled: !!entityUuid }
  );

  const crewmateIds = useMemo(() => (
    hydrateCrewmates
      ? stationedCrews.reduce((acc, c) => ([...acc, ...c.Crew.roster]), [])
      : []
  ), [hydrateCrewmates, stationedCrews]);

  const { data: stationedCrewmates, isLoading: crewmatesLoading } = useQuery(
    [ 'entities', Entity.IDS.CREWMATE, crewmateIds.join(',') ], // TODO: joined key
    () => api.getCrewmates(crewmateIds),
    { enabled: crewmateIds?.length > 0 }
  );

  return useMemo(() => {
    if (crewsLoading || crewmatesLoading) {
      return { data: undefined, isLoading: true };
    }
    if (hydrateCrewmates) {
      return {
        data: stationedCrews.map((c) => ({
          ...c,
          _crewmates: stationedCrewmates.filter((cm) => c.Crew.roster.includes(cm.id))
        })),
        isLoading: false
      }
    }
    return { data: stationedCrews, isLoading: false }
  }, [crewsLoading, crewmatesLoading, hydrateCrewmates, stationedCrews, stationedCrewmates]);
};

export default useStationedCrews;
