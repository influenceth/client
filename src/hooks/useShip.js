import { useMemo } from 'react';
import { cloneDeep } from 'lodash';
import { Entity } from '@influenceth/sdk';

import useEntity from '~/hooks/useEntity';
import { locationsArrToObj } from '~/lib/utils';

const useShip = (id) => {
  const entity = id 
    ? (id?.label && id?.id ? id : { label: Entity.IDS.SHIP, id })
    : undefined;
  const { data, ...responseProps } = useEntity(entity);
  return useMemo(() => {
    let ship = null;
    if (data && !responseProps.isLoading) {
      ship = cloneDeep(data);
      ship._location = locationsArrToObj(ship.Location?.locations);
    }
    return { data: ship, ...responseProps };
  }, [data, responseProps]);
};

export default useShip;
