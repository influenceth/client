import { Entity } from '@influenceth/sdk';

import useEntity from './useEntity';

// TODO: could deprecate this and just use useEntity directly
const useCrew = (id) => {
  return useEntity({ label: Entity.IDS.CREW, id });
};

export default useCrew;
