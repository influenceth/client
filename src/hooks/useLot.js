import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';

const useLot = (lotId) => {
  return useQuery(
    // NOTE: this includes metadata that may not play as nicely with
    //  a more standardized entity caching model... so when we get
    //  there, we may want to rename this cache key
    [ 'entity', Entity.IDS.LOT, lotId ],
    () => api.getLot(lotId),
    { enabled: !!lotId }
  );
};

export default useLot;
