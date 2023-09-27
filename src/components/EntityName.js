import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import formatters from '~/lib/formatters';
import api from '~/lib/api';

const formatterByLabel = {
  [Entity.IDS.ASTEROID]: formatters.asteroidName,
  [Entity.IDS.BUILDING]: formatters.buildingName,
  [Entity.IDS.CREW]: formatters.crewName,
  [Entity.IDS.CREWMATE]: formatters.crewmateName,
  [Entity.IDS.SHIP]: formatters.shipName,
}

const EntityName = ({ id, label }) => {
  // TODO: do we want `components: ['Name']` in the query?
  //  ^ more redundancy in cache, but save bandwidth when not
  const { data: entity, isLoading } = useQuery(
    [ 'entity', label, id ],
    () => api.getEntityById({ label, id }),
    { enabled: label && id }
  );

  return isLoading ? <>...</> : <>{formatterByLabel[label](entity)}</>;
};

export default EntityName;