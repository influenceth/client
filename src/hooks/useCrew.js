import { useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import useEntity from '~/hooks/useEntity';
import useBlockTime from '~/hooks/useBlockTime';
import { openAccessJSTime } from '~/lib/utils';

// TODO: could deprecate this and just use useEntity directly
const useCrew = (id) => {
  // return useEntity({ label: Entity.IDS.CREW, id });

  // TODO: (_launched) switch back to above and delete below
  const blockTime = useBlockTime();
  const response = useEntity({ label: Entity.IDS.CREW, id });
  return useMemo(() => {
    if (`${process.env.REACT_APP_CHAIN_ID}` === `0x534e5f5345504f4c4941`) {
      if (response?.data?.Crew) {
        response.data.Crew.lastFed = Math.max(Math.min(blockTime || (Date.now() / 1e3), openAccessJSTime / 1e3), response.data.Crew.lastFed);
      }
    }
    return response;
  }, [response]);
};

export default useCrew;
