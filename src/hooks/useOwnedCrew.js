import { useQuery } from 'react-query';
import { useWeb3React } from '@web3-react/core';

import api from '~/lib/api';

const useOwnedCrew = () => {
  const { account } = useWeb3React();

  return useQuery(
    [ 'crewMembers', { owner: account } ],
    () => api.getCrewMembers({ owner: account }),
    { enabled: !!account }
  );
};

export default useOwnedCrew;
