import { useQuery } from 'react-query';

import useSession from '~/hooks/useSession';
import api from '~/lib/api';

const useReferrals = () => {
  const { token } = useSession();

  return useQuery(
    [ 'referrals', token ],
    () => api.getReferrals(),
    { enabled: !!token }
  );
};

export default useReferrals;
