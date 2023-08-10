import { useQuery } from 'react-query';

import api from '~/lib/api';
import useCrewContext from './useCrewContext';

const useOwnedShips = (otherCrew = null) => {
  const { crew } = useCrewContext();

  const useCrewId = otherCrew?.id || crew?.id;

  return useQuery(
    [ 'ships', 'owner', useCrewId ],
    () => api.getCrewShips(useCrewId),
    { enabled: !!useCrewId }
  );
};

export default useOwnedShips;
