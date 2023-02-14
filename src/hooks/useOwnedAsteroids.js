import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';
import { useAsteroidAggregate } from './useAsteroid';

const useOwnedAsteroids = () => {
  const { account } = useAuth();

  return useAsteroidAggregate(
    ['asteroids', 'owned'],
    () => api.getAsteroids({ ownedBy: account, hydrated: true }),
    { enabled: !!account }
  );
};

export default useOwnedAsteroids;
