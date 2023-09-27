import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';

const useCrew = (id) => {
  return useQuery(
    [ 'entity', Entity.IDS.CREW, id ],
    () => api.getCrew(id),
    { enabled: !!id }
  );
};

export default useCrew;
