import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import useCrewContext from '~/hooks/useCrewContext';

const useControlledAsteroids = () => {
  const { crew } = useCrewContext();

  const controllerId = crew?.id;
  return useQuery(
    [ 'entities', Entity.IDS.ASTEROID, { controllerId } ],
    () => api.getEntities({ match: { 'Control.controller.id': controllerId }, label: Entity.IDS.ASTEROID }),
    { enabled: !!controllerId }
  );
};

export default useControlledAsteroids;
