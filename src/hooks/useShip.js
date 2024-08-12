import { useMemo } from 'react';
import { cloneDeep } from 'lodash';
import { Entity } from '@influenceth/sdk';

import useEntity from '~/hooks/useEntity';
import { locationsArrToObj } from '~/lib/utils';

const useShip = (id) => {
  const entity = useMemo(() => {
    if (id) {
      if (id.label && id.id) return id;
      return { label: Entity.IDS.SHIP, id };
    }
    return undefined;
  }, [id]);

  const { data, ...responseProps } = useEntity(entity);
  return useMemo(() => {
    let ship = null;
    if (data && !responseProps.isLoading) {
      ship = cloneDeep(data);
      ship._location = locationsArrToObj(ship.Location?.locations || []);
    }
    return { data: ship, ...responseProps };
  }, [data, responseProps]);
};

export default useShip;
