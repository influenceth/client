import { useQueryClient, useMutation } from 'react-query';

import useAuth from '~/hooks/useAuth';
import api from '~/lib/api';

const useWatchAsteroid = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation(async (i) => api.watchAsteroid(i),
  {
    enabled: !!token,
    onSuccess: async () => {
      queryClient.invalidateQueries('watchlist');
    }
  });
};

export default useWatchAsteroid;
