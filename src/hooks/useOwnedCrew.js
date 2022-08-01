import { useQuery } from 'react-query';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';

const useOwnedCrew = () => {
  const { account } = useAuth();

  return useQuery(
    [ 'crew', 'search', { owner: account } ],
    () => api.getCrewMembers({ owner: account }),
    { enabled: !!account }
  );
};

export default useOwnedCrew;
