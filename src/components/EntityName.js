import { useMemo } from 'react';
import { Asteroid, Entity } from '@influenceth/sdk';

import formatters from '~/lib/formatters';
import useEntity from '~/hooks/useEntity';

const formatterByLabel = {
  [Entity.IDS.ASTEROID]: formatters.asteroidName,
  [Entity.IDS.BUILDING]: formatters.buildingName,
  [Entity.IDS.CREW]: formatters.crewName,
  [Entity.IDS.CREWMATE]: formatters.crewmateName,
  [Entity.IDS.LOT]: formatters.lotName,
  [Entity.IDS.SHIP]: formatters.shipName,
  [Entity.IDS.SPACE]: () => 'In Flight',
}

const EntityName = ({ id, label, forceBaseName }) => {
  const { data: entity, isLoading } = useEntity(label === Entity.IDS.SPACE ? null : { label, id });

  const name = useMemo(() => {
    if (isLoading) return '...';
    if (forceBaseName && entity) {
      if (label === Entity.IDS.ASTEROID) return Asteroid.Entity.getBaseName(entity);
      return `#${(id || '').toLocaleString()}`;
    } else if (formatterByLabel[label]) {
      return formatterByLabel[label](entity);
    }
    return '';
  }, [entity, forceBaseName, isLoading, label])

  return <>{name}</>;
};

export default EntityName;