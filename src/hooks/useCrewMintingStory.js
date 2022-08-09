import { useQuery } from 'react-query';
import useAuth from '~/hooks/useAuth';

import api from '~/lib/api';

const useCrewMintingStory = () => {
  const { token } = useAuth();

  return useQuery(
    [ 'stories', 'recruitment' ],
    () => api.getAdalianRecruitmentStory(),
    {
      enabled: !!token,
      retry: false
    }
  );
};

export default useCrewMintingStory;
