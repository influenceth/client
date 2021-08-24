import { useQuery } from 'react-query';

import useAuth from '~/hooks/useAuth';
import api from '~/lib/api';

const useReferralsCount = () => {
  const { token } = useAuth();

  return useQuery(
    [ 'referralsCount', token ],
    () => api.getReferralCount(),
    { enabled: !!token, staleTime: 60000 * 5 }
  );
};

export default useReferralsCount;
