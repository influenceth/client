import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import useCrewContext from '~/hooks/useCrewContext';

const useControlledAsteroids = () => {
  const { crew } = useCrewContext();

  return useQuery(
    [ 'asteroids', 'list', 'controlled' ],
    () => api.getEntities({ match: { 'Control.controller.id': crew?.id }, label: Entity.IDS.ASTEROID }),
    { enabled: !!crew?.id }
  );
};

export default useControlledAsteroids;
