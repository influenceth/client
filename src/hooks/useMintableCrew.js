import { useQuery } from 'react-query';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';

const useMintableCrew = () => {
  const { account } = useAuth();

  return useQuery(
    [ 'asteroids', 'mintableCrew', { owner: account } ],
    () => api.getMintableCrew({ owner: account }),
    { enabled: !!account }
  );
};

export default useMintableCrew;
