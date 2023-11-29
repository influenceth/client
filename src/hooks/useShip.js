import { Entity } from '@influenceth/sdk';

import useEntity from './useEntity';

// TODO: could deprecate this and just use useEntity directly
const useShip = (id) => {
  return useEntity({ label: Entity.IDS.SHIP, id });
};

export default useShip;
