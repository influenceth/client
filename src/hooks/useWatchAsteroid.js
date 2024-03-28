import { useQueryClient, useMutation } from 'react-query';

import useSession from '~/hooks/useSession';
import api from '~/lib/api';

const useWatchAsteroid = () => {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const watchedMapped = true;//useStore(s => s.asteroids.watched.mapped);

  return useMutation(async (id) => api.watchAsteroid(id),
  {
    enabled: !!token,
    onSuccess: async () => {
      queryClient.invalidateQueries(['watchlist']);
      if (watchedMapped) queryClient.invalidateQueries(['asteroids', 'list']);  // TODO: deprecated key
    }
  });
};

export default useWatchAsteroid;
