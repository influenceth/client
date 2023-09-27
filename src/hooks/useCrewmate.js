import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';

const useCrewmate = (id) => {
  return useQuery(
    [ 'entity', Entity.IDS.CREWMATE, id ],
    () => api.getCrewmate(id),
    { enabled: !!id }
  );
};

export default useCrewmate;
