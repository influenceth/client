import { useMemo } from '~/lib/react-debug';
import { Entity } from '@influenceth/sdk';

import useEntity from '~/hooks/useEntity';
import useBlockTime from '~/hooks/useBlockTime';
import { locationsArrToObj, openAccessJSTime } from '~/lib/utils';

// TODO: could deprecate this and just use useEntity directly
const useCrew = (id) => {
  // return useEntity({ label: Entity.IDS.CREW, id });

  const blockTime = useBlockTime();
  const response = useEntity({ label: Entity.IDS.CREW, id });
  return useMemo(import.meta.url, () => {
    if (response?.data) {
      // lastFed to launch
      if (openAccessJSTime) {
        if (response.data?.Crew) {
          response.data.Crew.lastFed = Math.max(
            Math.min(blockTime, openAccessJSTime / 1e3),
            response.data.Crew.lastFed
          );
        }
      }
    
      // _location
      response.data._location = locationsArrToObj(response.data?.Location?.locations || []);
    }
    return response;
  }, [blockTime, response]);
};

export default useCrew;
