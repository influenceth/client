import { useQuery } from 'react-query';

import useSession from '~/hooks/useSession';
import api from '~/lib/api';

const useReferralsCount = () => {
  const { token } = useSession();

  return useQuery(
    [ 'referrals', 'count', token ],
    () => api.getReferralCount(),
    { enabled: !!token }
  );
};

export default useReferralsCount;
