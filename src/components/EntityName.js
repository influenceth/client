import { useQuery } from 'react-query';
import { Asteroid, Entity } from '@influenceth/sdk';

import formatters from '~/lib/formatters';
import api from '~/lib/api';
import { useMemo } from 'react';

const formatterByLabel = {
  [Entity.IDS.ASTEROID]: formatters.asteroidName,
  [Entity.IDS.BUILDING]: formatters.buildingName,
  [Entity.IDS.CREW]: formatters.crewName,
  [Entity.IDS.CREWMATE]: formatters.crewmateName,
  [Entity.IDS.SHIP]: formatters.shipName,
}

const EntityName = ({ id, label, forceBaseName }) => {
  const { data: entity, isLoading } = useQuery(
    [ 'entity', label, id ],
    () => api.getEntityById({ label, id }),
    { enabled: !!(label && id) }
  );

  const name = useMemo(() => {
    if (isLoading) return '...';
    if (forceBaseName && entity) {
      if (label === Entity.IDS.ASTEROID) return Asteroid.Entity.getBaseName(entity);
      return `#${(id || '').toLocaleString()}`;
    } else {
      return formatterByLabel[label](entity);
    }
  }, [entity, forceBaseName, isLoading, label])

  return <>{name}</>;
};

export default EntityName;