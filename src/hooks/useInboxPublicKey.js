import { useQuery } from 'react-query';

import api from '~/lib/api';

const useInboxPublicKey = (recipient) => {
  return useQuery(
    ['dmPublicKey', recipient],
    () => api.getInboxPublicKey(recipient),
    { enabled: !!recipient }
  );
};

export default useInboxPublicKey;