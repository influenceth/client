import { useQuery } from 'react-query';
import { Encryption } from '@influenceth/sdk';

import api from '~/lib/api';

const useInboxPublicKey = (recipient) => {
  return useQuery(
    ['dmPublicKey', recipient],
    async () => {
      try {
        return await api.getInboxPublicKey(recipient)
      } catch (e) {
        if (e.response.status === 404) {
          return null;
        }
        throw e;
      }
    },
    { enabled: !!recipient }
  );
};

export default useInboxPublicKey;