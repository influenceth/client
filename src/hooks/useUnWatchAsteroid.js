import { useQueryClient, useMutation } from 'react-query';

import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import api from '~/lib/api';

const useUnWatchAsteroid = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const watchedMapped = useStore(state => state.asteroids.watched.mapped);

  return useMutation(async (i) => api.unWatchAsteroid(i),
  {
    enabled: !!token,
    onSuccess: async () => {
      queryClient.invalidateQueries('watchlist');
      if (watchedMapped) queryClient.invalidateQueries('asteroids');
    }
  });
};

export default useUnWatchAsteroid;
