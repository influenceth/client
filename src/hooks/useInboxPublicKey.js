import { useQuery } from 'react-query';

import useSession from '~/hooks/useSession';
import api from '~/lib/api';

const useInboxPublicKey = (recipient) => {
  const { accountAddress } = useSession();
  return useQuery(
    ['dmPublicKey', recipient],
    async () => {
      try {
        return await api.getInboxPublicKey(recipient);
      } catch (e) {
        if (e.response.status === 404) {
          return null;
        }
        throw e;
      }
    },
    { enabled: !!(recipient && accountAddress) }
  );
};

export default useInboxPublicKey;