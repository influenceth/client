import { Entity } from '@influenceth/sdk';

import useEntity from './useEntity';

// TODO: could deprecate this and just use useEntity directly
const useAsteroid = (id) => {
  return useEntity({ label: Entity.IDS.ASTEROID, id });
};

export default useAsteroid;
