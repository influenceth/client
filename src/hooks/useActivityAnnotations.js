import { useMemo } from '~/lib/react-debug';
import { useQuery } from 'react-query';

import api from '~/lib/api';
import { cleanseTxHash } from '~/lib/utils';

// note: deprecated at-the-moment, but could be relevant in the future

const useActivityAnnotations = (activity) => {
  const query = useMemo(import.meta.url, 
    () => activity?.event ? { transactionHash: activity?.event?.transactionHash, logIndex: activity?.event?.logIndex } : null,
    [activity]
  );
  
  return useQuery(
    ['annotations', cleanseTxHash(query?.transactionHash), `${query?.logIndex}`],
    () => api.getAnnotations(query),
    { enabled: !!query }
  );
};

export default useActivityAnnotations;
