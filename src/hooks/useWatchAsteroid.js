import { useQueryClient, useMutation } from 'react-query';

import useAuth from '~/hooks/useAuth';
import api from '~/lib/api';

const useWatchAsteroid = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const watchedMapped = true;//useStore(s => s.asteroids.watched.mapped);

  return useMutation(async (id) => api.watchAsteroid(id),
  {
    enabled: !!token,
    onSuccess: async () => {
      queryClient.invalidateQueries(['watchlist']);
      if (watchedMapped) queryClient.invalidateQueries(['asteroids', 'list']);
    }
  });
};

export default useWatchAsteroid;
