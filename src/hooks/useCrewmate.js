import { Entity } from '@influenceth/sdk';

import useEntity from './useEntity';

// TODO: could deprecate this and just use useEntity directly
const useCrewmate = (id) => {
  return useEntity({ label: Entity.IDS.CREWMATE, id });
};

export default useCrewmate;
