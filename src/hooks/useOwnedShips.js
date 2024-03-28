import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import useCrewContext from './useCrewContext';

const useOwnedShips = (otherCrew = null) => {
  const { crew } = useCrewContext();

  const controllerId = otherCrew?.id || crew?.id;
  return useQuery(
    [ 'entities', Entity.IDS.SHIP, { controllerId } ],
    () => api.getCrewShips(controllerId),
    { enabled: !!controllerId }
  );
};

export default useOwnedShips;
