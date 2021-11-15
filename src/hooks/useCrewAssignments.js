import { useQuery } from 'react-query';
import { useWeb3React } from '@web3-react/core';

import api from '~/lib/api';

const useCrewAssignments = () => {
  const { account } = useWeb3React();

  return useQuery(
    [ 'user', 'stories', { owner: account } ],
    () => api.getUserStories({ owner: account }),
    { enabled: !!account }
  );
};

export default useCrewAssignments;
