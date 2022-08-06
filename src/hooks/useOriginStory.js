import { useQuery } from 'react-query';
import useAuth from '~/hooks/useAuth';

import api from '~/lib/api';

const useOriginStory = () => {
  const { token } = useAuth();

  return useQuery(
    [ 'stories', 'origin' ],
    () => api.getOriginStory(),
    {
      enabled: !!token,
      retry: false
    }
  );
};

export default useOriginStory;
