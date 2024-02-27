import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import useCrewContext from '~/hooks/useCrewContext';

const useControlledAsteroids = () => {
  const { crew } = useCrewContext();

  return useQuery(
    [ 'entities', Entity.IDS.ASTEROID, 'controlled', crew?.id ],
    // TODO: this ternary should not be necessary if `enabled` is working... maybe something with the forced refresh from cache invalidation?
    () => crew?.id ? api.getEntities({ match: { 'Control.controller.id': crew?.id }, label: Entity.IDS.ASTEROID }) : [],
    { enabled: !!crew?.id }
  );
};

export default useControlledAsteroids;
