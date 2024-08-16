import { useMemo } from 'react';
import { cloneDeep } from 'lodash';
import { Entity } from '@influenceth/sdk';

import useEntity from '~/hooks/useEntity';
import { locationsArrToObj } from '~/lib/utils';

const useShip = (id) => {
  const entity = useMemo(() => {
    if (id) {
      if (id.label && id.id) return { label: id.label, id: Number(id.id) };
      return { label: Entity.IDS.SHIP, id };
    }
    return undefined;
  }, [id]);

  const { data, dataUpdatedAt, isLoading, refetch } = useEntity(entity);
  return useMemo(() => {
    let ship = null;
    if (data && !isLoading) {
      ship = cloneDeep(data);
      ship._location = locationsArrToObj(ship.Location?.locations || []);
    }
    return { data: ship, dataUpdatedAt, isLoading, refetch };
  }, [data, dataUpdatedAt, isLoading, refetch]);
};

export default useShip;
