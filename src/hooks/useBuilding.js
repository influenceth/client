import { Entity } from '@influenceth/sdk';

import useEntity from './useEntity';

// TODO: could deprecate this and just use useEntity directly
const useBuilding = (id) => {
  return useEntity({ label: Entity.IDS.BUILDING, id });
};

export default useBuilding;
