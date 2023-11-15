import { useQuery } from 'react-query';

import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';

const useAccessibleAsteroidInventories = (asteroidId) => {
  const { crew } = useCrewContext();

  return useQuery(
    [ 'asteroidInventories', asteroidId, crew?.id ],
    () => api.getCrewAccessibleInventories(asteroidId, crew?.id),
    { enabled: !!(asteroidId && crew?.id) }
  );
};

export default useAccessibleAsteroidInventories;