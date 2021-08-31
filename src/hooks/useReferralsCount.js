import { useQuery } from 'react-query';

import useAuth from '~/hooks/useAuth';
import api from '~/lib/api';

const useReferralsCount = () => {
  const { token } = useAuth();

  return useQuery(
    [ 'referrals', 'count', token ],
    () => api.getReferralCount(),
    { enabled: !!token }
  );
};

export default useReferralsCount;
