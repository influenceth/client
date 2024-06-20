import { useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import useEntity from '~/hooks/useEntity';
import useBlockTime from '~/hooks/useBlockTime';
import { locationsArrToObj, openAccessJSTime } from '~/lib/utils';

// TODO: could deprecate this and just use useEntity directly
const useCrew = (id) => {
  // return useEntity({ label: Entity.IDS.CREW, id });

  // TODO: (_launched) switch back to above and delete below
  const blockTime = useBlockTime();
  const response = useEntity({ label: Entity.IDS.CREW, id });
  return useMemo(() => {
    if (openAccessJSTime) {
      const cmpTime = blockTime || (Date.now() / 1e3);
      if (response?.data?.Crew) {
        response.data.Crew.lastFed = Math.max(
          Math.min(cmpTime, openAccessJSTime / 1e3),
          response.data.Crew.lastFed
        );
        response.data._launched = cmpTime > openAccessJSTime / 1e3;
      }
    }
    if (response?.data) {
      response.data._location = locationsArrToObj(response.data.Location.locations || []);
    }
    return response;
  }, [blockTime, response]);
};

export default useCrew;
