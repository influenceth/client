import { useQueryClient, useMutation } from 'react-query';

import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import api from '~/lib/api';

const useWatchAsteroid = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const watchedMapped = useStore(s => s.asteroids.watched.mapped);

  return useMutation(async (i) => api.watchAsteroid(i),
  {
    enabled: !!token,
    onSuccess: async () => {
      queryClient.invalidateQueries('watchlist');
      if (watchedMapped) queryClient.invalidateQueries('asteroids', 'list');
    }
  });
};

export default useWatchAsteroid;
